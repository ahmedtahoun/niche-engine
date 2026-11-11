import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { devOpen, isAdmin } from '@/lib/admin-auth';
import { PRODUCTS, SELLERS } from '@/lib/demo-data';
import { allOrders } from '@/lib/orders';
import { seedDemoOrders } from '@/lib/seed';
import { logout } from '../actions';
import { Nav } from './Nav';
import '../admin.css';

export const metadata = { title: { default: 'Admin', template: '%s · Admin' }, robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect('/admin/login');
  seedDemoOrders();
  const counts = {
    orders: allOrders().filter((o) => o.needsAttention || o.status === 'confirmed').length,
    review: PRODUCTS.filter((p) => p.status === 'review').length + SELLERS.filter((s) => s.status === 'applied').length,
  };
  return (
    <div className="adm">
      <aside className="adm-side">
        <div className="adm-brand">niche-engine<small>Admin</small></div>
        <Suspense><Nav counts={counts} /></Suspense>
        <form action={logout} style={{ marginTop: 'auto' }}><button className="mini" style={{ width: '100%' }}>Sign out</button></form>
      </aside>
      <main className="adm-main">
        {devOpen() && <div className="dev">Dev mode: no ADMIN_PASSWORD set, so the panel is open. Demo data only.</div>}
        {children}
      </main>
    </div>
  );
}
