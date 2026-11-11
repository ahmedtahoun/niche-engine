// Order fulfillment rules shared by the bot, the admin panel and the Bosta webhook.
import type { Outgoing } from '../bot/types.ts';
import { deliver } from '../bot/transport.ts';
import { recordRefusal } from './blocklist.ts';
import { createDelivery, getWaybillPdf } from './bosta.ts';
import { SELLERS } from './demo-data.ts';
import { markDirty } from './dirty.ts';
import { getNiche } from './niches.ts';
import { allOrders, itemsOfSeller, type Order, type OrderStatus, type Shipment } from './orders.ts';
import { grantCashback, refundSpend } from './wallet.ts';

const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
const chatOf = (sellerId: string) => SELLERS.find((s) => s.id === sellerId)?.telegramChatId;

/**
 * Cash each courier collects. The customer's total is split across shipments in
 * proportion to each seller's goods; shipping and any rounding go on the largest
 * shipment, and a paid deposit comes off it. Instapay orders collect nothing.
 */
export function codSplit(o: Order): Record<string, number> {
  const sellers = Object.keys(o.sellerState);
  if (o.payment === 'instapay') return Object.fromEntries(sellers.map((s) => [s, 0]));
  const goods = Object.fromEntries(sellers.map((s) => [s, itemsOfSeller(o, s).reduce((a, i) => a + i.unitPrice * i.qty, 0)]));
  const totalGoods = Object.values(goods).reduce((a, b) => a + b, 0) || 1;
  const deposit = o.quote.depositRequired ? o.quote.deposit : 0;
  const toCollect = Math.max(0, o.quote.total - deposit);
  const goodsPart = toCollect - o.quote.shipping;
  const out: Record<string, number> = {};
  for (const s of sellers) out[s] = Math.floor((goodsPart * goods[s]) / totalGoods);
  const largest = sellers.reduce((a, b) => (goods[b] > goods[a] ? b : a));
  out[largest] += toCollect - Object.values(out).reduce((a, b) => a + b, 0);
  return out;
}

/** Creates the Bosta delivery for one seller's part and returns the waybill message. */
export async function shipSellerPart(o: Order, sellerId: string): Promise<Outgoing[]> {
  if (o.shipments?.[sellerId]) return [];
  const cfg = getNiche(o.niche)!;
  const seller = SELLERS.find((s) => s.id === sellerId);
  const items = itemsOfSeller(o, sellerId);
  const cod = codSplit(o)[sellerId] ?? 0;
  const res = await createDelivery({
    businessReference: `${o.id}-${sellerId}`,
    cod,
    itemsCount: items.reduce((a, i) => a + i.qty, 0),
    description: items.map((i) => `${i.name} (${i.variant}) × ${i.qty}`).join('، ').slice(0, 240),
    receiver: { name: o.customer.name, phone: o.customer.phone },
    address: { governorate: o.customer.governorate, area: o.customer.area, line: o.customer.address, landmark: o.customer.landmark },
    pickupLocationId: seller?.bostaLocationId,
    allowOpenPackage: cfg.risk.openBeforePay,
  });
  const shipment: Shipment = { deliveryId: res.deliveryId, tracking: res.tracking, status: 'created', cod };
  o.shipments = { ...(o.shipments ?? {}), [sellerId]: shipment };
  markDirty('order', o.id);
  const chat = chatOf(sellerId);
  if (!chat) return [];
  const pdf = await getWaybillPdf(res.tracking);
  return [{ chatId: chat, text: `📄 بوليصة بوسطة · رقم التتبع ${res.tracking}`, file: { name: `AWB-${o.id}-${res.tracking}.pdf`, ...(pdf ? { base64: pdf } : {}) } }];
}

// Shipments run after the bot replies; tests await them with settleShipments().
const g = globalThis as unknown as { __shipQueue?: Set<Promise<void>> };
const queue = (g.__shipQueue ??= new Set());

export function queueShipment(o: Order, sellerId: string) {
  const p: Promise<void> = shipSellerPart(o, sellerId)
    .then(deliver)
    .catch(async (e) => {
      console.error('[bosta] shipment failed', o.id, sellerId, e);
      o.needsAttention = 'shipment_failed';
      markDirty('order', o.id);
      const chat = chatOf(sellerId);
      if (chat) await deliver([{ chatId: chat, text: `⚠️ حصلت مشكلة في إنشاء البوليصة للطلب #${o.id}. فريقنا هيبعتهالك يدوي خلال ساعة.` }]);
    })
    .finally(() => queue.delete(p));
  queue.add(p);
}

export const settleShipments = async () => { while (queue.size) await Promise.all([...queue]); };

/** Moves an order to a final or courier state and tells each seller. */
export function moveOrderTo(o: Order, to: OrderStatus): Outgoing[] {
  const cfg = getNiche(o.niche)!;
  o.status = to;
  if (to === 'delivered') o.deliveredAt = new Date().toISOString();
  if (to === 'refused') recordRefusal(o.customer.phone);
  if (to === 'delivered') grantCashback(o);
  if (to === 'refused' || to === 'cancelled') refundSpend(o);
  if (to === 'picked') for (const s of Object.keys(o.sellerState)) if (o.sellerState[s] !== 'rejected') o.sellerState[s] = 'handed';
  markDirty('order', o.id);
  const out: Outgoing[] = [];
  for (const sid of Object.keys(o.sellerState)) {
    const chat = chatOf(sid);
    if (!chat) continue;
    const share = itemsOfSeller(o, sid).reduce((a, i) => a + i.unitPrice * i.qty * (1 - cfg.commission[o.type]), 0);
    if (to === 'delivered') {
      const reserve = share * cfg.reserve.percent;
      out.push({ chatId: chat, text: `✅ الطلب #${o.id} اتسلم للعميل.\nنصيبك ${egp(share)}: هيتحولك ${egp(share - reserve)} يوم الخميس، و${egp(reserve)} بتتحجز ضمان وترجعلك بعد ${cfg.reserve.days} يوم.` });
    }
    if (to === 'refused') out.push({ chatId: chat, text: `↩️ العميل رفض استلام الطلب #${o.id}. بوسطة هترجعلك القطعة. مش هيتخصم منك حاجة.` });
    if (to === 'cancelled') out.push({ chatId: chat, text: `الطلب #${o.id} اتلغى. متجهزهوش.` });
  }
  return out;
}

/** Applies a Bosta status update to the shipment with this tracking number. */
export function applyTracking(tracking: string, status: Shipment['status']): Outgoing[] {
  const o = allOrders().find((x) => Object.values(x.shipments ?? {}).some((s) => s.tracking === tracking));
  if (!o) return [];
  const [sellerId, sh] = Object.entries(o.shipments!).find(([, s]) => s.tracking === tracking)!;
  if (sh.status === status) return [];
  sh.status = status;
  markDirty('order', o.id);
  if (status === 'picked' && o.sellerState[sellerId] === 'accepted') {
    o.sellerState[sellerId] = 'handed';
    if (Object.values(o.sellerState).every((p) => p === 'handed' || p === 'rejected')) o.status = 'picked';
  }
  const shipments = Object.values(o.shipments!);
  if (status === 'delivered' && shipments.every((s) => s.status === 'delivered') && o.status !== 'delivered') return moveOrderTo(o, 'delivered');
  if (status === 'returned' && !['refused', 'delivered'].includes(o.status)) return moveOrderTo(o, 'refused');
  if (status === 'exception') { o.needsAttention = 'delivery_exception'; markDirty('order', o.id); }
  return [];
}
