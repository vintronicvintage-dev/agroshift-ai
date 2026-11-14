# AgroShift AI - UX / usability heuristics review

Reviewer lens: product UX and usability heuristics. Method: design-critique framework (first impression, usability, hierarchy, consistency, accessibility) applied to the current screenshots (`review/after/`), plus a skim of `docs/ui-v2.md`, `docs/design-review.md` and `src/components/**`. Users: a Turkish farmer or agronomist with little GIS experience, and hackathon judges (2-minute attention, will not read).

Screenshots cited: `1440-dark-genel-empty`, `1440-dark-genel`, `1440-dark-tarlam`, `1440-dark-oneriler`, `1440-dark-kanit`, `1440-dark-giris`, `390-dark-tarlam`, `390-dark-oneriler`.

## 0. First impression (2 seconds)

The visual polish is high (serif titles, mono numerals, restrained lime). The product reads as a good dashboard, not as a tool about MY land. The satellite map, the one thing a farmer instantly understands, is a one-third-width thumbnail at continental zoom with five orange dots. The first screen after choosing a field is a wall of numbers (551 / 1.191 / 640, 40 / 68 / 132 / 1.016). Purpose is clear in words ("Önce tarlanı seç") but not in picture.

## 1. Scored rubric (0-10)

| Criterion | Score | One-line justification |
|---|---|---|
| H1 Visibility of system status | 6 | Data-ready dots, "Yağış düzeltilmedi" badge and "73 plan denendi, 328 ms" help; no visible loading state for live point queries ("biraz sürebilir" is only a caption); guest-mode banner is permanent noise. |
| H2 Match with real world | 5 | Crop icons and "Su yetmedi/Su açığı" are good; "Uyum 68/100", "Brüt kâr varsayım", "ET₀", "p = 0,009", "Sen eğimi", "NDVI", "Dönemlerin %80'i" are analyst language. |
| H3 User control and freedom | 5 | Scenario switch and instant recompute are good; no way to draw or adjust the field, no undo, no saved fields, no save of a custom rotation. |
| H4 Consistency and standards | 7 | One type system, one icon family, one accent. Minus: Tarlam is a form and Genel bakış is a report, both with a map of a different style (OSM vs Blue Marble); field chip in topbar duplicates the sidebar state. |
| H5 Error prevention | 5 | Presets (Kısıtlı/Orta/Bol) and defaults help; a field is one lat/lon click with a default 50 da area, no check that the click is farmland, water or city. |
| H6 Recognition over recall | 6 | Crop icons, sidebar subtext ("En iyisi 68/100") work; plan table headers rely on remembering "Su yetmedi" vs "Su açığı". |
| H7 Flexibility and efficiency | 5 | Topbar scenario selector is a good accelerator; no keyboard path to the map, no side-by-side compare, no shortcut to edit a plan. |
| H8 Aesthetic and minimalist design | 6 | Clean, but overview stacks 8 sections; Öneriler rows carry 5 numeric columns + bars + deltas + risk; mobile detail is a 2500 px scroll. |
| H9 Error recognition and recovery | 4 | Failure states hardly visible; live-data failure for non-pilot points and "6 gün eksik veri" are notes, not recoverable states with a next action. |
| H10 Help and documentation | 7 | Starter cards, glossary panel in Kanıt, "Neden bu plan?", Methods page. Help is mostly separate from the place of confusion. |
| Task flow efficiency | 5 | Empty -> first useful answer: about 3 clicks / 40-60 s on a pilot dot. On a custom point you must scroll a form first. Real land facts (soil, terrain, NDVI) are 4+ clicks away. |
| Information scent | 6 | Sidebar subtext is good. "Tarlam" does not say it is the settings form; "Kanıt" is vague for a farmer; "Kendi senaryon" sounds like climate, hides the rotation builder. |
| Error prevention and recovery (combined) | 4.5 | See H5 and H9; no confirmation of what area is being computed, no recovery paths. |
| Learnability for a first-time farmer | 6 | Starter strip and the 4-question form are friendly; Öneriler table and Kanıt are a cliff. |

Overall: about 5.6 / 10. Strong foundation and honesty; weak at the two things the owner now wants most (own-area selection and a visual rotation evaluator).

## 2. Task walkthroughs

### Task A - "Pick my field and learn what the land is like"
1. Land on overview (`1440-dark-genel-empty`). Friction: top banner "Giriş kapalı, pano misafir olarak açık" shows before any value (judges read it as "broken"). Starter strip says "1/5 tamam" with step 5 already ticked and step 1 not ticked - false progress, looks like a bug.
2. Map is NASA Blue Marble at regional zoom with 5 unlabelled orange dots. Friction: copy says "sarı noktalar" (they are orange); the farmer's village is not findable; imagery too coarse to recognise a field; no search box, no "my location".
3. Click "Tarlanı seç" -> Tarlam (`1440-dark-tarlam`). Friction: a button that navigates to a map while you already look at a map is a wasted click; the new map is OSM at country scale full of Cyrillic and Arabic labels, a different look from the overview.
4. Click a point. Friction: the only result is text ("37,57° N, 32,77° E, Rakım 1.198 m. Ekim takvimi: İç Anadolu platosu tipi") and three "hazır" dots. No boundary, no area, no soil, terrain or vegetation on the spot. The land information the user came for is two screens later.
5. Four required-looking questions precede the lime CTA "Önerileri göster". Friction: the user is asked for opinions (priorities) before seeing anything about the land.
6. Overview (`1440-dark-genel`). Friction: map shows a ring on Blue Marble, no field outline; "Alan 50 dekar" is a default shown as fact; soil appears as "Toprak göstergesi 69/100"; terrain is only elevation in a caption; vegetation history is hidden in Kanıt > NDVI tab.

Clicks to first land fact: about 3; to real soil/terrain/vegetation: 4+.

### Task B - "Compare my current 3-year rotation with better ones"
1. Tarlam, "Şu an ne ekiyorsun?" is three small dropdowns (`1440-dark-tarlam`). Friction: crop labels truncated ("Buğday (kı...", at 390 "Buğ...", "Nad...", `390-dark-tarlam`); no picture of a sequence; no add-a-plan.
2. Overview verdict (`1440-dark-genel`): "Önceliklerine en uygun plan Öneri 1 - Arpa, Nadas, Macar fiği". Friction: unfamiliar crop with no explanation; the winner shows "1.016 TL/da daha düşük brüt kâr" in red with no reconciliation.
3. "Planları karşılaştır" -> Öneriler (`1440-dark-oneriler`). Friction: 5 metric columns with different units/scales; "Su yetmedi 91 vs 0" explained only by a 12 px header; two plans tie at Uyum 68 (Öneri 1, 2) with no tie-break reason; delta colours invert by metric (lower is better for Su açığı, higher for Toprak).
4. Row expand. Friction: the ~650 px detail block replaces the comparison; the current plan and the alternatives can no longer be seen together. Comparison is a row delta, not side-by-side.
5. Mobile (`390-dark-oneriler`). Friction: scenario selector as three stacked full-width bars, open plan makes a 2000+ px scroll, no sticky "mine vs this".
6. Custom rotation: behind "Kendi senaryon" / "Daha fazla". Poor scent for the feature the owner now wants central.

Clicks to first useful comparison: 4 (field, form CTA, plans CTA, expand), 60-90 s.

### Task C - "Understand why and trust it"
1. "Neden bu plan?" is a collapsed disclosure at the bottom of an expanded row (`1440-dark-oneriler`): the least visible spot in the densest zone.
2. The Uyum definition is a 12 px grey paragraph top right: the one sentence a skeptic needs is the smallest text.
3. Trace dialogs open from dotted-underline numbers ("Altı noktalı sayılara dokun"). Friction: weak, tiny affordance, no hover on touch.
4. Kanıt (`1440-dark-kanit`): charts are good. Friction: "belirgin bir eğilim yok (p = 0,107); yılda -5,06 mm (Sen eğimi)" is statistics jargon; the 3-line amber warning duplicates the badge beside it; five tabs form a chart browser, not an argument for the recommendation ("why Arpa after Buğday?" is not answered).
5. Disclaimer ("AgroShift karar vermez...", "Karar senin") repeats in footer and notes; trust-building but verbose.

## 3. Ten highest-impact problems, ranked

| # | Problem | Evidence | Principle | Fix |
|---|---|---|---|---|
| 1 | Field selection is a blind lat/lon click on a coarse map; no drawing, no boundary, no real area, no instant land info | `1440-dark-tarlam`: country-scale OSM, 5 dots, text-only result; `1440-dark-genel`: ring on Blue Marble, "Alan 50 dekar" default | H3 control, H5 prevention, H1 status, direct manipulation | One full-bleed satellite map with polygon draw / parcel pick / pin+radius, live area in da, and an instant land card on the same screen (Section 5). |
| 2 | Land information is deferred and abstract: soil is a 0-100 index, terrain one number, vegetation history 3 clicks away | `1440-dark-genel` ("Toprak göstergesi 69/100"); NDVI only in a `1440-dark-kanit` tab | Information scent, H6, H8 | Right after selection show soil texture/pH/organic carbon, slope/aspect/elevation, 25-year climate normals, NDVI timeline sparkline, with 3 plain sentences. |
| 3 | Opinion form gates the main CTA | `1440-dark-tarlam` | Hick's law, progressive disclosure, H7 | Defaults first, results immediately; questions become editable chips; priorities become a live slider on the result. |
| 4 | Comparison is a delta table, detail replaces comparison | `1440-dark-oneriler` | Recognition over recall, H8, Gestalt (alignment, similarity) | Pinned "Mine" vs up to 3 candidates side by side; shared timeline strip; four paired bars; one trade-off sentence; consistent "better is up". |
| 5 | Rotation builder is three tiny truncated selects, and the custom builder is hidden | `1440-dark-tarlam` row 3; `390-dark-tarlam` | H3, H7, direct manipulation, scent | Drag-and-drop crop cards onto a 3-year x season lane with live rule warnings and score; "Save as my plan"; label it "Rotasyon kur". |
| 6 | Jargon and statistics on the primary path | "Uyum", "Brüt kâr varsayım", "ET₀", "p = 0,009", "Sen eğimi", "P90" | H2 real-world match | Farmer words on the surface ("Plan uygunluğu", "Su eksiği", "Tahmini kâr"), stats under "Ayrıntı", trend as "azalıyor / değişmiyor / artıyor". |
| 7 | Headline contradicts the numbers: "en uygun" plan loses 1.016 TL/da, unreconciled | `1440-dark-genel`, `1440-dark-oneriler` | H1, trust | One-sentence trade-off plus in-place priority slider: "Kâra öncelik ver -> Öneri 2". |
| 8 | False onboarding progress; permanent guest banner | `1440-dark-genel-empty`: 1/5 with step 5 ticked; amber banner on every page | H1, H9, credibility | Tick only on real action; move guest notice to account menu / one-time toast / `/giris` only. |
| 9 | Evidence is a chart gallery, not tied to the recommendation; weak trace affordance | `1440-dark-kanit` | H10, scent, affordance | A "Neden?" chip on every claim opening a drawer (1 chart + source + formula); link deltas to evidence; rename Kanıt to "Veri ve dayanak". |
| 10 | Mobile: long scrolls, stacked scenario bars, truncated selects, no sticky action | `390-dark-oneriler`, `390-dark-tarlam` | H8, Fitts | Map full screen with peek bottom-sheet; swipeable plan cards; sticky "Mevcut vs Öneri" header; one-row segmented scenario control. |

Accessibility notes: key explanations are 11-12 px grey on dark (low contrast and size); dotted-underline affordance is invisible to many; the map has no keyboard alternative (add search + coordinate input).

## 4. What must be kept

- Honesty layer: "Karar senin", "Yağış düzeltilmedi" badge, data-ready dots with source names, sourced footers. This is the product's trust asset.
- Verdict-first structure: serif headline plus three signed differences vs the current plan (`1440-dark-genel`).
- The 3-year strip calendar with crop art and sowing/harvest dates.
- Instant recompute and the topbar scenario selector (Tipik / Kurak / Sıcak ve kurak): a real what-if.
- Irrigation presets with units; priority cards with composition bars.
- Crop icon system; serif/mono type voices; Turkish-first "sen" copy; dark/light themes; EN toggle.
- Sidebar with live subtext and disabled-until-ready states.
- Kanıt charts with trend lines and the glossary panel; Methods page; the trace-dialog concept.
- The starter-cards idea (needs real completion state).

## 5. Proposed information architecture and flow (ground-up redesign)

### Principle
One map is the product's home. Everything about land hangs off a selected area; everything about rotations hangs off the same area. A persistent Field object (name, polygon, area, land card, current rotation) travels through all screens. Three work screens instead of four tabs: **Tarla** (select + know), **Rotasyon** (build + compare), **Dayanak** (why + trust).

### Navigation
Top bar: logo, field switcher (name, area, thumbnail, saved fields, "+ Yeni tarla"), scenario chip, TR/EN, theme, account. A 3-step stepper (1 Tarla -> 2 Rotasyon -> 3 Dayanak) replaces the sidebar (gives a path; better learnability). Mobile: bottom bar with the same 3 items.

### Screen 0 - Welcome (replaces the empty overview)
- On it: full-bleed satellite mosaic of Türkiye, centred search ("Köy, ilçe, tarla adı veya koordinat"), three example field cards (Konya-Çumra tahıl, Çukurova pamuk, Harran sulu), one value sentence. No starter strip.
- Primary action: search or tap an example; secondary "Konumumu kullan".
- Why: removes the empty-overview -> Tarlam hop (H7); gives judges a one-click demo; login is optional and only asked when saving; guest banner disappears (H8).

### Screen 1 - Tarla (select and know)
- Layout: map 65% (desktop) / full screen with peek sheet (mobile); right panel "Arazi kartı".
- Map: satellite imagery with layer switcher Uydu / NDVI / Eğim / Toprak / Yağış. Tools: "Çiz (çokgen)", "Parsel seç" where boundary data exists, "Nokta + yarıçap" fallback, edit, delete, search. First-visit hint: "Tarlanın köşelerine dokun, bitirmek için ilk noktaya dön."
- On completion the card fills within seconds with skeleton rows (H1): area in da; elevation min/mean/max, slope, aspect; soil texture, pH, organic carbon, depth (SoilGrids); 25-year normals: rain, ET₀, frost and heat days (NASA POWER); NDVI 20-year sparkline with season peaks (MODIS); three plain sentences ("Hafif eğimli, killi-tınlı, yıllık 550 mm yağış, ihtiyacın yarısı"). Each tile carries a quality dot and a "Neden?" link.
- Validation (H5): warn if the area looks like water, urban or forest, or is under 1 da / over 50 000 da; confirm vegetation on the NDVI layer.
- Primary action: **"Bu tarla için rotasyon öner"** (sticky). Secondary: "Kaydet".
- Relation: answers "what is my land like" with zero extra input; the old Tarlam questions move to Screen 2.

### Screen 2 - Rotasyon (build and compare)
- Builder lane: a 3-year x 2-season timeline; drag crop cards (icon, photo, family colour) into slots; current rotation prefilled from the user's answer or "Bilmiyorum, tipik olanı kullan". Live rule feedback per slot (same-family repeat, legume credit, fallow gap) and a live score ring. Buttons: "Önerileri getir" (top 3), "Karşılaştır", "Kaydet".
- Compare canvas: pinned **Benim planım** vs up to 3 candidates as parallel cards. Each card has the timeline strip, four paired bars (Su, Toprak, Kâr, Risk) against mine with one rule (right/up = better), one trade-off sentence, an optional radar for experts. Drill-down: monthly water-balance mini chart and a crop-family compatibility heat row for the selected plan.
- Priorities: a Su-Gelir-Toprak-Risk slider/triangle docked on the right, re-ranking candidates live. Scenario chip on top; Pareto toggle "Kâr x Su". Irrigation chip ("Sulama: Orta, 250 m³/da") always visible and editable (H6).
- Primary action: **"Bu planı seç ve nedenini gör"** -> Screen 3.
- Why: direct manipulation (H3, H7), recognition over recall (H6), side-by-side compare (Gestalt), matches the farmer's mental model of rotation as a sequence in time.

### Screen 3 - Dayanak (why and trust)
- Layout: left = chosen plan's "Neden?" as 3-5 numbered reasons, each with one small chart (water balance, soil breakdown, frost risk) and a source chip; right = data used (climate record quality, soil and vegetation sources), editable assumptions (prices, yields, irrigation), calibration status.
- Discipline: one claim per card: claim -> chart -> expandable source, formula, inputs. Statistics (p-values) live under "Ayrıntı".
- Primary action: **"Planı dışa aktar / paylaş"** (agronomist handoff); secondary "Özeti kopyala".
- Why: evidence attached to each recommendation, not a standalone gallery (H10).

### Cross-screen glue
- Field object in the top bar; any redraw or crop swap recomputes with a visible status ("Hesaplanıyor... 73 plan denendi").
- URLs `/tarla`, `/rotasyon`, `/dayanak` with field id in the deep link.
- Undo/redo (Ctrl+Z) on drawing and builder; "Varsayılana dön" per section (H3).
- Onboarding: at most 3 contextual coach marks per screen, completion tied to real actions.
- Designed error states: no data for area, slow API, tile failure, oversize polygon, each with a next action (H9).
- Language: farmer terms on the surface, science in "Ayrıntı" drawers (H2).

### Flow budget
Entry -> search or example (1 click) -> draw/pick (3-6 clicks, 0 with example) -> land card (auto, under 10 s) -> "Rotasyon öner" (1 click) -> compare canvas auto-populated -> "Neden?" (1 click). First land answer: 1-2 clicks / under 15 s. First comparison answer: 3 clicks / under 40 s (today 4+ clicks / 60-90 s).

### Build order (hackathon-realistic)
1. Satellite map with polygon draw and instant land card from the existing services (SoilGrids, POWER, MODIS): highest owner value.
2. Compare canvas with pinned "mine" and paired bars (reuse the engine and `StripCalendar`).
3. Drag-and-drop builder lane over the existing `RotationBuilder` rules.
4. Copy cleanup (jargon) and the onboarding-progress honesty fix: cheap, high trust impact.
