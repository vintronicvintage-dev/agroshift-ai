import { describe, it, expect } from "vitest";
import mod16Data from "@/data/validation/mod16_crosscheck.json";
import { tr, en } from "@/lib/i18n/dict";

describe("NASA MODIS MOD16A2 Cross-Check & Jury Evidence", () => {
  it("mod16_crosscheck.json conforms to data and metadata standards", () => {
    expect(mod16Data.metadata).toBeDefined();
    expect(mod16Data.metadata.satelliteProduct).toContain("MOD16A2");
    expect(mod16Data.metadata.agriculturalYearDefinition).toContain("1 Ekim - 30 Eylül");
    expect(mod16Data.metadata.units.evapotranspiration).toBe("mm/yıl");

    // Mandatory SoilGrids / satellite uncertainty disclaimer from AGENTS.md rule 4
    expect(mod16Data.metadata.disclaimer).toContain(
      "SoilGrids ve uydu toprak verileri model kestirimlerine dayanmaktadır; yerel kalibrasyon ve in-situ toprak analizleri olmaksızın yüksek belirsizlik içerebilir."
    );
  });

  it("summary metrics verify high model fidelity across 5 pilot basins", () => {
    const { summary } = mod16Data;
    expect(summary.totalRegions).toBe(5);
    expect(summary.meanCorrelationR).toBeGreaterThanOrEqual(0.85);
    expect(summary.meanRmseMm).toBeLessThan(35);
    expect(Math.abs(summary.meanBiasPct)).toBeLessThan(5.0);
    expect(summary.verdictTr.length).toBeGreaterThan(20);
    expect(summary.verdictEn.length).toBeGreaterThan(20);
  });

  it("all 5 pilot regions contain complete agronomic and seasonal fits", () => {
    const expectedIds = ["konya-cumra", "sanliurfa-harran", "adana-yuregir", "edirne-uzunkopru", "polatli-ankara"];
    expect(mod16Data.regions).toHaveLength(5);

    for (const id of expectedIds) {
      const region = mod16Data.regions.find((r) => r.id === id);
      expect(region).toBeDefined();
      expect(region!.yearsAnalyzed).toBeGreaterThanOrEqual(20);
      expect(region!.modelEtaAnnualMm).toBeGreaterThan(250);
      expect(region!.modisEtAnnualMm).toBeGreaterThan(250);
      expect(region!.rmseMm).toBeGreaterThan(0);
      expect(region!.correlationR).toBeGreaterThan(0.70);

      const sf = region!.seasonalFit;
      expect(sf.springModelMm).toBeGreaterThan(0);
      expect(sf.summerModelMm).toBeGreaterThan(0);
      expect(sf.autumnModelMm).toBeGreaterThan(0);
      expect(sf.winterModelMm).toBeGreaterThan(0);

      expect(region!.sampleYears.length).toBeGreaterThan(0);
      for (const sy of region!.sampleYears) {
        expect(["tipik_sezon", "kurak_sezon", "normal_sezon"]).toContain(sy.seasonType);
        expect(sy.precipMm).toBeGreaterThan(0);
        expect(sy.modelEtaMm).toBeGreaterThan(0);
      }
    }
  });

  it("i18n dictionary contains all jury evidence keys in tr and en", () => {
    const keys = [
      "m.data.mod16",
      "m.mod16.title",
      "m.mod16.subtitle",
      "m.mod16.lead",
      "m.mod16.stat.corr",
      "m.mod16.stat.rmse",
      "m.mod16.stat.bias",
      "m.mod16.stat.years",
      "m.mod16.col.region",
      "m.mod16.col.rotation",
      "m.mod16.col.model",
      "m.mod16.col.modis",
      "m.mod16.col.bias",
      "m.mod16.col.rmse",
      "m.mod16.col.r",
      "m.mod16.col.status",
      "m.mod16.seasonal.title",
      "m.mod16.season.spring",
      "m.mod16.season.summer",
      "m.mod16.season.autumn",
      "m.mod16.season.winter",
      "m.mod16.fidelity",
      "m.mod16.note",
    ] as const;

    for (const k of keys) {
      expect(tr[k]).toBeDefined();
      expect(en[k]).toBeDefined();
      expect(tr[k].length).toBeGreaterThan(0);
      expect(en[k].length).toBeGreaterThan(0);
    }
  });
});
