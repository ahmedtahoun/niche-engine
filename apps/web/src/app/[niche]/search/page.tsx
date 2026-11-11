import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { search, type PriceBand, type SortKey } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';

export const metadata = { title: 'بحث' };

const POPULAR: Record<string, string[]> = {
  umrah: ['عباية عمرة', 'نقاب بالخمار', 'طرحة شيفون', 'إحرام رجالي'],
  coffee: ['بن إثيوبي', 'اسبريسو', 'بن تركي', 'V60'],
};
const SORTS: [SortKey, string][] = [['best', 'الأكثر طلباً'], ['low', 'الأقل سعراً'], ['high', 'الأعلى سعراً'], ['rating', 'الأعلى تقييماً']];
const BANDS: [PriceBand, string][] = [['lt300', 'أقل من 300'], ['mid', '300–900'], ['gt900', 'فوق 900']];

type SP = { q?: string; cat?: string; sort?: string; price?: string };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ niche: string }>; searchParams: Promise<SP> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const sp = await searchParams;
  const q = (sp.q ?? '').slice(0, 80);
  const cat = cfg.categories.some((c) => c.id === sp.cat) ? sp.cat : undefined;
  const sort = (SORTS.find((s) => s[0] === sp.sort)?.[0] ?? 'best') as SortKey;
  const price = (BANDS.find((b) => b[0] === sp.price)?.[0] ?? 'all') as PriceBand;
  const results = q || cat ? search(cfg, { q, cat, sort, price }) : [];
  const link = (patch: Partial<SP>) => {
    const u = new URLSearchParams();
    const next = { q, cat, sort: sort === 'best' ? undefined : sort, price: price === 'all' ? undefined : price, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) u.set(k, v);
    return `/${cfg.id}/search?${u}`;
  };

  return (
    <main className="page">
      <form className="sbox" role="search" action={`/${cfg.id}/search`}>
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" type="search" defaultValue={q} placeholder="دوري على منتج…" aria-label="بحث" autoFocus={!q && !cat} />
        <button className="btn primary" type="submit">بحث</button>
      </form>
      <nav className="chips" aria-label="الأقسام">
        {cfg.categories.map((c) => (
          <Link key={c.id} className="chip" aria-current={cat === c.id ? 'true' : undefined} href={link({ cat: cat === c.id ? undefined : c.id })}>{c.labelAr}</Link>
        ))}
      </nav>

      {!q && !cat ? (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 className="h4">الأكثر بحثاً</h2>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {(POPULAR[cfg.id] ?? []).map((x) => <Link key={x} className="chip" href={link({ q: x })}>{x}</Link>)}
          </div>
        </section>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="label">ترتيب</span>
            <div className="chips">{SORTS.map(([k, l]) => <Link key={k} className="chip" aria-current={sort === k ? 'true' : undefined} href={link({ sort: k === 'best' ? undefined : k })}>{l}</Link>)}</div>
            <span className="label">السعر</span>
            <div className="chips">{BANDS.map(([k, l]) => <Link key={k} className="chip" aria-current={price === k ? 'true' : undefined} href={link({ price: price === k ? undefined : k })}>{l}</Link>)}</div>
          </div>
          {results.length ? (
            <>
              <p className="muted" style={{ margin: 0 }}>{results.length} منتج{q ? ` لـ "${q}"` : ''}</p>
              <div className="grid">{results.map((p) => <ProductCard key={p.id} p={p} />)}</div>
            </>
          ) : (
            <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
              <b>مش لاقيين {q ? `"${q}"` : 'منتجات هنا'}</b>
              <span className="muted">جربي كلمة أبسط، أو شيلي فلتر السعر، أو اسألينا على واتساب ونلاقيهولك.</span>
              {price !== 'all' && <Link className="btn ghost" href={link({ price: undefined })}>شيلي فلتر السعر</Link>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
