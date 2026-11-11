import Link from 'next/link';
import type { NicheConfig } from '@niche-engine/core';
import { guidesFor } from '@/lib/guides';
import type { Speaker } from '@/lib/i18n';

export function Footer({ cfg, s }: { cfg: NicheConfig; s: Speaker }) {
  return (
    <footer className="foot">
      <div className="trust">
        {cfg.risk.openBeforePay && <div>{s.t('ft.open')}</div>}
        <div>{s.t('ft.exchange')}</div>
        <div>{s.t('ft.cr')}</div>
      </div>
      <div className="row"><span>{s.t('ft.wa')}</span><span className="num" dir="ltr">0100 000 0000</span></div>
      <div className="row"><span>{s.t('ft.hours')}</span><span>{s.t('ft.hoursText')}</span></div>
      <div className="links"><span>{s.t('ft.exchangePolicy')}</span><span>{s.t('ft.shipping')}</span><span>{s.t('ft.privacy')}</span>{guidesFor(cfg.id).length > 0 && <Link href={`/${cfg.id}/guide`}>{s.t('guides')}</Link>}{cfg.acceptsSellers !== false ? <Link href={`/${cfg.id}/sell`}>{s.t('ft.sell')}</Link> : <span>{s.t('ft.sell')}</span>}</div>
      <span className="muted">{s.brand(cfg)} · {cfg.brand.domain}</span>
    </footer>
  );
}
