import { notFound } from 'next/navigation';
import { Art, BundleArt } from '@/components/Art';
import { Summary } from '@/components/CartView';
import { OrderActions } from '@/components/OrderActions';
import { etaDate } from '@/lib/eta';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { getOrder } from '@/lib/orders';
import Link from 'next/link';
import { currentCustomer } from '@/lib/current-customer';

export async function generateMetadata() { return { title: (await speaker()).t('orderTitle') }; }
export const dynamic = 'force-dynamic';

const STEPS = ['confirmed', 'accepted', 'picked', 'delivered'] as const;
const RANK: Record<string, number> = { awaiting_confirm: 0, confirmed: 1, accepted: 2, picked: 3, delivered: 4, refused: 4, cancelled: -1 };

export default async function OrderPage({ params }: { params: Promise<{ niche: string; id: string }> }) {
  const { niche, id } = await params;
  const cfg = getNiche(niche);
  const o = cfg ? await getOrder(niche, Number(id)) : null;
  if (!cfg || !o) notFound();
  const s = await speaker(cfg);
  const { t, egp } = s;
  // Orders hold a name, phone and address: only their owner may see them.
  const me = await currentCustomer();
  if (!me || me.phone !== o.customer.phone) {
    return (
      <main className="page narrow">
        <h1 className="title">{t('order', { id: o.id })}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('ord.signin')}</p>
        <Link className="btn primary block" href={`/${niche}/account`}>{t('signIn')}</Link>
      </main>
    );
  }
  const r = RANK[o.status];
  const toPayAtDoor = o.quote.total - (o.quote.depositRequired && o.payment === 'cod' ? o.quote.deposit : 0);
  return (
    <main className="page narrow">
      <h1 className="title">{t('order', { id: o.id })}</h1>
      {o.status === 'confirmed' && <div className="note ok">{t('ord.confirmed')}</div>}
      {o.status === 'awaiting_confirm' && <div className="note warn">{t('ord.awaiting')}</div>}
      {o.status === 'cancelled' && <div className="note warn">{t('ord.cancelled')}</div>}
      {r >= 0 && r < 4 && <div className="eta"><b>{t('ord.eta', { day: s.date(etaDate(o.customer.governorate), true) })}</b><span>{t('ord.call')}</span></div>}
      {o.status !== 'cancelled' && (
        <div className="tl">
          {STEPS.map((step, i) => (
            <div key={step} className={r >= i + 1 ? 'on' : ''}><i>{r >= i + 1 ? '✓' : i + 1}</i><b>{t(`step.${step}`)}</b></div>
          ))}
        </div>
      )}
      <OrderActions niche={niche} id={o.id} status={o.status} />
      <div style={{ display: 'grid', gap: 8 }}>
        {o.quote.lines.map((l) => (
          <div className="line" key={l.key}>
            <div className="pimg">{l.isBundle ? <BundleArt parts={l.parts ?? []} /> : <Art kind={l.art} color={l.color} image={l.image} />}</div>
            <div><b className="small">{l.title}{l.qty > 1 ? ` × ${l.qty}` : ''}</b><div className="pby">{l.by}</div></div>
            <span className="num small">{egp(l.amount)}</span>
          </div>
        ))}
      </div>
      <Summary q={o.quote} />
      {o.status !== 'cancelled' && <div className="row total"><span>{t('payAtDoor')}</span><span className="num">{egp(o.payment === 'cod' ? toPayAtDoor : 0)}</span></div>}
      <div className="box small">
        <b>{t('deliverTo')}</b>
        <span>{o.customer.name} · {o.customer.phone}</span>
        <span>{[s.gov(o.customer.governorate), o.customer.area, o.customer.address].join(s.en ? ', ' : '، ')}{o.customer.landmark ? ` (${o.customer.landmark})` : ''}</span>
      </div>
    </main>
  );
}
