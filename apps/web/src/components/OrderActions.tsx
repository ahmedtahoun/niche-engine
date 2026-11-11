'use client';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { cancelOrder, confirmOrder } from '@/app/actions';

export function OrderActions({ niche, id, status }: { niche: string; id: number; status: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<boolean>) => start(async () => { await fn(); router.refresh(); });
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {status === 'awaiting_confirm' && (
        <button className="btn primary block" disabled={pending} onClick={() => run(() => confirmOrder(niche, id))}>
          تأكيد الطلب
        </button>
      )}
      {(status === 'awaiting_confirm' || status === 'confirmed') && (
        <button className="btn ghost block" disabled={pending} onClick={() => run(() => cancelOrder(niche, id))}>غيّرت رأيك؟ الغي الطلب</button>
      )}
    </div>
  );
}
