/**
 * AgroShift AI — Geospatial Processing, Polygon/MultiPolygon Validation,
 * WGS84 Equal-Area Projection Math, and Sensor Footprint Adequacy Engine.
 */

import {
  bbox,
  centroid,
  GeometryError,
  isSelfIntersecting,
  MAX_AREA_HA,
  MAX_VERTICES,
  MIN_AREA_HA,
  ringAreaM2,
  ringPerimeterM,
  type Ring,
} from "@/lib/data/geometry";
import type { LonLat } from "@/lib/data/fieldTypes";
import type { GeoJsonPolygonOrMulti, SpatialResolutionCheck } from "./types";

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

export interface ValidatedParcelGeometry {
  geometry: GeoJsonPolygonOrMulti;
  crsEpsg: 4326;
  rings: Ring[];
  areaM2: number;
  areaDa: number;
  areaHa: number;
  perimeterM: number;
  centroid: { lat: number; lon: number };
  bbox: [number, number, number, number];
  isValid: boolean;
  validationNotes: string[];
  spatialChecks: SpatialResolutionCheck[];
}

function parseSingleOuterRing(rawRing: unknown, partIndex = 0): Ring {
  if (!Array.isArray(rawRing)) {
    throw new GeometryError(`Malformed polygon ring at part ${partIndex}`);
  }
  if (rawRing.length > MAX_VERTICES + 1) {
    throw new GeometryError(`Polygon ring at part ${partIndex} exceeds maximum of ${MAX_VERTICES} vertices`);
  }
  const ring: Ring = [];
  for (const pt of rawRing) {
    if (
      !Array.isArray(pt) ||
      pt.length < 2 ||
      typeof pt[0] !== "number" ||
      typeof pt[1] !== "number" ||
      !Number.isFinite(pt[0]) ||
      !Number.isFinite(pt[1])
    ) {
      throw new GeometryError("Every coordinate must be finite [lon, lat] numbers in WGS84 (EPSG:4326)");
    }
    const [lon, lat] = pt;
    if (lon < -180 || lon > 180) throw new GeometryError(`Longitude ${lon} out of bounds [-180, 180]`);
    if (lat < -90 || lat > 90) throw new GeometryError(`Latitude ${lat} out of bounds [-90, 90]`);
    ring.push({ lon, lat });
  }
  if (
    ring.length > 1 &&
    ring[0].lon === ring[ring.length - 1].lon &&
    ring[0].lat === ring[ring.length - 1].lat
  ) {
    ring.pop();
  }
  if (ring.length < 3) {
    throw new GeometryError(`Polygon ring at part ${partIndex} needs at least 3 distinct vertices`);
  }
  if (isSelfIntersecting(ring)) {
    throw new GeometryError(`Polygon ring at part ${partIndex} has self-intersecting edges`);
  }
  return ring;
}

/**
 * Evaluates spatial resolution adequacy between a parcel's surface area (ha) and
 * each satellite/gridded product's native pixel footprint.
 */
export function evaluateSpatialResolutionAdequacy(parcelAreaHa: number): SpatialResolutionCheck[] {
  const products: {
    sourceId: string;
    productName: string;
    pixelSizeM: number;
  }[] = [
    { sourceId: "nasa_srtm_dem", productName: "NASA SRTM v3.0 DEM (30 m)", pixelSizeM: 30 },
    { sourceId: "nasa_modis_mod13q1", productName: "NASA MODIS MOD13Q1 NDVI/EVI (250 m)", pixelSizeM: 250 },
    { sourceId: "isric_soilgrids_v2", productName: "ISRIC SoilGrids v2.0 (250 m)", pixelSizeM: 250 },
    { sourceId: "nasa_smap_l4", productName: "NASA SMAP L4 Soil Moisture (9 km)", pixelSizeM: 9000 },
    { sourceId: "nasa_gpm_imerg", productName: "NASA GPM IMERG V07B (10 km)", pixelSizeM: 10000 },
    { sourceId: "nasa_nex_gddp_cmip6", productName: "NASA NEX-GDDP-CMIP6 (25 km)", pixelSizeM: 25000 },
    { sourceId: "nasa_power_daily", productName: "NASA POWER MERRA-2 Daily (50 km)", pixelSizeM: 50000 },
  ];

  const effAreaHa = Math.max(0.1, parcelAreaHa);

  return products.map((p) => {
    const pixelAreaHa = round((p.pixelSizeM * p.pixelSizeM) / 10_000, 4);
    const ratio = round(effAreaHa / pixelAreaHa, 6);

    let adequacy: SpatialResolutionCheck["adequacy"];
    let warningTr: string;
    let warningEn: string;

    if (ratio >= 1.0) {
      adequacy = "parcel_resolved";
      warningTr = `Parsel alanı (${effAreaHa} ha), ${p.productName} piksel alanını (${pixelAreaHa} ha) tam olarak kapsar (${round(ratio, 1)} piksel).`;
      warningEn = `Parcel area (${effAreaHa} ha) encompasses ${round(ratio, 1)} native pixels of ${p.productName} (${pixelAreaHa} ha/pixel).`;
    } else if (ratio >= 0.15) {
      adequacy = "sub_parcel_composite";
      warningTr = `Parsel alanı (${effAreaHa} ha), tek bir ${p.productName} pikselinin (${pixelAreaHa} ha) %${round(ratio * 100, 1)}'ini oluşturur; komşu parsellerle kısmi karışık piksel (mixed-pixel) etkisi dikkate alınmalıdır.`;
      warningEn = `Parcel area (${effAreaHa} ha) covers ${round(ratio * 100, 1)}% of one ${p.productName} pixel (${pixelAreaHa} ha); partial mixed-pixel boundary effects may occur.`;
    } else {
      adequacy = "regional_grid_proxy";
      warningTr = `BİLİMSEL ÖLÇEK UYARISI: ${p.productName} çözünürlüğü ${p.pixelSizeM} m (${pixelAreaHa} ha / piksel) olup parsel düzeyinde doğrudan sensör ölçümü DEĞİLDİR; bölgesel atmosferik/hidrolojik sınır koşulu olarak kullanılır.`;
      warningEn = `SCIENTIFIC SCALE NOTICE: ${p.productName} resolution is ${p.pixelSizeM} m (${pixelAreaHa} ha/pixel) and MUST NOT be treated as a parcel-scale sensor; used as regional boundary forcing.`;
    }

    return {
      sourceId: p.sourceId,
      productName: p.productName,
      pixelSizeM: p.pixelSizeM,
      pixelAreaHa,
      parcelAreaHa: effAreaHa,
      parcelToPixelRatio: ratio,
      adequacy,
      warningTr,
      warningEn,
    };
  });
}

/**
 * Validates and normalizes a GeoJSON Polygon or MultiPolygon (or Feature wrapper)
 * in WGS84 (EPSG:4326), computing equal-area ellipsoidal surface area and spatial checks.
 */
export function validateAndNormalizeParcelGeometry(input: unknown): ValidatedParcelGeometry {
  let g = input as { type?: string; geometry?: unknown; coordinates?: unknown } | null;
  if (g && g.type === "Feature" && g.geometry) {
    g = g.geometry as typeof g;
  }
  if (!g || (g.type !== "Polygon" && g.type !== "MultiPolygon") || !Array.isArray(g.coordinates)) {
    throw new GeometryError("Geometry must be a GeoJSON Polygon or MultiPolygon in WGS84 (EPSG:4326)");
  }

  const notes: string[] = [];
  const rings: Ring[] = [];

  if (g.type === "Polygon") {
    const polyRings = g.coordinates as unknown[];
    if (polyRings.length < 1) throw new GeometryError("Polygon must contain an outer ring");
    if (polyRings.length > 1) {
      notes.push("Inner hole rings ignored; outer boundary ring normalized.");
    }
    rings.push(parseSingleOuterRing(polyRings[0], 0));
  } else {
    const multiPolys = g.coordinates as unknown[];
    if (multiPolys.length < 1) throw new GeometryError("MultiPolygon must contain at least one Polygon");
    multiPolys.forEach((poly, idx) => {
      if (!Array.isArray(poly) || poly.length < 1) {
        throw new GeometryError(`Malformed MultiPolygon member at index ${idx}`);
      }
      rings.push(parseSingleOuterRing(poly[0], idx));
    });
    notes.push(`MultiPolygon with ${rings.length} disjunct parcel rings normalized to WGS84 (EPSG:4326).`);
  }

  let totalAreaM2 = 0;
  let totalPerimeterM = 0;
  let weightedLat = 0;
  let weightedLon = 0;
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const r of rings) {
    const a = ringAreaM2(r);
    const p = ringPerimeterM(r);
    const c = centroid(r);
    const [bMinLon, bMinLat, bMaxLon, bMaxLat] = bbox(r);
    totalAreaM2 += a;
    totalPerimeterM += p;
    weightedLat += c.lat * a;
    weightedLon += c.lon * a;
    minLon = Math.min(minLon, bMinLon);
    minLat = Math.min(minLat, bMinLat);
    maxLon = Math.max(maxLon, bMaxLon);
    maxLat = Math.max(maxLat, bMaxLat);
  }

  const areaHa = round(totalAreaM2 / 10_000, 4);
  const areaDa = round(totalAreaM2 / 1000, 3);
  if (areaHa < MIN_AREA_HA) {
    throw new GeometryError(`Parcel area ${areaHa} ha is below minimum ${MIN_AREA_HA} ha`);
  }
  if (areaHa > MAX_AREA_HA) {
    throw new GeometryError(`Parcel area ${areaHa} ha exceeds maximum ${MAX_AREA_HA} ha`);
  }

  const finalCentroid: LonLat =
    totalAreaM2 > 0
      ? { lat: round(weightedLat / totalAreaM2, 6), lon: round(weightedLon / totalAreaM2, 6) }
      : { lat: round((minLat + maxLat) / 2, 6), lon: round((minLon + maxLon) / 2, 6) };

  const closedRingCoords = (r: Ring) => [...r.map((pt) => [round(pt.lon, 6), round(pt.lat, 6)]), [round(r[0].lon, 6), round(r[0].lat, 6)]];

  const normalizedGeoJson: GeoJsonPolygonOrMulti =
    rings.length === 1
      ? { type: "Polygon", coordinates: [closedRingCoords(rings[0])] }
      : { type: "MultiPolygon", coordinates: rings.map((r) => [closedRingCoords(r)]) };

  return {
    geometry: normalizedGeoJson,
    crsEpsg: 4326,
    rings,
    areaM2: round(totalAreaM2, 1),
    areaDa,
    areaHa,
    perimeterM: round(totalPerimeterM, 1),
    centroid: finalCentroid,
    bbox: [round(minLon, 6), round(minLat, 6), round(maxLon, 6), round(maxLat, 6)],
    isValid: true,
    validationNotes: notes,
    spatialChecks: evaluateSpatialResolutionAdequacy(areaHa),
  };
}

/**
 * Generates a canonical 300-decare (30 ha, ~548m x 548m) WGS84 parcel polygon centered on (lat, lon)
 * for pilot sites when a user has not yet drawn a custom boundary.
 */
export function buildDefaultParcelPolygon(lat: number, lon: number, areaDa = 300): GeoJsonPolygonOrMulti {
  const areaM2 = areaDa * 1000;
  const sideM = Math.sqrt(areaM2);
  const halfM = sideM / 2;
  const dLat = halfM / 111_132;
  const dLon = halfM / (111_320 * Math.cos((lat * Math.PI) / 180));
  return {
    type: "Polygon",
    coordinates: [
      [
        [round(lon - dLon, 6), round(lat - dLat, 6)],
        [round(lon + dLon, 6), round(lat - dLat, 6)],
        [round(lon + dLon, 6), round(lat + dLat, 6)],
        [round(lon - dLon, 6), round(lat + dLat, 6)],
        [round(lon - dLon, 6), round(lat - dLat, 6)],
      ],
    ],
  };
}
