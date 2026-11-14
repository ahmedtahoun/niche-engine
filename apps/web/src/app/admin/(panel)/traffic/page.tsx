import Link from 'next/link';
import { allNiches } from '@/lib/niches';
import { store } from '@/lib/store';
import { cairoDay, type SiteStats } from '@/lib/traffic';
import { AutoRefresh } from '../AutoRefresh';
import { Bars, DailyChart } from '../charts';
import { NicheTabs, pct, pickNiche } from '../shared';

export const metadata = { title: 'Traffic' };

const PERIODS = [7, 30, 90] as const;
/** "Right now" = opened a page in the last few minutes. */
const LIVE_MIN = 5;
const SOURCE: Record<string, string> = {
  direct: 'Direct / typed', google: 'Google', bing: 'Bing', chatgpt: 'ChatGPT', perplexity: 'Perplexity', gemini: 'Gemini', copilot: 'Copilot',
  facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', x: 'X', youtube: 'YouTube', duckduckgo: 'DuckDuckGo', other: 'Other',
};
const sourceLabel = (s: string) => SOURCE[s] ?? s.replace(/\b\w/g, (c) => c.toUpperCase());
const pageLabel = (p: string) => (p === '/' ? 'Home' : p === '/order' ? 'Order confirmation' : p);

/** Several niches (All niches tab): add their numbers up. Visitors are per niche, so sums are right. */
function merge(xs: SiteStats[]): SiteStats {
  const add = <K extends string>(rows: Record<K, string | number>[][], key: K, val: K) => {
    const m = new Map<string, number>();
    for (const r of rows.flat()) m.set(String(r[key]), (m.get(String(r[key])) ?? 0) + Number(r[val]));
    return [...m].sort((a, b) => b[1] - a[1]);
  };
  const days = new Map<string, { visitors: number; views: number }>();
  for (const d of xs.flatMap((x) => x.daily)) { const c = days.get(d.day) ?? { visitors: 0, views: 0 }; days.set(d.day, { visitors: c.visitors + Number(d.visitors), views: c.views + Number(d.views) }); }
  const f = (k: keyof SiteStats['funnel']) => xs.reduce((a, x) => a + Number(x.funnel[k]), 0);
  return {
    daily: [...days].map(([day, v]) => ({ day, ...v })),
    sources: add(xs.map((x) => x.sources), 'source', 'visitors').slice(0, 12).map(([source, visitors]) => ({ source, visitors })),
    pages: add(xs.map((x) => x.pages), 'path', 'views').slice(0, 15).map(([path, views]) => ({ path, views })),
    devices: add(xs.map((x) => x.devices), 'device', 'visitors').map(([device, visitors]) => ({ device, visitors })),
    funnel: { visitors: f('visitors'), product: f('product'), cart: f('cart'), checkout: f('checkout'), order: f('order') },
  };
}

export default async function Traffic({ searchParams }: { searchParams: Promise<{ niche?: string; days?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 30;
  // From midnight Cairo, `days` days ago (today counts as one).
  const first = cairoDay(new Date(Date.now() - (days - 1) * 864e5));
  // Cairo is UTC+2 in winter and UTC+3 in summer: start at UTC+3 midnight so the first day is never cut short.
  const since = new Date(`${first}T00:00:00+03:00`).toISOString();
  const ids = niche ? [niche] : Object.keys(allNiches());
  let stats: SiteStats | null = null;
  let error = '';
  // "Right now": anyone who opened a page in the last 5 minutes (same visits table, no extra tracking).
  let live: SiteStats | null = null;
  try {
    const fiveMin = new Date(Date.now() - LIVE_MIN * 60_000).toISOString();
    [stats, live] = await Promise.all([
      Promise.all(ids.map((id) => store().siteStats(id, since))).then(merge),
      Promise.all(ids.map((id) => store().siteStats(id, fiveMin))).then(merge),
    ]);
  } catch (e) { error = (e as Error).message; }
  const missing = error ? await store().missingMigrations().catch(() => []) : [];
  const href = (x: { days?: number }) => `/admin/traffic?${new URLSearchParams({ ...(niche ? { niche } : {}), days: String(x.days ?? days) })}`;

  const byDay = new Map((stats?.daily ?? []).map((d) => [String(d.day).slice(0, 10), d]));
  const series = Array.from({ length: days }, (_, i) => cairoDay(new Date(Date.now() - (days - 1 - i) * 864e5))).map((date) => ({ date, value: Number(byDay.get(date)?.visitors ?? 0), views: Number(byDay.get(date)?.views ?? 0) }));
  const today = series[series.length - 1];
  const visits = series.reduce((a, d) => a + d.value, 0);
  const views = series.reduce((a, d) => a + d.views, 0);
  const fn = stats?.funnel;
  const share = (n: number) => (fn?.visitors ? pct(n / fn.visitors) : '—');

  return (
    <div className="dash">
      <div className="adm-top">
        <div>
          <h1>Traffic</h1>
          <p className="sub">People opening the store · last {days} days · no cookies, bots and your own admin visits left out{store().kind === 'memory' ? ' · demo data' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <nav className="seg" aria-label="Period">{PERIODS.map((p) => <Link key={p} href={href({ days: p })} aria-current={p === days ? 'true' : undefined}>{p} days</Link>)}</nav>
          <NicheTabs base="/admin/traffic" current={niche} extra={`days=${days}`} />
        </div>
      </div>

      {error ? (
        <section className="panel">
          <h2>Traffic isn&apos;t recorded yet</h2>
          <p className="empty">{missing.includes('0006_traffic_and_carts.sql')
            ? 'Run supabase/migrations/0006_traffic_and_carts.sql once in the Supabase SQL editor, then reload. Visits are counted from that moment.'
            : `The database didn't answer: ${error.slice(0, 200)}`}</p>
        </section>
      ) : (
        <>
          <section className="panel live">
            <h2><span><span className={`live-dot${live?.funnel.visitors ? ' on' : ''}`} aria-hidden="true" /> Right now <span className="sub">people with the store open in the last {LIVE_MIN} minutes</span></span><AutoRefresh seconds={30} /></h2>
            {live?.funnel.visitors ? (
              <div className="live-grid">
                <div className="live-n"><b>{live.funnel.visitors}</b><span>{live.funnel.visitors === 1 ? 'visitor' : 'visitors'}{live.funnel.checkout ? ` · ${live.funnel.checkout} on checkout` : live.funnel.cart ? ` · ${live.funnel.cart} added to cart` : ''}</span></div>
                <div><small>On these pages</small><Bars rows={live.pages.slice(0, 5).map((x) => ({ label: <span dir="ltr">{pageLabel(x.path)}</span>, value: Number(x.views) }))} /></div>
                <div><small>Came from</small><Bars rows={live.sources.slice(0, 5).map((x) => ({ label: sourceLabel(x.source), value: Number(x.visitors) }))} /></div>
              </div>
            ) : <p className="empty">Nobody in the last {LIVE_MIN} minutes. Right after you post or start an ad, watch it here.</p>}
          </section>

          <div className="hero-kpis">
            <div className="hk"><div className="hk-top"><small>Visitors today</small></div><b>{today.value.toLocaleString('en-US')}</b><span>{today.views.toLocaleString('en-US')} pages viewed</span></div>
            <div className="hk"><div className="hk-top"><small>Visits, {days} days</small></div><b>{visits.toLocaleString('en-US')}</b><span>unique visitors per day, added up</span></div>
            <div className="hk"><div className="hk-top"><small>Pages per visit</small></div><b>{visits ? (views / visits).toFixed(1) : '—'}</b><span>{views.toLocaleString('en-US')} page views</span></div>
            <div className="hk"><div className="hk-top"><small>Visit → order</small></div><b>{fn?.visitors ? pct(fn.order / fn.visitors) : '—'}</b><span>{fn?.order ?? 0} visits ended in an order</span></div>
          </div>

          <div className="dash-row r-2-1">
            <section className="panel">
              <h2>Visitors per day <span className="sub">hover a bar for its numbers</span></h2>
              <DailyChart daily={series} tip={(d, label) => `${label} · ${d.value} visitors · ${series.find((x) => x.date === d.date)?.views ?? 0} page views`} />
            </section>
            <section className="panel">
              <h2>From visit to order</h2>
              {fn?.visitors ? <Bars rows={[
                { label: 'Opened the store', value: fn.visitors, note: `${fn.visitors}` },
                { label: 'Looked at a coffee', value: fn.product, note: `${fn.product} · ${share(fn.product)}` },
                { label: 'Added to cart', value: fn.cart, note: `${fn.cart} · ${share(fn.cart)}` },
                { label: 'Opened checkout', value: fn.checkout, note: `${fn.checkout} · ${share(fn.checkout)}` },
                { label: 'Ordered', value: fn.order, note: `${fn.order} · ${share(fn.order)}` },
              ]} /> : <p className="empty">No visits yet in this period.</p>}
            </section>
          </div>

          <div className="dash-row r-3">
            <section className="panel">
              <h2>Where visitors came from</h2>
              {stats?.sources.length ? <Bars rows={stats.sources.map((x) => ({ label: sourceLabel(x.source), value: Number(x.visitors) }))} /> : <p className="empty">No visits yet.</p>}
              <p className="empty" style={{ marginTop: 8 }}>Tag ad links with utm_source (e.g. utm_source=facebook&amp;utm_medium=paid) to see each campaign here.</p>
            </section>
            <section className="panel">
              <h2>Most viewed pages</h2>
              {stats?.pages.length ? <Bars rows={stats.pages.map((x) => ({ label: <span dir="ltr">{pageLabel(x.path)}</span>, value: Number(x.views) }))} /> : <p className="empty">No visits yet.</p>}
            </section>
            <section className="panel">
              <h2>Phone or computer</h2>
              {stats?.devices.length ? <Bars rows={stats.devices.map((x) => ({ label: x.device === 'mobile' ? 'Phone' : 'Computer', value: Number(x.visitors), note: `${x.visitors} · ${share(Number(x.visitors))}` }))} /> : <p className="empty">No visits yet.</p>}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
