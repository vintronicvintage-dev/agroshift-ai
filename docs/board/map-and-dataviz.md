# Board review: Map / GIS interaction and data visualisation

Reviewer lens: field selection, map, every chart and number display. Review and specification only; no product code was touched.
Evidence base: screenshots in `scratchpad/review/after` (`1440-dark-tarlam`, `390-dark-tarlam`, `1440-dark-genel`, `1440-dark-kanit`, `1440-dark-oneriler`, `1440-light-oneriler`), `src/components/field|charts|compare/**`, `src/lib/types.ts`, `docs/nsac-resources.md`, and live `curl` requests made on 2026-11-13 against a Konya-Cumra tile (z12 x=2420 y=1586, lat 37.57 lon 32.77).
Method: Tufte (data-ink, small multiples), Few (bullet/sparkline, "dashboard" rules), Cleveland-McGill (position beats length beats area/colour), Munzner (what-why-how). The `dataviz` skill was not installed under `~/.claude/skills`; I did not find it elsewhere, so the practice above is what I applied.

---

## 0. Headline findings (read this first)

1. **The product's core promise ("select the area, see information") is not met.** The map is a point picker at zoom 5-7. There is no polygon, no area, no imagery at field scale, no search, no GPS. "Alan 50 dekar" is a typed default, not a measurement.
2. **One displayed number is demonstrably wrong at field scale.** The Genel/Tarlam header says "Rakim 1.198 m" for Konya-Cumra. That is the NASA POWER grid-cell elevation. The terrain at the same point is **1018 m** (AWS Terrarium tile, decoded; verified) and **1012 m** (Open-Meteo / Copernicus DEM 90 m; verified). A 180 m error is visible to any farmer. It also feeds the "Ekim takvimi: Ic Anadolu platosu tipi (rakim >= 700 m)" rule, so the displayed reason for the calendar is built on a cell-mean, not the field.
3. **Resolution honesty is absent.** A 50 da field is 5 ha. One MODIS 250 m pixel is 6.25 ha. So the NDVI the app shows for a 5 ha field is *less than one pixel*, a mixed pixel. POWER cells are about 55 x 55 km. SMAP is about 9 km. None of this is shown next to the numbers.
4. **Colour collision.** Orange is simultaneously: wheat crop colour (Gantt), ET0 (water demand), "pilot marker", and "Yagis duzeltilmedi" warning chip. Blue is rain and also the selected-field ring. A colour-blind-safe palette is used, but the *semantics* are overloaded.
5. Most charts are decent SVG (axis, table fallback, `role="img"`), but **none shows uncertainty well** except the RangeBar (which is mis-scaled, see 1.9), **none shows a reference** (normal, threshold, plan-vs-current), and the **22 historical windows are never shown year by year**.

---

## 1. Critique and scores (0-10; 10 = professional field tool)

### 1.1 Tarlam map (`FieldMap.tsx`, OSM base, `1440-dark-tarlam`) - **2/10**
Evidence and issues:
- Opens at zoom 5 over the Black Sea / East Mediterranean: Cyrillic, Georgian, Arabic labels dominate (see screenshot); Turkey's own place names are the minority. For a Turkish farmer it reads as a foreign map. Fix: Carto labels in Turkish-first local names, or EOX overlay.
- The selected field is a 13 px ring plus dot (`circleMarker radius 13`) that is **screen-sized, not ground-sized**; zooming does not change what it covers. It says "a point", never "this land".
- 12 orange pilot dots (#E69F00, 7 px radius) look like data points but are navigation shortcuts; they share the crop-wheat colour; they are not keyboard-reachable (circleMarkers are SVG paths without tab stops) although chips exist below in `FieldStep`.
- `scrollWheelZoom: false` until focus. Correct for page-scroll hygiene, but there is no visible affordance ("Ctrl + scroll to zoom") and the mobile map (`390-dark-tarlam`, about 255 px tall) captures vertical swipes; there is no two-finger hint.
- No scale bar, no coordinate read-out, no north arrow, no locate button, no search, no layer switcher, no legend, no imagery. The "NDVI" overlay is hidden in *Gelismis ayarlar > Konum ve harita* (`showNdvi` state) so almost nobody will find it.
- `maxZoom: 15` on OSM; GIBS NDVI `maxNativeZoom 9` with `maxZoom 15` over-zooms a 250 m raster into 30-pixel blocks with 70 % opacity and no legend or date.
- Caption: "Haritada tarlanin oldugu yere dokun. Hazir bolgeler disindaki noktalarin verisi canli gelir, biraz surebilir." Honest, but the map gives no feedback while "biraz surebilir" (no skeleton, no progress; the three data-status dots are only text after load).
- Dark-mode OSM is the light tiles darkened with a CSS class (`osm-base`): labels turn muddy; the orange dots keep full brightness and dominate.

### 1.2 Genel bakis mini-map (Blue Marble, `1440-dark-genel`) - **3/10**
- NASA GIBS Blue Marble Next Generation is a *monthly 500 m composite* (Level 8). At focus zoom it renders as blurred brown with cloud smears (screenshot: white patches near the lake, no field-scale content). It conveys "satellite" decoratively but gives zero information; attribution is correct ("Imagery: NASA GIBS Blue Marble"), which is good, but the date is not shown and a 500 m monthly mean is presented as if it were "your field".
- Ring marker same screen-size problem. "Alan 50 dekar" under the map is the typed default.

### 1.3 Header facts block ("37,57 N, 32,77 E, Rakim 1.198 m ...") - **3/10**
- Text paragraph; elevation wrong at field scale (see headline 2); no unit-of-resolution; "Kayitli veri, 2026-11-12 tarihinde alindi" is good provenance but buried.
- Three status dots (POWER/SoilGrids/MODIS "hazir") are green dots with text: fine, but they report *loaded*, not *quality*.

### 1.4 KPI triplet "Tarlanin iklimi" 551 / 1.191 / 640 mm (`Genel`) - **7/10**
- Good: big monospace figures, units set small, plain-language gloss ("ihtiyacin yaklasik %46 kadari"), source chip "Yagis duzeltilmedi", dotted-underline definitions.
- Weak: 25-year *mean* shown with no spread (the Kanit chart shows annual rain from about 320 to 850 mm; the mean hides a 2.6x range). A driest-year / wettest-year pair under each number would cost one line.
- "1.191" with a thousands dot is read as 1.191 (one point one nine one) by anyone used to English decimals; the EN toggle exists. Rule in 5.3.
- Red/blue/orange bullets next to labels are fine because the text carries the meaning.

### 1.5 Monthly water balance bars (`Genel`, "Aylik su dengesi") - **5/10**
- Grouped bars (rain blue vs ET0 orange) and a "Denge" row of signed numbers coloured blue/orange. Positions on a common baseline: correct encoding per Cleveland-McGill. The balance row is a table pretending to be a chart.
- Issues: y axis has no unit (mm); "Yagis duzeltilmedi" appears in the legend row *as a swatch-less label* (reads as a third series); the real story, "water deficit months May-Sep", needs the deficit area shaded between the lines (a climograph, 3.8) rather than 24 bars whose pairwise comparison the eye must do; there is no cumulative deficit; no frost/season markers. Rain and ET0 cannot be read as "balance" without subtracting.

### 1.6 "Son kayitli gun" card (1,7 deg ...; rain 0,0 mm; wind 1,2 m/s; root-zone 37 %) - **4/10**
- Temperature "1,7 deg" has no "C" (clipped or missing), no comparison to the day's climatological normal, so "1.7" is meaningless to a farmer in November. "Kok bolgesi nemi %37": it is POWER GWETROOT (a 0-1 wetness fraction, not volumetric water content). Without "vs normal" and without the wilting-point/field-capacity reference the number cannot be judged. "Bugunun degil, serideki son gunun degerleri" is an honest caveat but is body text; should be a date chip on each number.

### 1.7 Soil indicator bars ("Toprak gostergesi 69/100", `Genel`, `Oneriler`) - **5/10**
- Horizontal bars are a good encoding; component labels with x/20 scores fine. But every bar is the same green regardless of score, so 9/20 and 15/20 differ only by length; no "max" track on some rows; in the expanded plan card the bars lose their numeric labels entirely (only bar, no 6/10) and the track is nearly invisible in light mode (`1440-light-oneriler`).
- Important: this "toprak gostergesi" is a *rotation heuristic* ("Olcum degil", says the footnote) but it sits visually next to measured soil data and shares the word "Toprak". Needs a distinct label: "Rotasyon toprak puani".

### 1.8 Plans table (`Genel`, "Planlar"; `Oneriler` comparison table) - **6/10**
- Right-aligned tabular numbers, crop icons, delta arrows with colour *and* arrow *and* sign: good accessibility. The inline 4 px sparkbars share a domain per column: good (Few). 
- Weak: bars are 4 px high and low contrast; deltas against "Su anki planin" are coloured by good/bad but the *direction convention differs per column* (water down = green, profit down = red), which is correct but not explained; no uncertainty in the table (P10-P90 is only inside the expanded card); "Su yetmedi: 91 -> 0" has no denominator (91 % of what? "donemlerin %'si" in a 10 px sub-header).
- "Uyum 68 /100" is a normalised weighted composite; the user cannot see the weights contribution. A 4-segment stacked bar (water/income/soil/risk contributions) would make 68 inspectable.

### 1.9 Plan card, RangeBar P10-P90 (`Oneriler` card, `RangeBar.tsx`) - **4/10**
- Concept right (P10-P90 whisker plus P50 tick), execution weak: the track is 340 px wide but the whisker is about 140 px wide in the centre with no axis ends; domain is "shared" across cards but no ticks or min/max labels show what the domain is, so 61-111 mm is drawn but the reader cannot see where 0 is. Text repeats the numbers ("Donemlerin %80'i: 61-111 mm"), so the bar adds nothing over the text. The profit bar is even smaller; the P50 tick is a 3 px sliver.
- 0.35 opacity fill on `--c-*` on dark is low contrast (failing 3:1 non-text on `1440-dark-oneriler`).

### 1.10 Rotation strip / Gantt (`StripCalendar.tsx`) - **6/10**
- Positives: three-year time axis, crops as bars with icon and label, fallow hatched (pattern, not colour only), "Ekis 5 Eki, hasat 27 haz" annotation. This is the best visual in the app.
- Weak: bare-soil days not drawn as such (the gaps are just empty); no water-demand ribbon; no frost window; wheat bar uses the same orange as ET0; the year ticks (1. yil, 2. yil, 3. yil) are placed at bar starts rather than a calendar axis with months; two 3-year plan strips in the same view cannot be aligned or compared; sowing delay (`delayDays`) not shown.

### 1.11 Annual rain + ET0 chart (`Kanit`, `ClimateCharts`) - **6/10**
- Bars for annual rain, a line for ET0, dashed Sen-slope lines; good captions with Mann-Kendall p-values; table fallback ("Tablo olarak goster"). 
- Weak: bar chart of *annual precipitation* with baseline 0 is right, but ET0 sharing the same y axis compresses it into a near-flat line at 1,100-1,250 (the story is "demand is stable at about 1,200; supply is 300-850") which is true, but the chart does not label either mean; no mean/median reference line; the last bar (2025) is the last *complete* year, while the current partial year is omitted without a note on the chart; trend lines drawn white-dashed over blue bars at low contrast; no wettest/driest year labels; the legend line "Kesikli cizgi: uzun donem egilimi" is long. Top of ET0 line clips at 1,300.

### 1.12 Pareto chart (`ParetoChart.tsx`, collapsed under "Daha fazla") - **5/10** (code review; chart not visible in screenshots)
- Circles sized by soil score (area encodes a third variable: weakest channel) in a scatter of requirement vs margin is a reasonable choice, 73 screening dots in muted grey, front in green, plans as filled labelled markers "M/1/2/3/S" with centred letters. Hidden by default: the most decision-relevant picture (trade-off) is in a collapsed section.
- Weak: direct labels are letters needing a legend; the frontier is not drawn as a step line; "better" direction not indicated (low water, high margin = top-left); sizes 3-10 px radius, fine; x domain starts at `min(0, ...)`. No P10-P90 cross-hairs.

### 1.13 Rotation builder (`RotationBuilder.tsx`) - **3/10**
- Three `<select>` dropdowns plus "Ekle". No timeline, no preview, no violation feedback until after adding; `ConstraintViolation` objects exist in the engine (`excluded`, `max_consecutive`, `calendar_conflict`, `gdd_insufficient`, `frost_window`, `not_candidate`) but are not used live. The Tarlam "Su an ne ekiyorsun?" selectors truncate names ("Bugday (ki...") at both widths (screenshots 1440 and 390).

### 1.14 Priorities cards ("En cok neyi onemsiyorsun?") - **6/10**
- The tiny 4-colour stacked weight bar inside each card is a nice sparkline-of-weights; but the four colours have no legend there (blue/orange/green/grey are legend-free), so it is decorative to a new user.

### 1.15 Dark/light theme (all) - **6/10**
- Both themes exist and are broadly consistent (`1440-light-oneriler`). In light mode muted green bars and 0.35 opacity ranges become faint; the selected-scenario pill inverts to black (good contrast).

**Summary table**

| Display | Score |
|---|---|
| Tarlam map | 2 |
| Genel Blue Marble mini-map | 3 |
| Header facts (lat/lon/elev/area) | 3 |
| Climate KPI triplet | 7 |
| Monthly water balance | 5 |
| Last-day card | 4 |
| Soil indicator bars | 5 |
| Plans table with sparkbars | 6 |
| RangeBar / plan-card ranges | 4 |
| Rotation Gantt | 6 |
| Annual rain/ET0 chart | 6 |
| Pareto | 5 |
| Rotation builder | 3 |
| Priorities weight bars | 6 |

---

## 2. Field workspace specification

### 2.1 Architecture decision
Stay on **Leaflet 1.9.4** (already installed, tile layers are all raster WMTS/XYZ; no vector style needed). Add:
- **Leaflet-Geoman free (MIT)** `@geoman-io/leaflet-geoman-free`: polygon, rectangle, circle, vertex edit, drag, snapping, cut; or **terra-draw** (MIT) if you later move to MapLibre. I recommend Geoman now because the repo is Leaflet.
- **Turf modules** (`@turf/area`, `@turf/length`, `@turf/centroid`, `@turf/bbox`, `@turf/boolean-valid`, `@turf/kinks`, `@turf/circle`): geodesic area and perimeter. Never use Leaflet's `L.GeometryUtil` pixel area; never use planar Web-Mercator area (at 37.6 N the planar area is overstated by about 1/cos^2(lat) = 1.6x).
- MapLibre is not needed; revisit only if you want 3D terrain or vector contours.

All map code stays client-only, dynamically imported (as today). Canvas reading of tiles needs CORS: GIBS and AWS Terrarium return `Access-Control-Allow-Origin: *` (verified), EOX echoes the Origin (verified).

### 2.2 Basemap stack: URLs that actually returned 200 (2026-11-13, Konya tile)

Leaflet templates use `{z}/{y}/{x}` for WMTS REST (row = y, col = x) and `{z}/{x}/{y}` for XYZ.

**A. Imagery, always-on candidates**

| Layer | URL template (all verified 200) | Zoom | Licence / attribution |
|---|---|---|---|
| **EOX Sentinel-2 cloudless 2024** (default) | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg` (the long set name `GoogleMapsCompatible` works equally) | Served z0-18 (z12, 13, 14, 15, 16, 17 verified). Native resolution about 10 m = about z14-15 at 37 N; tile bytes drop 22 KB (z14), 14 KB (z15), 11 KB (z16), 7 KB (z17), i.e. upsampled. Use `maxNativeZoom: 15`, `maxZoom: 18`. | EOX capabilities state **CC BY-NC-SA 4.0** for 2017-2025 ("For commercial usage please see cloudless.eox.at"). Attribution: "Sentinel-2 cloudless - s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2024)". |
| EOX Sentinel-2 cloudless **2016** | `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg` (200 at z12; the `s2cloudless-2016_3857` spelling returns 404) | same | The capabilities file states **CC BY 4.0** for 2016 only. All later years (2017-2025, 2025 returns 200) are CC BY-NC-SA. |
| Years available | `s2cloudless-2017_3857` ... `s2cloudless-2025_3857` all 200 | | Offer a year dropdown (2018-2025) as "Gorunum yili"; that is a free year-on-year change viewer for a field. |
| Esri World Imagery (optional "yuksek cozunurluk", off by default) | `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}` | z17 returned 200 (22 KB) | Not an open licence; Esri terms and attribution ("Esri, Maxar, Earthstar Geographics...") apply. I did not verify imagery vintage or resolution at the Konya tile visually. Show only behind an explicit toggle with the attribution text; do **not** make it the default for a public competition submission. |

**Compliance note for the owner:** the cleanest "free, no key, redistributable" pair is EOX 2016 (CC BY) plus NASA GIBS (NASA open data). EOX 2017-2025 is free for **non-commercial** use with attribution; a competition prototype qualifies, a paid product does not. Put the licence in the layer menu tooltip and in `docs/submission-notes.md`.

**B. NASA GIBS, time-enabled and analytic layers** (all `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/<Layer>/default/<YYYY-MM-DD>/<TileMatrixSet>/{z}/{y}/{x}.<ext>`; CORS `*`; no key; NASA data is public domain, credit "NASA GIBS / Worldview"):

| Layer | TileMatrixSet, ext | Max zoom | Verified | Time dimension (from capabilities) | Notes |
|---|---|---|---|---|---|
| `HLS_S30_Nadir_BRDF_Adjusted_Reflectance` (Sentinel-2 HLS, 30 m) | `GoogleMapsCompatible_Level12`, png | 12 | 200, real data on 2026-10-22 (126,669 B) and 2026-11-01 (37,455 B) | to 2026-11-05 (latency about 8 days) | **Swath-sparse**: on days without a pass the server still returns 200 with a **334-byte fully transparent PNG** (2026-10-18, -20, -25, -28 verified). See 2.5. |
| `HLS_L30_Nadir_BRDF_Adjusted_Reflectance` (Landsat, 30 m) | same | 12 | 200 (1,189 B = partial) | to 2026-11-05 | Same sparse behaviour; use as 2nd source. |
| `MODIS_Terra_CorrectedReflectance_TrueColor` (250 m) | `GoogleMapsCompatible_Level9`, jpeg | 9 | 200 (z9) | daily to 2026-11-14 | Daily regional context. |
| `VIIRS_SNPP_CorrectedReflectance_TrueColor` | Level9, jpeg | 9 | 200 | to 2026-11-02 | |
| `VIIRS_NOAA20_CorrectedReflectance_TrueColor` | Level9, jpeg | 9 | 200 | to 2026-11-13 | Most current daily true colour (use as default for the "bugun" layer). |
| `MODIS_Terra_L3_NDVI_16Day` | Level9, png | 9 | 200 (also with no date = latest) | 16-day steps, last 2026-10-16 | This is what the app already uses; add a date. |
| `MODIS_Terra_NDVI_8Day` | Level9, png | 9 | 200 | daily dimension, to 2026-11-12 | Better cadence. |
| `SMAP_L3_Passive_Enhanced_Day_Soil_Moisture` | `GoogleMapsCompatible_Level6`, png | 6 | 200 | dates to 2026-11-10; swath gaps | About 9 km product; zoom 6 is native. Over-zoom is blocky: label as "9 km". |
| `SMAP_L4_Analyzed_Root_Zone_Soil_Moisture` | Level6, png | 6 | 200 (2026-11-08) | I did not read its date range | Gap-free model-assimilated root zone, better than L3 for the "root-zone now" story. |
| `IMERG_Precipitation_Rate` | Level6, png | 6 | 200 (2026-11-10) | daily (and a 30-min variant) to 2026-11-12 | About 10 km; use for "last 7 days rain" context. |
| `SRTM_Color_Index` | Level12, png | 12 | 200 (z8) | static (no time segment) | Colour-coded height. |
| `ASTER_GDEM_Color_Shaded_Relief` | Level12, jpg | 12 | 200 (z12) | static | Use as the terrain/hillshade layer (shaded relief is the readable one for fields). |
| `BlueMarble_ShadedRelief` | Level8, jpg | 8 | 200 | static | Low-zoom only. |
| `Reference_Labels` | Level9, png | 9 | 200 at z6 tile; the z9 Konya tile was a 334 B empty tile | static | Sparse; don't rely on it for labelling. |

URL for the date: replace `<YYYY-MM-DD>` as in the examples above. Omitting the date segment returns the latest layer for time-enabled layers (verified for NDVI 16-day).

**C. Labels and roads overlay (above imagery)**

| Overlay | URL (200) | Zoom | Licence |
|---|---|---|---|
| Carto labels, light theme | `https://basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png` (also `light_only_labels/{z}/{x}/{y}.png`) | 0-20, add `@2x` for retina | OSM data, CARTO basemap terms: free for non-commercial / low-volume with attribution "&copy; OpenStreetMap contributors &copy; CARTO". Local-language labels (Turkish names in Turkey). |
| Carto labels, dark theme | `https://basemaps.cartocdn.com/dark_only_labels/{z}/{x}/{y}.png` | 0-20 | same |
| EOX bright overlay (alternative, same operator as the imagery) | `https://tiles.maps.eox.at/wmts/1.0.0/overlay_bright_3857/default/g/{z}/{y}/{x}.png` (z10 and z12 verified) | to about 18 | "Data (c) OpenStreetMap contributors, Rendering (c) EOX" |
| Terrain/hillshade, EOX | `https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg` (200) | | OSM and others, EOX |
| OSM standard (current base, keep as "Harita" option) | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | 19 | ODbL, OSM tile policy: no bulk, send Referer, cache; fine for interactive use |
| OpenTopoMap (contours, optional) | `https://tile.opentopomap.org/{z}/{x}/{y}.png` (200) | 17 | CC-BY-SA; fair-use server, avoid by default |

**D. Elevation data (for the info panel, not display)**
- `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png` (200 at z12, 14, 15; CORS `*`). Decode `h = R*256 + G + B/256 - 32768`. Verified at the Konya tile centre: 1018.2 m. Source is mixed global DEMs (SRTM-class about 30 m in this area). Free (AWS Open Data / Mapzen terrain tiles terms; credit "Terrain Tiles (Mapzen), SRTM, USGS").
- `https://api.open-meteo.com/v1/elevation?latitude=..&longitude=..` returned `{"elevation":[1012.0]}` (Copernicus DEM 90 m, CORS `*`, up to 100 points per call, free for non-commercial). Use as a cross-check, "Iki DEM'in farki 6 m".
- SoilGrids REST `https://rest.isric.org/soilgrids/v2.0/properties/query` (already used server-side). **Observed latency:** the first test call timed out at 30 s (status 000), the next call returned a Feature within 60 s. So the UI needs a skeleton, a 45 s timeout and a "retry" state (3.9).

### 2.3 Base-layer and overlay menu
Single control, top-right (desktop) or bottom sheet (mobile), two sections:

```
BASEMAP (radio)                       OVERLAYS (checkbox, with opacity slider)
(o) Uydu - Sentinel-2 (2024)          [x] Yer adlari
( ) Uydu - Sentinel-2 yili: [2024 v]  [ ] Tarla sinirlari (kayitli tarlalar)
( ) Uydu - NASA HLS 30 m (tarih ...)  [ ] NDVI (MODIS)         date ----o----
( ) Harita (OSM)                      [ ] Toprak nemi (SMAP)   date ----o----
( ) Yukselti golgeli (ASTER)          [ ] Yagis (IMERG)        date ----o----
                                      [ ] Veri hucreleri (250 m / 9 km / 55 km izgara)
```
- Default: EOX Sentinel-2 + labels on. Remember the choice in `localStorage` (try/catch).
- Each overlay owns a legend chip (2.6) and a "bu katman nedir / cozunurluk / tarih" one-liner.
- Attribution control stays visible but compact; add one line per active layer (NASA GIBS / EOX / OSM) as the licences require.
- Honest 404/blank handling: on `tileerror` show a non-blocking toast "Bu tarihte goruntu yok", never a silent grey.

### 2.4 Search and location
- **Place search** (`Yer ara`): Nominatim `https://nominatim.openstreetmap.org/search?q=<q>&format=jsonv2&limit=5&countrycodes=tr&accept-language=tr&addressdetails=0` (200, CORS `*`, verified; first test returned a railway station for "Cumra" with a licence line, so ask for `featuretype=settlement` or show 5 results to pick).
  - Usage policy (osmfoundation.org/wiki/Nominatim_Usage_Policy): max **1 request/second**, **no search-as-you-type autocomplete**, identify the application (browsers cannot set User-Agent; the Referer header suffices), cache results, display "Data (c) OpenStreetMap contributors (ODbL)" near results, no bulk geocoding.
  - Therefore: submit on Enter or on the search button only; disable the button while a request is in flight; client-side cache by normalised query string; debounce is irrelevant because there is no live typing.
  - Server-side proxy not needed. If the demo is likely to be hit by judges simultaneously, add a `/api/geocode` route that adds a custom User-Agent, rate-limits and caches; mention in docs.
- **Coordinates**: same input parses `37.57 32.77`, `37,57 32,77` (Turkish decimal comma), `37.57, 32.77`, DMS `37 34 12 N 32 46 12 E`; ambiguous input shows both interpretations as chips.
- **GPS locate**: `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy`, show accuracy circle (radius = `coords.accuracy`), disclaimers when accuracy > 100 m ("Konum +-250 m; sinirini haritadan duzelt"). Requires HTTPS or localhost. Never send the location anywhere but the field query.
- **Default view** on first load: Turkey bounds, Turkish labels, no Cyrillic: the overlay fixes that.

### 2.5 Drawing and editing tools
Toolbar (left, vertical, 44 px hit targets; on mobile a bottom bar):

| Tool | Behaviour |
|---|---|
| **Cokgen** (polygon) | Click-to-add, double-click or "Bitir" to close; live area chip follows the cursor (dekar and ha). Minimum 3 vertices; self-intersection blocked (`@turf/kinks`); show a toast "Sinirlar kesisiyor". |
| **Dikdortgen** | Two-corner drag; a "yonu serbest" option makes a rotated rectangle (Geoman rotate mode) because many parcels are not axis-aligned. |
| **Pivot / daire** | Click centre, drag radius; show radius in m and area; typical centre-pivot 400 m radius = 50.3 ha = 503 da. |
| **Duzenle** | Drag vertices, drag mid-edge handles to add a vertex, right-click/long-press a vertex to delete (min 3). Drag the whole shape. |
| **Geri al / Ileri al** | App-owned history stack of GeoJSON snapshots (Geoman free has no undo); Ctrl+Z / Ctrl+Shift+Z; 50 steps; also Esc cancels the current drawing. |
| **Yapis** (snap) | Geoman `snappable: true`, `snapDistance: 12` px to own vertices and to saved-field vertices; toggle "Yapis" with `S`. |
| **Olc** | Show perimeter and per-edge lengths on edges while editing; read-only after drawing. |
| **Sil** | Removes the active shape (with undo toast, 6 s). |

Rules:
- **Area: geodesic, in dekar first.** `area_m2 = turf.area(feature)` (spherical-excess geodesic). `da = m2/1000`, `ha = m2/10000`. Display "51,3 da (5,13 ha)", Turkish format; perimeter in m (< 2 km) or km with 2 decimals.
- **Size guard**: warn at < 1 da ("cok kucuk, iklim hucresi ve uydu cozunurlugu ile eslesmez") and > 5,000 da ("tek tarla icin buyuk; birden fazla tarla olarak ayir").
- The existing `FieldInput.areaDa` becomes **derived** from the polygon; the user can override with the manual number (keeping `source: "polygon" | "manual"` so the report says which).
- The point query (`lat`, `lon` for POWER/MODIS/SoilGrids) uses the polygon **centroid** (`@turf/centroid` is fine for convex shapes; use `pointOnFeature` for concave ones) and, for 250 m MODIS, also the list of pixel centres inside (3.6).
- Keyboard access: all tools reachable by Tab, `Enter` to place a vertex at the crosshair centre, arrow keys to nudge the crosshair 5 px (Shift = 25 px). This is the screen-reader/mobility fallback the board's accessibility member will ask for; and an "Koordinatlarla gir" table (lat/lon rows with add/delete) is the full text alternative.
- **Import/export**: Dosya > GeoJSON ice aktar (Feature/FeatureCollection, Polygon/MultiPolygon, take the first or ask), KML via `togeojson` optional, Shapefile not supported (explain). Export GeoJSON, with properties `{name, areaDa, areaHa, crop plan id, createdAt}`; plus "Kopyala" for coordinates. Validate input: right-hand rule irrelevant, check bounds, repair with `@turf/clean-coords`; cap at 5,000 vertices.
- **Multiple saved fields**: Local list (localStorage, try/catch) with name, area, thumbnail (just a static `L.polygon` mini-SVG, no tile request), "Tarlalari goster" overlay with outlines and area labels at z >= 13. Active field = thick outline (2.5 px, accent), others thin dashed. Switching the active field reruns the analysis (existing engine). Cloud sync is out of scope without auth.

### 2.6 Time slider and legends
- **Date control** appears under the map when a time-enabled layer is on: a slider with tick marks for the layer's cadence (daily for HLS/VIIRS/IMERG, 8-day and 16-day for NDVI). Controls: previous/next step, "Bugun / en yeni", a calendar popover, play (1 step/second, loops last 12 steps).
- **Available-date logic**: take the dimension strings from GIBS capabilities (cache; e.g. `2026-03-02/2026-11-05/P1D`). Do not offer dates past the end. Show the layer's real latency: "HLS: en yeni 5 Kas 2026 (8 gun gecikme)".
- **HLS gap handling**: a probe function fetches the 1-4 tiles covering the polygon bbox at z10 for the last 30 dates (parallel, cap 6 concurrent), draws each to a 16x16 canvas, tests alpha > 0 on at least 50 % of pixels, and marks "goruntu var". Slider ticks with imagery are solid, others hollow; "En son temiz goruntu" jumps to the newest solid tick. Bytes < 400 = empty (cheap pre-test before decoding). Because the sparse-swath layer returns HTTP 200 for empty tiles, never trust the status code.
- **Cloud caution** for HLS: cloud-contaminated tiles show white; label "bulut olabilir" and offer the previous clear date.
- **Legends** (bottom-left, one per active analytic layer, 12 px type): 
  - NDVI: horizontal gradient bar -0.1 ... 0 ... 0.5 ... 0.9 with the 3 labelled meanings "Bos toprak / seyrek bitki / yogun yesil" and tick text; same ramp as 5.2.
  - SMAP / root-zone moisture: gradient 0 -> 0.5 m3/m3 with "kuru -> islak".
  - IMERG: stepped bins 0, 0.1, 1, 5, 10, 25+ mm/h with swatches.
  - Never rely on the colour only: each legend has end labels and a "bu katman" info popover (source, resolution, date).
  - Legend colours must be the *layer's real colours* (GIBS palettes are fixed); do not pretend they are the app palette. Fetch the actual palette from the GIBS layer metadata or draw by sampling; say "palet NASA GIBS'e aittir".
- **Opacity** slider default 70 % for analytic overlays, never over labels.
- **Resolution footprint overlay** ("Veri hucreleri"): when on, draw centred on the polygon centroid: a 250 m square (MODIS), the 0.5 x 0.625 degree POWER cell (about 55 x 55 km at this latitude; exact bounds from the dataset grid), the 9 km SMAP cell, and a 30 m pixel size reference. Label each in a small chip. This is the honest-scale feature (3.6).

### 2.7 Mobile behaviour (390 px)
- Workspace is a **full-height map** (100dvh minus top bar) with a **bottom sheet** (3 snap heights: peek 96 px with area chip; half 50 %; full) holding the Field information panel and the layer menu; the "4 questions" form moves below the fold of the sheet. Right now the map is a 255 px inset the page scrolls past; with scrollWheelZoom disabled, vertical swipe scrolls the page and two-finger moves the map.
- Gesture: one finger pans, two fingers zoom (Leaflet `touchZoom`, `dragging`), add `leaflet-gesture-handling`-style overlay only for the *inline* (non-full-screen) map.
- Drawing: a crosshair mode ("hedef nisangahi") for precise vertex placement: the map pans under a fixed centre crosshair, a big "Nokta ekle" button commits a vertex (finger never occludes the vertex); "Geri al" and "Bitir" sit next to it. This is the standard fix for fat-finger drawing.
- 44 px targets, no hover-only affordances, layer menu as a sheet, legend collapses to a one-line chip ("NDVI 5 Kas") that expands.
- Offline/slow: skeleton tiles use the dark/light neutral colour not white.

---

## 3. "Field information" panel (what appears the moment an area is drawn)

Placement: right column on desktop (width 380-420 px, scrolls independently), bottom sheet on mobile. It builds progressively: every card shows its own skeleton, resolves independently, and never blocks the others (the three data sources do not return at the same time; SoilGrids may take 30+ s).

### 3.1 Priority order and visual form

| # | Card | Content | Visual form | Source and native resolution (shown as a chip) |
|---|---|---|---|---|
| 1 | **Tarla ozeti** | Name (editable), **area (da and ha)**, perimeter, centroid lat/lon, bbox, "Imza" mini outline | Header with one big number "51,3 da" plus ha; small outline SVG | computed, geodesic |
| 2 | **Yukselti ve egim** | Elevation min / mean / max, relief = max-min, **slope** mean and max (deg and %), **aspect** (dominant facing) | Elevation as a **min-mean-max range bar** on the shared 0-3000 m domain; slope as a 4-bin **histogram** (0-2, 2-5, 5-10, >10 %) with traffic text "duz, sulamaya uygun"; aspect as a **mini compass rose** (8 wedges by area share) | Terrarium ~30 m (z13 tiles), mean of pixels inside polygon, Horn 3x3 slope; chip "30 m, alan icinde N piksel" |
| 3 | **Toprak profili** | By depth 0-5, 5-15, 15-30, 30-60, 60-100, 100-200 cm: sand/silt/clay, pH, organic carbon, CEC, bulk density, N | **Soil column**: a vertical stack of 6 depth slabs (height proportional to thickness, log-ish scale allowed with label), each filled with a texture-class colour and showing "kil %32". Right of it: **texture triangle** (USDA) with the 0-30 cm point plus a thin trail for deeper layers | SoilGrids 250 m; chip "250 m, alan < 1 piksel" |
| 4 | **Toprak kimyasi** | pH, organic carbon (g/kg -> %), CEC vs thresholds | **Bullet bars with agronomic zones**: pH track 4-10 with the optimal band 6.0-7.5 shaded and alkaline/acid zones marked, marker for the value; SOC with bands <10 low, 10-20 med, >20 high g/kg; CEC bands <10, 10-25, >25 cmol/kg. Calcareous (pH > 7.5) is common in Konya: text "kirecli topraklarda P ve Fe tutulumu" in the card note | SoilGrids; values are predicted means with uncertainty (SoilGrids provides `Q0.05`/`Q0.95`: draw them as the whisker) |
| 5 | **Kok bolgesi nemi: simdi / normal** | Current root-zone wetness vs same-day percentile of 25 yr; plant-available water capacity (mm) | A **strip with 5 percentile bands (P10-P25-P50-P75-P90)** of the day-of-year distribution and the current value as a marker plus "normalin %23 altinda (kuru)"; capacity as a bucket glyph | POWER GWETROOT daily since 2001 (about 55 km model; the label says so) |
| 6 | **Iklim normalleri** | Monthly mean Tmax/Tmin, monthly rain (mean and P10-P90), ET0 | **Climograph** (Walter-Lieth style): rain as bars (left axis, mm), mean Tmax/Tmin as two lines (right axis, C), shaded region between rain and ET0 when ET0 > rain labelled "su acigi donemi"; month ticks; frost months get a blue band along the baseline | POWER 25 yr |
| 7 | **Buyume derece-gunu (GDD) ve don** | GDD base 0 C and base 10 C by crop season; **last spring frost** and **first autumn frost** (median, earliest/latest in 25 yr, and 90 % date) | **GDD accumulation curve** (cumulative from 1 Jan) with P10-P90 band across years and crop-specific horizontal lines (e.g. wheat needs about X GDD to maturity from the app's crop calendar); frost dates as a **range dot-plot** on a Jan-Dec axis: whisker (earliest-latest), tick (median), 90 % marker, with "tmin <= 0 C" definition | POWER tmin/tmax |
| 8 | **NDVI fenolojisi** | Last 5 years NDVI by day-of-year, current year highlighted, **bare-soil periods shaded** (NDVI < 0.2) | **Small-multiple lines on a shared Jan-Dec axis**: grey lines for earlier years (low opacity), accent line for the current year, a median band; amber shading under the 0.2 threshold; crop-calendar chips on top (ekim/hasat of the current plan) | MODIS 250 m, 16-day; chip "250 m, karisik piksel olabilir" |
| 9 | **Sulama ihtiyaci (aylik)** | Net irrigation need per month for the current plan (from the engine) | 12-column bar chart with P10-P90 whisker per month and the **rain and ET0 from card 6 as faint context** | engine |
| 10 | **Veri kalitesi ve kapsam** | Which of the above are measured in the polygon vs borrowed from a coarser cell | Compact **provenance table** (3.6 icons) | |

Cards 1-4 appear within about 1-2 s (all local or tile-based); 5-9 follow when the existing POWER/MODIS/SoilGrids calls resolve; each card uses the same layout slot so the panel never jumps.

### 3.2 Elevation, slope, aspect computation (client-side, no server)
1. Fetch the Terrarium tiles covering the polygon bbox at z13 (about 19 m per pixel at 37 N, finer than the source; z12 is enough for fields > 100 ha). Draw to a canvas; decode RGB to metres.
2. Mask pixels whose centre is inside the polygon (`turf.booleanPointInPolygon` or scan-line); compute min/mean/max and the 5-95 percentile (to ignore single bad pixels).
3. Slope and aspect with the Horn 3x3 kernel using the real pixel size in metres at that latitude (`156543.03 * cos(lat) / 2^z`). Output slope in % and degrees, aspect with compass bins.
4. If fewer than 9 pixels fall inside (very small field), switch to z14 and say "kucuk alan: egim tahmini yaklasik".
5. Cross-check with Open-Meteo at the centroid; if the two differ by > 30 m, show a "DEM'ler farkli" note.
6. **Replace the POWER elevation in the header** with this value, keep POWER's only where the engine needs the "cell elevation" for its lapse-rate adjustment, and label it "iklim hucresi ortalamasi 1.198 m".

### 3.3 The soil column + texture triangle (visual spec)
```
 Derinlik   Dokular (siralama)                  Texture triangle
 0-5 cm    [#######  kil 32 / kum 24]  pH 7,9   (USDA triangle, 12 classes drawn light,
 5-15      [#######  kil 34 / kum 22]   ...      points: 0-30 cm bold, deeper layers 60% dots,
 15-30     [########  ...            ]           arrows from top to bottom layer)
 30-60     [#########  ...           ]
 60-100    [#########                ]  note: "SoilGrids 250 m modeli; tarla icinde olcum degil"
 100-200   [#########                ]
```
- Slab fill uses the texture-class colour from a categorical palette that does *not* reuse the hydrology blue/orange (use the neutral earth set in 5.1); each slab also carries the class name text ("killi tin") and the two or three numbers; hover/focus reveals the Q05-Q95 range.
- Triangle: axes labelled (kil %, silt %, kum %), class boundaries drawn at 0.5 stroke, the 6 depth points joined with a thin line; if the user overrides texture, show the user point in a second marker "Girdiginiz deger".
- Table fallback: depth x (sand, silt, clay, pH, SOC, CEC, bulk density) with units.

### 3.4 Soil chemistry bullet bars (spec)
Each is a 12 px high track with **threshold zones** drawn as labelled bands: [yetersiz | uygun | fazla], the estimate as a vertical marker, the Q05-Q95 range as a whisker, and below the track "uygun aralik 6,0-7,5". Colours: zones neutral (3 grey tints) rather than red/green, with the marker in accent; the word for the zone is text ("uygun disi: alkali"). Thresholds come from `AdvancedSettings`/`CropAgronomy` or, where absent, mark as `assumption` (use the existing `Sourced<T>` pattern) and disclose.

### 3.5 Current root-zone moisture vs normal
Compute for the current day-of-year +-7 days the empirical CDF over the 25 years of GWETROOT; show the current value on the **percentile strip**. Text states the percentile in words ("normalden kuru, %18'lik dilim"). Never show "37 %" alone. When the latest record is stale (> 3 days) show "son kayit 9 Kas". Optionally link the SMAP L4 layer ("haritada gor") to show the spatial pattern; flag 9 km.

### 3.6 Communicating polygon vs pixel scale honestly
The key principle: *every number has a resolution chip and an n-inside-polygon count, and the panel says whether the number is a measurement within the field or a neighbour's value.*

Provenance tiers, shown as an icon + short text (never colour alone):
- **Alan icinde (>= 9 piksel)**: filled square icon, "tarlanin icinde olculdu / hesaplandi" (elevation and slope at 30 m for fields >= 1 ha).
- **Alan icinde (< 9 piksel / karisik)**: half square, "birkac piksel; kenar etkisi olabilir" (SoilGrids 250 m, MODIS 250 m for fields of 1-40 ha).
- **Cevre hucresi**: outlined square, "tarla bu hucrenin icinde; hucre ortalamasi" (SMAP 9 km, POWER 55 km, IMERG 10 km).

Concrete numbers for the panel (computed, not hard-coded): "Tarla 5,1 ha; MODIS pikseli 6,25 ha: tarla pikselin %81'i. Bu piksel komsu parselleri de kapsiyor olabilir."

The **"Veri hucreleri" overlay** (2.6) draws the real footprints so the reader *sees* the 250 m square engulf the field and the 55 km cell engulf the whole district. For SoilGrids and MODIS, draw the actual pixel boundaries that intersect the polygon (known grid origin) as thin outlines when the user hovers the chip.

Behaviour rules:
- Fields < 6.25 ha (about 62 da) get a persistent banner on the NDVI card: "Bu tarla bir MODIS pikselinden kucuk: egri, civardaki araziyi de icerir. Daha iyi cozunurluk icin harita uzerinde Sentinel-2/HLS goruntusunu karsilastir." (Numeric Sentinel-2 NDVI is *not* available without a key; the HLS layer is visual only.)
- Where the value differs strongly between the cell and local DEM/soil (elevation 1,198 vs 1,018), show both: "Iklim hucresi: 1.198 m; tarla: 1.018 m".
- Rainfall: "POWER agirlikli 55 km tahmindir; yakin istasyonla duzelt" (already in the app: keep, and show this beside the climograph).
- No aggregated "kalite puani" that hides the mismatch.

### 3.7 Loading, skeleton, empty and error states
- **Skeleton** per card: grey shimmer blocks the final height of the card (fixed card heights, no layout shift), 1.2 s shimmer; `prefers-reduced-motion` stops the shimmer (static grey).
- **Progress**: a 2 px top bar plus "NASA POWER ... SoilGrids ... MODIS ..." status list with each source as `bekliyor / aliyor / tamam / hata` (text plus icon).
- **Timeout/slow** (SoilGrids observed > 30 s): after 8 s show "SoilGrids yavas yanit veriyor; diger kartlar kullanima hazir", keep waiting to 45 s, then offer "Yeniden dene" and "Bolge ortalamasi kullan" (existing `default` soil with an explicit label).
- **Error**: per card, inline, with cause class ("ag hatasi", "kaynak bu bolgeyi kapsamiyor", "gunluk limit"), a retry button and a cached-value fallback with its date; never a global crash screen.
- **Partial polygon outside coverage** (e.g. offshore or non-land): "Secilen alan deniz/gol; tarla degil" and block analysis.
- **Empty state** (before any shape): the panel shows the 3-step hint with an animated crosshair icon ("1 Ara 2 Ciz 3 Sonuc") and the saved fields list.

---

## 4. Redesign of the rotation visuals

General rules for all of these: same palette (5), month-based x axes with the sowing season starting in autumn (Eki) so the winter wheat bar is continuous; every encoding has a text alternative (aria-label with the sentence, a table in `<details>`); crop identity = **family colour + glyph + text**; and nothing is colour-only.

### 4.1 Rotation timeline (replaces `StripCalendar` as the primary plan visual)
```
        1. yil                        2. yil                        3. yil
        E  K  A  O  S  M  N  M  H  T  A  E  K  A  O  S  M  N  M  H  T  A  E ...
Plan    [=Arpa=====================]  ~~ bos ~~ [//////Nadas//////]  ~~ [=Macar figi===]
Don    ........xxxxx....................................................
Su ihtiyaci  ▂▂▃▅▇█▆▃▁   (ribbon: monthly net irrigation need, P50, from engine)
Bos toprak gun: 94  ┤ shaded gap bars with "94 g bos"
```
- Rows per year or one continuous 36-month axis (preferred; allows carry-over to read). Crop bars from `calendar[i].sow` to `harvest` using the plan's own dates; `delayDays` drawn as a hatched stub "+9 g gecikme". `bareDaysAfter` is drawn as a labelled dashed outline in amber (not as nothing). Frost window (from engine/frost data) as a pale-blue band on the axis; "don riski" at sowing/heading is an icon on the bar.
- **Water-demand ribbon** under the bars: monthly irrigation need (`irrigationNetMm` P50 per year) as thin bars (blue ramp), shared scale across plans so two plans align when stacked.
- Data fields needed: `PlanResult.calendar[]` (cropId, year, sow, harvest, delayDays, bareDaysAfter, stages), `years[].irrigationNetMm`, `ClimateSummary.monthly` for context, frost date medians. **Missing**: monthly irrigation need per plan (today only annual `Dist`); the engine should emit `irrigationNetMmByMonth[12][3]` (P50).
- Interaction: hover/focus a bar shows sow/harvest dates, stages (ini, dev, mid, late as 4 shaded segments inside the bar), yield P10/P50/P90; click scrolls to the card section; drag handles on bar ends are NOT offered here (the builder in 4.7 handles edits).
- Accessibility: each bar is a focusable group with `aria-label="Arpa, 5 Ekim 2026'dan 27 Haziran 2027'ye, 94 gun bos toprak ardindan"`; the table fallback lists the same rows. Patterns (hatch for fallow, stipple for bare) plus text, never colour alone.
- Mobile: rotate to a **vertical timeline** (3 stacked year bands, each 100 % width with crop bar as a horizontal bar and the months along the top), keeping the ribbon as a thin strip under each band.

### 4.2 Comparison: small multiples, not radar or parallel coordinates
Chosen: **small multiples of horizontal "bullet/range" rows (one row per metric, one dot-and-whisker per plan, all sharing the same x scale per metric)** with a plan header strip.

```
                     Su acigi (mm/yil)  <- daha iyi        Brut kar (TL/da) -> daha iyi
Su anki plan   M   |-----o---------|                     |   o---------|
Oneri 1        1   |--o---|                              | o----|
Oneri 2        2   |---o-----|                            |    o------|
```
Why this, and why not the others:
- **Radar/spider**: area encodes nothing, axes ordering changes the shape, 4+ axes with unlike units cannot share a scale, the polygon overlap hides plans; misread by non-experts (Few, Cleveland). Reject.
- **Parallel coordinates**: powerful for 20+ plans and 6+ metrics (Munzner); with 4 to 5 plans and 4-5 metrics the line crossings carry little and every axis needs its own scale and direction flip, which farmers misread. Keep it for an optional "73 plan kesfet" mode (4.5), not the main comparison.
- **Small multiples of dot/whisker rows**: position on a common scale (best per Cleveland-McGill), uncertainty fits natively (whisker = P10-P90), and the current plan is a reference line through every row. Direction-of-good arrow on each metric header resolves the "down is good here, up is good there" problem.
- Data: `PlanResult.water.requirementMmPerYr`, `unmetDeficitMmPerYr`, `economics.grossMarginTLPerDaPerYr`, `soilHealth.score`, `risk.score` (Dist for the first three; score for others, with the `risk.components` as a mini stacked bar). Domain per metric computed across all shown plans (and padded).
- Interaction: hover dims others; clicking a plan name pins it; the "current plan" is a vertical dashed line labelled "su an" in each row; a toggle "yuzde olarak goster" converts to change vs current.
- A11y: each row has a text sentence ("Oneri 1: su acigi 74 mm/yil, aralik 61-111, su anki plandan 57 daha az"); table fallback; marker shapes differ (circle, square, diamond) in addition to colour.
- Mobile: rows stack with the plan names above the track; the whisker fills the full width (about 320 px).

### 4.3 Uncertainty display
- Default: **P10-P50-P90 as a whisker with a dot** (as now) but done right: visible axis ends, a labelled P50 value above the dot, the P10 and P90 values at the whisker ends in 11 px text, and a faint **gradient (quantile) fill** from P10 to P90 whose opacity peaks at P50 (a 5-stop linear gradient 0.15 -> 0.55 -> 0.15) rather than a flat 0.35.
- Detail view: **quantile dot plot** (20 dots = the 22 historical windows or a 20-quantile summary; each dot = 5 % of cases) for the most important metrics (gross margin and unmet deficit). Sentences accompany it: "10 yildan 1'inde kar 63 TL/da'in altinda" (frequency format is easier for lay readers than percentages).
- Data: `Dist {p10,p50,p90,mean,n}`; for dot plots the per-window values (`windows.agYears`) must be exposed by the engine as `byWindow: {agYear, value}[]` (see 4.4). Without it, approximate with 20 quantiles but label "yaklasik".
- Mobile: dots 6 px with 10 px spacing, numbers on tap.

### 4.4 Year-by-year replay strip (the 22-window heat strip)
```
Pencere (1. yil)  2001 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16 17 18 19 20 21 22
Oneri 1 verim   [|||||||||||||||||||||||| 22 cells, fill ramp = Ya/Ym 0..1, x for failed ]
Oneri 1 su acigi[...]
Su anki plan    [...]
```
- Each plan gets 1-3 rows of 22 cells (window = rotation start year), cell size >= 16 px on desktop; fill = yield ratio (sequential 5-step ramp, light = poor, dark = good) for the **worst** year of that 3-year window, with a **glyph** in failing windows (budget exceeded: a small X; frost loss: snowflake; heat: sun) so it is not colour only. Row label shows the failed share "5/22 donem" (the existing `budgetExceededShare`).
- Hover: year, the three crops, per-year yield and the reason code from `ConstraintCode` or the risk components (budget, low yield, frost, heat).
- Click a cell: highlights the same start year in all charts (the annual rain/ET0 chart gets that window's three years shaded: "bu donem neden basarisiz?").
- Data fields needed: per-window outputs from the engine: `windows.agYears` exists; add `PlanResult.byWindow: { agYear; yieldRatioMin; marginTL; unmetMm; flags[] }[]`. Today only distributions are returned, so this needs an engine change (the engine already replays every window, per `basis: "exact"`).
- A11y: the strip is a `role="table"` (rows plans, columns years), cells are `td` with text in `aria-label`; "Tablo" toggle shows numbers.
- Mobile: 22 cells at 12 px = 264 px, fits 390; labels above every 5th year; tap opens a bottom sheet with details.

### 4.5 Pareto frontier with direct labelling
- Replace letters-in-circles with: frontier drawn as a **step line**; dominated candidates as small light dots; chosen plans as larger markers with **direct text labels** ("Oneri 1: Arpa-Nadas-Macar") placed with a simple collision-avoiding label layout (e.g. d3-labeler logic or manual offsets); axis ends carry "az su ↑ / cok kar →" arrows and the top-left quadrant is shaded very lightly as "iyi bolge".
- Third variable (soil health) as marker fill intensity, or marker size, but also as a number in the label (position and number, not size alone).
- P10-P90 cross-hairs on selected plans only, to avoid clutter.
- A "kesfet" mode switches to parallel coordinates for the 73 candidates (brush axes; filter to those meeting constraints). This is an advanced view, collapsed by default.
- Move it out of "Daha fazla": it belongs next to the comparison.
- A11y: table fallback exists (`SimpleTable`); keep; add keyboard traversal between points via arrow keys.
- Mobile: height 340 -> 300, labels shown only for the 3 chosen plans, others on tap.

### 4.6 Nitrogen and soil-cover indicators
- **Azot (N) bridge**: for each crop-year a signed bar from `soilHealth.nContributionKgHa` (low/high) as a floating bar: legumes add (above zero), cereals/beet remove (below); the 3-year net is the highlighted segment with a textual conclusion "net +18 ile +42 kg N/ha". Legend: "Baklagil katkisi: literatur araligi" (it is an estimate, label as assumption via `confidence`).
- **Toprak ortusu**: a 36-month **cover strip** below the timeline: green-ish fill for crop cover, hatched amber for bare days, per-month cover class from `CoverType` (row, small_grain, close_legume, bare); a number "bos gun/yil: 94" next to a benchmark "<= 60 hedef" (a reference line is needed; the source of the benchmark must be labelled).
- Data: `SoilHealthResult.nContributionKgHa`, `bareDaysPerYear`, `CropDef.cover`, `calendar[].bareDaysAfter`.
- A11y: both include text values; hatch pattern for bare.
- Mobile: N bridge becomes a vertical list with inline bars.

### 4.7 Interactive builder (drag crops into years; live constraint violations)
```
 Urun paleti (chips: Bugday, Arpa, Nohut, Mercimek, Aycicegi, Seker pancari, Pamuk, Nadas ...)
 ┌ 1. yil ──────────┐ ┌ 2. yil ──────────┐ ┌ 3. yil ──────────┐
 │ [Arpa]           │ │ [ + surukle ]    │ │ [Macar figi]     │
 └──────────────────┘ └──────────────────┘ └──────────────────┘
 Zaman cizelgesi (4.1) canli onizleme ...
 ⚠ 2. yil Nohut: onceki urun ile ayni aile (max_consecutive)  [Neden?]
 ✓ GDD yeterli · ✓ Don penceresi acik · 94 bos gun
 [ Plani degerlendir ]
```
- Drag-and-drop with a pointer-based implementation (`dnd-kit` or plain pointer events), plus **click-to-place** (select chip, click slot) and **keyboard**: Tab to a slot, Enter opens a menu, arrow keys choose. Mobile: tap slot to open a bottom sheet of crops.
- **Live constraint feedback**: each time a slot changes, run the engine's constraint check (the engine exposes `ConstraintViolation {code, cropId, year, text}`; extract a cheap `checkRotation(seq, field, zone)` that does not replay the full 22 windows) and render: a red/amber **badge on the slot** with an icon and the Turkish sentence from `text.tr`; the offending slot gets a dashed outline; calendar conflicts draw the overlapping bar portion in a hatch on the timeline. Codes to surface: `excluded`, `max_consecutive`, `calendar_conflict` (sowing delayed by previous harvest), `gdd_insufficient`, `frost_window`, `not_candidate`.
- **Live preview**: the timeline (4.1) updates immediately; after 400 ms idle, call the exact evaluator for this one plan (the engine's single-plan path already used by `userPlans`) and show 3 key numbers with a spinner then values (water gap, margin, soil); the full comparison remains one click away.
- Constrained suggestions: slots show "oneri: Nadas yerine Nohut" when a violation has a known fix (swap the crop with one that satisfies the code); never auto-apply.
- Data fields: `CROPS` (family, calendar, agronomy), `ConstraintViolation`, `RotationSequence`, the engine's `evaluatePlan` result.
- A11y: aria-live region reads "2. yil: Nohut, uyari: ayni aile art arda", drop targets labelled; no drag-only operations; violations are text.
- Mobile: slots stack vertically as cards; crop chips scroll horizontally; the violation badge sits under the slot.

---

## 5. Colour, chart rules, number formats

### 5.1 Colour-blind-safe data palette
Base: Okabe-Ito (already partially in use). I fixed **semantics** so no hue means two things. Hex pairs are chosen for 3:1 non-text contrast against the app surfaces (dark `#0d1310`, light `#f4f1ea`). I did not run a Machado/Brettel simulation on this exact set; run the dataviz validator (or `colorjs.io` with deuteranopia/protanopia/tritanopia matrices) before merge, and keep redundant encodings (glyph, pattern, direct label) as the real safety net.

**Hydrology and climate (semantic: never reused)**

| Role | Dark bg | Light bg |
|---|---|---|
| Rain, water supply | `#56B4E9` | `#0072B2` |
| ET0, water demand | `#F08A4B` | `#AD4500` |
| Deficit (fill between), unmet | `#F08A4B` at 35 % + hatch | `#AD4500` at 25 % + hatch |
| Temperature, Tmax | `#F0B429` | `#8A6100` |
| Temperature, Tmin / frost | `#8FCFF5` | `#3A8FC4` |
| Root-zone moisture | `#2BB3A5` | `#00796B` |

**Crop families (rotation timeline, builder); fallow is neutral + hatch**

| Family | Dark | Light |
|---|---|---|
| Cereal (wheat, barley) | `#D9B44A` | `#8F6B00` |
| Legume (chickpea, lentil, vetch) | `#CC79A7` | `#9E3F78` |
| Beet / amaranth (sugar beet) | `#9D8DF1` | `#5645C4` |
| Oilseed / composite (sunflower) | `#A8C93A` | `#5A7A00` |
| Cotton / mallow | `#8BB1C6` | `#3B6A85` |
| Fallow / bare | `#8A9690` hatch | `#6B756F` hatch |

(Note the move of the wheat colour from `#E69F00` orange to gold, because orange is now only ET0.)

**Status (always paired with icon and word)**

| Role | Dark | Light |
|---|---|---|
| Good / within threshold | `#3CC79C` | `#00795A` |
| Caution | `#F0C040` | `#8A6100` |
| Bad / violation | `#FF7A66` | `#B3261E` |
| Neutral / reference lines | `#A9B7AE` | `#5B665F` |

**Sequential ramps (perceptually ordered by lightness)**
- NDVI (also the legend and phenology): dark mode, low to high: `#4A3A28, #8C6A3C, #D2B85A, #9ACD5E, #3FAE5A, #0E8A4B`; light mode, low to high: `#E7D9B8, #C9B26A, #A3C45E, #4FA95A, #1C7F48, #0B4D2C`. Brown means bare, green means vegetation. Mark the 0.2 "bos" threshold with a line.
- Yield ratio (heat strip), single-hue ramp: dark mode `#26333D, #3C6E8C, #56B4E9, #A8DCF5, #E3F5FF`; light mode `#EAF3F9, #A9D2EA, #56A4D3, #1F78B2, #0B4A78` (darker = better in light mode, lighter = better in dark mode so "stronger contrast = better" holds in both).
- Moisture percentile strip: dark `#7A5230, #B38B53, #D6D2C0, #6CB6BE, #2A8C9C`; light mirrors.

**Diverging (anomalies, change vs current):** dry `#D55E00` / `#AD4500` - neutral `#EDEDE6` / `#E6E3D8` - wet `#0072B2` / `#56B4E9`; centre at 0; legend with explicit zero.

**Neutrals:** dark text `#E6EDE8`, text-2 `#A9B7AE`, grid `#26332C`, axis `#4A5A51`, panel `#131B17`; light text `#14201A`, text-2 `#4D5B53`, grid `#DCD6C8`, axis `#8A8F85`, panel `#FBF9F4`.

### 5.2 Chart rules
1. **One chart type per question**: comparison of ordered values = dot/bar on a common baseline; trend over time = line; share-of-time/seasonal = heat strip; relationship = scatter; never pies, never 3D, never dual y axes except the climograph (documented convention: rain on the left axis, temperature on the right, with the **2 mm : 1 C** Walter ratio so rain sits under the temperature line when arid).
2. **Zero baseline for bars; free baseline for dots/lines** with the domain stated.
3. **Axes**: every axis has a label with the unit in parentheses (`mm`, `C`, `TL/da`, `m3/da`), tick labels at most 6, format by locale (5.3), ticks on "nice" values (reuse `niceTicks`), horizontal gridlines only, 0.5 px at 20 % contrast, the zero line at 1 px. No vertical gridlines unless a time axis needs them.
4. **Time axes** for seasons start on the crop-year (1 Oct) not 1 Jan when the topic is rotation; months in Turkish short forms (Oca Sub Mar Nis May Haz Tem Agu Eyl Eki Kas Ara).
5. **Direct labels over legends**: label lines at their right end, annotate the 2-3 notable points (driest year, current value); keep legends only for >4 series.
6. **Reference everywhere**: normal/mean line (neutral dashed, labelled "25 yil ort. 551 mm"), thresholds (agronomic bands, 0.2 NDVI), "su anki plan" baseline, "bugun" marker.
7. **Uncertainty**: always P10-P90 where a Dist exists; state the n ("22 donem") and what the interval is ("%80 aralik") once per chart.
8. **Annotate resolution** and **source** in a footer line per chart: `NASA POWER 0,5 x 0,625 derece, 2001-2025`.
9. **Not colour-only**: 3:1 contrast for marks, 4.5:1 for text; patterns for fallow/deficit/bare; markers differ in shape; every chart `role="img"` with a one-sentence `aria-label` summary and a **Tablo** toggle with units.
10. **Typography**: 12 px minimum in chart text (current `CHART_FONT = 12` is right), tabular figures for numerals, title as the finding ("Mayis-Eylul su acigi 650 mm") not the topic.
11. **Motion**: no entry animation; hover only emphasises (opacity); respect `prefers-reduced-motion`.
12. **Density**: max 5 charts above the fold; cards share a grid of 12 columns; no chart narrower than 280 px; on 390 px width switch bars to horizontal or reduce ticks, keep the same colour roles.

### 5.3 Turkish number and date formats
- Use `Intl.NumberFormat("tr-TR")`: decimal comma, thousands dot: `1.191` (mm), `0,009` (p-value), `37,57 N`. Tabular numerals; for 4-digit integers keep the thousands dot **but** never in years (`2001`, `useGrouping: false`) or coordinates.
- Because `1.191` reads as 1.191 in English, the EN locale must use `1,191`; ensure the format function is locale-driven and *every* chart (including SVG text) goes through the same `n()`; unit goes after a thin non-breaking space (`551 mm`, `%46` Turkish puts `%` before the number: `%46`; EN `46 %`).
- Areas: `51,3 da (5,13 ha)`; lengths: `850 m` below 1,000 m, otherwise `1,25 km`; elevation: `1.018 m`; slope `4,2 % (2,4 derece)`; temperature `1,7 C` with unit always (not `1,7 deg` alone); dates `9 Kas 2026`, ranges `5 Eki - 27 Haz`; percentile words not just numbers.
- Money: `1.016 TL/da`, no currency symbol on axes (put TL/da in the axis title).
- Coordinates: `37,5700 K, 32,7700 D` in Turkish UI, `37.5700 N, 32.7700 E` in EN; always 4 decimals max (11 m), and show them in the same order the user types.

---

## 6. Implementation order (smallest set that satisfies the owner's request)

**P0 (one sprint, delivers "select an area and see information, satellite")**
1. Rebuild `FieldMap` with EOX Sentinel-2 (default), Carto labels (dark/light), layer menu, scale bar, geocoder (Enter-only), coordinates box, GPS locate. Remove the Blue Marble mini-map from Genel in favour of the same map in read-only mode with the outline.
2. Polygon/rectangle/circle drawing with Geoman, geodesic area in da/ha via Turf, derived `areaDa`, undo/redo stack, GeoJSON import/export, saved fields list.
3. Field information panel cards 1-3 (summary, elevation/slope/aspect from Terrarium, soil column) with skeletons, resolution chips and the corrected elevation. Fix header "Rakim" to the DEM value.
4. Resolution-footprint overlay and provenance tiers.

**P1**
5. Time-enabled GIBS overlays with date slider and HLS empty-tile probing; NDVI/SMAP/IMERG legends.
6. Cards 4-9: chemistry bullet bars, moisture vs normal, climograph, GDD/frost, NDVI phenology with bare shading, irrigation by month.
7. Comparison small multiples, timeline with bare-soil and water ribbon, heat strip (needs `byWindow` from the engine).

**P2**
8. Drag-and-drop builder with live violations; Pareto restyle with step frontier; parallel-coordinates exploration mode; N bridge and cover strip.

**Engine/data additions requested (flag to the engine owner):** `PlanResult.byWindow[]`, `irrigationNetMmByMonth`, a cheap `checkRotation()`, exposure of constraint thresholds, frost-date distribution per year, SoilGrids depth layers (`phh2o`, `soc`, `cec`, `bdod`, `nitrogen`, with Q05/Q95), day-of-year percentile of GWETROOT.

---

## 7. Basis
Product patterns referenced from general familiarity, not from fresh web research in this session (I did not browse them): EO Browser/Copernicus Browser (time slider with cloud filter), NASA Worldview (layer picker, date animation, layer info with resolution), OneSoil (draw field, field list, NDVI date strip), Climate FieldView (field cards, imagery timeline), Google Earth Engine apps (drawing tools, side-panel charts of the geometry). Nominatim policy points are from memory of the OSMF policy; re-read it before shipping. Specs verified live in this session: EOX WMTS capabilities (layers and licences), NASA GIBS WMTS capabilities (layer ids, tile matrix sets, time dimensions), Nominatim usage policy, Open-Meteo elevation, AWS Terrarium decode.
