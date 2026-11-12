// Makes a small copy of every product photo for cards, cart and the home hero.
//   node scripts/photo-sizes.mjs
// apps/web/public/products/**/name.webp → name-sm.webp (480 px wide). Pages pick the
// small one on phones and the full one where it's shown large (lib/photos-client.ts).
import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');
const dir = path.join(root, 'apps/web/public/products');

const walk = (d) => readdirSync(d).flatMap((f) => { const p = path.join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const file of walk(dir).filter((f) => /\.(webp|jpe?g|png)$/i.test(f) && !/-sm\.webp$/.test(f))) {
  const out = file.replace(/\.(webp|jpe?g|png)$/i, '-sm.webp');
  if (existsSync(out) && statSync(out).mtimeMs >= statSync(file).mtimeMs) continue;
  await sharp(file).resize({ width: 480 }).webp({ quality: 60, effort: 6 }).toFile(out);
  console.log(`${path.relative(root, out)}  ${Math.round(statSync(out).size / 1024)} KB`);
}
