import { useCallback, useEffect, useRef, useState } from 'react';
import { StellarWalletsKit } from '@creit.tech/stellar-wallets-kit';
import {
  getQuestion,
  getResults,
  hasVoted,
  buildVoteTransaction,
  submitVoteTransaction,
  ContractCallError,
  type PollResult,
} from '../lib/soroban';
import { NETWORK_PASSPHRASE, POLL_INTERVAL_MS } from '../lib/contractConfig';

export type VoteState =
  | { state: 'idle' }
  | { state: 'pending'; step: 'building' | 'signing' | 'submitting' | 'confirming' }
  | { state: 'success'; hash: string }
  | { state: 'error'; message: string };

export function usePollContract(publicKey: string | null) {
  const [question, setQuestion] = useState<string | null>(null);
  const [results, setResults] = useState<PollResult[]>([]);
  const [voted, setVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [voteState, setVoteState] = useState<VoteState>({ state: 'idle' });
  const [isSyncing, setIsSyncing] = useState(false);

  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!publicKey) return;
    setIsSyncing(true);
    try {
      const [q, r, v] = await Promise.all([
        getQuestion(publicKey),
        getResults(publicKey),
        hasVoted(publicKey, publicKey),
      ]);
      setQuestion(q);
      setResults(r);
      setVoted(v);
      setLoadError(null);
    } catch (err: any) {
      setLoadError(err?.message || 'Could not reach the poll contract.');
    } finally {
      setIsSyncing(false);
    }
  }, [publicKey]);

  const initialLoad = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    await refresh();
    setLoading(false);
  }, [publicKey, refresh]);

  useEffect(() => {
    if (!publicKey) {
      setQuestion(null);
      setResults([]);
      setVoted(false);
      return;
    }

    initialLoad();

    pollTimer.current = setInterval(refresh, POLL_INTERVAL_MS);
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  const vote = useCallback(
    async (optionIndex: number) => {
      if (!publicKey) return;
      setVoteState({ state: 'pending', step: 'building' });
      try {
        const unsignedXdr = await buildVoteTransaction(publicKey, optionIndex);

        setVoteState({ state: 'pending', step: 'signing' });
        const { signedTxXdr } = await StellarWalletsKit.signTransaction(unsignedXdr, {
          networkPassphrase: NETWORK_PASSPHRASE,
          address: publicKey,
        });

        setVoteState({ state: 'pending', step: 'submitting' });
        const hash = await submitVoteTransaction(signedTxXdr);

        setVoteState({ state: 'success', hash });
        await refresh();
      } catch (err: any) {
        const message =
          err instanceof ContractCallError
            ? err.message
            : err?.message || 'Something went wrong casting your vote.';
        setVoteState({ state: 'error', message });
      }
    },
    [publicKey, refresh]
  );

  const resetVoteState = useCallback(() => setVoteState({ state: 'idle' }), []);

  return {
    question,
    results,
    voted,
    loading,
    loadError,
    isSyncing,
    voteState,
    vote,
    resetVoteState,
    refresh,
  };
}
