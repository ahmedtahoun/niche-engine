'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Art';
import { useCart } from './cart-store';

export function TabBar({ niche }: { niche: string }) {
  const path = usePathname();
  const [lines] = useCart(niche);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const base = `/${niche}`;
  const tabs = [
    { href: base, label: 'الرئيسية', icon: Icon.home, match: (p: string) => p === base || p === `${base}/` },
    { href: `${base}/search`, label: 'بحث', icon: Icon.search, match: (p: string) => p.startsWith(`${base}/search`) },
    { href: `${base}/cart`, label: count ? `السلة (${count})` : 'السلة', icon: Icon.cart, match: (p: string) => p.startsWith(`${base}/cart`) || p.startsWith(`${base}/checkout`) },
    { href: `${base}/account`, label: 'حسابي', icon: Icon.user, match: (p: string) => p.startsWith(`${base}/account`) || p.startsWith(`${base}/order`) },
  ];
  return (
    <nav className="tabbar" aria-label="التنقل">
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.match(path) ? 'page' : undefined}>
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
