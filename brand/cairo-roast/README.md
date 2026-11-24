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

## Bag labels: "CAIRO HOURS · ساعات القاهرة"
`labels/`: rebuild with `node brand/cairo-roast/labels.mjs`. Review sheet: `labels/all-labels.png`.

**The idea:** premium on a white bag. White labels that almost disappear into the bag, gold-foil arch frames and logo, English first with Arabic in support, and lots of white space. In the middle sits a small framed window onto Cairo: the same skyline on every bag, at a different hour, with the sun or moon drawn from the coffee's main tasting note. Under it, the journey from origin to Cairo ("≈ 2,800 KM TO YOUR CUP") and one story line, so people feel the trip before they taste. Numbered N° 01–07 as a collection.

| N° | Coffee | Hour | Sun / moon |
|---|---|---|---|
| 01 | Ethiopia Guji Hambela | Dawn · 5:30 AM | apricot, orange blossom |
| 02 | Ethiopia Limu | Morning · 8:00 AM | orange slice, tea steam |
| 03 | Brazil Red Catuai | Noon · 12:00 PM | hazelnut, sugar cane |
| 04 | Colombia Castillo | Afternoon · 3:30 PM | tangerine, felucca |
| 05 | Amber Blend | Sunset · 5:30 PM | molasses-amber sun |
| 06 | Chrome Blend | Night · 10:00 PM | chrome-silver moon |
| 07 | El Salvador San Agustín | Late evening · 12:00 AM | coffee-bean moon |

**Front for desire, back for use.**
- **Front** (95 × 135 mm, arch-shaped die cut, 3 mm bleed): brand, hour, the Cairo window, origin and name, the journey and story, tasting notes, process/variety/altitude and weight.
- **Back** (60 × 90 mm, 3 mm rounded corners, 3 mm bleed): roast-date box, grind ticks, a two-line brew recipe, QR ("scan to taste the journey": tasting game, brew coach, Coffee Passport), the passport stamp, WhatsApp and storage.

**Print:**
- Files: `labels/front-<coffee>.svg` and `labels/back-<coffee>.svg` (vector, fonts embedded), plus 300 dpi PNGs. Die lines: `labels/dieline-front.svg`, `labels/dieline-back.svg`.
- **Gold (#B08D57) = gold foil**: outer frame, window frames, logo arch. Without foil, print it as the brass colour.
- Stock: matte white sticker, so it melts into the white bag. A soft-touch laminate makes it feel premium in the hand.
- Placement: the front arch top about 5 cm below the bag's top edge (under the degassing valve); the back label centred on the back.
- Distances are approximate (origin region to Cairo, rounded to 100 km).

**Before printing:**
- Magenta brackets are placeholders: El Salvador's tasting notes, process, variety and altitude must come from Bonds.
- The dashed QR box: each code should open its coffee page (`cairoroast.com/p/<coffee>`).
- Weight is 250 g on every label; change it in `labels.mjs` if the 13 × 20 bag holds a different weight.

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
