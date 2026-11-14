import { describe, expect, it } from "vitest";
import type { SoilLayer } from "@/lib/types";
import { areaBucket, parseFieldBody } from "./field";
import {
  centroid,
  describeRing,
  GeometryError,
  isSelfIntersecting,
  metresPerDegree,
  parsePolygon,
  pointInPolygon,
  ringAreaM2,
  ringPerimeterM,
  type Ring,
} from "./geometry";
import { buildPrecipCrossCheck } from "./precip";
import { layersToProfile, sgToLayers } from "./soillayers";
import { compactSnapshot, expandSnapshot } from "./snapshots";
import { createPoliteQueue, gradientAt, polygonGrid, pointGrid, terrainStats } from "./terrain";
import { liveDefaultDate, resolveTileUrl, TILE_SOURCES } from "./tiles";
import { cacheGet, cacheSet, singleflight } from "./cache";
import { POST as postField } from "@/app/api/field/route";

function square(lat: number, lon: number, sideM: number): Ring {
  const k = metresPerDegree(lat);
  const dy = sideM / 2 / k.lat;
  const dx = sideM / 2 / k.lon;
  return [
    { lon: lon - dx, lat: lat - dy },
    { lon: lon + dx, lat: lat - dy },
    { lon: lon + dx, lat: lat + dy },
    { lon: lon - dx, lat: lat + dy },
  ];
}

describe("geometry", () => {
  it("1 km x 1 km square near 38N is 100 ha within 0.5 %", () => {
    const r = square(38, 32, 1000);
    const ha = ringAreaM2(r) / 10_000;
    expect(Math.abs(ha - 100) / 100).toBeLessThan(0.005);
    expect(Math.abs(ringPerimeterM(r) - 4000)).toBeLessThan(10);
  });
  it("reports dekar and hectares consistently, centroid at the centre", () => {
    const g = describeRing(square(37.57, 32.77, 500));
    expect(g.areaDa).toBeCloseTo(g.areaM2 / 1000, 1);
    expect(g.areaHa).toBeCloseTo(g.areaM2 / 10_000, 2);
    expect(g.centroid.lat).toBeCloseTo(37.57, 5);
    expect(g.centroid.lon).toBeCloseTo(32.77, 5);
    expect(g.bbox[0]).toBeLessThan(g.bbox[2]);
  });
  it("centroid of an L shape is area weighted", () => {
    const k = metresPerDegree(40);
    const p = (x: number, y: number) => ({ lon: 30 + x / k.lon, lat: 40 + y / k.lat });
    const c = centroid([p(0, 0), p(200, 0), p(200, 100), p(100, 100), p(100, 200), p(0, 200)]);
    expect((c.lon - 30) * k.lon).toBeCloseTo(83.33, 0);
    expect((c.lat - 40) * k.lat).toBeCloseTo(83.33, 0);
  });
  it("point in polygon", () => {
    const r = square(38, 32, 1000);
    expect(pointInPolygon({ lon: 32, lat: 38 }, r)).toBe(true);
    expect(pointInPolygon({ lon: 32.1, lat: 38 }, r)).toBe(false);
  });
  it("detects a bow-tie", () => {
    const r = square(38, 32, 1000);
    expect(isSelfIntersecting(r)).toBe(false);
    expect(isSelfIntersecting([r[0], r[2], r[1], r[3]])).toBe(true);
  });
  it("validates GeoJSON input", () => {
    const r = square(38, 32, 1000);
    const ring = [...r, r[0]].map((p) => [p.lon, p.lat]);
    expect(parsePolygon({ type: "Polygon", coordinates: [ring] })).toHaveLength(4);
    expect(() => parsePolygon({ type: "Point", coordinates: [1, 2] })).toThrow(GeometryError);
    const tiny = [...square(38, 32, 20), square(38, 32, 20)[0]].map((p) => [p.lon, p.lat]);
    expect(() => parsePolygon({ type: "Polygon", coordinates: [tiny] })).toThrow(/minimum/);
    const huge = [...square(38, 32, 20_000), square(38, 32, 20_000)[0]].map((p) => [p.lon, p.lat]);
    expect(() => parsePolygon({ type: "Polygon", coordinates: [huge] })).toThrow(/maximum/);
    const many = Array.from({ length: 205 }, (_, i) => [32 + 0.001 * Math.cos(i), 38 + 0.001 * Math.sin(i)]);
    expect(() => parsePolygon({ type: "Polygon", coordinates: [many] })).toThrow(/200/);
    expect(() => parsePolygon({ type: "Polygon", coordinates: [[[200, 0], [1, 1], [2, 2], [200, 0]]] })).toThrow(/Longitude/);
  });
  it("parses request bodies", () => {
    expect(parseFieldBody({ lat: 37.5, lon: 32.7 }).point).toEqual({ lat: 37.5, lon: 32.7 });
    expect(() => parseFieldBody({ lat: "x", lon: 1 })).toThrow();
    expect(() => parseFieldBody({ lat: 91, lon: 1 })).toThrow();
    expect(() => parseFieldBody(null)).toThrow();
    expect(areaBucket(100)).not.toBe(areaBucket(1000));
  });
});

describe("terrain", () => {
  it("recovers slope and aspect of a synthetic plane", () => {
    const grid = pointGrid({ lat: 38, lon: 32 });
    const k = metresPerDegree(38);
    // plane rising 10 % to the east: faces west (270)
    const z = grid.points.map((p) => 1000 + 0.1 * (p.lon - 32) * k.lon);
    const g = gradientAt(grid, z, 1, 1)!;
    expect(g.slopePct).toBeCloseTo(10, 3);
    expect(g.aspectDeg).toBeCloseTo(270, 3);
    const s = terrainStats(grid, z)!;
    expect(s.slopePct).toBeCloseTo(10, 1);
    expect(s.aspectDeg).toBeCloseTo(270, 0);
    expect(s.samples).toBe(9);
    // plane rising to the north: faces south (180), 5 %
    const zn = grid.points.map((p) => 500 + 0.05 * (p.lat - 38) * k.lat);
    const sn = terrainStats(grid, zn)!;
    expect(sn.slopePct).toBeCloseTo(5, 1);
    expect(sn.aspectDeg).toBeCloseTo(180, 0);
  });
  it("flat terrain has no aspect; polygon grid has at most 49 points", () => {
    const grid = polygonGrid(square(38, 32, 3000));
    expect(grid.points.length).toBeLessThanOrEqual(49);
    const s = terrainStats(grid, grid.points.map(() => 800))!;
    expect(s.slopePct).toBe(0);
    expect(s.aspectDeg).toBeNull();
    expect(s.elevationMin).toBe(800);
  });
  it("clips statistics to the polygon", () => {
    const ring = square(38, 32, 2000);
    const grid = polygonGrid(ring);
    const s = terrainStats(grid, grid.points.map((_, i) => i), ring)!;
    expect(s.samples).toBeLessThanOrEqual(grid.points.length);
  });
});

describe("SoilGrids layers", () => {
  const labels = ["0-5cm", "5-15cm", "15-30cm", "30-60cm", "60-100cm", "100-200cm"];
  const mk = (name: string, v: number, d?: number) => ({
    name,
    ...(d ? { unit_measure: { d_factor: d } } : {}),
    depths: labels.map((label, i) => ({ label, values: { mean: v + i } })),
  });
  it("applies the documented d_factors", () => {
    const L = sgToLayers({
      properties: {
        layers: [mk("sand", 300), mk("silt", 400), mk("clay", 300), mk("soc", 120), mk("phh2o", 76), mk("cec", 250), mk("nitrogen", 150), mk("bdod", 130), mk("cfvo", 80), mk("wv0033", 298), mk("wv1500", 187)],
      },
    })!;
    expect(L).toHaveLength(6);
    expect(L[0]).toMatchObject({ top: 0, bottom: 5, sand: 30, silt: 40, clay: 30, soc: 12, ph: 7.6, cec: 25, nitrogen: 1.5, bulkDensity: 1.3, coarseFragments: 8, thetaFC: 0.298, thetaWP: 0.187 });
    expect(L[5]).toMatchObject({ top: 100, bottom: 200, sand: 30.5, bulkDensity: 1.35 });
  });
  it("prefers the response d_factor and returns null for a masked pixel", () => {
    const L = sgToLayers({ properties: { layers: [mk("sand", 300, 5), mk("silt", 400), mk("clay", 300)] } })!;
    expect(L[0].sand).toBe(60);
    const masked = { properties: { layers: [{ name: "sand", depths: labels.map((label) => ({ label, values: { mean: null } })) }] } };
    expect(sgToLayers(masked)).toBeNull();
    expect(() => sgToLayers({})).toThrow();
  });
  it("derives the 0-30 cm profile weighted 5:10:15", () => {
    const base = { silt: 40, clay: 30, soc: 10, ph: 7, cec: null, nitrogen: null, bulkDensity: null, coarseFragments: null, thetaFC: null, thetaWP: null };
    const layers: SoilLayer[] = [
      { top: 0, bottom: 5, sand: 20, ...base },
      { top: 5, bottom: 15, sand: 30, ...base },
      { top: 15, bottom: 30, sand: 40, ...base },
      { top: 30, bottom: 60, sand: 90, ...base },
    ];
    const p = layersToProfile(layers)!;
    expect(p.sand).toBeCloseTo((20 * 5 + 30 * 10 + 40 * 15) / 30, 1);
  });
});

describe("precipitation cross-check arithmetic", () => {
  const days = (y: number) => {
    const out: string[] = [];
    for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 86_400_000) out.push(new Date(t).toISOString().slice(0, 10));
    return out;
  };
  it("computes annual and monthly ratios over complete common years only", () => {
    const power: { date: string; precip: number | null }[] = [];
    const ref = { dates: [] as string[], values: [] as (number | null)[] };
    for (const y of [2001, 2002, 2003, 2004]) {
      for (const d of days(y)) {
        power.push({ date: d, precip: y === 2004 && d === "2004-05-05" ? null : 1 });
        ref.dates.push(d);
        ref.values.push(0.5);
      }
    }
    const c = buildPrecipCrossCheck(power, ref, "era5", [])!;
    expect(c.years).toEqual([2001, 2002, 2003]); // 2004 has a null day
    expect(c.powerAnnual).toEqual([365, 365, 365]);
    expect(c.referenceAnnual).toEqual([182.5, 182.5, 182.5]);
    expect(c.annualRatio).toBe(0.5);
    expect(c.monthlyRatio).toHaveLength(12);
    c.monthlyRatio.forEach((r) => expect(r).toBe(0.5));
  });
  it("returns null with fewer than 3 complete years", () => {
    const power = days(2001).map((date) => ({ date, precip: 1 }));
    expect(buildPrecipCrossCheck(power, { dates: days(2001), values: days(2001).map(() => 1) }, "era5", [])).toBeNull();
  });
});

describe("snapshot extras round-trip", () => {
  it("keeps the new fields and stays backward compatible", () => {
    const src = { name: "t", provider: "t", url: "u", retrievedAt: "x", spatialResolution: "x" };
    const soil = { sand: 30, silt: 40, clay: 30, soc: 10, ph: 7, textureClass: "clay loam", origin: "soilgrids" as const, sources: [src] };
    const ndvi = { lat: 1, lon: 2, points: [{ date: "2015-01-01", ndvi: 0.3 }], sources: [src] };
    const meta = { lat: 1, lon: 2, elevation: 5 };
    const old = expandSnapshot(JSON.parse(JSON.stringify(compactSnapshot("a", "t", null, soil, ndvi, [], meta))));
    expect(old.soilLayers).toBeUndefined();
    const terrain = { elevationMean: 1015, elevationMin: 1010, elevationMax: 1020, slopePct: 0.4, aspectDeg: null, samples: 9, sources: [src] };
    const withX = compactSnapshot("a", "t", null, soil, ndvi, [], meta, undefined, { soilLayers: null, wrb: "Calcisols", terrain, precipCheck: null, extrasNotes: ["n"] });
    const e = expandSnapshot(JSON.parse(JSON.stringify(withX)));
    expect(e.terrain).toEqual(terrain);
    expect(e.wrb).toBe("Calcisols");
    expect(e.soilLayers).toBeNull();
    expect(e.extrasNotes).toEqual(["n"]);
  });
});

describe("tile registry", () => {
  it("has unique ids and resolvable templates", () => {
    const ids = TILE_SOURCES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TILE_SOURCES) {
      const u = resolveTileUrl(t, 3, 4, 5);
      expect(u).not.toMatch(/[{}]/);
      expect(u.startsWith("https://")).toBe(true);
      if (t.timeEnabled) expect(t.defaultDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const terra = TILE_SOURCES.find((t) => t.id === "gibs-modis-terra-truecolor")!;
    expect(liveDefaultDate(terra, new Date("2026-11-14T10:00:00Z"))).toBe("2026-11-13");
  });
});

describe("server concurrency, atomic cache & DoS guards", () => {
  it("singleflight coalesces concurrent calls for the same key and cleans up after settle", async () => {
    let calls = 0;
    const loader = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 15));
      return { ok: calls };
    };
    const [a, b, c] = await Promise.all([
      singleflight("sf_key_1", loader),
      singleflight("sf_key_1", loader),
      singleflight("sf_key_1", loader),
    ]);
    expect(calls).toBe(1);
    expect(a).toEqual({ ok: 1 });
    expect(b).toEqual({ ok: 1 });
    expect(c).toEqual({ ok: 1 });
    // After settling, a subsequent call runs fresh
    const d = await singleflight("sf_key_1", loader);
    expect(calls).toBe(2);
    expect(d).toEqual({ ok: 2 });
  });

  it("concurrent cacheSet writes on the same key do not collide or corrupt JSON", async () => {
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => cacheSet("test_atomic", 37.55, 32.75, { seq: i, payload: "x".repeat(200) }, "conc")),
    );
    const got = await cacheGet<{ seq: number; payload: string }>("test_atomic", 37.55, 32.75, Date.now(), "conc");
    expect(got).not.toBeNull();
    expect(typeof got?.seq).toBe("number");
    expect(got?.payload.length).toBe(200);
  });

  it("createPoliteQueue rejects immediately when queue depth exceeds maxDepth", async () => {
    const slot = createPoliteQueue(30, 2);
    const p1 = slot(async () => "a");
    const p2 = slot(async () => "b");
    await expect(slot(async () => "c")).rejects.toThrow(/queue full/i);
    await expect(Promise.all([p1, p2])).resolves.toEqual(["a", "b"]);
  });

  it("POST /api/field rejects oversized JSON payloads (> 64 KB) with HTTP 400", async () => {
    const bigBody = JSON.stringify({ lat: 37.57, lon: 32.77, pad: "A".repeat(70_000) });
    const req = new Request("http://localhost/api/field?parts=terrain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: bigBody,
    });
    const res = await postField(req);
    expect(res.status).toBe(400);
  });
});
