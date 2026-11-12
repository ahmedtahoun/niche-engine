import Link from 'next/link';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { coverDays, marginPct, productStats } from '@/lib/product-stats';
import { store } from '@/lib/store';
import { approveProductAction, setProductStatus } from '../../actions';
import { EGP, NicheTabs, Pill, pct, pickNiche, plural } from '../shared';

export const metadata = { title: 'Products' };

const LOW = 5; // bags
const COVER_WARN = 10; // days of stock left at the 30-day pace
const SORTS = [['sold', 'Best sellers'], ['profit', 'Profit'], ['margin', 'Margin'], ['stock', 'Restock'], ['name', 'A–Z']] as const;
type Sort = (typeof SORTS)[number][0];

export default async function Products({ searchParams }: { searchParams: Promise<{ niche?: string; show?: string; sort?: string; q?: string; done?: string; name?: string }> }) {
  const sp = await searchParams;
  const niche = pickNiche(sp);
  const show = sp.show === 'hidden' || sp.show === 'all' ? sp.show : 'live';
  const sort: Sort = (SORTS.find(([k]) => k === sp.sort)?.[0]) ?? 'sold';
  const q = (sp.q ?? '').trim();
  const href = (o: { show?: string; sort?: string }) => `/admin/products?${new URLSearchParams({ ...(niche ? { niche } : {}), show: o.show ?? show, sort: o.sort ?? sort, ...(q ? { q } : {}) })}`;
  const cat = await catalog();
  const list = cat.products.filter((p) => !niche || p.niche === niche);
  const stats = productStats(list, await store().listOrders({ ...(niche ? { niche } : {}), limit: 5000 }));
  const catalogList = list.filter((p) => p.status !== 'review');
  const counts = { live: catalogList.filter((p) => (p.status ?? 'live') === 'live').length, hidden: catalogList.filter((p) => p.status === 'hidden').length, all: catalogList.length };
  const needle = q.toLowerCase();
  const shown = catalogList.filter((p) => (show === 'all' || (p.status ?? 'live') === show) && (!needle || `${p.nameAr} ${p.en?.name ?? ''} ${p.slug}`.toLowerCase().includes(needle)));
  const minMargin = (p: (typeof list)[number]) => Math.min(...p.variants.map((v) => { const c = p.cost?.[v.label]; const pr = v.price ?? p.price; return c === undefined ? 1 : (pr - c) / pr; }));
  const minCover = (p: (typeof list)[number]) => Math.min(...p.variants.map((v) => v.stock === 0 ? -1 : coverDays(v.stock, stats[p.id].byVariant[v.label]?.recent.units ?? 0) ?? 9999));
  const rows = shown.map((p) => ({ p, st: stats[p.id] })).sort((a, b) =>
    sort === 'sold' ? b.st.recent.units - a.st.recent.units || b.st.all.units - a.st.all.units
    : sort === 'profit' ? b.st.recent.profit - a.st.recent.profit
    : sort === 'margin' ? minMargin(a.p) - minMargin(b.p)
    : sort === 'stock' ? minCover(a.p) - minCover(b.p)
    : a.p.nameAr.localeCompare(b.p.nameAr, 'ar'));
  const live = catalogList.filter((p) => (p.status ?? 'live') === 'live');
  const liveIds = new Set(live.map((p) => p.id));
  const hasCosts = live.some((p) => p.cost && Object.keys(p.cost).length);
  const tot = live.reduce((t, p) => ({ units: t.units + stats[p.id].recent.units, revenue: t.revenue + stats[p.id].recent.revenue, profit: t.profit + stats[p.id].recent.profit, costed: t.costed + stats[p.id].recent.costedRevenue, noCost: t.noCost + stats[p.id].recent.noCost, orders: t.orders }), { units: 0, revenue: 0, profit: 0, costed: 0, noCost: 0, orders: (await store().listOrders({ ...(niche ? { niche } : {}), since: new Date(Date.now() - 30 * 864e5).toISOString(), statuses: ['confirmed', 'accepted', 'picked', 'delivered'] })).filter((o) => o.items.some((i) => liveIds.has(i.productId))).length });
  const skus = live.flatMap((p) => p.variants.map((v) => ({ p, v })));
  const stockUnits = skus.reduce((n, { v }) => n + v.stock, 0);
  const stockValue = skus.reduce((n, { p, v }) => n + v.stock * (p.cost?.[v.label] ?? 0), 0);
  const outSkus = skus.filter(({ v }) => v.stock === 0).length;
  const lowSkus = skus.filter(({ p, v }) => { const c = coverDays(v.stock, stats[p.id].byVariant[v.label]?.recent.units ?? 0); return v.stock <= LOW || (c !== null && c < COVER_WARN); }).length;
  const review = list.filter((p) => p.status === 'review');
  const seller = (id: string) => cat.sellerById(id);

  return (
    <>
      <div className="adm-top">
        <div><h1>Products</h1><p className="sub">Click a coffee to edit its name, description, prices, stock or status.</p></div>
        <NicheTabs base="/admin/products" current={niche} />
      </div>
      {review.length > 0 && <section className="panel">
        <h2>Products to review <Pill kind="info">{review.length}</Pill></h2>
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
        </div>
      </section>}
      <div className="kpis">
        <div className="kpi"><small>Revenue · 30 days</small><b>{EGP(tot.revenue)}</b><span>{plural(tot.units, 'bag')} · {plural(tot.orders, 'order')}</span></div>
        <div className="kpi"><small>Profit · 30 days</small><b>{EGP(tot.profit)}</b><span>{tot.costed ? `${pct(tot.profit / tot.costed)} margin` : hasCosts ? 'no sales yet' : 'add buying prices'}{tot.noCost ? ` · ${tot.noCost} bags without a buy price` : ''}</span></div>
        <div className="kpi"><small>Inventory</small><b>{stockUnits.toLocaleString('en-US')} bags</b><span>worth {EGP(stockValue)} at buying price</span></div>
        <div className="kpi"><small>Needs restock</small><b style={{ color: lowSkus ? 'var(--a-warn)' : undefined }}>{lowSkus} sizes</b><span>{outSkus} sold out · ≤{LOW} left or under {COVER_WARN} days</span></div>
      </div>
      {sp.done && <div className="toast">{sp.done === 'deleted' ? `Deleted “${sp.name ?? ''}”.` : `“${sp.name ?? ''}” has orders, so it was archived (hidden) to keep order history.`}</div>}
      <section className="panel flush">
        <div className="tools">
          <nav className="seg" aria-label="Show">
            {(['live', 'hidden', 'all'] as const).map((k) => <Link key={k} href={href({ show: k })} aria-current={show === k ? 'true' : undefined}>{k === 'live' ? 'Active' : k === 'hidden' ? 'Hidden' : 'All'} <span className="n">{counts[k]}</span></Link>)}
          </nav>
          <form className="search" action="/admin/products">
            {niche && <input type="hidden" name="niche" value={niche} />}
            <input type="hidden" name="show" value={show} /><input type="hidden" name="sort" value={sort} />
            <input name="q" defaultValue={q} placeholder="Search coffees…" aria-label="Search products" />
          </form>
          <nav className="seg" aria-label="Sort">
            {SORTS.map(([k, label]) => <Link key={k} href={href({ sort: k })} aria-current={sort === k ? 'true' : undefined}>{label}</Link>)}
          </nav>
        </div>
        <div className="tbl"><table className="t plist">
          <thead><tr><th>Product</th><th>Status</th><th>Inventory</th><th className="r">Price</th><th className="r">Margin</th><th className="r">Sold · 30d</th><th className="r">Profit · 30d</th><th></th></tr></thead>
          <tbody>{rows.map(({ p, st }) => {
            const status = p.status ?? 'live';
            const stock = p.variants.reduce((n, v) => n + v.stock, 0);
            const out = p.variants.filter((v) => v.stock === 0).length;
            const low = p.variants.some((v) => v.stock > 0 && (v.stock <= LOW || ((c) => c !== null && c < COVER_WARN)(coverDays(v.stock, st.byVariant[v.label]?.recent.units ?? 0))));
            const prices = p.variants.map((v) => v.price ?? p.price);
            const margins = p.variants.map((v) => marginPct(v.price ?? p.price, p.cost?.[v.label])).filter((m): m is number => m !== null);
            const m = margins.length ? Math.min(...margins) : null;
            const edit = `/admin/products/${p.id}`;
            return (
              <tr key={p.id} className="row-link">
                <td><Link href={edit} className="pinfo stretch">
                  {p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" loading="lazy" /> : <span className="thumb none">—</span>}
                  <span><b className="ar">{p.nameAr}</b><small>{p.en?.name ?? ''}</small></span>
                </Link></td>
                <td><Pill kind={status === 'live' ? 'ok' : 'mute'}>{status === 'live' ? 'Active' : 'Hidden'}</Pill></td>
                <td><span className={out ? 'bad-t' : low ? 'warn-t' : ''}>{stock} in stock</span><small className="sub2">{p.variants.length} sizes{out ? ` · ${out} sold out` : low ? ' · low' : ''}</small></td>
                <td className="r">{Math.min(...prices) === Math.max(...prices) ? EGP(prices[0]) : `${EGP(Math.min(...prices))} – ${Math.max(...prices).toLocaleString('en-US')}`}</td>
                <td className="r">{m === null ? <span className="sub">no buy price</span> : <span className={`mg ${m < 0.12 ? 'bad' : m < 0.18 ? 'warn' : 'ok'}`}>{Math.round(m * 100)}%</span>}</td>
                <td className="r">{st.recent.units || <span className="sub">0</span>}</td>
                <td className="r">{st.recent.profit ? EGP(st.recent.profit) : <span className="sub">—</span>}</td>
                <td className="r"><Link href={edit} className="mini">Edit</Link></td>
              </tr>
            );
          })}</tbody>
        </table></div>
        {!rows.length && <p className="empty">{q ? `Nothing matches “${q}”.` : 'No products here.'}</p>}
      </section>
    </>
  );
}
