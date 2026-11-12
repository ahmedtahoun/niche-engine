// The storage contract. Every read and write goes through it, so the database is
// the only source of truth: the app keeps nothing important in memory and can
// restart, or run as several processes, safely.
//
// Two implementations: SupabaseStore (production) and MemoryStore (local demo + tests).
import type { Account } from '../customers.ts';
import type { Order, OrderStatus } from '../orders.ts';
import type { Product, Seller } from '../types.ts';
import type { WalletEntry } from '../wallet.ts';

export interface OrderFilter {
  niche?: string;
  phone?: string;
  sellerId?: string;
  statuses?: OrderStatus[];
  /** ISO time: orders created at or after it. */
  since?: string;
  tracking?: string;
  needsAttention?: boolean;
  /** Newest first. Default 1000. */
  limit?: number;
}

export type NewOrder = Omit<Order, 'id' | 'createdAt' | 'version'>;
export type NewWalletEntry = Omit<WalletEntry, 'id' | 'createdAt'> & { createdAt?: string };
export type AppendResult = 'ok' | 'conflict' | 'duplicate';

export interface Store {
  readonly kind: 'supabase' | 'memory';

  // ---------- catalog ----------
  listSellers(): Promise<Seller[]>;
  listProducts(): Promise<Product[]>;
  saveSeller(s: Seller): Promise<void>;
  saveProduct(p: Product): Promise<void>;
  /** Removes a product that no order refers to (the database refuses otherwise). */
  deleteProduct(id: string): Promise<void>;
  /** Removes a seller nothing refers to (the database refuses one with products, orders or payouts). */
  deleteSeller(id: string): Promise<void>;

  // ---------- orders ----------
  /** Saves the order, its lines and the wallet spend in one transaction. */
  createOrder(o: NewOrder, spend: { amount: number; walletVersion: number } | null): Promise<Order | 'wallet_conflict'>;
  getOrder(id: number): Promise<Order | null>;
  listOrders(f: OrderFilter): Promise<Order[]>;
  /** Saves only if the stored version still equals o.version. Returns the saved order (version + 1) or null. */
  updateOrder(o: Order): Promise<Order | null>;

  // ---------- wallet ----------
  wallet(phone: string, niche: string): Promise<{ version: number; entries: WalletEntry[] }>;
  /** expectedVersion: the version read before checking the balance (spends), or null (credits). */
  appendWallet(e: NewWalletEntry, expectedVersion: number | null): Promise<AppendResult>;
  listWalletEntries(niche?: string): Promise<WalletEntry[]>;

  // ---------- customers ----------
  getAccount(phone: string): Promise<Account | null>;
  /** False if the phone already has an account. */
  createAccount(a: Account): Promise<boolean>;
  updateAccount(phone: string, patch: Partial<Omit<Account, 'phone' | 'createdAt'>>): Promise<void>;
  addAuthFailure(phone: string): Promise<void>;
  countAuthFailures(phone: string, sinceIso: string): Promise<number>;
  clearAuthFailures(phone: string): Promise<void>;

  // ---------- trust ----------
  /** One refusal per order: calling it twice for the same order counts once. */
  addRefusal(phone: string, orderId: number): Promise<void>;
  refusalCount(phone: string): Promise<number>;
  blockedPhones(): Promise<{ phone: string; refusals: number }[]>;
  clearRefusals(phone: string): Promise<void>;

  // ---------- payouts ----------
  listPayouts(cycleDate: string): Promise<{ sellerId: string; amount: number; paidAt: string }[]>;
  /** False if this seller was already paid for this cycle. */
  insertPayout(sellerId: string, cycleDate: string, amount: number): Promise<boolean>;

  // ---------- seller bot ----------
  getBotSession<T>(chatId: number): Promise<T | null>;
  setBotSession(chatId: number, state: unknown | null): Promise<void>;
  /** True the first time an update id is seen, false for Telegram's retries. */
  claimTelegramUpdate(updateId: number): Promise<boolean>;

  // ---------- operations ----------
  /** Writes the niche settings (sellers and orders reference them). */
  syncNiches(rows: { id: string; status: string; config: unknown }[]): Promise<void>;
  /** True if the database answers. */
  ping(): Promise<boolean>;
  /** Migration files that still need to be run (empty when the schema is current). */
  missingMigrations(): Promise<string[]>;
}
