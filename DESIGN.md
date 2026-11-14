<!-- impeccable:design-schema 1 -->

# AgroShift — Design System ("Anatolian Agronomic Command Center")

## 1. Visual Direction & Philosophy
AgroShift combines **Anatolian field warmth** with **scientific satellite precision**:
- **Primary Canvas (`--bg: #f3f6ef`):** Warm Sunlit Ivory, reducing outdoor glare while framing white Bento data cards (`--surface: #ffffff`) with crisp 1px borders (`--line: #dce4d6`) and subtle botanical-tinted diffusion shadows (`--card-shadow`).
- **Navigation Rail (`--sidebar-bg: #14361d` → `--sidebar-surface: #1d4928`):** Deep Botanical Forest Green persistent left sidebar (`252px` on desktop, slide-over drawer + bottom bar on mobile) with active emerald pills (`#2e7d32`).
- **Signal & Action (`--accent: #1e6b34`, `--accent-ink: #1b5e20`):** Forest Emerald for primary actions, suitability bars, and parcel boundary highlights.
- **Full Dark Mode (`:root[data-theme="dark"]`):** Deep nocturnal forest (`#0b130e` canvas, `#121f17` cards, `#6ee787` luminous emerald accents) accessible via a single click in the header.

## 2. Typography & Numeric Hierarchy
- **Display & Headings (`--font-archivo`):** Condensed geometric grotesk (`wdth 88`, weight `600`, tracking `-0.015em`) for page titles, card headers, and crop names.
- **Data Numerals (`.numeral`):** Tabular lining numerals (`font-variant-numeric: tabular-nums lining-nums`, `wdth 82`) so multi-row KPIs, yield ratios, and gross margins align vertically without jitter.
- **UI Body (`--font-instrument`):** Clean, legible sans-serif (`15px` desktop, `16px` mobile) for agronomic explanations and controls.
- **Sensor Readouts (`--font-geist-mono`):** Monospace (`11px–12px`) reserved strictly for WGS84 coordinates, spatial resolutions (`~0,3 m/px`), date ranges (`2001–2024`), and dataset identifiers (`POWER`, `MODIS`, `SMAP`, `SRTM`, `SoilGrids`).

## 3. Layout Architecture (Bento Command Center)
1. **Collapsible Hero Banner:** Asymmetric split header introducing the 5 scientific pillars (`NASA Uydu Verileri`, `Akıllı Ürün Önerileri`, `3 Yıllık Rotasyon`, `Verim & Kârlılık Analizi`, `Risk Simülasyonları`).
2. **Row 1 — 5 KPI Summary Cards:** `Arazi Alanı` (geodesic dekar/ha), `Mevcut Ürün` (interactive inline crop selector), `Su Kaynağı` (live irrigation budget & efficiency), `Toprak Tipi` (USDA texture from SoilGrids 250m), `Mevcut Verim & İklim Trendi` (24-year NASA POWER series).
3. **Row 2 — Asymmetric Map (`63%`) + Mevcut Durum Özeti (`37%`):**
   - **Deep-Zoom Turkey Map (`maxZoom: 20`):** Defaults to Esri World Imagery (`z18` native ~0.3m Maxar aerial/satellite scaled cleanly to `z20`) with Retina place labels (`Carto Voyager @2x`) and rural road networks (`Esri World Transportation`), plus instant switching to `Türkiye Sokak/Köy`, `Topografik (SRTM)`, and `Sentinel-2`.
   - **Floating NASA Satellite Layers Checklist:** On-map overlay toggles for `NDVI (MODIS)`, `Toprak Nemi (SMAP)`, `Yağış (IMERG)`, `Yüzey Yükselti (SRTM)`, `İl/İlçe/Köy & Yollar`, and `Uydu Piksel Hücreleri`.
   - **Mevcut Durum Özeti:** Live `Toprak Sağlığı (/100)`, `Toprak Nemi (%)`, `Bitki Sağlığı (NDVI)`, `Ortalama Sıcaklık (°C)`, `Yıllık / 30G Yağış (mm)`, and active `Veri Kaynakları` card.
4. **Row 3 — 3-Column Bento Grid:**
   - **Akıllı Ürün Önerileri:** Top 3 suitability-ranked crops (`%XX`) with custom botanical monoline glyphs (`CropArt`).
   - **Üç Yıllık Ürün Rotasyon Planı:** `1. Yıl` → `2. Yıl` → `3. Yıl` visual sequence + 3 impact pills (`Toprak verimliliği`, `Su kullanımı`, `Uzun vadeli kârlılık`).
   - **Verim ve Kârlılık Analizi:** Dual-axis SVG combo chart (green bars for expected yield `ton/dönüm` + orange line for gross margin `TL/dönüm`).
5. **Row 4 — 2-Column Risk & XAI Split:**
   - **Risk Simülasyonları:** Interactive scenario table (`Kuraklık`, `Sıcaklık Artışı +2 °C`, `Elverişli Yağış P90`, `Piyasa Fiyatı Düşüşü -%20`) + horizontal bar chart of 3-year total parcel earnings (`TL`).
   - **Açıklanabilir Karar Dayanağı (XAI):** Engine-generated agronomic rationale bullets with direct link to `/dayanak`.
6. **Row 5 — Expandable Deep Sensor Diagnostics:** Full 11-card scientific inspection drawer (`FieldPanel`).

## 4. Guardrails & Anti-Bloat Rules
- **100% Real Data:** Every number in every card is derived live from `useFieldData()`, `climateEvidence()`, `moistureNow()`, and the FAO-56 / TOPSIS Web Worker engine.
- **Zero Emojis:** All iconography uses bespoke 24×24 monoline SVG paths (`src/components/ui/Icons.tsx`) and botanical crop glyphs (`src/components/brand/CropGlyph.tsx`).
