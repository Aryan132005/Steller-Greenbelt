#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, testutils::LedgerInfo, Env, String};

fn setup_token(env: &Env) -> (Address, Address, ReputationTokenClient<'_>) {
    let admin = Address::generate(env);
    let proposal_contract = Address::generate(env);
    
    // Register a dummy contract at the proposal_contract address so that
    // env.as_contract(&proposal_contract, ...) is valid and doesn't fail with MissingValue.
    env.register_contract(Some(&proposal_contract), ReputationToken);
    
    let contract_id = env.register_contract(None, ReputationToken);
    let client = ReputationTokenClient::new(env, &contract_id);
    
    let name = String::from_str(env, "Reputation Token");
    let symbol = String::from_str(env, "REP");
    client.initialize(&admin, &proposal_contract, &name, &symbol, &0);
    
    (admin, proposal_contract, client)
}

#[test]
fn test_initialize_and_metadata() {
    let env = Env::default();
    let (_, _, client) = setup_token(&env);
    
    assert_eq!(client.name(), String::from_str(&env, "Reputation Token"));
    assert_eq!(client.symbol(), String::from_str(&env, "REP"));
    assert_eq!(client.decimals(), 0);
    assert_eq!(client.total_supply(), 0);
}

#[test]
fn test_mint_authorized_only() {
    let env = Env::default();
    let (_admin, proposal_contract, client) = setup_token(&env);
    let voter = Address::generate(&env);
    
    // Simulate proposal contract calling mint
    env.as_contract(&proposal_contract, || {
        client.mint(&voter, &10);
    });
    
    assert_eq!(client.balance(&voter), 10);
    assert_eq!(client.total_supply(), 10);
}

#[test]
fn test_sep41_transfers() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, proposal_contract, client) = setup_token(&env);
    
    let user_a = Address::generate(&env);
    let user_b = Address::generate(&env);
    
    env.as_contract(&proposal_contract, || {
        client.mint(&user_a, &100);
    });
    
    client.transfer(&user_a, &user_b, &40);
    assert_eq!(client.balance(&user_a), 60);
    assert_eq!(client.balance(&user_b), 40);
}

#[test]
fn test_sep41_allowance_and_transfer_from() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, proposal_contract, client) = setup_token(&env);
    
    let owner = Address::generate(&env);
    let spender = Address::generate(&env);
    let recipient = Address::generate(&env);
    
    env.as_contract(&proposal_contract, || {
        client.mint(&owner, &100);
    });
    
    let current_ledger = env.ledger().sequence();
    client.approve(&owner, &spender, &50, &(current_ledger + 100));
    assert_eq!(client.allowance(&owner, &spender), 50);
    
    client.transfer_from(&spender, &owner, &recipient, &30);
    assert_eq!(client.balance(&owner), 70);
    assert_eq!(client.balance(&recipient), 30);
    assert_eq!(client.allowance(&owner, &spender), 20);
}

#[test]
fn test_snapshot_balances() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, proposal_contract, client) = setup_token(&env);
    let voter = Address::generate(&env);
    
    // Set ledger to 10
    env.ledger().set(LedgerInfo {
        timestamp: 0,
        protocol_version: 20,
        sequence_number: 10,
        network_id: [0; 32],
        base_reserve: 0,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 1000000,
    });
    
    env.as_contract(&proposal_contract, || {
        client.mint(&voter, &50);
    });
    
    // Set ledger to 20 and mint again
    env.ledger().set(LedgerInfo {
        timestamp: 0,
        protocol_version: 20,
        sequence_number: 20,
        network_id: [0; 32],
        base_reserve: 0,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 1000000,
    });
    
    env.as_contract(&proposal_contract, || {
        client.mint(&voter, &30);
    });
    
    // Verify balance snapshots
    assert_eq!(client.snapshot_balance(&voter, &5), 0);
    assert_eq!(client.snapshot_balance(&voter, &10), 50);
    assert_eq!(client.snapshot_balance(&voter, &15), 50);
    assert_eq!(client.snapshot_balance(&voter, &20), 80);
    assert_eq!(client.snapshot_balance(&voter, &25), 80);
}
