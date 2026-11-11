// Cairo Roast's first roaster: Bonds Coffee Roasters, and its five coffees.
// Source: Bonds' listings on shop.wheretospot.com (prices as of 2026-11-11).
// Used by the dev demo store and by scripts/seed-sql.ts, which writes the SQL
// that loads the same rows into Supabase. Stock is a starting figure: update it in /admin.
import type { Product, Seller, Variant } from '../types.ts';

export const BONDS: Seller = {
  id: 'bonds',
  niche: 'coffee',
  name: 'بوندز لتحميص القهوة',
  nameEn: 'Bonds Coffee Roasters',
  area: 'القاهرة',
  rating: 0,
  status: 'active',
  instagram: 'bondscoffeeroasters',
  governorate: 'القاهرة',
};

const weights = (p250: number, p1000: number, stock = 20): Variant[] => [
  { label: '250 جم', labelEn: '250 g', stock, price: p250, opts: { weight: '250 جم' } },
  { label: '1 كجم', labelEn: '1 kg', stock, price: p1000, opts: { weight: '1 كجم' } },
];

const FAQ: [string, string][] = [
  ['مين بيحمص القهوة؟', 'بوندز لتحميص القهوة، شريكنا. القهوة جاية من المحمصة على طول، أصلية ومقفولة.'],
  ['حبوب ولا مطحونة؟', 'حبوب كاملة، علشان تفضل طازة لحد ما تطحنها قبل التحضير.'],
  ['أحفظها إزاي؟', 'في الكيس مقفول، في مكان ناشف بعيد عن الشمس والتلاجة. أحلى طعم خلال 4 أسابيع من الفتح.'],
];
const FAQ_EN: [string, string][] = [
  ['Who roasts the coffee?', 'Bonds Coffee Roasters, our partner. The coffee comes straight from the roastery, original and sealed.'],
  ['Beans or ground?', 'Whole beans, so they stay fresh until you grind them just before brewing.'],
  ['How do I store it?', 'In the closed bag, somewhere dry, away from sunlight and the fridge. Best within 4 weeks of opening.'],
];

type En = { name: string; lead: string; attributes: Record<string, string> };
const coffee = (o: Pick<Product, 'slug' | 'category' | 'color' | 'nameAr' | 'leadAr' | 'attributes'> & { p: [number, number]; en: En }): Product => ({
  id: o.slug, niche: 'coffee', slug: o.slug, sellerId: BONDS.id, category: o.category, art: 'bag', color: o.color,
  nameAr: o.nameAr, leadAr: o.leadAr, price: o.p[0], attributes: { ...o.attributes, 'الشكل': 'حبوب كاملة' },
  variants: weights(o.p[0], o.p[1]), status: 'live', views: 0, reviews: [], faq: FAQ,
  en: { name: o.en.name, lead: o.en.lead, attributes: { ...o.en.attributes, Form: 'Whole beans' }, faq: FAQ_EN },
});

export const BONDS_PRODUCTS: Product[] = [
  coffee({
    slug: 'bonds-chrome', category: 'blends', color: '#6B4A33', nameAr: 'قهوة كروم بلند', p: [225, 900],
    leadAr: 'بلند بقوام غني وممتلئ وحموضة خفيفة: كراميل، شوكولاتة داكنة ومكسرات محمصة. حلوة سادة أو باللبن.',
    attributes: { 'النكهات': 'كراميل، شوكولاتة داكنة، مكسرات محمصة', 'القوام': 'غني وممتلئ', 'الحموضة': 'خفيفة', 'النوع': 'بلند' },
    en: { name: 'Chrome Blend', lead: 'A blend with a full, rich body and mild acidity: caramel, dark chocolate and roasted nuts. Great black or with milk.', attributes: { 'Tasting notes': 'Caramel, dark chocolate, roasted nuts', Body: 'Full and rich', Acidity: 'Mild', Type: 'Blend' } },
  }),
  coffee({
    slug: 'bonds-amber', category: 'blends', color: '#7A4B2A', nameAr: 'قهوة أمبر بلند', p: [255, 1020],
    leadAr: 'بلند بحموضة منخفضة وقوام غني: شوكولاتة داكنة، عسل أسود وبندق محمص.',
    attributes: { 'النكهات': 'شوكولاتة داكنة، عسل أسود، بندق محمص', 'القوام': 'غني', 'الحموضة': 'منخفضة', 'النوع': 'بلند' },
    en: { name: 'Amber Blend', lead: 'A low-acidity blend with a rich body: dark chocolate, molasses and roasted hazelnut.', attributes: { 'Tasting notes': 'Dark chocolate, molasses, roasted hazelnut', Body: 'Rich', Acidity: 'Low', Type: 'Blend' } },
  }),
  coffee({
    slug: 'bonds-sienna', category: 'blends', color: '#8C5A3C', nameAr: 'قهوة سيينا بلند', p: [269, 1074],
    leadAr: 'بلند ناعم بحموضة منخفضة وقوام متوسط: سكر بني، كاكاو ومكسرات محمصة.',
    attributes: { 'النكهات': 'سكر بني، كاكاو، مكسرات محمصة', 'القوام': 'متوسط', 'الحموضة': 'منخفضة', 'النوع': 'بلند' },
    en: { name: 'Sienna Blend', lead: 'A smooth, low-acidity blend with a medium body: brown sugar, cocoa and roasted nuts.', attributes: { 'Tasting notes': 'Brown sugar, cocoa, roasted nuts', Body: 'Medium', Acidity: 'Low', Type: 'Blend' } },
  }),
  coffee({
    slug: 'bonds-ethiopia-limu', category: 'single-origin', color: '#9A5B34', nameAr: 'إثيوبيا ليمو', p: [285, 1140],
    leadAr: 'قهوة أحادية المصدر من ليمو في إثيوبيا، معالجة طبيعية: شوكولاتة داكنة، شاي أسود، سكر بني ولمسة برتقال.',
    attributes: { 'النكهات': 'شوكولاتة داكنة، مكسرات محمصة، شاي أسود، سكر بني، برتقال', 'المنشأ': 'إثيوبيا · ليمو', 'السلالة': 'هيرلوم', 'المعالجة': 'طبيعية', 'النوع': 'أحادية المصدر' },
    en: { name: 'Ethiopia Limu', lead: 'Single-origin coffee from Limu, Ethiopia, natural process: dark chocolate, black tea, brown sugar and a touch of orange.', attributes: { 'Tasting notes': 'Dark chocolate, roasted nuts, black tea, brown sugar, orange', Origin: 'Ethiopia · Limu', Variety: 'Heirloom', Process: 'Natural', Type: 'Single origin' } },
  }),
  coffee({
    slug: 'bonds-brazil-cerrado', category: 'single-origin', color: '#5E3B25', nameAr: 'البرازيل سيرادو', p: [297, 1188],
    leadAr: 'قهوة أحادية المصدر من سيرادو في البرازيل، معالجة طبيعية: توفي، شوكولاتة داكنة، بندق وشراب القيقب.',
    attributes: { 'النكهات': 'توفي، شوكولاتة داكنة، بندق، شراب القيقب', 'المنشأ': 'البرازيل · سيرادو', 'السلالة': 'كاتواي', 'المعالجة': 'طبيعية', 'النوع': 'أحادية المصدر' },
    en: { name: 'Brazil Cerrado', lead: 'Single-origin coffee from Cerrado, Brazil, natural process: toffee, dark chocolate, hazelnut and maple syrup.', attributes: { 'Tasting notes': 'Toffee, dark chocolate, hazelnut, maple syrup', Origin: 'Brazil · Cerrado', Variety: 'Catuai', Process: 'Natural', Type: 'Single origin' } },
  }),
];
