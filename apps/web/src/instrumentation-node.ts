// Server start: check production settings and write the niche settings to the
// database (sellers and orders reference them). Nothing else is loaded into
// memory: every request reads the database, so restarts lose nothing.
import { checkEnv } from './lib/env';
import { allNiches } from './lib/niches';
import { store } from './lib/store';
import { submitAllOnNewRevision } from './lib/seo';

if (process.env.NODE_ENV === 'production') {
  const { errors, warnings } = checkEnv();
  for (const w of warnings) console.warn(`[env] ${w}`);
  if (errors.length) {
    console.error(`[env] The server cannot start:\n- ${errors.join('\n- ')}`);
    // Exit instead of serving errors: the host marks the deploy as failed and shows this log.
    process.exit(1);
  }
}

const s = store();
try {
  await s.syncNiches(Object.values(allNiches()).map((c) => ({ id: c.id, status: c.status, config: c })));
  console.log(`[store] ${s.kind}: niche settings synced`);
  // After a new deploy, tell IndexNow (Bing → ChatGPT search, Copilot) about every public page, once.
  if (process.env.NODE_ENV === 'production') void submitAllOnNewRevision(Object.values(allNiches()));
} catch (e) {
  // Keep serving: /api/health reports the database as unreachable, and the next start retries.
  console.error('[store] could not reach the database at start:', e);
}
