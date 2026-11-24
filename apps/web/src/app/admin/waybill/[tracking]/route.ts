// GET /admin/waybill/<tracking>: the Bosta waybill (A6, Arabic) for one of our shipments, admins only.
import { isAdmin } from '@/lib/admin-auth';
import { getWaybillPdf } from '@/lib/bosta';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ tracking: string }> }) {
  if (!(await isAdmin())) return new Response('Not found', { status: 404 });
  const tracking = (await params).tracking;
  const [o] = await store().listOrders({ tracking, limit: 1 });
  if (!o) return new Response('Not found', { status: 404 });
  try {
    const b64 = await getWaybillPdf(o.niche, tracking);
    if (!b64) return new Response('Bosta has no waybill for this shipment (demo shipment, or not ready yet).', { status: 404 });
    return new Response(Buffer.from(b64, 'base64'), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="AWB-${o.id}-${tracking}.pdf"`, 'Cache-Control': 'no-store' } });
  } catch (e) {
    return new Response((e as Error).message, { status: 502 });
  }
}
