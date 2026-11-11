import { PRODUCTS, SELLERS } from '@/lib/demo-data';
import { getNiche } from '@/lib/niches';
import { approveProductAction, approveSellerAction, setProductStatus, setSellerStatus } from '../../actions';
import { EGP, NicheTabs, Pill, pickNiche } from '../shared';

export const metadata = { title: 'Products & review' };

const DEMO_CONFIRMED = '2026-11-01T00:00:00Z';

export default async function Products({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  const list = PRODUCTS.filter((p) => !niche || p.niche === niche);
  const review = list.filter((p) => p.status === 'review');
  const apps = SELLERS.filter((s) => s.status === 'applied' && (!niche || s.niche === niche));
  const seller = (id: string) => SELLERS.find((s) => s.id === id);
  const daysSince = (iso?: string) => Math.floor((Date.now() - Date.parse(iso ?? DEMO_CONFIRMED)) / 864e5);

  return (
    <>
      <div className="adm-top">
        <div><h1>Products & review</h1><p className="sub">Nothing goes live without your approval. Sellers update stock from Telegram.</p></div>
        <NicheTabs base="/admin/products" current={niche} />
      </div>
      <section className="panel">
        <h2>Review queue <Pill kind={review.length + apps.length ? 'info' : 'mute'}>{review.length + apps.length}</Pill></h2>
        {!review.length && !apps.length && <p className="empty">Nothing waiting.</p>}
        <div style={{ display: 'grid', gap: 10 }}>
          {review.map((p) => {
            const cfg = getNiche(p.niche)!;
            const missing = cfg.attributes.required.filter((a) => !['sizes', 'grind_options'].includes(a)).length - Object.keys(p.attributes).length;
            return (
              <div key={p.id} className="alert" style={{ '--c': 'var(--a-info)' } as React.CSSProperties}>
                <div>
                  <b className="ar">{p.nameAr}</b> · {EGP(p.price)} · <span className="ar">{seller(p.sellerId)?.name}</span> · {cfg.brand.nameEn}
                  <small className="ar" style={{ textAlign: 'left' }}>{Object.entries(p.attributes).map(([k, v]) => `${k}: ${v}`).join(' · ')}</small>
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
      </section>
      <section className="panel">
        <h2>Catalog</h2>
        <div className="tbl"><table className="t">
          <thead><tr><th>Product</th><th>Seller</th><th className="r">Price</th><th>Stock</th><th className="r">Views</th><th>Price confirmed</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.filter((p) => p.status !== 'review').map((p) => {
            const d = daysSince(p.priceConfirmedAt);
            const status = p.status ?? 'live';
            return (
              <tr key={p.id}>
                <td className="ar"><b>{p.nameAr}</b></td>
                <td className="ar">{seller(p.sellerId)?.name}</td>
                <td className="r">{EGP(p.price)}</td>
                <td><div className="stock">{p.variants.map((v) => <span key={v.label} className={`sc ${v.stock <= 3 ? 'low' : ''}`}><span className="ar">{v.label}</span>: {v.stock}</span>)}</div></td>
                <td className="r">{p.views.toLocaleString('en-US')}</td>
                <td>{d > 14 ? <Pill kind="warn">{d} days ago</Pill> : <span className="sub">{d === 0 ? 'today' : `${d}d ago`}</span>}</td>
                <td><Pill kind={status === 'live' ? 'ok' : 'mute'}>{status}</Pill></td>
                <td><form action={setProductStatus.bind(null, p.id, status === 'live' ? 'hidden' : 'live', undefined)}><button className="mini">{status === 'live' ? 'Hide' : 'Show'}</button></form></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </>
  );
}
