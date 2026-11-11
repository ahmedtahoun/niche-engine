import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Art';
import { LangProvider, LangSwitch } from '@/components/I18n';
import { TabBar } from '@/components/TabBar';
import { voiceOf } from '@/lib/i18n';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { currentCustomer } from '@/lib/current-customer';
import { walletOf } from '@/lib/wallet';
import { store } from '@/lib/store';

type P = { params: Promise<{ niche: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const cfg = getNiche((await params).niche);
  if (!cfg) return {};
  const name = (await speaker(cfg)).brand(cfg);
  return { title: { default: name, template: `%s · ${name}` }, ...(cfg.brand.icon ? { icons: { icon: cfg.brand.icon, apple: cfg.brand.icon } } : {}) };
}

export default async function NicheLayout({ children, params }: P & { children: React.ReactNode }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const me = await currentCustomer();
  const balance = me ? (await walletOf(me.phone, cfg.id)).balance : 0;
  const style = { '--primary': cfg.brand.palette.primary, '--base': cfg.brand.palette.base, '--accent': cfg.brand.palette.accent } as React.CSSProperties;
  const tagline = cfg.brand.tagline ? (s.en && cfg.brand.tagline.en) || cfg.brand.tagline.ar : '';
  return (
    <LangProvider lang={s.lang} voice={voiceOf(cfg)}>
      <div className="shell" style={style}>
        {store().kind === 'memory' && <div className="demo" role="note">{s.t('demo')}</div>}
        <header className="head">
          <Link href={`/${cfg.id}`} className="logo" style={cfg.brand.logo ? { display: 'flex', alignItems: 'center', gap: 10 } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cfg.brand.logo && <img src={cfg.brand.logo} alt="" width={30} height={36} style={{ flex: 'none' }} />}
            <span>{s.brand(cfg)}<small>{tagline}</small></span>
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {balance > 0 && <Link href={`/${cfg.id}/account`} className="chip" style={{ borderColor: 'var(--accent)' }} aria-label={s.t('wallet')}>{s.egp(balance)}</Link>}
            <LangSwitch />
            <Link href={`/${cfg.id}/search`} className="iconbtn" aria-label={s.t('nav.search')}>{Icon.search}</Link>
          </div>
        </header>
        {children}
        <TabBar niche={cfg.id} />
      </div>
    </LangProvider>
  );
}
