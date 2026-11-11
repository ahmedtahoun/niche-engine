import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { allNiches } from '@/lib/niches';
import { nicheForHost, origin } from '@/lib/site';

export const dynamic = 'force-dynamic';

const PRIVATE = ['/admin', '/dev', '/api', '/cart', '/checkout', '/account', '/order'];

export default async function robots(): Promise<MetadataRoute.Robots> {
  const niches = allNiches();
  const cfg = niches[nicheForHost((await headers()).get('host'), Object.keys(niches))];
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      // AI answer engines may read the public catalog and guides (GEO plan).
      { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Claude-SearchBot', 'Claude-User', 'Google-Extended', 'Applebot-Extended'], allow: '/', disallow: PRIVATE },
    ],
    ...(cfg?.brand.domain ? { sitemap: `${origin(cfg)}/sitemap.xml`, host: origin(cfg) } : {}),
  };
}
