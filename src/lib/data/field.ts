// Server-side orchestration for POST /api/field: geometry + terrain + soil layers + precipitation cross-check,
// each part isolated so that one failing upstream never fails the whole response.
import { cacheGet, cacheSet } from "./cache";
import type { FieldResponse, LonLat, PrecipCrossCheck, SoilLayer, TerrainInfo } from "./fieldTypes";
import { describePoint, describeRing, GeometryError, parsePolygon, type Ring } from "./geometry";
import { errMsg } from "./http";
import { fetchPrecipCrossCheck } from "./precip";
import { getClimate, ValidationError } from "./service";
import { findSnapshotAt } from "./snapshots";
import { fetchSoilBundle, type SoilBundle } from "./soillayers";
import { fetchTerrain } from "./terrain";

/** Independently computed parts of a field response. */
export type FieldPart = "terrain" | "soil" | "precip";
export const FIELD_PARTS: readonly FieldPart[] = ["terrain", "soil", "precip"];

/**
 * `?parts=terrain,soil` style selector. Missing or empty = every part (the original behaviour).
 * Throws ValidationError for an unknown part name.
 */
export function parseParts(raw: string | null | undefined): FieldPart[] {
  if (raw === null || raw === undefined || raw.trim() === "") return [...FIELD_PARTS];
  const out: FieldPart[] = [];
  for (const p of raw.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean)) {
    if (!(FIELD_PARTS as readonly string[]).includes(p)) throw new ValidationError(`Unknown part "${p}"; use terrain, soil, precip`);
    if (!out.includes(p as FieldPart)) out.push(p as FieldPart);
  }
  return out.length ? out : [...FIELD_PARTS];
}

/** Response for a subset of parts: keys of parts that were not requested are absent; `parts` lists what was computed. */
export type FieldPartsResponse = Pick<FieldResponse, "geometry" | "notes"> &
  Partial<Pick<FieldResponse, "terrain" | "soilLayers" | "soil" | "wrb" | "precipCheck">> & { parts: FieldPart[] };

export interface FieldInput {
  ring?: Ring;
  point?: LonLat;
}

/** Parse a request body: a GeoJSON Polygon / Feature<Polygon>, or {lat, lon}. Throws ValidationError. */
export function parseFieldBody(body: unknown): FieldInput {
  if (!body || typeof body !== "object") throw new ValidationError("Body must be a JSON object: a GeoJSON Polygon or {lat, lon}");
  const b = body as Record<string, unknown>;
  if (b.type === "Polygon" || b.type === "Feature") {
    try {
      return { ring: parsePolygon(b) };
    } catch (e) {
      if (e instanceof GeometryError) throw new ValidationError(e.message);
      throw e;
    }
  }
  if ("lat" in b || "lon" in b) {
    const lat = b.lat;
    const lon = b.lon;
    if (typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) throw new ValidationError("lat and lon must be numbers");
    if (lat < -90 || lat > 90) throw new ValidationError("lat must be between -90 and 90");
    if (lon < -180 || lon > 180) throw new ValidationError("lon must be between -180 and 180");
    return { point: { lat, lon } };
  }
  throw new ValidationError("Body must be a GeoJSON Polygon or {lat, lon}");
}

/** Log2-based area bucket (half-octave steps): fields of similar size share cache entries for the area-dependent parts. */
export function areaBucket(areaHa: number): string {
  return `a${Math.round(Math.log2(Math.max(areaHa, 0.05)) * 2)}`;
}

function shapeHash(ring: Ring): string {
  let h = 2166136261;
  for (const p of ring) {
    for (const v of [Math.round(p.lon * 1e5), Math.round(p.lat * 1e5)]) {
      h ^= v;
      h = Math.imul(h, 16777619) >>> 0;
    }
  }
  return h.toString(36);
}

export async function getField(input: FieldInput): Promise<FieldResponse> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { parts, ...rest } = await getFieldParts(input, FIELD_PARTS);
  return rest as FieldResponse;
}

/** Same as getField, computing only the requested parts (each still cached and error-isolated). */
export async function getFieldParts(input: FieldInput, parts: readonly FieldPart[]): Promise<FieldPartsResponse> {
  const want = (p: FieldPart) => parts.includes(p);
  const geometry = input.ring ? describeRing(input.ring) : describePoint(input.point!);
  const { lat, lon } = geometry.centroid;
  const notes: string[] = [];
  const bucket = areaBucket(geometry.areaHa);

  // terrain depends on the exact shape: cache key = centroid + area bucket + shape hash
  const terrainP = async (): Promise<TerrainInfo> => {
    const extra = `${bucket}_${input.ring ? shapeHash(input.ring) : "pt"}`;
    const hit = await cacheGet<TerrainInfo>("terrain", lat, lon, Date.now(), extra);
    if (hit) return hit;
    const t = await fetchTerrain(input.ring ? { ring: input.ring } : { point: input.point! });
    await cacheSet("terrain", lat, lon, t, extra);
    return t;
  };

  // soil layers: 250 m product, keyed by the rounded centroid (bundled snapshot first)
  const soilP = async (): Promise<SoilBundle> => {
    const snap = await findSnapshotAt(lat, lon);
    if (snap?.soilLayers && snap.soil.origin !== "default") {
      return { soil: snap.soil, layers: snap.soilLayers, wrb: snap.wrb ?? null, notes: ["Soil layers from the bundled pilot snapshot."] };
    }
    const hit = await cacheGet<SoilBundle>("soilbundle", lat, lon);
    if (hit) return hit;
    const b = await fetchSoilBundle(lat, lon, { timeoutMs: 15_000, retries: 1, budgetMs: 40_000 });
    if (b.layers && b.soil.origin === "soilgrids") await cacheSet("soilbundle", lat, lon, b);
    return b;
  };

  const precipP = async (): Promise<PrecipCrossCheck | null> => {
    const snap = await findSnapshotAt(lat, lon);
    if (snap?.precipCheck) return snap.precipCheck;
    const hit = await cacheGet<PrecipCrossCheck>("precipcheck", lat, lon);
    if (hit) return hit;
    const climate = await getClimate({ lat, lon });
    const pc = await fetchPrecipCrossCheck(climate, lat, lon);
    if (pc) await cacheSet("precipcheck", lat, lon, pc);
    return pc;
  };

  const skip = Promise.resolve(undefined);
  const [t, s, p] = await Promise.allSettled([want("terrain") ? terrainP() : skip, want("soil") ? soilP() : skip, want("precip") ? precipP() : skip]);
  const out: FieldPartsResponse = { geometry, notes, parts: FIELD_PARTS.filter(want) };

  if (want("terrain")) {
    let terrain: TerrainInfo | null = null;
    if (t.status === "fulfilled") terrain = t.value ?? null;
    else notes.push(`Terrain unavailable (SRTM via OpenTopoData): ${errMsg(t.reason)}`);
    out.terrain = terrain;
  }

  if (want("soil")) {
    let soilLayers: SoilLayer[] | null = null;
  let wrb: string | undefined;
  let soil: SoilBundle["soil"];
  if (s.status === "fulfilled" && s.value) {
    soil = s.value.soil;
    soilLayers = s.value.layers;
    if (s.value.wrb) wrb = s.value.wrb;
    notes.push(...s.value.notes);
  } else {
    const { defaultSoil } = await import("./soilgrids");
    const why = errMsg(s.status === "rejected" ? s.reason : "no result");
    soil = defaultSoil(why);
    notes.push(`SoilGrids unavailable: ${why}`);
  }
  out.soil = soil;
  out.soilLayers = soilLayers;
  if (wrb) out.wrb = wrb;
  }

  if (want("precip")) {
    let precipCheck: PrecipCrossCheck | null = null;
    if (p.status === "fulfilled") {
      precipCheck = p.value ?? null;
      if (!precipCheck) notes.push("Precipitation cross-check not computed: fewer than 3 complete common calendar years.");
    } else notes.push(`Precipitation cross-check unavailable: ${errMsg(p.reason)}`);
    out.precipCheck = precipCheck;
  }

  notes.push("Climate (NASA POWER) and NDVI (MODIS) are served by /api/climate and /api/ndvi at the field centroid.");
  return out;
}
