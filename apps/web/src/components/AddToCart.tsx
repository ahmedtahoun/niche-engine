'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Choice, OptionAxis } from '@niche-engine/core';
import type { Variant } from '@/lib/types';
import { gramsOf } from '@/lib/weights';
import { addLine } from './cart-store';
import { useSpeak } from './I18n';

const HEIGHTS: [string, number][] = [['150–155', 1], ['156–162', 2], ['163–168', 3], ['169+', 4]];
const WEIGHTS: [string, number][] = [['< 65', 0], ['65–85', 0], ['85+', 1]];

function SizeFinder({ variants, onPick }: { variants: Variant[]; onPick: (v: string) => void }) {
  const [h, setH] = useState<number | null>(null);
  const [w, setW] = useState<number | null>(null);
  const rec = h !== null && w !== null ? String(Math.min(4, HEIGHTS[h][1] + WEIGHTS[w][1])) : null;
  const available = rec && variants.some((v) => v.label === rec && v.stock > 0);
  const t = useSpeak().t;
  return (
    <div className="finder">
      <b>{t('sizeFinder')}</b>
      <span className="muted">{t('height')}</span>
      <div className="sizes">{HEIGHTS.map(([l], i) => <button key={l} type="button" className="sz" aria-pressed={h === i} onClick={() => { setH(i); if (w !== null) onPick(String(Math.min(4, HEIGHTS[i][1] + WEIGHTS[w][1]))); }}>{l}<small>{t('cm')}</small></button>)}</div>
      <span className="muted">{t('weight')}</span>
      <div className="sizes">{WEIGHTS.map(([l], i) => <button key={l} type="button" className="sz" aria-pressed={w === i} onClick={() => { setW(i); if (h !== null) onPick(String(Math.min(4, HEIGHTS[h][1] + WEIGHTS[i][1]))); }}>{l}<small>{t('kg')}</small></button>)}</div>
      {rec && <div className={`note ${available ? 'ok' : 'warn'}`}>{available ? t('sizeRec', { s: rec }) : t('sizeRecGone', { s: rec })}</div>}
    </div>
  );
}

const remembered = (niche: string, id: string) => { try { return localStorage.getItem(`choice:${niche}:${id}`); } catch { return null; } };
const remember = (niche: string, id: string, v: string) => { try { localStorage.setItem(`choice:${niche}:${id}`, v); } catch { /* storage blocked */ } };

/** Per-order choices (e.g. "how do you make your coffee?" → grind). The last answer is remembered. */
function ChoicePicker({ niche, choices, picked, setPicked }: { niche: string; choices: Choice[]; picked: Record<string, string>; setPicked: (p: Record<string, string>) => void }) {
  const s = useSpeak();
  useEffect(() => {
    const init: Record<string, string> = {};
    for (const c of choices) { const r = remembered(niche, c.id); if (r && c.values.some((v) => v.id === r)) init[c.id] = r; }
    if (Object.keys(init).length) setPicked({ ...init });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niche]);
  // A choice with one value on offer (e.g. whole beans only) is picked for the customer and shown as a note.
  const single = choices.filter((c) => c.values.length === 1);
  useEffect(() => {
    if (single.some((c) => picked[c.id] !== c.values[0].id)) setPicked({ ...picked, ...Object.fromEntries(single.map((c) => [c.id, c.values[0].id])) });
  });
  return (
    <>
      {single.map((c) => {
        const v = c.values[0];
        return (
          <div key={c.id} className="choice-one">
            <b>{v.emoji ? `${v.emoji} ` : ''}{s.choiceValue(v)}</b>
            {s.hint(v) && <span className="muted small">{s.hint(v)}</span>}
          </div>
        );
      })}
      {choices.filter((c) => c.values.length > 1).map((c) => {
        const cur = c.values.find((v) => v.id === picked[c.id]);
        return (
          <div key={c.id} style={{ display: 'grid', gap: 8 }}>
            <h2 className="h4">{s.choice(c)}</h2>
            <div className="sizes">
              {c.values.map((v) => (
                <button key={v.id} type="button" className="sz" aria-pressed={picked[c.id] === v.id} onClick={() => { remember(niche, c.id, v.id); setPicked({ ...picked, [c.id]: v.id }); }}>{s.choiceValue(v)}</button>
              ))}
            </div>
            {cur && s.hint(cur) && <span className="muted small">{s.hint(cur)}</span>}
          </div>
        );
      })}
    </>
  );
}

/** Variants described by the niche's option axes (e.g. roast → weight). Sold-out combinations are disabled. */
function useAxes(variants: Variant[], axes: OptionAxis[]) {
  const values = (id: string) => [...new Set(variants.map((v) => v.opts?.[id]).filter((x): x is string => Boolean(x)))];
  const fits = (v: Variant, sel: Record<string, string>, skip?: string) => axes.every((a) => a.id === skip || !sel[a.id] || v.opts?.[a.id] === sel[a.id]);
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const a of axes) { const ok = values(a.id).filter((x) => variants.some((v) => v.opts?.[a.id] === x && v.stock > 0)); if (ok.length === 1 || (a.preselect && ok.length)) out[a.id] = ok[0]; }
    return out;
  });
  const chosen = variants.find((v) => axes.every((a) => v.opts?.[a.id] === sel[a.id])) ?? null;
  const ok = (id: string, x: string) => variants.some((v) => v.opts?.[id] === x && v.stock > 0 && fits(v, sel, id));
  const missing = axes.find((a) => !sel[a.id]);
  return { values, sel, setSel, chosen, ok, missing };
}

export function AddToCart({ niche, slug, price, variants, finder, axes = [], choices = [], freeOver, onAdded, detailsHref }: { niche: string; slug: string; price: number; variants: Variant[]; finder: 'size' | null; axes?: OptionAxis[]; choices?: Choice[]; freeOver?: number; /** Quick-add sheet: a quantity stepper and one add button; called after adding. */ onAdded?: () => void; detailsHref?: string }) {
  const router = useRouter();
  const s = useSpeak();
  const t = s.t;
  const axisValue = (a: OptionAxis, x: string) => (s.en && a.valuesEn?.[x]) || x;
  const label = (v: Variant) => (s.en && v.labelEn) || v.label;
  const generic = axes.length > 0 && variants.some((v) => v.opts);
  const ax = useAxes(generic ? variants : [], generic ? axes : []);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const choiceMissing = choices.find((c) => !picked[c.id]);
  // Products with colors: pick a color, then a size (when there are sizes).
  const colors = [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))];
  const sizes = [...new Set(variants.map((v) => v.size).filter((x): x is string => Boolean(x)))];
  const twoStep = colors.length > 0;
  const inStock = (c?: string, sz?: string) => variants.some((v) => (!c || v.color === c) && (!sz || v.size === sz) && v.stock > 0);
  const first = (list: string[], ok: (x: string) => boolean) => (list.filter(ok).length === 1 ? list.find(ok)! : null);
  const [color, setColor] = useState<string | null>(() => first(colors, (c) => inStock(c)));
  const [size, setSize] = useState<string | null>(() => (sizes.length ? first(sizes, (x) => inStock(undefined, x)) : null));
  const [plain, setPlain] = useState<string | null>(variants.length === 1 ? variants[0].label : null);
  const chosen = generic ? ax.chosen : twoStep ? variants.find((v) => v.color === color && (!sizes.length || v.size === size)) : variants.find((v) => v.label === plain);
  const variant = chosen && chosen.stock > 0 && !choiceMissing ? chosen.label : null;
  const shown = chosen?.price ?? price;
  const [added, setAdded] = useState(false);
  const pick = (sz: string) => { if (twoStep) setSize(sz); else if (variants.some((x) => x.label === sz && x.stock > 0)) setPlain(sz); };
  const [qty, setQty] = useState(1);
  const add = (go: boolean) => {
    if (!variant) return;
    addLine(niche, { kind: 'item', slug, variant, qty: onAdded ? qty : 1, ...(choices.length ? { choice: Object.fromEntries(choices.map((c) => [c.id, picked[c.id]])) } : {}) });
    if (onAdded) onAdded();
    else if (go) router.push(s.href(`/checkout`));
    else setAdded(true);
  };
  const left = (v?: Variant) => (!v || !v.stock ? t('soldOut') : v.stock <= 3 ? t('left', { n: v.stock }) : t('available'));
  const missing = generic
    ? (ax.missing ? t('pickX', { x: s.en ? s.axis(ax.missing).toLowerCase() : s.axis(ax.missing) }) : !chosen || !chosen.stock ? t('comboGone') : choiceMissing ? s.choice(choiceMissing) : '')
    : choiceMissing && chosen?.stock ? s.choice(choiceMissing)
    : twoStep ? (!color ? t('pickColorFirst') : sizes.length && !size ? t('pickSize') : t('sizeGoneInColor')) : t('pickFirst');
  return (
    <>
      {finder === 'size' && <SizeFinder variants={twoStep ? sizes.map((x) => ({ label: x, stock: inStock(color ?? undefined, x) ? 1 : 0 })) : variants} onPick={pick} />}
      <section id="sec-sizes" style={{ display: 'grid', gap: 12 }}>
        {generic ? (
          axes.map((a) => (
            <div key={a.id} style={{ display: 'grid', gap: 8 }}>
              <h2 className="h4">{s.axis(a)}</h2>
              <div className="sizes">
                {ax.values(a.id).map((x) => {
                  const v = variants.find((y) => y.opts?.[a.id] === x && axes.every((b) => b.id === a.id || y.opts?.[b.id] === ax.sel[b.id]));
                  return (
                    <button key={x} type="button" className="sz" aria-pressed={ax.sel[a.id] === x} disabled={!ax.ok(a.id, x)} onClick={() => ax.setSel({ ...ax.sel, [a.id]: x })}>
                      {axisValue(a, x)}<small>{!ax.ok(a.id, x) ? t('soldOut') : v?.price ? <>{s.egp(v.price)}{v.compareAt && v.compareAt > v.price ? <s className="was">{s.egp(v.compareAt)}</s> : null}</> : t('available')}</small>
                    </button>
                  );
                })}
              </div>
              {(() => {
                // Bigger-size nudge: how much the big bag saves against the same weight in small bags.
                const sized = ax.values(a.id).map((x) => ({ x, g: gramsOf(x), v: variants.find((y) => y.opts?.[a.id] === x && y.stock > 0 && axes.every((b) => b.id === a.id || y.opts?.[b.id] === ax.sel[b.id])) }))
                  .filter((e): e is { x: string; g: number; v: Variant } => e.g !== null && Boolean(e.v?.price));
                if (sized.length < 2) return null;
                const small = sized.reduce((m, e) => (e.g < m.g ? e : m)), big = sized.reduce((m, e) => (e.g > m.g ? e : m));
                if (ax.sel[a.id] === big.x) return null;
                const n = big.g / small.g, save = Math.round(small.v.price! * n - big.v.price!);
                const text = Number.isInteger(n) && save > 0 ? t('bigSaves', { big: axisValue(a, big.x), x: s.egp(save), n, small: axisValue(a, small.x) })
                  : freeOver && big.v.price! >= freeOver ? t('bigFree', { big: axisValue(a, big.x) }) : null;
                return text ? <button type="button" className="nudge" onClick={() => ax.setSel({ ...ax.sel, [a.id]: big.x })}>{text}{freeOver && big.v.price! >= freeOver && save > 0 && Number.isInteger(n) ? ` · 🚚` : ''}</button> : null;
              })()}
            </div>
          ))
        ) : twoStep ? (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <h2 className="h4">{t('color')}{color ? <span className="muted" style={{ fontWeight: 400 }}> · {color}</span> : null}</h2>
              <div className="sizes">
                {colors.map((c) => (
                  <button key={c} type="button" className="sz" aria-pressed={color === c} disabled={!inStock(c)} onClick={() => setColor(c)}>
                    {c}<small>{inStock(c) ? t('available') : t('soldOut')}</small>
                  </button>
                ))}
              </div>
            </div>
            {sizes.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <h2 className="h4">{t('size')}</h2>
                <div className="sizes">
                  {sizes.map((x) => {
                    const v = variants.find((y) => y.size === x && (!color || y.color === color));
                    const ok = color ? Boolean(v && v.stock > 0) : inStock(undefined, x);
                    return (
                      <button key={x} type="button" className="sz" aria-pressed={size === x} disabled={!ok} onClick={() => setSize(x)}>
                        {x}<small>{color ? left(v) : ok ? t('available') : t('soldOut')}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="h4">{variants.length === 1 ? t('availableOne') : t('pick')}</h2>
            <div className="sizes">
              {variants.map((v) => (
                <button key={v.label} type="button" className="sz" aria-pressed={plain === v.label} disabled={!v.stock} onClick={() => setPlain(v.label)}>
                  {label(v)}<small>{left(v)}</small>
                </button>
              ))}
            </div>
          </>
        )}
        {choices.length > 0 && <ChoicePicker niche={niche} choices={choices} picked={picked} setPicked={setPicked} />}
      </section>
      {onAdded ? (
        <div className="qa-actions">
          <div className="qty big" aria-label={t('qty')}>
            <button type="button" aria-label={t('less')} disabled={qty <= 1} onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
            <span className="num">{qty}</span>
            <button type="button" aria-label={t('more')} disabled={qty >= 5} onClick={() => setQty(Math.min(5, qty + 1))}>+</button>
          </div>
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={!variant} onClick={() => add(false)}>
            {variant ? t('qa.addTo', { price: s.egp(shown * qty) }) : missing}
          </button>
          {detailsHref && <a className="qa-more small" href={detailsHref}>{t('qa.details')}</a>}
        </div>
      ) : (
      <div className="sticky">
        {added && <div className="note ok" role="status">{t('added')} <a href={s.href(`/cart`)} style={{ fontWeight: 700 }}>{t('openCart')}</a></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost" disabled={!variant} onClick={() => add(false)}>{t('toCart')}</button>
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={!variant} onClick={() => add(true)}>
            {variant ? t('buyNow', { price: s.egp(shown) }) : missing}
          </button>
        </div>
        <span className="muted" style={{ textAlign: 'center' }}>{t('stickyNote')}</span>
      </div>
      )}
    </>
  );
}

export function AddBundle({ niche, id, variants, label, choices = [] }: { niche: string; id: string; variants: Variant[] | null; label: string; choices?: Choice[] }) {
  const router = useRouter();
  const s = useSpeak();
  const [variant, setVariant] = useState<string>(variants ? '' : '-');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const choiceMissing = choices.find((c) => !picked[c.id]);
  return (
    <>
      {variants && (
        <section>
          <h2 className="h4">{label}</h2>
          <div className="sizes">
            {variants.map((v) => <button key={v.label} type="button" className="sz" aria-pressed={variant === v.label} disabled={!v.stock} onClick={() => setVariant(v.label)}>{(s.en && v.labelEn) || v.label}</button>)}
          </div>
        </section>
      )}
      {choices.length > 0 && <section style={{ display: 'grid', gap: 12 }}><ChoicePicker niche={niche} choices={choices} picked={picked} setPicked={setPicked} /></section>}
      <div className="sticky">
        <button type="button" className="btn primary block" disabled={!variant || Boolean(choiceMissing)} onClick={() => { addLine(niche, { kind: 'bundle', id, variant: variant === '-' ? '' : variant, qty: 1, ...(choices.length ? { choice: Object.fromEntries(choices.map((c) => [c.id, picked[c.id]])) } : {}) }); router.push(s.href(`/cart`)); }}>
          {!variant ? s.t('pickX', { x: label }) : choiceMissing ? s.choice(choiceMissing) : s.t('addBundle')}
        </button>
      </div>
    </>
  );
}
