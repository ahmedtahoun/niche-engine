// Server side: the customer's language from the "lang" cookie (Arabic by default).
import { cookies } from 'next/headers';
import type { NicheConfig } from '@niche-engine/core';
import { LANG_COOKIE, speak, voiceOf, type Lang } from './i18n.ts';

export async function getLang(): Promise<Lang> {
  try {
    return (await cookies()).get(LANG_COOKIE)?.value === 'en' ? 'en' : 'ar';
  } catch {
    return 'ar'; // outside a request (tests, scripts)
  }
}

/** The speaker for a page or server action in this niche. */
export async function speaker(cfg?: NicheConfig | null) {
  return speak(await getLang(), cfg ? voiceOf(cfg) : 'm');
}
