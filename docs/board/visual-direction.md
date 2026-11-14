# AgroShift: visual direction review (visual design, art direction, brand)

Reviewer lens: visual design and brand. Evidence: 1440/390 dark and light screenshots (genel, oneriler, kanit,
tarlam, giris, yontem), the brand renders, `docs/brand.md`, `globals.css`, `public/illustrations`, `public/images`.
Contrast ratios below were computed (WCAG 2.x), not estimated.

## 0. Verdict in one paragraph

The app is clean, honest and well organised, but it reads as "a very careful dashboard", not "a product with a point
of view". The strongest asset (real NASA imagery) is used as 192 px thumbnails and one coastline-scale basemap, while
the weakest assets (clip-art crop icons, a generic italic S, a serif that has nothing to do with the data) carry the
brand. The reference the owner liked gets its power from three things this build does not have: imagery as the
canvas (not as a decoration), numerals set large enough to be the layout, and one accent used with discipline.
Recommendation: rebuild the shell and data language around Direction A (Ortho Console), borrowing B's quiet,
printed-table honesty for the Kanıt and Yöntem pages. Redo the logo and drop the crop illustration set in favour of a
glyph + imagery system.

## 1. Scored rubric (0-10)

| Criterion | Score | Reason |
|---|---|---|
| Hierarchy | 6 | Verdict headline is clear, but below it every section is the same weight: 12 stacked blocks on `genel`, no focal point after the first 600 px. |
| Typography | 5 | Newsreader serif headings + Hanken + Plex Mono is competent but three voices fight; serif "Planlar", "Dikkat edilecekler" labels sections like a magazine, numerals in mono (`551`, `1.191`) look like a terminal, not a farm product. |
| Colour | 6 | Restrained and meaningful, lime accent is right. But dark green-black plus mustard banner plus orange/blue bars plus lime plus amber crop fills is 6 hues on one screen; light mode is beige and flat. |
| Spacing / rhythm | 6 | Consistent 4 px scale, but long vertical stack with no density change; large dead areas (Planlar table leaves 150 px empty under row 4 next to a taller alerts column; tarlam right column ends 400 px above the left). |
| Imagery | 4 | Real satellite imagery is the product's best material and is nearly absent: a 450x270 Blue Marble crop of Anatolia on `genel` (continental scale, useless for a field), 40 px thumbnails in the checklist, hero on login only. No field-scale scene anywhere in the dashboard. |
| Iconography / illustration | 4 | Crop icons are clip-art (see section 2); nav uses generic line icons; spot illustrations are a different style (isometric tiles) than the crops. |
| Brand distinctiveness | 4 | Lime-on-near-black with a lowercase wordmark is the default "AI/dev-tool/fintech" look; nothing says agriculture, orbit or rotation. |
| Consistency | 7 | Tokens are disciplined, states consistent. Docked points: chart bars in `genel` use different colours/shape language than the rotation strip, serif on some labels and sans on others. |
| Craft / polish | 6 | Aligned, accessible, no glitches. But hatched Nadas bar with label drawn over hatching, truncated select "Buğday (kı...", `1.191` rendered in mono with Turkish thousands dot looks like a decimal, tiny 11-12 px helper text everywhere. |
| Emotional tone / trust | 6 | Honest disclaimers and data-quality notes build trust with judges; a farmer sees a mustard "guest mode" banner and a wall of 12 px grey text. Feels like a prototype by careful engineers, not a tool made for a Konya farmer. |

Overall: about 5.4 / 10. Good bones, no signature.

## 2. Logo, wordmark and crop illustrations

### Logo and wordmark (render: `brand\final-mark.png`, `final-lockups.png`)
- Does it read as S-only? Yes, completely. The mark is an italic-looking rounded S with two horizontal cuts. The
  "leaf parcel / three passes" story in `brand.md` is invisible; nobody will see a leaf, a plough path or three years.
  The mark is also very close to "Stripe-S" and "Spotify-like" rounded-S marks and to many fintech glyphs.
- Agriculture, orbit, rotation? None of the three. No horizon, field, furrow convergence, ring, arc, grain or
  satellite cue survives. The concept only works if the explanation is attached.
- 16 px: it survives as a lime blob; legible as "something S-like" only because of context. The bespoke 14-unit
  hinted tile is good craft but cannot add meaning that the shape lacks. Two cuts become two 1 px slits.
- Wordmark: custom lowercase `agroshift` is clean, but it is a geometric sans with no feature; the shared f/t bar is
  a nice detail that disappears below 20 px. Lowercase + geometric + lime is the 2023 startup default.
- Clear-space and "never mirror" rules are fine, but the rules document a mark whose idea is weak.

Fix (recommended, redo): drop the S. Candidate marks that carry all three ideas in one flat shape:
1. **Converging furrows in a circle (orbit lens)**: a full circle (orbit/earth) clipped, inside it 3 straight
   parallel-then-converging furrow lines drawn as one wedge sweep, with one stripe offset by one step (the shift).
   Reads at 16 px as "circle with lines" and at 64 px as a field seen from orbit. Needs circle + 3 bars only.
2. **Three-band ring**: a thick ring cut into three 120 degree arcs, each arc a different length/offset (3 years of
   rotation), one arc extended into a short straight tangent (an orbit leaving). Rotation + orbit; agriculture comes
   from the wordmark and imagery.
3. **Quad-tile ground-track**: a 3x3 parcel grid of squares with one diagonal path through three cells (the 3-year
   rotation) and a tiny offset square (shift). Strong at 16 px (3x3 pixels), unmistakably "parcel from above".
Pick one; render at 16/24/32/64 on dark, light and over satellite imagery before accepting. Wordmark: keep drawn,
but set in sentence-case "AgroShift" in the chosen UI display face (e.g. Archivo wdth 112 / Fraunces / Sora per
direction) with the "Shift" in the accent weight. Never lime-on-light.

### Crop illustration set (render: `brand\crops-grid-dark.png`)
- Honest critique: competent, botanically careful, and still clip-art. Flat vector "stock icon" style at 64 px,
  each with a soil strip, reads like a children's garden app or a seed catalogue. 12 different silhouettes with
  different visual weights (cotton and sunflower dominate, vetch and chickpea are noise) so tables look uneven.
- In context (`genel` plans table, `oneriler` rows) they are 24-28 px, where wheat/barley/vetch/chickpea/lentil are
  indistinguishable (brand.md concedes this), and they clash with the satellite imagery and the cold data
  typography. They are the single biggest "machine-made" signal: same-bright-green leaves, identical soil bars.
- The isometric spot illustrations (email, satellite over tiles) are a third style; the satellite-over-tiles spot is the
  only piece that actually says AgroShift.
- Recommendation: **retire the set from the data UI**. Replace with (a) a crop *glyph* system: 12 monoline
  or solid 20x20 glyphs on one grid, same stroke, 2 px, distinguished by silhouette only (ear, pod, disc, leaf,
  boll), always paired with a colour-coded crop chip; and (b) real or abstracted *field texture swatches*: a
  circular crop of satellite imagery or a procedural row/stripe pattern per crop in the rotation strip (wheat
  gold fine stripes, fallow bare hatch, vetch violet-green). Keep the 12 illustrations only for onboarding/empty
  states at 96+ px if desired, restyled with a single outline weight and 4 colours max.

## 3. What still looks generic or machine-made, per screen

**Genel bakış (1440 dark)**
- Stack of equal-weight sections separated by hairlines; the "Başlarken" 5-step checklist with 40 px thumbnails is the
  single most template-like strip (onboarding-wizard pattern at the top of a working dashboard).
- Map is a 450x270 box of Blue Marble at country scale with a yellow ring: the farmer cannot see their field; the
  most valuable pixels are unused. Basemap and brand imagery are strangers.
- Three metric numbers (551, 1.191, 640 mm) in mono with tiny unit and a one-line gloss: a stat-row cliche; no
  comparison, no sparkline, no reference.
- Water-balance bar chart is a default grouped bar chart (blue/orange) with an unstyled axis; the "Denge" row of
  signed numbers under it is the better idea and should be the chart.
- Rotation strip (amber/hatch/green blocks) is the one native-looking component but is tiny, shows labels over
  hatching, and has no sense of time.
- Soil indicator: six identical thin green bars, unequal lengths, no scale marker, no threshold.
- Footer legal text at 12 px grey twice on every page.

**Genel (1440 light)**: beige on beige. Panels and background differ by 4 percent; hatched nadas pattern and lime
button are the only contrast. Reads as a themed copy, not a designed light mode. Accent lime button on light needs a
dark outline to survive; "Planları karşılaştır" borders it with a darker lime, which reads as a lime pill from 2022.

**Öneriler (1440 dark)**: table of 4 rows plus one expanded card; the expanded detail repeats the same stat/bar/slider
widgets in 12 px text; "Su açığı 74 mm/yıl" with a tiny range slider has no visual anchor. Scenario segmented control is a white
slab that is the brightest object on the page, brighter than the verdict. The 14 px lime "En uygun" pill is the only accent.

**Kanıt (1440 dark)**: default Recharts-like grouped chart (blue bars + orange line + dashed trend); tab row
mixes lime pill with plain text; the right "Terimler" accordion is plain. This is the screen judges will inspect and it
looks the most "chart library default".

**Tarlam (1440 dark)**: the OSM basemap is a washed-out Cyrillic/Arabic/Latin collage at 30% opacity: wrong tool for the
job (it contains place names in 5 scripts, zero field information). Numbered questions with serif headings are a
form-wizard cliche; "Yakın istasyonun..." mustard box is a heavy-handed alert.

**Giriş (1440 dark)**: the best screen. Full-bleed Harran Landsat image is the only moment where the product
looks unique. Wasted: the form column is a generic centred form; the legend card (lime/blue/dashed bullets in serif) is a
decorative glass card; the olive disabled-looking primary button reads as an error.

**390 mobile**: the whole 12-section desktop page is simply stacked (4,393 px tall); the map drops below the verdict
and the plan table is squeezed to 4 columns at 11 px. Nothing is designed for a farmer's phone in a field (thumb zone,
one glance answer). Bottom tab bar has 5 equal icons, no hierarchy.

**Yöntem**: a long document in the same sidebar shell; the Landsat image is nicely sized, but the formula blocks
and tables look like a wiki. Good content, no editorial design.

## 4. Three art directions

Common constraints for all three: Turkish glyph coverage (ğ Ğ ş Ş ı İ ç Ç ö Ö ü Ü) verified for every named family;
all families are on Google Fonts; numerals are tabular with a dot thousands separator and a comma decimal.

---

### Direction A: "Ortho Console"
**Idea:** a dark instrument panel built on top of orthophoto/Sentinel imagery: imagery is the canvas, numbers are the
architecture, one signal colour says "act here".

**Mood:** precise, confident, operational, like a farm-management console crossed with a flight display. Night-shift
cockpit, daylight-readable.

**Palette (dark default)**
| Token | Hex | Contrast on bg (#0b0e0c) |
|---|---|---|
| bg | `#0b0e0c` | n/a |
| surface | `#131815` | |
| surface-2 (raised) | `#1b221d` | |
| line | `#26302a`, line-strong `#3a463e` | |
| ink-1 | `#eef2ec` | 17.1:1 (15.9 on surface) |
| ink-2 | `#a9b3aa` | 9.0:1 (8.3) |
| ink-3 | `#7d897f` | 5.3:1 (4.9); only for 13 px+ metadata |
| accent (signal) | `#d4ff3a` | 16.8:1; text on accent `#0b0e0c` = 16.8:1 |
| water | `#5cc8ff` | 10.3:1 |
| soil | `#e0a96b` | 9.3:1 |
| crop | `#4ed68a` | 10.4:1 |
| risk | `#ff7a5c` | 7.6:1 |

**Palette (light)**
| Token | Hex | Contrast on bg (#f4f5f0) |
|---|---|---|
| bg | `#f4f5f0` | |
| surface | `#ffffff` | |
| line | `#dadcd3`, strong `#b9beb1` | |
| ink-1 | `#101612` | 16.7:1 (18.3 on surface) |
| ink-2 | `#474f48` | 7.7:1 (8.5) |
| ink-3 | `#646d65` | 4.9:1 (5.4) |
| accent text/line | `#3d5a00` | 7.2:1; accent fill `#d4ff3a` only behind `#101612` text (15+:1), always with a 1 px `#3d5a00` edge |
| water | `#0a5f8f` | 6.3:1 |
| soil | `#7d4a1a` | 6.7:1 |
| crop | `#1c6b3c` | 6.0:1 |
| risk | `#b3321a` | 5.7:1 |

Rule: accent = the one thing to do or the one best option. Never used for chart series or for selected states in
navigation (use ink-1 + a 2 px underline).

**Type**
- Display / numerals: **Archivo** (variable, use `wdth` 75-90 and wght 600) for hero numerals and plan names. Condensed
  numerals let 4-digit values go huge without eating the layout.
- UI / body: **Instrument Sans** (400/500/600), 14 px base on desktop, 16 px on mobile.
- Readouts / labels: **Geist Mono** (or JetBrains Mono) for units, coordinates, dates, source ids only; uppercase
  11 px with +0.06em tracking for field labels (never for sentences).
- Scale: 11 / 13 / 15 / 18 / 24 / 36 / 56 / 96 (hero numeral). Numerals tabular lining; units at 40% size, baseline-
  aligned, in ink-2.

**Grid and spacing:** 12-column, 24 px gutters, 8 px base unit (4 px for inside controls). Dense: 56 px rows, 12 px
cell padding. Left rail 64 px icon rail (labels on hover/expanded), top strip 48 px with field + scenario. Dashboard
is a 3-zone cockpit: image/map (left 7 col), verdict + KPI stack (right 5 col), evidence strip (full width, 4
small multiples).

**Shape language:** radius 6 px on controls, 10 px on panels, 0 on map/image edges that bleed to the viewport
edge. 1 px lines only; no shadows. Elevation = surface step + a 1 px top highlight (`rgba(255,255,255,.04)`). Overlays on
imagery use a solid `rgba(11,14,12,.78)` plate with 1 px line, never blur.

**Imagery strategy:** satellite is a first-class material. Every selected field gets a Sentinel-2/Landsat chip at
field scale (about 5 km square) with the polygon outlined in 1.5 px accent and a darkened outside mask (35% ink-0).
Hero panel is a full-height image with a time scrubber (3 dates) and true-colour / NDVI toggle; NDVI renders as a
single-hue ramp (`#1a2a1f` to `#d4ff3a`) not rainbow. Imagery has fixed chrome: corner ticks, a scale bar,
sensor + date caption in mono at 11 px ("Sentinel-2 L2A, 14 Haz 2026, 10 m"). Where no imagery exists, show an honest
placeholder (grid + "no scene yet"). Login and empty states use full-bleed Harran Landsat. Basemap for field
selection: ESRI/NASA GIBS true colour or Sentinel imagery, no OSM label soup; labels only for the 5 prepared regions.

**Data-display language**
- 3-year rotation: a horizontal **timeline ribbon**, 36 months wide, three lanes of crop blocks filled with crop
  *textures* (fine stripes for cereals, dots for legumes, hatch for fallow) in crop-token colours, sowing and
  harvest ticks at the true month, a "today" cursor. Same component reused at 3 sizes (strip, plan row, detail).
- Water balance: monthly **diverging bars around a zero line** (surplus above in water colour, deficit below in
  soil/risk), annual total as a 56 px numeral, the 12 signed values live in the chart, not under it.
- Comparison: **delta table** with fixed columns; each cell is numeral + tiny bar + signed delta against the current
  plan, best value per column marked with an accent dot (not a pill). Big comparison for the winner uses the
  96 px numeral.
- Confidence: P10-P90 ranges as thin range bars with a median tick, always with a one-line gloss.

**Motion:** 120-200 ms ease-out; numerals count up once (400 ms, tabular so no jitter); imagery crossfades 250 ms between
dates; the scenario switch morphs bars in place (no reload flicker). Respect `prefers-reduced-motion`. No parallax,
no scroll-jacking.

**Unmistakably AgroShift:** the *field chip with polygon + corner ticks + sensor caption*, and the *crop-texture
rotation ribbon*. Every screen has a real field image in it.

---

### Direction B: "Field Ledger"
**Idea:** an agronomist's printed almanac: a quiet, typographic, light-first ledger in which every number is a row
in a table, every chart is a small multiple, and the only colour is ink, paper and one seal-red.

**Mood:** calm, authoritative, institutional (like a ministry yearbook or a Nature supplement), warm. Trustworthy for
older farmers and agronomists who read printed charts, credible with scientific judges.

**Palette (light default)**
| Token | Hex | Contrast on bg (#f1ebdd) |
|---|---|---|
| bg (paper) | `#f1ebdd` | |
| surface | `#faf6ec` | |
| line | `#d8cfb9`, strong `#b4a98e` | |
| ink-1 | `#1d1a14` | 14.6:1 (16.1 on surface) |
| ink-2 | `#4d473a` | 7.8:1 (8.5) |
| ink-3 | `#6a634f` | 5.0:1 (5.5) |
| accent (seal) | `#a8381a` | 5.4:1 (6.0); on-accent `#faf6ec` = 6.0:1 |
| water | `#1b5a80` | 6.3:1 |
| soil | `#6e4521` | 7.0:1 |
| crop | `#2f6a2c` | 5.5:1 |
| risk | `#a8381a` (same as accent; risk is the accent's job) | 5.4:1 |

**Palette (dark)**
| Token | Hex | Contrast on bg (#16130e) |
|---|---|---|
| bg | `#16130e` | |
| surface | `#1f1b14` | |
| line | `#332d22`, strong `#4a4233` | |
| ink-1 | `#efe7d6` | 15.1:1 (13.9) |
| ink-2 | `#bdb39d` | 8.9:1 (8.2) |
| ink-3 | `#948a76` | 5.4:1 (5.0) |
| accent | `#ee7b52` | 6.7:1 (6.2); on-accent `#16130e` |
| water | `#7ab8dc` | 8.6:1 |
| soil | `#d9a566` | 8.4:1 |
| crop | `#8cc46a` | 9.0:1 |
| risk | `#f08a6a` | 7.5:1 |

**Type**
- Display and headings: **Fraunces** (variable: opsz, SOFT 50, wght 500-600) for page titles, verdict, section heads.
- Body/UI: **Public Sans** 15-16 px (very legible Turkish diacritics, institutional feel).
- Numerals/tables: **IBM Plex Mono** 14 px for table cells with tabular figures; hero numerals in Fraunces
  lining/tabular at 64 px.
- Scale (major third 1.25): 13 / 16 / 20 / 25 / 31 / 39 / 61. Footnotes in 13 px, with numbered footnote markers.

**Grid and spacing:** 8-column asymmetric editorial grid with a 2-col marginal "notes" column (sources, formulas,
glossary appear in the margin like marginalia, not in accordions). 8 px base, generous 48-64 px section gaps,
max line 68 ch, page max width 1180 px. One-column reading order on mobile.

**Shape language:** radius 2 px (almost square), 1 px rules in `line`, double rule (2 px + 1 px) above major
sections, no cards, no shadows. Tables are first-class: row hairlines, right-aligned numerals, header in small
caps. Selected = a left-hand ledger tick (3 px, accent) on a row, not a filled pill.

**Imagery strategy:** satellite as a *plate*: framed like a figure ("Şekil 1. Konya-Çumra, Sentinel-2, 14
Haz 2026") with a caption, scale bar and a thin black frame, desaturated 15% to sit on paper, field polygon in a
fine accent line. False-colour NDVI plates are printed as a 5-step stepped legend (not gradient). Imagery is
cropped to tall 3:4 plates beside text, like Earth Observatory feature images. Login/landing: one large plate of
Harran with an almanac title block.

**Data-display language**
- 3-year rotation: a **ledger grid**: 3 columns (years) by 12-month hairline scale; crop names set in Fraunces
  italic inside bracketed bars; sowing/harvest dates written out in the margin.
- Water balance: **small multiples**, one miniature bar sparkline per month (12 per row) sharing a y-axis,
  with a single bold annual line; the plain table underneath is always visible, not a "show as table" link.
- Comparison: **printed comparison table** with plans as rows, deltas as superscript-style signed numerals in
  risk/crop colours; the best row is marked with an accent seal (a small filled circle with "1").

**Motion:** nearly none. Fades 150 ms; table rows expand with 180 ms height ease; charts draw once. A deliberate
decision: the product behaves like a document that has been prepared for you.

**Unmistakably AgroShift:** captioned satellite plates with a figure number, a sealed "best plan" mark and
marginal notes. It looks like a report an agronomist would sign.

Risk: light-first and low-density means the dashboard feels less "live"; weaker on mobile glanceability; less
wow in a 3-minute judging window.

---

### Direction C: "Orbit Instrument"
**Idea:** the rotation as an orbit: a night-sky instrument UI in which the 3-year rotation is a ring, data
layers are scientific overlays (false colour, ground track), and the product feels like a NASA mission display
tuned for a farmer.

**Mood:** scientific, spacey but not sci-fi kitsch; cool, high-contrast, lots of thin lines and radial geometry.
Appeals to the "Space Apps" theme directly.

**Palette (dark default)**
| Token | Hex | Contrast on bg (#070b14) |
|---|---|---|
| bg | `#070b14` | |
| surface | `#0e1524` | |
| line | `#1c2740`, strong `#2c3b5e` | |
| ink-1 | `#e8edf7` | 16.8:1 (15.5) |
| ink-2 | `#a4afc4` | 8.9:1 (8.3) |
| ink-3 | `#7886a1` | 5.4:1 (5.0) |
| accent (orbit) | `#4fd1c5` | 10.6:1; on-accent `#04201e` = 9.1:1 |
| water | `#6aa8ff` | 8.1:1 |
| soil | `#d9a35f` | 8.8:1 |
| crop | `#6fd68a` | 10.9:1 |
| risk | `#ff7f6e` | 8.0:1 |

**Palette (light)**
| Token | Hex | Contrast on bg (#eef1f6) |
|---|---|---|
| bg | `#eef1f6` | |
| surface | `#ffffff` | |
| line | `#d2d9e6`, strong `#aab4c8` | |
| ink-1 | `#0b1220` | 16.5:1 (18.7) |
| ink-2 | `#3f4a60` | 7.9:1 (8.9) |
| ink-3 | `#5b667d` | 5.1:1 (5.8) |
| accent | `#0a6b66` | 5.6:1 (6.3); on-accent `#ffffff` = 6.3:1 |
| water | `#1553b0` | 6.4:1 |
| soil | `#7a4a1a` | 6.6:1 |
| crop | `#1d6a3a` | 5.8:1 |
| risk | `#b13422` | 5.5:1 |

**Type**
- Display: **Sora** (600) for titles and the verdict (wide geometric, distinct from Hanken/Inter).
- UI/body: **IBM Plex Sans** 14-15 px.
- Data and labels: **IBM Plex Mono** 12-13 px uppercase tracking +0.08em for axes, ids, timestamps, coordinates;
  hero numerals in Sora 48-72 px tabular.
- Scale: 11 / 13 / 15 / 20 / 28 / 44 / 72.

**Grid and spacing:** 12-column on a 6 px micro-grid, visible 1 px "graticule" lines at section boundaries and a
faint lat/long tick scale on map edges. Centre-weighted: a large rotation ring/hero in the middle, panels orbiting it
in a 3-row layout, readouts in the corners (HUD-style). 6/12/18/24 spacing steps.

**Shape language:** circles and arcs for time, square corners (radius 2) for panels with corner brackets
(`L` ticks) instead of borders. Elevation: none; glow only on the accent (a 1 px outer line at 40% opacity).
Hairline 1 px strokes everywhere, 1.5 px for data.

**Imagery strategy:** satellite shown as *layers in a viewer*: base true-colour Landsat/Sentinel, with toggles
for NDVI, soil moisture (SMAP-style but only if actually used), false colour. Polygon is outlined with a dashed
accent line; masking is a radial vignette toward the field. Imagery is framed in a circular or octagonal "lens"
on hero panels and cropped rectangular in tables. Every scene carries a HUD caption: sensor, date, band
combination, resolution. Risk of overuse: must keep clarity over theatre.

**Data-display language**
- 3-year rotation: a **three-ring orbit**: concentric rings = years (outer = year 1), arc length = months occupied,
  arc colour = crop texture, a tick for sowing and a tick for harvest; the current plan and recommended plan overlay as
  inner and outer rings. Collapses to a horizontal timeline on mobile.
- Water balance: **radial month dial** (12 spokes: bars rising from the ring up for surplus, down for deficit) with
  the annual number in the centre; a linear fallback for narrow screens.
- Comparison: **radar-free** columns: plans as orbits of dots on a shared axis ("dot-plot" lollipops) for
  water, soil, profit, risk with the current plan as a dashed reference line.

**Motion:** 300-600 ms slow-in/slow-out orbital motion: ring arcs draw clockwise, a slow idle drift on the
hero ring (paused with reduced motion), numerals tick like a counter; scenario switch rotates the ring. More
expressive than A, more risk of seeming gimmicky and of being slow.

**Unmistakably AgroShift:** the three-ring rotation orbit. It is the logo, the loading indicator, and the main chart.

Risk: radial charts are harder to read exactly (farmers want to compare numbers); NASA-looking UI may over-promise
the "space" angle compared with the farm-management reference the owner liked.

---

### How they differ (not just colour)
| | A Ortho Console | B Field Ledger | C Orbit Instrument |
|---|---|---|---|
| Structure | Imagery + KPI cockpit, dense | Editorial ledger, tables, marginalia | Radial HUD, centred ring |
| Primary chart form | Ribbon timeline, diverging bars | Small multiples, tables | Rings and dials |
| Type | Archivo cond. + Instrument Sans + Geist Mono | Fraunces + Public Sans + Plex Mono | Sora + Plex Sans + Plex Mono |
| Chrome | Panels, 6/10 px radius, plates | Rules, 2 px radius, no cards | Corner brackets, 2 px radius |
| Motion | Quick, functional | Almost none | Slow, orbital |
| Theme default | Dark | Light | Dark |

## 5. Recommendation

**Choose Direction A (Ortho Console), with B's honesty borrowed for the evidence layer.**

Reasons tied to users and judges:
1. **It is the reference the owner already liked** (dense dark dashboard, aerial imagery, big numerals, one accent),
   and it is the one most farm-management tools converge on, so a Turkish agronomist reads it instantly.
2. **Satellite imagery becomes proof, not decoration.** NASA judges want to see NASA data doing the work; a
   field-scale Sentinel/Landsat chip with polygon, sensor and date is the strongest evidence of that on screen.
   Direction C does it with theatre; B does it quietly but loses "wow" in a 3-minute demo.
3. **It tolerates the density the product really has** (water balance, soil, risk, evidence, alerts) while giving
   a real first/second/third read, which the current stacked page lacks.
4. **Mobile reality:** a farmer on a phone in the field needs a one-glance answer: the hero numeral + ribbon + one
   action works at 390 px; B's margin notes and C's rings do not shrink as well.
5. **Credibility:** from B take the persistent plain-table next to every chart, figure-style captions with
   source/date, and marginal glossary notes on `Kanıt` and `Yöntem`. From C take only the "rotation as time on a
   circle" idea for the loading state and the logo (not the main chart).
6. Keep light mode as a full design, not an inversion (see tokens); judges will often view in a bright room.

Build order that matches the owner's habit of unfinished work: (1) tokens + type + new logo, (2) the field chip
component with polygon/mask/caption, (3) the rotation ribbon, (4) `genel` page rebuilt on those, (5) everything
else inherits.

### The 8 design rules the implementer must not break
1. **Imagery is the canvas.** Every field-specific screen shows a real field-scale scene (about 5 km, with
   polygon, outside-mask, scale bar, sensor + date caption). No continental basemaps, no OSM label soup for field
   views, no decorative thumbnails smaller than 96 px.
2. **One accent, one meaning.** The signal colour (`#d4ff3a` dark, `#3d5a00` text on light) marks the single
   recommended action or the single best option per view. Never for series, nav selection or decoration.
3. **Numerals are the layout.** Each page has one hero numeral at 56-96 px (Archivo condensed, tabular), unit at 40%
   size, with a baseline reference ("vs. current plan: -57 mm"). Never show a big number without a comparison.
4. **Semantic colour is reserved.** Water = blue, soil = amber, crop = green, risk = coral, in the tokens given;
   crop identity comes from texture + name, not from additional hues. Max 4 hues + accent on screen.
5. **No cards inside cards, no glass, no shadows.** Panels are flat surface steps with 1 px lines; overlays on
   imagery are solid plates. Radii: 6 px controls, 10 px panels, 0 on edge-bleeding images.
6. **Every chart has its numbers and its source.** Signed values live inside the chart, a plain-table view is one
   click, each panel shows source + date in 11 px mono; P10-P90 ranges always have a gloss. Never use a default
   chart-library look: custom axes, zero line, direct labels.
7. **Type discipline.** Exactly three roles: Archivo (numerals/titles), Instrument Sans (UI), Geist Mono (labels and
   readouts, never sentences). Minimum 13 px for anything a user must read (11 px mono only for non-essential
   captions), body line length 45-75 ch, Turkish formatting everywhere (1.191 mm, 7,2 °C).
8. **Redo the identity, retire the clip-art.** New mark (circle + converging furrows or the 3x3 parcel grid,
   one flat shape, verified at 16 px on dark/light/over imagery), sentence-case wordmark, crop glyph system +
   textures instead of 64 px illustrations. Nothing ships that reads as stock, and nothing is added "for
   decoration".

Additional hard accessibility gates: all text pairs listed above pass 4.5:1 (ink-3 used only at 13 px+ for
metadata; no ink-3 on imagery plates), focus ring 2 px accent/ink, touch targets 44 px on mobile, colour never the
only channel (texture + label + sign).
