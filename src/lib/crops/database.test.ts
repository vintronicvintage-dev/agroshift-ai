import { describe, it, expect } from "vitest";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "./database";
import { ROTATION_GROUP, N_NEED_KG_HA, preCropEffect } from "./preCrop";
import { tr, en } from "../i18n/dict";
import type { CropId } from "../types";

describe("Crop Catalog & Agronomic Standards", () => {
  it("all 14 strategic rotation crops are registered in CROP_IDS and CROPS", () => {
    const expectedCrops: CropId[] = [
      "wheat_winter", "barley_winter", "chickpea", "lentil_red", "sugar_beet",
      "maize_grain", "maize_silage", "sunflower", "dry_bean", "alfalfa",
      "vetch", "sainfoin", "cotton", "fallow",
    ];

    expect(CROP_IDS).toHaveLength(14);
    for (const id of expectedCrops) {
      expect(CROP_IDS).toContain(id);
      expect(CROPS[id]).toBeDefined();
      expect(CROPS[id].id).toBe(id);
    }
  });

  it("every crop parameter carries source and confidence ('literature' or 'assumption')", () => {
    for (const id of CROP_IDS) {
      const crop = CROPS[id];
      expect(crop.nContributionKgHa.source).toBeTruthy();
      expect(["literature", "assumption", "derived"]).toContain(crop.nContributionKgHa.confidence);
      expect(crop.residue.source).toBeTruthy();
      expect(crop.refYieldTHa.source).toBeTruthy();
      expect(crop.priceTLPerKg.source).toBeTruthy();
      expect(crop.varCostTLPerDa.source).toBeTruthy();
      expect(crop.maxConsecutive.source).toBeTruthy();

      if (crop.agronomy) {
        const ag = crop.agronomy;
        for (const zone of ["south_lowland", "north_lowland", "highland"] as const) {
          expect(ag.calendar[zone].value.stages).toHaveLength(4);
          expect(ag.calendar[zone].source).toBeTruthy();
        }
        expect(ag.kc.source).toBeTruthy();
        expect(ag.rootDepthMaxM.source).toBeTruthy();
        expect(ag.p.source).toBeTruthy();
        expect(ag.ky.source).toBeTruthy();
        expect(ag.frost.source).toBeTruthy();
        expect(ag.heat.source).toBeTruthy();
        expect(ag.gdd.source).toBeTruthy();
        expect(ag.cover.source).toBeTruthy();
      }
    }
  });

  it("new Turkish strategic crops (maize_silage, sainfoin, sunflower, etc.) meet agronomic bounds", () => {
    // Silage maize
    const silage = CROPS["maize_silage"];
    expect(silage.family).toBe("poaceae");
    expect(silage.agronomy!.kc.value.end).toBe(0.95); // High Kc end at dough/milk harvest
    expect(silage.refYieldTHa.value.irrigated).toBeGreaterThan(40); // 55 t/ha fresh silage
    expect(silage.varCostTLPerDa.value).toBeGreaterThan(0);

    // Sainfoin (Korunga)
    const sainfoin = CROPS["sainfoin"];
    expect(sainfoin.family).toBe("fabaceae");
    expect(sainfoin.agronomy!.rootDepthMaxM.value).toBeGreaterThanOrEqual(1.5); // Deep taproot
    expect(sainfoin.nContributionKgHa.value.high).toBeGreaterThan(0); // Biological N credit
    expect(sainfoin.refYieldTHa.value.irrigated).toBeGreaterThan(5); // 8.5 t/ha dry hay
    expect(sainfoin.varCostTLPerDa.value).toBeGreaterThan(0);

    // Sunflower (Yağlık ayçiçeği)
    const sunflower = CROPS["sunflower"];
    expect(sunflower.name.tr).toBe("Yağlık ayçiçeği");
    expect(sunflower.agronomy!.kc.value.mid).toBeGreaterThanOrEqual(1.0);

    // Red Lentil
    const lentil = CROPS["lentil_red"];
    expect(lentil.family).toBe("fabaceae");
    expect(lentil.nFixationKgHa?.value.high).toBeGreaterThan(0);
  });

  it("every crop is assigned to ROTATION_GROUP and N_NEED_KG_HA", () => {
    for (const id of CROP_IDS) {
      expect(ROTATION_GROUP[id]).toBeDefined();
      expect(typeof N_NEED_KG_HA[id]).toBe("number");
    }
    expect(ROTATION_GROUP["maize_silage"]).toBe("maize");
    expect(ROTATION_GROUP["sainfoin"]).toBe("forage_legume");
  });

  it("i18n dictionary contains localized crop names for tr and en", () => {
    for (const id of CROP_IDS) {
      const trKey = `crop.${id}` as keyof typeof tr;
      const enKey = `crop.${id}` as keyof typeof en;
      expect(tr[trKey]).toBeDefined();
      expect(en[enKey]).toBeDefined();
      expect(tr[trKey].length).toBeGreaterThan(0);
      expect(en[enKey].length).toBeGreaterThan(0);
    }
  });

  it("pre-crop rotation effects cover new crops with valid factors", () => {
    // Silage maize after legume gets legume break benefit
    const effectAfterAlfalfa = preCropEffect("alfalfa", "maize_silage");
    expect(effectAfterAlfalfa.yieldFactor).toBeGreaterThan(1);
    expect(effectAfterAlfalfa.nCreditKgHa.high).toBeGreaterThan(0);

    // Sainfoin provides N credit to winter wheat
    const effectSainfoinWheat = preCropEffect("sainfoin", "wheat_winter");
    expect(effectSainfoinWheat.yieldFactor).toBeGreaterThan(1);
    expect(effectSainfoinWheat.nCreditKgHa.high).toBe(90);

    // Legume after legume penalty is symmetric
    const effectSainfoinVetch = preCropEffect("sainfoin", "vetch");
    const effectVetchSainfoin = preCropEffect("vetch", "sainfoin");
    expect(effectSainfoinVetch.yieldFactor).toBe(effectVetchSainfoin.yieldFactor);
    expect(effectSainfoinVetch.yieldFactor).toBeLessThan(1);
  });

  it("global crop constants are defined with literature sources", () => {
    expect(CROP_CONSTANTS.rootDepthMinM.value).toBe(0.2);
    expect(CROP_CONSTANTS.rootDepthMinM.source).toContain("FAO-56");
    expect(CROP_CONSTANTS.keMaxBare.value).toBe(1.05);
    expect(CROP_CONSTANTS.snowMeltFactorMmPerCDay.value).toBe(2.8);
  });
});
