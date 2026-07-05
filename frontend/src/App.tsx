import { useWallet } from './hooks/useWallet';
import { usePollContract } from './hooks/usePollContract';
import { usePollEvents } from './hooks/usePollEvents';
import { WalletConnect } from './components/WalletConnect';
import { PollCard } from './components/PollCard';
import { ActivityFeed } from './components/ActivityFeed';

function LumenMark() {
  return (
    <svg className="logo-mark" viewBox="0 0 34 34" fill="none">
      <circle cx="17" cy="17" r="16" stroke="#F2C14E" strokeWidth="1.4" opacity="0.5" />
      <circle cx="17" cy="17" r="5" fill="#F2C14E" />
      <circle cx="17" cy="17" r="10.5" stroke="#F2C14E" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export default function App() {
  const { wallet, connect, disconnect } = useWallet();
  const isConnected = wallet.status === 'connected' && wallet.publicKey;

  const {
    question,
    results,
    voted,
    loading,
    loadError,
    isSyncing,
    voteState,
    vote,
  } = usePollContract(wallet.publicKey);

  const { events, error: eventsError } = usePollEvents(Boolean(isConnected));

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <LumenMark />
          <div>
            <h1>Live Poll</h1>
            <p className="tagline">Soroban smart contract on Stellar Testnet</p>
          </div>
        </div>
      </header>

      <WalletConnect wallet={wallet} onConnect={connect} onDisconnect={disconnect} />

      {isConnected && wallet.publicKey && (
        <>
          <PollCard
            question={question}
            results={results}
            voted={voted}
            loading={loading}
            loadError={loadError}
            isSyncing={isSyncing}
            voteState={voteState}
            onVote={vote}
          />
          <ActivityFeed events={events} error={eventsError} />
        </>
      )}

      <p className="footer-note">Stellar Testnet · Level 2 Yellow Belt Submission</p>
    </div>
  );
}
