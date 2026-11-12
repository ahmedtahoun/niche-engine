'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export function Nav({ counts }: { counts: { orders: number; review: number; applied: number } }) {
  const path = usePathname();
  const niche = useSearchParams().get('niche');
  const q = niche ? `?niche=${niche}` : '';
  const items: [string, string, number?][] = [
    ['/admin', 'Overview'],
    ['/admin/orders', 'Orders', counts.orders],
    ['/admin/customers', 'Customers'],
    ['/admin/sellers', 'Sellers', counts.applied],
    ['/admin/products', 'Products', counts.review],
    ['/admin/payouts', 'Payouts'],
    ['/admin/telegram', 'Telegram bot'],
  ];
  return (
    <nav style={{ display: 'contents' }} aria-label="Admin sections">
      {items.map(([href, label, n]) => (
        <Link key={href} href={href + q} aria-current={path === href || (href !== '/admin' && path.startsWith(`${href}/`)) ? 'page' : undefined}>
          {label}{n ? <span className="adm-badge">{n}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
