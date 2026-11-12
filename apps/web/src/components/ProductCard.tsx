import Link from 'next/link';
import { choicesFor, isSoldOut, priceRange, saleOf } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { etaDate } from '@/lib/eta';
import type { Speaker } from '@/lib/i18n';
import type { Product, Seller } from '@/lib/types';
import { Art } from './Art';
import { QuickAddButton } from './QuickAdd';
import { Notes } from './Taste';

/** tags: words the home page filter matches (taste family, category). quick: show the "+ Add" button (needs QuickAddSheet on the page). */
export function ProductCard({ p, seller: sl, s, tags, quick }: { p: Product; seller: Seller; s: Speaker; tags?: string; quick?: boolean }) {
  const r = priceRange(p);
  const sale = saleOf(p);
  const cfg = getNiche(p.niche);
  const fam = cfg?.tasteFamilies?.find((f) => f.id === p.profile?.family);
  // Products with option axes (coffee weights) list their options; others show the seller's rating.
  const axis = cfg?.optionAxes?.[0];
  const values = axis ? [...new Set(p.variants.map((v) => v.opts?.[axis.id]).filter((x): x is string => Boolean(x)))] : [];
  const out = isSoldOut(p);
  // A size with no stock left is struck through ("1 كجم" crossed out) while others are still on sale.
  const options = values.map((x) => ({ label: (s.en && axis!.valuesEn?.[x]) || x, gone: !out && p.variants.filter((v) => v.opts?.[axis!.id] === x).every((v) => v.stock <= 0) }));
  return (
    <div className="cardw" data-f={tags}>
    <Link href={s.href(`/p/${p.slug}`)} className={`card${quick && !out ? ' has-qa' : ''}${out ? ' out' : ''}`}>
      <div className="pimg">
        <Art kind={p.art} color={p.color} image={p.images?.[0]} alt={s.product(p)} />
        {fam && <span className="badge">{fam.emoji} {(s.en && fam.labelEn) || fam.labelAr}</span>}
        {out ? <span className="ribbon r-out">{s.t('soldOutNow')}</span> : p.ribbon ? <span className={`ribbon r-${p.ribbon}`}>{s.t(`ribbon.${p.ribbon}` as 'ribbon.new')}</span> : sale.off > 0 ? <span className="ribbon r-sale">{s.t('off', { n: sale.off })}</span> : null}
      </div>
      <div className="pname">{s.product(p)}</div>
      <div className="pby">{s.t('by', { name: s.seller(sl) })}</div>
      <Notes p={p} s={s} cfg={cfg} />
      <div className="pmeta">{options.length ? <>⚖️ {options.map((o, i) => <span key={o.label}>{i ? ' · ' : ''}{o.gone ? <s title={s.t('soldOut')}>{o.label}</s> : o.label}</span>)}</> : <>{sl.rating ? `⭐ ${sl.rating}` : s.t('newSeller')} · 🚚 {s.t('arrives', { day: s.weekday(etaDate('القاهرة')) })}</>}</div>
      <div className="pprice num">{r.min !== r.max ? s.t('from', { price: s.egp(r.min) }) : s.egp(r.min)}{sale.compareMin && <s className="was">{s.egp(sale.compareMin)}</s>}{p.ribbon && sale.off > 0 && <span className="off">{s.t('off', { n: sale.off })}</span>}</div>
    </Link>
    {quick && cfg && !out && (
      <QuickAddButton item={{
        slug: p.slug, name: s.product(p), by: s.t('by', { name: s.seller(sl) }), image: p.images?.[0], art: p.art, color: p.color, price: p.price,
        variants: p.variants, choices: choicesFor(cfg, p), notes: fam ? `${fam.emoji} ${(s.en && fam.labelEn) || fam.labelAr}` : undefined,
      }} />
    )}
    </div>
  );
}
