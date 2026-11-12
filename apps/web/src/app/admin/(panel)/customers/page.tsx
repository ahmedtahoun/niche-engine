import Link from 'next/link';
import { customers, daysSince, type CustomerRow } from '@/lib/customer-stats';
import { allNiches } from '@/lib/niches';
import { customerKey } from '@/lib/session';
import { waLink } from '@/lib/site';
import { store } from '@/lib/store';
import { dayAgo, EGP, NicheTabs, pct, pickNiche } from '../shared';

export const metadata = { title: 'Customers' };

const AWAY = 30; // days without an order before a repeat customer counts as "not back"
const TABS: [string, string, (c: CustomerRow) => boolean][] = [
  ['all', 'All', () => true],
  ['repeat', 'Repeat', (c) => c.orders >= 2],
  ['once', 'One order', (c) => c.orders === 1],
  ['away', `Not back in ${AWAY}+ days`, (c) => c.orders >= 1 && daysSince(c.lastAt) >= AWAY],
  ['refused', 'Refused a delivery', (c) => c.refused > 0],
];
const SORTS = [['spent', 'Top spend'], ['recent', 'Recent'], ['orders', 'Most orders']] as const;

export default async function Customers({ searchParams }: { searchParams: Promise<{ niche?: string; tab?: string; sort?: string; q?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const tab = TABS.find((t) => t[0] === sp.tab) ?? TABS[0];
  const sort = SORTS.find(([k]) => k === sp.sort)?.[0] ?? 'spent';
  const q = (sp.q ?? '').trim().toLowerCase();
  const all = customers(await store().listOrders({ niche: niche ?? undefined, limit: 5000 }), customerKey);
  const digits = q.replace(/\D/g, '');
  const rows = all.filter((c) => tab[2](c) && (!q || c.name.toLowerCase().includes(q) || (digits.length >= 4 && c.phone.includes(digits))))
    .sort((a, b) => sort === 'recent' ? b.lastAt.localeCompare(a.lastAt) : sort === 'orders' ? b.orders - a.orders || b.spent - a.spent : b.spent - a.spent);
  const href = (o: { tab?: string; sort?: string }) => `/admin/customers?${new URLSearchParams({ ...(niche ? { niche } : {}), ...((o.tab ?? tab[0]) !== 'all' ? { tab: o.tab ?? tab[0] } : {}), sort: o.sort ?? sort, ...(sp.q ? { q: sp.q } : {}) })}`;
  const buyers = all.filter((c) => c.orders > 0);
  const repeat = buyers.filter((c) => c.orders >= 2).length;
  const fresh = all.filter((c) => daysSince(c.firstAt) < 30).length;
  const spent = buyers.reduce((n, c) => n + c.spent, 0);
  const choiceValues = Object.values(allNiches()).flatMap((n) => n.choices ?? []).flatMap((x) => x.values);
  const choice = (v: string) => choiceValues.find((x) => x.id === v)?.labelEn ?? v;

  return (
    <>
      <div className="adm-top">
        <div><h1>Customers</h1><p className="sub">Everyone who ordered, by phone number: what they spend, what they like, and who to win back.</p></div>
        <NicheTabs base="/admin/customers" current={niche} />
      </div>
      <div className="kpis">
        <div className="kpi"><small>Customers</small><b>{all.length}</b><span>{fresh} new in 30 days</span></div>
        <div className="kpi"><small>Repeat rate</small><b>{buyers.length ? pct(repeat / buyers.length) : '—'}</b><span>{repeat} of {buyers.length} ordered again</span></div>
        <div className="kpi"><small>Average spend</small><b>{buyers.length ? EGP(spent / buyers.length) : '—'}</b><span>per customer, all time</span></div>
        <div className="kpi"><small>Not back in {AWAY}+ days</small><b>{all.filter(TABS[3][2]).length}</b><span>message them a reason to reorder</span></div>
      </div>
      <section className="panel flush">
        <div className="tools">
          <nav className="seg" aria-label="Group">
            {TABS.map(([k, label, fn]) => <Link key={k} href={href({ tab: k })} aria-current={tab[0] === k ? 'true' : undefined}>{label} <span className="n">{all.filter(fn).length}</span></Link>)}
          </nav>
          <form className="search" action="/admin/customers">
            {niche && <input type="hidden" name="niche" value={niche} />}
            {tab[0] !== 'all' && <input type="hidden" name="tab" value={tab[0]} />}
            <input type="hidden" name="sort" value={sort} />
            <input name="q" defaultValue={sp.q ?? ''} placeholder="Name or phone…" aria-label="Search customers" />
          </form>
          <nav className="seg" aria-label="Sort">
            {SORTS.map(([k, label]) => <Link key={k} href={href({ sort: k })} aria-current={sort === k ? 'true' : undefined}>{label}</Link>)}
          </nav>
        </div>
        <div className="tbl"><table className="t plist">
          <thead><tr><th>Customer</th><th className="r">Orders</th><th className="r">Spent</th><th>Last order</th><th>Likes</th><th></th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.key} className="row-link">
              <td><Link href={`/admin/customers/${c.key}`} className="stretch-link ar"><b>{c.name}</b></Link><small className="sub2"><span dir="ltr">{c.phone}</span> · <span className="ar">{c.governorate}</span>{c.refused ? <span className="bad-t"> · {c.refused} refused</span> : null}</small></td>
              <td className="r"><b>{c.orders}</b>{c.orders >= 2 && <small className="sub2">repeat</small>}</td>
              <td className="r"><b>{EGP(c.spent)}</b>{c.orders > 0 && <small className="sub2">avg {EGP(c.spent / c.orders)}</small>}</td>
              <td>{dayAgo(c.lastAt)}<small className="sub2">customer since {new Date(c.firstAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</small></td>
              <td><span className="ar">{c.favorite?.name ?? '—'}</span>{c.topChoice && <small className="sub2">{choice(c.topChoice.value)}</small>}</td>
              <td className="r"><a className="mini above" href={waLink(c.phone)} target="_blank" rel="noreferrer">WhatsApp</a></td>
            </tr>
          ))}</tbody>
        </table></div>
        {!rows.length && <p className="empty" style={{ padding: 16 }}>{q ? `No customers match “${sp.q}”.` : 'No customers here yet.'}</p>}
      </section>
    </>
  );
}
