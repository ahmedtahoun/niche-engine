// Bosta client. With BOSTA_API_KEY unset it returns demo tracking numbers so the
// whole flow can run locally.
//
// VERIFY BEFORE GOING LIVE: the endpoint paths, payload fields and state codes
// below follow Bosta's public v2 API as we understand it. Confirm each one against
// the API docs in your Bosta business dashboard (and with your account manager for
// multiple pickup locations). Everything Bosta-specific is in this one file.

import type { Shipment } from './orders.ts';

const BASE = () => (process.env.BOSTA_API_BASE ?? 'https://app.bosta.co/api/v2').replace(/\/$/, '');
export const bostaEnabled = () => Boolean(process.env.BOSTA_API_KEY);

export interface DeliveryInput {
  businessReference: string;   // our order id + seller, shows on the waybill
  cod: number;                 // cash the courier collects for THIS shipment
  itemsCount: number;
  description: string;         // short contents line
  receiver: { name: string; phone: string };
  address: { governorate: string; area: string; line: string; landmark: string };
  pickupLocationId?: string;   // seller's pickup location under the platform account
  allowOpenPackage: boolean;
}

export interface DeliveryResult { deliveryId: string; tracking: string }

export async function createDelivery(input: DeliveryInput): Promise<DeliveryResult> {
  if (!bostaEnabled()) {
    const n = Math.floor(10000000 + Math.random() * 89999999);
    return { deliveryId: `demo_${n}`, tracking: `DEMO${n}` };
  }
  const [firstName, ...rest] = input.receiver.name.trim().split(/\s+/);
  const body = {
    type: 10, // SEND (forward delivery) — VERIFY
    specs: { packageType: 'Parcel', packageDetails: { itemsCount: input.itemsCount, description: input.description } },
    notes: [input.address.landmark && `علامة مميزة: ${input.address.landmark}`, input.allowOpenPackage ? 'يسمح بفتح الشحنة قبل الدفع' : ''].filter(Boolean).join(' · '),
    cod: Math.round(input.cod),
    allowToOpenPackage: input.allowOpenPackage, // VERIFY field name
    dropOffAddress: { city: input.address.governorate, firstLine: input.address.line, secondLine: input.address.area },
    receiver: { firstName, lastName: rest.join(' ') || '-', phone: input.receiver.phone },
    businessReference: input.businessReference,
    ...(input.pickupLocationId ? { pickupAddress: { _id: input.pickupLocationId } } : {}), // VERIFY
  };
  const res = await fetch(`${BASE()}/deliveries`, { method: 'POST', headers: { Authorization: process.env.BOSTA_API_KEY!, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as { data?: { _id?: string; trackingNumber?: string | number }; message?: string };
  if (!res.ok || !json.data?.trackingNumber) throw new Error(`bosta create delivery failed (${res.status}): ${json.message ?? 'no tracking number'}`);
  return { deliveryId: String(json.data._id ?? json.data.trackingNumber), tracking: String(json.data.trackingNumber) };
}

/** Waybill PDF as base64, or null (demo mode or not available yet). */
export async function getWaybillPdf(tracking: string): Promise<string | null> {
  if (!bostaEnabled()) return null;
  const res = await fetch(`${BASE()}/deliveries/mass-awb?trackingNumbers=${encodeURIComponent(tracking)}`, { headers: { Authorization: process.env.BOSTA_API_KEY! } }); // VERIFY
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as { data?: string };
  return typeof json.data === 'string' ? json.data : null;
}

/** Bosta state code → our shipment status. VERIFY the codes in the Bosta docs. */
export const STATE_CODES: Record<number, Shipment['status']> = {
  10: 'created', 11: 'created', 20: 'created',
  21: 'picked', 24: 'in_transit', 30: 'in_transit', 41: 'in_transit',
  45: 'delivered',
  46: 'returned', 60: 'returned',
  47: 'exception', 100: 'exception',
  48: 'cancelled', 49: 'cancelled',
};

export function parseWebhook(body: unknown): { tracking: string; status: Shipment['status'] } | null {
  const b = body as { trackingNumber?: string | number; state?: number | { code?: number } };
  const code = typeof b?.state === 'number' ? b.state : b?.state?.code;
  if (!b?.trackingNumber || code === undefined) return null;
  const status = STATE_CODES[code];
  return status ? { tracking: String(b.trackingNumber), status } : null;
}
