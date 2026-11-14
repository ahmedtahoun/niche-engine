import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Icon } from '@/components/Art';
import { LangProvider, LangSwitch, Txt } from '@/components/I18n';
import { waLink } from '@/lib/site';
import { HeaderNav, TabBar } from '@/components/TabBar';
import { CampaignTracker } from '@/components/Campaign';
import { MetaPixel } from '@/components/Pixel';
import { CartSync } from '@/components/CartView';
import { SiteTracker } from '@/components/SiteTracker';
import { pixelIdFor } from '@/lib/meta';
import { verificationFor } from '@/lib/seo';
import { speak, voiceOf } from '@/lib/i18n';
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
  const verification = verificationFor(cfg.id);
  return { title: { default: name, template: `%s · ${name}` }, ...(cfg.brand.icon ? { icons: { icon: cfg.brand.icon, apple: cfg.brand.icon } } : {}), ...(verification ? { verification } : {}) };
}

export default async function NicheLayout({ children, params }: P & { children: React.ReactNode }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const s = await speaker(cfg);
  const me = await currentCustomer();
  const balance = me ? (await walletOf(me.phone, cfg.id)).balance : 0;
  const style = { '--primary': cfg.brand.palette.primary, '--base': cfg.brand.palette.base, '--accent': cfg.brand.palette.accent } as React.CSSProperties;
  // Both languages for the header texts: the ع / EN button switches them without a server trip.
  const ar = speak('ar', voiceOf(cfg)), en = speak('en', voiceOf(cfg));
  const both = (f: (x: typeof ar) => string) => <Txt ar={f(ar)} en={f(en)} />;
  const pixel = pixelIdFor(cfg.id, cfg.brand.metaPixelId);
  return (
    <LangProvider lang={s.lang} voice={voiceOf(cfg)} base={s.base}>
      <div className="shell" style={style}>
        {store().kind === 'memory' && <div className="demo" role="note">{both((x) => x.t('demo'))}</div>}
        {cfg.freeShippingOverEgp ? <div className="ann" role="note">{both((x) => x.t('ann.freeShip', { x: x.egp(cfg.freeShippingOverEgp!) }))}</div> : null}
        <header className="head">
          <Link href={s.href()} className="logo" style={cfg.brand.logo ? { display: 'flex', alignItems: 'center', gap: 10 } : undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {cfg.brand.logo && <img src={cfg.brand.logo} alt={s.t('alt.logo', { name: s.brand(cfg) })} width={30} height={36} style={{ flex: 'none' }} />}
            <span>{both((x) => x.brand(cfg))}<small>{cfg.brand.tagline ? <Txt ar={cfg.brand.tagline.ar} en={cfg.brand.tagline.en} /> : null}</small></span>
          </Link>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {balance > 0 && <Link href={s.href(`/account`)} className="chip" style={{ borderColor: 'var(--accent)' }} aria-label={s.t('wallet')}>{s.egp(balance)}</Link>}
            <LangSwitch />
            <Link href={s.href(`/search`)} className="iconbtn" aria-label={s.t('nav.search')}>{Icon.search}</Link>
            <HeaderNav niche={cfg.id} />
          </div>
        </header>
        {children}
        {cfg.brand.whatsapp && (
          <a className="wa-fab" href={waLink(cfg.brand.whatsapp, s.t('wa.hello', { brand: s.brand(cfg) }))} rel="noopener" target="_blank" aria-label={s.t('wa.button')} title={s.t('wa.button')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.6.3 2.7 2.7 0 0 0-.9 2c0 1.2.9 2.4 1 2.5.1.2 1.7 2.6 4.2 3.7 1.6.7 2.2.7 3 .6.5-.1 1.4-.6 1.6-1.1.2-.6.2-1 .1-1.1l-.5-.4z"/></svg>
          </a>
        )}
        <TabBar niche={cfg.id} />
        <CampaignTracker />
        <CartSync niche={cfg.id} />
        <SiteTracker niche={cfg.id} />
        {pixel && <MetaPixel id={pixel} />}
      </div>
    </LangProvider>
  );
}
