// Server-side orchestration: bundled snapshot -> disk cache -> live upstream. Used by the /api routes.
import { cacheGet, cacheSet, roundCoord } from "./cache";
import type { ClimateSeries, NdviSeries, SoilProfile } from "@/lib/types";
import { errMsg } from "./http";
import { fetchModisNdvi } from "./modis";
import { fetchPowerClimate } from "./power";
import { findSnapshotAt, loadSnapshot, loadSnapshotIndex, matchSnapshotId } from "./snapshots";
import { fetchSoilGrids } from "./soilgrids";
import {
  findNearestBasin,
  calculateBasinDeviation,
  AGRICULTURAL_BASINS,
  type AgriculturalBasin,
  type BasinDeviation,
} from "./basinNormals";
import { applyPrecipCalibration, calibrationFor, type CalibrationInfo } from "@/lib/ui/calibration";

export { findNearestBasin, calculateBasinDeviation, AGRICULTURAL_BASINS };
export type { AgriculturalBasin, BasinDeviation };

export interface LatLon {
  lat: number;
  lon: number;
}

export class ValidationError extends Error {}

/** Parse and validate ?lat=&lon= (WGS84 degrees). Throws ValidationError. */
export function parseLatLon(params: URLSearchParams): LatLon {
  const rawLat = params.get("lat");
  const rawLon = params.get("lon");
  if (rawLat === null || rawLon === null || rawLat.trim() === "" || rawLon.trim() === "") {
    throw new ValidationError("Query parameters lat and lon are required");
  }
  const lat = Number(rawLat);
  const lon = Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new ValidationError("lat and lon must be numbers");
  if (lat < -90 || lat > 90) throw new ValidationError("lat must be between -90 and 90");
  if (lon < -180 || lon > 180) throw new ValidationError("lon must be between -180 and 180");
  return { lat, lon };
}

export async function getClimate({ lat, lon }: LatLon): Promise<ClimateSeries> {
  const snap = await findSnapshotAt(lat, lon);
  if (snap?.climate) return snap.climate;
  const cached = await cacheGet<ClimateSeries>("climate", lat, lon);
  if (cached) return cached;
  try {
    const data = await fetchPowerClimate(roundCoord(lat), roundCoord(lon));
    await cacheSet("climate", lat, lon, data);
    return data;
  } catch (e) {
    const idx = await loadSnapshotIndex();
    const nearestId = matchSnapshotId(idx, lat, lon, 180);
    const nearest = nearestId ? await loadSnapshot(nearestId) : null;
    if (nearest?.climate) {
      const entry = idx.find((x) => x.id === nearestId);
      const label = entry ? `${entry.nameTr} (${entry.lat}°N, ${entry.lon}°E)` : nearestId;
      return {
        ...nearest.climate,
        lat: roundCoord(lat),
        lon: roundCoord(lon),
        sources: nearest.climate.sources.map((s) => ({
          ...s,
          note: `${s.note ?? ""} [Çevrimdışı yedek / Offline fallback: Canlı NASA POWER servisine ulaşılamadığı için (${errMsg(e)}) en yakın pilot bölge kopyası (${label}) kullanıldı.]`.trim(),
        })),
      };
    }
    throw e;
  }
}

/**
 * Returns the nearest agricultural basin and distance in km for given coordinates.
 */
export function getNearestBasin({ lat, lon }: LatLon): { basin: AgriculturalBasin; distanceKm: number } {
  return findNearestBasin(lat, lon);
}

/**
 * Calculates satellite-vs-ground deviation between NASA POWER climate and the nearest basin normals.
 */
export function getBasinDeviation(climate: ClimateSeries, { lat, lon }: LatLon): BasinDeviation | null {
  const { basin, distanceKm } = findNearestBasin(lat, lon);
  return calculateBasinDeviation(climate, basin, distanceKm);
}

/**
 * Retrieves climate series and applies either user-specified or automatic basin calibration.
 */
export async function getCalibratedClimate(
  point: LatLon,
  manualStationMm?: number | null,
): Promise<{ climate: ClimateSeries; rawClimate: ClimateSeries; calibration: CalibrationInfo | null }> {
  const rawClimate = await getClimate(point);
  const calibration = calibrationFor(rawClimate, manualStationMm ?? null, point);
  const climate = calibration ? applyPrecipCalibration(rawClimate, calibration) : rawClimate;
  return { climate, rawClimate, calibration };
}

export async function getSoil({ lat, lon }: LatLon): Promise<SoilProfile> {
  const snap = await findSnapshotAt(lat, lon);
  if (snap && snap.soil.origin !== "default") return snap.soil;
  const cached = await cacheGet<SoilProfile>("soil", lat, lon);
  if (cached) return cached;
  const data = await fetchSoilGrids(roundCoord(lat), roundCoord(lon));
  if (data.origin === "soilgrids") await cacheSet("soil", lat, lon, data); // never cache fallbacks
  return data;
}

export async function getNdvi({ lat, lon }: LatLon): Promise<NdviSeries> {
  const snap = await findSnapshotAt(lat, lon);
  if (snap && snap.ndvi.points.length) return snap.ndvi;
  const cached = await cacheGet<NdviSeries>("ndvi", lat, lon);
  if (cached) return cached;
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - 5);
  try {
    const data = await fetchModisNdvi(roundCoord(lat), roundCoord(lon), { startDate: start.toISOString().slice(0, 10), concurrency: 4 });
    await cacheSet("ndvi", lat, lon, data);
    return data;
  } catch (e) {
    const idx = await loadSnapshotIndex();
    const nearestId = matchSnapshotId(idx, lat, lon, 180);
    const nearest = nearestId ? await loadSnapshot(nearestId) : null;
    if (nearest && nearest.ndvi.points.length) {
      const entry = idx.find((x) => x.id === nearestId);
      const label = entry ? `${entry.nameTr} (${entry.lat}°N, ${entry.lon}°E)` : nearestId;
      return {
        ...nearest.ndvi,
        lat: roundCoord(lat),
        lon: roundCoord(lon),
        sources: nearest.ndvi.sources.map((s) => ({
          ...s,
          note: `${s.note ?? ""} [Çevrimdışı yedek / Offline fallback: Canlı ORNL MODIS servisine ulaşılamadığı için (${errMsg(e)}) en yakın pilot bölge kopyası (${label}) kullanıldı.]`.trim(),
        })),
      };
    }
    throw e;
  }
}
