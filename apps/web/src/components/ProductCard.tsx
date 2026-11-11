import Link from 'next/link';
import { priceRange } from '@/lib/catalog';
import { etaDate } from '@/lib/eta';
import type { Speaker } from '@/lib/i18n';
import type { Product, Seller } from '@/lib/types';
import { Art } from './Art';

export function ProductCard({ p, seller: sl, s }: { p: Product; seller: Seller; s: Speaker }) {
  const r = priceRange(p);
  return (
    <Link href={`/${p.niche}/p/${p.slug}`} className="card">
      <div className="pimg"><Art kind={p.art} color={p.color} image={p.images?.[0]} alt={s.product(p)} /></div>
      <div className="pname">{s.product(p)}</div>
      <div className="pby">{s.t('by', { name: s.seller(sl) })}</div>
      <div className="pmeta">{sl.rating ? `⭐ ${sl.rating}` : s.t('newSeller')} · {s.t('arrives', { day: s.weekday(etaDate('القاهرة')) })}</div>
      <div className="pprice num">{r.min !== r.max ? s.t('from', { price: s.egp(r.min) }) : s.egp(r.min)}</div>
    </Link>
  );
}
