#![no_std]
use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, Address,
    Env, String, Symbol, Vec,
};

// --- Cross-Contract Client Interfaces ---

#[contractclient(name = "ReputationTokenClient")]
pub trait ReputationTokenInterface {
    fn mint(env: Env, voter: Address, amount: i128);
    fn snapshot_balance(env: Env, voter: Address, ledger_sequence: u32) -> i128;
}

#[contractclient(name = "TreasuryContractClient")]
pub trait TreasuryContractInterface {
    fn disburse(env: Env, proposal_id: u32, recipient: Address, amount: i128);
}

// --- Storage Keys and Structure ---

const ADMIN: Symbol = symbol_short!("ADMIN");
const REPUTATION_TOKEN: Symbol = symbol_short!("REP_TOK");
const TREASURY_CONTRACT: Symbol = symbol_short!("TREASURY");
const PROPOSAL_COUNT: Symbol = symbol_short!("COUNT");

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Proposal {
    pub id: u32,
    pub creator: Address,
    pub title: String,
    pub description: String,
    pub requested_amount: i128,
    pub recipient: Address,
    pub start_ledger: u32,
    pub voting_deadline_ledger: u32,
    pub support_votes: i128,
    pub oppose_votes: i128,
    pub closed: bool,
    pub approved: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct VotedDataKey {
    pub proposal_id: u32,
    pub voter: Address,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Proposal(u32),
    Voted(VotedDataKey),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ProposalError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    ProposalNotFound = 3,
    ProposalClosed = 4,
    VotingDeadlinePassed = 5,
    VotingDeadlineNotReached = 6,
    AlreadyVoted = 7,
    InvalidDeadline = 8,
}

#[contract]
pub struct ProposalContract;

#[contractimpl]
impl ProposalContract {
    /// Initialize the proposal contract.
    pub fn initialize(
        env: Env,
        admin: Address,
        reputation_token: Address,
        treasury_contract: Address,
    ) -> Result<(), ProposalError> {
        if env.storage().instance().has(&ADMIN) {
            return Err(ProposalError::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&REPUTATION_TOKEN, &reputation_token);
        env.storage().instance().set(&TREASURY_CONTRACT, &treasury_contract);
        env.storage().instance().set(&PROPOSAL_COUNT, &0u32);
        env.storage().instance().extend_ttl(4000, 10000);
        Ok(())
    }

    /// Create a new proposal.
    pub fn create_proposal(
        env: Env,
        creator: Address,
        title: String,
        description: String,
        requested_amount: i128,
        recipient: Address,
        voting_deadline_ledger: u32,
    ) -> Result<u32, ProposalError> {
        creator.require_auth();

        let seq = env.ledger().sequence();
        if voting_deadline_ledger <= seq {
            return Err(ProposalError::InvalidDeadline);
        }

        let mut count: u32 = env.storage().instance().get(&PROPOSAL_COUNT).unwrap_or(0);
        count += 1;
        env.storage().instance().set(&PROPOSAL_COUNT, &count);

        let proposal = Proposal {
            id: count,
            creator,
            title,
            description,
            requested_amount,
            recipient,
            start_ledger: seq,
            voting_deadline_ledger,
            support_votes: 0,
            oppose_votes: 0,
            closed: false,
            approved: false,
        };

        let key = DataKey::Proposal(count);
        env.storage().persistent().set(&key, &proposal);
        env.storage().persistent().extend_ttl(&key, 4000, 10000);

        env.events().publish((symbol_short!("created"), count), requested_amount);
        Ok(count)
    }

    /// Vote on a proposal.
    pub fn vote(
        env: Env,
        voter: Address,
        proposal_id: u32,
        support: bool,
    ) -> Result<(), ProposalError> {
        voter.require_auth();

        let key = DataKey::Proposal(proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ProposalError::ProposalNotFound)?;

        if proposal.closed {
            return Err(ProposalError::ProposalClosed);
        }

        if env.ledger().sequence() >= proposal.voting_deadline_ledger {
            return Err(ProposalError::VotingDeadlinePassed);
        }

        let voted_key = DataKey::Voted(VotedDataKey {
            proposal_id,
            voter: voter.clone(),
        });
        if env.storage().persistent().has(&voted_key) {
            return Err(ProposalError::AlreadyVoted);
        }

        let rep_token_address: Address = env
            .storage()
            .instance()
            .get(&REPUTATION_TOKEN)
            .ok_or(ProposalError::NotInitialized)?;

        let rep_client = ReputationTokenClient::new(&env, &rep_token_address);
        let weight = rep_client.snapshot_balance(&voter, &proposal.start_ledger);

        if support {
            proposal.support_votes += weight;
        } else {
            proposal.oppose_votes += weight;
        }

        // Mark as voted
        env.storage().persistent().set(&voted_key, &true);
        env.storage().persistent().extend_ttl(&voted_key, 4000, 10000);

        // Update proposal
        env.storage().persistent().set(&key, &proposal);
        env.storage().persistent().extend_ttl(&key, 4000, 10000);

        // Mint participation reward (1 point)
        rep_client.mint(&voter, &1);

        env.events().publish((symbol_short!("vote"), proposal_id, voter), weight);
        Ok(())
    }

    /// Close the proposal and trigger treasury disbursement if approved.
    pub fn close_proposal(env: Env, proposal_id: u32) -> Result<(), ProposalError> {
        let key = DataKey::Proposal(proposal_id);
        let mut proposal: Proposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ProposalError::ProposalNotFound)?;

        if proposal.closed {
            return Err(ProposalError::ProposalClosed);
        }

        if env.ledger().sequence() < proposal.voting_deadline_ledger {
            return Err(ProposalError::VotingDeadlineNotReached);
        }

        proposal.closed = true;

        if proposal.support_votes > proposal.oppose_votes {
            proposal.approved = true;

            let treasury_address: Address = env
                .storage()
                .instance()
                .get(&TREASURY_CONTRACT)
                .ok_or(ProposalError::NotInitialized)?;

            let treasury_client = TreasuryContractClient::new(&env, &treasury_address);
            treasury_client.disburse(&proposal_id, &proposal.recipient, &proposal.requested_amount);
        } else {
            proposal.approved = false;
        }

        env.storage().persistent().set(&key, &proposal);
        env.storage().persistent().extend_ttl(&key, 4000, 10000);

        env.events().publish((symbol_short!("closed"), proposal_id), proposal.approved);
        Ok(())
    }

    /// Read view: get details of a specific proposal.
    pub fn get_proposal(env: Env, proposal_id: u32) -> Result<Proposal, ProposalError> {
        let key = DataKey::Proposal(proposal_id);
        env.storage()
            .persistent()
            .get(&key)
            .ok_or(ProposalError::ProposalNotFound)
    }

    /// Read view: list all proposals.
    pub fn list_proposals(env: Env) -> Vec<Proposal> {
        let count: u32 = env.storage().instance().get(&PROPOSAL_COUNT).unwrap_or(0);
        let mut list = Vec::new(&env);
        for i in 1..=count {
            let key = DataKey::Proposal(i);
            if let Some(prop) = env.storage().persistent().get::<DataKey, Proposal>(&key) {
                list.push_back(prop);
            }
        }
        list
    }

    /// Read view: get the snapshot vote weight for a voter.
    pub fn get_vote_weight(env: Env, voter: Address, proposal_id: u32) -> Result<i128, ProposalError> {
        let key = DataKey::Proposal(proposal_id);
        let proposal: Proposal = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(ProposalError::ProposalNotFound)?;

        let rep_token_address: Address = env
            .storage()
            .instance()
            .get(&REPUTATION_TOKEN)
            .ok_or(ProposalError::NotInitialized)?;

        let rep_client = ReputationTokenClient::new(&env, &rep_token_address);
        Ok(rep_client.snapshot_balance(&voter, &proposal.start_ledger))
    }

    /// Read view: has this voter voted?
    pub fn has_voted(env: Env, voter: Address, proposal_id: u32) -> bool {
        let voted_key = DataKey::Voted(VotedDataKey { proposal_id, voter });
        env.storage().persistent().has(&voted_key)
    }
}

mod test;
