'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { quoteCart } from '@/app/actions';
import type { Quote } from '@/lib/types';
import { Art, BundleArt } from './Art';
import { useCart } from './cart-store';
import { useSpeak } from './I18n';

export function Summary({ q }: { q: Quote }) {
  const { t, egp } = useSpeak();
  return (
    <div className="box">
      <div className="row"><span>{t('sum.goods')}</span><span className="num">{egp(q.subtotal)}</span></div>
      {q.bundleDiscount > 0 && <div className="row"><span>{t('sum.bundle')}</span><span className="num">− {egp(q.bundleDiscount)}</span></div>}
      {q.promoDiscount > 0 && <div className="row"><span>{t('sum.promo')}</span><span className="num">− {egp(q.promoDiscount)}</span></div>}
      {q.wallet > 0 && <div className="row"><span>{t('sum.wallet')}</span><span className="num">− {egp(q.wallet)}</span></div>}
      <div className="row"><span>{t('sum.shipping')}</span><span className="num">{q.shipping === 0 && (q.shippingWaived ?? 0) > 0 ? <b className="free">{t('sum.free')}</b> : egp(q.shipping)}</span></div>
      <div className="row total"><span>{t('sum.total')}</span><span className="num">{egp(q.total)}</span></div>
      <span className="muted">{t('sum.note')}</span>
    </div>
  );
}

export function useQuote(niche: string, promo: string, useWallet = false) {
  const [lines, setLines, ready] = useCart(niche);
  const [q, setQ] = useState<Quote | null>(null);
  const [, start] = useTransition();
  const { lang } = useSpeak();
  // Re-price when the language changes too: line titles come back in the customer's language.
  useEffect(() => {
    if (!ready) return;
    start(async () => setQ(lines.length ? await quoteCart(niche, lines, promo, useWallet) : null));
  }, [niche, lines, promo, ready, useWallet, lang]);
  return { lines, setLines, ready, q };
}

/** "Add X more for free shipping" with a progress bar, or a cheer once it is free. */
export function FreeShipBar({ goods, over }: { goods: number; over: number }) {
  const { t, egp } = useSpeak();
  const left = Math.max(0, over - goods);
  return (
    <div className={`freebar${left ? '' : ' done'}`} role="status">
      <span>{left ? t('free.left', { x: egp(Math.ceil(left)) }) : t('free.got')}</span>
      <i aria-hidden="true"><b style={{ width: `${Math.min(100, (goods / over) * 100)}%` }} /></i>
    </div>
  );
}

export function CartView({ niche, depositAbove, deposit, cashback, freeOver }: { niche: string; depositAbove: number; deposit: number; cashback: number; freeOver?: number }) {
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const { lines, setLines, ready, q } = useQuote(niche, promo);
  const s = useSpeak();
  const { t, egp } = s;

  if (!ready) return <div className="muted" aria-busy="true">{t('loading')}</div>;
  if (!lines.length) return (
    <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
      <b>{t('cartEmpty')}</b>
      <Link className="btn primary" href={s.href()}>{t('startShopping')}</Link>
    </div>
  );
  const change = (i: number, d: number) => setLines(lines.map((l, j) => (j === i ? { ...l, qty: Math.max(1, Math.min(5, l.qty + d)) } : l)));
  const remove = (i: number) => setLines(lines.filter((_, j) => j !== i));

  return (
    <>
      <div style={{ display: 'grid', gap: 8 }}>
        {(q?.lines ?? []).map((l, i) => (
          <div className="line" key={l.key}>
            <div className="pimg">{l.isBundle ? <BundleArt parts={l.parts ?? []} /> : <Art kind={l.art} color={l.color} image={l.image} />}</div>
            <div><b className="small">{l.title}</b><div className="pby">{l.by}</div></div>
            <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
              <span className="num small">{egp(l.amount)}</span>
              <div className="qty"><button type="button" aria-label={t('less')} onClick={() => change(i, -1)}>−</button><span className="num">{l.qty}</span><button type="button" aria-label={t('more')} onClick={() => change(i, 1)}>+</button></div>
              <button type="button" className="small" style={{ border: 0, background: 'none', color: 'var(--bad)' }} onClick={() => remove(i)}>{t('remove')}</button>
            </div>
          </div>
        ))}
      </div>
      {q && freeOver ? <FreeShipBar goods={q.subtotal - q.bundleDiscount} over={freeOver} /> : null}
      <form className="sbox" onSubmit={(e) => { e.preventDefault(); setPromo(promoInput); }}>
        <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder={t('promo')} aria-label={t('promo')} dir="ltr" />
        <button className="btn ghost" type="submit">{t('apply')}</button>
      </form>
      {q?.problems.includes('promo_unknown') && <div className="note bad">{t('promoUnknown')}</div>}
      {q?.promoRejected === 'first_order_only' && <div className="note warn">{t('promoFirst')}</div>}
      {q && q.promoDiscount > 0 && <div className="note ok">{t('promoOk', { x: egp(q.promoDiscount) })}</div>}
      {q && <Summary q={q} />}
      {q && cashback > 0 && <div className="note ok">{t('cashbackNote', { x: egp(Math.floor((q.subtotal - q.bundleDiscount - q.promoDiscount) * cashback)) })}</div>}
      {q?.depositRequired && <div className="note warn">{t('depositNote', { above: egp(depositAbove), x: egp(deposit) })}</div>}
      <Link className="btn primary block" href={s.href(`/checkout${promo ? `?promo=${encodeURIComponent(promo)}` : ''}`)}>{t('continue')}</Link>
    </>
  );
}
