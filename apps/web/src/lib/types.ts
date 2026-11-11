// Shapes shared by server and client code.

export type ArtKind = 'abaya' | 'niqab' | 'khimar' | 'hijab' | 'ihram' | 'bag' | 'tool' | 'kit';

export interface Seller {
  id: string;
  niche: string;
  name: string;
  area: string;
  rating: number;
  status: 'applied' | 'active' | 'warning' | 'suspended' | 'declined';
  telegramChatId?: number;
  instagram?: string;
  instapay?: string;
  capacity?: string;
  bostaLocationId?: string;
  /** Person who runs the store. */
  ownerName?: string;
  /** Phone for the team and the courier (shared from Telegram or typed). */
  contactPhone?: string;
  /** Store logo (Supabase Storage). */
  logo?: string;
  governorate?: string;
  /** Full pickup address, for the seller's Bosta pickup location. */
  pickupAddress?: string;
  /** Product photos sent with the application, for the admin's review. */
  samplePhotos?: string[];
}

export interface Variant {
  /** Unique option name, e.g. "أسود · 2" (what the cart and orders store). */
  label: string;
  stock: number;
  /** Set when the product comes in several colors. */
  color?: string;
  /** Size part of the option, when there is one. */
  size?: string;
  /** Price of this option when it differs from the product price (e.g. 1 kg vs 250 g). */
  price?: number;
  /** Option values by the niche's option axes, e.g. { roast: "وسط", weight: "250 جم" }. */
  opts?: Record<string, string>;
}

export interface Product {
  id: string;
  niche: string;
  slug: string;
  sellerId: string;
  category: string;
  art: ArtKind;
  color: string;
  nameAr: string;
  leadAr: string;
  price: number;
  attributes: Record<string, string>;
  variants: Variant[];
  status?: 'live' | 'review' | 'hidden';
  priceConfirmedAt?: string;
  views: number;
  reviews: { name: string; tags: string[]; text: string }[];
  /** Photo addresses (Supabase Storage). Without photos the page shows a drawing. */
  images?: string[];
  faq: [string, string][];
}

/** What the browser keeps in its cart. Prices are never trusted from here. */
export type CartLine =
  | { kind: 'item'; slug: string; variant: string; qty: number; choice?: Record<string, string> }
  | { kind: 'bundle'; id: string; variant: string; qty: number; choice?: Record<string, string> };

export interface PricedLine {
  key: string;
  title: string;
  by: string;
  art: ArtKind;
  color: string;
  qty: number;
  amount: number;
  isBundle: boolean;
  /** First product photo, if any. */
  image?: string;
  parts?: { art: ArtKind; color: string }[];
}

/** One sellable unit inside an order, after bundles are expanded. */
export interface OrderItem {
  sellerId: string;
  productId: string;
  name: string;
  variant: string;
  qty: number;
  unitPrice: number;
}

export interface Quote {
  lines: PricedLine[];
  items: OrderItem[];
  subtotal: number;
  bundleDiscount: number;
  promoDiscount: number;
  promoRejected?: string;
  wallet: number;
  shipping: number;
  total: number;
  depositRequired: boolean;
  deposit: number;
  problems: string[];
}
