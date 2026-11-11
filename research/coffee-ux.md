# Coffee niche: what the best coffee stores do (UX research)

Date: 2026-11-11. Goal: design the coffee store and the product journey on the engine, learning from the best coffee e-commerce sites, adapted to Egypt (Arabic, cash on delivery, mobile first).

## How this was researched

Live pages were read on 2026-11-11 (product pages, catalog pages, home pages, and each Shopify store's public product data, to see which options they really offer):

| Store | Why it matters | Pages read |
|---|---|---|
| **Trade Coffee** (US) | A **multi-roaster marketplace**, the same model as our engine | Home, quiz, full catalog |
| **Onyx Coffee Lab** (US) | Considered the best coffee product page | Southern Weather product page |
| **Blue Bottle** (US) | The reference for subscriptions and brew guides | Bella Donovan product page |
| **Square Mile** (UK) | Clean espresso-first roaster | Red Brick product page |
| **RAW Coffee** (Dubai) | Gulf specialty roaster, closest market to ours | Home, product options |
| **Abu Auf** (Egypt) | The biggest Egyptian coffee brand online, and what Egyptian buyers already know | Home, coffee category, Turkish coffee product page |
| Counter Culture, Stumptown (US) | How they tag and filter coffee | Product data |

Gaps: web search was down during this research, so Egyptian specialty roasters that only sell through Instagram or Talabat were not covered. Saudi stores (Half Million, Brew92) had no online shop that could be read.

---

## 1. What every top store does (the patterns)

### A. Taste first, origin second
Every leading store puts **3 tasting notes** right under the name, in big type:
- Onyx: "milk chocolate · plum · candied walnuts"
- Blue Bottle: "Raspberry, Chocolate, Molasses"
- Square Mile: "Yellow plum / Butterscotch / Orange"

Customers buy a taste, not a country. The origin and the farm come later, for the curious.

### B. A "flavor family" a beginner understands
**Trade** gives every coffee in its catalog one plain family: *Chocolaty & Sweet, Funky & Fruity, Comforting & Rich, Roasty & Smoky, Syrupy & Smooth, Balanced & Fruity*. That is the filter people actually use. It is better than "acidity 7/10".

### C. Roast level as a visible scale
Onyx shows the roast on a "Traditional ↔ Modern" scale with a level name. Trade shows *roast · acidity · body* as three short scales. Blue Bottle prints "DARK ROAST" as a label. In Egypt the words everyone already uses are **فاتح · وسط · غامق** (light, medium, dark; Abu Auf names every product this way).

### D. The question is "how do you make your coffee?", not "what grind?"
- **RAW (Dubai)** lists the grind **by brew method**: Whole Bean · Cold Brew · French Press · Automatic Filter · Chemex · V60 · AeroPress · Stovetop · Espresso · **Turkish**.
- **Trade's** quiz opens with "How do you brew your coffee?", then "How do you like it to taste?", then "Whole or ground?".
- Onyx shows a "preferred extraction" (Filter or Espresso) for each coffee.

Customers don't know microns. They know their kanaka (Turkish coffee pot), their espresso machine, or their V60.

### E. The price makes sense for the weight
Square Mile prints **£4.35/100g** next to the price, for 350 g / 1 kg / 2 kg. Onyx offers **2oz (sample) / 10oz / 2lb / 5lb**. Weights differ between stores, so a price per 100 g is the only fair comparison. Each size has its own price.

### F. A small first try
Ways to lower the risk of a first order:
- Onyx: a 2 oz sample size
- Trade: first bag free and a 3-bag "Discovery Trial"
- RAW: "Discovery Tins"
- Square Mile: "Assortment Packs"

Our engine already has bundles. A **discovery box** (3 coffees from 3 roasters) is the coffee version of Sakina's Umrah kit.

### G. Recipe on the product page
Onyx and Blue Bottle put the **brew recipe for this coffee** on the page, with dose, water, grind, time, and step-by-step pours. Onyx even adds a timer. Blue Bottle sells the tools under it ("What you'll need": dripper, filters, scale, kettle, grinder).

### H. Freshness is the main trust signal
"Roasted to order" appears on Trade, and every specialty store either shows or promises the roast date. Coffee is a fresh product, and **roast date** is its expiry date.

### I. Subscribe, with one default
Blue Bottle's options:
- **Delivery:** one-time or subscribe, with "Every Two Weeks (**Most Popular**)" preselected.
- **Multi-bag discounts:** 2 bags 10% off, 3 bags 17.5% off.

Onyx puts "Subscribe & Save 5%" above "Add to Cart".

Coffee is the most repeat-purchase product we will sell.

### J. Marketplace trust: the roaster has a face
Trade's catalog cards show **roaster name above the coffee name**. Each roaster also gets a story and a city ("Founded in 2017 in Washington, DC…"). Its trust claims sit in one line: "500+ coffees · Love it or we'll replace it · Barista support · Roasted to order". This fits our seller model exactly. The seller logo and story we just added to the bot are the right base.

---

## 2. What not to copy

| Seen at | Problem | Our rule |
|---|---|---|
| Abu Auf | Every roast × cardamom × weight is a **separate product**. The catalog has about 20 near-identical cards ("بن تركي ساده فاتح 200 جم", "… محوج فاتح 200 جم", …) | **One product, with options.** Roast is the product itself; grind, cardamom and weight are options |
| Abu Auf | Health claims on coffee ("يساعد في إنقاص الوزن", i.e. "helps you lose weight") | No health claims. They're risky and they hurt trust |
| Onyx | Very deep data (Agtron number, lot cost, roaster machine). Great for experts, a wall for beginners | Show taste, roast, and method up front, and fold the expert details under "للمحترفين" ("for experts") |
| Blue Bottle | Long brand text before useful information | Answer first, story at the end |
| Square Mile | Pop-up for email or SMS sign-up with a long legal text | No pop-ups. Ask for notifications only after the first order (already in our standard) |
| Abu Auf | Delivery area asked before browsing | Ask for the governorate only on the product page (delivery date) and at checkout (already in our standard) |

---

## 3. What fits Egypt specifically

- **Turkish coffee is the market.** Most Egyptians drink بن تركي. It is described by roast (فاتح / وسط / غامق) and by cardamom: **سادة** (plain) or **محوج** (with cardamom or a spice mix, which costs more: Abu Auf charges EGP 375 vs 325 for 200 g). Specialty (V60, espresso at home, moka pot) is growing fast but is still a minority.
  - So the store must serve **two kinds of customer**: the Turkish-coffee household and the specialty drinker.
- **Common pack sizes:** 100 g, 200 g, 250 g, 500 g, 1 kg.
- **Speed and freshness matter.** Abu Auf promises 2-hour delivery in Cairo, so freshness is how we compete. Each bag is ground for the customer when the order comes in, then shipped.
- **Cash on delivery** (already our model) and "open before paying" both still apply. Bean bags must arrive sealed, so the courier lets the customer check the outside and the label, not open the bag.
- **The whole page is in Arabic.** Brew methods get familiar Arabic names plus an icon:

  | Method | Arabic label |
  |---|---|
  | Turkish | كنكة / تركي |
  | Espresso machine | مكنة اسبريسو |
  | Moka pot | موكا بوت |
  | French press | فرنش بريس |
  | V60 / filter | فلتر / V60 |
  | Drip machine | مكنة تقطير |
  | Whole beans | حبوب كاملة (هطحنها بنفسي) |

---

## 4. The coffee journey for our engine

### Home
1. **Hero:** "لاقي قهوتك في 3 أسئلة" ("find your coffee in 3 questions"), a quiz in the style of Trade:
   1. How do you make your coffee? (method tiles)
   2. What do you like? (chocolate and nuts / fruity and bright / strong and dark)
   3. With milk or black?

   The quiz returns 3 products and the discovery box. It also remembers the method, so product pages preselect the grind.
2. **Shop by method:** tiles for تركي · اسبريسو · فلتر · فرنش بريس · كبسولات (Turkish, espresso, filter, French press, capsules), plus a tools tile.
3. **The discovery box** (multi-seller bundle), our version of the Umrah kit.
4. "How ordering works" in 3 steps. Step 2 reads "بنحمص ونطحن لك طازة" ("we roast and grind fresh for you").
5. **Product card:**
   - photo
   - **roaster name** (small, above)
   - coffee name
   - flavor family chip
   - roast dots
   - price, plus price per 100 g

### Product page (top to bottom)
1. **Gallery:** the bag, the beans, the cup.
2. **Name, then the 3 tasting notes** in large type, then the flavor family chip.
3. **Roast scale** فاتح ●●○ غامق (light to dark), plus short bars for body and acidity.
4. **Price for the chosen weight, plus price per 100 g.**
5. **Options:**
   - "بتعمل قهوتك ازاي؟" ("how do you make your coffee?"): method tiles that set the grind
   - weight
   - سادة / محوج (plain or with cardamom), only for Turkish coffee

   The quiz's choice is preselected.
6. **Freshness line:** "بيتحمص ويتطحن بعد طلبك · يوصلك يوم الخميس" ("roasted and ground after you order · arrives Thursday"), or the roast date if the bag is pre-roasted.
7. Buy now · add to cart. Later: "اشترك ووفّر" ("subscribe and save"), with "كل أسبوعين" ("every two weeks") preselected.
8. **The recipe for the chosen method**, as a card: dose, water, time, steps. For a kanaka: coffee spoons per cup, cold water, simmer, don't let it boil over.
9. **"About the roaster"** card: logo, story, city, rating (data from the seller application).
10. **Reviews with the reviewer's method** ("عملتها كنكة", "made it in a kanaka"), so a Turkish drinker reads Turkish reviews.
11. **Details folded under "للمحترفين"** ("for experts"): origin, farm, process, altitude, variety.
12. **"هتحتاج"** ("you'll need": kanaka, V60, filters, grinder) and "ناس كتير اشترت كمان" ("many people also bought").

### Checkout and after
Same engine flow. Extras for coffee:
- An optional "كام كوباية في اليوم؟" ("how many cups a day?") question already in our standard. It powers the reorder reminder: weight ÷ (cups × 15 g) = days, with the reminder 2 days before.
- The seller's order message on Telegram must put the **grind in large letters**. A wrong grind is the most common coffee complaint.

---

## 5. What the engine needs for coffee (gap list)

| # | Need | Today | Change |
|---|---|---|---|
| 1 | **Price per option** (250 g ≠ 1 kg; محوج costs more) | One price per product; options only carry stock | Add an optional `price` on each variant; checkout prices from the variant (server side, as today) |
| 2 | **Option axes set by the niche** (method or grind, weight, cardamom) | Fixed to color then size | Each niche declares its option axes and their labels in its config; the picker and the bot read them |
| 3 | **Grind is made to order, not stocked** | Stock per variant | Stock counts the roasted beans per weight; grind is an option with no stock of its own |
| 4 | **Freshness:** roast date or "roasted to order" | No date field | New required attribute `roast_mode` (to order / roast date); bot asks; hide a bag 30 days after its roast date |
| 5 | Tasting notes, flavor family, roast scale as **structured data** for cards and filters | Free-text attributes | Niche-level lists (the families, the roast levels); bot shows them as buttons |
| 6 | **Quiz** and "remember my method" | None | A small quiz page plus a cookie; product pages preselect |
| 7 | **Recipe per method** | None | Niche content (one recipe per method), optional seller override |
| 8 | Reviews with brew method | Reviews planned with the fashion fields | Review fields set by the niche (already the plan in the standard) |
| 9 | Subscription | Later phase | Start with the WhatsApp/Telegram reorder reminder; real subscriptions after the first KPI gate |
| 10 | Price per 100 g on cards | None | Computed from the weight option |

Items 1–4 are core and needed before launch. Items 5–8 make the store good. Items 9–10 can follow.

Items 1 and 2 also help Sakina (for example, an abaya that costs more in a larger size).

---

## 6. Decision: one seller at launch (Ahmed's own coffee)

Decided 2026-11-11. The store opens as a **single brand**. The engine stays multi-seller underneath, so other roasters can join later without a rebuild.

What changes from the journey above:
- **Product cards:** the roaster name is hidden while there is only one seller, and shown automatically once a second seller is approved.
- **Discovery box:** 3 of our own coffees, not 3 roasters.
- **Product page:** the "About the roaster" card becomes a short brand story, with the roasting and grinding promise.
- **Seller:** Ahmed is seller #1. He adds products through the same Telegram bot (or the admin panel), and orders reach him on Telegram as they do for any seller. Commission is set to 0 for him.
- **What comes first:** freshness and options matter more than marketplace trust signals. Gaps 1–4 still come first.
- **Products:** both Turkish coffee (فاتح / وسط / غامق, سادة / محوج) and specialty beans (espresso, filter). The home page leads with two doors, "قهوة تركي" (Turkish coffee) and "قهوة مختصة" (specialty coffee); the quiz serves the specialty side.
- **Brand:** Cairo Roast · محمصة القاهرة, on **cairoroast.com** (changed from Bunn on 2026-11-11).

## 7. Build order

1. **Engine core:**
   - price per option;
   - option axes set by each niche;
   - grind made to order, with stock counted by weight;
   - roast date or "roasted to order".

   Sakina keeps working unchanged.
2. **Coffee niche file:** `niches/coffee.json`, with categories (Turkish, specialty, capsules later, tools), options, flavor families, roast levels, recipes, synonyms and the discovery box.
3. **Store pages:**
   - the two doors on the home page;
   - product cards with roast dots, flavor family and price per 100 g;
   - the new product page (method picker, freshness line, recipe card, expert details).
4. **Bot:** adding a coffee product asks the coffee questions; order messages show the grind in large letters.
5. **Quiz**, then the cups-per-day reorder reminder.
6. **Launch:** cairoroast.com domain, second Node app domain mapping, test order.

---

## 8. First catalog: Bonds Coffee Roasters (from shop.wheretospot.com, read 2026-11-11)

**Roaster:** Bonds Coffee Roasters (بوندز لتحميص القهوة) · instagram.com/bondscoffeeroasters · "Coffee roasters · private label & tailored roasting".

| Product | Type | Tasting notes (Arabic, as listed) | Body / acidity | 250 g | 1 kg |
|---|---|---|---|---|---|
| Chrome (كروم بلند) | Blend | كراميل، شوكولاتة داكنة، مكسرات محمصة | full · mild acidity | 225 | 900 |
| Amber (أمبر بلند) | Blend | شوكولاتة داكنة، عسل أسود، بندق محمص | rich · low acidity | 255 | 1,020 |
| Sienna (سيينا بلند) | Blend | سكر بني، كاكاو، مكسرات محمصة | medium · low acidity | 269 | 1,074 |
| Ethiopia Limu (إثيوبيا ليمو) | Single origin · Limu · Heirloom · Natural | شوكولاتة داكنة، مكسرات محمصة، شاي أسود، سكر بني وبرتقال | — | 285 | 1,140 |
| Brazil Cerrado (البرازيل سيرادو) | Single origin · Cerrado · Catuai · Natural | توفي، شوكولاتة داكنة، بندق، شراب القيقب | — | 297 | 1,188 |

How their shop presents it:
- **One option:** weight (1 kg / 250 g), each with its own price. 250 g is exactly a quarter of the 1 kg price, so there's no saving for buying the bigger bag.
- **Whole beans only:** no grind choice, no roast level, no roast date, no brew recipe.
- **Good:** tasting notes in the subtitle; region, variety and process for single origins; an "in short" answer line; cash on delivery, card or wallet; 14-day returns; 2–5 day delivery.
- **Weak:**
  - the page asks for broken template image addresses (e.g. `{{ mainImg }}`), which return 404 errors;
  - large blank areas on mobile;
  - no reviews yet;
  - one photo per product;
  - coffee sits next to NFC cards and acrylic stands, so it doesn't feel like a coffee store.

### How it maps to our engine

| Bonds data | Our engine |
|---|---|
| Brand | Seller "Bonds Coffee Roasters" with logo and story ("about the roaster" card); shown on cards as "من بوندز" |
| Weight variants with prices | Option axis `weight` (250 جم / 1 كجم), each variant with its own `price` (step 1 supports it) |
| Blend / single origin | Categories `blends` and `single-origin` (specialty side); Turkish later if Bonds or we add it |
| Tasting notes | Headline under the name plus a flavor family (Chrome, Amber, Sienna → "شوكولاتة ومكسرات"; Limu → "فواكه وشاي"; Cerrado → "حلو ومكسرات") |
| Region, variety, process | Details folded under "للمحترفين" ("for experts") |
| Whole beans | Grind choice **only if Bonds grinds to order**; otherwise "حبوب كاملة" (whole beans) only, and the page says so |

The grind can't be printed on the bag or on Bonds' label until Bonds confirms they will grind each order.
