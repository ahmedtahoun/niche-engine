// Small server-drawn charts for the admin (plain SVG: no chart library, nothing to load).

/** Tiny line of a series, for KPI cards. */
export function Sparkline({ values, w = 120, h = 32 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - 2 - (v / max) * (h - 4)}`);
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={`0,${h} ${pts.join(' ')} ${w},${h}`} className="spark-fill" />
      <polyline points={pts.join(' ')} className="spark-line" />
    </svg>
  );
}

/** "▲ 12%" against the previous period (green up, red down). */
export function Delta({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="delta flat">new</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  return <span className={`delta ${Math.abs(value) < 0.005 ? 'flat' : good ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(Math.round(value * 100))}%</span>;
}

/** Daily revenue columns with a light grid and labels at the ends. */
export function RevenueChart({ daily, format }: { daily: { date: string; revenue: number; orders: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  const nice = (() => { const p = 10 ** Math.floor(Math.log10(max)); return Math.ceil(max / p) * p; })();
  const label = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return (
    <div className="rchart">
      <div className="rgrid">{[1, 0.5, 0].map((f) => <span key={f}>{format(nice * f)}</span>)}</div>
      <div className="rbars">
        {daily.map((d) => (
          <div key={d.date} className="rcol" title={`${label(d.date)} · ${format(d.revenue)} · ${d.orders} orders`}>
            <i style={{ height: `${(d.revenue / nice) * 100}%` }} className={d.revenue ? '' : 'zero'} />
          </div>
        ))}
      </div>
      <div className="rx"><span>{label(daily[0].date)}</span><span>{label(daily[Math.floor(daily.length / 2)].date)}</span><span>Today</span></div>
    </div>
  );
}

/** Horizontal share bars (channels, areas, funnel). */
export function Bars({ rows }: { rows: { label: React.ReactNode; value: number; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="sbars">
      {rows.map((r, i) => (
        <div key={i} className="sbar"><span className="sl">{r.label}</span><span className="st"><i style={{ width: `${(r.value / max) * 100}%` }} /></span><span className="sv">{r.note ?? r.value}</span></div>
      ))}
    </div>
  );
}
