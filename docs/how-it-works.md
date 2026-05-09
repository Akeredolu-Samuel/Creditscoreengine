# How the FHE Credit Score Engine Works

## The Privacy Problem

Traditional credit bureaus collect sensitive financial data — payment history, debt levels, income — and hand it to lenders in plaintext. This creates:

- **Data breach risk** — centralised stores are high-value targets
- **Borrower surveillance** — lenders see far more than necessary
- **Lack of consent** — borrowers cannot control who accesses what

## The FHE Solution

Fully Homomorphic Encryption allows arithmetic to be performed on **encrypted ciphertexts** without ever decrypting them. The result, when finally decrypted, is mathematically identical to the result of operating on the plaintexts.

---

## Step-by-Step Flow

### 1. Borrower Encrypts Locally

The borrower opens the Borrower Form and sets sliders for:

- **Payment History** (0-100, higher = better)
- **Debt-to-Income Ratio** (0-100, lower = better)
- **Credit Age** (0-100, higher = better)
- **Credit Utilization** (0-100, lower = better)

`fhevmjs` (running in the browser) encrypts all four values using the Zama public key:

```typescript
const enc = await encrypt.mutateAsync({
  values: [
    { value: BigInt(paymentHistory), type: "euint64" },
    { value: BigInt(dti), type: "euint64" },
    { value: BigInt(creditAge), type: "euint64" },
    { value: BigInt(utilization), type: "euint64" },
  ],
  contractAddress,
  userAddress: address,
});
// → enc.handles[0..3]: 32-byte ciphertext handles
// → enc.inputProof: ZK proof that the handles encode valid plaintext
```

**Nothing leaves the browser in plaintext.** The raw numbers are only ever held in browser memory.

### 2. On-Chain: ZK Proof Verification

`submitFactors()` is called with the four handles + one shared proof:

```solidity
f.paymentHistory = FHE.fromExternal(paymentHistory, inputProof);
```

`FHE.fromExternal` calls the Zama KMSV (KMS Verifier) pre-compile, which verifies the ZK proof. If the proof is invalid, the transaction reverts — no malformed ciphertext can be injected.

### 3. On-Chain: FHE Score Computation

`_computeScore()` computes the weighted score **entirely in FHE**:

```solidity
euint64 hundred      = FHE.asEuint64(100);
euint64 invertedDti  = FHE.sub(hundred, f.dti);        // lower dti → higher score
euint64 invertedUtil = FHE.sub(hundred, f.utilization);

euint64 phScore   = FHE.mul(f.paymentHistory, FHE.asEuint64(40));
euint64 dtiScore  = FHE.mul(invertedDti,      FHE.asEuint64(30));
euint64 caScore   = FHE.mul(f.creditAge,      FHE.asEuint64(15));
euint64 utilScore = FHE.mul(invertedUtil,     FHE.asEuint64(15));

euint64 score = FHE.add(
    FHE.add(phScore, dtiScore),
    FHE.add(caScore, utilScore)
);
```

The EVM never sees a plaintext value. It only manipulates 32-byte ciphertext handles via pre-compile calls to the TFHE-rs co-processor.

### 4. On-Chain ACL

After computation the contract calls:

```solidity
FHE.allowThis(score);    // contract can re-read it (e.g. for meetsThreshold)
FHE.allow(score, borrower); // borrower can self-decrypt
```

When the borrower authorises a lender:

```solidity
FHE.allow(_scores[msg.sender], lender);
```

This updates the Zama ACL contract on-chain. Without an ACL entry the KMS will refuse decryption for that address.

### 5. Off-Chain: KMS Decryption

To decrypt, the authorised party (borrower or lender):

1. Calls `useAllow` to generate an FHE keypair (stored in IndexedDB) and EIP-712 signs the access request.
2. `useUserDecrypt` sends the encrypted handle + EIP-712 signature to the Zama KMS gateway.
3. The KMS verifies the ACL entry on-chain, then decrypts and returns only the plaintext score.

**The KMS never returns plaintext for an unauthorised address.**

### 6. Bonus: Threshold Checks Without Score Revelation

```solidity
function meetsThreshold(address borrower, uint64 threshold) external view returns (ebool) {
    euint64 thresh = FHE.asEuint64(threshold);
    return FHE.ge(_scores[borrower], thresh);
}
```

A lender can ask "does this borrower have a score ≥ 7000?" and receive an encrypted boolean `ebool`. After decryption they know `true/false` but **not the actual score**. This is FHE's killer feature: provable properties without data disclosure.

---

## Security Properties

| Property              | Guarantee                                                                     |
| --------------------- | ----------------------------------------------------------------------------- |
| Factor privacy        | Raw values (paymentHistory, DTI, …) are never on-chain in plaintext           |
| Score privacy         | Encrypted score stored on-chain; only ACL-listed addresses can decrypt        |
| Computation integrity | ZK input-proof prevents forged ciphertext injection                           |
| Lender isolation      | Each lender gets an independent ACL entry; revoking one doesn't affect others |
| No trust in frontend  | Even a malicious frontend can't recover plaintext — the KMS checks ACL        |

---

## Cryptographic Stack

```
Plaintext layer:   Browser JS (fhevmjs / @zama-fhe/react-sdk)
Encryption:        TFHE-rs over 128-bit security parameter
Proof system:      ZK-proof for input ciphertext validity
On-chain ops:      EVM pre-compiles backed by TFHE co-processor
Decryption gate:   Zama KMS + on-chain ACL contract
```
