'use client';
// Manual order form: find the customer (smart search) or add a new one, add items, check the total, create.
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { matches } from '@/lib/smart-search';
import type { CartLine } from '@/lib/types';
import { createManualOrder } from '../../../actions';

export interface PickProduct { slug: string; name: string; nameEn?: string; sizes: { label: string; price: number; stock: number }[]; choices: { id: string; label: string; values: { id: string; label: string }[] }[] }
interface Person { key: string; name: string; phone: string; governorate: string; area: string; address: string; orders: number; lastAt: string }
interface Line { slug: string; size: string; qty: number; choice: Record<string, string> }

const SOURCES: [string, string][] = [['whatsapp', 'WhatsApp'], ['phone', 'Phone call'], ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['other', 'Other']];
const egp = (n: number) => `EGP ${Math.round(n).toLocaleString('en-US')}`;

export function NewOrderForm({ niche, shipping, freeOver, governorates, customers, products, preselect }: { niche: string; shipping: number; freeOver?: number; governorates: string[]; customers: Person[]; products: PickProduct[]; preselect?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState('');
  const pre = customers.find((c) => c.key === preselect);
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<Person | null>(pre ?? null);
  const [fresh, setFresh] = useState(false);
  const [cust, setCust] = useState({ phone: pre?.phone ?? '', name: pre?.name ?? '', governorate: pre?.governorate ?? governorates[0], area: pre?.area ?? '', address: pre?.address ?? '', landmark: '' });
  const [lines, setLines] = useState<Line[]>([]);
  const [source, setSource] = useState('whatsapp');
  const [payment, setPayment] = useState<'cod' | 'instapay'>('cod');
  const [freeShipping, setFreeShipping] = useState(false);
  const [discount, setDiscount] = useState('');

  const results = useMemo(() => (query.trim() ? customers.filter((c) => matches(query, { text: `${c.name} ${c.area} ${c.governorate}`, phone: c.phone })).slice(0, 8) : []), [query, customers]);
  const choose = (c: Person) => { setPicked(c); setFresh(false); setQuery(''); setCust({ phone: c.phone, name: c.name, governorate: c.governorate, area: c.area, address: c.address, landmark: '' }); };
  const startNew = () => { const digits = query.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/\D/g, ''); setPicked(null); setFresh(true); setCust({ phone: digits.length >= 10 ? digits : '', name: digits.length >= 10 ? '' : query.trim(), governorate: governorates[0], area: '', address: '', landmark: '' }); setQuery(''); };

  const product = (slug: string) => products.find((p) => p.slug === slug);
  const addItem = (slug: string) => { const p = product(slug); if (!p) return; setLines([...lines, { slug, size: p.sizes.find((s) => s.stock > 0)?.label ?? p.sizes[0].label, qty: 1, choice: Object.fromEntries(p.choices.map((c) => [c.id, c.values.length === 1 ? c.values[0].id : ''])) }]); };
  const update = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const sizeOf = (l: Line) => product(l.slug)?.sizes.find((s) => s.label === l.size);
  const subtotal = lines.reduce((n, l) => n + (sizeOf(l)?.price ?? 0) * l.qty, 0);
  const ship = freeShipping || (freeOver && subtotal >= freeOver) ? 0 : lines.length ? shipping : 0;
  const disc = Math.min(Math.max(0, Number(discount) || 0), subtotal + ship);
  const total = subtotal + ship - disc;
  const short = lines.find((l) => (sizeOf(l)?.stock ?? 0) < l.qty);
  const missingChoice = lines.find((l) => Object.values(l.choice).some((v) => !v));
  const hasCustomer = Boolean(picked || fresh);

  const submit = () => {
    setError('');
    start(async () => {
      const cart: CartLine[] = lines.map((l) => ({ kind: 'item', slug: l.slug, variant: l.size, qty: l.qty, ...(Object.keys(l.choice).length ? { choice: l.choice } : {}) }));
      const r = await createManualOrder({ niche, source: source as never, customer: cust, lines: cart, payment, freeShipping, discount: disc });
      if (r.ok) router.push(`/admin/orders/${r.id}`);
      else setError(r.error);
    });
  };

  return (
    <div className="ed-grid">
      <div className="ed-main">
        <section className="panel">
          <h2>Customer</h2>
          {!hasCustomer ? (
            <div className="picker">
              <input className="search-big" autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or area… (Arabic or English, any digits)" aria-label="Search customers" />
              {results.length > 0 && (
                <ul className="results">
                  {results.map((c) => (
                    <li key={c.key}><button type="button" onClick={() => choose(c)}>
                      <b className="ar">{c.name}</b><span dir="ltr">{c.phone}</span><span className="sub ar">{c.area}، {c.governorate}</span><span className="sub">{c.orders} orders</span>
                    </button></li>
                  ))}
                </ul>
              )}
              {query.trim() && !results.length && <p className="hint">No customer matches “{query}”.</p>}
              <button type="button" className="mini" onClick={startNew}>＋ New customer{query.trim() ? ` “${query.trim()}”` : ''}</button>
            </div>
          ) : (
            <>
              {picked && <div className="picked"><b className="ar">{picked.name}</b> <span className="sub">· returning customer · {picked.orders} orders</span><button type="button" className="linkish" onClick={() => { setPicked(null); setFresh(false); }}>Change</button></div>}
              {fresh && <div className="picked"><b>New customer</b><button type="button" className="linkish" onClick={() => setFresh(false)}>Search instead</button></div>}
              <div className="fields">
                <label className="fld"><span>Mobile</span><input value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} dir="ltr" inputMode="tel" placeholder="01…" /></label>
                <label className="fld"><span>Name</span><input value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} dir="rtl" /></label>
                <label className="fld"><span>Governorate</span><select className="sel" value={cust.governorate} onChange={(e) => setCust({ ...cust, governorate: e.target.value })}>{governorates.map((g) => <option key={g}>{g}</option>)}</select></label>
                <label className="fld"><span>Area</span><input value={cust.area} onChange={(e) => setCust({ ...cust, area: e.target.value })} dir="rtl" /></label>
                <label className="fld"><span>Street address</span><input value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} dir="rtl" /></label>
                <label className="fld"><span>Landmark (optional)</span><input value={cust.landmark} onChange={(e) => setCust({ ...cust, landmark: e.target.value })} dir="rtl" /></label>
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <h2>Items</h2>
          {lines.length > 0 && (
            <div className="tbl"><table className="t sku">
              <thead><tr><th>Coffee</th><th>Size</th><th>Grind</th><th>Qty</th><th className="r">Amount</th><th></th></tr></thead>
              <tbody>{lines.map((l, i) => {
                const p = product(l.slug)!;
                const s = sizeOf(l);
                return (
                  <tr key={i}>
                    <td className="ar"><b>{p.name}</b></td>
                    <td><select className="sel sm" value={l.size} onChange={(e) => update(i, { size: e.target.value })}>{p.sizes.map((x) => <option key={x.label} value={x.label} disabled={x.stock === 0}>{x.label} · {egp(x.price)} · {x.stock} left</option>)}</select></td>
                    <td>{p.choices.map((c) => <select key={c.id} className={`sel sm${l.choice[c.id] ? '' : ' need'}`} value={l.choice[c.id]} onChange={(e) => update(i, { choice: { ...l.choice, [c.id]: e.target.value } })}><option value="">{c.label}…</option>{c.values.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}</select>)}</td>
                    <td><input className={`cell${s && s.stock < l.qty ? ' bad' : ''}`} style={{ width: 56 }} type="number" min={1} max={50} value={l.qty} onChange={(e) => update(i, { qty: Math.max(1, Number(e.target.value) || 1) })} /></td>
                    <td className="r">{egp((s?.price ?? 0) * l.qty)}</td>
                    <td><button type="button" className="mini" onClick={() => setLines(lines.filter((_, j) => j !== i))} aria-label="Remove">✕</button></td>
                  </tr>
                );
              })}</tbody>
            </table></div>
          )}
          <select className="sel" value="" onChange={(e) => addItem(e.target.value)} style={{ marginTop: lines.length ? 10 : 0 }}>
            <option value="">＋ Add a coffee…</option>
            {products.map((p) => <option key={p.slug} value={p.slug}>{p.name}{p.nameEn ? ` · ${p.nameEn}` : ''}</option>)}
          </select>
        </section>
      </div>

      <aside className="ed-side">
        <section className="panel">
          <h2>Summary</h2>
          <dl className="facts-dl">
            <div><dt>Subtotal</dt><dd>{egp(subtotal)}</dd></div>
            <div><dt>Shipping</dt><dd>{freeShipping ? 'Free' : egp(ship)}</dd></div>
            {disc > 0 && <div><dt>Discount</dt><dd>− {egp(disc)}</dd></div>}
            <div className="grand"><dt>Total</dt><dd>{egp(total)}</dd></div>
          </dl>
          <label className="check"><input type="checkbox" checked={freeShipping} onChange={(e) => setFreeShipping(e.target.checked)} /> Free shipping</label>
          <label className="fld" style={{ marginTop: 8 }}><span>Discount (EGP)</span><input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="numeric" placeholder="0" /></label>
        </section>
        <section className="panel">
          <h2>Order details</h2>
          <label className="fld"><span>Came from</span><select className="sel" value={source} onChange={(e) => setSource(e.target.value)}>{SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="fld" style={{ marginTop: 8 }}><span>Payment</span><select className="sel" value={payment} onChange={(e) => setPayment(e.target.value as 'cod' | 'instapay')}><option value="cod">Cash on delivery</option><option value="instapay">InstaPay (paid)</option></select></label>
        </section>
        {error && <div className="alert" style={{ '--c': 'var(--a-bad)' } as React.CSSProperties}><div><b>Not created</b><small>{error}</small></div></div>}
        <button type="button" className="btn-save block-btn" disabled={pending || !hasCustomer || !lines.length || Boolean(short) || Boolean(missingChoice)} onClick={submit}>
          {pending ? 'Creating…' : !hasCustomer ? 'Pick a customer first' : !lines.length ? 'Add an item' : short ? 'Not enough stock' : missingChoice ? 'Pick the grind' : `Create order · ${egp(total)}`}
        </button>
      </aside>
    </div>
  );
}
