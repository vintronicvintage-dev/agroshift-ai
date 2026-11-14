// Pure geometry utilities for field polygons (WGS84, degrees). No Node APIs: safe for client code.
import type { FieldGeometry, LonLat } from "./fieldTypes";

const A = 6378137; // WGS84 semi-major axis, m
const F = 1 / 298.257223563;
const E2 = F * (2 - F);
const RAD = Math.PI / 180;

export const MIN_AREA_HA = 0.1;
export const MAX_AREA_HA = 5000;
export const MAX_VERTICES = 200;

export type Ring = LonLat[]; // open ring (last vertex != first)

/** Meridional (M) and prime-vertical (N) radii of curvature at a latitude (degrees), metres. */
export function curvatureRadii(latDeg: number): { m: number; n: number } {
  const s = Math.sin(latDeg * RAD);
  const w = Math.sqrt(1 - E2 * s * s);
  return { n: A / w, m: (A * (1 - E2)) / (w * w * w) };
}

/** Metres per degree of latitude and longitude at a latitude. */
export function metresPerDegree(latDeg: number): { lat: number; lon: number } {
  const { m, n } = curvatureRadii(latDeg);
  return { lat: m * RAD, lon: n * Math.cos(latDeg * RAD) * RAD };
}

/** Authalic latitude (radians) of a geodetic latitude (degrees): equal-area mapping ellipsoid -> sphere. */
function authalicLat(latDeg: number): number {
  const phi = latDeg * RAD;
  const e = Math.sqrt(E2);
  const q = (p: number) => {
    const s = Math.sin(p);
    return (1 - E2) * (s / (1 - E2 * s * s) - (1 / (2 * e)) * Math.log((1 - e * s) / (1 + e * s)));
  };
  return Math.asin(Math.max(-1, Math.min(1, q(phi) / q(Math.PI / 2))));
}
const R_AUTHALIC = 6371007.1809; // authalic radius of WGS84, m

/** Ellipsoidal equal-area polygon area in m2 for an open ring. Edges are lat/lon-linear (accurate at field scale). */
export function ringAreaM2(ring: Ring): number {
  const n = ring.length;
  if (n < 3) return 0;
  const lat = ring.map((p) => authalicLat(p.lat));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    let dl = (ring[j].lon - ring[i].lon) * RAD;
    if (dl > Math.PI) dl -= 2 * Math.PI;
    if (dl < -Math.PI) dl += 2 * Math.PI;
    sum += dl * (2 + Math.sin(lat[i]) + Math.sin(lat[j]));
  }
  return Math.abs((sum * R_AUTHALIC * R_AUTHALIC) / 2);
}

/** Length of a short segment on the ellipsoid (local metric, <0.01% error for segments of a few km). */
export function segmentLengthM(a: LonLat, b: LonLat): number {
  const mid = (a.lat + b.lat) / 2;
  const { m, n } = curvatureRadii(mid);
  const dy = (b.lat - a.lat) * RAD * m;
  const dx = (b.lon - a.lon) * RAD * n * Math.cos(mid * RAD);
  return Math.hypot(dx, dy);
}

export function ringPerimeterM(ring: Ring): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) s += segmentLengthM(ring[i], ring[(i + 1) % ring.length]);
  return s;
}

export function bbox(ring: Ring): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const p of ring) {
    minLon = Math.min(minLon, p.lon);
    maxLon = Math.max(maxLon, p.lon);
    minLat = Math.min(minLat, p.lat);
    maxLat = Math.max(maxLat, p.lat);
  }
  return [minLon, minLat, maxLon, maxLat];
}

/** Area-weighted centroid in a local equirectangular frame; falls back to the bbox centre for degenerate rings. */
export function centroid(ring: Ring): LonLat {
  const [minLon, minLat, maxLon, maxLat] = bbox(ring);
  const lat0 = (minLat + maxLat) / 2;
  const lon0 = (minLon + maxLon) / 2;
  const k = metresPerDegree(lat0);
  const pts = ring.map((p) => ({ x: (p.lon - lon0) * k.lon, y: (p.lat - lat0) * k.lat }));
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    const cr = p.x * q.y - q.x * p.y;
    a += cr;
    cx += (p.x + q.x) * cr;
    cy += (p.y + q.y) * cr;
  }
  if (Math.abs(a) < 1e-9) return { lon: lon0, lat: lat0 };
  return { lon: lon0 + cx / (3 * a) / k.lon, lat: lat0 + cy / (3 * a) / k.lat };
}

/** Ray-casting point-in-polygon (boundary points are not guaranteed either way). */
export function pointInPolygon(pt: LonLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    if (a.lat > pt.lat !== b.lat > pt.lat && pt.lon < ((b.lon - a.lon) * (pt.lat - a.lat)) / (b.lat - a.lat) + a.lon) inside = !inside;
  }
  return inside;
}

function orient(a: LonLat, b: LonLat, c: LonLat): number {
  return (b.lon - a.lon) * (c.lat - a.lat) - (b.lat - a.lat) * (c.lon - a.lon);
}

function segmentsCross(a: LonLat, b: LonLat, c: LonLat, d: LonLat): boolean {
  return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0; // proper crossings only
}

/** Simple O(n^2) test for edges that cross each other (adjacent edges excluded). */
export function isSelfIntersecting(ring: Ring): boolean {
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}

export class GeometryError extends Error {}

const rd = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

/** Validate a GeoJSON Polygon (or a Feature wrapping one) and return its open outer ring. Throws GeometryError. */
export function parsePolygon(input: unknown): Ring {
  let g = input as { type?: string; geometry?: unknown; coordinates?: unknown } | null;
  if (g && g.type === "Feature" && g.geometry) g = g.geometry as typeof g;
  if (!g || g.type !== "Polygon" || !Array.isArray(g.coordinates)) throw new GeometryError("Geometry must be a GeoJSON Polygon");
  const rings = g.coordinates as unknown[];
  if (rings.length !== 1) throw new GeometryError("Polygons with holes are not supported (exactly one outer ring)");
  const raw = rings[0];
  if (!Array.isArray(raw)) throw new GeometryError("Malformed polygon ring");
  if (raw.length > MAX_VERTICES + 1) throw new GeometryError(`A polygon may have at most ${MAX_VERTICES} vertices`);
  const ring: Ring = [];
  for (const c of raw) {
    if (!Array.isArray(c) || c.length < 2 || typeof c[0] !== "number" || typeof c[1] !== "number" || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
      throw new GeometryError("Every coordinate must be [lon, lat] numbers");
    }
    if (c[0] < -180 || c[0] > 180) throw new GeometryError("Longitude must be between -180 and 180");
    if (c[1] < -90 || c[1] > 90) throw new GeometryError("Latitude must be between -90 and 90");
    ring.push({ lon: c[0], lat: c[1] });
  }
  if (ring.length > 1 && ring[0].lon === ring[ring.length - 1].lon && ring[0].lat === ring[ring.length - 1].lat) ring.pop();
  if (ring.length < 3) throw new GeometryError("A polygon needs at least 3 distinct vertices");
  if (ring.length > MAX_VERTICES) throw new GeometryError(`A polygon may have at most ${MAX_VERTICES} vertices`);
  if (isSelfIntersecting(ring)) throw new GeometryError("Polygon edges must not cross each other");
  const ha = ringAreaM2(ring) / 10_000;
  if (ha < MIN_AREA_HA) throw new GeometryError(`Polygon area ${rd(ha, 3)} ha is below the minimum of ${MIN_AREA_HA} ha`);
  if (ha > MAX_AREA_HA) throw new GeometryError(`Polygon area ${rd(ha, 1)} ha exceeds the maximum of ${MAX_AREA_HA} ha`);
  return ring;
}

export function describeRing(ring: Ring): FieldGeometry {
  const areaM2 = ringAreaM2(ring);
  const c = centroid(ring);
  return {
    areaM2: rd(areaM2, 1),
    areaDa: rd(areaM2 / 1000, 3),
    areaHa: rd(areaM2 / 10_000, 4),
    perimeterM: rd(ringPerimeterM(ring), 1),
    centroid: { lon: rd(c.lon, 6), lat: rd(c.lat, 6) },
    bbox: bbox(ring).map((v) => rd(v, 6)) as FieldGeometry["bbox"],
  };
}

export function describePoint(p: LonLat): FieldGeometry {
  return { areaM2: 0, areaDa: 0, areaHa: 0, perimeterM: 0, centroid: { ...p }, bbox: [p.lon, p.lat, p.lon, p.lat] };
}
