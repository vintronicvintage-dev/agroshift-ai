/**
 * AgroShift AI — shared types.
 *
 * Section 1 is the data contract from docs/spec.md §3 (verbatim). The data layer
 * (`src/lib/data`, `src/app/api`) produces these; the engine consumes them.
 *
 * Section 2 is the engine's public input/output surface (`src/lib/engine/index.ts`).
 * The UI can be built against this file alone.
 *
 * Owner: engine agent.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Data contract (spec §3) — verbatim
// ─────────────────────────────────────────────────────────────────────────────

export interface DailyWeather {
  date: string;        // "YYYY-MM-DD"
  tmax: number | null; // °C, 2 m
  tmin: number | null; // °C
  tmean: number | null;// °C
  rh: number | null;   // %, 2 m bağıl nem
  wind2m: number | null;// m/s, 2 m
  rs: number | null;   // MJ/m²/gün, yüzeye gelen kısa dalga
  precip: number | null;// mm/gün
  gwetRoot: number | null; // 0–1, kök bölgesi toprak ıslaklığı (MERRA-2)
  gwetTop: number | null;  // 0–1
}
export interface SourceMeta {
  name: string; provider: string; url: string;
  retrievedAt: string; spatialResolution: string; note?: string;
}
export interface ClimateSeries {
  lat: number; lon: number; elevation: number; // m
  start: string; end: string;
  daily: DailyWeather[];
  sources: SourceMeta[];
}
export interface SoilProfile {
  sand: number; silt: number; clay: number; // %, 0–30 cm ağırlıklı ortalama
  soc: number | null;   // g/kg
  ph: number | null;
  textureClass: string; // USDA
  origin: "soilgrids" | "user" | "default";
  sources: SourceMeta[];
}
export interface NdviSeries {
  lat: number; lon: number;
  points: { date: string; ndvi: number }[]; // 16 günlük MODIS
  sources: SourceMeta[];
}
export interface SoilLayer { top: number; bottom: number; // cm
  sand: number | null; silt: number | null; clay: number | null; // %
  soc: number | null;        // g/kg
  ph: number | null; cec: number | null; // cmol(c)/kg
  nitrogen: number | null;   // g/kg
  bulkDensity: number | null; // g/cm3
  coarseFragments: number | null; // vol %
  thetaFC: number | null; thetaWP: number | null; } // m3/m3 at 33 kPa and 1500 kPa, null if not available
export interface TerrainInfo { elevationMean: number; elevationMin: number; elevationMax: number; // m
  slopePct: number; aspectDeg: number | null; samples: number; sources: SourceMeta[]; }
export interface PrecipCrossCheck { reference: "era5-land" | "era5"; years: number[]; powerAnnual: number[]; referenceAnnual: number[];
  monthlyRatio: number[]; // 12 values, reference / POWER, long-term monthly means
  annualRatio: number; sources: SourceMeta[]; }

// ─────────────────────────────────────────────────────────────────────────────
// 2. Engine types
// ─────────────────────────────────────────────────────────────────────────────

/** Ready-to-show text in both UI languages. */
export interface LocalizedText { tr: string; en: string }

/** "literature" = taken from a cited table/paper; "assumption" = engineering guess, user should review. */
export type Confidence = "literature" | "assumption";

/** A parameter value together with where it came from. */
export interface Sourced<T> { value: T; source: string; confidence: Confidence }

/** Trace of how a number was produced. */
export interface Evidence {
  formula: string;
  inputs: Record<string, number | string | null>;
  sources: string[];
}

// ── Crops ────────────────────────────────────────────────────────────────────

export type CropId =
  | "wheat_winter" | "barley_winter" | "chickpea" | "lentil_red" | "sugar_beet"
  | "maize_grain" | "sunflower" | "dry_bean" | "alfalfa" | "vetch" | "cotton" | "fallow";

export type CropFamily = "poaceae" | "fabaceae" | "amaranthaceae" | "asteraceae" | "malvaceae" | "none";

/** Coarse agro-climatic zone used to pick the regional crop calendar (Türkiye, 36–42°N). */
export type ClimateZone = "south_lowland" | "north_lowland" | "highland";

export type StageName = "ini" | "dev" | "mid" | "late";

/** SCS-CN cover type (USDA TR-55 Table 2-2b, cultivated land). */
export type CoverType = "row" | "small_grain" | "close_legume" | "bare";

export interface CropCalendar {
  /** Preferred sowing date "MM-DD". Months Aug–Dec are autumn sowing (previous calendar year of the agricultural year). */
  sow: string;
  /** Latest acceptable sowing date "MM-DD" (hard calendar constraint). */
  latestSow: string;
  /** FAO-56 stage lengths in days: initial, development, mid-season, late-season. */
  stages: [number, number, number, number];
}

export interface CropAgronomy {
  calendar: Record<ClimateZone, Sourced<CropCalendar>>;
  kc: Sourced<{ ini: number; mid: number; end: number }>;
  rootDepthMaxM: Sourced<number>;
  /** FAO-56 Table 22 depletion fraction p (for ETc ≈ 5 mm/day). */
  p: Sourced<number>;
  /** Seasonal yield response factor (FAO-33/66). */
  ky: Sourced<number>;
  frost: Sourced<{ criticalC: number; stages: StageName[]; winterKillC: number | null }>;
  heat: Sourced<{ thresholdC: number; stages: StageName[] }>;
  gdd: Sourced<{ baseC: number; required: number }>;
  cover: Sourced<CoverType>;
}

export interface CropDef {
  id: CropId;
  name: LocalizedText;
  family: CropFamily;
  /** null only for fallow. */
  agronomy: CropAgronomy | null;
  /** Nitrogen left for the following crop, kg N/ha (range). */
  nContributionKgHa: Sourced<{ low: number; high: number }>;
  residue: Sourced<"low" | "medium" | "high">;
  /** Reference yields, t/ha (TÜİK order of magnitude). Irrigated value is used as Ym (no water stress). */
  refYieldTHa: Sourced<{ irrigated: number; rainfed: number }>;
  /**
   * Engine v2: water-unlimited yield under typical RAINFED management (lower N, density, inputs), t/ha.
   * Ym for a crop-year = rainfed ceiling + (irrigated − rainfed ceiling) × irrigation intensity.
   * `refYieldTHa.rainfed` stays the average (water-limited) rainfed yield shown for comparison.
   */
  rainfedCeilingTHa?: Sourced<number>;
  /** Engine v2: soil pH range where the crop grows without a pH-related flag (assumption). */
  phRange?: Sourced<{ min: number; max: number }>;
  /** Engine v2: N removed with the harvested product, kg N per t (fresh product as sold). */
  nRemovalKgPerT?: Sourced<number>;
  /** Engine v2: biological N fixation, kg N/ha per crop year (legumes only). */
  nFixationKgHa?: Sourced<{ low: number; high: number }>;
  /** Product price, TL/kg — scenario assumption, user editable. */
  priceTLPerKg: Sourced<number>;
  /** Variable cost excluding irrigation water, TL/da — scenario assumption, user editable. */
  varCostTLPerDa: Sourced<number>;
  /** Hard constraint: maximum years in a row of this crop. */
  maxConsecutive: Sourced<number>;
}

// ── Inputs ───────────────────────────────────────────────────────────────────

export type RotationSequence = [CropId, CropId, CropId];

/** Farmer priority weights; any non-negative numbers, normalised internally to sum 1. */
export interface PriorityWeights { water: number; income: number; soil: number; risk: number }

export interface ScenarioInput {
  /** Daily precipitation multiplier, 0.6–1.2 (−40 %…+20 %). Default 1. */
  rainMultiplier?: number;
  /** Added to tmax/tmin/tmean, 0…+4 °C; ET₀ is recomputed with RH held constant. Default 0. */
  tempDeltaC?: number;
  /** Overrides the field's annual irrigation budget (m³/da/yr = mm/yr). */
  irrigationBudgetMm?: number | null;
  /** Multiplies every crop price. Default 1. */
  priceMultiplier?: number;
}

export type ScenarioPresetId = "typical" | "dry" | "hot_dry";
export interface ScenarioPreset {
  id: ScenarioPresetId;
  label: LocalizedText;
  scenario: { rainMultiplier: number; tempDeltaC: number; priceMultiplier: number };
}

export interface CropEconomicsOverride {
  priceTLPerKg?: number;
  varCostTLPerDa?: number;
  refYieldIrrigatedTHa?: number;
  /** Engine v2: overrides the rainfed-management (water-unlimited) yield ceiling, t/ha. */
  refYieldRainfedCeilingTHa?: number;
}

/**
 * Rainfall correction chosen by the caller (never applied silently). "annual": every daily value ×
 * factorAnnual; "monthly": daily value × factorsMonthly[month − 1] (12 values, January first).
 * Combined multiplicatively with the scenario rain multiplier. Reported in assumptions and evidence.
 */
export interface PrecipAdjustment {
  mode: "none" | "annual" | "monthly";
  factorAnnual?: number;
  factorsMonthly?: number[];
  provenance: string;
}

export interface FieldInput {
  /** Field area in decares (1 da = 0.1 ha = 1000 m²). */
  areaDa: number;
  /** Mean slope, %. Optional; raises the bare-soil erosion penalty. */
  slopePct?: number | null;
  soil: SoilProfile;
  /** Annual irrigation water budget in m³/da/yr (identical to mm/yr). 0 = rainfed ("kuru tarım"). */
  irrigationBudgetMm: number;
  /** Whether the budget is net water reaching the root zone (spec default) or gross water withdrawn. */
  budgetBasis?: "net" | "gross";
  /** Irrigation application efficiency, 0–1 (e.g. furrow 0.6, sprinkler 0.75, drip 0.9). */
  irrigationEfficiency: number;
  /** The farmer's current 3-year rotation. Always evaluated. */
  currentRotation: RotationSequence;
  /** Crops the farmer refuses to grow. */
  excludedCrops?: CropId[];
  /** Candidate set for the optimiser (default: all 12 crops incl. fallow). */
  candidateCrops?: CropId[];
  priorities?: Partial<PriorityWeights>;
  /** Engine v2: layered soil profile (e.g. SoilGrids 0–5 … 100–200 cm). Used for layered TAW and pH flags. */
  soilLayers?: SoilLayer[];
  /** Engine v2: terrain (slope, elevation). Used for slope-adjusted CN, erosion indicator and temperature lapse. */
  terrain?: TerrainInfo;
}

export interface EconomicsInput {
  crops?: Partial<Record<CropId, CropEconomicsOverride>>;
  /** Irrigation water cost, TL per m³ of gross withdrawal (assumption, default 1.0). */
  waterPriceTLPerM3?: number;
}

export interface AnalysisInput {
  climate: ClimateSeries;
  field: FieldInput;
  scenario?: ScenarioInput;
  economics?: EconomicsInput;
  options?: {
    /** Number of best screening candidates replayed exactly (default 40). */
    shortlistSize?: number;
    /** User-built plans to evaluate alongside (not ranked as recommendations). */
    extraPlans?: RotationSequence[];
    /** Engine v2: robust ranking across typical / dry / hot-dry (default true). */
    robust?: boolean;
    /** Engine v2: one-at-a-time ±20 % rank-stability sweep on the shortlist (default true). */
    sensitivity?: boolean;
  };
  /** Engine v2: independent rainfall cross-check (e.g. ERA5-Land). Reported, never applied by itself. */
  precipCheck?: PrecipCrossCheck;
  /** Engine v2: explicit rainfall correction chosen by the caller. */
  precipAdjustment?: PrecipAdjustment;
}

// ── Outputs ──────────────────────────────────────────────────────────────────

/** Distribution over historical 3-year windows. null fields never appear: if there are no windows the Dist itself is null. */
export interface Dist { p10: number; p50: number; p90: number; mean: number; n: number }

export interface ExplanationItem {
  /** Stable i18n key, e.g. "why.lessWater". */
  key: string;
  params: Record<string, number | string>;
  /** Ready strings in both languages (rendered from key + params). */
  text: LocalizedText;
  /** Names of data/method sources this item relies on. */
  sources?: string[];
}

export interface Explanation {
  why: ExplanationItem[];
  evidence: ExplanationItem[];
  benefits: ExplanationItem[];
  gaps: ExplanationItem[];
  localReview: ExplanationItem[];
}

/** Engine v2: plain-language farmer narrative (kept outside `Explanation` so `keyof Explanation` stays list-valued). */
export interface PlanNarrative {
  /** One-sentence verdict in farmer units ("sen" address in Turkish). */
  verdict: LocalizedText;
  /** "ne kazanırım" — gains versus the current rotation, with numbers in farmer units. */
  gains: ExplanationItem[];
  /** "ne kaybederim" — losses versus the current rotation. */
  losses: ExplanationItem[];
  /** "nelere dikkat" — things to watch (uncertainty phrased as "N dönemin M'inde"). */
  watch: ExplanationItem[];
}

/** Engine v2: advisory (soft) rule codes; never make a plan infeasible. */
export type WarningCode =
  | "ph_low" | "ph_high" | "break_short" | "legume_after_legume" | "cereal_after_cereal"
  | "sclerotinia_host" | "fusarium_maize_residue" | "verticillium" | "rainfed_irrigated_crop"
  | "erosion_high" | "salinity_unknown";

export interface PlanWarning {
  code: WarningCode;
  cropId: CropId | null;
  /** Rotation year 1–3 (0 = whole plan). */
  year: number;
  severity: "info" | "warn";
  text: LocalizedText;
}

/** Engine v2: constraint or advisory message for the live rotation builder. */
export interface BuilderMessage {
  code: ConstraintCode | WarningCode;
  kind: "constraint" | "warning";
  cropId: CropId | null;
  year: number;
  text: LocalizedText;
}

/** Engine v2: one historical 3-year window of a plan (for the year-by-year heat strip). */
export interface PlanWindow {
  /** Agricultural year of rotation year 1 (AY c = Oct c−1 … Sep c). */
  startYear: number;
  /** Rain-only water deficit (ΣETc − ΣETa of a rainfed run), mm/yr. */
  deficitMmPerYr: number;
  /** ETc − ETa under the budget, mm/yr. */
  unmetMmPerYr: number;
  budgetExceeded: boolean;
  budgetExceededByYear: [boolean, boolean, boolean];
  /** Mean water-limited yield ratio Ya/Ym over the crop years (null when the plan is all fallow). */
  yieldRatio: number | null;
  yieldRatioByYear: [number | null, number | null, number | null];
  marginTLPerDaPerYr: number;
}

/** Engine v2: mean monthly water flows of a plan, by rotation year (36 rows, Oct of year 1 first). */
export interface MonthlyDemand {
  year: 1 | 2 | 3;
  /** Calendar month 1–12. */
  month: number;
  /** 0…35 from October of rotation year 1. */
  index: number;
  etcMm: number;
  etaMm: number;
  /** Rain that stayed in the soil: P − runoff − deep percolation, mm. */
  effectiveRainMm: number;
  irrigationMm: number;
  /** Crop ETc − ETa, mm. */
  deficitMm: number;
  /** Soil evaporation on bare days, mm. */
  bareEvapMm: number;
}

export interface PreCropEffectInfo {
  /** Rotation year (1–3) of the following crop. */
  year: number;
  prev: CropId;
  cropId: CropId;
  /** Multiplier on the following crop's yield (1 = no effect). */
  yieldFactor: number;
  /** Fertiliser-N credit for the following crop, kg N/ha. */
  nCreditKgHa: { low: number; high: number };
  /** Fertiliser cost saved on the following crop, TL/da (mid credit × N price, capped by the crop's N need). */
  nCostSavingTLPerDa: number;
  codes: string[];
  note: LocalizedText;
  source: string;
  confidence: Confidence;
}

export interface NitrogenBalance {
  label: "indicator";
  /** Legume N fixation, kg N/ha/yr (cycle mean). */
  fixationKgHaYr: { low: number; high: number };
  /** N removed with harvested products (P50 yields), kg N/ha/yr. */
  removalKgHaYr: { low: number; high: number };
  /** Fixation − removal (fertiliser not counted), kg N/ha/yr. */
  balanceKgHaYr: { low: number; high: number };
  sources: string[];
}

export interface SoilCoverIndicator {
  /** Mean days per calendar month (Jan first) with a crop past its initial stage. */
  coveredDaysByMonth: number[];
  /** Mean days per month in a crop's initial (establishing) stage. */
  establishingDaysByMonth: number[];
  /** Mean days per month with no crop (fallow, between harvest and sowing). */
  bareDaysByMonth: number[];
}

export interface ErosionIndicator {
  label: "indicator";
  /** RUSLE-style mean annual soil loss A = R·K·LS·C·P, t/ha/yr; null without slope information. */
  aTHaYr: number | null;
  class: "low" | "moderate" | "high" | "very_high" | null;
  /** Rainfall erosivity, MJ·mm/(ha·h·yr). */
  rFactor: number | null;
  /** Soil erodibility, t·ha·h/(ha·MJ·mm). */
  kFactor: number;
  lsFactor: number | null;
  /** Erosivity-weighted cover-management factor of the plan (0–1). */
  cFactor: number;
  pFactor: number;
  slopePct: number | null;
  slopeSource: "terrain" | "field" | "none";
  evidence: Evidence;
}

export interface TradeSummary {
  windows: number;
  /** Windows in which the water budget was enough (rainfed: no year with yield ratio < 0.5). */
  okWindowsPlan: number;
  okWindowsCurrent: number;
  marginDiffTLPerDaPerYr: number | null;
  /** Irrigation need difference (net), m³/da/yr (= mm). */
  waterDiffM3PerDaPerYr: number | null;
  fieldMarginDiffTLPerYr: number | null;
  lines: LocalizedText[];
}

export interface RobustScenarioResult {
  id: "active" | ScenarioPresetId;
  label: LocalizedText;
  rainMultiplier: number;
  tempDeltaC: number;
  composite: number;
  /** Best composite in this scenario minus this plan's composite (0 = best). */
  regret: number;
  marginP50: number;
  requirementP50: number;
}

export interface RobustInfo {
  scenarios: RobustScenarioResult[];
  maxRegret: number;
  meanComposite: number;
  /** Mean of the worst 20 % of window margins pooled over all scenarios, TL/da/yr. */
  cvar20MarginTLPerDaPerYr: number;
}

export interface StabilityFlip {
  assumption: "price" | "cost" | "yield" | "rain" | "budget";
  change: "+20%" | "-20%";
  label: LocalizedText;
  /** Plan that took this plan's place in the top 3. */
  replacedBy: string | null;
}

export interface StabilityInfo {
  runs: number;
  /** Share of sweep runs in which the plan stays among the 3 recommended plans. */
  top3Share: number;
  flips: StabilityFlip[];
}

export type ConfidenceGrade = "A" | "B" | "C" | "D";

export interface PlanConfidence {
  grade: ConfidenceGrade;
  /** 0–100 */
  score: number;
  factors: { dataCompleteness: number; rainfallCalibration: number; parameterLiterature: number; rankStability: number | null };
  reasons: LocalizedText[];
}

export type ConstraintCode =
  | "excluded" | "max_consecutive" | "calendar_conflict" | "gdd_insufficient" | "frost_window" | "not_candidate";

export interface ConstraintViolation {
  code: ConstraintCode;
  cropId: CropId;
  /** Rotation year 1–3 (0 = whole plan). */
  year: number;
  text: LocalizedText;
}

export interface PlanSlotCalendar {
  cropId: CropId;
  /** 1–3 */
  year: number;
  /** null for fallow. */
  sow: string | null;     // "MM-DD"
  harvest: string | null; // "MM-DD"
  /** Sowing delayed by the previous harvest, days. */
  delayDays: number;
  stages: [number, number, number, number] | null;
  /** Bare-soil days from this slot's harvest (or previous harvest for fallow) to the next sowing. */
  bareDaysAfter: number;
}

export interface YearResult {
  year: number; // 1–3
  cropId: CropId;
  yieldRatio: Dist | null;   // Ya/Ym
  yieldTHa: Dist | null;
  irrigationNetMm: Dist | null;
  unmetDeficitMm: Dist | null;
  /** Share of windows where this year's irrigation demand exceeded the remaining budget. */
  budgetExceededShare: number | null;
  /** Mean days with tmin below the crop's critical-stage frost threshold. */
  frostDaysMean: number | null;
  winterKillDaysMean: number | null;
  heatDaysMean: number | null;
  /** Plant-available water in the 1.5 m column at sowing, mm (P50). Shows the carry-over effect. */
  soilWaterAtSowingMm: Dist | null;
  grossMarginTLPerDa: Dist | null;
  /** Engine v2: Ym actually used (rainfed ceiling ↔ irrigated by irrigation intensity), t/ha. */
  ymTHa?: number | null;
  /** Engine v2: irrigation intensity 0–1 = Σ irrigation / Σ rainfed deficit of this slot over windows. */
  irrigationIntensity?: number | null;
  /** Engine v2: previous-crop yield multiplier applied to this year. */
  preCropFactor?: number | null;
  /** Engine v2: share of windows where the French–Schultz water-productivity bound capped the yield. */
  wpCapShare?: number | null;
}

export interface WaterResult {
  /** Mean annual water the plan needs beyond rain + stored soil water (ΣETc − ΣETa of a rainfed run), mm/yr. "Su açığı". */
  requirementMmPerYr: Dist | null;
  irrigationNetMmPerYr: Dist | null;
  /** Gross withdrawal = net / efficiency, m³/da/yr. */
  irrigationGrossM3PerDaPerYr: Dist | null;
  /** Mean annual ETc − ETa under the budget ("karşılanamayan açık"), mm/yr. */
  unmetDeficitMmPerYr: Dist | null;
  /** Same, for the whole field, m³/yr (1 mm × 1 da = 1 m³). */
  unmetDeficitFieldM3PerYr: Dist | null;
  /** Share of windows in which at least one year ran out of budget while the crop needed water. */
  budgetExceededShare: number | null;
  budgetExceededShareByYear: [number | null, number | null, number | null];
  deepPercolationMmPerYr: Dist | null;
  runoffMmPerYr: Dist | null;
  /** Largest absolute water-balance residual over all windows, mm (should be ~0). */
  massBalanceMaxErrorMm: number | null;
}

export interface SoilHealthComponent {
  key: "diversity" | "family_break" | "legume" | "bare_soil" | "root_diversity" | "residue";
  label: LocalizedText;
  /** 0–1 */
  value: number;
  /** Points out of 100 this component can contribute. */
  weight: number;
  detail: string;
}

export interface SoilHealthResult {
  /** 0–100 composite indicator (not a measurement). */
  score: number;
  components: SoilHealthComponent[];
  familyCount: number;
  sameFamilyPairs: number;
  legumeYears: number;
  /** Cyclic legume → legume successions (e.g. chickpea → lentil); penalised in the legume component. */
  legumeSuccessions: number;
  nContributionKgHa: { low: number; high: number };
  bareDaysPerYear: number;
  rootDepthRangeM: number;
  residueClass: "low" | "medium" | "high";
}

export interface RiskResult {
  /** 0 (low) – 1 (high). */
  score: number;
  components: {
    budgetExceeded: number;
    lowYield: number;
    climateStress: number;
    marginDownside: number;
  };
  weights: { budgetExceeded: number; lowYield: number; climateStress: number; marginDownside: number };
}

export interface PlanScore {
  /** 0–100 weighted by the farmer's priorities, normalised across the evaluated plans. */
  composite: number;
  /** Each 0–1, higher = better for the farmer. */
  components: { water: number; income: number; soil: number; risk: number };
  weights: PriorityWeights;
}

export interface PlanResult {
  id: string;
  crops: RotationSequence;
  kind: "current" | "recommended" | "user";
  /** 1-based rank among recommendations (null for current/user plans). */
  rank: number | null;
  feasible: boolean;
  violations: ConstraintViolation[];
  calendar: PlanSlotCalendar[];
  score: PlanScore;
  water: WaterResult;
  years: YearResult[];
  economics: {
    label: "scenario";
    grossMarginTLPerDaPerYr: Dist | null;
    fieldTotal3yrTL: Dist | null;
  };
  soilHealth: SoilHealthResult;
  risk: RiskResult;
  explanation: Explanation;
  /** "exact" = full daily replay over every window. */
  basis: "exact";
  // ── Engine v2 (all optional, additive) ──
  windows?: PlanWindow[];
  monthlyDemand?: MonthlyDemand[];
  preCrop?: PreCropEffectInfo[];
  nitrogen?: NitrogenBalance;
  cover?: SoilCoverIndicator;
  erosion?: ErosionIndicator;
  trade?: TradeSummary | null;
  robust?: RobustInfo | null;
  stability?: StabilityInfo | null;
  confidence?: PlanConfidence;
  warnings?: PlanWarning[];
  narrative?: PlanNarrative;
  /** Pareto knee (compromise) plan among the exactly replayed plans. */
  knee?: boolean;
  /** Engine v2: is the recommendation stable when the other rainfall source is used? (null = no alternative source) */
  rainSource?: RainSourceCheck | null;
}

export interface RainSourceCheck {
  /** Label of the alternative rainfall source the shortlist was re-run with. */
  alternative: LocalizedText;
  /** Mean annual precipitation of the alternative run, mm/yr. */
  alternativeAnnualMm: number;
  /** Plan is among the 3 recommended plans under the alternative rainfall too. */
  inTop3: boolean;
  /** Gross margin P50 / water requirement P50 of this plan under the alternative rainfall. */
  marginP50Alt: number | null;
  requirementP50Alt: number | null;
}

export interface CandidatePoint {
  id: string;
  crops: RotationSequence;
  requirementMmPerYr: number;
  grossMarginTLPerDaPerYr: number;
  soilHealth: number;
  composite: number;
  /** "screening" = cheap pass, "exact" = replayed. */
  basis: "screening" | "exact";
  pareto: boolean;
  /** Engine v2: Pareto knee (minimum normalised distance to the ideal point). */
  knee?: boolean;
}

export interface TrendResult {
  variable: "precip" | "et0" | "hot_days" | "frost_days" | "gwet_root";
  unit: string;
  years: number[];
  values: number[];
  /** Mann–Kendall S, Z, two-sided p. */
  s: number; z: number; p: number;
  /** Sen slope per year (unit/yr) and intercept at years[0]. */
  senSlope: number; intercept: number;
  significant: boolean;
  direction: "increasing" | "decreasing" | "none";
}

export interface DataQualityReport {
  totalDays: number;
  /** Per variable: days filled by linear interpolation (gaps ≤ 3 days). */
  interpolatedDays: Record<"tmax" | "tmin" | "rh" | "wind2m" | "rs" | "precip" | "gwetRoot", number>;
  /** Per variable: days still missing after interpolation. */
  missingDays: Record<"tmax" | "tmin" | "rh" | "wind2m" | "rs" | "precip" | "gwetRoot", number>;
  et0PenmanMonteithDays: number;
  et0HargreavesDays: number;
  /** Days with neither ET₀ nor precipitation usable. */
  unusableDays: number;
  /** Dates "YYYY-MM-DD" in calendar order were not contiguous: inserted as missing. */
  insertedMissingDates: number;
}

export interface ClimateSummary {
  period: { start: string; end: string };
  completeYears: number[];
  meanAnnualPrecipMm: number | null;
  meanAnnualEt0Mm: number | null;
  /** Under the active scenario. */
  scenarioMeanAnnualPrecipMm: number | null;
  scenarioMeanAnnualEt0Mm: number | null;
  annual: { year: number; precipMm: number | null; et0Mm: number | null; hotDays: number | null; frostDays: number | null; gwetRootMean: number | null }[];
  /** Mean monthly precipitation, ET₀ and P − ET₀ (complete years). index 0 = January. */
  monthly: { month: number; precipMm: number | null; et0Mm: number | null; balanceMm: number | null }[];
  trends: TrendResult[];
  quality: DataQualityReport;
  sources: SourceMeta[];
  evidence: Evidence[];
}

export interface SoilHydraulics {
  textureClassComputed: string;
  textureClassInput: string;
  organicMatterPct: number;
  organicMatterAssumed: boolean;
  thetaWP: number;  // m³/m³
  thetaFC: number;
  thetaSat: number;
  ksatMmH: number;
  tawMmPerM: number;
  hydrologicGroup: "A" | "B" | "C" | "D";
  curveNumbers: Record<CoverType, number>;
  rewMm: number;
  evidence: Evidence[];
  // ── Engine v2 ──
  /** Per-layer hydraulics when `field.soilLayers` was given. */
  layers?: SoilLayerHydraulics[];
  /** Plant-available water of the whole simulated column (1.5 m), mm. */
  tawColumnMm?: number;
  /** Curve numbers before the slope adjustment (TR-55 values, ~5 % slope). */
  curveNumbersBase?: Record<CoverType, number>;
  slopePct?: number | null;
  /** SOC above the plausibility cap was capped for the pedotransfer (e.g. SoilGrids topsoil artefact). */
  socCapped?: boolean;
  /** Depth-weighted soil pH of the top 30 cm (layers) or the profile pH. */
  phTopsoil?: number | null;
}

export interface SoilLayerHydraulics {
  top: number; bottom: number; // cm
  thetaFC: number; thetaWP: number; // m³/m³, bulk soil (coarse fragments removed)
  tawMmPerM: number;
  method: "measured" | "saxton-rawls" | "extrapolated";
  densityFactor: number | null;
  coarseFragmentsPct: number;
  organicMatterPct: number;
  ph: number | null;
}

export interface AssumptionItem {
  key: string;
  label: LocalizedText;
  value: string;
  source: string;
  confidence: Confidence;
}

export interface OptimizerReport {
  candidateCrops: CropId[];
  enumerated: number;
  feasible: number;
  infeasibleByReason: Partial<Record<ConstraintCode, number>>;
  screened: number;
  replayedExactly: number;
  windows: number;
  method: LocalizedText;
}

export interface AnalysisResult {
  zone: ClimateZone;
  climate: ClimateSummary;
  soil: SoilHydraulics;
  scenario: {
    rainMultiplier: number; tempDeltaC: number; priceMultiplier: number;
    irrigationBudgetMm: number; budgetNetMm: number; budgetBasis: "net" | "gross";
    irrigationEfficiency: number; waterPriceTLPerM3: number;
    notes: LocalizedText[];
  };
  windows: { count: number; agYears: number[]; excluded: { agYear: number; reason: string }[] };
  current: PlanResult;
  /** Up to 3 diverse recommendations, best first. */
  alternatives: PlanResult[];
  userPlans: PlanResult[];
  /** Non-dominated plans on (requirement ↓, margin ↑, soil health ↑) among exactly replayed plans. */
  pareto: CandidatePoint[];
  /** Every feasible sequence (screening values unless replayed). */
  candidates: CandidatePoint[];
  optimizer: OptimizerReport;
  assumptions: AssumptionItem[];
  disclaimer: LocalizedText;
  methodSources: { id: string; citation: string; url?: string }[];
  // ── Engine v2 (optional, additive) ──
  /** Best plan for the active scenario (= alternatives[0]). */
  typicalBestId?: string | null;
  /** Minimax-regret plan across the active, dry and hot-dry scenarios. */
  robustBestId?: string | null;
  /** The robust plan when it is not already among `alternatives` (otherwise null). */
  robustBest?: PlanResult | null;
  /** Pareto knee plan id among the exactly replayed plans. */
  kneeId?: string | null;
  robustness?: { scenarios: { id: "active" | ScenarioPresetId; label: LocalizedText; rainMultiplier: number; tempDeltaC: number }[]; pool: number; method: LocalizedText } | null;
  sensitivity?: { runs: number; pool: number; perturbations: { assumption: StabilityFlip["assumption"]; change: StabilityFlip["change"]; label: LocalizedText; top3: string[] }[]; method: LocalizedText } | null;
  precipitation?: {
    mode: PrecipAdjustment["mode"];
    factorsMonthly: number[];
    provenance: string | null;
    /** true when an explicit adjustment was applied or the series already carries a station calibration. */
    calibrated: boolean;
    check: { reference: string; annualRatio: number; years: number } | null;
  };
  terrain?: { slopePct: number | null; elevationMean: number | null; gridElevation: number; lapseDeltaC: number; siteElevation: number } | null;
  /**
   * Engine v2: spread of annual precipitation across the available sources and what the chosen
   * adjustment implies. `sensitive` = the top-3 recommendation changes when the other source is used.
   */
  precipUncertainty?: {
    sources: { id: "power" | "reference" | "chosen"; label: LocalizedText; annualMm: number }[];
    rangeMm: [number, number];
    chosenFactorAnnual: number;
    /** Top-3 plan ids under the alternative rainfall source (null when none was run). */
    alternativeTop3: string[] | null;
    sensitive: boolean | null;
    note: LocalizedText;
  } | null;
}
