// Bosta client, ported from shop.wheretospot.com (api/bosta.php), which runs on Bosta's live API.
// With no API key for a niche it returns demo tracking numbers, so the whole flow runs locally.
//
// Settings (server env, never in git):
//   BOSTA_API_KEY_<NICHE>  per store, e.g. BOSTA_API_KEY_UMRAH for Sakina (its own Bosta account)
//   BOSTA_API_KEY          fallback for a store without its own key
//   BOSTA_WEBHOOK_SECRET   sent back by Bosta on every status update (set on each shipment we create)
//   BOSTA_API_BASE         optional, default https://app.bosta.co/api/v2 (tests point it at a fake Bosta)
//   BOSTA_WEBHOOK_BASE     optional public address for the webhook (default: the store's domain)
import { citiesForGovernorate, exactArea, indexAreas, parseBostaCities, type City, type District } from './bosta-areas.ts';
import type { Shipment } from './orders.ts';

const BASE = () => (process.env.BOSTA_API_BASE || 'https://app.bosta.co/api/v2').replace(/\/$/, '');
const EGYPT = '60e4482c7cb7d4bc4849c4d5';
/** Bosta refuses cash on delivery above this. */
export const COD_LIMIT = 30000;

/** The store's own Bosta key, else the shared one. */
export const bostaKey = (niche?: string) =>
  (niche && process.env[`BOSTA_API_KEY_${niche.toUpperCase()}`]?.trim()) || process.env.BOSTA_API_KEY?.trim() || '';
export const bostaEnabled = (niche?: string) => Boolean(bostaKey(niche));

/** A Bosta answer we can't continue past. `status` is the HTTP code (404 = shipment not found). */
export class BostaError extends Error {
  readonly status: number;
  constructor(message: string, status = 0) { super(message); this.status = status; }
}

async function request<T = Record<string, unknown>>(method: string, path: string, o: { niche?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (o.auth !== false) headers.Authorization = bostaKey(o.niche);
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  let res: Response;
  try {
    res = await fetch(`${BASE()}${path}`, { method, headers, body: o.body === undefined ? undefined : JSON.stringify(o.body), signal: AbortSignal.timeout(20_000) });
  } catch (e) {
    throw new BostaError(`Could not reach Bosta: ${(e as Error).message}`);
  }
  const json = (await res.json().catch(() => null)) as (T & { success?: boolean; message?: unknown }) | null;
  if (!json || typeof json !== 'object') throw new BostaError(`Unexpected reply from Bosta (HTTP ${res.status}).`, res.status);
  if (res.status >= 400 || json.success === false) {
    let msg = typeof json.message === 'string' ? json.message : json.message ? JSON.stringify(json.message) : `HTTP ${res.status}`;
    if (res.status === 401) msg = 'Bosta rejected the API key. Check BOSTA_API_KEY for this store.';
    if (res.status === 403) msg = `This Bosta API key has no permission for that. (${msg})`;
    throw new BostaError(`Bosta: ${msg}`, res.status);
  }
  return json;
}

// ---------- delivery areas (public endpoint, cached a day per server process) ----------

const g = globalThis as unknown as { __bostaAreas?: { at: number; cities: City[] } };

/** Cities and districts Bosta delivers to. A stale copy is served if Bosta is briefly unreachable. */
export async function bostaCities(): Promise<City[]> {
  const cached = g.__bostaAreas;
  if (cached && Date.now() - cached.at < 864e5) return cached.cities;
  try {
    const raw = await request('GET', `/cities/getAllDistricts?countryId=${EGYPT}`, { auth: false });
    const cities = parseBostaCities(raw);
    g.__bostaAreas = { at: Date.now(), cities };
    return cities;
  } catch (e) {
    if (cached) return cached.cities;
    throw e;
  }
}

/** Districts the courier delivers to inside a checkout governorate. */
export async function districtsFor(governorate: string): Promise<District[]> {
  return citiesForGovernorate(await bostaCities(), governorate).flatMap((c) => c.districts);
}

/**
 * The Bosta district for an order's address: the one the customer picked, else the one their
 * typed area clearly names. Null when it can't be told (the team picks it in the admin).
 */
export async function resolveDistrict(c: { governorate: string; area: string; districtId?: string }): Promise<District | null> {
  const list = await districtsFor(c.governorate);
  if (c.districtId) return list.find((d) => d.id === c.districtId) ?? null;
  const hit = exactArea(indexAreas(list), c.area);
  return hit ? list.find((d) => d.id === hit.districtId) ?? null : null;
}

/**
 * The Bosta district for a checkout address: its id, 'pick' when the customer must choose from the
 * list, or null when Bosta's list can't be reached (the order goes through; shipping resolves it later).
 */
export async function checkDistrict(governorate: string, area: string, districtId?: string): Promise<string | 'pick' | null> {
  let list: District[];
  try { list = await districtsFor(governorate); } catch { return null; }
  if (!list.length) return null;
  if (districtId && list.some((d) => d.id === districtId)) return districtId;
  const hit = exactArea(indexAreas(list), area);
  return hit ? hit.districtId : 'pick';
}

// ---------- shipments ----------

export interface DeliveryInput {
  niche: string;
  /** Our order number + seller, shows on the waybill and in Bosta's dashboard. */
  businessReference: string;
  /** Cash the courier collects for THIS shipment. */
  cod: number;
  /** Value of the goods in the box (for Bosta's insurance). */
  goodsValue: number;
  itemsCount: number;
  description: string;
  receiver: { name: string; phone: string };
  district: District;
  address: { line: string; landmark: string };
  /** Seller's pickup location under the store's Bosta account; empty = the account's default. */
  pickupLocationId?: string;
  allowOpenPackage: boolean;
  webhookUrl: string;
}

export interface DeliveryResult { deliveryId: string; tracking: string; state: number }

const splitName = (full: string): [string, string] => {
  const [first, ...rest] = full.trim().split(/\s+/);
  return [first || 'Customer', rest.join(' ')];
};

/** Bosta's create-delivery payload, the same fields the shop sends. */
export function deliveryPayload(i: DeliveryInput) {
  const [firstName, lastName] = splitName(i.receiver.name);
  const notes = [i.address.landmark && `علامة مميزة: ${i.address.landmark}`, i.allowOpenPackage ? 'يسمح بفتح الشحنة قبل الدفع' : ''].filter(Boolean).join(' · ');
  return {
    type: 10, // forward delivery
    specs: { packageType: 'Parcel', size: 'SMALL', packageDetails: { itemsCount: Math.max(1, i.itemsCount), description: i.description.slice(0, 500) } },
    goodsInfo: { amount: Math.round(i.goodsValue * 100) / 100 },
    ...(notes ? { notes: notes.slice(0, 500) } : {}),
    cod: Math.round(i.cod * 100) / 100,
    allowToOpenPackage: i.allowOpenPackage,
    dropOffAddress: {
      city: i.district.cityEn,
      districtId: i.district.id,
      ...(i.district.zoneId ? { zoneId: i.district.zoneId } : {}),
      firstLine: i.address.line.slice(0, 250),
      ...(i.address.landmark ? { secondLine: i.address.landmark.slice(0, 250) } : {}),
    },
    businessReference: i.businessReference,
    uniqueBusinessReference: i.businessReference,
    receiver: { firstName, ...(lastName ? { lastName } : {}), phone: i.receiver.phone },
    webhookUrl: i.webhookUrl,
    webhookCustomHeaders: { Authorization: `Bearer ${process.env.BOSTA_WEBHOOK_SECRET ?? ''}` },
    ...(i.pickupLocationId ? { businessLocationId: i.pickupLocationId } : {}),
  };
}

export async function createDelivery(input: DeliveryInput): Promise<DeliveryResult> {
  if (!bostaEnabled(input.niche)) {
    const n = Math.floor(10000000 + Math.random() * 89999999);
    return { deliveryId: `demo_${n}`, tracking: `DEMO${n}`, state: 10 };
  }
  if (input.cod < 0 || input.cod > COD_LIMIT) throw new BostaError(`Cash to collect must be between 0 and ${COD_LIMIT.toLocaleString('en-US')} EGP (Bosta limit).`);
  if (input.address.line.trim().length <= 5) throw new BostaError('The street address must be longer than 5 characters for Bosta.');
  const res = await request<{ data?: { _id?: string; trackingNumber?: string | number; state?: { code?: number } } }>('POST', '/deliveries?apiVersion=1', { niche: input.niche, body: deliveryPayload(input) });
  const d = res.data ?? {};
  if (!d.trackingNumber) throw new BostaError('Bosta did not return a tracking number.');
  return { deliveryId: String(d._id ?? d.trackingNumber), tracking: String(d.trackingNumber), state: Number(d.state?.code ?? 10) };
}

/** Latest state of one shipment (for the sync when a webhook was missed). */
export async function viewDelivery(niche: string, tracking: string): Promise<{ state: number; note: string }> {
  const res = await request<{ data?: { state?: { code?: number; exception?: { reason?: string } }; exceptionReason?: string } }>('GET', `/deliveries/business/${encodeURIComponent(tracking)}`, { niche });
  const d = res.data ?? {};
  return { state: Number(d.state?.code ?? 0), note: String(d.state?.exception?.reason ?? d.exceptionReason ?? '') };
}

/** Waybill PDF as base64, or null (demo mode or Bosta had none). A6 label, Arabic. */
export async function getWaybillPdf(niche: string, tracking: string): Promise<string | null> {
  if (!bostaEnabled(niche)) return null;
  const res = await request<{ data?: unknown; message?: string }>('POST', '/deliveries/mass-awb', { niche, body: { trackingNumbers: tracking, requestedAwbType: 'A6', lang: 'ar' } });
  const d = res.data as string | { file?: string; data?: string } | undefined;
  const b64 = typeof d === 'string' ? d : d?.file ?? d?.data ?? '';
  return b64 && Buffer.from(b64, 'base64').subarray(0, 4).toString() === '%PDF' ? b64 : null;
}

// ---------- states ----------

/** Bosta state codes (docs: "Get Shipment Status via Webhook"), same table as the shop. */
export const BOSTA_STATES: Record<number, string> = {
  10: 'Pickup requested', 11: 'Waiting for route', 20: 'Route assigned', 21: 'Picked up from business',
  22: 'Picking up from consignee', 23: 'Picked up from consignee', 24: 'Received at warehouse', 25: 'Fulfilled',
  30: 'In transit between hubs', 40: 'Picking up', 41: 'Out for delivery', 45: 'Delivered',
  46: 'Returned to business', 47: 'Exception', 48: 'Terminated', 49: 'Canceled', 60: 'Returned to stock',
  100: 'Lost', 101: 'Damaged', 102: 'Investigation', 103: 'Awaiting your action', 104: 'Archived', 105: 'On hold',
};
export const stateLabel = (code?: number) => (code === undefined ? '' : BOSTA_STATES[code] ?? `State ${code}`);

/** Bosta state code → our shipment status. Archived (104) and unknown codes change nothing. */
export const STATE_CODES: Record<number, Shipment['status']> = {
  10: 'created', 11: 'created', 20: 'created', 40: 'created',
  21: 'picked',
  22: 'in_transit', 23: 'in_transit', 24: 'in_transit', 25: 'in_transit', 30: 'in_transit', 41: 'in_transit',
  45: 'delivered',
  46: 'returned', 60: 'returned',
  47: 'exception', 100: 'exception', 101: 'exception', 102: 'exception', 103: 'exception', 105: 'exception',
  48: 'cancelled', 49: 'cancelled',
};
/** States after which Bosta won't move the shipment again. */
export const FINAL_STATES = [45, 46, 48, 49, 60, 104];

export interface TrackingUpdate { tracking: string; status: Shipment['status']; state: number; note: string }

export function parseWebhook(body: unknown): TrackingUpdate | null {
  const b = body as { trackingNumber?: string | number; state?: number | { code?: number }; exceptionReason?: string; numberOfAttempts?: number } | null;
  const code = typeof b?.state === 'number' ? b.state : b?.state?.code;
  if (!b?.trackingNumber || code === undefined) return null;
  const status = STATE_CODES[code];
  if (!status) return null;
  let note = String(b.exceptionReason ?? '');
  if (b.numberOfAttempts) note = `${note} (attempt ${Number(b.numberOfAttempts)})`.trim();
  return { tracking: String(b.trackingNumber), status, state: code, note: note.slice(0, 300) };
}

/** Bosta sends back the header we set on each shipment ("Bearer <secret>"); a bare secret works too. */
export function webhookAuthorized(header: string | null, secret = process.env.BOSTA_WEBHOOK_SECRET ?? ''): boolean {
  if (!secret || !header) return false;
  const got = header.startsWith('Bearer ') ? header.slice(7) : header;
  if (got.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}

export const trackingLink = (tracking: string) => `https://bosta.co/en-eg/tracking-shipments?shipment-number=${encodeURIComponent(tracking)}`;
