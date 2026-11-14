'use client';
// Page views and funnel steps for admin → Traffic. No cookies and nothing personal: the niche,
// the page path, where this visit came from, phone or desktop, and the language.
// The visit's source is worked out on its first page and kept for the tab (sessionStorage).
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

let niche = '';
const SRC = 'ne_src';

/** Known referrers → a short name. Order matters: gemini.google.com before google. */
const REFERRERS: [RegExp, string][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/, 'chatgpt'], [/perplexity\.ai$/, 'perplexity'], [/gemini\.google\.com$/, 'gemini'], [/copilot\.microsoft\.com$/, 'copilot'],
  [/(^|\.)google\.[a-z.]+$/, 'google'], [/(^|\.)bing\.com$/, 'bing'], [/duckduckgo\.com$/, 'duckduckgo'], [/(^|\.)yahoo\.com$/, 'yahoo'],
  [/(^|\.)instagram\.com$/, 'instagram'], [/(^|\.)facebook\.com$|(^|\.)fb\.com$|(^|\.)fb\.me$/, 'facebook'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)whatsapp\.com$|^wa\.me$/, 'whatsapp'], [/^t\.co$|(^|\.)x\.com$|(^|\.)twitter\.com$/, 'x'], [/(^|\.)youtube\.com$|^youtu\.be$/, 'youtube'],
];

function sourceOfVisit(): string {
  // A campaign link (utm_source or an ad click id) always wins, even in a tab that was already open.
  const q = new URLSearchParams(location.search);
  const utm = q.get('utm_source')?.toLowerCase();
  const paid = /^(paid|cpc|ppc|ads?|paid_social|paidsocial)$/i.test(q.get('utm_medium') ?? '');
  let src = utm ? `${utm}${paid ? ' ads' : ''}` : q.get('gclid') ? 'google ads' : q.get('ttclid') ? 'tiktok ads' : q.get('fbclid') ? 'facebook' : '';
  if (!src) {
    try {
      const kept = sessionStorage.getItem(SRC);
      if (kept) return kept;
    } catch { /* storage blocked */ }
  }
  if (!src && document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      src = host === location.hostname.replace(/^www\./, '') ? 'direct' : REFERRERS.find(([re]) => re.test(host))?.[1] ?? host;
    } catch { /* odd referrer */ }
  }
  src ||= 'direct';
  try { sessionStorage.setItem(SRC, src); } catch { /* storage blocked */ }
  return src;
}

/** Sends one event; fire-and-forget, never blocks the page. */
export function trackSite(kind: 'view' | 'cart' | 'checkout', path = location.pathname) {
  if (!niche) return;
  try {
    const body = JSON.stringify({ n: niche, k: kind, p: path, s: sourceOfVisit(), d: innerWidth >= 768 ? 'desktop' : 'mobile', l: document.documentElement.lang === 'en' ? 'en' : 'ar' });
    if (!navigator.sendBeacon?.('/api/t', body)) void fetch('/api/t', { method: 'POST', body, keepalive: true }).catch(() => {});
  } catch { /* tracking must never break the store */ }
}

/** In the niche layout: one "view" per page, including in-app navigation. */
export function SiteTracker({ niche: id }: { niche: string }) {
  const path = usePathname();
  useEffect(() => { niche = id; }, [id]);
  useEffect(() => { niche = id; trackSite('view', path); }, [id, path]);
  return null;
}
