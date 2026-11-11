// Money rules shared by the website, the seller bot and the admin panel.
// All amounts are EGP and rounded to whole piasters (2 decimals).

import type { CustomerType, NicheConfig, Promo } from './config.ts';

export const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Line {
  sellerId: string;
  unitPrice: number;
  qty: number;
  /** Wholesale price agreed with the seller: the seller gets exactly this and the platform keeps the rest (no commission rate). */
  unitCost?: number;
}

export interface CartInput {
  lines: Line[];
  /** Sum of bundle discounts in the cart (platform-funded). */
  bundleDiscount: number;
  walletBalance: number;
  useWallet: boolean;
  promo?: Promo | null;
  isFirstOrder: boolean;
}

export interface CartTotals {
  subtotal: number;
  bundleDiscount: number;
  promoDiscount: number;
  wallet: number;
  shipping: number;
  total: number;
  depositRequired: boolean;
  deposit: number;
  promoRejected?: string;
}

export const subtotalOf = (lines: Line[]) => round2(lines.reduce((a, l) => a + l.unitPrice * l.qty, 0));

export function promoDiscountFor(promo: Promo, subtotalAfterBundles: number, shipping: number, isFirstOrder: boolean): { amount: number; rejected?: string } {
  if (promo.firstOrderOnly && !isFirstOrder) return { amount: 0, rejected: 'first_order_only' };
  if (subtotalAfterBundles < promo.minOrderEgp) return { amount: 0, rejected: 'below_minimum' };
  if (promo.kind === 'percent') return { amount: round2(subtotalAfterBundles * promo.value) };
  if (promo.kind === 'fixed') return { amount: round2(Math.min(promo.value, subtotalAfterBundles)) };
  return { amount: shipping };
}

export function cartTotals(input: CartInput, cfg: NicheConfig): CartTotals {
  const subtotal = subtotalOf(input.lines);
  const shipping = input.lines.length ? cfg.shippingEgp : 0;
  const bundleDiscount = round2(Math.min(input.bundleDiscount, subtotal));
  const afterBundles = subtotal - bundleDiscount;
  let promoDiscount = 0;
  let promoRejected: string | undefined;
  if (input.promo) {
    const r = promoDiscountFor(input.promo, afterBundles, shipping, input.isFirstOrder);
    promoDiscount = r.amount;
    promoRejected = r.rejected;
  }
  const payableBeforeWallet = Math.max(0, afterBundles + shipping - promoDiscount);
  // Wallet never pays for shipping: the courier fee must stay covered.
  const wallet = input.useWallet ? round2(Math.min(input.walletBalance, Math.max(0, payableBeforeWallet - shipping))) : 0;
  const total = round2(payableBeforeWallet - wallet);
  const depositRequired = total > cfg.risk.depositAboveEgp;
  return {
    subtotal, bundleDiscount, promoDiscount, wallet, shipping, total,
    depositRequired, deposit: depositRequired ? cfg.risk.depositEgp : 0,
    ...(promoRejected ? { promoRejected } : {}),
  };
}

export const commissionRate = (type: CustomerType, cfg: NicheConfig) => cfg.commission[type];

export interface OrderMoney {
  type: CustomerType;
  lines: Line[];
  /** Platform-funded discounts: bundle + platform promos. */
  platformDiscount: number;
  /** Seller-funded promo amount per seller (reduces that seller's commission base). */
  sellerDiscount?: Record<string, number>;
  wallet: number;
  delivered: boolean;
}

/**
 * What the platform keeps from each seller's lines. Commission lines: (line value − any
 * discount the seller funded) × the niche rate. Wholesale lines (unitCost set): price − cost.
 */
export function commissionBySeller(o: OrderMoney, cfg: NicheConfig): Record<string, number> {
  const rate = commissionRate(o.type, cfg);
  const base: Record<string, number> = {};
  const margin: Record<string, number> = {};
  for (const l of o.lines) {
    if (l.unitCost !== undefined) margin[l.sellerId] = (margin[l.sellerId] ?? 0) + (l.unitPrice - l.unitCost) * l.qty;
    else base[l.sellerId] = (base[l.sellerId] ?? 0) + l.unitPrice * l.qty;
  }
  const out: Record<string, number> = {};
  for (const s of new Set([...Object.keys(base), ...Object.keys(margin)])) {
    out[s] = round2(Math.max(0, (base[s] ?? 0) - (o.sellerDiscount?.[s] ?? 0)) * rate + (margin[s] ?? 0));
  }
  return out;
}

/** What the platform keeps from one order, after the discounts and cashback it funds. */
export function platformNet(o: OrderMoney, cfg: NicheConfig): number {
  const commission = Object.values(commissionBySeller(o, cfg)).reduce((a, b) => a + b, 0);
  const cashback = o.delivered ? subtotalOf(o.lines) * cfg.wallet.cashback : 0;
  return round2(commission - o.platformDiscount - o.wallet - cashback);
}

export interface SellerCycle {
  sales: number;
  commission: number;
  net: number;
  reserve: number;
  payable: number;
}

/** Weekly payout for one seller from their delivered orders in the cycle. */
export function sellerPayout(sellerId: string, deliveredOrders: OrderMoney[], cfg: NicheConfig): SellerCycle {
  let sales = 0, commission = 0;
  for (const o of deliveredOrders) {
    for (const l of o.lines) if (l.sellerId === sellerId) sales += l.unitPrice * l.qty;
    sales -= o.sellerDiscount?.[sellerId] ?? 0;
    commission += commissionBySeller(o, cfg)[sellerId] ?? 0;
  }
  sales = round2(Math.max(0, sales));
  commission = round2(commission);
  const net = round2(sales - commission);
  const reserve = round2(net * cfg.reserve.percent);
  return { sales, commission, net, reserve, payable: round2(net - reserve) };
}
