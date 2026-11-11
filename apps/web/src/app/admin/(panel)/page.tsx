import Link from 'next/link';
import { blockedList } from '@/lib/blocklist';
import { catalog } from '@/lib/catalog';
import { allNiches, getNiche } from '@/lib/niches';
import { store } from '@/lib/store';
import { moneyOf, orderNet } from '@/lib/payouts';
import { commissionBySeller } from '@niche-engine/core';
import { totalOwed } from '@/lib/wallet';
import { EGP, NicheTabs, pct, pickNiche } from './shared';

export const metadata = { title: 'Overview' };

export default async function Overview({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  const [cat, all, blocked, owed] = await Promise.all([catalog(), store().listOrders({ limit: 100000 }), blockedList(), totalOwed(niche ?? undefined)]);
  const { sellers: SELLERS, products: PRODUCTS } = cat;
  const orders = all.filter((o) => !niche || o.niche === niche);
  const placed = orders.length;
  const live = orders.filter((o) => !['cancelled', 'refused'].includes(o.status));
  const confirmed = orders.filter((o) => !['awaiting_confirm', 'cancelled'].includes(o.status));
  const delivered = orders.filter((o) => o.status === 'delivered');
  const refused = orders.filter((o) => o.status === 'refused');
  const gmv = live.reduce((a, o) => a + o.quote.subtotal - o.quote.bundleDiscount - o.quote.promoDiscount, 0);
  const commission = delivered.reduce((a, o) => a + Object.values(commissionBySeller(moneyOf(o), getNiche(o.niche)!)).reduce((x, y) => x + y, 0), 0);
  const returnFee = 45; // assumed Bosta return cost per refusal until the real rate is known
  const net = delivered.reduce((a, o) => a + orderNet(o, getNiche(o.niche)!), 0) - refused.length * returnFee;

  type Alert = [color: string, title: string, detail: string, href: string, cta: string];
  const alerts: Alert[] = [];
  for (const o of orders.filter((x) => x.needsAttention)) alerts.push(['var(--a-bad)', `Order #${o.id}: a seller marked an item not available`, 'Call the customer: replace the item or cancel that part', `/admin/orders?filter=attention`, 'Open']);
  const waiting = orders.filter((o) => o.status === 'confirmed');
  if (waiting.length) alerts.push(['var(--a-info)', `${waiting.length} orders waiting for sellers to accept`, 'Sellers have the order in Telegram', '/admin/orders?filter=action', 'Open']);
  const unconfirmed = orders.filter((o) => o.status === 'awaiting_confirm');
  if (unconfirmed.length) alerts.push(['var(--a-warn)', `${unconfirmed.length} orders not confirmed on WhatsApp`, 'They never reach sellers until confirmed', '/admin/orders?filter=action', 'Open']);
  const nicheSellers = SELLERS.filter((s) => !niche || s.niche === niche);
  const apps = nicheSellers.filter((s) => s.status === 'applied');
  const review = PRODUCTS.filter((p) => p.status === 'review' && (!niche || p.niche === niche));
  if (apps.length || review.length) alerts.push(['var(--a-info)', `${apps.length} seller applications · ${review.length} products to review`, 'Nothing goes live without your approval', '/admin/products', 'Review']);
  for (const s of nicheSellers.filter((x) => x.status === 'warning')) alerts.push(['var(--a-warn)', `${s.name} is on warning`, 'Slow hand-over or high rejection rate', '/admin/sellers', 'Seller']);
  const low = PRODUCTS.filter((p) => (p.status ?? 'live') === 'live' && (!niche || p.niche === niche)).flatMap((p) => p.variants.filter((v) => v.stock > 0 && v.stock <= 3).map((v) => `${p.nameAr} · ${v.label} (${v.stock})`));
  if (low.length) alerts.push(['var(--a-warn)', `${low.length} sizes almost sold out`, low.slice(0, 3).join(' — '), '/admin/products', 'Stock']);
  for (const c of Object.values(allNiches()).filter((x) => !niche || x.id === niche)) for (const pr of cat.bundleProblems(c)) alerts.push(['var(--a-bad)', `${c.brand.nameEn} bundle problem`, pr, '/admin/products', 'Fix']);
  if (blocked.length) alerts.push(['var(--a-bad)', `${blocked.length} phone numbers blocked after refusals`, 'Shared across every niche', '/admin/orders?filter=refused', 'View']);

  return (
    <>
      <div className="adm-top">
        <div><h1>Overview</h1><p className="sub">All orders in the system{store().kind === 'memory' ? ' · demo data (no database connected)' : ''}</p></div>
        <NicheTabs base="/admin" current={niche} />
      </div>
      <div className="kpis">
        <div className="kpi"><small>Sales value (GMV)</small><b>{EGP(gmv)}</b><span>{live.length} orders, after discounts</span></div>
        <div className="kpi"><small>Commission earned</small><b>{EGP(commission)}</b><span>delivered orders only</span></div>
        <div className="kpi"><small>Net to platform</small><b>{EGP(net)}</b><span>after promos, cashback, refusals</span></div>
        <div className="kpi"><small>WhatsApp confirm rate</small><b>{placed ? pct(confirmed.length / placed) : '—'}</b><span>target above 85%</span></div>
        <div className="kpi"><small>Delivery success</small><b>{delivered.length + refused.length ? pct(delivered.length / (delivered.length + refused.length)) : '—'}</b><span>{delivered.length} delivered · {refused.length} refused</span></div>
        <div className="kpi"><small>Wallet credit owed</small><b>{EGP(owed)}</b><span>customers can still spend this</span></div>
        <div className="kpi"><small>Average order</small><b>{live.length ? EGP(gmv / live.length) : '—'}</b><span>bundles push this up</span></div>
      </div>
      <div className="cols">
        <section className="panel">
          <h2>Needs attention <span className={`pill ${alerts.length ? 'warn' : 'ok'}`}>{alerts.length}</span></h2>
          <div className="alerts">
            {alerts.length ? alerts.map(([c, t, d, href, cta], i) => (
              <div className="alert" key={i} style={{ '--c': c } as React.CSSProperties}><div><b>{t}</b><small className="ar" style={{ textAlign: 'left' }}>{d}</small></div><Link className="mini" href={href}>{cta}</Link></div>
            )) : <p className="empty">All clear.</p>}
          </div>
        </section>
        <section className="panel">
          <h2>Niches</h2>
          <div className="tbl"><table className="t" style={{ minWidth: 380 }}>
            <thead><tr><th>Niche</th><th>Status</th><th className="r">Sellers</th><th className="r">Live products</th><th className="r">Orders</th></tr></thead>
            <tbody>{Object.values(allNiches()).map((c) => (
              <tr key={c.id}>
                <td><b>{c.brand.nameEn}</b> <span className="ar sub">{c.brand.nameAr}</span></td>
                <td><span className={`pill ${c.status === 'live' ? 'ok' : 'mute'}`}>{c.status}</span></td>
                <td className="r">{SELLERS.filter((s) => s.niche === c.id && ['active', 'warning'].includes(s.status)).length}</td>
                <td className="r">{PRODUCTS.filter((p) => p.niche === c.id && (p.status ?? 'live') === 'live').length}</td>
                <td className="r">{all.filter((o) => o.niche === c.id).length}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      </div>
    </>
  );
}
