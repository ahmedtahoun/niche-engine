import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AddBundle } from '@/components/AddToCart';
import { TrackOnView } from '@/components/Pixel';
import { Art, BundleArt } from '@/components/Art';
import { PAGE_SIZES, responsive } from '@/lib/img';
import { catalog, choicesFor, priceOf, resolveVariant } from '@/lib/catalog';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { pageMeta } from '@/lib/site';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ niche: string; id: string }> }): Promise<Metadata> {
  const { niche, id } = await params;
  const cfg = getNiche(niche);
  const bv = cfg && (await catalog()).bundleView(cfg, id);
  if (!cfg || !bv) return {};
  const s = await speaker(cfg);
  const title = s.bundle(bv.bundle);
  const description = `${bv.parts.map((p) => s.product(p.product)).join(' + ')} · ${s.egp(bv.price)} ${s.en ? 'instead of' : 'بدل'} ${s.egp(bv.fullPrice)}`;
  return pageMeta(cfg, s.lang, `/b/${id}`, { title, description, ...(bv.bundle.image ? { image: bv.bundle.image } : {}) });
}

export default async function BundlePage({ params }: { params: Promise<{ niche: string; id: string }> }) {
  const { niche, id } = await params;
  const cfg = getNiche(niche);
  const cat = await catalog();
  const bv = cfg && cat.bundleView(cfg, id);
  if (!cfg || !bv) notFound();
  const s = await speaker(cfg);
  const egp = s.egp;
  const sellers = new Set(bv.parts.map((p) => p.product.sellerId)).size;
  const pickLabel = bv.pickVariantsFrom?.category === 'abaya' ? s.t('bundlePickSize') : s.t('bundlePick');
  // A choice (e.g. the grind) asked once for the whole bundle, for every part it applies to.
  const choices = [...new Map(bv.parts.flatMap((pt) => choicesFor(cfg, pt.product)).map((c) => [c.id, c])).values()];
  const ids = [...new Set(bv.parts.map((pt) => pt.product.id))];
  return (
    <main className="page narrow">
      <div className="big" style={{ aspectRatio: '1 / .7' }}>
        {bv.bundle.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="photo" {...responsive(bv.bundle.image, PAGE_SIZES)} alt={s.bundle(bv.bundle)} fetchPriority="high" decoding="async" />
          : <BundleArt parts={bv.parts.map((p) => p.product)} />}
      </div>
      <h1 className="title">{s.bundle(bv.bundle)}</h1>
      <div className="price num"><b style={{ color: 'var(--primary)' }}>{egp(bv.price)}</b><s className="muted">{egp(bv.fullPrice)}</s><span className="muted">{s.t('bundleSave', { x: egp(bv.bundle.discountEgp) })}</span></div>
      <div style={{ display: 'grid', gap: 8 }}>
        {bv.parts.map((pt) => (
          <Link key={pt.product.slug} href={s.href(`/p/${pt.product.slug}`)} className="line">
            <div className="pimg"><Art kind={pt.product.art} color={pt.product.color} image={pt.product.images?.[0]} alt={pt.product.nameAr} /></div>
            <div><b className="small">{s.product(pt.product)}{pt.qty > 1 ? ` × ${pt.qty}` : ''}</b><div className="pby">{s.t('by', { name: s.seller(cat.sellerOf(pt.product)) })}</div></div>
            <span className="num small">{egp((pt.variant === null ? pt.product.price : priceOf(pt.product, resolveVariant(pt.product, pt.variant))) * pt.qty)}</span>
          </Link>
        ))}
      </div>
      {sellers > 1 && <div className="note info">{s.t('bundleShipments', { n: sellers })}</div>}
      <TrackOnView event="ViewContent" data={{ content_ids: ids, content_type: 'product_group', content_name: bv.bundle.id, value: bv.price }} />
      <AddBundle niche={niche} id={bv.bundle.id} variants={bv.pickVariantsFrom?.variants ?? null} label={pickLabel} choices={choices} productIds={ids} price={bv.price} />
    </main>
  );
}
