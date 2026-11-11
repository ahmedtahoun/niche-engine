import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { cycleFrom, cycleStart, nextPayday, paidThisCycle } from '@/lib/payouts';
import { store } from '@/lib/store';
import { markPaidAction } from '../../actions';
import { EGP, NicheTabs, Pill, pickNiche } from '../shared';

export const metadata = { title: 'Payouts' };

const day = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

export default async function Payouts({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  const since = cycleStart();
  const [cat, delivered, paid] = await Promise.all([catalog(), store().listOrders({ niche: niche ?? undefined, statuses: ['delivered'], limit: 100000 }), paidThisCycle()]);
  const rows = cat.sellers.filter((s) => (!niche || s.niche === niche) && ['active', 'warning', 'suspended'].includes(s.status))
    .map((s) => ({ s, c: cycleFrom(s.id, delivered, getNiche(s.niche)!), paid: paid.get(s.id) ?? null }));
  const cash = delivered.filter((o) => Date.parse(o.deliveredAt ?? '') >= since.getTime()).reduce((a, o) => a + o.quote.total, 0);
  const due = rows.reduce((a, r) => a + (r.paid ? 0 : r.c.payable), 0);
  const commission = rows.reduce((a, r) => a + r.c.commission, 0);
  const reserve = rows.reduce((a, r) => a + r.c.reserveHeld, 0);

  return (
    <>
      <div className="adm-top">
        <div><h1>Payouts</h1><p className="sub">Cycle: delivered since {day(since)} · paid {day(nextPayday())} by InstaPay · reserve held 30 days</p></div>
        <NicheTabs base="/admin/payouts" current={niche} />
      </div>
      <div className="kpis">
        <div className="kpi"><small>Cash collected (this cycle)</small><b>{EGP(cash)}</b><span>what Bosta remits for delivered orders</span></div>
        <div className="kpi"><small>Still to pay sellers</small><b>{EGP(due)}</b><span>after commission and reserve</span></div>
        <div className="kpi"><small>Your commission (this cycle)</small><b>{EGP(commission)}</b><span>before promos and cashback</span></div>
        <div className="kpi"><small>Reserve held</small><b>{EGP(reserve)}</b><span>forfeited on a proven poaching case</span></div>
      </div>
      <section className="panel">
        <div className="tbl"><table className="t">
          <thead><tr><th>Seller</th><th>InstaPay</th><th className="r">Delivered sales</th><th className="r">Commission</th><th className="r">Net</th><th className="r">Reserve</th><th className="r">Payable</th><th></th></tr></thead>
          <tbody>{rows.map(({ s, c, paid }) => (
            <tr key={s.id}>
              <td className="ar"><b>{s.name}</b></td>
              <td>{s.instapay ?? <span className="sub">missing</span>}</td>
              <td className="r">{EGP(c.sales)}</td>
              <td className="r">− {EGP(c.commission)}</td>
              <td className="r">{EGP(c.net)}</td>
              <td className="r">− {EGP(c.reserve)}</td>
              <td className="r"><b>{EGP(c.payable)}</b></td>
              <td>{paid ? <Pill kind="ok">Paid {EGP(paid.amount)}</Pill> : s.status === 'suspended' ? <Pill kind="bad">On hold</Pill> : (
                <form action={markPaidAction.bind(null, s.id)}><button className="mini pri" disabled={c.payable <= 0}>Mark paid</button></form>
              )}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="sub" style={{ marginBottom: 0 }}>Marking paid sends the seller a Telegram message with the amount. Send the InstaPay transfer first.</p>
      </section>
    </>
  );
}
