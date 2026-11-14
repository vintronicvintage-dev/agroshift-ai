/**
 * Analysis context (engine v2): everything that depends on the input but not on the plan —
 * prepared climate (with explicit rainfall adjustment and terrain lapse), soil hydraulics (layered,
 * slope-adjusted CN), zone, windows, suitability, evaluation context. Shared by `analyze` and the
 * fast `evaluateCustomPlan` path, and memoised (small LRU keyed by climate object + input JSON).
 */
import type {
  AnalysisInput, ClimateSeries, ClimateZone, ConstraintViolation, CropId, ExplanationItem, LocalizedText, MonthlyDemand, PlanResult,
  PlanWindow, PriorityWeights, RotationSequence, SoilHydraulics, BuilderMessage, PlanWarning, PreCropEffectInfo,
} from "../types";
import { CROPS, CROP_IDS, CROP_CONSTANTS, asm } from "../crops/database";
import { climateZone, harvestMonthDay, sowMonthDay, scheduleSequence } from "../crops/calendar";
import { preCropEffect, previousCrops, N_NEED_KG_HA } from "../crops/preCrop";
import { trLocative } from "./units";
import { prepareClimate, type PreparedClimate } from "./climate";
import { soilHydraulics } from "./soil";
import { createSetup, replayWindows, simulatePlanChain, type ReplayWindow, type EngineSetup } from "./rotation";
import { cropSuitability, type CropSuitability } from "./suitability";
import {
  buildEvalContext, evaluateExactRaw, planMetrics, summarizeRaw, waterResult, yearResults, RISK_WEIGHTS, waterProductivity, deficitPerValue,
  type EvalContext, type PlanMetrics, type RawWindow,
} from "./evaluation";
import { DEFAULT_SHORTLIST, makeRecord, normalizePriorities, optimize, scorePlans, type PlanRecord } from "./optimizer";
import { DIAG_N, DIAG_ETC, DIAG_ETA, DIAG_EFFR, DIAG_IRR, DIAG_BARE, type MonthlyDiag } from "./waterBalance";
import { erosionIndicator, erosivityR, nitrogenBalance, planWarnings, soilCover } from "./indicators";
import { planConfidence, seedRaws, type ConfidenceInputs, type EvalEnv } from "./robust";
import { dist } from "./stats";

/** Standard-atmosphere lapse rate used to move POWER grid temperatures to the field elevation. */
export const LAPSE_RATE_C_PER_M = asm(0.0065, "Assumption: standard-atmosphere lapse rate 6.5 °C/km applied to tmax/tmin/tmean when the field elevation (terrain) differs from the POWER grid elevation by ≥ 50 m; capped at ±3 °C");

export interface AnalysisContext {
  input: AnalysisInput;
  /** Climate series at the site elevation (same object as input.climate without terrain). */
  series: ClimateSeries;
  siteElevation: number; gridElevation: number;
  rainMultiplier: number; tempDeltaC: number; priceMultiplier: number;
  irrigationBudgetMm: number; budgetBasis: "net" | "gross"; efficiency: number; budgetNet: number; waterPrice: number;
  priorities: PriorityWeights;
  monthlyFactors: number[];
  precip: NonNullable<import("../types").AnalysisResult["precipitation"]>;
  lapseDeltaC: number;
  slope: { pct: number | null; source: "terrain" | "field" | "none" };
  base: PreparedClimate; scen: PreparedClimate;
  soil: SoilHydraulics; zone: ClimateZone; setup: EngineSetup; windows: ReplayWindow[];
  excludedYears: { agYear: number; reason: string }[];
  suitability: Record<CropId, CropSuitability>;
  ev: EvalContext; env: EvalEnv;
  erosivity: ReturnType<typeof erosivityR>;
  candidates: CropId[]; excluded: Set<CropId>;
  conf: ConfidenceInputs;
  /** Exactly evaluated items of the last `analyze` (composite normalisation for custom plans). */
  scoreItems: { r: PlanRecord; m: PlanMetrics }[] | null;
  current: { rec: PlanRecord; plan: PlanResult } | null;
  landUse: { maxFallowYears: number; source: "option" | "water_balance"; fallowJustified: boolean; fallowStorageGainMm: number | null; reason: LocalizedText };
}

/** A fallow year counts as agronomically justified when it stores ≥ this much extra water for the next wheat (assumption). */
export const FALLOW_GAIN_MIN_MM = asm(25, "Assumption: a fallow year is justified (classic dryland cereal–fallow) when the engine's rainfed water balance stores ≥ 25 mm more plant-available water at the next wheat sowing than after barley");
/** Above this net irrigation budget a fallow year is not needed for water storage (assumption). */
export const FALLOW_MAX_BUDGET_MM = asm(100, "Assumption: with a net irrigation budget ≥ 100 mm/yr water storage by fallow is not needed");

function landUseRule(input: AnalysisInput, setup: EngineSetup, windows: ReplayWindow[], zone: ClimateZone, budgetNet: number, w0: number[]): AnalysisContext["landUse"] {
  let gain: number | null = null;
  if (windows.length) {
    const aw = (seq: RotationSequence) => {
      const out = simulatePlanChain(setup, scheduleSequence(seq, zone), windows, 0, w0);
      const v = out.filter((o): o is NonNullable<typeof o> => !!o && !!o.years[2].season).map((o) => o.years[2].season!.awAtSow);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const f = aw(["wheat_winter", "fallow", "wheat_winter"]), b = aw(["wheat_winter", "barley_winter", "wheat_winter"]);
    gain = f !== null && b !== null ? Math.round((f - b) * 10) / 10 : null;
  }
  const justified = gain !== null && gain >= FALLOW_GAIN_MIN_MM.value && budgetNet < FALLOW_MAX_BUDGET_MM.value;
  const opt = input.options?.maxFallowYears;
  if (opt !== undefined && Number.isFinite(opt)) {
    const m = Math.max(0, Math.min(3, Math.round(opt)));
    return { maxFallowYears: m, source: "option", fallowJustified: justified, fallowStorageGainMm: gain,
      reason: { tr: `Önerilerde en çok ${m} nadas yılı (kullanıcı ayarı).`, en: `At most ${m} fallow year(s) in recommendations (user setting).` } };
  }
  const m = justified ? 1 : 0;
  const g = gain === null ? "–" : String(Math.round(gain));
  return {
    maxFallowYears: m, source: "water_balance", fallowJustified: justified, fallowStorageGainMm: gain,
    reason: justified
      ? { tr: `Kuru tarımda nadas, sonraki buğdaya ${g} mm daha fazla su bırakıyor; önerilerde en çok 1 nadas yılı.`, en: `In dryland farming a fallow year leaves ${g} mm more water for the next wheat; at most 1 fallow year in recommendations.` }
      : { tr: budgetNet >= FALLOW_MAX_BUDGET_MM.value ? "Sulama suyu varken nadas su biriktirmek için gerekmiyor; önerilerde nadas yok." : `Nadas burada sonraki ürüne anlamlı su bırakmıyor (${g} mm); önerilerde nadas yok.`,
          en: budgetNet >= FALLOW_MAX_BUDGET_MM.value ? "With irrigation water available fallow is not needed to store water; no fallow in recommendations." : `Fallow does not store meaningful water for the next crop here (${g} mm); no fallow in recommendations.` },
  };
}

export function finiteOr(v: number | undefined | null, dflt: number, lo: number, hi: number): number {
  const x = v === undefined || v === null || !Number.isFinite(v) ? dflt : v;
  return Math.min(hi, Math.max(lo, x));
}

const lru: { climate: object; key: string; ctx: AnalysisContext }[] = [];

const elevCache = new WeakMap<ClimateSeries, Map<number, ClimateSeries>>();
/**
 * The same series at the field (site) elevation. POWER's `elevation` is the coarse grid-cell value
 * (80–180 m above SRTM at the pilots); with terrain the SRTM mean is used for the FAO-56 pressure /
 * psychrometric constant (Eq. 7–8) and the zone rule. Memoised so ET₀ caches survive.
 */
function atElevation(series: ClimateSeries, elevation: number): ClimateSeries {
  if (elevation === series.elevation) return series;
  let m = elevCache.get(series);
  if (!m) { m = new Map(); elevCache.set(series, m); }
  let x = m.get(elevation);
  if (!x) { x = { ...series, elevation }; m.set(elevation, x); }
  return x;
}

function inputKey(input: AnalysisInput): string {
  const { climate: _c, options, ...rest } = input;
  void _c;
  return JSON.stringify({ ...rest, sl: options?.shortlistSize ?? null, mf: options?.maxFallowYears ?? null });
}

/** Build (or reuse) the plan-independent context of an analysis input. */
export function getContext(input: AnalysisInput): AnalysisContext {
  const key = inputKey(input);
  const hit = lru.find((e) => e.climate === input.climate && e.key === key);
  if (hit) return hit.ctx;
  const ctx = buildContext(input);
  lru.unshift({ climate: input.climate, key, ctx });
  if (lru.length > 3) lru.pop();
  return ctx;
}

function buildContext(input: AnalysisInput): AnalysisContext {
  const { climate: gridSeries, field } = input;
  const siteElevation = field.terrain && Number.isFinite(field.terrain.elevationMean) ? field.terrain.elevationMean : gridSeries.elevation;
  const series = atElevation(gridSeries, siteElevation);
  const sc = input.scenario ?? {};
  const rainMultiplier = finiteOr(sc.rainMultiplier, 1, 0, 3);
  const tempDeltaC = finiteOr(sc.tempDeltaC, 0, -10, 10);
  const priceMultiplier = finiteOr(sc.priceMultiplier, 1, 0, 10);
  const irrigationBudgetMm = Math.max(0, finiteOr(sc.irrigationBudgetMm ?? undefined, field.irrigationBudgetMm, 0, 1e5));
  const budgetBasis = field.budgetBasis ?? "net";
  const efficiency = finiteOr(field.irrigationEfficiency, 0.7, 0.05, 1);
  const budgetNet = budgetBasis === "net" ? irrigationBudgetMm : irrigationBudgetMm * efficiency;
  const waterPrice = finiteOr(input.economics?.waterPriceTLPerM3, CROP_CONSTANTS.waterPriceTLPerM3.value, 0, 1e4);
  const priorities = normalizePriorities(field.priorities);

  // Explicit rainfall adjustment (never silent).
  const adj = input.precipAdjustment;
  let monthlyFactors = new Array<number>(12).fill(1);
  let mode: "none" | "annual" | "monthly" = "none";
  if (adj && adj.mode === "annual" && Number.isFinite(adj.factorAnnual) && (adj.factorAnnual as number) > 0) {
    monthlyFactors = new Array(12).fill(Math.min(3, Math.max(0.2, adj.factorAnnual as number))); mode = "annual";
  } else if (adj && adj.mode === "monthly" && adj.factorsMonthly?.length === 12 && adj.factorsMonthly.every((x) => Number.isFinite(x) && x > 0)) {
    monthlyFactors = adj.factorsMonthly.map((x) => Math.min(3, Math.max(0.2, x))); mode = "monthly";
  }
  const stationCal = series.sources.some((s) => s.name.startsWith("Station rainfall calibration"));
  const chk = input.precipCheck;
  const precip = {
    mode, factorsMonthly: monthlyFactors, provenance: mode === "none" ? null : adj?.provenance ?? null,
    calibrated: mode !== "none" || stationCal,
    check: chk && Number.isFinite(chk.annualRatio) ? { reference: chk.reference, annualRatio: chk.annualRatio, years: chk.years.length } : null,
  };

  // Terrain: slope for CN/erosion, elevation lapse for temperature.
  const t = field.terrain;
  const slope = t && Number.isFinite(t.slopePct) ? { pct: Math.max(0, t.slopePct), source: "terrain" as const }
    : field.slopePct != null && Number.isFinite(field.slopePct) ? { pct: Math.max(0, field.slopePct), source: "field" as const }
      : { pct: null, source: "none" as const };
  let lapseDeltaC = 0;
  if (t && Number.isFinite(t.elevationMean) && Math.abs(t.elevationMean - gridSeries.elevation) >= 50) {
    lapseDeltaC = Math.max(-3, Math.min(3, -LAPSE_RATE_C_PER_M.value * (t.elevationMean - gridSeries.elevation)));
    lapseDeltaC = Math.round(lapseDeltaC * 100) / 100;
  }

  const base = prepareClimate(series, 1, 0, monthlyFactors);
  const scen = prepareClimate(series, rainMultiplier, tempDeltaC + lapseDeltaC, monthlyFactors);
  const soil = soilHydraulics(field.soil, field.soilLayers, slope.pct);
  const zone = climateZone(series.lat, siteElevation);
  const setup = createSetup(scen, soil, zone);
  const windows = replayWindows(scen);
  const excludedYears = scen.ays.filter((a) => !a.coreValid).map((a) => ({ agYear: a.year, reason: `missing data from ${a.firstInvalidDate ?? "?"}` }));
  const suitability = cropSuitability(scen, zone);
  const overrides = input.economics?.crops ?? {};
  const ev = buildEvalContext(setup, windows, budgetNet, efficiency, waterPrice, priceMultiplier, overrides);
  const env: EvalEnv = { series, monthlyFactors, soil, zone, budgetNet, efficiency, waterPrice, priceMultiplier, overrides, lapseDeltaC };
  const candidates = (field.candidateCrops?.length ? field.candidateCrops : CROP_IDS).filter((c) => CROP_IDS.includes(c));

  // Confidence inputs shared by all plans.
  const reasons: LocalizedText[] = [];
  const nAy = scen.ays.length || 1;
  let comp = 1 - Math.min(0.6, (2 * excludedYears.length) / nAy);
  if (excludedYears.length) reasons.push({ tr: `${excludedYears.length} tarım yılı veri boşluğu nedeniyle hesaba katılamadı.`, en: `${excludedYears.length} agricultural years could not be used (data gaps).` });
  if (field.soil.origin === "default") { comp -= 0.3; reasons.push({ tr: "Toprak bilgisi bölgesel varsayılan (ölçüm yok).", en: "Soil is a regional default (no measurement)." }); }
  if (soil.organicMatterAssumed) comp -= 0.1;
  const hgShare = scen.quality.totalDays ? scen.quality.et0HargreavesDays / scen.quality.totalDays : 0;
  comp -= Math.min(0.2, hgShare);
  if (windows.length < 15) { comp -= 0.2; reasons.push({ tr: `Yalnız ${windows.length} üç yıllık dönem var.`, en: `Only ${windows.length} three-year windows.` }); }
  if (!field.soilLayers?.length) comp -= 0.05;
  comp = Math.max(0, Math.min(1, comp));
  if (!reasons.length) reasons.push({ tr: "İklim kaydı eksiksiz; toprak ölçüm tabanlı (SoilGrids/kullanıcı).", en: "Complete climate record; soil from SoilGrids/user." });
  let rain: number, rainReason: LocalizedText;
  const bias = precip.check ? Math.abs(precip.check.annualRatio - 1) : null;
  if (precip.calibrated) { rain = mode === "annual" ? 0.9 : 1; rainReason = { tr: "Yağış düzeltildi (istasyon/ERA5 karşılaştırması uygulandı).", en: "Rainfall corrected (station/ERA5 comparison applied)." }; }
  else if (bias !== null && bias <= 0.1) { rain = 0.85; rainReason = { tr: `ERA5-Land ile POWER yağışı uyumlu (oran ${precip.check!.annualRatio.toFixed(2)}).`, en: `ERA5-Land agrees with POWER rainfall (ratio ${precip.check!.annualRatio.toFixed(2)}).` }; }
  else if (bias !== null) { rain = 0.3; rainReason = { tr: `ERA5-Land yağışı POWER'ın ${precip.check!.annualRatio.toFixed(2)} katı; düzeltme uygulanmadı.`, en: `ERA5-Land rainfall is ${precip.check!.annualRatio.toFixed(2)}× POWER; no correction applied.` }; }
  else { rain = 0.5; rainReason = { tr: "POWER yağışı yerel istasyonla karşılaştırılmadı (kalibrasyon yok).", en: "POWER rainfall not checked against a local station (no calibration)." }; }

  return {
    input, series, siteElevation, gridElevation: gridSeries.elevation, rainMultiplier, tempDeltaC, priceMultiplier, irrigationBudgetMm, budgetBasis, efficiency, budgetNet, waterPrice, priorities,
    monthlyFactors, precip, lapseDeltaC, slope, base, scen, soil, zone, setup, windows, excludedYears, suitability, ev, env,
    erosivity: erosivityR(scen), candidates, excluded: new Set(field.excludedCrops ?? []),
    conf: { dataCompleteness: comp, completenessReasons: reasons, rainfall: rain, rainfallReason: rainReason },
    scoreItems: null, current: null,
    landUse: landUseRule(input, setup, windows, zone, budgetNet, ev.w0),
  };
}

// ── Plan result builder ──────────────────────────────────────────────────────

function monthlyDemand(ctx: AnalysisContext, r: PlanRecord): MonthlyDemand[] {
  const diags: MonthlyDiag[] = ctx.windows.map((w) => ({ arr: new Float64Array(36 * DIAG_N), base: (w.firstAy - 1) * 12 + 9 }));
  const raws = evaluateExactRaw(ctx.ev, r.schedule, diags);
  const used = new Set(raws.map((x) => x.firstAy));
  const acc = new Float64Array(36 * DIAG_N);
  let n = 0;
  ctx.windows.forEach((w, i) => { if (!used.has(w.firstAy)) return; n++; for (let j = 0; j < acc.length; j++) acc[j] += diags[i].arr[j]; });
  const out: MonthlyDemand[] = [];
  for (let m = 0; m < 36; m++) {
    const g = (k: number) => (n ? Math.round((acc[m * DIAG_N + k] / n) * 10) / 10 : 0);
    const etc = g(DIAG_ETC), eta = g(DIAG_ETA);
    out.push({ year: (Math.floor(m / 12) + 1) as 1 | 2 | 3, month: ((m + 9) % 12) + 1, index: m, etcMm: etc, etaMm: eta, effectiveRainMm: g(DIAG_EFFR), irrigationMm: g(DIAG_IRR), deficitMm: Math.round((etc - eta) * 10) / 10, bareEvapMm: g(DIAG_BARE) });
  }
  return out;
}

export function preCropInfo(ctx: AnalysisContext, crops: RotationSequence): PreCropEffectInfo[] {
  const prevs = previousCrops(crops);
  const out: PreCropEffectInfo[] = [];
  crops.forEach((c, k) => {
    if (c === "fallow") return;
    const e = preCropEffect(prevs[k], c);
    const mid = (e.nCreditKgHa.low + e.nCreditKgHa.high) / 2;
    out.push({
      year: k + 1, prev: prevs[k], cropId: c, yieldFactor: e.yieldFactor, nCreditKgHa: e.nCreditKgHa,
      nCostSavingTLPerDa: (Math.min(mid, N_NEED_KG_HA[c]) * ctx.ev.nPriceTLPerKgN) / 10, codes: e.codes, note: e.note, source: e.source, confidence: e.confidence,
    });
  });
  return out;
}

/** Build a full PlanResult from an exactly evaluated record (v1 fields + v2 additions). */
export function buildPlan(ctx: AnalysisContext, r: PlanRecord, kind: PlanResult["kind"], rank: number | null, opts: { detail?: boolean } = {}): PlanResult {
  const ws = r.exact?.windows ?? [];
  const areaDa = ctx.input.field.areaDa;
  const years = yearResults(ws, r.crops, r.exact?.slots);
  const windows: PlanWindow[] = ws.map((w) => {
    const rs = w.ratios.filter((x): x is number => x !== null);
    return {
      startYear: w.firstAy, deficitMmPerYr: w.requirement, unmetMmPerYr: w.unmet, budgetExceeded: w.exceeded.some(Boolean),
      budgetExceededByYear: [w.exceeded[0], w.exceeded[1], w.exceeded[2]],
      yieldRatio: rs.length ? rs.reduce((a, b) => a + b, 0) / rs.length : null,
      yieldRatioByYear: [w.ratios[0], w.ratios[1], w.ratios[2]], marginTLPerDaPerYr: w.marginMean,
    };
  });
  const erosion = erosionIndicator(r.schedule, ctx.scen, ctx.input.field.soil, ctx.slope, ctx.erosivity);
  const plan: PlanResult = {
    id: r.id, crops: r.crops, kind, rank, feasible: r.feasible, violations: r.violations,
    calendar: r.schedule.slots.map((s, k) => ({
      cropId: r.crops[k], year: k + 1,
      sow: s ? sowMonthDay(s) : null, harvest: s ? harvestMonthDay(s) : null,
      delayDays: s?.delay ?? 0, stages: s ? s.stages : null,
      bareDaysAfter: r.schedule.bareDaysAfter[k],
    })),
    score: r.score ?? { composite: 0, components: { water: 0, income: 0, soil: 0, risk: 0 }, weights: ctx.priorities },
    water: waterResult(ws, ctx.efficiency, areaDa),
    years,
    economics: {
      label: "scenario",
      grossMarginTLPerDaPerYr: ws.length ? dist(ws.map((w) => w.marginMean)) : null,
      fieldTotal3yrTL: ws.length ? dist(ws.map((w) => (w.margins[0] + w.margins[1] + w.margins[2]) * areaDa)) : null,
    },
    soilHealth: r.soil,
    risk: r.exact?.metrics?.risk ?? { score: 0, components: { budgetExceeded: 0, lowYield: 0, climateStress: 0, marginDownside: 0 }, weights: { ...RISK_WEIGHTS } },
    explanation: { why: [], evidence: [], benefits: [], gaps: [], localReview: [] },
    basis: "exact",
    windows,
    preCrop: preCropInfo(ctx, r.crops),
    nitrogen: nitrogenBalance(r.crops, years),
    cover: soilCover(r.schedule),
    erosion,
    warnings: planWarnings(r.crops, ctx.soil, ctx.irrigationBudgetMm, erosion, ctx.landUse.maxFallowYears),
    waterProductivity: ws.length ? {
      revenueTLPerM3: dist(ws.map(waterProductivity))!,
      deficitM3Per1000TL: dist(ws.map(deficitPerValue))!,
      waterInMmPerYr: dist(ws.map((w) => w.waterIn))!,
    } : undefined,
    trade: null, robust: null, stability: null,
  };
  if (opts.detail !== false) plan.monthlyDemand = monthlyDemand(ctx, r);
  plan.confidence = planConfidence(r.crops, ctx.zone, ctx.conf, null);
  return plan;
}

/** Engine v2 evidence and gaps appended to the rule-based explanation. */
export function v2Explanation(ctx: AnalysisContext, p: PlanResult, raws: RawWindow[] | undefined): { evidence: ExplanationItem[]; gaps: ExplanationItem[] } {
  const evidence: ExplanationItem[] = [], gaps: ExplanationItem[] = [];
  const it = (key: string, params: Record<string, number | string>, tr: string, en: string, sources?: string[]): ExplanationItem => ({ key, params, text: { tr, en }, ...(sources ? { sources } : {}) });
  if (raws?.length) {
    const chained = raws.filter((x) => x.start === "chained").length;
    evidence.push(it("evidence.cycle", { chained, n: raws.length },
      `Plan tekrar eden bir döngü olarak oynatıldı: ${raws.length} dönemin ${trLocative(chained)} 1. yıl, bir önceki döngünün 3. yılının bıraktığı gerçek toprak nemiyle başladı; kalanlarda döngünün kararlı hali (aynı hava ile tekrar) kullanıldı.`,
      `The plan was replayed as a repeating cycle: in ${chained} of ${raws.length} windows year 1 started from the soil water actually left by year 3 of the previous cycle; the rest start from the cycle's steady state (same weather, iterated).`,
      ["FAO-56 Ch. 8 water balance"]));
  }
  for (const y of p.years) {
    if (!y.yieldTHa || y.ymTHa == null) continue;
    const c = CROPS[y.cropId];
    evidence.push(it("evidence.yieldModel", { year: y.year, ym: y.ymTHa, s: y.irrigationIntensity ?? 0, f: y.preCropFactor ?? 1, cap: y.wpCapShare ?? 0 },
      `${y.year}. yıl ${c.name.tr}: Ym = kuru tarım tavanı ${c.rainfedCeilingTHa?.value ?? "–"} t/ha + (sulu ${c.refYieldTHa.value.irrigated} − tavan) × sulama yoğunluğu ${(y.irrigationIntensity ?? 0).toFixed(2)} = ${y.ymTHa.toFixed(2)} t/ha; önceki ürün çarpanı ×${(y.preCropFactor ?? 1).toFixed(2)}` +
        ((y.wpCapShare ?? 0) > 0 ? `; su verimliliği sınırı (French & Schultz) dönemlerin %${Math.round((y.wpCapShare ?? 0) * 100)}'inde devrede.` : "."),
      `Year ${y.year} ${c.name.en}: Ym = rainfed ceiling ${c.rainfedCeilingTHa?.value ?? "–"} t/ha + (irrigated ${c.refYieldTHa.value.irrigated} − ceiling) × irrigation intensity ${(y.irrigationIntensity ?? 0).toFixed(2)} = ${y.ymTHa.toFixed(2)} t/ha; previous-crop factor ×${(y.preCropFactor ?? 1).toFixed(2)}` +
        ((y.wpCapShare ?? 0) > 0 ? `; water-productivity bound (French & Schultz) active in ${Math.round((y.wpCapShare ?? 0) * 100)} % of windows.` : "."),
      ["FAO-33/66", "French & Schultz 1984", "Crop table (assumption)"]));
  }
  for (const pc of p.preCrop ?? []) {
    if (pc.yieldFactor === 1 && pc.nCreditKgHa.high === 0) continue;
    evidence.push(it("evidence.preCrop", { year: pc.year, f: pc.yieldFactor },
      `${pc.year}. yıl ${CROPS[pc.cropId].name.tr} ← ${CROPS[pc.prev].name.tr}: ${pc.note.tr} (varsayım).`,
      `Year ${pc.year} ${CROPS[pc.cropId].name.en} ← ${CROPS[pc.prev].name.en}: ${pc.note.en} (assumption).`, [pc.source]));
  }
  const pr = ctx.precip;
  if (pr.mode !== "none") {
    evidence.push(it("evidence.precipAdjustment", { mode: pr.mode },
      `Yağış ${pr.mode === "annual" ? `yıllık ×${pr.factorsMonthly[0].toFixed(3)}` : `aylık çarpanlarla (${pr.factorsMonthly.map((x) => x.toFixed(2)).join(" / ")})`} düzeltildi. Kaynak: ${pr.provenance ?? "–"}.`,
      `Rainfall corrected ${pr.mode === "annual" ? `annual ×${pr.factorsMonthly[0].toFixed(3)}` : `with monthly factors (${pr.factorsMonthly.map((x) => x.toFixed(2)).join(" / ")})`}. Provenance: ${pr.provenance ?? "–"}.`));
  } else if (!pr.calibrated) {
    gaps.push(it("gap.precipUncalibrated", pr.check ? { ratio: pr.check.annualRatio } : {},
      pr.check ? `ERA5-Land karşılaştırması POWER yağışının ${pr.check.annualRatio.toFixed(2)} katını gösteriyor ama düzeltme seçilmedi; su ve verim sonuçları bu farka duyarlı.`
        : "POWER yağışı yerel istasyonla doğrulanmadı; uydu/model yağışı noktada sapabilir. İstasyon ortalamasını girersen sonuç daha güvenilir olur.",
      pr.check ? `The ERA5-Land check shows ${pr.check.annualRatio.toFixed(2)}× POWER rainfall but no correction was chosen; water and yield results are sensitive to this.`
        : "POWER rainfall is not checked against a local station; satellite/model rain can be biased at a point. Entering the station mean makes results more reliable."));
  }
  if (ctx.lapseDeltaC !== 0) evidence.push(it("evidence.lapse", { dT: ctx.lapseDeltaC },
    `Tarla rakımı POWER hücresinden farklı: sıcaklıklar ${ctx.lapseDeltaC > 0 ? "+" : ""}${ctx.lapseDeltaC.toFixed(1)} °C kaydırıldı (6,5 °C/km, varsayım).`,
    `Field elevation differs from the POWER cell: temperatures shifted ${ctx.lapseDeltaC > 0 ? "+" : ""}${ctx.lapseDeltaC.toFixed(1)} °C (6.5 °C/km, assumption).`));
  if (ctx.siteElevation !== ctx.gridElevation) evidence.push(it("evidence.siteElevation", { site: Math.round(ctx.siteElevation), grid: Math.round(ctx.gridElevation) },
    `Tarla rakımı ${Math.round(ctx.siteElevation)} m (SRTM) kullanıldı; POWER hücre rakımı ${Math.round(ctx.gridElevation)} m. ET₀'daki hava basıncı ve bölge tipi tarla rakımıyla hesaplandı.`,
    `Field elevation ${Math.round(ctx.siteElevation)} m (SRTM) was used; the POWER cell elevation is ${Math.round(ctx.gridElevation)} m. Air pressure in ET₀ and the zone type use the field elevation.`, ["NASA SRTM"]));
  const rej = ctx.soil.layers?.filter((l) => l.measuredRejected) ?? [];
  if (rej.length) gaps.push(it("gap.measuredSoilRejected", { n: rej.length },
    `${rej.length} toprak katmanında SoilGrids su tutma değerleri inandırıcı değil (kullanılabilir su çok düşük, ör. ${rej.map((l) => `${l.top}–${l.bottom} cm`).join(", ")}); bu katmanlarda Saxton & Rawls tahmini kullanıldı.`,
    `In ${rej.length} soil layers the SoilGrids water-retention values are implausible (available water far too low, e.g. ${rej.map((l) => `${l.top}–${l.bottom} cm`).join(", ")}); Saxton & Rawls estimates were used there.`, ["SoilGrids v2.0", "Saxton & Rawls 2006"]));
  if (ctx.soil.socCapped) gaps.push(it("gap.socCapped", {},
    "Toprak organik karbonu (SOC) bazı katmanlarda inanılmayacak kadar yüksek (> 30 g/kg); hesaplarda 30 g/kg ile sınırlandı. Toprak analiziyle doğrula.",
    "Soil organic carbon is implausibly high in some layers (> 30 g/kg); it was capped at 30 g/kg in the calculations. Check with a soil test."));
  gaps.push(it("gap.salinity", {}, "Tuzluluk (EC) verisi yok; tuza duyarlı ürünler için toprak analizi yaptır.", "No salinity (EC) data; get a soil test before salt-sensitive crops."));
  return { evidence, gaps };
}

// ── Custom plan (drag-and-drop builder) ─────────────────────────────────────

export interface CustomPlanResult {
  plan: PlanResult;
  feasible: boolean;
  /** Every violated hard rule and every advisory, with codes and TR/EN text. */
  messages: BuilderMessage[];
  violations: ConstraintViolation[];
  warnings: PlanWarning[];
}

export function constraintMessages(violations: ConstraintViolation[], warnings: PlanWarning[]): BuilderMessage[] {
  return [
    ...violations.map((v) => ({ code: v.code, kind: "constraint" as const, cropId: v.cropId, year: v.year, text: v.text })),
    ...warnings.map((w) => ({ code: w.code, kind: "warning" as const, cropId: w.cropId, year: w.year, text: w.text })),
  ];
}

export function recordFor(ctx: AnalysisContext, seq: RotationSequence): PlanRecord {
  return makeRecord(seq, ctx.zone, ctx.suitability, ctx.excluded, new Set(ctx.candidates), ctx.slope.pct);
}

export function evaluateRecordExact(ctx: AnalysisContext, r: PlanRecord): void {
  const raws = evaluateExactRaw(ctx.ev, r.schedule);
  const { windows, slots } = summarizeRaw(ctx.ev, r.crops, raws);
  r.exact = { windows, metrics: planMetrics(windows), raws, slots };
}

/** Ensure the base shortlist + current reference set is populated on `ctx` (even when `analyze` ran in a Worker). */
export function ensureScoreItems(ctx: AnalysisContext): { r: PlanRecord; m: PlanMetrics }[] {
  if (ctx.scoreItems) return ctx.scoreItems;
  const opt = optimize({
    ev: ctx.ev, zone: ctx.zone, suitability: ctx.suitability, candidates: ctx.candidates,
    excluded: [...ctx.excluded], current: ctx.input.field.currentRotation, extraPlans: [],
    priorities: ctx.priorities, slopePct: ctx.slope.pct,
    shortlistSize: ctx.input.options?.shortlistSize ?? DEFAULT_SHORTLIST,
    maxFallowYears: ctx.landUse.maxFallowYears,
  });
  for (const rec of opt.exactSet) if (rec.exact?.raws) seedRaws(ctx.ev, rec, rec.exact.raws);
  ctx.scoreItems = opt.exactSet.filter((rec) => rec.exact?.metrics).map((rec) => ({ r: rec, m: rec.exact!.metrics! }));
  return ctx.scoreItems;
}

/** Composite of one record against the reference set of the context (shortlist + current). */
export function scoreAgainst(ctx: AnalysisContext, r: PlanRecord): void {
  if (!r.exact?.metrics) return;
  const ref = ensureScoreItems(ctx).filter((x) => x.r.id !== r.id);
  const items = [...ref, { r, m: r.exact.metrics }];
  if (items.length === 1 && ctx.current?.rec.exact?.metrics && ctx.current.rec.id !== r.id) items.unshift({ r: ctx.current.rec, m: ctx.current.rec.exact.metrics });
  r.score = scorePlans(items, ctx.priorities).at(-1)!;
}
