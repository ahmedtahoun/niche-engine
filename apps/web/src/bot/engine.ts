// Seller bot logic: Incoming → Outgoing[]. No Telegram code here.
// Relative imports (with .ts) so `node --test` can run it without Next.
//
// Everything lives in the database: the seller's place in a multi-step flow
// (bot_sessions), the catalog and the orders. Order buttons go through
// mutateOrder(), so two taps or two processes can't both accept the same order.
import { normalizeEgyptPhone, sellerPayout, type NicheConfig, type OrderMoney } from '@niche-engine/core';
import { catalog, saveProduct, saveSeller, type Catalog } from '../lib/catalog.ts';
import { GOVERNORATES } from '../lib/eta.ts';
import { allNiches, getNiche } from '../lib/niches.ts';
import { queueShipment } from '../lib/fulfillment.ts';
import { applySellerPart, itemsOfSeller, mutateOrder, type Order } from '../lib/orders.ts';
import { store } from '../lib/store/index.ts';
import type { Product, Seller } from '../lib/types.ts';
import type { Button, Incoming, Outgoing } from './types.ts';

export const MENU = [['📦 طلبات مفتوحة', '➕ منتج جديد'], ['📊 أرقامي', '💰 فلوسي'], ['🔎 مراجعة الأسعار']];

const ATTR: Record<string, { label: string; choices?: string[] }> = {
  fabric: { label: 'القماش' },
  color: { label: 'اللون' },
  size_chart_cm: { label: 'جدول المقاسات بالسنتيمتر (مثلاً: 1=135، 2=140، 3=145)' },
  length_cm: { label: 'الطول بالسنتيمتر' },
  opacity: { label: 'الشفافية', choices: ['غير شفاف', 'شفاف خفيف', 'محتاج بطانة'] },
  origin: { label: 'المنشأ (البلد)' },
  roast_level: { label: 'درجة التحميص', choices: ['فاتح', 'متوسط', 'غامق'] },
  roast_date: { label: 'تاريخ التحميص', choices: ['النهارده', 'امبارح'] },
  process: { label: 'المعالجة', choices: ['مغسول', 'طبيعي', 'هاني'] },
  weight_g: { label: 'الوزن بالجرام' },
};
/** Attributes collected as product variants instead of a text field. */
const VARIANT_ATTRS = ['sizes', 'grind_options'];
const VARIANT_PRESETS: Record<string, [string, string[]][]> = {
  umrah: [['مقاسات 1 لـ 4', ['1', '2', '3', '4']], ['مقاس واحد', ['مقاس واحد']]],
  coffee: [['حبوب + 3 طحنات', ['حبوب', 'مطحون فلتر', 'مطحون اسبريسو', 'مطحون تركي']], ['حبوب بس', ['حبوب']]],
};

// ---------- sessions (wizard state per chat) ----------
type Session =
  | { flow: 'apply'; step: number; data: Record<string, string> }
  | { flow: 'add'; step: number; niche: string; data: Record<string, string>; variants: string[]; attrs: string[]; attrIndex: number; values: Record<string, string>; photos: number };
/** Per-message context: the seller's flow state (saved after the reply if it changed) and the catalog. */
interface Ctx { session: Session | null; cat: Catalog }

// ---------- helpers ----------
const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
const msg = (chatId: number, text: string, buttons?: Button[][], extra: Partial<Outgoing> = {}): Outgoing => ({ chatId, text, ...(buttons ? { buttons } : {}), ...extra });
const row = (...b: [string, string][]) => b.map(([text, data]) => ({ text, data }));
const lastThursday = (now = new Date()) => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() - 4 + 7) % 7)); return d; };

function money(o: Order): OrderMoney {
  return { type: o.type, lines: o.items.map((i) => ({ sellerId: i.sellerId, unitPrice: i.unitPrice, qty: i.qty })), platformDiscount: o.quote.bundleDiscount + o.quote.promoDiscount, wallet: o.quote.wallet, delivered: o.status === 'delivered' };
}

function shareText(cfg: NicheConfig, price: number) {
  return `💵 نصيبك: ${egp(price * (1 - cfg.commission.new))} (عميل جديد من ${cfg.brand.nameAr}) / ${egp(price * (1 - cfg.commission.repeat))} (عميل راجع) / ${egp(price * (1 - cfg.commission.referral))} (عميل من كودك)`;
}

// ---------- entry point ----------
export async function handle(m: Incoming): Promise<Outgoing[]> {
  const ctx: Ctx = { session: await store().getBotSession<Session>(m.chatId), cat: await catalog() };
  const before = JSON.stringify(ctx.session);
  const out = await route(m, ctx);
  if (JSON.stringify(ctx.session) !== before) await store().setBotSession(m.chatId, ctx.session);
  return out;
}

async function route(m: Incoming, ctx: Ctx): Promise<Outgoing[]> {
  const text = m.text?.trim() ?? '';
  const seller = ctx.cat.sellerByChat(m.chatId);

  if (text === '/cancel' || text === 'إلغاء') {
    ctx.session = null;
    return [msg(m.chatId, 'تمام، لغينا الخطوة دي.', undefined, seller?.status === 'active' || seller?.status === 'warning' ? { keyboard: MENU } : {})];
  }
  if (m.data) return onButton(m, seller, ctx);
  if (ctx.session && MENU.flat().includes(text)) ctx.session = null;
  const active = ctx.session;
  if (active?.flow === 'apply') return applyStep(m, active, ctx);
  if (active?.flow === 'add' && seller) return addStep(m, seller, active, ctx);

  if (!seller) return applyIntro(m.chatId, ctx);
  if (seller.status === 'applied') return [msg(m.chatId, 'طلبك لسه بيتراجع ✅ هنرد عليك خلال 48 ساعة بعد الطلب التجريبي.')];
  if (seller.status === 'suspended' || seller.status === 'declined') return [msg(m.chatId, 'حسابك موقوف حالياً. كلمنا على واتساب خدمة البائعين لو عندك سؤال.')];

  switch (text) {
    case '📦 طلبات مفتوحة': return openOrders(seller);
    case '➕ منتج جديد': return startAdd(seller, ctx);
    case '📊 أرقامي': return stats(seller, ctx.cat);
    case '💰 فلوسي': return payout(seller);
    case '🔎 مراجعة الأسعار': return priceCheck(seller, ctx.cat);
    default: return [msg(m.chatId, `أهلاً ${seller.name} 👋 اختار من القايمة تحت.`, undefined, { keyboard: MENU })];
  }
}

async function onButton(m: Incoming, seller: Seller | null, ctx: Ctx): Promise<Outgoing[]> {
  const [k, a = '', b = '', c = ''] = (m.data ?? '').split(':');
  const session = ctx.session;
  if (k === 'ap') return session?.flow === 'apply' ? applyStep({ ...m, text: undefined, data: undefined }, session, ctx, a === 'v' ? b : `${a}:${b}`) : applyIntro(m.chatId, ctx, a === 'start');
  if (!seller) return applyIntro(m.chatId, ctx);
  if (k === 'ad' && session?.flow === 'add') return addStep({ ...m, data: undefined }, seller, session, ctx, a === 'v' ? b : a);
  if (k === 'acc' || k === 'rej' || k === 'hand') return orderButton(seller, k, Number(a), ctx.cat);
  if (k === 'stk') {
    const found = ctx.cat.productById(a);
    const p = found && found.sellerId === seller.id ? structuredClone(found) : null;
    const v = p?.variants.at(Number(b));
    if (!p || !v) return [msg(m.chatId, 'المنتج ده مش موجود.')];
    v.stock = Number(c) || 5;
    await saveProduct(p);
    return [msg(m.chatId, `رجع متاح: ${p.nameAr} · ${v.label} (${v.stock} قطع) ✅`)];
  }
  if (k === 'pok') {
    const now = new Date().toISOString();
    for (const p of ctx.cat.products.filter((x) => x.sellerId === seller.id)) await saveProduct({ ...structuredClone(p), priceConfirmedAt: now });
    return [msg(m.chatId, 'شكراً! الأسعار اتأكدت. هنسألك تاني بعد أسبوعين.')];
  }
  return [msg(m.chatId, 'الزرار ده قديم. استخدم القايمة تحت.', undefined, { keyboard: MENU })];
}

// ---------- seller application ----------
function applyIntro(chatId: number, ctx: Ctx, start = false): Outgoing[] {
  if (!start) {
    return [msg(chatId, 'أهلاً بيك 👋 ده بوت البائعين.\n• مش هتدفع أي حاجة غير لما تبيع\n• الطلبات بتوصلك هنا\n• فلوسك بتتحول كل خميس\n\nافتح متجرك في 5 دقايق.', [row(['🚀 ابدأ التقديم', 'ap:start'])])];
  }
  const s: Session = { flow: 'apply', step: 0, data: {} };
  ctx.session = s;
  return applyAsk(chatId, s);
}

const APPLY_STEPS = ['niche', 'store', 'instagram', 'governorate', 'area', 'photos', 'capacity', 'instapay', 'agree'] as const;

function applyAsk(chatId: number, s: Extract<Session, { flow: 'apply' }>): Outgoing[] {
  const n = `${s.step + 1}/${APPLY_STEPS.length}`;
  switch (APPLY_STEPS[s.step]) {
    case 'niche': return [msg(chatId, `${n} · بتبيع إيه؟`, [Object.values(allNiches()).map((c) => ({ text: c.brand.nameAr, data: `ap:v:${c.id}` }))])];
    case 'store': return [msg(chatId, `${n} · اسم المتجر؟ (اكتبه)`)];
    case 'instagram': return [msg(chatId, `${n} · لينك أو يوزر الإنستجرام (للتحقق بس)`)];
    case 'governorate': return [msg(chatId, `${n} · محافظتك؟ (عشان مندوب بوسطة ييجي يستلم من عندك)`, [row(['القاهرة', 'ap:v:القاهرة'], ['الجيزة', 'ap:v:الجيزة']), row(['الإسكندرية', 'ap:v:الإسكندرية'], ['محافظة تانية (اكتبها)', 'ap:v:other'])])];
    case 'area': return [msg(chatId, `${n} · المنطقة؟ (مثلاً: مدينة نصر)`)];
    case 'photos': return [msg(chatId, `${n} · ابعت 3 صور لمنتجاتك`)];
    case 'capacity': return [msg(chatId, `${n} · تقدر تشحن كام قطعة في الأسبوع؟`, [row(['أقل من 10', 'ap:v:<10'], ['10–25', 'ap:v:10-25'], ['أكتر من 25', 'ap:v:25+'])])];
    case 'instapay': return [msg(chatId, `${n} · رقم إنستاباي أو المحفظة اللي هنحولك عليه`)];
    case 'agree': {
      const cfg = getNiche(s.data.niche)!;
      const pct = (x: number) => `${Math.round(x * 100)}٪`;
      return [msg(chatId, `${n} · ملخص الاتفاق:\n• العمولة: ${pct(cfg.commission.new)} على العميل الجديد اللي ${cfg.brand.nameAr} بتجيبه، ${pct(cfg.commission.repeat)} على العميل الراجع، ${pct(cfg.commission.referral)} على عملائك اللي بتبعتهم بكودك\n• فلوسك كل خميس، وبنحجز ${pct(cfg.reserve.percent)} كضمان لمدة ${cfg.reserve.days} يوم\n• تسليم للمندوب خلال 48 ساعة\n• نفس سعر الإنستجرام (ممنوع أرخص بره)\n• ممنوع التواصل مع عملاء ${cfg.brand.nameAr} لأي بيع مباشر. المخالفة = خصم الضمان وإيقاف الحساب`, [row(['✅ موافق على الشروط', 'ap:v:agree'])])];
    }
  }
}

async function applyStep(m: Incoming, s: Extract<Session, { flow: 'apply' }>, ctx: Ctx, choice?: string): Promise<Outgoing[]> {
  const id = m.chatId;
  const text = m.text?.trim() ?? '';
  const step = APPLY_STEPS[s.step];
  const retry = (why: string) => [msg(id, why), ...applyAsk(id, s)];
  switch (step) {
    case 'niche': if (!choice || !getNiche(choice)) return retry('اختار من الأزرار.'); s.data.niche = choice; break;
    case 'store': if (text.length < 2) return retry('اكتب اسم المتجر.'); s.data.store = text.slice(0, 60); break;
    case 'instagram': if (!/^@?[\w.]{2,30}$|instagram\.com\//i.test(text)) return retry('اكتب اليوزر بالشكل ده: @store.name'); s.data.instagram = text.startsWith('@') || text.includes('/') ? text : `@${text}`; break;
    case 'governorate':
      if (choice === 'other') return [msg(id, 'اكتب اسم المحافظة.')];
      if (choice) s.data.governorate = choice;
      else if (GOVERNORATES.includes(text)) s.data.governorate = text;
      else return retry('مش لاقيين المحافظة دي. اكتبها زي ما هي، مثلاً: الدقهلية');
      break;
    case 'area': if (text.length < 2) return retry('اكتب المنطقة.'); s.data.area = text.slice(0, 60); break;
    case 'photos': if (!m.photos) return retry('محتاجين صور، مش كلام 🙂'); s.data.photos = String(m.photos); break;
    case 'capacity': if (!choice) return retry('اختار من الأزرار.'); s.data.capacity = choice; break;
    case 'instapay': { const p = normalizeEgyptPhone(text); if (!p) return retry('الرقم لازم يكون 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015.'); s.data.instapay = p; break; }
    case 'agree': {
      if (choice !== 'agree') return retry('لازم توافق على الشروط عشان نكمل.');
      ctx.session = null;
      const newId = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      await saveSeller({ id: newId, niche: s.data.niche, telegramChatId: id, name: s.data.store, area: `${s.data.area}، ${s.data.governorate}`, rating: 0, status: 'applied', instagram: s.data.instagram, instapay: s.data.instapay, capacity: s.data.capacity });
      return [msg(id, 'اتبعت طلبك للمراجعة ✅\nهنراجع الإنستجرام بتاعك، وهنعمل طلب تجريبي من عندك، ونرد عليك خلال 48 ساعة.')];
    }
  }
  s.step++;
  return applyAsk(id, s);
}

/** Called from the admin panel when a seller is approved. */
export async function approveSeller(sellerId: string): Promise<Outgoing[]> {
  const found = (await catalog()).sellerById(sellerId);
  if (!found || found.status !== 'applied') return [];
  const s = { ...structuredClone(found), status: 'active' as const };
  await saveSeller(s);
  if (!s.telegramChatId) return [];
  return [msg(s.telegramChatId, `🎉 مبروك! اتقبلت في ${getNiche(s.niche)?.brand.nameAr ?? 'المنصة'}.\nضيف أول منتج من القايمة تحت. أول تحويل ليك هيكون الخميس اللي بعد أول طلب يتسلم.`, undefined, { keyboard: MENU })];
}

// ---------- add product ----------
function startAdd(seller: Seller, ctx: Ctx): Outgoing[] {
  const cfg = getNiche(seller.niche)!;
  const attrs = cfg.attributes.required.filter((a) => !VARIANT_ATTRS.includes(a));
  const s: Session = { flow: 'add', step: 0, niche: cfg.id, data: {}, variants: [], attrs, attrIndex: 0, values: {}, photos: 0 };
  ctx.session = s;
  return [msg(seller.telegramChatId!, 'يلا 👌 المنتج ده في أنهي قسم؟', [cfg.categories.map((c) => ({ text: c.labelAr, data: `ad:v:${c.id}` }))])];
}

const ADD_STEPS = ['category', 'photos', 'name', 'price', 'variants', 'stock', 'attrs', 'preview'] as const;

function addAsk(chatId: number, s: Extract<Session, { flow: 'add' }>): Outgoing[] {
  const cfg = getNiche(s.niche)!;
  switch (ADD_STEPS[s.step]) {
    case 'photos': return [msg(chatId, 'ابعت من 1 لـ 5 صور للمنتج على خلفية فاتحة.')];
    case 'name': return [msg(chatId, 'اسم المنتج؟ (مثلاً: عباية كتان — زيتي)')];
    case 'price': return [msg(chatId, 'السعر للعميل بالجنيه؟\nلازم يكون نفس سعر الإنستجرام بالظبط.')];
    case 'variants': return [msg(chatId, 'المتاح منه إيه؟ اختار، أو اكتبهم مفصولين بمسافة.', [(VARIANT_PRESETS[cfg.id] ?? []).map(([label], i) => ({ text: label, data: `ad:v:preset${i}` }))])];
    case 'stock': return [msg(chatId, `كام قطعة متاحة من كل نوع؟ (${s.variants.join('، ')})`, [row(['3', 'ad:v:3'], ['5', 'ad:v:5'], ['10', 'ad:v:10'])])];
    case 'attrs': {
      const key = s.attrs[s.attrIndex];
      const a = ATTR[key] ?? { label: key };
      return [msg(chatId, `${s.attrIndex + 1}/${s.attrs.length} · ${a.label}؟`, a.choices ? [a.choices.map((c) => ({ text: c, data: `ad:v:${c}` }))] : undefined)];
    }
    case 'preview': {
      const lines = s.attrs.map((k) => `• ${ATTR[k]?.label.split(' (')[0] ?? k}: ${s.values[k]}`).join('\n');
      return [msg(chatId, `✨ جاهز للمراجعة:\n${s.data.name}\n💰 سعر العميل: ${egp(Number(s.data.price))}\n${shareText(cfg, Number(s.data.price))}\nالمتاح: ${s.variants.join('، ')} (${s.data.stock} من كل نوع)\n${lines}`, [row(['✅ ابعته للمراجعة', 'ad:publish'], ['❌ الغي', 'ad:cancel'])])];
    }
    default: return [];
  }
}

async function addStep(m: Incoming, seller: Seller, s: Extract<Session, { flow: 'add' }>, ctx: Ctx, choice?: string): Promise<Outgoing[]> {
  const id = seller.telegramChatId!;
  const cfg = getNiche(s.niche)!;
  const text = m.text?.trim() ?? '';
  const retry = (why: string) => [msg(id, why), ...addAsk(id, s)];
  if (choice === 'cancel') { ctx.session = null; return [msg(id, 'تمام، لغيناه.', undefined, { keyboard: MENU })]; }
  switch (ADD_STEPS[s.step]) {
    case 'category': if (!choice || !cfg.categories.some((c) => c.id === choice)) return [msg(id, 'اختار القسم من الأزرار.')]; s.data.category = choice; break;
    case 'photos': if (!m.photos) return retry('محتاجين صور المنتج.'); s.photos = m.photos; break;
    case 'name': if (text.length < 4) return retry('الاسم قصير أوي.'); s.data.name = text.slice(0, 80); break;
    case 'price': { const p = Number(text.replace(/[^\d.]/g, '')); if (!(p >= 10 && p <= 100000)) return retry('اكتب السعر رقم بس، مثلاً: 850'); s.data.price = String(Math.round(p)); break; }
    case 'variants': {
      const preset = choice?.startsWith('preset') ? VARIANT_PRESETS[cfg.id]?.at(Number(choice.slice(6)))?.[1] : null;
      const list = preset ?? text.split(/[\s,،]+/).filter(Boolean).slice(0, 8);
      if (!list.length) return retry('اختار أو اكتب المتاح.');
      s.variants = list;
      break;
    }
    case 'stock': { const n = Number(choice ?? text.replace(/[^\d]/g, '')); if (!(n >= 0 && n <= 999)) return retry('اكتب رقم.'); s.data.stock = String(n); break; }
    case 'attrs': {
      const key = s.attrs[s.attrIndex];
      let v = choice ?? text;
      if (key === 'roast_date') v = v === 'النهارده' ? new Date().toISOString().slice(0, 10) : v === 'امبارح' ? new Date(Date.now() - 864e5).toISOString().slice(0, 10) : v;
      if (key === 'roast_date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) return retry('اكتب التاريخ كده: 2026-11-10، أو اختار من الأزرار.');
      if (!v || v.length > 120) return retry('محتاجين إجابة قصيرة.');
      s.values[key] = v;
      s.attrIndex++;
      if (s.attrIndex < s.attrs.length) return addAsk(id, s);
      break;
    }
    case 'preview': {
      if (choice !== 'publish') return addAsk(id, s);
      ctx.session = null;
      const pid = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
      const attributes = Object.fromEntries(s.attrs.map((k) => [ATTR[k]?.label.split(' (')[0] ?? k, s.values[k]]));
      const product: Product = {
        id: pid, niche: cfg.id, slug: `${cfg.id}-${pid}`, sellerId: seller.id, category: s.data.category,
        art: cfg.id === 'coffee' ? (s.data.category === 'tools' ? 'tool' : 'bag') : (['abaya', 'niqab', 'khimar', 'hijab', 'ihram'].includes(s.data.category) ? s.data.category as Product['art'] : 'abaya'),
        color: '#B9A98F', nameAr: s.data.name, leadAr: `${s.data.name}. ${Object.entries(attributes).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join('، ')}.`,
        price: Number(s.data.price), attributes, variants: s.variants.map((label) => ({ label, stock: Number(s.data.stock) })),
        status: 'review', priceConfirmedAt: new Date().toISOString(), views: 0, reviews: [], faq: [],
      };
      await saveProduct(product);
      return [msg(id, `اتبعت للمراجعة ✅ فريق ${cfg.brand.nameAr} هيراجع الصور والسعر، وهنبلغك أول ما يتنشر.`, undefined, { keyboard: MENU })];
    }
  }
  s.step++;
  return addAsk(id, s);
}

/** Called from the admin panel when a product is approved. */
export async function approveProduct(productId: string): Promise<Outgoing[]> {
  const cat = await catalog();
  const found = cat.productById(productId);
  const s = found && cat.sellerById(found.sellerId);
  if (!found || !s || found.status !== 'review') return [];
  const p = { ...structuredClone(found), status: 'live' as const };
  await saveProduct(p);
  return s.telegramChatId ? [msg(s.telegramChatId, `🎉 "${p.nameAr}" اتنشر على ${getNiche(p.niche)?.brand.domain}/p/${p.slug}`)] : [];
}

// ---------- orders ----------
/** New-order messages for every seller in an order (sent when the customer confirms). */
export function notifyOrder(o: Order, cat: Catalog): Outgoing[] {
  const cfg = getNiche(o.niche)!;
  const tag = { new: `عميل جديد من ${cfg.brand.nameAr}`, repeat: 'عميل راجع' }[o.type];
  return Object.keys(o.sellerState).flatMap((sid) => {
    const s = cat.sellerById(sid);
    if (!s?.telegramChatId) return [];
    const items = itemsOfSeller(o, sid);
    const share = items.reduce((a, i) => a + i.unitPrice * i.qty * (1 - cfg.commission[o.type]), 0);
    const multi = Object.keys(o.sellerState).length > 1 ? ' (جزء من طلب فيه أكتر من بائع)' : '';
    return [msg(s.telegramChatId, `🔔 طلب جديد #${o.id}${multi}\n${items.map((i) => `• ${i.name} | ${i.variant} | × ${i.qty}`).join('\n')}\nالعميل: ${o.customer.name.split(' ')[0]} — ${o.customer.governorate}\nالاستلام: بكرة من 12 لـ 4\nنصيبك: ${egp(share)} (${tag})`, [row(['✅ قبول', `acc:${o.id}`], ['❌ مش متاح', `rej:${o.id}`])])];
  });
}

async function orderButton(seller: Seller, k: string, orderId: number, cat: Catalog): Promise<Outgoing[]> {
  const id = seller.telegramChatId!;
  const current = await store().getOrder(orderId);
  if (!current || !(seller.id in current.sellerState)) return [msg(id, 'الطلب ده مش موجود.')];
  const part = k === 'acc' ? 'accepted' : k === 'rej' ? 'rejected' : 'handed';
  const o = await mutateOrder(orderId, (x) => applySellerPart(x, seller.id, part));
  if (k === 'acc') {
    if (!o) return [msg(id, `الطلب #${orderId} اتعامل معاه قبل كده.`)];
    queueShipment(o.id, seller.id);
    return [
      msg(id, `البوليصة جاية في الرسالة الجاية 📄\nاطبعها والزقها على كيس ${getNiche(o.niche)?.brand.nameAr} 🛍️\nمندوب بوسطة جاي بكرة من 12 لـ 4.\nبيانات العميل على البوليصة بس، وممنوع استخدامها لأي حاجة غير الشحن.`, [row(['📦 سلمت للمندوب', `hand:${o.id}`])]),
    ];
  }
  if (k === 'rej') {
    if (!o) return [msg(id, `الطلب #${orderId} اتعامل معاه قبل كده.`)];
    const out: Outgoing[] = [];
    for (const it of itemsOfSeller(o, seller.id)) {
      const found = cat.productById(it.productId);
      const p = found ? structuredClone(found) : null;
      const vi = p?.variants.findIndex((v) => v.label === it.variant) ?? -1;
      if (p && vi >= 0) {
        p.variants[vi].stock = 0;
        await saveProduct(p);
        out.push(msg(id, `خفينا "${p.nameAr} · ${it.variant}" لحد ما يرجع متاح.`, [row(['رجع متاح (5 قطع)', `stk:${p.id}:${vi}:5`])]));
      }
    }
    return [msg(id, `تمام. فريقنا هيكلم العميل بخصوص الطلب #${o.id}.\nالرفض بيأثر على ترتيبك، فحدّث المخزون أول بأول.`), ...out];
  }
  if (!o) return [msg(id, `لازم تقبل الطلب #${orderId} الأول.`)];
  return [msg(id, `تمام 👌 الطلب #${o.id} مع بوسطة. هنبلغك أول ما يتسلم.`)];
}

async function openOrders(seller: Seller): Promise<Outgoing[]> {
  const label = { pending: 'مستني قبولك', accepted: 'البوليصة جاهزة', handed: 'مع المندوب', rejected: 'اترفض' } as const;
  const open = (await store().listOrders({ sellerId: seller.id, statuses: ['confirmed', 'accepted', 'picked'], limit: 50 })).filter((o) => o.sellerState[seller.id] !== 'rejected');
  if (!open.length) return [msg(seller.telegramChatId!, 'مفيش طلبات مفتوحة دلوقتي.', undefined, { keyboard: MENU })];
  return open.map((o) => {
    const part = o.sellerState[seller.id];
    const btns = part === 'pending' ? [row(['✅ قبول', `acc:${o.id}`], ['❌ مش متاح', `rej:${o.id}`])] : part === 'accepted' ? [row(['📦 سلمت للمندوب', `hand:${o.id}`])] : undefined;
    return msg(seller.telegramChatId!, `#${o.id} · ${itemsOfSeller(o, seller.id).map((i) => `${i.name} (${i.variant}) × ${i.qty}`).join('، ')}\n${label[part]}`, btns);
  });
}

async function stats(seller: Seller, cat: Catalog): Promise<Outgoing[]> {
  const mine = cat.products.filter((p) => p.sellerId === seller.id);
  const week = new Date(Date.now() - 7 * 864e5).toISOString();
  // Ranking by the last 30 days of sales in this niche.
  const recent = (await store().listOrders({ niche: seller.niche, since: new Date(Date.now() - 30 * 864e5).toISOString(), limit: 5000 })).filter((o) => o.status !== 'cancelled');
  const orders = recent.filter((o) => seller.id in o.sellerState && o.createdAt >= week);
  const totals = new Map<string, number>();
  for (const o of recent) for (const i of o.items) totals.set(i.sellerId, (totals.get(i.sellerId) ?? 0) + i.unitPrice * i.qty);
  const sales = (sid: string) => totals.get(sid) ?? 0;
  const peers = cat.sellers.filter((s) => s.niche === seller.niche && ['active', 'warning'].includes(s.status)).sort((a, b) => sales(b.id) - sales(a.id));
  const low = mine.flatMap((p) => p.variants.filter((v) => v.stock > 0 && v.stock <= 3).map((v) => `${p.nameAr} · ${v.label} (فاضل ${v.stock})`));
  return [msg(seller.telegramChatId!, `📊 آخر 7 أيام\n👀 مشاهدات منتجاتك: ${mine.reduce((a, p) => a + p.views, 0).toLocaleString('en-US')}\n🛒 طلبات: ${orders.length}\n⭐ تقييمك: ${seller.rating || '—'}\n🏆 ترتيبك: ${peers.findIndex((s) => s.id === seller.id) + 1} من ${peers.length}${low.length ? `\n⚠️ مخزون قليل:\n${low.map((l) => `• ${l}`).join('\n')}` : ''}`, undefined, { keyboard: MENU })];
}

async function payout(seller: Seller): Promise<Outgoing[]> {
  const cfg = getNiche(seller.niche)!;
  const since = lastThursday();
  const delivered = await store().listOrders({ sellerId: seller.id, statuses: ['delivered'], limit: 100000 });
  const cycle = sellerPayout(seller.id, delivered.filter((o) => o.deliveredAt && Date.parse(o.deliveredAt) >= since.getTime()).map(money), cfg);
  const all = sellerPayout(seller.id, delivered.map(money), cfg);
  const next = new Date(since); next.setDate(next.getDate() + 7);
  const day = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' }).format(next);
  return [msg(seller.telegramChatId!, `💰 فلوسك\nمستحق ${day}: ${egp(cycle.payable)}\n(مبيعات اتسلمت ${egp(cycle.sales)} − عمولة ${egp(cycle.commission)} − ضمان ${egp(cycle.reserve)})\nمحجوز كضمان (${Math.round(cfg.reserve.percent * 100)}٪ لمدة ${cfg.reserve.days} يوم): ${egp(all.reserve)}${seller.instapay ? `\nالتحويل على: ${seller.instapay.slice(0, 3)}••••${seller.instapay.slice(-4)}` : ''}`, undefined, { keyboard: MENU })];
}

function priceCheck(seller: Seller, cat: Catalog): Outgoing[] {
  const live = cat.products.filter((p) => p.sellerId === seller.id && (p.status ?? 'live') === 'live');
  if (!live.length) return [msg(seller.telegramChatId!, 'مفيش منتجات منشورة لسه.')];
  return [msg(seller.telegramChatId!, `🔎 مراجعة الأسعار (كل أسبوعين):\n${live.map((p) => `• ${p.nameAr}: ${egp(p.price)}`).join('\n')}\nالأسعار دي لسه زي الإنستجرام؟`, [row(['✅ أيوه كلها', 'pok'])])];
}
