'use client';
// Quick add from a product card: the card's "+" opens a sheet (bottom sheet on phones, a small
// dialog on wide screens) with the same size and grind pickers as the product page, a quantity
// stepper and one add button, so customers fill the cart without leaving the page.
// MiniCart: a bar above the tab bar with the cart count, total and free-shipping progress.
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Choice, OptionAxis } from '@niche-engine/core';
import type { ArtKind, Variant } from '@/lib/types';
import { AddToCart } from './AddToCart';
import { Art } from './Art';
import { freeLeftText, useQuote, type FreeHint } from './CartView';
import { useSpeak } from './I18n';

export interface QuickItem {
  slug: string;
  id?: string;
  name: string;
  by: string;
  image?: string;
  art: ArtKind;
  color: string;
  price: number;
  variants: Variant[];
  choices: Choice[];
  notes?: string;
}

const OPEN = 'quick-add';

export function QuickAddButton({ item }: { item: QuickItem }) {
  const { t } = useSpeak();
  const soldOut = !item.variants.some((v) => v.stock > 0) && item.variants.length > 0;
  if (soldOut) return null;
  return (
    <button type="button" className="qa-btn" aria-label={t('qa.addAria', { name: item.name })} onClick={() => window.dispatchEvent(new CustomEvent<QuickItem>(OPEN, { detail: item }))}>
      <span aria-hidden="true">＋</span><b>{t('qa.add')}</b>
    </button>
  );
}

export function QuickAddSheet({ niche, axes, freeOver }: { niche: string; axes: OptionAxis[]; freeOver?: number }) {
  const s = useSpeak();
  const [item, setItem] = useState<QuickItem | null>(null);
  const [toast, setToast] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const open = (e: Event) => { opener.current = document.activeElement as HTMLElement | null; setItem((e as CustomEvent<QuickItem>).detail); };
    window.addEventListener(OPEN, open);
    return () => window.removeEventListener(OPEN, open);
  }, []);

  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', esc);
    panel.current?.focus();
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(false), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const close = () => { setItem(null); opener.current?.focus?.(); };

  return (
    <>
      {item && (
        <div className="qa-layer" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="qa-sheet" role="dialog" aria-modal="true" aria-label={item.name} tabIndex={-1} ref={panel}>
            <div className="qa-head">
              <div className="pimg"><Art kind={item.art} color={item.color} image={item.image} alt={item.name} /></div>
              <div>
                <b>{item.name}</b>
                <div className="pby">{item.by}</div>
                {item.notes && <div className="muted small">{item.notes}</div>}
              </div>
              <button type="button" className="qa-x" aria-label={s.t('qa.close')} onClick={close}>×</button>
            </div>
            <AddToCart key={item.slug} niche={niche} slug={item.slug} productId={item.id} price={item.price} variants={item.variants} finder={null} axes={axes} choices={item.choices} freeOver={freeOver}
              onAdded={() => { close(); setToast(true); }} detailsHref={s.href(`/p/${item.slug}`)} />
          </div>
        </div>
      )}
      {toast && <div className="qa-toast" role="status">{s.t('qa.added')}</div>}
    </>
  );
}

export function MiniCart({ niche, freeOver, freeHint }: { niche: string; freeOver?: number; freeHint?: FreeHint }) {
  const s = useSpeak();
  const { lines, ready, q } = useQuote(niche, '');
  const [bump, setBump] = useState(false);
  const count = q ? q.lines.reduce((n, l) => n + l.qty, 0) : lines.reduce((n, l) => n + l.qty, 0);
  const short = Boolean(q?.lines.some((l) => l.left !== undefined));
  const last = useRef(count);
  useEffect(() => {
    if (ready && count > last.current) { setBump(true); const id = setTimeout(() => setBump(false), 450); last.current = count; return () => clearTimeout(id); }
    last.current = count;
  }, [count, ready]);
  if (!ready || !count || !q) return null;
  const goods = q.subtotal - q.bundleDiscount;
  const left = freeOver ? Math.max(0, freeOver - goods) : null;
  return (
    <div className={`minicart${bump ? ' bump' : ''}`} role="region" aria-label={s.t('mini.cart', { n: count })}>
      <Link href={s.href('/cart')} className="mc-sum">
        <b>🛒 {s.t('mini.cart', { n: count })} · <span className="num">{s.egp(q.total)}</span></b>
        {short ? <small className="bad-t">{s.t('mini.fix')}</small> : left !== null && freeOver ? (
          <>
            <small className={left ? '' : 'ok-t'}>{left ? freeLeftText(s, left, freeHint) : s.t('free.got')}</small>
            <i aria-hidden="true"><em style={{ width: `${Math.min(100, (goods / freeOver) * 100)}%` }} /></i>
          </>
        ) : null}
      </Link>
      <Link href={s.href('/checkout')} className="btn primary">{s.t('continue')}</Link>
    </div>
  );
}
