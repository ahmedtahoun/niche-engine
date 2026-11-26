// Photos stored on the site (public/products/…) have smaller copies made by
// scripts/photo-sizes.mjs: name-sm.webp (480 px) and name-md.webp (720 px). The browser
// picks the smallest one that is sharp enough. Other photos (e.g. Supabase) are used as they are.
//
// Browsers keep these photos for 30 days (next.config.ts). After replacing photos under the same
// names, raise PHOTO_VERSION so every browser downloads the new ones instead of its old copy.
export const PHOTO_VERSION = 2;
const v = (src: string) => `${src}?v=${PHOTO_VERSION}`;

export function responsive(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!/^\/products\/.+\.webp$/.test(src)) return { src };
  if (/-(sm|md)\.webp$/.test(src)) return { src: v(src) };
  const small = v(src.replace(/\.webp$/, '-sm.webp'));
  const medium = v(src.replace(/\.webp$/, '-md.webp'));
  return { src: small, srcSet: `${small} 480w, ${medium} 720w, ${v(src)} 900w`, sizes };
}

// Sizes for the photos. Phones have 2–3 screen pixels per point, and a coffee photo looks
// sharp at about 2: these widths are a little smaller than the photo's real width on phones,
// so a phone downloads the 480 px copy for a card and the 720 px copy on a product page
// instead of the full photo (45 KB and 83 KB instead of 180 KB).
export const CARD_SIZES = '(min-width: 700px) 240px, 30vw';
export const PAGE_SIZES = '(min-width: 900px) 50vw, 62vw';
