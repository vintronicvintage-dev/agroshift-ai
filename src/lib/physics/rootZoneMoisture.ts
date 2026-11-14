/**
 * NASA POWER Root-Zone & Profile Soil Wetness Calibration (GWETROOT & GWETPROF).
 *
 * Provides:
 * 1. Offline-first seasonal GWETROOT & GWETPROF climatology (12 months, 0–1 saturation fraction)
 *    for Konya-Çumra, Edirne-Uzunköprü, Şanlıurfa-Harran, and a national fallback.
 * 2. Deterministic calibration of initial sowing-start root-zone soil moisture reserve (θ₀, wetness, mm)
 *    from live NASA POWER GWETROOT/GWETPROF or offline seasonal defaults when satellite data is absent.
 */

export type OfflineMoistureRegionId = "konya-cumra" | "edirne-uzunkopru" | "sanliurfa-harran" | "default";

export interface SeasonalGwetProfile {
  regionId: OfflineMoistureRegionId;
  nameTr: string;
  nameEn: string;
  lat: number;
  lon: number;
  /** 12 monthly mean root-zone wetness indices (Jan..Dec, 0–1 fraction of saturation) */
  monthlyGwetRoot: readonly [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  /** 12 monthly mean full-profile wetness indices (Jan..Dec, 0–1 fraction of saturation) */
  monthlyGwetProf: readonly [
    number, number, number, number, number, number,
    number, number, number, number, number, number,
  ];
  source: string;
}

/**
 * Seasonal MERRA-2 / NASA POWER GWETROOT & GWETPROF defaults for Türkiye pilot basins.
 * Used when live NASA POWER data is unavailable or has gaps (offline-first fallback).
 */
export const OFFLINE_GWET_PROFILES: Record<OfflineMoistureRegionId, SeasonalGwetProfile> = {
  "konya-cumra": {
    regionId: "konya-cumra",
    nameTr: "Konya-Çumra",
    nameEn: "Konya-Cumra",
    lat: 37.57,
    lon: 32.77,
    monthlyGwetRoot: [0.56, 0.60, 0.62, 0.58, 0.50, 0.40, 0.32, 0.28, 0.30, 0.35, 0.43, 0.52],
    monthlyGwetProf: [0.54, 0.57, 0.59, 0.56, 0.50, 0.43, 0.36, 0.33, 0.34, 0.37, 0.43, 0.50],
    source: "Offline seasonal NASA POWER MERRA-2 climatology (Konya-Çumra, 2001–2025)",
  },
  "edirne-uzunkopru": {
    regionId: "edirne-uzunkopru",
    nameTr: "Edirne-Uzunköprü",
    nameEn: "Edirne-Uzunkopru",
    lat: 41.27,
    lon: 26.69,
    monthlyGwetRoot: [0.76, 0.78, 0.76, 0.70, 0.62, 0.52, 0.43, 0.39, 0.42, 0.50, 0.62, 0.72],
    monthlyGwetProf: [0.72, 0.74, 0.73, 0.69, 0.63, 0.55, 0.48, 0.44, 0.46, 0.52, 0.61, 0.69],
    source: "Offline seasonal NASA POWER MERRA-2 climatology (Edirne-Uzunköprü, 2001–2025)",
  },
  "sanliurfa-harran": {
    regionId: "sanliurfa-harran",
    nameTr: "Şanlıurfa-Harran",
    nameEn: "Sanliurfa-Harran",
    lat: 36.87,
    lon: 39.03,
    monthlyGwetRoot: [0.60, 0.64, 0.62, 0.54, 0.42, 0.31, 0.24, 0.22, 0.23, 0.29, 0.39, 0.52],
    monthlyGwetProf: [0.57, 0.60, 0.59, 0.53, 0.44, 0.35, 0.29, 0.27, 0.28, 0.32, 0.40, 0.50],
    source: "Offline seasonal NASA POWER MERRA-2 climatology (Şanlıurfa-Harran, 2001–2025)",
  },
  default: {
    regionId: "default",
    nameTr: "Türkiye Genel Varsayılan",
    nameEn: "Türkiye Regional Fallback",
    lat: 39.0,
    lon: 35.0,
    monthlyGwetRoot: [0.64, 0.68, 0.68, 0.62, 0.54, 0.44, 0.35, 0.31, 0.33, 0.40, 0.50, 0.60],
    monthlyGwetProf: [0.61, 0.64, 0.65, 0.60, 0.53, 0.45, 0.38, 0.35, 0.36, 0.41, 0.49, 0.57],
    source: "Offline seasonal NASA POWER MERRA-2 climatology (Türkiye agricultural fallback)",
  },
};

function approxDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * 111.32;
  const dLon = (lon2 - lon1) * 111.32 * Math.cos(((lat1 + lat2) / 2) * rad);
  return Math.hypot(dLat, dLon);
}

/**
 * Match a coordinate to the nearest offline moisture region (Konya-Çumra, Edirne-Uzunköprü,
 * Şanlıurfa-Harran) within 200 km, or fall back to `"default"`.
 */
export function resolveOfflineRegionId(lat: number, lon: number): OfflineMoistureRegionId {
  const candidates: OfflineMoistureRegionId[] = ["konya-cumra", "edirne-uzunkopru", "sanliurfa-harran"];
  let bestId: OfflineMoistureRegionId = "default";
  let bestDist = 200;
  for (const id of candidates) {
    const p = OFFLINE_GWET_PROFILES[id];
    const d = approxDistanceKm(lat, lon, p.lat, p.lon);
    if (d <= bestDist) {
      bestDist = d;
      bestId = id;
    }
  }
  return bestId;
}

function monthIndex(monthOrIsoDate: number | string): number {
  if (typeof monthOrIsoDate === "number") {
    const m = Math.round(monthOrIsoDate);
    return Math.max(0, Math.min(11, m - 1));
  }
  const m = Number(monthOrIsoDate.slice(5, 7));
  if (!Number.isFinite(m) || m < 1 || m > 12) return 9; // October sowing default
  return m - 1;
}

export interface SeasonalGwetLookup {
  gwetRoot: number;
  gwetProf: number;
  regionId: OfflineMoistureRegionId;
  month: number; // 1..12
  source: string;
}

/** Look up seasonal default GWETROOT and GWETPROF (0–1) for a coordinate and month/ISO date. */
export function seasonalDefaultGwet(lat: number, lon: number, monthOrIsoDate: number | string): SeasonalGwetLookup {
  const regionId = resolveOfflineRegionId(lat, lon);
  const profile = OFFLINE_GWET_PROFILES[regionId];
  const idx = monthIndex(monthOrIsoDate);
  return {
    gwetRoot: profile.monthlyGwetRoot[idx],
    gwetProf: profile.monthlyGwetProf[idx],
    regionId,
    month: idx + 1,
    source: profile.source,
  };
}

export interface RootZoneCalibrationInput {
  lat: number;
  lon: number;
  /** Sowing / window start ISO date ("YYYY-MM-DD") or 1-based month (1..12). */
  dateOrMonth: string | number;
  /** Live NASA POWER GWETROOT (0–1), or null/undefined if offline/missing. */
  gwetRoot?: number | null;
  /** Live NASA POWER GWETPROF (0–1), or null/undefined if offline/missing. */
  gwetProf?: number | null;
  /** Soil saturation water content θsat (m³/m³). */
  thetaSat: number;
  /** Soil field capacity θFC (m³/m³). */
  thetaFC: number;
  /** Soil wilting point θWP (m³/m³). */
  thetaWP: number;
  /** Root-zone / column depth in metres (default 1.5 m). */
  rootDepthM?: number;
}

export interface RootZoneCalibrationResult {
  /** Calibrated plant-available relative wetness (0–1). */
  wetness: number;
  /** Calibrated volumetric soil water content θ₀ (m³/m³). */
  theta0M3M3: number;
  /** Available root-zone water reserve above wilting point (mm). */
  initialReserveMm: number;
  /** Effective GWETROOT value used (live or seasonal fallback). */
  gwetRootUsed: number;
  /** Effective GWETPROF value used (live or seasonal fallback). */
  gwetProfUsed: number;
  /** True when live satellite GWETROOT was unavailable and offline seasonal fallback was used. */
  usedOfflineFallback: boolean;
  regionId: OfflineMoistureRegionId;
  source: string;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Calibrate sowing-start root-zone soil moisture reserve from NASA POWER GWETROOT & GWETPROF,
 * seamlessly falling back to the regional offline seasonal climatology when live values are missing.
 */
export function calibrateInitialRootZoneMoisture(input: RootZoneCalibrationInput): RootZoneCalibrationResult {
  const fallback = seasonalDefaultGwet(input.lat, input.lon, input.dateOrMonth);
  const hasLiveRoot = typeof input.gwetRoot === "number" && Number.isFinite(input.gwetRoot);
  const hasLiveProf = typeof input.gwetProf === "number" && Number.isFinite(input.gwetProf);

  const gwetRootUsed = clamp01(hasLiveRoot ? input.gwetRoot! : fallback.gwetRoot);
  const gwetProfUsed = clamp01(hasLiveProf ? input.gwetProf! : fallback.gwetProf);
  const usedOfflineFallback = !hasLiveRoot;

  // Root-zone wetness dominates (70%), buffered by deeper profile moisture (30%)
  const effectiveGwet = 0.7 * gwetRootUsed + 0.3 * gwetProfUsed;
  const span = Math.max(1e-6, input.thetaFC - input.thetaWP);
  const thetaSat = Math.max(input.thetaFC, input.thetaSat);
  const thetaRaw = effectiveGwet * thetaSat;
  const wetness = clamp01((thetaRaw - input.thetaWP) / span);
  const theta0M3M3 = input.thetaWP + wetness * span;
  const rootDepthM = Math.max(0.1, input.rootDepthM ?? 1.5);
  const initialReserveMm = wetness * span * 1000 * rootDepthM;

  const source = usedOfflineFallback
    ? fallback.source
    : hasLiveProf
      ? "NASA POWER GWETROOT + GWETPROF (MERRA-2 root-zone & profile soil wetness)"
      : "NASA POWER GWETROOT + seasonal GWETPROF profile";

  return {
    wetness: Math.round(wetness * 10000) / 10000,
    theta0M3M3: Math.round(theta0M3M3 * 10000) / 10000,
    initialReserveMm: Math.round(initialReserveMm * 100) / 100,
    gwetRootUsed,
    gwetProfUsed,
    usedOfflineFallback,
    regionId: fallback.regionId,
    source,
  };
}
