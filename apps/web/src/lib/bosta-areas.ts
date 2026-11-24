// Bosta's delivery areas and the checkout area search, ported from shop.wheretospot.com
// (api/bosta.php: bosta_areas, bosta_zones, area_norm, area_search). Pure functions only, so the
// checkout picker in the browser and the server use the same rules.

/** One deliverable Bosta district, as the checkout picker and the server see it. */
export interface District { id: string; ar: string; en: string; zoneId: string; zoneAr: string; zoneEn: string; cityId: string; cityAr: string; cityEn: string }
export interface City { id: string; ar: string; en: string; districts: District[] }

/** Bosta's raw /cities/getAllDistricts reply → cities with only the districts couriers deliver to. */
export function parseBostaCities(raw: unknown): City[] {
  const list = (raw as { data?: unknown[] })?.data;
  if (!Array.isArray(list)) throw new Error('unexpected Bosta areas reply');
  const out: City[] = [];
  for (const c of list as Record<string, unknown>[]) {
    const city = { id: String(c.cityId ?? ''), ar: String(c.cityOtherName ?? ''), en: String(c.cityName ?? '') };
    if (!city.id) continue;
    const districts: District[] = ((c.districts as Record<string, unknown>[]) ?? [])
      .filter((d) => d.dropOffAvailability && d.districtId)
      .map((d) => ({
        id: String(d.districtId), ar: String(d.districtOtherName ?? d.districtName ?? ''), en: String(d.districtName ?? ''),
        zoneId: String(d.zoneId ?? ''), zoneAr: String(d.zoneOtherName ?? ''), zoneEn: String(d.zoneName ?? ''),
        cityId: city.id, cityAr: city.ar, cityEn: city.en,
      }))
      .sort((a, b) => a.en.localeCompare(b.en));
    if (districts.length) out.push({ ...city, districts });
  }
  return out;
}

// ---------- spelling ----------

/** Same spelling rules as the shop: "مدينة نصر", "مدينه نصر" and "Nasr city" line up. */
export function areaNorm(s: string): string {
  let t = s.toLowerCase().replace(/[ً-ٰٟـ]/g, ''); // tashkeel, tatweel
  // Hamza forms are dropped entirely: Bosta itself writes "حداءق" where people type "حدائق".
  const map: Record<string, string> = { 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ة': 'ه', 'ى': 'ي', 'ؤ': 'و', 'ئ': '', 'ء': '' };
  t = t.replace(/[أإآٱةىؤئء]/g, (c) => map[c]).replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660));
  return t.replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Everyday names customers type that differ from Bosta's official ones. */
const AREA_ALIASES: Record<string, string> = {
  tagamoa: 'التجمع', tagamo3: 'التجمع', tagamo: 'التجمع', tagamou: 'التجمع', fifth: '5th',
  heliopolis: 'مصر الجديده', 'masr el gedida': 'مصر الجديده', mohandeseen: 'المهندسين', mohandessin: 'المهندسين',
  mohandseen: 'المهندسين', downtown: 'وسط البلد', 'wust el balad': 'وسط البلد', zayed: 'الشيخ زايد',
  agami: 'العجمي', agamy: 'العجمي', alex: 'الاسكندريه', alexandria: 'الاسكندريه', october: 'اكتوبر', hadayek: 'حدائق', kobba: 'القبه', qobba: 'القبه',
};

function areaAlias(s: string): string {
  let n = ` ${areaNorm(s)} `;
  for (const [from, to] of Object.entries(AREA_ALIASES)) n = n.split(` ${from} `).join(` ${to} `);
  return n.trim();
}

/** Drops Arabic/English articles so "el maadi", "elmaadi", "maadi", "المعادي" and "معادي" match. */
export function areaCompact(s: string): string {
  return areaNorm(s).split(' ')
    .filter((w) => w && !['el', 'al', 'ال'].includes(w))
    .map((w) => w.replace(/^(el|al|ال)(?=\p{L}{3})/u, ''))
    .join('');
}

// ---------- governorates ----------

/** Governorates whose Bosta name differs (or that Bosta splits into more than one "city"). */
const GOV_CITIES: Record<string, string[]> = {
  'مطروح': ['Matrouh', 'North Coast'],
  'الإسكندرية': ['Alexandria', 'North Coast'],
};

/** The Bosta cities that serve a checkout governorate (Arabic name, as in eta.ts GOVERNORATES). */
export function citiesForGovernorate(cities: City[], governorate: string): City[] {
  const byName = GOV_CITIES[governorate];
  if (byName) return cities.filter((c) => byName.includes(c.en));
  const g = areaCompact(governorate);
  return cities.filter((c) => areaCompact(c.ar) === g);
}

// ---------- zones and search ----------

export interface AreaResult { districtId: string; cityId: string; title: string; titleEn: string; sub: string; subEn: string }

interface Entry { d: District; zoneMain: boolean; zoneSize: number; k: [string, string, string, string, string, string] }

/** Index of a list of districts, grouped by Bosta zone ("Nasr City", "New Cairo"…). */
export function indexAreas(districts: District[]): Entry[] {
  const zones = new Map<string, District[]>();
  for (const d of districts) {
    const key = `${d.cityId}|${d.zoneId || d.id}`;
    zones.set(key, [...(zones.get(key) ?? []), d]);
  }
  const out: Entry[] = [];
  for (const list of zones.values()) {
    // The zone's "main" district is used when the customer picks the whole area.
    const main = list.find((d) => d.en.toLowerCase() === (d.zoneEn || d.en).toLowerCase()) ?? list[0];
    for (const d of list) {
      out.push({ d, zoneMain: d === main, zoneSize: list.length, k: [areaCompact(d.en), areaCompact(d.ar), areaCompact(d.zoneEn), areaCompact(d.zoneAr), areaCompact(d.cityEn), areaCompact(d.cityAr)] });
    }
  }
  return out;
}

function result(e: Entry, wholeZone: boolean): AreaResult {
  const d = e.d;
  if (wholeZone && e.zoneSize > 1) {
    return { districtId: d.id, cityId: d.cityId, title: d.zoneAr || d.zoneEn, titleEn: d.zoneEn, sub: `${d.cityAr} · أي منطقة`, subEn: `${d.cityEn} · any neighbourhood` };
  }
  const same = d.en.toLowerCase() === d.zoneEn.toLowerCase();
  return { districtId: d.id, cityId: d.cityId, title: d.ar || d.en, titleEn: d.en, sub: (same ? '' : `${d.zoneAr}، `) + d.cityAr, subEn: (same ? '' : `${d.zoneEn}, `) + d.cityEn };
}

/** Typed search: best matches first, whole areas ("Nasr City · any neighbourhood") before single neighbourhoods. */
export function searchAreas(index: Entry[], query: string, limit = 8): AreaResult[] {
  const q = areaAlias(query);
  const words = areaNorm(q).split(' ').map(areaCompact).filter(Boolean);
  const full = areaCompact(q);
  if (full.length < 2) return [];
  const scored: [number, AreaResult][] = [];
  for (const e of index) {
    const [dEn, dAr, zEn, zAr, cEn, cAr] = e.k;
    const hay = `${dEn} ${dAr} ${zEn} ${zAr} ${cEn} ${cAr}`;
    if (!words.every((w) => hay.includes(w))) continue; // every typed word must match somewhere
    let score = 0;
    for (const [en, ar, base] of [[dEn, dAr, 100], [zEn, zAr, 80]] as const) {
      for (const k of [en, ar]) {
        if (!k) continue;
        if (k === full) score = Math.max(score, base + 30);
        else if (k.startsWith(full)) score = Math.max(score, base + 15);
        else if (k.includes(full)) score = Math.max(score, base);
      }
    }
    if (!score) score = 20; // matched via the city or across fields
    const zoneHit = zEn === full || zAr === full || zEn.startsWith(full) || zAr.startsWith(full);
    if (zoneHit && e.zoneMain) scored.push([score + 40, result(e, true)]);
    if (!(zoneHit && e.zoneSize > 1 && !e.zoneMain && score < 100) || words.length > 1) scored.push([score - dEn.length / 100, result(e, false)]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const out = new Map<string, AreaResult>();
  for (const [, r] of scored) {
    const key = `${r.districtId}|${r.title}`;
    if (out.has(key)) continue;
    out.set(key, r);
    if (out.size >= limit) break;
  }
  return [...out.values()];
}

/**
 * The one district a typed area name clearly means (exact district or zone name), else null.
 * Used for orders placed before the picker existed and for saved addresses.
 */
export function exactArea(index: Entry[], typed: string): AreaResult | null {
  const full = areaCompact(areaAlias(typed));
  if (full.length < 2) return null;
  const hits = new Map<string, AreaResult>();
  for (const e of index) {
    const [dEn, dAr, zEn, zAr] = e.k;
    if (dEn === full || dAr === full) hits.set(`d${e.d.id}`, result(e, false));
    else if ((zEn === full || zAr === full) && e.zoneMain) hits.set(`z${e.d.zoneId}`, result(e, true));
  }
  // A district named like its own zone matches both ways: that's still one place.
  const ids = new Set([...hits.values()].map((r) => r.districtId));
  return ids.size === 1 ? [...hits.values()][0] : null;
}
