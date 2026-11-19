import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { hasPolicyPages, policy, richParts, type PolicyKind } from '@/lib/policies';
import { pageMeta, waLink } from '@/lib/site';

type P = { params: Promise<{ niche: string }> };

/** Text with **bold** and [links](/path) (store links get the store's base, e.g. /coffee on localhost). */
function Rich({ text, href }: { text: string; href: (p: string) => string }) {
  return <>{richParts(text).map((p, i) => (p.href ? <Link key={i} href={href(p.href)} style={{ textDecoration: 'underline' }}>{p.text}</Link> : p.bold ? <b key={i}>{p.text}</b> : <span key={i}>{p.text}</span>))}</>;
}

export async function policyMetadata(kind: PolicyKind, { params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg || !hasPolicyPages(cfg)) return {};
  const s = await speaker(cfg);
  const r = policy(kind, cfg, s.lang);
  return pageMeta(cfg, s.lang, `/${kind}`, { title: r.title, description: r.lead.replace(/\*\*|\[|\]\([^)]*\)/g, '') });
}

/** The store's privacy, shipping or terms page (coffee stores: lib/policies.ts). */
export async function PolicyPage({ kind, params }: P & { kind: PolicyKind }) {
  const cfg = getNiche((await params).niche);
  if (!cfg || !hasPolicyPages(cfg)) notFound();
  const s = await speaker(cfg);
  const r = policy(kind, cfg, s.lang);
  const href = (p: string) => s.href(p.replace(/\?lang=en$/, ''));
  return (
    <main className="page narrow" style={{ display: 'grid', gap: 14 }}>
      <h1 style={{ fontFamily: 'var(--f-display), serif', fontSize: 24, margin: 0 }}>{r.title}</h1>
      <span className="muted small">{r.updated}</span>
      <p style={{ margin: 0 }}><Rich text={r.lead} href={href} /></p>
      {r.sections.map((x) => (
        <section key={x.h} id={x.id} style={{ display: 'grid', gap: 6 }}>
          <h2 className="h4" style={{ margin: 0 }}>{x.h}</h2>
          {x.text && <p style={{ margin: 0 }}><Rich text={x.text} href={href} /></p>}
          {x.items && <ul style={{ margin: 0, paddingInlineStart: 20, display: 'grid', gap: 6 }}>{x.items.map((t) => <li key={t}><Rich text={t} href={href} /></li>)}</ul>}
        </section>
      ))}
      {cfg.brand.whatsapp && (
        <a className="btn primary" href={waLink(cfg.brand.whatsapp, s.t('wa.hello', { brand: s.brand(cfg) }))} target="_blank" rel="noopener">💬 {s.t('ft.wa')}</a>
      )}
    </main>
  );
}
