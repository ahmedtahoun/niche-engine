import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@/lib/catalog';
import { customers } from '@/lib/customer-stats';
import { getNiche } from '@/lib/niches';
import { orderById } from '@/lib/orders';
import { customerKey } from '@/lib/session';
import { waLink } from '@/lib/site';
import { store } from '@/lib/store';
import { EGP, Pill, STATUS } from '../../shared';
import { OrderActions } from '../OrderActions';

export const metadata = { title: 'Order' };

const STEPS: [string, string[]][] = [
  ['Placed', ['awaiting_confirm', 'confirmed', 'accepted', 'picked', 'delivered', 'refused']],
  ['Seller accepted', ['accepted', 'picked', 'delivered', 'refused']],
  ['With courier', ['picked', 'delivered', 'refused']],
  ['Delivered', ['delivered']],
];
const NEXT: Record<string, string> = {
  awaiting_confirm: 'Next: confirm the order with the customer.',
  confirmed: 'Next: confirm it once the seller has the order ready (or they accept in Telegram).',
  accepted: 'Next: mark it when the courier picks it up, or delivered if you sent it yourself.',
  picked: 'Next: delivered, or refused at the door (stock comes back).',
};
const PART: Record<string, [string, string]> = { pending: ['waiting', 'warn'], accepted: ['accepted', 'info'], rejected: ['not available', 'bad'], handed: ['handed to courier', 'ok'] };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const o = Number.isInteger(id) ? await orderById(id) : null;
  if (!o) notFound();
  const cfg = getNiche(o.niche);
  const cat = await catalog();
  const history = await store().listOrders({ phone: o.customer.phone, limit: 200 });
  const c = customers(history, customerKey)[0];
  const q = o.quote;
  const toCollect = q.total - (q.depositRequired && o.payment === 'cod' ? q.deposit : 0);
  const address = [o.customer.governorate, o.customer.area, o.customer.address].filter(Boolean).join('، ') + (o.customer.landmark ? ` (${o.customer.landmark})` : '');
  const brand = cfg?.brand.nameAr ?? '';
  const message = `أهلاً ${o.customer.name.split(' ')[0]}، معاك ${brand} بخصوص طلبك رقم #${o.id} (${Math.round(q.total)} ج). نأكد العنوان: ${address}؟`;

  return (
    <div className="editor">
      <div className="ed-bar">
        <Link href="/admin/orders" className="back" aria-label="Back to orders">←</Link>
        <div className="ed-title">
          <h1>Order #{o.id}</h1>
          <span className="sub">{new Date(o.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · {cfg?.brand.nameEn} · <Pill kind={STATUS[o.status][1]}>{STATUS[o.status][0]}</Pill></span>
        </div>
        <OrderActions o={o} compact />
      </div>

      {o.needsAttention && <div className="alert" style={{ '--c': 'var(--a-bad)' } as React.CSSProperties}><div><b>Needs attention</b><small>{o.needsAttention}</small></div></div>}

      <div className="ed-grid">
        <div className="ed-main">
          <section className="panel">
            <h2>Progress</h2>
            {['cancelled', 'refused'].includes(o.status) && <p className="bad-t" style={{ margin: '0 0 8px' }}>{o.status === 'cancelled' ? 'Cancelled' : 'Refused at the door'}</p>}
            <ol className="steps-adm">{STEPS.map(([label, on]) => <li key={label} className={on.includes(o.status) ? 'on' : ''}>{label}</li>)}</ol>
            {!['delivered', 'refused', 'cancelled'].includes(o.status) && (
              <div className="next-step">
                <span className="sub">{NEXT[o.status]}</span>
                <OrderActions o={o} />
              </div>
            )}
          </section>

          <section className="panel">
            <h2>Items</h2>
            <div className="tbl"><table className="t" style={{ minWidth: 520 }}>
              <thead><tr><th>Item</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
              <tbody>{q.lines.map((l) => (
                <tr key={l.key}><td className="ar"><b>{l.title}</b>{l.by ? <small className="sub2">{l.by}</small> : null}</td><td className="r">{l.qty}</td><td className="r">{EGP(l.amount)}</td></tr>
              ))}</tbody>
            </table></div>
            <dl className="facts-dl totals">
              <div><dt>Subtotal</dt><dd>{EGP(q.subtotal)}</dd></div>
              {q.bundleDiscount > 0 && <div><dt>Bundle discount</dt><dd>− {EGP(q.bundleDiscount)}</dd></div>}
              {q.promoDiscount > 0 && <div><dt>Promo {o.promoCode}</dt><dd>− {EGP(q.promoDiscount)}</dd></div>}
              {q.wallet > 0 && <div><dt>Wallet credit</dt><dd>− {EGP(q.wallet)}</dd></div>}
              <div><dt>Shipping</dt><dd>{EGP(q.shipping)}</dd></div>
              <div className="grand"><dt>Total</dt><dd>{EGP(q.total)}</dd></div>
              {q.depositRequired && o.payment === 'cod' && <div><dt>Deposit (paid first)</dt><dd>{EGP(q.deposit)}</dd></div>}
              <div><dt>{o.payment === 'cod' ? 'Courier collects' : 'Paid by InstaPay'}</dt><dd>{EGP(o.payment === 'cod' ? toCollect : q.total)}</dd></div>
            </dl>
          </section>

          <section className="panel">
            <h2>Sellers & shipments</h2>
            {Object.entries(o.sellerState).map(([sid, part]) => (
              <div key={sid} className="ship-row">
                <b className="ar">{cat.sellerById(sid)?.nameEn ?? cat.sellerById(sid)?.name ?? sid}</b>
                <Pill kind={PART[part]?.[1] ?? 'mute'}>{PART[part]?.[0] ?? part}</Pill>
                {o.shipments?.[sid] ? <span className="sub">Bosta {o.shipments[sid].tracking} · COD {EGP(o.shipments[sid].cod)} · {o.shipments[sid].status}</span> : <span className="sub">no shipment yet</span>}
              </div>
            ))}
          </section>
        </div>

        <aside className="ed-side">
          <section className="panel">
            <h2>Customer</h2>
            <Link href={`/admin/customers/${customerKey(o.customer.phone)}`} className="ar cust-name">{o.customer.name}</Link>
            <p className="sub" dir="ltr" style={{ textAlign: 'left' }}>{o.customer.phone}</p>
            {c && <p className="sub">{c.orders} {c.orders === 1 ? 'order' : 'orders'} · {EGP(c.spent)} spent{c.refused ? ` · ${c.refused} refused` : ''}</p>}
            <a className="wa-btn" href={waLink(o.customer.phone, message)} target="_blank" rel="noreferrer">💬 WhatsApp the customer</a>
            <a className="mini block" href={`tel:${o.customer.phone}`} style={{ textAlign: 'center', textDecoration: 'none' }}>📞 Call</a>
          </section>
          <section className="panel">
            <h2>Delivery address</h2>
            <p className="ar addr">{address}</p>
          </section>
          <section className="panel">
            <h2>Payment</h2>
            <dl className="facts-dl">
              <div><dt>Method</dt><dd>{o.payment === 'cod' ? 'Cash on delivery' : 'InstaPay'}</dd></div>
              <div><dt>Customer</dt><dd>{o.type === 'repeat' ? 'Repeat' : 'New'}</dd></div>
              <div><dt>Came from</dt><dd>{({ whatsapp: 'WhatsApp', phone: 'Phone call', instagram: 'Instagram', facebook: 'Facebook', other: 'Manual' } as Record<string, string>)[o.source ?? ''] ?? 'Website'}</dd></div>
              {o.promoCode && <div><dt>Promo</dt><dd>{o.promoCode}</dd></div>}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
