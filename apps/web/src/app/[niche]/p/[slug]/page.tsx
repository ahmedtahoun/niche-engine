import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { AddToCart } from '@/components/AddToCart';
import { Art } from '@/components/Art';
import { productBySlug, sellerOf } from '@/lib/catalog';
import { egp, etaLabel } from '@/lib/eta';
import { getNiche } from '@/lib/niches';

type P = { params: Promise<{ niche: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { niche, slug } = await params;
  const p = productBySlug(niche, slug);
  return p ? { title: p.nameAr, description: p.leadAr } : {};
}

const SIZE_CHART = [['1', '135', '56'], ['2', '140', '58'], ['3', '145', '61'], ['4', '150', '64']];

export default async function ProductPage({ params }: P) {
  const { niche, slug } = await params;
  const cfg = getNiche(niche);
  const p = cfg && productBySlug(niche, slug);
  if (!cfg || !p) notFound();
  const s = sellerOf(p);
  const finder = p.category === 'abaya' ? 'size' : cfg.id === 'coffee' && p.variants.length > 1 ? 'grind' : null;
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.nameAr, description: p.leadAr,
    brand: { '@type': 'Brand', name: s.name },
    additionalProperty: Object.entries(p.attributes).map(([name, value]) => ({ '@type': 'PropertyValue', name, value })),
    offers: {
      '@type': 'Offer', priceCurrency: 'EGP', price: p.price,
      availability: p.variants.some((v) => v.stock) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      shippingDetails: { '@type': 'OfferShippingDetails', shippingRate: { '@type': 'MonetaryAmount', value: cfg.shippingEgp, currency: 'EGP' } },
      hasMerchantReturnPolicy: { '@type': 'MerchantReturnPolicy', merchantReturnDays: 14, returnFees: 'https://schema.org/FreeReturn' },
    },
    ...(p.reviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: p.reviews.length } } : {}),
  };

  return (
    <main className="page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="big"><Art kind={p.art} color={p.color} /></div>
      <div style={{ display: 'grid', gap: 6 }}>
        <h1 className="title">{p.nameAr}</h1>
        <div className="muted">من <b>{s.name}</b> · <span style={{ color: 'var(--ok)', fontWeight: 700 }}>✓ بائع موثّق</span> · ⭐ {s.rating}</div>
        <div className="pprice num" style={{ fontSize: 21 }}>{egp(p.price)}</div>
      </div>
      <div className="eta">
        <div><b>يوصل {etaLabel('القاهرة')}</b> للقاهرة والجيزة</div>
        <span>الشحن {egp(cfg.shippingEgp)} بس · مفيش أي رسوم تانية{cfg.risk.openBeforePay ? ' · افتح وشوف قبل ما تدفع' : ''}</span>
      </div>
      <nav className="jump" aria-label="أقسام الصفحة">
        <a href="#sec-sizes">{finder === 'grind' ? 'الطحنة' : 'المقاس'}</a><a href="#sec-specs">المواصفات</a><a href="#sec-revs">الآراء</a>{p.faq.length > 0 && <a href="#sec-faq">أسئلة</a>}
      </nav>
      <p className="lead" style={{ margin: 0 }}>{p.leadAr}</p>
      <AddToCart niche={niche} slug={p.slug} price={p.price} variants={p.variants} finder={finder} />
      <section id="sec-specs">
        <h2 className="h4">المواصفات</h2>
        <table className="spec"><tbody>
          {Object.entries(p.attributes).map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}
          <tr><td>الاستبدال</td><td>مجاني خلال 14 يوم: المندوب بياخد القديم ويسلمك الجديد في نفس الزيارة</td></tr>
        </tbody></table>
      </section>
      {p.category === 'abaya' && (
        <section>
          <h2 className="h4">جدول المقاسات (سم)</h2>
          <table className="spec"><tbody>
            <tr><td>المقاس</td><td>الطول · عرض الصدر</td></tr>
            {SIZE_CHART.map((r) => <tr key={r[0]}><td>{r[0]}</td><td className="num">{r[1]} · {r[2]}</td></tr>)}
          </tbody></table>
        </section>
      )}
      <section id="sec-revs" style={{ display: 'grid', gap: 8 }}>
        <h2 className="h4">الآراء ({p.reviews.length})</h2>
        {p.reviews.length ? p.reviews.map((r, i) => (
          <div className="rev" key={i}><div className="tags"><b>{r.name}</b>{r.tags.map((t) => <span className="tag" key={t}>{t}</span>)}</div>{r.text}</div>
        )) : <span className="muted">لسه مفيش آراء. كن أول واحد.</span>}
      </section>
      {p.faq.length > 0 && (
        <section id="sec-faq">
          <h2 className="h4">أسئلة شائعة</h2>
          {p.faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </section>
      )}
    </main>
  );
}
