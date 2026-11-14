// Meta Pixel + Conversions API, one pixel per niche.
//   META_PIXEL_IDS=coffee=123456789012345            (public id, shown in the page)
//   META_CAPI_TOKENS=coffee=EAAB...                   (secret, server only)
//   META_TEST_EVENT_CODE=TEST12345                    (optional: events show in Events Manager → Test events)
// Products are sent as content_type "product_group" with the product id, which matches
// <g:item_group_id> in /feeds/meta-catalog.xml, so catalog ads and retargeting line up.
// Privacy: no phone, name or address goes to Meta (checkout promises details go only to the
// courier and the seller). The server event carries only IP, browser and Meta's own cookies.

const pairs = (raw: string | undefined) => Object.fromEntries((raw ?? '').split(',').map((x) => x.split('=').map((y) => y.trim())).filter(([k, v]) => k && v));

export function pixelIdFor(niche: string, env: Record<string, string | undefined> = process.env): string | null {
  const id = pairs(env.META_PIXEL_IDS)[niche];
  return id && /^\d{5,20}$/.test(id) ? id : null;
}

export interface PurchaseEvent {
  orderId: number;
  value: number;
  productIds: string[];
  numItems: number;
  url: string;
  ip?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  at?: Date;
}

/** Same id in the browser and on the server, so Meta counts the purchase once. */
export const purchaseEventId = (orderId: number) => `order-${orderId}`;

export function purchasePayload(e: PurchaseEvent, testCode?: string) {
  const user: Record<string, string> = {};
  if (e.ip && e.ip !== 'unknown') user.client_ip_address = e.ip;
  if (e.userAgent) user.client_user_agent = e.userAgent;
  if (e.fbp) user.fbp = e.fbp;
  if (e.fbc) user.fbc = e.fbc;
  return {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor((e.at ?? new Date()).getTime() / 1000),
      event_id: purchaseEventId(e.orderId),
      action_source: 'website',
      event_source_url: e.url,
      user_data: user,
      custom_data: { currency: 'EGP', value: e.value, content_type: 'product_group', content_ids: [...new Set(e.productIds)], num_items: e.numItems, order_id: String(e.orderId) },
    }],
    ...(testCode ? { test_event_code: testCode } : {}),
  };
}

/** Sends the purchase to the Conversions API. Never throws: a Meta outage must not touch the order. */
export async function sendPurchase(niche: string, e: PurchaseEvent, env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch): Promise<boolean> {
  const pixel = pixelIdFor(niche, env);
  const token = pairs(env.META_CAPI_TOKENS)[niche];
  if (!pixel || !token) return false;
  try {
    const res = await fetcher(`https://graph.facebook.com/${env.META_GRAPH_VERSION || 'v23.0'}/${pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(purchasePayload(e, env.META_TEST_EVENT_CODE || undefined)),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[meta] purchase ${e.orderId}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    return res.ok;
  } catch (err) {
    console.error(`[meta] purchase ${e.orderId}:`, (err as Error).message);
    return false;
  }
}
