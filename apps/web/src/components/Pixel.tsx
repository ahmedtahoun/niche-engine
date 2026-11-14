'use client';
// Meta Pixel in the browser. Loaded only when the niche has a pixel id (META_PIXEL_IDS).
// track() is safe to call anywhere: without a pixel it does nothing.
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq } }

export interface PixelData { content_ids?: string[]; content_type?: 'product' | 'product_group'; content_name?: string; value?: number; currency?: 'EGP'; num_items?: number }

type Call = [string, string, Record<string, unknown>?, { eventID: string }?];
/** Events from pages that run before the pixel starts (child effects run first): sent right after its PageView. */
const early: Call[] = [];
let pixelOn = false;

function send(c: Call) {
  try { window.fbq?.(...c); } catch { /* the pixel must never break the store */ }
}

export function track(event: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Contact', data: PixelData, eventId?: string) {
  const c: Call = eventId ? ['track', event, { currency: 'EGP', ...data }, { eventID: eventId }] : ['track', event, { currency: 'EGP', ...data }];
  if (window.fbq) send(c);
  else if (!pixelOn && early.length < 20) early.push(c);
}

/** The pixel's standard loader (same as Meta's snippet), plus a PageView on every page change. */
export function MetaPixel({ id }: { id: string }) {
  const path = usePathname();
  useEffect(() => {
    if (!window.fbq) {
      const q: Fbq = function (...args: unknown[]) { if (q.callMethod) q.callMethod(...args); else q.queue!.push(args); } as Fbq;
      q.push = q; q.loaded = true; q.version = '2.0'; q.queue = [];
      window.fbq = q; window._fbq = q;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://connect.facebook.net/en_US/fbevents.js';
      document.head.appendChild(s);
      window.fbq('init', id);
    }
  }, [id]);
  useEffect(() => {
    // Contact: any tap on a WhatsApp or phone link, wherever it is on the page.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
      const href = a?.getAttribute('href') ?? '';
      if (/^(https?:\/\/)?(wa\.me|api\.whatsapp\.com)\//i.test(href)) track('Contact', { content_name: 'whatsapp' });
      else if (href.startsWith('tel:')) track('Contact', { content_name: 'phone' });
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);
  useEffect(() => {
    // Client-side navigation does not reload the page, so each route change is its own PageView.
    send(['track', 'PageView']);
    pixelOn = true;
    early.splice(0).forEach(send);
  }, [path]);
  return null;
}

/** Fires one event when the page opens (product and box pages: ViewContent). */
export function TrackOnView({ event, data }: { event: 'ViewContent'; data: PixelData }) {
  const key = JSON.stringify(data);
  useEffect(() => { track(event, data); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key]);
  return null;
}
