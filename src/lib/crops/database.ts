/**
 * Crop database for Türkiye (36–42°N).
 *
 * Every parameter carries `source` and `confidence`:
 * - "literature": value read from the cited table (FAO-56 Tables 11/12/22, FAO-33/66, USDA TR-55).
 * - "assumption": regional engineering estimate (sowing dates, stage lengths adapted to the
 *   regional calendar, thresholds, N credits, yields, prices, costs). The user should review them.
 *
 * Prices and costs are 2025/26 order-of-magnitude TL scenario values, NOT market data.
 */
import type { ClimateZone, CropCalendar, CropDef, CropId, Sourced } from "../types";

const FAO56_T11 = "FAO-56 Table 11 (Allen et al. 1998)";
const FAO56_T12 = "FAO-56 Table 12 (Allen et al. 1998)";
const FAO56_T22 = "FAO-56 Table 22 (Allen et al. 1998)";
const FAO33 = "FAO-33 Table 24 (Doorenbos & Kassam 1979) / FAO-66 (Steduto et al. 2012)";
const TR55 = "USDA-NRCS TR-55 Table 2-2b";
const ECON = "Scenario assumption calibrated to 2025/2026 TMO, Trakya Birlik, Türkşeker & Commodity Exchange reference prices (TL) — edit for your farm";
const YIELD = "Assumption, TÜİK national-average order of magnitude";
const SPEC = "AgroShift spec §4.6 rotation rule";
const RF_CEILING = "Assumption: water-unlimited yield under typical rainfed management (lower N rate, seed rate and inputs than irrigated fields) — about a good rainfed year; Ym of a crop-year moves from this value to the irrigated value with irrigation intensity";
const RF_CEILING_LEGUME = "Assumption: equal to the irrigated reference — rainfed and irrigated grain-legume management hardly differ (no N fertiliser, same seed rate), so the water ratio alone carries the rainfed gap (v2.1: removes a double-counted management gap)";
const PH = "Assumption: soil pH range without a pH-related flag (general agronomic tolerance ranges; e.g. dry bean Fe/Zn chlorosis on calcareous high-pH soils). Verify locally";
const N_REMOVAL = "Assumption: kg N removed per t of harvested product (protein/N content order of magnitude)";
const N_FIX = "Assumption: biological N fixation per crop year, kg N/ha (order of magnitude for rainfed Mediterranean conditions; see e.g. the review by Herridge et al. 2008, Plant Soil 311:1–18, for typical ranges)";
const LEGUME_BREAK = "AgroShift rule: grain legumes and vetch never follow themselves (Ascochyta, Fusarium/Rhizoctonia and nematode build-up; extension guidance is 3–4 years between chickpea or lentil crops)";

export function lit<T>(value: T, source: string): Sourced<T> {
  return { value, source, confidence: "literature" };
}
export function asm<T>(value: T, source: string): Sourced<T> {
  return { value, source, confidence: "assumption" };
}

function cal(sow: string, latestSow: string, stages: [number, number, number, number], note: string): Sourced<CropCalendar> {
  return asm({ sow, latestSow, stages }, note);
}

type Cals = Record<ClimateZone, Sourced<CropCalendar>>;

const CAL_NOTE = (shape: string) =>
  `Sowing dates: regional practice assumption; stage-length shape after ${shape}, scaled to the regional season`;

export const CROPS: Record<CropId, CropDef> = {
  wheat_winter: {
    id: "wheat_winter",
    name: { tr: "Buğday (kışlık)", en: "Winter wheat" },
    family: "poaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("11-15", "12-31", [30, 100, 45, 25], CAL_NOTE(`${FAO56_T11} winter wheat, Mediterranean 30/140/40/30`)),
        north_lowland: cal("10-25", "11-30", [30, 140, 50, 29], CAL_NOTE(`${FAO56_T11} winter wheat, Mediterranean 30/140/40/30`)),
        highland: cal("10-10", "11-15", [40, 150, 55, 33], CAL_NOTE(`${FAO56_T11} winter wheat, cold-winter 160/75/75/25`)),
      } satisfies Cals,
      kc: lit({ ini: 0.7, mid: 1.15, end: 0.3 }, FAO56_T12),
      rootDepthMaxM: lit(1.5, `${FAO56_T22} (1.5–1.8 m)`),
      p: lit(0.55, FAO56_T22),
      ky: lit(1.0, `${FAO33} (winter wheat)`),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -20 }, "Assumption: frost at anthesis below about −2 °C; hardened winter-kill about −20 °C air temperature (snow cover not modelled)"),
      heat: asm({ thresholdC: 32, stages: ["mid"] }, "Assumption: heat stress above about 32 °C during anthesis and grain fill (literature range 30–34 °C)"),
      gdd: asm({ baseC: 0, required: 1700 }, "Assumption: sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("high", "Assumption: straw residue class"),
    refYieldTHa: asm({ irrigated: 6.0, rainfed: 2.5 }, `${YIELD}; irrigated 6.0 t/ha in line with Harran plain tillage trials (≈ 5.6–6.2 t/ha) and Konya irrigated practice`),
    rainfedCeilingTHa: asm(4.0, RF_CEILING),
    phRange: asm({ min: 5.5, max: 8.5 }, PH),
    nRemovalKgPerT: asm(22, N_REMOVAL),
    priceTLPerKg: asm(14.5, `${ECON} (TMO 2025/26 wheat base 13.50 TL/kg + quality/support premium)`),
    varCostTLPerDa: asm(4800, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  barley_winter: {
    id: "barley_winter",
    name: { tr: "Arpa (kışlık)", en: "Winter barley" },
    family: "poaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("11-10", "12-31", [25, 95, 40, 25], CAL_NOTE(`${FAO56_T11} barley`)),
        north_lowland: cal("10-20", "11-30", [30, 135, 45, 25], CAL_NOTE(`${FAO56_T11} barley`)),
        highland: cal("10-05", "11-15", [35, 150, 50, 30], CAL_NOTE(`${FAO56_T11} barley`)),
      },
      kc: lit({ ini: 0.3, mid: 1.15, end: 0.25 }, FAO56_T12),
      rootDepthMaxM: lit(1.3, `${FAO56_T22} (1.0–1.5 m)`),
      p: lit(0.55, FAO56_T22),
      ky: asm(1.0, "Assumption: taken equal to winter wheat (small grains)"),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -18 }, "Assumption: anthesis frost −2 °C; winter-kill about −18 °C air temperature (proxy for crown temperature; snow cover not modelled)"),
      heat: asm({ thresholdC: 32, stages: ["mid"] }, "Assumption: heat stress above about 32 °C at anthesis"),
      gdd: asm({ baseC: 0, required: 1500 }, "Assumption: sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("high", "Assumption: straw residue class"),
    refYieldTHa: asm({ irrigated: 5.0, rainfed: 2.8 }, YIELD),
    rainfedCeilingTHa: asm(3.6, RF_CEILING),
    phRange: asm({ min: 6.0, max: 8.5 }, PH),
    nRemovalKgPerT: asm(18, N_REMOVAL),
    priceTLPerKg: asm(13.52, `${ECON} (TMO 2025/26 barley 11.00 TL/kg + 2.52 TL/kg support = 13.52 TL/kg)`),
    varCostTLPerDa: asm(3800, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  chickpea: {
    id: "chickpea",
    name: { tr: "Nohut", en: "Chickpea" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("12-01", "01-15", [25, 45, 60, 30], "Assumption: winter-sown chickpea in the south; stage lengths assumed"),
        north_lowland: cal("03-20", "04-30", [20, 35, 40, 20], "Assumption: spring-sown chickpea; stage lengths assumed"),
        highland: cal("03-25", "04-30", [20, 30, 40, 20], "Assumption: spring-sown chickpea on the plateau; stage lengths assumed"),
      },
      kc: lit({ ini: 0.4, mid: 1.0, end: 0.35 }, FAO56_T12),
      rootDepthMaxM: lit(0.8, `${FAO56_T22} (0.6–1.0 m)`),
      p: lit(0.5, FAO56_T22),
      ky: asm(0.9, "Assumption: not tabulated in FAO-33; grain-legume order of magnitude"),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -10 }, "Assumption: flowering frost −2 °C; winter-kill about −10 °C"),
      heat: asm({ thresholdC: 30, stages: ["mid"] }, "Assumption: flower/pod abortion above about 30 °C"),
      gdd: asm({ baseC: 0, required: 1100 }, "Assumption: sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: asm({ low: 20, high: 40 }, "Assumption: residual N credit to the next crop, grain-legume literature range"),
    residue: asm("low", "Assumption"),
    refYieldTHa: asm({ irrigated: 2.0, rainfed: 1.1 }, YIELD),
    rainfedCeilingTHa: asm(2.0, RF_CEILING_LEGUME),
    phRange: asm({ min: 6.0, max: 9.0 }, PH),
    nRemovalKgPerT: asm(35, N_REMOVAL),
    nFixationKgHa: asm({ low: 30, high: 90 }, N_FIX),
    priceTLPerKg: asm(38, `${ECON} (2025/26 Commodity Exchange chickpea 28–38 TL/kg)`),
    varCostTLPerDa: asm(3400, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  lentil_red: {
    id: "lentil_red",
    name: { tr: "Kırmızı mercimek", en: "Red lentil" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("11-25", "12-31", [25, 35, 70, 40], `Sowing date assumption; stage lengths ${FAO56_T11} lentil (Oct/Nov, Asia)`),
        north_lowland: cal("03-15", "04-20", [20, 30, 45, 25], CAL_NOTE(`${FAO56_T11} lentil (Apr, Europe) 20/30/60/40`)),
        highland: cal("03-20", "04-20", [20, 30, 40, 25], CAL_NOTE(`${FAO56_T11} lentil (Apr, Europe) 20/30/60/40`)),
      },
      kc: lit({ ini: 0.4, mid: 1.1, end: 0.3 }, FAO56_T12),
      rootDepthMaxM: lit(0.7, `${FAO56_T22} (0.6–0.8 m)`),
      p: lit(0.5, FAO56_T22),
      ky: asm(1.0, "Assumption: not tabulated in FAO-33"),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -12 }, "Assumption: flowering frost −2 °C; winter-kill about −12 °C"),
      heat: asm({ thresholdC: 30, stages: ["mid"] }, "Assumption: heat stress above about 30 °C at flowering"),
      gdd: asm({ baseC: 0, required: 1000 }, "Assumption: sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: asm({ low: 15, high: 40 }, "Assumption: residual N credit, grain-legume literature range"),
    residue: asm("low", "Assumption"),
    refYieldTHa: asm({ irrigated: 1.8, rainfed: 1.2 }, YIELD),
    rainfedCeilingTHa: asm(1.8, RF_CEILING_LEGUME),
    phRange: asm({ min: 5.5, max: 8.5 }, PH),
    nRemovalKgPerT: asm(40, N_REMOVAL),
    nFixationKgHa: asm({ low: 30, high: 90 }, N_FIX),
    priceTLPerKg: asm(34, `${ECON} (2025/26 Commodity Exchange red lentil 22–42 TL/kg)`),
    varCostTLPerDa: asm(3000, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  sugar_beet: {
    id: "sugar_beet",
    name: { tr: "Şeker pancarı", en: "Sugar beet" },
    family: "amaranthaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("03-10", "04-15", [30, 45, 90, 35], CAL_NOTE(`${FAO56_T11} sugar beet 30/45/90/15`)),
        north_lowland: cal("03-25", "04-30", [30, 55, 90, 30], CAL_NOTE(`${FAO56_T11} sugar beet 30/45/90/15`)),
        highland: cal("04-01", "05-01", [30, 60, 90, 30], CAL_NOTE(`${FAO56_T11} sugar beet 30/45/90/15`)),
      },
      kc: lit({ ini: 0.35, mid: 1.2, end: 0.7 }, FAO56_T12),
      rootDepthMaxM: lit(1.0, `${FAO56_T22} (0.7–1.2 m)`),
      p: lit(0.55, FAO56_T22),
      ky: lit(1.0, `${FAO33} (sugar beet, range 0.7–1.1)`),
      frost: asm({ criticalC: -4, stages: ["ini"], winterKillC: null }, "Assumption: beet seedlings killed below about −4 °C"),
      heat: asm({ thresholdC: 35, stages: ["mid"] }, "Assumption"),
      gdd: asm({ baseC: 3, required: 2400 }, "Assumption: GDD base 3 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("medium", "Assumption: leaves/crowns left on field"),
    refYieldTHa: asm({ irrigated: 65, rainfed: 30 }, YIELD),
    rainfedCeilingTHa: asm(35, RF_CEILING),
    phRange: asm({ min: 6.5, max: 8.5 }, PH),
    nRemovalKgPerT: asm(1.8, N_REMOVAL),
    priceTLPerKg: asm(3.4, `${ECON} (Türkşeker 2025/26 sugar beet reference incl. polar/quota bonus)`),
    varCostTLPerDa: asm(12000, ECON),
    maxConsecutive: lit(1, SPEC),
  },
  maize_grain: {
    id: "maize_grain",
    name: { tr: "Dane mısır", en: "Grain maize" },
    family: "poaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("04-01", "05-15", [30, 40, 50, 30], `Sowing date assumption; stage lengths ${FAO56_T11} maize grain (Apr, Spain)`),
        north_lowland: cal("04-20", "05-20", [30, 40, 50, 30], `Sowing date assumption; stage lengths ${FAO56_T11} maize grain (Apr, Spain)`),
        highland: cal("05-01", "05-31", [30, 40, 50, 30], `Sowing date assumption; stage lengths ${FAO56_T11} maize grain (Apr, Spain)`),
      },
      kc: lit({ ini: 0.3, mid: 1.2, end: 0.35 }, `${FAO56_T12} (end 0.35: dried in field)`),
      rootDepthMaxM: lit(1.4, `${FAO56_T22} (1.0–1.7 m)`),
      p: lit(0.55, FAO56_T22),
      ky: lit(1.25, FAO33),
      frost: asm({ criticalC: 0, stages: ["ini", "dev"], winterKillC: null }, "Assumption: seedling frost at 0 °C (2 m air temperature)"),
      heat: asm({ thresholdC: 35, stages: ["mid"] }, "Assumption: pollination heat stress above about 35 °C"),
      gdd: asm({ baseC: 10, required: 1300 }, "Assumption: mid-maturity hybrid, GDD base 10 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("high", "Assumption: stover residue class"),
    refYieldTHa: asm({ irrigated: 11, rainfed: 4 }, YIELD),
    rainfedCeilingTHa: asm(6.0, RF_CEILING),
    phRange: asm({ min: 5.5, max: 8.0 }, PH),
    nRemovalKgPerT: asm(15, N_REMOVAL),
    priceTLPerKg: asm(11.97, `${ECON} (TMO August 2025 grain maize 11.30 TL/kg + 0.67 TL/kg support = 11.97 TL/kg)`),
    varCostTLPerDa: asm(8600, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  sunflower: {
    id: "sunflower",
    name: { tr: "Ayçiçeği", en: "Sunflower" },
    family: "asteraceae",
    agronomy: {
      calendar: {
        south_lowland: cal("03-25", "05-01", [25, 35, 45, 25], `Sowing date assumption; stage lengths ${FAO56_T11} sunflower (Apr/May, Mediterranean)`),
        north_lowland: cal("04-15", "05-15", [25, 35, 45, 25], `Sowing date assumption; stage lengths ${FAO56_T11} sunflower (Apr/May, Mediterranean)`),
        highland: cal("05-01", "05-31", [25, 35, 45, 25], `Sowing date assumption; stage lengths ${FAO56_T11} sunflower (Apr/May, Mediterranean)`),
      },
      kc: lit({ ini: 0.35, mid: 1.0, end: 0.35 }, `${FAO56_T12} (mid 1.0–1.15)`),
      rootDepthMaxM: lit(1.2, `${FAO56_T22} (0.8–1.5 m)`),
      p: lit(0.45, FAO56_T22),
      ky: lit(0.95, FAO33),
      frost: asm({ criticalC: -2, stages: ["ini", "dev"], winterKillC: null }, "Assumption: seedling frost below about −2 °C"),
      heat: asm({ thresholdC: 35, stages: ["mid"] }, "Assumption"),
      gdd: asm({ baseC: 6, required: 1400 }, "Assumption: GDD base 6 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("medium", "Assumption"),
    refYieldTHa: asm({ irrigated: 3.0, rainfed: 1.8 }, YIELD),
    rainfedCeilingTHa: asm(2.4, RF_CEILING),
    phRange: asm({ min: 6.0, max: 8.0 }, PH),
    nRemovalKgPerT: asm(28, N_REMOVAL),
    priceTLPerKg: asm(28, `${ECON} (Trakya Birlik 2025/26 oilseed sunflower advance purchase price = 28,000 TL/t = 28.00 TL/kg)`),
    varCostTLPerDa: asm(5400, ECON),
    maxConsecutive: lit(1, SPEC),
  },
  dry_bean: {
    id: "dry_bean",
    name: { tr: "Kuru fasulye", en: "Dry bean" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("04-01", "05-15", [20, 30, 40, 20], `Sowing date assumption; stage lengths ${FAO56_T11} beans dry (May, continental)`),
        north_lowland: cal("04-25", "05-31", [20, 30, 40, 20], `Sowing date assumption; stage lengths ${FAO56_T11} beans dry (May, continental)`),
        highland: cal("05-10", "06-10", [20, 30, 40, 20], `Sowing date assumption; stage lengths ${FAO56_T11} beans dry (May, continental)`),
      },
      kc: lit({ ini: 0.4, mid: 1.15, end: 0.35 }, FAO56_T12),
      rootDepthMaxM: lit(0.8, `${FAO56_T22} (0.6–0.9 m)`),
      p: lit(0.45, FAO56_T22),
      ky: lit(1.15, FAO33),
      frost: asm({ criticalC: 0, stages: ["ini", "dev"], winterKillC: null }, "Assumption: frost-sensitive at 0 °C"),
      heat: asm({ thresholdC: 30, stages: ["mid"] }, "Assumption: flower abortion above about 30 °C"),
      gdd: asm({ baseC: 10, required: 1000 }, "Assumption: GDD base 10 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: asm({ low: 10, high: 30 }, "Assumption: common bean is a weak N fixer; literature range"),
    residue: asm("low", "Assumption"),
    refYieldTHa: asm({ irrigated: 2.6, rainfed: 1.0 }, YIELD),
    rainfedCeilingTHa: asm(2.0, RF_CEILING_LEGUME),
    phRange: asm({ min: 6.0, max: 7.8 }, PH),
    nRemovalKgPerT: asm(35, N_REMOVAL),
    nFixationKgHa: asm({ low: 20, high: 60 }, N_FIX),
    priceTLPerKg: asm(72, `${ECON} (2025/26 Konya/Karaman Commodity Exchange dry bean reference)`),
    varCostTLPerDa: asm(6800, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  alfalfa: {
    id: "alfalfa",
    name: { tr: "Yonca (1 yıllık dilim)", en: "Alfalfa (one-year slice)" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("03-01", "04-15", [20, 40, 140, 15], "Assumption: one growing season of a perennial stand, averaged over cuttings"),
        north_lowland: cal("03-20", "04-30", [20, 40, 140, 15], "Assumption: one growing season of a perennial stand, averaged over cuttings"),
        highland: cal("04-01", "05-10", [20, 40, 130, 15], "Assumption: one growing season of a perennial stand, averaged over cuttings"),
      },
      kc: lit({ ini: 0.4, mid: 0.95, end: 0.9 }, `${FAO56_T12} alfalfa hay, averaged cutting effects`),
      rootDepthMaxM: lit(1.5, `${FAO56_T22} (1.0–2.0 m)`),
      p: lit(0.55, FAO56_T22),
      ky: lit(1.1, FAO33),
      frost: asm({ criticalC: -5, stages: ["ini"], winterKillC: null }, "Assumption: alfalfa seedling frost below about −5 °C"),
      heat: asm({ thresholdC: 40, stages: ["mid"] }, "Assumption: heat tolerant"),
      gdd: asm({ baseC: 5, required: 1200 }, "Assumption: GDD base 5 °C"),
      cover: lit("close_legume", TR55),
    },
    nContributionKgHa: asm({ low: 80, high: 150 }, "Assumption: N credit after alfalfa, literature range"),
    residue: asm("high", "Assumption: roots and crowns"),
    refYieldTHa: asm({ irrigated: 12, rainfed: 5 }, `${YIELD} (dry hay)`),
    rainfedCeilingTHa: asm(6.0, RF_CEILING),
    phRange: asm({ min: 6.5, max: 8.5 }, PH),
    nRemovalKgPerT: asm(28, N_REMOVAL),
    nFixationKgHa: asm({ low: 150, high: 300 }, N_FIX),
    priceTLPerKg: asm(8.5, `${ECON} (2025/26 dry alfalfa hay bale reference)`),
    varCostTLPerDa: asm(5800, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  vetch: {
    id: "vetch",
    name: { tr: "Macar fiği (yem/örtü)", en: "Hungarian vetch (forage/cover)" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("11-01", "12-15", [30, 90, 40, 10], "Assumption: winter forage cut for hay at full bloom"),
        north_lowland: cal("10-15", "11-30", [30, 140, 40, 10], "Assumption: winter forage cut for hay at full bloom"),
        highland: cal("10-05", "11-10", [30, 170, 40, 10], "Assumption: winter forage cut for hay at full bloom"),
      },
      kc: asm({ ini: 0.4, mid: 1.0, end: 0.9 }, "Assumption: not in FAO-56; set close to clover/berseem hay (Table 12)"),
      rootDepthMaxM: asm(0.8, "Assumption: clover-like, FAO-56 Table 22 clover 0.6–0.9 m"),
      p: asm(0.5, "Assumption: clover-like, FAO-56 Table 22"),
      ky: asm(1.0, "Assumption: not tabulated"),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -18 }, "Assumption: Vicia pannonica is cold tolerant; winter-kill about −18 °C air temperature"),
      heat: asm({ thresholdC: 32, stages: ["mid"] }, "Assumption"),
      gdd: asm({ baseC: 0, required: 900 }, "Assumption: GDD base 0 °C to hay cut"),
      cover: lit("close_legume", TR55),
    },
    nContributionKgHa: asm({ low: 40, high: 80 }, "Assumption: N credit when cut for hay; more if incorporated"),
    residue: asm("medium", "Assumption"),
    refYieldTHa: asm({ irrigated: 6, rainfed: 3.5 }, `${YIELD} (dry hay)`),
    rainfedCeilingTHa: asm(4.5, RF_CEILING),
    phRange: asm({ min: 6.0, max: 8.0 }, PH),
    nRemovalKgPerT: asm(30, N_REMOVAL),
    nFixationKgHa: asm({ low: 60, high: 150 }, N_FIX),
    priceTLPerKg: asm(7.5, `${ECON} (2025/26 dry vetch forage hay reference)`),
    varCostTLPerDa: asm(2900, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  cotton: {
    id: "cotton",
    name: { tr: "Pamuk", en: "Cotton" },
    family: "malvaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("04-20", "05-20", [30, 50, 60, 55], `Sowing date assumption; stage lengths ${FAO56_T11} cotton (Mar–May, Egypt)`),
        north_lowland: cal("04-25", "05-20", [30, 50, 60, 55], `Sowing date assumption; stage lengths ${FAO56_T11} cotton (Mar–May, Egypt)`),
        highland: cal("05-01", "05-25", [30, 50, 60, 55], `Sowing date assumption; stage lengths ${FAO56_T11} cotton (Mar–May, Egypt)`),
      },
      kc: lit({ ini: 0.35, mid: 1.18, end: 0.6 }, `${FAO56_T12} (mid 1.15–1.20, end 0.70–0.50)`),
      rootDepthMaxM: lit(1.3, `${FAO56_T22} (1.0–1.7 m)`),
      p: lit(0.65, FAO56_T22),
      ky: lit(0.85, FAO33),
      frost: asm({ criticalC: 0, stages: ["ini", "dev"], winterKillC: null }, "Assumption: frost-sensitive at 0 °C"),
      heat: asm({ thresholdC: 38, stages: ["mid"] }, "Assumption: boll shedding above about 38 °C"),
      gdd: asm({ baseC: 15.5, required: 1200 }, "Assumption: DD60 2200–2600 °F·d literature order, converted"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("medium", "Assumption: stalks"),
    refYieldTHa: asm({ irrigated: 5.0, rainfed: 1.5 }, `${YIELD} (seed cotton)`),
    rainfedCeilingTHa: asm(2.5, RF_CEILING),
    phRange: asm({ min: 5.5, max: 8.5 }, PH),
    nRemovalKgPerT: asm(25, N_REMOVAL),
    priceTLPerKg: asm(31, `${ECON} (2025/26 Çukobirlik / Tariş seed cotton reference)`),
    varCostTLPerDa: asm(12500, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  lentil_green: {
    id: "lentil_green",
    name: { tr: "Yeşil mercimek", en: "Green lentil" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("12-01", "01-15", [25, 35, 65, 35], CAL_NOTE(`${FAO56_T11} lentil winter/early spring`)),
        north_lowland: cal("03-10", "04-15", [20, 30, 50, 25], CAL_NOTE(`${FAO56_T11} lentil spring (Apr, Europe) 20/30/60/40`)),
        highland: cal("03-15", "04-20", [20, 35, 45, 25], CAL_NOTE(`${FAO56_T11} Central Anatolia plateau green lentil (Yozgat/Çorum/Konya)`)),
      },
      kc: lit({ ini: 0.4, mid: 1.1, end: 0.3 }, FAO56_T12),
      rootDepthMaxM: lit(0.75, `${FAO56_T22} (0.6–0.8 m)`),
      p: lit(0.5, FAO56_T22),
      ky: asm(0.95, "Assumption: FAO-33/TAGEM grain legume drought response"),
      frost: asm({ criticalC: -2, stages: ["mid"], winterKillC: -14 }, "Assumption: plateau green lentil tolerates cold early spring; flowering frost −2 °C"),
      heat: asm({ thresholdC: 30, stages: ["mid"] }, "Assumption: pod set heat stress above 30 °C"),
      gdd: asm({ baseC: 0, required: 1050 }, "Assumption: sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: asm({ low: 20, high: 45 }, "Assumption: biological N credit to following cereal (TAGEM/ICARDA range)"),
    residue: asm("low", "Assumption"),
    refYieldTHa: asm({ irrigated: 1.9, rainfed: 1.25 }, YIELD),
    rainfedCeilingTHa: asm(1.9, RF_CEILING_LEGUME),
    phRange: asm({ min: 6.0, max: 8.5 }, PH),
    nRemovalKgPerT: asm(40, N_REMOVAL),
    nFixationKgHa: asm({ low: 35, high: 95 }, N_FIX),
    priceTLPerKg: asm(38, `${ECON} (2025/26 TMO & Yozgat/Çorum Commodity Exchange green lentil reference)`),
    varCostTLPerDa: asm(3100, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  soybean: {
    id: "soybean",
    name: { tr: "Soya fasulyesi", en: "Soybean" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("04-15", "05-25", [20, 30, 60, 25], CAL_NOTE(`${FAO56_T11} soybean (May, Mediterranean/Çukurova) 20/30/60/25`)),
        north_lowland: cal("04-25", "05-31", [20, 35, 60, 25], CAL_NOTE(`${FAO56_T11} soybean (Samsun/Black Sea & Marmara)`)),
        highland: cal("05-05", "06-05", [20, 35, 55, 25], CAL_NOTE(`${FAO56_T11} short-season soybean on warm valleys`)),
      },
      kc: lit({ ini: 0.4, mid: 1.15, end: 0.5 }, FAO56_T12),
      rootDepthMaxM: lit(1.0, `${FAO56_T22} (0.6–1.3 m)`),
      p: lit(0.5, FAO56_T22),
      ky: lit(0.85, `${FAO33} (soybean seasonal Ky = 0.85)`),
      frost: asm({ criticalC: 0, stages: ["ini", "dev"], winterKillC: null }, "Assumption: warm-season oilseed legume sensitive to 0 °C frost"),
      heat: asm({ thresholdC: 36, stages: ["mid"] }, "Assumption: pod-fill heat stress above 36 °C"),
      gdd: asm({ baseC: 10, required: 1300 }, "Assumption: maturity group II–III soybean, base 10 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: asm({ low: 35, high: 65 }, "Assumption: Bradyrhizobium japonicum N credit to subsequent wheat/maize"),
    residue: asm("medium", "Assumption"),
    refYieldTHa: asm({ irrigated: 4.5, rainfed: 1.8 }, `${YIELD} (Çukurova/Samsun irrigated 4.2–4.8 t/ha)`),
    rainfedCeilingTHa: asm(2.8, RF_CEILING),
    phRange: asm({ min: 5.8, max: 8.2 }, PH),
    nRemovalKgPerT: asm(58, N_REMOVAL),
    nFixationKgHa: asm({ low: 80, high: 180 }, N_FIX),
    priceTLPerKg: asm(22.5, `${ECON} (2025/26 Çukobirlik / Tarım Bakanlığı strategic basin oilseed reference incl. support)`),
    varCostTLPerDa: asm(6400, ECON),
    maxConsecutive: lit(1, LEGUME_BREAK),
  },
  canola: {
    id: "canola",
    name: { tr: "Kanola (Kolza)", en: "Canola (Winter rapeseed)" },
    family: "brassicaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("10-25", "11-25", [35, 95, 55, 30], CAL_NOTE(`${FAO56_T11} winter rapeseed/canola`)),
        north_lowland: cal("10-01", "11-10", [40, 125, 55, 30], CAL_NOTE(`${FAO56_T11} Thrace/Marmara winter canola`)),
        highland: cal("09-20", "10-25", [45, 140, 55, 30], CAL_NOTE(`${FAO56_T11} Central Anatolia winter canola (rosette before winter)`)),
      },
      kc: lit({ ini: 0.35, mid: 1.1, end: 0.35 }, `${FAO56_T12} (canola/rapeseed 0.35 / 1.05–1.15 / 0.35)`),
      rootDepthMaxM: lit(1.2, `${FAO56_T22} (canola 1.0–1.5 m taproot)`),
      p: lit(0.6, FAO56_T22),
      ky: asm(0.9, "Assumption: FAO-66 canola/rapeseed yield response factor"),
      frost: asm({ criticalC: -3, stages: ["mid"], winterKillC: -16 }, "Assumption: winter rosette hardy to −16 °C if established at 6–8 leaves; flowering frost below −3 °C"),
      heat: asm({ thresholdC: 30, stages: ["mid"] }, "Assumption: silique/flowering heat abortion above 30 °C"),
      gdd: asm({ baseC: 0, required: 1650 }, "Assumption: winter canola sowing-to-maturity GDD, base 0 °C"),
      cover: lit("small_grain", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume (biofumigant taproot break crop)"),
    residue: asm("high", "Assumption: abundant brassica stalks and taproot biomass"),
    refYieldTHa: asm({ irrigated: 3.8, rainfed: 2.4 }, `${YIELD} (Thrace/Konya canola 2.2–4.0 t/ha)`),
    rainfedCeilingTHa: asm(3.0, RF_CEILING),
    phRange: asm({ min: 5.8, max: 8.3 }, PH),
    nRemovalKgPerT: asm(32, N_REMOVAL),
    priceTLPerKg: asm(26.5, `${ECON} (2025/26 Trakya Birlik / Commodity Exchange canola oilseed reference)`),
    varCostTLPerDa: asm(5100, ECON),
    maxConsecutive: lit(1, SPEC),
  },
  safflower: {
    id: "safflower",
    name: { tr: "Aspir", en: "Safflower" },
    family: "asteraceae",
    agronomy: {
      calendar: {
        south_lowland: cal("02-20", "03-25", [25, 40, 50, 25], CAL_NOTE(`${FAO56_T11} safflower early spring`)),
        north_lowland: cal("03-15", "04-20", [25, 35, 50, 25], CAL_NOTE(`${FAO56_T11} safflower (Apr, continental) 20/35/45/25`)),
        highland: cal("03-25", "04-30", [25, 35, 45, 25], CAL_NOTE(`${FAO56_T11} dryland plateau safflower (Ankara/Konya/Eskişehir)`)),
      },
      kc: lit({ ini: 0.35, mid: 1.1, end: 0.25 }, `${FAO56_T12} (safflower 0.30–0.35 / 1.05–1.15 / 0.20–0.25)`),
      rootDepthMaxM: lit(1.5, `${FAO56_T22} (safflower 1.0–2.0 m deep xerophytic taproot)`),
      p: lit(0.6, FAO56_T22),
      ky: lit(0.8, `${FAO33} (safflower drought-tolerant oilseed Ky = 0.80)`),
      frost: asm({ criticalC: -4, stages: ["ini"], winterKillC: null }, "Assumption: rosette tolerates down to −4…−6 °C in spring"),
      heat: asm({ thresholdC: 37, stages: ["mid"] }, "Assumption: high heat tolerance on dryland plateaus"),
      gdd: asm({ baseC: 5, required: 1150 }, "Assumption: spring safflower GDD base 5 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("medium", "Assumption: deep taproot channels improve subsoil infiltration"),
    refYieldTHa: asm({ irrigated: 2.4, rainfed: 1.4 }, `${YIELD} (TAGEM Central Anatolia dryland safflower 1.2–1.6 t/ha)`),
    rainfedCeilingTHa: asm(1.9, RF_CEILING),
    phRange: asm({ min: 6.0, max: 8.6 }, PH),
    nRemovalKgPerT: asm(26, N_REMOVAL),
    priceTLPerKg: asm(24.0, `${ECON} (2025/26 strategic dryland oilseed reference + basin support)`),
    varCostTLPerDa: asm(3300, ECON),
    maxConsecutive: lit(1, SPEC),
  },
  potato: {
    id: "potato",
    name: { tr: "Patates", en: "Potato" },
    family: "solanaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("02-15", "03-20", [25, 30, 45, 25], CAL_NOTE(`${FAO56_T11} early potato (Adana/İzmir)`)),
        north_lowland: cal("04-05", "05-10", [25, 30, 45, 30], CAL_NOTE(`${FAO56_T11} maincrop potato 25/30/45/30`)),
        highland: cal("04-20", "05-25", [25, 35, 45, 30], CAL_NOTE(`${FAO56_T11} Niğde/Nevşehir/Afyon/Konya plateau potato`)),
      },
      kc: lit({ ini: 0.45, mid: 1.15, end: 0.75 }, FAO56_T12),
      rootDepthMaxM: lit(0.6, `${FAO56_T22} (potato shallow root zone 0.4–0.6 m)`),
      p: lit(0.35, FAO56_T22),
      ky: lit(1.1, `${FAO33} (potato seasonal Ky = 1.10)`),
      frost: asm({ criticalC: -1, stages: ["ini", "dev"], winterKillC: null }, "Assumption: potato foliage damaged below −1 °C"),
      heat: asm({ thresholdC: 31, stages: ["mid"] }, "Assumption: tuberization inhibited above 30–31 °C soil/air temperature"),
      gdd: asm({ baseC: 7, required: 1150 }, "Assumption: GDD base 7 °C"),
      cover: lit("row", TR55),
    },
    nContributionKgHa: lit({ low: 0, high: 0 }, "Non-legume"),
    residue: asm("low", "Assumption: low surface residue after tuber lifting"),
    refYieldTHa: asm({ irrigated: 42.0, rainfed: 14.0 }, `${YIELD} (TÜİK Niğde/Konya/Afyon irrigated 38–48 t/ha)`),
    rainfedCeilingTHa: asm(18.0, RF_CEILING),
    phRange: asm({ min: 5.2, max: 7.8 }, PH),
    nRemovalKgPerT: asm(3.5, N_REMOVAL),
    priceTLPerKg: asm(9.5, `${ECON} (2025/26 farm-gate maincrop potato reference)`),
    varCostTLPerDa: asm(18500, ECON),
    maxConsecutive: lit(1, SPEC),
  },
  sainfoin: {
    id: "sainfoin",
    name: { tr: "Korunga (kuru ot)", en: "Sainfoin (dryland forage)" },
    family: "fabaceae",
    agronomy: {
      calendar: {
        south_lowland: cal("10-25", "12-01", [25, 75, 70, 20], "Assumption: autumn/early spring dryland forage cut"),
        north_lowland: cal("03-15", "04-20", [20, 45, 85, 20], "Assumption: one-year slice of dryland sainfoin stand"),
        highland: cal("03-25", "04-30", [25, 45, 80, 20], "Assumption: Eastern & Central Anatolia highland dryland sainfoin"),
      },
      kc: asm({ ini: 0.4, mid: 0.9, end: 0.75 }, "Assumption: FAO-56 forage legume adjusted for dryland sainfoin cutting"),
      rootDepthMaxM: lit(1.5, `${FAO56_T22} (deep taproot 1.2–1.8 m on calcareous soils, capped at 1.5 m column)`),
      p: lit(0.6, FAO56_T22),
      ky: asm(0.85, "Assumption: drought-hardy forage legume"),
      frost: asm({ criticalC: -6, stages: ["ini"], winterKillC: -22 }, "Assumption: Onobrychis viciifolia is extreme cold/winter hardy (−22 °C)"),
      heat: asm({ thresholdC: 36, stages: ["mid"] }, "Assumption: tolerant of continental summer warmth"),
      gdd: asm({ baseC: 4, required: 1000 }, "Assumption: GDD base 4 °C"),
      cover: lit("close_legume", TR55),
    },
    nContributionKgHa: asm({ low: 55, high: 110 }, "Assumption: biological N credit to following winter wheat/barley"),
    residue: asm("high", "Assumption: dense root/crown biomass prevents erosion on sloped parcels"),
    refYieldTHa: asm({ irrigated: 7.5, rainfed: 4.2 }, `${YIELD} (dry hay, non-bloating condensed-tannin forage)`),
    rainfedCeilingTHa: asm(5.5, RF_CEILING),
    phRange: asm({ min: 6.2, max: 8.8 }, PH),
    nRemovalKgPerT: asm(26, N_REMOVAL),
    nFixationKgHa: asm({ low: 90, high: 200 }, N_FIX),
    priceTLPerKg: asm(8.2, `${ECON} (2025/26 quality sainfoin dry hay bale reference)`),
    varCostTLPerDa: asm(3200, ECON),
    maxConsecutive: lit(2, SPEC),
  },
  fallow: {
    id: "fallow",
    name: { tr: "Nadas", en: "Fallow" },
    family: "none",
    agronomy: null,
    nContributionKgHa: lit({ low: 0, high: 0 }, "No crop"),
    residue: asm("low", "Assumption: clean (weed-free) fallow"),
    refYieldTHa: lit({ irrigated: 0, rainfed: 0 }, "No crop"),
    priceTLPerKg: lit(0, "No crop"),
    varCostTLPerDa: asm(800, `${ECON} (tillage/weed control)`),
    maxConsecutive: lit(2, SPEC),
  },
};

export const CROP_IDS: CropId[] = [
  "wheat_winter", "barley_winter", "chickpea", "lentil_red", "lentil_green",
  "sugar_beet", "maize_grain", "sunflower", "soybean", "canola", "safflower",
  "dry_bean", "potato", "alfalfa", "sainfoin", "vetch", "cotton", "fallow",
];

/** Default 12-crop candidate pool when caller does not specify `field.candidateCrops` (preserves 12³ = 1,728 baseline enumeration). */
export const DEFAULT_CANDIDATE_CROP_IDS: CropId[] = [
  "wheat_winter", "barley_winter", "chickpea", "lentil_red", "sugar_beet", "maize_grain",
  "sunflower", "dry_bean", "alfalfa", "vetch", "cotton", "fallow",
];

/** Global agronomic constants used by the water balance. */
export const CROP_CONSTANTS = {
  /** Initial effective root depth at sowing, m (FAO-56 Ch. 8: 0.15–0.20 m). */
  rootDepthMinM: lit(0.2, "FAO-56 Chapter 8 (0.15–0.20 m)"),
  /** Days between harvest and the next sowing for seedbed preparation. */
  turnaroundDays: asm(10, "Assumption: minimum seedbed-preparation interval"),
  /** Minimum initial / development stage when an autumn sowing is delayed. */
  minIniDays: asm(10, "Assumption"),
  minDevDays: asm(30, "Assumption"),
  /** Maximum bare-soil evaporation coefficient (FAO-56 Ch. 7, Kc max 1.05–1.30; lower bound). */
  keMaxBare: lit(1.05, "FAO-56 Chapter 7, Eq. 72 lower bound"),
  /** Effective evaporation layer / bare top-bucket depth, m (FAO-56 Ze 0.10–0.15 m). */
  zBareM: lit(0.15, "FAO-56 Chapter 7 (Ze 0.10–0.15 m)"),
  /** Simulated soil column depth, m (≥ deepest rooting depth in the database). */
  zColumnM: asm(1.5, "Assumption: deepest root depth in the crop table"),
  /** Default irrigation water cost, TL/m³ of gross withdrawal. */
  waterPriceTLPerM3: asm(1.0, ECON),
  /** Irrigation covering this share of the rainfed deficit counts as fully irrigated management (deficit irrigation keeps high-input management). */
  irrigatedManagementShare: asm(0.5, "Assumption: supplying ≥ 50 % of the rainfed water deficit means the field is managed as irrigated (inputs, cultivar); below it Ym moves linearly towards the rainfed ceiling"),
  /** Share of the (irrigated-management) variable cost spent under rainfed management; cost = cost × (share + (1 − share)·s). */
  rainfedCostShare: asm(0.6, `${ECON}: rainfed fields use less N, seed and crop protection`),
  /** Fertiliser N price, TL per kg N (urea ≈ 46 % N); values the N credit of a previous legume/fallow. */
  nPriceTLPerKgN: asm(40, `${ECON} (urea-N)`),
  /** Water-productivity bound for small-grain cereals: grain ≤ TE·(seasonal ETa − E0). */
  wpTranspirationEfficiencyKgHaMm: lit(20, "French & Schultz (1984) Aust. J. Agric. Res. 35: 20 kg grain/ha per mm of water use (applied here to simulated seasonal ETa — assumption)"),
  wpEvaporationMm: lit(110, "French & Schultz (1984) Aust. J. Agric. Res. 35: 110 mm intercept (soil evaporation)"),
} as const;
