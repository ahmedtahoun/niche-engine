import Link from 'next/link';
import { notFound } from 'next/navigation';
import { accountByPhone, hasPassword } from '@/lib/customers';
import { customers, daysSince } from '@/lib/customer-stats';
import { getNiche } from '@/lib/niches';
import { customerKey } from '@/lib/session';
import { waLink } from '@/lib/site';
import { store } from '@/lib/store';
import { walletOf } from '@/lib/wallet';
import { dayAgo, EGP, Pill, STATUS, pct } from '../../shared';

export const metadata = { title: 'Customer' };

export default async function CustomerPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const all = await store().listOrders({ limit: 5000 });
  const c = customers(all, customerKey).find((x) => x.key === key);
  if (!c) notFound();
  const orders = all.filter((o) => o.customer.phone === c.phone).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const niche = orders[0].niche;
  const cfg = getNiche(niche);
  const [account, wallet] = await Promise.all([accountByPhone(c.phone), walletOf(c.phone, niche)]);
  const choice = (v: string) => cfg?.choices?.flatMap((x) => x.values).find((x) => x.id === v)?.labelEn ?? v;
  const finished = c.delivered + c.refused;
  const greeting = `أهلاً ${c.name.split(' ')[0]}، معاك ${cfg?.brand.nameAr ?? ''} ☕`;

  return (
    <div className="editor">
      <div className="ed-bar">
        <Link href="/admin/customers" className="back" aria-label="Back to customers">←</Link>
        <div className="ed-title">
          <h1 className="ar">{c.name}</h1>
          <span className="sub"><span dir="ltr">{c.phone}</span> · <span className="ar">{c.governorate}</span> · {hasPassword(account) ? 'has an account' : 'guest'} · customer since {new Date(c.firstAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
        </div>
        <Link className="mini" href={`/admin/orders/new?niche=${niche}&customer=${c.key}`} style={{ textDecoration: 'none', padding: '9px 14px' }}>＋ New order</Link>
        <a className="wa-btn inline" href={waLink(c.phone, greeting)} target="_blank" rel="noreferrer">💬 WhatsApp</a>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Orders</small><b>{c.orders}</b><span>{c.cancelled ? `${c.cancelled} cancelled` : 'none cancelled'}</span></div>
        <div className="kpi"><small>Spent</small><b>{EGP(c.spent)}</b><span>{c.orders ? `avg ${EGP(c.spent / c.orders)} per order` : '—'}</span></div>
        <div className="kpi"><small>Last order</small><b style={{ textTransform: 'capitalize' }}>{dayAgo(c.lastAt)}</b><span>{new Date(c.lastAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span></div>
        <div className="kpi"><small>Delivery</small><b>{finished ? pct(c.delivered / finished) : '—'}</b><span>{c.delivered} delivered · {c.refused} refused</span></div>
        <div className="kpi"><small>Wallet credit</small><b>{EGP(wallet.balance)}</b><span>cashback to spend</span></div>
      </div>

      <div className="ed-grid">
        <div className="ed-main">
          <section className="panel">
            <h2>Orders</h2>
            <div className="tbl"><table className="t plist" style={{ minWidth: 560 }}>
              <thead><tr><th>Order</th><th>Items</th><th className="r">Total</th><th>Status</th></tr></thead>
              <tbody>{orders.map((o) => (
                <tr key={o.id} className="row-link">
                  <td><Link href={`/admin/orders/${o.id}`} className="stretch-link"><b>#{o.id}</b></Link><small className="sub2">{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</small></td>
                  <td className="ar">{o.quote.lines.map((l) => l.title).join(' + ')}</td>
                  <td className="r">{EGP(o.quote.total)}</td>
                  <td><Pill kind={STATUS[o.status][1]}>{STATUS[o.status][0]}</Pill></td>
                </tr>
              ))}</tbody>
            </table></div>
          </section>
        </div>
        <aside className="ed-side">
          <section className="panel">
            <h2>Likes</h2>
            <dl className="facts-dl">
              <div><dt>Favourite</dt><dd className="ar">{c.favorite ? `${c.favorite.name} × ${c.favorite.units}` : '—'}</dd></div>
              <div><dt>Brews with</dt><dd>{c.topChoice ? choice(c.topChoice.value) : '—'}</dd></div>
            </dl>
          </section>
          <section className="panel">
            <h2>Latest address</h2>
            <p className="ar addr">{[c.governorate, c.area, c.address].filter(Boolean).join('، ')}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
