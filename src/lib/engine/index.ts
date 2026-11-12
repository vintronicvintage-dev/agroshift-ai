/**
 * AgroShift AI — public engine API.
 *
 * Pure, deterministic, browser-safe TypeScript (no I/O, no Node APIs). The UI should only
 * need `analyze`, `SCENARIO_PRESETS`, `CROPS` and the types in `src/lib/types.ts`.
 *
 * ```ts
 * import { analyze, SCENARIO_PRESETS } from "@/lib/engine";
 * const result = analyze({ climate, field, scenario: SCENARIO_PRESETS[1].scenario });
 * ```
 *
 * Pipeline: climate preparation (≤3-day gap interpolation, scenario transforms, FAO-56 ET₀ once
 * per scenario) → soil hydraulics (Saxton & Rawls 2006) → crop suitability (GDD, frost) →
 * enumeration of all 3-year sequences under hard constraints → cached screening over every
 * historical window → exact daily replay of the shortlist → priority-weighted ranking,
 * diverse top 3, Pareto front → rule-based explanations.
 */
import type {
  AnalysisInput, AnalysisResult, AssumptionItem, CandidatePoint, CropId, LocalizedText, PlanResult,
  RotationSequence, ScenarioPreset,
} from "../types";
import { prepareClimate } from "./climate";
import { soilHydraulics, DEFAULT_OM_PCT } from "./soil";
import { climateZone, ZONE_LABEL, harvestMonthDay, sowMonthDay } from "../crops/calendar";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { createSetup, replayWindows, ASSUMED_INITIAL_WETNESS } from "./rotation";
import { cropSuitability, MAX_FROST_YEAR_SHARE } from "./suitability";
import { buildEvalContext, waterResult, yearResults, RISK_WEIGHTS, STRESS_HEAT_DAYS, LOW_YIELD_RATIO } from "./evaluation";
import { optimize, normalizePriorities, DEFAULT_SHORTLIST, type PlanRecord } from "./optimizer";
import { summarizeClimate } from "./climateSummary";
import { explainPlan, type ExplainContext } from "./explain";
import { SOIL_HEALTH_WEIGHTS } from "./soilHealth";
import { dist } from "./stats";

export { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
export { climateZone, scheduleSequence, ZONE_LABEL } from "../crops/calendar";
export { et0PenmanMonteith, et0Hargreaves } from "./et0";
export { soilHydraulics, saxtonRawls, usdaTextureClass, scsRunoff } from "./soil";
export { mannKendall, senSlope } from "./trends";
export { prepareClimate } from "./climate";
export { SOIL_HEALTH_WEIGHTS } from "./soilHealth";
export { RISK_WEIGHTS } from "./evaluation";
export { DEFAULT_PRIORITIES } from "./optimizer";

/** Ready scenario presets (spec §4.4). */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: "typical", label: { tr: "Tipik", en: "Typical" }, scenario: { rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 } },
  { id: "dry", label: { tr: "Kurak (yağış −%25)", en: "Dry (rain −25 %)" }, scenario: { rainMultiplier: 0.75, tempDeltaC: 0, priceMultiplier: 1 } },
  { id: "hot_dry", label: { tr: "Sıcak ve kurak (+2 °C, yağış −%25)", en: "Hot and dry (+2 °C, rain −25 %)" }, scenario: { rainMultiplier: 0.75, tempDeltaC: 2, priceMultiplier: 1 } },
];

export const DISCLAIMER: LocalizedText = {
  tr: "AgroShift karar vermez, karar destekler. Sonuçlar NASA verisine ve açıkça belirtilen varsayımlara dayalı göstergelerdir; ekim kararından önce yerel ziraat uzmanına danışın.",
  en: "AgroShift supports decisions, it does not make them. Results are indicators based on NASA data and stated assumptions; consult a local agronomist before deciding.",
};

export const METHOD_SOURCES: AnalysisResult["methodSources"] = [
  { id: "fao56", citation: "Allen, R.G., Pereira, L.S., Raes, D., Smith, M. (1998). Crop evapotranspiration. FAO Irrigation and Drainage Paper 56.", url: "https://www.fao.org/3/x0490e/x0490e00.htm" },
  { id: "fao33", citation: "Doorenbos, J., Kassam, A.H. (1979). Yield response to water. FAO Irrigation and Drainage Paper 33." },
  { id: "fao66", citation: "Steduto, P., Hsiao, T.C., Fereres, E., Raes, D. (2012). Crop yield response to water. FAO Irrigation and Drainage Paper 66.", url: "https://www.fao.org/3/i2800e/i2800e.pdf" },
  { id: "saxton2006", citation: "Saxton, K.E., Rawls, W.J. (2006). Soil water characteristic estimates by texture and organic matter for hydrologic solutions. SSSAJ 70:1569–1578." },
  { id: "tr55", citation: "USDA-NRCS (1986). Urban Hydrology for Small Watersheds, TR-55 (curve numbers, Table 2-2b)." },
  { id: "mk", citation: "Mann (1945); Kendall (1975); Sen, P.K. (1968) Estimates of the regression coefficient based on Kendall's tau. JASA 63:1379–1389." },
  { id: "power", citation: "NASA POWER Daily API, community AG (MERRA-2 / CERES based).", url: "https://power.larc.nasa.gov/" },
];

const PERF_NOTE = (screened: number, replayed: number, windows: number): LocalizedText => ({
  tr: `Tüm uygun ${screened} dizi her pencerede önbellekli parça modeliyle tarandı (sınırlarda toprak nemi tek değere indirgenir, 11 düzeyde enterpolasyon); en iyi adaylar, Pareto adayları ve mevcut rotasyon olmak üzere ${replayed} plan ${windows} pencerede gün gün tam olarak yeniden oynatıldı. Gösterilen sayılar tam oynatmadandır.`,
  en: `All ${screened} feasible sequences were screened over every window with a cached piece model (soil moisture collapsed to one value at piece boundaries, 11-level interpolation); ${replayed} plans (best candidates, Pareto candidates and the current rotation) were then replayed exactly day by day over ${windows} windows. All numbers shown come from the exact replay.`,
});

/**
 * Run the full analysis for one field and one scenario.
 *
 * Deterministic: the same input always gives the same output. Typical runtime on a laptop is
 * well under 1.5 s for 12 crops × ~24 years (ET₀ is memoised per climate object + scenario).
 *
 * @param input climate series (data contract), field description, optional scenario and economic overrides
 * @returns current rotation, up to 3 diverse alternatives, user plans, Pareto front, climate evidence,
 *          soil hydraulics, assumptions and structured bilingual explanations.
 */
export function analyze(input: AnalysisInput): AnalysisResult {
  const { climate: series, field } = input;
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

  const base = prepareClimate(series, 1, 0);
  const scen = prepareClimate(series, rainMultiplier, tempDeltaC);
  const soil = soilHydraulics(field.soil);
  const zone = climateZone(series.lat, series.elevation);
  const setup = createSetup(scen, soil, zone);
  const windows = replayWindows(scen);
  const excludedYears = scen.ays
    .filter((a) => !a.coreValid)
    .map((a) => ({ agYear: a.year, reason: `missing data from ${a.firstInvalidDate ?? "?"}` }));
  const suitability = cropSuitability(scen, zone);
  const ev = buildEvalContext(setup, windows, budgetNet, efficiency, waterPrice, priceMultiplier, input.economics?.crops);

  const candidates = (field.candidateCrops?.length ? field.candidateCrops : CROP_IDS).filter((c) => CROP_IDS.includes(c));
  const opt = optimize({
    ev, zone, suitability, candidates, excluded: field.excludedCrops ?? [], current: field.currentRotation,
    extraPlans: input.options?.extraPlans ?? [], priorities, slopePct: field.slopePct,
    shortlistSize: input.options?.shortlistSize ?? DEFAULT_SHORTLIST,
  });

  const climate = summarizeClimate(base, scen, series);
  const toPlan = (r: PlanRecord, kind: PlanResult["kind"], rank: number | null): PlanResult => {
    const ws = r.exact?.windows ?? [];
    return {
      id: r.id, crops: r.crops, kind, rank, feasible: r.feasible, violations: r.violations,
      calendar: r.schedule.slots.map((s, k) => ({
        cropId: r.crops[k], year: k + 1,
        sow: s ? sowMonthDay(s) : null, harvest: s ? harvestMonthDay(s) : null,
        delayDays: s?.delay ?? 0, stages: s ? s.stages : null,
        bareDaysAfter: r.schedule.bareDaysAfter[k],
      })),
      score: r.score ?? { composite: 0, components: { water: 0, income: 0, soil: 0, risk: 0 }, weights: priorities },
      water: waterResult(ws, efficiency, field.areaDa),
      years: yearResults(ws, r.crops),
      economics: {
        label: "scenario",
        grossMarginTLPerDaPerYr: ws.length ? dist(ws.map((w) => w.marginMean)) : null,
        fieldTotal3yrTL: ws.length ? dist(ws.map((w) => (w.margins[0] + w.margins[1] + w.margins[2]) * field.areaDa)) : null,
      },
      soilHealth: r.soil,
      risk: r.exact?.metrics?.risk ?? { score: 0, components: { budgetExceeded: 0, lowYield: 0, climateStress: 0, marginDownside: 0 }, weights: { ...RISK_WEIGHTS } },
      explanation: { why: [], evidence: [], benefits: [], gaps: [], localReview: [] },
      basis: "exact",
    };
  };
  const current = toPlan(opt.current, "current", null);
  const alternatives = opt.alternatives.map((r, i) => toPlan(r, "recommended", i + 1));
  const userPlans = opt.userPlans.map((r) => toPlan(r, "user", null));

  const exCtx: ExplainContext = {
    climate, soil, zone,
    windows: { count: windows.length, first: windows[0]?.firstAy ?? null, last: windows.at(-1)?.firstAy ?? null, excluded: excludedYears.length },
    gwetAssumedWindows: ev.w0Assumed.filter(Boolean).length,
    priorities, budgetMm: irrigationBudgetMm,
    sourcesClimate: series.sources.map((s) => s.name),
  };
  for (const p of [current, ...alternatives, ...userPlans]) p.explanation = explainPlan(p, current, exCtx);

  const exactIds = new Set(opt.exactSet.map((r) => r.id));
  const point = (r: PlanRecord): CandidatePoint | null => {
    const m = exactIds.has(r.id) ? r.exact?.metrics : r.screening;
    if (!m) return null;
    return {
      id: r.id, crops: r.crops, requirementMmPerYr: m.requirementP50, grossMarginTLPerDaPerYr: m.marginP50,
      soilHealth: r.soil.score, composite: exactIds.has(r.id) ? r.score?.composite ?? 0 : r.screeningScore,
      basis: exactIds.has(r.id) ? "exact" : "screening", pareto: exactIds.has(r.id) ? r.paretoExact : false,
    };
  };
  const candidatesOut = opt.feasible.map(point).filter((x): x is CandidatePoint => x !== null);
  const pareto = opt.exactSet.filter((r) => r.paretoExact).map(point).filter((x): x is CandidatePoint => x !== null)
    .sort((a, b) => a.requirementMmPerYr - b.requirementMmPerYr);

  const notes: LocalizedText[] = [];
  if (tempDeltaC !== 0) notes.push({ tr: `Sıcaklık +${tempDeltaC} °C: tmax/tmin/tmean'e eklendi, bağıl nem sabit tutuldu, ET₀ yeniden hesaplandı.`, en: `Temperature +${tempDeltaC} °C added to tmax/tmin/tmean; relative humidity held constant; ET₀ recomputed.` });
  if (rainMultiplier !== 1) notes.push({ tr: `Günlük yağış ×${rainMultiplier} ile ölçeklendi (yağışlı gün sayısı değişmez).`, en: `Daily precipitation scaled ×${rainMultiplier} (number of wet days unchanged).` });
  if (budgetBasis === "gross") notes.push({ tr: `Bütçe brüt kabul edildi; net = brüt × randıman ${efficiency}.`, en: `Budget treated as gross; net = gross × efficiency ${efficiency}.` });

  return {
    zone,
    climate,
    soil,
    scenario: { rainMultiplier, tempDeltaC, priceMultiplier, irrigationBudgetMm, budgetNetMm: budgetNet, budgetBasis, irrigationEfficiency: efficiency, waterPriceTLPerM3: waterPrice, notes },
    windows: { count: windows.length, agYears: windows.map((w) => w.firstAy), excluded: excludedYears },
    current, alternatives, userPlans,
    pareto,
    candidates: candidatesOut,
    optimizer: {
      candidateCrops: candidates.filter((c) => !(field.excludedCrops ?? []).includes(c)),
      enumerated: opt.enumerated,
      feasible: opt.feasible.length,
      infeasibleByReason: opt.infeasibleByReason,
      screened: opt.feasible.length,
      replayedExactly: opt.exactSet.length,
      windows: windows.length,
      method: PERF_NOTE(opt.feasible.length, opt.exactSet.length, windows.length),
    },
    assumptions: collectAssumptions(zone, soil.organicMatterAssumed, ev.w0Assumed.some(Boolean)),
    disclaimer: DISCLAIMER,
    methodSources: METHOD_SOURCES,
  };
}

/**
 * Climate evidence only (annual series, monthly balance, trends) for the observed climate, without
 * running the rotation analysis. Same numbers as `analyze(...).climate` for the "typical" scenario.
 */
export function climateEvidence(series: AnalysisInput["climate"]): AnalysisResult["climate"] {
  const base = prepareClimate(series, 1, 0);
  return summarizeClimate(base, base, series);
}

/** Evaluate specific plans only (no optimisation) — convenience wrapper around `analyze`. */
export function evaluatePlans(input: AnalysisInput, plans: RotationSequence[]): PlanResult[] {
  return analyze({ ...input, options: { ...input.options, extraPlans: plans } }).userPlans;
}

function finiteOr(v: number | undefined | null, dflt: number, lo: number, hi: number): number {
  const x = v === undefined || v === null || !Number.isFinite(v) ? dflt : v;
  return Math.min(hi, Math.max(lo, x));
}

function collectAssumptions(zone: AnalysisResult["zone"], omAssumed: boolean, wetAssumed: boolean): AssumptionItem[] {
  const out: AssumptionItem[] = [];
  const name = (id: CropId) => CROPS[id].name;
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    const n = name(id);
    out.push({ key: `price.${id}`, label: { tr: `${n.tr} fiyatı`, en: `${n.en} price` }, value: `${c.priceTLPerKg.value} TL/kg`, source: c.priceTLPerKg.source, confidence: c.priceTLPerKg.confidence });
    out.push({ key: `cost.${id}`, label: { tr: `${n.tr} değişken maliyet`, en: `${n.en} variable cost` }, value: `${c.varCostTLPerDa.value} TL/da`, source: c.varCostTLPerDa.source, confidence: c.varCostTLPerDa.confidence });
    out.push({ key: `yield.${id}`, label: { tr: `${n.tr} referans verim (sulu = hesaplarda Ym; kuru yalnız karşılaştırma için)`, en: `${n.en} reference yield (irrigated = Ym used in the model; rainfed shown for comparison only)` }, value: `${c.refYieldTHa.value.irrigated} / ${c.refYieldTHa.value.rainfed} t/ha`, source: c.refYieldTHa.source, confidence: c.refYieldTHa.confidence });
    const a = c.agronomy;
    if (!a) continue;
    const cal = a.calendar[zone];
    out.push({ key: `calendar.${id}`, label: { tr: `${n.tr} takvimi`, en: `${n.en} calendar` }, value: `sow ${cal.value.sow} (latest ${cal.value.latestSow}), stages ${cal.value.stages.join("/")} d`, source: cal.source, confidence: cal.confidence });
    for (const [k, p] of [["ky", a.ky], ["kc", a.kc], ["zr", a.rootDepthMaxM], ["p", a.p], ["frost", a.frost], ["heat", a.heat], ["gdd", a.gdd]] as const) {
      if (p.confidence !== "assumption") continue;
      out.push({ key: `${k}.${id}`, label: { tr: `${n.tr} ${k}`, en: `${n.en} ${k}` }, value: JSON.stringify(p.value), source: p.source, confidence: p.confidence });
    }
    out.push({ key: `n.${id}`, label: { tr: `${n.tr} azot katkısı`, en: `${n.en} N contribution` }, value: `${c.nContributionKgHa.value.low}–${c.nContributionKgHa.value.high} kg N/ha`, source: c.nContributionKgHa.source, confidence: c.nContributionKgHa.confidence });
  }
  const gen = (key: string, tr: string, en: string, value: string, source: string, confidence: "literature" | "assumption" = "assumption") =>
    out.push({ key, label: { tr, en }, value, source, confidence });
  gen("zone", "İklim bölgesi tipi", "Climate zone type", ZONE_LABEL[zone].en, "Assumption: elevation ≥ 700 m → highland; else latitude < 38.5° → south");
  for (const [k, p] of Object.entries(CROP_CONSTANTS)) gen(`const.${k}`, k, k, String(p.value), p.source, p.confidence);
  gen("suitability.frost", "Don uygunluk eşiği", "Frost suitability threshold", `${MAX_FROST_YEAR_SHARE.value * 100} % of years`, MAX_FROST_YEAR_SHARE.source);
  gen("risk.weights", "Risk ağırlıkları", "Risk weights", JSON.stringify(RISK_WEIGHTS), "AgroShift method (visible weights)");
  gen("risk.thresholds", "Risk eşikleri", "Risk thresholds", `heat-stress year ≥ ${STRESS_HEAT_DAYS} days; poor year yield ratio < ${LOW_YIELD_RATIO}`, "AgroShift method");
  gen("soilHealth.weights", "Toprak sağlığı ağırlıkları", "Soil-health weights", JSON.stringify(SOIL_HEALTH_WEIGHTS), "AgroShift method (visible weights)");
  gen("kc.climate", "Kc iklim düzeltmesi yok", "No Kc climate adjustment", "Table 12 values used as is", "FAO-56 Eq. 62 needs RHmin, not available from POWER RH2M mean");
  gen("snow", "Kar birikimi modellenmedi", "Snow not modelled", "precipitation enters the soil on the day it falls", "Simplification");
  gen("singleCrop", "Yılda tek ana ürün", "One main crop per year", "no double cropping", "Simplification");
  gen("bareTew", "Çıplak toprak buharlaşma katmanı", "Bare-soil evaporation layer", "TEW = TAW of the 0.15 m layer", "Simplification of FAO-56 Eq. 73 (ignores drying below wilting point)");
  if (omAssumed) gen("soil.om", "Organik madde", "Organic matter", `${DEFAULT_OM_PCT} %`, "Assumption: SOC missing");
  if (wetAssumed) gen("soil.initial", "Başlangıç nemi", "Initial soil moisture", `${ASSUMED_INITIAL_WETNESS * 100} % of TAW`, "Assumption: GWETROOT missing for some windows");
  return out;
}
