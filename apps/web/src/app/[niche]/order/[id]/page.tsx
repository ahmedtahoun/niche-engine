import { notFound } from 'next/navigation';
import { Art, BundleArt } from '@/components/Art';
import { Summary } from '@/components/CartView';
import { OrderActions } from '@/components/OrderActions';
import { etaLabel } from '@/lib/eta';
import { getNiche } from '@/lib/niches';
import { getOrder } from '@/lib/orders';
import Link from 'next/link';
import { currentCustomer } from '@/lib/current-customer';

export const metadata = { title: 'طلبك' };
export const dynamic = 'force-dynamic';

const STEPS = [['confirmed', 'الطلب اتأكد'], ['accepted', 'البائعين جهزوا الطلب'], ['picked', 'مع مندوب بوسطة'], ['delivered', 'وصل']] as const;
const RANK: Record<string, number> = { awaiting_confirm: 0, confirmed: 1, accepted: 2, picked: 3, delivered: 4, refused: 4, cancelled: -1 };

export default async function OrderPage({ params }: { params: Promise<{ niche: string; id: string }> }) {
  const { niche, id } = await params;
  const cfg = getNiche(niche);
  const o = cfg ? await getOrder(niche, Number(id)) : null;
  if (!cfg || !o) notFound();
  // Orders hold a name, phone and address: only their owner may see them.
  const me = await currentCustomer();
  if (!me || me.phone !== o.customer.phone) {
    return (
      <main className="page">
        <h1 className="title">طلب #{o.id}</h1>
        <p className="muted" style={{ margin: 0 }}>ادخل لحسابك عشان تشوف تفاصيل الطلب.</p>
        <Link className="btn primary block" href={`/${niche}/account`}>دخول</Link>
      </main>
    );
  }
  const r = RANK[o.status];
  const toPayAtDoor = o.quote.total - (o.quote.depositRequired && o.payment === 'cod' ? o.quote.deposit : 0);
  return (
    <main className="page">
      <h1 className="title">طلب #{o.id}</h1>
      {o.status === 'confirmed' && <div className="note ok">طلبك وصل للبائعين وبيتجهز. بوسطة هتبعتلك رسالة فيها رقم التتبع.</div>}
      {o.status === 'awaiting_confirm' && <div className="note warn">فاضل خطوة: أكد طلبك عشان نبدأ نجهزه.</div>}
      {o.status === 'cancelled' && <div className="note warn">الطلب اتلغى. مفيش أي مبلغ عليك.</div>}
      {r >= 0 && r < 4 && <div className="eta"><b>يوصلك {etaLabel(o.customer.governorate)}</b><span>المندوب هيكلمك قبل ما يوصل.</span></div>}
      {o.status !== 'cancelled' && (
        <div className="tl">
          {STEPS.map(([, label], i) => (
            <div key={label} className={r >= i + 1 ? 'on' : ''}><i>{r >= i + 1 ? '✓' : i + 1}</i><b>{label}</b></div>
          ))}
        </div>
      )}
      <OrderActions niche={niche} id={o.id} status={o.status} />
      <div style={{ display: 'grid', gap: 8 }}>
        {o.quote.lines.map((l) => (
          <div className="line" key={l.key}>
            <div className="pimg">{l.isBundle ? <BundleArt parts={l.parts ?? []} /> : <Art kind={l.art} color={l.color} image={l.image} />}</div>
            <div><b className="small">{l.title}{l.qty > 1 ? ` × ${l.qty}` : ''}</b><div className="pby">{l.by}</div></div>
            <span className="num small">{Math.round(l.amount).toLocaleString('en-US')} ج</span>
          </div>
        ))}
      </div>
      <Summary q={o.quote} />
      {o.status !== 'cancelled' && <div className="row total"><span>هتدفع عند الاستلام</span><span className="num">{Math.round(o.payment === 'cod' ? toPayAtDoor : 0).toLocaleString('en-US')} ج</span></div>}
      <div className="box small">
        <b>التوصيل لـ</b>
        <span>{o.customer.name} · {o.customer.phone}</span>
        <span>{o.customer.governorate}، {o.customer.area}، {o.customer.address}{o.customer.landmark ? ` (${o.customer.landmark})` : ''}</span>
      </div>
    </main>
  );
}
