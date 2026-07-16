import { Networks } from '@stellar/stellar-sdk';

/**
 * Configure your deployed contract addresses below after running the deploy script:
 *   ./scripts/deploy.sh (or .\scripts\deploy.ps1)
 */
export const REPUTATION_TOKEN_ID = 'CBEK7XNVS6D25GZIVC7667VNZVFLGZNVZL767VNZVFLGZNVZL767VNZV'; // Replace after deploy
export const TREASURY_CONTRACT_ID = 'CBVNZVFLGZNVZL767VNZVFLGZNVZL767VNZVFLGZNVZL767VNZVFLGZN'; // Replace after deploy
export const PROPOSAL_CONTRACT_ID = 'CCYSUICIXXG4DG6AIR5UXH2D4GZC5H33DOMQ3XTE3QYSMEYKRETIBX52'; // Replace after deploy

// For compatibility with any legacy imports
export const CONTRACT_ID = PROPOSAL_CONTRACT_ID;

export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** How often (ms) the UI polls for live updates. */
export const POLL_INTERVAL_MS = 5000;
