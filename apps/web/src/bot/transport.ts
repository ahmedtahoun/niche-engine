// Delivers bot messages. Demo chats (ids < 100000, used by the local simulator)
// keep a short log in memory; real chats get the message through the Telegram
// Bot API when TELEGRAM_BOT_TOKEN is set (and are never logged here: no customer
// data sits in server memory).
import type { Incoming, Outgoing } from './types.ts';

export interface LogEntry { from: 'bot' | 'me'; text: string; buttons?: Outgoing['buttons']; keyboard?: Outgoing['keyboard']; file?: Outgoing['file']; at: string }

const isDemoChat = (chatId: number) => chatId < 100000;
const g = globalThis as unknown as { __botLog?: Map<number, LogEntry[]> };
const log = (g.__botLog ??= new Map());

const push = (chatId: number, e: LogEntry) => {
  if (!isDemoChat(chatId)) return;
  const list = log.get(chatId) ?? [];
  list.push(e);
  log.set(chatId, list.slice(-200));
};

export const transcript = (chatId: number) => log.get(chatId) ?? [];

export function recordIncoming(m: Incoming, label?: string) {
  push(m.chatId, { from: 'me', text: label ?? m.text ?? (m.photos ? `📷 ${m.photos} صور` : m.data ?? ''), at: new Date().toISOString() });
}


export async function deliver(outs: Outgoing[]) {
  for (const o of outs) {
    push(o.chatId, { from: 'bot', text: o.text, buttons: o.buttons, keyboard: o.keyboard, file: o.file ? { name: o.file.name } : undefined, at: new Date().toISOString() });
    // A failed message is logged, never thrown: the change that caused it (an
    // approval, an order) is already saved and must not show as an error.
    if (process.env.TELEGRAM_BOT_TOKEN && !isDemoChat(o.chatId)) await sendTelegram(o).catch((e) => console.error('[telegram] send failed', o.chatId, e));
  }
}

async function sendTelegram(o: Outgoing) {
  const base = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN?.trim()}`;
  const reply_markup = o.buttons
    ? { inline_keyboard: o.buttons.map((r) => r.map((b) => ({ text: b.text, callback_data: b.data }))) }
    : o.askContact ? { keyboard: [[{ text: o.askContact, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true }
    : o.keyboard ? { keyboard: o.keyboard.map((r) => r.map((text) => ({ text }))), resize_keyboard: true, is_persistent: true }
    : o.removeKeyboard ? { remove_keyboard: true } : undefined;
  if (o.file?.base64) {
    const form = new FormData();
    form.set('chat_id', String(o.chatId));
    form.set('caption', o.text);
    form.set('document', new Blob([Buffer.from(o.file.base64, 'base64')], { type: 'application/pdf' }), o.file.name);
    const r = await fetch(`${base}/sendDocument`, { method: 'POST', body: form, signal: AbortSignal.timeout(20_000) });
    if (!r.ok) console.error('telegram sendDocument failed', r.status, await r.text());
    return;
  }
  const text = o.file ? `${o.text}: ${o.file.name}` : o.text;
  const res = await fetch(`${base}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: o.chatId, text, reply_markup }), signal: AbortSignal.timeout(10_000) });
  if (!res.ok) console.error('telegram sendMessage failed', res.status, await res.text());
}

export async function answerCallback(id: string) {
  if (!process.env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN?.trim()}/answerCallbackQuery`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callback_query_id: id }) }).catch((e) => console.error('[telegram] answerCallback failed', e));
}
