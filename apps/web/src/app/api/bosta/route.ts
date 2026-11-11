// Bosta delivery-status webhook. In the Bosta dashboard set the webhook URL to
// https://<domain>/api/bosta and the Authorization header value to BOSTA_WEBHOOK_SECRET.
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { deliver } from '@/bot/transport';
import { parseWebhook } from '@/lib/bosta';
import { applyTracking } from '@/lib/fulfillment';

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(req: Request) {
  const secret = process.env.BOSTA_WEBHOOK_SECRET;
  if (!secret || !same(req.headers.get('authorization') ?? '', secret)) return NextResponse.json({ ok: false }, { status: 401 });
  const update = parseWebhook(await req.json().catch(() => null));
  // A database error returns 500 so Bosta retries; applying the same update twice changes nothing.
  if (update) await deliver(await applyTracking(update.tracking, update.status));
  // Always 200 for well-authenticated calls so Bosta doesn't retry unknown states forever.
  return NextResponse.json({ ok: true, applied: Boolean(update) });
}
