// GET /api/areas?gov=القاهرة: the Bosta districts a governorate's couriers deliver to, for the
// checkout area picker. Public data from Bosta, cached for a day; 503 when Bosta can't be reached
// (the picker then falls back to a free-text area).
import { districtsFor } from '@/lib/bosta';
import { GOVERNORATES } from '@/lib/eta';

export async function GET(req: Request) {
  const gov = new URL(req.url).searchParams.get('gov') ?? '';
  if (!GOVERNORATES.includes(gov)) return Response.json({ error: 'unknown governorate' }, { status: 400 });
  try {
    return Response.json({ districts: await districtsFor(gov) }, { headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' } });
  } catch (e) {
    console.error('[bosta] area list unavailable:', (e as Error).message);
    return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
