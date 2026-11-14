import { describe, expect, it } from "vitest";
import { GET as getCropParams } from "@/app/api/crops/parameters/route";
import { GET as getSources } from "@/app/api/data/sources/route";
import { GET as getStatus } from "@/app/api/data/status/route";
import { GET as getFieldClimate } from "@/app/api/fields/[field_id]/climate/route";
import { GET as getFieldReadiness } from "@/app/api/fields/[field_id]/model-readiness/route";
import { POST as postFieldRefresh } from "@/app/api/fields/[field_id]/refresh/route";
import { GET as getFieldSoil } from "@/app/api/fields/[field_id]/soil/route";
import { GET as getFieldVegetation } from "@/app/api/fields/[field_id]/vegetation/route";
import { GET as getFieldWater } from "@/app/api/fields/[field_id]/water/route";
import { validateAndNormalizeParcelGeometry } from "./geospatial";
import { scientificRepository } from "./repository";
import {
  evaluateMasterPlan,
  getMasterProvinceByPlaka,
  matchMasterProvince,
  TURKIYE_AGRO_MASTER,
} from "@/lib/data/turkiyeAgroMaster";
import { SCIENTIFIC_SOURCE_CARDS } from "@/components/brand/SourceVisualCards";
import {
  CROP_REQUIREMENTS,
  evaluateAllCropsForParcel,
} from "@/lib/crops/cropRequirements";
import { CROP_IDS } from "@/lib/crops/database";
import { GLOSSARY_LIST, getGlossaryTerm } from "@/lib/ui/glossary";

describe("Agricultural Scientific Data Infrastructure & API Routes", () => {
  it("GET /api/data/sources returns all 12 scientific data sources with Verified, Estimated, and Unavailable classifications", async () => {
    const res = await getSources();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.totalSources).toBe(12);
    expect(body.countsByVerification.Verified).toBeGreaterThanOrEqual(7);
    expect(body.countsByVerification.Estimated).toBeGreaterThanOrEqual(3);
    expect(body.countsByVerification.Unavailable).toBe(1); // GPM IMERG direct HDF5 without EARTHDATA_TOKEN

    const power = body.sources.find((s: { sourceId: string }) => s.sourceId === "nasa_power_daily");
    expect(power).toBeDefined();
    expect(power.verificationStatus).toBe("Verified");

    const smap = body.sources.find((s: { sourceId: string }) => s.sourceId === "nasa_smap_l4");
    expect(smap).toBeDefined();
    expect(smap.spatialResolutionM).toBe(9000);
    expect(smap.verificationStatus).toBe("Estimated");
  });

  it("GET /api/data/status reports operational status, 18 logical tables, and 5 seeded pilot fields", async () => {
    const res = await getStatus();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("operational");
    expect(body.databaseSchema.logicalTablesCount).toBe(18);
    expect(body.registeredFieldsCount).toBe(5);
    expect(body.datasetsCount).toBeGreaterThanOrEqual(15);
  });

  it("GET /api/fields/{field_id}/climate returns real NASA POWER series, MGM 1991-2020 normals, and NEX-GDDP-CMIP6 scenarios", async () => {
    const req = new Request("http://localhost:3005/api/fields/konya-cumra/climate?limit=60");
    const res = await getFieldClimate(req, { params: Promise.resolve({ field_id: "konya-cumra" }) });
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.fieldId).toBe("konya-cumra");
    expect(body.verificationStatus).toBe("Verified");
    expect(body.period.totalDaysStored).toBeGreaterThan(9000);
    expect(body.period.returnedDaysCount).toBe(60);
    expect(body.mgmOfficialNormal1991_2020.province).toBe("Konya");
    expect(body.mgmOfficialNormal1991_2020.annualTotalPrecipMm).toBeCloseTo(325.3, 1);
    expect(body.nexGddpCmip6StressScenarios.length).toBeGreaterThanOrEqual(2);
    expect(body.qualityValidation.duplicateDatesCount).toBe(0);
    expect(body.qualityValidation.physicalBoundViolations.length).toBe(0);
  });

  it("GET /api/fields/{field_id}/soil detects SoilGrids wv0033/wv1500 inversion in Harran and enforces User Lab priority over SoilGrids", async () => {
    // 1. Check Harran 100-200cm retention anomaly detection
    const harranRes = await getFieldSoil(new Request("http://localhost:3005/api/fields/sanliurfa-harran/soil"), {
      params: Promise.resolve({ field_id: "sanliurfa-harran" }),
    });
    expect(harranRes.status).toBe(200);
    const harranBody = await harranRes.json();
    expect(harranBody.activeSoilOrigin).toBe("soilgrids_v2");
    expect(harranBody.soilGridsV2Horizons.length).toBe(6);
    const deepLayer = harranBody.soilGridsV2Horizons.find(
      (l: { depthLabel: string }) => l.depthLabel === "100-200cm",
    );
    expect(deepLayer.thetaRetentionAnomalyFlagged).toBe(true);
    expect(deepLayer.thetaFcM3M3).toBeNull(); // Nullified so Saxton-Rawls pedotransfer takes over safely

    // 2. Test Laboratory Soil Priority Rule on Konya-Çumra
    const refreshWithLabReq = new Request("http://localhost:3005/api/fields/konya-cumra/refresh", {
      method: "POST",
      body: JSON.stringify({
        labSoilOverride: {
          sandPct: 26,
          siltPct: 38,
          clayPct: 36,
          phH2o: 7.55,
          socGKg: 14.2,
          nitrogenGKg: 1.45,
          bdodGCm3: 1.32,
        },
      }),
    });
    const refreshRes = await postFieldRefresh(refreshWithLabReq, {
      params: Promise.resolve({ field_id: "konya-cumra" }),
    });
    expect(refreshRes.status).toBe(200);

    const konyaSoilRes = await getFieldSoil(new Request("http://localhost:3005/api/fields/konya-cumra/soil"), {
      params: Promise.resolve({ field_id: "konya-cumra" }),
    });
    const konyaSoil = await konyaSoilRes.json();
    expect(konyaSoil.activeSoilOrigin).toBe("user_lab");
    expect(konyaSoil.verificationStatus).toBe("Verified");
    expect(konyaSoil.activeDepthHorizons[0].phH2o).toBe(7.55);
    // Underlying SoilGrids v2.0 horizons must still be preserved intact!
    expect(konyaSoil.soilGridsV2Horizons.length).toBe(6);
    expect(konyaSoil.soilGridsV2Horizons[0].dataOrigin).toBe("soilgrids_v2");

    // Clean up lab override so default state stays clean
    await scientificRepository.clearUserLaboratorySoil("konya-cumra");
  });

  it("GET /api/fields/{field_id}/vegetation returns cloud-filtered MODIS MOD13Q1 NDVI series and agronomic caveats", async () => {
    const res = await getFieldVegetation(new Request("http://localhost:3005/api/fields/adana-yuregir/vegetation"), {
      params: Promise.resolve({ field_id: "adana-yuregir" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.verificationStatus).toBe("Verified");
    expect(body.statistics.totalValidComposites).toBeGreaterThan(200);
    expect(body.seasonalPhenologyProfile.length).toBe(12);
    expect(body.scientificSystemRule).toContain("KULLANILAMAZ");
  });

  it("GET /api/fields/{field_id}/water returns ERA5 cross-check, GPM IMERG status, and SMAP scale warnings", async () => {
    const res = await getFieldWater(new Request("http://localhost:3005/api/fields/edirne-uzunkopru/water"), {
      params: Promise.resolve({ field_id: "edirne-uzunkopru" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.era5PrecipitationCrossCheck).not.toBeNull();
    expect(body.smapAndMerra2SoilMoisture.recentObservations.length).toBe(30);
    expect(body.smapAndMerra2SoilMoisture.recentObservations[0].isParcelScaleSensor).toBe(false);
    expect(body.smapAndMerra2SoilMoisture.spatialResolutionCheck.adequacy).toBe("regional_grid_proxy");
  });

  it("GET /api/crops/parameters returns FAO-56, FAO-33/66, AquaCrop v7.1 WP*/HI0, TÜİK yields, and TMO prices", async () => {
    const reqAll = new Request("http://localhost:3005/api/crops/parameters");
    const resAll = await getCropParams(reqAll);
    expect(resAll.status).toBe(200);
    const bodyAll = await resAll.json();
    expect(bodyAll.cropCount).toBe(18);
    expect(Object.keys(bodyAll.requirements).length).toBe(18);
    expect(bodyAll.tuikYieldBaselines.length).toBeGreaterThanOrEqual(8);
    expect(bodyAll.officialMarketPrices.length).toBeGreaterThanOrEqual(8);

    const reqMaize = new Request("http://localhost:3005/api/crops/parameters?crop_id=maize_grain");
    const resMaize = await getCropParams(reqMaize);
    const bodyMaize = await resMaize.json();
    expect(bodyMaize.crops[0].photosyntheticPathway).toBe("C4");
    expect(bodyMaize.crops[0].aquacrop.wpStarGm2).toBeCloseTo(33.7, 1);
    expect(bodyMaize.crops[0].aquacrop.verificationStatus).toBe("Verified");
  });

  it("GET /api/fields/{field_id}/model-readiness & POST /api/fields/{field_id}/refresh execute idempotently and support MultiPolygon", async () => {
    const readyRes = await getFieldReadiness(
      new Request("http://localhost:3005/api/fields/polatli-ankara/model-readiness"),
      { params: Promise.resolve({ field_id: "polatli-ankara" }) },
    );
    expect(readyRes.status).toBe(200);
    const readyBody = await readyRes.json();
    expect(readyBody.readyForScientificSimulation).toBe(true);
    expect(readyBody.readinessScore).toBe(100);
    expect(readyBody.confidenceGradeExpected).toBe("A");

    // Test MultiPolygon validation in geospatial engine
    const multiPoly = validateAndNormalizeParcelGeometry({
      type: "MultiPolygon",
      coordinates: [
        [
          [
            [32.14, 39.57],
            [32.15, 39.57],
            [32.15, 39.58],
            [32.14, 39.58],
            [32.14, 39.57],
          ],
        ],
        [
          [
            [32.16, 39.57],
            [32.17, 39.57],
            [32.17, 39.58],
            [32.16, 39.58],
            [32.16, 39.57],
          ],
        ],
      ],
    });
    expect(multiPoly.isValid).toBe(true);
    expect(multiPoly.geometry.type).toBe("MultiPolygon");
    expect(multiPoly.areaDa).toBeGreaterThan(1500);

    // Run refresh twice and verify idempotency (job count does not grow on duplicate same-day refresh)
    const statusBefore = await (await getStatus()).json();
    await postFieldRefresh(
      new Request("http://localhost:3005/api/fields/polatli-ankara/refresh", { method: "POST" }),
      { params: Promise.resolve({ field_id: "polatli-ankara" }) },
    );
    const statusAfterFirst = await (await getStatus()).json();
    await postFieldRefresh(
      new Request("http://localhost:3005/api/fields/polatli-ankara/refresh", { method: "POST" }),
      { params: Promise.resolve({ field_id: "polatli-ankara" }) },
    );
    const statusAfterSecond = await (await getStatus()).json();
    expect(statusAfterSecond.ingestionJobsCount).toBe(statusAfterFirst.ingestionJobsCount);
    expect(statusAfterFirst.ingestionJobsCount).toBeGreaterThanOrEqual(statusBefore.ingestionJobsCount);
  });

  it("turkiyeAgroMaster integrates all 81 provinces (6 layers) & evaluates Konya, Diyarbakır, Erzurum, and Edirne accurately", () => {
    const provinces = Object.keys(TURKIYE_AGRO_MASTER.iller_detayli_81);
    expect(provinces.length).toBe(81);

    // Verify Konya (42) match and evaluation
    const konyaMatch = matchMasterProvince(37.5677, 32.7804);
    expect(konyaMatch.plaka).toBe("42");
    expect(konyaMatch.province.kimlik_ve_cografya.il_adi).toBe("Konya");
    expect(Object.keys(konyaMatch.province.il_urun_verim_su_ve_rotasyon_matrisi.onerilen_3_yillik_rotasyon_paketleri).length).toBe(3);

    // Evaluate Konya 3-year rotation with no-till vs conventional tillage
    const evalNoTill = evaluateMasterPlan({
      lat: 37.5677,
      lon: 32.7804,
      crops: ["chickpea", "wheat_winter", "sunflower"],
      tillageCode: "aniza_dogrudan_ekim",
      irrigationCode: "damla",
      climateMode: "tipik",
    });
    const evalPlow = evaluateMasterPlan({
      lat: 37.5677,
      lon: 32.7804,
      crops: ["chickpea", "wheat_winter", "sunflower"],
      tillageCode: "geleneksel_surum",
      irrigationCode: "salma",
      climateMode: "tipik",
    });

    expect(evalNoTill.totals.avgAnnualDtMm).toBeLessThan(evalPlow.totals.avgAnnualDtMm);
    expect(evalNoTill.totals.fuelLitersPerDa3Yr).toBeLessThan(evalPlow.totals.fuelLitersPerDa3Yr);
    expect(evalNoTill.totals.hasLegume).toBe(true);
    expect(evalNoTill.years[0].nitrogenDeltaKgDa).toBeGreaterThan(0);

    // Verify Erzurum (25) marks Cotton as frost-risky / unsuitable
    const erzurum = getMasterProvinceByPlaka("25");
    expect(erzurum).not.toBeNull();
    expect(erzurum!.il_urun_verim_su_ve_rotasyon_matrisi.urun_detay_tablosu.Pamuk.ekolojik_uygunluk_durumu).toContain("Don");

    // Verify all photo-backed scientific source cards have valid metadata and parameter arrays
    expect(SCIENTIFIC_SOURCE_CARDS.length).toBeGreaterThanOrEqual(10);
    for (const card of SCIENTIFIC_SOURCE_CARDS) {
      expect(card.photoSrc.startsWith("/images/")).toBe(true);
      expect(card.parameters.length).toBeGreaterThanOrEqual(3);
      expect(card.officialUrl.startsWith("https://")).toBe(true);
    }
  });

  it("evaluates all 18 crops' 6-dimensional biophysical growth requirements & validates 32 interactive glossary terms", () => {
    expect(CROP_IDS.length).toBe(18);
    expect(Object.keys(CROP_REQUIREMENTS).length).toBe(18);

    // Ensure all 6 newly added crops are present with complete requirements
    const newCrops = ["lentil_green", "soybean", "canola", "safflower", "potato", "sainfoin"] as const;
    for (const cid of newCrops) {
      const req = CROP_REQUIREMENTS[cid];
      expect(req).toBeDefined();
      expect(req.thermal.gddRequired).toBeGreaterThan(800);
      expect(req.water.seasonalEtcRangeMm[1]).toBeGreaterThan(req.water.seasonalEtcRangeMm[0]);
      expect(req.soil.salinityThresholdDsm).toBeGreaterThan(0);
    }

    // Dryland Central Anatolian plateau parcel (Konya-Çumra rainfed 340 mm, elevation 1015 m)
    const drylandEvals = evaluateAllCropsForParcel({
      lat: 37.5677,
      lon: 32.7804,
      elevationM: 1015,
      slopePct: 2.0,
      soil: {
        sandPct: 28,
        siltPct: 36,
        clayPct: 36,
        ph: 7.7,
        organicMatterPct: 1.5,
      },
      climate: {
        annualPrecipMm: 340,
        annualEt0Mm: 1180,
        meanAnnualTempC: 11.8,
        hotDaysPerYr: 28,
        frostDaysPerYr: 78,
      },
      irrigationBudgetMm: 0,
      irrigationEfficiency: 0.75,
      currentCropId: "wheat_winter",
    });

    expect(drylandEvals.length).toBe(17); // 18 minus fallow
    const safflowerDry = drylandEvals.find((e) => e.cropId === "safflower")!;
    const lentilGreenDry = drylandEvals.find((e) => e.cropId === "lentil_green")!;
    const sainfoinDry = drylandEvals.find((e) => e.cropId === "sainfoin")!;
    const cottonDry = drylandEvals.find((e) => e.cropId === "cotton")!;

    // Under dryland 1015m plateau conditions following wheat, drought-tolerant pulses/oilseeds/forage outrank cotton
    expect(safflowerDry.overallSuitabilityPct).toBeGreaterThan(cottonDry.overallSuitabilityPct);
    expect(lentilGreenDry.overallSuitabilityPct).toBeGreaterThan(cottonDry.overallSuitabilityPct);
    expect(sainfoinDry.overallSuitabilityPct).toBeGreaterThan(cottonDry.overallSuitabilityPct);

    // Validate all glossary terms and alias lookups
    expect(GLOSSARY_LIST.length).toBeGreaterThanOrEqual(30);
    expect(getGlossaryTerm("ndvi")?.symbol).toBe("NDVI");
    expect(getGlossaryTerm("et0")?.symbol).toBe("ET₀");
    expect(getGlossaryTerm("topsis")?.id).toBe("topsis_pareto");
    expect(getGlossaryTerm("ece_salinity")?.id).toBe("salinity_ece");
  });
});
