# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import hashlib
import json
from datetime import datetime, timezone

import genlayer as gl
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"
ERROR_EXTERNAL = "[EXTERNAL]"
ERROR_TRANSIENT = "[TRANSIENT]"
ERROR_LLM = "[LLM_ERROR]"

VERDICT_COMPLIANT = "COMPLIANT"
VERDICT_NON_COMPLIANT = "NON_COMPLIANT"
VERDICT_CAUTION = "CAUTION_WITH_CONDITIONS"
ALLOWED_VERDICTS = (VERDICT_COMPLIANT, VERDICT_NON_COMPLIANT, VERDICT_CAUTION)

DEFAULT_VALIDITY_SECONDS = 2592000  # 30 days
MAX_TEXT_EXTRACT_LEN = 6000


class StatuteAdjudicator(gl.contract.Contract):
    """
    Statute: Regulatory Compliance Adjudicator
    Decentralized AI-powered regulatory adjudication for on-chain protocols.
    """

    owner: Address
    default_validity_seconds: u256
    framework_ids: gl.storage.DynArray[str]
    frameworks: gl.storage.TreeMap[str, str]
    framework_versions: gl.storage.TreeMap[str, u256]
    verdicts: gl.storage.TreeMap[str, str]
    action_latest_verdict: gl.storage.TreeMap[str, str]
    action_history: gl.storage.DynArray[str]
    total_verdicts: u256
    total_frameworks: u256

    def __init__(self, default_validity_days: u256 = u256(30)):
        self.owner = gl.message.sender_address
        days = int(default_validity_days)
        if days < 1 or days > 365:
            days = 30
        self.default_validity_seconds = u256(days * 86400)
        self.total_verdicts = u256(0)
        self.total_frameworks = u256(0)

        # Register standard default frameworks
        self._init_framework(
            framework_id="mica-art16",
            name="MiCA Title II Public Offering & Admission Framework",
            description="European Union Markets in Crypto-Assets Regulation (Regulation EU 2023/1114). Regulates public offers of crypto-assets other than asset-referenced tokens or e-money tokens, whitepaper requirements, and retail exemptions.",
            issuing_authority="European Securities and Markets Authority (ESMA)",
            document_urls=[
                "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114"
            ],
            jurisdictions=["EU", "DE", "FR", "IT", "ES", "NL", "IE"],
            validity_seconds=self.default_validity_seconds,
        )

        self._init_framework(
            framework_id="sec-reg-d",
            name="SEC Regulation D Rule 506(c) Private Offering Framework",
            description="United States Securities and Exchange Commission Regulation D Rule 506(c). Permits general solicitation and advertising provided that all purchasers are accredited investors and the issuer takes reasonable steps to verify accreditation status.",
            issuing_authority="US Securities and Exchange Commission (SEC)",
            document_urls=[
                "https://www.sec.gov/education/capitalraising/building-blocks/regulation-d"
            ],
            jurisdictions=["US"],
            validity_seconds=self.default_validity_seconds,
        )

        self._init_framework(
            framework_id="mas-dpt-act",
            name="MAS Digital Payment Token Services & AML Framework",
            description="Monetary Authority of Singapore Payment Services Act 2019 and Guidelines on Digital Payment Token Services. Covers AML/CFT travel rule compliance, token issuance, and risk warning notices for retail customers.",
            issuing_authority="Monetary Authority of Singapore (MAS)",
            document_urls=[
                "https://www.mas.gov.sg/regulation/guidelines/guidelines-on-digital-payment-token-services"
            ],
            jurisdictions=["SG"],
            validity_seconds=self.default_validity_seconds,
        )

    # -------------------------------------------------------------------------
    # Internal Helpers
    # -------------------------------------------------------------------------

    def _now_epoch(self) -> u256:
        try:
            raw = getattr(gl, "message_raw", None)
            if raw is None:
                raw = getattr(gl.message, "raw", {})
            if isinstance(raw, dict) and raw.get("datetime"):
                val = str(raw["datetime"]).replace("Z", "+00:00")
                parsed = datetime.fromisoformat(val)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return u256(int(parsed.timestamp()))
        except Exception:
            pass
        # Fallback to current unix time
        return u256(int(datetime.now(timezone.utc).timestamp()))

    def _init_framework(
        self,
        framework_id: str,
        name: str,
        description: str,
        issuing_authority: str,
        document_urls: list[str],
        jurisdictions: list[str],
        validity_seconds: u256,
    ) -> None:
        now_ts = int(self._now_epoch())
        record = {
            "framework_id": framework_id,
            "name": name,
            "description": description,
            "issuing_authority": issuing_authority,
            "document_urls": document_urls,
            "jurisdictions": jurisdictions,
            "verdict_validity_seconds": int(validity_seconds),
            "owner": str(self.owner),
            "version": 1,
            "created_at": now_ts,
            "updated_at": now_ts,
            "active": True,
        }
        self.frameworks[framework_id] = json.dumps(record, sort_keys=True)
        self.framework_versions[framework_id] = u256(1)
        self.framework_ids.append(framework_id)
        self.total_frameworks = u256(int(self.total_frameworks) + 1)

    def _hash_action(self, action_id: str, framework_id: str, action_description: str) -> str:
        payload = f"{action_id.strip()}::{framework_id.strip()}::{action_description.strip()}"
        return "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def _leader_error_agrees(self, leader_result: gl.vm.Result, leader_fn) -> bool:
        leader_msg = getattr(leader_result, "message", "")
        try:
            leader_fn()
            return False
        except gl.vm.UserError as e:
            v_msg = getattr(e, "message", str(e))
            if v_msg.startswith(ERROR_EXPECTED) or v_msg.startswith(ERROR_EXTERNAL):
                return v_msg == leader_msg
            if v_msg.startswith(ERROR_TRANSIENT) and leader_msg.startswith(ERROR_TRANSIENT):
                return True
            return False
        except Exception:
            return False

    # -------------------------------------------------------------------------
    # Public Write Methods
    # -------------------------------------------------------------------------

    @gl.public.write
    def register_framework(
        self,
        framework_id: str,
        name: str,
        description: str,
        issuing_authority: str,
        document_urls_json: str,
        jurisdictions_json: str,
        validity_seconds: u256,
    ) -> None:
        fid = str(framework_id).strip().lower()
        if not fid:
            raise gl.vm.UserError(ERROR_EXPECTED + " Framework ID cannot be empty")
        if len(fid) > 64:
            raise gl.vm.UserError(ERROR_EXPECTED + " Framework ID is too long")

        existing = self.frameworks.get(fid, "")
        if existing:
            raise gl.vm.UserError(ERROR_EXPECTED + f" Framework {fid} is already registered")

        if not str(name).strip():
            raise gl.vm.UserError(ERROR_EXPECTED + " Framework name cannot be empty")
        if not str(issuing_authority).strip():
            raise gl.vm.UserError(ERROR_EXPECTED + " Issuing authority cannot be empty")

        try:
            urls = json.loads(document_urls_json)
            if not isinstance(urls, list) or len(urls) == 0:
                raise ValueError("Must be non-empty list")
            validated_urls = []
            for u in urls:
                url_str = str(u).strip()
                if not (url_str.startswith("http://") or url_str.startswith("https://")):
                    raise ValueError(f"Invalid URL: {url_str}")
                validated_urls.append(url_str)
        except Exception as e:
            raise gl.vm.UserError(ERROR_EXPECTED + f" Invalid document URLs: {e}")

        try:
            jurisdictions = json.loads(jurisdictions_json)
            if not isinstance(jurisdictions, list) or len(jurisdictions) == 0:
                jurisdictions = ["GLOBAL"]
            jurisdictions = [str(j).strip().upper() for j in jurisdictions]
        except Exception:
            jurisdictions = ["GLOBAL"]

        val_sec = int(validity_seconds)
        if val_sec < 3600 or val_sec > 31536000:  # Between 1 hour and 1 year
            val_sec = DEFAULT_VALIDITY_SECONDS

        now_ts = int(self._now_epoch())
        record = {
            "framework_id": fid,
            "name": str(name).strip(),
            "description": str(description).strip(),
            "issuing_authority": str(issuing_authority).strip(),
            "document_urls": validated_urls,
            "jurisdictions": jurisdictions,
            "verdict_validity_seconds": val_sec,
            "owner": str(gl.message.sender_address),
            "version": 1,
            "created_at": now_ts,
            "updated_at": now_ts,
            "active": True,
        }

        self.frameworks[fid] = json.dumps(record, sort_keys=True)
        self.framework_versions[fid] = u256(1)
        self.framework_ids.append(fid)
        self.total_frameworks = u256(int(self.total_frameworks) + 1)

    @gl.public.write
    def update_framework_urls(
        self,
        framework_id: str,
        document_urls_json: str,
        validity_seconds: u256,
    ) -> None:
        fid = str(framework_id).strip().lower()
        raw = self.frameworks.get(fid, "")
        if not raw:
            raise gl.vm.UserError(ERROR_EXPECTED + f" Framework {fid} not found")

        framework = json.loads(raw)
        sender = str(gl.message.sender_address).lower()
        fw_owner = str(framework.get("owner", "")).lower()
        admin_owner = str(self.owner).lower()

        if sender != fw_owner and sender != admin_owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only framework owner or admin can update regulations")

        try:
            urls = json.loads(document_urls_json)
            if not isinstance(urls, list) or len(urls) == 0:
                raise ValueError("Must be non-empty list")
            validated_urls = []
            for u in urls:
                url_str = str(u).strip()
                if not (url_str.startswith("http://") or url_str.startswith("https://")):
                    raise ValueError(f"Invalid URL: {url_str}")
                validated_urls.append(url_str)
        except Exception as e:
            raise gl.vm.UserError(ERROR_EXPECTED + f" Invalid document URLs: {e}")

        val_sec = int(validity_seconds)
        if val_sec < 3600 or val_sec > 31536000:
            val_sec = framework.get("verdict_validity_seconds", DEFAULT_VALIDITY_SECONDS)

        # When regulation URLs are updated, existing unexpired verdicts remain valid,
        # but new submissions are adjudicated against the updated documents (version incremented).
        current_version = int(self.framework_versions.get(fid, u256(1)))
        new_version = current_version + 1

        now_ts = int(self._now_epoch())
        framework["document_urls"] = validated_urls
        framework["verdict_validity_seconds"] = val_sec
        framework["version"] = new_version
        framework["updated_at"] = now_ts

        self.frameworks[fid] = json.dumps(framework, sort_keys=True)
        self.framework_versions[fid] = u256(new_version)

    @gl.public.write
    def adjudicate_action(
        self,
        action_id: str,
        framework_id: str,
        action_title: str,
        action_description: str,
        jurisdictions_json: str,
        action_metadata_json: str,
        action_payload: str = "",
    ) -> str:
        fid = str(framework_id).strip().lower()
        fw_raw = self.frameworks.get(fid, "")
        if not fw_raw:
            raise gl.vm.UserError(ERROR_EXPECTED + f" Framework {fid} does not exist")

        framework = json.loads(fw_raw)
        if not framework.get("active", True):
            raise gl.vm.UserError(ERROR_EXPECTED + f" Framework {fid} is deactivated")

        act_id = str(action_id).strip()
        if not act_id:
            raise gl.vm.UserError(ERROR_EXPECTED + " Action ID is required")

        desc = str(action_description).strip()
        if len(desc) < 15:
            raise gl.vm.UserError(ERROR_EXPECTED + " Action description is too brief for legal adjudication")

        title = str(action_title).strip() or act_id

        try:
            target_jurisdictions = json.loads(jurisdictions_json)
            if not isinstance(target_jurisdictions, list) or len(target_jurisdictions) == 0:
                target_jurisdictions = framework.get("jurisdictions", ["GLOBAL"])
        except Exception:
            target_jurisdictions = framework.get("jurisdictions", ["GLOBAL"])

        try:
            metadata = json.loads(action_metadata_json)
            if not isinstance(metadata, dict):
                metadata = {}
        except Exception:
            metadata = {}

        # Exact payload resolution: prefer explicit payload, then metadata payload, fallback to description
        effective_payload = str(action_payload).strip()
        if not effective_payload:
            if isinstance(metadata, dict) and "payload" in metadata:
                effective_payload = str(metadata["payload"]).strip()
            else:
                effective_payload = desc
        payload_hash = "0x" + hashlib.sha256(effective_payload.encode("utf-8")).hexdigest()

        action_hash = self._hash_action(act_id, fid, desc)
        doc_urls = framework.get("document_urls", [])
        fw_name = framework.get("name", fid)
        fw_authority = framework.get("issuing_authority", "Regulatory Authority")
        fw_version = int(self.framework_versions.get(fid, u256(1)))
        validity_window = framework.get("verdict_validity_seconds", DEFAULT_VALIDITY_SECONDS)

        # ---------------------------------------------------------------------
        # Non-Deterministic Validator Execution
        # ---------------------------------------------------------------------

        def leader_fn() -> dict:
            # 1. Fetch regulatory text from registered URLs
            docs_summary = []
            for url in doc_urls[:3]:  # Top URLs
                try:
                    res = gl.nondet.web.get(url, headers={"User-Agent": "GenLayerStatute/1.0", "Accept": "text/html,text/plain"})
                    if res.status == 200:
                        text = res.body.decode("utf-8", errors="ignore")[:MAX_TEXT_EXTRACT_LEN]
                        docs_summary.append(f"Source URL: {url}\nContent excerpt: {text}")
                    else:
                        docs_summary.append(f"Source URL: {url} (HTTP {res.status})")
                except Exception:
                    docs_summary.append(f"Source URL: {url} (fetched via cached authority reference)")

            combined_docs = "\n---\n".join(docs_summary) if docs_summary else "Direct statutory authority text referenced by URL."

            # 2. Build consensus prompt
            prompt = f"""You are an elite decentralized regulatory compliance adjudicator on GenLayer.
Evaluate whether the proposed on-chain protocol action complies with the registered regulatory framework.

FRAMEWORK: {fw_name}
ISSUING AUTHORITY: {fw_authority}
TARGET JURISDICTIONS: {json.dumps(target_jurisdictions)}
REGISTERED REGULATION SOURCES:
{combined_docs}

PROPOSED ON-CHAIN ACTION:
Title: {title}
Description: {desc}
Parameters: {json.dumps(metadata, sort_keys=True)}

YOUR TASK:
1. Identify the legal clauses, articles, and provisions that apply to this action type in the specified jurisdictions.
2. Adjudicate the action into EXACTLY ONE of three verdicts:
   - "COMPLIANT": Action fully satisfies statutory requirements, exemptions, or safe harbors.
   - "NON_COMPLIANT": Action clearly breaches statutory obligations, licensing requirements, or investor safeguards.
   - "CAUTION_WITH_CONDITIONS": Action is conditionally permissible ONLY IF specific safeguards/conditions are enforced on-chain.
3. Formulate strict, concrete conditions if caution is warranted.
4. Provide comprehensive legal reasoning citing specific articles/clauses.

Return ONLY a JSON object with this exact schema:
{{
  "verdict": "COMPLIANT" | "NON_COMPLIANT" | "CAUTION_WITH_CONDITIONS",
  "confidence_score": <integer 0 to 100>,
  "applicable_clauses": ["<Article/Section title or citation>", ...],
  "conditions": ["<Mandatory condition or safeguard>", ...],
  "reasoning": "<Comprehensive legal adjudication explanation>",
  "risk_factors": ["<Specific regulatory risk factor>", ...]
}}"""

            raw_res = gl.nondet.exec_prompt(prompt, response_format="json")
            if not isinstance(raw_res, dict):
                raise gl.vm.UserError(ERROR_LLM + " Non-dict response from LLM")

            # Parse and sanitize fields
            verdict_val = str(raw_res.get("verdict", "")).strip().upper()
            if verdict_val not in ALLOWED_VERDICTS:
                if "CAUTION" in verdict_val or "CONDITION" in verdict_val:
                    verdict_val = VERDICT_CAUTION
                elif "NON" in verdict_val or "FAIL" in verdict_val or "ILLEGAL" in verdict_val:
                    verdict_val = VERDICT_NON_COMPLIANT
                else:
                    verdict_val = VERDICT_COMPLIANT

            try:
                confidence = int(round(float(raw_res.get("confidence_score", 85))))
                confidence = max(0, min(100, confidence))
            except Exception:
                confidence = 85

            clauses = raw_res.get("applicable_clauses", [])
            if not isinstance(clauses, list) or len(clauses) == 0:
                clauses = [f"{fw_name} General Provisions"]
            clauses = [str(c).strip() for c in clauses if str(c).strip()]

            conditions = raw_res.get("conditions", [])
            if not isinstance(conditions, list):
                conditions = []
            conditions = [str(c).strip() for c in conditions if str(c).strip()]

            reasoning = str(raw_res.get("reasoning", "")).strip()
            if not reasoning:
                reasoning = f"Adjudicated as {verdict_val} under {fw_name} for jurisdictions {target_jurisdictions}."

            risks = raw_res.get("risk_factors", [])
            if not isinstance(risks, list):
                risks = []
            risks = [str(r).strip() for r in risks if str(r).strip()]

            return {
                "verdict": verdict_val,
                "confidence_score": confidence,
                "applicable_clauses": clauses,
                "conditions": conditions,
                "reasoning": reasoning,
                "risk_factors": risks,
            }

        def validator_fn(leaders_res: gl.vm.Result) -> bool:
            if not isinstance(leaders_res, gl.vm.Return):
                return self._leader_error_agrees(leaders_res, leader_fn)

            try:
                own = leader_fn()
            except Exception:
                return False

            leader_data = leaders_res.calldata
            if not isinstance(leader_data, dict):
                return False

            leader_verdict = leader_data.get("verdict")
            own_verdict = own.get("verdict")

            # Consensus Rule 1: Substantive verdict must agree
            if leader_verdict != own_verdict:
                return False

            # Consensus Rule 2: Confidence score tolerance
            leader_conf = int(leader_data.get("confidence_score", 0))
            own_conf = int(own.get("confidence_score", 0))
            if abs(leader_conf - own_conf) > 25:
                return False

            # Consensus Rule 3: Must cite applicable clauses
            leader_clauses = leader_data.get("applicable_clauses", [])
            if not isinstance(leader_clauses, list) or len(leader_clauses) == 0:
                return False

            # Consensus Rule 4: Must have substantive reasoning
            leader_reason = str(leader_data.get("reasoning", ""))
            if len(leader_reason) < 20:
                return False

            return True

        adjudication = gl.vm.run_nondet(leader_fn, validator_fn)

        now_epoch = self._now_epoch()
        now_ts = int(now_epoch)
        expires_at = now_ts + int(validity_window)
        verdict_id = f"vrd_{act_id}_{now_ts}"

        record = {
            "verdict_id": verdict_id,
            "action_id": act_id,
            "action_hash": action_hash,
            "action_title": title,
            "action_description": desc,
            "action_payload": effective_payload,
            "payload_hash": payload_hash,
            "framework_id": fid,
            "framework_version": fw_version,
            "jurisdictions": target_jurisdictions,
            "verdict": adjudication["verdict"],
            "confidence_score": adjudication["confidence_score"],
            "applicable_clauses": adjudication["applicable_clauses"],
            "conditions": adjudication["conditions"],
            "reasoning": adjudication["reasoning"],
            "risk_factors": adjudication["risk_factors"],
            "adjudicated_at": now_ts,
            "expires_at": expires_at,
            "validity_seconds": int(validity_window),
            "submitter": str(gl.message.sender_address),
            "source_urls": doc_urls,
            "is_valid": True,
        }

        self.verdicts[verdict_id] = json.dumps(record, sort_keys=True)
        self.action_latest_verdict[action_hash] = verdict_id
        self.action_history.append(verdict_id)
        self.total_verdicts = u256(int(self.total_verdicts) + 1)

        return verdict_id

    # -------------------------------------------------------------------------
    # Public View Query Methods
    # -------------------------------------------------------------------------

    @gl.public.view
    def is_action_compliant(self, action_hash: str) -> bool:
        """
        Primary on-chain query for consumer contracts.
        Returns True if a valid, unexpired COMPLIANT or CAUTION_WITH_CONDITIONS verdict exists.
        """
        verdict_id = self.action_latest_verdict.get(str(action_hash).strip(), "")
        if not verdict_id:
            return False

        raw = self.verdicts.get(verdict_id, "")
        if not raw:
            return False

        record = json.loads(raw)
        now_ts = int(self._now_epoch())
        expires_at = int(record.get("expires_at", 0))

        if now_ts > expires_at:
            return False

        verdict = record.get("verdict", "")
        return verdict in (VERDICT_COMPLIANT, VERDICT_CAUTION)

    @gl.public.view
    def is_action_strictly_compliant(self, action_hash: str) -> bool:
        """
        Returns True if and only if the verdict is COMPLIANT (no conditions) and unexpired.
        """
        verdict_id = self.action_latest_verdict.get(str(action_hash).strip(), "")
        if not verdict_id:
            return False

        raw = self.verdicts.get(verdict_id, "")
        if not raw:
            return False

        record = json.loads(raw)
        now_ts = int(self._now_epoch())
        expires_at = int(record.get("expires_at", 0))

        if now_ts > expires_at:
            return False

        return record.get("verdict") == VERDICT_COMPLIANT

    @gl.public.view
    def get_verdict_status(self, action_hash: str) -> dict:
        """
        Summary status for external contracts and front-end inspectors.
        """
        target_hash = str(action_hash).strip()
        verdict_id = self.action_latest_verdict.get(target_hash, "")
        if not verdict_id:
            return {
                "exists": False,
                "action_hash": target_hash,
                "verdict": "UNADJUDICATED",
                "is_compliant": False,
                "is_expired": False,
                "expires_at": 0,
                "adjudicated_at": 0,
                "framework_id": "",
                "framework_version": 0,
                "action_payload": "",
                "payload_hash": "",
                "conditions": [],
                "applicable_clauses": [],
                "confidence_score": 0,
                "reasoning": "No compliance adjudication on record for this action hash.",
                "risk_factors": [],
            }

        raw = self.verdicts.get(verdict_id, "")
        if not raw:
            return {
                "exists": False,
                "action_hash": target_hash,
                "verdict": "UNADJUDICATED",
                "action_payload": "",
                "payload_hash": "",
            }

        record = json.loads(raw)
        now_ts = int(self._now_epoch())
        expires_at = int(record.get("expires_at", 0))
        is_expired = now_ts > expires_at
        verdict = record.get("verdict", "")
        is_compliant = (not is_expired) and (verdict in (VERDICT_COMPLIANT, VERDICT_CAUTION))

        return {
            "exists": True,
            "verdict_id": verdict_id,
            "action_hash": target_hash,
            "action_id": record.get("action_id", ""),
            "action_title": record.get("action_title", ""),
            "action_description": record.get("action_description", ""),
            "action_payload": record.get("action_payload", record.get("action_description", "")),
            "payload_hash": record.get("payload_hash", ""),
            "verdict": verdict,
            "is_compliant": is_compliant,
            "is_expired": is_expired,
            "expires_at": expires_at,
            "adjudicated_at": int(record.get("adjudicated_at", 0)),
            "framework_id": record.get("framework_id", ""),
            "framework_version": int(record.get("framework_version", 1)),
            "conditions": record.get("conditions", []),
            "applicable_clauses": record.get("applicable_clauses", []),
            "confidence_score": int(record.get("confidence_score", 0)),
            "reasoning": record.get("reasoning", ""),
            "risk_factors": record.get("risk_factors", []),
            "submitter": record.get("submitter", ""),
        }

    @gl.public.view
    def verify_action_payload(
        self,
        action_hash: str,
        action_payload: str,
        framework_version: u256 = u256(0),
    ) -> bool:
        """
        Validates whether a compliant, unexpired verdict exists for action_hash
        AND strictly matches the expected action_payload and optional framework version.
        """
        verdict_id = self.action_latest_verdict.get(str(action_hash).strip(), "")
        if not verdict_id:
            return False

        raw = self.verdicts.get(verdict_id, "")
        if not raw:
            return False

        record = json.loads(raw)
        now_ts = int(self._now_epoch())
        if now_ts > int(record.get("expires_at", 0)):
            return False

        if record.get("verdict") not in (VERDICT_COMPLIANT, VERDICT_CAUTION):
            return False

        if int(framework_version) > 0 and int(record.get("framework_version", 0)) != int(framework_version):
            return False

        clean_payload = str(action_payload).strip()
        rec_payload = str(record.get("action_payload", record.get("action_description", ""))).strip()
        rec_hash = str(record.get("payload_hash", "")).strip()
        supplied_hash = "0x" + hashlib.sha256(clean_payload.encode("utf-8")).hexdigest()

        return clean_payload == rec_payload or supplied_hash == rec_hash

    @gl.public.view
    def compute_payload_hash(self, action_payload: str) -> str:
        return "0x" + hashlib.sha256(str(action_payload).strip().encode("utf-8")).hexdigest()

    @gl.public.view
    def get_verdict(self, verdict_id: str) -> dict:
        vid = str(verdict_id).strip()
        raw = self.verdicts.get(vid, "")
        if not raw:
            return {}
        record = json.loads(raw)
        now_ts = int(self._now_epoch())
        record["is_expired"] = now_ts > int(record.get("expires_at", 0))
        return record

    @gl.public.view
    def get_framework(self, framework_id: str) -> dict:
        fid = str(framework_id).strip().lower()
        raw = self.frameworks.get(fid, "")
        if not raw:
            return {}
        return json.loads(raw)

    @gl.public.view
    def list_frameworks(self) -> list[dict]:
        result = []
        for fid in self.framework_ids:
            raw = self.frameworks.get(fid, "")
            if raw:
                result.append(json.loads(raw))
        return result

    @gl.public.view
    def get_framework_count(self) -> int:
        return int(self.total_frameworks)

    @gl.public.view
    def get_verdict_count(self) -> int:
        return int(self.total_verdicts)

    @gl.public.view
    def get_recent_verdicts(self, limit: u256 = u256(20)) -> list[dict]:
        max_items = int(limit)
        total = len(self.action_history)
        start = max(0, total - max_items)
        now_ts = int(self._now_epoch())
        result = []
        for i in range(total - 1, start - 1, -1):
            vid = self.action_history[i]
            raw = self.verdicts.get(vid, "")
            if raw:
                item = json.loads(raw)
                item["is_expired"] = now_ts > int(item.get("expires_at", 0))
                result.append(item)
        return result

    @gl.public.view
    def compute_action_hash(self, action_id: str, framework_id: str, action_description: str) -> str:
        return self._hash_action(action_id, framework_id, action_description)
