// Forgiving search for the admin: Arabic spelling variants, Arabic or Latin digits,
// phone numbers with or without +20 / the leading 0, words in any order.

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export function normalizeText(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[ً-ْـ]/g, '') // tashkeel and tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Digits of a phone in local form: "+20 110 920 0150" → "01109200150". */
export const phoneDigits = (s: string) => normalizeText(s).replace(/\D/g, '').replace(/^20(?=1\d{9}$)/, '0').replace(/^(?=1\d{9}$)/, '0');

/** True when every word of the query is found in the name/area text, or the digits are part of the phone. */
export function matches(query: string, item: { text: string; phone?: string }): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const digits = q.replace(/\D/g, '');
  if (item.phone && digits.length >= 3 && digits.length === q.replace(/[\s+-]/g, '').length) {
    const p = phoneDigits(item.phone);
    return p.includes(digits.replace(/^20(?=1)/, '0')) || p.includes(digits.replace(/^0/, ''));
  }
  const text = normalizeText(item.text);
  return q.split(' ').every((w) => text.includes(w));
}
