/**
 * AgroShift AI — Turkish Official Agricultural Statistics, Market References,
 * MGM 1991–2020 Climate Normals, and NASA NEX-GDDP-CMIP6 Scenarios.
 *
 * Sources:
 * 1. TÜİK Bitkisel Üretim İstatistikleri (2024 & 2025 Resmi Haber Bültenleri, data.tuik.gov.tr)
 * 2. T.C. Tarım ve Orman Bakanlığı 2025–2027 Yeni Bitkisel Üretim Destekleme Modeli & TMO/Türkşeker/Trakya Birlik
 * 3. Meteoroloji Genel Müdürlüğü (MGM) 1991–2020 Resmi İl İklim Normalleri (mgm.gov.tr)
 * 4. NASA NEX-GDDP-CMIP6 (0.25° Downscaled SSP2-4.5 & SSP5-8.5 Anatolia Projections, nccs.nasa.gov)
 */

import { CROP_IDS, CROPS } from "@/lib/crops/database";
import type { ClimateScenarioRecord, CropYieldBaselineRecord, MarketPriceRecord, ProductionCostRecord } from "./types";

export interface MgmProvincialClimateNormal {
  province: string;
  pilotFieldId: string;
  period: "1991-2020";
  annualMeanTempC: number;
  hottestMonthMeanTempC: number;
  hottestMonthName: string;
  coldestMonthMeanTempC: number;
  coldestMonthName: string;
  annualTotalPrecipMm: number;
  meanRainyDaysPerYear: number;
  dsiBasinName: string;
  isGroundwaterRestrictedDistrict: boolean;
  sourceUrl: string;
}

export const MGM_PROVINCIAL_CLIMATE_NORMALS: Record<string, MgmProvincialClimateNormal> = {
  "konya-cumra": {
    province: "Konya",
    pilotFieldId: "konya-cumra",
    period: "1991-2020",
    annualMeanTempC: 11.9,
    hottestMonthMeanTempC: 24.1,
    hottestMonthName: "Temmuz",
    coldestMonthMeanTempC: -0.3,
    coldestMonthName: "Ocak",
    annualTotalPrecipMm: 325.3,
    meanRainyDaysPerYear: 95,
    dsiBasinName: "Konya Kapalı Havzası (16 No'lu Havza)",
    isGroundwaterRestrictedDistrict: true, // Çumra is an official Su Kısıtı Havzası district
    sourceUrl: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=KONYA",
  },
  "sanliurfa-harran": {
    province: "Şanlıurfa",
    pilotFieldId: "sanliurfa-harran",
    period: "1991-2020",
    annualMeanTempC: 19.0,
    hottestMonthMeanTempC: 32.6,
    hottestMonthName: "Temmuz",
    coldestMonthMeanTempC: 6.2,
    coldestMonthName: "Ocak",
    annualTotalPrecipMm: 450.5,
    meanRainyDaysPerYear: 77,
    dsiBasinName: "Fırat-Dicle Havzası — GAP Harran Ovası (21 No'lu Havza)",
    isGroundwaterRestrictedDistrict: false,
    sourceUrl: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=SANLIURFA",
  },
  "adana-yuregir": {
    province: "Adana",
    pilotFieldId: "adana-yuregir",
    period: "1991-2020",
    annualMeanTempC: 19.3,
    hottestMonthMeanTempC: 28.6,
    hottestMonthName: "Ağustos",
    coldestMonthMeanTempC: 9.5,
    coldestMonthName: "Ocak",
    annualTotalPrecipMm: 668.4,
    meanRainyDaysPerYear: 76,
    dsiBasinName: "Seyhan Havzası — Aşağı Seyhan Yüreğir Ovası (18 No'lu Havza)",
    isGroundwaterRestrictedDistrict: false,
    sourceUrl: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=ADANA",
  },
  "edirne-uzunkopru": {
    province: "Edirne",
    pilotFieldId: "edirne-uzunkopru",
    period: "1991-2020",
    annualMeanTempC: 14.2,
    hottestMonthMeanTempC: 25.4,
    hottestMonthName: "Ağustos",
    coldestMonthMeanTempC: 2.8,
    coldestMonthName: "Ocak",
    annualTotalPrecipMm: 625.2,
    meanRainyDaysPerYear: 112,
    dsiBasinName: "Meriç-Ergene Havzası (01 No'lu Havza)",
    isGroundwaterRestrictedDistrict: false,
    sourceUrl: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=EDIRNE",
  },
  "polatli-ankara": {
    province: "Ankara",
    pilotFieldId: "polatli-ankara",
    period: "1991-2020",
    annualMeanTempC: 12.6,
    hottestMonthMeanTempC: 24.3,
    hottestMonthName: "Ağustos",
    coldestMonthMeanTempC: 0.9,
    coldestMonthName: "Ocak",
    annualTotalPrecipMm: 413.6,
    meanRainyDaysPerYear: 127,
    dsiBasinName: "Sakarya Havzası — Yukarı Sakarya Polatlı Alt Havzası (12 No'lu Havza)",
    isGroundwaterRestrictedDistrict: true, // Polatlı is an official Su Kısıtı district
    sourceUrl: "https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx?m=ANKARA",
  },
};

/**
 * TÜİK 2024 & 2025 Bitkisel Üretim İstatistikleri (Official National Tonnage & Reference Yields)
 */
export const TUIK_CROP_YIELD_BASELINES: CropYieldBaselineRecord[] = [
  {
    sourceId: "tuik_crop_stats",
    cropId: "wheat_winter",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "irrigated",
    yieldKgDa: 600,
    yieldTHa: 6.0,
    nationalProductionTonnes: 17_900_000, // TÜİK 2025: 17.9M tonnes (-13.7% vs 2024's 20.8M tonnes due to drought)
    yoyChangePct: -13.7,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "wheat_winter",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "rainfed",
    yieldKgDa: 250,
    yieldTHa: 2.5,
    nationalProductionTonnes: 17_900_000,
    yoyChangePct: -13.7,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "barley_winter",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "rainfed",
    yieldKgDa: 280,
    yieldTHa: 2.8,
    nationalProductionTonnes: 6_000_000, // TÜİK 2025: 6.0M tonnes (-25.9% vs 2024's 8.1M tonnes)
    yoyChangePct: -25.9,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "maize_grain",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "irrigated",
    yieldKgDa: 1100,
    yieldTHa: 11.0,
    nationalProductionTonnes: 8_500_000, // TÜİK 2025: 8.5M tonnes (+4.9% vs 2024's 8.1M tonnes)
    yoyChangePct: 4.9,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "sunflower",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "irrigated",
    yieldKgDa: 300,
    yieldTHa: 3.0,
    nationalProductionTonnes: 1_900_000, // TÜİK 2025: 1.9M tonnes (-11.8% vs 2024's 2.2M tonnes)
    yoyChangePct: -11.8,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "chickpea",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "rainfed",
    yieldKgDa: 110,
    yieldTHa: 1.1,
    nationalProductionTonnes: 413_000, // TÜİK 2025: 413k tonnes (vs 2024's 575k tonnes)
    yoyChangePct: -28.2,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "lentil_red",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "rainfed",
    yieldKgDa: 120,
    yieldTHa: 1.2,
    nationalProductionTonnes: 250_000, // TÜİK 2025: 250k tonnes (vs 2024's 405k tonnes)
    yoyChangePct: -38.3,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "sugar_beet",
    province: "Türkiye Geneli",
    referenceYear: 2025,
    productionRegime: "irrigated",
    yieldKgDa: 6500,
    yieldTHa: 65.0,
    nationalProductionTonnes: 22_000_000, // TÜİK 2025: 22.0M tonnes (-2.0% vs 2024's 23.0M tonnes)
    yoyChangePct: -2.0,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
  {
    sourceId: "tuik_crop_stats",
    cropId: "cotton",
    province: "Şanlıurfa / Adana",
    referenceYear: 2025,
    productionRegime: "irrigated",
    yieldKgDa: 500,
    yieldTHa: 5.0,
    nationalProductionTonnes: 2_100_000,
    yoyChangePct: -4.5,
    verificationStatus: "Verified",
    sourceUrl: "https://data.tuik.gov.tr/Bulten/Index?p=Bitkisel-Uretim-Istatistikleri-2025",
  },
];

/**
 * Official 2025/2026 Market Prices & Commodity Exchange References
 */
export const OFFICIAL_MARKET_PRICES: MarketPriceRecord[] = [
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "wheat_winter",
    marketingSeason: "2025/2026",
    pricingAuthority: "TMO (Toprak Mahsulleri Ofisi) & Konya Ticaret Borsası",
    basePriceTlKg: 13.5,
    supportPremiumTlKg: 1.0,
    effectivePriceTlKg: 14.5,
    priceRangeMinTlKg: 13.5,
    priceRangeMaxTlKg: 16.02,
    verificationStatus: "Verified",
    sourceUrl: "https://www.tmo.gov.tr",
    announcedDate: "2025-06-06",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "barley_winter",
    marketingSeason: "2025/2026",
    pricingAuthority: "TMO (Toprak Mahsulleri Ofisi)",
    basePriceTlKg: 11.0,
    supportPremiumTlKg: 2.52,
    effectivePriceTlKg: 13.52,
    priceRangeMinTlKg: 11.0,
    priceRangeMaxTlKg: 13.52,
    verificationStatus: "Verified",
    sourceUrl: "https://www.tmo.gov.tr",
    announcedDate: "2025-06-06",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "maize_grain",
    marketingSeason: "2025/2026",
    pricingAuthority: "TMO Ağustos 2025 Dane Mısır Alım Fiyatı",
    basePriceTlKg: 11.3,
    supportPremiumTlKg: 0.67,
    effectivePriceTlKg: 11.97,
    priceRangeMinTlKg: 11.3,
    priceRangeMaxTlKg: 12.5,
    verificationStatus: "Verified",
    sourceUrl: "https://www.tmo.gov.tr",
    announcedDate: "2025-08-22",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "sunflower",
    marketingSeason: "2025/2026",
    pricingAuthority: "Trakya Birlik (%44 Yağlı Tohum Avans Alım Fiyatı)",
    basePriceTlKg: 28.0,
    supportPremiumTlKg: 0.0,
    effectivePriceTlKg: 28.0,
    priceRangeMinTlKg: 26.5,
    priceRangeMaxTlKg: 31.0,
    verificationStatus: "Verified",
    sourceUrl: "https://www.trakyabirlik.com.tr",
    announcedDate: "2025-08-15",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "sugar_beet",
    marketingSeason: "2025/2026",
    pricingAuthority: "Türkşeker (%16 Polar Kota Tamamlama Primi Dahil)",
    basePriceTlKg: 3.1,
    supportPremiumTlKg: 0.3,
    effectivePriceTlKg: 3.4,
    priceRangeMinTlKg: 2.97,
    priceRangeMaxTlKg: 3.45,
    verificationStatus: "Verified",
    sourceUrl: "https://www.turkseker.gov.tr",
    announcedDate: "2025-09-18",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "chickpea",
    marketingSeason: "2025/2026",
    pricingAuthority: "Konya / Yozgat / Kırşehir Ticaret Borsaları",
    basePriceTlKg: 38.0,
    supportPremiumTlKg: 0.0,
    effectivePriceTlKg: 38.0,
    priceRangeMinTlKg: 28.0,
    priceRangeMaxTlKg: 42.0,
    verificationStatus: "Verified",
    sourceUrl: "https://www.ktb.org.tr",
    announcedDate: "2025-09-01",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "lentil_red",
    marketingSeason: "2025/2026",
    pricingAuthority: "Şanlıurfa / Diyarbakır Ticaret Borsaları",
    basePriceTlKg: 34.0,
    supportPremiumTlKg: 0.0,
    effectivePriceTlKg: 34.0,
    priceRangeMinTlKg: 24.0,
    priceRangeMaxTlKg: 41.0,
    verificationStatus: "Verified",
    sourceUrl: "https://www.sutb.org.tr",
    announcedDate: "2025-07-15",
  },
  {
    sourceId: "tarim_bakanligi_tmo",
    cropId: "cotton",
    marketingSeason: "2025/2026",
    pricingAuthority: "Çukobirlik / Tariş Kütlü Pamuk Referansı",
    basePriceTlKg: 31.0,
    supportPremiumTlKg: 0.0,
    effectivePriceTlKg: 31.0,
    priceRangeMinTlKg: 27.5,
    priceRangeMaxTlKg: 34.0,
    verificationStatus: "Verified",
    sourceUrl: "https://www.tarimorman.gov.tr",
    announcedDate: "2025-10-01",
  },
];

/**
 * Production Cost & Ministry Support Structures (2025/2026 Season)
 * Incorporates T.C. Tarım ve Orman Bakanlığı 2025–2027 Yeni Destekleme Modeli
 * (244 TL/da base coefficient × category multiplier for Temel, Planlı Üretim, and Su Kısıtı).
 */
export function getProductionCostRecords(): ProductionCostRecord[] {
  const BASE_COEFF_2025 = 244; // TL/da (Resmi Gazete 2025 Bitkisel Üretim Destekleme Katsayısı)
  return CROP_IDS.map((cropId) => {
    const c = CROPS[cropId];
    const irrCost = c.varCostTLPerDa.value;
    const rfCost = Math.round(irrCost * 0.6);
    const isPlannedStrategic = [
      "wheat_winter",
      "barley_winter",
      "chickpea",
      "lentil_red",
      "sunflower",
      "maize_grain",
      "cotton",
      "alfalfa",
      "vetch",
    ].includes(cropId);
    const isWaterRestrictionEligible = ["wheat_winter", "barley_winter", "chickpea", "lentil_red", "sunflower", "vetch"].includes(
      cropId,
    );

    const temel = cropId === "fallow" ? Math.round(BASE_COEFF_2025 * 0.3) : Math.round(BASE_COEFF_2025 * 1.3);
    const planli = isPlannedStrategic ? temel : 0;
    const suKisiti = isWaterRestrictionEligible ? Math.round(BASE_COEFF_2025 * 0.8) : 0;

    return {
      sourceId: "tarim_bakanligi_tmo",
      cropId,
      season: "2025/2026",
      regionScope: "Türkiye Tarımsal Havzaları",
      varCostIrrigatedTlDa: irrCost,
      varCostRainfedTlDa: rfCost,
      ministrySupportTlDa: temel + planli + suKisiti,
      supportBreakdown: {
        temelDestekTlDa: temel,
        planliUretimDestegiTlDa: planli,
        suKisitiDestegiTlDa: suKisiti,
      },
      verificationStatus: "Estimated",
      sourceUrl: "https://www.tarimorman.gov.tr/Konular/Tarimsal-Destekler/Bitkisel-Uretim-Desteklemeleri",
    };
  });
}

/**
 * NASA NEX-GDDP-CMIP6 Downscaled Climate Stress Scenarios for Turkey's 3 Agro-Climatic Zones
 * Strictly used as conditional stress scenarios for 3-year rotation robustness, never as short-term forecasts.
 */
export const NEX_GDDP_CMIP6_SCENARIOS: ClimateScenarioRecord[] = [
  {
    scenarioId: "cmip6_baseline_highland",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "Historical_1991_2020",
    gcmEnsemble: "NASA POWER MERRA-2 + MGM 1991–2020 Observed Historical Baseline",
    climateZone: "highland",
    horizonPeriod: "2001-2026 Observed",
    tempDeltaC: 0.0,
    precipMultiplier: 1.0,
    hotDaysDeltaPerYear: 0,
    droughtFrequencyMultiplier: 1.0,
    usageConstraintWarning:
      "Observed multi-decadal baseline; replay uses exact historical 3-year windows.",
    verificationStatus: "Verified",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
  {
    scenarioId: "cmip6_ssp245_highland_2035",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "SSP2-4.5",
    gcmEnsemble: "CMIP6 Multi-Model Median (GFDL-ESM4, MRI-ESM2-0, EC-Earth3, MPI-ESM1-2-HR)",
    climateZone: "highland",
    horizonPeriod: "2026-2050 Near-Term Stress",
    tempDeltaC: 1.5,
    precipMultiplier: 0.85,
    hotDaysDeltaPerYear: 14,
    droughtFrequencyMultiplier: 1.45,
    usageConstraintWarning:
      "KOŞULLU İKLİM STRES SENARYOSU: Kısa vadeli hava tahmini DEĞİLDİR. 3 yıllık ürün rotasyonunun kuraklık dayanıklılığını (minimax regret) test etmek için kullanılır.",
    verificationStatus: "Estimated",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
  {
    scenarioId: "cmip6_ssp585_highland_2050",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "SSP5-8.5",
    gcmEnsemble: "CMIP6 High-Emissions Multi-Model Ensemble",
    climateZone: "highland",
    horizonPeriod: "2035-2060 Severe Stress",
    tempDeltaC: 2.5,
    precipMultiplier: 0.75,
    hotDaysDeltaPerYear: 26,
    droughtFrequencyMultiplier: 1.9,
    usageConstraintWarning:
      "KOŞULLU AŞIRI İKLİM STRES SENARYOSU: Kısa vadeli hava tahmini DEĞİLDİR. Aşırı sıcak + kurak yıllarda su bütçesi aşımı ve gelir düşüşü (CVaR20) riskini simüle eder.",
    verificationStatus: "Estimated",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
  {
    scenarioId: "cmip6_ssp245_south_lowland_2035",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "SSP2-4.5",
    gcmEnsemble: "CMIP6 Multi-Model Median (Eastern Mediterranean / Southeastern Anatolia)",
    climateZone: "south_lowland",
    horizonPeriod: "2026-2050 Near-Term Stress",
    tempDeltaC: 1.7,
    precipMultiplier: 0.82,
    hotDaysDeltaPerYear: 19,
    droughtFrequencyMultiplier: 1.55,
    usageConstraintWarning:
      "KOŞULLU İKLİM STRES SENARYOSU: Kısa vadeli hava tahmini DEĞİLDİR. Güneydoğu ve Akdeniz havzalarında çiçeklenme dönemi sıcak dalgası ve su açığı stresini test eder.",
    verificationStatus: "Estimated",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
  {
    scenarioId: "cmip6_ssp585_south_lowland_2050",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "SSP5-8.5",
    gcmEnsemble: "CMIP6 High-Emissions Multi-Model Ensemble",
    climateZone: "south_lowland",
    horizonPeriod: "2035-2060 Severe Stress",
    tempDeltaC: 2.8,
    precipMultiplier: 0.72,
    hotDaysDeltaPerYear: 32,
    droughtFrequencyMultiplier: 2.1,
    usageConstraintWarning:
      "KOŞULLU AŞIRI İKLİM STRES SENARYOSU: Kısa vadeli hava tahmini DEĞİLDİR.",
    verificationStatus: "Estimated",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
  {
    scenarioId: "cmip6_ssp245_north_lowland_2035",
    sourceId: "nasa_nex_gddp_cmip6",
    datasetVersion: "NEX-GDDP-CMIP6-BCSD-0.25deg",
    sspPathway: "SSP2-4.5",
    gcmEnsemble: "CMIP6 Multi-Model Median (Thrace / Marmara Basin)",
    climateZone: "north_lowland",
    horizonPeriod: "2026-2050 Near-Term Stress",
    tempDeltaC: 1.4,
    precipMultiplier: 0.88,
    hotDaysDeltaPerYear: 12,
    droughtFrequencyMultiplier: 1.35,
    usageConstraintWarning:
      "KOŞULLU İKLİM STRES SENARYOSU: Kısa vadeli hava tahmini DEĞİLDİR.",
    verificationStatus: "Estimated",
    sourceUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
  },
];
