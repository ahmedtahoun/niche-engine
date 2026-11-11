'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { LogEntry } from '@/bot/transport';
import { simApproveProduct, simApproveSeller, simSend } from './actions';

const css = `
.sim{max-width:980px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-left,0px));display:grid;grid-template-columns:minmax(0,420px) minmax(0,1fr);gap:20px;direction:rtl}
@media (max-width:820px){.sim{grid-template-columns:minmax(0,1fr)}}
.tg{border:1px solid #c9d3dc;border-radius:18px;overflow:hidden;display:flex;flex-direction:column;height:min(760px,calc(100dvh - 120px));background:#d3e0cc}
.tg header{background:#4c789e;color:#fff;padding:10px 14px;font-weight:700}
.tg header small{display:block;font-weight:400;opacity:.85;font-size:12px}
.feed{flex:1;overflow-y:auto;padding:12px 10px;display:flex;flex-direction:column;gap:8px}
.b{max-width:86%;border-radius:14px;padding:8px 11px;font-size:14px;line-height:1.55;white-space:pre-line;background:#fff;color:#17201d}
.b.in{align-self:flex-start}.b.me{align-self:flex-end;background:#e4f6d3}
.ib{display:flex;flex-wrap:wrap;gap:5px;max-width:86%;align-self:flex-start}
.ib button{flex:1 1 40%;border:0;border-radius:10px;padding:9px 6px;background:rgba(255,255,255,.8);color:#285c84;font-weight:600;font-size:13px;min-height:40px}
.file{display:flex;gap:10px;align-items:center}.file i{width:36px;height:36px;border-radius:50%;background:#4c789e;color:#fff;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:700}
.kb{display:grid;grid-template-columns:1fr 1fr;gap:5px;padding:6px;background:#f2f4f1}
.kb button{border:0;border-radius:8px;padding:10px 4px;background:#fff;font-size:13px;font-weight:600;min-height:42px}
.inp{display:flex;gap:6px;padding:8px;background:#fff}
.inp input{flex:1;min-width:0;font:inherit;font-size:16px;border:1px solid #dcddd5;border-radius:18px;padding:8px 12px}
.inp button{border:0;border-radius:18px;padding:8px 12px;background:#4c789e;color:#fff;font-weight:700;min-height:40px}
.side{display:grid;gap:14px;align-content:start}
.panel{border:1px solid #dcddd5;border-radius:14px;padding:14px;background:#fff;display:grid;gap:8px}
.panel h2{font-size:15px;margin:0}
.chats{display:flex;flex-wrap:wrap;gap:6px}
.chats a{border:1px solid #dcddd5;border-radius:999px;padding:6px 12px;font-size:13px}
.chats a[aria-current="true"]{background:#4c789e;color:#fff;border-color:#4c789e}
.rowx{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:13px}
.rowx button{border:1px solid #2c7a4d;color:#2c7a4d;background:#fff;border-radius:8px;padding:6px 10px;font-weight:600}
`;

export function Simulator({ chat, chats, log, pendingSellers, pendingProducts }: {
  chat: number; chats: { id: number; label: string }[]; log: LogEntry[];
  pendingSellers: { id: string; name: string; chat: number }[]; pendingProducts: { id: string; name: string; price: number }[];
}) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [pending, start] = useTransition();
  const feed = useRef<HTMLDivElement>(null);
  useEffect(() => { feed.current?.scrollTo({ top: feed.current.scrollHeight }); }, [log.length]);
  const send = (input: Parameters<typeof simSend>[1]) => start(async () => { await simSend(chat, input); router.refresh(); });
  const keyboard = [...log].reverse().find((e) => e.from === 'bot' && e.keyboard)?.keyboard;
  const lastBot = log.map((e, i) => (e.from === 'bot' && e.buttons ? i : -1)).filter((i) => i >= 0);

  return (
    <>
      <style>{css}</style>
      <div className="sim">
        <section className="tg" aria-label="محادثة البوت">
          <header>بوت البائعين<small>{chats.find((c) => c.id === chat)?.label ?? `chat ${chat}`} · محاكي محلي</small></header>
          <div className="feed" ref={feed}>
            {!log.length && <div className="b in">اكتب /start عشان تبدأ.</div>}
            {log.map((e, i) => (
              <div key={i} style={{ display: 'contents' }}>
                <div className={`b ${e.from === 'bot' ? 'in' : 'me'}`}>
                  {e.file ? <span className="file"><i>PDF</i>{e.file.name}</span> : e.text}
                </div>
                {e.buttons && (
                  <div className="ib">
                    {e.buttons.flat().map((b) => (
                      <button key={b.data} disabled={pending || i !== lastBot.at(-1) && !b.data.startsWith('acc') && !b.data.startsWith('rej') && !b.data.startsWith('hand') && !b.data.startsWith('stk')}
                        onClick={() => send({ data: b.data, label: b.text })}>{b.text}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {keyboard && <div className="kb">{keyboard.flat().map((k) => <button key={k} disabled={pending} onClick={() => send({ text: k })}>{k}</button>)}</div>}
          <form className="inp" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { send({ text }); setText(''); } }}>
            <button type="button" disabled={pending} onClick={() => send({ photos: 3 })} aria-label="إرسال 3 صور">📷</button>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب رسالة…" aria-label="رسالة" />
            <button type="submit" disabled={pending}>إرسال</button>
          </form>
        </section>
        <aside className="side" dir="ltr">
          <div className="panel">
            <h2>Chats</h2>
            <div className="chats">{chats.map((c) => <Link key={c.id} href={`/dev/bot?chat=${c.id}`} aria-current={c.id === chat ? 'true' : undefined} dir="rtl">{c.label}</Link>)}</div>
            <p style={{ margin: 0, fontSize: 13, color: '#5c6862' }}>Place and confirm an order on the storefront (/umrah or /coffee): the sellers in it get the order here. 📷 sends 3 demo photos.</p>
          </div>
          <div className="panel">
            <h2>Admin stand-in (until the admin panel exists)</h2>
            {!pendingSellers.length && !pendingProducts.length && <span style={{ fontSize: 13, color: '#5c6862' }}>Nothing waiting for approval.</span>}
            {pendingSellers.map((s) => <div className="rowx" key={s.id}><span dir="rtl">Seller: {s.name}</span><button onClick={() => start(async () => { await simApproveSeller(s.id); router.refresh(); })}>Approve</button></div>)}
            {pendingProducts.map((p) => <div className="rowx" key={p.id}><span dir="rtl">Product: {p.name} · {p.price} ج</span><button onClick={() => start(async () => { await simApproveProduct(p.id); router.refresh(); })}>Approve</button></div>)}
          </div>
        </aside>
      </div>
    </>
  );
}
