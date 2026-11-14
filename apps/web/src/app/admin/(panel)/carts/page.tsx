import { ALERT_AFTER_MIN, draftItems, inReplyHours, maybeSweep } from '@/lib/abandoned';
import { getNiche } from '@/lib/niches';
import { store } from '@/lib/store';
import type { Draft } from '@/lib/store/types';
import { dismissCart, sendCartReminder } from '../../actions';
import { ago, EGP, NicheTabs, Pill, pct, pickNiche } from '../shared';

export const metadata = { title: 'Abandoned carts' };

const STATUS: Record<Draft['status'] | 'due' | 'browsing', [string, string]> = {
  browsing: ['On checkout now', 'info'], due: ['Due: send a reminder', 'warn'], open: ['Waiting', 'mute'], alerted: ['Due: send a reminder', 'warn'],
  reminded: ['Reminded', 'info'], ordered: ['Ordered', 'ok'], dismissed: ['Dismissed', 'mute'],
};

export default async function Carts({ searchParams }: { searchParams: Promise<{ niche?: string }> }) {
  const niche = pickNiche(await searchParams);
  await maybeSweep();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  let drafts: Draft[] = [];
  let error = '';
  try { drafts = await store().listDrafts({ ...(niche ? { niche } : {}), updatedAfter: since, limit: 500 }); } catch (e) { error = (e as Error).message; }
  const missing = error ? await store().missingMigrations().catch(() => []) : [];
  const now = Date.now();
  const state = (d: Draft): keyof typeof STATUS => (d.status !== 'open' ? d.status : now - new Date(d.updatedAt).getTime() < ALERT_AFTER_MIN * 60_000 ? 'browsing' : 'due');
  const rows = await Promise.all(drafts.slice(0, 200).map(async (d) => ({ d, s: state(d), items: await draftItems({ ...d, lang: 'en' }, getNiche(d.niche)!).catch(() => '') })));
  const helped = drafts.filter((d) => d.alertedAt || d.remindedAt);
  const recovered = helped.filter((d) => d.status === 'ordered');
  const dueNow = rows.filter((r) => r.s === 'due' || r.s === 'alerted').length;

  return (
    <div className="dash">
      <div className="adm-top">
        <div>
          <h1>Abandoned carts</h1>
          <p className="sub">People who typed their phone at checkout but didn&apos;t order · last 30 days · one reminder per person a week, sent by you from WhatsApp Business</p>
        </div>
        <NicheTabs base="/admin/carts" current={niche} />
      </div>

      {error ? (
        <section className="panel">
          <h2>Carts aren&apos;t saved yet</h2>
          <p className="empty">{missing.includes('0006_traffic_and_carts.sql')
            ? 'Run supabase/migrations/0006_traffic_and_carts.sql once in the Supabase SQL editor, then reload.'
            : `The database didn't answer: ${error.slice(0, 200)}`}</p>
        </section>
      ) : (
        <>
          <div className="hero-kpis">
            <div className="hk"><div className="hk-top"><small>Due now</small></div><b>{dueNow}</b><span>{inReplyHours() ? 'send each one reminder' : 'reply hours are 10:00–21:30; alerts wait till then'}</span></div>
            <div className="hk"><div className="hk-top"><small>Checkouts started</small></div><b>{drafts.length}</b><span>{drafts.filter((d) => d.status === 'ordered').length} ordered · {pct(drafts.length ? drafts.filter((d) => d.status === 'ordered').length / drafts.length : 0)}</span></div>
            <div className="hk"><div className="hk-top"><small>Reminded</small></div><b>{drafts.filter((d) => d.remindedAt).length}</b><span>{helped.length} were due a reminder</span></div>
            <div className="hk"><div className="hk-top"><small>Recovered</small></div><b>{recovered.length}</b><span>{EGP(recovered.reduce((a, d) => a + d.total, 0))} in orders after an alert</span></div>
          </div>

          <section className="panel">
            <h2>Carts <span className="sub">newest first · a cart is due {ALERT_AFTER_MIN} minutes after the last change; Telegram alerts the team once</span></h2>
            {rows.length ? (
              <div className="tbl"><table className="t">
                <thead><tr><th>When</th><th>Customer</th><th>Coffees</th><th>Total</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {rows.map(({ d, s, items }) => (
                    <tr key={d.id}>
                      <td>{ago(d.updatedAt)}</td>
                      <td><b>{d.name || '—'}</b><br /><span dir="ltr">{d.phone}</span>{d.governorate ? <span className="ar-auto"> · {d.governorate}</span> : null}</td>
                      <td>{items}</td>
                      <td>{EGP(d.total)}</td>
                      <td><Pill kind={STATUS[s][1]}>{STATUS[s][0]}</Pill>{d.remindedAt ? <><br /><small>reminded {ago(d.remindedAt)}</small></> : null}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {(s === 'due' || s === 'alerted') && (
                          <>
                            <form action={sendCartReminder.bind(null, d.token)} style={{ display: 'inline' }}><button className="mini pri">💬 Send on WhatsApp</button></form>{' '}
                            <form action={dismissCart.bind(null, d.token)} style={{ display: 'inline' }}><button className="mini">Dismiss</button></form>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            ) : <p className="empty">No abandoned checkouts in the last 30 days.</p>}
          </section>
        </>
      )}
    </div>
  );
}
