// Search engine setup (server only).
// - Site verification tags: GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION, either one token for every
//   site or per niche (coffee=TOKEN,umrah=TOKEN). Google's DNS "Domain property" needs no tag at all.
// - IndexNow: tells Bing (which feeds ChatGPT search and Copilot), Yandex and others that pages changed,
//   so they re-read them within hours instead of weeks. The key is derived from SESSION_SECRET
//   (or INDEXNOW_KEY) and published at /indexnow-key.txt, so there is nothing to set up.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { NicheConfig } from '@niche-engine/core';
import { catalog } from './catalog.ts';
import { guidesFor } from './guides.ts';
import { origin, siteUrl } from './site.ts';
import { store } from './store/index.ts';

type Env = Record<string, string | undefined>;

/** One token for all sites, or niche=token pairs. */
function perNiche(raw: string | undefined, niche: string): string | undefined {
  const v = raw?.trim();
  if (!v) return undefined;
  if (!v.includes('=')) return v;
  return Object.fromEntries(v.split(',').map((x) => x.split('=').map((y) => y.trim())))[niche] || undefined;
}

/** Next.js `verification` metadata for a niche's pages (Search Console, Bing Webmaster Tools). */
export function verificationFor(niche: string, env: Env = process.env) {
  const google = perNiche(env.GOOGLE_SITE_VERIFICATION, niche);
  const bing = perNiche(env.BING_SITE_VERIFICATION, niche);
  if (!google && !bing) return undefined;
  return { ...(google ? { google } : {}), ...(bing ? { other: { 'msvalidate.01': bing } } : {}) };
}

/** 32 hex characters; stable as long as the secret is. */
export function indexNowKey(env: Env = process.env) {
  const own = env.INDEXNOW_KEY?.trim();
  if (own && /^[A-Za-z0-9-]{8,128}$/.test(own)) return own;
  return createHmac('sha256', env.SESSION_SECRET || 'dev-only-secret').update('indexnow').digest('hex').slice(0, 32);
}

/** Every public page of a niche in both languages (same list as the sitemap). */
export async function publicUrls(cfg: NicheConfig): Promise<string[]> {
  const cat = await catalog();
  const paths = [
    '/',
    ...cat.productsOf(cfg.id).filter((p) => (p.status ?? 'live') === 'live').map((p) => `/p/${p.slug}`),
    ...cfg.bundles.filter((b) => cat.bundleView(cfg, b.id)).map((b) => `/b/${b.id}`),
    ...(guidesFor(cfg.id).length ? ['/guide', ...guidesFor(cfg.id).map((g) => `/guide/${g.slug}`)] : []),
  ];
  return paths.flatMap((p) => [siteUrl(cfg, p, 'ar'), siteUrl(cfg, p, 'en')]);
}

/** Sends changed URLs to IndexNow. Only for niches with their own domain, in production. Never throws. */
export async function submitIndexNow(cfg: NicheConfig, urls: string[], fetcher: typeof fetch = fetch, env: Env = process.env): Promise<boolean> {
  if (!cfg.brand.domain || !urls.length || (env.NODE_ENV !== 'production' && !env.INDEXNOW_FORCE)) return false;
  const host = cfg.brand.domain;
  try {
    const res = await fetcher('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host, key: indexNowKey(env), keyLocation: `${origin(cfg)}/indexnow-key.txt`, urlList: urls.filter((u) => new URL(u).host === host).slice(0, 10_000) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok && res.status !== 202) console.error(`[indexnow] ${host}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.ok || res.status === 202;
  } catch (e) {
    console.error(`[indexnow] ${host}:`, (e as Error).message);
    return false;
  }
}

/** The deployed revision (REVISION file written by the build), or null in development. */
export function revision(): string | null {
  for (const dir of [process.cwd(), join(process.cwd(), '..', '..')]) {
    try { return readFileSync(join(dir, 'REVISION'), 'utf8').trim().slice(0, 12); } catch { /* next */ }
  }
  return null;
}

/** On server start: after each new deploy, submit every public page once (remembered in the database). */
export async function submitAllOnNewRevision(niches: NicheConfig[]) {
  const rev = revision();
  if (!rev) return;
  for (const cfg of niches.filter((c) => c.brand.domain)) {
    const key = `indexnow:${cfg.id}`;
    try {
      if ((await store().getKv(key)) === rev) continue;
      if (await submitIndexNow(cfg, await publicUrls(cfg))) await store().setKv(key, rev);
    } catch { /* migration 0006 not run yet, or the database is down: try on the next start */ }
  }
}
