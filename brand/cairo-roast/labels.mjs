// Cairo Roast bag labels: "ساعات القاهرة · Cairo Hours".
//   node brand/cairo-roast/labels.mjs
// One label per coffee for the white 13 × 20 cm bag. The label is die-cut in the shape of the logo's
// Cairo arch. Inside the arch: the same Cairo skyline on every bag, at a different hour of the day,
// with the sun (or moon) drawn from the coffee's main tasting note.
// Print: 95 × 135 mm trim + 3 mm bleed (101 × 141 mm), 300 dpi PNG and SVG; the die line is a
// separate file. Drawn in millimetres (viewBox 0 0 101 141). Fonts are embedded (OFL).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const dir = path.join(here, 'labels');
mkdirSync(dir, { recursive: true });

const C = { espresso: '#24160F', roast: '#B4552D', brass: '#C8963E', sand: '#F3E9D8', cream: '#FBF7F0', nile: '#2F5D5A', muted: '#6E5A4E' };

const font = (pkg, file) => readFileSync(path.join(root, 'node_modules', '@fontsource', pkg, 'files', file)).toString('base64');
const FONTS = `
@font-face{font-family:Messiri;font-weight:700;src:url(data:font/woff;base64,${font('el-messiri', 'el-messiri-arabic-700-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+200C-200E,U+2010-2011,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Messiri;font-weight:700;src:url(data:font/woff;base64,${font('el-messiri', 'el-messiri-latin-700-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Plex;font-weight:500;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-500-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Plex;font-weight:500;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-latin-500-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Plex;font-weight:700;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-700-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Plex;font-weight:700;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-latin-700-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}`;
const STYLE = `<style>${FONTS}
.ar{font-family:Messiri;font-weight:700}.en{font-family:Plex;font-weight:700}.tx{font-family:Plex;font-weight:500}
</style>`;

// ---------- shapes (mm) ----------
// Trim: x 3–98, y 3–138, a pointed Cairo arch on top (same proportions family as the logo).
const TRIM = 'M3 135 Q3 138 6 138 H95 Q98 138 98 135 V40 C98 22 79 9.5 50.5 3 C22 9.5 3 22 3 40 Z';
const BLEED = 'M0 141 V40 C0 20 20 6.5 50.5 0 C81 6.5 101 20 101 40 V141 Z';
const WINDOW = 'M8 74 V40.5 C8 25 26 14 50.5 8.5 C75 14 93 25 93 40.5 V74 Z';
const BASE = 71; // skyline stands on the Nile

/** The Cairo skyline: domes, minarets, the Cairo Tower and blocks. The same on every bag. */
function skyline(fill) {
  const minaret = (x, top) => `
    <rect x="${x - 1.4}" y="${top + 5}" width="2.8" height="${BASE - top - 5}" fill="${fill}"/>
    <rect x="${x - 2.1}" y="${top + 11}" width="4.2" height="1.1" fill="${fill}"/>
    <rect x="${x - 1.8}" y="${top + 18}" width="3.6" height="0.9" fill="${fill}"/>
    <path d="M${x - 1.4} ${top + 5} L${x} ${top} L${x + 1.4} ${top + 5} Z" fill="${fill}"/>
    <rect x="${x - 0.25}" y="${top - 2.2}" width="0.5" height="2.4" fill="${fill}"/>`;
  const dome = (cx, w, h, base) => `
    <rect x="${cx - w / 2}" y="${base}" width="${w}" height="${BASE - base}" fill="${fill}"/>
    <path d="M${cx - w / 2 + 0.6} ${base} C${cx - w / 2 + 0.6} ${base - h * 0.75} ${cx - w * 0.18} ${base - h} ${cx} ${base - h} C${cx + w * 0.18} ${base - h} ${cx + w / 2 - 0.6} ${base - h * 0.75} ${cx + w / 2 - 0.6} ${base} Z" fill="${fill}"/>
    <rect x="${cx - 0.25}" y="${base - h - 2.2}" width="0.5" height="2.4" fill="${fill}"/>`;
  return `<g>
    ${dome(13.5, 9, 5, 64)}
    ${minaret(21.5, 46)}
    <rect x="25" y="62" width="21" height="${BASE - 62}" fill="${fill}"/>
    ${dome(35.5, 12, 7.5, 60)}
    ${minaret(48.5, 42)}
    <!-- Cairo Tower -->
    <path d="M60.3 ${BASE} L61.2 41.5 L62.4 41.5 L63.3 ${BASE} Z" fill="${fill}"/>
    <path d="M59.4 41.5 L64.2 41.5 L63.2 38.6 L60.4 38.6 Z" fill="${fill}"/>
    <rect x="61.55" y="33.5" width="0.5" height="5.2" fill="${fill}"/>
    <rect x="66" y="58" width="7.5" height="${BASE - 58}" fill="${fill}"/>
    <rect x="74.5" y="62.5" width="6.5" height="${BASE - 62.5}" fill="${fill}"/>
    ${dome(87, 10, 5.5, 63.5)}
  </g>`;
}

/** The Nile from the logo: a soft wave across the bottom of the window. */
const nile = (fill, line) => `
  <path d="M8 ${BASE} C22 ${BASE - 1.6} 34 ${BASE + 1.4} 50.5 ${BASE - 0.2} C67 ${BASE - 1.8} 80 ${BASE + 1.2} 93 ${BASE - 0.6} V74 H8 Z" fill="${fill}"/>
  <path d="M10 ${BASE + 1.4} C24 ${BASE + 0.3} 36 ${BASE + 2.6} 51 ${BASE + 1.4} C66 ${BASE + 0.2} 78 ${BASE + 2.4} 91 ${BASE + 1.2}" fill="none" stroke="${line}" stroke-width="0.45" stroke-linecap="round"/>`;

// ---------- suns and moons drawn from the main tasting note ----------
const SUNS = {
  apricot: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F4A259"/>
    <path d="M${x + r * 0.05} ${y - r * 0.95} C${x - r * 0.45} ${y - r * 0.3} ${x - r * 0.4} ${y + r * 0.45} ${x + r * 0.05} ${y + r * 0.95}" fill="none" stroke="#D9773A" stroke-width="0.7" stroke-linecap="round"/>
    <circle cx="${x + r * 0.35}" cy="${y - r * 0.3}" r="${r * 0.28}" fill="#F9C58D" opacity=".8"/>
    <path d="M${x} ${y - r} C${x + 2.6} ${y - r - 3.2} ${x + 5.4} ${y - r - 1.6} ${x + 5.8} ${y - r - 0.6} C${x + 3.6} ${y - r + 0.6} ${x + 1.4} ${y - r + 0.2} ${x} ${y - r} Z" fill="#6E9E58"/>`,
  orange: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F28C28"/><circle cx="${x}" cy="${y}" r="${r - 1.1}" fill="#FBD38D"/>
    ${Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5; return `<path d="M${x} ${y} L${(x + Math.cos(a) * (r - 1.6)).toFixed(2)} ${(y + Math.sin(a) * (r - 1.6)).toFixed(2)}" stroke="#F28C28" stroke-width="0.55"/>`; }).join('')}
    <circle cx="${x}" cy="${y}" r="1" fill="#F28C28"/>`,
  hazelnut: (x, y, r) => `<path d="M${x - r} ${y - r * 0.1} C${x - r} ${y + r * 0.8} ${x - r * 0.4} ${y + r} ${x} ${y + r} C${x + r * 0.4} ${y + r} ${x + r} ${y + r * 0.8} ${x + r} ${y - r * 0.1} Z" fill="#A8673A"/>
    <path d="M${x - r * 1.08} ${y - r * 0.1} C${x - r} ${y - r * 0.75} ${x - r * 0.5} ${y - r * 1.05} ${x} ${y - r * 1.05} C${x + r * 0.5} ${y - r * 1.05} ${x + r} ${y - r * 0.75} ${x + r * 1.08} ${y - r * 0.1} Z" fill="#6B3F22"/>
    <rect x="${x - 0.4}" y="${y - r * 1.05 - 2.2}" width="0.8" height="2.4" rx="0.4" fill="#6B3F22"/>
    <ellipse cx="${x - r * 0.4}" cy="${y + r * 0.35}" rx="${r * 0.18}" ry="${r * 0.32}" fill="#C88A57" opacity=".7"/>`,
  tangerine: (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#F57C2B"/>
    <circle cx="${x + r * 0.35}" cy="${y - r * 0.3}" r="${r * 0.25}" fill="#F9A45C"/>
    <path d="M${x} ${y - r + 0.3} C${x - 2.4} ${y - r - 3.6} ${x - 5.8} ${y - r - 2.4} ${x - 6.4} ${y - r - 1.2} C${x - 4} ${y - r + 0.6} ${x - 1.6} ${y - r + 0.6} ${x} ${y - r + 0.3} Z" fill="#4E8A4A"/>
    <circle cx="${x}" cy="${y - r + 0.9}" r="0.7" fill="#C45A16"/>`,
  sunset: (x, y, r) => `<defs><clipPath id="sunclip"><rect x="${x - r - 1}" y="${y - r - 1}" width="${2 * r + 2}" height="${r + 1 + 4.4}"/></clipPath></defs>
    <g clip-path="url(#sunclip)"><circle cx="${x}" cy="${y}" r="${r}" fill="#FFC56E"/>
    ${[0.6, 2.3, 3.8].map((d, i) => `<rect x="${x - r - 1}" y="${y + d}" width="${2 * r + 2}" height="${0.9 + i * 0.35}" fill="#E0603A"/>`).join('')}</g>`,
  moon: (x, y, r) => `<defs><mask id="crescent"><rect x="0" y="0" width="101" height="141" fill="#fff"/><circle cx="${x + r * 0.55}" cy="${y - r * 0.35}" r="${r * 0.92}" fill="#000"/></mask></defs>
    <circle cx="${x}" cy="${y}" r="${r}" fill="#DADFE6" mask="url(#crescent)"/>
    <circle cx="${x - r * 0.45}" cy="${y + r * 0.35}" r="${r * 0.12}" fill="#B9C0CA" mask="url(#crescent)"/>`,
  bean: (x, y, r) => `<g transform="rotate(-24 ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r * 0.72}" ry="${r}" fill="#B4552D"/>
    <path d="M${x} ${y - r * 0.93} C${x - r * 0.36} ${y - r * 0.55} ${x + r * 0.36} ${y - r * 0.2} ${x} ${y} C${x - r * 0.36} ${y + r * 0.2} ${x + r * 0.36} ${y + r * 0.55} ${x} ${y + r * 0.93}" fill="none" stroke="#F3E9D8" stroke-width="0.8" stroke-linecap="round"/></g>`,
};

// ---------- small sky details ----------
const blossom = (x, y, s, c, mid) => `<g transform="translate(${x} ${y}) scale(${s})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="-1.5" rx="0.95" ry="1.55" fill="${c}" transform="rotate(${a})"/>`).join('')}<circle r="0.75" fill="${mid}"/></g>`;
const berries = (x, y, c) => `<g>${[[0, 0], [1.6, 0.3], [0.8, 1.4]].map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="0.9" fill="${c}"/>`).join('')}</g>`;
const star = (x, y, s, c) => `<path d="M${x} ${y - s} L${x + s * 0.28} ${y - s * 0.28} L${x + s} ${y} L${x + s * 0.28} ${y + s * 0.28} L${x} ${y + s} L${x - s * 0.28} ${y + s * 0.28} L${x - s} ${y} L${x - s * 0.28} ${y - s * 0.28} Z" fill="${c}"/>`;
const steam = (x, y, c) => `<path d="M${x} ${y} c-1.6 -2.2 1.6 -3.4 0 -5.6 c-1.6 -2.2 1.6 -3.4 0 -5.6" fill="none" stroke="${c}" stroke-width="0.6" stroke-linecap="round" opacity=".8"/>`;
const cane = (x, h, c) => `<g>${Array.from({ length: Math.round(h / 3.2) }, (_, i) => `<rect x="${x - 0.55}" y="${BASE - (i + 1) * 3.2 + 0.25}" width="1.1" height="2.95" rx="0.3" fill="${c}"/>`).join('')}
  <path d="M${x} ${BASE - h} c-2.2 -1 -4 -0.6 -5 0.6 M${x} ${BASE - h} c2 -1.6 3.8 -1.4 4.8 -0.2" fill="none" stroke="${c}" stroke-width="0.55" stroke-linecap="round"/></g>`;
const felucca = (x, c, sail) => `<path d="M${x - 4} ${BASE + 0.6} H${x + 4} L${x + 3} ${BASE + 1.8} H${x - 3} Z" fill="${c}"/>
  <rect x="${x - 0.2}" y="${BASE - 9}" width="0.4" height="9.6" fill="${c}"/><path d="M${x + 0.2} ${BASE - 9.4} L${x + 5.2} ${BASE - 0.4} H${x + 0.2} Z" fill="${sail}"/>`;
const bird = (x, y, c) => `<path d="M${x - 1.4} ${y} q0.7 -0.8 1.4 0 q0.7 -0.8 1.4 0" fill="none" stroke="${c}" stroke-width="0.4" stroke-linecap="round"/>`;

// ---------- the seven coffees (facts as Bonds states them on the store; nothing invented) ----------
const COFFEES = [
  { slug: 'bonds-ethiopia-guji', ar: 'إثيوبيا جوجي', en: 'Ethiopia Guji Hambela', hour: { ar: 'الفجر', en: 'DAWN', time: '5:30 AM' },
    origin: { ar: 'إثيوبيا · جوجي هامبيلا', en: 'Ethiopia · Guji Hambela' }, details: { ar: 'هيرلوم · معالجة طبيعية · 1400–1800 م', en: 'Heirloom · Natural · 1400–1800 m' },
    notes: { ar: 'توت · زهور · مشمش · زهر البرتقال', en: 'Berries · Floral · Apricot · Orange blossom' }, country: { ar: 'إثيوبيا', en: 'ETHIOPIA' },
    sky: ['#FBD5C8', '#C9A7D8'], ink: '#5A3A5E', accent: '#B0507A', nileC: '#E9C6D9', sun: ['apricot', 76, 29, 8.5],
    extra: () => blossom(24, 26, 1, '#FFF4E6', '#F4A259') + blossom(34, 18, 0.7, '#FFF4E6', '#F4A259') + blossom(57, 33, 0.8, '#FFF4E6', '#F4A259') + berries(17, 38, '#7B4A8E') + berries(87, 44, '#7B4A8E') },
  { slug: 'bonds-ethiopia-limu', ar: 'إثيوبيا ليمو', en: 'Ethiopia Limu', hour: { ar: 'الصبح', en: 'MORNING', time: '8:00 AM' },
    origin: { ar: 'إثيوبيا · ليمو', en: 'Ethiopia · Limu' }, details: { ar: 'هيرلوم · معالجة طبيعية', en: 'Heirloom · Natural' },
    notes: { ar: 'شوكولاتة داكنة · شاي أسود · برتقال', en: 'Dark chocolate · Black tea · Orange' }, country: { ar: 'إثيوبيا', en: 'ETHIOPIA' },
    sky: ['#FFF1D6', '#A9D3B5'], ink: '#24453F', accent: '#2F6B4F', nileC: '#CFE6D6', sun: ['orange', 38, 30, 8.5],
    extra: () => steam(20, 52, '#FFFFFF') + steam(24, 49, '#FFFFFF') + steam(78, 50, '#FFFFFF') },
  { slug: 'bonds-brazil-red-catuai', ar: 'البرازيل ريد كاتواي', en: 'Brazil Red Catuai', hour: { ar: 'الضهر', en: 'NOON', time: '12:00 PM' },
    origin: { ar: 'البرازيل · موجيانا', en: 'Brazil · Mogiana' }, details: { ar: 'ريد كاتواي · معالجة طبيعية', en: 'Red Catuai · Natural' },
    notes: { ar: 'بندق محمص · قصب السكر · عين جمل', en: 'Roasted hazelnut · Sugar cane · Walnut' }, country: { ar: 'البرازيل', en: 'BRAZIL' },
    sky: ['#FFE9A8', '#F2B94B'], ink: '#5C3A1C', accent: '#A8673A', nileC: '#F7D98A', sun: ['hazelnut', 50.5, 24, 7.5],
    extra: () => cane(12.5, 20, '#7A8F3A') + cane(89, 17, '#7A8F3A') },
  { slug: 'bonds-colombia-castillo', ar: 'كولومبيا كاستيو', en: 'Colombia Castillo', hour: { ar: 'العصر', en: 'AFTERNOON', time: '3:30 PM' },
    origin: { ar: 'كولومبيا · فالي ديل كاوكا', en: 'Colombia · Valle del Cauca' }, details: { ar: 'كاستيو', en: 'Castillo' },
    notes: { ar: 'فواكه استوائية · كراميل باللبن · يوسفي · خشب البلوط', en: 'Tropical fruit · Milk caramel · Tangerine · Oak' }, country: { ar: 'كولومبيا', en: 'COLOMBIA' },
    sky: ['#FFD9AE', '#5FB3B0'], ink: '#1F4E5A', accent: '#D2691E', nileC: '#BFE3DF', sun: ['tangerine', 77, 31, 8],
    extra: () => felucca(30, '#1F4E5A', '#F9B54C') + bird(24, 26, '#1F4E5A') + bird(30, 22, '#1F4E5A') },
  { slug: 'bonds-amber', ar: 'أمبر بلند', en: 'Amber Blend', hour: { ar: 'المغرب', en: 'SUNSET', time: '5:30 PM' },
    origin: { ar: 'بلند من بوندز', en: 'A Bonds blend' }, details: { ar: 'قوام غني · حموضة منخفضة', en: 'Rich body · Low acidity' },
    notes: { ar: 'شوكولاتة داكنة · عسل أسود · بندق محمص', en: 'Dark chocolate · Molasses · Roasted hazelnut' }, country: null,
    sky: ['#FFB86B', '#9E2B25'], ink: '#3A140E', accent: '#B4552D', nileC: '#E88A5C', sun: ['sunset', 50.5, 62, 13],
    extra: () => bird(26, 30, '#3A140E') + bird(31, 26, '#3A140E') + bird(72, 24, '#3A140E') },
  { slug: 'bonds-chrome', ar: 'كروم بلند', en: 'Chrome Blend', hour: { ar: 'الليل', en: 'NIGHT', time: '10:00 PM' },
    origin: { ar: 'بلند من بوندز', en: 'A Bonds blend' }, details: { ar: 'قوام غني وممتلئ · حموضة خفيفة', en: 'Full body · Mild acidity' },
    notes: { ar: 'كراميل · شوكولاتة داكنة · مكسرات محمصة', en: 'Caramel · Dark chocolate · Roasted nuts' }, country: null,
    sky: ['#2A3142', '#14171F'], ink: '#0B0D12', accent: '#8C96A8', nileC: '#3B4558', sun: ['moon', 74, 28, 8],
    extra: () => star(22, 22, 1.1, '#DADFE6') + star(32, 34, 0.7, '#DADFE6') + star(44, 18, 0.8, '#DADFE6') + star(86, 46, 0.7, '#DADFE6') + star(15, 44, 0.6, '#DADFE6') },
  { slug: 'bonds-el-salvador', ar: 'السلفادور سان أجوستين', en: 'El Salvador San Agustín', hour: { ar: 'السهرة', en: 'LATE EVENING', time: '12:00 AM' },
    origin: { ar: 'السلفادور · سان أجوستين', en: 'El Salvador · San Agustín' }, details: null,
    notes: null, country: { ar: 'السلفادور', en: 'EL SALVADOR' },
    sky: ['#4B4F9C', '#1E2150'], ink: '#12132E', accent: '#8B7BD8', nileC: '#3C3F86', sun: ['bean', 75, 29, 7.5],
    extra: () => star(20, 24, 0.9, '#E8E4FF') + star(34, 16, 0.6, '#E8E4FF') + star(80, 44, 0.7, '#E8E4FF') },
];

const TODO = '#E5007E'; // magenta: "fill this in before printing"

function label(c, { qr = true } = {}) {
  const [kind, sx, sy, sr] = c.sun;
  const mid = 50.5;
  const dark = c.hour.en === 'NIGHT' || c.hour.en === 'LATE EVENING';
  const pill = 41;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="1193" height="1665">
${STYLE}
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky[1]}"/><stop offset="1" stop-color="${c.sky[0]}"/></linearGradient>
  <clipPath id="win"><path d="${WINDOW}"/></clipPath>
</defs>
<path d="${BLEED}" fill="${C.cream}"/>
<g clip-path="url(#win)">
  <rect x="0" y="0" width="101" height="80" fill="url(#sky)"/>
  ${SUNS[kind](sx, sy, sr)}
  ${c.extra()}
  ${skyline(c.ink)}
  ${nile(c.nileC, dark ? '#FFFFFF55' : '#FFFFFF')}
</g>
<path d="${WINDOW}" fill="none" stroke="${C.espresso}" stroke-width="0.5"/>

<!-- hour badge -->
<rect x="${mid - pill / 2}" y="70.6" width="${pill}" height="7.2" rx="3.6" fill="${C.cream}" stroke="${C.espresso}" stroke-width="0.4"/>
<text x="${mid + 9.2}" y="75.6" text-anchor="middle" class="ar" font-size="3.6" fill="${c.accent}">${c.hour.ar}</text>
<line x1="${mid + 1.6}" y1="72.6" x2="${mid + 1.6}" y2="75.9" stroke="${C.brass}" stroke-width="0.3"/>
<text x="${mid - 8.4}" y="75.35" text-anchor="middle" class="en" font-size="2.2" letter-spacing="0.25" fill="${C.espresso}">${c.hour.time}</text>

<!-- brand -->
<text x="${mid}" y="83.6" text-anchor="middle" class="en" font-size="2.15" letter-spacing="0.9" fill="${C.espresso}">CAIRO ROAST · <tspan class="ar" font-size="2.8" letter-spacing="0" fill="${C.roast}">محمصة القاهرة</tspan></text>

<!-- coffee -->
<text x="${mid}" y="92.6" text-anchor="middle" class="ar" font-size="${c.ar.length > 14 ? 5.6 : 6.8}" fill="${C.espresso}">${c.ar}</text>
<text x="${mid}" y="97.6" text-anchor="middle" class="en" font-size="2.7" letter-spacing="0.7" fill="${c.accent}">${c.en.toUpperCase()}</text>
<text x="${mid}" y="103" text-anchor="middle" class="tx" font-size="2.55" fill="${C.muted}">${c.origin.ar}${c.details ? `  ·  ${c.details.ar}` : ''}</text>
<text x="${mid}" y="106.6" text-anchor="middle" class="tx" font-size="2.05" fill="${C.muted}">${c.origin.en}${c.details ? `  ·  ${c.details.en}` : ''}</text>
${c.details ? '' : `<text x="${mid}" y="110.1" text-anchor="middle" class="tx" font-size="2" fill="${TODO}">[ variety · process · altitude: confirm with Bonds ]</text>`}

<!-- notes -->
<line x1="22" y1="${c.details ? 109.4 : 112.4}" x2="79" y2="${c.details ? 109.4 : 112.4}" stroke="${C.brass}" stroke-width="0.3"/>
${c.notes ? `
<text x="${mid}" y="114.4" text-anchor="middle" class="ar" font-size="${c.notes.ar.length > 34 ? 3 : 3.4}" fill="${C.espresso}">${c.notes.ar}</text>
<text x="${mid}" y="118" text-anchor="middle" class="tx" font-size="2.05" fill="${C.muted}">${c.notes.en}</text>`
  : `<text x="${mid}" y="117" text-anchor="middle" class="tx" font-size="2.3" fill="${TODO}">[ tasting notes: confirm with Bonds ]</text>`}

<!-- bottom row: QR · weight, roast date, grind · passport stamp -->
<g>
  ${qr ? `<rect x="9" y="121.2" width="13.2" height="13.2" rx="1" fill="#FFFFFF" stroke="${C.espresso}" stroke-width="0.35" stroke-dasharray="0.8 0.6"/>
  <text x="15.6" y="127.3" text-anchor="middle" class="en" font-size="2.2" fill="${C.espresso}">QR</text>
  <text x="15.6" y="130.2" text-anchor="middle" class="tx" font-size="1.25" fill="${C.muted}">cairoroast.com</text>` : ''}
  <text x="50.5" y="124.4" text-anchor="middle" class="tx" font-size="2.25" fill="${C.espresso}" direction="rtl">250 جم  ·  ☐ حبوب  ·  ☐ مطحون لـ __________</text>
  <text x="50.5" y="128.8" text-anchor="middle" class="tx" font-size="2.25" fill="${C.espresso}" direction="rtl">اتحمصت في: ______ / ______</text>
  <text x="50.5" y="133.4" text-anchor="middle" class="ar" font-size="2.3" fill="${c.accent}" direction="rtl">امسح الكود: اعرف النكهات واختبر لسانك</text>
  ${c.country ? `<g transform="rotate(-8 86 127.8)">
    <circle cx="86" cy="127.8" r="6.4" fill="none" stroke="${c.accent}" stroke-width="0.55"/>
    <circle cx="86" cy="127.8" r="5.5" fill="none" stroke="${c.accent}" stroke-width="0.3"/>
    <text x="86" y="125.6" text-anchor="middle" class="tx" font-size="1.25" fill="${c.accent}">جواز القهوة</text>
    <text x="86" y="128.9" text-anchor="middle" class="ar" font-size="2.3" fill="${c.accent}">${c.country.ar}</text>
    <text x="86" y="131.3" text-anchor="middle" class="en" font-size="${c.country.en.length > 8 ? 1 : 1.15}" letter-spacing="0.12" fill="${c.accent}">${c.country.en}</text>
  </g>` : `<g transform="rotate(-8 86 127.8)">
    <circle cx="86" cy="127.8" r="6.4" fill="none" stroke="${c.accent}" stroke-width="0.55"/>
    <text x="86" y="127.2" text-anchor="middle" class="ar" font-size="2.2" fill="${c.accent}">بلند</text>
    <text x="86" y="130.2" text-anchor="middle" class="en" font-size="1.35" letter-spacing="0.25" fill="${c.accent}">BLEND</text>
  </g>`}
</g>
</svg>`;
}

const dieline = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="101mm" height="141mm">
<path d="${TRIM}" fill="none" stroke="#E5007E" stroke-width="0.25"/>
<path d="M8 74 V40.5" stroke="none"/>
<text x="50.5" y="139.6" text-anchor="middle" font-family="sans-serif" font-size="1.6" fill="#E5007E">DIE LINE · trim 95 × 135 mm · bleed 3 mm · arch top</text>
</svg>`;

/** The label on a white 13 × 20 cm bag (zip at the top, degassing valve above the label). */
function onBag(c) {
  const art = label(c).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-12 -10 154 224" width="924" height="1344">
${STYLE}
<defs><filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.4" flood-color="#000" flood-opacity=".18"/></filter>
<clipPath id="trimclip"><path d="${TRIM}"/></clipPath></defs>
<rect x="-12" y="-10" width="154" height="224" fill="#EEE9E1"/>
<path d="M4 2 H126 Q130 2 130 6 V196 Q130 200 126 200 H4 Q0 200 0 196 V6 Q0 2 4 2 Z" fill="#FFFFFF" filter="url(#sh)"/>
<path d="M0 22 H130" stroke="#E3DED6" stroke-width="0.6"/><path d="M0 25 H130" stroke="#EDE9E2" stroke-width="0.4"/>
<path d="M120 2 V18" stroke="#F1EDE6" stroke-width="2.2"/>
<circle cx="65" cy="40" r="5.6" fill="#F7F5F1" stroke="#E2DDD4" stroke-width="0.6"/><circle cx="65" cy="40" r="2.2" fill="none" stroke="#DAD4CA" stroke-width="0.5"/>
<g transform="translate(14.5 52)"><g clip-path="url(#trimclip)">${art}</g><path d="${TRIM}" fill="none" stroke="#00000014" stroke-width="0.3"/></g>
</svg>`;
}

/** All seven bags on one sheet (for review). */
function sheet() {
  const per = 4, cw = 165, ch = 238;
  const rows = Math.ceil(COFFEES.length / per);
  const bags = COFFEES.map((c, i) => {
    const inner = onBag(c).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '').replace(STYLE, '')
      .replaceAll('id="sh"', `id="sh${i}"`).replaceAll('url(#sh)', `url(#sh${i})`).replaceAll('id="trimclip"', `id="tc${i}"`).replaceAll('url(#trimclip)', `url(#tc${i})`)
      .replaceAll('id="sky"', `id="sky${i}"`).replaceAll('url(#sky)', `url(#sky${i})`).replaceAll('id="win"', `id="win${i}"`).replaceAll('url(#win)', `url(#win${i})`)
      .replaceAll('id="sunclip"', `id="sunclip${i}"`).replaceAll('url(#sunclip)', `url(#sunclip${i})`).replaceAll('id="crescent"', `id="cres${i}"`).replaceAll('url(#crescent)', `url(#cres${i})`);
    return `<g transform="translate(${(i % per) * cw + 12} ${Math.floor(i / per) * ch + 40})"><svg viewBox="-12 -10 154 224" width="154" height="224">${inner}</svg>
      <text x="65" y="230" text-anchor="middle" class="tx" font-size="5" fill="${C.espresso}">${c.hour.en} · ${c.hour.time} · ${c.en}</text></g>`;
  }).join('');
  const w = per * cw + 10, h = rows * ch + 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">
${STYLE}<rect width="${w}" height="${h}" fill="${C.sand}"/>
<text x="${w / 2}" y="20" text-anchor="middle" class="ar" font-size="13" fill="${C.espresso}">ساعات القاهرة</text>
<text x="${w / 2}" y="30" text-anchor="middle" class="en" font-size="5.5" letter-spacing="2" fill="${C.roast}">CAIRO ROAST · CAIRO HOURS · BAG LABELS</text>
${bags}</svg>`;
}

// ---------- write and render ----------
const files = {};
for (const c of COFFEES) {
  files[`label-${c.slug}.svg`] = label(c);
  files[`bag-${c.slug}.svg`] = onBag(c);
}
files['dieline.svg'] = dieline;
files['all-bags.svg'] = sheet();
for (const [name, body] of Object.entries(files)) writeFileSync(path.join(dir, name), body);

const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find(existsSync);
if (CHROME) {
  const tmp = path.join(dir, '.render.html');
  for (const name of Object.keys(files).filter((n) => n !== 'dieline.svg')) {
    const body = files[name];
    const [, w, h] = body.match(/width="(\d+)" height="(\d+)"/);
    writeFileSync(tmp, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>${body.replace(/width="\d+" height="\d+"/, `width="${w}" height="${h}"`)}`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${w},${h}`, `--screenshot=${path.join(dir, name.replace('.svg', '.png'))}`, `file://${tmp}`], { stdio: 'ignore' });
  }
  execFileSync('rm', ['-f', tmp]);
  // Bag mock-ups are previews only: keep their PNGs, drop the heavy SVGs (fonts embedded in each).
  for (const name of Object.keys(files).filter((n) => n.startsWith('bag-') || n === 'all-bags.svg')) execFileSync('rm', ['-f', path.join(dir, name)]);
  console.log(`Labels: ${Object.keys(files).length} SVGs and PNGs in brand/cairo-roast/labels`);
} else console.log('Chrome not found: SVGs written, PNGs skipped');
