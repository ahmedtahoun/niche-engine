import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { cycleFrom } from '@/lib/payouts';
import { matches } from '@/lib/smart-search';
import { store } from '@/lib/store';
import type { Seller } from '@/lib/types';
import { approveSellerAction, setSellerStatus } from '../../actions';
import { EGP, NicheTabs, Pill, pickNiche, SSTAT } from '../shared';

export const metadata = { title: 'Sellers' };

const TABS: [string, string, (s: Seller) => boolean][] = [
  ['active', 'Active', (s) => s.status === 'active' || s.status === 'warning'],
  ['applied', 'Applications', (s) => s.status === 'applied'],
  ['paused', 'Paused · declined', (s) => s.status === 'suspended' || s.status === 'declined'],
  ['all', 'All', () => true],
];

export default async function Sellers({ searchParams }: { searchParams: Promise<{ niche?: string; tab?: string; q?: string; done?: string; name?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const tab = TABS.find((t) => t[0] === sp.tab) ?? TABS[0];
  const q = (sp.q ?? '').trim();
  const [cat, orders] = await Promise.all([catalog(), store().listOrders({ niche: niche ?? undefined, limit: 5000 })]);
  const list = cat.sellers.filter((s) => !niche || s.niche === niche);
  const rows = list.filter((s) => tab[2](s) && matches(q, { text: `${s.name} ${s.nameEn ?? ''} ${s.ownerName ?? ''} ${s.area}`, phone: s.contactPhone }));
  const delivered = orders.filter((o) => o.status === 'delivered');
  const since = Date.now() - 30 * 864e5;
  const stat = (sid: string) => {
    const mine = orders.filter((o) => sid in o.sellerState && o.status !== 'cancelled');
    const decided = mine.filter((o) => o.sellerState[sid] !== 'pending');
    const rejected = mine.filter((o) => o.sellerState[sid] === 'rejected').length;
    const recent = mine.filter((o) => Date.parse(o.createdAt) >= since && !['refused', 'awaiting_confirm'].includes(o.status));
    const revenue = recent.reduce((n, o) => n + o.items.filter((i) => i.sellerId === sid).reduce((a, i) => a + i.unitPrice * i.qty, 0), 0);
    return { orders: mine.length, recent: recent.length, revenue, rejectRate: decided.length ? rejected / decided.length : 0 };
  };
  const href = (o: { tab?: string }) => `/admin/sellers?${new URLSearchParams({ ...(niche ? { niche } : {}), tab: o.tab ?? tab[0], ...(q ? { q } : {}) })}`;

  return (
    <>
      <div className="adm-top">
        <div><h1>Sellers</h1><p className="sub">Click a seller to edit their details, status and payouts. Approve new ones after a good test order.</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <NicheTabs base="/admin/sellers" current={niche} />
          <Link href={`/admin/sellers/new${niche ? `?niche=${niche}` : ''}`} className="btn-save" style={{ textDecoration: 'none' }}>＋ New seller</Link>
        </div>
      </div>
      {sp.done && <div className="toast">{sp.done === 'deleted' ? `Deleted “${sp.name ?? ''}”.` : `“${sp.name ?? ''}” has products or orders, so they were paused (archived) to keep history. Their products left the store.`}</div>}
      <section className="panel flush">
        <div className="tools">
          <nav className="seg" aria-label="Group">
            {TABS.map(([k, label, fn]) => <Link key={k} href={href({ tab: k })} aria-current={tab[0] === k ? 'true' : undefined}>{label} <span className="n">{list.filter(fn).length}</span></Link>)}
          </nav>
          <form className="search" action="/admin/sellers">
            {niche && <input type="hidden" name="niche" value={niche} />}
            <input type="hidden" name="tab" value={tab[0]} />
            <input name="q" defaultValue={q} placeholder="Name, owner, phone or area…" aria-label="Search sellers" />
          </form>
        </div>
        <div className="tbl"><table className="t plist">
          <thead><tr><th>Seller</th><th>Status</th><th className="r">Products</th><th className="r">Orders · 30d</th><th className="r">Sales · 30d</th><th className="r">Rejection</th><th className="r">Due Thursday</th><th></th></tr></thead>
          <tbody>{rows.map((s) => {
            const st = stat(s.id);
            const cfg = getNiche(s.niche)!;
            const c = cycleFrom(s.id, delivered, cfg);
            const live = cat.products.filter((p) => p.sellerId === s.id && (p.status ?? 'live') === 'live').length;
            return (
              <tr key={s.id} className="row-link">
                <td><Link href={`/admin/sellers/${s.id}`} className="pinfo stretch">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {s.logo ? <img className="thumb round" src={s.logo} alt="" /> : <span className="thumb none round">{s.name.slice(0, 1)}</span>}
                  <span><b className="ar">{s.name}</b><small>{[s.nameEn, s.ownerName, cfg.brand.nameEn].filter(Boolean).join(' · ')}</small></span>
                </Link></td>
                <td><Pill kind={SSTAT[s.status][1]}>{SSTAT[s.status][0]}</Pill>{!s.telegramChatId && s.status !== 'declined' && <small className="sub2 warn-t">Telegram not linked</small>}</td>
                <td className="r">{live}<small className="sub2">on sale</small></td>
                <td className="r">{st.recent}</td>
                <td className="r">{st.revenue ? EGP(st.revenue) : <span className="sub">—</span>}</td>
                <td className="r"><span className={st.rejectRate > 0.1 ? 'bad-t' : ''}>{st.orders ? `${Math.round(st.rejectRate * 100)}%` : '—'}</span></td>
                <td className="r">{c.payable ? EGP(c.payable) : <span className="sub">—</span>}{c.reserveHeld ? <small className="sub2">{EGP(c.reserveHeld)} held</small> : null}</td>
                <td className="r"><div className="acts above">
                  {s.status === 'applied' && <><form action={approveSellerAction.bind(null, s.id)}><button className="mini pri">Approve</button></form><form action={setSellerStatus.bind(null, s.id, 'declined')}><button className="mini danger">Decline</button></form></>}
                  <Link className="mini" href={`/admin/sellers/${s.id}`}>Edit</Link>
                </div></td>
              </tr>
            );
          })}</tbody>
        </table></div>
        {!rows.length && <p className="empty" style={{ padding: 16 }}>{q ? `No sellers match “${q}”.` : tab[0] === 'applied' ? 'No applications waiting. New sellers apply through the Telegram bot.' : 'No sellers here.'}</p>}
      </section>
    </>
  );
}
