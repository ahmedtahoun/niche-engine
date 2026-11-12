// In-process store for the local demo and the tests. It follows the same rules as
// the database (version checks, one cashback/refund/spend per order, no negative
// wallet) so tests exercise the real behaviour. Every read and write is a copy,
// like a database round trip, so callers can't change stored data by accident.
import type { Account } from '../customers.ts';
import type { Order } from '../orders.ts';
import type { Product, Seller } from '../types.ts';
import type { WalletEntry } from '../wallet.ts';
import type { AppendResult, NewOrder, NewWalletEntry, OrderFilter, Store } from './types.ts';

const copy = <T>(x: T): T => structuredClone(x);
const ONCE_PER_ORDER = new Set(['cashback', 'refund', 'spend']);
let seq = 0;
const newId = () => `w${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export class MemoryStore implements Store {
  readonly kind = 'memory' as const;
  private sellers: Seller[];
  private products: Product[];
  private orders: Order[] = [];
  private nextOrderId = 1001;
  private walletVersions = new Map<string, number>();
  private ledger: WalletEntry[] = [];
  private accounts = new Map<string, Account>();
  private authFailures: { phone: string; at: string }[] = [];
  private refusals = new Map<string, Set<number>>();
  private payouts = new Map<string, { amount: number; paidAt: string }>();
  private botSessions = new Map<number, unknown>();
  private telegramUpdates = new Set<number>();

  constructor(seed: { sellers?: Seller[]; products?: Product[] } = {}) {
    this.sellers = copy(seed.sellers ?? []);
    this.products = copy(seed.products ?? []);
  }

  // ---------- catalog ----------
  async listSellers() { return copy(this.sellers); }
  async listProducts() { return copy(this.products); }
  async saveSeller(s: Seller) { const i = this.sellers.findIndex((x) => x.id === s.id); if (i >= 0) this.sellers[i] = copy(s); else this.sellers.push(copy(s)); }
  async deleteProduct(id: string) { this.products = this.products.filter((x) => x.id !== id); }
  async saveProduct(p: Product) { const i = this.products.findIndex((x) => x.id === p.id); if (i >= 0) this.products[i] = copy(p); else this.products.push(copy(p)); }

  // ---------- orders ----------
  async createOrder(o: NewOrder, spend: { amount: number; walletVersion: number } | null): Promise<Order | 'wallet_conflict'> {
    const id = this.nextOrderId;
    if (spend && spend.amount > 0) {
      const r = this.append({ phone: o.customer.phone, niche: o.niche, amount: -spend.amount, kind: 'spend', orderId: id }, spend.walletVersion);
      if (r !== 'ok') return 'wallet_conflict';
    }
    this.nextOrderId++;
    const order: Order = { ...copy(o), id, createdAt: new Date().toISOString(), version: 0 };
    this.orders.push(order);
    return copy(order);
  }

  async getOrder(id: number) { const o = this.orders.find((x) => x.id === id); return o ? copy(o) : null; }

  async listOrders(f: OrderFilter) {
    return copy(this.orders
      .filter((o) => (!f.niche || o.niche === f.niche)
        && (!f.phone || o.customer.phone === f.phone)
        && (!f.sellerId || f.sellerId in o.sellerState)
        && (!f.statuses || f.statuses.includes(o.status))
        && (!f.since || o.createdAt >= f.since)
        && (!f.tracking || Object.values(o.shipments ?? {}).some((s) => s.tracking === f.tracking))
        && (!f.needsAttention || Boolean(o.needsAttention)))
      .sort((a, b) => b.id - a.id)
      .slice(0, f.limit ?? 1000));
  }

  async updateOrder(o: Order) {
    const i = this.orders.findIndex((x) => x.id === o.id);
    if (i < 0 || this.orders[i].version !== o.version) return null;
    this.orders[i] = { ...copy(o), version: o.version + 1 };
    return copy(this.orders[i]);
  }

  // ---------- wallet ----------
  private wkey = (phone: string, niche: string) => `${phone}|${niche}`;

  private append(e: NewWalletEntry, expectedVersion: number | null): AppendResult {
    const k = this.wkey(e.phone, e.niche);
    const version = this.walletVersions.get(k) ?? 0;
    if (expectedVersion !== null && expectedVersion !== version) return 'conflict';
    if (e.orderId && ONCE_PER_ORDER.has(e.kind) && this.ledger.some((x) => x.orderId === e.orderId && x.kind === e.kind)) return 'duplicate';
    const total = this.ledger.filter((x) => x.phone === e.phone && x.niche === e.niche).reduce((a, x) => a + x.amount, 0) + e.amount;
    if (total < 0) throw new Error('wallet_negative');
    this.ledger.push({ ...copy(e), id: newId(), createdAt: e.createdAt ?? new Date().toISOString() });
    this.walletVersions.set(k, version + 1);
    return 'ok';
  }

  async wallet(phone: string, niche: string) {
    return { version: this.walletVersions.get(this.wkey(phone, niche)) ?? 0, entries: copy(this.ledger.filter((e) => e.phone === phone && e.niche === niche)) };
  }
  async appendWallet(e: NewWalletEntry, expectedVersion: number | null) { return this.append(e, expectedVersion); }
  async listWalletEntries(niche?: string) { return copy(this.ledger.filter((e) => !niche || e.niche === niche)); }

  // ---------- customers ----------
  async getAccount(phone: string) { const a = this.accounts.get(phone); return a ? copy(a) : null; }
  async createAccount(a: Account) { if (this.accounts.has(a.phone)) return false; this.accounts.set(a.phone, copy(a)); return true; }
  async updateAccount(phone: string, patch: Partial<Account>) { const a = this.accounts.get(phone); if (a) Object.assign(a, copy(patch)); }
  async addAuthFailure(phone: string) { this.authFailures.push({ phone, at: new Date().toISOString() }); }
  async countAuthFailures(phone: string, sinceIso: string) { return this.authFailures.filter((f) => f.phone === phone && f.at >= sinceIso).length; }
  async clearAuthFailures(phone: string) { this.authFailures = this.authFailures.filter((f) => f.phone !== phone); }

  // ---------- trust ----------
  async addRefusal(phone: string, orderId: number) { this.refusals.set(phone, (this.refusals.get(phone) ?? new Set()).add(orderId)); }
  async refusalCount(phone: string) { return this.refusals.get(phone)?.size ?? 0; }
  async blockedPhones() { return [...this.refusals].filter(([, s]) => s.size >= 2).map(([phone, s]) => ({ phone, refusals: s.size })); }
  async clearRefusals(phone: string) { this.refusals.delete(phone); }

  // ---------- payouts ----------
  async listPayouts(cycleDate: string) {
    return [...this.payouts].filter(([k]) => k.endsWith(`:${cycleDate}`)).map(([k, p]) => ({ sellerId: k.split(':')[0], amount: p.amount, paidAt: p.paidAt }));
  }
  async insertPayout(sellerId: string, cycleDate: string, amount: number) {
    const k = `${sellerId}:${cycleDate}`;
    if (this.payouts.has(k)) return false;
    this.payouts.set(k, { amount, paidAt: new Date().toISOString() });
    return true;
  }

  // ---------- seller bot ----------
  async getBotSession<T>(chatId: number) { const s = this.botSessions.get(chatId); return (s === undefined ? null : copy(s)) as T | null; }
  async setBotSession(chatId: number, state: unknown | null) { if (state === null) this.botSessions.delete(chatId); else this.botSessions.set(chatId, copy(state)); }
  async claimTelegramUpdate(updateId: number) { if (this.telegramUpdates.has(updateId)) return false; this.telegramUpdates.add(updateId); return true; }

  // ---------- operations ----------
  async syncNiches() {}
  async ping() { return true; }
  async missingMigrations() { return []; }
}
