import Link from 'next/link';
import { blockedList } from '@/lib/blocklist';
import { catalog } from '@/lib/catalog';
import { dashboard, delta } from '@/lib/dashboard';
import { allNiches, getNiche } from '@/lib/niches';
import { orderNet } from '@/lib/payouts';
import { coverDays, productStats } from '@/lib/product-stats';
import { store } from '@/lib/store';
import { totalOwed } from '@/lib/wallet';
import { Bars, Delta, RevenueChart, Sparkline } from './charts';
import { EGP, NicheTabs, pct, pickNiche } from './shared';

export const metadata = { title: 'Overview' };

const PERIODS = [7, 30, 90] as const;
const SOURCE: Record<string, string> = { web: 'Website', whatsapp: 'WhatsApp', phone: 'Phone', instagram: 'Instagram', facebook: 'Facebook', other: 'Other' };
const short = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

export default async function Overview({ searchParams }: { searchParams: Promise<{ niche?: string; days?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const days = PERIODS.find((d) => String(d) === sp.days) ?? 30;
  const [cat, all, blocked, owed] = await Promise.all([catalog(), store().listOrders({ limit: 100000 }), blockedList(), totalOwed(niche ?? undefined)]);
  const orders = all.filter((o) => !niche || o.niche === niche);
  const products = cat.products.filter((p) => !niche || p.niche === niche);
  const d = dashboard(orders, products, days);
  const n = d.now, b = d.before;
  const margin = n.costedRevenue ? n.profit / n.costedRevenue : null;
  const net = orders.filter((o) => o.status === 'delivered').reduce((a, o) => a + orderNet(o, getNiche(o.niche)!), 0);
  const href = (x: { days?: number }) => `/admin?${new URLSearchParams({ ...(niche ? { niche } : {}), days: String(x.days ?? days) })}`;
  const spark = (key: 'revenue' | 'orders') => {
    // Group the daily series into ~14 points so short periods stay readable.
    const size = Math.max(1, Math.ceil(d.daily.length / 14));
    const out: number[] = [];
    for (let i = 0; i < d.daily.length; i += size) out.push(d.daily.slice(i, i + size).reduce((s, x) => s + x[key], 0));
    return out;
  };

  // Inventory health from the last 30 days' pace.
  const stats = productStats(products, orders);
  const live = products.filter((p) => (p.status ?? 'live') === 'live');
  const skus = live.flatMap((p) => p.variants.map((v) => ({ p, v, cover: coverDays(v.stock, stats[p.id]?.byVariant[v.label]?.recent.units ?? 0) })));
  const restock = skus.filter((x) => x.v.stock <= 5 || (x.cover !== null && x.cover < 10)).sort((a, z) => a.v.stock - z.v.stock);
  const stockValue = skus.reduce((s, x) => s + x.v.stock * (x.p.cost?.[x.v.label] ?? 0), 0);

  // Action center.
  type Item = [tone: string, title: string, detail: string, href: string];
  const actions: Item[] = [];
  for (const o of orders.filter((x) => x.needsAttention)) actions.push(['bad', `Order #${o.id}: an item is not available`, 'Call the customer to swap or cancel', `/admin/orders/${o.id}`]);
  const waiting = orders.filter((o) => o.status === 'confirmed').length;
  if (waiting) actions.push(['info', `${waiting} orders waiting for sellers`, 'Sellers accept them in Telegram', '/admin/orders?tab=action']);
  const toShip = orders.filter((o) => o.status === 'accepted').length;
  if (toShip) actions.push(['info', `${toShip} orders ready for Bosta pickup`, 'Waybills are with the sellers', '/admin/orders?tab=ship']);
  const sellers = cat.sellers.filter((s) => !niche || s.niche === niche);
  const apps = sellers.filter((s) => s.status === 'applied').length;
  if (apps) actions.push(['info', `${apps} seller applications`, 'Review and approve after a test order', '/admin/sellers?tab=applied']);
  const review = products.filter((p) => p.status === 'review').length;
  if (review) actions.push(['info', `${review} products to review`, 'Nothing goes live without you', '/admin/products']);
  const noTelegram = sellers.filter((s) => ['active', 'warning'].includes(s.status) && !s.telegramChatId);
  for (const s of noTelegram) actions.push(['warn', `${s.nameEn ?? s.name}: Telegram not linked`, 'They will not receive orders', `/admin/sellers/${s.id}`]);
  if (restock.length) actions.push(['warn', `${restock.length} sizes need restocking`, restock.slice(0, 2).map((x) => `${x.p.nameAr} ${x.v.label} (${x.v.stock})`).join(' · '), '/admin/products?sort=stock']);
  for (const c of Object.values(allNiches()).filter((x) => !niche || x.id === niche)) for (const pr of cat.bundleProblems(c)) actions.push(['bad', `${c.brand.nameEn}: bundle problem`, pr, '/admin/products']);
  if (blocked.length) actions.push(['bad', `${blocked.length} numbers blocked after refusals`, 'Shared across every store', '/admin/orders']);

  const greeting = (() => { const h = Number(new Date().toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Cairo' })); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; })();
  const returning = n.customers - n.newCustomers;

  return (
    <div className="dash">
      <div className="adm-top">
        <div>
          <h1>{greeting} 👋</h1>
          <p className="sub">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Cairo' })} · last {days} days compared with the {days} before{store().kind === 'memory' ? ' · demo data' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <nav className="seg" aria-label="Period">{PERIODS.map((p) => <Link key={p} href={href({ days: p })} aria-current={p === days ? 'true' : undefined}>{p} days</Link>)}</nav>
          <NicheTabs base="/admin" current={niche} extra={`days=${days}`} />
        </div>
      </div>

      <div className="hero-kpis">
        <div className="hk"><div className="hk-top"><small>Revenue</small><Delta value={delta(n.revenue, b.revenue)} /></div><b>{EGP(n.revenue)}</b><span>{EGP(b.revenue)} before</span><Sparkline values={spark('revenue')} /></div>
        <div className="hk"><div className="hk-top"><small>Gross profit</small><Delta value={delta(n.profit, b.profit)} /></div><b>{EGP(n.profit)}</b><span>{margin === null ? 'add buying prices to see margin' : `${pct(margin)} margin`}</span></div>
        <div className="hk"><div className="hk-top"><small>Orders</small><Delta value={delta(n.orders, b.orders)} /></div><b>{n.orders}</b><span>{n.units} bags sold</span><Sparkline values={spark('orders')} /></div>
        <div className="hk"><div className="hk-top"><small>Average order</small><Delta value={delta(n.aov, b.aov)} /></div><b>{n.orders ? EGP(n.aov) : '—'}</b><span>{b.orders ? `${EGP(b.aov)} before` : 'bundles and 1 kg push this up'}</span></div>
      </div>

      <div className="dash-row r-2-1">
        <section className="panel">
          <h2>Revenue per day <span className="sub">{EGP(n.revenue)} · {n.orders} orders</span></h2>
          <RevenueChart daily={d.daily} format={(x) => short(x)} />
        </section>
        <section className="panel">
          <h2>Action center <span className={`pill ${actions.length ? 'warn' : 'ok'}`}>{actions.length || 'all clear'}</span></h2>
          {actions.length ? <ul className="actions">{actions.slice(0, 8).map(([tone, t, sub, to], i) => (
            <li key={i}><Link href={to} className={`act ${tone}`}><span className="dot" /><span><b>{t}</b><small className="ar-auto">{sub}</small></span><span className="go">→</span></Link></li>
          ))}</ul> : <p className="empty">Nothing needs you right now. ☕</p>}
        </section>
      </div>

      <div className="dash-row r-3">
        <section className="panel">
          <h2>Order funnel</h2>
          <Bars rows={[
            { label: 'Placed', value: d.funnel.placed },
            { label: 'Reached the seller', value: d.funnel.reachedSeller, note: d.funnel.placed ? `${d.funnel.reachedSeller} · ${pct(d.funnel.reachedSeller / d.funnel.placed)}` : '0' },
            { label: 'Delivered', value: d.funnel.delivered, note: d.funnel.placed ? `${d.funnel.delivered} · ${pct(d.funnel.delivered / d.funnel.placed)}` : '0' },
          ]} />
          <p className="hint">{d.funnel.refused} refused at the door · {d.funnel.cancelled} cancelled{d.funnel.delivered + d.funnel.refused ? ` · delivery success ${pct(d.funnel.delivered / (d.funnel.delivered + d.funnel.refused))}` : ''}</p>
        </section>
        <section className="panel">
          <h2>Sales channels</h2>
          {d.sources.length ? <Bars rows={d.sources.map((s) => ({ label: SOURCE[s.source] ?? s.source, value: s.revenue, note: `${EGP(s.revenue)} · ${s.orders}` }))} /> : <p className="empty">No sales in this period.</p>}
          <p className="hint">WhatsApp and phone orders come from “New order”.</p>
        </section>
        <section className="panel">
          <h2>Customers</h2>
          <div className="mini-kpis two">
            <div><small>Bought</small><b>{n.customers}</b></div>
            <div><small>New</small><b>{n.newCustomers}</b></div>
            <div><small>Returning</small><b>{returning}</b></div>
            <div><small>Wallet credit owed</small><b>{EGP(owed)}</b></div>
          </div>
          <Link className="mini" href="/admin/customers?tab=away">Who to win back →</Link>
        </section>
      </div>

      <div className="dash-row r-3">
        <section className="panel">
          <h2>Top coffees <Link className="mini" href="/admin/products?sort=sold">All</Link></h2>
          {d.topProducts.length ? (
            <table className="t compact"><tbody>{d.topProducts.map((p, i) => (
              <tr key={p.id}><td className="rank">{i + 1}</td><td><Link href={`/admin/products/${p.id}`} className="ar">{p.name}</Link><small className="sub2">{p.units} bags</small></td><td className="r"><b>{EGP(p.revenue)}</b><small className="sub2">{p.profit === null ? 'no buy price' : `${EGP(p.profit)} profit`}</small></td></tr>
            ))}</tbody></table>
          ) : <p className="empty">No sales in this period.</p>}
        </section>
        <section className="panel">
          <h2>Top areas</h2>
          {d.governorates.length ? <Bars rows={d.governorates.map((g) => ({ label: <span className="ar">{g.name}</span>, value: g.revenue, note: `${g.orders} orders` }))} /> : <p className="empty">No sales in this period.</p>}
        </section>
        <section className="panel">
          <h2>Inventory <Link className="mini" href="/admin/products?sort=stock">Restock</Link></h2>
          <div className="mini-kpis two">
            <div><small>Bags in stock</small><b>{skus.reduce((s, x) => s + x.v.stock, 0)}</b></div>
            <div><small>Worth at cost</small><b>{EGP(stockValue)}</b></div>
          </div>
          {restock.length ? <ul className="mini-list">{restock.slice(0, 4).map((x) => (
            <li key={`${x.p.id}${x.v.label}`}><Link href={`/admin/products/${x.p.id}`} className="ar">{x.p.nameAr} · {x.v.label}</Link><span className={x.v.stock === 0 ? 'bad-t' : 'warn-t'}>{x.v.stock === 0 ? 'sold out' : `${x.v.stock} left${x.cover !== null ? ` · ~${x.cover}d` : ''}`}</span></li>
          ))}</ul> : <p className="hint">Every size has enough stock.</p>}
        </section>
      </div>

      <p className="foot-note">Revenue is what customers pay (after discounts, with shipping). Profit is selling minus buying price on items with a buying price. Net to the platform from delivered orders, after promos and cashback: {EGP(net)}.</p>
    </div>
  );
}
