// Bot setup from the admin panel: the server already holds the token, so it can
// check the bot and register the webhook itself (no token copied into a terminal).
// Server-only. The token never leaves the server; pages only see the bot's name.

const API = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN?.trim()}`;

export interface TelegramStatus {
  configured: boolean;
  /** The token passed Telegram's check. */
  tokenOk: boolean;
  bot?: { username: string; name: string };
  webhook?: { url: string; pending: number; lastError?: string; lastErrorAt?: string };
  /** The server could not reach api.telegram.org at all (host blocking outgoing traffic?). */
  unreachable?: string;
  problem?: string;
}

async function call<T>(method: string, params?: Record<string, string | boolean>): Promise<{ ok: boolean; result?: T; description?: string }> {
  const res = await fetch(`${API()}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(params ?? {}),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  return res.json();
}

/** The main domain from NICHE_DOMAINS (first entry without www.). */
export function mainDomain(): string | null {
  const hosts = (process.env.NICHE_DOMAINS ?? '').split(',').map((x) => x.split('=')[0]?.trim()).filter(Boolean);
  return hosts.find((h) => !h.startsWith('www.')) ?? hosts[0] ?? null;
}

export const webhookUrl = () => { const d = mainDomain(); return d ? `https://${d}/api/telegram` : null; };

export async function telegramStatus(): Promise<TelegramStatus> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return { configured: false, tokenOk: false, problem: 'TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET must both be set in the hosting settings.' };
  }
  try {
    const me = await call<{ username: string; first_name: string }>('getMe');
    if (!me.ok || !me.result) return { configured: true, tokenOk: false, problem: `Telegram rejected the token (${me.description ?? 'unknown'}). Copy it again from @BotFather → /mybots → API Token.` };
    const info = await call<{ url: string; pending_update_count: number; last_error_message?: string; last_error_date?: number }>('getWebhookInfo');
    const w = info.result;
    return {
      configured: true, tokenOk: true,
      bot: { username: me.result.username, name: me.result.first_name },
      ...(w ? { webhook: { url: w.url, pending: w.pending_update_count, ...(w.last_error_message ? { lastError: w.last_error_message, lastErrorAt: new Date((w.last_error_date ?? 0) * 1000).toISOString() } : {}) } } : {}),
    };
  } catch (e) {
    return { configured: true, tokenOk: false, unreachable: (e as Error).message };
  }
}

/** Points Telegram at this site with the secret from the hosting settings. */
export async function connectWebhook(): Promise<{ ok: boolean; message: string }> {
  const url = webhookUrl();
  if (!url) return { ok: false, message: 'NICHE_DOMAINS is empty, so the site does not know its own address.' };
  try {
    const r = await call('setWebhook', { url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET!.trim(), drop_pending_updates: true });
    return { ok: r.ok, message: r.ok ? `Connected: Telegram now sends messages to ${url}` : `Telegram refused: ${r.description}` };
  } catch (e) {
    return { ok: false, message: `Could not reach Telegram from the server: ${(e as Error).message}` };
  }
}

const g = globalThis as unknown as { __botName?: { at: number; name: string | null } };

/** The bot's @username for public "open the bot" links (asked once a day; null if not set up). */
export async function botUsername(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_USERNAME) return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, '');
  if (!process.env.TELEGRAM_BOT_TOKEN) return null;
  if (g.__botName && Date.now() - g.__botName.at < 864e5) return g.__botName.name;
  try {
    const me = await call<{ username: string }>('getMe');
    g.__botName = { at: Date.now(), name: me.ok && me.result ? me.result.username : null };
  } catch {
    g.__botName = { at: Date.now() - 864e5 + 6e5, name: null }; // retry in 10 minutes
  }
  return g.__botName.name;
}
