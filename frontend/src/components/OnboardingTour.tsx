import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export function OnboardingTour({ onClose }: Props) {
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  const next = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="onboarding-overlay">
      <div className="card onboarding-card animated-zoom">
        <div className="onboarding-header">
          <span className="tour-badge">🎓 User Guide</span>
          <span className="step-tally">
            Step {step} of {totalSteps}
          </span>
        </div>

        <div className="onboarding-body">
          {step === 1 && (
            <div className="slide">
              <h2>Welcome to Solaris DAO!</h2>
              <p>
                Solaris DAO is a reputation-weighted community governance vault.
                Unlike traditional DAOs where rich users buy up voting power, Solaris rewards active contributors who build reputational capital by participating.
              </p>
              <div className="highlight-box">
                🗳️ <strong>Weight = Reputation:</strong> Your balance of reputation tokens (REP) at the exact moment a proposal starts determines your voting weight.
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="slide">
              <h2>Double-Spend & Manipulation Defense</h2>
              <p>
                To prevent users from buying or transferring tokens *during* a vote to influence the outcome, Solaris DAO utilizes <strong>historical balance snapshots</strong>.
              </p>
              <div className="highlight-box">
                📸 <strong>Snapshotted Balances:</strong> Your voting weight is fixed to your reputation balance at the proposal's start ledger. Mid-vote transfers will not change your voting weight.
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="slide">
              <h2>Voting & Disbursing Funds</h2>
              <p>
                When a proposal meets its deadline, anyone can close it. If the community votes YES, the on-chain treasury automatically releases the grant funds to the recipient.
              </p>
              <div className="highlight-box">
                🎁 <strong>Earn Reputation:</strong> Contributing to governance is rewarded! Participating in any vote automatically mints <strong>+1 REP</strong> directly to your wallet!
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="slide">
              <h2>Ready to Contribute?</h2>
              <p>
                Here is how you get started on the Solaris dashboard:
              </p>
              <ul className="guide-steps">
                <li>🔌 Connect a compatible Stellar wallet (Freighter, xBull, or Albedo).</li>
                <li>📝 Head to "Submit Proposal" in the left sidebar to request funding.</li>
                <li>👍 Vote on active proposals in the central "Initiative Board" panel.</li>
                <li>📥 Deposit XLM under "Fund Vault" in the right sidebar to fuel the DAO pool.</li>
              </ul>
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 1 ? (
            <button className="btn btn-ghost btn-sm" onClick={prev}>
              ← Back
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button className="btn btn-primary btn-sm" onClick={next}>
              Next →
            </button>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={onClose}>
              Get Started!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
