# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl
from genlayer import *


ERROR_EXPECTED = "[EXPECTED]"


class RegulatedConsumer(gl.contract.Contract):
    """
    RegulatedConsumer: Example consumer protocol (e.g. Tokenized Asset Platform, DAO Treasury).
    Queries StatuteAdjudicator before executing any high-stakes on-chain action.
    """

    owner: Address
    statute_address: Address
    executed_actions: gl.storage.TreeMap[str, bool]
    total_executed: u256

    def __init__(self, statute_contract: Address):
        self.owner = gl.message.sender_address
        self.statute_address = statute_contract
        self.total_executed = u256(0)

    @gl.public.write
    def update_statute_address(self, new_address: Address) -> None:
        if gl.message.sender_address != self.owner:
            raise gl.vm.UserError(ERROR_EXPECTED + " Only owner can update statute address")
        self.statute_address = new_address

    @gl.public.write
    def execute_regulated_action(self, action_hash: str, action_payload: str) -> bool:
        """
        Executes a proposed on-chain action only if StatuteAdjudicator verifies compliance.
        Reverts if compliance is missing, expired, or non-compliant.
        """
        h = str(action_hash).strip()
        if self.executed_actions.get(h, False):
            raise gl.vm.UserError(ERROR_EXPECTED + " Action has already been executed")

        # Query Statute contract
        statute = gl.get_contract_at(self.statute_address)
        is_compliant = statute.view().is_action_compliant(h)

        if not is_compliant:
            raise gl.vm.UserError(ERROR_EXPECTED + " Regulatory compliance verification failed on Statute")

        self.executed_actions[h] = True
        self.total_executed = u256(int(self.total_executed) + 1)
        return True

    @gl.public.view
    def is_action_executed(self, action_hash: str) -> bool:
        return bool(self.executed_actions.get(str(action_hash).strip(), False))

    @gl.public.view
    def get_statute_address(self) -> Address:
        return self.statute_address

    @gl.public.view
    def get_total_executed(self) -> int:
        return int(self.total_executed)
