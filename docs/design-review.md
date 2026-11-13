# AgroShift design review (13 Kasım 2026)

Scope: every screen a farmer sees (`/giris`, `/kayit`, dashboard empty, dashboard with Konya-Çumra on
`#genel`, `#tarlam`, `#oneriler` with Öneri 1 open, `#kanit`, `/yontem`), at 1440×900 and 390×844,
dark and light. Judged from real headless-Chrome screenshots of a guest-mode production build
(port 3211), not from the code.

Screenshots:
- before: `%TEMP%\claude\…\scratchpad\review\before\` (32 PNG)
- after: `%TEMP%\claude\…\scratchpad\review\after\` (32 PNG)
- Figma review file (before/after frames, 12-column grid overlay on the after overview):
  https://www.figma.com/design/Bz70tGduuYuYlW528Svbmd

Method notes: the `impeccable` critique ran single-context (no sub-agents were authorised for this
task). Its source detector found nothing in `src/components`; run on the prerendered HTML it flagged
one `side-tab` (2 px coloured left border) on `/yontem`. Its URL mode needs puppeteer, which was not
installed (no new dependencies). `web-design-guidelines`, `emil-design-eng` and `stop-slop` were
applied as checklists.

## 1. What the screens looked like (before)

### Genel bakış, field selected (`before/1440-dark-genel.png`)
- **Everything boxed the same.** Map, four number tiles, best plan, last day, water balance, alerts,
  plans, soil, judgment note: eleven bordered cards with the same radius, padding and top sheen. No
  first, second and third read; the verdict sat in a 4-column card next to tiles of equal weight.
- **Number tiles with no reference.** "551 mm", "1.191 mm", "640 mm", "68 /100": big numbers whose
  only context was "25 tam yıl ortalaması". Tiles were ~140 px tall with half the area empty.
- **The fit score three times** (pill "Uyum puanı 68", tile "68/100", nav "Uyum 68/100").
- **The verdict as one 45-word run-on sentence** in a narrow card, three coloured numbers inside it.
- **"Karar senin" three times on one page** (compact in the best-plan card, a full-width card, the
  footer disclaimer).
- **Glass on the map** (blurred floating plate over satellite imagery) and a progress ring for soil.
- **Alerts as nested boxes**: each row a filled panel with a tinted icon tile and a bordered button,
  inside a scrolling 19 rem box that cut the fourth alert mid-line.
- **Jargon in alerts**: "Sen eğimi -1,23 gün/yıl, Mann-Kendall p = 0,009".

### Genel bakış, nothing picked (`before/1440-light-genel-empty.png`)
- Eight empty cards, each with a dashed box inside the card, an icon tile and a sentence; four of
  them carried the same "Tarlanı seç" primary button. Four identical primary actions on one view.

### Öneriler (`before/1440-dark-oneriler.png`)
- Verdict as a 3-line run-on headline; basis paragraph and the judgment note below it in the same
  grey.
- Selected scenario, active nav item, primary button and "En uygun" pill all in the same lime: the
  accent stopped meaning "do this".
- Plan labels in water blue ("Öneri 1") although they have nothing to do with water.
- The open plan detail crammed four columns at 1440 into 12–13 px text; "P10–P90: 61 – 111" with
  no gloss.

### Tarlam, Kanıt, auth, Yöntem
- Tarlam: lead line and hint line said nearly the same sentence; selection state in lime.
- Kanıt: dashed-box empty state; "Sen eğimi", "anlamlı eğilim yok (p = 0,107)" unexplained.
- Auth: decorative glass plate (blur + shadow) over the Landsat scene.
- Yöntem: formula list with a 2 px coloured left border (detector `side-tab`); "siz" address in
  several helper strings (`Haritaya tıklayarak … seçin`, `Kendi rotasyonunuzu ekleyin`,
  `Sizin girdiğiniz değerler` …).
- Type: Bricolage Grotesque display face on titles, numbers set in light Hanken; no voice for
  measurements.

## 2. Top problems, the rule each broke, and the change

| # | Problem | Rule | Change |
|---|---|---|---|
| 1 | Eleven identical bordered cards, no hierarchy | Visual weight ∝ importance; Gestalt proximity over enclosure | Sections now sit on the paper under a hairline with one serif title (`.sec`, `.sec-title`). Frames only for media (map), dialogs and the open plan. |
| 2 | Verdict as one run-on sentence in a 4-col card | 3 clear hierarchy levels; 45–75 ch measure | Verdict = serif headline (31 px), crops line, then three difference rows each with ▲/▼ mark, number and words. It takes 7 of 12 columns and is the first read. |
| 3 | Fit score shown 3×, numbers with no comparison | Numbers need a unit and a reference point | One fit readout under the verdict with "şu anki planın 40" beside it. Climate readouts carry references: "ihtiyacın yaklaşık %46 kadarı", "buharlaşma ve terlemeyle giden su", "ihtiyaç eksi yağış". |
| 4 | Four "Tarlanı seç" buttons in the empty overview | Hick's law; one primary action per view | One empty state (brand spot art, title, what you will see, one large primary button) next to the clickable map. |
| 5 | Lime used for selection, nav, pills and the CTA | Colour for meaning only | Lime is now the primary action and the "En uygun" mark only. Selected segments, chips and choice cards use ink-on-paper; active nav is a neutral tint with a lime icon. Water blue removed from plan labels and links. |
| 6 | Alerts: nested boxes, clipped by a scroll box, jargon | Proximity; recognition over recall; plain language | Hairline list, icon + hidden "Uyarı/Bilgi" label (never colour alone), quiet text action. No scroll clip. Trend line now "Yılda -1,23 gün; tesadüf olması zor (p = 0,009)". |
| 7 | Detail panel: 4 columns of 12 px text, "P10–P90" | Legibility, progressive disclosure, plain gloss | Two columns, 13–15 px, units beside numbers. Range reads "Dönemlerin %80'i: 61–111 mm"; P10/P50/P90 stay in the trace dialog. |
| 8 | Judgment note repeated three times | Redundancy dilutes the message | One compact note under the verdict (overview and Öneriler); disclaimer stays in the footer. |
| 9 | Glass and blur as decoration (map plate, auth plate), progress ring, 2 px side tab | Decoration without function | Map facts moved under the map as plain text; auth plate is a solid 86 % plate (AA on white); soil is a number + component bars; side borders 1 px. |
| 10 | "Siz" address, abstractions ("Uyum puanı", "Bütçe aşımı", "Brüt marj", "kalibre edilmemiş") | Plain language, one address form | "Sen" everywhere in the dictionary; "Uyum" glossed on first use ("planın senin önceliklerine ne kadar uyduğu, 100 üzerinden"); "Su yetmedi", "Brüt kâr" + "varsayım", "Yağış düzeltilmedi". English kept in sync. |

Other changes:
- **Type system.** Three voices on one 1.25 scale (13/16/20/25/31/39 px, tokens `--text-step-*`):
  Newsreader (text serif) for page titles, section titles and the verdict; Hanken Grotesk for
  everything read or tapped; IBM Plex Mono for measured readouts (`.readout`, `.num-hero`,
  `.num-mid`) with the unit set small beside each number. All via `next/font`.
- **Light theme** is warm notebook paper (`#f3f1e9`) rather than a tinted copy of dark; ET₀ orange
  darkened to keep 4.5:1 for small text.
- **Rotation strip**, the product's signature: taller, crop illustration inside each band, and a
  per-year line "Ekiş 5 Eki, hasat 27 haz" so dates no longer hide in a hover tooltip. "Ekim"
  (sowing, but also "October") became "Ekiş".
- **Getting started**: a ruled checklist row instead of five boxed cards; thumbnails kept (their
  credits are on the Methods page).
- **Spacing**: 4/8 px steps; 40 px between overview rows, 32 px gutters on a shared 12-column grid
  (6 at md, 1 on phones). Checked with a grid overlay in the Figma file.

## 3. Brand integration
- `Wordmark` now renders `<Logo>` (horizontal at 26 px in the rail and auth header, the mark at 28 px
  in the icon rail and phone top bar). Above the 18 px lockup and 16 px mark minimums.
- `<CropArt>` at 28 px (the documented legibility floor) in the crop pickers, the rotation strip
  bands (hidden below 640 px where bands are too short), the overview plan table and the Öneriler
  rows, always next to the crop name.
- `<SpotArt>` through `components/ui/EmptyArt.tsx`: `no-field` (empty overview), `loading-data`
  (Öneriler and Kanıt before data), `no-alerts` (nothing to watch), `email-sent` (auth).

## 4. Contrast (WCAG 2.x, measured from the tokens)

| Pair | Dark | Light |
|---|---|---|
| ink on paper | 15.74 | 14.54 |
| ink-2 on paper / panel / panel-2 / rail | 8.48 / 7.85 / 7.12 / 8.73 | 6.95 / 7.52 / 6.29 / 6.41 |
| accent-ink on paper | 14.59 | 6.27 |
| on-accent on accent (primary button) | 14.23 | 13.15 |
| warn-ink on warn | 10.14 | 8.45 |
| bad on paper | 8.46 | 6.20 |
| green (better) on paper | 8.80 | 4.73 |
| ET₀ orange on paper | 7.55 | 5.12 (was 4.13) |
| precip blue on paper | 8.14 | 4.59 |
| paper on ink (selected segment) | 15.74 | 14.54 |

## 5. Left alone, on purpose
- Engine, data, numbers, scenario logic, trace dialogs' content, calibration flow: unchanged.
- The engine's `DISCLAIMER` text still says "danışın" (formal); it lives in `lib/engine`, outside
  this scope.
- The OSM base map on Tarlam shows foreign-script labels at regional zoom; the tile source is a data
  decision, not a styling one.
- Methods page stays a long document (Read mode); only address, links and the side border changed.
- "—" remains as the missing-value glyph in tables and trace inputs (a data placeholder, not prose).
- The guest strip stays amber: it carries a real warning.

## 6. Remaining rough edges (ranked)
1. Kanıt was only re-typed, not re-laid-out: its summary, chart and data-quality blocks are still
   framed cards, and the active chart tab is still lime (selection, not action).
2. Phone Öneriler: the three scenario options stack into a 160 px tall block; a horizontal
   scrollable segment or a select would be shorter.
3. Crop pickers truncate long names at 3 columns ("Buğday (kı…"); a two-line option label or a
   custom listbox would fix it.
4. Methods page is still a 5,600 px wall; it needs an in-page index.
5. The open plan repeats the row's title and score in its own header.
6. CropArt is hidden inside strip bands on phones; the year lines below carry the names.
