// The Coffee Passport booklet: an ink stamp per origin country, the free welcome stamp, progress to
// Explorer, and "try this" links for countries still to collect. Server component (no state).
import Link from 'next/link';
import type { NicheConfig } from '@niche-engine/core';
import type { Speaker } from '@/lib/i18n';
import type { Passport, Stamp } from '@/lib/passport';
import { SharePassport } from './SharePassport';

const INKS = ['#B4552D', '#2F6B4F', '#1F5C8A', '#7A4E9C', '#9A5B34', '#A23B5A'];
/** "بلد واحد", "بلدين", "3 بلاد" / "1 country", "3 countries". */
const countries = (n: number, en: boolean) => (en ? `${n} ${n === 1 ? 'country' : 'countries'}` : n === 1 ? 'بلد واحد' : n === 2 ? 'بلدين' : n <= 10 ? `${n} بلاد` : `${n} بلد`);

/** Same small tilt for a country every time, like a real stamp. */
const tilt = (name: string) => ((name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 15) - 7);

function StampMark({ label, flag, date, ink, state, s }: { label: string; flag: string; date?: string; ink: string; state: Stamp['state'] | 'welcome'; s: Speaker }) {
  const done = state === 'stamped' || state === 'welcome';
  return (
    <div className={`pp-stamp ${state}`} style={{ '--ink': ink, transform: done ? `rotate(${tilt(label)}deg)` : undefined } as React.CSSProperties}>
      <span className="pp-flag" aria-hidden="true">{flag}</span>
      <b>{label}</b>
      <small>{state === 'coming' ? s.t('pp.coming') : state === 'empty' ? s.t('pp.empty') : date ?? ''}</small>
    </div>
  );
}

export function PassportBook({ pp, cfg, s, shareUrl, compact = false, signedIn = true }: { pp: Passport; cfg: NicheConfig; s: Speaker; shareUrl?: string; compact?: boolean; signedIn?: boolean }) {
  const L = (x: { ar: string; en: string }) => (s.en ? x.en : x.ar);
  const day = (iso?: string) => (iso ? s.date(iso) : '');
  const left = Math.max(0, pp.goal - pp.stamped);
  const status = pp.explorer
    ? (pp.rewarded ? s.t('pp.explorerDone', { x: s.egp(pp.rewardEgp) }) : s.t('pp.explorer'))
    : left > 0 ? s.t('pp.left', { c: countries(left, s.en), x: s.egp(pp.rewardEgp) })
    : s.t('pp.oneMore', { n: pp.ordersShort });
  const shown = compact ? pp.stamps.slice(0, 3) : pp.stamps;
  return (
    <section className={`pp${compact ? ' compact' : ''}`} aria-label={s.t('pp.title')}>
      <div className="pp-head">
        <span className="pp-crest" aria-hidden="true">🛂</span>
        <div>
          <b>{s.t('pp.title')}</b>
          <span className="small">{pp.firstName ? s.t('pp.of', { name: pp.firstName, brand: s.brand(cfg) }) : s.brand(cfg)}</span>
        </div>
        <span className="pp-count num">{pp.stamped}/{pp.goal}</span>
      </div>
      <div className="pp-bar" aria-hidden="true"><i style={{ width: `${Math.min(100, (pp.stamped / pp.goal) * 100)}%` }} /></div>
      <p className={`pp-status${pp.explorer ? ' win' : ''}`}>{status}</p>
      <div className="pp-page">
        <StampMark label={L(pp.welcome)} flag="☕" date={day(pp.welcome.at) || s.t('pp.welcome')} ink="#5E3B25" state="welcome" s={s} />
        {shown.map((st, i) => (
          <div key={st.country.ar} className="pp-slot">
            <StampMark label={L(st.country)} flag={st.country.flag} date={day(st.at)} ink={INKS[i % INKS.length]} state={st.state} s={s} />
            {st.state === 'empty' && !compact && st.country.products[0] && (
              <Link className="pp-try small" href={s.href(`/p/${st.country.products[0].slug}`)}>{s.t('pp.try', { name: s.product(st.country.products[0]) })}</Link>
            )}
          </div>
        ))}
      </div>
      {pp.coming > 0 && !compact && <p className="small muted" style={{ margin: 0 }}>{s.t('pp.comingNote')}</p>}
      {pp.explorer && pp.rewarded && !signedIn && <p className="small" style={{ margin: 0 }}>{s.t('pp.signinToUse')}</p>}
      {!compact && <p className="small muted" style={{ margin: 0 }}>{s.t('pp.how', { n: pp.goal, x: s.egp(pp.rewardEgp) })}</p>}
      {shareUrl && <SharePassport url={shareUrl} text={s.t(pp.explorer ? 'pp.shareExplorer' : 'pp.shareText', { n: pp.stamped, brand: s.brand(cfg) })} label={s.t(compact ? 'pp.open' : 'pp.share')} compact={compact} />}
    </section>
  );
}
