// Maps each domain to its niche: sakinaeg.com/p/x → /umrah/p/x internally.
// On localhost, open /umrah directly; "/" falls back to DEFAULT_NICHE.
// ?lang=en / ?lang=ar picks the language for that page (search engines index both)
// and remembers it in the "lang" cookie.
import { NextResponse, type NextRequest } from 'next/server';

const NICHE_IDS = (process.env.NICHE_IDS ?? 'umrah,coffee').split(',');
const DOMAINS = Object.fromEntries(
  (process.env.NICHE_DOMAINS ?? '').split(',').filter(Boolean).map((pair) => pair.split('=') as [string, string]),
);

export function middleware(req: NextRequest) {
  const { pathname, searchParams } = req.nextUrl;
  const asked = searchParams.get('lang');
  const lang = asked === 'en' || asked === 'ar' ? asked : null;
  const headers = new Headers(req.headers);
  if (lang) headers.set('x-lang', lang);
  const first = pathname.split('/')[1] ?? '';
  let res: NextResponse;
  if (NICHE_IDS.includes(first)) res = NextResponse.next({ request: { headers } });
  else {
    const host = (req.headers.get('host') ?? '').split(':')[0];
    const niche = DOMAINS[host] ?? process.env.DEFAULT_NICHE ?? NICHE_IDS[0];
    const url = req.nextUrl.clone();
    url.pathname = `/${niche}${pathname === '/' ? '' : pathname}`;
    res = NextResponse.rewrite(url, { request: { headers } });
  }
  if (lang) res.cookies.set('lang', lang, { path: '/', maxAge: 31536000, sameSite: 'lax' });
  return res;
}

export const config = {
  matcher: ['/((?!_next|api|admin|dev|favicon.ico|.*\\.).*)'],
};
