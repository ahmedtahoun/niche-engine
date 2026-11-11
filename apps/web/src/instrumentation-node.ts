// Server start: check production settings, load data from Supabase, and save
// pending changes before the process stops (deploys and restarts send SIGTERM).
import { flushNow } from './lib/dirty';
import { checkEnv } from './lib/env';
import { hydrate } from './lib/persist';

if (process.env.NODE_ENV === 'production') {
  const { errors, warnings } = checkEnv();
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length) {
    console.error(`[env] The server cannot start:\n- ${errors.join('\n- ')}`);
    // Exit instead of serving errors: the host marks the deploy as failed and shows this log.
    process.exit(1);
  }
}

try {
  await hydrate();
} catch (e) {
  // Refuse to run on stale demo data when a database is configured but unreachable.
  console.error('[persist] could not load from Supabase:', e);
  throw e;
}

for (const sig of ['SIGTERM', 'SIGINT'] as const) {
  process.once(sig, async () => {
    console.log(`[persist] ${sig}: saving pending changes`);
    await flushNow();
    process.exit(0);
  });
}
