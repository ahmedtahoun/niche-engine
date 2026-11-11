// Catalog reads + server-side pricing. Today backed by demo data; the function
// signatures stay the same when Supabase replaces the arrays.
import { cartTotals, matches, searchTerms, type Bundle, type NicheConfig } from '@niche-engine/core';
import { PRODUCTS, SELLERS } from './demo-data.ts';
import type { CartLine, OrderItem, PricedLine, Product, Quote, Seller } from './types.ts';

export const sellerOf = (p: Product): Seller => SELLERS.find((s) => s.id === p.sellerId)!;

const visible = (p: Product) => (p.status ?? 'live') === 'live' && ['active', 'warning'].includes(sellerOf(p).status);

export function productsOf(niche: string): Product[] {
  return PRODUCTS.filter((p) => p.niche === niche && visible(p));
}

export function productBySlug(niche: string, slug: string): Product | null {
  return productsOf(niche).find((p) => p.slug === slug) ?? null;
}

export type SortKey = 'best' | 'low' | 'high' | 'rating';
export type PriceBand = 'all' | 'lt300' | 'mid' | 'gt900';
const BANDS: Record<PriceBand, [number, number]> = { all: [0, Infinity], lt300: [0, 299], mid: [300, 900], gt900: [901, Infinity] };

export function search(cfg: NicheConfig, opts: { q?: string; cat?: string; sort?: SortKey; price?: PriceBand }): Product[] {
  const terms = searchTerms(opts.q ?? '', cfg.searchSynonyms);
  const label = (c: string) => cfg.categories.find((x) => x.id === c)?.labelAr ?? '';
  const [lo, hi] = BANDS[opts.price ?? 'all'];
  const sorters: Record<SortKey, (a: Product, b: Product) => number> = {
    best: (a, b) => b.views - a.views,
    low: (a, b) => a.price - b.price,
    high: (a, b) => b.price - a.price,
    rating: (a, b) => sellerOf(b).rating - sellerOf(a).rating,
  };
  return productsOf(cfg.id)
    .filter((p) => !opts.cat || p.category === opts.cat)
    .filter((p) => p.price >= lo && p.price <= hi)
    .filter((p) => !terms.length || matches([p.nameAr, p.leadAr, label(p.category), sellerOf(p).name, ...Object.values(p.attributes)].join(' '), terms))
    .sort(sorters[opts.sort ?? 'best']);
}

/** Bundle configs may say "one" for single-size parts; map to the product's real label. */
export function resolveVariant(p: Product, wanted: string): string {
  if (p.variants.some((v) => v.label === wanted)) return wanted;
  return p.variants.length === 1 ? p.variants[0].label : wanted;
}

/** Problems with a niche's bundles against the live catalog (used by tests and the admin panel). */
export function bundleProblems(cfg: NicheConfig): string[] {
  const out: string[] = [];
  for (const b of cfg.bundles) for (const pt of b.parts) {
    const p = productBySlug(cfg.id, pt.product);
    if (!p) out.push(`${b.id}: product ${pt.product} not in catalog`);
    else if (pt.variant !== null && resolveVariant(p, pt.variant) !== pt.variant && !p.variants.some((v) => v.label === resolveVariant(p, pt.variant!))) out.push(`${b.id}: ${pt.product} has no variant ${pt.variant}`);
  }
  return out;
}

export interface BundleView {
  bundle: Bundle;
  parts: { product: Product; qty: number; variant: string | null }[];
  fullPrice: number;
  price: number;
  pickVariantsFrom: Product | null;
}

export function bundleView(cfg: NicheConfig, id: string): BundleView | null {
  const bundle = cfg.bundles.find((b) => b.id === id);
  if (!bundle) return null;
  const parts = bundle.parts.map((pt) => ({ product: productBySlug(cfg.id, pt.product), qty: pt.qty, variant: pt.variant }));
  if (parts.some((pt) => !pt.product)) return null;
  const full = parts.reduce((a, pt) => a + pt.product!.price * pt.qty, 0);
  const pick = parts.find((pt) => pt.variant === null)?.product ?? null;
  return { bundle, parts: parts as BundleView['parts'], fullPrice: full, price: full - bundle.discountEgp, pickVariantsFrom: pick };
}

/** Prices a cart from the catalog. The browser's prices are never used. */
export function quote(cfg: NicheConfig, cart: CartLine[], opts: { promoCode?: string; isFirstOrder: boolean; walletBalance: number; useWallet: boolean }): Quote {
  const problems: string[] = [];
  const priced: PricedLine[] = [];
  const items: OrderItem[] = [];
  const coreLines: { sellerId: string; unitPrice: number; qty: number }[] = [];
  let bundleDiscount = 0;

  cart.forEach((line, i) => {
    const qty = Math.max(1, Math.min(5, Math.floor(line.qty)));
    if (line.kind === 'item') {
      const p = productBySlug(cfg.id, line.slug);
      const variant = p?.variants.find((x) => x.label === line.variant);
      if (!p || !variant) return void problems.push(`item_unavailable:${line.slug}`);
      if (variant.stock < qty) problems.push(`low_stock:${line.slug}:${variant.label}`);
      coreLines.push({ sellerId: p.sellerId, unitPrice: p.price, qty });
      items.push({ sellerId: p.sellerId, productId: p.id, name: p.nameAr, variant: line.variant, qty, unitPrice: p.price });
      priced.push({ key: `${i}`, title: `${p.nameAr} · ${line.variant}`, by: sellerOf(p).name, art: p.art, color: p.color, qty, amount: p.price * qty, isBundle: false });
    } else {
      const bv = bundleView(cfg, line.id);
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
