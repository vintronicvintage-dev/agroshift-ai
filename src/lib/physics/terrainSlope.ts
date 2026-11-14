/**
 * NASA SRTM 30m Real Elevation & Parcel Slope Module (`src/lib/physics/terrainSlope.ts`).
 *
 * Queries the keyless OpenTopoData SRTM 30m endpoint for 3 points:
 *   1. Center: (lat, lon)
 *   2. ~100 m North: (lat + 0.0009, lon)
 *   3. ~100 m East: (lat, lon + 0.0011)
 *
 * Computes parcel slope (%) from the 2D elevation gradient and deterministically maps it
 * to the RUSLE slope-length & steepness factor (LS, McCool et al. 1987 / USDA AH-703).
 * Silently falls back to regional default slope values when offline or on API timeout/error.
 */

import { resolveOfflineRegionId, type OfflineMoistureRegionId } from "./rootZoneMoisture";

const SRTM_ENDPOINT = "https://api.opentopodata.org/v1/srtm30m";
const NORTH_OFFSET_DEG = 0.0009; // ~100.1 m
const EAST_OFFSET_DEG = 0.0011;  // ~95–100 m at 36–42°N
const DEFAULT_SLOPE_LENGTH_M = 50;

export const REGIONAL_DEFAULT_SLOPE_PCT: Record<OfflineMoistureRegionId, number> = {
  "konya-cumra": 1.2,
  "edirne-uzunkopru": 2.4,
  "sanliurfa-harran": 1.8,
  default: 2.0,
};

export interface TerrainSlopeResult {
  lat: number;
  lon: number;
  elevationM: number | null;
  northElevationM: number | null;
  eastElevationM: number | null;
  slopePct: number;
  /** RUSLE LS factor (dimensionless) computed deterministically from slopePct. */
  rusleLsFactor: number;
  slopeLengthM: number;
  source: "srtm30m" | "regional_fallback";
  fallbackUsed: boolean;
  regionId: OfflineMoistureRegionId;
}

/** Build the keyless OpenTopoData SRTM 30m URL for center, ~100 m north, and ~100 m east. */
export function buildSrtm3PointUrl(lat: number, lon: number): string {
  const latN = (lat + NORTH_OFFSET_DEG).toFixed(6);
  const lonE = (lon + EAST_OFFSET_DEG).toFixed(6);
  const locations = `${lat.toFixed(6)},${lon.toFixed(6)}|${latN},${lon.toFixed(6)}|${lat.toFixed(6)},${lonE}`;
  return `${SRTM_ENDPOINT}?locations=${locations}`;
}

/** Return the regional default slope (%) for offline / timeout fallback. */
export function regionalDefaultSlopePct(lat: number, lon: number): { slopePct: number; regionId: OfflineMoistureRegionId } {
  const regionId = resolveOfflineRegionId(lat, lon);
  return { slopePct: REGIONAL_DEFAULT_SLOPE_PCT[regionId], regionId };
}

/**
 * Deterministic RUSLE slope-length and steepness factor LS (McCool et al. 1987; Renard et al. 1997).
 * Matches `lsFactor` in `src/lib/engine/indicators.ts`.
 */
export function rusleLsFactor(slopePct: number, slopeLengthM = DEFAULT_SLOPE_LENGTH_M): number {
  const s = Math.max(0, Number.isFinite(slopePct) ? slopePct : 0);
  const len = Math.max(1, Number.isFinite(slopeLengthM) ? slopeLengthM : DEFAULT_SLOPE_LENGTH_M);
  const theta = Math.atan(s / 100);
  const m = s >= 5 ? 0.5 : s >= 3.5 ? 0.4 : s >= 1 ? 0.3 : 0.2;
  const L = Math.pow(len / 22.13, m);
  const S = s < 9 ? 10.8 * Math.sin(theta) + 0.03 : 16.8 * Math.sin(theta) - 0.5;
  return Math.round(L * S * 10000) / 10000;
}

/**
 * Compute parcel slope (%) from 3 elevation samples (center, +0.0009° N, +0.0011° E).
 */
export function computeSlopeFromElevations(
  lat: number,
  centerElevM: number,
  northElevM: number,
  eastElevM: number,
): { slopePct: number; dzNorthM: number; dzEastM: number; distNorthM: number; distEastM: number } {
  const latRad = (lat * Math.PI) / 180;
  const distNorthM = NORTH_OFFSET_DEG * 111_320;
  const distEastM = Math.max(10, EAST_OFFSET_DEG * 111_320 * Math.cos(latRad));
  const dzNorthM = northElevM - centerElevM;
  const dzEastM = eastElevM - centerElevM;
  const gx = dzEastM / distEastM;
  const gy = dzNorthM / distNorthM;
  const slopePct = Math.round(100 * Math.hypot(gx, gy) * 100) / 100;
  return { slopePct, dzNorthM, dzEastM, distNorthM, distEastM };
}

interface OpenTopoResponse {
  status?: string;
  results?: Array<{ elevation?: number | null }>;
}

/**
 * Fetch SRTM 30m elevation for (lat, lon) and ~100 m N/E neighbors, compute slope (%) and RUSLE LS.
 * Silently falls back to regional default slope if offline, timed out, or on invalid response.
 */
export async function fetchParcelTerrainSlope(
  lat: number,
  lon: number,
  opts: { timeoutMs?: number; slopeLengthM?: number; fetchFn?: typeof fetch } = {},
): Promise<TerrainSlopeResult> {
  const timeoutMs = opts.timeoutMs ?? 5000;
  const slopeLengthM = opts.slopeLengthM ?? DEFAULT_SLOPE_LENGTH_M;
  const fetchFn = opts.fetchFn ?? globalThis.fetch;
  const fallback = regionalDefaultSlopePct(lat, lon);

  try {
    if (typeof fetchFn !== "function") throw new Error("fetch unavailable");
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), timeoutMs) : null;
    try {
      const res = await fetchFn(buildSrtm3PointUrl(lat, lon), {
        signal: ctrl?.signal,
        headers: { Accept: "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as OpenTopoResponse;
      const r = data?.results;
      if (!Array.isArray(r) || r.length < 3) throw new Error("Incomplete SRTM results");
      const z0 = r[0]?.elevation;
      const zN = r[1]?.elevation;
      const zE = r[2]?.elevation;
      if (
        typeof z0 !== "number" || !Number.isFinite(z0) ||
        typeof zN !== "number" || !Number.isFinite(zN) ||
        typeof zE !== "number" || !Number.isFinite(zE)
      ) {
        throw new Error("Non-numeric SRTM elevation");
      }
      const { slopePct } = computeSlopeFromElevations(lat, z0, zN, zE);
      return {
        lat,
        lon,
        elevationM: Math.round(z0 * 10) / 10,
        northElevationM: Math.round(zN * 10) / 10,
        eastElevationM: Math.round(zE * 10) / 10,
        slopePct,
        rusleLsFactor: rusleLsFactor(slopePct, slopeLengthM),
        slopeLengthM,
        source: "srtm30m",
        fallbackUsed: false,
        regionId: fallback.regionId,
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return {
      lat,
      lon,
      elevationM: null,
      northElevationM: null,
      eastElevationM: null,
      slopePct: fallback.slopePct,
      rusleLsFactor: rusleLsFactor(fallback.slopePct, slopeLengthM),
      slopeLengthM,
      source: "regional_fallback",
      fallbackUsed: true,
      regionId: fallback.regionId,
    };
  }
}
