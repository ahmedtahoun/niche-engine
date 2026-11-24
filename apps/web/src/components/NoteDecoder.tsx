'use client';
// Tap a tasting note to decode it: what it means in coffee, when you notice it, a familiar taste to
// compare it with, and other coffees with the same note. Opens as a bottom sheet on phones.
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { noteInfo, type NoteInfo } from '@/lib/notes';
import { useSpeak } from './I18n';

export type NoteLinks = Record<string, { slug: string; name: string }[]>;

export function NoteChips({ notes, emojis, links }: { notes: string[]; emojis: string[]; links: NoteLinks }) {
  const s = useSpeak();
  const [open, setOpen] = useState<{ note: string; info: NoteInfo | null } | null>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);
  const L = (x: { ar: string; en: string }) => (s.en ? x.en : x.ar);
  return (
    <>
      <div className="notes notes-lg notes-tap" aria-label={s.t('notes')}>
        {notes.map((n, i) => (
          <button key={n} type="button" onClick={() => setOpen({ note: n, info: noteInfo(n) })} aria-haspopup="dialog">
            {emojis[i] && <i aria-hidden="true">{emojis[i]}</i>}{n}<span className="q" aria-hidden="true">؟</span>
          </button>
        ))}
      </div>
      <span className="small muted">{s.t('nd.tapHint')}</span>
      {open && (
        <div className="qa-layer" role="presentation" onClick={() => setOpen(null)}>
          <div className="qa-sheet nd-sheet" role="dialog" aria-modal="true" aria-label={open.note} onClick={(e) => e.stopPropagation()}>
            <div className="nd-head">
              <span className="nd-emoji" aria-hidden="true">{open.info?.emoji ?? '☕'}</span>
              <div><span className="small muted">{s.t('nd.eyebrow')}</span><b>{open.info ? L(open.info.name) : open.note}</b></div>
              <button type="button" className="nd-x" aria-label={s.t('close')} onClick={() => setOpen(null)}>×</button>
            </div>
            {open.info ? (
              <dl className="nd-facts">
                <div><dt>{s.t('nd.what')}</dt><dd>{L(open.info.what)}</dd></div>
                <div><dt>{s.t('nd.when')}</dt><dd>{L(open.info.when)}</dd></div>
                <div><dt>{s.t('nd.like')}</dt><dd>{L(open.info.like)}</dd></div>
              </dl>
            ) : <p className="muted" style={{ margin: 0 }}>{s.t('nd.generic')}</p>}
            <p className="small muted" style={{ margin: 0 }}>{s.t('nd.natural')}</p>
            {open.info && (links[open.info.id] ?? []).length > 0 && (
              <div className="nd-more">
                <span className="small muted">{s.t('nd.alsoIn')}</span>
                <div>{links[open.info.id].map((p) => <Link key={p.slug} href={s.href(`/p/${p.slug}`)} onClick={() => setOpen(null)}>{p.name}</Link>)}</div>
              </div>
            )}
            <Link className="small" style={{ fontWeight: 700, color: 'var(--primary)' }} href={s.href('/notes')} onClick={() => setOpen(null)}>{s.t('nd.all')}</Link>
          </div>
        </div>
      )}
    </>
  );
}
