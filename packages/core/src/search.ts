// Arabic-aware search used by every niche's storefront.

/** أ/إ/آ→ا, ة→ه, ى→ي, strips diacritics and tatweel, lowercases Latin. */
export function normalizeArabic(text: string): string {
  return String(text)
    .toLowerCase()
    .replace(/[ً-ْٰـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function searchTerms(query: string, synonyms: Record<string, string>): string[] {
  return normalizeArabic(query)
    .split(' ')
    .filter(Boolean)
    .map((w) => synonyms[w] ?? w);
}

/** True when every term appears in the haystack (with or without the definite article "ال"). */
export function matches(haystack: string, terms: string[]): boolean {
  const hay = normalizeArabic(haystack);
  return terms.every((w) => hay.includes(w) || hay.includes(w.replace(/^ال/, '')));
}
