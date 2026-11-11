// Shared across ALL niches: a phone that refuses deliveries is blocked everywhere.
// Each refused order is recorded once, so a repeated webhook can't double-count.
import { store } from './store/index.ts';

export const REFUSALS_TO_BLOCK = 2;

/** Records a refused order. Returns true if the phone is now blocked. */
export async function recordRefusal(phone: string, orderId: number): Promise<boolean> {
  await store().addRefusal(phone, orderId);
  return (await store().refusalCount(phone)) >= REFUSALS_TO_BLOCK;
}

export const isBlocked = async (phone: string) => (await store().refusalCount(phone)) >= REFUSALS_TO_BLOCK;
export const blockedList = () => store().blockedPhones();
export const unblock = (phone: string) => store().clearRefusals(phone);
