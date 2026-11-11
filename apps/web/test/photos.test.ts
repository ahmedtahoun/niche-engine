// Photo storage with Telegram and Supabase Storage faked (own process).
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SUPABASE_URL = 'https://proj.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
process.env.TELEGRAM_BOT_TOKEN = ' 123:tok ';
const calls: string[] = [];
globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
  const url = String(input);
  calls.push(`${init?.method ?? 'GET'} ${url}`);
  if (url.includes('/getFile')) {
    const id = new URL(url).searchParams.get('file_id');
    return Response.json(id === 'broken' ? { ok: false } : { ok: true, result: { file_path: `photos/${id}.jpg`, file_size: 1000 } });
  }
  if (url.startsWith('https://api.telegram.org/file/')) return new Response(new Uint8Array([1, 2, 3]));
  if (url.endsWith('/storage/v1/bucket')) return Response.json({ name: 'products' });
  if (url.includes('/storage/v1/object/products/')) {
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer service-key');
    return Response.json({ Key: 'ok' });
  }
  throw new Error(`unexpected ${url}`);
}) as typeof fetch;

const { storeProductPhotos } = await import('../src/lib/photos.ts');

test('photos go from Telegram to the public products bucket; a broken one is skipped', async () => {
  const urls = await storeProductPhotos('u1', ['a', 'broken', 'b']);
  assert.equal(urls.length, 2);
  for (const u of urls) assert.match(u, /^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/products\/u1\/\d-[0-9a-f]{8}\.jpg$/);
  assert.ok(calls.some((c) => c.includes('/bot123:tok/getFile')), 'spaces around the token are ignored');
  assert.equal(calls.filter((c) => c.endsWith('/storage/v1/bucket')).length, 1, 'bucket is ensured once');
});

test('at most 5 photos per product', async () => {
  assert.equal((await storeProductPhotos('u2', ['1', '2', '3', '4', '5', '6', '7'])).length, 5);
});
