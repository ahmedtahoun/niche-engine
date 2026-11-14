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
  const [priced, setPriced] = useState<{ q: Quote; of: string } | null>(null);
  const [removed, setRemoved] = useState(0);
  const [, start] = useTransition();
  const { lang } = useSpeak();
  const key = JSON.stringify(lines);
  // Re-price when the language changes too: line titles come back in the customer's language.
  useEffect(() => {
    if (!ready) return;
    start(async () => { const r = lines.length ? await quoteCart(niche, lines, promo, useWallet) : null; setPriced(r ? { q: r, of: key } : null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche, key, promo, ready, useWallet, lang]);
  // A line the store no longer sells (removed coffee or size) leaves the cart, with a note.
  useEffect(() => {
    if (!priced || priced.of !== key) return;
    const keep = new Set(priced.q.lines.map((l) => Number(l.key)));
    const gone = lines.slice(0, 20).filter((_, i) => !keep.has(i)).length;
    if (gone) { setRemoved((n) => n + gone); setLines(lines.filter((_, i) => keep.has(i) || i >= 20)); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priced, key]);
  return { lines, setLines, ready, q: priced?.of === key ? priced.q : priced?.q ?? null, removed };
}

/**
 * On every page: prices the saved cart once, which drops lines that can no longer be sold (product
 * removed, size gone). So the cart badge always equals what the cart page shows, also after a reload.
 */
export function CartSync({ niche }: { niche: string }) {
  useQuote(niche, '');
  return null;
}

/** "Add X more for free shipping" with a progress bar, or a cheer once it is free. */
export type FreeHint = { unitEgp: number; ar: string; en: string };

/** "Add EGP 300 more (about 1 more bag) for free shipping 🚚": the hint only when the gap fits in one unit. */
export function freeLeftText(sp: { t: ReturnType<typeof useSpeak>['t']; egp: (n: number) => string; en: boolean }, left: number, hint?: FreeHint) {
  const x = sp.egp(Math.ceil(left));
  return hint && left <= hint.unitEgp ? sp.t('free.leftHint', { x, hint: sp.en ? hint.en : hint.ar }) : sp.t('free.left', { x });
}

export function FreeShipBar({ goods, over, hint }: { goods: number; over: number; hint?: FreeHint }) {
  const s = useSpeak();
  const left = Math.max(0, over - goods);
  return (
    <div className={`freebar${left ? '' : ' done'}`} role="status">
      <span>{left ? freeLeftText(s, left, hint) : s.t('free.got')}</span>
      <i aria-hidden="true"><b style={{ width: `${Math.min(100, (goods / over) * 100)}%` }} /></i>
    </div>
  );
}

export function CartView({ niche, depositAbove, deposit, cashback, freeOver, freeHint, initialPromo = '' }: { niche: string; depositAbove: number; deposit: number; cashback: number; freeOver?: number; freeHint?: FreeHint; initialPromo?: string }) {
  const [promoInput, setPromoInput] = useState(initialPromo);
  const [promo, setPromo] = useState(initialPromo);
  const { lines, setLines, ready, q, removed } = useQuote(niche, promo);
  const s = useSpeak();
  const { t, egp } = s;

  if (!ready) return <div className="muted" aria-busy="true">{t('loading')}</div>;
  if (!lines.length) return (
    <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
      <b>{t('cartEmpty')}</b>
      <Link className="btn primary" href={s.href()}>{t('startShopping')}</Link>
    </div>
  );
  // Priced lines carry the cart index as their key (unavailable lines are skipped in the quote).
  const change = (key: string, d: number) => setLines(lines.map((l, j) => (j === Number(key) ? { ...l, qty: Math.max(1, Math.min(5, l.qty + d)) } : l)));
  const remove = (key: string) => setLines(lines.filter((_, j) => j !== Number(key)));

  return (
    <>
      <div style={{ display: 'grid', gap: 8 }}>
        {removed > 0 && <div className="note warn" role="status">{t('cart.removed')}</div>}
        {(q?.lines ?? []).map((l) => (
          <div className={`line${l.left !== undefined ? ' short' : ''}`} key={l.key}>
            <div className="pimg">{l.isBundle && !l.image ? <BundleArt parts={l.parts ?? []} /> : <Art kind={l.art} color={l.color} image={l.image} alt={l.title} />}</div>
            <div><b className="small">{l.title}</b><div className="pby">{l.by}</div>{l.left !== undefined && <div className="small bad-line">{l.left ? t('cart.left', { n: l.left }) : t('cart.gone')}</div>}</div>
            <div style={{ display: 'grid', gap: 4, justifyItems: 'end' }}>
              <span className="num small">{egp(l.amount)}</span>
              <div className="qty"><button type="button" aria-label={t('less')} onClick={() => change(l.key, -1)}>−</button><span className="num">{l.qty}</span><button type="button" aria-label={t('more')} onClick={() => change(l.key, 1)}>+</button></div>
              <button type="button" className="small" style={{ border: 0, background: 'none', color: 'var(--bad)' }} onClick={() => remove(l.key)}>{t('remove')}</button>
            </div>
          </div>
        ))}
      </div>
      {q && freeOver ? <FreeShipBar goods={q.subtotal - q.bundleDiscount} over={freeOver} hint={freeHint} /> : null}
      <form className="sbox" onSubmit={(e) => { e.preventDefault(); setPromo(promoInput); }}>
        <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder={t('promo')} aria-label={t('promo')} dir="ltr" />
        <button className="btn ghost" type="submit">{t('apply')}</button>
      </form>
      {q?.problems.includes('promo_unknown') && <div className="note bad">{t('promoUnknown')}</div>}
      {q?.promoRejected === 'first_order_only' && <div className="note warn">{t('promoFirst')}</div>}
      {q?.promoRejected === 'bundles_excluded' && <div className="note warn">{t('promoNoBundles')}</div>}
      {q && q.promoDiscount > 0 && <div className="note ok">{t('promoOk', { x: egp(q.promoDiscount) })}</div>}
      {q && <Summary q={q} />}
      {q && cashback > 0 && <div className="note ok">{t('cashbackNote', { x: egp(Math.floor((q.subtotal - q.bundleDiscount - q.promoDiscount) * cashback)) })}</div>}
      {q?.depositRequired && <div className="note warn">{t('depositNote', { above: egp(depositAbove), x: egp(deposit) })}</div>}
      {q?.lines.some((l) => l.left !== undefined)
        ? <button type="button" className="btn primary block" disabled>{t('mini.fix')}</button>
        : <Link className="btn primary block" href={s.href(`/checkout${promo ? `?promo=${encodeURIComponent(promo)}` : ''}`)}>{t('continue')}</Link>}
    </>
  );
}
