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

### 5. On-chain Gating
Any external smart contract on GenLayer or EVM can query Statute before executing state changes:

```solidity
require(
    IStatuteAdjudicator(statute).is_action_compliant(actionHash),
    "Statute: Action not compliant or adjudication has expired"
);
```

---

## Live Deployed Contracts (GenLayer Studio Network)

The contracts are live on the GenLayer Studio Devnet (Chain ID `61997`, RPC `https://studio-dev.genlayer.com/api`):

| Contract | Address | Network |
| :--- | :--- | :--- |
| **StatuteAdjudicator** | `0xa7F7e471d31c0f90A55A73D09CA06f0aD811D84e` | GenLayer Studio (61997) |
| **RegulatedConsumer** | `0xd084F4f579FC9BCB12baf5fEcfF4bF356178AA10` | GenLayer Studio (61997) |

Deployment transaction hash:
- StatuteAdjudicator: `0x01d32bb1ea60c8f1da05c4c2454e919adf66c01546cd0ccd044cf703cfbee87b`
- RegulatedConsumer: `0xc93e02e967712402c04f7a7d9675860698a58bdc4b048a4bc54b87bec41e4904`

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
Execute the direct mode GenVM test suite covering all 9 statutory adjudication test cases:
```bash
npm run test:contracts
```

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
    function is_action_compliant(string calldata actionHash) external view returns (bool);
}

contract CompliantLaunchpad {
    address public immutable statute;

    constructor(address _statute) {
        statute = _statute;
    }

    function launchTokenOffering(string calldata actionHash) external {
        require(
            IStatuteAdjudicator(statute).is_action_compliant(actionHash),
            "Statute: Offering has not received a valid compliant verdict"
        );

        // Proceed with token distribution
    }
}
```

### GenLayer Intelligent Contract (Python)

```python
from genlayer import *

@gl.contract
class RegulatedFund:
    statute: Address

    def __init__(self, statute_address: Address):
        self.statute = statute_address

    @gl.public.write
    def allocate_capital(self, action_hash: str) -> bool:
        adjudicator = gl.contract.get_at(self.statute)
        if not adjudicator.view().is_action_compliant(action_hash):
            raise Exception("Statute: Unauthorized action or expired compliance verdict")
        return True
```

---

## License

MIT License. Open for decentralized protocols, developers, and compliance systems worldwide.
