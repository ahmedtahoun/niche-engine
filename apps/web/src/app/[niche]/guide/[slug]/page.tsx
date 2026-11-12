import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { catalog } from '@/lib/catalog';
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
