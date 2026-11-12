import type { NicheConfig } from '@niche-engine/core';
import type { Speaker } from '@/lib/i18n';
import type { Product } from '@/lib/types';

/** The emoji for a tasting note, from the niche's noteEmoji words (first match wins). */
export function noteEmoji(cfg: NicheConfig | null | undefined, note: string): string {
  const n = note.toLowerCase();
  for (const [word, e] of Object.entries(cfg?.noteEmoji ?? {})) if (n.includes(word.toLowerCase())) return e;
  return '';
}

/** Tasting notes as small chips with an emoji (cards and product pages). */
export function Notes({ p, s, max = 3, cfg, big }: { p: Product; s: Speaker; max?: number; cfg?: NicheConfig | null; big?: boolean }) {
  const notes = (s.en && p.profile?.notesEn?.length ? p.profile.notesEn : p.profile?.notes) ?? [];
  if (!notes.length) return null;
  return <div className={big ? 'notes notes-lg' : 'notes'} aria-label={s.t('notes')}>{notes.slice(0, max).map((n) => { const e = noteEmoji(cfg, n); return <span key={n}>{e && <i aria-hidden="true">{e}</i>}{n}</span>; })}</div>;
}

/** One coffee bean of a 1–5 scale, filled when on. */
const Bean = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 24 24" className={on ? 'on' : ''} aria-hidden="true">
    <g transform="rotate(-30 12 12)"><ellipse cx="12" cy="12" rx="7" ry="10" fill="currentColor" /><path d="M12 3 C9 7 15 10 12 12 C9 14 15 17 12 21" fill="none" stroke="var(--surface)" strokeWidth="1.6" strokeLinecap="round" /></g>
  </svg>
);

/** Flavor family and 1–5 scales (body, acidity…) drawn from what the roaster states. */
export function TasteProfile({ p, cfg, s }: { p: Product; cfg: NicheConfig; s: Speaker }) {
  const fam = cfg.tasteFamilies?.find((f) => f.id === p.profile?.family);
  const scales = (cfg.profileScales ?? []).filter((sc) => p.profile?.scales?.[sc.id]);
  if (!fam && !scales.length && !p.profile?.notes?.length) return null;
  const word = (ar: string, en?: string) => (s.en && en) || ar;
  const values = (cfg.choices ?? []).filter((c) => c.categories.includes(p.category)).flatMap((c) => c.values);
  const best = (fam?.bestIn ?? []).map((id) => values.find((v) => v.id === id)).filter((v): v is (typeof values)[number] => Boolean(v));
  return (
    <section className="taste" aria-labelledby="taste-h">
      <h2 className="h4" id="taste-h">{s.t('tasteProfile')}</h2>
      <Notes p={p} s={s} max={5} cfg={cfg} big />
      {fam && <div className="fam"><b>{fam.emoji ? `${fam.emoji} ` : ''}{word(fam.labelAr, fam.labelEn)}</b>{fam.hintAr && <span className="muted">{word(fam.hintAr, fam.hintEn)}</span>}</div>}
      {best.length > 0 && (
        <div className="best">
          <span className="small muted">{s.t('bestIn')}</span>
          <div className="best-list">{best.map((v) => <span key={v.id}>{v.emoji && <i aria-hidden="true">{v.emoji}</i>}{s.choiceValue(v)}</span>)}</div>
        </div>
      )}
      {scales.map((sc) => {
        const v = Math.max(1, Math.min(5, p.profile!.scales![sc.id]));
        return (
          <div className="scale" key={sc.id}>
            <span className="small">{word(sc.labelAr, sc.labelEn)}</span>
            <div className="beans" role="img" aria-label={`${word(sc.labelAr, sc.labelEn)}: ${v}/5`}>{[1, 2, 3, 4, 5].map((i) => <Bean key={i} on={i <= v} />)}</div>
            <span className="small muted ends"><span>{word(sc.lowAr, sc.lowEn)}</span><span>{word(sc.highAr, sc.highEn)}</span></span>
          </div>
        );
      })}
    </section>
  );
}
