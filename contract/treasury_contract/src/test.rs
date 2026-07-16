#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, token};

fn setup_treasury(env: &Env) -> (Address, Address, Address, TreasuryContractClient<'_>, token::Client<'_>, token::StellarAssetClient<'_>) {
    let admin = Address::generate(env);
    let proposal_contract = Address::generate(env);
    
    // Register mock token (Stellar Asset Contract)
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(env, &token_address);
    
    // Register treasury contract
    let contract_id = env.register_contract(None, TreasuryContract);
    let client = TreasuryContractClient::new(env, &contract_id);
    
    // Initialize treasury
    client.initialize(&admin, &proposal_contract, &token_address);
    
    // Register dummy contract at proposal_contract address to support env.as_contract
    env.register_contract(Some(&proposal_contract), TreasuryContract);
    
    (admin, proposal_contract, token_address, client, token_client, token_admin_client)
}

#[test]
fn test_deposit_and_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, _proposal, _token_address, client, token_client, token_admin_client) = setup_treasury(&env);
    
    let depositor = Address::generate(&env);
    
    // Mint tokens to depositor
    token_admin_client.mint(&depositor, &1000);
    
    // Deposit into treasury
    client.deposit(&depositor, &400);
    
    assert_eq!(client.get_balance(), 400);
    assert_eq!(token_client.balance(&depositor), 600);
}

#[test]
fn test_disburse_success_and_history() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, proposal_contract, _token_address, client, token_client, token_admin_client) = setup_treasury(&env);
    
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    token_admin_client.mint(&depositor, &1000);
    client.deposit(&depositor, &500);
    
    // Call disburse as the proposal contract
    env.as_contract(&proposal_contract, || {
        client.disburse(&1u32, &recipient, &200);
    });
    
    assert_eq!(client.get_balance(), 300);
    assert_eq!(token_client.balance(&recipient), 200);
    
    let history = client.get_disbursement_history();
    assert_eq!(history.len(), 1);
    let record = history.get(0).unwrap();
    assert_eq!(record.proposal_id, 1);
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.amount, 200);
}

#[test]
fn test_disburse_idempotency_guard() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, proposal_contract, _token_address, client, _token_client, token_admin_client) = setup_treasury(&env);
    
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    token_admin_client.mint(&depositor, &1000);
    client.deposit(&depositor, &500);
    
    // First disburse
    env.as_contract(&proposal_contract, || {
        client.disburse(&1u32, &recipient, &200);
    });
    
    // Second disburse with same proposal ID should fail
    env.as_contract(&proposal_contract, || {
        let res = client.try_disburse(&1u32, &recipient, &100);
        assert!(res.is_err());
    });
    
    assert_eq!(client.get_balance(), 300);
}

#[test]
fn test_disburse_insufficient_balance() {
    let env = Env::default();
    env.mock_all_auths();
    let (_admin, proposal_contract, _token_address, client, _token_client, token_admin_client) = setup_treasury(&env);
    
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    token_admin_client.mint(&depositor, &100);
    client.deposit(&depositor, &50);
    
    // Try to disburse more than balance
    env.as_contract(&proposal_contract, || {
        let res = client.try_disburse(&1u32, &recipient, &100);
        assert!(res.is_err());
    });
}
