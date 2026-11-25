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
`labels/`: rebuild with `node brand/cairo-roast/labels.mjs`. Review sheet: `labels/all-labels.png`.

**The idea:** simple and premium on a white bag. A white label with a gold-foil arch frame, the logo, and one framed window. In the window: soft contour lines of the origin's hills (the journey) under a small still life of what the coffee tastes like. The notes are **drawn, never written**. English first, Arabic in support, lots of white space. Nothing about times of day, nothing religious.

| N° | Coffee | Still life |
|---|---|---|
| 01 | Ethiopia Guji Hambela | apricot, orange blossom, berries, coffee cherries |
| 02 | Ethiopia Limu | dark chocolate, orange slice, tea leaves |
| 03 | Brazil Red Catuai | hazelnuts, walnut, sugar cane |
| 04 | Colombia Castillo | tangerine, mango, caramel, oak leaf |
| 05 | Amber Blend | molasses dipper, dark chocolate, hazelnuts |
| 06 | Chrome Blend | caramel, dark chocolate, nuts |
| 07 | El Salvador San Agustín | a coffee branch with cherries (the coffee itself) |

- **Front** (95 × 135 mm, arch-shaped die cut, 3 mm bleed): logo, CAIRO ROAST, window, origin, name (English + Arabic), one journey line (origin ┈ ≈ km ┈ Cairo), N° and weight.
- **Back** (60 × 90 mm, rounded corners, 3 mm bleed): name, roast-date box, grind ticks, QR (tasting notes, brew guide and Coffee Passport stamp on the website), website and WhatsApp.

**Print:** `labels/front-<coffee>.svg` / `back-<coffee>.svg` (vector, fonts embedded) and 300 dpi PNGs; die lines `labels/dieline-front.svg`, `labels/dieline-back.svg`. Gold (#B08D57) = gold foil (outer frame, window frames, logo arch). Matte white sticker; soft-touch laminate optional. Front arch top about 5 cm below the bag's top edge, under the valve. Distances are approximate (origin region to Cairo, rounded to 100 km).

**Before printing:** replace the dashed QR box with each coffee's QR code (`cairoroast.com/p/<coffee>`); check the weight (250 g) matches the bag.

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
