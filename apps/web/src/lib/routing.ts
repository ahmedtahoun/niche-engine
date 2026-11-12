// Which store a request belongs to (used by the middleware; plain logic, easy to test).
// - A live store domain serves its own store at the root: cairoroast.com/p/x → /coffee/p/x.
// - Another store's path on a live domain doesn't exist: sakinaeg.com/coffee → not found.
// - On a live domain, its own store id in the path is redirected away for good:
//   cairoroast.com/coffee/p/x → cairoroast.com/p/x (one address per page for search engines).
// - On localhost, paths that start with a store id pass through.

export type Route = { kind: 'next' } | { kind: 'rewrite'; path: string; dropQuery?: boolean } | { kind: 'redirect'; path: string };

export function routeFor(o: { host: string; pathname: string; ids: string[]; domains: Record<string, string>; defaultNiche?: string }): Route {
  const first = o.pathname.split('/')[1] ?? '';
  const own = o.domains[o.host.split(':')[0]];
  if (own && o.ids.includes(first) && first !== own) return { kind: 'rewrite', path: `/${own}/not-found`, dropQuery: true };
  if (own && first === own) return { kind: 'redirect', path: o.pathname.slice(own.length + 1) || '/' };
  if (o.ids.includes(first)) return { kind: 'next' };
  const niche = own ?? o.defaultNiche ?? o.ids[0];
  return { kind: 'rewrite', path: `/${niche}${o.pathname === '/' ? '' : o.pathname}` };
}

export const parseDomains = (raw: string | undefined): Record<string, string> =>
  Object.fromEntries((raw ?? '').split(',').filter(Boolean).map((pair) => pair.split('=') as [string, string]));
