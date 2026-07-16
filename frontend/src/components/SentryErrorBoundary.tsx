import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Sentry } from '../lib/analytics';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SentryErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log exception via our analytics helper
    Sentry.captureException(error, { extra: errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card crash-card animated-zoom">
          <p className="section-label">System Exception</p>
          <h2>An unexpected error occurred</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: '1.5' }}>
            The UI layer encountered an exception. This issue has been logged to Sentry. 
            You can try reloading the application.
          </p>
          {this.state.error && (
            <div className="error-log-box">
              <code>{this.state.error.toString()}</code>
            </div>
          )}
          <button className="btn btn-primary" onClick={this.handleReload} style={{ marginTop: 12 }}>
            🔄 Reload Platform
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
