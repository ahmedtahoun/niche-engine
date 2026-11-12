/** Grams in an option label ("250 جم" → 250, "1 كجم" → 1000), else null. */
export function gramsOf(label: string): number | null {
  const kg = label.match(/(\d+(?:\.\d+)?)\s*(كجم|كيلو|kg)/i);
  if (kg) return Math.round(Number(kg[1]) * 1000);
  const g = label.match(/(\d+)\s*(جم|جرام|g\b)/i);
  return g ? Number(g[1]) : null;
}
