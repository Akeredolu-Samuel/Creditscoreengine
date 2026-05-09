# 3-Minute Video Pitch Script
## Confidential Credit Score Engine — Zama Developer Program 2026

> **Tone:** Calm, confident, technically informed. Speak to both technical judges and non-technical viewers.
> **Target runtime:** 2 min 45 sec – 3 min 00 sec

---

### [0:00 – 0:20] Hook

> "Every time you apply for a loan, you hand over years of financial history — account balances, payment records, income data — to a lender you barely know.
>
> That data lives in plaintext databases. It gets breached. It gets misused. And you have no control over who sees it."

*(Show: news headlines about data breaches, credit bureau hacks)*

---

### [0:20 – 0:45] The Problem Statement

> "Credit scoring is a privacy nightmare. The system works by trading privacy for access. You either hand over your data — or you don't get the loan.
>
> But what if you could *prove* you're creditworthy, without *revealing* the data that makes you creditworthy?"

*(Show: traditional flow diagram — borrower → bureau → lender, data exposed at every step)*

---

### [0:45 – 1:15] Introducing the Solution

> "This is the Confidential Credit Score Engine — an FHE-powered credit bureau built on Zama Protocol.
>
> FHE stands for Fully Homomorphic Encryption. It lets you perform arithmetic on encrypted data. The EVM computes your credit score while it's still encrypted — no plaintext ever touches the blockchain.
>
> Let me show you how it works in three steps."

*(Show: the dApp dashboard)*

---

### [1:15 – 1:50] Live Demo

> **Step 1 — Borrower encrypts locally.**
> "I open the Borrower portal, adjust my credit factors — payment history, debt-to-income ratio, credit age, utilization — and hit Submit.
>
> fhevmjs encrypts all four values right here in the browser. What gets sent on-chain is four ciphertext handles and a zero-knowledge proof — no raw numbers."

*(Show: BorrowerForm sliders → Submit button → tx confirmation)*

> **Step 2 — Smart contract computes the score.**
> "The CreditScoreEngine contract receives the handles, verifies the ZK proof, then runs the weighted score formula — multiply, add, subtract — entirely on ciphertexts.
>
> The result is an encrypted score stored on-chain. Nobody can read it yet."

*(Show: contract transaction explorer, highlight FHE op logs)*

> **Step 3 — Borrower authorises a lender.**
> "I go to the Authorize page, paste my lender's address, and sign one transaction. That calls FHE dot allow — updating the Zama ACL contract so only *this* lender can decrypt *this* score."

*(Show: AuthorizePage → grant tx)*

> **Step 4 — Lender decrypts.**
> "The lender enters my address, requests the score. The Zama KMS verifies the ACL entry, then decrypts — returning the final number only to the lender's browser. They see the score. Nothing else."

*(Show: LenderView → score revealed → threshold badges)*

---

### [1:50 – 2:20] The FHE Killer Feature

> "Here's what makes this genuinely novel. The lender doesn't even need the full score. The contract has a `meetsThreshold` function — it returns an encrypted boolean: does this score exceed 7000?
>
> The lender decrypts a yes or a no. They never learn your exact score. That's the power of FHE — provable properties, zero disclosure."

*(Show: code snippet of `meetsThreshold` function)*

---

### [2:20 – 2:45] Impact & Closing

> "No centralised bureau. No plaintext database. The raw factors — payment history, income ratios — are mathematically provable but permanently private.
>
> Built on Zama's fhevm-solidity 0.11.1 and the @zama-fhe react SDK, deployed on Sepolia testnet, with full Foundry tests covering the FHE arithmetic.
>
> Credit scoring is just the start. The same pattern works for any situation where you need to prove a property of private data — insurance eligibility, KYC, tax compliance — without giving the data away.
>
> Confidential Credit Score Engine. Prove it. Without exposing it."

*(Show: logo + contract address + GitHub link)*

---

### [2:45 – 3:00] Credits

> "Built for the Zama Developer Program Builder Track 2026.
> Smart contracts: fhevm-solidity 0.11.1 · Frontend: Next.js + @zama-fhe/react-sdk v3 · Network: Sepolia"

---

## Filming Tips

- **Screen record** the live demo at 1080p; narrate live or dub in post
- Keep transitions under 0.5 seconds — judges watch many videos
- Show the **Sepolia Etherscan** transaction for the `submitFactors` call to prove real on-chain deployment
- The code snippet slide should highlight the `_computeScore` function — it's the most visually impressive FHE usage
