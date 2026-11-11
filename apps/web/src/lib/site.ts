// Public addresses and search-engine helpers for each niche's own domain.
// On the live site a niche lives at its domain root (cairoroast.com/p/x);
// English pages are the same address with ?lang=en (so Google can index both).
import type { Metadata } from 'next';
import type { NicheConfig } from '@niche-engine/core';
import type { Lang } from './i18n.ts';

/** NICHE_DOMAINS="cairoroast.com=coffee,www.cairoroast.com=coffee" → host → niche id. */
export function domainMap(): Record<string, string> {
  return Object.fromEntries((process.env.NICHE_DOMAINS ?? '').split(',').filter(Boolean).map((pair) => pair.split('=') as [string, string]));
}

/** The niche a request's host serves (localhost falls back to DEFAULT_NICHE, then the first niche). */
export function nicheForHost(host: string | null, ids: string[]): string {
  const h = (host ?? '').split(':')[0];
  // Same fallback order as the middleware (NICHE_IDS), so localhost shows the same store everywhere.
  const order = (process.env.NICHE_IDS ?? 'umrah,coffee').split(',').filter((x) => ids.includes(x));
  return domainMap()[h] ?? process.env.DEFAULT_NICHE ?? order[0] ?? ids[0];
}

export const origin = (cfg: NicheConfig) => (cfg.brand.domain ? `https://${cfg.brand.domain}` : 'http://localhost:3100');

/** Absolute address of a store path ("/p/x"), in Arabic (default) or English. */
export function siteUrl(cfg: NicheConfig, path = '/', lang: Lang = 'ar') {
  const base = cfg.brand.domain ? origin(cfg) : `${origin(cfg)}/${cfg.id}`;
  const p = path === '/' ? (cfg.brand.domain ? '/' : '') : path;
  return `${base}${p}${lang === 'en' ? `${p.includes('?') ? '&' : '?'}lang=en` : ''}`;
}

/** Canonical + Arabic/English alternates + social card for a page. */
export function pageMeta(cfg: NicheConfig, lang: Lang, path: string, o: { title?: string; description?: string; image?: string; type?: 'website' | 'article' } = {}): Metadata {
  const url = siteUrl(cfg, path, lang);
  const image = o.image ?? cfg.brand.ogImage;
  return {
    ...(o.title ? { title: o.title } : {}),
    ...(o.description ? { description: o.description } : {}),
    alternates: { canonical: url, languages: { ar: siteUrl(cfg, path, 'ar'), en: siteUrl(cfg, path, 'en'), 'x-default': siteUrl(cfg, path, 'ar') } },
    openGraph: {
      type: o.type ?? 'website', url, siteName: lang === 'en' ? cfg.brand.nameEn : cfg.brand.nameAr, locale: lang === 'en' ? 'en_EG' : 'ar_EG',
      ...(o.title ? { title: o.title } : {}), ...(o.description ? { description: o.description } : {}),
      ...(image ? { images: [{ url: image.startsWith('http') ? image : `${origin(cfg)}${image}`, width: 1200, height: 630 }] } : {}),
    },
    twitter: { card: 'summary_large_image' },
  };
}

/** A <script type="application/ld+json"> body, safe to inline. */
export const jsonLd = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, '\\u003c') });
