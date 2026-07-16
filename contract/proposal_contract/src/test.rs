#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, testutils::Ledger, testutils::LedgerInfo, Env, String, token};
use reputation_token::{ReputationToken, ReputationTokenClient};
use treasury_contract::{TreasuryContract, TreasuryContractClient};

struct TestEnv {
    env: Env,
    admin: Address,
    voter_a: Address,
    voter_b: Address,
    voter_c: Address,
    recipient: Address,
    rep_client: ReputationTokenClient<'static>,
    treasury_client: TreasuryContractClient<'static>,
    proposal_client: ProposalContractClient<'static>,
    token_client: token::Client<'static>,
    token_admin_client: token::StellarAssetClient<'static>,
}

fn setup_integration_test() -> TestEnv {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let voter_a = Address::generate(&env);
    let voter_b = Address::generate(&env);
    let voter_c = Address::generate(&env);
    let recipient = Address::generate(&env);

    // 1. Deploy token contract (mock native XLM asset)
    let token_address = env.register_stellar_asset_contract(admin.clone());
    let token_client = token::Client::new(&env, &token_address);
    let token_admin_client = token::StellarAssetClient::new(&env, &token_address);

    // 2. Deploy reputation token
    let rep_id = env.register_contract(None, ReputationToken);
    let rep_client = ReputationTokenClient::new(&env, &rep_id);

    // 3. Deploy treasury contract
    let treasury_id = env.register_contract(None, TreasuryContract);
    let treasury_client = TreasuryContractClient::new(&env, &treasury_id);

    // 4. Deploy proposal contract
    let proposal_id = env.register_contract(None, ProposalContract);
    let proposal_client = ProposalContractClient::new(&env, &proposal_id);

    // 5. Initialize contracts
    rep_client.initialize(
        &admin,
        &proposal_id,
        &String::from_str(&env, "Reputation Token"),
        &String::from_str(&env, "REP"),
        &0,
    );

    treasury_client.initialize(&admin, &proposal_id, &token_address);

    proposal_client.initialize(&admin, &rep_id, &treasury_id);

    // Setup initial ledger info
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

    TestEnv {
        env,
        admin,
        voter_a,
        voter_b,
        voter_c,
        recipient,
        rep_client,
        treasury_client,
        proposal_client,
        token_client,
        token_admin_client,
    }
}

#[test]
fn test_integration_flow() {
    let TestEnv {
        env,
        admin: _,
        voter_a,
        voter_b,
        voter_c,
        recipient,
        rep_client,
        treasury_client,
        proposal_client,
        token_client,
        token_admin_client,
    } = setup_integration_test();

    // 1. Fund treasury
    let depositor = Address::generate(&env);
    token_admin_client.mint(&depositor, &10000);
    treasury_client.deposit(&depositor, &5000);
    assert_eq!(treasury_client.get_balance(), 5000);

    // 2. Setup initial reputation balances
    // Use env.as_contract because mint is restricted to proposal contract
    env.as_contract(&proposal_client.address, || {
        rep_client.mint(&voter_a, &10); // Voter A has 10 REP
        rep_client.mint(&voter_b, &50); // Voter B has 50 REP
        rep_client.mint(&voter_c, &100); // Voter C has 100 REP
    });

    // 3. Create a funding proposal
    // Deadline: ledger 20 (current ledger is 10)
    let prop_id = proposal_client.create_proposal(
        &voter_a,
        &String::from_str(&env, "Community Garden"),
        &String::from_str(&env, "Buy seeds and tools"),
        &1500i128,
        &recipient,
        &20u32,
    );
    assert_eq!(prop_id, 1);

    // 4. Cast votes
    // Voter A (10 REP) votes YES
    proposal_client.vote(&voter_a, &1u32, &true);
    // Voter B (50 REP) votes NO
    proposal_client.vote(&voter_b, &1u32, &false);

    // Check intermediate tallies
    let mut proposal = proposal_client.get_proposal(&1u32);
    assert_eq!(proposal.support_votes, 10);
    assert_eq!(proposal.oppose_votes, 50);

    // Voter C (100 REP) votes YES
    proposal_client.vote(&voter_c, &1u32, &true);

    // Tally should now be 110 YES vs 50 NO
    proposal = proposal_client.get_proposal(&1u32);
    assert_eq!(proposal.support_votes, 110);
    assert_eq!(proposal.oppose_votes, 50);

    // Double voting rejection check
    let res = proposal_client.try_vote(&voter_a, &1u32, &true);
    assert!(res.is_err()); // Already voted should reject

    // 5. Close proposal
    // Advance ledger to 25 (past deadline 20)
    env.ledger().set(LedgerInfo {
        timestamp: 0,
        protocol_version: 20,
        sequence_number: 25,
        network_id: [0; 32],
        base_reserve: 0,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 1000000,
    });

    // Close the proposal
    proposal_client.close_proposal(&1u32);

    // Verify proposal status
    proposal = proposal_client.get_proposal(&1u32);
    assert!(proposal.closed);
    assert!(proposal.approved);

    // Verify fund disbursement
    assert_eq!(treasury_client.get_balance(), 3500); // 5000 - 1500
    assert_eq!(token_client.balance(&recipient), 1500); // Recipient got 1500

    // Verify participation rewards (+1 reputation minted for voting)
    // Voter A: 10 + 1 = 11 REP
    // Voter B: 50 + 1 = 51 REP
    // Voter C: 100 + 1 = 101 REP
    assert_eq!(rep_client.balance(&voter_a), 11);
    assert_eq!(rep_client.balance(&voter_b), 51);
    assert_eq!(rep_client.balance(&voter_c), 101);
}

#[test]
fn test_snapshot_prevents_mid_vote_manipulation() {
    let TestEnv {
        env,
        admin: _,
        voter_a,
        voter_b,
        voter_c: _,
        recipient,
        rep_client,
        treasury_client: _,
        proposal_client,
        token_client: _,
        token_admin_client: _,
    } = setup_integration_test();

    // 1. Voter A has 10 REP, Voter B has 20 REP
    env.as_contract(&proposal_client.address, || {
        rep_client.mint(&voter_a, &10);
        rep_client.mint(&voter_b, &20);
    });

    // 2. Create proposal at ledger 10 (start_ledger)
    let prop_id = proposal_client.create_proposal(
        &voter_a,
        &String::from_str(&env, "Community Garden"),
        &String::from_str(&env, "Buy seeds"),
        &1000i128,
        &recipient,
        &20u32,
    );

    // 3. User B transfers 15 REP to User A mid-vote (at ledger 15)
    env.ledger().set(LedgerInfo {
        timestamp: 0,
        protocol_version: 20,
        sequence_number: 15,
        network_id: [0; 32],
        base_reserve: 0,
        min_temp_entry_ttl: 1,
        min_persistent_entry_ttl: 1,
        max_entry_ttl: 1000000,
    });

    rep_client.transfer(&voter_b, &voter_a, &15);

    // User A has 25 REP now, User B has 5 REP
    assert_eq!(rep_client.balance(&voter_a), 25);
    assert_eq!(rep_client.balance(&voter_b), 5);

    // 4. User A votes
    proposal_client.vote(&voter_a, &prop_id, &true);

    // 5. Verify User A's voting weight is still 10 (snapshot at ledger 10) and not 25!
    let proposal = proposal_client.get_proposal(&prop_id);
    assert_eq!(proposal.support_votes, 10);
}
