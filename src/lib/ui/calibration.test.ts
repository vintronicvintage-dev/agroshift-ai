import { describe, expect, it } from "vitest";
import type { ClimateSeries, DailyWeather } from "@/lib/types";
import { annualPrecipStats, applyPrecipCalibration, calibrationFor, parseStationMm } from "./calibration";

// TEST FIXTURE: synthetic daily series, not real data.
function series(start: string, days: number, precip: (i: number) => number | null): ClimateSeries {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  const daily: DailyWeather[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10),
    tmax: 20, tmin: 10, tmean: 15, rh: 50, wind2m: 2, rs: 15, precip: precip(i), gwetRoot: 0.5, gwetTop: 0.5,
  }));
  return { lat: 0, lon: 0, elevation: 0, start, end: daily.at(-1)!.date, daily, sources: [] };
}

describe("annualPrecipStats", () => {
  it("averages complete calendar years only", () => {
    // 2001 (365 d) at 1 mm/d, 2002 (365 d) at 2 mm/d, then 10 days of 2003 at 100 mm/d (incomplete year)
    const c = series("2001-01-01", 365 + 365 + 10, (i) => (i < 365 ? 1 : i < 730 ? 2 : 100));
    const s = annualPrecipStats(c);
    expect(s.years).toEqual([2001, 2002]);
    expect(s.meanMm).toBeCloseTo((365 + 730) / 2, 9);
  });
  it("drops a year that has a missing day", () => {
    const c = series("2001-01-01", 730, (i) => (i === 400 ? null : 1));
    expect(annualPrecipStats(c).years).toEqual([2001]);
  });
  it("returns null when no year is complete", () => {
    expect(annualPrecipStats(series("2001-03-01", 100, () => 1)).meanMm).toBeNull();
  });
});

describe("calibration", () => {
  const c = series("2004-01-01", 366 + 365, (i) => (i % 5 === 0 ? 5 : i % 7 === 0 ? null : 0));
  it("factor = station / model mean, and the scaled series reproduces the station mean", () => {
    // i % 7 nulls make both years incomplete -> no calibration possible
    expect(calibrationFor(c, 300)).toBeNull();
    const full = series("2004-01-01", 366 + 365, (i) => (i % 5 === 0 ? 5 : 0));
    const cal = calibrationFor(full, 300)!;
    expect(cal.years).toEqual([2004, 2005]);
    expect(cal.factor).toBeCloseTo(300 / cal.modelMeanMm, 12);
    const out = applyPrecipCalibration(full, cal);
    expect(annualPrecipStats(out).meanMm).toBeCloseTo(300, 9);
  });
  it("does not mutate the input, keeps nulls and other variables, and records the source", () => {
    const withNull = series("2001-01-01", 365, (i) => (i === 3 ? null : 2));
    const cal = { mode: "user" as const, stationMeanMm: 100, modelMeanMm: 200, factor: 0.5, years: [2001] };
    const out = applyPrecipCalibration(withNull, cal);
    expect(withNull.daily[0].precip).toBe(2);
    expect(out.daily[0].precip).toBe(1);
    expect(out.daily[3].precip).toBeNull();
    expect(out.daily[0].tmax).toBe(20);
    expect(out.sources.at(-1)!.note).toMatch(/0\.500/);
    expect(withNull.sources).toHaveLength(0);
  });
  it("returns null for missing or invalid station input", () => {
    const full = series("2001-01-01", 365, () => 1);
    expect(calibrationFor(full, null)).toBeNull();
    expect(calibrationFor(full, 0)).toBeNull();
  });
});

describe("parseStationMm", () => {
  it("accepts comma decimals and rejects empty or out-of-range input", () => {
    expect(parseStationMm(" 320,5 ")).toBe(320.5);
    expect(parseStationMm("")).toBeNull();
    expect(parseStationMm("abc")).toBeNull();
    expect(parseStationMm("5")).toBeNull();
    expect(parseStationMm("99999")).toBeNull();
  });
});
