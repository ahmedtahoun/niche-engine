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

## Bag labels: "ساعات القاهرة · Cairo Hours"
`labels/`: rebuild with `node brand/cairo-roast/labels.mjs`.

**The idea:** the label is die-cut in the logo's Cairo arch. Inside the arch is the same Cairo skyline on every bag (domes, minarets, the Cairo Tower, the logo's Nile), each coffee at a different hour of the day, with the sun or moon drawn from its main tasting note. Seven hours make a collection, and each hour suggests when to drink it.

| Coffee | Hour | Sun / moon |
|---|---|---|
| Ethiopia Guji | Dawn · 5:30 AM | apricot sun, orange blossoms, berries |
| Ethiopia Limu | Morning · 8:00 AM | orange-slice sun, tea steam |
| Brazil Red Catuai | Noon · 12:00 PM | hazelnut sun, sugar cane |
| Colombia Castillo | Afternoon · 3:30 PM | tangerine sun, felucca |
| Amber Blend | Sunset · 5:30 PM | molasses-amber setting sun |
| Chrome Blend | Night · 10:00 PM | chrome-silver moon, stars |
| El Salvador San Agustín | Late evening · 12:00 AM | coffee-bean moon (notes to confirm) |

**Print:** label 95 × 135 mm trim, 3 mm bleed (101 × 141 mm), arch-shaped die cut (`labels/dieline.svg`, magenta line). Files: `labels/label-<coffee>.svg` (vector, fonts embedded) and `.png` (300 dpi). Keep text 3 mm inside the cut. Bag: white 13 × 20 cm; the label's arch top sits about 5 cm below the top edge, under the degassing valve. Paper: matte white or cream sticker, or kraft for a craft look (colours shift on kraft: proof first).

**Before printing:**
- Anything in magenta brackets is a placeholder: El Salvador's variety, process, altitude and tasting notes must come from Bonds.
- The dashed QR box is a placeholder: each label's QR should open its coffee page (`cairoroast.com/p/<coffee>`), where the tasting game is.
- Weight (250 g), roast date and grind are written or ticked by hand on each bag.

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
