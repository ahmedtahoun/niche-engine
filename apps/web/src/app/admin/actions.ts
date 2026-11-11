'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { adminChats, approveProduct, approveSeller } from '@/bot/engine';
import { deliver } from '@/bot/transport';
import { checkPassword, COOKIE, isAdmin } from '@/lib/admin-auth';
import { unblock } from '@/lib/blocklist';
import { catalog, saveProduct, saveSeller } from '@/lib/catalog';
import { moveOrderTo } from '@/lib/fulfillment';
import { getNiche } from '@/lib/niches';
import { mutateOrder, orderById, type OrderStatus } from '@/lib/orders';
import { markPaid, paidThisCycle, sellerCycle } from '@/lib/payouts';
import { allow, clientIp } from '@/lib/rate-limit';
import { connectWebhook } from '@/lib/telegram-setup';

async function guard() {
  if (!(await isAdmin())) redirect('/admin/login');
}
const done = () => revalidatePath('/admin', 'layout');
const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;

// ---------- sign in ----------
export async function login(_: unknown, form: FormData) {
  if (!allow(`admin:${await clientIp()}`, 10, 15 * 60_000)) return { error: 'Too many attempts. Wait 15 minutes.' };
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
  const m = MOVES[move];
  if (!m) return;
  const before = await orderById(id);
  const moved = await moveOrderTo(id, m.to, m.from);
  // An order cancelled before confirmation never reached the sellers: nothing to tell them.
  if (moved && !(m.to === 'cancelled' && before?.status === 'awaiting_confirm')) await deliver(moved.messages);
  done();
}

export async function clearAttention(id: number) {
  await guard();
  await mutateOrder(id, (o) => { if (!o.needsAttention) return false; delete o.needsAttention; return true; });
  done();
}

export async function unblockPhone(phone: string) {
  await guard();
  await unblock(phone);
  done();
}

// ---------- sellers ----------
export async function approveSellerAction(id: string) { await guard(); await deliver(await approveSeller(id)); done(); }

export async function setSellerStatus(id: string, status: 'active' | 'warning' | 'suspended' | 'declined') {
  await guard();
  const found = (await catalog()).sellerById(id);
  if (!found) return;
  const s = { ...structuredClone(found), status };
  await saveSeller(s);
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
export async function approveProductAction(id: string) { await guard(); await deliver(await approveProduct(id)); done(); }

export async function setProductStatus(id: string, status: 'live' | 'hidden', reason?: string) {
  await guard();
  const cat = await catalog();
  const found = cat.productById(id);
  if (!found) return;
  const wasReview = found.status === 'review';
  const p = { ...structuredClone(found), status };
  await saveProduct(p);
  const chat = cat.sellerById(p.sellerId)?.telegramChatId;
  if (chat && wasReview && status === 'hidden') await deliver([{ chatId: chat, text: `"${p.nameAr}" محتاج تعديل قبل النشر: ${reason ?? 'راجع الصور والسعر'}. ابعته تاني من ➕ منتج جديد.` }]);
  done();
}

// ---------- payouts ----------
export async function markPaidAction(sellerId: string) {
  await guard();
  const s = (await catalog()).sellerById(sellerId);
  const cfg = s && getNiche(s.niche);
  if (!s || !cfg || (await paidThisCycle()).has(sellerId)) return;
  const c = await sellerCycle(sellerId, cfg);
  if (c.payable <= 0) return;
  // The database accepts one payout per seller per cycle: a double click can't pay twice.
  if (!(await markPaid(sellerId, c.payable))) return;
  if (s.telegramChatId) await deliver([{ chatId: s.telegramChatId, text: `💰 اتحولك ${egp(c.payable)} على إنستاباي${s.instapay ? ` (${s.instapay.slice(0, 3)}••••${s.instapay.slice(-4)})` : ''}.\nمحجوز كضمان: ${egp(c.reserveHeld)}\nشكراً 🤍` }]);
  done();
}

// ---------- Telegram ----------
export async function connectTelegram() {
  await guard();
  const r = await connectWebhook();
  redirect(`/admin/telegram?ok=${r.ok ? 1 : 0}&result=${encodeURIComponent(r.message)}`);
}

export async function testAdminAlert() {
  await guard();
  const chats = adminChats();
  await deliver(chats.map((chatId) => ({ chatId, text: '✅ تنبيهات سكينة شغالة. هيوصلك هنا كل ما حد يفتح بوت البائعين أو يقدّم أو يبعت منتج.' })));
  redirect(`/admin/telegram?ok=${chats.length ? 1 : 0}&result=${encodeURIComponent(chats.length ? `Test alert sent to ${chats.length} chat(s)` : 'ADMIN_TELEGRAM_CHAT_IDS is not set')}`);
}
