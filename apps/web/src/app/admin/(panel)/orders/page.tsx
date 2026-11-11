import Link from 'next/link';
import { blockedList } from '@/lib/blocklist';
import { SELLERS } from '@/lib/demo-data';
import { allOrders, type Order } from '@/lib/orders';
import { clearAttention, moveOrder, unblockPhone } from '../../actions';
import { ago, EGP, NicheTabs, Pill, pickNiche, STATUS } from '../shared';

export const metadata = { title: 'Orders' };

const FILTERS: [string, string, (o: Order) => boolean][] = [
  ['all', 'All', () => true],
  ['action', 'Needs action', (o) => ['awaiting_confirm', 'confirmed'].includes(o.status) || Boolean(o.needsAttention)],
  ['attention', 'Seller rejected', (o) => Boolean(o.needsAttention)],
  ['transit', 'In transit', (o) => ['accepted', 'picked'].includes(o.status)],
  ['delivered', 'Delivered', (o) => o.status === 'delivered'],
  ['refused', 'Refused / cancelled', (o) => ['refused', 'cancelled'].includes(o.status)],
];
const PART: Record<string, [string, string]> = { pending: ['waiting', 'warn'], accepted: ['accepted', 'info'], rejected: ['not available', 'bad'], handed: ['handed over', 'ok'] };

function Actions({ o }: { o: Order }) {
  const b = (move: Parameters<typeof moveOrder>[1], label: string, cls = 'mini') => (
    <form action={moveOrder.bind(null, o.id, move)}><button className={cls}>{label}</button></form>
  );
  return (
    <div className="acts">
      {o.status === 'accepted' && b('picked', 'Bosta: picked up')}
      {o.status === 'picked' && b('delivered', 'Bosta: delivered', 'mini pri')}
      {o.status === 'picked' && b('refused', 'Refused', 'mini danger')}
      {['awaiting_confirm', 'confirmed'].includes(o.status) && b('cancelled', 'Cancel', 'mini danger')}
      {o.needsAttention && <form action={clearAttention.bind(null, o.id)}><button className="mini">Resolved</button></form>}
    </div>
  );
}

export default async function Orders({ searchParams }: { searchParams: Promise<{ niche?: string; filter?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const filter = FILTERS.find((f) => f[0] === sp.filter) ?? FILTERS[0];
  const base = allOrders().filter((o) => !niche || o.niche === niche);
  const rows = base.filter(filter[2]);
  const name = (sid: string) => SELLERS.find((s) => s.id === sid)?.name ?? sid;
  const blocked = blockedList();
  return (
    <>
      <div className="adm-top">
        <div><h1>Orders</h1><p className="sub">Every shipment runs through your Bosta account. Until the Bosta webhook is connected, update delivery here.</p></div>
        <NicheTabs base="/admin/orders" current={niche} extra={filter[0] !== 'all' ? `filter=${filter[0]}` : ''} />
      </div>
      <nav className="adm-tabs" aria-label="Filter">
        {FILTERS.map(([k, label, fn]) => (
          <Link key={k} href={`/admin/orders?${new URLSearchParams({ ...(niche ? { niche } : {}), ...(k !== 'all' ? { filter: k } : {}) })}`} aria-current={filter[0] === k ? 'true' : undefined}>{label} · {base.filter(fn).length}</Link>
        ))}
      </nav>
      <section className="panel">
        <div className="tbl"><table className="t">
          <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Sellers</th><th className="r">Customer pays</th><th>Type</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} style={o.needsAttention ? { background: 'var(--a-bad-soft)' } : undefined}>
                <td><b>#{o.id}</b><br /><span className="sub">{o.niche}</span></td>
                <td className="sub">{ago(o.createdAt)}</td>
                <td><span className="ar">{o.customer.name}</span><br /><span className="sub">{o.customer.phone} · <span className="ar">{o.customer.governorate}</span></span></td>
                <td>{Object.entries(o.sellerState).map(([sid, part]) => (
                  <div key={sid} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}><span className="ar">{name(sid)}</span><Pill kind={PART[part][1]}>{PART[part][0]}</Pill>{o.shipments?.[sid] && <span className="sub">{o.shipments[sid].tracking} · COD {EGP(o.shipments[sid].cod)} · {o.shipments[sid].status}</span>}</div>
                ))}</td>
                <td className="r">{EGP(o.quote.total)}{o.promoCode ? <><br /><span className="sub">{o.promoCode}</span></> : null}</td>
                <td>{o.type}</td>
                <td><Pill kind={STATUS[o.status][1]}>{STATUS[o.status][0]}</Pill></td>
                <td><Actions o={o} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} className="empty">No orders here.</td></tr>}
          </tbody>
        </table></div>
      </section>
      {blocked.length > 0 && (
        <section className="panel">
          <h2>Blocked phone numbers <span className="sub">shared across all niches</span></h2>
          <div className="tbl"><table className="t" style={{ minWidth: 380 }}>
            <tbody>{blocked.map((b) => (
              <tr key={b.phone}><td>{b.phone}</td><td>{b.reason}</td><td><form action={unblockPhone.bind(null, b.phone)}><button className="mini">Unblock</button></form></td></tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
    </>
  );
}
