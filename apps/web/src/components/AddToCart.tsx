'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Variant } from '@/lib/types';
import { addLine } from './cart-store';

const HEIGHTS: [string, number][] = [['150–155', 1], ['156–162', 2], ['163–168', 3], ['169+', 4]];
const WEIGHTS: [string, number][] = [['أقل من 65', 0], ['65–85', 0], ['فوق 85', 1]];
const BREWS: [string, string][] = [['اسبريسو', 'مطحون اسبريسو'], ['فلتر / V60', 'مطحون فلتر'], ['كنكة', 'مطحون تركي'], ['عندي مطحنة', 'حبوب']];

function SizeFinder({ variants, onPick }: { variants: Variant[]; onPick: (v: string) => void }) {
  const [h, setH] = useState<number | null>(null);
  const [w, setW] = useState<number | null>(null);
  const rec = h !== null && w !== null ? String(Math.min(4, HEIGHTS[h][1] + WEIGHTS[w][1])) : null;
  const available = rec && variants.some((v) => v.label === rec && v.stock > 0);
  return (
    <div className="finder">
      <b>اعرفي مقاسك في 10 ثواني</b>
      <span className="muted">طولك كام؟</span>
      <div className="sizes">{HEIGHTS.map(([l], i) => <button key={l} type="button" className="sz" aria-pressed={h === i} onClick={() => { setH(i); if (w !== null) onPick(String(Math.min(4, HEIGHTS[i][1] + WEIGHTS[w][1]))); }}>{l}<small>سم</small></button>)}</div>
      <span className="muted">وزنك تقريباً؟</span>
      <div className="sizes">{WEIGHTS.map(([l], i) => <button key={l} type="button" className="sz" aria-pressed={w === i} onClick={() => { setW(i); if (h !== null) onPick(String(Math.min(4, HEIGHTS[h][1] + WEIGHTS[i][1]))); }}>{l}<small>كجم</small></button>)}</div>
      {rec && <div className={`note ${available ? 'ok' : 'warn'}`}>{available ? <>مقاسك غالباً <b>{rec}</b>. اخترناهولك تحت، ولو طلع مش مظبوط الاستبدال مجاني.</> : <>مقاسك غالباً <b>{rec}</b>، بس خلص للأسف. جربي لون أو موديل تاني.</>}</div>}
    </div>
  );
}

function GrindFinder({ variants, onPick }: { variants: Variant[]; onPick: (v: string) => void }) {
  const [b, setB] = useState<number | null>(null);
  return (
    <div className="finder">
      <b>اختار الطحنة المناسبة</b>
      <span className="muted">بتحضر القهوة إزاي؟</span>
      <div className="chips" style={{ flexWrap: 'wrap' }}>
        {BREWS.filter(([, g]) => variants.some((v) => v.label === g)).map(([l, g], i) => (
          <button key={l} type="button" className="chip" aria-pressed={b === i} onClick={() => { setB(i); onPick(g); }}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function AddToCart({ niche, slug, price, variants, finder }: { niche: string; slug: string; price: number; variants: Variant[]; finder: 'size' | 'grind' | null }) {
  const router = useRouter();
  // Products with colors: pick a color, then a size (when there are sizes).
  const colors = [...new Set(variants.map((v) => v.color).filter((c): c is string => Boolean(c)))];
  const sizes = [...new Set(variants.map((v) => v.size).filter((x): x is string => Boolean(x)))];
  const twoStep = colors.length > 0;
  const inStock = (c?: string, sz?: string) => variants.some((v) => (!c || v.color === c) && (!sz || v.size === sz) && v.stock > 0);
  const first = (list: string[], ok: (x: string) => boolean) => (list.filter(ok).length === 1 ? list.find(ok)! : null);
  const [color, setColor] = useState<string | null>(() => first(colors, (c) => inStock(c)));
  const [size, setSize] = useState<string | null>(() => (sizes.length ? first(sizes, (x) => inStock(undefined, x)) : null));
  const [plain, setPlain] = useState<string | null>(variants.length === 1 ? variants[0].label : null);
  const chosen = twoStep ? variants.find((v) => v.color === color && (!sizes.length || v.size === size)) : variants.find((v) => v.label === plain);
  const variant = chosen && chosen.stock > 0 ? chosen.label : null;
  const [added, setAdded] = useState(false);
  const pick = (sz: string) => { if (twoStep) setSize(sz); else if (variants.some((x) => x.label === sz && x.stock > 0)) setPlain(sz); };
  const add = (go: boolean) => {
    if (!variant) return;
    addLine(niche, { kind: 'item', slug, variant, qty: 1 });
    if (go) router.push(`/${niche}/checkout`);
    else setAdded(true);
  };
  const left = (v?: Variant) => (!v || !v.stock ? 'خلص' : v.stock <= 3 ? `فاضل ${v.stock}` : 'متاح');
  const missing = twoStep ? (!color ? 'اختاري اللون الأول' : sizes.length && !size ? 'اختاري المقاس' : 'المقاس ده خلص في اللون ده') : 'اختاري الأول';
  return (
    <>
      {finder === 'size' && <SizeFinder variants={twoStep ? sizes.map((x) => ({ label: x, stock: inStock(color ?? undefined, x) ? 1 : 0 })) : variants} onPick={pick} />}
      {finder === 'grind' && <GrindFinder variants={variants} onPick={pick} />}
      <section id="sec-sizes" style={{ display: 'grid', gap: 12 }}>
        {twoStep ? (
          <>
            <div style={{ display: 'grid', gap: 8 }}>
              <h2 className="h4">اللون{color ? <span className="muted" style={{ fontWeight: 400 }}> · {color}</span> : null}</h2>
              <div className="sizes">
                {colors.map((c) => (
                  <button key={c} type="button" className="sz" aria-pressed={color === c} disabled={!inStock(c)} onClick={() => setColor(c)}>
                    {c}<small>{inStock(c) ? 'متاح' : 'خلص'}</small>
                  </button>
                ))}
              </div>
            </div>
            {sizes.length > 0 && (
              <div style={{ display: 'grid', gap: 8 }}>
                <h2 className="h4">المقاس</h2>
                <div className="sizes">
                  {sizes.map((x) => {
                    const v = variants.find((y) => y.size === x && (!color || y.color === color));
                    const ok = color ? Boolean(v && v.stock > 0) : inStock(undefined, x);
                    return (
                      <button key={x} type="button" className="sz" aria-pressed={size === x} disabled={!ok} onClick={() => setSize(x)}>
                        {x}<small>{color ? left(v) : ok ? 'متاح' : 'خلص'}</small>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <h2 className="h4">{variants.length === 1 ? 'المتاح' : 'اختاري'}</h2>
            <div className="sizes">
              {variants.map((v) => (
                <button key={v.label} type="button" className="sz" aria-pressed={plain === v.label} disabled={!v.stock} onClick={() => setPlain(v.label)}>
                  {v.label}<small>{left(v)}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
      <div className="sticky">
        {added && <div className="note ok" role="status">اتضاف للسلة. <a href={`/${niche}/cart`} style={{ fontWeight: 700 }}>افتح السلة</a></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn ghost" disabled={!variant} onClick={() => add(false)}>للسلة</button>
          <button type="button" className="btn primary" style={{ flex: 1 }} disabled={!variant} onClick={() => add(true)}>
            {variant ? `اطلب دلوقتي · ${Math.round(price).toLocaleString('en-US')} ج` : missing}
          </button>
        </div>
        <span className="muted" style={{ textAlign: 'center' }}>كاش عند الاستلام · استبدال مجاني خلال 14 يوم</span>
      </div>
    </>
  );
}

export function AddBundle({ niche, id, variants, label }: { niche: string; id: string; variants: Variant[] | null; label: string }) {
  const router = useRouter();
  const [variant, setVariant] = useState<string>(variants ? '' : '-');
  return (
    <>
      {variants && (
        <section>
          <h2 className="h4">{label}</h2>
          <div className="sizes">
            {variants.map((v) => <button key={v.label} type="button" className="sz" aria-pressed={variant === v.label} disabled={!v.stock} onClick={() => setVariant(v.label)}>{v.label}</button>)}
          </div>
        </section>
      )}
      <div className="sticky">
        <button type="button" className="btn primary block" disabled={!variant} onClick={() => { addLine(niche, { kind: 'bundle', id, variant: variant === '-' ? '' : variant, qty: 1 }); router.push(`/${niche}/cart`); }}>
          {variant ? 'ضيفه للسلة' : `اختار ${label} الأول`}
        </button>
      </div>
    </>
  );
}
