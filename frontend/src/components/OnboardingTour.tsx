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
          <span className="tour-badge">🎓 Quick Guide</span>
          <span className="step-tally">
            Step {step} of {totalSteps}
          </span>
        </div>

        <div className="onboarding-body">
          {step === 1 && (
            <div className="slide">
              <h2>Welcome to GrantPulse!</h2>
              <p>
                GrantPulse is a reputation-weighted community micro-grants platform.
                Unlike traditional DAOs where rich users buy up voting power or use multiple sybil addresses, GrantPulse rewards active contributors who build reputational capital.
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
                To prevent users from buying or transfering tokens *during* a vote to influence the outcome, GrantPulse utilizes <strong>historical balance snapshots</strong>.
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
                When a proposal meets its deadline, anyone can close it. If the community votes YES, the on-chain treasury automatically releases the micro-grant funds to the recipient.
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
                Here is how you get started:
              </p>
              <ul className="guide-steps">
                <li>🔌 Connect a compatible Stellar wallet (Freighter, xBull, or Albedo).</li>
                <li>📝 Head to "Create Proposal" to request micro-grants for community work.</li>
                <li>👍 Vote on active proposals using your reputation weight.</li>
                <li>📥 Deposit XLM to fund the shared community pool under "Treasury".</li>
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
