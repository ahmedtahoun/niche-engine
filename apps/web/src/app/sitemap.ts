import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { catalog } from '@/lib/catalog';
import { guidesFor } from '@/lib/guides';
import { allNiches } from '@/lib/niches';
import { nicheForHost, siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

/** Each domain lists its own niche: home, products, bundles, guides, sell page; Arabic with English alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const niches = allNiches();
  const cfg = niches[nicheForHost((await headers()).get('host'), Object.keys(niches))];
  if (!cfg) return [];
  const cat = await catalog();
  const entry = (path: string, priority: number, lastModified?: string) => ({
    url: siteUrl(cfg, path), priority, ...(lastModified ? { lastModified } : {}),
    alternates: { languages: { ar: siteUrl(cfg, path, 'ar'), en: siteUrl(cfg, path, 'en') } },
  });
  return [
    entry('/', 1),
    ...cat.productsOf(cfg.id).map((p) => entry(`/p/${p.slug}`, 0.8, p.priceConfirmedAt)),
    ...cfg.bundles.filter((b) => cat.bundleView(cfg, b.id)).map((b) => entry(`/b/${b.id}`, 0.7)),
    ...(guidesFor(cfg.id).length ? [entry('/guide', 0.6)] : []),
    ...guidesFor(cfg.id).map((g) => entry(`/guide/${g.slug}`, 0.6, g.updated)),
    ...(cfg.acceptsSellers !== false ? [entry('/sell', 0.4)] : []),
  ];
}
