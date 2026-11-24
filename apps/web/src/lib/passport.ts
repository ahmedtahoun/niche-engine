// Coffee Passport (جواز سفر القهوة): one stamp per origin country a customer has ordered.
// Worked out from their orders, so there is nothing extra to store:
//  - a free welcome stamp ("Cairo") for everyone, so the collection is already started
//  - a country is "coming" while its order is on the way, and "stamped" once delivered
//  - Explorer: stamps for every country on sale (or `goal`) from delivered orders, spread over at least
//    `minOrders` orders; earns wallet credit once per phone (granted on delivery, see rewardPassport)
// A signed share link (/passport/<token>) shows the first name and stamps only, never the phone.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import type { NicheConfig } from '@niche-engine/core';
import { orderAlerts } from '../bot/alerts.ts';
import type { Outgoing } from '../bot/types.ts';
import { catalog, type Catalog } from './catalog.ts';
import { getNiche } from './niches.ts';
import type { Order } from './orders.ts';
import { store } from './store/index.ts';
import type { Product } from './types.ts';
import { adjust, entriesOf } from './wallet.ts';

export const REWARD_NOTE = 'passport:explorer';

export interface Country { ar: string; en: string; flag: string; products: Product[] }
export interface Stamp { country: Country; state: 'stamped' | 'coming' | 'empty'; at?: string; orderId?: number }
export interface Passport {
  welcome: { ar: string; en: string; at?: string };
  stamps: Stamp[];
  stamped: number;
  coming: number;
  goal: number;
  explorer: boolean;
  /** Delivered orders still needed when every country is stamped but from too few orders. */
  ordersShort: number;
  rewardEgp: number;
  rewarded: boolean;
  firstName: string;
}

/** The origin country of a coffee ("إثيوبيا · ليمو" → إثيوبيا), or null for blends. */
export function originOf(p: Product, cfg: NicheConfig): { ar: string; en: string } | null {
  const j = cfg.journey;
  if (!j) return null;
  const ar = p.attributes[j.originKey]?.split('·')[0].trim();
  if (!ar) return null;
  const en = p.en?.attributes?.[j.originKeyEn]?.split('·')[0].trim() || ar;
  return { ar, en };
}

const flagOf = (cfg: NicheConfig, name: string) => Object.entries(cfg.facts?.find((f) => f.key === cfg.journey?.originKey)?.emojiBy ?? {}).find(([w]) => name.includes(w))?.[1] ?? '🌍';

/** Every country on sale in this store, in catalog order (best sellers first). */
export function countriesOf(cfg: NicheConfig, cat: Catalog): Country[] {
  const m = new Map<string, Country>();
  for (const p of cat.search(cfg, { sort: 'best' })) {
    const o = originOf(p, cfg);
    if (!o) continue;
    const c = m.get(o.ar) ?? { ...o, flag: flagOf(cfg, `${o.ar} ${o.en}`), products: [] };
    c.products.push(p);
    m.set(o.ar, c);
  }
  return [...m.values()];
}

/** The passport for one phone, from its orders (cancelled and refused orders never stamp). */
export async function passportOf(phone: string, niche: string): Promise<Passport | null> {
  const cfg = getNiche(niche);
  if (!cfg?.passport) return null;
  const cat = await catalog();
  const countries = countriesOf(cfg, cat);
  const orders = (await store().listOrders({ phone, niche, limit: 500 }))
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refused')
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const byId = new Map(cat.products.map((p) => [p.id, p]));
  const stamps: Stamp[] = countries.map((country) => ({ country, state: 'empty' }));
  const stampOrders = new Set<number>();
  for (const o of orders) {
    for (const item of o.items) {
      const p = byId.get(item.productId);
      const origin = p && originOf(p, cfg);
      const st = origin && stamps.find((x) => x.country.ar === origin.ar);
      if (!st) continue;
      if (o.status === 'delivered') {
        if (st.state !== 'stamped') Object.assign(st, { state: 'stamped', at: o.createdAt, orderId: o.id });
        stampOrders.add(o.id);
      } else if (st.state === 'empty') Object.assign(st, { state: 'coming', at: o.createdAt, orderId: o.id });
    }
  }
  const goal = Math.max(1, Math.min(cfg.passport.goal ?? countries.length, countries.length || 1));
  const stamped = stamps.filter((x) => x.state === 'stamped').length;
  const ordersShort = Math.max(0, (cfg.passport.minOrders ?? 1) - stampOrders.size);
  const rewarded = (await entriesOf(phone, niche)).some((e) => e.kind === 'adjust' && e.note === REWARD_NOTE);
  // Stamped countries first (in the order they were collected), then on the way, then still to find.
  const rank = { stamped: 0, coming: 1, empty: 2 } as const;
  stamps.sort((a, b) => rank[a.state] - rank[b.state] || (a.at ?? '').localeCompare(b.at ?? ''));
  return {
    welcome: { ar: cfg.passport.welcome.ar, en: cfg.passport.welcome.en ?? cfg.passport.welcome.ar, at: orders[0]?.createdAt },
    stamps, stamped, coming: stamps.filter((x) => x.state === 'coming').length, goal,
    explorer: stamped >= goal && ordersShort === 0,
    ordersShort, rewardEgp: cfg.passport.rewardEgp, rewarded,
    firstName: (orders.at(-1)?.customer.name ?? '').trim().split(/\s+/)[0] ?? '',
  };
}

/**
 * On delivery: if this order completes the passport, give the Explorer credit (once per phone)
 * and tell the order team so someone can congratulate them on WhatsApp.
 */
export async function rewardPassport(o: Order): Promise<Outgoing[]> {
  const cfg = getNiche(o.niche);
  if (!cfg?.passport) return [];
  const pp = await passportOf(o.customer.phone, o.niche);
  if (!pp?.explorer || pp.rewarded) return [];
  const r = await adjust(o.customer.phone, o.niche, pp.rewardEgp, REWARD_NOTE);
  if (r !== 'ok') return [];
  return orderAlerts(o.niche, [`🛂🎉 ${o.customer.name} كمّل جواز سفر القهوة (${pp.stamped} بلاد) في ${cfg.brand.nameAr}\nاتضافله ${pp.rewardEgp} ج في المحفظة. ابعتله تهنئة على واتساب: ${o.customer.phone}`]);
}

// ---------- share link: /passport/<token> (first name and stamps only) ----------
const key = () => createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev-only-secret'}:passport`).digest();

/** An opaque token for one phone's passport (AES-GCM: the phone cannot be read out of it). */
export function passportToken(niche: string, phone: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([c.update(`${niche}|${phone}`, 'utf8'), c.final()]);
  return Buffer.concat([iv, body, c.getAuthTag()]).toString('base64url');
}

export function readPassportToken(token: string): { niche: string; phone: string } | null {
  try {
    const b = Buffer.from(token, 'base64url');
    if (b.length < 30 || b.length > 120) return null;
    const d = createDecipheriv('aes-256-gcm', key(), b.subarray(0, 12));
    d.setAuthTag(b.subarray(b.length - 16));
    const [niche, phone] = Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8').split('|');
    return niche && /^01\d{9}$/.test(phone ?? '') ? { niche, phone } : null;
  } catch {
    return null;
  }
}
