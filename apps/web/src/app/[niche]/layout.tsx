import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Art';
import { TabBar } from '@/components/TabBar';
import { getNiche } from '@/lib/niches';
import { currentCustomer } from '@/lib/current-customer';
import { walletOf } from '@/lib/wallet';
import { dbEnabled } from '@/lib/db/rest';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  return cfg ? { title: { default: cfg.brand.nameAr, template: `%s · ${cfg.brand.nameAr}` } } : {};
}

const TAGLINE: Record<string, string> = { umrah: 'لبس العمرة والمحجبات', coffee: 'قهوة مختصة من محامص مصر' };

export default async function NicheLayout({ children, params }: P & { children: React.ReactNode }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const me = await currentCustomer();
  const balance = me ? walletOf(me.phone, cfg.id).balance : 0;
  const style = { '--primary': cfg.brand.palette.primary, '--base': cfg.brand.palette.base, '--accent': cfg.brand.palette.accent } as React.CSSProperties;
  return (
    <div className="shell" style={style}>
      {!dbEnabled() && <div className="demo" role="note">نسخة تجريبية: المنتجات والأسعار للعرض بس</div>}
      <header className="head">
        <Link href={`/${cfg.id}`} className="logo">{cfg.brand.nameAr}<small>{TAGLINE[cfg.id] ?? ''}</small></Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {balance > 0 && <Link href={`/${cfg.id}/account`} className="chip" style={{ borderColor: 'var(--accent)' }} aria-label="رصيد المحفظة">{balance.toLocaleString('en-US')} ج</Link>}
          <Link href={`/${cfg.id}/search`} className="iconbtn" aria-label="بحث">{Icon.search}</Link>
        </div>
      </header>
      {children}
      <TabBar niche={cfg.id} />
    </div>
  );
}
