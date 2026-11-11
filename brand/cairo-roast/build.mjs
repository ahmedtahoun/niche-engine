// Builds the Cairo Roast logo files and launch images.
//   node brand/cairo-roast/build.mjs
// SVGs carry their fonts inside (El Messiri + IBM Plex Sans Arabic, both OFL),
// so they look the same everywhere. PNGs are rendered with headless Chrome.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
const out = (...p) => path.join(here, ...p);
mkdirSync(out('logo'), { recursive: true });
mkdirSync(out('social'), { recursive: true });
mkdirSync(out('print'), { recursive: true });

// ---------- brand tokens ----------
export const C = {
  espresso: '#24160F', // text, dark backgrounds
  roast: '#B4552D', // the brand color: Cairo brick / roasted copper
  brass: '#C8963E', // small accents only
  sand: '#F3E9D8', // light backgrounds
  cream: '#FBF7F0',
  nile: '#2F5D5A', // rare accent (freshness, "ok")
};

const font = (pkg, file) => readFileSync(path.join(root, 'node_modules', '@fontsource', pkg, 'files', file)).toString('base64');
const FONTS = `
@font-face{font-family:Messiri;font-weight:700;src:url(data:font/woff;base64,${font('el-messiri', 'el-messiri-arabic-700-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Messiri;font-weight:700;src:url(data:font/woff;base64,${font('el-messiri', 'el-messiri-latin-700-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Plex;font-weight:500;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-500-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Plex;font-weight:500;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-latin-500-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}
@font-face{font-family:Plex;font-weight:700;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-arabic-700-normal.woff')}) format('woff');unicode-range:U+0600-06FF,U+FB50-FDFF,U+FE70-FEFC}
@font-face{font-family:Plex;font-weight:700;src:url(data:font/woff;base64,${font('ibm-plex-sans-arabic', 'ibm-plex-sans-arabic-latin-700-normal.woff')}) format('woff');unicode-range:U+0000-00FF,U+2000-206F}`;

// ---------- the mark ----------
// A Cairo arch (the pointed arch of Islamic Cairo's doors and mashrabiya)
// holding a roasted coffee bean. The bean's center line is the Nile.
// Drawn on a 200 × 240 grid.
const ARCH = 'M24 232 V118 C24 70 58 38 100 8 C142 38 176 70 176 118 V232';
const mark = ({ arch, bean, line, x = 0, y = 0, s = 1 }) => `
<g transform="translate(${x} ${y}) scale(${s})">
  <path d="${ARCH}" fill="none" stroke="${arch}" stroke-width="12" stroke-linecap="square" stroke-linejoin="round"/>
  <path d="M8 232 H192" stroke="${arch}" stroke-width="12" stroke-linecap="square"/>
  <g transform="rotate(-24 100 150)">
    <ellipse cx="100" cy="150" rx="40" ry="58" fill="${bean}"/>
    <path d="M100 96 C80 118 120 136 100 152 C80 168 120 186 100 206" fill="none" stroke="${line}" stroke-width="7" stroke-linecap="round"/>
  </g>
</g>`;

const svg = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
<style>${FONTS}
.en{font-family:Plex;font-weight:700}
.ar{font-family:Messiri;font-weight:700}
.tx{font-family:Plex;font-weight:500}
.tb{font-family:Plex;font-weight:700}
</style>
${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>` : ''}${body}
</svg>`;

const onLight = { arch: C.espresso, bean: C.roast, line: C.sand };
const onDark = { arch: C.sand, bean: C.roast, line: C.espresso };

const files = {};

// Mark only
files['logo/mark.svg'] = svg(200, 240, mark(onLight));
files['logo/mark-on-dark.svg'] = svg(240, 280, mark({ ...onDark, x: 20, y: 20 }), C.espresso);

// Horizontal: mark + names (website header, bag front)
const horizontal = (t, ink) => `
${mark({ ...t, x: 0, y: 0, s: 0.5 })}
<text x="128" y="62" class="en" font-size="58" letter-spacing="4" fill="${ink}">CAIRO ROAST</text>
<text x="128" y="112" class="ar" font-size="38" fill="${C.roast}" direction="ltr">محمصة القاهرة</text>`;
files['logo/horizontal.svg'] = svg(560, 124, horizontal(onLight, C.espresso));
files['logo/horizontal-on-dark.svg'] = svg(600, 164, `<g transform="translate(20 20)">${horizontal(onDark, C.sand)}</g>`, C.espresso);

// Stacked: mark over names (bag label, stickers, square spaces)
const stacked = (t, ink) => `
${mark({ ...t, x: 150, y: 20, s: 1 })}
<text x="250" y="330" text-anchor="middle" class="en" font-size="62" letter-spacing="5" fill="${ink}">CAIRO ROAST</text>
<text x="250" y="392" text-anchor="middle" class="ar" font-size="44" fill="${C.roast}">محمصة القاهرة</text>`;
files['logo/stacked.svg'] = svg(500, 420, stacked(onLight, C.espresso));
files['logo/stacked-on-dark.svg'] = svg(500, 420, stacked(onDark, C.sand), C.espresso);

// Round stamp: the seal for stickers, cups, Instagram highlights
const stamp = (r = 250) => `
<circle cx="${r}" cy="${r}" r="${r - 6}" fill="${C.espresso}"/>
<circle cx="${r}" cy="${r}" r="${r - 26}" fill="none" stroke="${C.brass}" stroke-width="3"/>
<defs><path id="top" d="M${r - 178} ${r} A178 178 0 0 1 ${r + 178} ${r}"/><path id="bot" d="M${r - 196} ${r} A196 196 0 0 0 ${r + 196} ${r}"/></defs>
<text class="en" font-size="44" letter-spacing="10" fill="${C.sand}"><textPath href="#top" startOffset="50%" text-anchor="middle">CAIRO ROAST</textPath></text>
<text class="ar" font-size="36" fill="${C.brass}"><textPath href="#bot" startOffset="50%" text-anchor="middle">محمصة القاهرة · طازة كل يوم</textPath></text>
${mark({ ...onDark, x: r - 70, y: r - 92, s: 0.7 })}`;
files['logo/stamp.svg'] = svg(500, 500, stamp());

// Instagram / WhatsApp / Facebook profile picture (shown in a circle)
files['social/profile.svg'] = svg(1080, 1080, mark({ ...onDark, x: 300, y: 260, s: 2.4 }), C.espresso);

// ---------- launch posts (1080 × 1080) and story (1080 × 1920) ----------
// Arabic lines are right-aligned. No prices or offers in the images: they change, the ad text carries them.
// In right-to-left text, "start" is the right edge: 'end' here means "line ends at x on the right".
const ar = (x, y, size, text, fill, cls = 'ar', anchor = 'end') => `<text x="${x}" y="${y}" font-size="${size}" class="${cls}" fill="${fill}" text-anchor="${anchor === 'end' ? 'start' : anchor}" direction="rtl">${text}</text>`;
const footer = (y, ink, w = 1080) => `
${mark({ ...(ink === C.sand ? onDark : onLight), x: w - 172, y: y - 112, s: 0.5 })}
<text x="${w - 196}" y="${y - 52}" class="en" font-size="36" letter-spacing="3" fill="${ink}" text-anchor="end">CAIRO ROAST</text>
<text x="${w - 196}" y="${y - 12}" class="tx" font-size="26" fill="${ink}" text-anchor="start" direction="rtl" opacity=".8">الدفع عند الاستلام · توصيل لكل مصر</text>`;

const beans = (x, y, n, fill, rot = 0) => Array.from({ length: n }, (_, i) => {
  const a = (i * 137.5 + rot) % 360; const d = 18 + (i * 37) % 120;
  const cx = x + Math.cos(a) * d * 2.2; const cy = y + Math.sin(a) * d * 1.4;
  return `<g transform="rotate(${(i * 53) % 180} ${cx} ${cy})"><ellipse cx="${cx}" cy="${cy}" rx="22" ry="31" fill="${fill}"/><path d="M${cx} ${cy - 28} C${cx - 10} ${cy - 10} ${cx + 10} ${cy + 10} ${cx} ${cy + 28}" stroke="${C.espresso}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".55"/></g>`;
}).join('');

files['social/post-1-fresh.svg'] = svg(1080, 1080, `
${beans(250, 760, 16, C.roast)}
${ar(1000, 250, 112, 'بيتحمص', C.espresso)}
${ar(1000, 380, 112, 'بعد ما تطلب', C.roast)}
${ar(1000, 470, 40, 'مش قهوة قاعدة على رف من شهور.', C.espresso, 'tx')}
${ar(1000, 530, 40, 'بنحمص ونطحن لك، ونبعتها على طول.', C.espresso, 'tx')}
${footer(1020, C.espresso)}`, C.sand);

files['social/post-2-turkish.svg'] = svg(1080, 1080, `
${ar(1000, 200, 92, 'قهوتك التركي', C.sand)}
${ar(1000, 310, 92, 'زي ما بتحبها', C.brass)}
${['فاتح', 'وسط', 'غامق'].map((t, i) => `<g><rect x="${700 - i * 300}" y="400" width="280" height="150" rx="28" fill="${[C.brass, C.roast, '#5B2E1A'][i]}"/>${ar(840 - i * 300, 495, 60, t, C.cream, 'ar', 'middle')}</g>`).join('')}
${['سادة', 'محوج'].map((t, i) => `<g><rect x="${560 - i * 450}" y="590" width="420" height="130" rx="28" fill="none" stroke="${C.sand}" stroke-width="4"/>${ar(770 - i * 450, 675, 56, t, C.sand, 'ar', 'middle')}</g>`).join('')}
${ar(1000, 820, 40, 'مطحونة ناعمة على الكنكة · طازة من المحمصة', C.sand, 'tx')}
${footer(1020, C.sand)}`, C.espresso);

files['social/post-3-method.svg'] = svg(1080, 1080, `
${ar(1000, 190, 84, 'قولنا بتعمل قهوتك ازاي', C.espresso)}
${ar(1000, 290, 84, 'واحنا نطحنها مظبوط', C.roast)}
${[['كنكة', 'ناعم جداً'], ['اسبريسو', 'ناعم'], ['موكا بوت', 'ناعم متوسط'], ['V60 / فلتر', 'متوسط'], ['فرنش بريس', 'خشن'], ['حبوب كاملة', 'من غير طحن']].map(([m, g], i) => {
  const col = i % 2; const row = Math.floor(i / 2); const x = 1000 - col * 470; const y = 380 + row * 150;
  return `<g><rect x="${x - 440}" y="${y}" width="440" height="124" rx="24" fill="${C.cream}" stroke="${C.espresso}" stroke-opacity=".12" stroke-width="2"/>${ar(x - 30, y + 58, 44, m, C.espresso)}${ar(x - 30, y + 100, 30, g, C.roast, 'tx')}</g>`;
}).join('')}
${footer(1020, C.espresso)}`, C.sand);

files['social/story-launch.svg'] = svg(1080, 1920, `
${mark({ ...onDark, x: 390, y: 220, s: 1.5 })}
<text x="540" y="740" text-anchor="middle" class="en" font-size="96" letter-spacing="8" fill="${C.sand}">CAIRO ROAST</text>
${ar(540, 830, 64, 'محمصة القاهرة', C.brass, 'ar', 'middle')}
<rect x="140" y="930" width="800" height="4" fill="${C.roast}"/>
${ar(540, 1080, 84, 'فتحنا النهارده', C.sand, 'ar', 'middle')}
${ar(540, 1180, 46, 'تركي ومختصة · بتتحمص بعد طلبك', C.sand, 'tx', 'middle')}
${ar(540, 1250, 46, 'الدفع عند الاستلام · توصيل لكل مصر', C.sand, 'tx', 'middle')}
<rect x="240" y="1460" width="600" height="130" rx="65" fill="${C.roast}"/>
${ar(540, 1545, 52, 'ابعتلنا واطلب', C.cream, 'tb', 'middle')}
${beans(540, 1780, 7, '#5B2E1A')}`, C.espresso);

// ---------- bag label (10 × 14 cm at 300 dpi = 1181 × 1654 px) ----------
const W = 1181; const H = 1654;
const tick = (x, y, label) => `<rect x="${x - 34}" y="${y - 34}" width="34" height="34" rx="6" fill="none" stroke="${C.espresso}" stroke-width="3"/>${ar(x - 50, y - 6, 34, label, C.espresso, 'tx')}`;
files['print/bag-label.svg'] = svg(W, H, `
<rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="36" fill="none" stroke="${C.espresso}" stroke-width="4"/>
${mark({ ...onLight, x: W / 2 - 80, y: 70, s: 0.8 })}
<text x="${W / 2}" y="370" text-anchor="middle" class="en" font-size="76" letter-spacing="6" fill="${C.espresso}">CAIRO ROAST</text>
${ar(W / 2, 440, 50, 'محمصة القاهرة', C.roast, 'ar', 'middle')}
<line x1="90" y1="500" x2="${W - 90}" y2="500" stroke="${C.espresso}" stroke-opacity=".25" stroke-width="3"/>
${ar(W - 90, 580, 40, 'اسم القهوة', C.espresso, 'tb')}
<line x1="90" y1="660" x2="${W - 90}" y2="660" stroke="${C.espresso}" stroke-width="2" stroke-dasharray="6 10"/>
${ar(W - 90, 740, 40, 'التحميص', C.espresso, 'tb')}
${tick(W - 340, 830, 'فاتح')}${tick(W - 640, 830, 'وسط')}${tick(W - 940, 830, 'غامق')}
${ar(W - 90, 930, 40, 'الطحنة', C.espresso, 'tb')}
${tick(W - 340, 1020, 'كنكة')}${tick(W - 640, 1020, 'اسبريسو')}${tick(W - 940, 1020, 'فلتر')}
${tick(W - 340, 1100, 'فرنش بريس')}${tick(W - 640, 1100, 'موكا')}${tick(W - 940, 1100, 'حبوب')}
${ar(W - 90, 1200, 40, 'سادة / محوج', C.espresso, 'tb')}
${tick(W - 340, 1290, 'سادة')}${tick(W - 640, 1290, 'محوج')}
<line x1="90" y1="1350" x2="${W - 90}" y2="1350" stroke="${C.espresso}" stroke-opacity=".25" stroke-width="3"/>
${ar(W - 90, 1430, 40, 'الوزن: ............ جم', C.espresso, 'tb')}
${ar(W - 90, 1510, 40, 'اتحمص يوم: ...... / ...... / ......', C.espresso, 'tb')}
${ar(W / 2, 1590, 28, 'احفظها في مكان ناشف بعيد عن الشمس · أحلى طعم خلال 4 أسابيع من التحميص', C.espresso, 'tx', 'middle')}`, C.cream);

for (const [name, content] of Object.entries(files)) writeFileSync(out(name), content);

// Lean marks for the website (no fonts inside, a few hundred bytes): header logo and browser icon.
const site = path.join(root, 'apps', 'web', 'public', 'brands', 'coffee');
mkdirSync(site, { recursive: true });
const lean = (w, h, body, bg) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${bg ? `<rect width="${w}" height="${h}" rx="${w * 0.22}" fill="${bg}"/>` : ''}${body}</svg>`;
writeFileSync(path.join(site, 'mark.svg'), lean(200, 240, mark(onLight)));
writeFileSync(path.join(site, 'icon.svg'), lean(280, 280, mark({ ...onDark, x: 40, y: 20 }), C.espresso));

// ---------- PNG exports ----------
const CHROME = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser'].find(existsSync);
const sizeOf = (s) => s.match(/viewBox="0 0 (\d+) (\d+)"/).slice(1).map(Number);
if (CHROME) {
  for (const name of Object.keys(files)) {
    const [w, h] = sizeOf(files[name]);
    const scale = w < 800 ? 2 : 1;
    const html = out(name.replace('.svg', '.render.html'));
    writeFileSync(html, `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${w * scale}px;height:${h * scale}px}</style><img src="${path.basename(name)}">`);
    execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000', `--window-size=${w * scale},${h * scale}`, `--screenshot=${out(name.replace('.svg', '.png'))}`, `file://${html}`], { stdio: 'ignore' });
    execFileSync('rm', [html]);
  }
  console.log(`Rendered ${Object.keys(files).length} PNGs`);
} else console.log('Chrome not found: SVGs written, PNGs skipped');
