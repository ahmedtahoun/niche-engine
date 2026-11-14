// Meta Pixel + Conversions API (server only).
//   Pixel id: niches/<id>.json brand.metaPixelId (public). META_PIXEL_IDS=coffee=123… overrides it.
//   Token (secret, server only): META_CAPI_TOKEN, or per niche META_CAPI_TOKENS=coffee=EAAB…
//   META_TEST_EVENT_CODE (optional): events show in Events Manager → Test events.
// Products go as content_type "product_group" with the product id, which matches <g:item_group_id>
// in /feeds/meta-catalog.xml (each size is its own catalog item), so catalog ads line up.
// Customer details are sent only as SHA-256 hashes (phone, first name, governorate, country), as
// Meta requires; the checkout and privacy texts say order details are shared with Meta for ads.
// Without a token nothing is sent and checkout is unaffected.
import { createHash } from 'node:crypto';
import { purchaseEventId } from './meta-ids.ts';

export { purchaseEventId };

type Env = Record<string, string | undefined>;
const pairs = (raw: string | undefined) => Object.fromEntries((raw ?? '').split(',').map((x) => x.split('=').map((y) => y.trim())).filter(([k, v]) => k && v));
const okId = (id: string | undefined) => (id && /^\d{5,20}$/.test(id) ? id : null);

export function pixelIdFor(niche: string, configured?: string, env: Env = process.env): string | null {
  return okId(pairs(env.META_PIXEL_IDS)[niche]) ?? okId(configured);
}

const tokenFor = (niche: string, env: Env) => pairs(env.META_CAPI_TOKENS)[niche] || env.META_CAPI_TOKEN?.trim() || null;

const sha = (v: string) => createHash('sha256').update(v).digest('hex');

/** Meta's normalisation, then SHA-256. Phone: country code + number, digits only (01001234567 → 201001234567). */
export function hashedUser(u: { phone?: string; firstName?: string; city?: string }) {
  const out: Record<string, string[]> = { country: [sha('eg')] };
  const digits = u.phone?.replace(/\D/g, '');
  if (digits && /^01\d{9}$/.test(digits)) out.ph = [sha(`2${digits}`)];
  const fn = u.firstName?.trim().split(/\s+/)[0]?.toLowerCase();
  if (fn) out.fn = [sha(fn)];
  const ct = u.city?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  if (ct) out.ct = [sha(ct)];
  return out;
}

export interface MetaEvent {
  name: 'Purchase' | 'InitiateCheckout' | 'AddToCart';
  eventId: string;
  value: number;
  productIds: string[];
  numItems: number;
  url: string;
  orderId?: number;
  /** Plain values; hashed here, never sent as they are. */
  customer?: { phone?: string; firstName?: string; city?: string };
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  at?: Date;
}

export function eventPayload(e: MetaEvent, testCode?: string) {
  const user: Record<string, string | string[]> = { ...hashedUser(e.customer ?? {}) };
  if (e.ip && e.ip !== 'unknown') user.client_ip_address = e.ip;
  if (e.userAgent) user.client_user_agent = e.userAgent;
  if (e.fbp) user.fbp = e.fbp;
  if (e.fbc) user.fbc = e.fbc;
  return {
    data: [{
      event_name: e.name,
      event_time: Math.floor((e.at ?? new Date()).getTime() / 1000),
      event_id: e.eventId,
      action_source: 'website',
      event_source_url: e.url,
      user_data: user,
      custom_data: { currency: 'EGP', value: e.value, content_type: 'product_group', content_ids: [...new Set(e.productIds)], num_items: e.numItems, ...(e.orderId ? { order_id: String(e.orderId) } : {}) },
    }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

/** Sends one event to the Conversions API. Never throws: a Meta outage must not touch the order. */
export async function sendEvent(niche: string, configuredPixel: string | undefined, e: MetaEvent, env: Env = process.env, fetcher: typeof fetch = fetch): Promise<boolean> {
  const pixel = pixelIdFor(niche, configuredPixel, env);
  const token = tokenFor(niche, env);
  if (!pixel || !token) return false;
  try {
    const res = await fetcher(`https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v23.0'}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload(e, env.META_TEST_EVENT_CODE || undefined)),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[meta] ${e.name} ${e.eventId}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res.ok;
  } catch (err) {
    console.error(`[meta] ${e.name} ${e.eventId}:`, (err as Error).message);
    return false;
  }
}
