'use client';
// The editor's pricing table: per size the selling price, an optional "before" price (sale),
// the buying price, profit per bag, margin and stock, all worked out as you type.
// Buying price: type it for the biggest size (1 kg) and the smaller sizes follow by weight
// (250 g = a quarter) until you type your own number there; "auto" brings the calculation back.
import { useState } from 'react';
import { gramsOf } from '@/lib/weights';

const n = (s: string) => Number(s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/,/g, ''));
const blank = (s: string) => s.trim() === '';

export interface SkuRow { label: string; price: number; compareAt?: number; cost?: number; stock: number; sold30: number }

export function PricingTable({ rows, low }: { rows: SkuRow[]; low: number }) {
  const grams = rows.map((r) => gramsOf(r.label));
  const weighted = grams.every((g) => g !== null) && rows.length > 1;
  const baseIdx = weighted ? grams.indexOf(Math.max(...(grams as number[]))) : -1;
  const autoCost = (baseCost: string, i: number) => (blank(baseCost) || !weighted ? '' : String(Math.round((n(baseCost) * grams[i]!) / grams[baseIdx]!)));

  const [price, setPrice] = useState(rows.map((r) => String(r.price)));
  const [before, setBefore] = useState(rows.map((r) => (r.compareAt ? String(r.compareAt) : '')));
  const [stock, setStock] = useState(rows.map((r) => String(r.stock)));
  const [cost, setCost] = useState(rows.map((r) => (r.cost === undefined ? '' : String(r.cost))));
  // A smaller size follows the 1 kg buying price while its own value matches the calculation (or is empty).
  const [linked, setLinked] = useState(rows.map((r, i) => weighted && i !== baseIdx && (r.cost === undefined || String(r.cost) === autoCost(String(rows[baseIdx]?.cost ?? ''), i))));

  const set = (fn: (a: string[]) => void, arr: string[], i: number, v: string) => { const next = [...arr]; next[i] = v; fn(next); };
  const changeCost = (i: number, v: string) => {
    const next = [...cost];
    next[i] = v;
    if (i === baseIdx) rows.forEach((_, j) => { if (linked[j]) next[j] = autoCost(v, j); });
    else if (linked[i]) setLinked(linked.map((x, j) => (j === i ? false : x)));
    setCost(next);
  };
  const relink = (i: number) => { setLinked(linked.map((x, j) => (j === i ? true : x))); set(setCost, cost, i, autoCost(cost[baseIdx], i)); };

  return (
    <div className="tbl"><table className="t sku">
      <thead><tr><th>Size</th><th>Selling price</th><th>Before <span className="sub">(sale)</span></th><th>Buying price</th><th className="r">Profit / bag</th><th className="r">Margin</th><th>Stock</th><th className="r">Sold · 30d</th></tr></thead>
      <tbody>{rows.map((r, i) => {
        const pv = n(price[i]), cv = blank(cost[i]) ? null : n(cost[i]), bv = blank(before[i]) ? null : n(before[i]);
        const profit = cv === null || !(pv > 0) ? null : pv - cv;
        const pct = profit === null ? null : profit / pv;
        const tone = pct === null ? '' : pct < 0.12 ? 'bad' : pct < 0.18 ? 'warn' : 'ok';
        const off = bv && bv > pv ? Math.round((1 - pv / bv) * 100) : null;
        const st = n(stock[i]);
        return (
          <tr key={r.label}>
            <td className="ar"><b>{r.label}</b>{i === baseIdx && <small className="sub2">base size</small>}</td>
            <td><label className="money"><span>EGP</span><input className="cell" name={`price:${r.label}`} value={price[i]} onChange={(e) => set(setPrice, price, i, e.target.value)} inputMode="numeric" aria-label={`Selling price ${r.label}`} /></label></td>
            <td>
              <label className="money"><span>EGP</span><input className="cell" name={`before:${r.label}`} value={before[i]} onChange={(e) => set(setBefore, before, i, e.target.value)} inputMode="numeric" placeholder="—" aria-label={`Before price ${r.label}`} /></label>
              {off ? <small className="sub2 ok-t">−{off}% shown in store</small> : bv && bv <= pv ? <small className="sub2 bad-t">must be above the price</small> : null}
            </td>
            <td>
              <label className={`money${linked[i] ? ' auto' : ''}`}><span>EGP</span><input className="cell" name={`cost:${r.label}`} value={cost[i]} onChange={(e) => changeCost(i, e.target.value)} inputMode="numeric" placeholder="—" aria-label={`Buying price ${r.label}`} /></label>
              {weighted && i !== baseIdx && (linked[i] ? <small className="sub2">auto from {rows[baseIdx].label}</small> : <button type="button" className="linkish" onClick={() => relink(i)}>↺ auto</button>)}
            </td>
            <td className="r">{profit === null ? <span className="sub">—</span> : <b className="num">{Math.round(profit).toLocaleString('en-US')}</b>}</td>
            <td className="r">{pct === null ? <span className="sub">—</span> : <span className={`mg ${tone}`}>{Math.round(pct * 100)}%</span>}</td>
            <td><input className={`cell ${st === 0 ? 'bad' : st <= low ? 'warn' : ''}`} name={`stock:${r.label}`} value={stock[i]} onChange={(e) => set(setStock, stock, i, e.target.value)} inputMode="numeric" aria-label={`Stock ${r.label}`} /></td>
            <td className="r">{r.sold30}</td>
          </tr>
        );
      })}</tbody>
    </table></div>
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
