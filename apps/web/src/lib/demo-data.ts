// DEMO DATA ONLY. Replaced by Supabase reads once the keys are in place.
import type { Product, Seller } from './types.ts';
import { existsSync, readFileSync } from 'node:fs';
import { BONDS, BONDS_PRODUCTS, withCosts } from './seeds/bonds.ts';

// Private wholesale costs, when the local file exists (git-ignored; the demo works without it).
const COSTS_FILE = new URL('./seeds/costs.local.json', import.meta.url);
const costKg: Record<string, number> = (() => { try { return existsSync(COSTS_FILE) ? JSON.parse(readFileSync(COSTS_FILE, 'utf8')) : {}; } catch { return {}; } })();

const v = (o: Record<string, number>) => Object.entries(o).map(([label, stock]) => ({ label, stock }));

export const SELLERS: Seller[] = [
  { id: 's1', telegramChatId: 1001, niche: 'umrah', name: 'بيت سارة للعبايات', area: 'مدينة نصر، القاهرة', rating: 4.8, status: 'active' },
  { id: 's2', telegramChatId: 1002, niche: 'umrah', name: 'نقاب الهدى', area: 'المنصورة', rating: 4.6, status: 'active' },
  { id: 's3', telegramChatId: 1003, niche: 'umrah', name: 'استوديو طرحة', area: 'الإسكندرية', rating: 4.9, status: 'active' },
  { id: 's4', telegramChatId: 1004, niche: 'umrah', name: 'إحرام مكة', area: 'الجيزة', rating: 4.2, status: 'warning' },
  { ...BONDS, telegramChatId: 1005 },
];

const ABAYA_FAQ: [string, string][] = [
  ['العباية دي مناسبة للعمرة في الحر؟', 'أيوه، القماش خفيف وبيسمح بالتهوية، وواسعة ومش بتحدد الجسم.'],
  ['أختار مقاس إيه؟', 'استخدمي "اعرفي مقاسك" فوق، أو جدول المقاسات بالسنتيمتر. ولو طلع مش مظبوط الاستبدال مجاني.'],
];

export const PRODUCTS: Product[] = [
  // ---------- Umrah ----------
  { id: 'p1', niche: 'umrah', slug: 'crepe-umrah-abaya-beige', sellerId: 's1', category: 'abaya', art: 'abaya', color: '#D8C6A6',
    nameAr: 'عباية عمرة كريب — بيج', leadAr: 'عباية كريب واسعة ومريحة للعمرة في الجو الحر، غير شفافة، ومتاحة من مقاس 1 لـ 4.', price: 850,
    attributes: { 'القماش': 'كريب مطفي', 'اللون': 'بيج', 'الطول': '140 سم (مقاس 2)', 'الشفافية': 'غير شفافة' }, variants: v({ '1': 5, '2': 2, '3': 6, '4': 3 }), views: 1840,
    reviews: [{ name: 'هبة', tags: ['طولي 162 سم', 'مقاس 2', 'المقاس مظبوط'], text: 'القماش مريح جداً في الحر ومش شفاف خالص.' }, { name: 'رحاب', tags: ['طولي 170 سم', 'مقاس 3', 'طويلة سنة'], text: 'التقفيل نضيف، طولها مناسب مع الشوز.' }], faq: ABAYA_FAQ },
  { id: 'p2', niche: 'umrah', slug: 'black-nada-abaya', sellerId: 's1', category: 'abaya', art: 'abaya', color: '#26292D',
    nameAr: 'عباية ندى سوداء — قصة كلوش', leadAr: 'عباية سوداء بقصة كلوش واسعة، قماش ندى تقيل ومبيكسرش، تنفع للعمرة وللمناسبات.', price: 1150,
    attributes: { 'القماش': 'ندى ياباني', 'اللون': 'أسود', 'الطول': '142 سم (مقاس 2)', 'الشفافية': 'غير شفافة' }, variants: v({ '2': 4, '3': 4, '4': 2 }), views: 960,
    reviews: [{ name: 'دينا', tags: ['طولي 158 سم', 'مقاس 2', 'المقاس مظبوط'], text: 'شكلها شيك جداً وبتنزل حلو.' }], faq: ABAYA_FAQ },
  { id: 'p3', niche: 'umrah', slug: 'two-layer-niqab-black', sellerId: 's2', category: 'niqab', art: 'niqab', color: '#1E2022',
    nameAr: 'نقاب طبقتين — أسود', leadAr: 'نقاب بطبقتين خفيفين، الطبقة التانية بتنزل على العين، مريح للبس ساعات طويلة.', price: 220,
    attributes: { 'القماش': 'شيفون مزدوج', 'اللون': 'أسود', 'الطول': '60 سم', 'الشفافية': 'الطبقة التانية ساترة' }, variants: v({ 'مقاس واحد': 18 }), views: 1220,
    reviews: [{ name: 'آية', tags: ['مقاس واحد', 'مريح'], text: 'خفيف ومش بيكتم النفس.' }], faq: [['النقاب ده بيكتم في الحر؟', 'لأ، الشيفون المزدوج خفيف وبيسمح بالتنفس.']] },
  { id: 'p4', niche: 'umrah', slug: 'niqab-with-khimar-black', sellerId: 's2', category: 'niqab', art: 'niqab', color: '#2A2D30',
    nameAr: 'نقاب بالخمار — أسود', leadAr: 'نقاب متصل بخمار قصير، بيتلبس في ثواني ومش محتاج دبابيس، مناسب للطواف والسعي.', price: 380,
    attributes: { 'القماش': 'جيرسيه + شيفون', 'اللون': 'أسود', 'الطول': 'خمار 90 سم', 'الشفافية': 'غير شفاف' }, variants: v({ 'مقاس واحد': 9 }), views: 1460,
    reviews: [{ name: 'مريم', tags: ['مقاس واحد', 'ساتر'], text: 'سهل جداً في اللبس.' }], faq: [] },
  { id: 'p5', niche: 'umrah', slug: 'chiffon-hijab-sand', sellerId: 's3', category: 'hijab', art: 'hijab', color: '#CBBDA5',
    nameAr: 'طرحة شيفون — رملي', leadAr: 'طرحة شيفون خفيفة بلون رملي هادي، مقاس كبير 180 × 70 سم، بتتلف بسهولة.', price: 180,
    attributes: { 'القماش': 'شيفون كوري', 'اللون': 'رملي', 'المقاس': '180 × 70 سم', 'الشفافية': 'محتاجة بندانة' }, variants: v({ 'مقاس واحد': 30 }), views: 2210,
    reviews: [{ name: 'ريم', tags: ['مقاس واحد', 'مقاس كبير'], text: 'اللون زي الصورة بالظبط.' }], faq: [] },
  { id: 'p6', niche: 'umrah', slug: 'jersey-hijab-olive', sellerId: 's3', category: 'hijab', art: 'hijab', color: '#8D9B8A',
    nameAr: 'طرحة جيرسيه — زيتي فاتح', leadAr: 'طرحة جيرسيه قطن مش بتتزحلق، مناسبة لليوم الطويل وللسفر.', price: 160,
    attributes: { 'القماش': 'جيرسيه قطن', 'اللون': 'زيتي فاتح', 'المقاس': '170 × 60 سم', 'الشفافية': 'غير شفافة' }, variants: v({ 'مقاس واحد': 3 }), views: 1110,
    reviews: [], faq: [] },
  { id: 'p7', niche: 'umrah', slug: 'cotton-ihram-2pc', sellerId: 's4', category: 'ihram', art: 'ihram', color: '#F1F0E8',
    nameAr: 'إحرام قطن رجالي — قطعتين', leadAr: 'إحرام قطن فوطة بيشرب العرق، قطعتين مقاس كبير، مع شنطة قماش للحفظ.', price: 450,
    attributes: { 'القماش': 'قطن فوطة', 'المقاس': '2 × 110 × 220 سم' }, variants: v({ M: 8, L: 4 }), views: 640,
    reviews: [{ name: 'أم يوسف', tags: ['L', 'مظبوط'], text: 'القطن تقيل وبيشرب العرق.' }], faq: [] },

  // ---------- Coffee (Cairo Roast) ----------
  ...withCosts(BONDS_PRODUCTS, costKg),
];
