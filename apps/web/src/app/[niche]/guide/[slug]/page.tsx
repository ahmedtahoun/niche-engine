import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { bestPer100g, catalog } from '@/lib/catalog';
import { gramsOf } from '@/lib/weights';
import { guideBySlug } from '@/lib/guides';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { jsonLd, pageMeta, siteUrl } from '@/lib/site';

type P = { params: Promise<{ niche: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { niche, slug } = await params;
  const cfg = getNiche(niche);
  const g = cfg && guideBySlug(niche, slug);
  if (!cfg || !g) return {};
  const s = await speaker(cfg);
  return pageMeta(cfg, s.lang, `/guide/${g.slug}`, { title: s.en ? g.title.en : g.title.ar, description: s.en ? g.description.en : g.description.ar, type: 'article' });
}

export default async function GuidePage({ params }: P) {
  const { niche, slug } = await params;
  const cfg = getNiche(niche);
  const g = cfg && guideBySlug(niche, slug);
  if (!cfg || !g) notFound();
  const s = await speaker(cfg);
  const L = <T extends { ar: string; en: string }>(x: T) => (s.en ? x.en : x.ar);
  const cat = await catalog();
  const related = g.related ? cat.search(cfg, { sort: 'best', cat: g.related.category, family: g.related.family }).slice(0, 4) : [];
  const url = siteUrl(cfg, `/guide/${g.slug}`, s.lang);
  // Live prices (prices page): every coffee, each size, and the lowest price per 100 g of the sizes on sale.
  const priced = g.priceTable ? cat.search(cfg, { sort: 'best' }) : [];
  const sizes = [...new Set(priced.flatMap((p) => p.variants.map((v) => v.opts?.weight ?? v.label)))].filter((x) => gramsOf(x)).sort((a, b) => gramsOf(a)! - gramsOf(b)!);
  const sizeName = (x: string) => (s.en && cfg.optionAxes?.find((a) => a.id === 'weight')?.valuesEn?.[x]) || x;
  const today = new Date().toLocaleDateString(s.en ? 'en-GB' : 'ar-EG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' });
  const ld = [
    { '@context': 'https://schema.org', '@type': 'Article', headline: L(g.title), description: L(g.description), inLanguage: s.lang, dateModified: g.updated, datePublished: g.updated, mainEntityOfPage: url, author: { '@type': 'Organization', name: cfg.brand.nameEn }, publisher: { '@type': 'Organization', name: cfg.brand.nameEn } },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: L(f.q), acceptedAnswer: { '@type': 'Answer', text: L(f.a) } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: s.brand(cfg), item: siteUrl(cfg, '/', s.lang) },
      { '@type': 'ListItem', position: 2, name: s.t('guides'), item: siteUrl(cfg, '/guide', s.lang) },
      { '@type': 'ListItem', position: 3, name: L(g.title), item: url },
    ] },
  ];
  return (
    <main className="page narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <article className="article">
        <Link className="small muted" href={s.href(`/guide`)}>{s.t('guides')}</Link>
        <h1 className="title" style={{ margin: 0 }}>{L(g.title)}</h1>
        <div className="short"><b>{s.t('inShort')}</b>{L(g.short)}</div>
        {g.sections.map((x) => (
          <section key={x.h.en}>
            <h2>{L(x.h)}</h2>
            <p>{L(x.p)}</p>
          </section>
        ))}
        {priced.length > 0 && (
          <section>
            <h2>{s.en ? `Cairo Roast prices today (${today})` : `أسعار محمصة القاهرة النهارده (${today})`}</h2>
            <div style={{ overflowX: 'auto' }}>
              <table className="spec price-table">
                <thead><tr><th>{s.en ? 'Coffee' : 'القهوة'}</th>{sizes.map((x) => <th key={x}>{sizeName(x)}</th>)}<th>{s.en ? 'Per 100 g' : 'لكل 100 جم'}</th></tr></thead>
                <tbody>
                  {priced.map((p) => {
                    const per = bestPer100g(p);
                    return (
                      <tr key={p.id}>
                        <td><Link href={s.href(`/p/${p.slug}`)}>{s.product(p)}</Link></td>
                        {sizes.map((x) => {
                          const v = p.variants.find((y) => (y.opts?.weight ?? y.label) === x);
                          return <td key={x} className="num">{!v ? '—' : v.stock > 0 ? s.egp(v.price ?? p.price) : s.t('soldOut')}</td>;
                        })}
                        <td className="num">{per ? s.egp(Math.round(per)) : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section>
          <h2>{s.t('faq')}</h2>
          {g.faq.map((f) => <details key={f.q.en} open><summary>{L(f.q)}</summary><p>{L(f.a)}</p></details>)}
        </section>
      </article>
      {related.length > 0 && (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 className="sec">{s.t('relatedCoffees')}</h2>
          <div className="grid">{related.map((p) => <ProductCard key={p.id} p={p} seller={cat.sellerOf(p)} s={s} />)}</div>
        </section>
      )}
    </main>
  );
}
