// Builds the Discovery Box photo from the real photos of its three coffees:
//   node scripts/make-box-photo.mjs
// → apps/web/public/products/coffee/discovery-box.webp (1200×840, the store)
//   and marketing/images/discovery-box-1080x1080.webp / -1080x1350.webp (Meta feed ads)
// then run `node scripts/photo-sizes.mjs` for the -sm / -md copies.
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const dir = path.join(root, 'apps/web/public/products/coffee');
const BG = '#F3E9D8';

// Rounded card with a soft shadow around one bag photo.
async function card(file, w, h) {
  const r = Math.round(w * 0.06);
  const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" ry="${r}"/></svg>`);
  const photo = await sharp(path.join(dir, file)).resize(w, h, { fit: 'cover', position: 'centre' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const pad = 40;
  const shadow = Buffer.from(`<svg width="${w + pad * 2}" height="${h + pad * 2}"><defs><filter id="b"><feGaussianBlur stdDeviation="18"/></filter></defs><rect x="${pad}" y="${pad + 14}" width="${w}" height="${h}" rx="${r}" fill="rgba(60,35,20,.35)" filter="url(#b)"/></svg>`);
  return sharp(shadow).composite([{ input: photo, left: pad, top: pad }]).png().toBuffer();
}

// One layout, any canvas: the middle bag in front, the other two behind it on each side.
async function compose(W, H, scale, out, text) {
  const side = { w: Math.round(380 * scale), h: Math.round(475 * scale) }, mid = { w: Math.round(470 * scale), h: Math.round(588 * scale) };
  const [left, center, right] = await Promise.all([card('ethiopia-limu.webp', side.w, side.h), card('chrome.webp', mid.w, mid.h), card('brazil-red-catuai.webp', side.w, side.h)]);
  const glow = Buffer.from(`<svg width="${W}" height="${H}"><defs><radialGradient id="g" cx="50%" cy="48%" r="65%"><stop offset="0" stop-color="#FBF5EA"/><stop offset="1" stop-color="${BG}"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#g)"/></svg>`);
  const shift = text ? Math.round(H * 0.04) : 0;
  const midTop = Math.round((H - mid.h) / 2) + shift, sideTop = midTop + Math.round(70 * scale), edge = Math.round((W - mid.w - side.w * 2) / 2 + side.w * 0.18);
  await sharp(glow)
    .composite([
      { input: left, left: edge - 40, top: sideTop - 40 },
      { input: right, left: W - edge - side.w - 40, top: sideTop - 40 },
      { input: center, left: Math.round((W - mid.w) / 2) - 40, top: midTop - 40 },
      ...(text ? [{ input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="${Math.round(midTop * 0.52)}" text-anchor="middle" direction="rtl" font-family="Geeza Pro, Arial" font-weight="700" font-size="${Math.round(W * 0.074)}" fill="#3B2418">${text.title}</text>
        <text x="50%" y="${Math.round(midTop * 0.52 + W * 0.07)}" text-anchor="middle" direction="rtl" font-family="Geeza Pro, Arial" font-size="${Math.round(W * 0.04)}" fill="#7A5A44">${text.sub}</text>
        <rect x="${W / 2 - W * 0.3}" y="${H - Math.round((H - midTop - mid.h) * 0.62) - W * 0.045}" width="${W * 0.6}" height="${W * 0.09}" rx="${W * 0.045}" fill="#B4552D"/>
        <text x="50%" y="${H - Math.round((H - midTop - mid.h) * 0.62) + W * 0.014}" text-anchor="middle" direction="rtl" font-family="Geeza Pro, Arial" font-weight="700" font-size="${Math.round(W * 0.038)}" fill="#fff">${text.cta}</text>
      </svg>`), left: 0, top: 0 }] : []),
    ])
    .webp({ quality: 84 })
    .toFile(path.join(out.dir, out.name));
  console.log('wrote', out.name);
}

// The store (box page, home card, cart): wide.
await compose(1200, 840, 1, { dir, name: 'discovery-box.webp' });
// Meta ads: square feed and 4:5 portrait feed (kept out of the store folder's size copies).
const ads = path.join(root, 'marketing/images');
(await import('node:fs')).mkdirSync(ads, { recursive: true });
// No price in the picture (it would go stale); the ad text and the store carry the price.
const words = { title: 'صندوق الاكتشاف', sub: 'تلات قهوات مختصة من بوندز في طلب واحد', cta: 'الدفع عند الاستلام' };
await compose(1080, 1080, 0.92, { dir: ads, name: 'discovery-box-1080x1080.webp' });
await compose(1080, 1350, 0.95, { dir: ads, name: 'discovery-box-1080x1350.webp' }, words);
