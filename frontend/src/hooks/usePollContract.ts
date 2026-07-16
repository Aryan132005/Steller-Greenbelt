import { useCallback, useEffect, useRef, useState } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import {
  getProposals,
  getReputationBalance,
  getTreasuryBalance,
  getDisbursementHistory,
  buildCreateProposalTransaction,
  buildVoteTransaction,
  buildCloseProposalTransaction,
  buildDepositTransaction,
  submitTransaction,
  getLatestLedgerSequence,
  ContractCallError,
  type Proposal,
  type Disbursement,
} from '../lib/soroban';
import { NETWORK_PASSPHRASE, POLL_INTERVAL_MS } from '../lib/contractConfig';

export type TxState =
  | { state: 'idle' }
  | { state: 'pending'; step: 'building' | 'signing' | 'submitting' | 'confirming' }
  | { state: 'success'; hash: string; action: string }
  | { state: 'error'; message: string };

export function usePollContract(publicKey: string | null) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [treasuryBalance, setTreasuryBalance] = useState<number>(0);
  const [reputationBalance, setReputationBalance] = useState<number>(0);
  const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
  const [latestLedger, setLatestLedger] = useState<number>(0);

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [txState, setTxState] = useState<TxState>({ state: 'idle' });
  const [isSyncing, setIsSyncing] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    setIsSyncing(true);
    try {
      const [props, tBal, rBal, hist, seq] = await Promise.all([
        getProposals(publicKey),
        getTreasuryBalance(publicKey),
        getReputationBalance(publicKey, publicKey),
        getDisbursementHistory(publicKey),
        getLatestLedgerSequence(),
      ]);
      setProposals(props);
      setTreasuryBalance(tBal);
      setReputationBalance(rBal);
      setDisbursements(hist);
      setLatestLedger(seq);
      setLoadError(null);
    } catch (err: any) {
      console.error('Refresh error:', err);
      // Don't override existing loaded proposals with errors to prevent flickering
      if (proposals.length === 0) {
        setLoadError(err?.message || 'Could not load platform state from Soroban contracts.');
      }
    } finally {
      setIsSyncing(false);
    }
  }, [publicKey, proposals.length]);

  const initialLoad = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    await refresh();
    setLoading(false);
  }, [publicKey, refresh]);

  useEffect(() => {
    if (!publicKey) {
      setProposals([]);
      setTreasuryBalance(0);
      setReputationBalance(0);
      setDisbursements([]);
      setLatestLedger(0);
      return;
    }

    initialLoad();

    pollTimer.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  // --- Proposal Actions ---

  const createProposal = useCallback(
    async (title: string, description: string, amount: number, recipient: string, deadlineLedgers: number) => {
      if (!publicKey) return;
      setTxState({ state: 'pending', step: 'building' });
      try {
        const curLedger = await getLatestLedgerSequence();
        const deadline = curLedger + deadlineLedgers;

        const unsignedXdr = await buildCreateProposalTransaction(
          publicKey,
          title,
          description,
          amount,
          recipient,
          deadline
        );

        setTxState({ state: 'pending', step: 'signing' });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });

        setTxState({ state: 'pending', step: 'submitting' });
        const hash = await submitTransaction(signedTxXdr);

        setTxState({ state: 'success', hash, action: 'proposal_creation' });
        await refresh();
      } catch (err: any) {
        const message =
          err instanceof ContractCallError
            ? err.message
            : err?.message || 'Something went wrong creating the proposal.';
        setTxState({ state: 'error', message });
      }
    },
    [publicKey, refresh]
  );

  const vote = useCallback(
    async (proposalId: number, support: boolean) => {
      if (!publicKey) return;
      setTxState({ state: 'pending', step: 'building' });
      try {
        const unsignedXdr = await buildVoteTransaction(publicKey, proposalId, support);

        setTxState({ state: 'pending', step: 'signing' });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });

        setTxState({ state: 'pending', step: 'submitting' });
        const hash = await submitTransaction(signedTxXdr);

        setTxState({ state: 'success', hash, action: 'vote' });
        await refresh();
      } catch (err: any) {
        const message =
          err instanceof ContractCallError
            ? err.message
            : err?.message || 'Something went wrong casting your vote.';
        setTxState({ state: 'error', message });
      }
    },
    [publicKey, refresh]
  );

  const closeProposal = useCallback(
    async (proposalId: number) => {
      if (!publicKey) return;
      setTxState({ state: 'pending', step: 'building' });
      try {
        const unsignedXdr = await buildCloseProposalTransaction(publicKey, proposalId);

        setTxState({ state: 'pending', step: 'signing' });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });

        setTxState({ state: 'pending', step: 'submitting' });
        const hash = await submitTransaction(signedTxXdr);

        setTxState({ state: 'success', hash, action: 'close' });
        await refresh();
      } catch (err: any) {
        const message =
          err instanceof ContractCallError
            ? err.message
            : err?.message || 'Something went wrong closing the proposal.';
        setTxState({ state: 'error', message });
      }
    },
    [publicKey, refresh]
  );

  // --- Treasury Actions ---

  const deposit = useCallback(
    async (amount: number) => {
      if (!publicKey) return;
      setTxState({ state: 'pending', step: 'building' });
      try {
        const unsignedXdr = await buildDepositTransaction(publicKey, amount);

        setTxState({ state: 'pending', step: 'signing' });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });

        setTxState({ state: 'pending', step: 'submitting' });
        const hash = await submitTransaction(signedTxXdr);

        setTxState({ state: 'success', hash, action: 'deposit' });
        await refresh();
      } catch (err: any) {
        const message =
          err instanceof ContractCallError
            ? err.message
            : err?.message || 'Something went wrong making the deposit.';
        setTxState({ state: 'error', message });
      }
    },
    [publicKey, refresh]
  );

  const resetTxState = useCallback(() => setTxState({ state: 'idle' }), []);

  return {
    proposals,
    treasuryBalance,
    reputationBalance,
    disbursements,
    latestLedger,
    loading,
    loadError,
    isSyncing,
    txState,
    createProposal,
    vote,
    closeProposal,
    deposit,
    resetTxState,
    refresh,
  };
}
