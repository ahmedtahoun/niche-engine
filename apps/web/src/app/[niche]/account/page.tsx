import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForms, SignOut } from '@/components/AuthForms';
import { currentCustomer } from '@/lib/current-customer';
import { getNiche } from '@/lib/niches';
import { store } from '@/lib/store';
import { entriesOf, walletOf } from '@/lib/wallet';

export const metadata = { title: 'حسابي' };
export const dynamic = 'force-dynamic';

const STATUS: Record<string, string> = { awaiting_confirm: 'مستني تأكيد', confirmed: 'بيتجهز', accepted: 'بيتجهز', picked: 'مع المندوب', delivered: 'وصل', refused: 'اترفض', cancelled: 'اتلغى' };

export default async function AccountPage({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const me = await currentCustomer();
  if (!me) {
    return (
      <main className="page narrow">
        <h1 className="title">حسابك</h1>
        <p className="muted" style={{ margin: 0 }}>ادخل برقم موبايلك وكلمة السر عشان تشوف طلباتك، وعنوانك بيتحفظ للطلب الجاي.</p>
        <AuthForms />
      </main>
    );
  }
  const [orders, w, entries] = await Promise.all([store().listOrders({ phone: me.phone, niche: cfg.id, limit: 50 }), walletOf(me.phone, cfg.id), entriesOf(me.phone, cfg.id)]);
  const history = entries.slice().reverse().slice(0, 8);
  const KIND: Record<string, string> = { cashback: 'كاش باك', spend: 'استخدمته في طلب', refund: 'رجعلك من طلب اتلغى', adjust: 'رصيد من الفريق' };
  const day = (iso: string) => new Date(iso).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' });
  return (
    <main className="page narrow">
      <h1 className="title">أهلاً {me.name.split(' ')[0]}</h1>
      <section className="hero" style={{ gridTemplateColumns: '1fr' }}>
        <span className="small" style={{ opacity: 0.85 }}>رصيد محفظتك</span>
        <b style={{ fontSize: 28 }} className="num">{w.balance.toLocaleString('en-US')} ج</b>
        <span className="small" style={{ opacity: 0.9 }}>{w.nextExpiry ? `${w.nextExpiry.amount.toLocaleString('en-US')} ج بينتهي ${day(w.nextExpiry.at)}. ` : ''}بتكسب {Math.round(cfg.wallet.cashback * 100)}٪ كاش باك على كل طلب يوصلك، وبتستخدمه في الطلب الجاي.</span>
      </section>
      {history.length > 0 && (
        <div className="box small">
          <b>حركة المحفظة</b>
          {history.map((e) => <div className="row" key={e.id}><span>{KIND[e.kind]}{e.orderId ? ` · #${e.orderId}` : ''} · {day(e.createdAt)}</span><span className="num" style={{ color: e.amount > 0 ? 'var(--ok)' : 'var(--ink)' }}>{e.amount > 0 ? '+' : '−'}{Math.abs(e.amount).toLocaleString('en-US')} ج</span></div>)}
        </div>
      )}
      <div className="box small">
        <b>بياناتك المحفوظة</b>
        <div className="row"><span>الموبايل</span><span className="num" dir="ltr">{me.phone}</span></div>
        <div className="row"><span>العنوان</span><span>{me.address ? `${me.governorate}، ${me.area}، ${me.address}` : 'هيتحفظ مع أول طلب'}</span></div>
      </div>
      <section style={{ display: 'grid', gap: 8 }}>
        <h2 className="h4">طلباتك</h2>
        {orders.length ? orders.map((o) => (
          <Link key={o.id} href={`/${cfg.id}/order/${o.id}`} className="line" style={{ gridTemplateColumns: '1fr auto' }}>
            <div><b className="small">#{o.id} · {o.quote.lines[0]?.title.split(' · ')[0]}{o.quote.lines.length > 1 ? ` + ${o.quote.lines.length - 1}` : ''}</b><div className="pby">{STATUS[o.status]}</div></div>
            <span className="num small">{Math.round(o.quote.total).toLocaleString('en-US')} ج</span>
          </Link>
        )) : <span className="muted">لسه مفيش طلبات.</span>}
      </section>
      <SignOut />
    </main>
  );
}
