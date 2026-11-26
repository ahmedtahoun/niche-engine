// Cloudflare Worker entry: the app OpenNext builds (.open-next/worker.js), wrapped with Sentry so server errors
// and request traces reach Sentry. Settings come from wrangler.jsonc "vars".
import * as Sentry from '@sentry/cloudflare';
// @ts-ignore `.open-next/worker.js` is generated at build time
import handler from './.open-next/worker.js';

// Durable Objects that OpenNext's generated entry exports.
// @ts-ignore generated at build time
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from './.open-next/worker.js';

interface SentryEnv { SENTRY_DSN?: string; SENTRY_ENVIRONMENT?: string }

export default Sentry.withSentry(
  (env: SentryEnv) => ({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT ?? 'production',
    dataCollection: { userInfo: false },
    // Answers the browser's /monitoring requests and forwards them to Sentry (ad blockers block sentry.io).
    integrations: [Sentry.serveTunnelIntegration({ path: '/monitoring' })],
    // 10% of requests traced in production, all of them anywhere else.
    tracesSampleRate: (env.SENTRY_ENVIRONMENT ?? 'production') === 'production' ? 0.1 : 1.0,
  }),
  handler,
);
