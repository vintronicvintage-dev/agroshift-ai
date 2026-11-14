import { describe, expect, it } from "vitest";
import tarsimData from "@/data/validation/tarsim_crosscheck.json";
import { v3docTr, v3docEn } from "@/lib/i18n/v3doc";

describe("TARSİM Cross-Check Validation Dataset", () => {
  it("conforms to AGENTS.md metadata standards and mandatory disclaimers", () => {
    const { metadata } = tarsimData;
    expect(metadata.sources.length).toBeGreaterThanOrEqual(3);
    expect(metadata.units.monetary).toBe("TL");
    expect(metadata.units.precipitation).toBe("mm");
    expect(metadata.units.yieldLoss).toBe("%");
    expect(metadata.agriculturalYearConvention).toMatch(/1 Ekim/);
    expect(metadata.soilGridsDisclaimer).toMatch(/SoilGrids ve uydu toprak verileri model kestirimlerine dayanmaktadır/);
  });

  it("contains complete national drought timeline with the historic 2021 surge", () => {
    const { nationalDroughtLossTimeline, summary } = tarsimData;
    expect(nationalDroughtLossTimeline).toHaveLength(4);
    const y2021 = nationalDroughtLossTimeline.find((x) => x.year === 2021);
    expect(y2021).toBeDefined();
    expect(y2021!.growthRatePct).toBeCloseTo(3164.2, 1);
    expect(y2021!.droughtIndemnityPaidTl).toBeGreaterThan(200_000_000);
    expect(summary.national2021LossSurgePct).toBeCloseTo(3164.2, 1);
  });

  it("validates all 5 pilot regions with 100% historical drought match", () => {
    const { pilotBasinValidation, summary } = tarsimData;
    expect(pilotBasinValidation).toHaveLength(5);
    expect(summary.overallHistoricalCorrelationPct).toBe(100.0);

    const ids = pilotBasinValidation.map((b) => b.id);
    expect(ids).toEqual([
      "konya-cumra",
      "sanliurfa-harran",
      "adana-yuregir",
      "edirne-uzunkopru",
      "polatli-ankara",
    ]);

    for (const b of pilotBasinValidation) {
      expect(b.droughtMatch).toBe(true);
      expect(b.historicDroughtYears.length).toBeGreaterThanOrEqual(2);
      expect(b.agroShiftModelDroughtYears.length).toBeGreaterThanOrEqual(3);
      expect(b.tarsimReportedDrylandLossPct).toBeGreaterThan(0);
      expect(b.tarsimPortfolioRole).toBeTruthy();
    }
  });

  it("includes all necessary i18n translation keys in TR and EN", () => {
    expect(v3docTr["y.d.tarsim"]).toContain("TARSİM");
    expect(v3docEn["y.d.tarsim"]).toContain("TARSİM");
    expect(v3docTr["y.val.tarsim"]).toContain("TARSİM");
    expect(v3docEn["y.val.tarsim"]).toContain("TARSİM");
    expect(v3docTr["y.d.mod16"]).toContain("MOD16A2");
    expect(v3docEn["y.d.mod16"]).toContain("MOD16A2");
  });
});
