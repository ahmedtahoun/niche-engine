import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AuthForms, SignOut } from '@/components/AuthForms';
import { currentCustomer } from '@/lib/current-customer';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { store } from '@/lib/store';
import { entriesOf, walletOf } from '@/lib/wallet';

export async function generateMetadata() { return { title: (await speaker()).t('nav.account') }; }
export const dynamic = 'force-dynamic';

export default async function AccountPage({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const { t, egp } = s;
  const me = await currentCustomer();
  if (!me) {
    return (
      <main className="page narrow">
        <h1 className="title">{t('account')}</h1>
        <p className="muted" style={{ margin: 0 }}>{t('acc.signinHint')}</p>
        <AuthForms />
      </main>
    );
  }
  const [orders, w, entries] = await Promise.all([store().listOrders({ phone: me.phone, niche: cfg.id, limit: 50 }), walletOf(me.phone, cfg.id), entriesOf(me.phone, cfg.id)]);
  const history = entries.slice().reverse().slice(0, 8);
  const day = (iso: string) => s.date(iso);
  return (
    <main className="page narrow">
      <h1 className="title">{t('hello', { name: me.name.split(' ')[0] })}</h1>
      <section className="hero" style={{ gridTemplateColumns: '1fr' }}>
        <span className="small" style={{ opacity: 0.85 }}>{t('acc.wallet')}</span>
        <b style={{ fontSize: 28 }} className="num">{egp(w.balance)}</b>
        <span className="small" style={{ opacity: 0.9 }}>{w.nextExpiry ? t('acc.expires', { x: egp(w.nextExpiry.amount), day: day(w.nextExpiry.at) }) : ''}{t('acc.cashback', { p: Math.round(cfg.wallet.cashback * 100) })}</span>
      </section>
      {history.length > 0 && (
        <div className="box small">
          <b>{t('acc.history')}</b>
          {history.map((e) => <div className="row" key={e.id}><span>{t(`kind.${e.kind}` as 'kind.cashback')}{e.orderId ? ` · #${e.orderId}` : ''} · {day(e.createdAt)}</span><span className="num" style={{ color: e.amount > 0 ? 'var(--ok)' : 'var(--ink)' }}>{e.amount > 0 ? '+' : '−'}{egp(Math.abs(e.amount))}</span></div>)}
        </div>
      )}
      <div className="box small">
        <b>{t('acc.saved')}</b>
        <div className="row"><span>{t('acc.mobile')}</span><span className="num" dir="ltr">{me.phone}</span></div>
        <div className="row"><span>{t('acc.address')}</span><span>{me.address ? [s.gov(me.governorate), me.area, me.address].join(s.en ? ', ' : '، ') : t('acc.addressLater')}</span></div>
      </div>
      <section style={{ display: 'grid', gap: 8 }}>
        <h2 className="h4">{t('acc.orders')}</h2>
        {orders.length ? orders.map((o) => (
          <Link key={o.id} href={`/${cfg.id}/order/${o.id}`} className="line" style={{ gridTemplateColumns: '1fr auto' }}>
            <div><b className="small">#{o.id} · {o.quote.lines[0]?.title.split(' · ')[0]}{o.quote.lines.length > 1 ? ` + ${o.quote.lines.length - 1}` : ''}</b><div className="pby">{t(`st.${o.status}` as 'st.confirmed')}</div></div>
            <span className="num small">{egp(o.quote.total)}</span>
          </Link>
        )) : <span className="muted">{t('acc.noOrders')}</span>}
      </section>
      <SignOut />
    </main>
  );
}
