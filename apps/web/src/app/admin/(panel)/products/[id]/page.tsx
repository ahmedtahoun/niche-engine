import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { coverDays, DAYS, marginPct, productStats, soldMargin } from '@/lib/product-stats';
import { store } from '@/lib/store';
import { saveSkus } from '../../../actions';
import { EGP, Pill, STATUS, pct } from '../../shared';
import { SkuCells } from '../SkuCells';

export const metadata = { title: 'Product' };

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cat = await catalog();
  const p = cat.productById(id);
  if (!p) notFound();
  const cfg = getNiche(p.niche);
  const st = productStats([p], await store().listOrders({ niche: p.niche, limit: 5000 }))[p.id];
  const choiceLabel = (v: string) => cfg?.choices?.flatMap((c) => c.values).find((x) => x.id === v)?.labelEn ?? v;
  const choiceTotal = Object.values(st.choices).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...st.daily);
  const stock = p.variants.reduce((n, v) => n + v.stock, 0);
  const cover = coverDays(stock, st.recent.units);
  const margin = soldMargin(st.all);
  const formId = `f-${p.id}`;
  const status = p.status ?? 'live';

  return (
    <>
      <div className="adm-top">
        <div className="pd-head">
          {p.images?.[0] ? <img src={p.images[0]} alt="" /> : <span className="thumb none">no photo</span>}
          <div>
            <h1 className="ar" style={{ textAlign: 'left' }}>{p.nameAr}</h1>
            <p className="sub">{p.en?.name ?? ''} · {cat.sellerById(p.sellerId)?.nameEn ?? cat.sellerById(p.sellerId)?.name} · <Pill kind={status === 'live' ? 'ok' : 'mute'}>{status === 'live' ? 'on sale' : status}</Pill> · <a href={cfg?.brand.domain ? `https://${cfg.brand.domain}/p/${p.slug}` : `/${p.niche}/p/${p.slug}`} target="_blank" rel="noreferrer">View in store ↗</a></p>
          </div>
        </div>
        <Link className="mini" href="/admin/products">← All products</Link>
      </div>

      <div className="kpis">
        <div className="kpi"><small>Sold · {DAYS} days</small><b>{st.recent.units}</b><span>{st.recent.orders} orders</span></div>
        <div className="kpi"><small>Revenue · {DAYS} days</small><b>{EGP(st.recent.revenue)}</b><span>all time {EGP(st.all.revenue)}</span></div>
        <div className="kpi"><small>Profit · {DAYS} days</small><b>{EGP(st.recent.profit)}</b><span>all time {EGP(st.all.profit)}</span></div>
        <div className="kpi"><small>Real margin (sold)</small><b>{margin === null ? '—' : pct(margin)}</b><span>{st.all.units} units sold{st.all.noCost ? ` · ${st.all.noCost} without a buying price` : ''}</span></div>
        <div className="kpi"><small>Stock · days left</small><b>{stock}</b><span>{cover === null ? 'no sales yet' : `${cover} days at the ${DAYS}-day pace`}</span></div>
        <div className="kpi"><small>Views → orders</small><b>{p.views ? pct(st.all.orders / p.views) : '—'}</b><span>{p.views.toLocaleString('en-US')} views · {st.delivered} delivered · {st.refused} refused</span></div>
      </div>

      <section className="panel">
        <h2>Sizes: stock and prices</h2>
        <form id={formId} action={saveSkus.bind(null, p.id)} />
        <div className="tbl"><table className="t crm" style={{ minWidth: 820 }}>
          <thead><tr><th>Size</th><th>Stock</th><th>Sell price</th><th>Buy price</th><th className="r">Margin</th><th className="r">Sold 30d</th><th className="r">Sold all</th><th className="r">Revenue all</th><th className="r">Profit all</th><th className="r">Days left</th></tr></thead>
          <tbody>{p.variants.map((v) => {
            const vs = st.byVariant[v.label];
            const c = coverDays(v.stock, vs?.recent.units ?? 0);
            return (
              <tr key={v.label}>
                <td className="ar">{v.label}</td>
                <SkuCells formId={formId} label={v.label} stock={v.stock} price={v.price ?? p.price} cost={p.cost?.[v.label]} low={5} />
                <td className="r">{vs?.recent.units ?? 0}</td>
                <td className="r">{vs?.all.units ?? 0}</td>
                <td className="r">{vs?.all.revenue ? EGP(vs.all.revenue) : '—'}</td>
                <td className="r">{vs?.all.profit ? EGP(vs.all.profit) : '—'}</td>
                <td className="r">{v.stock === 0 ? <Pill kind="bad">sold out</Pill> : c ?? '—'}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
        <div style={{ marginTop: 10 }}><button className="mini pri" form={formId}>Save changes</button></div>
        <p className="sub">Margin per bag = sell − buy price{p.variants.map((v) => { const m = marginPct(v.price ?? p.price, p.cost?.[v.label]); return m === null ? null : <span key={v.label}> · <span className="ar">{v.label}</span>: {pct(m)}</span>; })}</p>
      </section>

      <div className="cols">
        <section className="panel">
          <h2>Units sold per day · last {DAYS} days</h2>
          <div className="bars" role="img" aria-label={`Units per day: ${st.daily.join(', ')}`}>
            {st.daily.map((n, i) => <i key={i} className={n ? '' : 'zero'} style={{ height: `${(n / max) * 100}%` }} title={`${n} units`} />)}
          </div>
          <div className="bars-x"><span>{DAYS} days ago</span><span>today</span></div>
        </section>
        <section className="panel">
          <h2>How customers brew it</h2>
          {choiceTotal ? Object.entries(st.choices).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <div key={k} className="hbar"><span>{choiceLabel(k)}</span><span className="track"><i style={{ width: `${(n / choiceTotal) * 100}%` }} /></span><span className="r">{n} · {Math.round((n / choiceTotal) * 100)}%</span></div>
          )) : <p className="empty">No orders with a grind choice yet.</p>}
        </section>
      </div>

      <section className="panel">
        <h2>Latest orders with this coffee</h2>
        {st.recentOrders.length ? (
          <div className="tbl"><table className="t">
            <thead><tr><th>Order</th><th>Date</th><th>Size · grind</th><th className="r">Qty</th><th>Status</th></tr></thead>
            <tbody>{st.recentOrders.map((o, i) => (
              <tr key={`${o.id}-${i}`}>
                <td><Link href="/admin/orders">#{o.id}</Link></td>
                <td>{new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</td>
                <td className="ar">{o.variant}</td>
                <td className="r">{o.qty}</td>
                <td><Pill kind={STATUS[o.status as keyof typeof STATUS]?.[1] ?? 'mute'}>{STATUS[o.status as keyof typeof STATUS]?.[0] ?? o.status}</Pill></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty">No orders yet.</p>}
      </section>
    </>
  );
}
