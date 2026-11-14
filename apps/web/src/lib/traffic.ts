// Visitor statistics without cookies (admin → Traffic). The browser sends a tiny beacon per page
// view and funnel step (/api/t); the server turns IP + browser into a hash with a key that changes
// every day, so it counts unique visitors per day and can never be turned back into an IP.
import { createHash, createHmac } from 'node:crypto';

export type SiteEventKind = 'view' | 'cart' | 'checkout' | 'order';
export const EVENT_KINDS: SiteEventKind[] = ['view', 'cart', 'checkout', 'order'];

export interface SiteEvent {
  at?: string;
  niche: string;
  visitor: string;
  kind: SiteEventKind;
  path: string;
  source: string;
  device: 'mobile' | 'desktop';
  lang: 'ar' | 'en';
}

export interface SiteStats {
  daily: { day: string; visitors: number; views: number }[];
  sources: { source: string; visitors: number }[];
  pages: { path: string; views: number }[];
  devices: { device: string; visitors: number }[];
  funnel: { visitors: number; product: number; cart: number; checkout: number; order: number };
}

/** Today's date in Cairo (YYYY-MM-DD): days, and the daily key, follow Cairo time. */
export const cairoDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(d);

/** Hour (0–23.99) in Cairo, for quiet hours. */
export function cairoHour(d = new Date()) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).split(':').map(Number);
  return h + m / 60;
}

/** Anonymous visitor id for one day: HMAC(day key, ip + browser). Not reversible, not linkable across days. */
export function visitorId(ip: string, userAgent: string, secret: string, d = new Date()) {
  const dayKey = createHmac('sha256', secret || 'niche-engine').update(`visitor:${cairoDay(d)}`).digest();
  return createHash('sha256').update(dayKey).update(`${ip}|${userAgent}`).digest('hex').slice(0, 20);
}

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|meta-externalagent|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|go-http/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

/** The public path, without the niche prefix used on localhost (/coffee/p/x → /p/x) and without the query. */
export function cleanPath(raw: unknown, niche: string): string | null {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.length > 300) return null;
  let p = raw.split(/[?#]/)[0];
  if (p === `/${niche}`) p = '/';
  else if (p.startsWith(`/${niche}/`)) p = p.slice(niche.length + 1);
  p = p.replace(/\/+$/, '') || '/';
  // Order pages carry an order number: one bucket, so no order ids are stored.
  if (p.startsWith('/order/')) p = '/order';
  return /^[\p{L}\p{N}/._~%-]*$/u.test(p) ? p.slice(0, 120) : null;
}

/** Where a visit came from, as sent by the browser (utm_source or a known referrer); anything odd becomes "other". */
export function cleanSource(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'direct';
  const s = raw.toLowerCase().trim().slice(0, 40);
  return /^[a-z0-9 ._()/-]+$/.test(s) ? s : 'other';
}

/** The same numbers as the database's site_stats(), for the in-memory store (local demo and tests). */
export function summarize(events: SiteEvent[]): SiteStats {
  const withDay = events.map((e) => ({ ...e, day: cairoDay(new Date(e.at ?? Date.now())) }));
  const views = withDay.filter((e) => e.kind === 'view');
  const uniq = (xs: typeof withDay) => new Set(xs.map((e) => `${e.day}|${e.visitor}`)).size;
  const group = <K extends string>(xs: typeof withDay, key: (e: (typeof withDay)[number]) => K) => {
    const m = new Map<K, typeof withDay>();
    for (const e of xs) m.set(key(e), [...(m.get(key(e)) ?? []), e]);
    return [...m];
  };
  const byDesc = <T>(n: (x: T) => number, name: (x: T) => string) => (a: T, b: T) => n(b) - n(a) || name(a).localeCompare(name(b));
  return {
    daily: group(views, (e) => e.day).map(([day, xs]) => ({ day, visitors: new Set(xs.map((e) => e.visitor)).size, views: xs.length })).sort((a, b) => a.day.localeCompare(b.day)),
    sources: group(views, (e) => e.source).map(([source, xs]) => ({ source, visitors: uniq(xs) })).sort(byDesc((x) => x.visitors, (x) => x.source)).slice(0, 12),
    pages: group(views, (e) => e.path).map(([path, xs]) => ({ path, views: xs.length })).sort(byDesc((x) => x.views, (x) => x.path)).slice(0, 15),
    devices: group(views, (e) => e.device).map(([device, xs]) => ({ device, visitors: uniq(xs) })).sort(byDesc((x) => x.visitors, (x) => x.device)),
    funnel: {
      visitors: uniq(views),
      product: uniq(views.filter((e) => e.path.startsWith('/p/') || e.path.startsWith('/b/'))),
      cart: uniq(withDay.filter((e) => e.kind === 'cart')),
      checkout: uniq(withDay.filter((e) => e.kind === 'checkout')),
      order: uniq(withDay.filter((e) => e.kind === 'order')),
    },
  };
}
