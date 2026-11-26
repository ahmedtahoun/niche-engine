// TEMPORARY: proves production stack traces are readable in Sentry. Removed right after the check.
export const dynamic = 'force-dynamic';

export function GET() {
  throw new Error(`Sentry source map test ${Math.floor(Date.now() / 1000)}`);
}
