// Order fulfillment rules shared by the bot, the admin panel and the Bosta webhook.
//
// Pattern: change the order with mutateOrder() (safe against concurrent changes),
// then do the side effects (wallet, refusals, messages) once the change is saved.
// Side effects are safe to repeat: the database keeps one cashback/refund/refusal per order.
import { orderAlert, type OrderEvent } from '../bot/alerts.ts';
import { returnStock } from './stock.ts';
import type { Outgoing } from '../bot/types.ts';
import { deliver } from '../bot/transport.ts';
import { recordRefusal } from './blocklist.ts';
import { BostaError, FINAL_STATES, STATE_CODES, bostaEnabled, createDelivery, getWaybillPdf, resolveDistrict, stateLabel, viewDelivery } from './bosta.ts';
import { origin } from './site.ts';
import { catalog, type Catalog } from './catalog.ts';
import { getNiche } from './niches.ts';
import { itemsOfSeller, mutateOrder, orderById, type Order, type OrderStatus, type Shipment } from './orders.ts';
import { store } from './store/index.ts';
import { grantCashback, refundSpend } from './wallet.ts';
import { rewardPassport } from './passport.ts';

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

/** A shipment that needs the team first (e.g. the customer's Bosta area isn't known). */
export class ShipmentHold extends Error {}

const webhookUrl = (cfg: Parameters<typeof origin>[0]) => `${(process.env.BOSTA_WEBHOOK_BASE || origin(cfg)).replace(/\/$/, '')}/api/bosta`;

/**
 * Creates the Bosta delivery for one seller's part and returns the waybill message.
 * A shipment cancelled at Bosta can be created again; any other existing shipment is left alone.
 */
export async function shipSellerPart(orderId: number, sellerId: string): Promise<Outgoing[]> {
  const o = await orderById(orderId);
  const existing = o?.shipments?.[sellerId];
  if (!o || (existing && existing.status !== 'cancelled')) return [];
  const cfg = getNiche(o.niche)!;
  const seller = (await catalog()).sellerById(sellerId);
  const items = itemsOfSeller(o, sellerId);
  const cod = codSplit(o)[sellerId] ?? 0;
  // Demo mode (no key) needs no Bosta area; with a key Bosta needs its exact district.
  let district = null as Awaited<ReturnType<typeof resolveDistrict>>;
  if (bostaEnabled(o.niche)) {
    district = await resolveDistrict(o.customer);
    if (!district) throw new ShipmentHold(`bosta_area: pick the customer's Bosta area ("${o.customer.area}" in ${o.customer.governorate}), then create the shipment`);
  }
  const res = await createDelivery({
    niche: o.niche,
    businessReference: `${o.id}-${sellerId}`,
    cod,
    goodsValue: items.reduce((a, i) => a + i.unitPrice * i.qty, 0),
    itemsCount: items.reduce((a, i) => a + i.qty, 0),
    description: items.map((i) => `${i.name} (${i.variant}) × ${i.qty}`).join('، '),
    receiver: { name: o.customer.name, phone: o.customer.phone },
    district: district ?? { id: '', ar: o.customer.area, en: o.customer.area, zoneId: '', zoneAr: '', zoneEn: '', cityId: '', cityAr: o.customer.governorate, cityEn: o.customer.governorate },
    address: { line: o.customer.address, landmark: o.customer.landmark },
    pickupLocationId: seller?.bostaLocationId,
    allowOpenPackage: cfg.risk.openBeforePay,
    webhookUrl: webhookUrl(cfg),
  });
  const shipment: Shipment = { deliveryId: res.deliveryId, tracking: res.tracking, status: 'created', cod, state: res.state, updatedAt: new Date().toISOString() };
  const saved = await mutateOrder(orderId, (x) => {
    const now = x.shipments?.[sellerId];
    if (now && now.status !== 'cancelled') return false;
    x.shipments = { ...(x.shipments ?? {}), [sellerId]: shipment };
    if (x.needsAttention && /^(bosta_area|shipment_failed|shipment_cancelled)/.test(x.needsAttention)) delete x.needsAttention;
    return true;
  });
  if (!saved) console.error(`[bosta] order ${orderId}/${sellerId} already had a shipment; Bosta delivery ${res.deliveryId} may be a duplicate`);
  const chat = seller?.telegramChatId;
  if (!chat || !saved) return [];
  const pdf = await getWaybillPdf(o.niche, res.tracking).catch(() => null);
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
      const why = e instanceof ShipmentHold ? e.message : `shipment_failed: ${(e as Error).message}`.slice(0, 300);
      await mutateOrder(orderId, (o) => { o.needsAttention = why; return true; }).catch(() => {});
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
  // The team chat hears about every step (delivered, refused, cancelled, with the courier…).
  const out: Outgoing[] = ['picked', 'delivered', 'refused', 'cancelled', 'confirmed'].includes(to) ? orderAlert(o, to as OrderEvent) : [];
  // Coffee Passport: a delivery may complete the passport (Explorer credit, once per phone).
  if (to === 'delivered') out.push(...(await rewardPassport(o).catch(() => [])));
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

/** Applies a Bosta status update to the shipment with this tracking number. Repeats change nothing. */
export async function applyTracking(tracking: string, status: Shipment['status'], extra: { state?: number; note?: string } = {}): Promise<Outgoing[]> {
  const [found] = await store().listOrders({ tracking, limit: 1 });
  if (!found) return [];
  let next = null as OrderStatus | null; // set inside the change below
  const saved = await mutateOrder(found.id, (o) => {
    const entry = Object.entries(o.shipments ?? {}).find(([, s]) => s.tracking === tracking);
    if (!entry) return false;
    const [sellerId, sh] = entry;
    if (sh.status === status && (extra.state === undefined || sh.state === extra.state)) return false;
    sh.status = status;
    if (extra.state !== undefined) sh.state = extra.state;
    if (extra.note !== undefined) { if (extra.note) sh.note = extra.note; else delete sh.note; }
    sh.updatedAt = new Date().toISOString();
    // With the courier (or further): the seller handed it over, even if the pickup update was missed.
    if (['picked', 'in_transit', 'delivered'].includes(status) && o.sellerState[sellerId] === 'accepted') {
      o.sellerState[sellerId] = 'handed';
      if (['confirmed', 'accepted'].includes(o.status) && Object.values(o.sellerState).every((p) => p === 'handed' || p === 'rejected')) o.status = 'picked';
    }
    const shipments = Object.values(o.shipments!);
    next = status === 'delivered' && shipments.every((s) => s.status === 'delivered') && o.status !== 'delivered' ? 'delivered'
      : status === 'returned' && !['refused', 'delivered'].includes(o.status) ? 'refused' : null;
    if (status === 'exception') o.needsAttention = `delivery_exception${sh.note ? `: ${sh.note}` : ''} (${stateLabel(sh.state)})`;
    // A failed attempt that Bosta then got past (back out for delivery, delivered…) no longer needs the team.
    else if (o.needsAttention?.startsWith('delivery_exception') && !shipments.some((s) => s.status === 'exception')) delete o.needsAttention;
    if (status === 'cancelled' && !['delivered', 'refused', 'cancelled'].includes(o.status)) {
      o.needsAttention = `shipment_cancelled at Bosta${sh.note ? ` (${sh.note})` : ''}: create it again or cancel the order`;
    }
    return true;
  });
  if (!saved || !next) return [];
  const moved = await moveOrderTo(saved.id, next, ACTIVE);
  return moved?.messages ?? [];
}

/**
 * Asks Bosta for the latest state of shipments still moving (webhooks can be missed).
 * Oldest-checked first, at most `limit` per run. Demo shipments and stores without a key are skipped.
 */
export async function syncOpenShipments(limit = 60): Promise<{ checked: number; changed: number }> {
  const orders = await store().listOrders({ statuses: ACTIVE, limit: 1000 });
  const open = orders.flatMap((o) => Object.values(o.shipments ?? {})
    .filter((s) => bostaEnabled(o.niche) && !s.tracking.startsWith('DEMO') && !['delivered', 'returned', 'cancelled'].includes(s.status) && !FINAL_STATES.includes(s.state ?? 0))
    .map((s) => ({ niche: o.niche, s })))
    .sort((a, b) => (a.s.updatedAt ?? '').localeCompare(b.s.updatedAt ?? ''))
    .slice(0, limit);
  let checked = 0, changed = 0;
  for (const { niche, s } of open) {
    let view: { state: number; note: string };
    try { view = await viewDelivery(niche, s.tracking); }
    catch (e) {
      // Deleted in Bosta's dashboard: the shipment is gone, the order stays (it can be shipped again).
      if (e instanceof BostaError && e.status === 404) { checked++; changed++; await deliver(await applyTracking(s.tracking, 'cancelled', { state: 49, note: 'Deleted on Bosta' })); }
      else console.error('[bosta] sync failed for', s.tracking, (e as Error).message);
      continue;
    }
    checked++;
    const status = STATE_CODES[view.state];
    if (!status || view.state === s.state) continue;
    await deliver(await applyTracking(s.tracking, status, { state: view.state, note: view.note }));
    changed++;
  }
  return { checked, changed };
}

let lastSync = 0;
/** Runs the Bosta sync at most every 2 hours per server process (woken by the admin or the cron URL). Never throws. */
export async function maybeSyncBosta(now = Date.now()) {
  if (now - lastSync < 2 * 3600_000) return;
  lastSync = now;
  try { await syncOpenShipments(); } catch (e) { console.error('[bosta] sync failed:', (e as Error).message); }
}
