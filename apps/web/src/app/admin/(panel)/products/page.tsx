import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { coverDays, productStats } from '@/lib/product-stats';
import { store } from '@/lib/store';
import { approveProductAction, approveSellerAction, saveSkus, setProductStatus, setSellerStatus } from '../../actions';
import { EGP, NicheTabs, Pill, pct, pickNiche } from '../shared';
import { SkuCells } from './SkuCells';

export const metadata = { title: 'Products' };

const LOW = 5; // bags
const COVER_WARN = 10; // days of stock left at the 30-day pace
const SORTS = [['sold', 'Best sellers'], ['profit', 'Most profit'], ['margin', 'Lowest margin'], ['stock', 'Restock first'], ['name', 'Name']] as const;
type Sort = (typeof SORTS)[number][0];

export default async function Products({ searchParams }: { searchParams: Promise<{ niche?: string; show?: string; sort?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const show = sp.show === 'hidden' || sp.show === 'all' ? sp.show : 'live';
  const sort: Sort = (SORTS.find(([k]) => k === sp.sort)?.[0]) ?? 'sold';
  const href = (o: { show?: string; sort?: string }) => `/admin/products?${new URLSearchParams({ ...(niche ? { niche } : {}), show: o.show ?? show, sort: o.sort ?? sort })}`;
  const cat = await catalog();
  const list = cat.products.filter((p) => !niche || p.niche === niche);
  const stats = productStats(list, await store().listOrders({ ...(niche ? { niche } : {}), limit: 5000 }));
  const catalogList = list.filter((p) => p.status !== 'review');
  const counts = { live: catalogList.filter((p) => (p.status ?? 'live') === 'live').length, hidden: catalogList.filter((p) => p.status === 'hidden').length, all: catalogList.length };
  const shown = catalogList.filter((p) => show === 'all' || (p.status ?? 'live') === show);
  const minMargin = (p: (typeof list)[number]) => Math.min(...p.variants.map((v) => { const c = p.cost?.[v.label]; const pr = v.price ?? p.price; return c === undefined ? 1 : (pr - c) / pr; }));
  const minCover = (p: (typeof list)[number]) => Math.min(...p.variants.map((v) => v.stock === 0 ? -1 : coverDays(v.stock, stats[p.id].byVariant[v.label]?.recent.units ?? 0) ?? 9999));
  const rows = shown.map((p) => ({ p, st: stats[p.id] })).sort((a, b) =>
    sort === 'sold' ? b.st.recent.units - a.st.recent.units || b.st.all.units - a.st.all.units
    : sort === 'profit' ? b.st.recent.profit - a.st.recent.profit
    : sort === 'margin' ? minMargin(a.p) - minMargin(b.p)
    : sort === 'stock' ? minCover(a.p) - minCover(b.p)
    : a.p.nameAr.localeCompare(b.p.nameAr, 'ar'));
  const live = catalogList.filter((p) => (p.status ?? 'live') === 'live');
  const tot = live.reduce((t, p) => ({ units: t.units + stats[p.id].recent.units, revenue: t.revenue + stats[p.id].recent.revenue, profit: t.profit + stats[p.id].recent.profit, costed: t.costed + stats[p.id].recent.costedRevenue, noCost: t.noCost + stats[p.id].recent.noCost, orders: t.orders }), { units: 0, revenue: 0, profit: 0, costed: 0, noCost: 0, orders: new Set((await store().listOrders({ ...(niche ? { niche } : {}), since: new Date(Date.now() - 30 * 864e5).toISOString(), statuses: ['confirmed', 'accepted', 'picked', 'delivered'] })).map((o) => o.id)).size });
  const skus = live.flatMap((p) => p.variants.map((v) => ({ p, v })));
  const stockUnits = skus.reduce((n, { v }) => n + v.stock, 0);
  const stockValue = skus.reduce((n, { p, v }) => n + v.stock * (p.cost?.[v.label] ?? 0), 0);
  const outSkus = skus.filter(({ v }) => v.stock === 0).length;
  const lowSkus = skus.filter(({ p, v }) => { const c = coverDays(v.stock, stats[p.id].byVariant[v.label]?.recent.units ?? 0); return v.stock <= LOW || (c !== null && c < COVER_WARN); }).length;
  const review = list.filter((p) => p.status === 'review');
  const apps = cat.sellers.filter((s) => s.status === 'applied' && (!niche || s.niche === niche));
  const seller = (id: string) => cat.sellerById(id);

  return (
    <>
      <div className="adm-top">
        <div><h1>Products</h1><p className="sub">Stock, prices, margins and sales per size. Nothing goes live without your approval.</p></div>
        <NicheTabs base="/admin/products" current={niche} />
      </div>
      {(review.length > 0 || apps.length > 0) && <section className="panel">
        <h2>Review queue <Pill kind="info">{review.length + apps.length}</Pill></h2>
        <div style={{ display: 'grid', gap: 10 }}>
          {review.map((p) => {
            const cfg = getNiche(p.niche)!;
            const missing = cfg.attributes.required.filter((a) => !['sizes', 'grind_options'].includes(a)).length - Object.keys(p.attributes).length;
            return (
              <div key={p.id} className="alert" style={{ '--c': 'var(--a-info)' } as React.CSSProperties}>
                <div>
                  <b className="ar">{p.nameAr}</b> · {EGP(p.price)} · <span className="ar">{seller(p.sellerId)?.name}</span> · {cfg.brand.nameEn}
                  <small className="ar" style={{ textAlign: 'left' }}>{Object.entries(p.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</small>
                  {p.images?.length ? (
                    <div className="thumbs">{p.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt="" loading="lazy" /></a>)}</div>
                  ) : <small style={{ color: 'var(--a-bad)' }}>No photos stored: send it back so the seller adds it again with photos.</small>}
                  <small>Check: photos are real and clear · price equals the seller's Instagram{missing > 0 ? ` · ${missing} required attributes missing` : ''}</small>
                </div>
                <div className="acts">
                  <form action={approveProductAction.bind(null, p.id)}><button className="mini pri">Approve & publish</button></form>
                  <form action={setProductStatus.bind(null, p.id, 'hidden', 'الصور أو السعر محتاجين تعديل')}><button className="mini danger">Send back</button></form>
                </div>
              </div>
            );
          })}
          {apps.map((s) => (
            <div key={s.id} className="alert" style={{ '--c': 'var(--a-accent)' } as React.CSSProperties}>
              <div><b className="ar">Seller application: {s.name}</b><small>{s.instagram} · {getNiche(s.niche)?.brand.nameEn} · approve after a test order</small></div>
              <div className="acts">
                <form action={approveSellerAction.bind(null, s.id)}><button className="mini pri">Approve seller</button></form>
                <form action={setSellerStatus.bind(null, s.id, 'declined')}><button className="mini danger">Decline</button></form>
              </div>
            </div>
          ))}
        </div>
      </section>}
      <div className="kpis">
        <div className="kpi"><small>Units sold · 30 days</small><b>{tot.units.toLocaleString('en-US')}</b><span>{tot.orders} orders</span></div>
        <div className="kpi"><small>Revenue · 30 days</small><b>{EGP(tot.revenue)}</b><span>shelf price × units</span></div>
        <div className="kpi"><small>Gross profit · 30 days</small><b>{EGP(tot.profit)}</b><span>{tot.costed ? `${pct(tot.profit / tot.costed)} margin` : 'add buying prices'}{tot.noCost ? ` · ${tot.noCost} units without a buying price` : ''}</span></div>
        <div className="kpi"><small>Stock value at cost</small><b>{EGP(stockValue)}</b><span>{stockUnits.toLocaleString('en-US')} bags</span></div>
        <div className="kpi"><small>Needs restock</small><b style={{ color: lowSkus ? 'var(--a-warn)' : undefined }}>{lowSkus}</b><span>{outSkus} sold out · ≤{LOW} left or &lt;{COVER_WARN} days</span></div>
      </div>
      <section className="panel">
        <div className="tools">
          <nav className="adm-tabs" aria-label="Show">
            {(['live', 'hidden', 'all'] as const).map((k) => <Link key={k} href={href({ show: k })} aria-current={show === k ? 'true' : undefined}>{k === 'live' ? 'On sale' : k === 'hidden' ? 'Hidden' : 'All'} <span className="sub">{counts[k]}</span></Link>)}
          </nav>
          <nav className="adm-tabs" aria-label="Sort">
            {SORTS.map(([k, label]) => <Link key={k} href={href({ sort: k })} aria-current={sort === k ? 'true' : undefined}>{label}</Link>)}
          </nav>
        </div>
        <p className="sub" style={{ margin: '0 0 10px' }}>Edit stock, selling price and buying price, then Save. Margin updates as you type (red under 12%, amber under 18%). Buying prices stay in the admin.</p>
        <div className="tbl"><table className="t crm">
          <thead><tr>
            <th>Product</th><th>Size</th><th>Stock</th><th>Sell price</th><th>Buy price</th><th className="r">Margin</th>
            <th className="r">Sold 30d</th><th className="r">Sold all</th><th className="r">Revenue 30d</th><th className="r">Profit 30d</th><th className="r">Days left</th><th></th>
          </tr></thead>
          {rows.map(({ p, st }) => {
            const status = p.status ?? 'live';
            const formId = `f-${p.id}`;
            return (
              <tbody key={p.id} className="prod">
                {p.variants.map((v, i) => {
                  const vs = st.byVariant[v.label] ?? { all: { units: 0 }, recent: { units: 0, revenue: 0, profit: 0 } };
                  const cover = coverDays(v.stock, vs.recent.units);
                  return (
                    <tr key={v.label}>
                      {i === 0 && (
                        <td rowSpan={p.variants.length} className="pcell">
                          <form id={formId} action={saveSkus.bind(null, p.id)} />
                          <div className="pinfo">
                            {p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" loading="lazy" /> : <span className="thumb none">no photo</span>}
                            <div>
                              <Link href={`/admin/products/${p.id}`} className="ar pname">{p.nameAr}</Link>
                              <small>{seller(p.sellerId)?.nameEn ?? seller(p.sellerId)?.name} · <Pill kind={status === 'live' ? 'ok' : 'mute'}>{status === 'live' ? 'on sale' : status}</Pill></small>
                            </div>
                          </div>
                        </td>
                      )}
                      <td className="ar">{v.label}</td>
                      <SkuCells formId={formId} label={v.label} stock={v.stock} price={v.price ?? p.price} cost={p.cost?.[v.label]} low={LOW} />
                      <td className="r">{vs.recent.units}</td>
                      <td className="r">{vs.all.units}</td>
                      <td className="r">{vs.recent.revenue ? EGP(vs.recent.revenue) : '—'}</td>
                      <td className="r">{vs.recent.noCost ? <span className="sub" title="No buying price for some units">?</span> : vs.recent.profit ? EGP(vs.recent.profit) : '—'}</td>
                      <td className="r">{v.stock === 0 ? <Pill kind="bad">sold out</Pill> : cover === null ? <span className="sub">—</span> : cover < COVER_WARN ? <Pill kind="warn">{cover}</Pill> : cover}</td>
                      {i === 0 && (
                        <td rowSpan={p.variants.length} className="acts-cell">
                          <button className="mini pri" form={formId}>Save</button>
                          <form action={setProductStatus.bind(null, p.id, status === 'live' ? 'hidden' : 'live', undefined)}><button className="mini">{status === 'live' ? 'Hide' : 'Show'}</button></form>
                          <Link className="mini" href={`/admin/products/${p.id}`}>Details</Link>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            );
          })}
        </table></div>
        {!rows.length && <p className="empty">No products here.</p>}
      </section>
    </>
  );
}
