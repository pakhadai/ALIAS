import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
const release = import.meta.env.VITE_SENTRY_RELEASE?.trim() || undefined;

export function initClientSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export { Sentry };
