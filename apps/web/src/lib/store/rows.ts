// Database rows ⇄ app objects (pure; tested).
import type { Account } from '../customers.ts';
import type { Order } from '../orders.ts';
import type { Product, Seller } from '../types.ts';
import type { WalletEntry } from '../wallet.ts';

export interface SellerRow { id: string; niche_id: string; store_name: string; telegram_chat_id: number | null; instagram: string | null; area: string; instapay: string | null; capacity: string | null; bosta_location_id: string | null; status: Seller['status']; rating: number; owner_name?: string | null; contact_phone?: string | null; logo_url?: string | null; governorate?: string | null; pickup_address?: string | null; sample_photos?: string[]; name_en?: string | null }
export const sellerToRow = (s: Seller): SellerRow => ({ id: s.id, niche_id: s.niche, store_name: s.name, telegram_chat_id: s.telegramChatId ?? null, instagram: s.instagram ?? null, area: s.area, instapay: s.instapay ?? null, capacity: s.capacity ?? null, bosta_location_id: s.bostaLocationId ?? null, status: s.status, rating: s.rating,
  // Profile fields (migration 0004) are only written when present, so older sellers keep saving before it runs.
  ...(s.ownerName ? { owner_name: s.ownerName } : {}), ...(s.contactPhone ? { contact_phone: s.contactPhone } : {}), ...(s.logo ? { logo_url: s.logo } : {}),
  ...(s.governorate ? { governorate: s.governorate } : {}), ...(s.pickupAddress ? { pickup_address: s.pickupAddress } : {}), ...(s.samplePhotos?.length ? { sample_photos: s.samplePhotos } : {}), ...(s.nameEn ? { name_en: s.nameEn } : {}) });
export const rowToSeller = (r: SellerRow): Seller => ({ id: r.id, niche: r.niche_id, name: r.store_name, area: r.area, rating: Number(r.rating), status: r.status, ...(r.telegram_chat_id ? { telegramChatId: Number(r.telegram_chat_id) } : {}), ...(r.instagram ? { instagram: r.instagram } : {}), ...(r.instapay ? { instapay: r.instapay } : {}), ...(r.capacity ? { capacity: r.capacity } : {}), ...(r.bosta_location_id ? { bostaLocationId: r.bosta_location_id } : {}),
  ...(r.owner_name ? { ownerName: r.owner_name } : {}), ...(r.contact_phone ? { contactPhone: r.contact_phone } : {}), ...(r.logo_url ? { logo: r.logo_url } : {}),
  ...(r.governorate ? { governorate: r.governorate } : {}), ...(r.pickup_address ? { pickupAddress: r.pickup_address } : {}), ...(r.sample_photos?.length ? { samplePhotos: r.sample_photos } : {}), ...(r.name_en ? { nameEn: r.name_en } : {}) });

export interface ProductRow { id: string; niche_id: string; seller_id: string; slug: string; category: string; art: string; color: string; name_ar: string; lead_ar: string; price: number; attributes: Record<string, string>; variants: Product['variants']; status: string; price_confirmed_at: string; views: number; reviews: Product['reviews']; faq: Product['faq']; images?: string[]; en?: Product['en'] | null }
/** `images` is only written when there are photos, so stock and price updates keep working before migration 0003. */
export const productToRow = (p: Product): ProductRow => ({ id: p.id, niche_id: p.niche, seller_id: p.sellerId, slug: p.slug, category: p.category, art: p.art, color: p.color, name_ar: p.nameAr, lead_ar: p.leadAr, price: p.price, attributes: p.attributes, variants: p.variants, status: p.status ?? 'live', price_confirmed_at: p.priceConfirmedAt ?? new Date().toISOString(), views: p.views, reviews: p.reviews, faq: p.faq, ...(p.images?.length ? { images: p.images } : {}), ...(p.en ? { en: p.en } : {}) });
export const rowToProduct = (r: ProductRow): Product => ({ id: r.id, niche: r.niche_id, sellerId: r.seller_id, slug: r.slug, category: r.category, art: r.art as Product['art'], color: r.color, nameAr: r.name_ar, leadAr: r.lead_ar, price: Number(r.price), attributes: r.attributes, variants: r.variants, status: r.status as Product['status'], priceConfirmedAt: r.price_confirmed_at, views: r.views, reviews: r.reviews, faq: r.faq, ...(r.images?.length ? { images: r.images } : {}), ...(r.en ? { en: r.en } : {}) });

export interface OrderRow {
  id: number; niche_id: string; customer_phone: string; customer: Order['customer']; status: Order['status']; type: Order['type']; payment: Order['payment'];
  promo_code: string | null; total: number; quote: Order['quote']; cart: Order['cart']; seller_state: Order['sellerState']; seller_ids: string[];
  shipments: NonNullable<Order['shipments']>; tracking_numbers: string[]; needs_attention: string | null; created_at: string; delivered_at: string | null; version: number;
}
/** The columns an update writes (id and created_at never change). */
export const orderToRow = (o: Order): Omit<OrderRow, 'id' | 'created_at'> => ({
  niche_id: o.niche, customer_phone: o.customer.phone, customer: o.customer, status: o.status, type: o.type, payment: o.payment,
  promo_code: o.promoCode ?? null, total: o.quote.total, quote: o.quote, cart: o.cart, seller_state: o.sellerState, seller_ids: Object.keys(o.sellerState),
  shipments: o.shipments ?? {}, tracking_numbers: Object.values(o.shipments ?? {}).map((s) => s.tracking), needs_attention: o.needsAttention ?? null,
  delivered_at: o.deliveredAt ?? null, version: o.version,
});
export const rowToOrder = (r: OrderRow): Order => ({
  id: Number(r.id), niche: r.niche_id, status: r.status, type: r.type, payment: r.payment, createdAt: new Date(r.created_at).toISOString(), cart: r.cart, quote: r.quote,
  items: r.quote.items, sellerState: r.seller_state, customer: r.customer, version: Number(r.version),
  ...(r.shipments && Object.keys(r.shipments).length ? { shipments: r.shipments } : {}),
  ...(r.promo_code ? { promoCode: r.promo_code } : {}), ...(r.needs_attention ? { needsAttention: r.needs_attention } : {}), ...(r.delivered_at ? { deliveredAt: new Date(r.delivered_at).toISOString() } : {}),
});
export const itemRows = (o: Pick<Order, 'items'>) => o.items.map((i) => ({ seller_id: i.sellerId, product_id: i.productId, name: i.name, variant: i.variant, qty: i.qty, unit_price: i.unitPrice }));

export interface CustomerRow { phone: string; name: string; governorate: string; area: string; address: string; landmark: string; password_hash: string | null; created_at: string }
export const accountToRow = (a: Account): CustomerRow => ({ phone: a.phone, name: a.name, password_hash: a.passwordHash, governorate: a.governorate, area: a.area, address: a.address, landmark: a.landmark, created_at: a.createdAt });
export const rowToAccount = (r: CustomerRow): Account => ({ phone: r.phone, name: r.name, passwordHash: r.password_hash ?? '', governorate: r.governorate, area: r.area, address: r.address, landmark: r.landmark, createdAt: new Date(r.created_at).toISOString() });
export const accountPatchToRow = (p: Partial<Account>) => ({
  ...(p.name !== undefined ? { name: p.name } : {}), ...(p.passwordHash !== undefined ? { password_hash: p.passwordHash } : {}),
  ...(p.governorate !== undefined ? { governorate: p.governorate } : {}), ...(p.area !== undefined ? { area: p.area } : {}),
  ...(p.address !== undefined ? { address: p.address } : {}), ...(p.landmark !== undefined ? { landmark: p.landmark } : {}),
});

export interface WalletRow { id: string; phone: string; niche_id: string; amount: number; kind: WalletEntry['kind']; order_id: number | null; note: string | null; expires_at: string | null; created_at: string }
export const rowToWallet = (r: WalletRow): WalletEntry => ({ id: r.id, phone: r.phone, niche: r.niche_id, amount: Number(r.amount), kind: r.kind, createdAt: new Date(r.created_at).toISOString(), ...(r.order_id ? { orderId: Number(r.order_id) } : {}), ...(r.note ? { note: r.note } : {}), ...(r.expires_at ? { expiresAt: new Date(r.expires_at).toISOString() } : {}) });
