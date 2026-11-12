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
  nameEn?: string;
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

/** One option a product's variants vary by (e.g. roast, weight). Labels shown to customers. */
export interface OptionAxis {
  id: string;
  labelAr: string;
  labelEn?: string;
  /** English names of this axis's values, e.g. { "250 جم": "250 g" }. */
  valuesEn?: Record<string, string>;
}

/** Text in both store languages (English falls back to Arabic when missing). */
export interface Bilingual {
  ar: string;
  en?: string;
}

/**
 * A choice made per order that is not stocked (e.g. the grind: the seller
 * grinds after the order). Applies to products in the listed categories.
 */
export interface Choice {
  id: string;
  labelAr: string;
  labelEn?: string;
  categories: string[];
  values: { id: string; labelAr: string; labelEn?: string; hintAr?: string; hintEn?: string; emoji?: string }[];
}

/** Fresh products: a date attribute, and how old a product may get before it is hidden. */
export interface Freshness {
  /** Attribute holding the date (YYYY-MM-DD), e.g. "roast_date". Without it the product is made to order. */
  attribute: string;
  maxAgeDays: number;
  /** Line shown when the product is made after the order. */
  madeToOrderAr: string;
  madeToOrderEn?: string;
}

export interface NicheConfig {
  id: string;
  status: 'draft' | 'live';
  brand: {
    nameAr: string;
    nameEn: string;
    domain: string;
    palette: { base: string; primary: string; accent: string };
    /** Header mark and browser icon, paths under the site's public folder (e.g. /brands/coffee/mark.svg). */
    logo?: string;
    icon?: string;
    /** Short line next to the name in the header. */
    tagline?: Bilingual;
    /** 1200 × 630 social card (path under the site's public folder). */
    ogImage?: string;
    /** One-paragraph description for search engines and AI answers. */
    description?: Bilingual;
    /** Round stamp on product photos, e.g. "Cairo Roast pick" (drawn with the logo). */
    pickSeal?: Bilingual;
  };
  categories: { id: string; labelAr: string; labelEn?: string }[];
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
  /** Option axes for products whose variants carry `opts` (in display order). */
  optionAxes?: OptionAxis[];
  /** Per-order choices that are not stocked. */
  choices?: Choice[];
  freshness?: Freshness;
  /** false = the seller bot doesn't offer this niche to new applicants (sellers are added by the team). */
  acceptsSellers?: boolean;
  /** Arabic voice: "f" speaks to women (اختاري), default speaks to everyone (اختار). */
  voice?: 'f' | 'm';
  /** Photo hero at the top of the home page (otherwise the first bundle is the hero). */
  hero?: { title: Bilingual; subtitle: Bilingual; cta: Bilingual; badges?: Bilingual[]; images: string[] };
  /** "How it works" steps on the home page, each with an emoji. */
  steps?: (Bilingual & { emoji: string; text: Bilingual })[];
  /** Emoji shown before tasting notes that contain a word (Arabic or English), e.g. { "شوكولاتة": "🍫" }. */
  noteEmoji?: Record<string, string>;
  /** Short trust promises shown on the home page (only true ones). */
  trust?: (Bilingual & { icon?: 'seal' | 'cash' | 'truck' | 'return' | 'star' })[];
  /** Small text on the home page: above the hero, and the products heading. */
  homeEyebrow?: Bilingual;
  homeSection?: Bilingual;
  /** Taste families customers shop by (coffee: "chocolate and nuts", "fruity"...). Products point to one. */
  tasteFamilies?: { id: string; labelAr: string; labelEn?: string; hintAr?: string; hintEn?: string; emoji?: string; /** Choice value ids this family tastes best in (coffee: brew methods). */ bestIn?: string[] }[];
  /** Product attributes shown as icon tiles under the title (key = the Arabic attribute name). emojiBy picks an emoji from the value, e.g. a flag per country. */
  facts?: { key: string; keyEn: string; emoji: string; emojiBy?: Record<string, string> }[];
  /** 1–5 scales drawn on product pages (coffee: body, acidity), with the words at each end. */
  profileScales?: { id: string; labelAr: string; labelEn?: string; lowAr: string; highAr: string; lowEn?: string; highEn?: string }[];
  /** Short questions and answers on the home page (also FAQPage data for search engines and AI answers). {shipping}, {deposit} and {depositAbove} become the fees from this config. */
  homeFaq?: { q: Bilingual; a: Bilingual }[];
  /** Shown on the empty search page. English terms should map to catalog words through searchSynonyms. */
  popularSearches?: { ar: string[]; en?: string[] };
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
  const cats = new Set((c.categories ?? []).map((x) => x.id));
  const axisIds = (c.optionAxes ?? []).map((a) => a.id);
  if (new Set(axisIds).size !== axisIds.length) p.push('optionAxes ids must be unique');
  for (const ch of c.choices ?? []) {
    if (!ch.id || !ch.labelAr) p.push('every choice needs id and labelAr');
    if (!ch.values?.length) p.push(`choice ${ch.id}: needs at least one value`);
    const ids = (ch.values ?? []).map((v) => v.id);
    if (new Set(ids).size !== ids.length) p.push(`choice ${ch.id}: value ids must be unique`);
    for (const k of ch.categories ?? []) if (!cats.has(k)) p.push(`choice ${ch.id}: unknown category ${k}`);
    if (axisIds.includes(ch.id)) p.push(`choice ${ch.id}: same id as an option axis`);
  }
  if (c.freshness && !(c.freshness.maxAgeDays > 0 && c.freshness.attribute && c.freshness.madeToOrderAr)) p.push('freshness needs attribute, maxAgeDays > 0 and madeToOrderAr');
  return p;
}
