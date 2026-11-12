'use client';
// Stock, price and cost inputs for one option, with the margin worked out as you type.
// The inputs belong to the product's form (form="…"), which saves every option at once.
import { useState } from 'react';

const n = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/,/g, ''));

export function SkuCells({ formId, label, stock, price, cost, low }: { formId: string; label: string; stock: number; price: number; cost?: number; low: number }) {
  const [p, setP] = useState(String(price));
  const [c, setC] = useState(cost === undefined ? '' : String(cost));
  const [st, setSt] = useState(String(stock));
  const pv = n(p), cv = c.trim() === '' ? null : n(c);
  const margin = cv === null || !(pv > 0) ? null : pv - cv;
  const pct = margin === null ? null : margin / pv;
  const tone = pct === null ? '' : pct < 0.12 ? 'bad' : pct < 0.18 ? 'warn' : 'ok';
  const stockN = n(st);
  return (
    <>
      <td><input className={`cell ${stockN === 0 ? 'bad' : stockN <= low ? 'warn' : ''}`} form={formId} name={`stock:${label}`} value={st} onChange={(e) => setSt(e.target.value)} inputMode="numeric" aria-label={`Stock ${label}`} /></td>
      <td><input className="cell" form={formId} name={`price:${label}`} value={p} onChange={(e) => setP(e.target.value)} inputMode="numeric" aria-label={`Selling price ${label}`} /></td>
      <td><input className="cell" form={formId} name={`cost:${label}`} value={c} onChange={(e) => setC(e.target.value)} inputMode="numeric" placeholder="—" aria-label={`Buying price ${label}`} /></td>
      <td className="r">{margin === null ? <span className="sub">—</span> : <span className={`mg ${tone}`}>{Math.round(margin).toLocaleString('en-US')} · {Math.round((pct ?? 0) * 100)}%</span>}</td>
    </>
  );
}
