'use server';
// Local bot simulator actions. Disabled in production.
import { approveProduct, approveSeller, handle } from '@/bot/engine';
import { deliver, recordIncoming } from '@/bot/transport';

const guard = () => { if (process.env.NODE_ENV === 'production') throw new Error('simulator disabled'); };

export async function simSend(chatId: number, input: { text?: string; data?: string; label?: string; photos?: number }) {
  guard();
  const m = { chatId, text: input.text, data: input.data, photos: input.photos };
  recordIncoming(m, input.label);
  await deliver(handle(m));
}

export async function simApproveSeller(id: string) { guard(); await deliver(approveSeller(id)); }
export async function simApproveProduct(id: string) { guard(); await deliver(approveProduct(id)); }
