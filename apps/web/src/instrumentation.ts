// Runs once when the server starts. The Node-only work lives in its own file so
// the edge bundle never pulls in node:fs.
// Sentry on the server: the Worker entry (worker.ts) sets up @sentry/cloudflare; this file only reports
// errors from Server Components, route handlers and middleware through it. (The full @sentry/nextjs server
// SDK is left out on purpose: it would push the Worker over Cloudflare's free 3 MB size limit.)
import { captureException, withScope } from '@sentry/core';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./instrumentation-node');
  }
}

export function onRequestError(error: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  withScope((scope) => {
    scope.setTags({ 'nextjs.route_type': context.routeType, 'nextjs.router_kind': context.routerKind });
    scope.setExtras({ request_path: request.path, method: request.method, route_path: context.routePath });
    captureException(error, { mechanism: { type: 'auto.function.nextjs.on_request_error', handled: false } });
  });
}
