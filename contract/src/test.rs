#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, vec, Env};

fn setup(env: &Env) -> (LivePollContractClient<'_>, Vec<String>) {
    let contract_id = env.register_contract(None, LivePollContract);
    let client = LivePollContractClient::new(env, &contract_id);

    let options = vec![
        env,
        String::from_str(env, "Rust"),
        String::from_str(env, "TypeScript"),
        String::from_str(env, "Both"),
    ];
    let question = String::from_str(env, "Favorite language for Soroban dev?");

    client.initialize(&question, &options);
    (client, options)
}

#[test]
fn test_initialize_sets_question_and_zeroed_results() {
    let env = Env::default();
    let (client, options) = setup(&env);

    assert_eq!(
        client.get_question(),
        String::from_str(&env, "Favorite language for Soroban dev?")
    );

    let results = client.get_results();
    assert_eq!(results.len(), options.len());
    for i in 0..results.len() {
        let (_, count) = results.get(i).unwrap();
        assert_eq!(count, 0);
    }
}

#[test]
fn test_double_initialize_panics() {
    let env = Env::default();
    let (client, options) = setup(&env);
    let res = client.try_initialize(&client.get_question(), &options);
    assert!(res.is_err());
}

#[test]
fn test_successful_vote_increments_count_and_marks_voter() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _options) = setup(&env);

    let voter = Address::generate(&env);
    client.vote(&voter, &1u32);

    let results = client.get_results();
    let (_, count) = results.get(1).unwrap();
    assert_eq!(count, 1);
    assert!(client.has_voted(&voter));
}

#[test]
fn test_multiple_votes_allowed() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _options) = setup(&env);

    let voter = Address::generate(&env);
    client.vote(&voter, &0u32);
    client.vote(&voter, &0u32);
    client.vote(&voter, &2u32);

    let results = client.get_results();
    let (_, count_0) = results.get(0).unwrap();
    let (_, count_2) = results.get(2).unwrap();
    assert_eq!(count_0, 2);
    assert_eq!(count_2, 1);
}

#[test]
fn test_invalid_option_index_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _options) = setup(&env);

    let voter = Address::generate(&env);
    let res = client.try_vote(&voter, &99u32);
    assert!(res.is_err());
}

#[test]
fn test_multiple_voters_tally_independently() {
    let env = Env::default();
    env.mock_all_auths();
    let (client, _options) = setup(&env);

    let voter_a = Address::generate(&env);
    let voter_b = Address::generate(&env);
    let voter_c = Address::generate(&env);

    client.vote(&voter_a, &0u32);
    client.vote(&voter_b, &0u32);
    client.vote(&voter_c, &2u32);

    let results = client.get_results();
    let (_, count_0) = results.get(0).unwrap();
    let (_, count_2) = results.get(2).unwrap();
    assert_eq!(count_0, 2);
    assert_eq!(count_2, 1);
}
