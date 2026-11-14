// Abandoned checkouts (admin → Carts). When someone types a valid phone at checkout, the cart is
// saved as a draft. If no order follows within an hour, the team gets ONE Telegram alert with a
// one-tap WhatsApp reminder (sent by a person from the WhatsApp Business number, not a robot):
//  - only during reply hours (10:00–21:30 Cairo); a draft from the night is alerted the next morning
//  - at most one reminder per phone a week, never for a phone that ordered after starting
//  - drafts older than 48 hours are left alone
// The reminder links to /cart?d=<token>, which refills that cart on any device.
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NicheConfig } from '@niche-engine/core';
import { orderAlerts, orderChats } from '../bot/alerts.ts';
import { deliver } from '../bot/transport.ts';
import { catalog } from './catalog.ts';
import { allNiches, getNiche } from './niches.ts';
import { ordersFor } from './orders.ts';
import { siteUrl, waLink } from './site.ts';
import { store } from './store/index.ts';
import type { Draft } from './store/types.ts';
import { cairoHour } from './traffic.ts';

export const ALERT_AFTER_MIN = 60;
const MAX_AGE_H = 48;
const ONE_PER_DAYS = 7;
const OPEN_HOURS: [number, number] = [10, 21.5];

export const inReplyHours = (d = new Date()) => { const h = cairoHour(d); return h >= OPEN_HOURS[0] && h < OPEN_HOURS[1]; };

/** "Chrome Blend 250 g ×2, Ethiopia Limu 250 g and 1 more", in the draft's language. */
export async function draftItems(d: Draft, cfg: NicheConfig) {
  const q = (await catalog()).quote(cfg, d.cart, { isFirstOrder: false, walletBalance: 0, useWallet: false, lang: d.lang });
  const names = q.lines.map((l) => `${l.title.split(' · ').slice(0, 2).join(' ')}${l.qty > 1 ? ` ×${l.qty}` : ''}`);
  const more = names.length - 2;
  const shown = names.slice(0, 2).join(d.lang === 'en' ? ', ' : '، ');
  return more > 0 ? `${shown} ${d.lang === 'en' ? `and ${more} more` : `و${more} كمان`}` : shown;
}

export const restoreLink = (cfg: NicheConfig, d: Draft) => siteUrl(cfg, `/cart?d=${d.token}`, d.lang);

/** The WhatsApp message to the customer, written as a person would. */
export async function reminderText(d: Draft, cfg: NicheConfig) {
  const first = d.name.trim().split(/\s+/)[0] ?? '';
  const items = await draftItems(d, cfg);
  const link = restoreLink(cfg, d);
  return d.lang === 'en'
    ? `Hi${first ? ` ${first}` : ''} 👋 This is ${cfg.brand.nameEn} ☕\nWe saw you were ordering ${items} but didn't finish. If you have any question about the coffee or delivery, we're here to help.\nIf you'd like to finish, your cart is waiting: ${link}`
    : `أهلاً${first ? ` ${first}` : ''} 👋 معاك ${cfg.brand.nameAr} ☕\nشفنا إنك كنت بتطلب ${items} ومكملتش الطلب. لو عندك أي سؤال عن القهوة أو التوصيل إحنا معاك هنا.\nولو حابب تكمله، سلتك مستنياك: ${link}`;
}

const secret = () => process.env.SESSION_SECRET || 'dev-only-secret';
/** Signature for the Telegram "send" button, so it works without signing in to the admin. */
export const sentSig = (token: string) => createHmac('sha256', secret()).update(`draft-sent:${token}`).digest('base64url').slice(0, 24);
export const sentSigOk = (token: string, sig: string) => { const want = Buffer.from(sentSig(token)); const got = Buffer.from(sig); return got.length === want.length && timingSafeEqual(got, want); };

/** Link the team taps: marks the draft as reminded, then opens WhatsApp with the message ready. */
export const sendLink = (cfg: NicheConfig, d: Draft) => `${cfg.brand.domain ? `https://${cfg.brand.domain}` : ''}/api/carts/sent?t=${d.token}&s=${sentSig(d.token)}`;

/** Team alert for one abandoned draft. */
export async function abandonedAlert(d: Draft, cfg: NicheConfig, now = new Date()) {
  if (!orderChats(d.niche).length) return [];
  const mins = Math.round((now.getTime() - new Date(d.updatedAt).getTime()) / 60_000);
  const items = await draftItems({ ...d, lang: 'ar' }, cfg);
  const text = [
    `🛒💤 سلة متروكة · ${cfg.brand.nameAr}`,
    `• ${items}`,
    `💰 ${Math.round(d.total).toLocaleString('en-US')} ج`,
    `👤 ${d.name || 'بدون اسم'} · ${d.phone}${d.governorate ? ` · ${d.governorate}` : ''}`,
    `⏰ وقف في صفحة الطلب من ${mins >= 120 ? `${Math.round(mins / 60)} ساعة` : `${mins} دقيقة`}`,
    'ابعتله رسالة واحدة بس من رقم واتساب البيزنس: الزرار بيفتح الرسالة جاهزة.',
  ].join('\n');
  const admin = cfg.brand.domain ? `https://${cfg.brand.domain}/admin/carts` : null;
  return orderAlerts(d.niche, [text]).map((o) => ({
    ...o,
    buttons: [[{ text: '💬 ابعت التذكير على واتساب', data: '', url: sendLink(cfg, d) }], ...(admin ? [[{ text: 'السلات المتروكة في الأدمن', data: '', url: admin }]] : [])],
  }));
}

/** The WhatsApp link with the reminder ready (team taps send in WhatsApp). */
export const reminderWaLink = async (d: Draft, cfg: NicheConfig) => waLink(d.phone, await reminderText(d, cfg));

/** Closes a phone's live drafts when it places an order (counts as recovered if it was reminded). */
export async function markDraftOrdered(niche: string, phone: string, orderId: number) {
  const live = await store().listDrafts({ niche, phone, statuses: ['open', 'alerted', 'reminded'], updatedAfter: new Date(Date.now() - 14 * 864e5).toISOString(), limit: 10 });
  for (const d of live) await store().updateDraft(d.id, { status: 'ordered', orderId });
}

/** Finds drafts with no order after an hour and alerts the team once. Returns how many were alerted. */
export async function sweepAbandoned(now = new Date()): Promise<number> {
  if (!inReplyHours(now)) return 0;
  const s = store();
  let alerted = 0;
  for (const cfg of Object.values(allNiches())) {
    const due = await s.listDrafts({
      niche: cfg.id, statuses: ['open'], limit: 50,
      updatedBefore: new Date(now.getTime() - ALERT_AFTER_MIN * 60_000).toISOString(),
      updatedAfter: new Date(now.getTime() - MAX_AGE_H * 3600_000).toISOString(),
    });
    for (const d of due) {
      const ordered = (await ordersFor(d.phone, cfg.id)).find((o) => o.createdAt >= d.createdAt);
      if (ordered) { await s.updateDraft(d.id, { status: 'ordered', orderId: ordered.id }); continue; }
      const recent = (await s.listDrafts({ niche: cfg.id, phone: d.phone, statuses: ['alerted', 'reminded', 'ordered'], updatedAfter: new Date(now.getTime() - ONE_PER_DAYS * 864e5).toISOString(), limit: 5 }))
        .filter((x) => x.id !== d.id && (x.alertedAt || x.remindedAt));
      if (recent.length) { await s.updateDraft(d.id, { status: 'dismissed' }); continue; }
      await s.updateDraft(d.id, { status: 'alerted', alertedAt: now.toISOString() });
      await deliver(await abandonedAlert(d, getNiche(cfg.id)!, now));
      alerted++;
    }
  }
  return alerted;
}

let lastSweep = 0;
/** Runs the sweep at most every 5 minutes per server process (woken by site traffic or the cron URL). Never throws. */
export async function maybeSweep(now = Date.now()) {
  if (now - lastSweep < 5 * 60_000) return;
  lastSweep = now;
  try { await sweepAbandoned(new Date(now)); } catch (e) { console.error('[carts] sweep failed:', (e as Error).message); }
}
