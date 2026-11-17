import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { boldParts, coffeeReturns } from '@/lib/returns';
import { pageMeta, waLink } from '@/lib/site';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg || cfg.returnsPolicy !== 'coffee') return {};
  const s = await speaker(cfg);
  const r = coffeeReturns(s.lang);
  return pageMeta(cfg, s.lang, '/returns', { title: r.title, description: r.lead });
}

const Rich = ({ text }: { text: string }) => <>{boldParts(text).map((p, i) => (p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}</>;

/** Returns and exchanges for a coffee store: opened bags, offers and coffee ground to order can't come back; only listed defects do. */
export default async function ReturnsPage({ params }: P) {
  const cfg = getNiche((await params).niche);
  if (!cfg || cfg.returnsPolicy !== 'coffee') notFound();
  const s = await speaker(cfg);
  const r = coffeeReturns(s.lang);
  return (
    <main className="page narrow" style={{ display: 'grid', gap: 14 }}>
      <h1 style={{ fontFamily: 'var(--f-display), serif', fontSize: 24, margin: 0 }}>{r.title}</h1>
      <span className="muted small">{r.updated}</span>
      <p style={{ margin: 0 }}>{r.lead}</p>
      <section id="coffee" className="box" style={{ display: 'grid', gap: 8 }}>
        <h2 className="sec" style={{ margin: 0 }}>{r.box.h}</h2>
        <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 8 }}>
          {r.box.items!.map((x) => <li key={x}><Rich text={x} /></li>)}
        </ul>
      </section>
      {r.sections.map((x) => (
        <section key={x.h} style={{ display: 'grid', gap: 6 }}>
          <h2 className="h4" style={{ margin: 0 }}>{x.h}</h2>
          <p style={{ margin: 0 }}><Rich text={x.text!} /></p>
        </section>
      ))}
      <p className="muted" style={{ margin: 0 }}>{r.law}</p>
      {cfg.brand.whatsapp && (
        <a className="btn primary" href={waLink(cfg.brand.whatsapp, s.t('wa.hello', { brand: s.brand(cfg) }))} target="_blank" rel="noopener">💬 {s.t('ft.wa')}</a>
      )}
    </main>
  );
}
