// Maps each domain to its store: cairoroast.com/p/x → /coffee/p/x internally.
// On a live store domain, another store's pages don't exist (sakinaeg.com/coffee → not found).
// On localhost, open /umrah or /coffee directly; "/" falls back to DEFAULT_NICHE.
// ?lang=en / ?lang=ar picks the language for that page (search engines index both)
// and remembers it in the "lang" cookie.
import { NextResponse, type NextRequest } from 'next/server';
import { parseDomains, routeFor } from './lib/routing';

const NICHE_IDS = (process.env.NICHE_IDS ?? 'umrah,coffee').split(',');
const DOMAINS = parseDomains(process.env.NICHE_DOMAINS);

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const asked = searchParams.get('lang');
  const lang = asked === 'en' || asked === 'ar' ? asked : null;
  const headers = new Headers(req.headers);
  if (lang) headers.set('x-lang', lang);
  const route = routeFor({ host: req.headers.get('host') ?? '', pathname, ids: NICHE_IDS, domains: DOMAINS, defaultNiche: process.env.DEFAULT_NICHE });
  let res: NextResponse;
  if (route.kind === 'next') res = NextResponse.next({ request: { headers } });
  else {
    const url = req.nextUrl.clone();
    url.pathname = route.path;
    if (route.dropQuery) url.search = '';
    res = NextResponse.rewrite(url, { request: { headers } });
  }
  if (lang) res.cookies.set('lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|admin|dev|favicon.ico|.*\\.).*)'],
};
