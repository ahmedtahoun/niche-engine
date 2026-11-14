'use client';
// New-order notifications inside the admin, on every page, while it is open in a tab:
// - a card in the corner for each new order (click to open it), and the lists refresh themselves
// - a short chime and a desktop notification (after "Turn on alerts": browsers need one click to allow sound)
// - the tab title shows how many orders need you, e.g. "(3) Orders · Admin"
// Checks every 20 seconds. For alerts when the admin is closed, team members use the Telegram alerts.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type NewOrder = { id: number; name: string; total: number; items: number; brand: string; payment: string };
type Pulse = { latest: number; action: number; ship: number; carts: number; orders: NewOrder[] };

const KEY = 'adm_alerts';
const egp = (n: number) => `EGP ${Math.round(n).toLocaleString('en-US')}`;

function chime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [[880, 0], [1320, 0.16]].forEach(([f, t]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.35);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.4);
    });
    setTimeout(() => void ctx.close(), 1000);
  } catch { /* no sound available */ }
}

export function OrderAlerts() {
  const router = useRouter();
  const after = useRef(0);
  const baseTitle = useRef('');
  const [toasts, setToasts] = useState<NewOrder[]>([]);
  const [on, setOn] = useState(false);
  const [pending, setPending] = useState<{ action: number; ship: number; carts: number } | null>(null);

  useEffect(() => { try { setOn(localStorage.getItem(KEY) === 'on'); } catch { /* storage blocked */ } }, []);

  const check = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/pulse?after=${after.current}`, { cache: 'no-store' });
      if (!r.ok) return;
      const p = (await r.json()) as Pulse;
      setPending({ action: p.action, ship: p.ship, carts: p.carts });
      if (after.current && p.orders.length) {
        setToasts((t) => [...p.orders.reverse(), ...t].slice(0, 5));
        router.refresh();
        let enabled = false;
        try { enabled = localStorage.getItem(KEY) === 'on'; } catch { /* storage blocked */ }
        if (enabled) {
          chime();
          if ('Notification' in window && Notification.permission === 'granted') {
            for (const o of p.orders) {
              const n = new Notification(`🛒 New order #${o.id} · ${o.brand}`, { body: `${o.name} · ${egp(o.total)} · ${o.items} ${o.items === 1 ? 'item' : 'items'}`, tag: `order-${o.id}` });
              n.onclick = () => { window.focus(); router.push(`/admin/orders/${o.id}`); n.close(); };
            }
          }
        }
      }
      after.current = Math.max(after.current, p.latest);
    } catch { /* offline: try again next time */ }
  }, [router]);

  useEffect(() => {
    void check();
    const id = setInterval(() => void check(), 20_000);
    return () => clearInterval(id);
  }, [check]);

  // Tab title: "(3) Orders · Admin" while orders need you.
  useEffect(() => {
    if (!baseTitle.current) baseTitle.current = document.title.replace(/^\(\d+\)\s*/, '');
    const n = pending?.action ?? 0;
    const apply = () => { const t = document.title.replace(/^\(\d+\)\s*/, ''); document.title = n ? `(${n}) ${t}` : t; };
    apply();
    // Page changes and refreshes replace the <title> element itself, so watch the whole <head>.
    const obs = new MutationObserver(() => { if (n ? !document.title.startsWith(`(${n}) `) : /^\(\d+\)\s/.test(document.title)) apply(); });
    obs.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => obs.disconnect();
  }, [pending?.action]);

  const turnOn = async () => {
    try { localStorage.setItem(KEY, 'on'); } catch { /* storage blocked */ }
    setOn(true);
    chime();
    if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  };
  const turnOff = () => { try { localStorage.setItem(KEY, 'off'); } catch { /* storage blocked */ } setOn(false); };

  return (
    <>
      <div className="alerts-switch">
        {pending && (pending.action + pending.ship + pending.carts > 0) && (
          <div className="alerts-sum">
            {pending.action > 0 && <Link href="/admin/orders?tab=action">⚡ {pending.action} need action</Link>}
            {pending.ship > 0 && <Link href="/admin/orders?tab=ship">📦 {pending.ship} to ship</Link>}
            {pending.carts > 0 && <Link href="/admin/carts">🛒 {pending.carts} carts to remind</Link>}
          </div>
        )}
        {on
          ? <button type="button" className="mini" onClick={turnOff} title="Sound and desktop alerts for new orders are on">🔔 Alerts on</button>
          : <button type="button" className="mini pri" onClick={turnOn}>🔔 Turn on order alerts</button>}
      </div>
      {toasts.length > 0 && (
        <div className="order-toasts" role="status" aria-live="polite">
          {toasts.map((o) => (
            <div key={o.id} className="order-toast">
              <Link href={`/admin/orders/${o.id}`} onClick={() => setToasts((t) => t.filter((x) => x.id !== o.id))}>
                <b>🛒 New order #{o.id}</b>
                <span>{o.brand} · {o.name}</span>
                <span>{egp(o.total)} · {o.items} {o.items === 1 ? 'item' : 'items'} · {o.payment === 'cod' ? 'cash on delivery' : 'InstaPay'}</span>
              </Link>
              <button type="button" aria-label="Dismiss" onClick={() => setToasts((t) => t.filter((x) => x.id !== o.id))}>×</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
