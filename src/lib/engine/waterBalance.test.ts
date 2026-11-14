import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { prepareClimate, interpolateShortGaps } from "./climate";
import { soilHydraulics } from "./soil";
import { createSetup, deriveInitialMoisture, INITIAL_MOISTURE_LOOKBACK_DAYS, replayWindows, simulatePlanChain, simulateWindowExact } from "./rotation";
import { DEGREE_DAY_MELT_MM_PER_C_DAY, stepSnow } from "./waterBalance";
import { analyze } from "./index";
import { expandSnapshot, type CompactSnapshot } from "../data/snapshots";
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

describe("degree-day snow accumulation and melt (Cm = 2.8 mm/°C/day)", () => {
  it("accumulates SWE when T_mean < 0 °C, melts at Cm = 2.8 mm/°C/day when T_mean > 0 °C, and conserves snow mass", () => {
    // Day 1: T_mean = -3 °C, 12 mm precipitation → all stored as SWE
    const d1 = stepSnow(12, -3, 0);
    expect(d1.sweMm).toBeCloseTo(12, 9);
    expect(d1.liquidMm).toBe(0);
    expect(d1.meltMm).toBe(0);

    // Day 2: T_mean = -1.5 °C, 8 mm precipitation → SWE = 20 mm
    const d2 = stepSnow(8, -1.5, d1.sweMm);
    expect(d2.sweMm).toBeCloseTo(20, 9);
    expect(d2.liquidMm).toBe(0);

    // Day 3: T_mean = +3 °C, 2 mm rain → melt = 2.8 × 3 = 8.4 mm, liquid = 10.4 mm, remaining SWE = 11.6 mm
    const d3 = stepSnow(2, 3, d2.sweMm);
    expect(d3.meltMm).toBeCloseTo(3 * DEGREE_DAY_MELT_MM_PER_C_DAY, 9);
    expect(d3.sweMm).toBeCloseTo(20 - 8.4, 9);
    expect(d3.liquidMm).toBeCloseTo(2 + 8.4, 9);

    // Day 4: T_mean = +6 °C, 0 mm rain → potential melt 16.8 > 11.6 → all remaining SWE melts
    const d4 = stepSnow(0, 6, d3.sweMm);
    expect(d4.meltMm).toBeCloseTo(11.6, 9);
    expect(d4.sweMm).toBeCloseTo(0, 9);
    expect(d4.liquidMm).toBeCloseTo(11.6, 9);

    // Total liquid released equals total precipitation (12 + 8 + 2 = 22 mm)
    const totalPrecip = 12 + 8 + 2 + 0;
    const totalLiquid = d1.liquidMm + d2.liquidMm + d3.liquidMm + d4.liquidMm;
    expect(Math.abs(totalPrecip - totalLiquid - d4.sweMm)).toBeLessThan(0.01);
  });

  it("improves winter moisture carry-over and spring-sown dryland chickpea yield in Central Anatolia (Konya-Çumra & Ankara-Polatlı) while preserving ±0.01 mm mass balance", () => {
    const loadSnap = (id: string) =>
      expandSnapshot(JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "snapshots", `${id}.json`), "utf8")) as CompactSnapshot);
    for (const id of ["konya-cumra", "polatli-ankara"]) {
      const snap = loadSnap(id);
      const clim = prepareClimate(snap.climate!, 1, 0);
      const sHyd = soilHydraulics(snap.soil, snap.soilLayers ?? undefined, snap.terrain?.slopePct ?? null);
      const setupSnow = createSetup(clim, sHyd, "highland");
      const setupNoSnow = createSetup(clim, sHyd, "highland");
      setupNoSnow.ctx.snowMeltFactor = 0;

      const windows = replayWindows(clim);
      const sched = scheduleSequence(["wheat_winter", "chickpea", "barley_winter"], "highland");
      const w0 = windows.map((w) => deriveInitialMoisture(setupSnow.ctx, sHyd, w.startIdx).wetness);

      const chainSnow = simulatePlanChain(setupSnow, sched, windows, 0, w0);
      const chainNoSnow = simulatePlanChain(setupNoSnow, sched, windows, 0, w0);

      let sumAwSnow = 0, sumAwNoSnow = 0;
      let sumRatioSnow = 0, sumRatioNoSnow = 0;
      let snowWindows = 0;
      for (let i = 0; i < windows.length; i++) {
        const os = chainSnow[i], on = chainNoSnow[i];
        if (!os || !on) continue;
        expect(Math.abs(os.massBalanceError)).toBeLessThan(0.01);
        expect(Math.abs(on.massBalanceError)).toBeLessThan(0.01);
        if ((os.flux.snowMelt ?? 0) > 0) snowWindows++;
        sumAwSnow += os.years[1].season!.awAtSow;
        sumAwNoSnow += on.years[1].season!.awAtSow;
        sumRatioSnow += os.years[1].yieldRatio!;
        sumRatioNoSnow += on.years[1].yieldRatio!;
      }
      expect(snowWindows).toBeGreaterThan(0);
      // Snow storage over winter and spring thaw increases soil moisture at spring chickpea sowing and improves yield ratio
      expect(sumAwSnow).toBeGreaterThan(sumAwNoSnow);
      expect(sumRatioSnow).toBeGreaterThanOrEqual(sumRatioNoSnow);
    }
  });
});

describe("dynamic initial soil moisture (θ₀) from 60-day antecedent balance & SMAP/MERRA-2", () => {
  it("derives θ₀ from the preceding 60-day NASA POWER P − ET₀ balance and tags metadata as derived / literature", () => {
    const wet60: ClimateSeries = {
      ...series,
      daily: series.daily.map((d) =>
        d.date >= "2004-08-02" && d.date <= "2004-09-30" ? { ...d, precip: 8, gwetRoot: null } : { ...d, gwetRoot: null },
      ),
    };
    const dry60: ClimateSeries = {
      ...series,
      daily: series.daily.map((d) =>
        d.date >= "2004-08-02" && d.date <= "2004-09-30" ? { ...d, precip: 0, gwetRoot: null } : { ...d, gwetRoot: null },
      ),
    };
    const setupWet = setupFor(wet60);
    const setupDry = setupFor(dry60);
    const winWet = replayWindows(setupWet.ctx.clim).find((w) => w.firstAy === 2005)!;
    const winDry = replayWindows(setupDry.ctx.clim).find((w) => w.firstAy === 2005)!;

    const estWet = deriveInitialMoisture(setupWet.ctx, soil, winWet.startIdx);
    const estDry = deriveInitialMoisture(setupDry.ctx, soil, winDry.startIdx);

    expect(estWet.lookbackDays).toBe(INITIAL_MOISTURE_LOOKBACK_DAYS);
    expect(estWet.method).toBe("balance_60d");
    expect(estWet.confidence).toBe("derived");
    expect(estWet.theta0M3M3).toBeGreaterThan(estDry.theta0M3M3);
    expect(estWet.wetness).toBeGreaterThan(estDry.wetness);

    // With GWETROOT present, combines 60-day balance + root-zone wetness and tags as derived
    const setupBoth = setupFor(series);
    const winBoth = replayWindows(setupBoth.ctx.clim).find((w) => w.firstAy === 2005)!;
    const estBoth = deriveInitialMoisture(setupBoth.ctx, soil, winBoth.startIdx);
    expect(estBoth.method).toBe("smap_and_balance_60d");
    expect(estBoth.confidence).toBe("derived");

    // Full analyze exposes literature tag on snow and derived tag on soil.initial
    const res = analyze({
      climate: series,
      field: { areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 0, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "chickpea", "barley_winter"] },
      options: { robust: false, sensitivity: false },
    });
    const snowMeta = res.assumptions.find((a) => a.key === "snow")!;
    const initMeta = res.assumptions.find((a) => a.key === "soil.initial")!;
    expect(snowMeta.confidence).toBe("literature");
    expect(snowMeta.value).toContain("2.8");
    expect(initMeta.confidence).toBe("derived");
    expect(res.soil.initialMoisture?.confidence).toBe("derived");
    expect(res.soil.initialMoisture?.lookbackDays).toBe(60);
  });
});
