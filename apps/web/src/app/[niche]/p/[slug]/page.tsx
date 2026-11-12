import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { Art, PickSeal } from '@/components/Art';
import { TasteProfile } from '@/components/Taste';
import { bestPer100g, catalog, choicesFor, freshnessOf, priceRange, saleOf } from '@/lib/catalog';
import { etaDate } from '@/lib/eta';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { jsonLd, pageMeta, siteUrl } from '@/lib/site';
import { PAGE_SIZES, responsive } from '@/lib/img';

type P = { params: Promise<{ niche: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { niche, slug } = await params;
  const p = (await catalog()).productBySlug(niche, slug);
  const cfg = getNiche(niche);
  if (!p || !cfg) return {};
  const s = await speaker(cfg);
  return pageMeta(cfg, s.lang, `/p/${p.slug}`, { title: s.product(p), description: s.lead(p), image: p.images?.[0] });
}

const SIZE_CHART = [['1', '135', '56'], ['2', '140', '58'], ['3', '145', '61'], ['4', '150', '64']];

export default async function ProductPage({ params }: P) {
  const { niche, slug } = await params;
  const cfg = getNiche(niche);
  const cat = await catalog();
  const p = cfg && cat.productBySlug(niche, slug);
  if (!cfg || !p) notFound();
  const s = await speaker(cfg);
  const seller = cat.sellerOf(p);
  const finder = p.category === 'abaya' ? 'size' : null;
  const choices = choicesFor(cfg, p);
  const range = priceRange(p);
  const sale = saleOf(p);
  const per100 = bestPer100g(p);
  const fresh = freshnessOf(cfg, p);
  const name = s.product(p);
  const lead = s.lead(p);
  const attrs = s.attrs(p);
  const faq = s.faqOf(p);
  const productLd = {
    '@context': 'https://schema.org', '@type': 'Product', name, description: lead, ...(p.images?.length ? { image: p.images } : {}),
    brand: { '@type': 'Brand', name: s.seller(seller) },
    additionalProperty: Object.entries(attrs).map(([n, value]) => ({ '@type': 'PropertyValue', name: n, value })),
    sku: p.id, url: siteUrl(cfg, `/p/${p.slug}`, s.lang),
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'EGP', lowPrice: range.min, highPrice: range.max, offerCount: p.variants.length,
      availability: p.variants.some((v) => v.stock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: cfg.shippingEgp, currency: 'EGP' } },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', merchantReturnDays: 14, returnFees: 'https://schema.org/FreeReturn' },
    },
    ...(p.reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: seller.rating, reviewCount: p.reviews.length } } : {}),
  };
  const catLabel = cfg.categories.find((c) => c.id === p.category);
  const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: s.brand(cfg), item: siteUrl(cfg, '/', s.lang) },
    ...(catLabel ? [{ '@type': 'ListItem', position: 2, name: s.category(catLabel), item: siteUrl(cfg, `/search?cat=${catLabel.id}`, s.lang) }] : []),
    { '@type': 'ListItem', position: catLabel ? 3 : 2, name, item: siteUrl(cfg, `/p/${p.slug}`, s.lang) },
  ] };
  const seal = cfg.brand.pickSeal ? (s.en && cfg.brand.pickSeal.en) || cfg.brand.pickSeal.ar : null;
  const facts = (cfg.facts ?? []).flatMap((f) => {
    const value = attrs[s.en ? f.keyEn : f.key];
    if (!value) return [];
    const flag = Object.entries(f.emojiBy ?? {}).find(([w]) => value.includes(w))?.[1];
    return [{ key: f.key, label: s.en ? f.keyEn : f.key, value, emoji: flag ?? f.emoji }];
  });
  // Farm-to-cup steps: under the photo on wide screens (fills the photo column), after the taste on phones.
  const j = cfg.journey;
  const origin = j ? attrs[s.en ? j.originKeyEn : j.originKey] || (s.en && j.originFallback.en) || j.originFallback.ar : '';
  const fillJ = (x: string) => x.replace('{origin}', origin).replace('{roaster}', s.seller(seller));
  const journey = j ? (
    <section className="journey" aria-label={(s.en && j.title.en) || j.title.ar}>
      <b className="jt">{(s.en && j.title.en) || j.title.ar}</b>
      <ol>
        {j.steps.map((st, i) => (
          <li key={i}>
            <span className="je" aria-hidden="true">{i === 1 && seller.logo ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={seller.logo} alt="" /> : st.emoji}</span>
            <span><b>{fillJ((s.en && st.en) || st.ar)}</b><span className="muted small">{(s.en && st.text.en) || st.text.ar}</span></span>
          </li>
        ))}
      </ol>
    </section>
  ) : null;
  const freshText = !fresh ? null
    : fresh.kind === 'to_order' ? (s.en && cfg.freshness?.madeToOrderEn) || fresh.text
    : fresh.days === 0 ? s.t('roastedToday') : s.t('roastedDays', { n: fresh.days, unit: fresh.days <= 10 ? 'أيام' : 'يوم' });

  return (
    <main className="page product">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd([productLd, breadcrumb, ...(faq.length ? [{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }] : [])])} />
      <div className="pmedia">
        {p.images?.length ? (
          <div className="gallery" aria-label={s.t('photos')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.images.map((src, i) => <img key={src} {...responsive(src, PAGE_SIZES)} alt={s.t('photoN', { name, n: i + 1 })} loading={i ? 'lazy' : 'eager'} fetchPriority={i ? 'auto' : 'high'} decoding="async" />)}
          </div>
        ) : <div className="big"><Art kind={p.art} color={p.color} label={cfg.brand.pickSeal ? { brand: cfg.brand.nameEn.toUpperCase(), name: (p.en?.name ?? p.nameAr).replace(/ Blend$/, '') } : undefined} /></div>}
        {seal && <PickSeal text={seal} under={s.en ? cfg.brand.nameAr : cfg.brand.nameEn.toUpperCase()} logo={cfg.brand.logo} rtl={!s.en} />}
        {journey && <div className="only-wide">{journey}</div>}
      </div>
      {(p.images?.length ?? 0) > 1 && <span className="small muted gallery-hint" style={{ textAlign: 'center' }}>{s.t('swipe', { n: p.images!.length })}</span>}
      <div style={{ display: 'grid', gap: 8 }}>
        {p.ribbon && <span className={`ribbon inline r-${p.ribbon}`}>{s.t(`ribbon.${p.ribbon}` as 'ribbon.new')}</span>}
        <h1 className="title">{name}</h1>
        <a className="roaster-chip" href="#sec-roaster">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="av" aria-hidden="true">{seller.logo ? <img src={seller.logo} alt="" /> : s.seller(seller).slice(0, 1)}</span>
          <span>{s.t('by', { name: '' })}<b>{s.seller(seller)}</b></span>
          <span className="muted small">· {seller.rating ? `⭐ ${seller.rating}` : s.t('partnerOf', { brand: s.brand(cfg) })}</span>
        </a>
        <div className="pprice num" style={{ fontSize: 21 }}>{range.min !== range.max ? s.t('from', { price: s.egp(range.min) }) : s.egp(range.min)}{sale.compareMin && <s className="was">{s.egp(sale.compareMin)}</s>}{sale.off > 0 && <span className="off">{s.t('off', { n: sale.off })}</span>}</div>
        {per100 && <div className="per100 num">{s.t('per100', { x: s.egp(per100) })}</div>}
        {freshText && <div className="small" style={{ color: 'var(--ok)', fontWeight: 700 }}>{freshText}</div>}
      </div>
      {facts.length > 0 && (
        <ul className="facts" aria-label={s.t('facts')}>
          {facts.map((f) => <li key={f.key} className="fact"><i aria-hidden="true">{f.emoji}</i><span className="small muted">{f.label}</span><b>{f.value}</b></li>)}
        </ul>
      )}
      <AddToCart niche={niche} slug={p.slug} price={p.price} variants={p.variants} finder={finder} axes={cfg.optionAxes} choices={choices} freeOver={cfg.freeShippingOverEgp} />
      <div className="eta">
        <div><b>{s.t('eta.cairo', { day: s.date(etaDate('القاهرة'), true) })}</b> {s.t('eta.cairoArea')}</div>
        <span>{cfg.freeShippingOverEgp ? s.t('eta.feesFree', { fee: s.egp(cfg.shippingEgp), x: s.egp(cfg.freeShippingOverEgp) }) : s.t('eta.fees', { fee: s.egp(cfg.shippingEgp) })}</span>
      </div>
      {lead && <p className="lead" style={{ margin: 0 }}>{lead}</p>}
      <TasteProfile p={p} cfg={cfg} s={s} />
      {journey && <div className="only-narrow">{journey}</div>}
      <section id="sec-specs">
        <h2 className="h4">{s.t('sec.specs')}</h2>
        <table className="spec"><tbody>
          {Object.entries(attrs).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          <tr><td>{s.t('exchange')}</td><td>{s.t('exchangeText')}</td></tr>
        </tbody></table>
      </section>
      {p.category === 'abaya' && (
        <section>
          <h2 className="h4">{s.t('sizeChart')}</h2>
          <table className="spec"><tbody>
            <tr><td>{s.t('size')}</td><td>{s.t('sizeChartHead')}</td></tr>
            {SIZE_CHART.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="num">{r[1]} · {r[2]}</td></tr>)}
          </tbody></table>
        </section>
      )}
      {p.reviews.length > 0 && (
        <section id="sec-revs" style={{ display: 'grid', gap: 8 }}>
          <h2 className="h4">{s.t('reviewsN', { n: p.reviews.length })}</h2>
          {p.reviews.map((r, i) => (
            <div className="rev" key={i}><div className="tags"><b>{r.name}</b>{r.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>{r.text}</div>
          ))}
        </section>
      )}
      {faq.length > 0 && (
        <section id="sec-faq">
          <h2 className="h4">{s.t('faq')}</h2>
          {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      )}
      <section id="sec-roaster" className="roaster" aria-label={s.t('meetRoaster')}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="av">{seller.logo ? <img src={seller.logo} alt="" /> : s.seller(seller).slice(0, 1)}</div>
        <div>
          <span className="small muted">{s.t('meetRoaster')}</span>
          <b style={{ display: 'block' }}>{s.seller(seller)}</b>
          {seller.about && <p>{(s.en && seller.about.en) || seller.about.ar}</p>}
        </div>
      </section>
    </main>
  );
}
