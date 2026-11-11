// Delivery estimate shown on product, checkout and order pages.
export const GOVERNORATES = [
  'القاهرة', 'الجيزة', 'القليوبية', 'الإسكندرية', 'الدقهلية', 'الغربية', 'الشرقية', 'المنوفية',
  'البحيرة', 'كفر الشيخ', 'دمياط', 'بورسعيد', 'الإسماعيلية', 'السويس', 'الفيوم', 'بني سويف',
  'المنيا', 'أسيوط', 'سوهاج', 'قنا', 'الأقصر', 'أسوان', 'البحر الأحمر', 'مطروح',
];
const FAST = new Set(['القاهرة', 'الجيزة', 'القليوبية']);

/** Business days to deliver; Friday is skipped. */
export function etaDate(governorate: string, from = new Date()): Date {
  let days = FAST.has(governorate) ? 2 : 3;
  const d = new Date(from);
  while (days > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 5) days--;
  }
  return d;
}

export const etaLabel = (governorate: string, from?: Date) =>
  new Intl.DateTimeFormat('ar-EG-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Cairo' }).format(etaDate(governorate, from));

export const egp = (n: number) => `${Math.round(n).toLocaleString('en-US')} ج`;
