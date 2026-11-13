import type { Metadata } from 'next';
import Link from 'next/link';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { BundleArt, TrustIcon } from '@/components/Art';
import { Footer } from '@/components/Footer';
import { ProductCard } from '@/components/ProductCard';
import { MiniCart, QuickAddSheet } from '@/components/QuickAdd';
import { catalog } from '@/lib/catalog';
import { guidesFor, readMinutes } from '@/lib/guides';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { CARD_SIZES, responsive } from '@/lib/img';
import { intlPhone, jsonLd, origin, pageMeta, siteUrl } from '@/lib/site';

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
  const guides = [...guidesFor(cfg.id)].sort((a, b) => b.updated.localeCompare(a.updated)); // newest first
  const families = (cfg.tasteFamilies ?? []).filter((f) => products.some((p) => p.profile?.family === f.id));
  // Filter chips on the home page: taste families first, then categories (only when a niche has taste families).
  const filters = families.length ? [
    ...families.map((f) => ({ id: f.id, emoji: f.emoji, label: (s.en && f.labelEn) || f.labelAr, hint: (s.en && f.hintEn) || f.hintAr, count: products.filter((p) => p.profile?.family === f.id).length })),
    ...cfg.categories.map((c) => ({ id: c.id, emoji: undefined, label: s.category(c), hint: undefined, count: products.filter((p) => p.category === c.id).length })).filter((c) => c.count > 0),
  ] : [];
  const fill = (x: string) => x.replace('{shipping}', String(cfg.shippingEgp)).replace('{freeOver}', (cfg.freeShippingOverEgp ?? 0).toLocaleString('en-US')).replace('{depositAbove}', String(cfg.risk.depositAboveEgp)).replace('{deposit}', String(cfg.risk.depositEgp));
  const faq = (cfg.homeFaq ?? []).map((f) => ({ q: text(f.q), a: fill(text(f.a)) }));
  const structured = [
    { '@context': 'https://schema.org', '@type': 'OnlineStore', name: cfg.brand.nameEn, alternateName: cfg.brand.nameAr, url: siteUrl(cfg), description: cfg.brand.description?.en, ...(cfg.brand.logo ? { logo: `${origin(cfg)}${cfg.brand.icon ?? cfg.brand.logo}` } : {}), areaServed: 'EG', currenciesAccepted: 'EGP', paymentAccepted: 'Cash on delivery, InstaPay', ...(cfg.brand.whatsapp ? { telephone: intlPhone(cfg.brand.whatsapp), contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', telephone: intlPhone(cfg.brand.whatsapp), availableLanguage: ['ar', 'en'] } } : {}) },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: cfg.brand.nameEn, url: siteUrl(cfg), inLanguage: ['ar', 'en'], potentialAction: { '@type': 'SearchAction', target: `${siteUrl(cfg, '/search')}?q={q}`, 'query-input': 'required name=q' } },
    ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: s.lang, mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }] : []),
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
              {hero && <Link className="btn ghost-light" href={s.href(`/b/${hero.bundle.id}`)}>🎁 {s.bundle(hero.bundle).split(':')[0]}</Link>}
            </div>
            {cfg.hero.badges?.length ? <div className="ph-badges">{cfg.hero.badges.map((b) => <span key={b.ar}>{text(b)}</span>)}</div> : null}
          </div>
          <div className="ph-stack" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cfg.hero.images.slice(0, 3).map((src, i) => <img key={src} {...responsive(src, CARD_SIZES)} alt={i === 0 ? s.t('alt.hero', { brand: s.brand(cfg) }) : ''} className={`s${i}`} decoding="async" fetchPriority={i === 0 ? 'high' : 'auto'} />)}
          </div>
        </section>
      )}
      {cfg.steps?.length ? (
        <ol className="steps-strip" aria-label={s.en ? 'How it works' : 'إزاي بتطلب'}>
          {cfg.steps.map((st) => <li key={st.ar}><span aria-hidden="true">{st.emoji}</span><b>{text(st)}</b></li>)}
        </ol>
      ) : null}
      {hero && !cfg.hero && (
        <section className="hero">
          <div className={`art${hero.bundle.image ? ' has-photo' : ''}`}>{hero.bundle.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="photo" {...responsive(hero.bundle.image, CARD_SIZES)} alt={s.bundle(hero.bundle)} loading="lazy" decoding="async" />
            : <BundleArt parts={hero.parts.map((p) => p.product)} />}</div>
          <div>
            <span className="small" style={{ opacity: 0.85 }}>{text(cfg.homeEyebrow)}</span>
            <h2>{s.bundle(hero.bundle)}</h2>
            <p>{hero.parts.map((p) => s.product(p.product).split(' — ')[0]).join(' + ')}</p>
            <div className="price num"><b>{s.egp(hero.price)}</b><s>{s.egp(hero.fullPrice)}</s></div>
            <Link className="btn" href={s.href(`/b/${hero.bundle.id}`)} style={{ marginTop: 8 }}>{s.t('home.details')}</Link>
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
      {products.length && filters.length ? (
        // Taste and type filters in one row; pure CSS (radio buttons), so it works before any script loads.
        <section className="shop" id="coffees" aria-labelledby="coffees-h">
          <style dangerouslySetInnerHTML={{ __html: filters.map((f) => `.shop:has(#f-${f.id}:checked) .grid>:not([data-f~="${f.id}"]){display:none}.shop:has(#f-${f.id}:checked) .fhint[data-for="${f.id}"]{display:block}`).join('') }} />
          <div>
            <h2 className="sec" id="coffees-h">{text(cfg.homeSection)}</h2>
            <span className="muted small">{s.t('shopByTasteSub')}</span>
          </div>
          <div className="filters" role="radiogroup" aria-label={s.t('shopByTaste')}>
            <input type="radio" name="shop-filter" id="f-all" defaultChecked />
            <label htmlFor="f-all">{s.en ? 'All' : 'الكل'}<span className="n">{products.length}</span></label>
            {filters.map((f) => (
              <Fragment key={f.id}>
                <input type="radio" name="shop-filter" id={`f-${f.id}`} />
                <label htmlFor={`f-${f.id}`}>{f.emoji && <span aria-hidden="true">{f.emoji}</span>}{f.label}<span className="n">{f.count}</span></label>
              </Fragment>
            ))}
          </div>
          {filters.filter((f) => f.hint).map((f) => <p key={f.id} className="fhint muted small" data-for={f.id}>{f.emoji} {f.hint}</p>)}
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} seller={cat.sellerOf(p)} s={s} quick tags={[p.profile?.family, p.category].filter(Boolean).join(' ')} />)}</div>
        </section>
      ) : products.length ? (
        <>
          <nav className="chips" aria-label={s.t('categories')}>
            {cfg.categories.map((c) => <Link key={c.id} className="chip" href={s.href(`/search?cat=${c.id}`)}>{s.category(c)}</Link>)}
          </nav>
          <h2 className="sec" id="coffees">{text(cfg.homeSection)}</h2>
          <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} seller={cat.sellerOf(p)} s={s} quick />)}</div>
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
      {hero && cfg.hero && (
        <Link className="box-card" href={s.href(`/b/${hero.bundle.id}`)}>
          <div className={`art${hero.bundle.image ? ' has-photo' : ''}`}>{hero.bundle.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img className="photo" {...responsive(hero.bundle.image, CARD_SIZES)} alt={s.bundle(hero.bundle)} loading="lazy" decoding="async" />
            : <BundleArt parts={hero.parts.map((p) => p.product)} />}</div>
          <div>
            <span className="small">{text(cfg.homeEyebrow)}</span>
            <b>{s.bundle(hero.bundle)}</b>
            <span className="small muted">{hero.parts.map((p) => s.product(p.product).split(' — ')[0]).join(' + ')}</span>
            <div className="price num"><b>{s.egp(hero.price)}</b><s>{s.egp(hero.fullPrice)}</s><span className="save">{s.t('bundleSave', { x: s.egp(hero.bundle.discountEgp) })}</span></div>
          </div>
        </Link>
      )}
      {sellers.map((x) => (
        <section key={x.id} className="roaster" aria-label={s.t('meetRoaster')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="av">{x.logo ? <img src={x.logo} alt={s.t('alt.logo', { name: s.seller(x) })} /> : s.seller(x).slice(0, 1)}</div>
          <div>
            <span className="small muted">{s.t('meetRoaster')}</span>
            <b style={{ display: 'block' }}>{s.seller(x)}</b>
            <p>{(s.en && x.about?.en) || x.about?.ar}</p>
          </div>
        </section>
      ))}
      {(() => {
        // Real reviews only (from delivered orders, typed in the admin); the section stays hidden until there are some.
        const revs = products.flatMap((p) => p.reviews.filter((r) => r.stars && r.orderId).map((r) => ({ r, p }))).sort((a, b) => (b.r.at ?? '').localeCompare(a.r.at ?? '')).slice(0, 6);
        return revs.length ? (
          <section className="home-revs" aria-labelledby="revs-h">
            <div><h2 className="sec" id="revs-h">{s.t('revs.title')}</h2><span className="muted small">{s.t('revs.sub')}</span></div>
            <div className="rev-strip">{revs.map(({ r, p }, i) => (
              <Link key={i} href={s.href(`/p/${p.slug}`)} className="rev-card">
                <span className="stars" aria-label={s.t('starsOf', { n: r.stars! })}>{'★'.repeat(r.stars!)}{'☆'.repeat(5 - r.stars!)}</span>
                <p>“{r.text}”</p>
                <span className="small"><b>{r.name}</b> · <span className="muted">{s.product(p)}</span></span>
              </Link>
            ))}</div>
          </section>
        ) : null;
      })()}
      {faq.length > 0 && (
        <section className="home-faq" aria-labelledby="faq-h">
          <h2 className="sec" id="faq-h">{s.t('faq')}</h2>
          {faq.map((f, i) => <details key={f.q} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </section>
      )}
      {guides.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }} aria-labelledby="guides-h">
          <div>
            <h2 className="sec" id="guides-h">{s.t('guides')}</h2>
            <span className="muted small">{s.t('guidesSub')}</span>
          </div>
          <div className="guide-cards">
            {guides.slice(0, 4).map((g) => {
              const n = readMinutes(g, s.lang);
              return (
                <Link key={g.slug} className="guide-card" href={s.href(`/guide/${g.slug}`)}>
                  <span className="ge" aria-hidden="true">{g.emoji ?? '📖'}</span>
                  <b>{s.en ? g.title.en : g.title.ar}</b>
                  <span className="muted small">{s.en ? g.description.en : g.description.ar}</span>
                  <span className="small rt">{n === 1 ? s.t('readMin1') : s.t('readMin', { n })}</span>
                </Link>
              );
            })}
          </div>
          {guides.length > 4 && <Link className="small" style={{ color: 'var(--primary)', fontWeight: 700 }} href={s.href('/guide')}>{s.t('allGuides')} ({guides.length}) {s.en ? '→' : '←'}</Link>}
        </section>
      )}
      {cfg.acceptsSellers !== false && cfg.tasteFamilies && (
        <Link className="cta-band" href={s.href(`/sell`)}>
          <b>{s.t('sellWithUs')}</b>
          <span className="small">{s.t('sellWithUsSub')}</span>
          <span className="small" style={{ fontWeight: 700 }}>{s.t('learnMore')} {s.en ? '→' : '←'}</span>
        </Link>
      )}
      <Footer cfg={cfg} s={s} />
      {products.length > 0 && <MiniCart niche={cfg.id} freeOver={cfg.freeShippingOverEgp} />}
      {products.length > 0 && <QuickAddSheet niche={cfg.id} axes={cfg.optionAxes ?? []} freeOver={cfg.freeShippingOverEgp} />}
    </main>
  );
}
