import { useState } from 'react';
import { VoteButton } from './VoteButton';
import { TransactionStatus } from './TransactionStatus';
import type { PollResult } from '../lib/soroban';
import type { VoteState } from '../hooks/usePollContract';

interface Props {
  question: string | null;
  results: PollResult[];
  voted: boolean;
  loading: boolean;
  loadError: string | null;
  isSyncing: boolean;
  voteState: VoteState;
  onVote: (index: number) => void;
}

export function PollCard({
  question,
  results,
  voted,
  loading,
  loadError,
  isSyncing,
  voteState,
  onVote,
}: Props) {
  const [lastVotedIndex, setLastVotedIndex] = useState<number | null>(null);
  const totalVotes = results.reduce((sum, r) => sum + r.votes, 0);
  const isVoting = voteState.state === 'pending';

  if (loading) {
    return (
      <div className="card">
        <p className="section-label">Poll</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading poll from the contract…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card">
        <p className="section-label">
          <span className="orb error" aria-hidden="true" />
          Poll
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Couldn't reach the poll contract: {loadError}
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Double-check that <code>CONTRACT_ID</code> in{' '}
          <code>src/lib/contractConfig.ts</code> points to a deployed, initialized
          contract on testnet.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="section-label">
        <span className={isSyncing ? 'orb busy' : 'orb live'} aria-hidden="true" />
        Poll · {totalVotes} vote{totalVotes === 1 ? '' : 's'} · live
      </p>
      <p className="poll-question">{question}</p>

      {results.map((option, index) => (
        <VoteButton
          key={option.label + index}
          option={option}
          index={index}
          totalVotes={totalVotes}
          isVotedOption={lastVotedIndex === index && voteState.state === 'success'}
          disabled={isVoting}
          onVote={(idx) => {
            setLastVotedIndex(idx);
            onVote(idx);
          }}
        />
      ))}

      {voted && voteState.state !== 'pending' && (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
          You have voted in this poll. You can vote again!
        </p>
      )}

      <TransactionStatus result={voteState} />
    </div>
  );
}
