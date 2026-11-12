import Link from 'next/link';
import { priceRange } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { etaDate } from '@/lib/eta';
import type { Speaker } from '@/lib/i18n';
import type { Product, Seller } from '@/lib/types';
import { Art } from './Art';
import { Notes } from './Taste';

/** tags: words the home page filter matches (taste family, category). */
export function ProductCard({ p, seller: sl, s, tags }: { p: Product; seller: Seller; s: Speaker; tags?: string }) {
  const r = priceRange(p);
  const cfg = getNiche(p.niche);
  const fam = cfg?.tasteFamilies?.find((f) => f.id === p.profile?.family);
  // Products with option axes (coffee weights) list their options; others show the seller's rating.
  const axis = cfg?.optionAxes?.[0];
  const options = axis ? [...new Set(p.variants.map((v) => v.opts?.[axis.id]).filter((x): x is string => Boolean(x)))].map((x) => (s.en && axis.valuesEn?.[x]) || x) : [];
  return (
    <Link href={`/${p.niche}/p/${p.slug}`} className="card" data-f={tags}>
      <div className="pimg">
        <Art kind={p.art} color={p.color} image={p.images?.[0]} alt={s.product(p)} />
        {fam && <span className="badge">{fam.emoji} {(s.en && fam.labelEn) || fam.labelAr}</span>}
      </div>
      <div className="pname">{s.product(p)}</div>
      <div className="pby">{s.t('by', { name: s.seller(sl) })}</div>
      <Notes p={p} s={s} cfg={cfg} />
      <div className="pmeta">{options.length ? `⚖️ ${options.join(' · ')}` : <>{sl.rating ? `⭐ ${sl.rating}` : s.t('newSeller')} · 🚚 {s.t('arrives', { day: s.weekday(etaDate('القاهرة')) })}</>}</div>
      <div className="pprice num">{r.min !== r.max ? s.t('from', { price: s.egp(r.min) }) : s.egp(r.min)}</div>
    </Link>
  );
}
