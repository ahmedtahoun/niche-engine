import Link from 'next/link';
import { blockedList } from '@/lib/blocklist';
import type { Order } from '@/lib/orders';
import { customerKey } from '@/lib/session';
import { store } from '@/lib/store';
import { unblockPhone } from '../../actions';
import { ago, EGP, NicheTabs, Pill, pct, pickNiche, STATUS } from '../shared';
import { OrderActions } from './OrderActions';

export const metadata = { title: 'Orders' };

const TABS: [string, string, (o: Order) => boolean][] = [
  ['all', 'All', () => true],
  ['action', 'Needs action', (o) => ['awaiting_confirm', 'confirmed'].includes(o.status) || Boolean(o.needsAttention)],
  ['ship', 'To ship', (o) => o.status === 'accepted'],
  ['courier', 'With courier', (o) => o.status === 'picked'],
  ['delivered', 'Delivered', (o) => o.status === 'delivered'],
  ['problems', 'Refused · cancelled', (o) => ['refused', 'cancelled'].includes(o.status)],
];
const BOUGHT = new Set(['confirmed', 'accepted', 'picked', 'delivered']);
const SOURCE: Record<string, string> = { whatsapp: 'WhatsApp', phone: 'Phone', instagram: 'Instagram', facebook: 'Facebook', other: 'Manual' };

export default async function Orders({ searchParams }: { searchParams: Promise<{ niche?: string; tab?: string; q?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const tab = TABS.find((f) => f[0] === sp.tab) ?? TABS[0];
  const q = (sp.q ?? '').trim();
  const [base, blocked] = await Promise.all([store().listOrders({ niche: niche ?? undefined, limit: 3000 }), blockedList()]);
  const needle = q.replace(/^#/, '').toLowerCase();
  const digits = needle.replace(/\D/g, '');
  const match = (o: Order) => !needle || String(o.id) === needle || (digits.length >= 4 && o.customer.phone.includes(digits)) || o.customer.name.toLowerCase().includes(needle);
  const rows = base.filter((o) => tab[2](o) && match(o));
  const href = (o: { tab?: string }) => `/admin/orders?${new URLSearchParams({ ...(niche ? { niche } : {}), ...((o.tab ?? tab[0]) !== 'all' ? { tab: o.tab ?? tab[0] } : {}), ...(q ? { q } : {}) })}`;

  const now = Date.now();
  const since = (d: number) => base.filter((o) => now - Date.parse(o.createdAt) < d * 864e5);
  const today = base.filter((o) => new Date(o.createdAt).toDateString() === new Date(now).toDateString());
  const week = since(7).filter((o) => BOUGHT.has(o.status));
  const month = since(30);
  const done = month.filter((o) => o.status === 'delivered').length, refused = month.filter((o) => o.status === 'refused').length;
  const action = base.filter(TABS[1][2]).length;

  return (
    <>
      <div className="adm-top">
        <div><h1>Orders</h1><p className="sub">Click an order for items, customer, address and delivery. Bosta updates move orders automatically once connected.</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <NicheTabs base="/admin/orders" current={niche} />
          <Link href="/admin/orders/new" className="btn-save" style={{ textDecoration: 'none' }}>＋ New order</Link>
        </div>
      </div>
      <div className="kpis">
        <div className="kpi"><small>Today</small><b>{today.length} orders</b><span>{EGP(today.filter((o) => BOUGHT.has(o.status)).reduce((n, o) => n + o.quote.total, 0))}</span></div>
        <div className="kpi"><small>Last 7 days</small><b>{EGP(week.reduce((n, o) => n + o.quote.total, 0))}</b><span>{week.length} orders · avg {week.length ? EGP(week.reduce((n, o) => n + o.quote.total, 0) / week.length) : '—'}</span></div>
        <div className="kpi"><small>Needs action</small><b style={{ color: action ? 'var(--a-warn)' : undefined }}>{action}</b><span>to confirm, or a seller said not available</span></div>
        <div className="kpi"><small>Delivery rate · 30 days</small><b>{done + refused ? pct(done / (done + refused)) : '—'}</b><span>{done} delivered · {refused} refused</span></div>
      </div>
      <section className="panel flush">
        <div className="tools">
          <nav className="seg" aria-label="Status">
            {TABS.map(([k, label, fn]) => <Link key={k} href={href({ tab: k })} aria-current={tab[0] === k ? 'true' : undefined}>{label} <span className="n">{base.filter(fn).length}</span></Link>)}
          </nav>
          <form className="search" action="/admin/orders">
            {niche && <input type="hidden" name="niche" value={niche} />}
            {tab[0] !== 'all' && <input type="hidden" name="tab" value={tab[0]} />}
            <input name="q" defaultValue={q} placeholder="Order #, phone or name…" aria-label="Search orders" />
          </form>
        </div>
        <div className="tbl"><table className="t plist">
          <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th className="r">Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((o) => {
              const units = o.items.reduce((n, i) => n + i.qty, 0);
              return (
                <tr key={o.id} className={`row-link${o.needsAttention ? ' attn' : ''}`}>
                  <td><Link href={`/admin/orders/${o.id}`} className="stretch-link"><b>#{o.id}</b></Link><small className="sub2">{ago(o.createdAt)}</small></td>
                  <td><Link href={`/admin/customers/${customerKey(o.customer.phone)}`} className="above ar"><b>{o.customer.name}</b></Link><small className="sub2"><span dir="ltr">{o.customer.phone}</span> · <span className="ar">{o.customer.governorate}</span>{o.type === 'repeat' ? ' · repeat' : ''}{o.source && o.source !== 'web' ? <span className="src"> · {SOURCE[o.source]}</span> : null}</small></td>
                  <td><span className="ar">{o.quote.lines[0]?.title}</span><small className="sub2">{units} {units === 1 ? 'item' : 'items'}{o.quote.lines.length > 1 ? ` · +${o.quote.lines.length - 1} more` : ''}</small></td>
                  <td className="r"><b>{EGP(o.quote.total)}</b><small className="sub2">{o.payment === 'cod' ? 'cash on delivery' : 'InstaPay'}{o.promoCode ? ` · ${o.promoCode}` : ''}</small></td>
                  <td><Pill kind={STATUS[o.status][1]}>{STATUS[o.status][0]}</Pill>{o.needsAttention && <small className="sub2 bad-t">{o.needsAttention}</small>}</td>
                  <td className="r"><div className="above"><OrderActions o={o} compact /></div></td>
                </tr>
              );
            })}
          </tbody>
        </table></div>
        {!rows.length && <p className="empty" style={{ padding: 16 }}>{q ? `No orders match “${q}”.` : 'No orders here.'}</p>}
      </section>
      {blocked.length > 0 && (
        <section className="panel">
          <h2>Blocked phone numbers <span className="sub">shared across all niches</span></h2>
          <div className="tbl"><table className="t" style={{ minWidth: 380 }}>
            <tbody>{blocked.map((b) => (
              <tr key={b.phone}><td dir="ltr">{b.phone}</td><td>{b.refusals} refused deliveries</td><td><form action={unblockPhone.bind(null, b.phone)}><button className="mini">Unblock</button></form></td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
