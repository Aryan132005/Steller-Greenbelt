import { useState } from 'react';

interface Props {
  onClose: () => void;
}

export function FeedbackWidget({ onClose }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setError('Please select a rating before submitting.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      // Simulate network request to mock backend API
      await new Promise((resolve) => setTimeout(resolve, 800));

      const payload = {
        rating,
        text: text.trim(),
        timestamp: new Date().toISOString(),
      };

      // Persist to local storage to simulate backend database storage
      const existing = JSON.parse(localStorage.getItem('grantpulse_feedback') || '[]');
      existing.push(payload);
      localStorage.setItem('grantpulse_feedback', JSON.stringify(existing));

      // Mock event tracking
      if ((window as any).plausible) {
        (window as any).plausible('FeedbackSubmitted', { props: { rating } });
      }

      setSubmitted(true);
    } catch {
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="card feedback-card success animated-fade-in">
        <div className="feedback-header">
          <span>💖 Thank you!</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.4 }}>
          Your feedback was logged in the local platform state database. We appreciate your contribution to GrantPulse!
        </p>
      </div>
    );
  }

  return (
    <div className="card feedback-card animated-slide-up">
      <div className="feedback-header">
        <span>💬 Share your feedback!</span>
        <button className="close-btn" onClick={onClose} aria-label="Close form">
          ✕
        </button>
      </div>
      <p className="feedback-subtitle">
        Since you just completed an on-chain activity, please tell us about your experience!
      </p>

      <form onSubmit={handleSubmit}>
        <div className="rating-selector">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={`star-btn ${star <= rating ? 'active' : ''}`}
              onClick={() => setRating(star)}
              disabled={isSubmitting}
              title={`${star} Star${star > 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          placeholder="What did you like? What can be improved?"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isSubmitting}
          maxLength={300}
        />

        <div className="feedback-actions">
          {error && <span className="feedback-error-inline">{error}</span>}
          <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Submit Feedback'}
          </button>
        </div>
      </form>
    </div>
  );
}
