// Cairo Roast bag labels, v4: one print-ready colour label per coffee, for the 13 × 20 cm white bag.
//   node brand/cairo-roast/labels.mjs
// LABEL: 110 × 180 mm, arch top, 3 mm bleed (artboard 116 × 186 mm), 5 mm safe area. A solid deep colour
// per coffee, cream type, gold printed as ink (no foil). In the window: the contour lines of the origin
// under a small still life of the notes (drawn, never written). Out: PDF + SVG (fonts embedded) +
// 300 dpi PNG per coffee, all-labels.pdf, dieline.pdf/svg, and bag previews. Labels go to ./labels.
// It also writes the store's bag photos to apps/web/public/products/coffee (see the end).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const dir = path.join(here, 'labels');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const C = { espresso: '#1E1410', roast: '#B4552D', foil: '#B08D57', muted: '#6F6259', hair: '#DDD6CB', white: '#FFFFFF' };

const font = (pkg, file) => readFileSync(path.join(root, 'node_modules', '@fontsource', pkg, 'files', file)).toString('base64');
const face = (fam, pkg, w, ar, lat) => `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff;base64,${font(pkg, ar)}) format('woff');unicode-range:U+0600-06FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff;base64,${font(pkg, lat)}) format('woff');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+2190-2199,U+2212}`;
const plex = (w) => face('Plex', 'ibm-plex-sans-arabic', w, `ibm-plex-sans-arabic-arabic-${w}-normal.woff`, `ibm-plex-sans-arabic-latin-${w}-normal.woff`);
const mess = (w) => face('Messiri', 'el-messiri', w, `el-messiri-arabic-${w}-normal.woff`, `el-messiri-latin-${w}-normal.woff`);
const STYLE = `<style>${[plex(200), plex(300), plex(400), plex(500), mess(600)].join('\n')}
.l2{font-family:Plex;font-weight:200}.l3{font-family:Plex;font-weight:300}.l4{font-family:Plex;font-weight:400}.l5{font-family:Plex;font-weight:500}.a6{font-family:Messiri;font-weight:600}
</style>`;

// ---------- logo (brand kit mark: Cairo arch + bean with the Nile line, 200 × 240 grid) ----------
const LOGO_ARCH = 'M24 232 V118 C24 70 58 38 100 8 C142 38 176 70 176 118 V232';
const logo = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="${LOGO_ARCH}" fill="none" stroke="${C.foil}" stroke-width="12" stroke-linecap="square" stroke-linejoin="round"/>
  <path d="M8 232 H192" stroke="${C.foil}" stroke-width="12" stroke-linecap="square"/>
  <g transform="rotate(-24 100 150)"><ellipse cx="100" cy="150" rx="40" ry="58" fill="${C.roast}"/>
  <path d="M100 96 C80 118 120 136 100 152 C80 168 120 186 100 206" fill="none" stroke="#F3E9D8" stroke-width="7" stroke-linecap="round"/></g></g>`;

// ---------- shapes (mm) ----------
const TRIM = 'M3 135 Q3 138 6 138 H95 Q98 138 98 135 V40 C98 22 79 9.5 50.5 3 C22 9.5 3 22 3 40 Z';
const BLEED = 'M0 141 V40 C0 20 20 6.5 50.5 0 C81 6.5 101 20 101 40 V141 Z';
const FRAME = 'M5.4 132.6 Q5.4 135.6 8.4 135.6 H92.6 Q95.6 135.6 95.6 132.6 V40.4 C95.6 23.4 77.4 11.4 50.5 5.3 C23.6 11.4 5.4 23.4 5.4 40.4 Z';
const WIN = 'M18 86 V61 C18 49 32.4 40.6 50.5 33.2 C68.6 40.6 83 49 83 61 V86 Z';
const WIN_OUT = 'M16.4 87.6 V60.6 C16.4 47.8 31.4 38.9 50.5 31.4 C69.6 38.9 84.6 47.8 84.6 60.6 V87.6 Z';

// ---------- still-life pieces (drawn small and simple) ----------
const leaf = (x, y, r, s, c) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 C1.6 -1.9 4.8 -1.9 6.2 0 C4.8 1.9 1.6 1.9 0 0 Z" fill="${c}"/><path d="M0.3 0 H5.7" stroke="#FFFFFF70" stroke-width="0.16"/></g>`;
const stem = (d, w = 0.42) => `<path d="${d}" fill="none" stroke="#7A5A3E" stroke-width="${w}" stroke-linecap="round"/>`;
const blossom = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-1.55" rx="0.95" ry="1.6" fill="#FFFFFF" stroke="#E5D7CD" stroke-width="0.12" transform="rotate(${a})"/>`).join('')}<circle r="0.55" fill="#F2B35C"/></g>`;
const fruit = (id, x, y, r, c0, c1, c2) => `<defs><radialGradient id="${id}" cx="0.36" cy="0.34" r="0.78"><stop offset="0" stop-color="${c0}"/><stop offset="0.68" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><circle cx="${x}" cy="${y}" r="${r}" fill="url(#${id})"/>`;
const apricot = (id, x, y, r) => `${fruit(id, x, y, r, '#FBCB8E', '#F29A4E', '#D97636')}<path d="M${x + 0.3} ${y - r} C${x - r * 0.42} ${y - r * 0.3} ${x - r * 0.36} ${y + r * 0.55} ${x + 0.5} ${y + r}" fill="none" stroke="#C9692F" stroke-width="0.38" opacity=".8"/>`;
const tangerine = (id, x, y, r) => `${fruit(id, x, y, r, '#FFB777', '#F57C2B', '#D35F17')}${[[-0.3, -0.2], [0.35, 0.25], [-0.1, 0.45], [0.4, -0.35]].map(([a, b]) => `<circle cx="${x + a * r}" cy="${y + b * r}" r="0.12" fill="#C4581A" opacity=".55"/>`).join('')}<circle cx="${x}" cy="${y - r + 0.7}" r="0.55" fill="#8A6A2E"/>`;
const orangeSlice = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F28C28"/><circle cx="${x}" cy="${y}" r="${r - 0.8}" fill="#FFF1D2"/><circle cx="${x}" cy="${y}" r="${r - 1.2}" fill="#FBC46C"/>
  ${Array.from({ length: 9 }, (_, i) => { const a = (i * 2 * Math.PI) / 9; return `<path d="M${x} ${y} L${(x + Math.cos(a) * (r - 1.2)).toFixed(2)} ${(y + Math.sin(a) * (r - 1.2)).toFixed(2)}" stroke="#FFF1D2" stroke-width="0.5"/>`; }).join('')}<circle cx="${x}" cy="${y}" r="0.6" fill="#FFF1D2"/>`;
const berries = (x, y) => `${stem(`M${x + 3.4} ${y - 5.4} C${x + 2.6} ${y - 3} ${x + 1.8} ${y - 1.4} ${x + 1.2} ${y - 0.4}`, 0.32)}${[[0, 0], [1.7, -0.6], [1.1, 1.1], [2.6, 0.7], [-0.6, 1.4]].map(([a, b], i) => `<circle cx="${x + a}" cy="${y + b}" r="1.05" fill="${i % 2 ? '#6E3A72' : '#85528D'}"/><circle cx="${x + a - 0.3}" cy="${y + b - 0.35}" r="0.27" fill="#FFFFFF55"/>`).join('')}`;
const cherries = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${[[0, 0], [2.1, 0.9], [0.6, 2.1]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="1.3" ry="1.1" fill="#B8323A"/><circle cx="${a - 0.4}" cy="${b - 0.35}" r="0.3" fill="#FFFFFF50"/><path d="M${a - 0.5} ${b + 0.1} h0.9" stroke="#7E1F25" stroke-width="0.16"/>`).join('')}</g>`;
const bean = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><ellipse cx="0" cy="0" rx="1.45" ry="2.05" fill="#6B4430"/><path d="M0 -1.8 c-0.6 0.8 0.6 1.3 0 1.9 c-0.6 0.6 0.6 1.2 0 1.8" fill="none" stroke="#3A2418" stroke-width="0.22" stroke-linecap="round"/></g>`;
const chocolate = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-5" y="-3.2" width="10" height="6.4" rx="0.7" fill="#5A3324"/>
  ${[-1.7, 1.7].map((cy) => [-3.4, 0, 3.4].map((cx) => `<rect x="${cx - 1.45}" y="${cy - 1.35}" width="2.9" height="2.7" rx="0.35" fill="#6E4130"/><path d="M${cx - 1.2} ${cy - 1.1} h2.3" stroke="#8A5640" stroke-width="0.2"/>`).join('')).join('')}</g>`;
const teaLeaves = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${stem('M0 0 C1.2 -2 2.6 -3.4 4.2 -4.2', 0.3)}${leaf(1, -1.4, -120, 0.75, '#3F6B4A')}${leaf(2.4, -2.8, -40, 0.8, '#4F7D57')}${leaf(4, -4, -100, 0.6, '#5E8C63')}</g>`;
const hazelnut = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M-2.2 -0.2 C-2.2 1.9 -1 2.6 0 2.6 C1 2.6 2.2 1.9 2.2 -0.2 Z" fill="#A8673A"/><path d="M-2.35 -0.2 C-2.2 -1.7 -1.1 -2.4 0 -2.4 C1.1 -2.4 2.2 -1.7 2.35 -0.2 Z" fill="#6B3F22"/><rect x="-0.2" y="-3.1" width="0.4" height="0.9" rx="0.2" fill="#6B3F22"/><ellipse cx="-0.9" cy="1" rx="0.4" ry="0.75" fill="#C88A57" opacity=".7"/></g>`;
const walnut = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="2.8" ry="2.4" fill="#B98A5C"/><path d="M0 -2.4 V2.4" stroke="#8C6440" stroke-width="0.25"/>${[-1.4, 1.4].map((a) => `<path d="M${a} -1.8 c${a > 0 ? 0.8 : -0.8} 0.6 ${a > 0 ? -0.6 : 0.6} 1.2 0 1.8 c${a > 0 ? 0.6 : -0.6} 0.6 ${a > 0 ? -0.4 : 0.4} 1.2 0 1.6" fill="none" stroke="#8C6440" stroke-width="0.22"/>`).join('')}</g>`;
const cane = (x, y, len, r) => `<g transform="translate(${x} ${y}) rotate(${r})">${Array.from({ length: Math.round(len / 3) }, (_, i) => `<rect x="-0.55" y="${-(i + 1) * 3 + 0.2}" width="1.1" height="2.8" rx="0.35" fill="#B9C277"/><rect x="-0.6" y="${-(i + 1) * 3 + 0.05}" width="1.2" height="0.3" rx="0.15" fill="#8C9450"/>`).join('')}${leaf(0, -len + 1, -60, 0.9, '#8FA35A')}</g>`;
const mango = (id, x, y, s = 1) => `<defs><radialGradient id="${id}" cx="0.4" cy="0.35" r="0.8"><stop offset="0" stop-color="#FFE08A"/><stop offset="0.6" stop-color="#F9B44A"/><stop offset="1" stop-color="#E9772E"/></radialGradient></defs>
  <g transform="translate(${x} ${y}) rotate(-20) scale(${s})"><path d="M-3.4 0.4 C-3.6 -2.6 -0.6 -3.8 1.8 -3.2 C3.8 -2.6 4.2 0.2 3.2 2 C2 3.8 -1.4 3.8 -2.8 2.4 C-3.2 1.9 -3.3 1.2 -3.4 0.4 Z" fill="url(#${id})"/><path d="M1.4 -3.25 C1.6 -4 1.9 -4.4 2.3 -4.7" fill="none" stroke="#6B4A2E" stroke-width="0.3" stroke-linecap="round"/><path d="M2.2 -4.6 C3.4 -5.6 5.2 -5.2 5.8 -4.4 C4.6 -3.8 3.2 -3.9 2.2 -4.6 Z" fill="#5E8A4E"/></g>`;
const caramel = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><rect x="-1.9" y="-1.9" width="3.8" height="3.8" rx="0.7" fill="#C98B3A"/><rect x="-1.9" y="-1.9" width="3.8" height="1.3" rx="0.6" fill="#DDA455"/><path d="M-1.2 -1.3 h1.6" stroke="#F2C98A" stroke-width="0.25" stroke-linecap="round"/></g>`;
const oakLeaf = (x, y, r, s = 1) => `<g transform="translate(${x} ${y}) rotate(${r}) scale(${s})"><path d="M0 0 C0.8 -0.8 1.4 -0.2 1.8 -1 C2.2 -1.8 2.9 -1.2 3.3 -1.8 C3.8 -2.5 4.6 -1.9 5 -2.3 C5.4 -1.7 5.4 -1.2 6.4 -0.9 C6 -0.2 6.6 0.3 6.4 0.9 C5.4 1.2 5.4 1.7 5 2.3 C4.6 1.9 3.8 2.5 3.3 1.8 C2.9 1.2 2.2 1.8 1.8 1 C1.4 0.2 0.8 0.8 0 0 Z" fill="#A9814A"/><path d="M0.2 0 H6" stroke="#7D5C30" stroke-width="0.18"/></g>`;
const dipper = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-0.45" y="-11" width="0.9" height="8" rx="0.4" fill="#C8A46E"/>
  ${Array.from({ length: 5 }, (_, i) => `<ellipse cx="0" cy="${-2.4 + i * 1}" rx="${1.9 - Math.abs(i - 2) * 0.2}" ry="0.55" fill="${i % 2 ? '#B08752' : '#C8A46E'}"/>`).join('')}
  <path d="M-1.6 2.4 C-1.8 3.4 -0.6 3.6 -0.4 4.8 C-0.3 5.8 0.5 5.8 0.5 4.9 C0.6 3.8 1.8 3.4 1.6 2.4 Z" fill="#5A2810"/><circle cx="0.05" cy="6.6" r="0.5" fill="#5A2810"/></g>`;
const almond = (x, y, r) => `<g transform="translate(${x} ${y}) rotate(${r})"><path d="M0 -2.3 C1.5 -1.2 1.6 1.2 0 2.1 C-1.6 1.2 -1.5 -1.2 0 -2.3 Z" fill="#B07A4A"/><path d="M0 -1.6 C0.4 -0.4 0.4 0.6 0 1.5" fill="none" stroke="#8A5A32" stroke-width="0.18"/></g>`;
const coffeeBranch = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${stem('M-12 6 C-6 2 0 0 12 -4', 0.5)}${leaf(-8, 3.6, 150, 1.1, '#4F7A49')}${leaf(-3, 1.6, -40, 1.15, '#5F8A5A')}${leaf(3, -0.4, 150, 1.1, '#4F7A49')}${leaf(7.5, -2, -50, 1, '#6E9467')}
  ${cherries(-5.6, 2.4, 0.9)}${cherries(1, 0.6, 1)}${cherries(6.6, -2.4, 0.85)}</g>`;

/** Contour lines of the origin's hills: the background of every window. */
function contours(cx, cy, tint, seed) {
  return Array.from({ length: 10 }, (_, i) => {
    const r = 3.2 + i * 3;
    const pts = Array.from({ length: 52 }, (_, k) => { const a = (k / 52) * Math.PI * 2; const w = 1 + 0.12 * Math.sin(a * 3 + i * 0.7 + seed) + 0.07 * Math.cos(a * 5 + i + seed); return [cx + Math.cos(a) * r * w * 1.3, cy + Math.sin(a) * r * w * 0.82]; });
    return `<path d="M${pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z" fill="none" stroke="${tint}" stroke-width="${i % 3 === 2 ? 0.26 : 0.16}" opacity="${(0.75 - i * 0.04).toFixed(2)}"/>`;
  }).join('');
}

// ---------- the coffees (illustrations follow Bonds' tasting notes; El Salvador shows the coffee itself) ----------
const CAIRO = [30.04, 31.24];
const km = ([a, b]) => { const r = (d) => (d * Math.PI) / 180; const h = Math.sin(r(a - CAIRO[0]) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(CAIRO[0])) * Math.sin(r(b - CAIRO[1]) / 2) ** 2; return Math.round((2 * 6371 * Math.asin(Math.sqrt(h))) / 100) * 100; };

const COFFEES = [
  { slug: 'bonds-ethiopia-guji', n: 1, origin: 'ETHIOPIA', name: 'Guji Hambela', ar: 'إثيوبيا جوجي هامبيلا', from: { en: 'GUJI', at: [5.9, 38.7] },
    bg: ['#FCF4F1', '#F1E2EC'], tint: '#C9A6C4', accent: '#9B4F74', contour: [36, 66, 1],
    art: (id) => `${stem('M27 58 C35 61 43 63 50 69')}${stem('M35.6 60.6 C34.6 55 37.4 51.6 40.4 50', 0.34)}
      ${leaf(28, 58.4, -150, 0.85, '#6E9467')}${leaf(41.6, 63.8, 30, 0.9, '#5F8A5A')}${leaf(37.6, 52.6, -110, 0.7, '#7AA36F')}
      ${blossom(32, 54.4, 0.95)}${blossom(40.4, 49.2, 0.8)}${blossom(27, 62, 0.7)}
      ${apricot(`ap${id}`, 54, 72, 8.4)}${leaf(54.4, 63.7, -40, 1.05, '#6E9E58')}
      ${berries(66, 65)}${cherries(69.6, 74, 0.95)}${leaf(68.6, 70.6, -20, 0.75, '#4F7A49')}${bean(36, 76, -24)}${bean(41, 78.6, 18, 0.85)}` },
  { slug: 'bonds-ethiopia-limu', n: 2, origin: 'ETHIOPIA', name: 'Limu', ar: 'إثيوبيا ليمو', from: { en: 'LIMU', at: [8.07, 36.95] },
    bg: ['#FBF7EE', '#E3EEE5'], tint: '#9DBFA6', accent: '#2F6B4F', contour: [62, 60, 2.2],
    art: () => `${chocolate(42, 70, -14, 1.15)}${orangeSlice(63, 58.6, 6.2)}${teaLeaves(58, 79, 1.25)}${bean(30.5, 60, -30)}${bean(34.4, 57.6, 20, 0.85)}${leaf(68, 70, 40, 0.9, '#4F7D57')}` },
  { slug: 'bonds-brazil-red-catuai', n: 3, origin: 'BRAZIL', name: 'Red Catuai', ar: 'البرازيل ريد كاتواي', from: { en: 'MOGIANA', at: [-20.54, -47.4] },
    bg: ['#FDF8EC', '#F6EBCC'], tint: '#D9BE86', accent: '#9A5B2E', contour: [44, 62, 3.1],
    art: () => `${cane(36, 82, 26, 24)}${cane(41, 82.5, 22, 34)}${hazelnut(50, 70, -10, 1.3)}${hazelnut(56.4, 73.6, 20, 1.15)}${hazelnut(51.6, 77.2, 5, 1.1)}${walnut(64.6, 66.4, 1.3)}${bean(66, 76, 24)}${bean(61.6, 79, -12, 0.85)}` },
  { slug: 'bonds-colombia-castillo', n: 4, origin: 'COLOMBIA', name: 'Castillo', ar: 'كولومبيا كاستيو', from: { en: 'VALLE DEL CAUCA', at: [3.8, -76.5] },
    bg: ['#FDF5EB', '#E2F0EE'], tint: '#9CC9C4', accent: '#C4621F', contour: [62, 58, 4.3],
    art: (id) => `${oakLeaf(26.4, 58, -30, 1.2)}${mango(`mg${id}`, 37, 70, 1.6)}${tangerine(`tg${id}`, 54.4, 66, 7.6)}${leaf(54.6, 58.6, -48, 1, '#4E8A4A')}${caramel(66.6, 74.4, 14, 1.05)}${caramel(71.4, 70, -10, 0.9)}${bean(46, 78.6, -20)}${bean(50, 80, 30, 0.85)}` },
  { slug: 'bonds-amber', n: 5, origin: 'HOUSE BLEND', name: 'Amber', ar: 'أمبر بلند', blend: true,
    bg: ['#FDF3EA', '#F3DCCB'], tint: '#DDA98C', accent: '#A9472B', contour: [50.5, 64, 5.5],
    art: () => `${dipper(37, 66, -28)}${chocolate(56, 72.4, 10, 1)}${chocolate(62, 64, -18, 0.7)}${hazelnut(44, 78, 10, 1.15)}${hazelnut(70, 76, -16, 1.05)}${bean(48.6, 61, 20, 0.9)}` },
  { slug: 'bonds-chrome', n: 6, origin: 'HOUSE BLEND', name: 'Chrome', ar: 'كروم بلند', blend: true,
    bg: ['#F7F6F4', '#E6E7EB'], tint: '#B4BAC6', accent: '#5E6B80', contour: [50.5, 64, 6.6],
    art: () => `${caramel(39, 70, -12, 1.25)}${caramel(44.4, 75.4, 16, 1.05)}${chocolate(58, 66.4, 12, 1.05)}${almond(66, 76, 30)}${almond(62.6, 78.4, -10)}${hazelnut(52.6, 78.4, 0, 1.05)}${walnut(32.4, 61.6, 1)}${bean(68.6, 60, 24)}` },
  { slug: 'bonds-el-salvador', n: 7, origin: 'EL SALVADOR', name: 'San Agustín', ar: 'السلفادور سان أجوستين', from: { en: 'SAN AGUSTÍN', at: [13.43, -88.6] },
    bg: ['#F8F6FC', '#E4E2F2'], tint: '#ABA6D4', accent: '#5B55B0', contour: [40, 64, 7.7],
    art: () => `${coffeeBranch(50.5, 66, 1.25)}${bean(40, 79, -20)}${bean(45, 80.6, 24, 0.85)}${bean(60, 79.6, 10)}` },
];


// ---------- v4 print label: 110 × 180 mm on a solid colour ----------
// Sheet coordinates in mm: 116 × 186 with 3 mm bleed, trim 3..113 × 3..183, safe area 5 mm inside trim.
const PW = 116, PH = 186;
const TRIM4 = 'M3 180 Q3 183 6 183 H110 Q113 183 113 180 V52 C113 29 91 13 58 3 C25 13 3 29 3 52 Z';
const BLEED4 = 'M0 186 V52 C0 26 23 9.5 58 0 C93 9.5 116 26 116 52 V186 Z';
const FRAME4 = 'M6.6 176.6 Q6.6 179.4 9.4 179.4 H106.6 Q109.4 179.4 109.4 176.6 V52.4 C109.4 32 89.5 17.6 58 8.3 C26.5 17.6 6.6 32 6.6 52.4 Z';
const DEEP = { 'bonds-ethiopia-guji': '#5A2C48', 'bonds-ethiopia-limu': '#1E4536', 'bonds-brazil-red-catuai': '#7A4A1C', 'bonds-colombia-castillo': '#16454F', 'bonds-amber': '#7E2A19', 'bonds-chrome': '#2A2F38', 'bonds-el-salvador': '#2D2A66' };
const CREAM = '#F6EFE6', SOFT = '#E7D9C7', GOLD = '#D9B77E';
// The illustrated window keeps the art's own coordinates (WIN, 65 mm wide) and is scaled up to 80 mm.
const K = 80 / 65, TX = 18 - 18 * K, TY = 42 - 33.2 * K;

/** One label, print size. `size` is 'mm' (print files) or 'px' (300 dpi PNG). */
function label(c, id, size = 'mm') {
  const m = 58, deep = DEEP[c.slug];
  const dist = c.from ? km(c.from.at) : null;
  const name = c.name.toUpperCase();
  const ns = name.length > 10 ? 7.4 : name.length > 6 ? 8.6 : 10;
  const wh = size === 'mm' ? 'width="116mm" height="186mm"' : 'width="1370" height="2197"';
  const t = (x, y, cls, fs, ls, fill, s, extra = '') => `<text x="${x}" y="${y}" text-anchor="middle" class="${cls}" font-size="${fs}" letter-spacing="${ls}" fill="${fill}"${extra}>${s}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" ${wh}>${STYLE}
<defs><clipPath id="w${id}"><path d="${WIN}"/></clipPath><linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg[1]}"/><stop offset="1" stop-color="${c.bg[0]}"/></linearGradient></defs>
<path d="${BLEED4}" fill="${deep}"/>
<path d="${FRAME4}" fill="none" stroke="${GOLD}" stroke-width="0.4"/>
${logo(m - 4.6, 13.4, 0.046).replaceAll(C.foil, GOLD)}
${t(m, 29.6, 'l5', 2.5, 1.5, CREAM, 'CAIRO ROAST')}
${t(m, 34, 'a6', 2.7, 0, GOLD, 'محمصة القاهرة')}
<g transform="translate(${TX.toFixed(3)} ${TY.toFixed(3)}) scale(${K.toFixed(4)})">
<g clip-path="url(#w${id})"><rect x="15" y="30" width="71" height="60" fill="url(#bg${id})"/>${contours(c.contour[0], c.contour[1], c.tint, c.contour[2])}${c.art(id)}</g>
<path d="${WIN}" fill="none" stroke="${GOLD}" stroke-width="${(0.55 / K).toFixed(3)}"/><path d="${WIN_OUT}" fill="none" stroke="${GOLD}" stroke-width="${(0.25 / K).toFixed(3)}"/>
</g>
${t(m, 120.4, 'l5', 2.2, 1.3, GOLD, c.origin)}
${t(m, (123.8 + ns * 0.72).toFixed(2), 'l3', ns, (ns * 0.07).toFixed(2), CREAM, name)}
${t(m, (131.2 + ns * 0.72).toFixed(2), 'a6', 3.6, 0, SOFT, c.ar)}
${t(m, 151.6, 'l4', 1.9, 0.7, SOFT, dist ? '≈ ' + dist.toLocaleString('en-US') + ' KM' : 'SELECTED ORIGINS')}
<circle cx="24" cy="154.6" r="0.8" fill="${GOLD}"/><path d="M26 154.6 H89.6" stroke="${SOFT}" stroke-width="0.26" stroke-dasharray="0.55 1.1" stroke-linecap="round"/>
${logo(89.9, 152.2, 0.019).replaceAll(C.foil, GOLD)}
${t(24, 158.8, 'l5', 1.8, 0.6, SOFT, c.from ? c.from.en : 'THE FARMS')}
${t(91.8, 158.8, 'l5', 1.8, 0.6, SOFT, 'CAIRO')}
${t(m, 169.4, 'l4', 2.1, 1.1, CREAM, `N° 0${c.n}  ·  250 G`)}
<text x="40" y="174" class="l4" font-size="1.7" letter-spacing="0.7" fill="${SOFT}">ROASTED</text><path d="M55.4 174.2 H76" stroke="${SOFT}" stroke-width="0.22"/>
</svg>`;
}

// ---------- the bag (white flat-bottom pouch, 130 × 200 mm) with the label on it ----------
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(STYLE, '');
/** The bag at (x, y), scale s, label on: the pouch spans x -1..131, y 4..200 in its own units. */
function bagAt(c, i, x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})"><defs>
<filter id="sh${i}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="1.2" dy="3" stdDeviation="3.2" flood-color="#3A2A1E" flood-opacity=".18"/></filter>
<linearGradient id="gus${i}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#E9E6E1"/><stop offset=".07" stop-color="#FBFAF8"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset=".93" stop-color="#F7F5F2"/><stop offset="1" stop-color="#E4E0DA"/></linearGradient>
<linearGradient id="base${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#E7E3DD"/></linearGradient>
<clipPath id="tc${i}"><path d="${TRIM4}"/></clipPath></defs>
<path d="M3 4 H127 Q130 4 130 7 L131 194 Q131 200 125 200 H5 Q-1 200 -1 194 L0 7 Q0 4 3 4 Z" fill="url(#gus${i})" filter="url(#sh${i})"/>
<path d="M0 12 H130" stroke="#ECE8E2" stroke-width="0.5"/>
<path d="M0 18 l2.4 1.4 -2.4 1.4 M130 18 l-2.4 1.4 2.4 1.4" fill="none" stroke="#D9D4CC" stroke-width="0.4"/>
<rect x="-1" y="176" width="132" height="24" fill="url(#base${i})"/>
<g transform="translate(7 11)"><g clip-path="url(#tc${i})">${inner(label(c, 'p' + i))}</g></g>
</g>`;
}
/** Mix two hex colours: t = share of a. */
const mix = (a, b, t) => '#' + [1, 3, 5].map((k) => Math.round(parseInt(a.slice(k, k + 2), 16) * t + parseInt(b.slice(k, k + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');
/** A soft studio backdrop tinted with the coffee's colour, and a floor shadow under each bag. */
const backdrop = (w, h, tint, id) => `<defs><radialGradient id="bd${id}" cx="50%" cy="40%" r="75%"><stop offset="0" stop-color="${mix(tint, '#FBF8F4', 0.05)}"/><stop offset="1" stop-color="${mix(tint, '#EFE8DF', 0.14)}"/></radialGradient><filter id="fl${id}"><feGaussianBlur stdDeviation="3"/></filter></defs><rect width="${w}" height="${h}" fill="url(#bd${id})"/>`;
const floor = (cx, y, w, id) => `<ellipse cx="${cx}" cy="${y}" rx="${w / 2}" ry="3.2" fill="#3A2A1E" opacity=".16" filter="url(#fl${id})"/>`;

// ---------- write: print SVG + PDF + 300 dpi PNG per coffee, die line, all-in-one PDF, bag previews ----------
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const tmp = path.join(dir, '.r.html');
const html = (body, page) => `<!doctype html><meta charset="utf-8"><style>@page{size:${page};margin:0}html,body{margin:0;padding:0}svg{display:block}.pg{break-after:page}</style>${body}`;
const pdf = (body, page, out) => { writeFileSync(tmp, html(body, page)); execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--print-to-pdf=' + path.join(dir, out), 'file://' + tmp], { stdio: 'ignore' }); };
const png = (svg, w, h, out) => { writeFileSync(tmp, html(svg, 'auto')); execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, '--screenshot=' + path.join(dir, out), 'file://' + tmp], { stdio: 'ignore' }); };

const die = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PW} ${PH}" width="116mm" height="186mm"><rect x="0.1" y="0.1" width="115.8" height="185.8" fill="none" stroke="#00A0E0" stroke-width="0.2" stroke-dasharray="1 1"/><path d="${TRIM4}" fill="none" stroke="#E5007E" stroke-width="0.25"/><path d="M8 175 V53 C8 33.5 27.5 19.5 58 8.4 C88.5 19.5 108 33.5 108 53 V175 Q108 178 105 178 H11 Q8 178 8 175 Z" fill="none" stroke="#999" stroke-width="0.15" stroke-dasharray="0.6 0.6"/>
<g font-family="sans-serif" fill="#E5007E" text-anchor="middle"><text x="58" y="88" font-size="3">DIE CUT · 110 × 180 mm</text><text x="58" y="93" font-size="2">arch top, 3 mm corners · magenta = cut line</text><text x="58" y="97" font-size="2" fill="#00A0E0">blue = 3 mm bleed (116 × 186 mm)</text><text x="58" y="101" font-size="2" fill="#777">grey = 5 mm safe area</text></g></svg>`;

for (const c of COFFEES) {
  const n = `label-${String(c.n).padStart(2, '0')}-${c.slug.replace('bonds-', '')}`;
  const svg = label(c, 'l');
  writeFileSync(path.join(dir, n + '.svg'), svg);
  pdf(svg, '116mm 186mm', n + '.pdf');
  png(label(c, 'l', 'px'), 1370, 2197, n + '.png');
  execFileSync('sips', ['-s', 'dpiWidth', '300', '-s', 'dpiHeight', '300', path.join(dir, n + '.png')], { stdio: 'ignore' }); // 1370 × 2197 px = 116 × 186 mm
}
writeFileSync(path.join(dir, 'dieline.svg'), die);
pdf(die, '116mm 186mm', 'dieline.pdf');
pdf(COFFEES.map((c, i) => `<div class="pg">${label(c, 'a' + i)}</div>`).join(''), '116mm 186mm', 'all-labels.pdf');
// Bag previews: the seven bags in a row, and one large.
const row = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${7 * 168 - 8} 236" width="${(7 * 168 - 8) * 2}" height="472">${STYLE}<rect width="100%" height="100%" fill="#EDE8E1"/>${COFFEES.map((c, i) => bagAt(c, i, i * 168, 14)).join('')}</svg>`;
png(row, (7 * 168 - 8) * 2, 472, 'preview-all-bags.png');
const one = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 236" width="960" height="1416">${STYLE}<rect width="100%" height="100%" fill="#EDE8E1"/>${bagAt(COFFEES[0], 0, 16, 14)}</svg>`;
png(one, 960, 1416, 'preview-bag-guji.png');

// ---------- store photos for cairoroast.com: apps/web/public/products/coffee (same names as before) ----------
// One 900 × 1125 (4:5) photo per coffee, and the group shot for the home banner (900 × 990).
// Then run `node scripts/photo-sizes.mjs` for the -sm / -md copies, and scripts/make-box-photo.mjs.
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const shop = path.join(root, 'apps/web/public/products/coffee');
const photo = async (svg, w, h, name) => {
  png(svg, w, h, '.shot.png');
  await sharp(path.join(dir, '.shot.png')).webp({ quality: 86 }).toFile(path.join(shop, name + '.webp'));
  rmSync(path.join(dir, '.shot.png'));
};
// Roasted beans, drawn real size (about 10 mm): shaded, with the crease, a highlight and a soft shadow.
const beanDefs = (id) => `<defs><radialGradient id="rb${id}" cx="38%" cy="32%" r="80%"><stop offset="0" stop-color="#9A6038"/><stop offset=".55" stop-color="#6A3B20"/><stop offset="1" stop-color="#3B2012"/></radialGradient><filter id="bs${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="0.9"/></filter></defs>`;
const rbean = (x, y, r, s, id) => `<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${r.toFixed(1)}) scale(${s.toFixed(2)})"><ellipse cx="0.9" cy="1.6" rx="3.7" ry="4.9" fill="#2A1A10" opacity=".32" filter="url(#bs${id})"/><ellipse rx="3.6" ry="4.9" fill="url(#rb${id})"/><path d="M0.2 -4.4 C-1.4 -2.2 1.5 -0.6 0 1 C-1.3 2.4 0.9 3.4 -0.1 4.5" fill="none" stroke="#24130A" stroke-width="0.75" stroke-linecap="round"/><path d="M-2.3 -2.6 C-2.9 -0.8 -2.7 1.4 -1.9 2.8" fill="none" stroke="#C08A5E" stroke-width="0.45" stroke-linecap="round" opacity=".55"/></g>`;
// A seeded random so the photos come out the same every run.
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
/** A loose pile of beans in an ellipse (cx, cy, rx, ry), back to front. */
const pile = (cx, cy, rx, ry, n, seed, id, s = 1) => { const R = rnd(seed); return Array.from({ length: n }, () => { const a = R() * Math.PI * 2, d = Math.sqrt(R()); return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, R() * 360, (0.82 + R() * 0.28) * s]; }).sort((p, q) => p[1] - q[1]).map(([x, y, r, sc]) => rbean(x, y, r, sc, id)).join(''); };
/** The brand arch, large and faint, behind the bag. */
const archMotif = (cx, top, w, h, color) => `<path d="M${cx - w / 2} ${top + h} V${top + w * 0.55} C${cx - w / 2} ${top + w * 0.22} ${cx - w * 0.2} ${top + w * 0.08} ${cx} ${top} C${cx + w * 0.2} ${top + w * 0.08} ${cx + w / 2} ${top + w * 0.22} ${cx + w / 2} ${top + w * 0.55} V${top + h}" fill="none" stroke="${color}" stroke-width="0.9" opacity=".22"/><path d="M${cx - w / 2 + 5} ${top + h} V${top + w * 0.57} C${cx - w / 2 + 5} ${top + w * 0.26} ${cx - w * 0.17} ${top + w * 0.13} ${cx} ${top + 5.5} C${cx + w * 0.17} ${top + w * 0.13} ${cx + w / 2 - 5} ${top + w * 0.26} ${cx + w / 2 - 5} ${top + w * 0.57} V${top + h}" fill="none" stroke="${color}" stroke-width="0.35" opacity=".2"/>`;
const sand = (w, h, id) => `<defs><radialGradient id="sd${id}" cx="50%" cy="38%" r="78%"><stop offset="0" stop-color="#FAF3E8"/><stop offset=".7" stop-color="#EFE2CD"/><stop offset="1" stop-color="#E4D2B6"/></radialGradient><linearGradient id="fl2${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9D9BF" stop-opacity="0"/><stop offset="1" stop-color="#D9C3A1" stop-opacity=".55"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#sd${id})"/><rect y="${h * 0.84}" width="${w}" height="${h * 0.16}" fill="url(#fl2${id})"/>`;

for (const [i, c] of COFFEES.entries()) {
  const id = 's' + i;
  // Store cards show the centre square (y 25–225): the bag and the beans sit inside it; the product page shows it all.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250" width="900" height="1125">${STYLE}${sand(200, 250, id)}${beanDefs(id)}${archMotif(100, 14, 168, 226, C.roast)}${floor(100, 196, 106, id)}
${pile(44, 186, 17, 8, 22, 11 + i, id, 0.9)}${pile(157, 187, 17, 8, 22, 29 + i, id, 0.9)}${bagAt(c, id, 46.8, 30.5, 0.82)}
${pile(50, 203, 22, 6, 20, 47 + i, id, 0.9)}${pile(152, 204, 21, 6, 18, 83 + i, id, 0.9)}${pile(100, 214, 50, 5, 9, 101 + i, id, 0.85)}${pile(100, 234, 70, 6, 8, 131 + i, id, 0.85)}</svg>`;
  await photo(svg, 900, 1125, c.slug.replace('bonds-', ''));
}
{
  const by = (s) => COFFEES.find((c) => c.slug === 'bonds-' + s);
  const back = [['amber', 70], ['ethiopia-guji', 150], ['colombia-castillo', 230]].map(([s, cx], i) => `${floor(cx, 184, 84, 'g')}${bagAt(by(s), 'gb' + i, cx - 46, 40, 0.7)}`).join('');
  const front = [['chrome', 100], ['brazil-red-catuai', 200]].map(([s, cx], i) => `${floor(cx, 294, 104, 'g')}${bagAt(by(s), 'gf' + i, cx - 56.5, 120, 0.86)}`).join('');
  await photo(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 330" width="900" height="990">${STYLE}${sand(300, 330, 'g')}${beanDefs('g')}${archMotif(150, 10, 270, 320, C.roast)}${back}${pile(40, 288, 26, 10, 30, 7, 'g')}${pile(262, 290, 26, 10, 30, 13, 'g')}${front}${pile(60, 312, 40, 8, 28, 17, 'g')}${pile(244, 313, 40, 8, 28, 19, 'g')}${pile(150, 318, 50, 5, 10, 23, 'g', 0.95)}</svg>`, 900, 990, 'lifestyle-bags');
}
rmSync(tmp);
console.log('wrote', readdirSync(dir).length, 'files to', dir, '+ store photos to', shop);
