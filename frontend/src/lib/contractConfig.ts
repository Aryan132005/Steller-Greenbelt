import { Networks } from '@stellar/stellar-sdk';

/**
 * Fill this in after deploying the contract with:
 *   stellar contract deploy --wasm target/wasm32-unknown-unknown/release/live_poll_contract.wasm \
 *     --source alice --network testnet
 *
 * The CLI prints a contract ID like: CABCD...WXYZ — paste it below.
 */
export const CONTRACT_ID = 'CCYSUICIXXG4DG6AIR5UXH2D4GZC5H33DOMQ3XTE3QYSMEYKRETIBX52';

export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** How often (ms) the UI re-checks poll results for live updates. */
export const POLL_INTERVAL_MS = 6000;
