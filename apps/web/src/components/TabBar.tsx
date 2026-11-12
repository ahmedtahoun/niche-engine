'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Art';
import { useCart } from './cart-store';
import { useSpeak } from './I18n';

export function TabBar({ niche }: { niche: string }) {
  // The address may or may not start with the store id (localhost/coffee/search, cairoroast.com/search).
  const raw = usePathname() ?? '/';
  const path = raw === `/${niche}` ? '/' : raw.startsWith(`/${niche}/`) ? raw.slice(niche.length + 1) : raw;
  const s = useSpeak();
  const [lines] = useCart(niche);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const tabs = [
    { href: s.href(), label: s.t('nav.home'), icon: Icon.home, match: (p: string) => p === '/' },
    { href: s.href('/search'), label: s.t('nav.search'), icon: Icon.search, match: (p: string) => p.startsWith('/search') },
    { href: s.href('/cart'), label: count ? s.t('nav.cartN', { n: count }) : s.t('nav.cart'), icon: Icon.cart, match: (p: string) => p.startsWith('/cart') || p.startsWith('/checkout') },
    { href: s.href('/account'), label: s.t('nav.account'), icon: Icon.user, match: (p: string) => p.startsWith('/account') || p.startsWith('/order') },
  ];
  return (
    <nav className="tabbar" aria-label={s.t('nav.label')}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.match(path) ? 'page' : undefined}>
          {t.icon}
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Cart and account in the header on wide screens, where the bottom tab bar is hidden. */
export function HeaderNav({ niche }: { niche: string }) {
  const s = useSpeak();
  const [lines] = useCart(niche);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  return (
    <>
      <Link href={s.href('/account')} className="iconbtn only-wide-grid" aria-label={s.t('nav.account')}>{Icon.user}</Link>
      <Link href={s.href('/cart')} className="iconbtn only-wide-grid cartbtn" aria-label={count ? s.t('nav.cartN', { n: count }) : s.t('nav.cart')}>
        {Icon.cart}{count > 0 && <span className="badge-n num">{count}</span>}
      </Link>
    </>
  );
}
