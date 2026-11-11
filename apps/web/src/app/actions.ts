'use server';

import { normalizeEgyptPhone } from '@niche-engine/core';
import { quote } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { getOrder, ordersFor, saveOrder, setStatus } from '@/lib/orders';
import { accountByPhone, createAccount, MIN_PASSWORD, saveAddress, signIn } from '@/lib/customers';
import { currentCustomer, endSession, startSession } from '@/lib/current-customer';
import { moveOrderTo } from '@/lib/fulfillment';
import { refundSpend, spend, walletOf } from '@/lib/wallet';
import { notifyOrder } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { GOVERNORATES } from '@/lib/eta';
import { isBlocked } from '@/lib/blocklist';
import type { CartLine, Quote } from '@/lib/types';

export async function quoteCart(niche: string, cart: CartLine[], promoCode: string, useWallet = false): Promise<Quote | null> {
  const cfg = getNiche(niche);
  if (!cfg) return null;
  const me = await currentCustomer();
  const walletBalance = me ? walletOf(me.phone, niche).balance : 0;
  const isFirstOrder = me ? ordersFor(me.phone, niche).length === 0 : true;
  return quote(cfg, cart, { promoCode: promoCode || undefined, isFirstOrder, walletBalance, useWallet: useWallet && walletBalance > 0 });
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
const passwordError = (r: ReturnType<typeof signIn>) =>
  r === 'locked' ? 'محاولات غلط كتير. استنى ربع ساعة أو كلم خدمة العملاء على واتساب.' : 'كلمة السر غلط. لو نسيتها كلم خدمة العملاء على واتساب.';

export async function placeOrder(niche: string, cart: CartLine[], form: CheckoutForm): Promise<PlaceResult> {
  const cfg = getNiche(niche);
  if (!cfg) return { ok: false, errors: { cart: 'المتجر مش موجود' } };
  const me = await currentCustomer();
  const errors: Errors = {};
  const phone = me ? me.phone : normalizeEgyptPhone(form.phone);
  if (!phone) errors.phone = PHONE_ERR;
  else if (isBlocked(phone)) errors.phone = 'مش هنقدر نستقبل طلبات على الرقم ده. كلمنا على واتساب خدمة العملاء.';
  else if (!me) {
    if (accountByPhone(phone)) {
      const r = signIn(phone, form.password);
      if (r !== 'ok') errors.password = passwordError(r);
    } else if (form.password.length < MIN_PASSWORD) {
      errors.password = `اختار كلمة سر ${MIN_PASSWORD} حروف أو أرقام على الأقل`;
    }
  }
  if (form.name.trim().length < 2) errors.name = 'اكتب الاسم';
  if (!GOVERNORATES.includes(form.governorate)) errors.governorate = 'اختار المحافظة';
  if (form.area.trim().length < 2) errors.area = 'اكتب المنطقة';
  if (form.address.trim().length < 5) errors.address = 'اكتب الشارع ورقم العمارة';
  if (!cart.length) errors.cart = 'السلة فاضية';
  if (Object.keys(errors).length) return { ok: false, errors };

  const previous = ordersFor(phone!, niche);
  // Wallet credit only for a signed-in customer, re-checked here (never trusted from the browser).
  const walletBalance = me ? walletOf(me.phone, niche).balance : 0;
  const q = quote(cfg, cart, { promoCode: form.promoCode || undefined, isFirstOrder: previous.length === 0, walletBalance, useWallet: Boolean(me && form.useWallet && walletBalance > 0) });
  if (q.problems.some((p) => p.startsWith('item_unavailable') || p.startsWith('bundle_unavailable'))) {
    return { ok: false, errors: { cart: 'في منتج في السلة مبقاش متاح. راجع السلة.' } };
  }
  const details = { name: form.name.trim(), governorate: form.governorate, area: form.area.trim(), address: form.address.trim(), landmark: form.landmark.trim() };
  if (!me && !accountByPhone(phone!)) createAccount(phone!, details.name, form.password);
  saveAddress(phone!, details);
  if (!me) await startSession(phone!);

  const order = saveOrder({
    niche,
    status: cfg.risk.requireWhatsappConfirm ? 'awaiting_confirm' : 'confirmed',
    type: previous.length ? 'repeat' : 'new',
    payment: form.payment,
    customer: { ...details, phone: phone! },
    cart,
    quote: q,
    promoCode: q.promoDiscount > 0 ? form.promoCode.trim().toUpperCase() : undefined,
  });
  if (q.wallet > 0) spend(phone!, niche, q.wallet, order.id);
  // With WhatsApp confirmation off, the order goes straight to the sellers.
  if (order.status === 'confirmed') await deliver(notifyOrder(order));
  return { ok: true, id: order.id };
}

async function ownOrder(niche: string, id: number) {
  const me = await currentCustomer();
  const o = getOrder(niche, id);
  return me && o && o.customer.phone === me.phone ? o : null;
}

export async function confirmOrder(niche: string, id: number) {
  if (!(await ownOrder(niche, id))) return false;
  const o = setStatus(niche, id, ['awaiting_confirm'], 'confirmed');
  if (o) await deliver(notifyOrder(o));
  return Boolean(o);
}

export async function cancelOrder(niche: string, id: number) {
  const mine = await ownOrder(niche, id);
  if (!mine) return false;
  const wasConfirmed = mine.status === 'confirmed';
  const o = setStatus(niche, id, ['awaiting_confirm', 'confirmed'], 'cancelled');
  if (o) refundSpend(o);
  if (o && wasConfirmed) await deliver(moveOrderTo(o, 'cancelled'));
  return Boolean(o);
}

// ---------- accounts ----------
export type AuthResult = { ok: true } | { ok: false; error: string; field?: 'phone' | 'password' | 'name' };

export async function signInAction(phoneRaw: string, password: string): Promise<AuthResult> {
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) return { ok: false, error: PHONE_ERR, field: 'phone' };
  const r = signIn(phone, password);
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
  if (accountByPhone(phone)) return { ok: false, error: 'الرقم ده عليه حساب. ادخل بكلمة السر.', field: 'phone' };
  createAccount(phone, name.trim(), password);
  await startSession(phone);
  return { ok: true };
}

export async function signOutAction() {
  await endSession();
}
