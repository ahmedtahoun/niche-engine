'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { approveProduct, approveSeller } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import type { Outgoing } from '@/bot/types';
import { checkPassword, COOKIE, isAdmin } from '@/lib/admin-auth';
import { unblock } from '@/lib/blocklist';
import { moveOrderTo } from '@/lib/fulfillment';
import { PRODUCTS, SELLERS } from '@/lib/demo-data';
import { getNiche } from '@/lib/niches';
import { orderById, type OrderStatus } from '@/lib/orders';
import { markPaid, paidThisCycle, sellerCycle } from '@/lib/payouts';
import { markDirty } from '@/lib/dirty';

async function guard() {
  if (!(await isAdmin())) redirect('/admin/login');
}
const done = () => revalidatePath('/admin', 'layout');
const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
const chatOf = (sellerId: string) => SELLERS.find((s) => s.id === sellerId)?.telegramChatId;

// ---------- sign in ----------
export async function login(_: unknown, form: FormData) {
  const token = checkPassword(String(form.get('password') ?? ''));
  if (!token) return { error: 'Wrong password.' };
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/admin', maxAge: 60 * 60 * 12 });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(COOKIE);
  redirect('/admin/login');
}

// ---------- orders (manual Bosta updates; the Bosta webhook does the same automatically) ----------
const MOVES: Record<string, { from: OrderStatus[]; to: OrderStatus }> = {
  picked: { from: ['accepted'], to: 'picked' },
  delivered: { from: ['picked'], to: 'delivered' },
  refused: { from: ['picked'], to: 'refused' },
  cancelled: { from: ['awaiting_confirm', 'confirmed'], to: 'cancelled' },
};

export async function moveOrder(id: number, move: keyof typeof MOVES) {
  await guard();
  const o = orderById(id);
  const m = MOVES[move];
  if (!o || !m || !m.from.includes(o.status)) return;
  await deliver(moveOrderTo(o, m.to));
  done();
}

export async function clearAttention(id: number) {
  await guard();
  const o = orderById(id);
  if (o) { delete o.needsAttention; markDirty('order', o.id); }
  done();
}

export async function unblockPhone(phone: string) {
  await guard();
  unblock(phone);
  done();
}

// ---------- sellers ----------
export async function approveSellerAction(id: string) { await guard(); await deliver(approveSeller(id)); done(); }

export async function setSellerStatus(id: string, status: 'active' | 'warning' | 'suspended' | 'declined') {
  await guard();
  const s = SELLERS.find((x) => x.id === id);
  if (!s) return;
  s.status = status;
  markDirty('seller', s.id);
  const chat = s.telegramChatId;
  const text = {
    declined: 'شكراً لاهتمامك 🤍 للأسف مش هنقدر نكمل دلوقتي. تقدر تقدم تاني بعد 60 يوم.',
    suspended: 'حسابك اتوقف مؤقتاً ومنتجاتك اتخفت. كلم فريق خدمة البائعين على واتساب.',
    active: 'حسابك رجع شغال ✅ منتجاتك ظاهرة تاني.',
    warning: 'تنبيه: معدل التسليم أو الرفض عندك محتاج يتحسن. سلم الطلبات للمندوب خلال 48 ساعة.',
  }[status];
  if (chat) await deliver([{ chatId: chat, text }]);
  done();
}

// ---------- products ----------
export async function approveProductAction(id: string) { await guard(); await deliver(approveProduct(id)); done(); }

export async function setProductStatus(id: string, status: 'live' | 'hidden', reason?: string) {
  await guard();
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  const wasReview = p.status === 'review';
  p.status = status;
  markDirty('product', p.id);
  const chat = chatOf(p.sellerId);
  if (chat && wasReview && status === 'hidden') await deliver([{ chatId: chat, text: `"${p.nameAr}" محتاج تعديل قبل النشر: ${reason ?? 'راجع الصور والسعر'}. ابعته تاني من ➕ منتج جديد.` }]);
  done();
}

// ---------- payouts ----------
export async function markPaidAction(sellerId: string) {
  await guard();
  const s = SELLERS.find((x) => x.id === sellerId);
  const cfg = s && getNiche(s.niche);
  if (!s || !cfg || paidThisCycle(sellerId)) return;
  const c = sellerCycle(sellerId, cfg);
  if (c.payable <= 0) return;
  markPaid(sellerId, c.payable);
  if (s.telegramChatId) await deliver([{ chatId: s.telegramChatId, text: `💰 اتحولك ${egp(c.payable)} على إنستاباي${s.instapay ? ` (${s.instapay.slice(0, 3)}••••${s.instapay.slice(-4)})` : ''}.\nمحجوز كضمان: ${egp(c.reserveHeld)}\nشكراً 🤍` }]);
  done();
}
