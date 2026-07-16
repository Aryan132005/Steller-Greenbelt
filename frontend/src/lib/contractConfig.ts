import { Networks } from '@stellar/stellar-sdk';

/**
 * Configure your deployed contract addresses below after running the deploy script:
 *   ./scripts/deploy.sh (or .\scripts\deploy.ps1)
 */
export const REPUTATION_TOKEN_ID = 'CCNK6BNHPG6XSYZZCXB3ZHLELAJ2TSOUQKX6HHQ6S2C3KZSTS2UQ25ZF'; // Replace after deploy
export const TREASURY_CONTRACT_ID = 'CAYTEW3T4MXNQXCA6OKJXONPJYOYCCSR54NQKM4TBTUFHJN4AFYAWHXQ'; // Replace after deploy
export const PROPOSAL_CONTRACT_ID = 'CDYIUPQLFQ7UFWTYDVCUOGCMQDZPVYIFL6J2REVZ3XAX7OCHR6E4GUT5'; // Replace after deploy

// For compatibility with any legacy imports
export const CONTRACT_ID = PROPOSAL_CONTRACT_ID;

export const SOROBAN_RPC_URL = 'https://soroban-testnet.stellar.org';
export const HORIZON_URL = 'https://horizon-testnet.stellar.org';
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** How often (ms) the UI polls for live updates. */
export const POLL_INTERVAL_MS = 5000;
