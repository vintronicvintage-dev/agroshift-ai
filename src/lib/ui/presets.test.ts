import { describe, expect, it } from "vitest";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { DEFAULT_FIELD } from "./fieldState";
import {
  BUDGET_SLIDER,
  IRRIGATION_LEVELS,
  PRIORITY_PRESETS,
  budgetForLevel,
  irrigationLevelFor,
  priorityPresetFor,
  prioritySharesOf,
  weightsForPreset,
} from "./presets";
import { composeVerdict, deltaTone, planMetrics } from "./verdict";

describe("irrigation levels", () => {
  it("are ordered, distinct and inside the slider range", () => {
    const b = IRRIGATION_LEVELS.map((l) => l.budgetM3PerDa);
    expect(b).toEqual([...b].sort((x, y) => x - y));
    expect(new Set(b).size).toBe(b.length);
    for (const v of b) {
      expect(v).toBeGreaterThan(BUDGET_SLIDER.min);
      expect(v).toBeLessThanOrEqual(BUDGET_SLIDER.max);
      expect(v % BUDGET_SLIDER.step).toBe(0);
    }
  });
  it("map to and from a budget", () => {
    for (const l of IRRIGATION_LEVELS) expect(irrigationLevelFor(budgetForLevel(l.id))).toBe(l.id);
    expect(irrigationLevelFor(260)).toBeNull();
    expect(irrigationLevelFor(null)).toBeNull();
  });
  it("the default field budget is the moderate level", () => {
    expect(irrigationLevelFor(Number(DEFAULT_FIELD.budget))).toBe("moderate");
  });
});

describe("priority presets", () => {
  it("emphasise their own priority with the largest share", () => {
    for (const id of ["water", "income", "soil"] as const) {
      const s = prioritySharesOf(weightsForPreset(id));
      for (const k of ["water", "income", "soil", "risk"] as const) if (k !== id) expect(s[id]).toBeGreaterThan(s[k]);
      expect(s[id]).toBeCloseTo(0.5, 10);
    }
    const bal = prioritySharesOf(weightsForPreset("balanced"));
    expect(Object.values(bal)).toEqual([0.25, 0.25, 0.25, 0.25]);
  });
  it("shares sum to 1 and all-zero weights fall back to equal", () => {
    for (const p of PRIORITY_PRESETS) {
      const s = prioritySharesOf(p.weights);
      expect(s.water + s.income + s.soil + s.risk).toBeCloseTo(1, 12);
    }
    expect(prioritySharesOf({ water: 0, income: 0, soil: 0, risk: 0 }).water).toBe(0.25);
  });
  it("are recognised after normalisation, custom weights are not", () => {
    for (const p of PRIORITY_PRESETS) expect(priorityPresetFor(p.weights)).toBe(p.id);
    expect(priorityPresetFor({ water: 3, income: 1, soil: 1, risk: 1 })).toBe("water");
    expect(priorityPresetFor({ water: 9, income: 1, soil: 4, risk: 0 })).toBeNull();
    expect(priorityPresetFor(DEFAULT_FIELD.priorities)).toBe("balanced");
  });
  it("returns a copy, so editing the draft cannot change the preset", () => {
    const w = weightsForPreset("water");
    w.water = 0;
    expect(weightsForPreset("water").water).toBe(6);
  });
});

// TEST FIXTURE: minimal synthetic plans, not engine output.
function plan(kind: PlanResult["kind"], composite: number, deficit: number, margin: number, soil: number, rank: number | null = null): PlanResult {
  const d = (v: number) => ({ p10: v, p50: v, p90: v, mean: v, n: 20 });
  return {
    id: `${kind}-${composite}`,
    kind,
    rank,
    crops: ["wheat_winter", "fallow", "wheat_winter"],
    score: { composite, components: { water: 0, income: 0, soil: 0, risk: 0 }, weights: { water: 1, income: 1, soil: 1, risk: 1 } },
    water: { requirementMmPerYr: d(deficit), budgetExceededShare: 0.1 } as PlanResult["water"],
    economics: { label: "scenario", grossMarginTLPerDaPerYr: d(margin), fieldTotal3yrTL: null },
    soilHealth: { score: soil } as PlanResult["soilHealth"],
    risk: { score: 0.2 } as PlanResult["risk"],
  } as PlanResult;
}

describe("composeVerdict", () => {
  it("picks the highest fit score and reports differences to the current plan", () => {
    const cur = plan("current", 40, 300, 1000, 50);
    const a = plan("recommended", 80, 250, 1300, 70, 1);
    const b = plan("recommended", 60, 200, 900, 60, 2);
    const v = composeVerdict({ current: cur, alternatives: [a, b], userPlans: [plan("user", 99, 0, 0, 0)] } as unknown as AnalysisResult);
    expect(v.best).toBe(a);
    expect(v.bestIsCurrent).toBe(false);
    expect(v.deficitDelta).toBe(-50);
    expect(v.marginDelta).toBe(300);
    expect(v.soilDelta).toBe(20);
  });
  it("can conclude that the current plan is best", () => {
    const cur = plan("current", 90, 300, 1000, 50);
    const v = composeVerdict({ current: cur, alternatives: [plan("recommended", 70, 250, 1300, 70, 1)], userPlans: [] } as unknown as AnalysisResult);
    expect(v.bestIsCurrent).toBe(true);
    expect(v.deficitDelta).toBe(0);
  });
  it("tone follows the metric direction", () => {
    expect(deltaTone("deficit", -20, 1)).toBe("better");
    expect(deltaTone("margin", -20, 1)).toBe("worse");
    expect(deltaTone("soil", 0.4, 1)).toBe("same");
    expect(deltaTone("risk", null, 0.01)).toBeNull();
    expect(planMetrics(plan("current", 1, 5, 6, 7)).margin).toBe(6);
  });
});
