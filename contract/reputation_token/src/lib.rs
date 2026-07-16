#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, Address, Env, String, Symbol, Vec,
};

// Global storage keys using Symbol
const ADMIN: Symbol = symbol_short!("ADMIN");
const PROPOSAL_CONTRACT: Symbol = symbol_short!("PROP_CON");
const NAME: Symbol = symbol_short!("NAME");
const SYMBOL: Symbol = symbol_short!("SYMBOL");
const DECIMALS: Symbol = symbol_short!("DECIMALS");
const TOTAL_SUPPLY: Symbol = symbol_short!("SUPPLY");

#[derive(Clone)]
#[contracttype]
pub struct AllowanceDataKey {
    pub from: Address,
    pub spender: Address,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Balance(Address),
    Allowance(AllowanceDataKey),
    History(Address), // Stores Vec<(u32, i128)> for balance snapshots
}

#[contract]
pub struct ReputationToken;

fn get_balance(env: &Env, voter: &Address) -> i128 {
    env.storage().persistent().get(&DataKey::Balance(voter.clone())).unwrap_or(0)
}

fn set_balance(env: &Env, voter: &Address, amount: i128) {
    env.storage().persistent().set(&DataKey::Balance(voter.clone()), &amount);
    env.storage().persistent().extend_ttl(&DataKey::Balance(voter.clone()), 4000, 10000);
    
    // Snapshot history: append (ledger_sequence, balance)
    let seq = env.ledger().sequence();
    let history_key = DataKey::History(voter.clone());
    let mut history: Vec<(u32, i128)> = env.storage().persistent().get(&history_key).unwrap_or_else(|| Vec::new(&env));
    
    // If multiple transfers happen in the same ledger sequence, overwrite the last one
    if !history.is_empty() && history.last().unwrap().0 == seq {
        history.pop_back();
    }
    history.push_back((seq, amount));
    env.storage().persistent().set(&history_key, &history);
    env.storage().persistent().extend_ttl(&history_key, 4000, 10000);
}

#[contractimpl]
impl ReputationToken {
    /// Initialize the reputation token.
    pub fn initialize(
        env: Env,
        admin: Address,
        proposal_contract: Address,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        if env.storage().instance().has(&ADMIN) {
            panic!("already initialized");
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&PROPOSAL_CONTRACT, &proposal_contract);
        env.storage().instance().set(&NAME, &name);
        env.storage().instance().set(&SYMBOL, &symbol);
        env.storage().instance().set(&DECIMALS, &decimals);
        env.storage().instance().set(&TOTAL_SUPPLY, &0i128);
        env.storage().instance().extend_ttl(4000, 10000);
    }

    /// Update the proposal contract address. Only callable by admin.
    pub fn set_proposal_contract(env: Env, proposal_contract: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&PROPOSAL_CONTRACT, &proposal_contract);
    }

    /// Update the admin address. Only callable by current admin.
    pub fn set_admin(env: Env, new_admin: Address) {
        let admin: Address = env.storage().instance().get(&ADMIN).expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&ADMIN, &new_admin);
    }

    /// Mint new reputation. Only callable by the proposal contract.
    pub fn mint(env: Env, voter: Address, amount: i128) {
        let proposal_contract: Address = env
            .storage()
            .instance()
            .get(&PROPOSAL_CONTRACT)
            .expect("proposal contract not set");
        proposal_contract.require_auth();

        if amount < 0 {
            panic!("amount must be non-negative");
        }

        let bal = get_balance(&env, &voter);
        set_balance(&env, &voter, bal + amount);

        let mut total_supply: i128 = env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0);
        total_supply += amount;
        env.storage().instance().set(&TOTAL_SUPPLY, &total_supply);

        env.events().publish((symbol_short!("mint"), voter), amount);
    }

    /// Read path for historical balance at or before a given ledger sequence.
    pub fn snapshot_balance(env: Env, voter: Address, ledger_sequence: u32) -> i128 {
        let history_key = DataKey::History(voter);
        let history: Vec<(u32, i128)> = env.storage().persistent().get(&history_key).unwrap_or_else(|| Vec::new(&env));
        
        let mut last_balance = 0i128;
        for entry in history.iter() {
            let (seq, bal) = entry;
            if seq <= ledger_sequence {
                last_balance = bal;
            } else {
                break;
            }
        }
        last_balance
    }

    // --- SEP-41 Fungible Token Interface ---

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage().instance().extend_ttl(4000, 10000);
        get_balance(&env, &id)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        if amount < 0 {
            panic!("amount must be non-negative");
        }
        let from_bal = get_balance(&env, &from);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        let to_bal = get_balance(&env, &to);
        
        set_balance(&env, &from, from_bal - amount);
        set_balance(&env, &to, to_bal + amount);

        env.events().publish((symbol_short!("transfer"), from, to), amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        if amount < 0 {
            panic!("amount must be non-negative");
        }

        let allowance_key = DataKey::Allowance(AllowanceDataKey { from: from.clone(), spender: spender.clone() });
        let allowance: (i128, u32) = env.storage().persistent().get(&allowance_key).unwrap_or((0, 0));

        if allowance.1 < env.ledger().sequence() {
            panic!("allowance expired");
        }
        if allowance.0 < amount {
            panic!("insufficient allowance");
        }

        // Update allowance
        let new_allowance = allowance.0 - amount;
        env.storage().persistent().set(&allowance_key, &(new_allowance, allowance.1));
        env.storage().persistent().extend_ttl(&allowance_key, 4000, 10000);

        let from_bal = get_balance(&env, &from);
        if from_bal < amount {
            panic!("insufficient balance");
        }
        let to_bal = get_balance(&env, &to);

        set_balance(&env, &from, from_bal - amount);
        set_balance(&env, &to, to_bal + amount);

        env.events().publish((symbol_short!("transfer"), from, to), amount);
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        if amount < 0 {
            panic!("amount must be non-negative");
        }

        let key = DataKey::Allowance(AllowanceDataKey { from: from.clone(), spender });
        env.storage().persistent().set(&key, &(amount, expiration_ledger));
        env.storage().persistent().extend_ttl(&key, 4000, 10000);

        env.events().publish((symbol_short!("approve"), from), amount);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(AllowanceDataKey { from, spender });
        let val: Option<(i128, u32)> = env.storage().persistent().get(&key);
        if let Some((amount, expiration)) = val {
            if expiration >= env.ledger().sequence() {
                return amount;
            }
        }
        0
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DECIMALS).unwrap_or(0)
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&NAME).unwrap_or_else(|| String::from_str(&env, ""))
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&SYMBOL).unwrap_or_else(|| String::from_str(&env, ""))
    }

    pub fn total_supply(env: Env) -> i128 {
        env.storage().instance().get(&TOTAL_SUPPLY).unwrap_or(0)
    }
}

mod test;
