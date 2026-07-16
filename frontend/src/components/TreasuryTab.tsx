import { useState } from 'react';
import type { Disbursement } from '../lib/soroban';
import { truncateAddress } from '../lib/utils';

interface Props {
  treasuryBalance: number;
  disbursements: Disbursement[];
  loading: boolean;
  isSubmitting: boolean;
  onDeposit: (amount: number) => void;
}

export default function TreasuryTab({
  treasuryBalance,
  disbursements,
  loading,
  isSubmitting,
  onDeposit,
}: Props) {
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid deposit amount.');
      return;
    }
    setError(null);
    onDeposit(amount);
    setDepositAmount('');
  };

  if (loading) {
    return (
      <div className="treasury-container">
        <div className="card skeleton-card">
          <div className="skeleton skeleton-title" style={{ width: '40%' }} />
          <div className="skeleton skeleton-badge" style={{ height: 48, marginTop: 12 }} />
        </div>

        <div className="card skeleton-card" style={{ marginTop: 20 }}>
          <div className="skeleton skeleton-title" style={{ width: '50%' }} />
          <div className="skeleton skeleton-text" style={{ height: 120, marginTop: 12 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="treasury-container">
      {/* Balance Panel */}
      <div className="card treasury-balance-card">
        <p className="section-label">Shared Assets</p>
        <div className="balance-display-row">
          <div>
            <span className="balance-label">Treasury Pool Balance</span>
            <h1 className="balance-amount">{treasuryBalance} XLM</h1>
          </div>
          <div className="pool-info">
            🛡️ <strong>Automated Governance:</strong> Funds can only be disbursed when a community proposal passes.
          </div>
        </div>
      </div>

      {/* Deposit Flow */}
      <div className="card deposit-card">
        <p className="section-label">Contribution</p>
        <h2 style={{ marginTop: 0, marginBottom: 12 }}>Deposit Funds to Treasury</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: '1.4' }}>
          Pool resources together! Your deposit funds community initiatives. Anyone can deposit, but only passed governance votes can spend.
        </p>

        <form onSubmit={handleDepositSubmit} className="deposit-form-inline">
          <div className="input-group-button">
            <input
              type="number"
              placeholder="Amount in XLM (e.g. 100)"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              disabled={isSubmitting}
              className={error ? 'input-error' : ''}
            />
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Depositing...' : '📥 Deposit XLM'}
            </button>
          </div>
          {error && <p className="field-error" style={{ marginTop: 8 }}>{error}</p>}
        </form>
      </div>

      {/* Disbursement History */}
      <div className="card history-card" id="treasury-history-tour">
        <p className="section-label">Ledger Audit</p>
        <h2 style={{ marginTop: 0, marginBottom: 16 }}>Disbursement Log</h2>

        {disbursements.length === 0 ? (
          <div className="empty-state-small">
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              No funds have been disbursed from this treasury yet.
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Proposal ID</th>
                  <th>Recipient</th>
                  <th>Amount Disbursed</th>
                  <th>Sequence</th>
                </tr>
              </thead>
              <tbody>
                {disbursements.map((log, index) => (
                  <tr key={`${log.proposalId}-${index}`}>
                    <td>
                      <span className="log-proposal-link">Proposal #{log.proposalId}</span>
                    </td>
                    <td title={log.recipient}>
                      <code>{truncateAddress(log.recipient)}</code>
                    </td>
                    <td className="log-amount text-accent">
                      💰 {log.amount} XLM
                    </td>
                    <td>
                      <code>#{log.ledgerSequence}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
