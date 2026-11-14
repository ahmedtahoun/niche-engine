'use server';

import { orderAlert } from '@/bot/alerts';
import { normalizeEgyptPhone } from '@niche-engine/core';
import { catalog, publicQuote } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { applyStatus, cleanUtm, draftOrder, findDuplicate, getOrder, mutateOrder, ordersFor } from '@/lib/orders';
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
import { purchaseEventId, sendEvent, type MetaEvent } from '@/lib/meta';
import { validEventId } from '@/lib/meta-ids';
import { markDraftOrdered } from '@/lib/abandoned';
import { cleanSource, isBot, visitorId } from '@/lib/traffic';
import { speak, voiceOf } from '@/lib/i18n';
import { siteUrl } from '@/lib/site';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
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
  /** Campaign link the visitor arrived from (saved in the browser by CampaignTracker). */
  utm?: unknown;
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
      ...(cleanUtm(form.utm) ? { utm: cleanUtm(form.utm)! } : {}),
    }), q.wallet > 0 && wallet ? { amount: q.wallet, walletVersion: wallet.version } : null);
    if (order === 'wallet_conflict') continue;
    // With WhatsApp confirmation off, the order goes straight to the sellers.
    await takeStock(order);
    await deliver([...(order.status === 'confirmed' ? notifyOrder(order, cat) : []), ...orderAlert(order, 'new')]);
    if (guest) await rememberGuestOrder(order.id);
    await reportPurchase(niche, order.id, q, { phone: phone!, name: details.name, governorate: details.governorate });
    await afterOrder(niche, order.id, phone!, form.utm);
    return { ok: true, id: order.id };
  }
  return { ok: false, errors: { cart: s.t('err.wallet') } };
}

/** Funnel step for admin → Traffic, and closes the phone's abandoned-checkout draft. Never fails the order. */
async function afterOrder(niche: string, orderId: number, phone: string, utm: unknown) {
  const [h, ip] = await Promise.all([headers(), clientIp()]);
  const ua = h.get('user-agent') ?? '';
  const source = cleanSource(cleanUtm(utm)?.source);
  after(async () => {
    try {
      if (!isBot(ua)) await store().addSiteEvent({ niche, kind: 'order', path: '/checkout', visitor: visitorId(ip, ua, process.env.SESSION_SECRET ?? ''), source, device: /Mobi|Android|iPhone/i.test(ua) ? 'mobile' : 'desktop', lang: (await getLang()) === 'en' ? 'en' : 'ar' });
      await markDraftOrdered(niche, phone, orderId);
    } catch { /* migration 0006 not run yet */ }
  });
}

/**
 * Checkout draft: saved once a valid phone is typed, so the team can remind someone who leaves
 * without ordering (admin → Carts). Prices come from the catalog; blocked phones are ignored.
 */
export async function saveCheckoutDraft(niche: string, cart: CartLine[], f: { phone: string; name: string; governorate: string; promoCode?: string }): Promise<void> {
  const cfg = getNiche(niche);
  const me = await currentCustomer();
  const phone = me?.phone ?? normalizeEgyptPhone(String(f.phone ?? ''));
  if (!cfg || !phone || !Array.isArray(cart) || !cart.length) return;
  if (!allow(`draft:${await clientIp()}`, 30, 10 * 60_000) || (await isBlocked(phone))) return;
  const q = (await catalog()).quote(cfg, cart.slice(0, 20), { promoCode: f.promoCode || undefined, isFirstOrder: false, walletBalance: 0, useWallet: false });
  if (!q.items.length) return;
  const lines = cart.slice(0, 20).filter((_, i) => q.lines.some((l) => Number(l.key) === i));
  try {
    await store().saveDraft({ niche, phone, name: String(f.name ?? '').trim().slice(0, 80), governorate: GOVERNORATES.includes(f.governorate) ? f.governorate : '', cart: lines, total: q.total, lang: (await getLang()) === 'en' ? 'en' : 'ar' });
  } catch { /* migration 0006 not run yet */ }
}

/** Request details Meta uses to match an event to an ad click (Meta's own cookies, IP, browser). */
async function metaContext(cfg: NonNullable<ReturnType<typeof getNiche>>, path: string) {
  const [h, jar, ip] = await Promise.all([headers(), cookies(), clientIp()]);
  return { url: siteUrl(cfg, path), ip, userAgent: h.get('user-agent') ?? undefined, fbp: jar.get('_fbp')?.value, fbc: jar.get('_fbc')?.value };
}

/** Meta Conversions API: the purchase, sent after the reply so the customer never waits for Meta. */
async function reportPurchase(niche: string, orderId: number, q: Quote, customer: { phone: string; name: string; governorate: string }) {
  const cfg = getNiche(niche);
  if (!cfg) return;
  const event: MetaEvent = {
    name: 'Purchase', eventId: purchaseEventId(orderId), orderId, value: q.total, productIds: q.items.map((i) => i.productId), numItems: q.items.reduce((a, i) => a + i.qty, 0),
    customer: { phone: customer.phone, firstName: customer.name, city: speak('en', voiceOf(cfg)).gov(customer.governorate) },
    ...(await metaContext(cfg, '/checkout')),
  };
  after(() => sendEvent(niche, cfg.brand.metaPixelId, event));
}

/**
 * The server copy of a browser AddToCart / InitiateCheckout (same event id). Prices come from the
 * catalog, never from the browser. A signed-in customer's phone, name and governorate go hashed.
 */
export async function reportCartEvent(niche: string, kind: 'AddToCart' | 'InitiateCheckout', eventId: string, cart: CartLine[], promoCode = ''): Promise<void> {
  const cfg = getNiche(niche);
  if (!cfg || !validEventId(eventId) || !Array.isArray(cart) || !cart.length) return;
  if (!allow(`meta:${await clientIp()}`, 60, 10 * 60_000)) return;
  const me = await currentCustomer();
  const q = (await catalog()).quote(cfg, cart.slice(0, 20), { promoCode: promoCode || undefined, isFirstOrder: false, walletBalance: 0, useWallet: false });
  if (!q.items.length) return;
  const event: MetaEvent = {
    name: kind, eventId, value: q.subtotal - q.bundleDiscount - q.promoDiscount, productIds: q.items.map((i) => i.productId), numItems: q.items.reduce((a, i) => a + i.qty, 0),
    ...(me ? { customer: { phone: me.phone, firstName: me.name, city: me.governorate ? speak('en', voiceOf(cfg)).gov(me.governorate) : undefined } } : {}),
    ...(await metaContext(cfg, kind === 'AddToCart' ? '/' : '/checkout')),
  };
  after(() => sendEvent(niche, cfg.brand.metaPixelId, event));
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
