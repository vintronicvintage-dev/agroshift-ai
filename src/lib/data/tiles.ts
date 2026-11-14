// Tile source registry. Plain data, safe to import from client code (no Node APIs).
// Every entry below returned a real image from a live tile request (curl/fetch, 2026-11-13/14) at the stated zoom.
// GIBS dates/availability were read from the EPSG:3857 WMTS GetCapabilities <Dimension name=Time> (Default = latest).
// URL templates use Leaflet/XYZ placeholders {z}/{y}/{x}; {time} (YYYY-MM-DD) only for time-enabled layers.

export type TileKind = "base" | "data" | "overlay";

export interface TileSource {
  id: string;
  kind: TileKind;
  titleTr: string;
  titleEn: string;
  urlTemplate: string;
  /** WMTS tile matrix set the template resolves to (all are Web-Mercator, i.e. normal XYZ tiles). */
  tileMatrixSet: string;
  /** Highest zoom with real (non-upscaled) tiles. Leaflet: maxNativeZoom. Beyond it the server errors (GIBS) or upsamples. */
  maxNativeZoom: number;
  format: "jpg" | "png";
  timeEnabled: boolean;
  /** Date format of {time}, and the step of the series. */
  dateFormat?: "YYYY-MM-DD";
  period?: string; // ISO 8601 duration of the series (P1D daily, P16D 16-day composites)
  /** Latest date seen in GetCapabilities when this registry was built (older dates back to `firstDate`, with gaps). */
  defaultDate?: string;
  firstDate?: string;
  /** Days the latest available date lags behind "today" (use to compute a live default: today - latencyDays). */
  latencyDays?: number;
  legendUrl?: string;
  colourRampNote?: string;
  attributionHtml: string;
  licenceNote: string;
  notes?: string;
}

const GIBS = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
const GIBS_ATTR =
  'Imagery <a href="https://earthdata.nasa.gov/gibs">NASA EOSDIS GIBS</a>/ESDIS (NASA Worldview)';
const GIBS_LICENCE = "NASA open data policy: freely usable, no restrictions; acknowledge NASA EOSDIS GIBS/ESDIS. NASA does not endorse non-US-government entities or derived products.";
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const LEGENDS = "https://gibs.earthdata.nasa.gov/legends";

const gibs = (layer: string, tms: string, ext: "jpg" | "png", timed: boolean) =>
  `${GIBS}/${layer}/default/${timed ? "{time}/" : ""}${tms}/{z}/{y}/{x}.${ext}`;

export const TILE_SOURCES: TileSource[] = [
  // ---------- high-resolution base imagery & maps (Turkey deep zoom up to z19/z20) ----------
  {
    id: "esri-world-imagery",
    kind: "base",
    titleTr: "Yüksek Çözünürlüklü Uydu (Esri / Maxar ~0,3 m)",
    titleEn: "High-Resolution Satellite (Esri / Maxar ~0.3 m)",
    urlTemplate: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    tileMatrixSet: "GoogleMapsCompatible_Level18",
    maxNativeZoom: 18,
    format: "jpg",
    timeEnabled: false,
    attributionHtml:
      'Tiles &copy; <a href="https://www.esri.com">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community',
    licenceNote:
      "Esri Master License Agreement (free for non-commercial / academic / evaluation & public web mapping with attribution). Verified native z18 (~0.3–0.6 m pixels) across all 5 Turkey pilot sites; scales cleanly to z20.",
    notes: "Over rural Turkey z18 serves full sub-meter Maxar imagery (12–28 KB JPEG); z19 returns a 2521 B placeholder, so maxNativeZoom is locked to 18 and Leaflet scales sharply up to z20.",
  },
  {
    id: "carto-voyager",
    kind: "base",
    titleTr: "Türkiye Detaylı Yol ve Yerleşim Haritası (OSM Retina)",
    titleEn: "Turkey Detailed Street & Settlement Map (OSM Retina)",
    urlTemplate: "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
    tileMatrixSet: "GoogleMapsCompatible_Level19",
    maxNativeZoom: 19,
    format: "png",
    timeEnabled: false,
    attributionHtml: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    licenceNote: "Data ODbL 1.0 (OpenStreetMap), tiles CC BY 4.0 CARTO. Native Retina (@2x) tiles up to zoom 19 across all 81 provinces and villages of Turkey.",
  },
  {
    id: "opentopomap",
    kind: "base",
    titleTr: "Türkiye Topografik ve Eşyükselti Haritası (SRTM Kontur)",
    titleEn: "Turkey Topographic & Contour Map (SRTM Contours)",
    urlTemplate: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    tileMatrixSet: "GoogleMapsCompatible_Level17",
    maxNativeZoom: 17,
    format: "png",
    timeEnabled: false,
    attributionHtml: `Map data: ${OSM_ATTR}, SRTM | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)`,
    licenceNote: "CC-BY-SA 3.0 OpenTopoMap (derived from OpenStreetMap and NASA SRTM contour lines). Native up to zoom 17.",
  },
  // ---------- scientific & historical base imagery ----------
  {
    id: "eox-s2cloudless-2017",
    kind: "base",
    titleTr: "Sentinel-2 bulutsuz mozaik (2017, 10 m)",
    titleEn: "Sentinel-2 cloudless mosaic (2017, 10 m)",
    urlTemplate: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2017_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
    tileMatrixSet: "GoogleMapsCompatible",
    maxNativeZoom: 14,
    format: "jpg",
    timeEnabled: false,
    attributionHtml:
      '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2017)',
    licenceNote:
      "CC BY 4.0 (the 2017 layer is the only EOX cloudless year under CC BY; 2018 and later are CC BY-NC-SA 4.0). Attribution text above must be shown. Only HTTPS works (HTTP redirects).",
    notes: "~10 m pixels = zoom 14 native; tiles still return at z15-17 but are upsampled (JPEG size shrinks), so use maxNativeZoom 14.",
  },
  {
    id: "eox-s2cloudless-2024",
    kind: "base",
    titleTr: "Sentinel-2 bulutsuz mozaik (2024, yalnız ticari olmayan)",
    titleEn: "Sentinel-2 cloudless mosaic (2024, non-commercial only)",
    urlTemplate: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.jpg",
    tileMatrixSet: "GoogleMapsCompatible",
    maxNativeZoom: 14,
    format: "jpg",
    timeEnabled: false,
    attributionHtml:
      '<a href="https://s2maps.eu">Sentinel-2 cloudless</a> by <a href="https://eox.at">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data 2024)',
    licenceNote:
      "CC BY-NC-SA 4.0: non-commercial use only, share-alike. Fine for a hackathon demo; commercial use needs an EOX licence (https://cloudless.eox.at).",
  },
  {
    id: "gibs-hls-s30",
    kind: "base",
    titleTr: "HLS Sentinel-2 gerçek renk (30 m)",
    titleEn: "HLS Sentinel-2 true colour (30 m)",
    urlTemplate: gibs("HLS_S30_Nadir_BRDF_Adjusted_Reflectance", "GoogleMapsCompatible_Level12", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level12",
    maxNativeZoom: 12,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-05",
    firstDate: "2015-11-28",
    latencyDays: 8,
    attributionHtml: GIBS_ATTR + " (NASA/USGS Harmonized Landsat Sentinel-2)",
    licenceNote: GIBS_LICENCE,
    notes: "Orbit swaths: a given date covers only part of the world (~5-day revisit), transparent tiles where there is no scene; try neighbouring dates. z13 returns HTTP 400.",
  },
  {
    id: "gibs-hls-l30",
    kind: "base",
    titleTr: "HLS Landsat 8/9 gerçek renk (30 m)",
    titleEn: "HLS Landsat 8/9 true colour (30 m)",
    urlTemplate: gibs("HLS_L30_Nadir_BRDF_Adjusted_Reflectance", "GoogleMapsCompatible_Level12", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level12",
    maxNativeZoom: 12,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-02",
    firstDate: "2013-03-22",
    latencyDays: 8,
    attributionHtml: GIBS_ATTR + " (NASA/USGS Harmonized Landsat Sentinel-2)",
    licenceNote: GIBS_LICENCE,
    notes: "Swath-limited (16-day revisit; capabilities latest is 2026-11-05 but that date is an empty tile over Konya, so the default is 2026-11-02, which has imagery there; verified imagery also on 2026-10-25). Occasional HTTP 500 on single tiles.",
  },
  {
    id: "gibs-modis-terra-truecolor",
    kind: "base",
    titleTr: "MODIS Terra gerçek renk (günlük)",
    titleEn: "MODIS Terra true colour (daily)",
    urlTemplate: gibs("MODIS_Terra_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9", "jpg", true),
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "jpg",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-13",
    firstDate: "2000-02-24",
    latencyDays: 1,
    attributionHtml: GIBS_ATTR + " (MODIS Terra Corrected Reflectance)",
    licenceNote: GIBS_LICENCE,
    notes: "GetCapabilities lists tomorrow's date as Default, but its tiles are blank placeholders; use today - 1 day.",
  },
  {
    id: "gibs-viirs-noaa20-truecolor",
    kind: "base",
    titleTr: "VIIRS NOAA-20 gerçek renk (günlük)",
    titleEn: "VIIRS NOAA-20 true colour (daily)",
    urlTemplate: gibs("VIIRS_NOAA20_CorrectedReflectance_TrueColor", "GoogleMapsCompatible_Level9", "jpg", true),
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "jpg",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-13",
    firstDate: "2018-01-05",
    latencyDays: 1,
    attributionHtml: GIBS_ATTR + " (VIIRS NOAA-20 Corrected Reflectance)",
    licenceNote: GIBS_LICENCE,
  },
  {
    id: "gibs-bluemarble",
    kind: "base",
    titleTr: "Blue Marble (MODIS, durağan)",
    titleEn: "Blue Marble (MODIS, static)",
    urlTemplate: gibs("BlueMarble_NextGeneration", "GoogleMapsCompatible_Level8", "jpg", false),
    tileMatrixSet: "GoogleMapsCompatible_Level8",
    maxNativeZoom: 8,
    format: "jpg",
    timeEnabled: false,
    attributionHtml: GIBS_ATTR + " (Blue Marble: Next Generation)",
    licenceNote: GIBS_LICENCE,
  },
  {
    id: "gibs-srtm-color",
    kind: "base",
    titleTr: "SRTM sayısal yükselti modeli (renk skalası)",
    titleEn: "SRTM digital elevation model (colour index)",
    urlTemplate: gibs("SRTM_Color_Index", "GoogleMapsCompatible_Level12", "png", false),
    tileMatrixSet: "GoogleMapsCompatible_Level12",
    maxNativeZoom: 12,
    format: "png",
    timeEnabled: false,
    legendUrl: `${LEGENDS}/SRTM_Color_Index_H.svg`,
    colourRampNote: "Hypsometric colour ramp (green lowlands to brown/white highlands); see legend.",
    attributionHtml: GIBS_ATTR + " (NASA SRTM)",
    licenceNote: GIBS_LICENCE,
  },
  {
    id: "gibs-aster-relief",
    kind: "base",
    titleTr: "ASTER GDEM renkli gölgeli kabartma (30 m)",
    titleEn: "ASTER GDEM colour shaded relief (30 m)",
    urlTemplate: gibs("ASTER_GDEM_Color_Shaded_Relief", "GoogleMapsCompatible_Level12", "jpg", false),
    tileMatrixSet: "GoogleMapsCompatible_Level12",
    maxNativeZoom: 12,
    format: "jpg",
    timeEnabled: false,
    attributionHtml: GIBS_ATTR + " (ASTER GDEM, NASA/METI)",
    licenceNote: GIBS_LICENCE + " ASTER GDEM is jointly NASA/METI; free to use.",
    notes: "This is ASTER, not SRTM; it is the only shaded-relief (hillshade) layer GIBS serves at this resolution.",
  },
  // ---------- NASA data layers ----------
  {
    id: "gibs-modis-ndvi-16day",
    kind: "data",
    titleTr: "MODIS Terra NDVI (16 günlük)",
    titleEn: "MODIS Terra NDVI (16-day)",
    urlTemplate: gibs("MODIS_Terra_L3_NDVI_16Day", "GoogleMapsCompatible_Level9", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P16D",
    defaultDate: "2026-10-16",
    firstDate: "2000-03-05",
    latencyDays: 30,
    legendUrl: `${LEGENDS}/MODIS_L3_NDVI_H.svg`,
    colourRampNote: "Brown (bare/low NDVI) to dark green (dense vegetation); see legend.",
    attributionHtml: GIBS_ATTR + " (MODIS Terra MOD13 NDVI)",
    licenceNote: GIBS_LICENCE,
    notes: "Dates must be 16-day composite start dates (e.g. 2026-10-16, 2026-10-01 ...), not arbitrary days.",
  },
  {
    id: "gibs-modis-ndvi-8day",
    kind: "data",
    titleTr: "MODIS Terra NDVI (8 günlük, kayan)",
    titleEn: "MODIS Terra NDVI (rolling 8-day)",
    urlTemplate: gibs("MODIS_Terra_NDVI_8Day", "GoogleMapsCompatible_Level9", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-12",
    firstDate: "2025-02-12",
    latencyDays: 2,
    legendUrl: `${LEGENDS}/MODIS_NDVI_H.svg`,
    colourRampNote: "Brown to dark green; see legend.",
    attributionHtml: GIBS_ATTR + " (MODIS Terra NDVI, 8-day rolling)",
    licenceNote: GIBS_LICENCE,
    notes: "Series starts 2025-02-12 (older dates have no tiles).",
  },
  {
    id: "gibs-smap-l4-surface-sm",
    kind: "data",
    titleTr: "SMAP L4 yüzey toprak nemi (model destekli)",
    titleEn: "SMAP L4 surface soil moisture (model-assimilated)",
    urlTemplate: gibs("SMAP_L4_Analyzed_Surface_Soil_Moisture", "GoogleMapsCompatible_Level6", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-10",
    firstDate: "2015-03-31",
    latencyDays: 4,
    legendUrl: `${LEGENDS}/SMAP_Analyzed_Soil_Moisture_H.svg`,
    colourRampNote: "m3/m3 volumetric soil moisture, dry (brown) to wet (blue); see legend. Gap-free model product (9 km).",
    attributionHtml: GIBS_ATTR + " (NASA SMAP L4)",
    licenceNote: GIBS_LICENCE,
    notes: "Some dates are missing (e.g. 2025-10-10 to 2025-12-11); z7 returns HTTP 400.",
  },
  {
    id: "gibs-smap-l3-passive-sm",
    kind: "data",
    titleTr: "SMAP L3 toprak nemi (pasif radyometre, gündüz)",
    titleEn: "SMAP L3 soil moisture (passive radiometer, day)",
    urlTemplate: gibs("SMAP_L3_Passive_Enhanced_Day_Soil_Moisture", "GoogleMapsCompatible_Level6", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-10",
    firstDate: "2015-03-31",
    latencyDays: 4,
    legendUrl: `${LEGENDS}/SMAP_Soil_Moisture_H.svg`,
    colourRampNote: "m3/m3, see legend. Observed swaths only: gaps between orbits and over frozen/dense-vegetation areas.",
    attributionHtml: GIBS_ATTR + " (NASA SMAP L3)",
    licenceNote: GIBS_LICENCE,
  },
  {
    id: "gibs-imerg-precip",
    kind: "data",
    titleTr: "IMERG yağış hızı (GPM)",
    titleEn: "IMERG precipitation rate (GPM)",
    urlTemplate: gibs("IMERG_Precipitation_Rate", "GoogleMapsCompatible_Level6", "png", true),
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    format: "png",
    timeEnabled: true,
    dateFormat: "YYYY-MM-DD",
    period: "P1D",
    defaultDate: "2026-11-12",
    firstDate: "2000-06-01",
    latencyDays: 2,
    legendUrl: `${LEGENDS}/GPM_Precipitation_Rate_H.svg`,
    colourRampNote: "mm/hr, light blue (drizzle) to red/purple (heavy rain); transparent where dry; see legend.",
    attributionHtml: GIBS_ATTR + " (NASA GPM IMERG)",
    licenceNote: GIBS_LICENCE,
    notes: "Image layer only; numeric IMERG needs Earthdata credentials and is not used.",
  },
  // ---------- overlays ----------
  {
    id: "carto-voyager-labels",
    kind: "overlay",
    titleTr: "Türkiye İl, İlçe, Köy ve Ova Adları (OSM Retina, z19)",
    titleEn: "Turkey Province, District & Village Labels (OSM Retina, z19)",
    urlTemplate: "https://a.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}@2x.png",
    tileMatrixSet: "GoogleMapsCompatible_Level19",
    maxNativeZoom: 19,
    format: "png",
    timeEnabled: false,
    attributionHtml: `${OSM_ATTR} &copy; <a href="https://carto.com/attributions">CARTO</a>`,
    licenceNote: "OpenStreetMap ODbL 1.0, CARTO CC BY 4.0. Crisp @2x transparent PNG labels from zoom 4 to zoom 19.",
  },
  {
    id: "esri-world-transportation",
    kind: "overlay",
    titleTr: "Türkiye Karayolu ve Tarla Bağlantı Yolları (Esri/OSM, z19)",
    titleEn: "Turkey Roads & Rural Access Network (Esri/OSM, z19)",
    urlTemplate: "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
    tileMatrixSet: "GoogleMapsCompatible_Level19",
    maxNativeZoom: 19,
    format: "png",
    timeEnabled: false,
    attributionHtml: 'Roads &copy; <a href="https://www.esri.com">Esri</a>, HERE, Garmin, OpenStreetMap contributors',
    licenceNote: "Esri Reference Overlay; verified up to z19 over rural Turkey.",
  },
  {
    id: "gibs-osm-labels",
    kind: "overlay",
    titleTr: "Yer adları (OSM, GIBS)",
    titleEn: "Place labels (OSM via GIBS)",
    urlTemplate: gibs("Reference_Labels_15m", "GoogleMapsCompatible_Level13", "png", false),
    tileMatrixSet: "GoogleMapsCompatible_Level13",
    maxNativeZoom: 13,
    format: "png",
    timeEnabled: false,
    attributionHtml: `${OSM_ATTR}; labels via ${GIBS_ATTR}`,
    licenceNote: "OpenStreetMap data is ODbL 1.0: the attribution above is required. GIBS reference layers are free to use.",
    notes: "Transparent PNG, draw above imagery. Single tiles occasionally answer HTTP 500: retry. Lower-detail alternative: Reference_Labels (max z9).",
  },
  {
    id: "eox-streets",
    kind: "overlay",
    titleTr: "Yollar (OSM, EOX)",
    titleEn: "Roads (OSM, EOX)",
    urlTemplate: "https://tiles.maps.eox.at/wmts/1.0.0/streets_3857/default/GoogleMapsCompatible/{z}/{y}/{x}.png",
    tileMatrixSet: "GoogleMapsCompatible",
    maxNativeZoom: 13,
    format: "png",
    timeEnabled: false,
    attributionHtml: `Streets overlay { Data ${OSM_ATTR}, Rendering &copy; <a href="https://eox.at">EOX</a> and <a href="https://github.com/mapserver/basemaps">MapServer</a> }`,
    licenceNote: "Data ODbL 1.0 (OpenStreetMap); EOX requires its attribution to be shown. Verified z13; transparent at low zoom (roads appear from about z11).",
  },
];

export function tileSourceById(id: string): TileSource | undefined {
  return TILE_SOURCES.find((t) => t.id === id);
}

/** Resolve {time}/{z}/{y}/{x}. For time-enabled layers a date (YYYY-MM-DD) is required. */
export function resolveTileUrl(src: TileSource, z: number, x: number, y: number, date?: string): string {
  const d = date ?? src.defaultDate ?? "";
  return src.urlTemplate.replace("{time}", d).replace("{z}", String(z)).replace("{y}", String(y)).replace("{x}", String(x));
}

/** Live default date for a time-enabled source: `today - latencyDays` (UTC), never earlier than the series start. */
export function liveDefaultDate(src: TileSource, now = new Date()): string | undefined {
  if (!src.timeEnabled) return undefined;
  const d = new Date(now.getTime() - (src.latencyDays ?? 1) * 86_400_000).toISOString().slice(0, 10);
  if (src.period === "P16D") return src.defaultDate; // composite grid: use the verified latest composite start
  return src.firstDate && d < src.firstDate ? src.firstDate : d;
}
