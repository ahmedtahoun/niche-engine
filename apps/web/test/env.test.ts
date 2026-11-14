import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEnv } from '../src/lib/env.ts';

const good = {
  SESSION_SECRET: 'x'.repeat(40), ADMIN_PASSWORD: 'a-long-password', SUPABASE_URL: 'https://p.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k',
  NICHE_DOMAINS: 'sakinaeg.com=umrah', TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 's', BOSTA_API_KEY: 'b', BOSTA_WEBHOOK_SECRET: 'w', META_CAPI_TOKEN: 'm',
};

test('a complete production config passes with no warnings', () => {
  assert.deepEqual(checkEnv(good), { errors: [], warnings: [] });
});

test('production refuses to start without secrets or a database', () => {
  const r = checkEnv({});
  assert.equal(r.errors.length, 3);
  assert.ok(r.errors.some((e) => e.startsWith('SESSION_SECRET')));
  assert.ok(r.errors.some((e) => e.startsWith('ADMIN_PASSWORD')));
  assert.ok(r.errors.some((e) => e.startsWith('SUPABASE_URL')));
});

test('weak values and half-configured integrations are caught', () => {
  const r = checkEnv({ ...good, ADMIN_PASSWORD: 'short', TELEGRAM_WEBHOOK_SECRET: '', BOSTA_WEBHOOK_SECRET: '' });
  assert.ok(r.errors.some((e) => e.startsWith('ADMIN_PASSWORD')));
  assert.ok(r.errors.some((e) => e.startsWith('TELEGRAM_BOT_TOKEN and')));
  assert.ok(r.errors.some((e) => e.startsWith('BOSTA_WEBHOOK_SECRET')));
});

test('a demo-only deployment is allowed explicitly, with a warning', () => {
  const r = checkEnv({ ...good, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', ALLOW_DEMO_DATA: '1' });
  assert.deepEqual(r.errors, []);
  assert.ok(r.warnings.some((w) => w.includes('DEMO DATA')));
});
