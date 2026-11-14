import { notFound } from 'next/navigation';
import { CartView } from '@/components/CartView';
import { store } from '@/lib/store';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';

export async function generateMetadata() { return { title: (await speaker()).t('nav.cart') }; }

export default async function CartPage({ params, searchParams }: { params: Promise<{ niche: string }>; searchParams: Promise<{ promo?: string; d?: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const sp = await searchParams;
  const promo = (sp.promo ?? '').slice(0, 30);
  // "Back to your cart" link from a WhatsApp reminder: refills that cart (only slugs, sizes, quantities).
  const draft = sp.d ? await store().draftByToken(sp.d.slice(0, 40)).catch(() => null) : null;
  const restore = draft && draft.niche === cfg.id && draft.status !== 'ordered' ? draft.cart : undefined;
  return (
    <main className="page narrow">
      <h1 className="title">{(await speaker(cfg)).t('nav.cart')}</h1>
      <CartView niche={cfg.id} depositAbove={cfg.risk.depositAboveEgp} deposit={cfg.risk.depositEgp} cashback={cfg.wallet.cashback} freeOver={cfg.freeShippingOverEgp} freeHint={cfg.freeShippingHint} initialPromo={promo} restore={restore} />
    </main>
  );
}
