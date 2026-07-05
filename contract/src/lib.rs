#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, symbol_short, Address, Env, Map, String, Symbol, Vec,
};

// ---------- Storage keys ----------

const QUESTION: Symbol = symbol_short!("QUESTION");
const OPTIONS: Symbol = symbol_short!("OPTIONS");
const VOTES: Symbol = symbol_short!("VOTES");
const VOTERS: Symbol = symbol_short!("VOTERS");
const INIT: Symbol = symbol_short!("INIT");

// ---------- Errors ----------

#[contracterror]
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum PollError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidOption = 3,
    AlreadyVoted = 4,
}

#[contract]
pub struct LivePollContract;

#[contractimpl]
impl LivePollContract {
    /// Set up the poll once. Panics if already initialized.
    pub fn initialize(env: Env, question: String, options: Vec<String>) -> Result<(), PollError> {
        if env.storage().instance().has(&INIT) {
            return Err(PollError::AlreadyInitialized);
        }

        let mut votes: Map<u32, u64> = Map::new(&env);
        for i in 0..options.len() {
            votes.set(i, 0u64);
        }

        env.storage().instance().set(&QUESTION, &question);
        env.storage().instance().set(&OPTIONS, &options);
        env.storage().instance().set(&VOTES, &votes);
        env.storage()
            .instance()
            .set(&VOTERS, &Vec::<Address>::new(&env));
        env.storage().instance().set(&INIT, &true);

        // Extend the instance TTL so poll data survives long enough on testnet.
        env.storage().instance().extend_ttl(200_000, 200_000);
        Ok(())
    }

    /// Cast a vote for `option_index`. Requires the voter's signature and
    /// rejects a second vote from the same address.
    pub fn vote(env: Env, voter: Address, option_index: u32) -> Result<(), PollError> {
        voter.require_auth();

        if !env.storage().instance().has(&INIT) {
            return Err(PollError::NotInitialized);
        }

        let options: Vec<String> = env.storage().instance().get(&OPTIONS).unwrap();
        if option_index >= options.len() {
            return Err(PollError::InvalidOption);
        }

        let mut voters: Vec<Address> = env.storage().instance().get(&VOTERS).unwrap();
        if !voters.iter().any(|v| v == voter) {
            voters.push_back(voter.clone());
        }

        let mut votes: Map<u32, u64> = env.storage().instance().get(&VOTES).unwrap();
        let current = votes.get(option_index).unwrap_or(0);
        let new_count = current + 1;
        votes.set(option_index, new_count);

        env.storage().instance().set(&VOTES, &votes);
        env.storage().instance().set(&VOTERS, &voters);
        env.storage().instance().extend_ttl(200_000, 200_000);

        // Emit an event so the frontend can react in real time without polling
        // full contract state every time.
        env.events().publish(
            (symbol_short!("vote"), voter),
            (option_index, new_count),
        );
        Ok(())
    }

    /// Read-only: the poll question.
    pub fn get_question(env: Env) -> String {
        env.storage()
            .instance()
            .get(&QUESTION)
            .unwrap_or_else(|| String::from_str(&env, ""))
    }

    /// Read-only: each option paired with its current vote count, in order.
    pub fn get_results(env: Env) -> Vec<(String, u64)> {
        let options: Vec<String> = env
            .storage()
            .instance()
            .get(&OPTIONS)
            .unwrap_or_else(|| Vec::new(&env));
        let votes: Map<u32, u64> = env
            .storage()
            .instance()
            .get(&VOTES)
            .unwrap_or_else(|| Map::new(&env));

        let mut results: Vec<(String, u64)> = Vec::new(&env);
        for i in 0..options.len() {
            let label = options.get(i).unwrap();
            let count = votes.get(i).unwrap_or(0);
            results.push_back((label, count));
        }
        results
    }

    /// Read-only: has this address already voted?
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Vec<Address> = env
            .storage()
            .instance()
            .get(&VOTERS)
            .unwrap_or_else(|| Vec::new(&env));
        voters.iter().any(|v| v == voter)
    }
}

mod test;
