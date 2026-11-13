# AgroShift brand

The whole identity is original work for this project. The logo was built by hand on a grid, and
so were the 12 crop illustrations and 4 spot illustrations. No generator, stock source or template
was used for any of them (see "How each asset was made").

## 1. Logo concept exploration

Each concept was drawn as SVG and rendered at 16, 24, 32, 64 and 256 px on the dark and light grounds.

| # | Concept | One line | Verdict |
|---|---|---|---|
| 1 | Three turning bands | Three field strips rotated 120° into a pinwheel, one for each rotation year | Says "rotation", but at 16 px it turns into a generic fan or recycling sign |
| 2 | Rows from orbit | A circle (centre pivot, Earth) with parallel furrow lines | At small sizes it reads as a striped ball. Too close to many "globe" marks |
| 3 | Orbit track + furrow | An orbit ellipse whose lower arc becomes a straight furrow | Two thin lines vanish at 16 px and need a gradient to show depth |
| 4 | Water / soil / crop triad | Three dots or strips in blue, amber and green (the v1 wordmark) | Depends on colour, so it breaks in one colour. Looks like a status legend |
| 5 | Shifting parcel | A square of three strips with the middle strip pushed sideways | Reads as a generic "layers" icon |
| 6 | Plough path S | One thick stroke ploughing three passes with two U-turns, which forms an S | Good meaning (three passes = three years, S = Shift), but at small sizes it is just the letter S |
| 7 | Parcel with furrows | A rounded square with two furrows cut in from alternate sides | Crisp at 16 px, but the square silhouette is generic |
| **8** | **Leaf parcel (chosen)** | **Concept 7, with only the two corners where the plough turns rounded to R12. The silhouette becomes a leaf** | **See below** |

### Why the leaf parcel
- **One idea, three meanings.** The outline is a leaf (crop). Inside, two furrows cut a single
  plough path in three passes (the three-year rotation). The path draws an S (Shift). The
  rounded corners are exactly where a tractor turns at the headland, so the leaf shape comes out
  of the ploughing logic instead of being added on top.
- **Works at 16 px.** On the 24-unit grid the bands are 6 units and the furrows 3. At 16 px that
  is 4/2/4/2/4 px, so every edge falls on a whole pixel (checked by rendering, see section 3).
- **One colour, reversible, no gradients.** It is a single filled path, so it works in `currentColor`
  and on either ground.
- **Distinctive silhouette.** A leaf with two notches on opposite sides. It does not depend on
  colour, and it is not a letter in a box.
- **Not borrowed.** It does not use the NASA insignia, the "FarmEsy" reference or any other existing mark.
  We did no trademark search; please run one before any commercial registration.

## 2. Construction

```
24-unit grid                      R12 = turn corners (top-left, bottom-right)
 y 0 ┌───────────────────────┐    r1.5 = free ends (top-right, bottom-left), optical softening only
     │ band 1 (year 1)       │    furrow ends: semicircles r1.5
 y 6 │      ╭────────────────     furrow 1: y 6–9, opens right, from x 7.5
 y 9 │ band 2 (year 2)       │    furrow 2: y 15–18, opens left, to x 16.5
 y15 ────────────────╮       │    furrow length 16.5, so at the furrow tip each turn is ~6.6 units
 y18 │ band 3 (year 3)       │    thick (a bit more than the 6-unit band: optical correction so the
 y24 └───────────────────────┘    turns don't look pinched where the R12 curve thins them)
```

- **Wordmark:** custom monoline lowercase `agroshift`. Strokes 3.4 on a grid of x-height 14,
  ascender 12, baseline 34 and descender 41, with 0.3 to 0.4 overshoot on round letters. The `s` is
  the mark's plough path in small, the `f` and `t` share one crossbar (a furrow line), and the
  i-dot is square like the mark's free ends. Butt caps throughout, to match the mark's cut ends.
- **Horizontal lockup:** the mark spans ascender to baseline (22 units), followed by a 7-unit gap and the word.
- **Stacked lockup:** the mark is 36 units tall, centred, and sits 8 units above the ascender line.
- **Pixel-hinted 16 px variant** (`MARK_PATH_14` in `src/lib/ui/brand.ts`): a 14-unit grid with
  bands 4 and furrows 1, drawn on a dark 16 px tile. Used only for the 16 px frame of `favicon.ico`.
- All geometry lives in `src/lib/ui/brand.ts`. The SVG files and the `Logo` component are built
  from those same paths.

### Clear space and minimum size
- Clear space on all sides is 1 band (¼ of the mark height). For the horizontal lockup that is
  ¼ of the lockup height. Keep text, borders and other marks out of it.
- Minimum size: mark 16 px, horizontal lockup 18 px high, stacked lockup 48 px high. Below 16 px,
  use the mark alone (the hinted 14-unit path at 14 to 16 px).

## 3. What was rendered and fixed
- Mark sheets at 16, 24, 32, 64 and 256 px on `#0d1310` and `#edf1e9`, in sprout, paper and ink colours.
  Concepts 6 (plain S) and "S + seed dot" were dropped after looking: the plain S read as a
  letter, and the dot turned the S into an emoticon.
- Wordmark: in the first render the bowls went missing (a degenerate full-circle arc), so circles
  were redrawn as two half arcs. The i-dot rendered as a ring and became a square dot. The weight
  went from 3.2 to 3.4 to sit next to the heavy mark. The i-ft spacing was opened, because the f
  crossbar nearly touched the i.
- Favicon: a full-bleed olive 16 px frame was dull on dark tab strips. It was replaced by the
  hinted mark on a dark tile, then checked on white, `#dee1e6`, `#35363a` and `#202124` tab colours.
- OG image: the headline was rebroken into two even lines, the sub-copy widow was fixed, the
  credit line was kept to one line, and the file went from 994 KB to 309 KB (palette PNG).
- Crops: wheat ears read as smooth "cattails", so the kernels became two-tone chevrons with gaps.
  Bean pods and the maize cob were enlarged, and lentil pods were enlarged. Fallow went from a
  brown box to a ridged field. The leaf green moved from `#5aa844` (2.6:1 on the light ground) to
  `#4a963a` (3.2:1 light, 5.1:1 dark). Barley straw was deepened so it holds on the light ground.

## 4. Colour and type tokens (as used; source: `src/app/globals.css`)

| Role | Dark | Light | Contrast notes |
|---|---|---|---|
| ground `--paper` | `#0d1310` | `#edf1e9` | |
| text `--ink` | `#e6ede4` | `#142019` | 15.7:1 / 14.7:1 on paper |
| secondary `--ink-2` | `#a3b2a7` | `#4a5a50` | 8.5:1 / 6.4:1 |
| mark colour `--accent-ink` | `#c8f25a` sprout | `#456100` deep | 14.6:1 / 6.2:1. Sprout on the light ground is 1.1:1: **never** put the sprout mark on a light ground |
| on accent | `#0f1707` on `#c8f25a` | same | 14.2:1 |
| water `--sky` | `#7cc0ea` | `#1f5f8b` | 9.5:1 / 6.0:1 |
| soil `--loam` | `#e2ae73` | `#7a4a21` | 9.4:1 / 6.5:1 |

- Type: **Bricolage Grotesque** (display: titles and the verdict), **Hanken Grotesk** (UI, body and
  every number, with tabular figures). The logo uses its own lettering, so it needs no font.
- The OG image's product line is set in Segoe UI. Hanken is only available to the app through
  `next/font` as subsetted woff2, which the raster pipeline cannot read. Swap it if a Hanken TTF is
  added to the repo.
- Spacing: a 4 px base (Tailwind scale). Radius: cards 12 to 16 px, controls 8 to 10 px,
  pills only for small controls, icon tiles 3.5 px at 16 px and 7 px at 32 px.

## 5. Illustration style rules
- **Crops:** `viewBox 0 0 64 64`. Every crop stands on the same soil strip
  (`x 8–56, y 55–59, r 2`, `#9a6337`). The only exception is sugar beet, which uses a soil
  cut-away so the root is visible.
- **Spots:** `viewBox 0 0 240 160`, all built on one isometric parcel grid (u = (30,12),
  v = (−30,12), parcels inset to 84 %), with a soft ground shadow.
- **Flat fills only:** no gradients, no outlines except a `#cdbfa5` 0.8 edge on cream/white parts
  (cotton lint, beet root, beans, envelope) so they hold on the light ground.
- **Shared tones:** stem `#3e7b34`, leaf `#4a963a`, light leaf `#86c25a`, soil `#9a6337` / `#6f4524`,
  cream `#f3eee3`. Each crop adds one hue of its own: wheat gold `#e2ae48`/`#c48e2c`, barley straw
  `#cfb460`, chickpea pod `#c9c27a`, lentil seed `#d75f3b`, maize `#f0bf2e`, sunflower `#f4c430` with
  a `#6b3f1d` disc, bean pod `#cfa96a`, alfalfa `#8b6cc9`, vetch `#a66bc0`, cotton bract `#7a5233`.
- **Line hierarchy:** main stems 2 (maize 2.4, sunflower 2.6), side stems 1.6, leaf rachis 1.2,
  tendrils 1, awns 0.8. Round caps and joins.
- **Botanical cues, so a farmer can tell them apart:** wheat has upright, broad, two-tone kernel
  ears with only tip awns. Barley has slim, nodding ears with long awns. Chickpea has round pinnate
  leaflets, puffy inflated beaked pods and beaked seeds. Lentil has narrow leaflets with tendril
  tips, small flat pods and red split seeds. Sugar beet has a white conical root with growth rings
  under a rosette. Maize has a tassel, strap leaves, and a husked cob with kernels and silk.
  Sunflower has a ray-petal head and heart leaves. Dry bean has pointed trifoliate leaves, tan dry
  pods and white kidney beans. Alfalfa has small trifoliates and dense purple racemes. Hungarian
  vetch has twining stems, curling tendrils and pea-shaped violet flowers. Cotton has a woody stem,
  open white bolls on brown bracts and a palmate leaf. Fallow is a bare ridged field with no plant.
- **Legibility:** checked at 28, 40, 64, 96, 128 and 150 px on both grounds. The legumes
  (chickpea, lentil, bean) are the closest trio at 28 px, so always show the crop name next to the art.
- **Honesty:** these are illustrations. They identify a crop, but they never stand in for a photo,
  a satellite image or a data value.

## 6. Do / don't
- Do use `<Logo tone="auto">` in the app, `tone="light"` over the Landsat panel and `tone="dark"` on paper prints.
- Do keep the mark in one flat colour. Do keep the clear space.
- Don't put the sprout `#c8f25a` mark on a light ground. Use `#456100` there.
- Don't recolour the three bands separately, add gradients, shadows or outlines, rotate or
  mirror the mark (mirroring turns the S into a Z), or stretch it.
- Don't set "agroshift" in another font as the logo. Use the drawn wordmark. In running text, the
  product name stays "AgroShift".
- Don't place the mark next to the NASA insignia or imply endorsement.

## 7. Asset inventory

| File | Size | Made |
|---|---|---|
| `public/brand/mark.svg` (sprout), `mark-deep.svg` (`#456100`), `mark-mono.svg` (`currentColor`) | ~0.3 KB each | hand-constructed |
| `public/brand/wordmark.svg` (`currentColor`) | 0.7 KB | hand-constructed lettering |
| `public/brand/lockup-horizontal.svg` / `-on-dark.svg` / `-on-light.svg` | ~1 KB | generated from the same paths |
| `public/brand/lockup-stacked.svg` / `-on-dark.svg` / `-on-light.svg` | ~1 KB | as above |
| `src/app/icon.svg` | 0.3 KB | mark, `#456100` by default, sprout under `prefers-color-scheme: dark` |
| `src/app/favicon.ico` (16 hinted tile, 32 tile, 48 tile) | 1.8 KB | rasterised with sharp, PNG-in-ICO written by script |
| `src/app/apple-icon.png` 180×180 | 2.4 KB | sprout mark on `#0d1310`, 30 px inset |
| `src/app/opengraph-image.png` 1200×630 + `.alt.txt` | 309 KB | sharp composite: lockup, product line, Harran Landsat 7 scene (public domain, USDA FAS / NASA Earth Observatory, see `public/images/CREDITS.md`), visible credit |
| `public/illustrations/crops/<cropId>.svg` × 12 | 0.3–3.9 KB (≤ 4 KB) | hand-authored |
| `public/illustrations/spots/{no-field,loading-data,no-alerts,email-sent}.svg` | 0.9–1.5 KB | hand-authored |
| `src/lib/ui/brand.ts` | | paths, viewBoxes, lockup geometry, colours, minimum sizes |
| `src/components/brand/Logo.tsx`, `CropArt.tsx`, `SpotArt.tsx` | | components |

## 8. How each asset was made
- Every SVG was written by hand as code, using small Node generators (the geometry is in
  `brand.ts`, and the illustration helpers place kernels, leaflets and petals). Every file was
  rasterised with `sharp` and reviewed visually before it was kept.
- No generative tool produced any final or intermediate asset. Figma was planned for the UI kit
  and as a source of generated candidates, but the Figma connector returned server errors
  for the whole session, so nothing came from it. Canva image generation was not used.
- Stock sources: Pinterest pins are not licensed for reuse (inspiration only, nothing taken).
  Freepik needs an account and attribution and blocks scripts, so nothing was taken from it.
- The only third-party pixels are in the OG image: the Harran Plain Landsat 7 scene, a public-domain
  US government work, credited on the image itself.

## 9. Licence
The logo, wordmark, lettering and illustrations are original work made for AgroShift (NASA Space
Apps Challenge 2026, "Field Shift"), owned by the AgroShift team. Using NASA data and imagery does
not imply NASA endorsement.
