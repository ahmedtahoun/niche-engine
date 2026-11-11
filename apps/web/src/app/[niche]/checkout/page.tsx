import { notFound } from 'next/navigation';
import { CheckoutForm } from '@/components/CheckoutForm';
import { etaLabel, GOVERNORATES } from '@/lib/eta';
import { getNiche } from '@/lib/niches';
import { currentCustomer } from '@/lib/current-customer';
import { walletOf } from '@/lib/wallet';

export const metadata = { title: 'إتمام الطلب' };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ niche: string }>; searchParams: Promise<{ promo?: string }> }) {
  const cfg = getNiche((await params).niche);
  if (!cfg) notFound();
  const promo = ((await searchParams).promo ?? '').slice(0, 30);
  const eta = Object.fromEntries(GOVERNORATES.map((g) => [g, etaLabel(g)]));
  const a = await currentCustomer();
  const w = a ? await walletOf(a.phone, cfg.id) : null;
  const me = a ? { name: a.name, phone: a.phone, governorate: a.governorate, area: a.area, address: a.address, landmark: a.landmark } : null;
  return (
    <main className="page">
      <CheckoutForm niche={cfg.id} governorates={GOVERNORATES} initialPromo={promo} openBeforePay={cfg.risk.openBeforePay} depositAbove={cfg.risk.depositAboveEgp} deposit={cfg.risk.depositEgp} eta={eta} me={me} wallet={w ? { balance: w.balance, nextExpiry: w.nextExpiry } : null} />
    </main>
  );
}
