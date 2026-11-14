import { notFound } from 'next/navigation';
import { CartView } from '@/components/CartView';
import { speaker } from '@/lib/lang';
import { getNiche } from '@/lib/niches';

export async function generateMetadata() { return { title: (await speaker()).t('nav.cart') }; }

export default async function CartPage({ params, searchParams }: { params: Promise<{ niche: string }>; searchParams: Promise<{ promo?: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const promo = ((await searchParams).promo ?? '').slice(0, 30);
  return (
    <main className="page narrow">
      <h1 className="title">{(await speaker(cfg)).t('nav.cart')}</h1>
      <CartView niche={cfg.id} depositAbove={cfg.risk.depositAboveEgp} deposit={cfg.risk.depositEgp} cashback={cfg.wallet.cashback} freeOver={cfg.freeShippingOverEgp} freeHint={cfg.freeShippingHint} initialPromo={promo} />
    </main>
  );
}
