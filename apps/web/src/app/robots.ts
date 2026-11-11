import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/dev', '/api', '/cart', '/checkout', '/account', '/order'] },
      // AI answer engines may read the public catalog (GEO plan).
      { userAgent: ['OAI-SearchBot', 'PerplexityBot'], allow: '/', disallow: ['/admin', '/dev', '/api'] },
    ],
  };
}
