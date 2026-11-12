// Placeholder product drawings until real seller photos are uploaded.
import { CARD_SIZES, responsive } from '@/lib/img';
import type { ArtKind } from '@/lib/types';

const SHAPES: Record<Exclude<ArtKind, 'kit' | 'coffee'>, string> = {
  abaya: 'M40 12 Q50 7 60 12 L70 20 L88 54 L80 58 L68 40 L75 93 L25 93 L32 40 L20 58 L12 54 L30 20 Z',
  niqab: 'M27 16 Q50 2 73 16 L78 62 Q50 84 22 62 Z M33 33 L67 33 L67 40 L33 40 Z',
  khimar: 'M50 7 Q72 9 76 33 L91 90 L9 90 L24 33 Q28 9 50 7 Z M40 28 Q50 20 60 28 L60 43 Q50 51 40 43 Z',
  hijab: 'M16 34 L50 12 L84 34 L78 76 L50 92 L22 76 Z',
  ihram: 'M16 16 L84 16 L84 44 L16 44 Z M20 52 L80 52 L80 90 L20 90 Z',
  bag: 'M28 18 L72 18 L76 30 L80 92 L20 92 L24 30 Z M36 46 L64 46 L64 66 L36 66 Z',
  tool: 'M18 22 L82 22 L60 62 L40 62 Z M42 66 L58 66 L58 72 L42 72 Z M30 78 L70 78 L70 84 L30 84 Z',
};

/** A stand-up coffee pouch (kraft, valve, zip) with a label in the coffee's color: 100 × 100 grid. */
function CoffeeBag({ color, label }: { color: string; label?: { brand: string; name: string } }) {
  return (
    <g>
      <path d="M23 17 L77 17 L81 91 Q50 96 19 91 Z" fill="#CFAF86" stroke="rgba(0,0,0,.22)" strokeWidth="1.2" />
      <path d="M23 17 L77 17 L77.6 26 L22.4 26 Z" fill="#B8956A" />
      <path d="M22 30 L78 30" stroke="#A9865C" strokeWidth="1.4" strokeDasharray="2.5 2" />
      <circle cx="66" cy="37" r="3.2" fill="#A9865C" />
      <rect x="29" y="45" width="42" height="36" rx="4" fill={color} />
      <g transform={label ? 'translate(50 79) scale(.86) translate(-50 -77)' : undefined}>
      <path d="M43 77 V60 C43 55 46 52 50 49 C54 52 57 55 57 60 V77" fill="none" stroke="#F3E9D8" strokeWidth="1.8" />
      <ellipse cx="50" cy="66.5" rx="3.6" ry="5.4" fill="#F3E9D8" transform="rotate(-24 50 66.5)" />
      <path d="M50 61.5 C48 63.5 52 65 50 67 C48 69 52 70 50 72" fill="none" stroke={color} strokeWidth="1" transform="rotate(-24 50 66.5)" />
      </g>
      {label && (
        <>
          <text x="50" y="40.5" textAnchor="middle" fontSize="3.6" fontWeight="700" letterSpacing=".6" fill="#5A3A22">{label.brand}</text>
          <text x="50" y="52" textAnchor="middle" fontSize="4.4" fontWeight="700" fill="#F3E9D8">{label.name}</text>
        </>
      )}
    </g>
  );
}

const Shape = ({ kind, color, label }: { kind: Exclude<ArtKind, 'kit'>; color: string; label?: { brand: string; name: string } }) =>
  kind === 'coffee' ? <CoffeeBag color={color} label={label} /> : <path d={SHAPES[kind]} fill={color} fillRule="evenodd" stroke="rgba(0,0,0,.22)" strokeWidth="1.2" />;

/** label: brand and product name printed on the drawn coffee bag (product pages without a photo). */
export function Art({ kind, color, kitColors, image, alt = '', label }: { kind: ArtKind; color: string; kitColors?: string[]; image?: string; alt?: string; label?: { brand: string; name: string } }) {
  // eslint-disable-next-line @next/next/no-img-element
  // Cards, cart lines and bundle parts: small photo on phones.
  if (image) return <img className="photo" {...responsive(image, CARD_SIZES)} alt={alt} loading="lazy" decoding="async" />;
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
      <Shape kind={kind} color={color} label={label} />
    </svg>
  );
}

/** Round curator's stamp for product photos: the brand mark in the middle, the pick line over the top, the brand name upright along the bottom. */
export function PickSeal({ text, under, logo, rtl }: { text: string; under: string; logo?: string; rtl: boolean }) {
  return (
    <svg className="pick-seal" viewBox="0 0 120 120" role="img" aria-label={text}>
      <defs>
        <path id="seal-top" d="M19 60 A41 41 0 0 1 101 60" />
        <path id="seal-bottom" d="M11.5 60 A48.5 48.5 0 0 0 108.5 60" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="var(--base)" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="var(--primary)" strokeWidth="2.2" />
      <circle cx="60" cy="60" r="30" fill="none" stroke="var(--primary)" strokeWidth="1" strokeDasharray="2 2.4" />
      <text fontSize={rtl ? 12 : 10.5} fontWeight="800" letterSpacing={rtl ? 0 : 1.2} fill="var(--primary)" direction={rtl ? 'rtl' : 'ltr'}>
        <textPath href="#seal-top" startOffset="50%" textAnchor="middle">{text}</textPath>
      </text>
      <text fontSize={rtl ? 9 : 10} fontWeight="700" letterSpacing={rtl ? 1.4 : 0} fill="var(--ink, #24160F)" direction={rtl ? 'ltr' : 'rtl'}>
        <textPath href="#seal-bottom" startOffset="50%" textAnchor="middle">{under}</textPath>
      </text>
      <text x="10" y="63.5" fontSize="8" fill="var(--primary)" textAnchor="middle">✦</text>
      <text x="110" y="63.5" fontSize="8" fill="var(--primary)" textAnchor="middle">✦</text>
      {logo && <image href={logo} x="45" y="40" width="30" height="36" />}
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
          <Shape kind={p.art === 'kit' ? 'bag' : p.art} color={p.color} />
        </g>
      ))}
    </svg>
  );
}

/** Small line icons for the trust bar (24 × 24, drawn in the brand color). */
export const TrustIcon: Record<string, React.ReactNode> = {
  seal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.8l2.3 1.7 2.8-.2.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.2L12 21.2l-2.3-1.7-2.8.2-.9-2.7-2.3-1.6.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.2z" /><path d="M8.6 12.2l2.3 2.3 4.5-4.6" strokeLinecap="round" /></svg>,
  cash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5" /><circle cx="12" cy="12" r="2.8" /><path d="M6 9.5v5M18 9.5v5" strokeLinecap="round" /></svg>,
  truck: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M2.5 6.5h11v9h-11zM13.5 9.5h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" fill="var(--surface)" /><circle cx="17" cy="17.5" r="1.8" fill="var(--surface)" /></svg>,
  return: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9h11a5 5 0 010 10H9" /><path d="M8 5L4 9l4 4" /></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" /></svg>,
};

export const Icon = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>,
  home: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 11l8-7 8 7v9H4z" /></svg>,
  cart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 4h3l2 12h11l2-8H7" /><circle cx="10" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>,
};
