import { telegramStatus, webhookUrl } from '@/lib/telegram-setup';
import { connectTelegram } from '../../actions';
import { Pill } from '../shared';

export const metadata = { title: 'Telegram bot' };

export default async function TelegramPage({ searchParams }: { searchParams: Promise<{ result?: string; ok?: string }> }) {
  const sp = await searchParams;
  const s = await telegramStatus();
  const want = webhookUrl();
  const connected = Boolean(s.webhook?.url && s.webhook.url === want);
  return (
    <>
      <div className="adm-top">
        <div><h1>Telegram bot</h1><p className="sub">Sellers apply, add products and receive orders here. The token stays on the server.</p></div>
      </div>
      {sp.result && <div className={`dev`} style={{ background: sp.ok === '1' ? 'var(--a-ok-soft)' : 'var(--a-bad-soft, #fbe9e7)', color: sp.ok === '1' ? 'var(--a-ok)' : 'var(--a-bad)' }}>{sp.result}</div>}
      <section className="panel" style={{ display: 'grid', gap: 12 }}>
        <h2>Status</h2>
        <div className="tbl"><table className="t" style={{ minWidth: 0 }}><tbody>
          <tr><td>Settings in hosting</td><td>{s.configured ? <Pill kind="ok">Set</Pill> : <Pill kind="bad">Missing</Pill>}</td></tr>
          <tr><td>Token accepted by Telegram</td><td>{s.tokenOk ? <Pill kind="ok">Yes{s.bot ? ` · @${s.bot.username}` : ''}</Pill> : <Pill kind="bad">No</Pill>}</td></tr>
          <tr><td>Messages sent to this site</td><td>{connected ? <Pill kind="ok">Connected</Pill> : <Pill kind="warn">{s.webhook?.url ? `Points elsewhere: ${s.webhook.url}` : 'Not connected'}</Pill>}</td></tr>
          {s.webhook && <tr><td>Waiting messages</td><td>{s.webhook.pending}</td></tr>}
          {s.webhook?.lastError && <tr><td>Last delivery error</td><td style={{ color: 'var(--a-bad)' }}>{s.webhook.lastError} <span className="sub">({s.webhook.lastErrorAt})</span></td></tr>}
        </tbody></table></div>
        {s.problem && <p style={{ color: 'var(--a-bad)', margin: 0 }}>{s.problem}</p>}
        {s.unreachable && <p style={{ color: 'var(--a-bad)', margin: 0 }}>The server could not reach api.telegram.org ({s.unreachable}). Ask your host to allow outgoing HTTPS to api.telegram.org.</p>}
        {s.tokenOk && (
          <form action={connectTelegram}>
            <button className="mini pri">{connected ? 'Reconnect' : 'Connect'} the bot to {want ?? 'this site'}</button>
          </form>
        )}
        {s.bot && <p className="sub" style={{ margin: 0 }}>Test it: open <a href={`https://t.me/${s.bot.username}`} target="_blank" rel="noreferrer">t.me/{s.bot.username}</a> and send /start.</p>}
      </section>
    </>
  );
}
