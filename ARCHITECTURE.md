# GrantPulse Architecture Spec

This document details the smart contract structure, state storage layouts, and interaction flows for the GrantPulse reputation-weighted micro-grants platform.

---

## 🏗️ System Component Architecture

```mermaid
graph TD
    User([User / Voter])
    Freighter[Freighter/Stellar Wallet]
    Frontend[Vite React Frontend]
    RPC[Soroban RPC Testnet]

    subgraph Soroban Smart Contracts
        PC[proposal_contract]
        RT[reputation_token]
        TC[treasury_contract]
    end

    User -->|Connect / Actions| Frontend
    Frontend -->|Requests XDR| Freighter
    Freighter -->|Signs XDR| Frontend
    Frontend -->|Submits Tx| RPC
    RPC -->|Executes| PC
    
    PC -->|Verify Balance Snapshot| RT
    PC -->|Disburse Approved Funds| TC
    TC -->|Transfer XLM| Recipient([Recipient Wallet])
    PC -->|Award +1 REP Reward| RT
```

---

## 🗄️ Smart Contract State & Storage Layouts

### 1. Reputation Token (`reputation_token`)
- **`ADMIN`** (Instance): Admin address (only admin can initialize, and proposal contract is configured as authorized minter).
- **`PROPOSAL_CONTRACT`** (Instance): Address of the authorized governance contract.
- **`METADATA`** (Instance): Token name, symbol, decimals.
- **`DataKey::Balance(Address)`** (Persistent): The current REP balance of an address.
- **`DataKey::Snapshot(SnapshotKey)`** (Persistent): Stores the snapshot balance for an address at a specific ledger sequence.
  - `SnapshotKey` is structured as `struct SnapshotKey { owner: Address, sequence: u32 }`

### 2. Proposal Contract (`proposal_contract`)
- **`ADMIN`** (Instance): Address of the system admin.
- **`REP_TOK`** (Instance): Address of the `reputation_token` contract.
- **`TREASURY`** (Instance): Address of the `treasury_contract` contract.
- **`COUNT`** (Instance): Total number of proposals created (u32 counter).
- **`DataKey::Proposal(u32)`** (Persistent): The `Proposal` struct containing detail details.
- **`DataKey::Voted(VotedDataKey)`** (Persistent): Tracks whether a voter has cast a vote.
  - `VotedDataKey` is structured as `struct VotedDataKey { proposal_id: u32, voter: Address }`

### 3. Treasury Contract (`treasury_contract`)
- **`ADMIN`** (Instance): Address of the system admin.
- **`PROPOSAL_CONTRACT`** (Instance): Address of the authorized governance contract.
- **`TOKEN`** (Instance): Address of the native XLM token contract.
- **`DataKey::History`** (Persistent): A vector of recorded disbursements.
- **`DataKey::Disbursed(u32)`** (Persistent): Idempotency flag verifying if a proposal ID has already been disbursed.

---

## 🔄 Interaction Sequence Flows

### 1. Voting Flow (Snapshot Verification + Minting Reward)
This sequence displays how double-voting is rejected, voting weight is calculated at a past snapshot ledger, and how the voter receives reputation rewards.

```mermaid
sequenceDiagram
    autonumber
    actor User as Voter
    participant Frontend
    participant PC as proposal_contract
    participant RT as reputation_token

    User->>Frontend: Click "Vote YES"
    Frontend->>PC: vote(voter, proposal_id, support)
    Note over PC: Check: Proposal exists and not closed
    Note over PC: Check: Deadline not passed
    Note over PC: Check: Voter has not voted on this proposal
    PC->>RT: snapshot_balance(voter, proposal.start_ledger)
    RT-->>PC: Return weight (e.g. 50 REP)
    Note over PC: Add weight to tallies
    Note over PC: Record Voted(voter, proposal_id) = true
    PC->>RT: mint(voter, 1)
    Note over RT: Verify caller is proposal_contract
    RT-->>PC: Minted +1 REP
    PC-->>Frontend: Transaction Confirmed
    Frontend-->>User: Refresh Vote Count & Balances
```

### 2. Close and Disbursement Flow (Governance-To-Escrow Payout)
This sequence displays how closing a proposal triggers the treasury check and payouts.

```mermaid
sequenceDiagram
    autonumber
    actor User as Anyone
    participant Frontend
    participant PC as proposal_contract
    participant TC as treasury_contract
    participant Token as Native Token (XLM)

    User->>Frontend: Click "Finalize Voting & Disburse"
    Frontend->>PC: close_proposal(proposal_id)
    Note over PC: Check: Deadline passed
    Note over PC: Check: Proposal not already closed
    Note over PC: Tally results: support_votes > oppose_votes
    PC->>TC: disburse(proposal_id, recipient, requested_amount)
    Note over TC: Verify caller is proposal_contract
    Note over TC: Verify proposal_id not already disbursed (Idempotency)
    TC->>Token: transfer(treasury, recipient, requested_amount)
    Token-->>TC: Transfer success
    Note over TC: Set Disbursed(proposal_id) = true
    Note over TC: Append to Disbursement History
    TC-->>PC: Disbursement success
    Note over PC: Set proposal.closed = true, proposal.approved = true
    PC-->>Frontend: Transaction Confirmed
    Frontend-->>User: Display Approved/Disbursed status
```
