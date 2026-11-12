import Link from 'next/link';
import type { NicheConfig } from '@niche-engine/core';
import { guidesFor } from '@/lib/guides';
import type { Speaker } from '@/lib/i18n';
import { waLink } from '@/lib/site';

export function Footer({ cfg, s }: { cfg: NicheConfig; s: Speaker }) {
  return (
    <footer className="foot">
      {cfg.brand.about && <p className="about small">{(s.en && cfg.brand.about.en) || cfg.brand.about.ar}</p>}
      <div className="trust">
        <div>{s.t('ft.exchange')}</div>
        <div>{s.t('ft.cr')}</div>
      </div>
      {cfg.brand.whatsapp && <div className="row"><span>{s.t('ft.wa')}</span><a className="num" dir="ltr" href={waLink(cfg.brand.whatsapp, s.t('wa.hello', { brand: s.brand(cfg) }))} rel="noopener" target="_blank" style={{ color: 'var(--primary)', fontWeight: 700 }}>{cfg.brand.whatsapp.replace(/^(\d{4})(\d{3})(\d{4})$/, '$1 $2 $3')}</a></div>}
      <div className="row"><span>{s.t('ft.hours')}</span><span>{s.t('ft.hoursText')}</span></div>
      <div className="links"><span>{s.t('ft.exchangePolicy')}</span><span>{s.t('ft.shipping')}</span><span>{s.t('ft.privacy')}</span>{guidesFor(cfg.id).length > 0 && <Link href={s.href(`/guide`)}>{s.t('guides')}</Link>}{cfg.acceptsSellers !== false ? <Link href={s.href(`/sell`)}>{s.t('ft.sell')}</Link> : <span>{s.t('ft.sell')}</span>}</div>
      <span className="muted">{s.brand(cfg)} · {cfg.brand.domain}</span>
    </footer>
  );
}
