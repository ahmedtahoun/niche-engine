import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/ProductCard';
import { catalog, type PriceBand, type SortKey } from '@/lib/catalog';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';

export async function generateMetadata() { return { title: (await speaker()).t('nav.search') }; }

const SORTS: SortKey[] = ['best', 'low', 'high', 'rating'];
const BANDS: Exclude<PriceBand, 'all'>[] = ['lt300', 'mid', 'gt900'];

type SP = { q?: string; cat?: string; sort?: string; price?: string; family?: string };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ niche: string }>; searchParams: Promise<SP> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const t = s.t;
  const sp = await searchParams;
  const q = (sp.q ?? '').slice(0, 80);
  const cat = cfg.categories.some((c) => c.id === sp.cat) ? sp.cat : undefined;
  const family = cfg.tasteFamilies?.find((f) => f.id === sp.family);
  const sort = (SORTS.find((k) => k === sp.sort) ?? 'best') as SortKey;
  const price = (BANDS.find((b) => b === sp.price) ?? 'all') as PriceBand;
  const catl = await catalog();
  const results = q || cat || family ? catl.search(cfg, { q, cat, sort, price, family: family?.id }) : [];
  const link = (patch: Partial<SP>) => {
    const u = new URLSearchParams();
    const next = { q, cat, family: family?.id, sort: sort === 'best' ? undefined : sort, price: price === 'all' ? undefined : price, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) u.set(k, v);
    return s.href(`/search?${u}`);
  };

  return (
    <main className="page">
      <form className="sbox" role="search" action={s.href(`/search`)}>
        {cat && <input type="hidden" name="cat" value={cat} />}
        <input name="q" type="search" defaultValue={q} placeholder={t('searchPh')} aria-label={t('nav.search')} autoFocus={!q && !cat} />
        <button className="btn primary" type="submit">{t('nav.search')}</button>
      </form>
      <nav className="chips" aria-label={t('categories')}>
        {cfg.categories.map((c) => (
          <Link key={c.id} className="chip" aria-current={cat === c.id ? 'true' : undefined} href={link({ cat: cat === c.id ? undefined : c.id })}>{s.category(c)}</Link>
        ))}
      </nav>

      {family && <div className="chips"><Link className="chip" aria-current="true" href={link({ family: undefined })}>{(s.en && family.labelEn) || family.labelAr} ✕</Link></div>}
      {!q && !cat && !family ? (
        <section style={{ display: 'grid', gap: 10 }}>
          <h2 className="h4">{t('popular')}</h2>
          <div className="chips" style={{ flexWrap: 'wrap' }}>
            {((s.en && cfg.popularSearches?.en) || cfg.popularSearches?.ar || []).map((x) => <Link key={x} className="chip" href={link({ q: x })}>{x}</Link>)}
          </div>
        </section>
      ) : (
        <>
          <div style={{ display: 'grid', gap: 6 }}>
            <span className="label">{t('sort')}</span>
            <div className="chips">{SORTS.map((k) => <Link key={k} className="chip" aria-current={sort === k ? 'true' : undefined} href={link({ sort: k === 'best' ? undefined : k })}>{t(`sort.${k}`)}</Link>)}</div>
            <span className="label">{t('price')}</span>
            <div className="chips">{BANDS.map((k) => <Link key={k} className="chip" aria-current={price === k ? 'true' : undefined} href={link({ price: price === k ? undefined : k })}>{t(`band.${k}`)}</Link>)}</div>
          </div>
          {results.length ? (
            <>
              <p className="muted" style={{ margin: 0 }}>{t('resultsN', { n: results.length })}{q ? t('resultsFor', { q }) : ''}</p>
              <div className="grid">{results.map((p) => <ProductCard key={p.id} p={p} seller={catl.sellerOf(p)} s={s} />)}</div>
            </>
          ) : (
            <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
              <b>{q ? t('noResultsQ', { q }) : t('noResults')}</b>
              <span className="muted">{t('noResultsHint')}</span>
              {price !== 'all' && <Link className="btn ghost" href={link({ price: undefined })}>{t('clearPrice')}</Link>}
            </div>
          )}
        </>
      )}
    </main>
  );
}
