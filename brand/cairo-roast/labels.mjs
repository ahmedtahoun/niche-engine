// Cairo Roast bag labels, v2: "Cairo Hours", premium on a white bag.
//   node brand/cairo-roast/labels.mjs
// FRONT (95 × 135 mm, arch die cut): white label on the white bag so it almost disappears; gold-foil
// arch frame and logo; English leads, Arabic supports; a small framed window onto Cairo at this coffee's
// hour, the sun drawn from its main tasting note; the journey from origin to Cairo, and one story line.
// BACK (60 × 90 mm): the practical side: roast date, grind, a short brew recipe, QR, passport stamp.
// Print files: SVG (fonts embedded) and 300 dpi PNG, 3 mm bleed; die lines separate; gold = foil.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const dir = path.join(here, 'labels');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });

const C = { espresso: '#1E1410', roast: '#B4552D', foil: '#B08D57', muted: '#6F6259', hair: '#D9D2C7', white: '#FFFFFF' };

const font = (pkg, file) => readFileSync(path.join(root, 'node_modules', '@fontsource', pkg, 'files', file)).toString('base64');
const face = (fam, pkg, w, ar, lat) => `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff;base64,${font(pkg, ar)}) format('woff');unicode-range:U+0600-06FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:${fam};font-weight:${w};src:url(data:font/woff;base64,${font(pkg, lat)}) format('woff');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2070-209F,U+20AC,U+2122,U+2190-2199,U+2212}`;
const plex = (w) => face('Plex', 'ibm-plex-sans-arabic', w, `ibm-plex-sans-arabic-arabic-${w}-normal.woff`, `ibm-plex-sans-arabic-latin-${w}-normal.woff`);
const mess = (w) => face('Messiri', 'el-messiri', w, `el-messiri-arabic-${w}-normal.woff`, `el-messiri-latin-${w}-normal.woff`);
const STYLE = `<style>${[plex(200), plex(300), plex(400), plex(500), mess(400), mess(600)].join('\n')}
.l2{font-family:Plex;font-weight:200}.l3{font-family:Plex;font-weight:300}.l4{font-family:Plex;font-weight:400}.l5{font-family:Plex;font-weight:500}
.a4{font-family:Messiri;font-weight:400}.a6{font-family:Messiri;font-weight:600}
</style>`;

// The logo mark (arch + bean with the Nile line), from the brand kit, on a 200 × 240 grid.
const LOGO_ARCH = 'M24 232 V118 C24 70 58 38 100 8 C142 38 176 70 176 118 V232';
const logo = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="${LOGO_ARCH}" fill="none" stroke="${C.foil}" stroke-width="12" stroke-linecap="square" stroke-linejoin="round"/>
  <path d="M8 232 H192" stroke="${C.foil}" stroke-width="12" stroke-linecap="square"/>
  <g transform="rotate(-24 100 150)"><ellipse cx="100" cy="150" rx="40" ry="58" fill="${C.roast}"/>
  <path d="M100 96 C80 118 120 136 100 152 C80 168 120 186 100 206" fill="none" stroke="#F3E9D8" stroke-width="7" stroke-linecap="round"/></g></g>`;

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


// ---------- the coffees (facts as Bonds states them on the store; nothing invented) ----------
const CAIRO = [30.04, 31.24];
const km = ([a, b]) => { const r = (d) => (d * Math.PI) / 180; const h = Math.sin(r(a - CAIRO[0]) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(CAIRO[0])) * Math.sin(r(b - CAIRO[1]) / 2) ** 2; return Math.round((2 * 6371 * Math.asin(Math.sqrt(h))) / 100) * 100; };
const RECIPE = {
  v60: { en: 'V60', how: '15 g · 250 ml · 92–96 °C · 3 min' },
  press: { en: 'FRENCH PRESS', how: '30 g · 500 ml · 4 min' },
  espresso: { en: 'ESPRESSO', how: '18 g in · 36 g out · 25–30 s' },
  kanaka: { en: 'KANAKA', how: '7 g · 75 ml cold water · low heat' },
};

const COFFEES = [
  { slug: 'bonds-ethiopia-guji', n: 1, kind: 'SINGLE ORIGIN · ETHIOPIA', name: 'Guji Hambela', ar: 'إثيوبيا جوجي هامبيلا',
    hour: { ar: 'الفجر', en: 'DAWN', time: '5:30 AM' }, from: { en: 'GUJI', at: [5.9, 38.7] },
    story: ['First light over Cairo. Apricot and orange blossom,', 'all the way from the highlands of Guji.'], storyAr: 'أول نور على القاهرة… مشمش وزهر برتقال من مرتفعات جوجي',
    notes: { en: 'BERRIES · FLORAL · APRICOT · ORANGE BLOSSOM', ar: 'توت · زهور · مشمش · زهر البرتقال' }, specs: 'NATURAL · HEIRLOOM · 1400–1800 M',
    country: { ar: 'إثيوبيا', en: 'ETHIOPIA' }, brew: ['v60', 'press'],
    sky: ['#FBE3DA', '#DCC8E6'], ink: '#4E3553', accent: '#9B4F74', nileC: '#EEDDE9', sun: ['apricot', 72, 30, 8.5],
    extra: () => blossom(26, 27, 0.8, '#FFFFFF', '#F4A259') + blossom(52, 20, 0.6, '#FFFFFF', '#F4A259') + berries(86, 45, '#8C6A9C') },
  { slug: 'bonds-ethiopia-limu', n: 2, kind: 'SINGLE ORIGIN · ETHIOPIA', name: 'Limu', ar: 'إثيوبيا ليمو',
    hour: { ar: 'الصبح', en: 'MORNING', time: '8:00 AM' }, from: { en: 'LIMU', at: [8.07, 36.95] },
    story: ['The first cup of the morning: dark chocolate', 'and black tea, with a twist of orange.'], storyAr: 'فنجان الصبح: شوكولاتة داكنة وشاي أسود ولمسة برتقال',
    notes: { en: 'DARK CHOCOLATE · BLACK TEA · ORANGE', ar: 'شوكولاتة داكنة · شاي أسود · برتقال' }, specs: 'NATURAL · HEIRLOOM',
    country: { ar: 'إثيوبيا', en: 'ETHIOPIA' }, brew: ['v60', 'espresso'],
    sky: ['#FFF6E4', '#CFE5D6'], ink: '#24453F', accent: '#2F6B4F', nileC: '#E1EFE5', sun: ['orange', 36, 29, 8.5],
    extra: () => steam(22, 52, '#FFFFFF') + steam(79, 50, '#FFFFFF') },
  { slug: 'bonds-brazil-red-catuai', n: 3, kind: 'SINGLE ORIGIN · BRAZIL', name: 'Red Catuai', ar: 'البرازيل ريد كاتواي',
    hour: { ar: 'الضهر', en: 'NOON', time: '12:00 PM' }, from: { en: 'MOGIANA', at: [-20.54, -47.4] },
    story: ['Midday warmth from Mogiana: roasted hazelnut', 'and sugar cane, smooth and easy.'], storyAr: 'دفا الضهر من موجيانا: بندق محمص وقصب سكر، ناعمة وسهلة',
    notes: { en: 'ROASTED HAZELNUT · SUGAR CANE · WALNUT', ar: 'بندق محمص · قصب السكر · عين جمل' }, specs: 'NATURAL · RED CATUAI',
    country: { ar: 'البرازيل', en: 'BRAZIL' }, brew: ['kanaka', 'espresso'],
    sky: ['#FFF3D1', '#F5D58A'], ink: '#5C3A1C', accent: '#9A5B2E', nileC: '#FBE9BC', sun: ['hazelnut', 50.5, 24, 7],
    extra: () => cane(13, 18, '#8C9A52') + cane(88.5, 15, '#8C9A52') },
  { slug: 'bonds-colombia-castillo', n: 4, kind: 'SINGLE ORIGIN · COLOMBIA', name: 'Castillo', ar: 'كولومبيا كاستيو',
    hour: { ar: 'العصر', en: 'AFTERNOON', time: '3:30 PM' }, from: { en: 'VALLE DEL CAUCA', at: [3.8, -76.5] },
    story: ['An afternoon on the Nile: tangerine, tropical', 'fruit and a soft milk caramel.'], storyAr: 'عصرية على النيل: يوسفي وفواكه استوائية وكراميل باللبن',
    notes: { en: 'TROPICAL FRUIT · MILK CARAMEL · TANGERINE · OAK', ar: 'فواكه استوائية · كراميل باللبن · يوسفي · خشب البلوط' }, specs: 'CASTILLO',
    country: { ar: 'كولومبيا', en: 'COLOMBIA' }, brew: ['v60', 'espresso'],
    sky: ['#FFE6CC', '#A9D6D2'], ink: '#1F4E5A', accent: '#C4621F', nileC: '#DCEFEC', sun: ['tangerine', 76, 31, 8],
    extra: () => felucca(30, '#1F4E5A', '#F4B860') },
  { slug: 'bonds-amber', n: 5, kind: 'HOUSE BLEND · ROASTED BY BONDS', name: 'Amber', ar: 'أمبر بلند', blend: true,
    hour: { ar: 'المغرب', en: 'SUNSET', time: '5:30 PM' },
    story: ['Sunset in a cup: dark chocolate and molasses,', 'rich, slow and warm.'], storyAr: 'المغرب في فنجان: شوكولاتة داكنة وعسل أسود، تقيلة ورايقة',
    notes: { en: 'DARK CHOCOLATE · MOLASSES · ROASTED HAZELNUT', ar: 'شوكولاتة داكنة · عسل أسود · بندق محمص' }, specs: 'RICH BODY · LOW ACIDITY',
    country: null, brew: ['espresso', 'kanaka'],
    sky: ['#FFD9A8', '#D7745A'], ink: '#3A1A12', accent: '#A9472B', nileC: '#F2B48E', sun: ['sunset', 50.5, 62, 13],
    extra: () => bird(27, 30, '#3A1A12') + bird(32, 26, '#3A1A12') },
  { slug: 'bonds-chrome', n: 6, kind: 'HOUSE BLEND · ROASTED BY BONDS', name: 'Chrome', ar: 'كروم بلند', blend: true,
    hour: { ar: 'الليل', en: 'NIGHT', time: '10:00 PM' },
    story: ['For long Cairo nights: caramel, dark chocolate', 'and roasted nuts. Lovely with milk.'], storyAr: 'لليالي القاهرة: كراميل وشوكولاتة داكنة ومكسرات، حلوة باللبن',
    notes: { en: 'CARAMEL · DARK CHOCOLATE · ROASTED NUTS', ar: 'كراميل · شوكولاتة داكنة · مكسرات محمصة' }, specs: 'FULL BODY · MILD ACIDITY',
    country: null, brew: ['espresso', 'kanaka'],
    sky: ['#39425A', '#171B26'], ink: '#0B0D12', accent: '#5E6B80', nileC: '#465069', sun: ['moon', 73, 28, 8],
    extra: () => star(24, 23, 1, '#E4E8EE') + star(40, 17, 0.7, '#E4E8EE') + star(16, 42, 0.6, '#E4E8EE') + star(87, 46, 0.6, '#E4E8EE') },
  { slug: 'bonds-el-salvador', n: 7, kind: 'SINGLE ORIGIN · EL SALVADOR', name: 'San Agustín', ar: 'السلفادور سان أجوستين',
    hour: { ar: 'السهرة', en: 'LATE EVENING', time: '12:00 AM' }, from: { en: 'SAN AGUSTÍN', at: [13.43, -88.6] },
    story: ['The last cup of the night,', 'from the hills of San Agustín.'], storyAr: 'آخر فنجان في الليل، من سان أجوستين',
    notes: null, specs: null, country: { ar: 'السلفادور', en: 'EL SALVADOR' }, brew: ['v60', 'espresso'],
    sky: ['#5A5EA8', '#23265A'], ink: '#14153A', accent: '#5B55B0', nileC: '#4B4F95', sun: ['bean', 74, 29, 7.5],
    extra: () => star(22, 25, 0.9, '#EEEBFF') + star(38, 17, 0.6, '#EEEBFF') + star(87, 46, 0.6, '#EEEBFF') },
];
const TODO = '#E5007E'; // magenta: fill in before printing

// ---------- front label ----------
const FOIL_FRAME = 'M5.4 132.6 Q5.4 135.6 8.4 135.6 H92.6 Q95.6 135.6 95.6 132.6 V40.4 C95.6 23.4 77.4 11.4 50.5 5.3 C23.6 11.4 5.4 23.4 5.4 40.4 Z';
const K = 0.67, TX = 22 - 8 * K, TY = 36 - 8.5 * K; // the window: 57 mm wide, top at 36 mm

function windowArt(c, id) {
  const [kind, sx, sy, sr] = c.sun;
  const dark = c.hour.en === 'NIGHT' || c.hour.en === 'LATE EVENING';
  return `<defs>
    <linearGradient id="sky${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.sky[1]}"/><stop offset="1" stop-color="${c.sky[0]}"/></linearGradient>
    <clipPath id="win${id}"><path d="${WINDOW}"/></clipPath></defs>
  <g transform="translate(${TX.toFixed(3)} ${TY.toFixed(3)}) scale(${K})">
    <g clip-path="url(#win${id})">
      <rect x="0" y="0" width="101" height="80" fill="url(#sky${id})"/>
      ${SUNS[kind](sx, sy, sr).replaceAll('sunclip', `sunclip${id}`).replaceAll('crescent', `crescent${id}`)}
      ${c.extra()}
      ${skyline(c.ink)}
      ${nile(c.nileC, dark ? '#FFFFFF44' : '#FFFFFF')}
    </g>
    <path d="${WINDOW}" fill="none" stroke="${C.foil}" stroke-width="${(0.42 / K).toFixed(3)}"/>
  </g>
  <path d="${WINDOW}" fill="none" stroke="${C.foil}" stroke-width="${(0.18 / (K * 1.06)).toFixed(3)}" transform="translate(${(50.5 - 50.5 * K * 1.06).toFixed(3)} ${(TY - 1.6).toFixed(3)}) scale(${(K * 1.06).toFixed(4)})"/>`;
}

function front(c, id = '') {
  const m = 50.5;
  const nameSize = c.name.length > 11 ? 5.2 : c.name.length > 7 ? 6 : 7;
  const dist = c.from ? km(c.from.at) : null;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="1193" height="1665">
${STYLE}
<path d="${BLEED}" fill="${C.white}"/>
<path d="${FOIL_FRAME}" fill="none" stroke="${C.foil}" stroke-width="0.3"/>
${logo(m - 3.6, 10.2, 0.036)}
<text x="${m}" y="23.4" text-anchor="middle" class="l5" font-size="1.85" letter-spacing="1.15" fill="${C.espresso}">CAIRO ROAST</text>
<text x="${m}" y="26.6" text-anchor="middle" class="a6" font-size="2" fill="${C.roast}">محمصة القاهرة</text>
<text x="${m - 1.4}" y="31.6" text-anchor="end" class="l5" font-size="1.5" letter-spacing="0.55" fill="${c.accent}">N° 0${c.n}  ·  ${c.hour.en}  ${c.hour.time}</text>
<text x="${m + 1.4}" y="31.75" text-anchor="start" class="a6" font-size="2" fill="${c.accent}">· ${c.hour.ar}</text>
${windowArt(c, id)}

<text x="${m}" y="86.8" text-anchor="middle" class="l5" font-size="1.55" letter-spacing="0.75" fill="${c.accent}">${c.kind}</text>
<text x="${m}" y="94.8" text-anchor="middle" class="l2" font-size="${nameSize}" letter-spacing="${(nameSize * 0.07).toFixed(2)}" fill="${C.espresso}">${c.name.toUpperCase()}</text>
<text x="${m}" y="99.2" text-anchor="middle" class="a6" font-size="2.6" fill="${C.muted}">${c.ar}</text>

<!-- the journey -->
<g transform="translate(0 0.8)">
${c.from ? `
  <circle cx="20" cy="106.2" r="0.75" fill="${c.accent}"/>
  <path d="M21.4 106.2 Q50.5 102.4 79.6 106.2" fill="none" stroke="${C.espresso}" stroke-width="0.22" stroke-dasharray="0.5 0.9" stroke-linecap="round"/>
  ${logo(79.9, 104.2, 0.0165)}
  <text x="${m}" y="103.2" text-anchor="middle" class="l5" font-size="1.4" letter-spacing="0.5" fill="${C.muted}">≈ ${dist.toLocaleString('en-US')} KM TO YOUR CUP</text>
  <text x="20" y="109.4" text-anchor="middle" class="l5" font-size="1.3" letter-spacing="0.4" fill="${C.espresso}">${c.from.en}</text>
  <text x="81.5" y="109.4" text-anchor="middle" class="l5" font-size="1.3" letter-spacing="0.4" fill="${C.espresso}">CAIRO</text>`
  : `
  <circle cx="20" cy="106.2" r="0.75" fill="${c.accent}"/><circle cx="22.2" cy="105.5" r="0.55" fill="${c.accent}"/><circle cx="21.6" cy="107.2" r="0.5" fill="${c.accent}"/>
  <path d="M23.6 106.2 Q50.5 102.4 79.6 106.2" fill="none" stroke="${C.espresso}" stroke-width="0.22" stroke-dasharray="0.5 0.9" stroke-linecap="round"/>
  ${logo(79.9, 104.2, 0.0165)}
  <text x="${m}" y="103.2" text-anchor="middle" class="l5" font-size="1.4" letter-spacing="0.5" fill="${C.muted}">SELECTED ORIGINS, BLENDED BY BONDS</text>
  <text x="21" y="109.4" text-anchor="middle" class="l5" font-size="1.3" letter-spacing="0.4" fill="${C.espresso}">THE FARMS</text>
  <text x="81.5" y="109.4" text-anchor="middle" class="l5" font-size="1.3" letter-spacing="0.4" fill="${C.espresso}">CAIRO</text>`}
  ${c.story.map((l, i) => `<text x="${m}" y="${112.8 + i * 3}" text-anchor="middle" class="l3" font-size="2.15" fill="${C.espresso}">${l}</text>`).join('\n  ')}
  <text x="${m}" y="${112.8 + c.story.length * 3 + 0.5}" text-anchor="middle" class="a4" font-size="2.2" fill="${C.muted}" direction="rtl">${c.storyAr}</text>
</g>

<line x1="40" y1="123.9" x2="61" y2="123.9" stroke="${C.foil}" stroke-width="0.25"/>
${c.notes ? `
<text x="${m}" y="128.2" text-anchor="middle" class="l5" font-size="${c.notes.en.length > 40 ? 1.35 : 1.5}" letter-spacing="0.45" fill="${c.accent}">${c.notes.en}</text>
<text x="${m}" y="131.3" text-anchor="middle" class="a6" font-size="2.05" fill="${C.espresso}" direction="rtl">${c.notes.ar}</text>`
  : `<text x="${m}" y="129.4" text-anchor="middle" class="l5" font-size="1.6" fill="${TODO}">[ TASTING NOTES: CONFIRM WITH BONDS ]</text>`}
<text x="${m}" y="134.3" text-anchor="middle" class="l4" font-size="1.3" letter-spacing="0.5" fill="${C.muted}">${c.specs ?? '<tspan fill="' + TODO + '">[ PROCESS · VARIETY · ALTITUDE ]</tspan>'}  ·  250 G</text>
</svg>`;
}

// ---------- back label: 60 × 90 mm, 3 mm bleed ----------
const BACK_TRIM = 'M6 3 H60 Q63 3 63 6 V90 Q63 93 60 93 H6 Q3 93 3 90 V6 Q3 3 6 3 Z';
function back(c) {
  const x = 7.5;
  const stamp = c.country
    ? `<g transform="rotate(-9 54.5 15.5)"><circle cx="54.5" cy="15.5" r="5.6" fill="none" stroke="${c.accent}" stroke-width="0.4"/><circle cx="54.5" cy="15.5" r="4.8" fill="none" stroke="${c.accent}" stroke-width="0.2"/>
       <text x="54.5" y="13.7" text-anchor="middle" class="l5" font-size="0.95" letter-spacing="0.3" fill="${c.accent}">PASSPORT</text>
       <text x="54.5" y="16.6" text-anchor="middle" class="a6" font-size="1.9" fill="${c.accent}">${c.country.ar}</text>
       <text x="54.5" y="18.7" text-anchor="middle" class="l5" font-size="${c.country.en.length > 8 ? 0.8 : 0.95}" letter-spacing="0.2" fill="${c.accent}">${c.country.en}</text></g>`
    : `<g transform="rotate(-9 54.5 15.5)"><circle cx="54.5" cy="15.5" r="5.6" fill="none" stroke="${c.accent}" stroke-width="0.4"/>
       <text x="54.5" y="15.4" text-anchor="middle" class="a6" font-size="1.9" fill="${c.accent}">بلند</text><text x="54.5" y="17.8" text-anchor="middle" class="l5" font-size="0.95" letter-spacing="0.3" fill="${c.accent}">BLEND</text></g>`;
  const lab = (y, en, ar) => `<text x="${x}" y="${y}" class="l5" font-size="1.25" letter-spacing="0.55" fill="${c.accent}">${en}</text><text x="58.5" y="${y + 0.1}" text-anchor="end" class="a6" font-size="1.55" fill="${C.muted}">${ar}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 66 96" width="780" height="1134">
${STYLE}
<rect width="66" height="96" fill="${C.white}"/>
<path d="M5.2 5.2 H60.8 V90.8 H5.2 Z" fill="none" stroke="${C.foil}" stroke-width="0.25"/>
${logo(x, 8.2, 0.024)}
<text x="${x + 6}" y="10.6" class="l5" font-size="1.45" letter-spacing="0.8" fill="${C.espresso}">CAIRO ROAST</text>
<text x="${x + 6}" y="13" class="a6" font-size="1.5" fill="${C.roast}">محمصة القاهرة</text>
<text x="${x}" y="20.4" class="l3" font-size="3" letter-spacing="0.2" fill="${C.espresso}">N° 0${c.n} · ${c.name.toUpperCase()}</text>
<text x="${x}" y="23.6" class="a6" font-size="2" fill="${C.muted}">${c.ar}</text>
${stamp}
<line x1="${x}" y1="26.4" x2="58.5" y2="26.4" stroke="${C.hair}" stroke-width="0.2"/>

${lab(30.4, 'ROASTED ON', 'اتحمصت في')}
<rect x="${x}" y="31.8" width="51" height="7.6" rx="1" fill="none" stroke="${C.espresso}" stroke-width="0.25"/>
<text x="${x + 25.5}" y="36.6" text-anchor="middle" class="l3" font-size="2" fill="${C.hair}">DD  /  MM  /  YY</text>

${lab(43.6, 'GRIND', 'الطحنة')}
<text x="${x}" y="47.2" class="l4" font-size="1.55" fill="${C.espresso}">○ WHOLE BEAN     ○ GROUND FOR ____________</text>
<text x="58.5" y="50.6" text-anchor="start" class="a4" font-size="1.75" fill="${C.muted}" direction="rtl">○ حبوب     ○ مطحون لـ ____________</text>
<line x1="${x}" y1="52.8" x2="58.5" y2="52.8" stroke="${C.hair}" stroke-width="0.2"/>

${lab(56.8, 'BREW IT', 'حضّرها')}
${c.brew.map((b, i) => `<text x="${x}" y="${60.6 + i * 3}" class="l5" font-size="1.4" letter-spacing="0.4" fill="${C.espresso}">${RECIPE[b].en}</text><text x="58.5" y="${60.6 + i * 3}" text-anchor="end" class="l4" font-size="1.45" fill="${C.muted}">${RECIPE[b].how}</text>`).join('')}
<line x1="${x}" y1="66.6" x2="58.5" y2="66.6" stroke="${C.hair}" stroke-width="0.2"/>

<rect x="${x}" y="69.4" width="14" height="14" rx="0.8" fill="#FFFFFF" stroke="${C.espresso}" stroke-width="0.25" stroke-dasharray="0.7 0.5"/>
<text x="${x + 7}" y="76.8" text-anchor="middle" class="l5" font-size="1.8" fill="${C.espresso}">QR</text>
<text x="${x + 17}" y="72.4" class="l5" font-size="1.55" letter-spacing="0.6" fill="${C.espresso}">SCAN TO TASTE</text>
<text x="${x + 17}" y="74.8" class="l5" font-size="1.55" letter-spacing="0.6" fill="${C.espresso}">THE JOURNEY</text>
<text x="${x + 17}" y="77.6" class="l4" font-size="1.25" fill="${C.muted}">Tasting-notes game, brew coach</text>
<text x="${x + 17}" y="79.7" class="l4" font-size="1.25" fill="${C.muted}">and your Coffee Passport stamp.</text>
<text x="58.5" y="82.9" text-anchor="start" class="a4" font-size="1.6" fill="${c.accent}" direction="rtl">امسح الكود: دوّق النكهات وجمّع الختم</text>

<text x="33" y="86.6" text-anchor="middle" class="l4" font-size="1.1" letter-spacing="0.3" fill="${C.muted}">WHATSAPP 0110 920 0150 · KEEP SEALED, COOL AND DRY</text>
<text x="33" y="88.9" text-anchor="middle" class="l5" font-size="1.2" letter-spacing="0.6" fill="${C.espresso}">CAIROROAST.COM</text>
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
const frontOnBag = (c, id = '') => bagSvg(`<g transform="translate(14.5 52)"><g clip-path="url(#tc${id})">${inner(front(c, id))}</g><path d="${TRIM}" fill="none" stroke="#0000000F" stroke-width="0.25"/></g>`, `<clipPath id="tc${id}"><path d="${TRIM}"/></clipPath>`);
const backOnBag = (c) => bagSvg(`<g transform="translate(32 72)"><g clip-path="url(#bt)">${inner(back(c))}</g><path d="${BACK_TRIM}" fill="none" stroke="#0000000F" stroke-width="0.25"/></g>`, `<clipPath id="bt"><path d="${BACK_TRIM}"/></clipPath>`);

function sheet() {
  const per = 4, cw = 168, ch = 246;
  const cards = [...COFFEES.map((c, i) => ({ svg: frontOnBag(c, `s${i}`), cap: `N° 0${c.n} · ${c.hour.en} · ${c.name}` })), { svg: backOnBag(COFFEES[0]), cap: 'BACK LABEL · 60 × 90 MM' }];
  const body = cards.map((x, i) => `<g transform="translate(${(i % per) * cw + 10} ${Math.floor(i / per) * ch + 44})"><svg viewBox="-14 -12 158 228" width="158" height="228">${inner(x.svg).replace(/id="sh"/g, `id="sh${i}"`).replace(/url\(#sh\)/g, `url(#sh${i})`).replace(/id="bt"/g, `id="bt${i}"`).replace(/url\(#bt\)/g, `url(#bt${i})`)}</svg>
    <text x="79" y="236" text-anchor="middle" class="l5" font-size="4.6" letter-spacing="1" fill="${C.espresso}">${x.cap.toUpperCase()}</text></g>`).join('');
  const w = per * cw + 6, h = 2 * ch + 52;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 3}" height="${h * 3}">${STYLE}
<rect width="${w}" height="${h}" fill="#F6F3EE"/>
<text x="${w / 2}" y="22" text-anchor="middle" class="l2" font-size="12" letter-spacing="3" fill="${C.espresso}">CAIRO HOURS</text>
<text x="${w / 2}" y="32" text-anchor="middle" class="a6" font-size="7" fill="${C.roast}">ساعات القاهرة · محمصة القاهرة</text>${body}</svg>`;
}

const dieFront = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 101 141" width="101mm" height="141mm"><path d="${TRIM}" fill="none" stroke="#E5007E" stroke-width="0.25"/><path d="${FOIL_FRAME}" fill="none" stroke="#00A3E0" stroke-width="0.2" stroke-dasharray="1 1"/><text x="50.5" y="139.8" text-anchor="middle" font-family="sans-serif" font-size="1.5" fill="#E5007E">FRONT · die cut (magenta) 95 × 135 mm, arch top · 3 mm bleed · gold foil areas: frame, window frames, logo arch</text></svg>`;
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
  // Previews are for review: keep their PNGs, drop the heavy SVGs (fonts embedded in each).
  for (const n of Object.keys(previews)) rmSync(path.join(dir, n));
  console.log(`Labels: ${readdirSync(dir).length} files in brand/cairo-roast/labels`);
} else console.log('Chrome not found: SVGs written, PNGs skipped');
