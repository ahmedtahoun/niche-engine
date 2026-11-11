// Telegram webhook. Register it once the token exists:
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { handle } from '@/bot/engine';
import { answerCallback, deliver, recordIncoming } from '@/bot/transport';
import type { Incoming } from '@/bot/types';
import { store } from '@/lib/store';

interface TgUpdate {
  update_id?: number;
  message?: { chat: { id: number }; text?: string; photo?: unknown[]; media_group_id?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || !same(req.headers.get('x-telegram-bot-api-secret-token') ?? '', secret)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = (await req.json().catch(() => ({}))) as TgUpdate;
  // Telegram resends an update when we answer slowly: handle each one once.
  if (typeof u.update_id === 'number' && !(await store().claimTelegramUpdate(u.update_id))) return NextResponse.json({ ok: true, duplicate: true });
  let m: Incoming | null = null;
  if (u.callback_query?.message) {
    m = { chatId: u.callback_query.message.chat.id, data: u.callback_query.data };
    await answerCallback(u.callback_query.id);
  } else if (u.message) {
    m = { chatId: u.message.chat.id, text: u.message.text, photos: u.message.photo ? 1 : undefined };
  }
  if (m) {
    recordIncoming(m);
    try {
      await deliver(await handle(m));
    } catch (e) {
      // Answer 200 anyway: a retry would hit the same error, and the seller gets a clear message.
      console.error('[bot] failed to handle update', u.update_id, e);
      await deliver([{ chatId: m.chatId, text: 'حصلت مشكلة عندنا. جرب تاني بعد دقيقة، ولو اتكررت كلمنا على واتساب خدمة البائعين.' }]).catch(() => {});
    }
  }
  return NextResponse.json({ ok: true });
}
