// Terrain (elevation, slope, aspect) from NASA SRTM v3 (1 arc-second, ~30 m) via the public OpenTopoData API.
// No API key. Public instance limits: 100 locations/request, 1 request/second, 1000 requests/day: we are polite.
import type { LonLat, SourceMeta, TerrainInfo } from "./fieldTypes";
import { bbox, centroid, metresPerDegree, pointInPolygon, type Ring } from "./geometry";
import { fetchJson } from "./http";

const BASE = "https://api.opentopodata.org/v1/srtm30m";
const MIN_SPACING_M = 90; // never differentiate closer than ~3 SRTM pixels: elevation is quantised to 1 m
const MAX_PER_AXIS = 7; // 7 x 7 = 49 points max

export interface TerrainGrid {
  nx: number;
  ny: number;
  dxM: number;
  dyM: number;
  /** Row-major, row 0 = southernmost, col 0 = westernmost. */
  points: LonLat[];
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function build(centre: LonLat, nx: number, ny: number, dxM: number, dyM: number): TerrainGrid {
  const k = metresPerDegree(centre.lat);
  const points: LonLat[] = [];
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      points.push({
        lon: centre.lon + ((i - (nx - 1) / 2) * dxM) / k.lon,
        lat: centre.lat + ((j - (ny - 1) / 2) * dyM) / k.lat,
      });
    }
  }
  return { nx, ny, dxM, dyM, points };
}

/** Single point: 3 x 3 stencil at 90 m spacing. */
export function pointGrid(p: LonLat): TerrainGrid {
  return build(p, 3, 3, MIN_SPACING_M, MIN_SPACING_M);
}

/** Polygon: regular grid over the bounding box (3..7 per axis, spacing >= 90 m), at most 49 points. */
export function polygonGrid(ring: Ring): TerrainGrid {
  const [minLon, minLat, maxLon, maxLat] = bbox(ring);
  const c = { lon: (minLon + maxLon) / 2, lat: (minLat + maxLat) / 2 };
  const k = metresPerDegree(c.lat);
  const w = (maxLon - minLon) * k.lon;
  const h = (maxLat - minLat) * k.lat;
  const nx = clamp(Math.round(w / 150) + 1, 3, MAX_PER_AXIS);
  const ny = clamp(Math.round(h / 150) + 1, 3, MAX_PER_AXIS);
  return build(c, nx, ny, Math.max(w / (nx - 1), MIN_SPACING_M), Math.max(h / (ny - 1), MIN_SPACING_M));
}

/** np.gradient-style derivative along one axis: central differences inside, one-sided at the ends. null-aware. */
function deriv(get: (t: number) => number | null, n: number, t: number, step: number): number | null {
  const lo = t > 0 ? t - 1 : t;
  const hi = t < n - 1 ? t + 1 : t;
  const a = get(lo);
  const b = get(hi);
  if (a === null || b === null || hi === lo) return null;
  return (b - a) / ((hi - lo) * step);
}

export interface CellGradient {
  slopePct: number;
  /** Compass bearing (deg, clockwise from north) the slope faces, i.e. the downhill direction. */
  aspectDeg: number;
  /** Eastward / northward components of the gradient dz/dx, dz/dy (m per m). */
  gx: number;
  gy: number;
}

export function gradientAt(grid: TerrainGrid, z: (number | null)[], i: number, j: number): CellGradient | null {
  const at = (ii: number, jj: number) => z[jj * grid.nx + ii];
  const gx = deriv((t) => at(t, j), grid.nx, i, grid.dxM);
  const gy = deriv((t) => at(i, t), grid.ny, j, grid.dyM);
  if (gx === null || gy === null) return null;
  const slopePct = 100 * Math.hypot(gx, gy);
  // downhill direction = -gradient; bearing measured clockwise from north
  const aspectDeg = ((Math.atan2(-gx, -gy) * 180) / Math.PI + 360) % 360;
  return { slopePct, aspectDeg, gx, gy };
}

const r1 = (v: number) => Math.round(v * 10) / 10;

/** Pure: elevation statistics, mean slope and dominant aspect over grid points inside `ring` (all points if no ring). */
export function terrainStats(
  grid: TerrainGrid,
  z: (number | null)[],
  ring?: Ring,
): Pick<TerrainInfo, "elevationMean" | "elevationMin" | "elevationMax" | "slopePct" | "aspectDeg" | "samples"> | null {
  const elev: number[] = [];
  const slopes: number[] = [];
  let sx = 0;
  let sy = 0; // slope-weighted mean of downhill unit vectors
  for (let j = 0; j < grid.ny; j++) {
    for (let i = 0; i < grid.nx; i++) {
      const idx = j * grid.nx + i;
      if (ring && !pointInPolygon(grid.points[idx], ring)) continue;
      const v = z[idx];
      if (v === null || v === undefined) continue;
      elev.push(v);
      const g = gradientAt(grid, z, i, j);
      if (g) {
        slopes.push(g.slopePct);
        const a = (g.aspectDeg * Math.PI) / 180;
        sx += g.slopePct * Math.sin(a);
        sy += g.slopePct * Math.cos(a);
      }
    }
  }
  if (!elev.length || !slopes.length) return null;
  const slope = slopes.reduce((s, v) => s + v, 0) / slopes.length;
  const mag = Math.hypot(sx, sy) / slopes.length;
  // flat or direction-less terrain has no meaningful aspect
  const aspect = slope < 1 || mag < 0.25 * slope ? null : r1(((Math.atan2(sx, sy) * 180) / Math.PI + 360) % 360);
  return {
    elevationMean: r1(elev.reduce((s, v) => s + v, 0) / elev.length),
    elevationMin: Math.min(...elev),
    elevationMax: Math.max(...elev),
    slopePct: r1(slope),
    aspectDeg: aspect,
    samples: elev.length,
  };
}

// ---- network ----
interface OtdResp {
  status?: string;
  error?: string;
  results?: { elevation: number | null }[];
}

let gate: Promise<void> = Promise.resolve();
/** Serialises requests to the public instance: at most one per 1.1 s per process. */
function politeSlot(): Promise<void> {
  const mine = gate.then(() => new Promise<void>((r) => setTimeout(r, 1100)));
  gate = mine;
  return mine;
}

export function elevationUrl(points: LonLat[]): string {
  const loc = points.map((p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join("|");
  return `${BASE}?locations=${loc}&interpolation=bilinear`;
}

export async function fetchElevations(points: LonLat[]): Promise<(number | null)[]> {
  if (points.length > 100) throw new Error("OpenTopoData accepts at most 100 locations per request");
  await politeSlot();
  const r = await fetchJson<OtdResp>(elevationUrl(points), { timeoutMs: 30_000, retries: 2, backoffMs: 2500 });
  if (r.status !== "OK" || !r.results || r.results.length !== points.length) throw new Error(`OpenTopoData: ${r.error ?? "unexpected response"}`);
  return r.results.map((x) => (typeof x.elevation === "number" ? x.elevation : null));
}

function source(grid: TerrainGrid, retrievedAt: string, kind: string): SourceMeta {
  return {
    name: "NASA SRTM v3.0 (SRTMGL1) 1 arc-second DEM",
    provider: "NASA / NGA / JPL SRTM, served by the OpenTopoData public API (opentopodata.org, dataset srtm30m)",
    url: "https://www.opentopodata.org/datasets/srtm/",
    retrievedAt,
    spatialResolution: "~30 m (1 arc-second); sample spacing ~" + Math.round(Math.max(grid.dxM, grid.dyM)) + " m",
    note:
      `${kind}: ${grid.nx} x ${grid.ny} samples, bilinear interpolation of the 30 m DEM; slope = mean of per-point finite-difference gradients (metric spacing from WGS84 radii of curvature, central differences), aspect = slope-weighted vector mean of the downhill direction, null if the terrain is flat (< 1 %) or directionless. ` +
      "SRTM is a public-domain NASA product (absolute vertical accuracy about +/- 16 m at 90 % confidence, better relatively); it measures the surface including canopy/buildings. Coverage 60 N to 56 S. " +
      "OpenTopoData public instance: free, no key, 1 request/s, 1000 requests/day.",
  };
}

/** Terrain for a polygon (ring) or a point. Throws when the DEM service fails or has no data. */
export async function fetchTerrain(target: { ring: Ring } | { point: LonLat }): Promise<TerrainInfo> {
  const retrievedAt = new Date().toISOString();
  const ring = "ring" in target ? target.ring : undefined;
  const grid = ring ? polygonGrid(ring) : pointGrid((target as { point: LonLat }).point);
  const z = await fetchElevations(grid.points);
  let stats = terrainStats(grid, z, ring);
  let kind = ring ? "Regular grid over the polygon bounding box, grid points inside the polygon used" : "3 x 3 stencil at 90 m spacing around the point";
  if (!stats && ring) {
    // polygon too thin/small to contain a usable grid point: fall back to the 3 x 3 stencil at its centroid
    const g2 = pointGrid(centroid(ring));
    const z2 = await fetchElevations(g2.points);
    stats = terrainStats(g2, z2);
    kind = "Polygon too small for the grid: 3 x 3 stencil at 90 m spacing around its centroid";
    if (stats) return { ...stats, sources: [source(g2, retrievedAt, kind)] };
  }
  if (!stats) throw new Error("SRTM has no valid elevation here (void or outside 60 N - 56 S)");
  return { ...stats, sources: [source(grid, retrievedAt, kind)] };
}

