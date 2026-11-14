import { describe, expect, it } from "vitest";
import type { Dist, PlanResult } from "@/lib/types";
import { ECONOMIC_RATES, computePlanEconomics } from "./economics";

const distOf = (v: number): Dist => ({ p10: v, p50: v, p90: v, mean: v, n: 10 });

function mockPlan(overrides: Partial<PlanResult> = {}): PlanResult {
  return {
    id: "test-plan",
    crops: ["wheat_winter", "chickpea", "barley_winter"],
    kind: "recommended",
    rank: 1,
    feasible: true,
    violations: [],
    calendar: [],
    score: {
      composite: 80,
      components: { water: 0.8, income: 0.8, soil: 0.8, risk: 0.8 },
      weights: { water: 0.25, income: 0.25, soil: 0.25, risk: 0.25 },
    },
    water: {
      requirementMmPerYr: distOf(200),
      irrigationNetMmPerYr: distOf(100),
      irrigationGrossM3PerDaPerYr: distOf(133),
      unmetDeficitMmPerYr: distOf(0),
      unmetDeficitFieldM3PerYr: distOf(0),
      budgetExceededShare: 0,
      budgetExceededShareByYear: [0, 0, 0],
      deepPercolationMmPerYr: distOf(10),
      runoffMmPerYr: distOf(5),
      massBalanceMaxErrorMm: 0,
    },
    soilHealth: {
      score: 75,
      components: [],
      familyCount: 2,
      sameFamilyPairs: 0,
      legumeYears: 1,
      legumeSuccessions: 0,
      nContributionKgHa: { low: 30, high: 50 },
      bareDaysPerYear: 90,
      rootDepthRangeM: 0.9,
      residueClass: "medium",
    },
    economics: { label: "scenario", grossMarginTLPerDaPerYr: distOf(2000), fieldTotal3yrTL: distOf(60000) },
    risk: {
      score: 0.2,
      components: { budgetExceeded: 0, lowYield: 0, climateStress: 0, marginDownside: 0.2 },
      weights: { budgetExceeded: 0.35, lowYield: 0.25, climateStress: 0.2, marginDownside: 0.2 },
    },
    years: [
      {
        year: 1, cropId: "wheat_winter", yieldRatio: distOf(0.95), yieldTHa: distOf(5.0),
        irrigationNetMm: distOf(120), unmetDeficitMm: distOf(0), budgetExceededShare: 0,
        frostDaysMean: 0, winterKillDaysMean: 0, heatDaysMean: 0, soilWaterAtSowingMm: distOf(80),
        grossMarginTLPerDa: distOf(2000),
      },
      {
        year: 2, cropId: "chickpea", yieldRatio: distOf(0.95), yieldTHa: distOf(1.6),
        irrigationNetMm: distOf(60), unmetDeficitMm: distOf(0), budgetExceededShare: 0,
        frostDaysMean: 0, winterKillDaysMean: 0, heatDaysMean: 0, soilWaterAtSowingMm: distOf(70),
        grossMarginTLPerDa: distOf(2000),
      },
      {
        year: 3, cropId: "barley_winter", yieldRatio: distOf(0.95), yieldTHa: distOf(4.2),
        irrigationNetMm: distOf(120), unmetDeficitMm: distOf(0), budgetExceededShare: 0,
        frostDaysMean: 0, winterKillDaysMean: 0, heatDaysMean: 0, soilWaterAtSowingMm: distOf(80),
        grossMarginTLPerDa: distOf(2000),
      },
    ],
    preCrop: [
      {
        year: 1, cropId: "wheat_winter", prev: "barley_winter", yieldFactor: 0.92,
        nCreditKgHa: { low: 0, high: 0 }, nCostSavingTLPerDa: 0, codes: [],
        note: { tr: "", en: "" }, source: "test", confidence: "assumption",
      },
      {
        year: 2, cropId: "chickpea", prev: "wheat_winter", yieldFactor: 1.0,
        nCreditKgHa: { low: 0, high: 0 }, nCostSavingTLPerDa: 0, codes: [],
        note: { tr: "", en: "" }, source: "test", confidence: "assumption",
      },
      {
        year: 3, cropId: "barley_winter", prev: "chickpea", yieldFactor: 1.12,
        nCreditKgHa: { low: 30, high: 50 }, nCostSavingTLPerDa: 200, codes: [],
        note: { tr: "", en: "" }, source: "test", confidence: "assumption",
      },
    ],
    explanation: { why: [], evidence: [], benefits: [], gaps: [], localReview: [] },
    basis: "exact",
    ...overrides,
  };
}

describe("Economic rates catalog & deterministic net return / water productivity", () => {
  it("contains TMO/regional reference prices for all 6 core crops and Üre/DAP fertilizers", () => {
    for (const id of ["wheat_winter", "barley_winter", "sunflower", "chickpea", "lentil_red", "maize_grain"] as const) {
      expect(ECONOMIC_RATES.crops[id].priceTLPerTon).toBeGreaterThan(0);
      expect(ECONOMIC_RATES.crops[id].priceTLPerKg).toBeCloseTo(ECONOMIC_RATES.crops[id].priceTLPerTon / 1000, 3);
      expect(ECONOMIC_RATES.crops[id].source.length).toBeGreaterThan(3);
      expect(ECONOMIC_RATES.crops[id].date.length).toBeGreaterThan(3);
    }
    expect(ECONOMIC_RATES.fertilizers.urea_46.priceTLPerKg).toBeGreaterThan(0);
    expect(ECONOMIC_RATES.fertilizers.dap_18_46.priceTLPerKg).toBeGreaterThan(0);
  });

  it("computes expected annual net profit (TL/da), legume N saving (TL/da), and water productivity (TL/m³)", () => {
    const res = computePlanEconomics(mockPlan());
    expect(res.expectedAnnualNetProfitTLPerDa).toBeGreaterThan(0);
    // Chickpea -> Barley gives 40 kg N/ha midpoint = 4 kg N/da over 3 years -> ~1.33 kg N/da/yr -> > 50 TL/da/yr
    expect(res.legumeNitrogenSavingTLPerDa).toBeGreaterThan(50);
    expect(res.ureaEquivalentKgPerDaYr).toBeGreaterThan(2.5);
    expect(res.irrigationM3PerDaYr).toBe(100);
    expect(res.waterProductivityTLPerM3).toBeCloseTo(res.expectedAnnualNetProfitTLPerDa / 100, 1);
  });

  it("returns null water productivity for rainfed plans (0 m³ irrigation)", () => {
    const base = mockPlan();
    const rainfed = mockPlan({
      water: {
        ...base.water,
        requirementMmPerYr: distOf(150),
        irrigationNetMmPerYr: distOf(0),
        irrigationGrossM3PerDaPerYr: distOf(0),
        unmetDeficitMmPerYr: distOf(150),
      },
    });
    const res = computePlanEconomics(rainfed);
    expect(res.waterProductivityTLPerM3).toBeNull();
    expect(res.irrigationM3PerDaYr).toBe(0);
  });
});
