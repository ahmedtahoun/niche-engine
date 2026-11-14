// /indexnow-key.txt: proves to IndexNow (Bing and others) that the URL pings come from this site.
import { indexNowKey } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export function GET() {
  return new Response(indexNowKey(), { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' } });
}
