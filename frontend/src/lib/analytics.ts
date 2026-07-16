/**
 * Plausible & Sentry Analytics Wrapper
 * Logs telemetry events and handles errors.
 */

// Simple Sentry Mock/Wrapper
export const Sentry = {
  init: (dsn: string) => {
    console.log('[Sentry] Initialized error tracking with DSN:', dsn);
  },
  captureException: (error: Error, context?: Record<string, any>) => {
    console.error('[Sentry] Exception Captured:', error);
    if (context) {
      console.error('[Sentry] Exception Context:', context);
    }
  },
  captureMessage: (msg: string, level: 'info' | 'warning' | 'error' = 'info') => {
    console.log(`[Sentry] Message (${level}):`, msg);
  },
};

// Simple Plausible/Telemetry Mock/Wrapper
export const trackEvent = (eventName: string, props?: Record<string, any>) => {
  console.log(`[Plausible Event] ${eventName}`, props ? JSON.stringify(props) : '');
  
  // If Plausible is loaded on the page, dispatch the event
  if ((window as any).plausible) {
    try {
      (window as any).plausible(eventName, { props });
    } catch (e) {
      console.warn('[Plausible] Failed to send event:', e);
    }
  }
};
