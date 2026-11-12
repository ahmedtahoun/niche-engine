// Order fulfillment rules shared by the bot, the admin panel and the Bosta webhook.
//
// Pattern: change the order with mutateOrder() (safe against concurrent changes),
// then do the side effects (wallet, refusals, messages) once the change is saved.
// Side effects are safe to repeat: the database keeps one cashback/refund/refusal per order.
import { returnStock } from './stock.ts';
import type { Outgoing } from '../bot/types.ts';
import { deliver } from '../bot/transport.ts';
import { recordRefusal } from './blocklist.ts';
import { createDelivery, getWaybillPdf } from './bosta.ts';
import { catalog, type Catalog } from './catalog.ts';
import { getNiche } from './niches.ts';
import { itemsOfSeller, mutateOrder, orderById, type Order, type OrderStatus, type Shipment } from './orders.ts';
import { store } from './store/index.ts';
import { grantCashback, refundSpend } from './wallet.ts';

const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;

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
export async function shipSellerPart(orderId: number, sellerId: string): Promise<Outgoing[]> {
  const o = await orderById(orderId);
  if (!o || o.shipments?.[sellerId]) return [];
  const cfg = getNiche(o.niche)!;
  const seller = (await catalog()).sellerById(sellerId);
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
  const saved = await mutateOrder(orderId, (x) => {
    if (x.shipments?.[sellerId]) return false;
    x.shipments = { ...(x.shipments ?? {}), [sellerId]: shipment };
    return true;
  });
  if (!saved) console.error(`[bosta] order ${orderId}/${sellerId} already had a shipment; Bosta delivery ${res.deliveryId} may be a duplicate`);
  const chat = seller?.telegramChatId;
  if (!chat || !saved) return [];
  const pdf = await getWaybillPdf(res.tracking);
  return [{ chatId: chat, text: `📄 بوليصة بوسطة · رقم التتبع ${res.tracking}`, file: { name: `AWB-${o.id}-${res.tracking}.pdf`, ...(pdf ? { base64: pdf } : {}) } }];
}

// Shipments run after the bot replies; tests await them with settleShipments().
const g = globalThis as unknown as { __shipQueue?: Set<Promise<void>> };
const queue = (g.__shipQueue ??= new Set());

export function queueShipment(orderId: number, sellerId: string) {
  const p: Promise<void> = shipSellerPart(orderId, sellerId)
    .then(deliver)
    .catch(async (e) => {
      console.error('[bosta] shipment failed', orderId, sellerId, e);
      await mutateOrder(orderId, (o) => { o.needsAttention = 'shipment_failed'; return true; }).catch(() => {});
      const chat = (await catalog().catch(() => null))?.sellerById(sellerId)?.telegramChatId;
      if (chat) await deliver([{ chatId: chat, text: `⚠️ حصلت مشكلة في إنشاء البوليصة للطلب #${orderId}. فريقنا هيبعتهالك يدوي خلال ساعة.` }]);
    })
    .finally(() => queue.delete(p));
  queue.add(p);
}

export const settleShipments = async () => { while (queue.size) await Promise.all([...queue]); };

/** Changes an order's status for a final or courier state (inside mutateOrder). */
function applyMove(o: Order, to: OrderStatus) {
  o.status = to;
  if (to === 'delivered') o.deliveredAt = new Date().toISOString();
  if (to === 'picked') for (const s of Object.keys(o.sellerState)) if (o.sellerState[s] !== 'rejected') o.sellerState[s] = 'handed';
}

/** Wallet, refusal and seller messages after an order reached `to`. Safe to repeat. */
export async function afterMove(o: Order, to: OrderStatus, cat?: Catalog): Promise<Outgoing[]> {
  const cfg = getNiche(o.niche)!;
  if (to === 'refused') await recordRefusal(o.customer.phone, o.id);
  if (to === 'delivered') await grantCashback(o);
  if (to === 'refused' || to === 'cancelled') { await refundSpend(o); await returnStock(o); }
  const c = cat ?? (await catalog());
  const out: Outgoing[] = [];
  for (const sid of Object.keys(o.sellerState)) {
    const chat = c.sellerById(sid)?.telegramChatId;
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

/**
 * Moves an order to `to` if its status is one of `from`, then runs the side effects.
 * Returns the messages to send (empty if the move wasn't allowed).
 */
export async function moveOrderTo(orderId: number, to: OrderStatus, from: OrderStatus[]): Promise<{ order: Order; messages: Outgoing[] } | null> {
  const saved = await mutateOrder(orderId, (o) => {
    if (!from.includes(o.status)) return false;
    applyMove(o, to);
    return true;
  });
  if (!saved) return null;
  return { order: saved, messages: await afterMove(saved, to) };
}

const ACTIVE: OrderStatus[] = ['confirmed', 'accepted', 'picked'];

/** Applies a Bosta status update to the shipment with this tracking number. */
export async function applyTracking(tracking: string, status: Shipment['status']): Promise<Outgoing[]> {
  const [found] = await store().listOrders({ tracking, limit: 1 });
  if (!found) return [];
  let next = null as OrderStatus | null; // set inside the change below
  const saved = await mutateOrder(found.id, (o) => {
    const entry = Object.entries(o.shipments ?? {}).find(([, s]) => s.tracking === tracking);
    if (!entry || entry[1].status === status) return false;
    const [sellerId, sh] = entry;
    sh.status = status;
    if (status === 'picked' && o.sellerState[sellerId] === 'accepted') {
      o.sellerState[sellerId] = 'handed';
      if (Object.values(o.sellerState).every((p) => p === 'handed' || p === 'rejected')) o.status = 'picked';
    }
    const shipments = Object.values(o.shipments!);
    next = status === 'delivered' && shipments.every((s) => s.status === 'delivered') && o.status !== 'delivered' ? 'delivered'
      : status === 'returned' && !['refused', 'delivered'].includes(o.status) ? 'refused' : null;
    if (status === 'exception') o.needsAttention = 'delivery_exception';
    return true;
  });
  if (!saved || !next) return [];
  const moved = await moveOrderTo(saved.id, next, ACTIVE);
  return moved?.messages ?? [];
}
