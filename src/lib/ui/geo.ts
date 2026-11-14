// Client-side field geometry helpers on top of the data layer's geodesic functions (pure).
import { describeRing, isSelfIntersecting, MAX_AREA_HA, metresPerDegree, MIN_AREA_HA, parsePolygon, ringAreaM2, ringPerimeterM, type Ring } from "@/lib/data/geometry";
import type { FieldGeometry, LonLat } from "@/lib/data/fieldTypes";

export type { Ring };
export { ringAreaM2, ringPerimeterM, describeRing, isSelfIntersecting };

/** Axis-aligned rectangle of w × h metres centred on a point. */
export function rectangleRing(c: LonLat, wM: number, hM: number): Ring {
  const k = metresPerDegree(c.lat);
  const dx = wM / 2 / k.lon;
  const dy = hM / 2 / k.lat;
  return [
    { lon: c.lon - dx, lat: c.lat - dy },
    { lon: c.lon + dx, lat: c.lat - dy },
    { lon: c.lon + dx, lat: c.lat + dy },
    { lon: c.lon - dx, lat: c.lat + dy },
  ];
}

/** Rectangle from two opposite corners. */
export function cornersRing(a: LonLat, b: LonLat): Ring {
  return [
    { lon: Math.min(a.lon, b.lon), lat: Math.min(a.lat, b.lat) },
    { lon: Math.max(a.lon, b.lon), lat: Math.min(a.lat, b.lat) },
    { lon: Math.max(a.lon, b.lon), lat: Math.max(a.lat, b.lat) },
    { lon: Math.min(a.lon, b.lon), lat: Math.max(a.lat, b.lat) },
  ];
}

/** Circle (centre pivot) as an n-gon in the local metric; the n-gon area is within 0.2 % of πr² for n = 64. */
export function circleRing(c: LonLat, radiusM: number, n = 64): Ring {
  const k = metresPerDegree(c.lat);
  const out: Ring = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI;
    out.push({ lon: c.lon + (radiusM * Math.cos(a)) / k.lon, lat: c.lat + (radiusM * Math.sin(a)) / k.lat });
  }
  return out;
}

/** Radius (m) of a circle with the given area in dekar. */
export const radiusForDa = (da: number) => Math.sqrt((da * 1000) / Math.PI);

export function distanceM(a: LonLat, b: LonLat): number {
  const k = metresPerDegree((a.lat + b.lat) / 2);
  return Math.hypot((b.lon - a.lon) * k.lon, (b.lat - a.lat) * k.lat);
}

export type RingProblem = "few" | "cross" | "small" | "large" | null;

export function ringProblem(ring: Ring): RingProblem {
  if (ring.length < 3) return "few";
  if (isSelfIntersecting(ring)) return "cross";
  const ha = ringAreaM2(ring) / 10_000;
  if (ha < MIN_AREA_HA) return "small";
  if (ha > MAX_AREA_HA) return "large";
  return null;
}

export function ringToGeoJSON(ring: Ring, props: Record<string, unknown> = {}) {
  const coords = ring.map((p) => [round(p.lon, 6), round(p.lat, 6)]);
  coords.push(coords[0]);
  return { type: "Feature" as const, properties: props, geometry: { type: "Polygon" as const, coordinates: [coords] } };
}

/** First polygon of a GeoJSON Feature / FeatureCollection / Polygon / MultiPolygon. Throws with a short reason. */
export function ringFromGeoJSON(input: unknown): Ring {
  const g = input as { type?: string; features?: unknown[]; geometry?: { type?: string; coordinates?: unknown }; coordinates?: unknown };
  if (g?.type === "FeatureCollection" && Array.isArray(g.features)) {
    for (const f of g.features) {
      try {
        return ringFromGeoJSON(f);
      } catch {
        /* try the next feature */
      }
    }
    throw new Error("no polygon");
  }
  const geom = g?.type === "Feature" ? g.geometry : g;
  if (geom?.type === "MultiPolygon" && Array.isArray(geom.coordinates)) {
    const first = (geom.coordinates as unknown[])[0] as unknown[];
    return parsePolygon({ type: "Polygon", coordinates: [first[0]] });
  }
  if (geom?.type === "Polygon" && Array.isArray(geom.coordinates)) {
    return parsePolygon({ type: "Polygon", coordinates: [(geom.coordinates as unknown[])[0]] });
  }
  throw new Error("no polygon");
}

/**
 * Parse one coordinate pair typed by a person: "37.57 32.77", "37,57 32,77", "37.57, 32.77",
 * "37°34'12\"N 32°46'12\"E" or "37 34 12 N 32 46 12 E". Order is latitude then longitude.
 */
export function parseLatLon(raw: string): LonLat | null {
  const s = raw.trim().replace(/[°'"′″]/g, " ").replace(/\s+/g, " ");
  if (!s) return null;
  const dms = s.match(/^(\d+(?:[.,]\d+)?) (\d+(?:[.,]\d+)?)(?: (\d+(?:[.,]\d+)?))? ?([NSKG]) ?,? ?(\d+(?:[.,]\d+)?) (\d+(?:[.,]\d+)?)(?: (\d+(?:[.,]\d+)?))? ?([EWDB])$/i);
  if (dms) {
    const num = (x?: string) => (x ? Number(x.replace(",", ".")) : 0);
    let lat = num(dms[1]) + num(dms[2]) / 60 + num(dms[3]) / 3600;
    let lon = num(dms[5]) + num(dms[6]) / 60 + num(dms[7]) / 3600;
    if (/[SG]/i.test(dms[4])) lat = -lat;
    if (/[WB]/i.test(dms[8])) lon = -lon;
    return valid(lat, lon);
  }
  // decimal: either "a, b" with dot decimals, or "a b" with comma or dot decimals, or "a;b"
  let parts: string[] = [];
  if (/^-?\d+(\.\d+)?\s*[,;]\s*-?\d+(\.\d+)?$/.test(s)) parts = s.split(/\s*[,;]\s*/);
  else parts = s.split(/[ ;]+/).filter(Boolean);
  if (parts.length !== 2) return null;
  const a = Number(parts[0].replace(",", "."));
  const b = Number(parts[1].replace(",", "."));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return valid(a, b);
}

function valid(lat: number, lon: number): LonLat | null {
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

/** Several lines of "lat lon" pairs → ring. Returns the indices of lines that could not be read. */
export function parseRingText(text: string): { ring: Ring; bad: number[] } {
  const ring: Ring = [];
  const bad: number[] = [];
  text
    .split(/\n+/)
    .map((l) => l.trim())
    .forEach((l, i) => {
      if (!l) return;
      const p = parseLatLon(l);
      if (p) ring.push(p);
      else bad.push(i + 1);
    });
  return { ring, bad };
}

export function bboxOf(ring: Ring): [number, number, number, number] {
  return describeRing(ring).bbox;
}

export function geometryOf(ring: Ring): FieldGeometry {
  return describeRing(ring);
}

function round(v: number, d: number) {
  return Math.round(v * 10 ** d) / 10 ** d;
}
