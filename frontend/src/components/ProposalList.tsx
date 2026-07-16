import { useState } from 'react';
import type { Proposal } from '../lib/soroban';
import { truncateAddress } from '../lib/utils'; // We'll create this helper

interface Props {
  proposals: Proposal[];
  loading: boolean;
  latestLedger: number;
  isVoting: boolean;
  onVote: (proposalId: number, support: boolean) => void;
  onCloseProposal: (proposalId: number) => void;
}

export function ProposalList({
  proposals,
  loading,
  latestLedger,
  isVoting,
  onVote,
  onCloseProposal,
}: Props) {
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all');

  const filteredProposals = proposals.filter((p) => {
    const isDeadlinePassed = latestLedger >= p.votingDeadlineLedger;
    const isProposalClosed = p.closed;

    if (filter === 'active') {
      return !isProposalClosed && !isDeadlinePassed;
    }
    if (filter === 'closed') {
      return isProposalClosed;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="proposal-list-container">
        {[1, 2].map((i) => (
          <div key={i} className="card skeleton-card">
            <div className="skeleton-badge-row">
              <div className="skeleton skeleton-badge" />
              <div className="skeleton skeleton-badge" />
            </div>
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-bar" />
            <div className="skeleton skeleton-buttons" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="proposal-list-container">
      <div className="filter-tabs">
        <button
          className={`tab-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Proposals ({proposals.length})
        </button>
        <button
          className={`tab-btn ${filter === 'active' ? 'active' : ''}`}
          onClick={() => setFilter('active')}
        >
          Active ({proposals.filter((p) => !p.closed && latestLedger < p.votingDeadlineLedger).length})
        </button>
        <button
          className={`tab-btn ${filter === 'closed' ? 'active' : ''}`}
          onClick={() => setFilter('closed')}
        >
          Closed ({proposals.filter((p) => p.closed).length})
        </button>
      </div>

      {filteredProposals.length === 0 ? (
        <div className="card empty-state">
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>
            No proposals found matching the filter.
          </p>
        </div>
      ) : (
        filteredProposals.map((proposal) => {
          const totalVotes = proposal.supportVotes + proposal.opposeVotes;
          const supportPct =
            totalVotes > 0 ? Math.round((proposal.supportVotes / totalVotes) * 100) : 0;
          const opposePct =
            totalVotes > 0 ? Math.round((proposal.opposeVotes / totalVotes) * 100) : 0;

          const isDeadlinePassed = latestLedger >= proposal.votingDeadlineLedger;
          const isClosed = proposal.closed;

          let badgeClass = '';
          let badgeText = '';

          if (isClosed) {
            if (proposal.approved) {
              badgeClass = 'approved';
              badgeText = 'Passed & Disbursed';
            } else {
              badgeClass = 'rejected';
              badgeText = 'Rejected';
            }
          } else {
            if (isDeadlinePassed) {
              badgeClass = 'pending-close';
              badgeText = 'Pending Closure';
            } else {
              badgeClass = 'active';
              badgeText = 'Active';
            }
          }

          return (
            <div key={proposal.id} className={`card proposal-card ${isClosed ? 'closed' : ''}`}>
              <div className="proposal-header">
                <span className={`badge ${badgeClass}`}>{badgeText}</span>
                <span className="proposal-id-tag">Proposal #{proposal.id}</span>
              </div>

              <h2 className="proposal-title">{proposal.title}</h2>
              <p className="proposal-description">{proposal.description}</p>

              <div className="proposal-meta-grid">
                <div>
                  <span className="meta-label">Requested Amount</span>
                  <span className="meta-value text-accent">💰 {proposal.requestedAmount} XLM</span>
                </div>
                <div>
                  <span className="meta-label">Recipient</span>
                  <span className="meta-value" title={proposal.recipient}>
                    👤 {truncateAddress(proposal.recipient)}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Creator</span>
                  <span className="meta-value" title={proposal.creator}>
                    👤 {truncateAddress(proposal.creator)}
                  </span>
                </div>
                <div>
                  <span className="meta-label">Voting Deadline</span>
                  <span className="meta-value">
                    ⏱️ Ledger {proposal.votingDeadlineLedger}{' '}
                    {!isClosed && !isDeadlinePassed && `(${proposal.votingDeadlineLedger - latestLedger} left)`}
                  </span>
                </div>
              </div>

              {/* Tally Bars */}
              <div className="tally-section">
                <div className="tally-labels">
                  <span>Support: <strong>{proposal.supportVotes} REP</strong> ({supportPct}%)</span>
                  <span>Oppose: <strong>{proposal.opposeVotes} REP</strong> ({opposePct}%)</span>
                </div>
                <div className="tally-bar">
                  <div
                    className="tally-bar-fill support"
                    style={{ width: `${supportPct}%` }}
                  />
                  <div
                    className="tally-bar-fill oppose"
                    style={{ width: `${opposePct}%` }}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="proposal-actions-row">
                {!isClosed && !isDeadlinePassed && (
                  <>
                    {proposal.userVoted ? (
                      <div className="voted-indicator">
                        ✅ You voted (Weight: <strong>{proposal.userWeight ?? 0} REP</strong>)
                      </div>
                    ) : (
                      <div className="voting-buttons">
                        <button
                          className="btn btn-outline btn-support"
                          onClick={() => onVote(proposal.id, true)}
                          disabled={isVoting}
                        >
                          👍 Vote YES (Support)
                        </button>
                        <button
                          className="btn btn-outline btn-oppose"
                          onClick={() => onVote(proposal.id, false)}
                          disabled={isVoting}
                        >
                          👎 Vote NO (Oppose)
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Closing a passed proposal */}
                {!isClosed && isDeadlinePassed && (
                  <button
                    className="btn btn-primary btn-block"
                    onClick={() => onCloseProposal(proposal.id)}
                    disabled={isVoting}
                  >
                    🔒 Finalize Voting & Disburse
                  </button>
                )}

                {isClosed && (
                  <div className="closed-indicator">
                    🏁 Voting ended. {proposal.approved ? 'Funds disbursed from treasury.' : 'Proposal rejected by community.'}
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
