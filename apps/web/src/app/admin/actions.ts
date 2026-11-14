'use server';

import { normalizeEgyptPhone } from '@niche-engine/core';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminChats, approveProduct, approveSeller, notifyOrder } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { orderAlert } from '@/bot/alerts';
import { checkPassword, COOKIE, isAdmin } from '@/lib/admin-auth';
import { ensureCustomer } from '@/lib/customers';
import { unblock } from '@/lib/blocklist';
import { catalog, deleteProduct, deleteSeller, saveProduct, saveSeller } from '@/lib/catalog';
import { store } from '@/lib/store';
import { RIBBONS, type CartLine, type Product } from '@/lib/types';
import { moveOrderTo, queueShipment } from '@/lib/fulfillment';
import { bostaEnabled } from '@/lib/bosta';
import { getNiche } from '@/lib/niches';
import { applySellerPart, draftOrder, mutateOrder, ORDER_SOURCES, orderById, ordersFor, type OrderSource, type OrderStatus } from '@/lib/orders';
import { GOVERNORATES } from '@/lib/eta';
import { takeStock } from '@/lib/stock';
import { markPaid, paidThisCycle, sellerCycle } from '@/lib/payouts';
import { allow, clientIp } from '@/lib/rate-limit';
import { connectWebhook } from '@/lib/telegram-setup';
import { reminderWaLink } from '@/lib/abandoned';

async function guard() {
  if (!(await isAdmin())) redirect('/admin/login');
}
const done = () => revalidatePath('/admin', 'layout');
const listOrdersFor = (niche: string) => store().listOrders({ niche, limit: 5000 });
const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;

// ---------- sign in ----------
export async function login(_: unknown, form: FormData) {
  if (!allow(`admin:${await clientIp()}`, 10, 15 * 60_000)) return { error: 'Too many attempts. Wait 15 minutes.' };
  const token = checkPassword(String(form.get('password') ?? ''));
  if (!token) return { error: 'Wrong password.' };
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 60 * 60 * 12 });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/admin/login');
}

// ---------- orders (manual Bosta updates; the Bosta webhook does the same automatically) ----------
const MOVES: Record<string, { from: OrderStatus[]; to: OrderStatus }> = {
  picked: { from: ['accepted'], to: 'picked' },
  // Delivered straight from "accepted" too, for orders sent with your own courier.
  delivered: { from: ['accepted', 'picked'], to: 'delivered' },
  refused: { from: ['picked'], to: 'refused' },
  cancelled: { from: ['awaiting_confirm', 'confirmed', 'accepted'], to: 'cancelled' },
};

/**
 * Confirms an order for its sellers from the admin (while you run a seller's orders yourself):
 * every seller still deciding is marked accepted, the order moves to "ready to ship", and with
 * Bosta connected the waybills are created as if the seller pressed accept in Telegram.
 */
export async function confirmForSellers(id: number) {
  await guard();
  const before = await orderById(id);
  if (!before) return;
  if (before.status === 'awaiting_confirm') {
    const moved = await moveOrderTo(id, 'confirmed', ['awaiting_confirm']);
    if (moved) await deliver([...moved.messages, ...notifyOrder(moved.order, await catalog())]);
  }
  const pending = Object.entries((await orderById(id))?.sellerState ?? {}).filter(([, part]) => part === 'pending').map(([sid]) => sid);
  for (const sid of pending) {
    const saved = await mutateOrder(id, (x) => applySellerPart(x, sid, 'accepted'));
    if (saved && bostaEnabled()) queueShipment(id, sid);
    if (saved && saved.status === 'accepted') await deliver(orderAlert(saved, 'accepted', 'اتأكد من الأدمن'));
  }
  done();
}

export async function moveOrder(id: number, move: keyof typeof MOVES) {
  await guard();
  const m = MOVES[move];
  if (!m) return;
  const before = await orderById(id);
  const moved = await moveOrderTo(id, m.to, m.from);
  // An order cancelled before confirmation never reached the sellers: nothing to tell them.
  if (moved && !(m.to === 'cancelled' && before?.status === 'awaiting_confirm')) await deliver(moved.messages);
  done();
}

export async function clearAttention(id: number) {
  await guard();
  await mutateOrder(id, (o) => { if (!o.needsAttention) return false; delete o.needsAttention; return true; });
  done();
}

export async function unblockPhone(phone: string) {
  await guard();
  await unblock(phone);
  done();
}

// ---------- sellers ----------
export async function approveSellerAction(id: string) { await guard(); await deliver(await approveSeller(id)); done(); }

const SELLER_STATUSES = ['applied', 'active', 'warning', 'suspended', 'declined'] as const;
type SellerStatus = (typeof SELLER_STATUSES)[number];
const STATUS_TEXT: Record<Exclude<SellerStatus, 'applied'>, string> = {
  declined: 'شكراً لاهتمامك 🤍 للأسف مش هنقدر نكمل دلوقتي. تقدر تقدم تاني بعد 60 يوم.',
  suspended: 'حسابك اتوقف مؤقتاً ومنتجاتك اتخفت. كلم فريق خدمة البائعين على واتساب.',
  active: 'حسابك رجع شغال ✅ منتجاتك ظاهرة تاني.',
  warning: 'تنبيه: معدل التسليم أو الرفض عندك محتاج يتحسن. سلم الطلبات للمندوب خلال 48 ساعة.',
};
async function tellSeller(s: { telegramChatId?: number }, status: SellerStatus) {
  if (s.telegramChatId && status !== 'applied') await deliver([{ chatId: s.telegramChatId, text: STATUS_TEXT[status] }]);
}

export async function setSellerStatus(id: string, status: 'active' | 'warning' | 'suspended' | 'declined') {
  await guard();
  const found = (await catalog()).sellerById(id);
  if (!found) return;
  await saveSeller({ ...structuredClone(found), status });
  await tellSeller(found, status);
  done();
}

/**
 * The seller editor's single Save (also creates a seller when id is "new"): names, owner, contact,
 * pickup address, InstaPay, capacity, store story, logo address and status. A status change is
 * sent to the seller on Telegram, as before.
 */
export async function saveSellerForm(id: string, form: FormData) {
  await guard();
  const cat = await catalog();
  const isNew = id === 'new';
  const found = isNew ? null : cat.sellerById(id);
  if (!isNew && !found) redirect('/admin/sellers');
  const name = text(form, 'name', 80) ?? '';
  const niche = String(form.get('niche') ?? found?.niche ?? '');
  if (!name || !getNiche(niche)) redirect(isNew ? '/admin/sellers/new?error=1' : `/admin/sellers/${id}`);
  const base = found ? structuredClone(found) : { id: '', niche, name, area: '', rating: 0, status: 'active' as SellerStatus };
  const s = { ...base, niche, name };
  const opt = (key: string, max: number) => { const v = text(form, key, max); return v ? v : undefined; };
  const set = <K extends keyof typeof s>(k: K, v: (typeof s)[K] | undefined) => { if (v === undefined || v === '') delete (s as Record<string, unknown>)[k as string]; else s[k] = v; };
  set('nameEn', opt('nameEn', 80));
  set('ownerName', opt('ownerName', 80));
  const phone = text(form, 'contactPhone', 20);
  set('contactPhone', phone ? normalizeEgyptPhone(phone) ?? phone : undefined);
  s.area = text(form, 'area', 80) ?? s.area ?? '';
  set('governorate', opt('governorate', 40));
  set('pickupAddress', opt('pickupAddress', 200));
  set('instapay', opt('instapay', 60));
  set('capacity', opt('capacity', 40));
  set('instagram', opt('instagram', 60));
  set('logo', opt('logo', 300));
  const aboutAr = text(form, 'aboutAr', 600), aboutEn = text(form, 'aboutEn', 600);
  set('about', aboutAr ? { ar: aboutAr, ...(aboutEn ? { en: aboutEn } : {}) } : undefined);
  const status = String(form.get('status') ?? s.status) as SellerStatus;
  const changed = SELLER_STATUSES.includes(status) && status !== s.status;
  if (SELLER_STATUSES.includes(status)) s.status = status;
  if (isNew) {
    const slug = (s.nameEn ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
    let newId = slug || `seller-${Date.now().toString(36)}`;
    while (cat.sellerById(newId)) newId = `${slug || 'seller'}-${Math.random().toString(36).slice(2, 6)}`;
    s.id = newId;
  }
  await saveSeller(s);
  if (changed && !isNew) await tellSeller(s, status);
  done();
  if (isNew) redirect(`/admin/sellers/${s.id}`);
}

/**
 * Deletes a seller with no products, orders or payouts. Anyone with history is archived instead
 * (suspended: their products leave the store), so orders and payouts stay complete.
 */
export async function deleteSellerAction(id: string) {
  await guard();
  const cat = await catalog();
  const s = cat.sellerById(id);
  if (!s) redirect('/admin/sellers');
  const hasProducts = cat.products.some((p) => p.sellerId === id);
  const hasOrders = (await store().listOrders({ sellerId: id, limit: 1 })).length > 0;
  let result = 'deleted';
  if (hasProducts || hasOrders) {
    await saveSeller({ ...structuredClone(s), status: 'suspended' });
    result = 'archived';
  } else {
    try { await deleteSeller(id); } catch { await saveSeller({ ...structuredClone(s), status: 'suspended' }); result = 'archived'; }
  }
  done();
  redirect(`/admin/sellers?${new URLSearchParams({ done: result, name: s.name })}`);
}

// ---------- products ----------
export async function approveProductAction(id: string) { await guard(); await deliver(await approveProduct(id)); done(); }

export async function setProductStatus(id: string, status: 'live' | 'hidden', reason?: string) {
  await guard();
  const cat = await catalog();
  const found = cat.productById(id);
  if (!found) return;
  const wasReview = found.status === 'review';
  const p = { ...structuredClone(found), status };
  await saveProduct(p);
  const chat = cat.sellerById(p.sellerId)?.telegramChatId;
  if (chat && wasReview && status === 'hidden') await deliver([{ chatId: chat, text: `"${p.nameAr}" محتاج تعديل قبل النشر: ${reason ?? 'راجع الصور والسعر'}. ابعته تاني من ➕ منتج جديد.` }]);
  done();
}

/** Stock per option from the admin form (fields "stock:<option label>"); whole numbers 0–100000. */
export async function setStock(id: string, form: FormData) {
  await guard();
  const found = (await catalog()).productById(id);
  if (!found) return;
  const p = structuredClone(found);
  for (const v of p.variants) {
    const raw = form.get(`stock:${v.label}`);
    if (raw === null || String(raw).trim() === '') continue;
    const n = Math.floor(Number(String(raw).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))));
    if (Number.isFinite(n) && n >= 0 && n <= 100000) v.stock = n;
  }
  await saveProduct(p);
  done();
}

const num = (raw: FormDataEntryValue | null) => {
  if (raw === null || String(raw).trim() === '') return null;
  const n = Number(String(raw).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};

/** Applies stock, price and cost fields ("stock:<label>", "price:<label>", "cost:<label>") to a product copy. */
function applySkus(p: Product, form: FormData) {
  let priced = false;
  for (const v of p.variants) {
    const stock = num(form.get(`stock:${v.label}`));
    if (stock !== null && Number.isInteger(stock) && stock >= 0 && stock <= 100000) v.stock = stock;
    const price = num(form.get(`price:${v.label}`));
    if (price !== null && Number.isInteger(price) && price > 0 && price <= 1_000_000 && price !== (v.price ?? p.price)) { v.price = price; priced = true; }
    if (form.has(`before:${v.label}`)) {
      const before = num(form.get(`before:${v.label}`));
      const now = v.price ?? p.price;
      if (before !== null && Number.isInteger(before) && before > now && before <= 1_000_000) v.compareAt = before;
      else delete v.compareAt;
    }
    if (form.has(`cost:${v.label}`)) {
      const cost = num(form.get(`cost:${v.label}`));
      if (cost === null) { if (p.cost) delete p.cost[v.label]; }
      else if (Number.isInteger(cost) && cost >= 0 && cost <= 1_000_000) p.cost = { ...(p.cost ?? {}), [v.label]: cost };
    }
  }
  if (p.cost && !Object.keys(p.cost).length) delete p.cost;
  if (priced) {
    // The "from" price shown on cards is the lowest option price.
    const prices = p.variants.map((v) => v.price).filter((x): x is number => typeof x === 'number');
    if (prices.length) p.price = Math.min(...prices);
    p.priceConfirmedAt = new Date().toISOString();
  }
}

const text = (form: FormData, key: string, max: number) => {
  const v = form.get(key);
  return v === null ? null : String(v).replace(/\s+/g, ' ').trim().slice(0, max);
};

/**
 * The product editor's single Save: names and descriptions (Arabic and English), status,
 * and per size the selling price, buying price and stock. Buying prices stay in the admin.
 */
export async function saveProductForm(id: string, form: FormData) {
  await guard();
  const found = (await catalog()).productById(id);
  if (!found) return;
  const p = structuredClone(found);
  const nameAr = text(form, 'nameAr', 120), leadAr = text(form, 'leadAr', 600);
  const nameEn = text(form, 'nameEn', 120), leadEn = text(form, 'leadEn', 600);
  if (nameAr) p.nameAr = nameAr;
  if (leadAr !== null && leadAr) p.leadAr = leadAr;
  if (nameEn !== null || leadEn !== null) {
    p.en = { ...(p.en ?? { name: '', lead: '', attributes: {} }), ...(nameEn ? { name: nameEn } : {}), ...(leadEn ? { lead: leadEn } : {}) };
  }
  const status = form.get('status');
  if (status === 'live' || status === 'hidden') p.status = status;
  if (form.has('ribbon')) {
    const r = String(form.get('ribbon'));
    if ((RIBBONS as readonly string[]).includes(r)) p.ribbon = r as Product['ribbon'];
    else delete p.ribbon;
  }
  applySkus(p, form);
  await saveProduct(p);
  done();
}

/**
 * Deletes a product nobody has ordered. One that appears in orders is archived (hidden) instead,
 * so order history and payouts keep working. Returns to the list either way.
 */
export async function deleteProductAction(id: string) {
  await guard();
  const cat = await catalog();
  const p = cat.productById(id);
  if (!p) redirect('/admin/products');
  const ordered = (await listOrdersFor(p.niche)).some((o) => o.items.some((i) => i.productId === id));
  let result = 'deleted';
  if (ordered) {
    await saveProduct({ ...structuredClone(p), status: 'hidden' });
    result = 'archived';
  } else {
    try { await deleteProduct(id); } catch { await saveProduct({ ...structuredClone(p), status: 'hidden' }); result = 'archived'; }
  }
  done();
  redirect(`/admin/products?${new URLSearchParams({ done: result, name: p.nameAr })}`);
}

// ---------- manual orders (WhatsApp, phone…) ----------
export interface ManualOrderInput {
  niche: string;
  source: OrderSource;
  customer: { phone: string; name: string; governorate: string; area: string; address: string; landmark: string };
  lines: CartLine[];
  payment: 'cod' | 'instapay';
  freeShipping: boolean;
  /** Extra discount in EGP, taken off the order (not off the seller's share). */
  discount: number;
}
export type ManualOrderResult = { ok: true; id: number } | { ok: false; error: string };

/**
 * Creates an order taken outside the website. Priced like checkout from today's prices,
 * refused if a size lacks stock; takes the stock, tells the sellers and lands in the customer's history.
 */
export async function createManualOrder(input: ManualOrderInput): Promise<ManualOrderResult> {
  await guard();
  const cfg = getNiche(input.niche);
  if (!cfg) return { ok: false, error: 'Pick a store.' };
  const phone = normalizeEgyptPhone(input.customer.phone);
  if (!phone) return { ok: false, error: 'Enter a valid Egyptian mobile number (01…).' };
  const c = input.customer;
  if (c.name.trim().length < 2) return { ok: false, error: 'Enter the customer\'s name.' };
  if (!GOVERNORATES.includes(c.governorate)) return { ok: false, error: 'Pick the governorate.' };
  if (c.area.trim().length < 2 || c.address.trim().length < 5) return { ok: false, error: 'Enter the area and the street address.' };
  const lines = (input.lines ?? []).filter((l) => l.qty > 0).map((l) => ({ ...l, qty: Math.min(50, Math.floor(l.qty)) }));
  if (!lines.length) return { ok: false, error: 'Add at least one item.' };
  if (!ORDER_SOURCES.includes(input.source)) return { ok: false, error: 'Pick where the order came from.' };

  const cat = await catalog();
  const previous = await ordersFor(phone, input.niche);
  const q = cat.quote(cfg, lines, { isFirstOrder: previous.length === 0, walletBalance: 0, useWallet: false, lang: 'ar' });
  const problem = q.problems.find((p) => /^(item_unavailable|bundle_unavailable|choice_missing|low_stock)/.test(p));
  if (problem) {
    const [kind, slug, variant] = problem.split(':');
    const name = cat.productBySlug(input.niche, slug)?.nameAr ?? slug;
    return { ok: false, error: kind === 'low_stock' ? `Not enough stock: ${name} ${variant ?? ''}. Update the stock in Products first.` : kind === 'choice_missing' ? `Pick the grind for ${name}.` : `${name} is not on sale.` };
  }
  if (input.freeShipping && q.shipping) { q.total -= q.shipping; q.shippingWaived = (q.shippingWaived ?? 0) + q.shipping; q.shipping = 0; }
  const discount = Math.max(0, Math.min(Math.floor(input.discount || 0), q.total));
  if (discount) { q.promoDiscount += discount; q.total -= discount; }
  q.depositRequired = false;

  const details = { name: c.name.trim().slice(0, 80), governorate: c.governorate, area: c.area.trim().slice(0, 80), address: c.address.trim().slice(0, 200), landmark: (c.landmark ?? '').trim().slice(0, 120) };
  await ensureCustomer(phone, details);
  const order = await store().createOrder(draftOrder({
    niche: input.niche, status: 'confirmed', type: previous.length ? 'repeat' : 'new', payment: input.payment === 'instapay' ? 'instapay' : 'cod',
    customer: { ...details, phone }, cart: lines, quote: q, source: input.source,
  }), null);
  if (order === 'wallet_conflict') return { ok: false, error: 'Please try again.' };
  await takeStock(order);
  await deliver([...notifyOrder(order, cat), ...orderAlert(order, 'new')]);
  done();
  return { ok: true, id: order.id };
}

// ---------- reviews (real customers only: typed from what they said after delivery) ----------
/** Saves a delivered order's review on one of its products (one per order and product; saving again replaces it). */
export async function addReviewAction(orderId: number, form: FormData) {
  await guard();
  const o = await orderById(orderId);
  const productId = String(form.get('product') ?? '');
  const stars = Math.round(Number(form.get('stars')));
  const text = String(form.get('text') ?? '').trim().slice(0, 600);
  const name = String(form.get('name') ?? '').trim().slice(0, 40);
  if (!o || o.status !== 'delivered' || !o.items.some((i) => i.productId === productId) || !(stars >= 1 && stars <= 5) || text.length < 2 || !name) return;
  const p = (await catalog()).productById(productId);
  if (!p) return;
  const item = o.items.find((i) => i.productId === productId)!;
  const review = { name, tags: [item.variant.split(' · ')[0]], text, stars, orderId, at: new Date().toISOString() };
  await saveProduct({ ...structuredClone(p), reviews: [...p.reviews.filter((r) => !(r.orderId === orderId)), review] });
  done();
  revalidatePath('/', 'layout');
}

export async function deleteReviewAction(productId: string, index: number) {
  await guard();
  const p = (await catalog()).productById(productId);
  if (!p || !p.reviews[index]) return;
  await saveProduct({ ...structuredClone(p), reviews: p.reviews.filter((_, i) => i !== index) });
  done();
  revalidatePath('/', 'layout');
}

// ---------- payouts ----------
export async function markPaidAction(sellerId: string) {
  await guard();
  const s = (await catalog()).sellerById(sellerId);
  const cfg = s && getNiche(s.niche);
  if (!s || !cfg || (await paidThisCycle()).has(sellerId)) return;
  const c = await sellerCycle(sellerId, cfg);
  if (c.payable <= 0) return;
  // The database accepts one payout per seller per cycle: a double click can't pay twice.
  if (!(await markPaid(sellerId, c.payable))) return;
  if (s.telegramChatId) await deliver([{ chatId: s.telegramChatId, text: `💰 اتحولك ${egp(c.payable)} على إنستاباي${s.instapay ? ` (${s.instapay.slice(0, 3)}••••${s.instapay.slice(-4)})` : ''}.\nمحجوز كضمان: ${egp(c.reserveHeld)}\nشكراً 🤍` }]);
  done();
}

// ---------- Telegram ----------
export async function connectTelegram() {
  await guard();
  const r = await connectWebhook();
  redirect(`/admin/telegram?ok=${r.ok ? 1 : 0}&result=${encodeURIComponent(r.message)}`);
}

export async function testAdminAlert() {
  await guard();
  const chats = adminChats();
  await deliver(chats.map((chatId) => ({ chatId, text: '✅ تنبيهات سكينة شغالة. هيوصلك هنا كل ما حد يفتح بوت البائعين أو يقدّم أو يبعت منتج.' })));
  redirect(`/admin/telegram?ok=${chats.length ? 1 : 0}&result=${encodeURIComponent(chats.length ? `Test alert sent to ${chats.length} chat(s)` : 'ADMIN_TELEGRAM_CHAT_IDS is not set')}`);
}

// ---------- abandoned checkouts (Carts) ----------
/** "Send on WhatsApp": marks the cart as reminded, then opens WhatsApp with the message ready. */
export async function sendCartReminder(token: string) {
  await guard();
  const d = await store().draftByToken(token);
  const cfg = d && getNiche(d.niche);
  if (!d || !cfg) return;
  if (d.status === 'open' || d.status === 'alerted') await store().updateDraft(d.id, { status: 'reminded', remindedAt: new Date().toISOString() });
  revalidatePath('/admin/carts');
  redirect(await reminderWaLink(d, cfg));
}

export async function dismissCart(token: string) {
  await guard();
  const d = await store().draftByToken(token);
  if (d && d.status !== 'ordered') await store().updateDraft(d.id, { status: 'dismissed' });
  revalidatePath('/admin/carts');
}
