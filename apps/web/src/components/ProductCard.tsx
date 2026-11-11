import Link from 'next/link';
import { priceRange } from '@/lib/catalog';
import { egp, etaLabel } from '@/lib/eta';
import type { Product, Seller } from '@/lib/types';
import { Art } from './Art';

export function ProductCard({ p, seller: s }: { p: Product; seller: Seller }) {
  return (
    <Link href={`/${p.niche}/p/${p.slug}`} className="card">
      <div className="pimg"><Art kind={p.art} color={p.color} image={p.images?.[0]} alt={p.nameAr} /></div>
      <div className="pname">{p.nameAr}</div>
      <div className="pby">من {s.name}</div>
      <div className="pmeta">{s.rating ? `⭐ ${s.rating}` : 'بائع جديد'} · يوصل {etaLabel('القاهرة').split('،')[0]}</div>
      <div className="pprice num">{(() => { const r = priceRange(p); return r.min !== r.max ? `من ${egp(r.min)}` : egp(r.min); })()}</div>
    </Link>
  );
}
