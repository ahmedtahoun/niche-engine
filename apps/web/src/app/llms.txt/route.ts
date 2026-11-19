// /llms.txt: a plain summary of the store for AI assistants (llmstxt.org format):
// who we are, what we sell with prices, how ordering works, and the guide pages.
import { headers } from 'next/headers';
import { bestPer100g, catalog, isSoldOut } from '@/lib/catalog';
import { guidesFor } from '@/lib/guides';
import { allNiches } from '@/lib/niches';
import { hasPolicyPages } from '@/lib/policies';
import { nicheForHost, siteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function GET() {
  const niches = allNiches();
  const cfg = niches[nicheForHost((await headers()).get('host'), Object.keys(niches))];
  if (!cfg) return new Response('Not found', { status: 404 });
  const cat = await catalog();
  const products = cat.productsOf(cfg.id);
  const sellers = [...new Map(products.map((p) => [p.sellerId, cat.sellerOf(p)])).values()];
  const fill = (x: string) => x.replace('{shipping}', String(cfg.shippingEgp)).replace('{freeOver}', (cfg.freeShippingOverEgp ?? 0).toLocaleString('en-US')).replace('{depositAbove}', String(cfg.risk.depositAboveEgp)).replace('{deposit}', String(cfg.risk.depositEgp));
  const lines = [
    `# ${cfg.brand.nameEn} (${cfg.brand.nameAr})`,
    '',
    `> ${cfg.brand.description?.en ?? cfg.brand.description?.ar ?? ''}`,
    '',
    `Online store in Egypt at ${siteUrl(cfg)} (Arabic; English at ${siteUrl(cfg, '/', 'en')}). Cash on delivery across Egypt, delivery in 2–4 days by Bosta, shipping EGP ${cfg.shippingEgp}${cfg.freeShippingOverEgp ? ` (free on orders from EGP ${cfg.freeShippingOverEgp})` : ''}, a EGP ${cfg.risk.depositEgp} deposit only on orders over EGP ${cfg.risk.depositAboveEgp}, ${cfg.returnsPolicy === 'coffee' ? `returns on unopened, full-price bags within 14 days only: opened bags, offer coffee and coffee ground to order can't be returned or exchanged, and taste or roast level isn't a defect (${siteUrl(cfg, '/returns', 'en')})` : 'free exchange within 14 days'}.${cfg.brand.whatsapp ? ` Customer service on WhatsApp: ${cfg.brand.whatsapp}.` : ''}`,
    '',
    ...(hasPolicyPages(cfg) ? [`Policies: [shipping and delivery](${siteUrl(cfg, '/shipping', 'en')}) · [returns](${siteUrl(cfg, '/returns', 'en')}) · [privacy](${siteUrl(cfg, '/privacy', 'en')}) · [terms](${siteUrl(cfg, '/terms', 'en')}).`, ''] : []),
    '## Products',
    ...products.map((p) => {
      const per = bestPer100g(p);
      const notes = p.profile?.notesEn?.join(', ') ?? p.en?.attributes?.['Tasting notes'];
      return `- [${p.en?.name ?? p.nameAr}](${siteUrl(cfg, `/p/${p.slug}`, 'en')}): ${p.en?.lead ?? p.leadAr} By ${cat.sellerOf(p).nameEn ?? cat.sellerOf(p).name}. ${p.variants.map((v) => `${v.labelEn ?? v.label} EGP ${v.price ?? p.price}`).join(' · ')}${per ? ` (EGP ${Math.round(per)}/100 g)` : ''}${notes ? `. Notes: ${notes}` : ''}.${isSoldOut(p) ? ' Sold out for now: it can’t be ordered until it is back in stock.' : (() => { const out = p.variants.filter((v) => v.stock <= 0).map((v) => v.labelEn ?? v.label); return out.length ? ` Sold out for now in ${out.join(', ')}.` : ''; })()}`;
    }),
    '',
    ...(cfg.bundles.length ? ['## Bundles', ...cfg.bundles.flatMap((b) => { const v = cat.bundleView(cfg, b.id); return v ? [`- [${b.nameEn ?? b.nameAr}](${siteUrl(cfg, `/b/${b.id}`, 'en')}): EGP ${v.price} instead of EGP ${v.fullPrice}.`] : []; }), ''] : []),
    ...(sellers.length ? ['## Roasters and sellers', ...sellers.map((s) => `- ${s.nameEn ?? s.name}${s.about?.en ? `: ${s.about.en}` : ''}`), ''] : []),
    ...(guidesFor(cfg.id).length ? ['## Guides', ...guidesFor(cfg.id).map((g) => `- [${g.title.en}](${siteUrl(cfg, `/guide/${g.slug}`, 'en')}) · [${g.title.ar}](${siteUrl(cfg, `/guide/${g.slug}`)}): ${g.short.en}`), ''] : []),
    ...(cfg.homeFaq?.length ? ['## FAQ', ...cfg.homeFaq.flatMap((f) => [`- ${f.q.en ?? f.q.ar}`, `  ${fill(f.a.en ?? f.a.ar)}`]), ''] : []),
    ...(cfg.acceptsSellers !== false ? ['## For sellers', `- [Sell on ${cfg.brand.nameEn}](${siteUrl(cfg, '/sell', 'en')}): commission ${Math.round(cfg.commission.new * 100)}% on new customers, ${Math.round(cfg.commission.repeat * 100)}% on repeat customers, ${Math.round(cfg.commission.referral * 100)}% on customers the seller brings; weekly payouts.`, ''] : []),
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
}
