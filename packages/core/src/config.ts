// Niche configuration: everything that differs between niches lives here.
// A new niche = a new JSON file in /niches that satisfies NicheConfig.

export type CustomerType = 'new' | 'repeat' | 'referral';

export interface CommissionRates {
  /** First order from a customer the platform acquired. */
  new: number;
  /** Repeat order from a customer who already ordered through the platform. */
  repeat: number;
  /** Customer the seller sent with their own code. */
  referral: number;
}

export interface BundlePart {
  /** Product slug in this niche. */
  product: string;
  qty: number;
  /** Fixed variant (e.g. "one"), or null when the customer picks it. */
  variant: string | null;
}

export interface Bundle {
  id: string;
  nameAr: string;
  parts: BundlePart[];
  /** Discount in EGP, funded by the platform out of its commission. */
  discountEgp: number;
}

export interface Promo {
  code: string;
  kind: 'percent' | 'fixed' | 'free_shipping';
  /** Fraction for percent (0.10 = 10%), EGP for fixed, ignored for free_shipping. */
  value: number;
  fundedBy: 'platform' | 'seller';
  firstOrderOnly: boolean;
  minOrderEgp: number;
}

export interface NicheConfig {
  id: string;
  status: 'draft' | 'live';
  brand: {
    nameAr: string;
    nameEn: string;
    domain: string;
    palette: { base: string; primary: string; accent: string };
  };
  categories: { id: string; labelAr: string }[];
  attributes: {
    /** The seller bot refuses to publish a product without these. */
    required: string[];
    optional: string[];
  };
  commission: CommissionRates;
  reserve: { percent: number; days: number };
  shippingEgp: number;
  risk: {
    depositAboveEgp: number;
    /** Deposit amount; we use the shipping fee only. */
    depositEgp: number;
    requireWhatsappConfirm: boolean;
    openBeforePay: boolean;
  };
  wallet: { cashback: number; expiresDays: number };
  priceCheckDays: number;
  /** Words customers type → the word our catalog uses (already normalized Arabic). */
  searchSynonyms: Record<string, string>;
  bundles: Bundle[];
  promos: Promo[];
  partners: string[];
  /** Human description of the reorder trigger, implemented per niche in the messaging service. */
  reorderTrigger: string;
}

const isFraction = (n: unknown) => typeof n === 'number' && n >= 0 && n < 1;

/** Returns a list of problems; empty means the config is valid. */
export function validateNiche(c: NicheConfig): string[] {
  const p: string[] = [];
  if (!/^[a-z][a-z0-9-]*$/.test(c.id ?? '')) p.push('id must be lowercase letters, digits or dashes');
  if (!c.brand?.nameAr || !c.brand?.nameEn) p.push('brand needs nameAr and nameEn');
  if (!c.categories?.length) p.push('at least one category');
  if (!c.attributes?.required?.length) p.push('at least one required attribute');
  for (const k of ['new', 'repeat', 'referral'] as const) {
    if (!isFraction(c.commission?.[k])) p.push(`commission.${k} must be a fraction between 0 and 1`);
  }
  if (c.commission && !(c.commission.new >= c.commission.repeat && c.commission.repeat >= c.commission.referral)) {
    p.push('commission must satisfy new >= repeat >= referral (keeps poaching unprofitable)');
  }
  if (!isFraction(c.reserve?.percent)) p.push('reserve.percent must be a fraction');
  if (!(c.shippingEgp > 0)) p.push('shippingEgp must be positive');
  if (!isFraction(c.wallet?.cashback)) p.push('wallet.cashback must be a fraction');
  if (!c.bundles?.length) p.push('every niche needs at least one multi-seller hero bundle');
  for (const pr of c.promos ?? []) {
    if (pr.kind === 'percent' && !isFraction(pr.value)) p.push(`promo ${pr.code}: percent value must be a fraction`);
  }
  return p;
}
