// Engine v2 follow-up: land-use intensity, water productivity and legume yield ceilings.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expandSnapshot, type CompactSnapshot } from "../data/snapshots";
import { analyze, evaluateCustomPlan } from "./index";
import { CROPS } from "../crops/database";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import type { AnalysisInput, PlanResult } from "../types";

const konya = expandSnapshot(JSON.parse(readFileSync(join(__dirname, "..", "..", "data", "snapshots", "konya-cumra.json"), "utf8")) as CompactSnapshot);
const fallows = (p: PlanResult) => p.crops.filter((c) => c === "fallow").length;
const konyaInput = (budget: number, priorities?: AnalysisInput["field"]["priorities"], options?: AnalysisInput["options"]): AnalysisInput => ({
  climate: konya.climate!, precipCheck: konya.precipCheck ?? undefined,
  field: { areaDa: 100, soil: konya.soil, irrigationBudgetMm: budget, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "fallow", "wheat_winter"], soilLayers: konya.soilLayers ?? undefined, terrain: konya.terrain ?? undefined, priorities },
  options: { robust: true, sensitivity: false, ...options },
});
const recommended = (r: ReturnType<typeof analyze>) => [...r.alternatives, ...(r.robustBest ? [r.robustBest] : [])];

describe("land-use intensity (real Konya snapshot)", () => {
  for (const budget of [0, 300]) {
    it(`equal priorities, budget ${budget} mm: no recommended, robust or knee plan has two fallow years`, () => {
      const r = analyze(konyaInput(budget));
      for (const p of recommended(r)) expect(fallows(p)).toBeLessThanOrEqual(1);
      const knee = r.candidates.find((c) => c.id === r.kneeId);
      if (knee) expect(knee.crops.filter((c) => c === "fallow").length).toBeLessThanOrEqual(1);
      expect(r.landUse!.maxFallowYears).toBeLessThanOrEqual(1);
    });
  }
  it("raising the water priority alone never brings a two-fallow plan into the recommendations", () => {
    for (const w of [0.25, 0.5, 1, 3, 10]) {
      const r = analyze(konyaInput(0, { water: w, income: 0.25, soil: 0.25, risk: 0.25 }));
      for (const p of recommended(r)) expect(fallows(p)).toBeLessThanOrEqual(1);
    }
  });
  it("the dryland water balance justifies one fallow year at Konya rainfed; irrigation removes the justification", () => {
    const rf = analyze(konyaInput(0));
    expect(rf.landUse!.fallowStorageGainMm).toBeGreaterThan(0);
    expect(rf.landUse!.fallowJustified).toBe(true);
    expect(rf.landUse!.maxFallowYears).toBe(1);
    const ir = analyze(konyaInput(300));
    expect(ir.landUse!.fallowJustified).toBe(false);
    expect(ir.landUse!.maxFallowYears).toBe(0);
    for (const p of recommended(ir)) expect(fallows(p)).toBe(0);
  });
  it("maxFallowYears is configurable", () => {
    const r = analyze(konyaInput(0, undefined, { maxFallowYears: 2 }));
    expect(r.landUse!.maxFallowYears).toBe(2);
    expect(r.landUse!.source).toBe("option");
  });
  it("a custom plan with two fallows is evaluated and carries a clear warning, not an error", () => {
    const c = evaluateCustomPlan(konyaInput(0), ["vetch", "fallow", "fallow"]);
    expect(c.plan.windows!.length).toBeGreaterThan(10);
    const m = c.messages.find((x) => x.code === "fallow_heavy");
    expect(m).toBeTruthy();
    expect(m!.kind).toBe("warning");
    expect(m!.text.tr).toMatch(/nadas/i);
  });
});

describe("water productivity and the whole-cycle income objective", () => {
  const r = analyze({ climate: syntheticClimate(), field: { areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 0, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "fallow", "wheat_winter"] }, options: { maxFallowYears: 3 } });
  it("fallow years count with zero revenue and their cost in the yearly margin", () => {
    const p = r.current;
    const w = p.windows![0];
    const fallowMargin = p.years[1].grossMarginTLPerDa!.p50;
    expect(fallowMargin).toBeCloseTo(-CROPS.fallow.varCostTLPerDa.value, 6);
    expect(p.years[1].yieldTHa).toBeNull();
    expect(Number.isFinite(w.marginTLPerDaPerYr)).toBe(true);
  });
  it("water productivity is reported and is lower for a fallow-heavy plan than for its cropped counterpart", () => {
    const user = analyze({ climate: syntheticClimate(), field: { areaDa: 50, soil: LOAM_SOIL, irrigationBudgetMm: 0, irrigationEfficiency: 0.7, currentRotation: ["wheat_winter", "fallow", "fallow"] }, options: { extraPlans: [["wheat_winter", "chickpea", "barley_winter"]], maxFallowYears: 3 } });
    const ff = user.current.waterProductivity!, cr = user.userPlans[0].waterProductivity!;
    expect(ff.revenueTLPerM3.p50).toBeLessThan(cr.revenueTLPerM3.p50);
    expect(cr.deficitM3Per1000TL.p50).toBeGreaterThan(0);
  });
});

describe("legume yield ceiling (no double-counted management gap)", () => {
  it("rainfed ceiling of chickpea and lentil equals the irrigated reference", () => {
    for (const id of ["chickpea", "lentil_red"] as const) expect(CROPS[id].rainfedCeilingTHa!.value).toBe(CROPS[id].refYieldTHa.value.irrigated);
  });
});
