// Catalog reads + server-side pricing.
//
// Sellers and products are read from the database through a short cache (10 s):
// pages stay fast, and a change made by another process shows up within seconds.
// Writes go straight to the database and clear this process's cache.
import { cartTotals, matches, searchTerms, type Bundle, type NicheConfig } from '@niche-engine/core';
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

  private visible = (p: Product) => (p.status ?? 'live') === 'live' && ['active', 'warning'].includes(this.sellerById(p.sellerId)?.status ?? '');

  productsOf(niche: string): Product[] {
    return this.products.filter((p) => p.niche === niche && this.visible(p));
  }

  productBySlug(niche: string, slug: string): Product | null {
    return this.productsOf(niche).find((p) => p.slug === slug) ?? null;
  }

  search(cfg: NicheConfig, opts: { q?: string; cat?: string; sort?: SortKey; price?: PriceBand }): Product[] {
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
      .filter((p) => p.price >= lo && p.price <= hi)
      .filter((p) => !terms.length || matches([p.nameAr, p.leadAr, label(p.category), this.sellerOf(p).name, ...Object.values(p.attributes)].join(' '), terms))
      .sort(sorters[opts.sort ?? 'best']);
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
    const full = parts.reduce((a, pt) => a + pt.product!.price * pt.qty, 0);
    const pick = parts.find((pt) => pt.variant === null)?.product ?? null;
    return { bundle, parts: parts as BundleView['parts'], fullPrice: full, price: full - bundle.discountEgp, pickVariantsFrom: pick };
  }

  /** Prices a cart from the catalog. The browser's prices are never used. */
  quote(cfg: NicheConfig, cart: CartLine[], opts: { promoCode?: string; isFirstOrder: boolean; walletBalance: number; useWallet: boolean }): Quote {
    const problems: string[] = [];
    const priced: PricedLine[] = [];
    const items: OrderItem[] = [];
    const coreLines: { sellerId: string; unitPrice: number; qty: number }[] = [];
    let bundleDiscount = 0;

    cart.slice(0, 20).forEach((line, i) => {
      const qty = Math.max(1, Math.min(5, Math.floor(line.qty) || 1));
      if (line.kind === 'item') {
        const p = this.productBySlug(cfg.id, line.slug);
        const variant = p?.variants.find((x) => x.label === line.variant);
        if (!p || !variant) return void problems.push(`item_unavailable:${line.slug}`);
        if (variant.stock < qty) problems.push(`low_stock:${line.slug}:${variant.label}`);
        coreLines.push({ sellerId: p.sellerId, unitPrice: p.price, qty });
        items.push({ sellerId: p.sellerId, productId: p.id, name: p.nameAr, variant: line.variant, qty, unitPrice: p.price });
        priced.push({ key: `${i}`, title: `${p.nameAr} · ${line.variant}`, by: this.sellerOf(p).name, art: p.art, color: p.color, qty, amount: p.price * qty, isBundle: false });
      } else {
        const bv = this.bundleView(cfg, line.id);
        if (!bv) return void problems.push(`bundle_unavailable:${line.id}`);
        for (const pt of bv.parts) {
          coreLines.push({ sellerId: pt.product.sellerId, unitPrice: pt.product.price, qty: pt.qty * qty });
          items.push({ sellerId: pt.product.sellerId, productId: pt.product.id, name: pt.product.nameAr, variant: resolveVariant(pt.product, pt.variant ?? line.variant), qty: pt.qty * qty, unitPrice: pt.product.price });
        }
        bundleDiscount += bv.bundle.discountEgp * qty;
        priced.push({ key: `${i}`, title: `${bv.bundle.nameAr}${line.variant ? ` · ${line.variant}` : ''}`, by: `من ${new Set(bv.parts.map((x) => x.product.sellerId)).size} بائعين`, art: 'kit', color: '', qty, amount: bv.fullPrice * qty, isBundle: true, parts: bv.parts.map((x) => ({ art: x.product.art, color: x.product.color })) });
      }
    });

    const promo = opts.promoCode ? cfg.promos.find((p) => p.code.toUpperCase() === opts.promoCode!.trim().toUpperCase()) ?? null : null;
    if (opts.promoCode && !promo) problems.push('promo_unknown');
    const t = cartTotals({ lines: coreLines, bundleDiscount, walletBalance: opts.walletBalance, useWallet: opts.useWallet, promo, isFirstOrder: opts.isFirstOrder }, cfg);
    return { lines: priced, items, ...t, problems };
  }
}

// ---------- cache ----------
const TTL_MS = 10_000;
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
