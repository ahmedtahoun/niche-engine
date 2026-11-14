// Catalog reads + server-side pricing.
//
// Sellers and products are read from the database through a short cache (60 s):
// pages stay fast (the database is a round trip away), and a change made by
// another process shows up within a minute. This process's own writes show at once.
// Writes go straight to the database and clear this process's cache.
import { cartTotals, matches, searchTerms, type Bundle, type Choice, type NicheConfig } from '@niche-engine/core';
import { speak, voiceOf, type Lang } from './i18n.ts';
import { getNiche } from './niches.ts';
import { store } from './store/index.ts';
import type { CartLine, OrderItem, PricedLine, Product, Quote, Seller } from './types.ts';

export type SortKey = 'best' | 'low' | 'high' | 'rating';
export type PriceBand = 'all' | 'lt300' | 'mid' | 'gt900';
const BANDS: Record<PriceBand, [number, number]> = { all: [0, Infinity], lt300: [0, 299], mid: [300, 900], gt900: [901, Infinity] };

export interface BundleView {
  bundle: Bundle;
  parts: { product: Product; qty: number; variant: string | null }[];
  fullPrice: number;
  price: number;
  pickVariantsFrom: Product | null;
}

/** Bundle configs may say "one" for single-size parts; map to the product's real label. */
export function resolveVariant(p: Product, wanted: string): string {
  if (p.variants.some((v) => v.label === wanted)) return wanted;
  return p.variants.length === 1 ? p.variants[0].label : wanted;
}

/** Price of one option of a product (options may cost more, e.g. a bigger bag). */
export const priceOf = (p: Product, label: string) => p.variants.find((v) => v.label === label)?.price ?? p.price;

/** Grams in an option label like "250 جم", "1 كجم", "250 g" or "1 kg" (null when it isn't a weight). */
export function gramsOf(label: string): number | null {
  const m = label.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).match(/(\d+(?:\.\d+)?)\s*(كجم|كيلو|kg|جم|جرام|g)/i);
  if (!m) return null;
  return Number(m[1]) * (/كجم|كيلو|kg/i.test(m[2]) ? 1000 : 1);
}

/** Best price per 100 g across a product's weights (null for products sold by size, not weight). */
export function bestPer100g(p: Product): number | null {
  // Sizes on sale only: a sold-out big bag must not make the price look lower than anything you can buy.
  const per = p.variants.filter((v) => v.stock > 0).flatMap((v) => { const g = gramsOf(v.opts?.weight ?? v.label); return g ? [((v.price ?? p.price) / g) * 100] : []; });
  return per.length ? Math.min(...per) : null;
}

/** Wholesale cost of one option, if the product has one (private). */
const costOf = (p: Product, label: string) => p.cost?.[label];

/** A quote safe to send to the browser: wholesale costs removed. */
export const publicQuote = (q: Quote): Quote => ({ ...q, items: q.items.map(({ unitCost: _c, ...i }) => i) });

/** Nothing left to sell: every option (or the product itself) is at 0 stock. */
export const isSoldOut = (p: Product) => p.variants.length > 0 && p.variants.every((v) => v.stock <= 0);

/**
 * "You might also like" on a product page: other products in stock, same taste family first,
 * then same category, then the rest, keeping the order given (best sellers first).
 */
export function similarTo(p: Product, all: Product[], n = 4): Product[] {
  const score = (x: Product) => (p.profile?.family && x.profile?.family === p.profile.family ? 2 : 0) + (x.category === p.category ? 1 : 0);
  return all.filter((x) => x.id !== p.id && !isSoldOut(x)).map((x, i) => ({ x, i, s: score(x) })).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, n).map((e) => e.x);
}

/** Lowest and highest option price (cards say "من" when they differ). */
export function priceRange(p: Product): { min: number; max: number } {
  const all = p.variants.length ? p.variants.map((v) => v.price ?? p.price) : [p.price];
  return { min: Math.min(...all), max: Math.max(...all) };
}

/** Sale display: the cheapest option's "before" price (for "from 225 ~~300~~") and the biggest discount in %. */
export function saleOf(p: Product): { compareMin?: number; off: number } {
  const priced = p.variants.map((v) => ({ price: v.price ?? p.price, before: v.compareAt }));
  const min = Math.min(...priced.map((x) => x.price));
  const cheapest = priced.find((x) => x.price === min && x.before && x.before > x.price);
  const off = Math.max(0, ...priced.filter((x) => x.before && x.before > x.price).map((x) => Math.round((1 - x.price / x.before!) * 100)));
  return { ...(cheapest ? { compareMin: cheapest.before } : {}), off };
}

/** Per-order choices (e.g. the grind) that apply to this product, with only the values on offer. */
export const choicesFor = (cfg: NicheConfig, p: Product): Choice[] =>
  (cfg.choices ?? []).filter((c) => c.categories.includes(p.category)).map((c) => (c.values.some((v) => v.hidden) ? { ...c, values: c.values.filter((v) => !v.hidden) } : c));

/**
 * A line's choice values for a product, or null if one is missing or not on offer.
 * A choice with a single value on offer (whole beans only) uses it, so an older cart that
 * still says "kanaka" becomes whole beans instead of breaking.
 */
export function resolveChoices(cfg: NicheConfig, p: Product, picked: Record<string, string> | undefined): Choice['values'] | null {
  const out: Choice['values'] = [];
  for (const c of choicesFor(cfg, p)) {
    const v = c.values.find((x) => x.id === picked?.[c.id]) ?? (c.values.length === 1 ? c.values[0] : undefined);
    if (!v) return null;
    out.push(v);
  }
  return out;
}

/** Checks a line's choices for a product; returns the labels to print on the order, or null if one is missing or unknown. */
export function choiceLabels(cfg: NicheConfig, p: Product, picked: Record<string, string> | undefined): string[] | null {
  return resolveChoices(cfg, p, picked)?.map((v) => v.labelAr) ?? null;
}

const DAY = 864e5;

/** How fresh a product is, for niches with a freshness rule. */
export function freshnessOf(cfg: NicheConfig, p: Product, now = Date.now()): { kind: 'to_order'; text: string } | { kind: 'dated'; days: number; stale: boolean } | null {
  const f = cfg.freshness;
  if (!f) return null;
  const raw = p.attributes[f.attribute];
  const at = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? Date.parse(raw) : NaN;
  if (Number.isNaN(at)) return { kind: 'to_order', text: f.madeToOrderAr };
  const days = Math.max(0, Math.floor((now - at) / DAY));
  return { kind: 'dated', days, stale: days > f.maxAgeDays };
}

/** A snapshot of sellers and products. Treat it as read-only: copy before editing. */
export class Catalog {
  readonly sellers: Seller[];
  readonly products: Product[];
  private sellerMap: Map<string, Seller>;
  constructor(sellers: Seller[], products: Product[]) {
    this.sellers = sellers;
    this.products = products;
    this.sellerMap = new Map(sellers.map((s) => [s.id, s]));
  }

  sellerById = (id: string) => this.sellerMap.get(id) ?? null;
  sellerByChat = (chatId: number) => this.sellers.find((s) => s.telegramChatId === chatId) ?? null;
  sellerOf = (p: Product): Seller => this.sellerMap.get(p.sellerId)!;
  productById = (id: string) => this.products.find((p) => p.id === id) ?? null;

  private visible = (p: Product) => {
    if ((p.status ?? 'live') !== 'live' || !['active', 'warning'].includes(this.sellerById(p.sellerId)?.status ?? '')) return false;
    // A dated fresh product (e.g. coffee by roast date) is hidden once it is too old.
    const cfg = getNiche(p.niche);
    const f = cfg && freshnessOf(cfg, p);
    return !(f && f.kind === 'dated' && f.stale);
  };

  productsOf(niche: string): Product[] {
    return this.products.filter((p) => p.niche === niche && this.visible(p));
  }

  productBySlug(niche: string, slug: string): Product | null {
    return this.productsOf(niche).find((p) => p.slug === slug) ?? null;
  }

  search(cfg: NicheConfig, opts: { q?: string; cat?: string; sort?: SortKey; price?: PriceBand; family?: string }): Product[] {
    const terms = searchTerms(opts.q ?? '', cfg.searchSynonyms);
    const label = (c: string) => cfg.categories.find((x) => x.id === c)?.labelAr ?? '';
    const [lo, hi] = BANDS[opts.price ?? 'all'];
    const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
      best: (a, b) => b.views - a.views,
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
      rating: (a, b) => this.sellerOf(b).rating - this.sellerOf(a).rating,
    };
    return this.productsOf(cfg.id)
      .filter((p) => !opts.cat || p.category === opts.cat)
      .filter((p) => !opts.family || p.profile?.family === opts.family)
      .filter((p) => p.price >= lo && p.price <= hi)
      .filter((p) => !terms.length || matches([p.nameAr, p.leadAr, label(p.category), this.sellerOf(p).name, ...Object.values(p.attributes), ...(p.profile?.notes ?? []), ...(p.profile?.notesEn ?? []), p.en?.name ?? '', p.en?.lead ?? '', this.sellerOf(p).nameEn ?? ''].join(' '), terms))
      // Sold-out products go last, whatever the sort.
      .sort((a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)) || sorters[opts.sort ?? 'best'](a, b));
  }

  /** Problems with a niche's bundles against the live catalog (tests and the admin panel). */
  bundleProblems(cfg: NicheConfig): string[] {
    const out: string[] = [];
    for (const b of cfg.bundles) for (const pt of b.parts) {
      const p = this.productBySlug(cfg.id, pt.product);
      if (!p) out.push(`${b.id}: product ${pt.product} not in catalog`);
      else if (pt.variant !== null && !p.variants.some((v) => v.label === resolveVariant(p, pt.variant!))) out.push(`${b.id}: ${pt.product} has no variant ${pt.variant}`);
    }
    return out;
  }

  bundleView(cfg: NicheConfig, id: string): BundleView | null {
    const bundle = cfg.bundles.find((b) => b.id === id);
    if (!bundle) return null;
    const parts = bundle.parts.map((pt) => ({ product: this.productBySlug(cfg.id, pt.product), qty: pt.qty, variant: pt.variant }));
    if (parts.some((pt) => !pt.product)) return null;
    const full = parts.reduce((a, pt) => a + (pt.variant === null ? pt.product!.price : priceOf(pt.product!, resolveVariant(pt.product!, pt.variant))) * pt.qty, 0);
    const pick = parts.find((pt) => pt.variant === null)?.product ?? null;
    return { bundle, parts: parts as BundleView['parts'], fullPrice: full, price: full - bundle.discountEgp, pickVariantsFrom: pick };
  }

  /** Prices a cart from the catalog. The browser's prices are never used. */
  quote(cfg: NicheConfig, cart: CartLine[], opts: { promoCode?: string; isFirstOrder: boolean; walletBalance: number; useWallet: boolean; lang?: Lang }): Quote {
    const sp = speak(opts.lang ?? 'ar', voiceOf(cfg));
    const shownChoices = (p: Product, picked?: Record<string, string>) => (resolveChoices(cfg, p, picked) ?? []).map((v) => sp.choiceValue(v));
    const problems: string[] = [];
    const priced: PricedLine[] = [];
    const items: OrderItem[] = [];
    const coreLines: { sellerId: string; unitPrice: number; qty: number; unitCost?: number; inBundle?: boolean }[] = [];
    let bundleDiscount = 0;

    cart.slice(0, 20).forEach((line, i) => {
      const qty = Math.max(1, Math.min(5, Math.floor(line.qty) || 1));
      if (line.kind === 'item') {
        const p = this.productBySlug(cfg.id, line.slug);
        const variant = p?.variants.find((x) => x.label === line.variant);
        if (!p || !variant) return void problems.push(`item_unavailable:${line.slug}`);
        const extra = choiceLabels(cfg, p, line.choice);
        if (!extra) return void problems.push(`choice_missing:${line.slug}`);
        if (variant.stock < qty) problems.push(`low_stock:${line.slug}:${variant.label}`);
        const unit = variant.price ?? p.price;
        const label = [line.variant, ...extra].join(' · ');
        coreLines.push({ sellerId: p.sellerId, unitPrice: unit, qty, ...(costOf(p, line.variant) !== undefined ? { unitCost: costOf(p, line.variant) } : {}) });
        items.push({ sellerId: p.sellerId, productId: p.id, name: p.nameAr, variant: label, qty, unitPrice: unit, ...(costOf(p, line.variant) !== undefined ? { unitCost: costOf(p, line.variant) } : {}) });
        priced.push({ key: `${i}`, title: [sp.product(p), sp.variant(p, line.variant), ...shownChoices(p, line.choice)].join(' · '), by: this.sellerOf(p) ? sp.seller(this.sellerOf(p)) : '', art: p.art, color: p.color, qty, amount: unit * qty, isBundle: false, ...(p.images?.[0] ? { image: p.images[0] } : {}), ...(variant.stock < qty ? { left: Math.max(0, variant.stock) } : {}) });
      } else {
        const bv = this.bundleView(cfg, line.id);
        if (!bv) return void problems.push(`bundle_unavailable:${line.id}`);
        const rows: OrderItem[] = [];
        for (const pt of bv.parts) {
          const label = resolveVariant(pt.product, pt.variant ?? line.variant);
          const extra = choiceLabels(cfg, pt.product, line.choice);
          if (!extra) return void problems.push(`choice_missing:${line.id}`);
          rows.push({ sellerId: pt.product.sellerId, productId: pt.product.id, name: pt.product.nameAr, variant: [label, ...extra].join(' · '), qty: pt.qty * qty, unitPrice: priceOf(pt.product, label), ...(costOf(pt.product, label) !== undefined ? { unitCost: costOf(pt.product, label) } : {}) });
        }
        for (const r of rows) {
          coreLines.push({ sellerId: r.sellerId, unitPrice: r.unitPrice, qty: r.qty, inBundle: true, ...(r.unitCost !== undefined ? { unitCost: r.unitCost } : {}) });
          items.push(r);
        }
        const full = rows.reduce((a, r) => a + r.unitPrice * r.qty, 0);
        const picked = shownChoices(bv.parts[0].product, line.choice);
        bundleDiscount += bv.bundle.discountEgp * qty;
        priced.push({ key: `${i}`, title: [sp.bundle(bv.bundle), line.variant, ...picked].filter(Boolean).join(' · '), by: ((n) => (n === 1 ? sp.t('by', { name: sp.seller(this.sellerOf(bv.parts[0].product)) }) : sp.en ? `from ${n} sellers` : `من ${n} بائعين`))(new Set(bv.parts.map((x) => x.product.sellerId)).size), art: 'kit', color: '', qty, amount: full, isBundle: true, parts: bv.parts.map((x) => ({ art: x.product.art, color: x.product.color })), ...(bv.bundle.image ? { image: bv.bundle.image } : {}) });
      }
    });

    const promo = opts.promoCode ? cfg.promos.find((p) => p.code.toUpperCase() === opts.promoCode!.trim().toUpperCase()) ?? null : null;
    if (opts.promoCode && !promo) problems.push('promo_unknown');
    const t = cartTotals({ lines: coreLines, bundleDiscount, walletBalance: opts.walletBalance, useWallet: opts.useWallet, promo, isFirstOrder: opts.isFirstOrder }, cfg);
    return { lines: priced, items, ...t, problems };
  }
}

// ---------- cache ----------
const TTL_MS = 60_000;
const g = globalThis as unknown as { __catalog?: { at: number; store: unknown; value: Promise<Catalog> } };

/** The current catalog (cached for a few seconds; always fresh with the in-process demo store). */
export function catalog(): Promise<Catalog> {
  const s = store();
  const c = g.__catalog;
  if (c && c.store === s && s.kind === 'supabase' && Date.now() - c.at < TTL_MS) return c.value;
  const value = Promise.all([s.listSellers(), s.listProducts()]).then(([sellers, products]) => new Catalog(sellers, products));
  g.__catalog = { at: Date.now(), store: s, value };
  value.catch(() => { if (g.__catalog?.value === value) g.__catalog = undefined; });
  return value;
}

export const invalidateCatalog = () => { g.__catalog = undefined; };

export async function saveSeller(s: Seller) { await store().saveSeller(s); invalidateCatalog(); }
export async function saveProduct(p: Product) { await store().saveProduct(p); invalidateCatalog(); }
export async function deleteSeller(id: string) { await store().deleteSeller(id); invalidateCatalog(); }
export async function deleteProduct(id: string) { await store().deleteProduct(id); invalidateCatalog(); }
