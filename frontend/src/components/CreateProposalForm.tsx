import { useState } from 'react';

interface Props {
  treasuryBalance: number;
  isSubmitting: boolean;
  onCreateProposal: (
    title: string,
    description: string,
    amount: number,
    recipient: string,
    deadlineLedgers: number
  ) => void;
}

export function CreateProposalForm({
  treasuryBalance,
  isSubmitting,
  onCreateProposal,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [recipient, setRecipient] = useState('');
  const [durationStr, setDurationStr] = useState('200'); // default ~20 minutes (approx 6s per ledger)

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Title is required.';
    } else if (title.length > 50) {
      newErrors.title = 'Title must be under 50 characters.';
    }

    if (!description.trim()) {
      newErrors.description = 'Description is required.';
    }

    const amount = Number(amountStr);
    if (!amountStr || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid positive amount.';
    } else if (amount > treasuryBalance) {
      newErrors.amount = `Requested amount (${amount} XLM) exceeds the current community treasury balance (${treasuryBalance} XLM).`;
    }

    // Stellar public G-address validation regex
    const stellarAddressRegex = /^G[A-Z2-7]{55}$/;
    if (!recipient.trim()) {
      newErrors.recipient = 'Recipient address is required.';
    } else if (!stellarAddressRegex.test(recipient.trim())) {
      newErrors.recipient = 'Invalid Stellar G-address format (must be 56 chars, starting with G).';
    }

    const duration = Number(durationStr);
    if (!durationStr || isNaN(duration) || duration <= 0) {
      newErrors.duration = 'Please specify a future deadline duration.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onCreateProposal(
      title.trim(),
      description.trim(),
      Number(amountStr),
      recipient.trim(),
      Number(durationStr)
    );
  };

  return (
    <div className="card form-card">
      <p className="section-label">New Initiative</p>
      <h2 style={{ marginTop: 0, marginBottom: 20 }}>Submit Funding Proposal</h2>

      <form onSubmit={handleSubmit} className="proposal-form">
        <div className="form-group">
          <label htmlFor="title">Proposal Title</label>
          <input
            type="text"
            id="title"
            placeholder="e.g. Purchase Community Seed Vault"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
            className={errors.title ? 'input-error' : ''}
          />
          {errors.title && <p className="field-error">{errors.title}</p>}
        </div>

        <div className="form-group">
          <label htmlFor="description">Detailed Description</label>
          <textarea
            id="description"
            rows={4}
            placeholder="Describe what these micro-grant funds will be used for and how it benefits the community..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
            className={errors.description ? 'input-error' : ''}
          />
          {errors.description && <p className="field-error">{errors.description}</p>}
        </div>

        <div className="form-row">
          <div className="form-group flex-1">
            <label htmlFor="amount">Requested Amount (XLM)</label>
            <div className="input-with-meta">
              <input
                type="number"
                id="amount"
                placeholder="e.g. 500"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                disabled={isSubmitting}
                className={errors.amount ? 'input-error' : ''}
              />
              <span className="input-meta-text">Max: {treasuryBalance} XLM</span>
            </div>
            {errors.amount && <p className="field-error">{errors.amount}</p>}
          </div>

          <div className="form-group flex-1">
            <label htmlFor="duration">Voting Duration</label>
            <select
              id="duration"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="50">⚡ Express (50 ledgers / ~5 mins)</option>
              <option value="200">⏱️ Standard (200 ledgers / ~20 mins)</option>
              <option value="1000">🕒 Long (1,000 ledgers / ~1.6 hours)</option>
              <option value="10000">📅 Extended (10,000 ledgers / ~16 hours)</option>
            </select>
            {errors.duration && <p className="field-error">{errors.duration}</p>}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="recipient">Recipient Address (Stellar G-Address)</label>
          <input
            type="text"
            id="recipient"
            placeholder="e.g. GB2K... (Destination wallet address)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            disabled={isSubmitting}
            className={errors.recipient ? 'input-error' : ''}
          />
          {errors.recipient && <p className="field-error">{errors.recipient}</p>}
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={isSubmitting}
          style={{ marginTop: 12 }}
        >
          {isSubmitting ? 'Simulating & signing transaction…' : '🚀 Submit Proposal on Chain'}
        </button>
      </form>
    </div>
  );
}
