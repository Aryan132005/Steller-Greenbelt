$ErrorActionPreference = "Stop"

Write-Host "Verifying WASM files..."

Write-Host "Getting deployer address..."
$ADMIN_ADDRESS = (stellar keys address alice).Trim()
Write-Host "Admin Address: $ADMIN_ADDRESS"

# Testnet Native XLM Token Address
$NATIVE_XLM = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"

Write-Host "Deploying reputation_token..."
$REP_ID = (stellar contract deploy --wasm contract/target/wasm32v1-none/release/reputation_token.wasm --source alice --network testnet).Trim()
Write-Host "Reputation Token ID: $REP_ID"

Write-Host "Deploying treasury_contract..."
$TREASURY_ID = (stellar contract deploy --wasm contract/target/wasm32v1-none/release/treasury_contract.wasm --source alice --network testnet).Trim()
Write-Host "Treasury Contract ID: $TREASURY_ID"

Write-Host "Deploying proposal_contract..."
$PROPOSAL_ID = (stellar contract deploy --wasm contract/target/wasm32v1-none/release/proposal_contract.wasm --source alice --network testnet).Trim()
Write-Host "Proposal Contract ID: $PROPOSAL_ID"

Write-Host "Initializing reputation_token..."
stellar contract invoke --id $REP_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --proposal_contract $PROPOSAL_ID --name "Reputation Token" --symbol "REP" --decimals 0

Write-Host "Initializing treasury_contract..."
stellar contract invoke --id $TREASURY_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --proposal_contract $PROPOSAL_ID --token_address $NATIVE_XLM

Write-Host "Initializing proposal_contract..."
stellar contract invoke --id $PROPOSAL_ID --source alice --network testnet -- initialize --admin $ADMIN_ADDRESS --reputation_token $REP_ID --treasury_contract $TREASURY_ID

Write-Host "-----------------------------------"
Write-Host "DEPLOYMENT COMPLETE!"
Write-Host "Reputation Token: $REP_ID"
Write-Host "Treasury Contract: $TREASURY_ID"
Write-Host "Proposal Contract: $PROPOSAL_ID"
Write-Host "-----------------------------------"
