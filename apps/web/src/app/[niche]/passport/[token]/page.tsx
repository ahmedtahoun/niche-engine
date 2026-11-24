// /passport/<token>: one customer's Coffee Passport. The link is private and shareable: it shows the
// first name and stamps only (no phone, no orders). Not for search engines.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PassportBook } from '@/components/Passport';
import { currentCustomer } from '@/lib/current-customer';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';
import { passportOf, readPassportToken } from '@/lib/passport';
import { siteUrl } from '@/lib/site';

type P = { params: Promise<{ niche: string; token: string }> };
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { niche, token } = await params;
  const cfg = getNiche(niche);
  const who = readPassportToken(decodeURIComponent(token));
  if (!cfg || !who || who.niche !== niche) return {};
  const s = await speaker(cfg);
  const pp = await passportOf(who.phone, niche);
  // The layout adds " · <brand>" to every title.
  const title = pp?.firstName ? `${s.t('pp.title')} · ${pp.firstName}` : s.t('pp.title');
  return { title, description: s.t('pp.publicSub', { brand: s.brand(cfg) }), robots: { index: false, follow: false } };
}

export default async function PassportPage({ params }: P) {
  const { niche, token } = await params;
  const cfg = getNiche(niche);
  const who = readPassportToken(decodeURIComponent(token));
  if (!cfg || !who || who.niche !== niche) notFound();
  const s = await speaker(cfg);
  const pp = await passportOf(who.phone, niche);
  if (!pp) notFound();
  const me = await currentCustomer();
  const owner = me?.phone === who.phone;
  return (
    <main className="page narrow">
      <PassportBook pp={pp} cfg={cfg} s={s} shareUrl={siteUrl(cfg, `/passport/${token}`, s.lang)} signedIn={owner} />
      {!owner && (
        <div className="box" style={{ textAlign: 'center', justifyItems: 'center' }}>
          <b>{s.t('pp.publicSub', { brand: s.brand(cfg) })}</b>
          <Link className="btn primary" href={s.href('/')}>{s.t('pp.publicCta')}</Link>
        </div>
      )}
    </main>
  );
}
