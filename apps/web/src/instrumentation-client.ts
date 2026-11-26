// Sentry in the browser: catches errors visitors hit, with Session Replay (text and form fields masked).
import * as Sentry from '@sentry/nextjs';

const isProd = process.env.NODE_ENV === 'production';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: isProd ? 'production' : 'development',
  // No IP addresses or other personal data by default (customers type names, phones and addresses here).
  dataCollection: { userInfo: false },
  integrations: [Sentry.replayIntegration()],
  // Tracing: every request locally, 10% in production.
  tracesSampleRate: isProd ? 0.1 : 1.0,
  // Session Replay: 10% of visits, and every visit that hit an error. Text and inputs are masked by default.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Instruments client-side navigations.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
