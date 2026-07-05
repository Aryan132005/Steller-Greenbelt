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
  CONTRACT_ID,
  SOROBAN_RPC_URL,
  NETWORK_PASSPHRASE,
} from './contractConfig';

export const server = new rpc.Server(SOROBAN_RPC_URL);

export class ContractCallError extends Error {}

export type PollResult = { label: string; votes: number };

/**
 * Build a transaction, simulate it, and decode the return value —
 * used for read-only contract calls (get_question, get_results, has_voted).
 * `sourcePublicKey` only supplies a sequence-number envelope for the
 * simulation; nothing is signed or submitted for reads.
 */
async function simulateRead(method: string, args: unknown[], sourcePublicKey: string) {
  const account = await server.getAccount(sourcePublicKey);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...(args as any)))
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

export async function getQuestion(sourcePublicKey: string): Promise<string> {
  return simulateRead('get_question', [], sourcePublicKey);
}

export async function getResults(sourcePublicKey: string): Promise<PollResult[]> {
  const raw = await simulateRead('get_results', [], sourcePublicKey);
  // raw is an array of [string, bigint] tuples once decoded from ScVal.
  return (raw as [string, bigint][]).map(([label, votes]) => ({
    label,
    votes: Number(votes),
  }));
}

export async function hasVoted(sourcePublicKey: string, voter: string): Promise<boolean> {
  const addressArg = new Address(voter).toScVal();
  return simulateRead('has_voted', [addressArg], sourcePublicKey);
}

/**
 * Build an unsigned, fee-and-footprint-prepared "vote" transaction ready for
 * wallet signing. Throws ContractCallError with a readable message if the
 * simulation itself already rejects the call (e.g. already voted, invalid
 * option index) so the caller doesn't need a wallet round-trip to find out.
 */
export async function buildVoteTransaction(
  voterPublicKey: string,
  optionIndex: number
): Promise<string> {
  const account = await server.getAccount(voterPublicKey);
  const contract = new Contract(CONTRACT_ID);

  const voterArg = new Address(voterPublicKey).toScVal();
  const optionArg = nativeToScVal(optionIndex, { type: 'u32' });

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('vote', voterArg, optionArg))
    .setTimeout(60)
    .build();

  const prepared = await server.prepareTransaction(tx);
  return prepared.toXDR();
}

/** Submit a signed "vote" transaction and wait for it to land. */
export async function submitVoteTransaction(signedXdr: string): Promise<string> {
  const tx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(tx);

  if (sendResult.status === 'ERROR') {
    throw new ContractCallError(
      describeSorobanError(sendResult.errorResult?.toString()) ||
        'The network rejected the transaction.'
    );
  }

  const hash = sendResult.hash;

  // Poll for the final status — Soroban confirmations aren't instant.
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

/** Turn common Soroban panic strings into plain-language messages. */
function describeSorobanError(raw?: string | null): string | null {
  if (!raw) return null;
  if (raw.includes('already voted')) return 'This address has already voted in this poll.';
  if (raw.includes('invalid option')) return 'That option no longer exists on the poll.';
  if (raw.includes('not initialized')) return 'The poll contract has not been initialized yet.';
  return null;
}

export function explorerTxUrl(hash: string): string {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/**
 * Fetch recent "vote" events emitted by the contract, for a lightweight
 * real-time signal in addition to (or instead of) polling get_results().
 */
export async function getRecentVoteEvents(startLedger: number) {
  const events = await server.getEvents({
    startLedger,
    filters: [
      {
        type: 'contract',
        contractIds: [CONTRACT_ID],
      },
    ],
  });
  return events.events;
}

export async function getLatestLedgerSequence(): Promise<number> {
  const latest = await server.getLatestLedger();
  return latest.sequence;
}
