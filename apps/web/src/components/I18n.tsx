'use client';
// Client side: the language chosen on the server, shared with client components.
import { usePathname, useRouter } from 'next/navigation';
import { createContext, useContext, useEffect, useMemo, useState, useTransition } from 'react';
import { LANG_COOKIE, speak, type Lang, type Voice } from '@/lib/i18n';

const Ctx = createContext<{ lang: Lang; voice: Voice; base: string; setLang: (l: Lang) => void }>({ lang: 'ar', voice: 'm', base: '', setLang: () => {} });

/**
 * The language for client components. The store layout is not re-rendered when only the page
 * changes, so the ع / EN button switches it here at once (header, tab bar, buttons) while the
 * page content is fetched in the other language.
 */
export function LangProvider({ lang: initial, voice, base, children }: { lang: Lang; voice: Voice; base: string; children: React.ReactNode }) {
  const [lang, setLang] = useState(initial);
  useEffect(() => setLang(initial), [initial]);
  const value = useMemo(() => ({ lang, voice, base, setLang }), [lang, voice, base]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSpeak() {
  const { lang, voice, base } = useContext(Ctx);
  return useMemo(() => speak(lang, voice, base), [lang, voice, base]);
}

/** Server-made text in both languages, shown in the current one (for parts of the layout). */
export function Txt({ ar, en }: { ar: string; en?: string }) {
  const { lang } = useContext(Ctx);
  return <>{lang === 'en' && en ? en : ar}</>;
}

/** The current page in the other language (?hl= shows it without saving; the button saves the cookie). */
function otherLangHref(next: Lang) {
  const u = new URL(window.location.href);
  u.searchParams.delete('lang');
  u.searchParams.set('hl', next);
  return `${u.pathname}${u.search}`;
}

/**
 * ع / EN button: saves the choice for a year and shows the page in the other language.
 * The other language is fetched quietly a moment after the page loads, so the switch is
 * instant instead of a full round trip to the server.
 */
export function LangSwitch() {
  const s = useSpeak();
  const { setLang } = useContext(Ctx);
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const next = s.en ? 'ar' : 'en';
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (conn?.saveData) return;
    // "full" keeps the whole page, not just its loading shell, in the router cache.
    const id = setTimeout(() => router.prefetch(otherLangHref(next), { kind: 'full' } as never), 1500);
    return () => clearTimeout(id);
  }, [router, next, path]);
  useEffect(() => {
    document.documentElement.classList.toggle('lang-switching', pending);
  }, [pending]);
  return (
    <button
      type="button"
      className="iconbtn lang"
      aria-label={s.t('lang.switchLabel')}
      aria-busy={pending || undefined}
      lang={next}
      disabled={pending}
      onClick={() => {
        document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        document.documentElement.lang = next;
        document.documentElement.dir = next === 'en' ? 'ltr' : 'rtl';
        setLang(next);
        start(() => router.replace(otherLangHref(next), { scroll: false }));
      }}
    >
      {pending ? <span className="spin" aria-hidden="true" /> : s.en ? 'ع' : 'EN'}
    </button>
  );
}
