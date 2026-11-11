import Link from 'next/link';
import { sellerOf } from '@/lib/catalog';
import { egp, etaLabel } from '@/lib/eta';
import type { Product } from '@/lib/types';
import { Art } from './Art';

export function ProductCard({ p }: { p: Product }) {
  const s = sellerOf(p);
  return (
    <Link href={`/${p.niche}/p/${p.slug}`} className="card">
      <div className="pimg"><Art kind={p.art} color={p.color} /></div>
      <div className="pname">{p.nameAr}</div>
      <div className="pby">من {s.name}</div>
      <div className="pmeta">⭐ {s.rating} · يوصل {etaLabel('القاهرة').split('،')[0]}</div>
      <div className="pprice num">{egp(p.price)}</div>
    </Link>
  );
}
