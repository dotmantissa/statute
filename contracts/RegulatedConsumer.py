# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import hashlib
import genlayer as gl
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"


class RegulatedConsumer(gl.contract.Contract):
    """
    RegulatedConsumer: Example consumer protocol (e.g. Tokenized Asset Platform, DAO Treasury).
    Queries StatuteAdjudicator before executing any high-stakes on-chain action.
    Binds execution strictly to the exact payload and framework version accepted by this consumer.
    """

    owner: Address
    statute_address: Address
    accepted_framework_version: u256
    total_executed: u256
    config: gl.storage.TreeMap[str, str]
    executed_actions: gl.storage.TreeMap[str, bool]
    executed_payload_hashes: gl.storage.TreeMap[str, bool]

    def __init__(
        self,
        statute_contract: Address,
        accepted_framework_id: str = "sec-reg-d",
        accepted_framework_version: u256 = u256(1),
    ):
        self.owner = gl.message.sender_address
        if isinstance(statute_contract, Address):
            self.statute_address = statute_contract
        else:
            self.statute_address = Address(str(statute_contract))
        self.accepted_framework_version = u256(int(accepted_framework_version))
        self.config["framework_id"] = str(accepted_framework_id).strip().lower()
        self.total_executed = u256(0)

    @gl.public.write
    def update_statute_address(self, new_address: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only owner can update statute address")
        if isinstance(new_address, Address):
            self.statute_address = new_address
        else:
            self.statute_address = Address(str(new_address))

    @gl.public.write
    def set_accepted_framework(self, framework_id: str, version: u256) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only owner can update accepted framework")
        self.config["framework_id"] = str(framework_id).strip().lower()
        self.accepted_framework_version = u256(int(version))

    @gl.public.write
    def execute_regulated_action(self, action_hash: str, action_payload: str) -> bool:
        """
        Executes a proposed on-chain action only if StatuteAdjudicator verifies compliance.
        Binds verdict strictly to the exact payload and framework version accepted by this consumer.
        Reverts if compliance is missing, expired, non-compliant, framework version mismatch,
        or payload mismatch (an unrelated payload cannot reuse an approval).
        """
        h = str(action_hash).strip()
        payload = str(action_payload).strip()

        if not h:
            raise gl.vm.UserError(ERROR_EXPECTED + " Action hash cannot be empty")
        if not payload:
            raise gl.vm.UserError(ERROR_EXPECTED + " Action payload cannot be empty")

        if self.executed_actions.get(h, False):
            raise gl.vm.UserError(ERROR_EXPECTED + " Action has already been executed")

        # Query Statute contract
        statute = gl.contract.get_at(self.statute_address)
        verdict_status = statute.view().get_verdict_status(h)

        if not verdict_status.get("exists", False):
            raise gl.vm.UserError(ERROR_EXPECTED + " Regulatory compliance verdict not found on Statute")

        if verdict_status.get("is_expired", False):
            raise gl.vm.UserError(ERROR_EXPECTED + " Regulatory compliance verdict has expired")

        if not verdict_status.get("is_compliant", False):
            raise gl.vm.UserError(ERROR_EXPECTED + " Regulatory compliance verification failed on Statute")

        # 1. Enforce exact framework version binding
        verdict_fw_version = int(verdict_status.get("framework_version", 0))
        accepted_version = int(self.accepted_framework_version)
        if accepted_version > 0 and verdict_fw_version != accepted_version:
            raise gl.vm.UserError(
                ERROR_EXPECTED + f" Framework version mismatch: verdict has version {verdict_fw_version}, consumer accepts version {accepted_version}"
            )

        # 2. Enforce framework ID match if configured
        accepted_fid = self.config.get("framework_id", "")
        if accepted_fid:
            verdict_fid = str(verdict_status.get("framework_id", "")).strip().lower()
            if verdict_fid != accepted_fid:
                raise gl.vm.UserError(
                    ERROR_EXPECTED + f" Framework mismatch: verdict is under {verdict_fid}, consumer accepts {accepted_fid}"
                )

        # 3. Enforce EXACT payload binding: unrelated payload CANNOT reuse an approval
        record_payload = str(verdict_status.get("action_payload", verdict_status.get("action_description", ""))).strip()
        record_payload_hash = str(verdict_status.get("payload_hash", "")).strip()

        supplied_payload_hash = "0x" + hashlib.sha256(payload.encode("utf-8")).hexdigest()

        # Must match either exact payload string or payload hash
        payload_matches = (
            payload == record_payload or
            supplied_payload_hash == record_payload_hash or
            (record_payload_hash and supplied_payload_hash == record_payload_hash)
        )

        if not payload_matches:
            raise gl.vm.UserError(
                ERROR_EXPECTED + " Payload mismatch: submitted payload does not match approved verdict payload. An unrelated payload cannot reuse an approval."
            )

        self.executed_actions[h] = True
        self.executed_payload_hashes[supplied_payload_hash] = True
        self.total_executed = u256(int(self.total_executed) + 1)
        return True

    @gl.public.view
    def is_action_executed(self, action_hash: str) -> bool:
        return bool(self.executed_actions.get(str(action_hash).strip(), False))

    @gl.public.view
    def is_payload_executed(self, payload_hash: str) -> bool:
        return bool(self.executed_payload_hashes.get(str(payload_hash).strip(), False))

    @gl.public.view
    def get_accepted_framework(self) -> dict:
        return {
            "framework_id": self.config.get("framework_id", ""),
            "version": int(self.accepted_framework_version),
        }

    @gl.public.view
    def get_statute_address(self) -> Address:
        return self.statute_address

    @gl.public.view
    def get_total_executed(self) -> int:
        return int(self.total_executed)
