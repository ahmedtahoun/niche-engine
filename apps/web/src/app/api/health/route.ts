// Health check for the hosting platform. Reveals no data, only whether parts are up.
import { NextResponse } from 'next/server';
import { dbEnabled } from '@/lib/db/rest';
import { allNiches } from '@/lib/niches';

export const dynamic = 'force-dynamic';

export function GET() {
  try {
    const niches = Object.keys(allNiches());
    return NextResponse.json({
      ok: true,
      niches,
      database: dbEnabled() ? 'supabase' : 'demo',
      telegram: Boolean(process.env.TELEGRAM_BOT_TOKEN),
      bosta: Boolean(process.env.BOSTA_API_KEY),
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
