'use client';
// "Order again": puts an earlier order's coffees (same weight and grind) back in the cart and opens it.
// Prices are re-checked in the cart; anything no longer sold shows there as unavailable.
import { useRouter } from 'next/navigation';
import type { CartLine } from '@/lib/types';
import { addLine } from './cart-store';
import { useSpeak } from './I18n';

export function BuyAgain({ niche, cart, compact }: { niche: string; cart: CartLine[]; compact?: boolean }) {
  const router = useRouter();
  const s = useSpeak();
  if (!cart?.length) return null;
  return (
    <button
      type="button"
      className={compact ? 'btn ghost buy-again' : 'btn ghost block'}
      onClick={() => { for (const l of cart) addLine(niche, { ...l }); router.push(s.href('/cart')); }}
    >
      🔁 {s.t('buyAgain')}
    </button>
  );
}
