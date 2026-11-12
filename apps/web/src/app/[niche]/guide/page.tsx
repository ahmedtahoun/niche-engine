import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guidesFor } from '@/lib/guides';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { pageMeta } from '@/lib/site';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg) return {};
  const s = await speaker(cfg);
  return pageMeta(cfg, s.lang, '/guide', { title: s.t('guides'), description: s.t('guidesSub') });
}

export default async function GuidesPage({ params }: P) {
  const cfg = getNiche((await params).niche);
  const guides = cfg ? guidesFor(cfg.id) : [];
  if (!cfg || !guides.length) notFound();
  const s = await speaker(cfg);
  return (
    <main className="page narrow">
      <h1 className="title">{s.t('guides')}</h1>
      <p className="muted" style={{ margin: 0 }}>{s.t('guidesSub')}</p>
      <div className="guides">
        {guides.map((g) => (
          <Link key={g.slug} className="guide-link" href={s.href(`/guide/${g.slug}`)}>
            <b>{s.en ? g.title.en : g.title.ar}</b>
            <span className="muted small">{s.en ? g.short.en : g.short.ar}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
