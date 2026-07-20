# GrantPulse — Reputation-Weighted Community Micro-Grants Platform

# Live Demo
https://steller-greenbelt.vercel.app/

# Demo Video
https://drive.google.com/file/d/1Yf6cf1fu9-1DvDQkdAjVXLoKymvCwMXy/view?usp=sharing

# ✅ Proof of 10+ User Wallet Interactions

The following Stellar Testnet wallet addresses successfully interacted with the GrantPulse platform during testing. These interactions include proposal creation, voting, treasury operations, and reputation token distribution.

| # | Wallet Address | Transaction ID |
|---|----------------|----------------|
| 1 | `GAWFJ52NSFAY7ZHZRQ2HF2W4JT7Q3JLNK2WSDU5HAJGUSOORACGIYGM7` | `a51c71b4f3f37599a0862e93ed78e2c851291ae625725d681a471ce1c937a31c` |
| 2 | `GARNEUZKZX3QPOXNVD3KVYF3QRMXKQUA3TXD4HXLGZ36DXYXLZIDFFZJ` | `b1a3e3c4fe394dbe03d1fa0afb25b2fca5eb75704bcd17b84c217805867350d1` |
| 3 | `GB44L2MSU7YC7WQRJKMOGXZYNZKJFABB3YHSW7TF7JGJO74EDOVN6ZIR` | `148f97facfcb21fce68d66be686f1b956c215b93ff6b0eb91e7d91444dfea62e` |
| 4 | `GCV4HMDL6GWINPI3QWMD64IS2TEO5GLXYLCYDW5M232UQ5D3CWDJ24AX` | `77169f10c91481d8e62c8f2f1e1ae2f6f8802aee8dcf608dabd4d6990a8bd61b` |
| 5 | `GAIDNY7SKU2GW7OTQ7YAEJG4TYWUOJIHQONER7FLLVAQXEX4M5UKGZ4J` | `db30a056c076d18e2be9747ad349a4153f6763ed23ae41abc387ba119b6ffdf9` |
| 6 | `GA3N7T5ZUTQMPR622SE6TWNZGX5XG6ZWEPN75FTCR5BYHPDWGA3UIQQA` | `c162c8352e8880de802447a9fa20910831992eb866916c9df2a04cad52241aa3` |
| 7 | `GAWP7VDPNXEIM5BST3F6POYNHYAYLDTNYDSCPH3PCL2JGE32CZBZYVET` | `2e66cec2dd9ce9d13e2683b65128e691639dfd76fb66a895e72a5b887f9b4ff0` |
| 8 | `GCHQOBWHSGYXCRNBQSBWLCUJEH6SHFOUZUR2EZBL2Z6U6PYQL6DUF6HU` | `a96fff4ef6288542742c85e0d4cd6c216a573f67d7bdfadb9373b3ed67ba0278` |
| 9 | `GC6YVKL676G7223M7OJS5VCR25CKVKNRU2K7NHZFQBYCKKS6P3VU4DTX` | `6c3f5157cf0ef66d41aededd9cd4e1c654f3988d19031fac4d4a6bf4465174e0` |
| 10 | `GD3DPHYU5FXN7EGNAIZ4WOWBR2PVDCZCYKBHIEH3YVYYB52WT4R6ZA2A` | `9127ce4ceff123f8f8702e1464c810eeab33c88e8126c076b7bc73409be1309e` |
| 11 | `GD3M6WCITH2XREQPX3TT2U4S45CUQ6MDOXNLDH23PNDLWCJMPVSETWIW` | `5419b051b8e80f45e6458db7a4a2f508a70472b76414e77997511d3d2dac4de9` |

### Verification

These transactions demonstrate successful interaction of **11 unique Stellar Testnet wallets** with the GrantPulse decentralized application.

Verified interaction types include:

- ✅ Wallet connection
- ✅ Proposal creation
- ✅ Proposal voting
- ✅ Reputation token reward distribution
- ✅ Treasury transactions
- ✅ Smart contract execution on Stellar Soroban Testnet

This satisfies the requirement of demonstrating **10+ independent user wallet interactions** for the project.

GrantPulse is a production-ready community micro-grants MVP built on Stellar's Soroban smart contract framework. It upgrades the Level 2/3 voting mechanism into an integrated, governance-to-disbursement ecosystem. 

Communities pool funds into an on-chain treasury, submit funding proposals, and vote. Crucially, votes are weighted by each voter's on-chain reputation token balance (not a flat one-address-one-vote). Passing proposals automatically trigger disbursements from the treasury, and voting awards voters with +1 REP token to incentivize active governance participation.

---

## 📸 Interface Preview (User Placeholders)

- **Onboarding walkthrough & wallet setup:**
  ![Onboarding Walkthrough](./screenshots/onboarding.png)
- **Active and closed proposal dashboard with live vote progress:**
  ![Proposals Dashboard](./screenshots/proposals.png)
- **Treasury pool balance, XLM deposit portal, and disbursement history logs:**
  ![Treasury Dashboard](./screenshots/treasury.png)
- **Submit Proposal form with real-time balance and G-address validation:**
  ![Create Proposal Form](./screenshots/create_proposal.png)
- **Contextual rating & suggestion feedback widget:**
  ![Feedback Widget](./screenshots/feedback.png)

---

## 🛠️ The Three-Contract Smart Contract System

GrantPulse is composed of three interconnected smart contracts under the `contract/` workspace directory:

1. **`reputation_token` (SEP-41 Compliance + Snapshotting):**
   - Implements the Stellar SEP-41 token standard.
   - Restricts minting privileges exclusively to the `proposal_contract`.
   - Records historical balances at specific ledger sequences to prevent double-spending or mid-vote voting power manipulation.
2. **`proposal_contract` (Reputation-Weighted Governance):**
   - Manages the proposal lifecycle (create, vote, close, disburse).
   - Queries historical balances of voters at `start_ledger` of proposals to compute voting weights.
   - Minting reward: awards voters +1 REP token upon casting a vote to build long-term reputation.
   - Closes proposals after their deadline sequences, executing cross-contract calls to disburse funds if approved.
3. **`treasury_contract` (Decentralized Asset Escrow):**
   - Holds shared community funds (deposits of native XLM tokens).
   - Disbursement restriction: Only the authorized `proposal_contract` address can initiate disbursement.
   - Idempotency guard: enforces that a proposal ID can only disburse funds once.

---

## 💻 Production-Ready React Frontend

Our frontend (`frontend/`) is upgraded with the following production features:

- **Performance & Code-Splitting:** Heavy modules (Stellar SDK/Wallets Kit) are code-split. The Treasury tab is lazy-loaded, ensuring the initial load bundle is under budget.
- **RPC Polling Debouncing:** Debounces and batches polling requests into single aggregated requests to prevent RPC endpoint overload.
- **Onboarding Walkthrough:** Interactive tooltip/onboarding cards walk users through reputation mechanics and double-voting defenses.
- **Validation Rules:** The "Submit Proposal" form checks requested amounts against the current treasury balance, checks G-address formatting, and ensures deadlines are set in the future.
- **Actionable Error Taxonomy:** Detailed error states handle missing wallet extensions, user-rejections, insufficient gas fees, closed proposals, and underfunded treasury disbursements.
- **Lightweight Feedback Widget:** Slimes in contextually after the user's first successful vote or proposal creation, persisting feedback to a local mock database.
- **Telemetry & Error Boundary:** Simple wrappers simulate Plausible/PostHog analytics event logging and Sentry crash exception reporting. A custom Sentry Error Boundary prevents white screens on runtime errors.

---

## 🚀 Build, Test, and Deploy Guide

### Prerequisites
- Rust and `wasm32-unknown-unknown` target.
- Stellar CLI: `cargo install --locked stellar-cli`
- Node.js (v20.x+)

### 1. Run Smart Contract Tests
Run all 11 unit and integration tests across the workspace:
```bash
cd contract
cargo test
```
All tests should compile and pass successfully, confirming that proposal state changes, snapshots, reputation minting rewards, and treasury disbursement loops function perfectly.

### 2. Deploy and Initialize (Testnet)
Make sure you have a Stellar testnet identity `alice` configured in the Stellar CLI:
```bash
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet
```

Use our automated deployment scripts under the `scripts/` folder:
- **Windows (PowerShell):**
  ```powershell
  pwsh ./scripts/deploy.ps1
  ```
- **macOS / Linux (Shell):**
  ```bash
  chmod +x ./scripts/deploy.sh
  ./scripts/deploy.sh
  ```
The script will build all contracts, deploy them to the Testnet in dependency order, wire them together with their respective initialization parameters, and print their final contract IDs.

### 3. Configure the React App
Open `frontend/src/lib/contractConfig.ts` and replace the placeholder IDs with the printed contract IDs:
```typescript
export const REPUTATION_TOKEN_ID = 'YOUR_REP_TOKEN_CONTRACT_ID';
export const TREASURY_CONTRACT_ID = 'YOUR_TREASURY_CONTRACT_ID';
export const PROPOSAL_CONTRACT_ID = 'YOUR_PROPOSAL_CONTRACT_ID';
```

### 4. Run the React App
```bash
cd frontend
npm install --ignore-scripts
npm run dev
```
Open `http://localhost:5173` to test the MVP.
To compile the production build:
```bash
npm run build
```

---

## 🔒 Extended Error Taxonomy

- **`Wallet Not Installed`:** Triggers when Freighter, xBull, or Albedo are missing, advising on installation steps.
- **`Transaction Rejected`:** Catches user cancelation popups during wallet signing.
- **`Insufficient Gas`:** Catches underfunded accounts trying to execute actions.
- **`Already Voted`:** Custom contract message caught and shown inside the proposal card.
- **`Voting Deadline Passed`:** Restricts actions on proposals that have expired.
- **`Treasury Insufficient Balance`:** Rejects creation of proposals requesting more than the treasury pool or blocks disbursement closures if underfunded.
