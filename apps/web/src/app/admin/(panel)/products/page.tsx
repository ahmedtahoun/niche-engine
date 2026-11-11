import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import { approveProductAction, approveSellerAction, setProductStatus, setSellerStatus, setStock } from '../../actions';
import { EGP, NicheTabs, Pill, pickNiche } from '../shared';

export const metadata = { title: 'Products & review' };

const DEMO_CONFIRMED = '2026-11-01T00:00:00Z';

export default async function Products({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  const cat = await catalog();
  const list = cat.products.filter((p) => !niche || p.niche === niche);
  const review = list.filter((p) => p.status === 'review');
  const apps = cat.sellers.filter((s) => s.status === 'applied' && (!niche || s.niche === niche));
  const seller = (id: string) => cat.sellerById(id);
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
      </section>
      <section className="panel">
        <h2>Catalog</h2>
        <div className="tbl"><table className="t">
          <thead><tr><th>Product</th><th>Seller</th><th className="r">Price</th><th>Margin</th><th>Stock</th><th className="r">Views</th><th>Price confirmed</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.filter((p) => p.status !== 'review').map((p) => {
            const d = daysSince(p.priceConfirmedAt);
            const status = p.status ?? 'live';
            return (
              <tr key={p.id}>
                <td className="ar"><div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{p.images?.[0] ? <img className="thumb" src={p.images[0]} alt="" loading="lazy" /> : <span className="thumb none">no photo</span>}<b>{p.nameAr}</b></div></td>
                <td className="ar">{seller(p.sellerId)?.name}</td>
                <td className="r">{EGP(p.price)}</td>
                <td><div className="stock">{p.variants.map((v) => {
                  const price = v.price ?? p.price;
                  const cost = p.cost?.[v.label];
                  return cost === undefined
                    ? <span key={v.label} className="sub">commission</span>
                    : <span key={v.label} className={`sc ${price - cost < price * 0.12 ? 'low' : ''}`} title={`price ${price} − cost ${cost}`}><span className="ar">{v.label}</span>: {EGP(price - cost)} · {Math.round(((price - cost) / price) * 100)}%</span>;
                })}</div></td>
                <td>
                  <form action={setStock.bind(null, p.id)} className="stock" style={{ alignItems: 'center' }}>
                    {p.variants.map((v) => (
                      <label key={v.label} className={`sc ${v.stock <= 3 ? 'low' : ''}`} style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                        <span className="ar">{v.label}</span>
                        <input name={`stock:${v.label}`} defaultValue={v.stock} inputMode="numeric" aria-label={`Stock ${v.label}`} style={{ width: 52 }} />
                      </label>
                    ))}
                    <button className="mini">Save</button>
                  </form>
                </td>
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
