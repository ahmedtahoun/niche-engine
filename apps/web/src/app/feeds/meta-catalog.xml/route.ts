// /feeds/meta-catalog.xml: the store's products for Meta Commerce Manager (catalog and
// retargeting ads), one item per size, in the RSS 2.0 + g: format Meta reads.
// Prices, stock and photos come from the live catalog, so the feed is always current.
import { headers } from 'next/headers';
import { catalog, choicesFor } from '@/lib/catalog';
import { allNiches } from '@/lib/niches';
import { nicheForHost, origin, siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n: number) => `${n.toFixed(2)} EGP`;

export async function GET() {
  const niches = allNiches();
  const cfg = niches[nicheForHost((await headers()).get('host'), Object.keys(niches))];
  if (!cfg) return new Response('Not found', { status: 404 });
  const cat = await catalog();
  const base = origin(cfg);
  const abs = (src: string) => (src.startsWith('http') ? src : `${base}${src}`);
  const items = cat.productsOf(cfg.id).filter((p) => (p.status ?? 'live') === 'live').flatMap((p) => {
    const seller = cat.sellerOf(p);
    const brand = seller?.nameEn ?? seller?.name ?? cfg.brand.nameEn;
    const choice = choicesFor(cfg, p).map((c) => (c.values.length === 1 ? c.values[0].labelAr : '')).filter(Boolean);
    const variants = p.variants.length ? p.variants : [{ label: '', stock: 1, price: p.price }];
    return variants.map((v) => {
      const price = v.price ?? p.price;
      const sale = v.compareAt && v.compareAt > price;
      const title = [p.nameAr, v.label, ...choice].filter(Boolean).join(' · ');
      const description = [p.leadAr, Object.entries(p.attributes).map(([k, x]) => `${k}: ${x}`).join('، ')].filter(Boolean).join(' ').slice(0, 4900);
      const [image, ...more] = (p.images ?? []).map(abs);
      return [
        '<item>',
        `<g:id>${esc(`${p.id}${v.label ? `-${v.opts?.weight ?? v.label}` : ''}`.replace(/\s+/g, ''))}</g:id>`,
        `<g:item_group_id>${esc(p.id)}</g:item_group_id>`,
        `<g:title>${esc(title)}</g:title>`,
        `<g:description>${esc(description)}</g:description>`,
        `<g:link>${esc(siteUrl(cfg, `/p/${p.slug}`))}</g:link>`,
        image ? `<g:image_link>${esc(image)}</g:image_link>` : '',
        ...more.slice(0, 10).map((m) => `<g:additional_image_link>${esc(m)}</g:additional_image_link>`),
        `<g:availability>${v.stock > 0 ? 'in stock' : 'out of stock'}</g:availability>`,
        `<g:inventory>${Math.max(0, v.stock)}</g:inventory>`,
        '<g:condition>new</g:condition>',
        `<g:price>${money(sale ? v.compareAt! : price)}</g:price>`,
        sale ? `<g:sale_price>${money(price)}</g:sale_price>` : '',
        `<g:brand>${esc(brand)}</g:brand>`,
        v.label ? `<g:size>${esc(v.label)}</g:size>` : '',
        p.category ? `<g:product_type>${esc(cfg.categories.find((c) => c.id === p.category)?.labelAr ?? p.category)}</g:product_type>` : '',
        cfg.feedCategory ? `<g:google_product_category>${esc(cfg.feedCategory)}</g:google_product_category>` : '',
        '</item>',
      ].filter(Boolean).join('');
    });
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>${esc(cfg.brand.nameAr)}</title><link>${esc(siteUrl(cfg))}</link><description>${esc(cfg.brand.description?.ar ?? cfg.brand.nameAr)}</description>\n${items.join('\n')}\n</channel></rss>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=900' } });
}
