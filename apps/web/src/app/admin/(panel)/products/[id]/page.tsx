import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { coverDays, DAYS, productStats, soldMargin } from '@/lib/product-stats';
import { store } from '@/lib/store';
import { deleteProductAction, saveProductForm } from '../../../actions';
import { EGP, Pill, STATUS, pct } from '../../shared';
import { DeleteButton, PricingTable } from '../SkuCells';

export const metadata = { title: 'Edit product' };

export default async function ProductEditor({ params }: { params: Promise<{ id: string }> }) {
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
  const status = p.status ?? 'live';
  const storeUrl = cfg?.brand.domain ? `https://${cfg.brand.domain}/p/${p.slug}` : `/${p.niche}/p/${p.slug}`;

  return (
    // Keyed by the saved data: after Save the editor redraws from what was stored (React would otherwise reset fields to the old values).
    <form key={JSON.stringify([p.nameAr, p.leadAr, p.en?.name, p.en?.lead, p.status, p.ribbon, p.variants, p.cost])} action={saveProductForm.bind(null, p.id)} className="editor">
      <div className="ed-bar">
        <Link href="/admin/products" className="back" aria-label="Back to products">←</Link>
        <div className="ed-title">
          <h1 className="ar">{p.nameAr}</h1>
          <span className="sub">{p.en?.name} · <Pill kind={status === 'live' ? 'ok' : 'mute'}>{status === 'live' ? 'Active' : 'Hidden'}</Pill> · <a href={storeUrl} target="_blank" rel="noreferrer">View in store ↗</a></span>
        </div>
        <button className="btn-save">Save</button>
      </div>

      <div className="ed-grid">
        <div className="ed-main">
          <section className="panel">
            <h2>Details</h2>
            <div className="fields">
              <label className="fld"><span>Name · Arabic</span><input name="nameAr" defaultValue={p.nameAr} dir="rtl" required maxLength={120} /></label>
              <label className="fld"><span>Name · English</span><input name="nameEn" defaultValue={p.en?.name ?? ''} maxLength={120} /></label>
              <label className="fld"><span>Description · Arabic</span><textarea name="leadAr" defaultValue={p.leadAr} dir="rtl" rows={3} maxLength={600} /></label>
              <label className="fld"><span>Description · English</span><textarea name="leadEn" defaultValue={p.en?.lead ?? ''} rows={3} maxLength={600} /></label>
            </div>
          </section>

          <section className="panel">
            <h2>Pricing & inventory</h2>
            <PricingTable low={5} rows={p.variants.map((v) => ({ label: v.label, price: v.price ?? p.price, ...(v.compareAt ? { compareAt: v.compareAt } : {}), ...(p.cost?.[v.label] !== undefined ? { cost: p.cost[v.label] } : {}), stock: v.stock, sold30: st.byVariant[v.label]?.recent.units ?? 0 }))} />
            <p className="hint">Type the buying price for the biggest size: the smaller sizes follow by weight until you change them. A “before” price shows the old price struck through with the discount. Buying prices are private.</p>
          </section>

          <section className="panel">
            <h2>Sales · last {DAYS} days</h2>
            <div className="mini-kpis">
              <div><small>Sold</small><b>{st.recent.units}</b></div>
              <div><small>Revenue</small><b>{EGP(st.recent.revenue)}</b></div>
              <div><small>Profit</small><b>{EGP(st.recent.profit)}</b></div>
              <div><small>Orders</small><b>{st.recent.orders}</b></div>
            </div>
            <div className="bars" role="img" aria-label={`Units per day: ${st.daily.join(', ')}`}>
              {st.daily.map((n, i) => <i key={i} className={n ? '' : 'zero'} style={{ height: `${(n / max) * 100}%` }} title={`${n} bags`} />)}
            </div>
            <div className="bars-x"><span>{DAYS} days ago</span><span>today</span></div>
            {choiceTotal > 0 && (
              <>
                <h3 className="h3">How customers brew it</h3>
                {Object.entries(st.choices).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
                  <div key={k} className="hbar"><span>{choiceLabel(k)}</span><span className="track"><i style={{ width: `${(n / choiceTotal) * 100}%` }} /></span><span className="r">{Math.round((n / choiceTotal) * 100)}%</span></div>
                ))}
              </>
            )}
          </section>

          <section className="panel">
            <h2>Recent orders</h2>
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
        </div>

        <aside className="ed-side">
          <section className="panel">
            <h2>Status</h2>
            <select name="status" defaultValue={status === 'review' ? 'hidden' : status} className="sel">
              <option value="live">Active · on sale in the store</option>
              <option value="hidden">Hidden · not in the store</option>
            </select>
          </section>
          <section className="panel">
            <h2>Ribbon</h2>
            <select name="ribbon" defaultValue={p.ribbon ?? ''} className="sel">
              <option value="">None</option>
              <option value="new">✨ New · جديد</option>
              <option value="bestseller">🔥 Best seller · الأكتر طلباً</option>
              <option value="limited">⏳ Limited · كمية محدودة</option>
            </select>
            <p className="hint">A sale ribbon (−20%) shows by itself when a size has a “before” price.</p>
          </section>
          <section className="panel">
            <h2>Photos</h2>
            {p.images?.length ? <div className="thumbs">{p.images.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" loading="lazy" /></a>)}</div> : <p className="empty">No photos.</p>}
          </section>
          <section className="panel">
            <h2>All time</h2>
            <dl className="facts-dl">
              <div><dt>Sold</dt><dd>{st.all.units} bags</dd></div>
              <div><dt>Revenue</dt><dd>{EGP(st.all.revenue)}</dd></div>
              <div><dt>Profit</dt><dd>{EGP(st.all.profit)}{margin !== null ? ` · ${pct(margin)}` : ''}</dd></div>
              <div><dt>In stock</dt><dd>{stock} bags{cover !== null ? ` · ~${cover} days` : ''}</dd></div>
              <div><dt>Delivered / refused</dt><dd>{st.delivered} / {st.refused}</dd></div>
              <div><dt>Views → orders</dt><dd>{p.views ? pct(st.all.orders / p.views) : '—'}</dd></div>
            </dl>
          </section>
          <section className="panel danger-zone">
            <h2>Delete</h2>
            <p className="hint">Removes the coffee. If it was ever ordered, it is archived (hidden) instead so order history stays complete.</p>
            <DeleteButton action={deleteProductAction.bind(null, p.id)} name={p.nameAr} />
          </section>
        </aside>
      </div>
    </form>
  );
}
