import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { Art } from '@/components/Art';
import { catalog, choicesFor, freshnessOf, priceRange } from '@/lib/catalog';
import { etaDate } from '@/lib/eta';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';

type P = { params: Promise<{ niche: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { niche, slug } = await params;
  const p = (await catalog()).productBySlug(niche, slug);
  if (!p) return {};
  const s = await speaker(getNiche(niche));
  return { title: s.product(p), description: s.lead(p) };
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
  const fresh = freshnessOf(cfg, p);
  const name = s.product(p);
  const lead = s.lead(p);
  const attrs = s.attrs(p);
  const faq = s.faqOf(p);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name, description: lead, ...(p.images?.length ? { image: p.images } : {}),
    brand: { '@type': 'Brand', name: s.seller(seller) },
    additionalProperty: Object.entries(attrs).map(([n, value]) => ({ '@type': 'PropertyValue', name: n, value })),
    offers: {
      '@type': 'Offer', priceCurrency: 'EGP', price: range.min,
      availability: p.variants.some((v) => v.stock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: cfg.shippingEgp, currency: 'EGP' } },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', merchantReturnDays: 14, returnFees: 'https://schema.org/FreeReturn' },
    },
    ...(p.reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: seller.rating, reviewCount: p.reviews.length } } : {}),
  };
  const freshText = !fresh ? null
    : fresh.kind === 'to_order' ? (s.en && cfg.freshness?.madeToOrderEn) || fresh.text
    : fresh.days === 0 ? s.t('roastedToday') : s.t('roastedDays', { n: fresh.days, unit: fresh.days <= 10 ? 'أيام' : 'يوم' });

  return (
    <main className="page product">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      {p.images?.length ? (
        <>
          <div className="gallery" aria-label={s.t('photos')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {p.images.map((src, i) => <img key={src} src={src} alt={s.t('photoN', { name, n: i + 1 })} loading={i ? 'lazy' : 'eager'} decoding="async" />)}
          </div>
          {p.images.length > 1 && <span className="small muted gallery-hint" style={{ textAlign: 'center' }}>{s.t('swipe', { n: p.images.length })}</span>}
        </>
      ) : <div className="big"><Art kind={p.art} color={p.color} /></div>}
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 className="title">{name}</h1>
        <div className="muted">{/* eslint-disable-next-line @next/next/no-img-element */}{seller.logo && <img className="slogo" src={seller.logo} alt="" />}{s.t('by', { name: '' })}<b>{s.seller(seller)}</b> · <span style={{ color: 'var(--ok)', fontWeight: 700 }}>{s.t('verified')}</span> · {seller.rating ? `⭐ ${seller.rating}` : s.t('newSeller')}</div>
        <div className="pprice num" style={{ fontSize: 21 }}>{range.min !== range.max ? s.t('from', { price: s.egp(range.min) }) : s.egp(range.min)}</div>
        {freshText && <div className="small" style={{ color: 'var(--ok)', fontWeight: 700 }}>{freshText}</div>}
      </div>
      <div className="eta">
        <div><b>{s.t('eta.cairo', { day: s.date(etaDate('القاهرة'), true) })}</b> {s.t('eta.cairoArea')}</div>
        <span>{s.t('eta.fees', { fee: s.egp(cfg.shippingEgp) })}{cfg.risk.openBeforePay ? s.t('eta.open') : ''}</span>
      </div>
      <nav className="jump" aria-label={s.t('sections')}>
        <a href="#sec-sizes">{finder === 'size' ? s.t('sec.size') : s.t('sec.options')}</a><a href="#sec-specs">{s.t('sec.specs')}</a><a href="#sec-revs">{s.t('sec.reviews')}</a>{faq.length > 0 && <a href="#sec-faq">{s.t('sec.faq')}</a>}
      </nav>
      {lead && <p className="lead" style={{ margin: 0 }}>{lead}</p>}
      <AddToCart niche={niche} slug={p.slug} price={p.price} variants={p.variants} finder={finder} axes={cfg.optionAxes} choices={choices} />
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
      <section id="sec-revs" style={{ display: 'grid', gap: 8 }}>
        <h2 className="h4">{s.t('reviewsN', { n: p.reviews.length })}</h2>
        {p.reviews.length ? p.reviews.map((r, i) => (
          <div className="rev" key={i}><div className="tags"><b>{r.name}</b>{r.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>{r.text}</div>
        )) : <span className="muted">{s.t('noReviews')}</span>}
      </section>
      {faq.length > 0 && (
        <section id="sec-faq">
          <h2 className="h4">{s.t('faq')}</h2>
          {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      )}
    </main>
  );
}
