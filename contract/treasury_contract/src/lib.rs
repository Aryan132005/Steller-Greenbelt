#![no_std]
use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, symbol_short, token, Address, Env,
    Symbol, Vec,
};

// Global storage keys using Symbol
const ADMIN: Symbol = symbol_short!("ADMIN");
const PROPOSAL_CONTRACT: Symbol = symbol_short!("PROP_CON");
const TOKEN_ADDRESS: Symbol = symbol_short!("TOKEN_ADD");
const HISTORY: Symbol = symbol_short!("HISTORY");

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Disbursement {
    pub proposal_id: u32,
    pub recipient: Address,
    pub amount: i128,
    pub ledger_sequence: u32,
}

#[contracttype]
pub enum DataKey {
    Disbursed(u32), // proposal_id -> bool
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TreasuryError {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    Unauthorized = 3,
    AlreadyDisbursed = 4,
    InsufficientBalance = 5,
}

#[contract]
pub struct TreasuryContract;

#[contractimpl]
impl TreasuryContract {
    /// Initialize the treasury contract with admin, authorized proposal contract, and the asset token address.
    pub fn initialize(
        env: Env,
        admin: Address,
        proposal_contract: Address,
        token_address: Address,
    ) -> Result<(), TreasuryError> {
        if env.storage().instance().has(&ADMIN) {
            return Err(TreasuryError::AlreadyInitialized);
        }
        env.storage().instance().set(&ADMIN, &admin);
        env.storage().instance().set(&PROPOSAL_CONTRACT, &proposal_contract);
        env.storage().instance().set(&TOKEN_ADDRESS, &token_address);
        env.storage().instance().set(&HISTORY, &Vec::<Disbursement>::new(&env));
        env.storage().instance().extend_ttl(4000, 10000);
        Ok(())
    }

    /// Update the proposal contract address. Only callable by admin.
    pub fn set_proposal_contract(env: Env, proposal_contract: Address) -> Result<(), TreasuryError> {
        let admin: Address = env.storage().instance().get(&ADMIN).ok_or(TreasuryError::NotInitialized)?;
        admin.require_auth();
        env.storage().instance().set(&PROPOSAL_CONTRACT, &proposal_contract);
        Ok(())
    }

    /// Deposit funds into the treasury. Accepts native/asset tokens from depositor.
    pub fn deposit(env: Env, depositor: Address, amount: i128) -> Result<(), TreasuryError> {
        depositor.require_auth();
        if amount <= 0 {
            panic!("amount must be positive");
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&TOKEN_ADDRESS)
            .ok_or(TreasuryError::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_address);
        token_client.transfer(&depositor, &env.current_contract_address(), &amount);

        env.events().publish((symbol_short!("deposit"), depositor), amount);
        Ok(())
    }

    /// Disburse funds to recipient. Only callable by the registered proposal contract.
    pub fn disburse(
        env: Env,
        proposal_id: u32,
        recipient: Address,
        amount: i128,
    ) -> Result<(), TreasuryError> {
        let proposal_contract: Address = env
            .storage()
            .instance()
            .get(&PROPOSAL_CONTRACT)
            .ok_or(TreasuryError::NotInitialized)?;
        
        // Only the proposal contract is authorized to trigger disbursement
        proposal_contract.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        let disburse_key = DataKey::Disbursed(proposal_id);
        if env.storage().persistent().has(&disburse_key) {
            return Err(TreasuryError::AlreadyDisbursed);
        }

        let token_address: Address = env
            .storage()
            .instance()
            .get(&TOKEN_ADDRESS)
            .ok_or(TreasuryError::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_address);
        let balance = token_client.balance(&env.current_contract_address());
        if balance < amount {
            return Err(TreasuryError::InsufficientBalance);
        }

        // Perform disbursement
        token_client.transfer(&env.current_contract_address(), &recipient, &amount);

        // Mark as disbursed (Idempotency)
        env.storage().persistent().set(&disburse_key, &true);
        env.storage().persistent().extend_ttl(&disburse_key, 4000, 10000);

        // Record history log
        let mut history: Vec<Disbursement> = env.storage().instance().get(&HISTORY).unwrap_or_else(|| Vec::new(&env));
        let record = Disbursement {
            proposal_id,
            recipient: recipient.clone(),
            amount,
            ledger_sequence: env.ledger().sequence(),
        };
        history.push_back(record);
        env.storage().instance().set(&HISTORY, &history);
        env.storage().instance().extend_ttl(4000, 10000);

        env.events().publish(
            (symbol_short!("disburse"), proposal_id, recipient),
            amount,
        );

        Ok(())
    }

    /// Returns the current treasury balance.
    pub fn get_balance(env: Env) -> Result<i128, TreasuryError> {
        let token_address: Address = env
            .storage()
            .instance()
            .get(&TOKEN_ADDRESS)
            .ok_or(TreasuryError::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_address);
        Ok(token_client.balance(&env.current_contract_address()))
    }

    /// Returns the complete disbursement history.
    pub fn get_disbursement_history(env: Env) -> Result<Vec<Disbursement>, TreasuryError> {
        let history: Vec<Disbursement> = env
            .storage()
            .instance()
            .get(&HISTORY)
            .unwrap_or_else(|| Vec::new(&env));
        Ok(history)
    }
}

mod test;
