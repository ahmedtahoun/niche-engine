// POST /api/ev: background events from the store pages, sent with fetch (keepalive) instead of a
// server action, because a server action in flight can cancel the page change it was sent with
// ("Buy now" → checkout, "Place order" → confirmation).
//   { k: 'meta', n, kind: 'AddToCart' | 'InitiateCheckout', id, cart, promo }  → Conversions API copy
//   { k: 'draft', n, cart, phone, name, governorate, promo }                   → abandoned-checkout draft
//   { k: 'keep', n, cart }                                                     → indexes of the cart lines still on sale
import { reportCartEvent, saveCheckoutDraft } from '@/app/actions';
import { catalog } from '@/lib/catalog';
import { getNiche } from '@/lib/niches';
import type { CartLine } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = JSON.parse((await req.text()).slice(0, 20_000)); } catch { return new Response(null, { status: 204 }); }
  const niche = typeof b.n === 'string' ? b.n : '';
  const cart = (Array.isArray(b.cart) ? b.cart : []) as CartLine[];
  const str = (x: unknown) => (typeof x === 'string' ? x.slice(0, 120) : '');
  try {
    if (b.k === 'meta' && (b.kind === 'AddToCart' || b.kind === 'InitiateCheckout')) await reportCartEvent(niche, b.kind, str(b.id), cart, str(b.promo));
    else if (b.k === 'keep') {
      // Cart badge sync: which saved lines can still be sold (a removed coffee or size drops out).
      const cfg = getNiche(niche);
      if (!cfg) return Response.json({ keep: null });
      const q = (await catalog()).quote(cfg, cart.slice(0, 20), { isFirstOrder: false, walletBalance: 0, useWallet: false });
      return Response.json({ keep: q.lines.map((l) => Number(l.key)) });
    }
    else if (b.k === 'draft') await saveCheckoutDraft(niche, cart, { phone: str(b.phone), name: str(b.name), governorate: str(b.governorate), promoCode: str(b.promo) });
  } catch { /* background only: never an error page */ }
  return new Response(null, { status: 204 });
}
