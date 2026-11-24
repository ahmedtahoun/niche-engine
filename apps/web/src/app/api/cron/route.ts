// GET /api/cron?key=CRON_SECRET: runs the abandoned-cart check now, and the Bosta status sync when
// it's due (every 2 hours). Optional: site traffic already wakes the cart check every few minutes;
// a cPanel cron job every 15 minutes covers quiet hours with no visitors.
import { sweepAbandoned } from '@/lib/abandoned';
import { maybeSyncBosta } from '@/lib/fulfillment';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const want = process.env.CRON_SECRET?.trim();
  if (!want || new URL(req.url).searchParams.get('key') !== want) return new Response('Not found', { status: 404 });
  try {
    const alerted = await sweepAbandoned();
    await maybeSyncBosta();
    return Response.json({ ok: true, alerted });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
