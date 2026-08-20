import type { WalletState } from '../hooks/useWallet';

interface Props {
  wallet: WalletState;
  reputationBalance: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onShowTour?: () => void;
  onShowFeedback?: () => void;
}

function truncate(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

export function WalletConnect({
  wallet,
  reputationBalance,
  onConnect,
  onDisconnect,
  onShowTour,
  onShowFeedback,
}: Props) {
  const orbClass =
    wallet.status === 'connecting'
      ? 'orb busy'
      : wallet.status === 'connected'
      ? 'orb live'
      : wallet.status === 'error'
      ? 'orb error'
      : 'orb';

  if (wallet.status === 'connected' && wallet.publicKey) {
    return (
      <div className="card wallet-card" id="wallet-card-tour">
        <p className="section-label">
          <span className={orbClass} aria-hidden="true" />
          Active Account
        </p>
        <div className="wallet-row">
          <div className="wallet-info-section">
            <span className="wallet-address">{truncate(wallet.publicKey)}</span>
            <div className="wallet-meta">
              <span className="wallet-provider">{wallet.walletName}</span>
              <span className="rep-badge">
                🏆 <strong>{reputationBalance} REP</strong>
              </span>
            </div>
          </div>
          <div className="wallet-actions">
            {onShowTour && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onShowTour}
                title="Show Quick Tour"
              >
                ❓ How it works
              </button>
            )}
            {onShowFeedback && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={onShowFeedback}
                title="Give Feedback"
              >
                💬 Feedback
              </button>
            )}
            <button className="btn btn-ghost btn-sm btn-disconnect" onClick={onDisconnect}>
              Disconnect
            </button>
          </div>
        </div>
        <div className="weight-explanation-banner">
          💡 <strong>Voting Weight:</strong> Your weight is determined by your REP balance when a proposal starts. Voting awards <strong>+1 REP</strong>!
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="empty-state">
        <span className={orbClass} aria-hidden="true" style={{ margin: '0 auto 14px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginTop: 0, marginBottom: 8 }}>Enter Solaris DAO</h2>
        <p style={{ maxWidth: '440px', margin: '0 auto 20px', fontSize: '13px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
          A reputation-weighted community governance vault. Connect your Stellar wallet to submit funding proposals, vote on community initiatives, and audit treasury payouts.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            onClick={onConnect}
            disabled={wallet.status === 'connecting'}
            style={{ padding: '10px 18px', fontSize: '13px' }}
          >
            {wallet.status === 'connecting' ? 'Connecting wallet...' : 'Connect Wallet'}
          </button>
          {onShowFeedback && (
            <button
              className="btn btn-ghost"
              onClick={onShowFeedback}
              title="Give Feedback"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              💬 Feedback
            </button>
          )}
        </div>
        {wallet.status === 'error' && wallet.errorMessage && (
          <p className="field-error">
            {wallet.errorKind === 'not_found' && '🔌 '}
            {wallet.errorKind === 'rejected' && '🚫 '}
            {wallet.errorKind === 'insufficient_balance' && '💰 '}
            {wallet.errorMessage}
          </p>
        )}
      </div>
    </div>
  );
}
