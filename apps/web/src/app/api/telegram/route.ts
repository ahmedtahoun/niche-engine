// Telegram webhook. Register it once the token exists:
// https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<domain>/api/telegram&secret_token=<TELEGRAM_WEBHOOK_SECRET>
import { NextResponse } from 'next/server';
import { handle } from '@/bot/engine';
import { answerCallback, deliver, recordIncoming } from '@/bot/transport';
import type { Incoming } from '@/bot/types';

interface TgUpdate {
  message?: { chat: { id: number }; text?: string; photo?: unknown[]; media_group_id?: string };
  callback_query?: { id: string; data?: string; message?: { chat: { id: number } } };
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const u = (await req.json()) as TgUpdate;
  let m: Incoming | null = null;
  if (u.callback_query?.message) {
    m = { chatId: u.callback_query.message.chat.id, data: u.callback_query.data };
    await answerCallback(u.callback_query.id);
  } else if (u.message) {
    m = { chatId: u.message.chat.id, text: u.message.text, photos: u.message.photo ? 1 : undefined };
  }
  if (m) {
    recordIncoming(m);
    await deliver(handle(m));
  }
  return NextResponse.json({ ok: true });
}
