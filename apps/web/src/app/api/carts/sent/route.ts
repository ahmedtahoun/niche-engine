// GET /api/carts/sent?t=…&s=…: the Telegram "send reminder" button. Signed, so it works on the
// team's phone without signing in. Marks the draft as reminded, then opens WhatsApp with the message.
import { NextResponse } from 'next/server';
import { reminderWaLink, sentSigOk } from '@/lib/abandoned';
import { getNiche } from '@/lib/niches';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const u = new URL(req.url);
  const token = u.searchParams.get('t') ?? '';
  if (!sentSigOk(token, u.searchParams.get('s') ?? '')) return new Response('Link not valid', { status: 403 });
  const d = await store().draftByToken(token);
  const cfg = d && getNiche(d.niche);
  if (!d || !cfg) return new Response('Cart not found', { status: 404 });
  if (d.status === 'open' || d.status === 'alerted') await store().updateDraft(d.id, { status: 'reminded', remindedAt: new Date().toISOString() });
  return NextResponse.redirect(await reminderWaLink(d, cfg), 302);
}
