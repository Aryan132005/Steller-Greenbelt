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

// Lazy-load the Treasury tab to reduce initial bundle size and split dependencies
const TreasuryTab = lazy(() => import('./components/TreasuryTab'));

function LumenMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="16" stroke="#4ecdc4" strokeWidth="1.4" opacity="0.6" />
      <path d="M17 6 L20 14 L28 17 L20 20 L17 28 L14 20 L6 17 L14 14 Z" fill="#4ecdc4" />
      <circle cx="17" cy="17" r="3" fill="#0b0e1a" />
    </svg>
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
  const [activeTab, setActiveTab] = useState<'proposals' | 'create' | 'treasury'>('proposals');
  const [showTour, setShowTour] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  // Check onboarding on first connect
  useEffect(() => {
    if (isConnected) {
      const tourCompleted = localStorage.getItem('grantpulse_tour_completed');
      if (!tourCompleted) {
        setShowTour(true);
        localStorage.setItem('grantpulse_tour_completed', 'true');
      }
      trackEvent('WalletConnected', { wallet: wallet.walletName });
    }
  }, [isConnected, wallet.walletName]);

  // Contextually trigger feedback widget after first successful vote or proposal creation
  useEffect(() => {
    if (txState.state === 'success') {
      const alreadyProvidedFeedback = localStorage.getItem('grantpulse_feedback');
      if (!alreadyProvidedFeedback) {
        // Delay slightly for good UX
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
    setActiveTab('proposals'); // Switch back to view proposals
  };

  const handleCloseProposalSubmit = async (proposalId: number) => {
    trackEvent('ProposalCloseInitiated', { proposalId });
    await closeProposal(proposalId);
  };

  const handleDepositSubmit = async (amount: number) => {
    trackEvent('DepositInitiated', { amount });
    await deposit(amount);
  };

  return (
    <SentryErrorBoundary>
      <div className="app">
        <header className="header">
          <div className="header-title">
            <LumenMark />
            <div>
              <h1>GrantPulse</h1>
              <p className="tagline">Reputation-Weighted Governance Pool</p>
            </div>
          </div>
          {isConnected && (
            <div className="sync-indicator">
              <span className={`orb ${isSyncing ? 'busy' : 'live'}`} />
              <span className="sync-text">{isSyncing ? 'Syncing...' : 'Live'}</span>
            </div>
          )}
        </header>

        {/* Wallet Onboarding Guide */}
        {showTour && <OnboardingTour onClose={() => setShowTour(false)} />}

        {/* Global Wallet Card */}
        <WalletConnect
          wallet={wallet}
          reputationBalance={reputationBalance}
          onConnect={connect}
          onDisconnect={disconnect}
          onShowTour={() => setShowTour(true)}
          onShowFeedback={() => setShowFeedback(true)}
        />

        {/* Contextual Feedback Widget */}
        {showFeedback && (
          <FeedbackWidget onClose={() => setShowFeedback(false)} />
        )}

        {isConnected && wallet.publicKey ? (
          <>

            {/* Navigation Tabs */}
            <div className="nav-tabs-wrapper">
              <nav className="nav-tabs">
                <button
                  className={`nav-tab-btn ${activeTab === 'proposals' ? 'active' : ''}`}
                  onClick={() => setActiveTab('proposals')}
                >
                  📋 initiatives
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                  onClick={() => setActiveTab('create')}
                >
                  ➕ submit proposal
                </button>
                <button
                  className={`nav-tab-btn ${activeTab === 'treasury' ? 'active' : ''}`}
                  onClick={() => setActiveTab('treasury')}
                >
                  🏦 treasury pool
                </button>
              </nav>
            </div>

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

            {/* Tab Views */}
            <div className="tab-view-content">
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

              {activeTab === 'treasury' && (
                <Suspense
                  fallback={
                    <div className="card skeleton-card">
                      <div className="skeleton skeleton-title" style={{ width: '40%' }} />
                      <div className="skeleton skeleton-badge" style={{ height: 48, marginTop: 12 }} />
                    </div>
                  }
                >
                  <TreasuryTab
                    treasuryBalance={treasuryBalance}
                    disbursements={disbursements}
                    loading={loading}
                    isSubmitting={txState.state === 'pending'}
                    onDeposit={handleDepositSubmit}
                  />
                </Suspense>
              )}
            </div>

            {/* Live Ledger Activity */}
            <ActivityFeed events={events} error={eventsError} />
          </>
        ) : (
          <div className="card login-pitch-card">
            <h3>🔒 Governance Portal Locked</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: '1.5', margin: '8px 0 16px' }}>
              You need to connect an approved Stellar wallet (Freighter, xBull, or Albedo) on the Stellar Testnet to access voting dashboards, treasury balances, and create proposals.
            </p>
          </div>
        )}

        <p className="footer-note">Stellar Soroban MVP · Level 4 Green Belt submission</p>
      </div>
    </SentryErrorBoundary>
  );
}
