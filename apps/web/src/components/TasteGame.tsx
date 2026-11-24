'use client';
// "What do you taste?" (دوّقت إيه؟): after brewing, tap the flavours you notice among this coffee's
// notes and a few that are not in it, then see what you caught. Built to make people succeed:
// before they guess, each real note's "when to notice it" hint is one tap away, and a miss is never
// "wrong", only "sip again as it cools". Results and the palate level stay in this browser.
import { useEffect, useMemo, useState } from 'react';
import { palateLevel, tastingChoices } from '@/lib/notes';
import { useSpeak } from './I18n';

const KEY = 'cr_palate';
type Saved = Record<string, { caught: string[]; at: number }>;
const load = (): Saved => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') as Saved; } catch { return {}; } };
const save = (v: Saved) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* storage blocked */ } };
/** "نكهة واحدة", "نكهتين", "3 نكهات" / "1 note", "3 notes". */
const notesWord = (n: number, en: boolean) => (en ? `${n} more ${n === 1 ? 'note' : 'notes'}` : n === 1 ? 'نكهة واحدة' : n === 2 ? 'نكهتين' : n <= 10 ? `${n} نكهات` : `${n} نكهة`);
const totalCaught = (v: Saved) => Object.values(v).reduce((a, x) => a + x.caught.length, 0);

export function TasteGame({ slug, notes, name }: { slug: string; notes: string[]; name: string }) {
  const s = useSpeak();
  const L = (x: { ar: string; en: string }) => (s.en ? x.en : x.ar);
  const choices = useMemo(() => tastingChoices(notes, slug), [notes, slug]);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState<Saved>({});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const v = load();
    setSaved(v);
    if (v[slug]) { setPicked(new Set(v[slug].caught)); setDone(true); }
  }, [slug]);
  const real = choices.filter((c) => c.real);
  if (real.length < 2) return null;

  const caught = real.filter((c) => picked.has(c.info.id));
  const missed = real.filter((c) => !picked.has(c.info.id));
  const extra = choices.filter((c) => !c.real && picked.has(c.info.id));
  const before = totalCaught(saved) - (saved[slug]?.caught.length ?? 0);
  const lvl = palateLevel(before + (done ? caught.length : 0));

  // Functional update: quick taps in a row must each count.
  const toggle = (id: string) => { if (done) return; setPicked((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; }); };
  const reveal = () => {
    const v = { ...load(), [slug]: { caught: caught.map((c) => c.info.id), at: Date.now() } };
    save(v); setSaved(v); setDone(true);
  };
  const again = () => { const v = load(); delete v[slug]; save(v); setSaved(v); setPicked(new Set()); setDone(false); };

  return (
    <section className="tg" aria-labelledby="tg-h">
      <div className="tg-head">
        <span aria-hidden="true">👅</span>
        <div><h2 className="h4" id="tg-h" style={{ margin: 0 }}>{s.t('tg.title')}</h2><span className="small muted">{s.t('tg.sub', { name })}</span></div>
      </div>
      {!open && !done ? (
        <button type="button" className="btn ghost block" onClick={() => setOpen(true)}>☕ {s.t('tg.start')}</button>
      ) : (
        <>
          {!done && <p className="small" style={{ margin: 0 }}>{s.t('tg.how')}</p>}
          <div className="tg-grid" role="group" aria-label={s.t('tg.title')}>
            {choices.map((c) => {
              const on = picked.has(c.info.id);
              const cls = !done ? (on ? 'on' : '') : c.real ? (on ? 'hit' : 'miss') : on ? 'extra' : 'off';
              return (
                <button key={c.info.id} type="button" className={`tg-chip ${cls}`} aria-pressed={on} disabled={done} onClick={() => toggle(c.info.id)}>
                  <i aria-hidden="true">{c.info.emoji}</i>{L(c.info.name)}
                  {done && c.real && <span className="tg-mark" aria-hidden="true">{on ? '✓' : '•'}</span>}
                </button>
              );
            })}
          </div>
          {!done ? (
            <button type="button" className="btn primary block" disabled={!picked.size} onClick={reveal}>{picked.size ? s.t('tg.reveal', { n: picked.size }) : s.t('tg.pick')}</button>
          ) : (
            <div className="tg-result" role="status">
              <b>{caught.length === real.length ? s.t('tg.all') : caught.length ? s.t('tg.some', { n: caught.length, of: real.length }) : s.t('tg.none')}</b>
              {missed.length > 0 && <span className="small">{s.t('tg.missed', { list: missed.map((c) => L(c.info.name)).join(s.en ? ', ' : '، '), tip: L(missed[0].info.when) })}</span>}
              {extra.length > 0 && <span className="small muted">{s.t('tg.extra', { list: extra.map((c) => L(c.info.name)).join(s.en ? ', ' : '، ') })}</span>}
              <div className="tg-level"><span>🏅 {s.t('tg.level', { name: L(lvl.name), n: lvl.level })}</span>{lvl.next !== null && <span className="small muted">{s.t('tg.next', { c: notesWord(lvl.next - (before + caught.length), s.en) })}</span>}</div>
              <button type="button" className="small tg-again" onClick={again}>{s.t('tg.again')}</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
