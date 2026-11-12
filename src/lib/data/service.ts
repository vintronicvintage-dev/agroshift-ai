// Server-side orchestration: bundled snapshot -> disk cache -> live upstream. Used by the /api routes.
import { cacheGet, cacheSet, roundCoord } from "./cache";
import type { ClimateSeries, NdviSeries, SoilProfile } from "@/lib/types";
import { fetchModisNdvi } from "./modis";
import { fetchPowerClimate } from "./power";
import { findSnapshotAt } from "./snapshots";
import { fetchSoilGrids } from "./soilgrids";

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
  const data = await fetchPowerClimate(roundCoord(lat), roundCoord(lon));
  await cacheSet("climate", lat, lon, data);
  return data;
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
  const data = await fetchModisNdvi(roundCoord(lat), roundCoord(lon), { startDate: start.toISOString().slice(0, 10), concurrency: 4 });
  await cacheSet("ndvi", lat, lon, data);
  return data;
}
