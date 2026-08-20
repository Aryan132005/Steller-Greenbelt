import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useWallet } from './hooks/useWallet';
import { usePollContract } from './hooks/usePollContract';
import { usePollEvents } from './hooks/usePollEvents';
import { WalletConnect } from './components/WalletConnect';
import { ProposalList } from './components/ProposalList';
import { CreateProposalForm } from './components/CreateProposalForm';
import { TransactionStatus } from './components/TransactionStatus';
import { OnboardingTour } from './components/OnboardingTour';
import { FeedbackWidget } from './components/FeedbackWidget';
import { ActivityFeed } from './components/ActivityFeed';
import { SentryErrorBoundary } from './components/SentryErrorBoundary';
import { trackEvent } from './lib/analytics';
import { truncateAddress } from './lib/utils';

function SolarisMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="16" stroke="var(--solar-cyan)" strokeWidth="1.5" opacity="0.6" />
      <circle cx="17" cy="17" r="12" stroke="var(--solar-violet)" strokeWidth="1.2" strokeDasharray="4 4" />
      <path d="M17 5 L20 13 L28 17 L20 21 L17 29 L14 21 L6 17 L14 13 Z" fill="url(#solaris-gradient)" />
      <defs>
        <linearGradient id="solaris-gradient" x1="6" y1="5" x2="28" y2="29" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--solar-cyan)" />
          <stop offset="1" stopColor="var(--solar-violet)" />
        </linearGradient>
      </defs>
      <circle cx="17" cy="17" r="2.5" fill="#03050c" />
    </svg>
  );
}

function getReputationTier(rep: number): string {
  if (rep < 3) return 'Initiate';
  if (rep < 8) return 'Steward';
  if (rep < 15) return 'Sentinel';
  return 'Chancellor';
}

function DepositFormInline({
  isSubmitting,
  onDeposit,
}: {
  isSubmitting: boolean;
  onDeposit: (amount: number) => void;
}) {
  const [depositAmount, setDepositAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(depositAmount);
    if (!depositAmount || isNaN(amount) || amount <= 0) {
      setError('Enter valid amount.');
      return;
    }
    setError(null);
    onDeposit(amount);
    setDepositAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="deposit-form-inline">
      <div className="input-group-button">
        <input
          type="number"
          placeholder="Amount (XLM)"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          disabled={isSubmitting}
          className={error ? 'input-error' : ''}
          style={{ padding: '8px 12px', fontSize: '13px' }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
          {isSubmitting ? 'Deposit...' : '📥 Deposit'}
        </button>
      </div>
      {error && <p className="field-error" style={{ marginTop: 6, fontSize: '11px' }}>{error}</p>}
    </form>
  );
}

function DisbursementLogInline({
  disbursements,
  loading,
}: {
  disbursements: any[];
  loading: boolean;
}) {
  if (loading) {
    return <div className="skeleton" style={{ height: 70 }} />;
  }

  if (disbursements.length === 0) {
    return (
      <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', padding: '8px 0' }}>
        No disbursements recorded.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto', maxHeight: '180px' }}>
      <table className="audit-table">
        <thead>
          <tr>
            <th>Proposal</th>
            <th>Recipient</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {disbursements.slice(0, 5).map((log, index) => (
            <tr key={`${log.proposalId}-${index}`}>
              <td>
                <span className="log-proposal-link">#{log.proposalId}</span>
              </td>
              <td title={log.recipient}>
                <code>{truncateAddress(log.recipient)}</code>
              </td>
              <td className="log-amount text-accent">
                {log.amount} XLM
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const { wallet, connect, disconnect } = useWallet();
  const isConnected = wallet.status === 'connected' && wallet.publicKey;

  const {
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
  } = usePollContract(wallet.publicKey);

  const { events, error: eventsError } = usePollEvents(Boolean(isConnected));

  // View States
  const [activeTab, setActiveTab] = useState<'proposals' | 'create'>('proposals');
  const [showTour, setShowTour] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check onboarding on first connect
  useEffect(() => {
    if (isConnected) {
      const tourCompleted = localStorage.getItem('solaris_tour_completed');
      if (!tourCompleted) {
        setShowTour(true);
        localStorage.setItem('solaris_tour_completed', 'true');
      }
      trackEvent('WalletConnected', { wallet: wallet.walletName });
    }
  }, [isConnected, wallet.walletName]);

  // Contextually trigger feedback widget after first successful vote or proposal creation
  useEffect(() => {
    if (txState.state === 'success') {
      const alreadyProvidedFeedback = localStorage.getItem('solaris_feedback');
      if (!alreadyProvidedFeedback) {
        const timer = setTimeout(() => {
          setShowFeedback(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [txState]);

  const handleVoteSubmit = async (proposalId: number, support: boolean) => {
    trackEvent('VoteInitiated', { proposalId, support });
    await vote(proposalId, support);
  };

  const handleCreateProposalSubmit = async (
    title: string,
    description: string,
    amount: number,
    recipient: string,
    deadlineLedgers: number
  ) => {
    trackEvent('ProposalCreationInitiated', { amount });
    await createProposal(title, description, amount, recipient, deadlineLedgers);
    setActiveTab('proposals'); // Switch back to initiatives feed
  };

  const handleCloseProposalSubmit = async (proposalId: number) => {
    trackEvent('ProposalCloseInitiated', { proposalId });
    await closeProposal(proposalId);
  };

  const handleDepositSubmit = async (amount: number) => {
    trackEvent('DepositInitiated', { amount });
    await deposit(amount);
  };

  if (!isConnected || !wallet.publicKey) {
    return (
      <SentryErrorBoundary>
        <div className="landing-container animated-zoom">
          <div className="landing-logo-container">
            <SolarisMark />
            <div>
              <h1>Solaris DAO</h1>
              <p className="tagline">Reputation-Weighted Governance Vault</p>
            </div>
          </div>

          <WalletConnect
            wallet={wallet}
            reputationBalance={reputationBalance}
            onConnect={connect}
            onDisconnect={disconnect}
            onShowFeedback={() => setShowFeedback(true)}
          />

          {showFeedback && (
            <FeedbackWidget onClose={() => setShowFeedback(false)} />
          )}

          <p className="footer-note">Stellar Soroban Vault · Solaris Portal</p>
        </div>
      </SentryErrorBoundary>
    );
  }

  return (
    <SentryErrorBoundary>
      <div className="dashboard-layout animated-fade-in">
        {/* Left Sidebar */}
        <aside className="sidebar-left">
          <div className="brand-section">
            <SolarisMark />
            <div>
              <h1>Solaris DAO</h1>
            </div>
          </div>

          <div className="sync-indicator">
            <span className={`orb ${isSyncing ? 'busy' : 'live'}`} />
            <span className="sync-text">{isSyncing ? 'Syncing...' : 'Live'}</span>
          </div>

          <div className="sidebar-nav-container">
            <p className="section-label" style={{ paddingLeft: 12, margin: '8px 0' }}>Workspace</p>
            <button
              className={`nav-tab-btn ${activeTab === 'proposals' ? 'active' : ''}`}
              onClick={() => setActiveTab('proposals')}
            >
              📋 Initiative Board
            </button>
            <button
              className={`nav-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              ➕ Submit Proposal
            </button>
          </div>

          <WalletConnect
            wallet={wallet}
            reputationBalance={reputationBalance}
            onConnect={connect}
            onDisconnect={disconnect}
            onShowTour={() => setShowTour(true)}
            onShowFeedback={() => setShowFeedback(true)}
          />
        </aside>

        {/* Middle Main Column */}
        <main className="content-main">
          {/* Top Stats Grid */}
          <section className="stats-grid">
            <div className="card stat-card">
              <span className="stat-label">Vault Balance</span>
              <h2 className="stat-value">{treasuryBalance} XLM</h2>
              <span className="stat-desc">Community Treasury Pool</span>
            </div>
            <div className="card stat-card initiatives-card">
              <span className="stat-label">Active Initiatives</span>
              <h2 className="stat-value">
                {proposals.filter((p) => !p.closed && latestLedger < p.votingDeadlineLedger).length}
              </h2>
              <span className="stat-desc">Pending community decision</span>
            </div>
            <div className="card stat-card reputation-card">
              <span className="stat-label">Reputation Class</span>
              <h2 className="stat-value">{getReputationTier(reputationBalance)}</h2>
              <span className="stat-desc">{reputationBalance} REP Power</span>
            </div>
          </section>

          {/* Transaction Alerts Panel */}
          <TransactionStatus result={txState} onClose={resetTxState} />

          {/* Platform Load Error Display */}
          {loadError && (
            <div className="card load-error-card animated-zoom">
              <h3>⚠️ Network Error</h3>
              <p>{loadError}</p>
              <button className="btn btn-outline" onClick={refresh}>
                🔄 Retry Connection
              </button>
            </div>
          )}

          {/* Tab Views Workspace */}
          <div className="workspace-view">
            {activeTab === 'proposals' && (
              <ProposalList
                proposals={proposals}
                loading={loading}
                latestLedger={latestLedger}
                isVoting={txState.state === 'pending'}
                onVote={handleVoteSubmit}
                onCloseProposal={handleCloseProposalSubmit}
              />
            )}

            {activeTab === 'create' && (
              <CreateProposalForm
                treasuryBalance={treasuryBalance}
                isSubmitting={txState.state === 'pending'}
                onCreateProposal={handleCreateProposalSubmit}
              />
            )}
          </div>
        </main>

        {/* Right Sidebar Column */}
        <aside className="sidebar-right">
          {/* Contextual Feedback Widget */}
          {showFeedback && (
            <FeedbackWidget onClose={() => setShowFeedback(false)} />
          )}

          {/* Deposit contribution tool */}
          <div className="card deposit-card">
            <p className="section-label">Contribution</p>
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: 15 }}>Fund Vault</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16, lineHeight: '1.4' }}>
              Fund community proposals. Anyone can contribute, but only passed governance votes can spend.
            </p>
            <DepositFormInline
              isSubmitting={txState.state === 'pending'}
              onDeposit={handleDepositSubmit}
            />
          </div>

          {/* Disbursement Audit Log */}
          <div className="card audit-card">
            <p className="section-label">Vault Audit Log</p>
            <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 15 }}>Disbursement Log</h3>
            <DisbursementLogInline
              disbursements={disbursements}
              loading={loading}
            />
          </div>

          {/* Live Activity Feed */}
          <ActivityFeed events={events} error={eventsError} />
        </aside>

        {/* Wallet Onboarding Guide Overlay */}
        {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}
      </div>
    </SentryErrorBoundary>
  );
}
