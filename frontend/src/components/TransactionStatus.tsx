import { explorerTxUrl } from '../lib/soroban';
import type { TxState } from '../hooks/usePollContract';

const stepLabel: Record<string, string> = {
  building: 'Building the transaction details…',
  signing: 'Waiting for your wallet signature…',
  submitting: 'Submitting to Soroban Testnet…',
  confirming: 'Waiting for transaction confirmation…',
};

interface Props {
  result: TxState;
  onClose: () => void;
}

export function TransactionStatus({ result, onClose }: Props) {
  if (result.state === 'idle') return null;

  let title = 'Processing...';
  let successMsg = 'Your action was recorded on-chain.';

  if (result.state === 'pending') {
    title = 'Sending Transaction';
  } else if (result.state === 'success') {
    if (result.action === 'proposal_creation') {
      title = 'Proposal Created Successfully';
      successMsg = 'Your new funding proposal has been published on-chain.';
    } else if (result.action === 'vote') {
      title = 'Vote Cast Successfully';
      successMsg = 'Your reputation-weighted vote has been submitted and tallied.';
    } else if (result.action === 'close') {
      title = 'Proposal Closed';
      successMsg = 'The proposal has been finalized, triggering disbursements if approved.';
    } else if (result.action === 'deposit') {
      title = 'Deposit Successful';
      successMsg = 'Your deposit was successful and has funded the community treasury.';
    }
  } else if (result.state === 'error') {
    title = 'Transaction Failed';
  }

  return (
    <div className={`card tx-status-card ${result.state}`}>
      <div className="tx-status-header">
        <span className={`orb ${result.state === 'pending' ? 'busy' : result.state === 'success' ? 'live' : 'error'}`} />
        <h3>{title}</h3>
        <button className="close-btn" onClick={onClose} aria-label="Close message">
          ✕
        </button>
      </div>

      <div className="tx-status-body">
        {result.state === 'pending' && (
          <p className="tx-status-text">{stepLabel[result.step] || 'Processing...'}</p>
        )}

        {result.state === 'success' && (
          <>
            <p className="tx-status-text">{successMsg}</p>
            <div className="tx-hash-box">
              <span className="tx-hash-label">Transaction Hash:</span>
              <span className="tx-hash-value">{result.hash}</span>
            </div>
            <a
              href={explorerTxUrl(result.hash)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost btn-sm explorer-link"
            >
              🌐 View on Stellar Expert →
            </a>
          </>
        )}

        {result.state === 'error' && (
          <p className="tx-error-text">❌ {result.message}</p>
        )}
      </div>
    </div>
  );
}
