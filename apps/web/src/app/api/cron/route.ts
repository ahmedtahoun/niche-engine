// GET /api/cron?key=CRON_SECRET: runs the abandoned-cart check now. Optional: site traffic already
// wakes it every few minutes; a cPanel cron job every 15 minutes covers quiet hours with no visitors.
import { sweepAbandoned } from '@/lib/abandoned';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const want = process.env.CRON_SECRET?.trim();
  if (!want || new URL(req.url).searchParams.get('key') !== want) return new Response('Not found', { status: 404 });
  try {
    return Response.json({ ok: true, alerted: await sweepAbandoned() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
