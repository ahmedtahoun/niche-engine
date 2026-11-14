// GET /api/admin/pulse?after=<order id>: what the admin notification watcher needs. Admin only.
// New orders after `after`, and the counts behind the badges: needs action, to ship, carts due.
import { isAdmin } from '@/lib/admin-auth';
import { getNiche } from '@/lib/niches';
import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response('Not found', { status: 404 });
  const after = Number(new URL(req.url).searchParams.get('after') ?? 0) || 0;
  const s = store();
  const [open, attention, recent, due] = await Promise.all([
    s.listOrders({ statuses: ['awaiting_confirm', 'confirmed', 'accepted'], limit: 1000 }),
    s.listOrders({ needsAttention: true, limit: 1000 }),
    s.listOrders({ since: new Date(Date.now() - 2 * 864e5).toISOString(), limit: 200 }),
    s.listDrafts({ statuses: ['alerted'], updatedAfter: new Date(Date.now() - 2 * 864e5).toISOString(), limit: 100 }).catch(() => []),
  ]);
  const action = new Set([...open.filter((o) => o.status !== 'accepted'), ...attention].map((o) => o.id)).size;
  const latest = Math.max(0, ...recent.map((o) => o.id));
  const fresh = after ? recent.filter((o) => o.id > after && o.status !== 'cancelled').sort((a, b) => a.id - b.id).slice(-10) : [];
  return Response.json({
    latest, action, ship: open.filter((o) => o.status === 'accepted').length, carts: due.length,
    orders: fresh.map((o) => ({ id: o.id, name: o.customer.name, total: o.quote.total, items: o.items.reduce((a, i) => a + i.qty, 0), brand: getNiche(o.niche)?.brand.nameEn ?? o.niche, payment: o.payment })),
  }, { headers: { 'Cache-Control': 'no-store' } });
}
