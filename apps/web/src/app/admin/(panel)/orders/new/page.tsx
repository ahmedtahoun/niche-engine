import Link from 'next/link';
import { catalog, choicesFor } from '@/lib/catalog';
import { customers } from '@/lib/customer-stats';
import { GOVERNORATES } from '@/lib/eta';
import { allNiches, getNiche } from '@/lib/niches';
import { customerKey } from '@/lib/session';
import { store } from '@/lib/store';
import { NewOrderForm, type PickProduct } from './NewOrderForm';

export const metadata = { title: 'New order' };

export default async function NewOrder({ searchParams }: { searchParams: Promise<{ niche?: string; customer?: string }> }) {
  const sp = await searchParams;
  const live = Object.values(allNiches()).filter((n) => n.status === 'live');
  const cfg = getNiche(sp.niche ?? '') ?? live.find((n) => n.id === 'coffee') ?? live[0] ?? Object.values(allNiches())[0];
  const cat = await catalog();
  const people = customers(await store().listOrders({ limit: 5000 }), customerKey)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .map((c) => ({ key: c.key, name: c.name, phone: c.phone, governorate: c.governorate, area: c.area, address: c.address, orders: c.orders, lastAt: c.lastAt }));
  const products: PickProduct[] = cat.productsOf(cfg.id).filter((p) => (p.status ?? 'live') === 'live').map((p) => ({
    slug: p.slug, name: p.nameAr, nameEn: p.en?.name,
    sizes: p.variants.map((v) => ({ label: v.label, price: v.price ?? p.price, stock: v.stock })),
    choices: choicesFor(cfg, p).map((c) => ({ id: c.id, label: c.labelEn ?? c.labelAr, values: c.values.map((v) => ({ id: v.id, label: v.labelEn ?? v.labelAr })) })),
  }));
  return (
    <div className="editor">
      <div className="ed-bar">
        <Link href="/admin/orders" className="back" aria-label="Back to orders">←</Link>
        <div className="ed-title"><h1>New order</h1><span className="sub">For orders taken on WhatsApp, by phone or on social media. Priced from today’s prices; stock is taken and the seller is told, like a website order.</span></div>
        {live.length > 1 && <nav className="seg">{live.map((n) => <Link key={n.id} href={`/admin/orders/new?niche=${n.id}`} aria-current={n.id === cfg.id ? 'true' : undefined}>{n.brand.nameEn}</Link>)}</nav>}
      </div>
      <NewOrderForm niche={cfg.id} shipping={cfg.shippingEgp} freeOver={cfg.freeShippingOverEgp} governorates={GOVERNORATES} customers={people} products={products} preselect={sp.customer} />
    </div>
  );
}
