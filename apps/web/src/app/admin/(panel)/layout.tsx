import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { devOpen, isAdmin } from '@/lib/admin-auth';
import { catalog } from '@/lib/catalog';
import { seedDemoOrders } from '@/lib/seed';
import { store } from '@/lib/store';
import { logout } from '../actions';
import { Nav } from './Nav';
import { OrderAlerts } from './OrderAlerts';
import '../admin.css';

export const metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');
  await seedDemoOrders();
  const [cat, open] = await Promise.all([catalog(), store().listOrders({ statuses: ['awaiting_confirm', 'confirmed'], limit: 1000 })]);
  const attention = await store().listOrders({ needsAttention: true, limit: 1000 });
  // Carts waiting for a reminder (none until migration 0006 is run).
  const due = await store().listDrafts({ statuses: ['alerted'], updatedAfter: new Date(Date.now() - 2 * 864e5).toISOString(), limit: 100 }).catch(() => []);
  const counts = {
    carts: due.length,
    orders: new Set([...open, ...attention].map((o) => o.id)).size,
    review: cat.products.filter((p) => p.status === 'review').length,
    applied: cat.sellers.filter((s) => s.status === 'applied').length,
  };
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">niche-engine<small>Admin</small></div>
        <Suspense><Nav counts={counts} /></Suspense>
        <OrderAlerts />
        <form action={logout} style={{ marginTop: 'auto' }}><button className="mini" style={{ width: '100%' }}>Sign out</button></form>
      </aside>
      <main className="adm-main">
        {devOpen() && <div className="dev">Dev mode: no ADMIN_PASSWORD set, so the panel is open. Demo data only.</div>}
        {children}
      </main>
    </div>
  );
}
