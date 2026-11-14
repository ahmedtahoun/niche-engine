import Link from 'next/link';
import type { NicheConfig } from '@niche-engine/core';
import type { BundleView } from '@/lib/catalog';
import type { Speaker } from '@/lib/i18n';
import { CARD_SIZES, responsive } from '@/lib/img';
import { BundleArt } from './Art';

/** The starter box ("First time? Start here"): on the home page inside the coffee grid, and on product pages. */
export function BoxCard({ bv, cfg, s, className = '' }: { bv: BundleView; cfg: NicheConfig; s: Speaker; className?: string }) {
  const eyebrow = cfg.homeEyebrow ? (s.en && cfg.homeEyebrow.en) || cfg.homeEyebrow.ar : '';
  return (
    <Link className={`box-card ${className}`.trim()} href={s.href(`/b/${bv.bundle.id}`)}>
      <div className={`art${bv.bundle.image ? ' has-photo' : ''}`}>{bv.bundle.image
        // eslint-disable-next-line @next/next/no-img-element
        ? <img className="photo" {...responsive(bv.bundle.image, CARD_SIZES)} alt={s.bundle(bv.bundle)} loading="lazy" decoding="async" />
        : <BundleArt parts={bv.parts.map((p) => p.product)} />}</div>
      <div>
        {eyebrow && <span className="small">{eyebrow}</span>}
        <b>{s.bundle(bv.bundle)}</b>
        <span className="small muted">{bv.parts.map((p) => s.product(p.product).split(' — ')[0]).join(' + ')}</span>
        <div className="price num"><b>{s.egp(bv.price)}</b><s>{s.egp(bv.fullPrice)}</s><span className="save">{s.t('bundleSave', { x: s.egp(bv.bundle.discountEgp) })}</span></div>
      </div>
    </Link>
  );
}
