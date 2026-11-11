// Persistence: load everything from Supabase on server start, then write each
// change back (write-through). The app keeps reading from memory, so it must run
// as ONE server instance (a Node server, not serverless functions).
import { allBlocks, loadBlocks } from './blocklist.ts';
import { allAccounts, loadAccounts, type Account } from './customers.ts';
import { dbEnabled, remove, selectAll, upsert } from './db/rest.ts';
import { PRODUCTS, SELLERS } from './demo-data.ts';
import { setFlusher, take } from './dirty.ts';
import { allNiches } from './niches.ts';
import { allOrders, loadOrders, orderById, type Order } from './orders.ts';
import { allPaid, loadPaid } from './payouts.ts';
import { loadWallet, walletEntryById, type WalletEntry } from './wallet.ts';
import type { Product, Seller } from './types.ts';

// ---------- row mapping (pure; tested) ----------
export interface SellerRow { id: string; niche_id: string; store_name: string; telegram_chat_id: number | null; instagram: string | null; area: string; instapay: string | null; capacity: string | null; bosta_location_id: string | null; status: Seller['status']; rating: number }
export const sellerToRow = (s: Seller): SellerRow => ({ id: s.id, niche_id: s.niche, store_name: s.name, telegram_chat_id: s.telegramChatId ?? null, instagram: s.instagram ?? null, area: s.area, instapay: s.instapay ?? null, capacity: s.capacity ?? null, bosta_location_id: s.bostaLocationId ?? null, status: s.status, rating: s.rating });
export const rowToSeller = (r: SellerRow): Seller => ({ id: r.id, niche: r.niche_id, name: r.store_name, area: r.area, rating: Number(r.rating), status: r.status, ...(r.telegram_chat_id ? { telegramChatId: Number(r.telegram_chat_id) } : {}), ...(r.instagram ? { instagram: r.instagram } : {}), ...(r.instapay ? { instapay: r.instapay } : {}), ...(r.capacity ? { capacity: r.capacity } : {}), ...(r.bosta_location_id ? { bostaLocationId: r.bosta_location_id } : {}) });

export interface ProductRow { id: string; niche_id: string; seller_id: string; slug: string; category: string; art: string; color: string; name_ar: string; lead_ar: string; price: number; attributes: Record<string, string>; variants: Product['variants']; status: string; price_confirmed_at: string; views: number; reviews: Product['reviews']; faq: Product['faq'] }
export const productToRow = (p: Product): ProductRow => ({ id: p.id, niche_id: p.niche, seller_id: p.sellerId, slug: p.slug, category: p.category, art: p.art, color: p.color, name_ar: p.nameAr, lead_ar: p.leadAr, price: p.price, attributes: p.attributes, variants: p.variants, status: p.status ?? 'live', price_confirmed_at: p.priceConfirmedAt ?? new Date().toISOString(), views: p.views, reviews: p.reviews, faq: p.faq });
export const rowToProduct = (r: ProductRow): Product => ({ id: r.id, niche: r.niche_id, sellerId: r.seller_id, slug: r.slug, category: r.category, art: r.art as Product['art'], color: r.color, nameAr: r.name_ar, leadAr: r.lead_ar, price: Number(r.price), attributes: r.attributes, variants: r.variants, status: r.status as Product['status'], priceConfirmedAt: r.price_confirmed_at, views: r.views, reviews: r.reviews, faq: r.faq });

export interface OrderRow { id: number; niche_id: string; customer_phone: string; status: Order['status']; type: Order['type']; payment: Order['payment']; promo_code: string | null; total: number; quote: Order['quote']; cart: Order['cart']; seller_state: Order['sellerState']; shipments: NonNullable<Order['shipments']>; needs_attention: string | null; created_at: string; delivered_at: string | null }
export interface CustomerRow { phone: string; name: string; governorate: string; area: string; address: string; landmark: string; password_hash?: string | null; created_at?: string }
export const accountToRow = (a: Account): CustomerRow => ({ phone: a.phone, name: a.name, password_hash: a.passwordHash, governorate: a.governorate, area: a.area, address: a.address, landmark: a.landmark, created_at: a.createdAt });
export const rowToAccount = (r: CustomerRow): Account => ({ phone: r.phone, name: r.name, passwordHash: r.password_hash ?? '', governorate: r.governorate, area: r.area, address: r.address, landmark: r.landmark, createdAt: r.created_at ?? new Date().toISOString() });
export const orderToRow = (o: Order): OrderRow => ({ id: o.id, niche_id: o.niche, customer_phone: o.customer.phone, status: o.status, type: o.type, payment: o.payment, promo_code: o.promoCode ?? null, total: o.quote.total, quote: o.quote, cart: o.cart, seller_state: o.sellerState, shipments: o.shipments ?? {}, needs_attention: o.needsAttention ?? null, created_at: o.createdAt, delivered_at: o.deliveredAt ?? null });
export const rowToOrder = (r: OrderRow, c: CustomerRow): Order => ({
  id: Number(r.id), niche: r.niche_id, status: r.status, type: r.type, payment: r.payment, createdAt: r.created_at, cart: r.cart, quote: r.quote, items: r.quote.items, sellerState: r.seller_state,
  customer: { name: c.name, phone: c.phone, governorate: c.governorate, area: c.area, address: c.address, landmark: c.landmark },
  ...(r.shipments && Object.keys(r.shipments).length ? { shipments: r.shipments } : {}),
  ...(r.promo_code ? { promoCode: r.promo_code } : {}), ...(r.needs_attention ? { needsAttention: r.needs_attention } : {}), ...(r.delivered_at ? { deliveredAt: r.delivered_at } : {}),
});

export interface WalletRow { id: string; phone: string; niche_id: string; amount: number; kind: WalletEntry['kind']; order_id: number | null; note: string | null; expires_at: string | null; created_at: string }
export const walletToRow = (e: WalletEntry): WalletRow => ({ id: e.id, phone: e.phone, niche_id: e.niche, amount: e.amount, kind: e.kind, order_id: e.orderId ?? null, note: e.note ?? null, expires_at: e.expiresAt ?? null, created_at: e.createdAt });
export const rowToWallet = (r: WalletRow): WalletEntry => ({ id: r.id, phone: r.phone, niche: r.niche_id, amount: Number(r.amount), kind: r.kind, createdAt: r.created_at, ...(r.order_id ? { orderId: Number(r.order_id) } : {}), ...(r.note ? { note: r.note } : {}), ...(r.expires_at ? { expiresAt: r.expires_at } : {}) });

// ---------- startup ----------
const g = globalThis as unknown as { __hydrated?: Promise<void> };

/** Loads all data from Supabase into memory. With no keys, keeps the demo data. */
export function hydrate(): Promise<void> {
  if (!dbEnabled()) return Promise.resolve();
  return (g.__hydrated ??= (async () => {
    await upsert('niches', Object.values(allNiches()).map((c) => ({ id: c.id, status: c.status, config: c, updated_at: new Date().toISOString() })), 'id');
    const [sellers, products, orders, customers, blocks, payouts] = await Promise.all([
      selectAll<SellerRow>('sellers'), selectAll<ProductRow>('products'), selectAll<OrderRow>('orders'),
      selectAll<CustomerRow>('customers'), selectAll<{ phone: string; refusals: number; reason: string | null }>('blocklist'),
      selectAll<{ seller_id: string; cycle_date: string; amount: number; paid_at: string }>('payouts'),
    ]);
    const wallet = await selectAll<WalletRow>('wallet_ledger');
    // Real data replaces the demo catalog entirely.
    SELLERS.splice(0, SELLERS.length, ...sellers.map(rowToSeller));
    PRODUCTS.splice(0, PRODUCTS.length, ...products.map(rowToProduct));
    const byPhone = new Map(customers.map((c) => [c.phone, c]));
    loadOrders(orders.filter((o) => byPhone.has(o.customer_phone)).map((o) => rowToOrder(o, byPhone.get(o.customer_phone)!)));
    loadAccounts(customers.filter((c) => c.password_hash).map(rowToAccount));
    loadWallet(wallet.map(rowToWallet));
    loadBlocks(blocks);
    loadPaid(payouts.map((p) => ({ key: `${p.seller_id}:${p.cycle_date}`, amount: Number(p.amount), at: p.paid_at })));
    setFlusher(flush);
    console.log(`[persist] loaded ${sellers.length} sellers, ${products.length} products, ${orders.length} orders from Supabase`);
  })());
}

// ---------- write-through ----------
async function flush() {
  const sellerIds = new Set(take('seller'));
  const productIds = new Set(take('product'));
  const orderIds = take('order').map(Number);
  const phones = take('block');
  const payoutKeys = take('payout');
  const accountPhones = new Set(take('customer'));
  const walletIds = take('wallet');

  // Order matters: parents before children (foreign keys).
  await upsert('sellers', SELLERS.filter((s) => sellerIds.has(s.id)).map(sellerToRow), 'id');
  await upsert('products', PRODUCTS.filter((p) => productIds.has(p.id)).map(productToRow), 'id');
  const orders = orderIds.map(orderById).filter((o): o is Order => Boolean(o));
  const accounts = allAccounts();
  await upsert('customers', [...accountPhones].map((ph) => accounts.get(ph)).filter((a): a is Account => Boolean(a)).map(accountToRow), 'phone');
  // Orders from phones without an account (older data) still need their customer row.
  await upsert('customers', [...new Map(orders.filter((o) => !accounts.has(o.customer.phone)).map((o) => [o.customer.phone, { ...o.customer }])).values()], 'phone');
  await upsert('orders', orders.map(orderToRow), 'id');
  await upsert('order_items', orders.flatMap((o) => o.items.map((i) => ({ order_id: o.id, seller_id: i.sellerId, product_id: i.productId, name: i.name, variant: i.variant, qty: i.qty, unit_price: i.unitPrice }))), 'order_id,product_id,variant');
  // Wallet rows reference customers and orders, so they go after both.
  await upsert('wallet_ledger', walletIds.map(walletEntryById).filter((e): e is WalletEntry => Boolean(e)).map(walletToRow), 'id');
  const blocks = allBlocks();
  const present = phones.filter((p) => blocks.has(p));
  await upsert('blocklist', present.map((p) => ({ phone: p, ...blocks.get(p)!, updated_at: new Date().toISOString() })), 'phone');
  await remove('blocklist', 'phone', phones.filter((p) => !blocks.has(p)));
  const paid = allPaid();
  await upsert('payouts', payoutKeys.filter((k) => paid.has(k)).map((k) => { const [seller_id, cycle_date] = k.split(':'); const v = paid.get(k)!; return { seller_id, cycle_date, amount: v.amount, paid_at: v.at }; }), 'seller_id,cycle_date');
}

export const persistenceStatus = () => ({ enabled: dbEnabled(), orders: allOrders().length });
