// Event ids shared by the browser pixel and the Conversions API, so Meta counts each event once.
// Safe to import in the browser (no server code here).

/** One id per order: a refresh or a second send of the same order never counts twice. */
export const purchaseEventId = (orderId: number) => `order-${orderId}`;

/** A fresh id for one AddToCart or InitiateCheckout, sent by both the browser and the server. */
export const newEventId = (prefix: 'atc' | 'ic') => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Ids the browser may send for server events: our own format only. */
export const validEventId = (id: unknown): id is string => typeof id === 'string' && /^(atc|ic)-[a-z0-9]{6,12}-[a-z0-9]{4,10}$/.test(id);
