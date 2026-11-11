// Reads and writes the customer session cookie (server components and actions only).
import { cookies } from 'next/headers';
import { accountByPhone, type Account } from './customers';
import { readSession, SESSION_COOKIE, SESSION_DAYS, signSession } from './session';

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
