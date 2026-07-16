import type { VoteEvent } from '../hooks/usePollEvents';
import { truncateAddress } from '../lib/utils';

export function ActivityFeed({ events, error }: { events: VoteEvent[]; error: string | null }) {
  if (error) {
    return (
      <div className="card" id="activity-feed-tour">
        <p className="section-label">Live Activity</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Live event feed is currently offline — votes and balances will still sync on normal intervals.
        </p>
      </div>
    );
  }

  return (
    <div className="card" id="activity-feed-tour">
      <p className="section-label">
        <span className="orb live" aria-hidden="true" />
        Live Governance Events
      </p>
      {events.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: '8px 0 0' }}>
          No voting events detected recently. Cast a vote on a proposal to start the ledger activity log!
        </p>
      ) : (
        <ul className="activity-list">
          {events.map((evt) => (
            <li key={evt.id} className="activity-item">
              ⛓️ <strong>Ledger #{evt.ledger}</strong>: <code>{truncateAddress(evt.voter)}</code> cast a vote on <strong>Proposal #{evt.proposalId}</strong> with a weight of <strong>{evt.weight} REP</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
