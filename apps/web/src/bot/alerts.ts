// Team alerts on Telegram (ADMIN_TELEGRAM_CHAT_IDS, the seller bot's own chat with you):
// every new order, and every step it takes after that, so you can follow what is happening.
import { getNiche } from '../lib/niches.ts';
import { utmLabel, type Order } from '../lib/orders.ts';
import type { Outgoing } from './types.ts';

export const adminChats = () => (process.env.ADMIN_TELEGRAM_CHAT_IDS ?? '').split(',').map((x) => Number(x.trim())).filter((x) => Number.isSafeInteger(x) && x !== 0);
export const adminAlerts = (texts: string[]): Outgoing[] => texts.flatMap((text) => adminChats().map((chatId) => ({ chatId, text })));

export type OrderEvent = 'new' | 'confirmed' | 'accepted' | 'rejected' | 'picked' | 'delivered' | 'refused' | 'cancelled';

const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
const SOURCE: Record<string, string> = { whatsapp: 'واتساب', phone: 'تليفون', instagram: 'رسايل إنستجرام', facebook: 'رسايل فيسبوك', other: 'يدوي' };
const STEP: Record<Exclude<OrderEvent, 'new'>, string> = {
  confirmed: '☑️ اتأكد واتبعت للبائع',
  accepted: '✅ البائع قبل الطلب',
  rejected: '❌ البائع قال مش متاح: كلم العميل',
  picked: '🚚 مع المندوب',
  delivered: '🎉 اتسلم للعميل',
  refused: '↩️ العميل رفض الاستلام',
  cancelled: '🚫 اتلغى',
};

/** The alert for an order event (nothing when no team chat is set). `by` says who did it (a seller, the admin). */
export function orderAlert(o: Order, event: OrderEvent, by?: string): Outgoing[] {
  if (!adminChats().length) return [];
  const cfg = getNiche(o.niche);
  const brand = cfg?.brand.nameAr ?? o.niche;
  const link = cfg?.brand.domain ? `\nhttps://${cfg.brand.domain}/admin/orders/${o.id}` : '';
  if (event !== 'new') return adminAlerts([`${STEP[event]} · طلب #${o.id} · ${brand}${by ? `\n(${by})` : ''}\n${o.customer.name} · ${egp(o.quote.total)}${link}`]);
  const q = o.quote;
  const from = o.source && o.source !== 'web' ? `مصدر: ${SOURCE[o.source] ?? o.source} (اتسجل من الأدمن)` : o.utm ? `📣 جه من: ${utmLabel(o.utm)}` : 'مصدر: الموقع';
  return adminAlerts([[
    `🛒 طلب جديد #${o.id} · ${brand}`,
    ...o.items.map((i) => `• ${i.name} · ${i.variant} × ${i.qty}`),
    `💰 ${egp(q.total)} · ${o.payment === 'cod' ? 'كاش عند الاستلام' : 'إنستاباي'}${q.shipping === 0 && (q.shippingWaived ?? 0) > 0 ? ' · شحن مجاني' : ''}${o.promoCode ? ` · كود ${o.promoCode}` : ''}`,
    `👤 ${o.customer.name} · ${o.customer.phone} · ${o.customer.governorate}${o.type === 'repeat' ? ' · عميل راجع' : ' · عميل جديد'}`,
    from,
  ].join('\n') + link]);
}
