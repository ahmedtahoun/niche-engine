'use client';
import Link from 'next/link';
import { useEffect, useState, useTransition } from 'react';
import { quoteCart } from '@/app/actions';
import type { Quote } from '@/lib/types';
import { Art, BundleArt } from './Art';
import { useCart } from './cart-store';

export const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;

export function Summary({ q }: { q: Quote }) {
  return (
    <div className="box">
      <div className="row"><span>المنتجات</span><span className="num">{egp(q.subtotal)}</span></div>
      {q.bundleDiscount > 0 && <div className="row"><span>خصم الباقة</span><span className="num">− {egp(q.bundleDiscount)}</span></div>}
      {q.promoDiscount > 0 && <div className="row"><span>كود الخصم</span><span className="num">− {egp(q.promoDiscount)}</span></div>}
      {q.wallet > 0 && <div className="row"><span>من المحفظة</span><span className="num">− {egp(q.wallet)}</span></div>}
      <div className="row"><span>الشحن</span><span className="num">{egp(q.shipping)}</span></div>
      <div className="row total"><span>الإجمالي</span><span className="num">{egp(q.total)}</span></div>
      <span className="muted">ده كل المطلوب. مفيش رسوم تانية عند الاستلام.</span>
    </div>
  );
}

export function useQuote(niche: string, promo: string, useWallet = false) {
  const [lines, setLines, ready] = useCart(niche);
  const [q, setQ] = useState<Quote | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    if (!ready) return;
    start(async () => setQ(lines.length ? await quoteCart(niche, lines, promo, useWallet) : null));
  }, [niche, lines, promo, ready, useWallet]);
  return { lines, setLines, ready, q };
}

export function CartView({ niche, depositAbove, deposit, cashback }: { niche: string; depositAbove: number; deposit: number; cashback: number }) {
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const { lines, setLines, ready, q } = useQuote(niche, promo);

  if (!ready) return <div className="muted" aria-busy="true">جاري التحميل…</div>;
  if (!lines.length) return (
    <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
      <b>السلة فاضية</b>
      <Link className="btn primary" href={`/${niche}`}>ابدأ تسوق</Link>
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
              <div className="qty"><button type="button" aria-label="قلل" onClick={() => change(i, -1)}>−</button><span className="num">{l.qty}</span><button type="button" aria-label="زود" onClick={() => change(i, 1)}>+</button></div>
              <button type="button" className="small" style={{ border: 0, background: 'none', color: 'var(--bad)' }} onClick={() => remove(i)}>شيل</button>
            </div>
          </div>
        ))}
      </div>
      <form className="sbox" onSubmit={(e) => { e.preventDefault(); setPromo(promoInput); }}>
        <input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="كود خصم" aria-label="كود خصم" dir="ltr" />
        <button className="btn ghost" type="submit">طبّق</button>
      </form>
      {q?.problems.includes('promo_unknown') && <div className="note bad">الكود ده مش موجود.</div>}
      {q?.promoRejected === 'first_order_only' && <div className="note warn">الكود ده لأول طلب بس.</div>}
      {q && q.promoDiscount > 0 && <div className="note ok">الكود اتطبق: وفّرت {egp(q.promoDiscount)}.</div>}
      {q && <Summary q={q} />}
      {q && cashback > 0 && <div className="note ok">هتكسب {egp(Math.floor((q.subtotal - q.bundleDiscount - q.promoDiscount) * cashback))} في محفظتك بعد ما الطلب يوصل.</div>}
      {q?.depositRequired && <div className="note warn">علشان الطلب فوق {depositAbove.toLocaleString('en-US')} ج، بنطلب مصاريف الشحن بس مقدماً ({egp(deposit)})، وبتتخصم من الإجمالي.</div>}
      <Link className="btn primary block" href={`/${niche}/checkout${promo ? `?promo=${encodeURIComponent(promo)}` : ''}`}>كمّل الطلب</Link>
    </>
  );
}
