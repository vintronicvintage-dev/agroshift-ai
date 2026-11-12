import { describe, it, expect } from "vitest";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { prepareClimate, interpolateShortGaps } from "./climate";
import { soilHydraulics } from "./soil";
import { createSetup, replayWindows, simulateWindowExact } from "./rotation";
import { scheduleSequence } from "../crops/calendar";
import type { ClimateSeries, RotationSequence } from "../types";

const series = syntheticClimate();
const soil = soilHydraulics(LOAM_SOIL);

function setupFor(s: ClimateSeries, rain = 1, dT = 0) {
  return createSetup(prepareClimate(s, rain, dT), soil, "highland");
}

const PLANS: RotationSequence[] = [
  ["wheat_winter", "fallow", "wheat_winter"],
  ["sugar_beet", "wheat_winter", "chickpea"],
  ["maize_grain", "sunflower", "barley_winter"],
  ["alfalfa", "vetch", "lentil_red"],
  ["fallow", "fallow", "wheat_winter"],
];

function requirement(setup: ReturnType<typeof setupFor>, plan: RotationSequence, wi: number, budget: number) {
  const w = replayWindows(setup.ctx.clim)[wi];
  const out = simulateWindowExact(setup, scheduleSequence(plan, "highland"), w, budget, 0.5);
  let etc = 0, eta = 0;
  for (const y of out.years) if (y.season) { etc += y.season.etc; eta += y.season.eta; }
  return { out, deficit: etc - eta };
}

describe("water balance — mass conservation (spec §7)", () => {
  it("P + I = ETa + DP + RO + ΔS within ±0.01 mm for every window and plan", () => {
    const setup = setupFor(series);
    const windows = replayWindows(setup.ctx.clim);
    expect(windows.length).toBeGreaterThanOrEqual(20);
    for (const plan of PLANS) {
      const sched = scheduleSequence(plan, "highland");
      for (const budget of [0, 250, 10_000]) {
        for (const w of windows) {
          const o = simulateWindowExact(setup, sched, w, budget);
          expect(Math.abs(o.massBalanceError)).toBeLessThan(0.01);
          expect(o.storageEnd).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });
});

describe("water balance — monotonicity (spec §7)", () => {
  it("less rain never lowers the rainfed water deficit", () => {
    const s1 = setupFor(series, 1), s08 = setupFor(series, 0.8), s06 = setupFor(series, 0.6);
    const n = replayWindows(s1.ctx.clim).length;
    for (const plan of PLANS) {
      for (let wi = 0; wi < n; wi++) {
        const a = requirement(s1, plan, wi, 0).deficit;
        const b = requirement(s08, plan, wi, 0).deficit;
        const c = requirement(s06, plan, wi, 0).deficit;
        expect(b).toBeGreaterThanOrEqual(a - 1e-9);
        expect(c).toBeGreaterThanOrEqual(b - 1e-9);
      }
    }
  });
  it("a smaller irrigation budget never lowers the unmet deficit", () => {
    const s = setupFor(series);
    const n = replayWindows(s.ctx.clim).length;
    for (const plan of PLANS) {
      for (let wi = 0; wi < n; wi++) {
        let prev = -Infinity;
        for (const budget of [1000, 500, 300, 150, 50, 0]) {
          const d = requirement(s, plan, wi, budget).deficit;
          expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
          prev = d;
        }
      }
    }
  });
  it("warming never lowers annual ET0", () => {
    const base = prepareClimate(series, 1, 0);
    let prev = 0;
    for (const dT of [0, 1, 2, 3, 4]) {
      const c = prepareClimate(series, 1, dT);
      let sum = 0;
      for (let i = 0; i < c.n; i++) {
        sum += c.et0[i];
        if (dT > 0) expect(c.et0[i]).toBeGreaterThanOrEqual(prepareClimate(series, 1, dT - 1).et0[i] - 1e-9);
      }
      expect(sum).toBeGreaterThanOrEqual(prev);
      prev = sum;
    }
    expect(base.quality.et0PenmanMonteithDays).toBe(base.n);
  });
});

describe("water balance — budgets", () => {
  it("zero budget applies no irrigation and flags the shortfall", () => {
    const s = setupFor(series);
    const { out } = requirement(s, ["maize_grain", "sugar_beet", "cotton"], 0, 0);
    for (const y of out.years) {
      expect(y.season!.irrigation).toBe(0);
      expect(y.season!.limited).toBe(1);
    }
    expect(out.flux.irrigation).toBe(0);
  });
  it("irrigation never exceeds the annual net budget", () => {
    const s = setupFor(series);
    const { out } = requirement(s, ["maize_grain", "sugar_beet", "maize_grain"], 3, 200);
    for (const y of out.years) expect(y.season!.irrigation).toBeLessThanOrEqual(200 + 1e-9);
  });
  it("a large budget removes almost all stress", () => {
    const s = setupFor(series);
    const { out } = requirement(s, ["maize_grain", "sugar_beet", "maize_grain"], 3, 5000);
    for (const y of out.years) expect(y.yieldRatio!).toBeGreaterThan(0.98);
  });
});

describe("carry-over through fallow", () => {
  it("wheat after fallow starts with more soil water than wheat after wheat", () => {
    const s = setupFor(series);
    const windows = replayWindows(s.ctx.clim);
    let more = 0;
    for (const w of windows) {
      const wfw = simulateWindowExact(s, scheduleSequence(["wheat_winter", "fallow", "wheat_winter"], "highland"), w, 0, 0.5);
      const wbw = simulateWindowExact(s, scheduleSequence(["wheat_winter", "barley_winter", "wheat_winter"], "highland"), w, 0, 0.5);
      if (wfw.years[2].season!.awAtSow > wbw.years[2].season!.awAtSow) more++;
    }
    expect(more).toBe(windows.length);
  });
});

describe("missing data is never invented (spec §3, §7)", () => {
  it("interpolates only interior gaps of ≤ 3 days", () => {
    const a = new Float64Array([1, NaN, NaN, 4, NaN, NaN, NaN, NaN, 9, NaN]);
    const filled = interpolateShortGaps(a);
    expect(filled).toBe(2);
    expect(a[1]).toBeCloseTo(2);
    expect(a[2]).toBeCloseTo(3);
    expect(Number.isNaN(a[4])).toBe(true);
    expect(Number.isNaN(a[9])).toBe(true);
  });
  it("a long precipitation gap removes the affected windows and is reported", () => {
    const s = syntheticClimate();
    const gappy: ClimateSeries = {
      ...s,
      daily: s.daily.map((d) => (d.date >= "2010-03-01" && d.date <= "2010-03-10") || d.date === "2012-05-05" || d.date === "2012-05-06"
        ? { ...d, precip: null } : d),
    };
    const full = prepareClimate(s);
    const c = prepareClimate(gappy);
    expect(c.quality.interpolatedDays.precip).toBe(2);
    expect(c.quality.missingDays.precip).toBe(10);
    const wFull = replayWindows(full).map((w) => w.firstAy);
    const wGap = replayWindows(c).map((w) => w.firstAy);
    // AY 2010 (Oct 2009–Sep 2010) is unusable → windows starting 2008, 2009, 2010 disappear
    for (const y of [2008, 2009, 2010]) {
      expect(wFull).toContain(y);
      expect(wGap).not.toContain(y);
    }
    expect(wGap.length).toBe(wFull.length - 3);
  });
  it("missing radiation falls back to Hargreaves, and is counted", () => {
    const s = syntheticClimate({ startYear: 2001, endYear: 2003 });
    const noRs: ClimateSeries = { ...s, daily: s.daily.map((d, i) => (i % 50 === 0 && i > 0 ? { ...d, rs: null, rh: null } : d)) };
    // isolated 1-day gaps are interpolated, so make a 5-day gap
    const longGap: ClimateSeries = { ...s, daily: s.daily.map((d) => (d.date >= "2002-06-01" && d.date <= "2002-06-05" ? { ...d, rs: null } : d)) };
    expect(prepareClimate(noRs).quality.et0HargreavesDays).toBe(0);
    const c = prepareClimate(longGap);
    expect(c.quality.et0HargreavesDays).toBe(5);
    expect(c.quality.missingDays.rs).toBe(5);
  });
});
