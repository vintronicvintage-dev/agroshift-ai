# AgroShift brand v2

Version 2 replaces the v1 identity after the design review board judged it inadequate
(`docs/board/visual-direction.md` §2, `docs/ui-v3.md`). The v1 mark read as a generic italic "S",
said nothing about agriculture, orbit or rotation, and became a blob at 16 px. The v1 crop
illustrations read as clip-art with uneven weight, and the legumes could not be told apart at 24 px.
v2 is built for the board's **Ortho Console** direction: dark-first, imagery as the canvas, one
signal colour, and Archivo / Instrument Sans / Geist Mono.

Everything here was drawn by hand as SVG geometry (see §10, Provenance). Each candidate and final
asset was rendered with `sharp` and checked by eye before it was kept.

## 1. Logo concepts and decision

Five concepts were taken to a finished state. Each one was rendered at 16, 24, 32, 64 and 256 px on
the dark ground (`#0b0e0c`), on the light ground (`#f4f5f0`) and directly over the Harran Landsat
scene. Sheet: `public/brand/exploration/logo-candidates.png`.

| | Concept | Verdict |
|---|---|---|
| **a** | **Orbit furrows.** An orbital arc passes over a field whose three furrow bands run to the horizon. The middle band starts one step lower: that step is the shift. | **Chosen** (reasons below) |
| b | Three-year ring + seed: a ring cut by three spiralling gaps, with a seed in the negative space | Lost. It reads as a "G" or "6" and looks like an eye at 32 px. The seed is too small to survive at 16 px. |
| c | Parcel grid ground track: a 3×3 grid of parcels, with three solid cells on the diagonal path | Lost. It is the crispest at 16 px, but it is generic (app-grid, QR, "apps" icon) and does not say rotation. |
| d | Centre pivot, three sectors: a pivot hub with three sectors of stepping radius | Lost. At small sizes it reads as a pie chart, a fan or a shutter, and it is too close to the three-part Chrome-style round mark. |
| e | Shifted strip lens: a disc cut into three strips, with the middle one shifted sideways | Lost. Its shape is distinctive, but it reads as a hamburger or "stop" button, and the shifted strip changes the bounding box, so it aligns badly. |

**Why (a), judged against the brief:**
- **Rotation + land + from above, without a letter.** The arc is the satellite's pass, and the
  furrowed field is the land. The three bands are the three years. The stepped middle band is the
  year that shifts. There is no letterform in it.
- **Distinctive silhouette.** A broken ring over a cut semicircle. It does not look like an "S", a
  globe or a leaf.
- **One colour, reversed, 16 px.** It is a single flat path with no gradient. It works in
  `currentColor`, reverses cleanly, and has its own hinted drawing for 16 px (§2).
- **Honest weak spots.** At small sizes the silhouette can recall a steering wheel, a parachute or
  a helmet visor. Over busy imagery it needs the solid plate, which also applies to the wordmark (§4).

Marks I compared it against from memory: Chrome, the Mercedes-Benz star (relevant to d), the Stripe and
Spotify-style rounded S (the v1 problem), the Ubuntu circle of friends, steering-wheel and road
icons, the NASA meatball and the NASA worm. I see no close match for (a). **This is not a trademark
search** (see §11).

## 2. Construction

```
24-unit grid, circle R12 centred (12,12)

 arc      annulus R12 → R9.6 (2.4 thick), from 198° to 342° (18° above horizontal),
          radial terminals
 horizon  field top y = 13 (gap under the arc terminals ≈ 4.7 units)
 furrows  two slits converge to a vanishing point (12, 0.5): base width 2.4 at y = 24,
          tapering to ≈ 1.3 at the horizon (perspective). Furrow centre lines at x = 12 ± 5.2 on the base.
 shift    middle band starts at y = 15.5 (2.5 lower than the side bands = one arc thickness)
 clip     every band is clipped by the R12 circle, so the outer edge stays one circle
```

Optical corrections:
- The slits taper because of the perspective. The bottom 2.4 is wider than the arc, so the field
  does not fill in at 24–32 px.
- The arc terminals are radial, not horizontal. Horizontal ends made it read as a padlock shackle.
- The shift (2.5) is equal to the arc thickness, so it reads as a deliberate step rather than an error.

**Pixel-hinted 16 px drawing** (`MARK_PATH_16`). Rendered at 16 px, the master turns the slits into
grey smears. The hinted drawing is on a 16-unit grid:
- arc 2 px
- horizon on y 9, middle band from y 11
- **vertical 1 px furrows on whole pixels** (x 5–6 and 10–11), so the middle band is exactly 4 px

It gives up the convergence for clarity. `Logo variant="mark"` switches to it below 19 px. A
14-unit version (`MARK_PATH_14`) sits inside the 16 px favicon tile with a 1 px inset. Zoomed
checks were done on white, `#dee1e6`, `#35363a` and `#202124` tab colours.

### Wordmark
- Sentence case **"AgroShift"**, drawn to sit next to the board's display face **Archivo**
  (Google Fonts, `wdth` ~85, `wght` 600). It is not traced from the font. It is a condensed
  grotesque skeleton built on cap height 24, x-height 17.5 and baseline 30, with:
  - stadium bowls (straight-sided `o`, `g`)
  - a flat-apex `A`
  - a single-storey `g`
  - a square i-dot
  - a joined f–t crossbar
  - 0.4 overshoot on rounds
- **"Shift" is set in the heavier weight** (stroke 4.4 against 3.6 for "Agro"), as the board asked.
  This keeps the emphasis in a single colour, so no second hue is needed.
- **Outlined paths, not live text.** The same geometry renders identically in the React component,
  the static SVGs, the favicon pipeline and the `sharp`-rendered OG image. No font file or
  `next/font` call is needed at runtime, and nothing shifts while a font loads. Live Archivo would
  need `next/font` in `layout.tsx` (outside the brand scope) and still could not be used by the
  raster pipeline. In running text, the product name is set in the UI font as "AgroShift".

### Lockups
- **Horizontal** (`LOCKUP_H`, viewBox `0 3.5 150.2 36.1`):
  - mark 29 units, centred on the cap band (2.5 above the cap line, 2.5 below the baseline)
  - 7-unit gap, then the word
- **Stacked** (`LOCKUP_S`, viewBox `0 -49 114.2 88.6`): mark 46 units, centred, 9 units above the cap line.
- **Clear space:** ¼ of the mark height on every side (`BRAND_CLEAR_SPACE`).
- **Minimum sizes:**

  | Form | Minimum | Note |
  |---|---|---|
  | Mark | 16 px | hinted path at 16–18 px |
  | Horizontal lockup | 20 px high | cap ≈ 13 px |
  | Stacked lockup | 64 px high | |

  Below these, use the mark alone.

## 3. Colour roles for the mark

| Use | Mark | Word | Notes |
|---|---|---|---|
| Dark ground (`#0b0e0c`), default | signal `#d4ff3a` | ink-1 `#eef2ec` | 16.8:1 / 17.1:1 |
| Light ground (`#f4f5f0`) | deep signal `#3d5a00` | ink `#101612` | 7.2:1 / 16.7:1. **Never put the lime mark on a light ground.** |
| Over imagery | signal on the solid plate `rgba(11,14,12,.78)` | ink-1 | Without a plate, use it only at ≥ 56 px high (white over the bright Harran fields fails below that) |
| One colour / print | `currentColor` | `currentColor` | `tone="mono"` |

The signal colour in the mark is identity, not an "action" accent. The board's one-accent rule
still applies to UI content: do not repeat the lime on other decoration next to the logo.

## 4. Usage rules
- Use `<Logo tone="auto">` in the app, `tone="light"` on imagery plates, `tone="dark"` on light
  print, and `tone="mono"` where the colour comes from the context.
- Keep the mark one flat colour. Do not recolour the bands separately, add gradients, outlines,
  shadows or glow, rotate, mirror or stretch it, or remove the shift.
- Do not set "AgroShift" in another font as the logo. Do not rebuild the lockup spacing by hand.
- Do not place the mark next to the NASA insignia or imply endorsement.

## 5. Crop glyphs (replace clip-art in the data UI)

`<CropGlyph crop size title? className? strokeWidth? />`: inline SVG, `currentColor`.

**Grid rules:**
- 24-unit grid, live area 2..22
- one stroke weight 1.75 units (1.17 px at 16, 1.75 px at 24), round caps and joins
- no fills except tiny round-cap dots
- one identifying feature per crop

| Crop | Feature kept |
|---|---|
| wheat | plump awnless ear with two kernel chevrons, blade leaf |
| barley | slim ear with three long fanning awns |
| chickpea | one inflated oval pod with a hooked beak, and a pinnate frond on the stalk |
| lentil | two flat lens pods on a forked stalk |
| dry bean | one long diagonal pod with three seed bulges and a hooked tip |
| vetch | twining stem, curling tendril, pea flower |
| sugar beet | conical root under a crown of three stalks |
| maize | cob with a row line, held by two husk leaves |
| sunflower | seed disc inside a 9-point ring of ray florets |
| cotton | three lint locks sitting in a bract cup, on a stalk |
| alfalfa | trifoliate leaf, and a raceme of three florets |
| fallow | bare furrows running to a horizon (it echoes the mark) |

**Legibility test.** All 12 glyphs were rendered at 16, 20, 24 and 48 px, on dark and white, in
pure monochrome, plus a ×5 nearest-neighbour zoom of the 16 px row. Sheet:
`public/brand/exploration/crop-glyphs-legibility.png`.

Fixes made after reading the sheets:

| Glyph | First draft read as | Fix |
|---|---|---|
| chickpea | the ♂ / Taurus sign (circle plus diagonal stalk) | pod became a tilted oval with a curled beak; the frond moved to a vertical stalk |
| dry bean | a crescent moon (it also collided with the UI `moon` icon) | became a straight bulging pod |
| cotton | a hail cloud, then a crosshair | became locks in a bract cup |
| maize | a microphone (capsule on a U stand) | husk became two leaves hugging the cob |

The legume trio is now separated by silhouette: one round pod, two small lenses, one long pod.

**Hardest pairs still standing:**
- **wheat vs maize** at 16 px: both are a vertical ear on a stem. The difference is one leaf against two husk leaves.
- **cotton** at 16 px reduces to a round outline on a stalk. It is still unique in the set, but it is the least self-explanatory.
- **alfalfa** at 16 px reads as "small plant + dotted stick".

**Rule:** below 20 px, always show the crop name next to the glyph.

`CropArt` (same props as v1) now draws the glyph, so existing screens pick up the new language
without changes. The v1 illustrations are retired. `public/illustrations/crops/<id>.svg` now holds
the monoline glyphs (`currentColor`) for docs and print.

## 6. Crop-family textures (timeline bands, map fills)

One pattern per family. Tiles are in CSS px (`patternUnits="userSpaceOnUse"`), so the density is
the same in an 8 px band and on a map polygon.

**How the marks are drawn on the base colour:**
- **Dark theme:** marks in ground `#0b0e0c` at 45 % on the family colour.
- **Light theme:** marks in white at 55 % on the family colour.
- **Fallow:** a faint base (16 % / 12 %) with a hatch in the neutral colour, so it reads as bare.

Colours are from `docs/board/map-and-dataviz.md` §5.1.

| Family | Crops | Pattern | Tile | Dark | Light |
|---|---|---|---|---|---|
| cereal | wheat, barley, maize | fine `/` diagonal | 4×4 | `#D9B44A` | `#8F6B00` |
| legume | chickpea, lentil, dry bean | staggered dots | 5×5 | `#CC79A7` | `#9E3F78` |
| root | sugar beet | horizontal lines | 4×4 | `#9D8DF1` | `#5645C4` |
| oilseed | sunflower | diagonal crosshatch | 5×5 | `#A8C93A` | `#5A7A00` |
| fibre | cotton | vertical lines | 3×3 | `#8BB1C6` | `#3B6A85` |
| forage | alfalfa, vetch | zigzag | 6×5 | `#8FC79A` | `#2F6E3E` |
| fallow | fallow | wide `\` hatch, bare base | 6×6 | `#8A9690` | `#6B756F` |

**Deviations from the board, flagged:**
- The board has no **forage** colour. The sage pair above is a brand addition. It sits near the
  `crop` and "good" greens, so run the colour-vision validator before merge. The texture is the
  real safety net.
- **Vetch** moved from legume to forage because its role in the product is "yem/örtü" (feed/cover).

**Checked:** 8 px and 16 px bands and a map polygon, on dark and light, and the same sheet in
greyscale (`public/brand/exploration/crop-textures*.png`). In greyscale every family is distinct by
pattern. At 8 px the hardest group is legume / oilseed / forage, which all become fine "noise",
so the crop name or glyph must ride with the band.

**API:** `cropTexture.ts` exports:
- `TEXTURE_FAMILIES`, `TEXTURE_FAMILY_ORDER`, `CROP_TEXTURE_FAMILY`, `cropFamily()`
- `texturePatternId()`, `textureFill()`, `cropTextureFill()` (SVG, needs `<CropPatternDefs />` once per page)
- `textureTileSvg()`, `textureDataUri()`, `textureStyle()`, `cropTextureStyle()` (HTML/CSS backgrounds)
- `textureEdge()`

Static tiles are in `public/illustrations/textures/<family>-<theme>.svg`.

## 7. Spot illustrations

All spots are 240×160, monoline 2 units in `currentColor`, with secondary lines at 40 % opacity.
They are drawn top-down in the same parcel language as the mark. `<SpotArt name width title?
className />` renders them inline, so they take the text colour (e.g. `text-ink-2`).

| Spot | What it shows |
|---|---|
| `no-field` (restyled) | dashed empty parcel and pin |
| `loading-data` (restyled) | satellite on a dashed orbit, scanning a field |
| `no-alerts` (restyled) | furrowed parcel and a check |
| `email-sent` (restyled) | envelope and a dashed path |
| `draw-field` (new) | polygon with vertex handles, one vertex being moved (ghost edges dashed), no hand |
| `data-cells` (new) | field inside nested satellite pixels: coarse cell, medium grid, fine grid |
| `offline` (new) | signal arcs, outer two dashed, and a cross |
| `print-share` (new) | A4 sheet with a numeral block and a textured ribbon, plus a share graph |

Sheet: `public/brand/exploration/spots.png`. Static copies with a fixed ink `#7d897f` are in
`public/illustrations/spots/`.

## 8. App icons and Open Graph
- `src/app/icon.svg`: the master mark, `#3d5a00` by default and `#d4ff3a` under `prefers-color-scheme: dark`.
- `src/app/favicon.ico` has three frames:
  - 16: the hinted 14-grid mark on a `#0b0e0c` tile with r3
  - 32 and 48: the master mark on the tile
- `src/app/apple-icon.png`: 180×180, signal mark on `#0b0e0c`, 32 px inset.
- `src/app/opengraph-image.png`: 1200×630.
  - The Harran Landsat 7 scene is the full canvas. The left 600 px carry the solid ground plate
    (86 %) with the lockup and the product line "Üç yıllık ekim nöbetini su, toprak ve riskle
    tart.", plus one supporting line.
  - The right side shows the scene with Ortho Console corner ticks and a mono sensor caption.
  - The credit is visible in two lines.
  - The OG text is set in Segoe UI / Consolas, because the raster pipeline cannot read the app's
    `next/font` subsets. Swap in Instrument Sans / Geist Mono TTFs if they are added to the repo.

## 9. Inventory

| File | Size | Notes |
|---|---|---|
| `public/brand/mark.svg`, `mark-on-dark.svg` | 0.4 KB | signal `#d4ff3a` |
| `public/brand/mark-on-light.svg`, `mark-deep.svg` | 0.4 KB | `#3d5a00` (`mark-deep` kept for v1 links) |
| `public/brand/mark-mono.svg` | 0.4 KB | `currentColor` |
| `public/brand/mark-16.svg` | 0.3 KB | hinted 16-grid, `currentColor` |
| `public/brand/wordmark.svg` | 1.1 KB | `currentColor` |
| `public/brand/lockup-horizontal{,-on-dark,-on-light}.svg` | 1.4 KB each | |
| `public/brand/lockup-stacked{,-on-dark,-on-light}.svg` | 1.4 KB each | |
| `public/brand/exploration/*.png` | 15–304 KB | logo candidates, glyph legibility, textures (colour + greyscale), spots |
| `public/illustrations/crops/<id>.svg` × 12 | 0.25–0.55 KB | monoline glyphs |
| `public/illustrations/spots/*.svg` × 8 | 0.4–0.9 KB | |
| `public/illustrations/textures/<family>-<theme>.svg` × 14 | ~0.25 KB | pattern tiles |
| `src/app/icon.svg` | 0.4 KB | |
| `src/app/favicon.ico` | 2.6 KB | |
| `src/app/apple-icon.png` | 4.0 KB | |
| `src/app/opengraph-image.png` (+ `.alt.txt`) | 511 KB | palette PNG |
| `src/lib/ui/brand.ts` | | mark, hinted marks, wordmark paths, lockups, colours, minimum sizes, clear space |
| `src/components/brand/Logo.tsx` | | `Logo` |
| `src/components/brand/CropGlyph.tsx`, `cropGlyphs.ts` | | `CropGlyph`, `CROP_GLYPHS` |
| `src/components/brand/CropArt.tsx` | | `CropArt`, kept for compatibility |
| `src/components/brand/cropTexture.ts`, `CropPatternDefs.tsx` | | textures |
| `src/components/brand/SpotArt.tsx`, `spots.ts` | | `SpotArt`, `SPOT_MARKUP`, `SPOT_TITLES` |

## 10. Provenance
- **Hand-authored geometry.** Every mark, letter, glyph, texture and spot is geometry written by
  hand as code. Small Node scripts were used for the construction:
  - circle–polygon clipping with exact arcs for the mark
  - centreline lettering for the word
  - lens and lobe helpers for the glyphs

  They were scratch tooling and are not part of the repo. The resulting values live in
  `brand.ts`, `cropGlyphs.ts`, `cropTexture.ts` and `spots.ts`, and in §2.
- **No generated or stock imagery.** No image generator, stock source, icon library or font
  outline was used for any final or intermediate asset.
- **The only third-party pixels.** These are in the OG image: the Harran Plain Landsat 7 scene
  (24 Aug 2002, USDA FAS / NASA Earth Observatory, public domain; see `public/images/CREDITS.md`).
  It is credited on the image.

## 11. Not checked
- **No trademark clearance.** No clearance search was done in any register (TÜRKPATENT, EUIPO,
  USPTO, WIPO). The "compared against" list in §1 is from memory only. Run a proper search before
  any commercial use or registration.
- **Colour-vision simulation.** No colour-vision simulation was run on the texture palette
  (same caveat as the board's §5.1).
- **Real devices.** The wordmark was not tested on real devices below 20 px.

## 12. Licence
The logo, wordmark, glyphs, textures and spot illustrations are original work made for AgroShift
(NASA Space Apps Challenge 2026, "Field Shift") and are owned by the AgroShift team. Using NASA data
and imagery does not imply NASA endorsement.
