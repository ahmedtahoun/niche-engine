import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { jsonLd, pageMeta } from '@/lib/site';
import { botUsername } from '@/lib/telegram-setup';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg) return {};
  const s = await speaker(cfg);
  return pageMeta(cfg, s.lang, '/sell', { title: s.t('sell.title', { brand: s.brand(cfg) }), description: s.t('sell.lead') });
}

/** For roasters and brands: what we do, the exact commission, how to start. Numbers come from the niche settings. */
export default async function SellPage({ params }: P) {
  const cfg = getNiche((await params).niche);
  if (!cfg || cfg.acceptsSellers === false) notFound();
  const s = await speaker(cfg);
  const t = s.t;
  const bot = await botUsername();
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const faq: [string, string][] = [[t('sell.faq1q'), t('sell.faq1a')], [t('sell.faq2q'), t('sell.faq2a')], [t('sell.faq3q'), t('sell.faq3a')]];
  return (
    <main className="page narrow">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) })} />
      <section className="hero" style={{ gridTemplateColumns: '1fr' }}>
        <h1 style={{ fontFamily: 'var(--f-display), serif', fontSize: 24, margin: 0 }}>{t('sell.title', { brand: s.brand(cfg) })}</h1>
        <p style={{ margin: 0 }}>{t('sell.lead')}</p>
        {bot && <a className="btn" href={`https://t.me/${bot}?start=apply_${cfg.id}`} rel="noopener">{t('sell.cta')}</a>}
      </section>
      <section style={{ display: 'grid', gap: 10 }}>
        <h2 className="sec">{t('sell.why')}</h2>
        <div className="families">
          {(['w1', 'w2', 'w3', 'w4'] as const).map((k) => (
            <div key={k} className="family" style={{ gridTemplateColumns: '1fr' }}><b>{t(`sell.${k}`)}</b><span className="muted">{t(`sell.${k}s`)}</span></div>
          ))}
        </div>
      </section>
      <section className="box">
        <h2 className="sec" style={{ margin: 0 }}>{t('sell.fees')}</h2>
        <div className="row"><span>{t('sell.feeNew')}</span><b className="num">{pct(cfg.commission.new)}</b></div>
        <div className="row"><span>{t('sell.feeRepeat')}</span><b className="num">{pct(cfg.commission.repeat)}</b></div>
        <div className="row"><span>{t('sell.feeReferral')}</span><b className="num">{pct(cfg.commission.referral)}</b></div>
        <span className="muted small">{t('sell.reserve', { p: Math.round(cfg.reserve.percent * 100), d: cfg.reserve.days })} {t('sell.noFees')}</span>
      </section>
      <section style={{ display: 'grid', gap: 10 }}>
        <h2 className="sec">{t('sell.how')}</h2>
        <div className="steps4">{(['h1', 'h2', 'h3', 'h4'] as const).map((k) => <div key={k}><span>{t(`sell.${k}`)}</span></div>)}</div>
      </section>
      <section className="box">
        <b>{t('sell.need')}</b>
        {(['n1', 'n2', 'n3', 'n4'] as const).map((k) => <span key={k}>✓ {t(`sell.${k}`)}</span>)}
      </section>
      <section>
        <h2 className="h4">{t('faq')}</h2>
        {faq.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
      </section>
      {bot ? <a className="btn primary block" href={`https://t.me/${bot}?start=apply_${cfg.id}`} rel="noopener">{t('sell.cta')}</a> : <div className="note info">{t('sell.ctaLater')}</div>}
    </main>
  );
}
