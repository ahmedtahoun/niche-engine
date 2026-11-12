import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { GOVERNORATES } from '@/lib/eta';
import { allNiches, getNiche } from '@/lib/niches';
import { cycleFrom } from '@/lib/payouts';
import { botUsername } from '@/lib/telegram-setup';
import { store } from '@/lib/store';
import { approveSellerAction, deleteSellerAction, saveSellerForm } from '../../../actions';
import { EGP, Pill, pct, SSTAT } from '../../shared';
import { DeleteButton } from '../../products/SkuCells';

export const metadata = { title: 'Seller' };

export default async function SellerEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ niche?: string; error?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const cat = await catalog();
  const isNew = id === 'new';
  const s = isNew ? null : cat.sellerById(id);
  if (!isNew && !s) notFound();
  const niches = Object.values(allNiches());
  const niche = s?.niche ?? (getNiche(sp.niche ?? '') ? sp.niche! : niches.find((n) => n.status === 'live')?.id ?? niches[0].id);
  const cfg = getNiche(niche)!;
  const orders = s ? await store().listOrders({ sellerId: s.id, limit: 5000 }) : [];
  const mine = orders.filter((o) => o.status !== 'cancelled');
  const decided = mine.filter((o) => o.sellerState[s?.id ?? ''] !== 'pending');
  const rejected = mine.filter((o) => o.sellerState[s?.id ?? ''] === 'rejected').length;
  const sales = mine.filter((o) => !['refused', 'awaiting_confirm'].includes(o.status)).reduce((n, o) => n + o.items.filter((i) => i.sellerId === s?.id).reduce((a, i) => a + i.unitPrice * i.qty, 0), 0);
  const cycle = s ? cycleFrom(s.id, orders.filter((o) => o.status === 'delivered'), cfg) : null;
  const products = s ? cat.products.filter((p) => p.sellerId === s.id) : [];
  const bot = botUsername();
  const status = s?.status ?? 'active';

  return (
    <form key={JSON.stringify(s)} action={saveSellerForm.bind(null, id)} className="editor">
      <div className="ed-bar">
        <Link href="/admin/sellers" className="back" aria-label="Back to sellers">←</Link>
        <div className="ed-title">
          <h1 className="ar">{s ? s.name : 'New seller'}</h1>
          <span className="sub">{s ? <>{s.nameEn ?? ''} · {cfg.brand.nameEn} · <Pill kind={SSTAT[status][1]}>{SSTAT[status][0]}</Pill></> : 'Add a roaster or shop by hand (sellers can also apply through the Telegram bot).'}</span>
        </div>
        {s?.status === 'applied' && <button className="mini pri" formAction={approveSellerAction.bind(null, s.id)} formNoValidate>Approve seller</button>}
        <button className="btn-save">{isNew ? 'Create seller' : 'Save'}</button>
      </div>
      {sp.error && <div className="alert" style={{ '--c': 'var(--a-bad)' } as React.CSSProperties}><div><b>Not saved</b><small>Enter the store name and pick its store (niche).</small></div></div>}

      {s && (
        <div className="kpis">
          <div className="kpi"><small>Products on sale</small><b>{products.filter((p) => (p.status ?? 'live') === 'live').length}</b><span>{products.length} in all</span></div>
          <div className="kpi"><small>Orders</small><b>{mine.length}</b><span>{EGP(sales)} in sales</span></div>
          <div className="kpi"><small>Rejection rate</small><b style={{ color: decided.length && rejected / decided.length > 0.1 ? 'var(--a-bad)' : undefined }}>{decided.length ? pct(rejected / decided.length) : '—'}</b><span>{rejected} of {decided.length} answered</span></div>
          <div className="kpi"><small>Due Thursday</small><b>{EGP(cycle?.payable ?? 0)}</b><span>{EGP(cycle?.reserveHeld ?? 0)} held as reserve</span></div>
        </div>
      )}

      <div className="ed-grid">
        <div className="ed-main">
          <section className="panel">
            <h2>Store</h2>
            <div className="fields">
              <label className="fld"><span>Store name · Arabic</span><input name="name" defaultValue={s?.name ?? ''} dir="rtl" required maxLength={80} /></label>
              <label className="fld"><span>Store name · English</span><input name="nameEn" defaultValue={s?.nameEn ?? ''} maxLength={80} /></label>
              <label className="fld"><span>Sells on</span><select name="niche" className="sel" defaultValue={niche}>{niches.map((n) => <option key={n.id} value={n.id}>{n.brand.nameEn}</option>)}</select></label>
              <label className="fld"><span>Logo address (optional)</span><input name="logo" defaultValue={s?.logo ?? ''} placeholder="/sellers/name/mark.webp" /></label>
              <label className="fld"><span>Story for the store · Arabic</span><textarea name="aboutAr" defaultValue={s?.about?.ar ?? ''} dir="rtl" rows={3} maxLength={600} /></label>
              <label className="fld"><span>Story for the store · English</span><textarea name="aboutEn" defaultValue={s?.about?.en ?? ''} rows={3} maxLength={600} /></label>
            </div>
            <p className="hint">The story shows on product pages (“meet the roaster”). Keep phone numbers, addresses and social links out of it.</p>
          </section>

          <section className="panel">
            <h2>Contact & pickup <span className="sub">private: the team and the courier only</span></h2>
            <div className="fields">
              <label className="fld"><span>Owner name</span><input name="ownerName" defaultValue={s?.ownerName ?? ''} maxLength={80} /></label>
              <label className="fld"><span>Contact phone</span><input name="contactPhone" defaultValue={s?.contactPhone ?? ''} dir="ltr" inputMode="tel" placeholder="01…" /></label>
              <label className="fld"><span>Governorate</span><select name="governorate" className="sel" defaultValue={s?.governorate ?? ''}><option value="">—</option>{GOVERNORATES.map((g) => <option key={g}>{g}</option>)}</select></label>
              <label className="fld"><span>Area</span><input name="area" defaultValue={s?.area ?? ''} dir="rtl" maxLength={80} /></label>
              <label className="fld" style={{ gridColumn: '1 / -1' }}><span>Pickup address (for Bosta)</span><input name="pickupAddress" defaultValue={s?.pickupAddress ?? ''} dir="rtl" maxLength={200} /></label>
            </div>
          </section>

          <section className="panel">
            <h2>Payouts</h2>
            <div className="fields">
              <label className="fld"><span>InstaPay address or number</span><input name="instapay" defaultValue={s?.instapay ?? ''} dir="ltr" maxLength={60} /></label>
              <label className="fld"><span>Capacity per week</span><input name="capacity" defaultValue={s?.capacity ?? ''} maxLength={40} placeholder="e.g. 50 orders" /></label>
            </div>
          </section>

          {s && (
            <section className="panel">
              <h2>Products <Link className="mini" href="/admin/products">All products</Link></h2>
              {products.length ? (
                <div className="tbl"><table className="t plist" style={{ minWidth: 480 }}>
                  <thead><tr><th>Product</th><th>Status</th><th>Stock</th></tr></thead>
                  <tbody>{products.map((p) => (
                    <tr key={p.id} className="row-link">
                      <td><Link href={`/admin/products/${p.id}`} className="stretch-link ar"><b>{p.nameAr}</b></Link><small className="sub2">{p.en?.name ?? ''}</small></td>
                      <td><Pill kind={(p.status ?? 'live') === 'live' ? 'ok' : 'mute'}>{(p.status ?? 'live') === 'live' ? 'Active' : p.status}</Pill></td>
                      <td>{p.variants.reduce((n, v) => n + v.stock, 0)} in stock</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              ) : <p className="empty">No products yet. Sellers add products from the Telegram bot.</p>}
            </section>
          )}
          {s?.samplePhotos?.length ? <section className="panel"><h2>Sample photos from the application</h2><div className="thumbs">{s.samplePhotos.map((src) => <a key={src} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" loading="lazy" /></a>)}</div></section> : null}
        </div>

        <aside className="ed-side">
          <section className="panel">
            <h2>Status</h2>
            <select name="status" defaultValue={status} className="sel">
              <option value="active">Active · products on sale</option>
              <option value="warning">Warning · on sale, told to improve</option>
              <option value="suspended">Paused · products hidden</option>
              {(isNew || status === 'applied') && <option value="applied">Applied · waiting for review</option>}
              <option value="declined">Declined</option>
            </select>
            {!isNew && <p className="hint">Changing the status sends the seller a Telegram message.</p>}
          </section>
          <section className="panel">
            <h2>Telegram</h2>
            {s?.telegramChatId ? <p className="ok-t" style={{ margin: 0 }}>Linked · orders arrive in Telegram</p> : <>
              <p className="warn-t" style={{ margin: 0 }}>Not linked yet</p>
              <p className="hint">The seller opens {bot ? <b>@{bot}</b> : 'the seller bot'} and sends /myid. Then run in Supabase: <code>update sellers set telegram_chat_id = … where id = &apos;{s?.id ?? 'new-id'}&apos;;</code></p>
            </>}
          </section>
          {s && (
            <section className="panel danger-zone">
              <h2>Delete</h2>
              <p className="hint">Removes the seller. One with products or orders is paused (archived) instead, so orders and payouts keep their history.</p>
              <DeleteButton action={deleteSellerAction.bind(null, s.id)} label="Delete seller" confirmText={`Delete “${s.name}”? If they have products or orders they will be paused (archived) instead, to keep history.`} />
            </section>
          )}
        </aside>
      </div>
    </form>
  );
}
