'use client';
// Client side: the language chosen on the server, shared with client components.
import { useRouter } from 'next/navigation';
import { createContext, useContext, useMemo, useTransition } from 'react';
import { LANG_COOKIE, speak, type Lang, type Voice } from '@/lib/i18n';

const Ctx = createContext<{ lang: Lang; voice: Voice; base: string }>({ lang: 'ar', voice: 'm', base: '' });

export function LangProvider({ lang, voice, base, children }: { lang: Lang; voice: Voice; base: string; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, voice, base }}>{children}</Ctx.Provider>;
}

export function useSpeak() {
  const { lang, voice, base } = useContext(Ctx);
  return useMemo(() => speak(lang, voice, base), [lang, voice, base]);
}

/** ع / EN button: saves the choice for a year and re-renders the page in the other language. */
export function LangSwitch() {
  const s = useSpeak();
  const router = useRouter();
  const [pending, start] = useTransition();
  const next = s.en ? 'ar' : 'en';
  return (
    <button
      type="button"
      className="iconbtn lang"
      aria-label={s.t('lang.switchLabel')}
      lang={next}
      disabled={pending}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
        start(() => router.refresh());
      }}
    >
      {s.en ? 'ع' : 'EN'}
    </button>
  );
}
