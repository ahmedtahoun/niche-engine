'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminChats, approveProduct, approveSeller } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { checkPassword, COOKIE, isAdmin } from '@/lib/admin-auth';
import { unblock } from '@/lib/blocklist';
import { catalog, deleteProduct, saveProduct, saveSeller } from '@/lib/catalog';
import { store } from '@/lib/store';
import { RIBBONS, type Product } from '@/lib/types';
import { moveOrderTo } from '@/lib/fulfillment';
import { getNiche } from '@/lib/niches';
import { mutateOrder, orderById, type OrderStatus } from '@/lib/orders';
import { markPaid, paidThisCycle, sellerCycle } from '@/lib/payouts';
import { allow, clientIp } from '@/lib/rate-limit';
import { connectWebhook } from '@/lib/telegram-setup';

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
  delivered: { from: ['picked'], to: 'delivered' },
  refused: { from: ['picked'], to: 'refused' },
  cancelled: { from: ['awaiting_confirm', 'confirmed'], to: 'cancelled' },
};

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

export async function setSellerStatus(id: string, status: 'active' | 'warning' | 'suspended' | 'declined') {
  await guard();
  const found = (await catalog()).sellerById(id);
  if (!found) return;
  const s = { ...structuredClone(found), status };
  await saveSeller(s);
  const chat = s.telegramChatId;
  const text = {
    declined: 'شكراً لاهتمامك 🤍 للأسف مش هنقدر نكمل دلوقتي. تقدر تقدم تاني بعد 60 يوم.',
    suspended: 'حسابك اتوقف مؤقتاً ومنتجاتك اتخفت. كلم فريق خدمة البائعين على واتساب.',
    active: 'حسابك رجع شغال ✅ منتجاتك ظاهرة تاني.',
    warning: 'تنبيه: معدل التسليم أو الرفض عندك محتاج يتحسن. سلم الطلبات للمندوب خلال 48 ساعة.',
  }[status];
  if (chat) await deliver([{ chatId: chat, text }]);
  done();
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
