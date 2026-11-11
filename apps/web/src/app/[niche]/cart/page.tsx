import { notFound } from 'next/navigation';
import { CartView } from '@/components/CartView';
import { getNiche } from '@/lib/niches';

export const metadata = { title: 'السلة' };

export default async function CartPage({ params }: { params: Promise<{ niche: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  return (
    <main className="page narrow">
      <h1 className="title">السلة</h1>
      <CartView niche={cfg.id} depositAbove={cfg.risk.depositAboveEgp} deposit={cfg.risk.depositEgp} cashback={cfg.wallet.cashback} />
    </main>
  );
}
