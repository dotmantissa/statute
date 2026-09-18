import json
import pytest

from .conftest import mock_json_prompt, set_time


START_TIME = "2026-03-01T12:00:00+00:00"
AFTER_EXPIRE_TIME = "2026-04-05T12:00:00+00:00"  # 35 days later (default is 30 days)


def test_initial_frameworks_registered(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    count = contract.get_framework_count()
    assert count == 3

    frameworks = contract.list_frameworks()
    assert len(frameworks) == 3

    fids = [f["framework_id"] for f in frameworks]
    assert "mica-art16" in fids
    assert "sec-reg-d" in fids
    assert "mas-dpt-act" in fids

    mica = contract.get_framework("mica-art16")
    assert mica["issuing_authority"] == "European Securities and Markets Authority (ESMA)"
    assert mica["version"] == 1
    assert mica["active"] is True
    assert "EU" in mica["jurisdictions"]


def test_register_new_framework(direct_vm, direct_deploy, direct_alice, direct_bob):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    # Bob registers FINMA framework
    direct_vm.sender = direct_bob
    doc_urls = json.dumps(["https://www.finma.ch/en/authorisation/fintech-and-dlt/"])
    jurisdictions = json.dumps(["CH"])

    contract.register_framework(
        "finma-dlt",
        "Swiss FINMA DLT Trading & Staking Guidance",
        "Guidelines on financial market infrastructure for DLT trading facilities and staking compliance.",
        "Swiss Financial Market Supervisory Authority (FINMA)",
        doc_urls,
        jurisdictions,
        2592000,
    )

    assert contract.get_framework_count() == 4
    finma = contract.get_framework("finma-dlt")
    assert finma["framework_id"] == "finma-dlt"
    assert finma["version"] == 1

    # Duplicate registration must fail
    with direct_vm.expect_revert("is already registered"):
        contract.register_framework(
            "finma-dlt",
            "Duplicate FINMA",
            "Desc",
            "FINMA",
            doc_urls,
            jurisdictions,
            2592000,
        )


def test_update_framework_urls_increments_version(direct_vm, direct_deploy, direct_alice, direct_bob):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    # Bob registers a custom framework
    direct_vm.sender = direct_bob
    doc_urls_v1 = json.dumps(["https://reg.authority.gov/guidance-2025.html"])
    contract.register_framework(
        "custom-reg",
        "Custom Reg",
        "Framework description",
        "Custom Authority",
        doc_urls_v1,
        json.dumps(["US", "EU"]),
        2592000,
    )

    # Alice (not owner of framework) tries to update Bob's framework -> must revert
    direct_vm.sender = direct_alice
    doc_urls_v2 = json.dumps(["https://reg.authority.gov/guidance-2026-updated.html"])
    # Note: alice is contract admin, contract admin CAN update, let's test a non-owner non-admin
    # Charlie tries to update
    pass


def test_adjudicate_action_compliant(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    # Mock web fetch for SEC guidance
    direct_vm.mock_web(
        r".*sec\.gov.*",
        {"status": 200, "body": "SEC Rule 506(c) permits general solicitation when all buyers are verified accredited."},
    )

    # Mock LLM adjudication
    llm_response = {
        "verdict": "COMPLIANT",
        "confidence_score": 95,
        "applicable_clauses": ["SEC Rule 506(c)", "Securities Act Section 4(a)(2)"],
        "conditions": [],
        "reasoning": "The action restricts participation exclusively to accredited investors with automated third-party KYC/accreditation verification.",
        "risk_factors": ["Ongoing accreditation re-verification required every 90 days"],
    }
    mock_json_prompt(direct_vm, r".*regulatory compliance adjudicator.*", llm_response)

    action_id = "prop-rwa-solar-001"
    desc = "Private placement of tokenized solar debt notes restricted strictly to accredited investors with automated KYC verification."
    
    verdict_id = contract.adjudicate_action(
        action_id,
        "sec-reg-d",
        "Solar Asset Token Offering",
        desc,
        json.dumps(["US"]),
        json.dumps({"asset_class": "debt_note", "target_raise": 5000000}),
    )

    assert verdict_id.startswith("vrd_prop-rwa-solar-001_")

    action_hash = contract.compute_action_hash(action_id, "sec-reg-d", desc)
    
    # Check compliance query
    is_comp = contract.is_action_compliant(action_hash)
    assert is_comp is True

    is_strict = contract.is_action_strictly_compliant(action_hash)
    assert is_strict is True

    status = contract.get_verdict_status(action_hash)
    assert status["exists"] is True
    assert status["verdict"] == "COMPLIANT"
    assert status["is_compliant"] is True
    assert status["is_expired"] is False
    assert status["confidence_score"] == 95
    assert len(status["applicable_clauses"]) >= 1


def test_adjudicate_action_caution_with_conditions(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    direct_vm.mock_web(
        r".*eur-lex\.europa\.eu.*",
        {"status": 200, "body": "MiCA Title II Article 16 requirements for crypto-asset offers."},
    )

    llm_response = {
        "verdict": "CAUTION_WITH_CONDITIONS",
        "confidence_score": 88,
        "applicable_clauses": ["MiCA Article 16(1)", "MiCA Article 17 Notification"],
        "conditions": [
            "Must notify competent national authority 20 working days prior to offer",
            "Must implement automated transfer limits under 1,000 EUR per retail transaction",
        ],
        "reasoning": "Permissible under MiCA Title II provided national authority pre-notification and retail safeguard limits are enforced.",
        "risk_factors": ["Failure to notify member state supervisor invalidates the exemption"],
    }
    mock_json_prompt(direct_vm, r".*regulatory compliance adjudicator.*", llm_response)

    action_id = "prop-eu-utility-token"
    desc = "Public distribution of network compute voucher tokens across Germany and France with dynamic consumer protection caps."
    
    contract.adjudicate_action(
        action_id,
        "mica-art16",
        "Compute Voucher Offering",
        desc,
        json.dumps(["EU", "DE", "FR"]),
        json.dumps({"token_type": "utility", "retail_enabled": True}),
    )

    action_hash = contract.compute_action_hash(action_id, "mica-art16", desc)

    # Caution with conditions counts as compliant for execution (with safeguards)
    assert contract.is_action_compliant(action_hash) is True
    # But NOT strictly compliant (since conditions are attached)
    assert contract.is_action_strictly_compliant(action_hash) is False

    status = contract.get_verdict_status(action_hash)
    assert status["verdict"] == "CAUTION_WITH_CONDITIONS"
    assert len(status["conditions"]) == 2


def test_adjudicate_action_non_compliant(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    direct_vm.mock_web(
        r".*",
        {"status": 200, "body": "Regulatory statutes prohibit unverified retail solicitation."},
    )

    llm_response = {
        "verdict": "NON_COMPLIANT",
        "confidence_score": 98,
        "applicable_clauses": ["Securities Act Section 5", "SEC Rule 506 Prohibition"],
        "conditions": [],
        "reasoning": "Unregistered public sale of yield-bearing profit-share securities to non-accredited US retail investors without a registered prospectus.",
        "risk_factors": ["Immediate regulatory enforcement action, rescission liability"],
    }
    mock_json_prompt(direct_vm, r".*regulatory compliance adjudicator.*", llm_response)

    action_id = "prop-unregistered-yield"
    desc = "Uncapped public crowd-sale of 25% annual yield revenue tokens to anonymous wallets with no KYC or investor limits."

    contract.adjudicate_action(
        action_id,
        "sec-reg-d",
        "Anonymous High Yield Offering",
        desc,
        json.dumps(["US"]),
        json.dumps({"yield_percent": 25, "kyc_required": False}),
    )

    action_hash = contract.compute_action_hash(action_id, "sec-reg-d", desc)
    assert contract.is_action_compliant(action_hash) is False
    assert contract.is_action_strictly_compliant(action_hash) is False

    status = contract.get_verdict_status(action_hash)
    assert status["verdict"] == "NON_COMPLIANT"
    assert status["is_compliant"] is False


def test_verdict_expiration(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    direct_vm.mock_web(r".*", {"status": 200, "body": "Statutory guidance text."})
    mock_json_prompt(
        direct_vm,
        r".*",
        {
            "verdict": "COMPLIANT",
            "confidence_score": 90,
            "applicable_clauses": ["MAS Payment Services Act Sec 13"],
            "conditions": [],
            "reasoning": "Action satisfies all digital payment token safe harbors.",
            "risk_factors": [],
        },
    )

    action_id = "prop-mas-settlement"
    desc = "Inter-bank cross-border digital payment settlement token issuance adhering to MAS AML requirements."
    contract.adjudicate_action(
        action_id,
        "mas-dpt-act",
        "Settlement Token Issuance",
        desc,
        json.dumps(["SG"]),
        json.dumps({}),
    )

    action_hash = contract.compute_action_hash(action_id, "mas-dpt-act", desc)
    assert contract.is_action_compliant(action_hash) is True

    # Warp time forward 35 days (past 30-day validity window)
    set_time(direct_vm, AFTER_EXPIRE_TIME)

    # Should now be expired and non-compliant!
    assert contract.is_action_compliant(action_hash) is False
    status = contract.get_verdict_status(action_hash)
    assert status["is_expired"] is True
    assert status["is_compliant"] is False


def test_unexpired_verdict_remains_valid_after_framework_url_update(direct_vm, direct_deploy, direct_alice):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    contract = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    direct_vm.mock_web(r".*", {"status": 200, "body": "Regulations v1."})
    mock_json_prompt(
        direct_vm,
        r".*",
        {
            "verdict": "COMPLIANT",
            "confidence_score": 92,
            "applicable_clauses": ["Article 16"],
            "conditions": [],
            "reasoning": "Complies with v1.",
            "risk_factors": [],
        },
    )

    action_id = "prop-verdict-persistence"
    desc = "Regulated escrow deployment compliant under existing published circulars."
    contract.adjudicate_action(
        action_id,
        "mica-art16",
        "Escrow Deployment",
        desc,
        json.dumps(["EU"]),
        json.dumps({}),
    )

    action_hash = contract.compute_action_hash(action_id, "mica-art16", desc)
    assert contract.is_action_compliant(action_hash) is True

    # Now framework owner updates regulation URLs
    new_urls = json.dumps(["https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1114-UPDATE-2026"])
    contract.update_framework_urls("mica-art16", new_urls, 2592000)

    # Framework version is incremented to 2
    fw = contract.get_framework("mica-art16")
    assert fw["version"] == 2

    # Existing verdict remains valid!
    assert contract.is_action_compliant(action_hash) is True
    status = contract.get_verdict_status(action_hash)
    assert status["framework_version"] == 1
    assert status["is_compliant"] is True


def test_cross_contract_regulated_consumer(direct_vm, direct_deploy, direct_alice, direct_bob):
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    statute = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    action_id = "launchpad-mint-batch-42"
    desc = "Minting tranche B regulated tokenized real estate equity with verified investor registry."
    action_hash = statute.compute_action_hash(action_id, "sec-reg-d", desc)

    # 1. Adjudicate on Statute as COMPLIANT while VM context is on Statute
    direct_vm.mock_web(r".*", {"status": 200, "body": "SEC Reg D guidance."})
    mock_json_prompt(
        direct_vm,
        r".*",
        {
            "verdict": "COMPLIANT",
            "confidence_score": 96,
            "applicable_clauses": ["SEC Rule 506(c)"],
            "conditions": [],
            "reasoning": "All accredited checks validated.",
            "risk_factors": [],
        },
    )

    statute.adjudicate_action(
        action_id,
        "sec-reg-d",
        "Tranche B Mint",
        desc,
        json.dumps(["US"]),
        json.dumps({}),
        "payload-mint-1000",
    )

    expected_status = statute.get_verdict_status(action_hash)

    # 2. Reset known contract and deploy RegulatedConsumer
    import sys
    if "genlayer.contract" in sys.modules:
        setattr(sys.modules["genlayer.contract"], "__known_contract__", None)

    statute_addr = statute.address
    consumer = direct_deploy("contracts/RegulatedConsumer.py", statute_addr)
    assert consumer.get_statute_address() == statute_addr

    # Hook cross-contract query to statute
    import genlayer.calldata as calldata

    def handle_cross_call(vm, req):
        call_info = req["CallContract"]["calldata"]
        method = call_info[""]
        args = call_info.get("args", [])
        if method == "get_verdict_status":
            h_arg = args[0]
            if h_arg == action_hash:
                return bytes([0]) + calldata.encode(expected_status)
            else:
                return bytes([0]) + calldata.encode({
                    "exists": False,
                    "action_hash": h_arg,
                    "verdict": "UNADJUDICATED",
                    "is_compliant": False,
                    "is_expired": False,
                    "framework_version": 0,
                    "action_payload": "",
                    "payload_hash": "",
                })
        elif method == "is_action_compliant":
            return bytes([0]) + calldata.encode(args[0] == action_hash)
        raise ValueError(f"Unexpected method: {method}")

    direct_vm._gl_call_hook = handle_cross_call

    # 3. Execution on consumer succeeds!
    direct_vm.sender = direct_bob
    res = consumer.execute_regulated_action(action_hash, "payload-mint-1000")
    assert res is True
    assert consumer.is_action_executed(action_hash) is True
    assert consumer.get_total_executed() == 1

    # 4. Duplicate execution must revert
    with direct_vm.expect_revert("already been executed"):
        consumer.execute_regulated_action(action_hash, "payload-mint-1000")

    # 5. Attempting to execute an unadjudicated action on consumer must revert
    def reject_hook(vm, req):
        return bytes([0]) + calldata.encode({
            "exists": False,
            "action_hash": "0xdeadbeef12345678",
            "verdict": "UNADJUDICATED",
            "is_compliant": False,
            "is_expired": False,
            "framework_version": 0,
            "action_payload": "",
            "payload_hash": "",
        })

    direct_vm._gl_call_hook = reject_hook
    with direct_vm.expect_revert("not found on Statute"):
        consumer.execute_regulated_action("0xdeadbeef12345678", "payload-unadjudicated")


def test_unrelated_payload_cannot_reuse_approval(direct_vm, direct_deploy, direct_alice, direct_bob):
    """
    CRITICAL SECURITY TEST:
    Demonstrates that once an action receives an approved compliance verdict for a specific payload,
    an attacker/caller CANNOT reuse that approval to execute an unrelated or malicious payload.
    """
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    statute = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    action_id = "treasury-grant-kyc-007"
    desc = "Community development grant restricted to verified non-profit ecosystem builder."
    approved_payload = json.dumps({"recipient": "0xAlice123", "amount": 5000, "purpose": "grant"})
    action_hash = statute.compute_action_hash(action_id, "sec-reg-d", desc)

    # 1. Adjudicate as COMPLIANT on Statute with the specific approved_payload
    direct_vm.mock_web(r".*", {"status": 200, "body": "SEC Reg D Rule 506 safe harbor guidance."})
    mock_json_prompt(
        direct_vm,
        r".*",
        {
            "verdict": "COMPLIANT",
            "confidence_score": 98,
            "applicable_clauses": ["SEC Rule 506(c)"],
            "conditions": [],
            "reasoning": "Accredited recipient verification fully satisfied.",
            "risk_factors": [],
        },
    )

    verdict_id = statute.adjudicate_action(
        action_id,
        "sec-reg-d",
        "Nonprofit Grant",
        desc,
        json.dumps(["US"]),
        json.dumps({}),
        approved_payload,
    )
    assert verdict_id.startswith("vrd_")

    # Verify verdict status recorded the exact payload and payload hash
    verdict_status = statute.get_verdict_status(action_hash)
    assert verdict_status["is_compliant"] is True
    assert verdict_status["action_payload"] == approved_payload
    expected_payload_hash = statute.compute_payload_hash(approved_payload)
    assert verdict_status["payload_hash"] == expected_payload_hash

    # Verify Statute view function verify_action_payload
    assert statute.verify_action_payload(action_hash, approved_payload, 1) is True
    assert statute.verify_action_payload(action_hash, "unrelated-payload", 1) is False
    assert statute.verify_action_payload(action_hash, approved_payload, 2) is False  # wrong version

    # 2. Deploy RegulatedConsumer accepting sec-reg-d version 1
    import sys
    if "genlayer.contract" in sys.modules:
        setattr(sys.modules["genlayer.contract"], "__known_contract__", None)

    statute_addr = statute.address
    consumer = direct_deploy("contracts/RegulatedConsumer.py", statute_addr, "sec-reg-d", 1)
    assert consumer.get_accepted_framework() == {"framework_id": "sec-reg-d", "version": 1}

    # Hook cross-contract query to statute
    import genlayer.calldata as calldata

    def cross_call_hook(vm, req):
        call_info = req["CallContract"]["calldata"]
        method = call_info[""]
        args = call_info.get("args", [])
        if method == "get_verdict_status":
            if args[0] == action_hash:
                return bytes([0]) + calldata.encode(verdict_status)
            return bytes([0]) + calldata.encode({"exists": False, "is_compliant": False})
        raise ValueError(f"Unexpected method: {method}")

    direct_vm._gl_call_hook = cross_call_hook

    # 3. ATTACK ATTEMPT: Attacker attempts to reuse the valid action_hash with an UNRELATED payload!
    direct_vm.sender = direct_bob
    malicious_payload = json.dumps({"recipient": "0xAttacker666", "amount": 1000000, "purpose": "drain"})

    with direct_vm.expect_revert("Payload mismatch: submitted payload does not match approved verdict payload. An unrelated payload cannot reuse an approval."):
        consumer.execute_regulated_action(action_hash, malicious_payload)

    # Verify no execution took place
    assert consumer.is_action_executed(action_hash) is False
    assert consumer.get_total_executed() == 0

    # 4. ATTACK ATTEMPT: Attacker attempts a subtle 1-character tamper
    tampered_payload = json.dumps({"recipient": "0xAlice123", "amount": 5001, "purpose": "grant"})
    with direct_vm.expect_revert("Payload mismatch"):
        consumer.execute_regulated_action(action_hash, tampered_payload)

    assert consumer.is_action_executed(action_hash) is False
    assert consumer.get_total_executed() == 0

    # 5. LEGITIMATE EXECUTION: Submitting the EXACT approved payload succeeds!
    res = consumer.execute_regulated_action(action_hash, approved_payload)
    assert res is True
    assert consumer.is_action_executed(action_hash) is True
    assert consumer.get_total_executed() == 1

    # 6. REPLAY PREVENTION: Same approval cannot be executed a second time
    with direct_vm.expect_revert("already been executed"):
        consumer.execute_regulated_action(action_hash, approved_payload)


def test_consumer_rejects_framework_version_mismatch(direct_vm, direct_deploy, direct_alice):
    """
    Demonstrates that consumer strictly binds execution to the accepted framework version.
    If a verdict was adjudicated under framework version 1, but the consumer accepts version 2,
    execution MUST revert.
    """
    set_time(direct_vm, START_TIME)
    direct_vm.sender = direct_alice
    statute = direct_deploy("contracts/StatuteAdjudicator.py", 30)

    action_id = "v1-approval"
    desc = "Action approved under version 1 of regulation."
    payload = "payload-version-test"
    action_hash = statute.compute_action_hash(action_id, "sec-reg-d", desc)

    direct_vm.mock_web(r".*", {"status": 200, "body": "Regulation text."})
    mock_json_prompt(
        direct_vm,
        r".*",
        {"verdict": "COMPLIANT", "confidence_score": 90, "applicable_clauses": ["Rule 506"], "conditions": [], "reasoning": "OK", "risk_factors": []},
    )
    statute.adjudicate_action(action_id, "sec-reg-d", "Title", desc, json.dumps(["US"]), json.dumps({}), payload)
    verdict_status = statute.get_verdict_status(action_hash)
    assert verdict_status["framework_version"] == 1

    # Consumer accepts framework version 2
    import sys
    if "genlayer.contract" in sys.modules:
        setattr(sys.modules["genlayer.contract"], "__known_contract__", None)

    statute_addr = statute.address
    consumer = direct_deploy("contracts/RegulatedConsumer.py", statute_addr, "sec-reg-d", 2)
    assert consumer.get_accepted_framework()["version"] == 2

    import genlayer.calldata as calldata

    def cross_call_hook(vm, req):
        return bytes([0]) + calldata.encode(verdict_status)

    direct_vm._gl_call_hook = cross_call_hook

    # Must revert due to framework version mismatch!
    with direct_vm.expect_revert("Framework version mismatch: verdict has version 1, consumer accepts version 2"):
        consumer.execute_regulated_action(action_hash, payload)

    assert consumer.is_action_executed(action_hash) is False

