'use server';

import { normalizeEgyptPhone } from '@niche-engine/core';
import { catalog, publicQuote } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { applyStatus, draftOrder, findDuplicate, getOrder, mutateOrder, ordersFor } from '@/lib/orders';
import { accountByPhone, createAccount, ensureCustomer, hasPassword, MIN_PASSWORD, saveAddress, signIn } from '@/lib/customers';
import { takeStock } from '@/lib/stock';
import { currentCustomer, endSession, isGuestOrder, rememberGuestOrder, startSession } from '@/lib/current-customer';
import { moveOrderTo } from '@/lib/fulfillment';
import { walletOf } from '@/lib/wallet';
import { notifyOrder } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { GOVERNORATES } from '@/lib/eta';
import { isBlocked } from '@/lib/blocklist';
import { allow, clientIp } from '@/lib/rate-limit';
import { store } from '@/lib/store';
import { getLang, speaker } from '@/lib/lang';
import type { Speaker } from '@/lib/i18n';
import type { CartLine, Quote } from '@/lib/types';

/** Orders one phone can place per day (stops a script flooding sellers). */
const MAX_ORDERS_PER_PHONE_PER_DAY = 5;

export async function quoteCart(niche: string, cart: CartLine[], promoCode: string, useWallet = false): Promise<Quote | null> {
  const cfg = getNiche(niche);
  if (!cfg || !Array.isArray(cart)) return null;
  const me = await currentCustomer();
  const [cat, wallet, previous] = await Promise.all([catalog(), me ? walletOf(me.phone, niche) : null, me ? ordersFor(me.phone, niche) : []]);
  const walletBalance = wallet?.balance ?? 0;
  return publicQuote(cat.quote(cfg, cart, { promoCode: promoCode || undefined, isFirstOrder: previous.length === 0, walletBalance, useWallet: useWallet && walletBalance > 0, lang: await getLang() }));
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

const passwordError = (s: Speaker, r: Awaited<ReturnType<typeof signIn>>) => (r === 'locked' ? s.t('err.locked') : s.t('err.wrongPw'));

export async function placeOrder(niche: string, cart: CartLine[], form: CheckoutForm): Promise<PlaceResult> {
  const cfg = getNiche(niche);
  const s = await speaker(cfg);
  if (!cfg) return { ok: false, errors: { cart: s.t('err.store') } };
  if (!allow(`order:${await clientIp()}`, 10, 10 * 60_000)) return { ok: false, errors: { cart: s.t('err.busy') } };
  const me = await currentCustomer();
  const errors: Errors = {};
  const phone = me ? me.phone : normalizeEgyptPhone(form.phone);
  let existing = false;
  if (!phone) errors.phone = s.t('err.phone');
  else if (await isBlocked(phone)) errors.phone = s.t('err.blocked');
  else if (!me && form.password) {
    // A password is optional: with one we sign in (or create the account); without one it's a guest order.
    existing = hasPassword(await accountByPhone(phone));
    if (existing) {
      const r = await signIn(phone, form.password);
      if (r !== 'ok') errors.password = passwordError(s, r);
    } else if (form.password.length < MIN_PASSWORD) {
      errors.password = s.t('err.pwShort', { n: MIN_PASSWORD });
    }
  }
  const guest = !me && !form.password;
  if (form.name.trim().length < 2) errors.name = s.t('err.name');
  if (!GOVERNORATES.includes(form.governorate)) errors.governorate = s.t('err.gov');
  if (form.area.trim().length < 2) errors.area = s.t('err.area');
  if (form.address.trim().length < 5) errors.address = s.t('err.address');
  if (!Array.isArray(cart) || !cart.length) errors.cart = s.t('err.cartEmpty');
  if (Object.keys(errors).length) return { ok: false, errors };

  const today = await store().listOrders({ phone: phone!, since: new Date(Date.now() - 864e5).toISOString(), limit: MAX_ORDERS_PER_PHONE_PER_DAY });

  const details = { name: form.name.trim().slice(0, 80), governorate: form.governorate, area: form.area.trim().slice(0, 80), address: form.address.trim().slice(0, 200), landmark: form.landmark.trim().slice(0, 120) };
  // Sent twice (double tap, network resend)? Hand back the first order instead of making a second.
  const dup = findDuplicate(today, { cart, customer: { ...details, phone: phone! } });
  if (dup) {
    if (guest) await rememberGuestOrder(dup.id);
    return { ok: true, id: dup.id };
  }
  if (today.length >= MAX_ORDERS_PER_PHONE_PER_DAY) return { ok: false, errors: { cart: s.t('err.daily') } };
  if (!me && !guest && !existing) {
    try {
      await createAccount(phone!, details.name, form.password);
    } catch {
      // Someone created this account a moment ago: ask for its password instead.
      return { ok: false, errors: { password: s.t('err.hasAccount') } };
    }
  }
  // A guest order never changes a saved account (someone could type another person's phone).
  if (!guest) await saveAddress(phone!, details);
  else await ensureCustomer(phone!, details);
  if (!me && !guest) await startSession(phone!);

  const cat = await catalog();
  // Wallet credit only for a signed-in customer, re-checked here (never trusted from the browser).
  // The order and its wallet spend are saved together; if the wallet changed meanwhile, re-price and retry.
  for (let attempt = 0; attempt < 3; attempt++) {
    const [wallet, previous] = await Promise.all([me ? walletOf(me.phone, niche) : null, ordersFor(phone!, niche)]);
    const walletBalance = wallet?.balance ?? 0;
    const q = cat.quote(cfg, cart, { promoCode: form.promoCode || undefined, isFirstOrder: previous.length === 0, walletBalance, useWallet: Boolean(me && form.useWallet && walletBalance > 0), lang: s.lang });
    if (q.problems.some((p) => p.startsWith('item_unavailable') || p.startsWith('bundle_unavailable') || p.startsWith('choice_missing') || p.startsWith('low_stock'))) {
      return { ok: false, errors: { cart: s.t('err.unavailable') } };
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
    await takeStock(order);
    if (order.status === 'confirmed') await deliver(notifyOrder(order, cat));
    if (guest) await rememberGuestOrder(order.id);
    return { ok: true, id: order.id };
  }
  return { ok: false, errors: { cart: s.t('err.wallet') } };
}

async function ownOrder(niche: string, id: number) {
  const me = await currentCustomer();
  const o = await getOrder(niche, id);
  if (!o) return null;
  return (me && o.customer.phone === me.phone) || (await isGuestOrder(o.id)) ? o : null;
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
  const s = await speaker();
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) return { ok: false, error: s.t('err.phone'), field: 'phone' };
  if (!allow(`auth:${await clientIp()}`, 20, 10 * 60_000)) return { ok: false, error: s.t('err.busy') };
  const r = await signIn(phone, password);
  if (r === 'no_account') return { ok: false, error: s.t('err.noAccount'), field: 'phone' };
  if (r !== 'ok') return { ok: false, error: passwordError(s, r), field: 'password' };
  await startSession(phone);
  return { ok: true };
}

export async function registerAction(phoneRaw: string, name: string, password: string): Promise<AuthResult> {
  const s = await speaker();
  const phone = normalizeEgyptPhone(phoneRaw);
  if (!phone) return { ok: false, error: s.t('err.phone'), field: 'phone' };
  if (name.trim().length < 2) return { ok: false, error: s.t('err.name'), field: 'name' };
  if (password.length < MIN_PASSWORD) return { ok: false, error: s.t('err.pwMin', { n: MIN_PASSWORD }), field: 'password' };
  if (!allow(`auth:${await clientIp()}`, 20, 10 * 60_000)) return { ok: false, error: s.t('err.busy') };
  try {
    await createAccount(phone, name.trim().slice(0, 80), password);
  } catch {
    return { ok: false, error: s.t('err.hasAccountSignIn'), field: 'phone' };
  }
  await startSession(phone);
  return { ok: true };
}

export async function signOutAction() {
  await endSession();
}
