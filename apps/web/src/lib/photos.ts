// Product photos: sellers send them to the Telegram bot; when the product is
// submitted, the server downloads each one from Telegram and stores it in the
// public "products" bucket of Supabase Storage (served from Supabase's CDN).
// Server-only: uses the bot token and the service-role key.
import { randomBytes } from 'node:crypto';
import { dbEnabled } from './db/rest.ts';

const MAX_BYTES = 10 * 1024 * 1024;
const base = () => process.env.SUPABASE_URL!.replace(/\/$/, '');
const key = () => process.env.SUPABASE_SERVICE_ROLE_KEY!;
const tg = () => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN?.trim()}`;

export const photosEnabled = () => dbEnabled() && Boolean(process.env.TELEGRAM_BOT_TOKEN);

/** Downloads a Telegram photo by its file id. */
async function fromTelegram(fileId: string): Promise<{ bytes: ArrayBuffer; type: string; ext: string }> {
  const meta = (await (await fetch(`${tg()}/getFile?file_id=${encodeURIComponent(fileId)}`, { signal: AbortSignal.timeout(15_000) })).json()) as { ok: boolean; result?: { file_path: string; file_size?: number } };
  if (!meta.ok || !meta.result) throw new Error('telegram getFile failed');
  if ((meta.result.file_size ?? 0) > MAX_BYTES) throw new Error('photo too large');
  const res = await fetch(`https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN?.trim()}/${meta.result.file_path}`, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`telegram download ${res.status}`);
  const ext = (meta.result.file_path.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return { bytes: await res.arrayBuffer(), type, ext };
}

const g = globalThis as unknown as { __bucketReady?: Promise<void> };

/** Creates the public bucket once (migration 0003 also does it; this covers a skipped step). */
function ensureBucket() {
  return (g.__bucketReady ??= fetch(`${base()}/storage/v1/bucket`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, apikey: key(), 'content-type': 'application/json' },
    body: JSON.stringify({ id: 'products', name: 'products', public: true }),
  }).then(() => undefined, () => { g.__bucketReady = undefined; }));
}

async function upload(path: string, bytes: ArrayBuffer, type: string): Promise<string> {
  const res = await fetch(`${base()}/storage/v1/object/products/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key()}`, apikey: key(), 'content-type': type, 'cache-control': 'max-age=31536000', 'x-upsert': 'true' },
    body: bytes,
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`storage upload ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return `${base()}/storage/v1/object/public/products/${path}`;
}

/**
 * Stores a product's Telegram photos and returns their public addresses.
 * Photos that fail are skipped (the admin sees the count before approving).
 */
export async function storeProductPhotos(productId: string, fileIds: string[]): Promise<string[]> {
  if (!photosEnabled() || !fileIds.length) return [];
  await ensureBucket();
  const urls: string[] = [];
  for (const [i, id] of fileIds.slice(0, 5).entries()) {
    try {
      const f = await fromTelegram(id);
      urls.push(await upload(`${productId}/${i + 1}-${randomBytes(4).toString('hex')}.${f.ext}`, f.bytes, f.type));
    } catch (e) {
      console.error('[photos] could not store a photo for', productId, e);
    }
  }
  return urls;
}
