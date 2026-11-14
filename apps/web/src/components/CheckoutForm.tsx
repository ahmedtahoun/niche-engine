'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { placeOrder, reportCartEvent, type CheckoutForm as Form } from '@/app/actions';
import { newEventId, purchaseEventId } from '@/lib/meta-ids';
import type { Quote } from '@/lib/types';
import { savedCampaign } from './Campaign';
import { track } from './Pixel';

const pixelData = (q: Quote) => ({ content_ids: [...new Set(q.items.map((i) => i.productId))], content_type: 'product_group' as const, value: q.total, num_items: q.items.reduce((a, i) => a + i.qty, 0) });
import { writeCart } from './cart-store';
import { Summary, useQuote } from './CartView';
import { useSpeak } from './I18n';

export interface Me { name: string; phone: string; governorate: string; area: string; address: string; landmark: string }

export interface WalletView { balance: number; nextExpiry: { amount: number; at: string } | null }

export function CheckoutForm({ niche, governorates, initialPromo, openBeforePay, depositAbove, deposit, eta, me, wallet }: {
  niche: string; governorates: string[]; initialPromo: string; openBeforePay: boolean; depositAbove: number; deposit: number; eta: Record<string, string>; me: Me | null; wallet: WalletView | null;
}) {
  const router = useRouter();
  const s = useSpeak();
  const { t, egp, gov, date } = s;
  const [form, setForm] = useState<Form>({ phone: me?.phone ?? '', name: me?.name ?? '', governorate: me?.governorate || governorates[0], area: me?.area ?? '', address: me?.address ?? '', landmark: me?.landmark ?? '', payment: 'cod', promoCode: initialPromo, password: '', useWallet: Boolean(wallet && wallet.balance > 0) });
  const [errors, setErrors] = useState<Record<string, string>>({});
  // The optional password stays behind a link; it opens by itself if the server asks for it (e.g. the phone has an account).
  const [showPw, setShowPw] = useState(false);
  useEffect(() => { if (errors.password) setShowPw(true); }, [errors.password]);
  const [pending, start] = useTransition();
  const { lines, ready, q } = useQuote(niche, form.promoCode, form.useWallet);
  // The governorate picked on a product page ("arrives … to") is the starting choice here, and the other way round.
  useEffect(() => {
    try { const g = localStorage.getItem('ne_gov'); if (!me?.governorate && g && governorates.includes(g)) setForm((f) => ({ ...f, governorate: g })); } catch { /* storage blocked */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { try { localStorage.setItem('ne_gov', form.governorate); } catch { /* storage blocked */ } }, [form.governorate]);
  // Meta Pixel: one InitiateCheckout per visit to this page, once the cart is priced.
  const started = useRef(false);
  useEffect(() => {
    if (!q || started.current || !q.items.length) return;
    started.current = true;
    // Value before shipping (goods after discounts), as Meta reads checkout value.
    const eid = newEventId('ic');
    track('InitiateCheckout', { ...pixelData(q), value: q.subtotal - q.bundleDiscount - q.promoDiscount }, eid);
    void reportCartEvent(niche, 'InitiateCheckout', eid, lines, form.promoCode).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  if (ready && !lines.length) return <div className="box" style={{ textAlign: 'center' }}><b>{t('cartEmpty')}</b><Link className="btn primary" href={s.href()}>{t('startShopping')}</Link></div>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const r = await placeOrder(niche, lines, { ...form, utm: savedCampaign() });
      if (r.ok) {
        // Same event id as the server's Conversions API event, so Meta counts it once.
        if (q) track('Purchase', pixelData(q), purchaseEventId(r.id));
        writeCart(niche, []);
        router.push(s.href(`/order/${r.id}`));
      } else setErrors(r.errors as Record<string, string>);
    });
  };
  const err = (k: string) => errors[k] && <span className="ferr" id={`${k}-err`}>{errors[k]}</span>;
  const inv = (k: string) => ({ 'aria-invalid': Boolean(errors[k]), 'aria-describedby': errors[k] ? `${k}-err` : undefined });

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }} noValidate>
      <div><h1 className="title">{t('co.title')}</h1><p className="muted" style={{ margin: '4px 0 0' }}>{me ? t('co.hello', { name: me.name.split(' ')[0] }) : t('co.new')}</p></div>
      <label className="field">{t('phone')}<input value={form.phone} onChange={set('phone')} readOnly={Boolean(me)} inputMode="tel" autoComplete="tel" dir="ltr" style={{ textAlign: 'start' }} placeholder="01xxxxxxxxx" {...inv('phone')} />{err('phone')}</label>
      <label className="field">{t('name')}<input value={form.name} onChange={set('name')} autoComplete="name" {...inv('name')} />{err('name')}</label>
      <div className="two">
        <label className="field">{t('governorate')}<select value={form.governorate} onChange={set('governorate')}>{governorates.map((g) => <option key={g} value={g}>{gov(g)}</option>)}</select></label>
        <label className="field">{t('area')}<input value={form.area} onChange={set('area')} {...inv('area')} />{err('area')}</label>
      </div>
      <label className="field">{t('street')}<input value={form.address} onChange={set('address')} autoComplete="street-address" {...inv('address')} />{err('address')}</label>
      <label className="field">{t('landmark')}<input value={form.landmark} onChange={set('landmark')} placeholder={t('landmarkPh')} /></label>
      {!me && !showPw && (
        <button type="button" className="linkish small" onClick={() => setShowPw(true)}>{t('co.pwLink')}</button>
      )}
      {!me && showPw && (
        <label className="field">{t('passwordOptional')}
          <input type="password" value={form.password} onChange={set('password')} autoComplete="current-password" {...inv('password')} />
          <span className="muted small">{t('co.pwHelp')}</span>
          {err('password')}
        </label>
      )}
      <div className="note info">{t('co.eta', { day: date(eta[form.governorate], true) })}</div>
      <fieldset style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 8 }}>
        <legend className="h4">{t('payment')}</legend>
        <label className="radio"><input type="radio" name="pay" checked={form.payment === 'cod'} onChange={() => setForm({ ...form, payment: 'cod' })} /><div><b>{t('cod')}</b><span className="muted">{openBeforePay ? t('codOpen') : t('codPlain')}</span></div></label>
        <label className="radio"><input type="radio" name="pay" checked={form.payment === 'instapay'} onChange={() => setForm({ ...form, payment: 'instapay' })} /><div><b>{t('instapay')}</b><span className="muted">{t('instapayText')}</span></div></label>
      </fieldset>
      {q?.depositRequired && form.payment === 'cod' && <div className="note warn">{t('co.deposit', { above: egp(depositAbove), x: egp(deposit) })}</div>}
      {wallet && wallet.balance > 0 && (
        <label className="radio" style={{ alignItems: 'center' }}>
          <input type="checkbox" checked={form.useWallet} onChange={(e) => setForm({ ...form, useWallet: e.target.checked })} />
          <div><b>{t('useWallet', { x: egp(wallet.balance) })}</b><span className="muted">{wallet.nextExpiry ? t('walletExpires', { x: egp(wallet.nextExpiry.amount), day: date(wallet.nextExpiry.at) }) : ''}{t('walletNoShip')}</span></div>
        </label>
      )}
      {q?.problems.includes('promo_unknown') && <div className="note bad">{t('promoUnknown')}</div>}
      {q?.promoRejected === 'first_order_only' && <div className="note warn">{t('promoFirst')}</div>}
      {q?.promoRejected === 'bundles_excluded' && <div className="note warn">{t('promoNoBundles')}</div>}
      {q && q.promoDiscount > 0 && <div className="note ok">{t('promoOk', { x: egp(q.promoDiscount) })}</div>}
      {q && <Summary q={q} />}
      {err('cart')}
      <p className="muted" style={{ margin: 0 }}>{t('co.privacy')}</p>
      <button className="btn primary block" type="submit" disabled={pending || !q}>{pending ? t('placing') : t('placeOrder', { x: q ? egp(q.total) : '' })}</button>
    </form>
  );
}
