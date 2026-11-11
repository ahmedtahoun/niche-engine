import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BundleArt } from '@/components/Art';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { catalog } from '@/lib/catalog';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';

export default async function Home({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const cat = await catalog();
  const hero = cfg.bundles[0] ? cat.bundleView(cfg, cfg.bundles[0].id) : null;
  const products = cat.search(cfg, { sort: 'best' });
  const text = (b?: { ar: string; en?: string }) => (b ? (s.en && b.en) || b.ar : '');
  return (
    <main className="page">
      {hero && (
        <section className="hero">
          <div className="art"><BundleArt parts={hero.parts.map((p) => p.product)} /></div>
          <div>
            <span className="small" style={{ opacity: 0.85 }}>{text(cfg.homeEyebrow)}</span>
            <h2>{s.bundle(hero.bundle)}</h2>
            <p>{hero.parts.map((p) => s.product(p.product).split(' — ')[0]).join(' + ')}</p>
            <div className="price num"><b>{s.egp(hero.price)}</b><s>{s.egp(hero.fullPrice)}</s></div>
            <Link className="btn" href={`/${cfg.id}/b/${hero.bundle.id}`} style={{ marginTop: 8 }}>{s.t('home.details')}</Link>
          </div>
        </section>
      )}
      <div className="how">
        <div><b>{s.t('how.1')}</b>{s.t('how.1s')}</div>
        <div><b>{s.t('how.2')}</b>{s.t('how.2s')}</div>
        <div><b>{s.t('how.3')}</b>{s.t('how.3s')}</div>
      </div>
      {products.length ? (
        <>
          <nav className="chips" aria-label={s.t('categories')}>
            {cfg.categories.map((c) => <Link key={c.id} className="chip" href={`/${cfg.id}/search?cat=${c.id}`}>{s.category(c)}</Link>)}
          </nav>
          <h2 className="sec">{text(cfg.homeSection)}</h2>
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} seller={cat.sellerOf(p)} s={s} />)}</div>
        </>
      ) : (
        <section className="box soon">
          <b>{s.t('soon.title', { brand: s.brand(cfg) })}</b>
          <span className="muted">{s.t('soon.text')}</span>
          <div className="chips" style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {cfg.categories.map((c) => <span key={c.id} className="chip">{s.category(c)}</span>)}
          </div>
        </section>
      )}
      <Footer cfg={cfg} s={s} />
    </main>
  );
}
