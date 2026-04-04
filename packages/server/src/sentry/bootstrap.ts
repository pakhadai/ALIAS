import * as Sentry from '@sentry/node';
import type { Express } from 'express';

/**
 * Call once after `express()` creates `app` and env is loaded (e.g. after `config` import).
 */
export function initServerSentry(app: Express, environment: string): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    integrations: [Sentry.httpIntegration(), Sentry.expressIntegration()],
  });
}

export function registerExpressSentryErrorHandler(app: Express): void {
  if (!process.env.SENTRY_DSN?.trim()) return;
  Sentry.setupExpressErrorHandler(app);
}
