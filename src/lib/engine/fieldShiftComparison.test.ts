import { describe, expect, it } from "vitest";
import { evaluateYearBudgetStatus } from "@/components/tarla/FieldShiftComparison";
import type { YearResult } from "@/lib/types";

describe("FieldShiftComparison — evaluateYearBudgetStatus", () => {
  const sampleWheatYear: YearResult = {
    year: 1,
    cropId: "wheat_winter",
    yieldTHa: { p10: 3.1, p50: 4.5, p90: 5.4, mean: 4.4, n: 22 },
    yieldRatio: { p10: 0.55, p50: 0.78, p90: 0.94, mean: 0.76, n: 22 },
    irrigationNetMm: { p10: 100, p50: 100, p90: 100, mean: 100, n: 22 },
    unmetDeficitMm: { p10: 25, p50: 65, p90: 120, mean: 68, n: 22 },
    soilWaterAtSowingMm: { p10: 65, p50: 95, p90: 130, mean: 96, n: 22 },
    grossMarginTLPerDa: { p10: 1800, p50: 3100, p90: 4200, mean: 3050, n: 22 },
    frostDaysMean: 0,
    winterKillDaysMean: 0,
    heatDaysMean: 4,
    budgetExceededShare: 0.72,
    irrigationIntensity: 0.65,
  };

  it("identifies budget exceedance and explains why in Turkish and English when budget is insufficient", () => {
    const trRes = evaluateYearBudgetStatus(sampleWheatYear, 100, 22, "tr");
    expect(trRes.exceeded).toBe(true);
    expect(trRes.statusBadge).toContain("AŞIM");
    expect(trRes.reasonText).toContain("1. Yıl");
    expect(trRes.reasonText).toContain("100 mm");
    expect(trRes.reasonText).toContain("Kc=");

    const enRes = evaluateYearBudgetStatus(sampleWheatYear, 100, 22, "en");
    expect(enRes.exceeded).toBe(true);
    expect(enRes.statusBadge).toContain("EXCEEDED");
    expect(enRes.reasonText).toContain("Year 1");
    expect(enRes.reasonText).toContain("100 mm");
  });

  it("marks a year as within budget when budgetExceededShare is 0 and deficit is negligible", () => {
    const okYear: YearResult = {
      ...sampleWheatYear,
      year: 2,
      cropId: "chickpea",
      irrigationNetMm: { p10: 45, p50: 75, p90: 110, mean: 76, n: 22 },
      unmetDeficitMm: { p10: 0, p50: 0, p90: 5, mean: 1, n: 22 },
      budgetExceededShare: 0,
    };

    const trOk = evaluateYearBudgetStatus(okYear, 200, 22, "tr");
    expect(trOk.exceeded).toBe(false);
    expect(trOk.statusBadge).toContain("UYGUN");
    expect(trOk.reasonText).toContain("200 mm bütçeyi aşmadan");
  });

  it("handles fallow years cleanly with 0 mm irrigation and no exceedance", () => {
    const fallowYear: YearResult = {
      ...sampleWheatYear,
      year: 2,
      cropId: "fallow",
      irrigationNetMm: null,
      unmetDeficitMm: null,
      budgetExceededShare: 0,
    };
    const res = evaluateYearBudgetStatus(fallowYear, 0, 22, "tr");
    expect(res.exceeded).toBe(false);
    expect(res.irrigatedMm).toBe(0);
    expect(res.statusBadge).toContain("UYGUN");
  });
});
