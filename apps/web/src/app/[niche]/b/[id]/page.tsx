import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddBundle } from '@/components/AddToCart';
import { Art, BundleArt } from '@/components/Art';
import { catalog } from '@/lib/catalog';
import { egp } from '@/lib/eta';
import { getNiche } from '@/lib/niches';

export default async function BundlePage({ params }: { params: Promise<{ niche: string; id: string }> }) {
  const { niche, id } = await params;
  const cfg = getNiche(niche);
  const cat = await catalog();
  const bv = cfg && cat.bundleView(cfg, id);
  if (!cfg || !bv) notFound();
  const sellers = new Set(bv.parts.map((p) => p.product.sellerId)).size;
  const pickLabel = bv.pickVariantsFrom?.category === 'abaya' ? 'مقاس العباية' : 'الطحنة';
  return (
    <main className="page">
      <div className="big" style={{ aspectRatio: '1 / .7' }}><BundleArt parts={bv.parts.map((p) => p.product)} /></div>
      <h1 className="title">{bv.bundle.nameAr}</h1>
      <div className="price num"><b style={{ color: 'var(--primary)' }}>{egp(bv.price)}</b><s className="muted">{egp(bv.fullPrice)}</s><span className="muted">وفّرت {egp(bv.bundle.discountEgp)}</span></div>
      <div style={{ display: 'grid', gap: 8 }}>
        {bv.parts.map((pt) => (
          <Link key={pt.product.slug} href={`/${niche}/p/${pt.product.slug}`} className="line">
            <div className="pimg"><Art kind={pt.product.art} color={pt.product.color} /></div>
            <div><b className="small">{pt.product.nameAr}{pt.qty > 1 ? ` × ${pt.qty}` : ''}</b><div className="pby">من {cat.sellerOf(pt.product).name}</div></div>
            <span className="num small">{egp(pt.product.price * pt.qty)}</span>
          </Link>
        ))}
      </div>
      <div className="note info">بيوصلك في {sellers} شحنات بنفس رقم الطلب، لأن كل بائع بيشحن من مكانه. الشحن بيتحسب مرة واحدة.</div>
      <AddBundle niche={niche} id={bv.bundle.id} variants={bv.pickVariantsFrom?.variants ?? null} label={pickLabel} />
    </main>
  );
}
