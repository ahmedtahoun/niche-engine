import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BundleArt, TrustIcon } from '@/components/Art';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { catalog } from '@/lib/catalog';
import { guidesFor } from '@/lib/guides';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { jsonLd, origin, pageMeta, siteUrl } from '@/lib/site';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg) return {};
  const s = await speaker(cfg);
  const d = cfg.brand.description;
  return pageMeta(cfg, s.lang, '/', { title: s.brand(cfg), description: d ? (s.en && d.en) || d.ar : undefined });
}

export default async function Home({ params }: P) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const cat = await catalog();
  const hero = cfg.bundles[0] ? cat.bundleView(cfg, cfg.bundles[0].id) : null;
  const products = cat.search(cfg, { sort: 'best' });
  const text = (b?: { ar: string; en?: string }) => (b ? (s.en && b.en) || b.ar : '');
  const sellers = [...new Map(products.map((p) => [p.sellerId, cat.sellerOf(p)])).values()].filter((x) => x.about);
  const guides = guidesFor(cfg.id);
  const families = (cfg.tasteFamilies ?? []).filter((f) => products.some((p) => p.profile?.family === f.id));
  const structured = [
    { '@context': 'https://schema.org', '@type': 'OnlineStore', name: cfg.brand.nameEn, alternateName: cfg.brand.nameAr, url: siteUrl(cfg), description: cfg.brand.description?.en, ...(cfg.brand.logo ? { logo: `${origin(cfg)}${cfg.brand.icon ?? cfg.brand.logo}` } : {}), areaServed: 'EG', currenciesAccepted: 'EGP', paymentAccepted: 'Cash on delivery, InstaPay' },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.brand.nameEn, url: siteUrl(cfg), inLanguage: ['ar', 'en'], potentialAction: { '@type': 'SearchAction', target: `${siteUrl(cfg, '/search')}?q={q}`, 'query-input': 'required name=q' } },
  ];
  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
      {cfg.hero && (
        <section className="photo-hero">
          <div className="ph-text">
            <h1>{text(cfg.hero.title)}</h1>
            <p>{text(cfg.hero.subtitle)}</p>
            <div className="ph-cta">
              <a className="btn" href="#coffees">{text(cfg.hero.cta)}</a>
              {hero && <Link className="btn ghost-light" href={`/${cfg.id}/b/${hero.bundle.id}`}>🎁 {s.bundle(hero.bundle).split(':')[0]}</Link>}
            </div>
            {cfg.hero.badges?.length ? <div className="ph-badges">{cfg.hero.badges.map((b) => <span key={b.ar}>{text(b)}</span>)}</div> : null}
          </div>
          <div className="ph-stack" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cfg.hero.images.slice(0, 3).map((src, i) => <img key={src} src={src} alt="" className={`s${i}`} decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} />)}
          </div>
        </section>
      )}
      {cfg.steps?.length ? (
        <section className="steps" aria-label={s.en ? 'How it works' : 'إزاي بتطلب'}>
          <h2 className="sec">{s.en ? 'How it works' : 'إزاي بتطلب؟'}</h2>
          <ol>
            {cfg.steps.map((st, i) => (
              <li key={st.ar}><span className="em" aria-hidden="true">{st.emoji}</span><span className="n">{i + 1}</span><b>{text(st)}</b><span className="muted">{text(st.text)}</span></li>
            ))}
          </ol>
        </section>
      ) : null}
      {hero && cfg.hero && (
        <Link className="box-card" href={`/${cfg.id}/b/${hero.bundle.id}`}>
          <div className="art"><BundleArt parts={hero.parts.map((p) => p.product)} /></div>
          <div>
            <span className="small">{text(cfg.homeEyebrow)}</span>
            <b>{s.bundle(hero.bundle)}</b>
            <span className="small muted">{hero.parts.map((p) => s.product(p.product).split(' — ')[0]).join(' + ')}</span>
            <div className="price num"><b>{s.egp(hero.price)}</b><s>{s.egp(hero.fullPrice)}</s><span className="save">{s.t('bundleSave', { x: s.egp(hero.bundle.discountEgp) })}</span></div>
          </div>
        </Link>
      )}
      {hero && !cfg.hero && (
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
      {cfg.steps?.length ? null : cfg.trust?.length ? (
        <ul className="trustbar">{cfg.trust.map((x) => <li key={x.ar}><span className="ti" aria-hidden="true">{TrustIcon[x.icon ?? 'seal']}</span>{text(x)}</li>)}</ul>
      ) : (
        <div className="how">
          <div><b>{s.t('how.1')}</b>{s.t('how.1s')}</div>
          <div><b>{s.t('how.2')}</b>{s.t('how.2s')}</div>
          <div><b>{s.t('how.3')}</b>{s.t('how.3s')}</div>
        </div>
      )}
      {families.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }}>
          <div><h2 className="sec">{s.t('shopByTaste')}</h2><span className="muted small">{s.t('shopByTasteSub')}</span></div>
          <div className="families">
            {families.map((f) => (
              <Link key={f.id} className="family" href={`/${cfg.id}/search?family=${f.id}`}>
                <b>{f.emoji ? <span className="fe" aria-hidden="true">{f.emoji}</span> : null}{(s.en && f.labelEn) || f.labelAr}</b>
                {f.hintAr && <span className="muted">{(s.en && f.hintEn) || f.hintAr}</span>}
                <span className="go" aria-hidden="true">←</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {products.length ? (
        <>
          <nav className="chips" aria-label={s.t('categories')}>
            {cfg.categories.map((c) => <Link key={c.id} className="chip" href={`/${cfg.id}/search?cat=${c.id}`}>{s.category(c)}</Link>)}
          </nav>
          <h2 className="sec" id="coffees">{text(cfg.homeSection)}</h2>
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
      {sellers.map((x) => (
        <section key={x.id} className="roaster" aria-label={s.t('meetRoaster')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="av">{x.logo ? <img src={x.logo} alt="" /> : s.seller(x).slice(0, 1)}</div>
          <div>
            <span className="small muted">{s.t('meetRoaster')}</span>
            <b style={{ display: 'block' }}>{s.seller(x)}</b>
            <p>{(s.en && x.about?.en) || x.about?.ar}</p>
            {x.instagram && <a className="small" style={{ color: 'var(--primary)', fontWeight: 700 }} href={`https://instagram.com/${x.instagram}`} rel="noopener" target="_blank">{s.t('instagram')} ↗</a>}
          </div>
        </section>
      ))}
      {guides.length > 0 && (
        <section style={{ display: 'grid', gap: 4 }}>
          <h2 className="sec">{s.t('guides')}</h2>
          <span className="muted small">{s.t('guidesSub')}</span>
          <div className="guides">
            {guides.slice(0, 3).map((g) => (
              <Link key={g.slug} className="guide-link" href={`/${cfg.id}/guide/${g.slug}`}><b>{s.en ? g.title.en : g.title.ar}</b><span className="muted small">{s.en ? g.description.en : g.description.ar}</span></Link>
            ))}
            <Link className="small" style={{ color: 'var(--primary)', fontWeight: 700, paddingTop: 8 }} href={`/${cfg.id}/guide`}>{s.t('allGuides')}</Link>
          </div>
        </section>
      )}
      {cfg.acceptsSellers !== false && cfg.tasteFamilies && (
        <Link className="cta-band" href={`/${cfg.id}/sell`}>
          <b>{s.t('sellWithUs')}</b>
          <span className="small">{s.t('sellWithUsSub')}</span>
          <span className="small" style={{ fontWeight: 700 }}>{s.t('learnMore')} {s.en ? '→' : '←'}</span>
        </Link>
      )}
      <Footer cfg={cfg} s={s} />
    </main>
  );
}
