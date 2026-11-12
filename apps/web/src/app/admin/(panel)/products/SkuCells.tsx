'use client';
// One size's selling price, buying price and stock, with profit per bag and margin worked out as you type.
// The inputs belong to the editor's form, which saves everything at once.
import { useState } from 'react';

const n = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/,/g, ''));

export function SkuCells({ label, stock, price, cost, low }: { label: string; stock: number; price: number; cost?: number; low: number }) {
  const [p, setP] = useState(String(price));
  const [c, setC] = useState(cost === undefined ? '' : String(cost));
  const [st, setSt] = useState(String(stock));
  const pv = n(p), cv = c.trim() === '' ? null : n(c);
  const profit = cv === null || !(pv > 0) ? null : pv - cv;
  const pct = profit === null ? null : profit / pv;
  const tone = pct === null ? '' : pct < 0.12 ? 'bad' : pct < 0.18 ? 'warn' : 'ok';
  const stockN = n(st);
  return (
    <>
      <td><label className="money"><span>EGP</span><input className="cell" name={`price:${label}`} value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" aria-label={`Selling price ${label}`} /></label></td>
      <td><label className="money"><span>EGP</span><input className="cell" name={`cost:${label}`} value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" placeholder="—" aria-label={`Buying price ${label}`} /></label></td>
      <td className="r">{profit === null ? <span className="sub">—</span> : <b className="num">{Math.round(profit).toLocaleString('en-US')}</b>}</td>
      <td className="r">{pct === null ? <span className="sub">—</span> : <span className={`mg ${tone}`}>{Math.round(pct * 100)}%</span>}</td>
      <td><input className={`cell ${stockN === 0 ? 'bad' : stockN <= low ? 'warn' : ''}`} name={`stock:${label}`} value={st} onChange={(e) => setSt(e.target.value)} inputMode="numeric" aria-label={`Stock ${label}`} /></td>
    </>
  );
}

/** Delete button inside the editor form: asks first, then posts to the delete action. */
export function DeleteButton({ action, name }: { action: () => Promise<void>; name: string }) {
  return (
    <button className="mini danger block" formAction={action} formNoValidate onClick={(e) => { if (!confirm(`Delete “${name}”? If it was ever ordered it will be archived (hidden) instead, to keep order history.`)) e.preventDefault(); }}>
      Delete product
    </button>
  );
}
