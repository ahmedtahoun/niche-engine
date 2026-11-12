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
export function Notes({ p, s, max = 3, cfg }: { p: Product; s: Speaker; max?: number; cfg?: NicheConfig | null }) {
  const notes = (s.en && p.profile?.notesEn?.length ? p.profile.notesEn : p.profile?.notes) ?? [];
  if (!notes.length) return null;
  return <div className="notes" aria-label={s.t('notes')}>{notes.slice(0, max).map((n) => { const e = noteEmoji(cfg, n); return <span key={n}>{e && <i aria-hidden="true">{e}</i>}{n}</span>; })}</div>;
}

/** Flavor family and 1–5 scales (body, acidity…) drawn from what the roaster states. */
export function TasteProfile({ p, cfg, s }: { p: Product; cfg: NicheConfig; s: Speaker }) {
  const fam = cfg.tasteFamilies?.find((f) => f.id === p.profile?.family);
  const scales = (cfg.profileScales ?? []).filter((sc) => p.profile?.scales?.[sc.id]);
  if (!fam && !scales.length && !p.profile?.notes?.length) return null;
  const word = (ar: string, en?: string) => (s.en && en) || ar;
  return (
    <section className="taste" aria-labelledby="taste-h">
      <h2 className="h4" id="taste-h">{s.t('tasteProfile')}</h2>
      <Notes p={p} s={s} max={5} cfg={cfg} />
      {fam && <div className="fam"><b>{fam.emoji ? `${fam.emoji} ` : ''}{word(fam.labelAr, fam.labelEn)}</b>{fam.hintAr && <span className="muted">{word(fam.hintAr, fam.hintEn)}</span>}</div>}
      {scales.map((sc) => {
        const v = Math.max(1, Math.min(5, p.profile!.scales![sc.id]));
        return (
          <div className="scale" key={sc.id}>
            <span className="small">{word(sc.labelAr, sc.labelEn)}</span>
            <div className="dots" role="img" aria-label={`${word(sc.labelAr, sc.labelEn)}: ${v}/5`}>{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= v ? 'on' : ''} />)}</div>
            <span className="small muted ends"><span>{word(sc.lowAr, sc.lowEn)}</span><span>{word(sc.highAr, sc.highEn)}</span></span>
          </div>
        );
      })}
    </section>
  );
}
