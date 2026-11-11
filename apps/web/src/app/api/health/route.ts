// Health check for uptime monitors and the hosting platform. Reveals no data,
// only whether parts are up and which build is running.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { allNiches } from '@/lib/niches';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

const revision = (() => {
  for (const dir of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return readFileSync(join(dir, 'REVISION'), 'utf8').trim().slice(0, 7); } catch { /* next */ }
  }
  return 'dev';
})();

export async function GET() {
  const s = store();
  const dbUp = await s.ping();
  return NextResponse.json({
    ok: dbUp,
    revision,
    niches: Object.keys(allNiches()),
    database: s.kind === 'supabase' ? (dbUp ? 'supabase' : 'supabase_unreachable') : 'demo',
    telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    bosta: Boolean(process.env.BOSTA_API_KEY),
  }, { status: dbUp ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
