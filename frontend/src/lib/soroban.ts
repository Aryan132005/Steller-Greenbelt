import {
  Contract,
  TransactionBuilder,
  Address,
  nativeToScVal,
  scValToNative,
  BASE_FEE,
  rpc,
} from '@stellar/stellar-sdk';
import {
  PROPOSAL_CONTRACT_ID,
  REPUTATION_TOKEN_ID,
  TREASURY_CONTRACT_ID,
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
} from './contractConfig';

export const server = new rpc.Server(SOROBAN_RPC_URL);

export class ContractCallError extends Error {}

export interface Proposal {
  id: number;
  creator: string;
  title: string;
  description: string;
  requestedAmount: number;
  recipient: string;
  startLedger: number;
  votingDeadlineLedger: number;
  supportVotes: number;
  opposeVotes: number;
  closed: boolean;
  approved: boolean;
  userVoted?: boolean;
  userWeight?: number;
}

export interface Disbursement {
  proposalId: number;
  recipient: string;
  amount: number;
  ledgerSequence: number;
}

// --- Generic Simulators and builders ---

async function simulateRead(
  contractId: string,
  method: string,
  args: any[],
  sourcePublicKey: string
): Promise<any> {
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new ContractCallError(simulated.error || `Simulation failed for ${method}.`);
  }

  if (!simulated.result) {
    throw new ContractCallError(`No result returned from ${method}.`);
  }

  return scValToNative(simulated.result.retval);
}

async function buildTransaction(
  contractId: string,
  method: string,
  args: any[],
  sourcePublicKey: string
): Promise<string> {
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(contractId);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

// --- Submission ---

export async function submitTransaction(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === 'ERROR') {
    throw new ContractCallError(
      describeSorobanError(sendResult.errorResult?.toString()) ||
        'The network rejected the transaction.'
    );
  }

  const hash = sendResult.hash;

  let attempts = 0;
  while (attempts < 15) {
    await new Promise((r) => setTimeout(r, 1500));
    const statusResult = await server.getTransaction(hash);

    if (statusResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (statusResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new ContractCallError(
        describeSorobanError(JSON.stringify(statusResult.resultXdr)) ||
          'Transaction failed on-chain.'
      );
    }
    attempts += 1;
  }

  throw new ContractCallError('Timed out waiting for transaction confirmation.');
}

// --- Proposal Contract Calls ---

export async function getProposals(sourcePublicKey: string): Promise<Proposal[]> {
  try {
    const raw = await simulateRead(PROPOSAL_CONTRACT_ID, 'list_proposals', [], sourcePublicKey);
    const list = raw as any[];
    const proposals: Proposal[] = [];

    for (const p of list) {
      const id = Number(p.id);
      let userVoted = false;
      let userWeight = 0;

      if (sourcePublicKey) {
        try {
          userVoted = await hasVoted(sourcePublicKey, sourcePublicKey, id);
          userWeight = await getVoteWeight(sourcePublicKey, sourcePublicKey, id);
        } catch (e) {
          console.warn('Failed to fetch user vote state for proposal', id, e);
        }
      }

      proposals.push({
        id,
        creator: p.creator,
        title: p.title,
        description: p.description,
        requestedAmount: Number(p.requested_amount) / 10_000_000,
        recipient: p.recipient,
        startLedger: Number(p.start_ledger),
        votingDeadlineLedger: Number(p.voting_deadline_ledger),
        supportVotes: Number(p.support_votes),
        opposeVotes: Number(p.oppose_votes),
        closed: p.closed,
        approved: p.approved,
        userVoted,
        userWeight,
      });
    }

    return proposals.sort((a, b) => b.id - a.id);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    throw error;
  }
}

export async function hasVoted(
  sourcePublicKey: string,
  voter: string,
  proposalId: number
): Promise<boolean> {
  return simulateRead(
    PROPOSAL_CONTRACT_ID,
    'has_voted',
    [new Address(voter).toScVal(), nativeToScVal(proposalId, { type: 'u32' })],
    sourcePublicKey
  );
}

export async function getVoteWeight(
  sourcePublicKey: string,
  voter: string,
  proposalId: number
): Promise<number> {
  const weight = await simulateRead(
    PROPOSAL_CONTRACT_ID,
    'get_vote_weight',
    [new Address(voter).toScVal(), nativeToScVal(proposalId, { type: 'u32' })],
    sourcePublicKey
  );
  return Number(weight);
}

export async function buildCreateProposalTransaction(
  voterPublicKey: string,
  title: string,
  description: string,
  requestedAmount: number,
  recipient: string,
  deadlineLedger: number
): Promise<string> {
  return buildTransaction(
    PROPOSAL_CONTRACT_ID,
    'create_proposal',
    [
      new Address(voterPublicKey).toScVal(),
      nativeToScVal(title, { type: 'string' }),
      nativeToScVal(description, { type: 'string' }),
      nativeToScVal(requestedAmount * 10_000_000, { type: 'i128' }),
      new Address(recipient).toScVal(),
      nativeToScVal(deadlineLedger, { type: 'u32' }),
    ],
    voterPublicKey
  );
}

export async function buildVoteTransaction(
  voterPublicKey: string,
  proposalId: number,
  support: boolean
): Promise<string> {
  return buildTransaction(
    PROPOSAL_CONTRACT_ID,
    'vote',
    [
      new Address(voterPublicKey).toScVal(),
      nativeToScVal(proposalId, { type: 'u32' }),
      nativeToScVal(support),
    ],
    voterPublicKey
  );
}

export async function buildCloseProposalTransaction(
  voterPublicKey: string,
  proposalId: number
): Promise<string> {
  return buildTransaction(
    PROPOSAL_CONTRACT_ID,
    'close_proposal',
    [nativeToScVal(proposalId, { type: 'u32' })],
    voterPublicKey
  );
}

// --- Reputation Token Calls ---

export async function getReputationBalance(
  sourcePublicKey: string,
  voter: string
): Promise<number> {
  try {
    const bal = await simulateRead(
      REPUTATION_TOKEN_ID,
      'balance',
      [new Address(voter).toScVal()],
      sourcePublicKey
    );
    return Number(bal);
  } catch (err) {
    console.warn('Failed to fetch reputation balance, using 0:', err);
    return 0;
  }
}

// --- Treasury Contract Calls ---

export async function getTreasuryBalance(sourcePublicKey: string): Promise<number> {
  try {
    const balance = await simulateRead(TREASURY_CONTRACT_ID, 'get_balance', [], sourcePublicKey);
    return Number(balance) / 10_000_000;
  } catch (err) {
    console.warn('Failed to fetch treasury balance, using 0:', err);
    return 0;
  }
}

export async function getDisbursementHistory(sourcePublicKey: string): Promise<Disbursement[]> {
  try {
    const raw = await simulateRead(
      TREASURY_CONTRACT_ID,
      'get_disbursement_history',
      [],
      sourcePublicKey
    );
    const history = raw as any[];
    return history.map((record: any) => ({
      proposalId: Number(record.proposal_id),
      recipient: record.recipient,
      amount: Number(record.amount) / 10_000_000,
      ledgerSequence: Number(record.ledger_sequence),
    }));
  } catch (err) {
    console.error('Failed to fetch disbursement history:', err);
    return [];
  }
}

export async function buildDepositTransaction(
  depositorPublicKey: string,
  amount: number
): Promise<string> {
  return buildTransaction(
    TREASURY_CONTRACT_ID,
    'deposit',
    [new Address(depositorPublicKey).toScVal(), nativeToScVal(amount * 10_000_000, { type: 'i128' })],
    depositorPublicKey
  );
}

// --- Helper Utilities ---

function describeSorobanError(raw?: string | null): string | null {
  if (!raw) return null;
  const lowercase = raw.toLowerCase();
  if (lowercase.includes('already voted')) {
    return 'Already Voted: You have already cast a vote on this proposal.';
  }
  if (lowercase.includes('already disbursed')) {
    return 'Idempotency Guard: Funds have already been disbursed for this proposal.';
  }
  if (lowercase.includes('insufficient balance')) {
    return 'Insufficient Balance: The treasury does not have enough funds to disburse.';
  }
  if (lowercase.includes('voting deadline passed') || lowercase.includes('deadline passed')) {
    return 'Voting Deadline Passed: The voting period for this proposal has ended.';
  }
  if (lowercase.includes('voting deadline not reached') || lowercase.includes('deadline not reached')) {
    return 'Voting Open: The proposal deadline has not been reached yet.';
  }
  if (lowercase.includes('proposal closed')) {
    return 'Proposal Closed: This proposal has already been closed.';
  }
  if (lowercase.includes('invalid deadline')) {
    return 'Invalid Deadline: The deadline ledger must be in the future.';
  }
  return null;
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

export function explorerContractUrl(contractId: string): string {
  return `https://stellar.expert/explorer/testnet/contract/${contractId}`;
}

export async function getLatestLedgerSequence(): Promise<number> {
  try {
    const latest = await server.getLatestLedger();
    return latest.sequence;
  } catch {
    return 0;
  }
}

export async function getRecentVoteEvents(startLedger: number) {
  try {
    const events = await server.getEvents({
      startLedger,
      filters: [
        {
          type: 'contract',
          contractIds: [PROPOSAL_CONTRACT_ID],
        },
      ],
    });
    return events.events;
  } catch {
    return [];
  }
}
