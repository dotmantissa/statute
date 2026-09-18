# Statute: Autonomous Regulatory Compliance Adjudicator

Statute is a decentralized compliance adjudication protocol built on GenLayer intelligent contracts. It bridges the divide between formal legal statutes published by government authorities and autonomous on-chain execution.

Instead of paying thousand dollar hourly legal retainers for every transactional action or pretending regulatory compliance does not exist, Statute enables GenLayer validators to fetch live statutory guidance directly from official regulatory registers, evaluate natural language actions, and render binding consensus verdicts with verifiable expiration windows.

---

## The Problem

Decentralized finance protocols and token launchpads operate in increasingly regulated domains. Real world asset platforms, automated vault managers, and tokenized private placements must ensure their on-chain actions satisfy statutory standards such as SEC Regulation D, the European Union Markets in Crypto Assets regulation, and Monetary Authority of Singapore digital payment token directives.

Today, protocols face a painful dilemma:
1. Pay exorbitant law firm fees to draft legal memorandums for every single vault rebalance, asset onboarding, or token distribution.
2. Ignore legal compliance entirely and risk severe enforcement actions or market bans.

Neither approach scales for autonomous on-chain applications.

---

## How Statute Works

Statute turns regulatory texts into live on-chain adjudication benchmarks.

```
+---------------------------+       +------------------------------+
|   Official Regulators     |       |   GenLayer Validators        |
|  EUR-Lex, SEC, MAS Portals| <---> |   gl.nondet.web.get()        |
+---------------------------+       +------------------------------+
                                                   |
                                                   v
+---------------------------+       +------------------------------+
|   Proposed Action Spec    | ----> |   Consensus Evaluation       |
|   (Natural Language)      |       |   gl.nondet.exec_prompt()    |
+---------------------------+       +------------------------------+
                                                   |
                                                   v
+---------------------------+       +------------------------------+
|   Regulated Consumer      | <---- |   Statute Adjudicator        |
|   is_action_compliant()   |       |   COMPLIANT | CAUTION        |
+---------------------------+       +------------------------------+
```

### 1. Statutory Framework Registry
Authorized framework owners register official government publication URLs directly into the intelligent contract. For instance:
- **SEC Regulation D**: Official SEC private placement guidance for Rule 506c exemptions.
- **EU MiCA (Regulation 2023/1114)**: Primary EUR-Lex statutory register for asset referenced tokens and crypto asset service providers.
- **MAS DPT Guidelines**: Singapore Monetary Authority guidelines on digital payment token services and customer custody.

When regulatory guidance updates, framework owners publish new official URLs, incrementing the framework version while preserving existing unexpired verdicts.

### 2. Non Deterministic Consensus Adjudication
When a protocol or user submits a proposed action for evaluation:
- Validators independently fetch the live statutory text directly from the registered government URLs using non deterministic web requests (`gl.nondet.web.get`).
- Validators evaluate whether the proposed action satisfies statutory criteria using non deterministic large language model execution (`gl.nondet.exec_prompt`).
- GenLayer validators reach consensus on the verdict, confidence score, applicable statutory clauses, conditions, and judicial reasoning.

### 3. Verdict Consensus Outcomes
Every adjudication yields one of three consensus rulings:
- `COMPLIANT`: The proposed action satisfies statutory criteria and standard exemptions.
- `CAUTION_WITH_CONDITIONS`: The action is approved for on-chain execution provided specified operational conditions are maintained (such as mandatory investor whitelisting or segregated reserve attestations).
- `NON_COMPLIANT`: The action violates statutory mandates or fails to meet exemption criteria.

### 4. Verifiable Expiry Windows
Statutes change over time. Every verdict carries a strict expiration timestamp determined by the framework configuration (e.g. 30 days or 60 days). Once a verdict expires, `is_action_compliant(actionHash)` returns false until a renewed adjudication is rendered.

### 5. On-chain Gating & Exact Payload Binding
External smart contracts on GenLayer or EVM gate regulated actions using `execute_regulated_action(action_hash, action_payload)`. The consumer contract binds each execution to the exact payload and framework version it accepts:

```python
# GenLayer Regulated Consumer Contract
@gl.public.write
def execute_regulated_action(self, action_hash: str, action_payload: str) -> bool:
    adjudicator = gl.contract.get_at(self.statute_address)
    status = adjudicator.view().get_verdict_status(action_hash)

    # 1. Ensure verdict is compliant and unexpired
    assert status.get("is_compliant") and not status.get("is_expired"), "Non-compliant or expired"

    # 2. Strict Framework Version binding
    assert status.get("framework_version") == self.accepted_framework_version, "Framework version mismatch"

    # 3. Strict Action Payload binding - prevents approval reuse
    approved_hash = status.get("payload_hash", "")
    submitted_hash = adjudicator.view().compute_payload_hash(action_payload)
    assert submitted_hash == approved_hash, "Payload mismatch: unrelated payload cannot reuse approval"

    self.executed_actions[action_hash] = True
    return True
```

---

## Live Deployed Contracts (GenLayer Studio Network)

The contracts are live on the GenLayer Studio Devnet (Chain ID `61997`, RPC `https://studio-dev.genlayer.com/api`):

| Contract | Address | Network |
| :--- | :--- | :--- |
| **StatuteAdjudicator** | `0xf94eef71c96D311ff7Ad0bd35873FD5A27ED57b2` | GenLayer Studio (61997) |
| **RegulatedConsumer** | `0x6BC505692ebB58bAe3CaAE1B3a36054831C5d01f` | GenLayer Studio (61997) |

Deployment transaction hashes:
- StatuteAdjudicator: `0x7449acd885c681385a0aba58592e0d81b20e05a90f9b9543b2e306235e3e6e81`
- RegulatedConsumer: `0xa3dc4b689a01daf3feb62951e16499ed5e19a54d2cf45ed3167c8f98ffbd53de`

Live Production Application:
- Production dApp: [https://statute-protocol.vercel.app](https://statute-protocol.vercel.app)
- Protocol Alias: [https://statute-adjudicator.vercel.app](https://statute-adjudicator.vercel.app)

---

## Key Features

- **Primary Source Grounding**: Validators extract rules directly from government portals, eliminating third party oracle assumptions.
- **Zero Gas for Users**: Transactions are sponsored by the protocol relayer, abstracting all gas fees for end users.
- **Email Authentication**: Seamless authentication powered by Privy, restricted strictly to verified email addresses.
- **Neon PostgreSQL Indexer**: Rapid query synchronization caching on-chain frameworks, verdicts, and audit logs.
- **Document Content Preview**: Direct backend proxy allowing compliance officers to review registered statutory texts within the dApp.
- **Interactive Contract Playground**: Live testing suite allowing developers to verify action compliance and inspect integration code across Solidity, Python, and TypeScript.
- **Dual Visual Theme**: Thoughtfully styled in Electric Cyan (`#26ccf0`), Pure White (`#ffffff`), and Deep Navy (`#002139`), with persistent theme switching.

---

## Repository Structure

```
statute/
├── contracts/
│   ├── StatuteAdjudicator.py   # Core intelligent contract with web consensus
│   └── RegulatedConsumer.py    # Example compliance gated protocol contract
├── tests/
│   ├── direct/
│   │   └── test_statute.py     # 9 unit tests verifying consensus and gating
│   └── verify_stack.mjs        # Full stack verification across chain and database
├── api/
│   ├── db.mjs                  # Neon PostgreSQL database connector and migrations
│   └── server.mjs              # Express API with gasless relayer and Privy verification
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css     # Theme variables and Tailwind styles
│   │   │   ├── icon.svg        # Custom Scales of Justice vector logo
│   │   │   ├── layout.tsx      # Root layout and metadata configuration
│   │   │   ├── page.tsx        # Main application dashboard
│   │   │   └── providers.tsx   # Privy email auth and theme providers
│   │   └── components/
│   │       ├── AdjudicationStudio.tsx # Action drafting and consensus submitter
│   │       ├── Footer.tsx             # Protocol links and contract references
│   │       ├── FrameworkRegistry.tsx  # Statutory framework registry and preview
│   │       ├── Header.tsx             # Navigation, theme toggle, and email auth
│   │       ├── Hero.tsx               # Protocol introduction and live metrics
│   │       ├── Logo.tsx               # Custom SVG cryptographic scales icon
│   │       ├── Playground.tsx         # Live query tester and integration snippets
│   │       └── VerdictsFeed.tsx       # Searchable live adjudications feed
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
├── deploy/
│   ├── deploy.mjs              # Automated deployment script for GenLayer Studio
│   └── addresses.json          # Deployed contract addresses and artifacts
├── scripts/
│   └── contract-toolchain.py   # Local GenVM runner and linter toolchain
├── pyproject.toml              # Python toolchain configuration
├── package.json                # Root orchestration scripts
└── .task-checklist.md          # Step by step development task audit log
```

---

## Getting Started

### Prerequisites

- Node.js v20 or higher
- Python 3.12 or higher with `uv`
- pnpm v9 or higher

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dotmantissa/statute.git
cd statute
```

2. Install root and API dependencies:
```bash
npm install
```

3. Install web frontend dependencies:
```bash
pnpm --prefix web install
```

4. Configure environment variables in `.env`:
```bash
STUDIO_DEV_RPC=https://studio-dev.genlayer.com/api
STUDIO_CHAIN_ID=61997
DEPLOYER_KEY=0x...
DATABASE_URL=postgresql://...
PRIVY_APP_ID=cmu3xw9hq003b0cjmpt2ibr7f
PORT=4001
```

---

## Running Tests

### Contract Unit Tests
Execute the direct mode GenVM test suite covering all 11 statutory adjudication and consumer gating test cases:
```bash
npm run test:contracts
```

The test suite in [`tests/direct/test_statute.py`](tests/direct/test_statute.py) includes:
- `test_initial_frameworks_registered`: Verifies default statutory frameworks (SEC Reg D, EU MiCA, MAS DPT).
- `test_register_new_framework`: Verifies authorized write route framework registration.
- `test_update_framework_urls_increments_version`: Verifies framework updates increment version while preserving integrity.
- `test_adjudicate_action_compliant`: Verifies compliant adjudication consensus.
- `test_adjudicate_action_caution_with_conditions`: Verifies conditional caution consensus.
- `test_adjudicate_action_non_compliant`: Verifies non-compliant adjudication rejection.
- `test_verdict_expiration`: Verifies verdict validity window expires deterministically.
- `test_unexpired_verdict_remains_valid_after_framework_url_update`: Verifies grandfathered verdicts remain valid during URL updates.
- `test_cross_contract_regulated_consumer`: Verifies end-to-end `execute_regulated_action` flow on consumer contracts.
- **`test_unrelated_payload_cannot_reuse_approval`**: **Directly verifies that an approval issued for a specific payload strictly rejects an unrelated or tampered payload attempting to reuse the approval.**
- **`test_consumer_rejects_framework_version_mismatch`**: **Directly verifies that consumer contracts bound to framework version $V_n$ reject verdicts adjudicated under earlier or mismatched framework versions.**

### Contract Linter
Verify GenVM SDK conventions and Python AST compatibility:
```bash
npm run lint:contracts
```

### Web Front-End Type Check & Lint
Ensure strict TypeScript compilation and clean ESLint verification:
```bash
npm run typecheck
npm run lint
```

### Full Stack Verification
Run the end to end stack verification verifying live contracts, RPC connectivity, database synchronization, and local builds:
```bash
node tests/verify_stack.mjs
```

---

## Development

Start both the gasless backend relayer and the Next.js development server simultaneously:
```bash
npm run dev
```

The web application will be available at `http://localhost:3000` and the API relayer at `http://localhost:4001`.

---

## Smart Contract Integration

### Solidity Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IStatuteAdjudicator {
    struct VerdictStatus {
        bool exists;
        bool is_compliant;
        bool is_expired;
        uint256 framework_version;
        string framework_id;
        string payload_hash;
    }
    function get_verdict_status(string calldata actionHash) external view returns (VerdictStatus memory);
    function verify_action_payload(string calldata actionHash, string calldata actionPayload) external view returns (bool);
}

contract RegulatedFund {
    address public immutable statute;
    string public constant FRAMEWORK_ID = "sec-reg-d";
    uint256 public constant ACCEPTED_FRAMEWORK_VERSION = 1;

    mapping(string => bool) public executedActions;

    event ActionExecuted(string indexed actionHash, string payload);

    constructor(address _statute) {
        statute = _statute;
    }

    function execute_regulated_action(string calldata actionHash, string calldata actionPayload) external {
        require(!executedActions[actionHash], "Action already executed");

        IStatuteAdjudicator.VerdictStatus memory status = IStatuteAdjudicator(statute).get_verdict_status(actionHash);
        require(status.exists && status.is_compliant && !status.is_expired, "Statute: Non-compliant or expired");
        require(status.framework_version == ACCEPTED_FRAMEWORK_VERSION, "Statute: Framework version mismatch");
        require(keccak256(bytes(status.framework_id)) == keccak256(bytes(FRAMEWORK_ID)), "Statute: Framework ID mismatch");

        // Verify exact action payload binding (prevents approval reuse)
        require(
            IStatuteAdjudicator(statute).verify_action_payload(actionHash, actionPayload),
            "Statute: Payload mismatch: unrelated payload cannot reuse approval"
        );

        executedActions[actionHash] = true;
        emit ActionExecuted(actionHash, actionPayload);
    }
}
```

### GenLayer Intelligent Contract (Python)

```python
from genlayer import *

@gl.contract
class RegulatedConsumer:
    statute_address: Address
    accepted_framework_version: u256
    config: gl.storage.TreeMap[str, str]
    executed_actions: gl.storage.TreeMap[str, bool]

    def __init__(self, statute_contract: Address, framework_id: str = "sec-reg-d", accepted_framework_version: u256 = u256(1)):
        self.statute_address = Address(str(statute_contract)) if not isinstance(statute_contract, Address) else statute_contract
        self.accepted_framework_version = accepted_framework_version
        self.config["framework_id"] = framework_id

    @gl.public.write
    def execute_regulated_action(self, action_hash: str, action_payload: str) -> bool:
        assert not self.executed_actions.get(action_hash, False), "Action already executed"

        adjudicator = gl.contract.get_at(self.statute_address)
        status = adjudicator.view().get_verdict_status(action_hash)

        # 1. Enforce compliant and unexpired
        assert status.get("is_compliant") and not status.get("is_expired"), "Non-compliant or expired"

        # 2. Enforce exact framework version binding
        assert status.get("framework_version") == self.accepted_framework_version, "Framework version mismatch"
        assert status.get("framework_id") == self.config["framework_id"], "Framework ID mismatch"

        # 3. Enforce exact action payload binding (unrelated payload cannot reuse approval)
        approved_hash = status.get("payload_hash", "")
        submitted_hash = adjudicator.view().compute_payload_hash(action_payload)
        assert approved_hash and (submitted_hash == approved_hash or action_payload == status.get("action_payload", "")), (
            "Payload mismatch: submitted payload does not match approved verdict payload. An unrelated payload cannot reuse an approval."
        )

        self.executed_actions[action_hash] = True
        return True
```

---

## License

MIT License. Open for decentralized protocols, developers, and compliance systems worldwide.
