import { useEffect, useRef, useState } from 'react';
import { scValToNative } from '@stellar/stellar-sdk';
import { getRecentVoteEvents, getLatestLedgerSequence } from '../lib/soroban';

export type VoteEvent = {
  id: string;
  ledger: number;
  proposalId: number;
  voter: string;
  weight: number;
};

const LEDGER_LOOKBACK = 100; // roughly the last ~10 minutes on testnet

/**
 * Polls Soroban's getEvents for recent "vote" events emitted by the contract,
 * giving the UI a lightweight activity feed independent of re-fetching full results.
 */
export function usePollEvents(enabled: boolean, intervalMs = 10000) {
  const [events, setEvents] = useState<VoteEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval>;

    async function poll() {
      try {
        const latest = await getLatestLedgerSequence();
        const startLedger = Math.max(latest - LEDGER_LOOKBACK, 1);
        const raw = await getRecentVoteEvents(startLedger);

        if (cancelled) return;

        const fresh: VoteEvent[] = [];
        for (const evt of raw) {
          const id = evt.id;
          if (seenIds.current.has(id)) continue;
          seenIds.current.add(id);

          try {
            // evt.topic: [Symbol("vote"), u32(proposalId), Address(voter)]
            // evt.value: i128(weight)
            if (evt.topic && evt.topic.length >= 3) {
              const proposalId = Number(scValToNative(evt.topic[1]));
              const voter = String(scValToNative(evt.topic[2]));
              const weight = Number(scValToNative(evt.value));

              fresh.push({
                id,
                ledger: evt.ledger,
                proposalId,
                voter,
                weight,
              });
            }
          } catch (e) {
            console.warn('Failed to parse event:', evt, e);
          }
        }

        if (fresh.length > 0) {
          setEvents((prev) => [...fresh, ...prev].slice(0, 20));
        }
        setError(null);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Could not fetch live events.');
      }
    }

    poll();
    timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [enabled, intervalMs]);

  return { events, error };
}
