// Bosta delivery-status webhook. Each shipment we create carries this URL and an
// "Authorization: Bearer <BOSTA_WEBHOOK_SECRET>" header, so nothing has to be set in Bosta's
// dashboard and nobody else can change order statuses through it.
import { NextResponse } from 'next/server';
import { deliver } from '@/bot/transport';
import { parseWebhook, webhookAuthorized } from '@/lib/bosta';
import { applyTracking } from '@/lib/fulfillment';

export async function POST(req: Request) {
  if (!webhookAuthorized(req.headers.get('authorization'))) return NextResponse.json({ ok: false }, { status: 401 });
  const update = parseWebhook(await req.json().catch(() => null));
  // A database error returns 500 so Bosta retries; applying the same update twice changes nothing.
  if (update) await deliver(await applyTracking(update.tracking, update.status, { state: update.state, note: update.note }));
  // Always 200 for well-authenticated calls so Bosta doesn't retry unknown states or other businesses' numbers forever.
  return NextResponse.json({ ok: true, applied: Boolean(update) });
}
