// Placeholder product drawings until real seller photos are uploaded.
import type { ArtKind } from '@/lib/types';

const SHAPES: Record<Exclude<ArtKind, 'kit'>, string> = {
  abaya: 'M40 12 Q50 7 60 12 L70 20 L88 54 L80 58 L68 40 L75 93 L25 93 L32 40 L20 58 L12 54 L30 20 Z',
  niqab: 'M27 16 Q50 2 73 16 L78 62 Q50 84 22 62 Z M33 33 L67 33 L67 40 L33 40 Z',
  khimar: 'M50 7 Q72 9 76 33 L91 90 L9 90 L24 33 Q28 9 50 7 Z M40 28 Q50 20 60 28 L60 43 Q50 51 40 43 Z',
  hijab: 'M16 34 L50 12 L84 34 L78 76 L50 92 L22 76 Z',
  ihram: 'M16 16 L84 16 L84 44 L16 44 Z M20 52 L80 52 L80 90 L20 90 Z',
  bag: 'M28 18 L72 18 L76 30 L80 92 L20 92 L24 30 Z M36 46 L64 46 L64 66 L36 66 Z',
  tool: 'M18 22 L82 22 L60 62 L40 62 Z M42 66 L58 66 L58 72 L42 72 Z M30 78 L70 78 L70 84 L30 84 Z',
};

export function Art({ kind, color, kitColors, image, alt = '' }: { kind: ArtKind; color: string; kitColors?: string[]; image?: string; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (image) return <img className="photo" src={image} alt={alt} loading="lazy" decoding="async" />;
  if (kind === 'kit') {
    const [a = '#D8C6A6', b = '#2A2D30', c = '#CBBDA5'] = kitColors ?? [];
    return (
      <svg viewBox="0 0 120 100" aria-hidden="true">
        <g transform="translate(30 4) scale(.82)"><path d={SHAPES.abaya} fill={a} stroke="rgba(0,0,0,.25)" /></g>
        <g transform="translate(2 40) scale(.52)"><path d={SHAPES.niqab} fill={b} fillRule="evenodd" stroke="rgba(255,255,255,.3)" /></g>
        <g transform="translate(70 46) scale(.5)"><path d={SHAPES.hijab} fill={c} stroke="rgba(0,0,0,.25)" /></g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <path d={SHAPES[kind]} fill={color} fillRule="evenodd" stroke="rgba(0,0,0,.22)" strokeWidth="1.2" />
    </svg>
  );
}

/** Up to three bundle parts drawn as one group (any niche). */
export function BundleArt({ parts }: { parts: { art: ArtKind; color: string }[] }) {
  const slots = [
    { t: 'translate(30 4) scale(.82)' },
    { t: 'translate(2 40) scale(.52)' },
    { t: 'translate(70 46) scale(.5)' },
  ];
  return (
    <svg viewBox="0 0 120 100" aria-hidden="true">
      {parts.slice(0, 3).map((p, i) => (
        <g key={i} transform={slots[i].t}>
          <path d={SHAPES[p.art === 'kit' ? 'bag' : p.art]} fill={p.color} fillRule="evenodd" stroke="rgba(0,0,0,.25)" />
        </g>
      ))}
    </svg>
  );
}

export const Icon = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11l8-7 8 7v9H4z" /></svg>,
  cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h3l2 12h11l2-8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
};
