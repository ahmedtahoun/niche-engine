'use server';

import { normalizeEgyptPhone } from '@niche-engine/core';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { applyStatus, draftOrder, getOrder, mutateOrder, ordersFor } from '@/lib/orders';
import { accountByPhone, createAccount, MIN_PASSWORD, saveAddress, signIn } from '@/lib/customers';
import { currentCustomer, endSession, startSession } from '@/lib/current-customer';
import { moveOrderTo } from '@/lib/fulfillment';
import { walletOf } from '@/lib/wallet';
import { notifyOrder } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { GOVERNORATES } from '@/lib/eta';
import { isBlocked } from '@/lib/blocklist';
import { allow, clientIp } from '@/lib/rate-limit';
import { store } from '@/lib/store';
import type { CartLine, Quote } from '@/lib/types';

/** Orders one phone can place per day (stops a script flooding sellers). */
const MAX_ORDERS_PER_PHONE_PER_DAY = 5;
const BUSY = 'محاولات كتير في وقت قصير. استنى شوية وجرب تاني.';

export async function quoteCart(niche: string, cart: CartLine[], promoCode: string, useWallet = false): Promise<Quote | null> {
  const cfg = getNiche(niche);
  if (!cfg || !Array.isArray(cart)) return null;
  const me = await currentCustomer();
  const [cat, wallet, previous] = await Promise.all([catalog(), me ? walletOf(me.phone, niche) : null, me ? ordersFor(me.phone, niche) : []]);
  const walletBalance = wallet?.balance ?? 0;
  return cat.quote(cfg, cart, { promoCode: promoCode || undefined, isFirstOrder: previous.length === 0, walletBalance, useWallet: useWallet && walletBalance > 0 });
}

export interface CheckoutForm {
  phone: string;
  name: string;
  governorate: string;
  area: string;
  address: string;
  landmark: string;
  payment: 'cod' | 'instapay';
  promoCode: string;
  /** Required when not signed in: new password for a new phone, or the existing one. */
  password: string;
  /** Signed-in customers only: pay part of the goods with wallet credit. */
  useWallet: boolean;
}

type Errors = Partial<Record<keyof CheckoutForm | 'cart', string>>;
export type PlaceResult = { ok: true; id: number } | { ok: false; errors: Errors };

const PHONE_ERR = 'الرقم لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015';
const passwordError = (r: Awaited<ReturnType<typeof signIn>>) =>
  r === 'locked' ? 'محاولات غلط كتير. استنى ربع ساعة أو كلم خدمة العملاء على واتساب.' : 'كلمة السر غلط. لو نسيتها كلم خدمة العملاء على واتساب.';

export async function placeOrder(niche: string, cart: CartLine[], form: CheckoutForm): Promise<PlaceResult> {
  const cfg = getNiche(niche);
  if (!cfg) return { ok: false, errors: { cart: 'المتجر مش موجود' } };
  if (!allow(`order:${await clientIp()}`, 10, 10 * 60_000)) return { ok: false, errors: { cart: BUSY } };
  const me = await currentCustomer();
  const errors: Errors = {};
  const phone = me ? me.phone : normalizeEgyptPhone(form.phone);
  let existing = false;
  if (!phone) errors.phone = PHONE_ERR;
  else if (await isBlocked(phone)) errors.phone = 'مش هنقدر نستقبل طلبات على الرقم ده. كلمنا على واتساب خدمة العملاء.';
  else if (!me) {
    existing = Boolean(await accountByPhone(phone));
    if (existing) {
      const r = await signIn(phone, form.password);
      if (r !== 'ok') errors.password = passwordError(r);
    } else if (form.password.length < MIN_PASSWORD) {
      errors.password = `اختار كلمة سر ${MIN_PASSWORD} حروف أو أرقام على الأقل`;
    }
  }
  if (form.name.trim().length < 2) errors.name = 'اكتب الاسم';
  if (!GOVERNORATES.includes(form.governorate)) errors.governorate = 'اختار المحافظة';
  if (form.area.trim().length < 2) errors.area = 'اكتب المنطقة';
  if (form.address.trim().length < 5) errors.address = 'اكتب الشارع ورقم العمارة';
  if (!Array.isArray(cart) || !cart.length) errors.cart = 'السلة فاضية';
  if (Object.keys(errors).length) return { ok: false, errors };

  const today = await store().listOrders({ phone: phone!, since: new Date(Date.now() - 864e5).toISOString(), limit: MAX_ORDERS_PER_PHONE_PER_DAY });
  if (today.length >= MAX_ORDERS_PER_PHONE_PER_DAY) return { ok: false, errors: { cart: 'وصلت لأقصى عدد طلبات في اليوم. كلمنا على واتساب لو محتاج طلب تاني.' } };

  const details = { name: form.name.trim().slice(0, 80), governorate: form.governorate, area: form.area.trim().slice(0, 80), address: form.address.trim().slice(0, 200), landmark: form.landmark.trim().slice(0, 120) };
  if (!me && !existing) {
    try {
      await createAccount(phone!, details.name, form.password);
    } catch {
      // Someone created this account a moment ago: ask for its password instead.
      return { ok: false, errors: { password: 'الرقم ده عليه حساب. اكتب كلمة السر بتاعته.' } };
    }
  }
  await saveAddress(phone!, details);
  if (!me) await startSession(phone!);

  const cat = await catalog();
  // Wallet credit only for a signed-in customer, re-checked here (never trusted from the browser).
  // The order and its wallet spend are saved together; if the wallet changed meanwhile, re-price and retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [wallet, previous] = await Promise.all([me ? walletOf(me.phone, niche) : null, ordersFor(phone!, niche)]);
    const walletBalance = wallet?.balance ?? 0;
    const q = cat.quote(cfg, cart, { promoCode: form.promoCode || undefined, isFirstOrder: previous.length === 0, walletBalance, useWallet: Boolean(me && form.useWallet && walletBalance > 0) });
    if (q.problems.some((p) => p.startsWith('item_unavailable') || p.startsWith('bundle_unavailable'))) {
      return { ok: false, errors: { cart: 'في منتج في السلة مبقاش متاح. راجع السلة.' } };
    }
    const order = await store().createOrder(draftOrder({
      niche,
      status: cfg.risk.requireWhatsappConfirm ? 'awaiting_confirm' : 'confirmed',
      type: previous.length ? 'repeat' : 'new',
      payment: form.payment === 'instapay' ? 'instapay' : 'cod',
      customer: { ...details, phone: phone! },
      cart,
      quote: q,
      promoCode: q.promoDiscount > 0 ? form.promoCode.trim().toUpperCase() : undefined,
    }), q.wallet > 0 && wallet ? { amount: q.wallet, walletVersion: wallet.version } : null);
    if (order === 'wallet_conflict') continue;
    // With WhatsApp confirmation off, the order goes straight to the sellers.
    if (order.status === 'confirmed') await deliver(notifyOrder(order, cat));
    return { ok: true, id: order.id };
  }
  return { ok: false, errors: { cart: 'رصيد المحفظة اتغير. راجع الطلب وجرب تاني.' } };
}

async function ownOrder(niche: string, id: number) {
  const me = await currentCustomer();
  const o = await getOrder(niche, id);
  return me && o && o.customer.phone === me.phone ? o : null;
}

export async function confirmOrder(niche: string, id: number) {
  if (!(await ownOrder(niche, id))) return false;
  const o = await mutateOrder(id, (x) => applyStatus(x, ['awaiting_confirm'], 'confirmed'));
  if (o) await deliver(notifyOrder(o, await catalog()));
  return Boolean(o);
}

export async function cancelOrder(niche: string, id: number) {
  const mine = await ownOrder(niche, id);
  if (!mine) return false;
  const moved = await moveOrderTo(id, 'cancelled', ['awaiting_confirm', 'confirmed']);
  // Sellers only ever saw confirmed orders, so only they get a cancel message.
  if (moved && mine.status === 'confirmed') await deliver(moved.messages);
  return Boolean(moved);
}

// ---------- accounts ----------
export type AuthResult = { ok: true } | { ok: false; error: string; field?: 'phone' | 'password' | 'name' };

export async function signInAction(phoneRaw: string, password: string): Promise<AuthResult> {
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) return { ok: false, error: PHONE_ERR, field: 'phone' };
  if (!allow(`auth:${await clientIp()}`, 20, 10 * 60_000)) return { ok: false, error: BUSY };
  const r = await signIn(phone, password);
  if (r === 'no_account') return { ok: false, error: 'مفيش حساب بالرقم ده. اعمل حساب جديد.', field: 'phone' };
  if (r !== 'ok') return { ok: false, error: passwordError(r), field: 'password' };
  await startSession(phone);
  return { ok: true };
}

export async function registerAction(phoneRaw: string, name: string, password: string): Promise<AuthResult> {
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) return { ok: false, error: PHONE_ERR, field: 'phone' };
  if (name.trim().length < 2) return { ok: false, error: 'اكتب الاسم', field: 'name' };
  if (password.length < MIN_PASSWORD) return { ok: false, error: `كلمة السر لازم ${MIN_PASSWORD} حروف أو أرقام على الأقل`, field: 'password' };
  if (!allow(`auth:${await clientIp()}`, 20, 10 * 60_000)) return { ok: false, error: BUSY };
  try {
    await createAccount(phone, name.trim().slice(0, 80), password);
  } catch {
    return { ok: false, error: 'الرقم ده عليه حساب. ادخل بكلمة السر.', field: 'phone' };
  }
  await startSession(phone);
  return { ok: true };
}

export async function signOutAction() {
  await endSession();
}
