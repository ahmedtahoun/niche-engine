// Maps each domain to its niche: sakinaeg.com/p/x → /umrah/p/x internally.
// On localhost, open /umrah or /coffee directly; "/" falls back to DEFAULT_NICHE.
import { NextResponse, type NextRequest } from 'next/server';

const NICHE_IDS = (process.env.NICHE_IDS ?? 'umrah,coffee').split(',');
const DOMAINS = Object.fromEntries(
  (process.env.NICHE_DOMAINS ?? '').split(',').filter(Boolean).map((pair) => pair.split('=') as [string, string]),
);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const first = pathname.split('/')[1] ?? '';
  if (NICHE_IDS.includes(first)) return NextResponse.next();
  const host = (req.headers.get('host') ?? '').split(':')[0];
  const niche = DOMAINS[host] ?? process.env.DEFAULT_NICHE ?? NICHE_IDS[0];
  const url = req.nextUrl.clone();
  url.pathname = `/${niche}${pathname === '/' ? '' : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ['/((?!_next|api|admin|dev|favicon.ico|.*\\.).*)'],
};
