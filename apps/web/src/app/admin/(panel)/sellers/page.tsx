import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { cycleFrom } from '@/lib/payouts';
import { store } from '@/lib/store';
import { approveSellerAction, setSellerStatus } from '../../actions';
import { EGP, NicheTabs, Pill, pickNiche } from '../shared';

export const metadata = { title: 'Sellers' };

const SSTAT: Record<string, [string, string]> = { applied: ['Applied', 'info'], active: ['Active', 'ok'], warning: ['Warning', 'warn'], suspended: ['Suspended', 'bad'], declined: ['Declined', 'mute'] };

export default async function Sellers({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  const [cat, orders] = await Promise.all([catalog(), store().listOrders({ niche: niche ?? undefined, limit: 100000 })]);
  const delivered = orders.filter((o) => o.status === 'delivered');
  const list = cat.sellers.filter((s) => !niche || s.niche === niche);
  const apps = list.filter((s) => s.status === 'applied');
  const rest = list.filter((s) => s.status !== 'applied');
  const stat = (sid: string) => {
    const mine = orders.filter((o) => sid in o.sellerState && o.status !== 'cancelled');
    const decided = mine.filter((o) => o.sellerState[sid] !== 'pending');
    const rejected = mine.filter((o) => o.sellerState[sid] === 'rejected').length;
    return { orders: mine.length, rejectRate: decided.length ? rejected / decided.length : 0 };
  };
  const btn = (id: string, status: Parameters<typeof setSellerStatus>[1], label: string, cls = 'mini') => <form action={setSellerStatus.bind(null, id, status)}><button className={cls}>{label}</button></form>;

  return (
    <>
      <div className="adm-top">
        <div><h1>Sellers</h1><p className="sub">Approve only after you checked their Instagram and a test order arrived well.</p></div>
        <NicheTabs base="/admin/sellers" current={niche} />
      </div>
      <section className="panel">
        <h2>Applications <Pill kind={apps.length ? 'info' : 'mute'}>{apps.length}</Pill></h2>
        {apps.length ? (
          <div className="tbl"><table className="t">
            <thead><tr><th>Store</th><th>Niche</th><th>Instagram</th><th>Area</th><th>Weekly capacity</th><th>InstaPay</th><th></th></tr></thead>
            <tbody>{apps.map((s) => (
              <tr key={s.id}>
                <td className="ar"><b>{s.name}</b></td><td>{getNiche(s.niche)?.brand.nameEn}</td>
                <td>{s.instagram ? <a href={`https://instagram.com/${s.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer">{s.instagram}</a> : '—'}</td>
                <td className="ar">{s.area}</td><td>{s.capacity ?? '—'}</td><td>{s.instapay ?? '—'}</td>
                <td><div className="acts"><form action={approveSellerAction.bind(null, s.id)}><button className="mini pri">Approve</button></form>{btn(s.id, 'declined', 'Decline', 'mini danger')}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty">No applications waiting. New sellers apply through the Telegram bot.</p>}
      </section>
      <section className="panel">
        <h2>All sellers</h2>
        <div className="tbl"><table className="t">
          <thead><tr><th>Seller</th><th>Niche</th><th>Area</th><th className="r">Products</th><th className="r">Orders</th><th className="r">Rejection rate</th><th className="r">Rating</th><th className="r">Due Thursday</th><th className="r">Reserve held</th><th>Status</th><th></th></tr></thead>
          <tbody>{rest.map((s) => {
            const st = stat(s.id);
            const cfg = getNiche(s.niche)!;
            const c = cycleFrom(s.id, delivered, cfg);
            return (
              <tr key={s.id}>
                <td className="ar"><b>{s.name}</b></td><td>{cfg.brand.nameEn}</td><td className="ar">{s.area}</td>
                <td className="r">{cat.products.filter((p) => p.sellerId === s.id).length}</td>
                <td className="r">{st.orders}</td>
                <td className="r" style={{ color: st.rejectRate > 0.1 ? 'var(--a-bad)' : undefined }}>{Math.round(st.rejectRate * 100)}%</td>
                <td className="r">{s.rating || '—'}</td>
                <td className="r">{EGP(c.payable)}</td><td className="r">{EGP(c.reserveHeld)}</td>
                <td><Pill kind={SSTAT[s.status][1]}>{SSTAT[s.status][0]}</Pill></td>
                <td><div className="acts">
                  {s.status === 'active' && btn(s.id, 'warning', 'Warn')}
                  {(s.status === 'active' || s.status === 'warning') && btn(s.id, 'suspended', 'Suspend', 'mini danger')}
                  {(s.status === 'suspended' || s.status === 'warning') && btn(s.id, 'active', 'Reactivate')}
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </>
  );
}
