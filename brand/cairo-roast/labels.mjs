// Cairo Roast bag labels, v3: simple and premium on a white bag.
//   node brand/cairo-roast/labels.mjs
// FRONT (95 × 135 mm, arch die cut): the logo, the name, and one framed window. In the window: the
// fine contour lines of the coffee's origin (the journey) under a small still life of what it tastes
// like (the notes are drawn, never written). One quiet journey line. Lots of white space.
// BACK (60 × 90 mm): roast date, grind, QR (notes, brew guide and passport stamp on the website).
// Print: SVG (fonts embedded) and 300 dpi PNG, 3 mm bleed; die lines separate; gold = gold foil.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
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

// ---------- front label ----------
function front(c, id = '') {
  const m = 50.5;
  const dist = c.from ? km(c.from.at) : null;
  const nameSize = c.name.length > 10 ? 5.4 : c.name.length > 6 ? 6.2 : 7.2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="1193" height="1665">
${STYLE}
<defs><linearGradient id="bg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.bg[1]}"/><stop offset="1" stop-color="${c.bg[0]}"/></linearGradient><clipPath id="w${id}"><path d="${WIN}"/></clipPath></defs>
<path d="${BLEED}" fill="${C.white}"/>
<path d="${FRAME}" fill="none" stroke="${C.foil}" stroke-width="0.3"/>
${logo(m - 3.6, 10.6, 0.036)}
<text x="${m}" y="23.8" text-anchor="middle" class="l5" font-size="1.85" letter-spacing="1.15" fill="${C.espresso}">CAIRO ROAST</text>
<text x="${m}" y="27" text-anchor="middle" class="a6" font-size="2" fill="${C.roast}">محمصة القاهرة</text>

<g clip-path="url(#w${id})">
  <rect x="15" y="30" width="71" height="60" fill="url(#bg${id})"/>
  ${contours(c.contour[0], c.contour[1], c.tint, c.contour[2])}
  ${c.art(id)}
</g>
<path d="${WIN}" fill="none" stroke="${C.foil}" stroke-width="0.42"/>
<path d="${WIN_OUT}" fill="none" stroke="${C.foil}" stroke-width="0.18"/>

<text x="${m}" y="96" text-anchor="middle" class="l5" font-size="1.6" letter-spacing="0.9" fill="${c.accent}">${c.origin}</text>
<text x="${m}" y="${(96 + 3.2 + nameSize * 0.72).toFixed(2)}" text-anchor="middle" class="l2" font-size="${nameSize}" letter-spacing="${(nameSize * 0.07).toFixed(2)}" fill="${C.espresso}">${c.name.toUpperCase()}</text>
<text x="${m}" y="${(96 + 7.6 + nameSize * 0.72).toFixed(2)}" text-anchor="middle" class="a6" font-size="2.5" fill="${C.muted}">${c.ar}</text>

<circle cx="25" cy="117.4" r="0.6" fill="${c.accent}"/>
<path d="M26.4 117.4 H74.6" stroke="${C.espresso}" stroke-width="0.2" stroke-dasharray="0.45 0.9" stroke-linecap="round"/>
${logo(74.9, 115.6, 0.0145)}
<text x="25" y="120.6" text-anchor="middle" class="l5" font-size="1.25" letter-spacing="0.45" fill="${C.muted}">${c.from ? c.from.en : 'THE FARMS'}</text>
<text x="76.4" y="120.6" text-anchor="middle" class="l5" font-size="1.25" letter-spacing="0.45" fill="${C.muted}">CAIRO</text>
<text x="${m}" y="116" text-anchor="middle" class="l4" font-size="1.3" letter-spacing="0.5" fill="${C.muted}">${dist ? `≈ ${dist.toLocaleString('en-US')} KM` : 'SELECTED ORIGINS'}</text>

<text x="${m}" y="131" text-anchor="middle" class="l4" font-size="1.4" letter-spacing="0.8" fill="${C.espresso}">N° 0${c.n}  ·  250 G</text>
</svg>`;
}

// ---------- back label: 60 × 90 mm, 3 mm bleed ----------
const BACK_TRIM = 'M6 3 H60 Q63 3 63 6 V90 Q63 93 60 93 H6 Q3 93 3 90 V6 Q3 3 6 3 Z';
function back(c) {
  const m = 33;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 96" width="780" height="1134">
${STYLE}
<rect width="66" height="96" fill="${C.white}"/>
<path d="M5.2 5.2 H60.8 V90.8 H5.2 Z" fill="none" stroke="${C.foil}" stroke-width="0.25"/>
${logo(m - 2.6, 9, 0.026)}
<text x="${m}" y="18.6" text-anchor="middle" class="l5" font-size="1.45" letter-spacing="0.9" fill="${C.espresso}">CAIRO ROAST</text>
<text x="${m}" y="25" text-anchor="middle" class="l2" font-size="3.4" letter-spacing="0.25" fill="${C.espresso}">${c.name.toUpperCase()}</text>
<text x="${m}" y="28.6" text-anchor="middle" class="a6" font-size="1.9" fill="${C.muted}">${c.ar}</text>

<text x="${m}" y="35.6" text-anchor="middle" class="l5" font-size="1.25" letter-spacing="0.7" fill="${c.accent}">ROASTED ON</text>
<rect x="11" y="37.4" width="44" height="8" rx="1" fill="none" stroke="${C.espresso}" stroke-width="0.25"/>

<text x="${m}" y="51.4" text-anchor="middle" class="l5" font-size="1.25" letter-spacing="0.7" fill="${c.accent}">GRIND</text>
<text x="${m}" y="55.4" text-anchor="middle" class="l4" font-size="1.5" fill="${C.espresso}">○ WHOLE BEAN      ○ GROUND FOR ________</text>

<line x1="21" y1="59.4" x2="45" y2="59.4" stroke="${C.foil}" stroke-width="0.22"/>
<rect x="25.5" y="62.4" width="15" height="15" rx="0.8" fill="#FFFFFF" stroke="${C.espresso}" stroke-width="0.25" stroke-dasharray="0.7 0.5"/>
<text x="${m}" y="70.6" text-anchor="middle" class="l5" font-size="1.8" fill="${C.espresso}">QR</text>
<text x="${m}" y="81" text-anchor="middle" class="l5" font-size="1.3" letter-spacing="0.6" fill="${C.espresso}">SCAN FOR THE TASTING NOTES</text>
<text x="${m}" y="83.4" text-anchor="middle" class="l4" font-size="1.2" fill="${C.muted}">brew guide and your Coffee Passport stamp</text>
<text x="${m}" y="88.4" text-anchor="middle" class="l5" font-size="1.2" letter-spacing="0.6" fill="${C.espresso}">CAIROROAST.COM  ·  0110 920 0150</text>
</svg>`;
}

// ---------- previews on the white 13 × 20 cm bag ----------
const BAG = `<path d="M4 2 H126 Q130 2 130 6 V196 Q130 200 126 200 H4 Q0 200 0 196 V6 Q0 2 4 2 Z" fill="#FFFFFF" filter="url(#sh)"/>
<path d="M0 22 H130" stroke="#E6E2DB" stroke-width="0.6"/><path d="M0 25 H130" stroke="#EFECE6" stroke-width="0.4"/>
<circle cx="65" cy="40" r="5.6" fill="#FAF9F7" stroke="#E6E1D9" stroke-width="0.6"/><circle cx="65" cy="40" r="2.2" fill="none" stroke="#DCD6CC" stroke-width="0.5"/>`;
const inner = (s) => s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(STYLE, '');
const bagSvg = (body, extraDefs = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-14 -12 158 228" width="948" height="1368">
${STYLE}<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2.4" stdDeviation="2.8" flood-color="#3A2A1E" flood-opacity=".16"/></filter>${extraDefs}</defs>
<rect x="-14" y="-12" width="158" height="228" fill="#EFEBE5"/>${BAG}${body}</svg>`;
const frontOnBag = (c, id = 'b') => bagSvg(`<g transform="translate(14.5 52)"><g clip-path="url(#tc${id})">${inner(front(c, id))}</g><path d="${TRIM}" fill="none" stroke="#0000000F" stroke-width="0.25"/></g>`, `<clipPath id="tc${id}"><path d="${TRIM}"/></clipPath>`);
const backOnBag = (c) => bagSvg(`<g transform="translate(32 72)"><g clip-path="url(#bt)">${inner(back(c))}</g><path d="${BACK_TRIM}" fill="none" stroke="#0000000F" stroke-width="0.25"/></g>`, `<clipPath id="bt"><path d="${BACK_TRIM}"/></clipPath>`);

function sheet() {
  const per = 4, cw = 168, ch = 246;
  const cards = [...COFFEES.map((c, i) => ({ svg: frontOnBag(c, `s${i}`), cap: `N° 0${c.n} · ${c.origin} · ${c.name}` })), { svg: backOnBag(COFFEES[0]), cap: 'BACK LABEL · 60 × 90 MM' }];
  const body = cards.map((x, i) => `<g transform="translate(${(i % per) * cw + 10} ${Math.floor(i / per) * ch + 44})"><svg viewBox="-14 -12 158 228" width="158" height="228">${inner(x.svg).replace(/id="sh"/g, `id="sh${i}"`).replace(/url\(#sh\)/g, `url(#sh${i})`).replace(/id="bt"/g, `id="bt${i}"`).replace(/url\(#bt\)/g, `url(#bt${i})`)}</svg>
    <text x="79" y="236" text-anchor="middle" class="l5" font-size="4.4" letter-spacing="1" fill="${C.espresso}">${x.cap.toUpperCase()}</text></g>`).join('');
  const w = per * cw + 6, h = 2 * ch + 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">${STYLE}
<rect width="${w}" height="${h}" fill="#F6F3EE"/>
<text x="${w / 2}" y="22" text-anchor="middle" class="l2" font-size="12" letter-spacing="3" fill="${C.espresso}">CAIRO ROAST</text>
<text x="${w / 2}" y="32" text-anchor="middle" class="l4" font-size="4.6" letter-spacing="1.2" fill="${C.muted}">BAG LABELS · FRONT 95 × 135 MM · BACK 60 × 90 MM</text>${body}</svg>`;
}

const dieFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="101mm" height="141mm"><path d="${TRIM}" fill="none" stroke="#E5007E" stroke-width="0.25"/><text x="50.5" y="139.8" text-anchor="middle" font-family="sans-serif" font-size="1.5" fill="#E5007E">FRONT · die cut (magenta) 95 × 135 mm, arch top · 3 mm bleed · gold foil: outer frame, window frames, logo arch</text></svg>`;
const dieBack = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 96" width="66mm" height="96mm"><path d="${BACK_TRIM}" fill="none" stroke="#E5007E" stroke-width="0.25"/><text x="33" y="95.2" text-anchor="middle" font-family="sans-serif" font-size="1.3" fill="#E5007E">BACK · die cut 60 × 90 mm, 3 mm corners · 3 mm bleed</text></svg>`;

// ---------- write and render ----------
const print = {}, previews = {};
for (const c of COFFEES) {
  print[`front-${c.slug}.svg`] = front(c);
  print[`back-${c.slug}.svg`] = back(c);
  previews[`bag-front-${c.slug}.svg`] = frontOnBag(c);
}
previews['bag-back.svg'] = backOnBag(COFFEES[0]);
previews['all-labels.svg'] = sheet();
print['dieline-front.svg'] = dieFront;
print['dieline-back.svg'] = dieBack;
for (const [n, b] of Object.entries({ ...print, ...previews })) writeFileSync(path.join(dir, n), b);

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find(existsSync);
if (CHROME) {
  const tmp = path.join(dir, '.render.html');
  for (const [name, body] of Object.entries({ ...print, ...previews })) {
    if (name.startsWith('dieline')) continue;
    const [, w, h] = body.match(/width="(\d+)" height="(\d+)"/);
    writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>${body}`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${path.join(dir, name.replace('.svg', '.png'))}`, `file://${tmp}`], { stdio: 'ignore' });
  }
  rmSync(tmp);
  for (const n of Object.keys(previews)) rmSync(path.join(dir, n));
  console.log(`Labels: ${readdirSync(dir).length} files in brand/cairo-roast/labels`);
} else console.log('Chrome not found: SVGs written, PNGs skipped');
