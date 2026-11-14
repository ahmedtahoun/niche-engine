// POST /api/t: one page view or funnel step from the browser (admin → Traffic). No cookies:
// the visitor is a daily-changing hash of IP + browser. Bots and the signed-in admin are skipped.
// Each hit also wakes the abandoned-cart check (at most every 5 minutes).
import { after } from 'next/server';
import { headers } from 'next/headers';
import { devOpen, isAdmin } from '@/lib/admin-auth';
import { maybeSweep } from '@/lib/abandoned';
import { getNiche } from '@/lib/niches';
import { allow, clientIp } from '@/lib/rate-limit';
import { store } from '@/lib/store';
import { cleanPath, cleanSource, EVENT_KINDS, isBot, visitorId, type SiteEventKind } from '@/lib/traffic';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ok = new Response(null, { status: 204 });
  let b: Record<string, unknown>;
  try { b = JSON.parse((await req.text()).slice(0, 2000)); } catch { return ok; }
  const cfg = typeof b.n === 'string' ? getNiche(b.n) : null;
  const kind = EVENT_KINDS.includes(b.k as SiteEventKind) ? (b.k as SiteEventKind) : null;
  const path = cfg ? cleanPath(b.p, cfg.id) : null;
  if (!cfg || !kind || !path) return ok;
  const ua = (await headers()).get('user-agent') ?? '';
  const ip = await clientIp();
  if (isBot(ua) || !allow(`t:${ip}`, 200, 10 * 60_000)) return ok;
  if (!devOpen() && (await isAdmin())) return ok; // the team's own visits
  const event = {
    niche: cfg.id, kind, path, visitor: visitorId(ip, ua, process.env.SESSION_SECRET ?? ''),
    source: cleanSource(b.s), device: b.d === 'desktop' ? 'desktop' as const : 'mobile' as const, lang: b.l === 'en' ? 'en' as const : 'ar' as const,
  };
  after(async () => {
    try { await store().addSiteEvent(event); } catch { /* migration 0006 not run yet: drop quietly */ }
    await maybeSweep();
  });
  return ok;
}
