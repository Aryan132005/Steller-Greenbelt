#!/bin/bash
set -e

echo "Building contracts..."
stellar contract build

echo "Getting deployer address..."
ADMIN_ADDRESS=$(stellar keys address alice)
echo "Admin Address: $ADMIN_ADDRESS"

# Testnet Native XLM Token Address
NATIVE_XLM="CDLZFC3SYJYDZT7KKAVGWCRHWCOJD2EW4SFTE67TIMW5STE6W64CO6RE"

echo "Deploying reputation_token..."
REP_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/reputation_token.wasm --source alice --network testnet)
echo "Reputation Token ID: $REP_ID"

echo "Deploying treasury_contract..."
TREASURY_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/treasury_contract.wasm --source alice --network testnet)
echo "Treasury Contract ID: $TREASURY_ID"

echo "Deploying proposal_contract..."
PROPOSAL_ID=$(stellar contract deploy --wasm target/wasm32-unknown-unknown/release/proposal_contract.wasm --source alice --network testnet)
echo "Proposal Contract ID: $PROPOSAL_ID"

echo "Initializing reputation_token..."
stellar contract invoke --id $REP_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --proposal_contract $PROPOSAL_ID --name "Reputation Token" --symbol "REP" --decimals 0

echo "Initializing treasury_contract..."
stellar contract invoke --id $TREASURY_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --proposal_contract $PROPOSAL_ID --token_address $NATIVE_XLM

echo "Initializing proposal_contract..."
stellar contract invoke --id $PROPOSAL_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --reputation_token $REP_ID --treasury_contract $TREASURY_ID

echo "-----------------------------------"
echo "DEPLOYMENT COMPLETE!"
echo "Reputation Token: $REP_ID"
echo "Treasury Contract: $TREASURY_ID"
echo "Proposal Contract: $PROPOSAL_ID"
echo "-----------------------------------"
