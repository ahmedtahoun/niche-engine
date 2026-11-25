# Cairo Roast · محمصة القاهرة: brand kit

Rebuild every file after a change: `node brand/cairo-roast/build.mjs` (needs Chrome for the PNGs).

## The idea
**A Cairo arch holding a roasted bean, with the Nile running through it.**
- **The arch:** the pointed doorway of Islamic Cairo, the city's signature shape.
- **The bean's center line:** drawn as the Nile's curve.

The mark says *Cairo + coffee* without a pyramid cliché, and it stays readable as a 40-pixel profile picture.

## Files

| File | Use it for |
|---|---|
| `logo/horizontal.svg` / `.png` | Website header, invoices, bag front |
| `logo/stacked.svg` | Labels, stickers, square spaces |
| `logo/mark.svg` | App icon, favicon, small spaces |
| `logo/stamp.svg` | Round sticker on the bag, cups, Instagram highlight covers |
| `logo/*-on-dark.*` | On espresso-brown or photo backgrounds |
| `social/profile.png` | Instagram, Facebook, WhatsApp, TikTok profile picture |
| `social/post-1-fresh.png` | Launch post / ad: freshness. **Only if you really roast after the order** (see note) |
| `social/post-2-turkish.png` | Launch post / ad: Turkish coffee (light, medium, dark; plain or with cardamom) |
| `social/post-3-method.png` | Launch post / ad: we grind for your brew method |
| `social/story-launch.png` | Story / Reels cover: "فتحنا النهارده" ("we opened today") |
| `print/bag-label.png` | Bag label, 10 × 14 cm (300 dpi). Tick roast, grind and cardamom, write weight and roast date by hand |

SVGs carry their fonts inside, so they look the same on any computer. For a printing shop, send the PNG, or the SVG opened and exported as PDF from Chrome.

## Bag labels
`labels/`: rebuild with `node brand/cairo-roast/labels.mjs`. Previews: `labels/preview-all-bags.png`, `labels/preview-bag-guji.png`.

**The idea:** one bold label per coffee on the white 13 × 20 cm bag. It has a solid deep colour per coffee, cream type, and gold lines. It also has one framed window. In the window: soft contour lines of the origin's hills (the journey) under a small still life of what the coffee tastes like. The notes are **drawn, never written**. English comes first, with Arabic in support. Nothing about times of day, nothing religious. One sticker per bag, no back label.

| N° | Coffee | Colour | Still life |
|---|---|---|---|
| 01 | Ethiopia Guji Hambela | plum `#5A2C48` | apricot, orange blossom, berries, coffee cherries |
| 02 | Ethiopia Limu | forest `#1E4536` | dark chocolate, orange slice, tea leaves |
| 03 | Brazil Red Catuai | caramel brown `#7A4A1C` | hazelnuts, walnut, sugar cane |
| 04 | Colombia Castillo | deep teal `#16454F` | tangerine, mango, caramel, oak leaf |
| 05 | Amber Blend | brick `#7E2A19` | molasses dipper, dark chocolate, hazelnuts |
| 06 | Chrome Blend | graphite `#2A2F38` | caramel, dark chocolate, nuts |
| 07 | El Salvador San Agustín | indigo `#2D2A66` | a coffee branch with cherries (the coffee itself) |

The label shows, from top to bottom:
- the logo, CAIRO ROAST and محمصة القاهرة;
- the window;
- the origin and the name in English and Arabic;
- one journey line (origin ┈ ≈ km ┈ Cairo);
- the N° and weight;
- a "ROASTED ____" line to write or stamp the roast date.

**Print spec:**
- **Size:** 110 × 180 mm, arch top and 3 mm corners. The artboard is 116 × 186 mm with 3 mm bleed. Keep text 5 mm inside the cut.
- **Ink:** full colour (CMYK). The gold `#D9B77E` is printed as ink, not foil. Cream `#F6EFE6`, soft `#E7D9C7`.
- **Material:** matte white paper sticker so the roast date can be written in pen. A matte laminate is optional, but a pen won't write on it; use a stamp instead.

**Files** (one set per coffee, `label-0N-<coffee>`):
- `.pdf`: exact size, vector, fonts embedded. Send this one to the printer.
- `.svg`: vector, fonts embedded.
- `.png`: 300 dpi, 1370 × 2197 px.
- `all-labels.pdf`: all 7 in one file, one page each.
- `dieline.pdf` / `dieline.svg`: magenta cut line, blue bleed, grey safe area.

Distances are approximate: origin region to Cairo, rounded to 100 km.

**Before printing:**
- Check where the bag's degassing valve and zip sit. An 18 cm label on a 20 cm bag reaches the zip line. If the valve is on the front, the label must not cover it: move the label below it or add a hole in the die line.
- Check the weight (250 g) matches the bag.

**Later (option 3):** a round Coffee Passport seal sticker and the vertical CAIRO ROAST wordmark on the bag.

## Colors

| Name | Hex | Use |
|---|---|---|
| Espresso | `#24160F` | Text, dark backgrounds |
| Roast (brand color) | `#B4552D` | The bean, buttons, Arabic name |
| Brass | `#C8963E` | Small accents only (lines, light-roast chip) |
| Sand | `#F3E9D8` | Light backgrounds, text on dark |
| Cream | `#FBF7F0` | Labels, cards |
| Nile | `#2F5D5A` | Rare accent: freshness, "in stock" |

## Type
- **Latin name:** IBM Plex Sans Arabic Bold, uppercase, wide letter spacing ("CAIRO ROAST").
- **Arabic headlines:** El Messiri Bold, warm with a hint of calligraphy.
- **Arabic body text:** IBM Plex Sans Arabic.

Both fonts are free (OFL) and already bundled in the website.

## Voice
- Egyptian Arabic, short and warm, the way a good coffee seller talks: "قولنا بتعمل قهوتك ازاي، واحنا نطحنها مظبوط" ("tell us how you make your coffee, and we'll grind it right").
- Concrete promises only: roast date, the grind, cash on delivery. No health claims and no "best coffee in Egypt".
- Fresh is the whole story: always show a date or "roasted after your order".

## Rules
- Keep clear space around the logo equal to the bean's width.
- Never stretch it, recolor the bean, or place it on a busy photo without the dark version.
- Smallest size: the mark at 24 px on screen, 8 mm in print. The horizontal logo at 120 px on screen, 30 mm in print.

## Note on the freshness promise
"بيتحمص بعد ما تطلب" ("roasted after you order") is the strongest message we have, but only if it's literally true. If you roast in batches, change post 1 and the story line to "اتحمص الأسبوع ده" ("roasted this week") and print the roast date on every bag.
