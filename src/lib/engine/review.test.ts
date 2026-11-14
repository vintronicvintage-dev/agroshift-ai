// Regression tests for issues found in the independent review (legume successions,
// cyclic max-consecutive, rainfed "budget exceeded", unit conventions, monotonicity).
import { describe, it, expect } from "vitest";
import { analyze } from "./index";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { CROPS, CROP_IDS } from "../crops/database";
import { scheduleSequence } from "../crops/calendar";
import { staticViolations, legumeSuccessions } from "../crops/rules";
import { soilHealth } from "./soilHealth";
import { prepareClimate } from "./climate";
import { soilHydraulics } from "./soil";
import { createSetup, replayWindows } from "./rotation";
import { buildEvalContext, grossMargin } from "./evaluation";
import { dist, percentileSorted } from "./stats";
import type { AnalysisInput, CropId, FieldInput, RotationSequence } from "../types";

const highland = syntheticClimate();
const all = new Set<CropId>(CROP_IDS);
const viol = (seq: RotationSequence) =>
  staticViolations(seq, scheduleSequence(seq, "highland"), new Set(), all).map((v) => v.code);

describe("grain legumes and vetch never follow themselves", () => {
  it("max consecutive is 1 for chickpea, lentil, dry bean, vetch, sugar beet and sunflower", () => {
    for (const id of ["chickpea", "lentil_red", "dry_bean", "vetch", "sugar_beet", "sunflower"] as CropId[]) {
      expect(CROPS[id].maxConsecutive.value).toBe(1);
    }
  });
  it("barley → chickpea → chickpea and barley → vetch → vetch are infeasible", () => {
    expect(viol(["barley_winter", "chickpea", "chickpea"])).toContain("max_consecutive");
    expect(viol(["barley_winter", "vetch", "vetch"])).toContain("max_consecutive");
  });
  it("the cyclic repeat counts: vetch → wheat → vetch puts vetch after vetch in the next cycle", () => {
    expect(viol(["vetch", "wheat_winter", "vetch"])).toContain("max_consecutive");
    // limit-2 crops may still wrap once: W-F-W is allowed
    expect(viol(["wheat_winter", "fallow", "wheat_winter"])).not.toContain("max_consecutive");
  });
  it("legume → legume succession of different crops is penalised and counted cyclically", () => {
    expect(legumeSuccessions(["chickpea", "lentil_red", "wheat_winter"])).toHaveLength(1);
    expect(legumeSuccessions(["lentil_red", "wheat_winter", "chickpea"])).toHaveLength(1); // 3 → 1
    expect(legumeSuccessions(["chickpea", "wheat_winter", "barley_winter"])).toHaveLength(0);
    const sh = (s: RotationSequence) => soilHealth(s, scheduleSequence(s, "highland"));
    const ll = sh(["chickpea", "lentil_red", "wheat_winter"]);
    const lc = sh(["chickpea", "wheat_winter", "lentil_red"]); // still cyclic lentil → chickpea
    const sep = sh(["chickpea", "wheat_winter", "sunflower"]);
    expect(ll.legumeSuccessions).toBe(1);
    const legume = (r: typeof ll) => r.components.find((c) => c.key === "legume")!.value;
    expect(legume(ll)).toBeLessThan(legume(sep));
    expect(lc.legumeSuccessions).toBe(1);
    expect(sep.legumeSuccessions).toBe(0);
  });
  it("optimizer output never contains a legume after the same legume, and legume pairs are flagged for local review", () => {
    const field: FieldInput = {
      areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 250, irrigationEfficiency: 0.7,
      currentRotation: ["chickpea", "lentil_red", "wheat_winter"],
    };
    const r = analyze({ climate: highland, field });
    for (const c of r.candidates) {
      for (let i = 0; i < 3; i++) {
        const a = c.crops[i], b = c.crops[(i + 1) % 3];
        if (CROPS[a].maxConsecutive.value === 1) expect(b).not.toBe(a);
      }
    }
    expect(r.current.explanation.localReview.some((x) => x.key === "review.legumeSuccession")).toBe(true);
    expect(r.current.soilHealth.legumeSuccessions).toBe(1);
  });
});

describe("rainfed plans", () => {
  const field: FieldInput = {
    areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 0, irrigationEfficiency: 0.7,
    currentRotation: ["wheat_winter", "fallow", "wheat_winter"],
  };
  const r = analyze({ climate: highland, field });
  it("never report a budget as exceeded when there is no budget", () => {
    for (const p of [r.current, ...r.alternatives]) {
      expect(p.water.budgetExceededShare).toBe(0);
      expect(p.risk.components.budgetExceeded).toBe(0);
      expect(p.explanation.localReview.some((x) => x.key === "review.budgetYear")).toBe(false);
      expect(p.water.irrigationNetMmPerYr!.p50).toBe(0);
      // unmet deficit equals the full rainfed requirement
      expect(p.water.unmetDeficitMmPerYr!.p50).toBeCloseTo(p.water.requirementMmPerYr!.p50, 6);
    }
  });
});

describe("units, fallow years and monotonicity of economics", () => {
  const clim = prepareClimate(highland, 1, 0);
  const setup = createSetup(clim, soilHydraulics(LOAM_SOIL), "highland");
  const ev = buildEvalContext(setup, replayWindows(clim), 250, 0.5, 2, 1);
  it("t/ha → kg/da is ×100 and net irrigation is charged as gross (÷ efficiency) per m³/da", () => {
    const e = ev.econ.wheat_winter;
    const { margin, yieldTHa } = grossMargin(ev, "wheat_winter", 1, 100);
    expect(yieldTHa).toBe(e.ymTHa);
    // revenue (kg/da × TL/kg) − cost − 100 mm net / 0.5 efficiency × 2 TL/m³
    expect(margin).toBeCloseTo(e.ymTHa * 100 * e.priceTLPerKg - e.varCostTLPerDa - 400, 6);
  });
  it("a fallow year has zero yield and a margin equal to minus its cost", () => {
    const g = grossMargin(ev, "fallow", null, 0);
    expect(g.yieldTHa).toBe(0);
    expect(g.margin).toBe(-CROPS.fallow.varCostTLPerDa.value);
  });
  const run = (over: Partial<AnalysisInput>) => analyze({
    climate: highland,
    field: { areaDa: 10, soil: LOAM_SOIL, irrigationBudgetMm: 200, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "sugar_beet", "barley_winter"] },
    ...over,
  }).current;
  it("margin rises with the price multiplier and falls with the water price", () => {
    const m = (pm: number, wp: number) => run({ scenario: { priceMultiplier: pm }, economics: { waterPriceTLPerM3: wp } }).economics.grossMarginTLPerDaPerYr!.p50;
    expect(m(1.2, 1)).toBeGreaterThan(m(1, 1));
    expect(m(1, 1)).toBeGreaterThan(m(0.8, 1));
    expect(m(1, 5)).toBeLessThan(m(1, 1));
    expect(m(1, 1)).toBeLessThan(m(1, 0));
  });
  it("field total uses the area in decares (3-year sum × da)", () => {
    const p = run({});
    const perDa = p.economics.grossMarginTLPerDaPerYr!;
    const tot = p.economics.fieldTotal3yrTL!;
    expect(tot.mean).toBeCloseTo(perDa.mean * 3 * 10, 3);
  });
  it("gross irrigation = net / efficiency", () => {
    const p = run({});
    expect(p.water.irrigationGrossM3PerDaPerYr!.p50).toBeCloseTo(p.water.irrigationNetMmPerYr!.p50 / 0.7, 6);
  });
});

describe("percentiles", () => {
  it("type-7 percentiles over windows", () => {
    expect(percentileSorted([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentileSorted([1, 2, 3, 4, 5], 0.1)).toBeCloseTo(1.4, 10);
    expect(percentileSorted([1, 2, 3, 4, 5], 0.9)).toBeCloseTo(4.6, 10);
    const d = dist([5, 1, 4, NaN, 2, 3])!;
    expect(d.n).toBe(5);
    expect(d.p50).toBe(3);
  });
});

describe("agricultural-year assignment", () => {
  it("autumn crops are sown in the calendar year before the agricultural year, spring crops in it", () => {
    const s = scheduleSequence(["wheat_winter", "sugar_beet", "chickpea"], "highland");
    // offsets from 1 Oct before rotation year 1
    expect(s.slots[0]!.autumn).toBe(true);
    expect(s.slots[0]!.sowOffset).toBe(9); // 10 Oct, same autumn
    expect(s.slots[1]!.autumn).toBe(false);
    expect(s.slots[1]!.sowOffset).toBeGreaterThan(365); // 1 Apr of rotation year 2 (AY 2: Oct → Sep)
    expect(s.slots[1]!.sowOffset).toBeLessThan(365 + 365);
    // south lowland chickpea sown 1 Dec of the previous calendar year, latest 15 Jan
    const s2 = scheduleSequence(["chickpea", "wheat_winter", "fallow"], "south_lowland");
    expect(s2.slots[0]!.autumn).toBe(true);
    expect(s2.slots[0]!.sowOffset).toBe(61);
    expect(s2.conflictYears).toHaveLength(0);
  });
});
