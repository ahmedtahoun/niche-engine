// Cairo Roast's first roaster: Bonds Coffee Roasters, and the coffees we sell.
// Customers buy through Cairo Roast only: no seller Instagram, phone, address or location on the store.
// Prices: Ahmed's retail price list (2026-11-12), the price for 1 kg; 250 g is a quarter of it.
// Cost (what Bonds charges us) is private and never in this public repository: it lives in
// seeds/costs.local.json (git-ignored) and reaches Supabase through supabase/seed/coffee-costs.local.sql.
// Bonds is then paid exactly the cost on each delivered item; Cairo Roast keeps the difference.
// Tasting notes, region, variety and process: printed on Bonds' bag labels (photos in
// public/products/coffee); Limu from Bonds' own listing; Colombia from its bag label (photo
// 2026-11-12). El Salvador's notes aren't readable on the photo yet: ask Bonds, then fill them in.
// Used by the dev demo store and by scripts/seed-sql.ts, which writes the SQL
// that loads the same rows into Supabase. Stock is a starting figure: update it in /admin.
import type { Product, Seller, Variant } from '../types.ts';

export const BONDS: Seller = {
  id: 'bonds',
  niche: 'coffee',
  name: 'بوندز لتحميص القهوة',
  nameEn: 'Bonds Coffee Roasters',
  about: {
    ar: 'محمصة قهوة مختصة وشريك محمصة القاهرة. بتحمص بلندات وقهوة أحادية المصدر من إثيوبيا والبرازيل وكولومبيا والسلفادور، وكل كيس بيوصلك عن طريقنا مقفول وأصلي.',
    en: 'A specialty coffee roaster and Cairo Roast partner. They roast blends and single origins from Ethiopia, Brazil, Colombia and El Salvador, and every bag reaches you through us, sealed and original.',
  },
  area: 'القاهرة',
  rating: 0,
  status: 'active',
  logo: '/sellers/bonds/mark.webp',
  governorate: 'القاهرة',
};

const weights = (p1000: number, stock = 20): Variant[] => [
  // 250 g = a quarter of the kilo price (Bonds' own rule on their listings).
  { label: '250 جم', labelEn: '250 g', stock, price: Math.round(p1000 / 4), opts: { weight: '250 جم' } },
  { label: '1 كجم', labelEn: '1 kg', stock, price: p1000, opts: { weight: '1 كجم' } },
];

const FAQ: [string, string][] = [
  ['مين بيحمص القهوة؟', 'بوندز لتحميص القهوة، شريكنا. القهوة جاية من المحمصة على طول، أصلية ومقفولة.'],
  ['حبوب ولا مطحونة؟', 'زي ما تحب: اختار طريقة التحضير وإحنا نطحنها بعد طلبك، من ناعم جداً للكنكة لخشن للفرنش بريس. ولو عندك مطحنة اختار حبوب كاملة.'],
  ['أحفظها إزاي؟', 'في الكيس مقفول، في مكان ناشف بعيد عن الشمس والتلاجة. أحلى طعم خلال 4 أسابيع من الفتح.'],
];
const FAQ_EN: [string, string][] = [
  ['Who roasts the coffee?', 'Bonds Coffee Roasters, our partner. The coffee comes straight from the roastery, original and sealed.'],
  ['Beans or ground?', 'Your choice: pick how you brew and we grind it after you order, from extra fine for the kanaka to coarse for a French press. Have a grinder? Choose whole beans.'],
  ['How do I store it?', 'In the closed bag, somewhere dry, away from sunlight and the fridge. Best within 4 weeks of opening.'],
];

type En = { name: string; lead: string; attributes: Record<string, string> };
// Profile values come only from what Bonds states (body and acidity for the blends; notes for all). No roast level: Bonds doesn't publish it.
const photosOf = (o: { photo?: string; photos?: string[] }) => {
  const names = o.photos ?? (o.photo ? [o.photo] : []);
  return names.length ? { images: names.map((x) => `/products/coffee/${x}.webp`) } : {};
};

const coffee = (o: Pick<Product, 'slug' | 'category' | 'color' | 'nameAr' | 'leadAr' | 'attributes' | 'profile'> & { kg: number; photo?: string; photos?: string[]; en: En }): Product => ({
  id: o.slug, niche: 'coffee', slug: o.slug, sellerId: BONDS.id, category: o.category, art: 'coffee', color: o.color,
  nameAr: o.nameAr, leadAr: o.leadAr, price: Math.round(o.kg / 4), attributes: { ...o.attributes, 'الشكل': 'حبوب أو مطحونة على طلبك' },
  variants: weights(o.kg), status: 'live', views: 0, reviews: [], faq: FAQ,
  en: { name: o.en.name, lead: o.en.lead, attributes: { ...o.en.attributes, Form: 'Whole beans or ground to order' }, faq: FAQ_EN },
  ...(o.profile ? { profile: o.profile } : {}),
  ...photosOf(o),
});

export const BONDS_PRODUCTS: Product[] = [
  coffee({
    slug: 'bonds-chrome', category: 'blends', color: '#7C8B5A', nameAr: 'قهوة كروم بلند', kg: 900, photo: 'chrome',
    profile: { notes: ['كراميل', 'شوكولاتة داكنة', 'مكسرات محمصة'], notesEn: ['Caramel', 'Dark chocolate', 'Roasted nuts'], family: 'chocolate', scales: { body: 5, acidity: 2 } },
    leadAr: 'بلند بقوام غني وممتلئ وحموضة خفيفة: كراميل، شوكولاتة داكنة ومكسرات محمصة. حلوة سادة أو باللبن.',
    attributes: { 'النكهات': 'كراميل، شوكولاتة داكنة، مكسرات محمصة', 'القوام': 'غني وممتلئ', 'الحموضة': 'خفيفة', 'النوع': 'بلند' },
    en: { name: 'Chrome Blend', lead: 'A blend with a full, rich body and mild acidity: caramel, dark chocolate and roasted nuts. Great black or with milk.', attributes: { 'Tasting notes': 'Caramel, dark chocolate, roasted nuts', Body: 'Full and rich', Acidity: 'Mild', Type: 'Blend' } },
  }),
  coffee({
    slug: 'bonds-amber', category: 'blends', color: '#7C8B5A', nameAr: 'قهوة أمبر بلند', kg: 980, photo: 'amber',
    profile: { notes: ['شوكولاتة داكنة', 'عسل أسود', 'بندق محمص'], notesEn: ['Dark chocolate', 'Molasses', 'Roasted hazelnut'], family: 'chocolate', scales: { body: 4, acidity: 1 } },
    leadAr: 'بلند بحموضة منخفضة وقوام غني: شوكولاتة داكنة، عسل أسود وبندق محمص.',
    attributes: { 'النكهات': 'شوكولاتة داكنة، عسل أسود، بندق محمص', 'القوام': 'غني', 'الحموضة': 'منخفضة', 'النوع': 'بلند' },
    en: { name: 'Amber Blend', lead: 'A low-acidity blend with a rich body: dark chocolate, molasses and roasted hazelnut.', attributes: { 'Tasting notes': 'Dark chocolate, molasses, roasted hazelnut', Body: 'Rich', Acidity: 'Low', Type: 'Blend' } },
  }),
  coffee({
    slug: 'bonds-ethiopia-guji', category: 'single-origin', color: '#4F5A36', nameAr: 'إثيوبيا جوجي', kg: 2000, photos: ['ethiopia-guji', 'ethiopia-guji-roasting'],
    profile: { notes: ['توت', 'زهور', 'مشمش', 'زهر البرتقال'], notesEn: ['Berries', 'Floral', 'Apricot', 'Orange blossom'], family: 'fruity', scales: { body: 3, acidity: 3 } },
    leadAr: 'قهوة أحادية المصدر من جوجي هامبيلا في إثيوبيا، معالجة طبيعية: توت، زهور، مشمش وزهر البرتقال، بحموضة ناعمة وقوام رقيق ومدوّر.',
    attributes: { 'النكهات': 'توت، زهور، مشمش، زهر البرتقال', 'المنشأ': 'إثيوبيا · جوجي هامبيلا', 'السلالة': 'هيرلوم', 'المعالجة': 'طبيعية', 'الارتفاع': '1400–1800 متر', 'الحموضة': 'ناعمة', 'القوام': 'رقيق ومدوّر', 'النوع': 'أحادية المصدر' },
    en: { name: 'Ethiopia Guji', lead: 'Single-origin coffee from Guji Hambela, Ethiopia, natural process: berries, florals, apricot and orange blossom, with smooth acidity and a delicate, round body.', attributes: { 'Tasting notes': 'Berries, floral, apricot, orange blossom', Origin: 'Ethiopia · Guji Hambela', Variety: 'Heirloom', Process: 'Natural', Altitude: '1,400–1,800 m', Acidity: 'Smooth', Body: 'Delicate and round', Type: 'Single origin' } },
  }),
  coffee({
    slug: 'bonds-ethiopia-limu', category: 'single-origin', color: '#9A5B34', nameAr: 'إثيوبيا ليمو', kg: 1200, photos: ['ethiopia-limu', 'bonds-shelf'],
    profile: { notes: ['شوكولاتة داكنة', 'شاي أسود', 'برتقال'], notesEn: ['Dark chocolate', 'Black tea', 'Orange'], family: 'fruity' },
    leadAr: 'قهوة أحادية المصدر من ليمو في إثيوبيا، معالجة طبيعية: شوكولاتة داكنة، شاي أسود، سكر بني ولمسة برتقال.',
    attributes: { 'النكهات': 'شوكولاتة داكنة، مكسرات محمصة، شاي أسود، سكر بني، برتقال', 'المنشأ': 'إثيوبيا · ليمو', 'السلالة': 'هيرلوم', 'المعالجة': 'طبيعية', 'النوع': 'أحادية المصدر' },
    en: { name: 'Ethiopia Limu', lead: 'Single-origin coffee from Limu, Ethiopia, natural process: dark chocolate, black tea, brown sugar and a touch of orange.', attributes: { 'Tasting notes': 'Dark chocolate, roasted nuts, black tea, brown sugar, orange', Origin: 'Ethiopia · Limu', Variety: 'Heirloom', Process: 'Natural', Type: 'Single origin' } },
  }),
  coffee({
    slug: 'bonds-brazil-red-catuai', category: 'single-origin', color: '#B07D6E', nameAr: 'البرازيل ريد كاتواي', kg: 1300, photo: 'brazil-red-catuai',
    profile: { notes: ['بندق محمص', 'قصب السكر', 'عين جمل'], notesEn: ['Roasted hazelnut', 'Sugar cane', 'Walnut'], family: 'chocolate', scales: { body: 4, acidity: 1 } },
    leadAr: 'قهوة أحادية المصدر من موجيانا في البرازيل، سلالة ريد كاتواي ومعالجة طبيعية: بندق محمص، قصب السكر وعين جمل، بحموضة منخفضة وقوام كريمي.',
    attributes: { 'النكهات': 'بندق محمص، قصب السكر، عين جمل', 'المنشأ': 'البرازيل · موجيانا', 'السلالة': 'ريد كاتواي', 'المعالجة': 'طبيعية', 'الحموضة': 'منخفضة', 'القوام': 'كريمي', 'النوع': 'أحادية المصدر' },
    en: { name: 'Brazil Red Catuai', lead: 'Single-origin coffee from Mogiana, Brazil, Red Catuai variety, natural process: roasted hazelnut, sugar cane and walnut, with low acidity and a creamy body.', attributes: { 'Tasting notes': 'Roasted hazelnut, sugar cane, walnut', Origin: 'Brazil · Mogiana', Variety: 'Red Catuai', Process: 'Natural', Acidity: 'Low', Body: 'Creamy', Type: 'Single origin' } },
  }),
  coffee({
    slug: 'bonds-colombia-castillo', category: 'single-origin', color: '#6B4A33', nameAr: 'كولومبيا كاستيو', kg: 1500, photos: ['colombia-castillo', 'bonds-shelf'],
    profile: { notes: ['فواكه استوائية', 'كراميل باللبن', 'يوسفي', 'خشب البلوط'], notesEn: ['Tropical fruit', 'Milk caramel', 'Tangerine', 'Oak'], family: 'fruity' },
    leadAr: 'قهوة أحادية المصدر من فالي ديل كاوكا في كولومبيا، سلالة كاستيو: فواكه استوائية، كراميل باللبن، يوسفي ولمسة خشب البلوط.',
    attributes: { 'النكهات': 'فواكه استوائية، كراميل باللبن، يوسفي، خشب البلوط', 'المنشأ': 'كولومبيا · فالي ديل كاوكا', 'السلالة': 'كاستيو', 'النوع': 'أحادية المصدر' },
    en: { name: 'Colombia Castillo', lead: 'Single-origin coffee from Valle del Cauca, Colombia, Castillo variety: tropical fruit, milk caramel, tangerine and a touch of oak.', attributes: { 'Tasting notes': 'Tropical fruit, milk caramel, tangerine, oak', Origin: 'Colombia · Valle del Cauca', Variety: 'Castillo', Type: 'Single origin' } },
  }),
  coffee({
    slug: 'bonds-el-salvador', category: 'single-origin', color: '#5E3B25', nameAr: 'السلفادور سان أجوستين', kg: 1800, photo: 'el-salvador',
    leadAr: 'قهوة أحادية المصدر من سان أجوستين في السلفادور، من تحميص بوندز.',
    attributes: { 'المنشأ': 'السلفادور · سان أجوستين', 'النوع': 'أحادية المصدر' },
    en: { name: 'El Salvador San Agustín', lead: 'Single-origin coffee from San Agustín, El Salvador, roasted by Bonds.', attributes: { Origin: 'El Salvador · San Agustín', Type: 'Single origin' } },
  }),
];

/** Products sold before that are no longer on the list: hidden in Supabase by the seed SQL. */
export const BONDS_RETIRED = ['bonds-sienna', 'bonds-brazil-cerrado'];

/** Adds private wholesale costs (kg price per slug; 250 g at a quarter) to products, e.g. from costs.local.json. */
export function withCosts(products: Product[], costKg: Record<string, number>): Product[] {
  return products.map((p) => (costKg[p.slug] ? { ...p, cost: { '250 جم': Math.round(costKg[p.slug] / 4), '1 كجم': costKg[p.slug] } } : p));
}
