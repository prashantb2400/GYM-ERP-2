// Sentry is not installed yet.
// To enable: npm install @sentry/nextjs
// Then replace this file with the full implementation from sentry.client.config.ts

export function initSentry() {
  // No-op until @sentry/nextjs is installed
  // import * as Sentry from '@sentry/nextjs';
  // Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, ... });
}

export function captureException(err: unknown) {
  // No-op stub — errors still logged to console
  console.error('[captureException]', err);
}
