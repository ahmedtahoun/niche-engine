// Makes smaller copies of every product photo.
//   node scripts/photo-sizes.mjs          (add --force to remake them all)
// apps/web/public/products/**/name.webp → name-sm.webp (480 px: cards, cart, home hero)
// and name-md.webp (720 px: the product page on phones). The original (900 px) is used
// on large screens and for search engines and social cards (lib/img.ts).
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const dir = path.join(root, 'apps/web/public/products');

const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const force = process.argv.includes('--force');
const SIZES = [['sm', 480, 50], ['md', 720, 60]];
for (const file of walk(dir).filter((f) => /\.(webp|jpe?g|png)$/i.test(f) && !/-(sm|md)\.webp$/.test(f))) {
  for (const [tag, width, quality] of SIZES) {
    const out = file.replace(/\.(webp|jpe?g|png)$/i, `-${tag}.webp`);
    if (!force && existsSync(out) && statSync(out).mtimeMs >= statSync(file).mtimeMs) continue;
    await sharp(file).resize({ width }).webp({ quality, effort: 6 }).toFile(out);
    console.log(`${path.relative(root, out)}  ${Math.round(statSync(out).size / 1024)} KB`);
  }
}
