// Reads and writes the customer session cookie (server components and actions only).
import { cookies } from 'next/headers';
import { accountByPhone, type Account } from './customers';
import { GUEST_ORDER_DAYS, guestOrderCookie, readGuestOrder, readSession, SESSION_COOKIE, SESSION_DAYS, signGuestOrder, signSession } from './session';

export async function currentCustomer(): Promise<Account | null> {
  const phone = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  return phone ? accountByPhone(phone) : null;
}

export async function startSession(phone: string) {
  (await cookies()).set(SESSION_COOKIE, signSession(phone), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86400,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Lets this browser open a guest order it just placed. */
export async function rememberGuestOrder(id: number) {
  (await cookies()).set(guestOrderCookie(id), signGuestOrder(id), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: GUEST_ORDER_DAYS * 86400,
  });
}

/** True when this browser placed this order as a guest. */
export async function isGuestOrder(id: number): Promise<boolean> {
  return readGuestOrder(id, (await cookies()).get(guestOrderCookie(id))?.value);
}
