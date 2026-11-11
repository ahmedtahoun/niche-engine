# Niche UX Standard

Every niche launched on the engine must pass this checklist before launch.
It replaces a fresh UX audit per niche: if an item is here, it is already decided.
Add a new line whenever a real problem teaches us something (the lessons log).

Status per item: `[x]` done · `[ ]` to do · `[later]` planned for a later phase.

---

## 1. Navigation & search
- [ ] Search icon in the header and a Search tab in the bottom bar
- [ ] Arabic-aware matching: أ/إ/ا, ة/ه, ى/ي are treated as the same letter
- [ ] Synonym list per niche (e.g. اسدال → عباية, حجاب → طرحة; coffee: بن → قهوة, اسبريسو → espresso)
- [ ] Empty search shows popular searches + the hero bundle
- [ ] No results never dead-ends: suggestions + "ask us on WhatsApp"
- [ ] Searches with no results are logged and reviewed weekly (tells sellers what to add)
- [ ] Category chips are clickable and open filtered results
- [ ] Filters and sort (price, color, material / roast…) once the niche has 30+ products

## 2. Home page
- [ ] The hero is the multi-seller bundle, not a generic banner
- [ ] "How ordering works" in 3 steps under the hero
- [ ] Product cards show: photo, name, "by seller" (small), rating, delivery day, price
- [ ] No fake "permanent sale" prices; discounts only for real occasions
- [ ] Trust details live in the footer, not at the top
- [ ] Wallet chip shown only after the customer's first order

## 3. Product page
- [ ] Answer-first summary line under the title
- [ ] Delivery date + shipping fee + "no other fees" right under the price, with governorate switch
- [ ] Real customer photos before the long description
- [ ] Niche "fit finder" (fashion: height + weight → size; coffee: brew method → grind)
- [ ] Specs table from the niche's required attributes
- [ ] Structured reviews (fashion: height + size + fit; coffee: brew method + taste)
- [ ] FAQ per product type
- [ ] Two buttons: "Buy now" (skips cart) + "Add to cart"
- [ ] "Ask us on WhatsApp" goes to the platform, never to the seller
- [ ] Quick jump links (details / sizes / reviews) on long pages
- [ ] JSON-LD Product schema generated from the product record

## 4. Cart & checkout
- [ ] Account = phone + password, created inside the checkout screen on the first order (no separate sign-up step); saved address pre-fills the next order
- [ ] Passwords stored only as salted hashes; 5 wrong attempts lock sign-in for 15 minutes; "forgot password" goes to customer service until WhatsApp/SMS reset exists
- [ ] Order pages visible to their owner only (they show name, phone and address)
- [ ] One-screen checkout, phone number first
- [ ] Egyptian address pattern: governorate · area · street · optional landmark
- [ ] Inline validation with a clear message; typed values are never cleared
- [ ] Total says "this is everything, no other fees at the door"
- [ ] Deposit only above the niche threshold, only the shipping fee, refundable, explained in plain words
- [ ] Quantity stepper in the cart
- [ ] Optional, folded fields for niche triggers (Umrah trip date, coffee daily cups)

## 5. After the order
- [ ] Order confirmation: per niche setting `requireWhatsappConfirm` (off at launch; Bosta's SMS informs the customer after the shipment is created). Turn on when WhatsApp is configured
- [ ] Delivery date + "the courier will call you first" from the moment of ordering
- [ ] Cancel with one tap before the seller accepts
- [ ] Tracking timeline; multi-seller orders say "N shipments, same order number"
- [ ] One-tap exchange: courier swaps old for new in one visit; seller is told on Telegram
- [ ] Cashback credited after delivery + leakage survey
- [ ] Reorder from a WhatsApp message opens a pre-filled checkout

## 6. Trust & footer
- [ ] Open before paying · free exchange window · CR number · support WhatsApp · response hours
- [ ] Policy pages: exchange, shipping, privacy, sell with us
- [ ] "Open before paying" appears in at most 2 places above the footer (product + checkout)

## 7. Seller bot (Telegram)
- [ ] Application in under 5 minutes, agreement accepted with one button
- [ ] Orders arrive with Accept / Not available; no customer phone in chat
- [ ] Seller's share shown before accepting and before publishing a product
- [ ] AI-written listing from photos; required attributes enforced per niche
- [ ] Price check every 14 days; stale prices auto-hide at 30 days
- [ ] Weekly payout message; exchange requests arrive as messages

## 8. Admin
- [ ] Overview, orders, sellers, products & stock, review queue, payouts & reserve, leakage, customer insights, niche settings
- [ ] Nothing goes live without approval (products and sellers)
- [ ] Funnel and hesitation report per niche

## 9. Analytics (events from day one)
- [ ] view_item · size_finder_used · add_to_cart · buy_now · begin_checkout · field_error · purchase · wa_confirm · order_cancelled · delivered · exchange_requested · survey_answer · reorder_clicked · search (with zero-result flag)
- [ ] Every event carries niche, product, step and governorate
- [ ] Meta Pixel + Conversions API on purchase

## 10. Accessibility & performance
- [ ] Tap targets at least 44 px; muted text passes contrast in light and dark
- [ ] Loading skeletons and a clear offline / slow-network message
- [ ] Server-rendered pages (SEO, AI crawlers, slow phones)
- [ ] Dark mode checked on the customer side

## 11. SEO / GEO
- [ ] Knowledge hub: 5 core answer pages per niche before launch
- [ ] Organization schema with CR number; product feeds for Google and Meta
- [ ] robots.txt allows OAI-SearchBot and PerplexityBot; llms.txt present
- [ ] Monthly check of 20 fixed questions in ChatGPT, Gemini and Perplexity

---

## 12. Later phase: notifications & promotions

Build these after the niche passes its first KPI gates. Design decisions are already made below.

### Push notifications `[later]`
- [later] Channel 1: **web push** from the PWA (Android, and iPhone when added to the home screen)
- [later] Channel 2: **WhatsApp templates**, only for customers who opted in
- [later] Ask for permission **after the first order**, never on the first visit
- [later] Triggers: order status · back in stock · price drop on a favorite · one abandoned-checkout reminder · wallet expiring · niche trigger (Umrah: packing list a week before the trip; coffee: 2 days before the bag runs out) · seasonal drops
- [later] Frequency cap: at most 2 marketing messages a week per customer; order updates don't count
- [later] Quiet hours: nothing late at night or during Friday prayer; in Ramadan, avoid the iftar hour
- [later] One-tap unsubscribe in every marketing message
- [later] Admin: schedule a campaign per niche, see delivered / opened / ordered

### Promotions & discounts `[later]`
- [later] Coupon types: percentage · fixed amount · free shipping · bundle price
- [later] Every promo states **who pays**: platform (from commission) or seller (opt-in). Commission is calculated on the price after any seller-funded discount
- [later] Limits: one use per phone number · minimum order · expiry date · not stackable with other coupons (wallet still allowed)
- [later] Referral: customer shares a code, friend gets a discount, customer gets wallet credit after the friend's order is delivered
- [later] Seller codes keep the low seller-referral commission
- [later] First-order offer only for new phone numbers
- [later] Seasonal flash sales with a real end date (Ramadan, Eid, back-to-school for coffee)
- [later] Fraud guard: block coupon abuse across all niches (same shared blocklist as refusals)
- [later] Admin: promo report per code: orders, revenue, discount cost, net profit, repeat rate

---

## Lessons log
Add a line for every real incident, with the rule it created.

| Date | What happened | Rule added | Applies to |
|---|---|---|---|
| 2026-11-11 | Decision: customers sign in with phone + password (created at checkout), and WhatsApp order confirmation is off at launch | Fake-order protection at launch = shared refusal blocklist + deposit above the niche threshold | All niches |
| 2026-11-11 | Coffee synonyms pointed to English words while the catalog is Arabic, so "اسبرسو" found nothing | Synonyms must map to words the catalog actually uses; a core test checks one per niche | All niches |
