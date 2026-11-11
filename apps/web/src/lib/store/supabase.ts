// Production store: every call goes to Supabase. Money and order changes are
// protected by the database (transactions, version checks, unique rules).
import { arr, DbError, insertOnce, list, req, rpc, selectAll, upsert, v } from '../db/rest.ts';
import type { Account } from '../customers.ts';
import type { Order } from '../orders.ts';
import type { Product, Seller } from '../types.ts';
import type { WalletEntry } from '../wallet.ts';
import {
  accountPatchToRow, accountToRow, itemRows, orderToRow, productToRow, rowToAccount, rowToOrder, rowToProduct, rowToSeller, rowToWallet, sellerToRow,
  type CustomerRow, type OrderRow, type ProductRow, type SellerRow, type WalletRow,
} from './rows.ts';
import type { AppendResult, NewOrder, NewWalletEntry, OrderFilter, Store } from './types.ts';

const walletEntryArg = (e: NewWalletEntry) => ({
  amount: e.amount, kind: e.kind, order_id: e.orderId ?? null, note: e.note ?? null, expires_at: e.expiresAt ?? null, created_at: e.createdAt ?? null,
});

export class SupabaseStore implements Store {
  readonly kind = 'supabase' as const;

  // ---------- catalog ----------
  async listSellers(): Promise<Seller[]> { return (await selectAll<SellerRow>('sellers', 'order=created_at.asc')).map(rowToSeller); }
  async listProducts(): Promise<Product[]> { return (await selectAll<ProductRow>('products', 'order=created_at.asc')).map(rowToProduct); }
  async saveSeller(s: Seller) { await upsert('sellers', [sellerToRow(s)], 'id'); }
  async saveProduct(p: Product) { await upsert('products', [productToRow(p)], 'id'); }

  // ---------- orders ----------
  async createOrder(o: NewOrder, spend: { amount: number; walletVersion: number } | null): Promise<Order | 'wallet_conflict'> {
    const row = orderToRow({ ...o, id: 0, createdAt: '', version: 0 });
    try {
      const saved = await rpc<OrderRow>('place_order', { p_order: row, p_items: itemRows(o), p_spend: spend?.amount ?? 0, p_wallet_version: spend?.walletVersion ?? null });
      return rowToOrder(saved);
    } catch (e) {
      if (e instanceof DbError && /wallet_conflict|wallet_negative/.test(e.body)) return 'wallet_conflict';
      throw e;
    }
  }

  async getOrder(id: number): Promise<Order | null> {
    if (!Number.isSafeInteger(id)) return null;
    const rows = await req<OrderRow[]>(`orders?select=*&id=eq.${id}`);
    return rows[0] ? rowToOrder(rows[0]) : null;
  }

  async listOrders(f: OrderFilter): Promise<Order[]> {
    const q = ['select=*', 'order=id.desc', `limit=${f.limit ?? 1000}`];
    if (f.niche) q.push(`niche_id=eq.${v(f.niche)}`);
    if (f.phone) q.push(`customer_phone=eq.${v(f.phone)}`);
    if (f.sellerId) q.push(`seller_ids=cs.${arr(f.sellerId)}`);
    if (f.statuses) q.push(`status=in.${list(f.statuses)}`);
    if (f.since) q.push(`created_at=gte.${v(f.since)}`);
    if (f.tracking) q.push(`tracking_numbers=cs.${arr(f.tracking)}`);
    if (f.needsAttention) q.push('needs_attention=not.is.null');
    return (await req<OrderRow[]>(`orders?${q.join('&')}`)).map(rowToOrder);
  }

  async updateOrder(o: Order): Promise<Order | null> {
    const rows = await req<OrderRow[]>(`orders?id=eq.${o.id}&version=eq.${o.version}`, {
      method: 'PATCH', prefer: 'return=representation', body: { ...orderToRow(o), version: o.version + 1 },
    });
    return rows[0] ? rowToOrder(rows[0]) : null;
  }

  // ---------- wallet ----------
  async wallet(phone: string, niche: string) {
    // Version first: if entries change after this read, the version changes too and a spend is refused.
    const w = await req<{ version: number }[]>(`wallets?select=version&phone=eq.${v(phone)}&niche_id=eq.${v(niche)}`);
    const entries = (await selectAll<WalletRow>('wallet_ledger', `phone=eq.${v(phone)}&niche_id=eq.${v(niche)}&order=created_at.asc`)).map(rowToWallet);
    return { version: w[0]?.version ?? 0, entries };
  }

  async appendWallet(e: NewWalletEntry, expectedVersion: number | null): Promise<AppendResult> {
    return rpc<AppendResult>('wallet_append', { p_phone: e.phone, p_niche: e.niche, p_expected: expectedVersion, p_entry: walletEntryArg(e) });
  }

  async listWalletEntries(niche?: string): Promise<WalletEntry[]> {
    return (await selectAll<WalletRow>('wallet_ledger', niche ? `niche_id=eq.${v(niche)}` : '')).map(rowToWallet);
  }

  // ---------- customers ----------
  async getAccount(phone: string): Promise<Account | null> {
    const rows = await req<CustomerRow[]>(`customers?select=*&phone=eq.${v(phone)}`);
    return rows[0]?.password_hash ? rowToAccount(rows[0]) : null;
  }
  createAccount(a: Account) { return insertOnce('customers', accountToRow(a)); }
  async updateAccount(phone: string, patch: Partial<Account>) {
    await req(`customers?phone=eq.${v(phone)}`, { method: 'PATCH', prefer: 'return=minimal', body: accountPatchToRow(patch) });
  }
  async addAuthFailure(phone: string) {
    await req('auth_failures', { method: 'POST', prefer: 'return=minimal', body: { phone } });
    // Keep the table small: drop entries older than a day now and then.
    if (Math.random() < 0.02) await req(`auth_failures?at=lt.${v(new Date(Date.now() - 864e5).toISOString())}`, { method: 'DELETE', prefer: 'return=minimal' });
  }
  async countAuthFailures(phone: string, sinceIso: string) {
    return (await req<unknown[]>(`auth_failures?select=id&phone=eq.${v(phone)}&at=gte.${v(sinceIso)}`)).length;
  }
  async clearAuthFailures(phone: string) { await req(`auth_failures?phone=eq.${v(phone)}`, { method: 'DELETE', prefer: 'return=minimal' }); }

  // ---------- trust ----------
  async addRefusal(phone: string, orderId: number) {
    await req('refusals?on_conflict=phone,order_id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: { phone, order_id: orderId } });
  }
  async refusalCount(phone: string) { return (await req<unknown[]>(`refusals?select=order_id&phone=eq.${v(phone)}`)).length; }
  blockedPhones() { return req<{ phone: string; refusals: number }[]>('blocked_phones?select=*'); }
  async clearRefusals(phone: string) { await req(`refusals?phone=eq.${v(phone)}`, { method: 'DELETE', prefer: 'return=minimal' }); }

  // ---------- payouts ----------
  async listPayouts(cycleDate: string) {
    const rows = await req<{ seller_id: string; amount: number; paid_at: string }[]>(`payouts?select=*&cycle_date=eq.${v(cycleDate)}`);
    return rows.map((r) => ({ sellerId: r.seller_id, amount: Number(r.amount), paidAt: r.paid_at }));
  }
  insertPayout(sellerId: string, cycleDate: string, amount: number) {
    return insertOnce('payouts', { seller_id: sellerId, cycle_date: cycleDate, amount });
  }

  // ---------- seller bot ----------
  async getBotSession<T>(chatId: number): Promise<T | null> {
    const rows = await req<{ state: T }[]>(`bot_sessions?select=state&chat_id=eq.${chatId}`);
    return rows[0]?.state ?? null;
  }
  async setBotSession(chatId: number, state: unknown | null) {
    if (state === null) await req(`bot_sessions?chat_id=eq.${chatId}`, { method: 'DELETE', prefer: 'return=minimal' });
    else await upsert('bot_sessions', [{ chat_id: chatId, state, updated_at: new Date().toISOString() }], 'chat_id');
  }
  async claimTelegramUpdate(updateId: number) {
    const rows = await req<unknown[]>('telegram_updates?on_conflict=update_id', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=representation', body: { update_id: updateId } });
    if (Math.random() < 0.01) await req(`telegram_updates?received_at=lt.${v(new Date(Date.now() - 7 * 864e5).toISOString())}`, { method: 'DELETE', prefer: 'return=minimal' });
    return rows.length > 0;
  }

  // ---------- operations ----------
  async syncNiches(rows: { id: string; status: string; config: unknown }[]) {
    await upsert('niches', rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })), 'id');
  }
  async ping() {
    try { await req('niches?select=id&limit=1'); return true; } catch { return false; }
  }
  async missingMigrations() {
    const checks: [string, string][] = [['0002_database_first.sql', 'wallets?select=version&limit=1'], ['0003_product_photos.sql', 'products?select=images&limit=1'], ['0004_seller_profile.sql', 'sellers?select=owner_name&limit=1'], ['0005_english_and_taste.sql', 'products?select=en,profile&limit=1']];
    const missing: string[] = [];
    for (const [file, probe] of checks) await req(probe).catch(() => missing.push(file));
    return missing;
  }
}
