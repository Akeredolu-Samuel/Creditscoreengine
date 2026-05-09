# Confidential Credit Score Engine 🔐

> **FHE-powered credit bureau** — prove creditworthiness without revealing raw financial history.
>
> Built for the **Zama Developer Program – Builder Track 2026** using fhevm-solidity 0.11.1 and @zama-fhe/react-sdk v3.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (Borrower)                                             │
│  ┌──────────────────┐  fhevmjs encrypt()  ┌──────────────────┐ │
│  │  BorrowerForm    │ ─────────────────►  │ euint64 handles  │ │
│  │  (plain sliders) │                     │ + ZK inputProof  │ │
│  └──────────────────┘                     └────────┬─────────┘ │
└───────────────────────────────────────────────────┼────────────┘
                                                     │ submitFactors()
                                                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  Sepolia – CreditScoreEngine.sol (fhevm-solidity 0.11.1)       │
│                                                                 │
│  FHE.fromExternal()  → decrypt checks proof on-chain           │
│  _computeScore()     → ph×40 + (100-dti)×30 + ca×15 + …      │
│                         All ops are TFHE-rs ciphertext arith    │
│  FHE.allow(score, borrower)  – borrower can self-decrypt       │
│  authorizeLender()   → FHE.allow(score, lender)               │
└──────────────────────────────┬──────────────────────────────────┘
                               │ requestScore() returns euint64 handle
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Zama KMS Gateway (Sepolia)                                     │
│  useUserDecrypt() — EIP-712 signed, KMS checks ACL then        │
│  returns plaintext only to the authorised address               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Score Formula

```
score = paymentHistory × 40
      + (100 − dti)    × 30
      + creditAge      × 15
      + (100 − util)   × 15

Range: 0 – 10 000   (no on-chain division needed)
```

All four multiplications and additions happen **entirely in FHE** — the EVM only ever touches ciphertexts.

---

## Project Structure

```
credit-score-engine/
├── packages/
│   ├── foundry/
│   │   ├── src/
│   │   │   └── CreditScoreEngine.sol       ← Main FHE contract
│   │   ├── script/
│   │   │   └── DeployCreditScoreEngine.s.sol
│   │   └── test/
│   │       └── CreditScoreEngine.t.sol
│   └── nextjs/
│       ├── app/
│       │   ├── page.tsx                    ← Dashboard
│       │   ├── borrower/page.tsx           ← Submit factors
│       │   ├── lender/page.tsx             ← Request & decrypt score
│       │   └── authorize/page.tsx          ← Manage lender access
│       ├── contracts/
│       │   └── CreditScoreEngine.ts        ← ABI + deployment registry
│       └── hooks/credit-score/
│           └── useCreditScoreEngine.tsx    ← All contract interactions
└── docs/
    ├── how-it-works.md
    └── video-script.md
```

---

## Quick Start

### Prerequisites

- Node ≥ 20, pnpm ≥ 10
- Foundry installed (`foundryup`)
- MetaMask pointed at **Sepolia**

### Install

```bash
cd credit-score-engine
pnpm install
pnpm contracts:install   # installs Soldeer dependencies (fhevm-solidity etc.)
```

### Run tests

```bash
pnpm test
# or with verbosity:
cd packages/foundry && forge test -vv
```

### Deploy to Sepolia

1. Copy `.env.example` → `.env` and fill in `PRIVATE_KEY` + `SEPOLIA_RPC_URL` + `ETHERSCAN_API_KEY`.
2. Run:

```bash
pnpm deploy:sepolia
# Under the hood:
# forge script script/DeployCreditScoreEngine.s.sol --rpc-url sepolia --broadcast --verify
```

3. Copy the printed address into `packages/nextjs/contracts/CreditScoreEngine.ts` under key `11155111`.

### Run the frontend

```bash
pnpm start
# Opens http://localhost:3000
```

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `PRIVATE_KEY` | `packages/foundry/.env` | Deployer wallet private key |
| `SEPOLIA_RPC_URL` | `packages/foundry/.env` | Alchemy / Infura Sepolia endpoint |
| `ETHERSCAN_API_KEY` | `packages/foundry/.env` | Contract verification |
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | `packages/nextjs/.env.local` | Frontend RPC |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | `packages/nextjs/.env.local` | WalletConnect |

---

## Key FHE Concepts Used

| Concept | Usage in this project |
|---|---|
| `euint64` | Credit factor and score storage |
| `FHE.fromExternal()` | Verify ZK input-proof on-chain |
| `FHE.add / mul / sub` | Weighted score arithmetic |
| `FHE.ge()` → `ebool` | Threshold checks without revealing score |
| `FHE.allow()` | On-chain ACL — grant lender decrypt permission |
| `useUserDecrypt` | Off-chain EIP-712 KMS decryption |
| `useEncrypt` | Client-side fhevmjs encryption |

---

## License

BSD-3-Clause-Clear
