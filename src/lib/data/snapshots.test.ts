import { describe, expect, it } from "vitest";
import type { ClimateSeries, NdviSeries, SoilProfile } from "@/lib/types";
import {
  addDays,
  compactClimate,
  compactNdvi,
  compactSnapshot,
  expandClimate,
  expandNdvi,
  expandSnapshot,
  matchSnapshotId,
  SCALES,
  DAILY_VARS,
} from "./snapshots";

const src = { name: "t", provider: "t", url: "u", retrievedAt: "2026-01-01T00:00:00Z", spatialResolution: "x" };

function series(n: number): ClimateSeries {
  const daily = Array.from({ length: n }, (_, i) => ({
    date: addDays("2020-02-27", i),
    tmax: i % 7 === 0 ? null : 10 + i * 0.1,
    tmin: 1.2,
    tmean: 5.55,
    rh: 61.3,
    wind2m: 2.34,
    rs: i === 3 ? null : 12.345,
    precip: i % 2 ? 0 : 3.21,
    gwetRoot: 0.41,
    gwetTop: null,
  }));
  return { lat: 37.57, lon: 32.77, elevation: 1197.55, start: daily[0].date, end: daily[n - 1].date, daily, sources: [src] };
}

describe("snapshot compact/expand", () => {
  it("round-trips within quantisation, keeps nulls and dates (incl. leap day)", () => {
    const s = series(30);
    expect(s.daily[2].date).toBe("2020-02-29");
    const c = compactClimate(s);
    const e = expandClimate(s, c);
    expect(e.daily).toHaveLength(30);
    e.daily.forEach((d, i) => {
      expect(d.date).toBe(s.daily[i].date);
      for (const k of DAILY_VARS) {
        const a = s.daily[i][k];
        if (a === null) expect(d[k]).toBeNull();
        else expect(Math.abs((d[k] as number) - a)).toBeLessThanOrEqual(0.5 / SCALES[k] + 1e-9);
      }
    });
    expect(e.sources).toEqual(s.sources);
    expect(c.cols.tmax[0]).toBeNull();
    expect(Number.isInteger(c.cols.rs[0])).toBe(true);
  });

  it("is exactly idempotent after one quantisation (expand -> compact -> expand)", () => {
    const s = series(40);
    const once = expandClimate(s, compactClimate(s));
    const twice = expandClimate(s, compactClimate(once));
    expect(twice.daily).toEqual(once.daily);
  });

  it("rejects non-contiguous series", () => {
    const s = series(5);
    s.daily[3].date = "2021-01-01";
    expect(() => compactClimate(s)).toThrow(/contiguous/);
  });

  it("round-trips NDVI and a full snapshot", () => {
    const ndvi: NdviSeries = {
      lat: 1,
      lon: 2,
      points: [
        { date: "2015-01-01", ndvi: 0.3336 },
        { date: "2015-01-17", ndvi: 0.5 },
      ],
      sources: [src],
    };
    expect(expandNdvi(1, 2, compactNdvi(ndvi))).toEqual(ndvi);
    const soil: SoilProfile = { sand: 30, silt: 40, clay: 30, soc: null, ph: 7, textureClass: "clay loam", origin: "default", sources: [src] };
    const c = compactSnapshot("x", "t", series(10), soil, ndvi, ["n"], { lat: 37.57, lon: 32.77, elevation: null });
    const json = JSON.parse(JSON.stringify(c));
    const e = expandSnapshot(json);
    expect(e.soil).toEqual(soil);
    expect(e.climate!.daily).toHaveLength(10);
    expect(e.notes).toEqual(["n"]);
    expect(c.elevation).toBe(1197.55);
    expect(e.ndvi.points).toEqual(ndvi.points);
  });

  it("matches the nearest snapshot within 0.05 degrees", () => {
    const idx = [
      { id: "a", lat: 37.57, lon: 32.77 },
      { id: "b", lat: 39.58, lon: 32.15 },
    ];
    expect(matchSnapshotId(idx, 37.6, 32.8)).toBe("a");
    expect(matchSnapshotId(idx, 37.57, 32.83)).toBeNull();
    expect(matchSnapshotId(idx, 10, 10)).toBeNull();
  });
});
