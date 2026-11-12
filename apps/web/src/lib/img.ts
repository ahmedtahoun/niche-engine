// Photos stored on the site (public/products/…) have a small copy (name-sm.webp, 480 px,
// made by scripts/photo-sizes.mjs). The browser picks the small one on phones and the
// full one where the photo is shown large. Other photos (e.g. Supabase) are used as they are.
export function responsive(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!/^\/products\/.+\.webp$/.test(src) || src.endsWith('-sm.webp')) return { src };
  const small = src.replace(/\.webp$/, '-sm.webp');
  return { src: small, srcSet: `${small} 480w, ${src} 900w`, sizes };
}
