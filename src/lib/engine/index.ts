/**
 * AgroShift AI — public engine API.
 *
 * Pure, deterministic, browser-safe TypeScript (no I/O, no Node APIs, no generative model). The UI
 * should only need `analyze`, `evaluateCustomPlan`, `SCENARIO_PRESETS`, `CROPS`, the units helpers
 * and the types in `src/lib/types.ts`.
 *
 * ```ts
 * import { analyze, evaluateCustomPlan, SCENARIO_PRESETS } from "@/lib/engine";
 * const result = analyze({ climate, field, scenario: SCENARIO_PRESETS[1].scenario });
 * const live = evaluateCustomPlan({ climate, field }, ["wheat_winter", "chickpea", "barley_winter"]);
 * ```
 *
 * Pipeline (v2): climate preparation (≤3-day gap interpolation, explicit rainfall adjustment, terrain
 * lapse, scenario transforms, FAO-56 ET₀ once per temperature) → soil hydraulics (Saxton & Rawls
 * 2006, layered when available, slope-adjusted CN) → crop suitability (GDD, frost) → enumeration of
 * all 3-year sequences under hard constraints (cyclic calendar) → cached screening of every
 * sequence as a repeating cycle over every historical window → exact repeating-cycle replay of the
 * shortlist → priority-weighted ranking, diverse top 3, Pareto front + knee → robust ranking over
 * typical/dry/hot-dry (minimax regret, CVaR) → ±20 % rank-stability sweep → confidence grades →
 * indicators (N balance, cover, erosion) → rule-based explanations and farmer narrative.
 */
import type {
  AnalysisInput, AnalysisResult, AssumptionItem, CandidatePoint, CropId, LocalizedText, PlanResult,
  RotationSequence, ScenarioPreset, ScenarioPresetId,
} from "../types";
import { prepareClimate } from "./climate";
import { DEFAULT_OM_PCT } from "./soil";
import { ZONE_LABEL } from "../crops/calendar";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { ASSUMED_INITIAL_WETNESS } from "./rotation";
import { MAX_FROST_YEAR_SHARE } from "./suitability";
import { RISK_WEIGHTS, STRESS_HEAT_DAYS, LOW_YIELD_RATIO } from "./evaluation";
import { optimize, DEFAULT_SHORTLIST, planId, type PlanRecord } from "./optimizer";
import { summarizeClimate } from "./climateSummary";
import { explainPlan, type ExplainContext } from "./explain";
import { SOIL_HEALTH_WEIGHTS } from "./soilHealth";
import { C_FACTORS, SLOPE_LENGTH_M } from "./indicators";
import { robustRank, sensitivitySweep, planConfidence, seedRaws, scenarioEv, rankPool, metricsIn, type ScenarioSpec, type ConfidenceInputs } from "./robust";
import { meanAnnualPrecip } from "./climate";
import { narratePlan, tradeSummary } from "./narrate";
import {
  getContext, buildPlan, v2Explanation, recordFor, evaluateRecordExact, scoreAgainst, constraintMessages,
  LAPSE_RATE_C_PER_M, type AnalysisContext, type CustomPlanResult,
} from "./context";

export { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
export { climateZone, scheduleSequence, ZONE_LABEL } from "../crops/calendar";
export { preCropEffect, previousCrops, ROTATION_GROUP, BREAK_YEARS_ADVISED, N_NEED_KG_HA, type PreCropEffect } from "../crops/preCrop";
export { et0PenmanMonteith, et0Hargreaves } from "./et0";
export { soilHydraulics, saxtonRawls, usdaTextureClass, scsRunoff, slopeAdjustedCN, erodibilityK } from "./soil";
export { mannKendall, senSlope } from "./trends";
export { prepareClimate } from "./climate";
export { SOIL_HEALTH_WEIGHTS } from "./soilHealth";
export { RISK_WEIGHTS } from "./evaluation";
export { DEFAULT_PRIORITIES } from "./optimizer";
export * from "./units";
export type { CustomPlanResult } from "./context";

/** Ready scenario presets (spec §4.4). */
export const SCENARIO_PRESETS: ScenarioPreset[] = [
  { id: "typical", label: { tr: "Tipik", en: "Typical" }, scenario: { rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 } },
  { id: "dry", label: { tr: "Kurak (yağış −%25)", en: "Dry (rain −25 %)" }, scenario: { rainMultiplier: 0.75, tempDeltaC: 0, priceMultiplier: 1 } },
  { id: "hot_dry", label: { tr: "Sıcak ve kurak (+2 °C, yağış −%25)", en: "Hot and dry (+2 °C, rain −25 %)" }, scenario: { rainMultiplier: 0.75, tempDeltaC: 2, priceMultiplier: 1 } },
];

export const DISCLAIMER: LocalizedText = {
  tr: "AgroShift karar vermez, karar vermene yardım eder. Sonuçlar NASA verisine ve açıkça yazılmış varsayımlara dayanan göstergelerdir; ekim kararından önce yerel ziraat mühendisine danış.",
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
  { id: "frenchschultz", citation: "French, R.J., Schultz, J.E. (1984). Water use efficiency of wheat in a Mediterranean-type environment. Aust. J. Agric. Res. 35." },
  { id: "angus2015", citation: "Angus, J.F. et al. (2015). Break crops and rotations for wheat. Crop & Pasture Science 66:523–552." },
  { id: "kirkegaard2008", citation: "Kirkegaard, J. et al. (2008). Break crop benefits in temperate wheat production. Field Crops Research 107:185–195." },
  { id: "ryan2008", citation: "Ryan, J., Singh, M., Pala, M. (2008). Long-term cereal-based rotation trials in the Mediterranean region. Advances in Agronomy 97:273–319." },
  { id: "rusle", citation: "Renard, K.G. et al. (1997). Predicting soil erosion by water: RUSLE. USDA Agriculture Handbook 703." },
  { id: "renard1994", citation: "Renard, K.G., Freimund, J.R. (1994). Using monthly precipitation data to estimate the R-factor in the revised USLE. J. Hydrology 157:287–306." },
  { id: "williams1995", citation: "Williams, J.R. (1995). The EPIC model. In: Computer Models of Watershed Hydrology (K factor; CN slope adjustment as used in SWAT, Neitsch et al. 2011)." },
  { id: "zeleny1973", citation: "Zeleny, M. (1973). Compromise programming. In: Multiple Criteria Decision Making (knee / compromise pick)." },
];

const PERF_NOTE = (screened: number, replayed: number, windows: number): LocalizedText => ({
  tr: `Tüm uygun ${screened} dizi, tekrar eden döngü olarak her pencerede önbellekli parça modeliyle tarandı (sınırlarda toprak nemi tek değere indirgenir, 11 düzeyde enterpolasyon); en iyi adaylar, Pareto adayları ve mevcut rotasyon olmak üzere ${replayed} plan ${windows} pencerede gün gün tam olarak yeniden oynatıldı (3. yılın bıraktığı su sonraki döngünün 1. yılına geçer). Gösterilen sayılar tam oynatmadandır.`,
  en: `All ${screened} feasible sequences were screened as repeating cycles over every window with a cached piece model (soil moisture collapsed to one value at piece boundaries, 11-level interpolation); ${replayed} plans (best candidates, Pareto candidates and the current rotation) were then replayed exactly day by day over ${windows} windows (water left by year 3 carries into year 1 of the next cycle). All numbers shown come from the exact replay.`,
});

const ROBUST_POOL = 20;
const SWEEP_POOL = 12;

function cyclicIds(seq: readonly CropId[]): string[] {
  return [0, 1, 2].map((s) => planId([seq[s], seq[(s + 1) % 3], seq[(s + 2) % 3]]));
}

/**
 * Run the full analysis for one field and one scenario.
 *
 * Deterministic: the same input always gives the same output. Runtime on the real Konya snapshot
 * including robust ranking and the sensitivity sweep is reported in docs/engine-v2.md.
 */
export function analyze(input: AnalysisInput): AnalysisResult {
  const ctx = getContext(input);
  const { field } = input;
  const opt = optimize({
    ev: ctx.ev, zone: ctx.zone, suitability: ctx.suitability, candidates: ctx.candidates, excluded: field.excludedCrops ?? [],
    current: field.currentRotation, extraPlans: input.options?.extraPlans ?? [], priorities: ctx.priorities, slopePct: ctx.slope.pct,
    shortlistSize: input.options?.shortlistSize ?? DEFAULT_SHORTLIST,
  });
  for (const r of opt.exactSet) if (r.exact?.raws) seedRaws(ctx.ev, r, r.exact.raws);
  ctx.scoreItems = opt.exactSet.filter((r) => r.exact?.metrics).map((r) => ({ r, m: r.exact!.metrics! }));

  const curShifts = new Set(cyclicIds(field.currentRotation));
  const eligible = (r: PlanRecord) => r.feasible && opt.shortlist.has(r.id) && !curShifts.has(r.id);

  // Robust ranking across typical / dry / hot-dry (+ the active scenario when different).
  const presets: { id: ScenarioPresetId; label: LocalizedText; rain: number; temp: number }[] = SCENARIO_PRESETS.map((p) => ({ id: p.id, label: p.label, rain: p.scenario.rainMultiplier, temp: p.scenario.tempDeltaC }));
  const specs: ScenarioSpec[] = [];
  let activeIn = false;
  for (const p of presets) {
    const isActive = Math.abs(p.rain - ctx.rainMultiplier) < 1e-9 && Math.abs(p.temp - ctx.tempDeltaC) < 1e-9;
    if (isActive) activeIn = true;
    specs.push(isActive ? { ...p, id: "active" as const, label: p.label } : p);
  }
  if (!activeIn) specs.unshift({ id: "active", label: { tr: "Seçili senaryo", en: "Selected scenario" }, rain: ctx.rainMultiplier, temp: ctx.tempDeltaC });
  const doRobust = input.options?.robust !== false && opt.ranked.length > 0;
  const robustPool = new Map<string, PlanRecord>();
  for (const r of opt.ranked.slice(0, ROBUST_POOL)) robustPool.set(r.id, r);
  for (const r of opt.exactSet.filter((x) => x.paretoExact && eligible(x)).slice(0, 8)) robustPool.set(r.id, r);
  if (opt.knee && eligible(opt.knee)) robustPool.set(opt.knee.id, opt.knee);
  robustPool.set(opt.current.id, opt.current);
  const robust = doRobust ? robustRank(ctx.env, ctx.ev, specs, [...robustPool.values()], eligible, ctx.priorities) : null;

  // Sensitivity sweep on the small pool.
  const typicalBest = opt.alternatives[0] ?? null;
  const tracked = [...new Set([...opt.alternatives.map((r) => r.id), ...(robust?.robustBest ? [robust.robustBest.id] : []), ...(opt.knee ? [opt.knee.id] : [])])];
  const sweepPool = new Map<string, PlanRecord>();
  for (const r of opt.ranked.slice(0, SWEEP_POOL)) sweepPool.set(r.id, r);
  for (const id of tracked) { const r = opt.byId.get(id) ?? opt.exactSet.find((x) => x.id === id); if (r && eligible(r)) sweepPool.set(id, r); }
  const doSweep = input.options?.sensitivity !== false && sweepPool.size > 0;
  const sweep = doSweep ? sensitivitySweep(ctx.env, ctx.ev, [...sweepPool.values()], field.currentRotation, tracked, ctx.priorities, ctx.rainMultiplier, ctx.tempDeltaC) : null;

  // Rainfall-source check: re-rank the sweep pool with the other rainfall source.
  const chk = input.precipCheck;
  let altFactors: number[] | null = null, altLabel: LocalizedText | null = null;
  if (ctx.precip.calibrated) {
    altFactors = new Array(12).fill(1);
    altLabel = { tr: "düzeltilmemiş giriş yağışı", en: "uncorrected input rainfall" };
  } else if (chk && chk.monthlyRatio?.length === 12 && chk.monthlyRatio.every((x) => Number.isFinite(x) && x > 0)) {
    altFactors = chk.monthlyRatio.map((x) => Math.min(3, Math.max(0.2, x)));
    altLabel = { tr: `${chk.reference.toUpperCase()} oranlarıyla ölçeklenmiş POWER yağışı`, en: `POWER rainfall scaled to ${chk.reference.toUpperCase()}` };
  }
  const altEv = altFactors && sweepPool.size ? scenarioEv(ctx.env, ctx.rainMultiplier, ctx.tempDeltaC, ctx.budgetNet, altFactors) : null;
  const altRank = altEv ? rankPool(altEv, [...sweepPool.values()], field.currentRotation, ctx.priorities) : null;
  const altAnnual = altFactors ? meanAnnualPrecip(prepareClimate(ctx.series, 1, 0, altFactors)) : null;
  const confFor = (r: PlanRecord, ranked: boolean): { inputs: ConfidenceInputs; check: PlanResult["rainSource"] } => {
    if (!altEv || !altLabel || altAnnual === null) return { inputs: ctx.conf, check: null };
    const m = metricsIn(altEv, r);
    const inTop3 = !!altRank?.top3.includes(r.id);
    const check = { alternative: altLabel, alternativeAnnualMm: altAnnual, inTop3, marginP50Alt: m?.marginP50 ?? null, requirementP50Alt: m?.requirementP50 ?? null };
    if (!ranked) return { inputs: ctx.conf, check };
    return {
      check,
      inputs: inTop3
        ? { ...ctx.conf, rainfall: Math.max(ctx.conf.rainfall, 0.75), rainfallReason: { tr: `${ctx.conf.rainfallReason.tr} Plan, ${altLabel.tr} ile de ilk 3'te kalıyor.`, en: `${ctx.conf.rainfallReason.en} The plan stays in the top 3 with ${altLabel.en} too.` } }
        : { ...ctx.conf, rainfall: Math.min(ctx.conf.rainfall, 0.3), rainfallReason: { tr: `${ctx.conf.rainfallReason.tr} ${capitalTr(altLabel.tr)} kullanılırsa plan ilk 3'ten çıkıyor: sonuç yağış kaynağına duyarlı.`, en: `${ctx.conf.rainfallReason.en} With ${altLabel.en} the plan drops out of the top 3: the result is sensitive to the rainfall source.` } },
    };
  };

  // Plan results
  const rainfed = ctx.budgetNet <= 0;
  const finish = (r: PlanRecord, kind: PlanResult["kind"], rank: number | null): PlanResult => {
    const p = buildPlan(ctx, r, kind, rank);
    p.robust = robust?.info.get(r.id) ?? null;
    p.stability = sweep?.stability.get(r.id) ?? null;
    const cf = confFor(r, kind === "recommended");
    p.rainSource = cf.check;
    p.confidence = planConfidence(r.crops, ctx.zone, cf.inputs, p.stability);
    p.knee = opt.knee?.id === r.id;
    return p;
  };
  const current = finish(opt.current, "current", null);
  ctx.current = { rec: opt.current, plan: current };
  const alternatives = opt.alternatives.map((r, i) => finish(r, "recommended", i + 1));
  const userPlans = opt.userPlans.map((r) => finish(r, "user", null));
  const rb = robust?.robustBest ?? null;
  const robustBest = rb && !opt.alternatives.some((a) => a.id === rb.id) ? finish(rb, "recommended", null) : null;

  const climate = summarizeClimate(ctx.base, ctx.scen, ctx.series);
  const exCtx: ExplainContext = {
    climate, soil: ctx.soil, zone: ctx.zone,
    windows: { count: ctx.windows.length, first: ctx.windows[0]?.firstAy ?? null, last: ctx.windows.at(-1)?.firstAy ?? null, excluded: ctx.excludedYears.length },
    gwetAssumedWindows: ctx.ev.w0Assumed.filter(Boolean).length,
    priorities: ctx.priorities, budgetMm: ctx.irrigationBudgetMm,
    sourcesClimate: ctx.series.sources.map((s) => s.name),
  };
  const all = [current, ...alternatives, ...userPlans, ...(robustBest ? [robustBest] : [])];
  const recOf = (p: PlanResult) => opt.byId.get(p.id) ?? opt.exactSet.find((x) => x.id === p.id);
  for (const p of all) {
    p.explanation = explainPlan(p, current, exCtx);
    const v2 = v2Explanation(ctx, p, recOf(p)?.exact?.raws);
    p.explanation.evidence.push(...v2.evidence);
    p.explanation.gaps.push(...v2.gaps);
    p.trade = p.kind === "current" ? null : tradeSummary(p, current, rainfed, field.areaDa);
    p.narrative = narratePlan(p, current, rainfed, field.areaDa);
  }

  const exactIds = new Set(opt.exactSet.map((r) => r.id));
  const point = (r: PlanRecord): CandidatePoint | null => {
    const m = exactIds.has(r.id) ? r.exact?.metrics : r.screening;
    if (!m) return null;
    return {
      id: r.id, crops: r.crops, requirementMmPerYr: m.requirementP50, grossMarginTLPerDaPerYr: m.marginP50,
      soilHealth: r.soil.score, composite: exactIds.has(r.id) ? r.score?.composite ?? 0 : r.screeningScore,
      basis: exactIds.has(r.id) ? "exact" : "screening", pareto: exactIds.has(r.id) ? r.paretoExact : false,
      knee: opt.knee?.id === r.id,
    };
  };
  const candidatesOut = opt.feasible.map(point).filter((x): x is CandidatePoint => x !== null);
  const pareto = opt.exactSet.filter((r) => r.paretoExact).map(point).filter((x): x is CandidatePoint => x !== null)
    .sort((a, b) => a.requirementMmPerYr - b.requirementMmPerYr || a.id.localeCompare(b.id));

  const notes: LocalizedText[] = [];
  const { tempDeltaC, rainMultiplier, budgetBasis, efficiency } = ctx;
  if (tempDeltaC !== 0) notes.push({ tr: `Sıcaklık +${tempDeltaC} °C: tmax/tmin/tmean'e eklendi, bağıl nem sabit tutuldu, ET₀ yeniden hesaplandı.`, en: `Temperature +${tempDeltaC} °C added to tmax/tmin/tmean; relative humidity held constant; ET₀ recomputed.` });
  if (rainMultiplier !== 1) notes.push({ tr: `Günlük yağış ×${rainMultiplier} ile ölçeklendi (yağışlı gün sayısı değişmez).`, en: `Daily precipitation scaled ×${rainMultiplier} (number of wet days unchanged).` });
  if (budgetBasis === "gross") notes.push({ tr: `Bütçe brüt kabul edildi; net = brüt × randıman ${efficiency}.`, en: `Budget treated as gross; net = gross × efficiency ${efficiency}.` });
  if (ctx.precip.mode !== "none") notes.push({ tr: `Yağış düzeltmesi uygulandı (${ctx.precip.mode}); kaynak: ${ctx.precip.provenance ?? "–"}.`, en: `Rainfall adjustment applied (${ctx.precip.mode}); provenance: ${ctx.precip.provenance ?? "–"}.` });
  if (ctx.lapseDeltaC !== 0) notes.push({ tr: `Tarla rakımına göre sıcaklık ${ctx.lapseDeltaC > 0 ? "+" : ""}${ctx.lapseDeltaC} °C kaydırıldı.`, en: `Temperatures shifted ${ctx.lapseDeltaC > 0 ? "+" : ""}${ctx.lapseDeltaC} °C to the field elevation.` });

  return {
    zone: ctx.zone,
    climate,
    soil: ctx.soil,
    scenario: { rainMultiplier, tempDeltaC, priceMultiplier: ctx.priceMultiplier, irrigationBudgetMm: ctx.irrigationBudgetMm, budgetNetMm: ctx.budgetNet, budgetBasis, irrigationEfficiency: efficiency, waterPriceTLPerM3: ctx.waterPrice, notes },
    windows: { count: ctx.windows.length, agYears: ctx.windows.map((w) => w.firstAy), excluded: ctx.excludedYears },
    current, alternatives, userPlans,
    pareto,
    candidates: candidatesOut,
    optimizer: {
      candidateCrops: ctx.candidates.filter((c) => !(field.excludedCrops ?? []).includes(c)),
      enumerated: opt.enumerated,
      feasible: opt.feasible.length,
      infeasibleByReason: opt.infeasibleByReason,
      screened: opt.feasible.length,
      replayedExactly: opt.exactSet.length,
      windows: ctx.windows.length,
      method: PERF_NOTE(opt.feasible.length, opt.exactSet.length, ctx.windows.length),
    },
    assumptions: collectAssumptions(ctx),
    disclaimer: DISCLAIMER,
    methodSources: METHOD_SOURCES,
    typicalBestId: typicalBest?.id ?? null,
    robustBestId: rb?.id ?? null,
    robustBest,
    kneeId: opt.knee?.id ?? null,
    robustness: robust ? {
      scenarios: robust.scenarios.map((s) => ({ id: s.id, label: s.label, rainMultiplier: s.rain, tempDeltaC: s.temp })),
      pool: robustPool.size,
      method: {
        tr: `${robustPool.size} plan ${robust.scenarios.length} senaryoda tam oynatıldı; her senaryoda öncelik puanı hesaplandı, pişmanlık = o senaryodaki en iyi puan − planın puanı. Sağlam plan en büyük pişmanlığı en küçük olandır (minimax regret); CVaR20 = tüm senaryolarda en kötü %20 dönemin ortalama marjı.`,
        en: `${robustPool.size} plans were replayed exactly in ${robust.scenarios.length} scenarios; regret = best composite in a scenario − the plan's composite. The robust plan minimises the maximum regret; CVaR20 = mean margin of the worst 20 % of windows pooled over scenarios.`,
      },
    } : null,
    sensitivity: sweep ? {
      runs: sweep.runs, pool: sweepPool.size, perturbations: sweep.perturbations,
      method: {
        tr: `Fiyat, maliyet, referans verim, yağış ve sulama bütçesi tek tek ±%20 değiştirildi (${sweep.runs} çalışma); her çalışmada ${sweepPool.size} aday yeniden sıralandı.`,
        en: `Prices, costs, reference yields, rainfall and irrigation budget were changed one at a time by ±20 % (${sweep.runs} runs); ${sweepPool.size} candidates were re-ranked in each run.`,
      },
    } : null,
    precipitation: ctx.precip,
    terrain: field.terrain || ctx.slope.pct !== null ? {
      slopePct: ctx.slope.pct, elevationMean: field.terrain?.elevationMean ?? null, gridElevation: ctx.gridElevation, lapseDeltaC: ctx.lapseDeltaC, siteElevation: ctx.siteElevation,
    } : null,
    precipUncertainty: precipUncertainty(ctx, altRank?.top3 ?? null, alternatives.slice(0, 3).map((a) => a.id)),
  };
}

/**
 * Engine v2 — fast evaluation of one user-built plan for the drag-and-drop builder (< 150 ms on the
 * real snapshots once the context is warm). Reuses the cached analysis context of `input` (same
 * climate object and settings); the composite is normalised against the last `analyze` of that
 * input when available, else against the current rotation.
 *
 * Every violated hard rule (constraint) and every advisory (warning) is returned as a
 * `BuilderMessage` with a code and TR/EN text. Infeasible plans are still evaluated.
 */
export function evaluateCustomPlan(input: AnalysisInput, crops: RotationSequence): CustomPlanResult {
  const ctx = getContext(input);
  const cur = ensureCurrent(ctx);
  const r = recordFor(ctx, crops);
  if (r.id === cur.rec.id) {
    return { plan: cur.plan, feasible: cur.rec.feasible, messages: constraintMessages(cur.rec.violations, cur.plan.warnings ?? []), violations: cur.rec.violations, warnings: cur.plan.warnings ?? [] };
  }
  evaluateRecordExact(ctx, r);
  scoreAgainst(ctx, r);
  const p = buildPlan(ctx, r, "user", null, { detail: true });
  const climate = summarizeClimate(ctx.base, ctx.scen, ctx.series);
  p.explanation = explainPlan(p, cur.plan, {
    climate, soil: ctx.soil, zone: ctx.zone,
    windows: { count: ctx.windows.length, first: ctx.windows[0]?.firstAy ?? null, last: ctx.windows.at(-1)?.firstAy ?? null, excluded: ctx.excludedYears.length },
    gwetAssumedWindows: ctx.ev.w0Assumed.filter(Boolean).length, priorities: ctx.priorities, budgetMm: ctx.irrigationBudgetMm,
    sourcesClimate: input.climate.sources.map((s) => s.name),
  });
  const v2 = v2Explanation(ctx, p, r.exact?.raws);
  p.explanation.evidence.push(...v2.evidence);
  p.explanation.gaps.push(...v2.gaps);
  const rainfed = ctx.budgetNet <= 0;
  p.trade = tradeSummary(p, cur.plan, rainfed, input.field.areaDa);
  p.narrative = narratePlan(p, cur.plan, rainfed, input.field.areaDa);
  const warnings = p.warnings ?? [];
  return { plan: p, feasible: r.feasible, messages: constraintMessages(r.violations, warnings), violations: r.violations, warnings };
}

function ensureCurrent(ctx: AnalysisContext) {
  if (ctx.current) return ctx.current;
  const rec = recordFor(ctx, ctx.input.field.currentRotation);
  evaluateRecordExact(ctx, rec);
  scoreAgainst(ctx, rec);
  const plan = buildPlan(ctx, rec, "current", null, { detail: false });
  ctx.current = { rec, plan };
  return ctx.current;
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

const capitalTr = (s: string) => s.charAt(0).toLocaleUpperCase("tr") + s.slice(1);

function precipUncertainty(ctx: AnalysisContext, altTop3: string[] | null, top3: string[]): AnalysisResult["precipUncertainty"] {
  const chk = ctx.input.precipCheck;
  const power = meanAnnualPrecip(prepareClimate(ctx.series, 1, 0));
  const chosen = meanAnnualPrecip(ctx.base);
  if (power === null || chosen === null) return null;
  const sources: NonNullable<AnalysisResult["precipUncertainty"]>["sources"] = [
    { id: "power", label: { tr: "NASA POWER (giriş serisi)", en: "NASA POWER (input series)" }, annualMm: power },
  ];
  if (chk?.referenceAnnual?.length) {
    const ref = chk.referenceAnnual.reduce((a, b) => a + b, 0) / chk.referenceAnnual.length;
    sources.push({ id: "reference", label: { tr: chk.reference.toUpperCase(), en: chk.reference.toUpperCase() }, annualMm: ref });
  }
  sources.push({ id: "chosen", label: { tr: "Hesapta kullanılan", en: "Used in the analysis" }, annualMm: chosen });
  const vals = sources.map((x) => x.annualMm);
  const sensitive = altTop3 ? altTop3.join("|") !== top3.join("|") : null;
  return {
    sources, rangeMm: [Math.min(...vals), Math.max(...vals)], chosenFactorAnnual: power > 0 ? chosen / power : 1,
    alternativeTop3: altTop3, sensitive,
    note: {
      tr: "Hiçbir yağış kaynağı kesin doğru değildir. ERA5 tabanlı çarpan kurak iç bölgelerde aşırı düzeltme yapabilir (ör. Konya'da ERA5 istasyondan kuru, POWER yaş görünüyor); en iyi kaynak yakın istasyonun uzun yıllar ortalamasıdır." +
        (sensitive === true ? " İlk 3 öneri yağış kaynağına göre değişiyor: kartları buna göre oku." : sensitive === false ? " İlk 3 öneri iki yağış kaynağında da aynı." : ""),
      en: "No rainfall source is the truth. An ERA5-based factor can over-correct in dry inland areas (e.g. at Konya ERA5 looks drier and POWER wetter than the station); the long-term mean of a nearby station is the best source." +
        (sensitive === true ? " The top-3 recommendation changes with the rainfall source: read the cards accordingly." : sensitive === false ? " The top 3 are the same under both rainfall sources." : ""),
    },
  };
}

function collectAssumptions(ctx: AnalysisContext): AssumptionItem[] {
  const zone = ctx.zone;
  const out: AssumptionItem[] = [];
  const name = (id: CropId) => CROPS[id].name;
  for (const id of CROP_IDS) {
    const c = CROPS[id];
    const n = name(id);
    out.push({ key: `price.${id}`, label: { tr: `${n.tr} fiyatı`, en: `${n.en} price` }, value: `${c.priceTLPerKg.value} TL/kg`, source: c.priceTLPerKg.source, confidence: c.priceTLPerKg.confidence });
    out.push({ key: `cost.${id}`, label: { tr: `${n.tr} değişken maliyet`, en: `${n.en} variable cost` }, value: `${c.varCostTLPerDa.value} TL/da`, source: c.varCostTLPerDa.source, confidence: c.varCostTLPerDa.confidence });
    out.push({ key: `yield.${id}`, label: { tr: `${n.tr} referans verim (sulu / kuru ortalama)`, en: `${n.en} reference yield (irrigated / rainfed average)` }, value: `${c.refYieldTHa.value.irrigated} / ${c.refYieldTHa.value.rainfed} t/ha`, source: c.refYieldTHa.source, confidence: c.refYieldTHa.confidence });
    if (c.rainfedCeilingTHa) out.push({ key: `yieldCeiling.${id}`, label: { tr: `${n.tr} kuru tarım verim tavanı (su sınırsız)`, en: `${n.en} rainfed-management yield ceiling (water unlimited)` }, value: `${c.rainfedCeilingTHa.value} t/ha`, source: c.rainfedCeilingTHa.source, confidence: c.rainfedCeilingTHa.confidence });
    if (c.phRange) out.push({ key: `ph.${id}`, label: { tr: `${n.tr} pH aralığı`, en: `${n.en} pH range` }, value: `${c.phRange.value.min}–${c.phRange.value.max}`, source: c.phRange.source, confidence: c.phRange.confidence });
    if (c.nFixationKgHa) out.push({ key: `nfix.${id}`, label: { tr: `${n.tr} azot bağlama`, en: `${n.en} N fixation` }, value: `${c.nFixationKgHa.value.low}–${c.nFixationKgHa.value.high} kg N/ha`, source: c.nFixationKgHa.source, confidence: c.nFixationKgHa.confidence });
    if (c.nRemovalKgPerT) out.push({ key: `nrem.${id}`, label: { tr: `${n.tr} ürünle kaldırılan azot`, en: `${n.en} N removal` }, value: `${c.nRemovalKgPerT.value} kg N/t`, source: c.nRemovalKgPerT.source, confidence: c.nRemovalKgPerT.confidence });
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
  gen("zone", "İklim bölgesi tipi", "Climate zone type", ZONE_LABEL[zone].en, "Assumption: elevation ≥ 700 m → highland; else latitude < 38.5° → south (field elevation from terrain when available)");
  for (const [k, p] of Object.entries(CROP_CONSTANTS)) gen(`const.${k}`, k, k, String(p.value), p.source, p.confidence);
  gen("suitability.frost", "Don uygunluk eşiği", "Frost suitability threshold", `${MAX_FROST_YEAR_SHARE.value * 100} % of years`, MAX_FROST_YEAR_SHARE.source);
  gen("risk.weights", "Risk ağırlıkları", "Risk weights", JSON.stringify(RISK_WEIGHTS), "AgroShift method (visible weights)");
  gen("risk.thresholds", "Risk eşikleri", "Risk thresholds", `heat-stress year ≥ ${STRESS_HEAT_DAYS} days; poor year yield ratio < ${LOW_YIELD_RATIO}`, "AgroShift method");
  gen("soilHealth.weights", "Toprak sağlığı ağırlıkları", "Soil-health weights", JSON.stringify(SOIL_HEALTH_WEIGHTS), "AgroShift method (visible weights)");
  gen("kc.climate", "Kc iklim düzeltmesi yok", "No Kc climate adjustment", "Table 12 values used as is", "FAO-56 Eq. 62 needs RHmin, not available from POWER RH2M mean");
  gen("snow", "Kar birikimi modellenmedi", "Snow not modelled", "precipitation enters the soil on the day it falls", "Simplification");
  gen("singleCrop", "Yılda tek ana ürün", "One main crop per year", "no double cropping", "Simplification");
  gen("bareTew", "Çıplak toprak buharlaşma katmanı", "Bare-soil evaporation layer", "TEW = TAW of the 0.15 m layer", "Simplification of FAO-56 Eq. 73 (ignores drying below wilting point)");
  gen("preCrop", "Önceki ürün etkisi tablosu", "Previous-crop effect table", "legume→cereal ×1.10, broadleaf/fallow→cereal ×1.05, cereal→same cereal ×0.90, other cereal ×0.95, legume→legume ×0.90, Sclerotinia hosts ×0.95; N credit = legume N contribution / fallow 10–30 kg N/ha", "Direction after Angus et al. 2015, Kirkegaard et al. 2008, Ryan et al. 2008; percentages are assumptions");
  gen("cycle", "Tekrar eden döngü", "Repeating cycle", "year 3 state feeds year 1 of the next cycle; first window of each phase from the periodic steady state", "AgroShift method (engine v2)");
  gen("yieldModel", "Verim modeli", "Yield model", "Ym = rainfed ceiling + (irrigated − ceiling)·irrigation intensity; cereals capped at 20·(ETa − 110) kg/ha", "FAO-33/66 Ky; French & Schultz 1984; ceilings are assumptions");
  gen("erosion.C", "Erozyon C katsayıları", "Erosion C factors", JSON.stringify(C_FACTORS.value), C_FACTORS.source);
  gen("erosion.lambda", "Eğim uzunluğu", "Slope length", `${SLOPE_LENGTH_M.value} m`, SLOPE_LENGTH_M.source);
  if (ctx.lapseDeltaC !== 0) gen("lapse", "Sıcaklık rakım düzeltmesi", "Temperature elevation correction", `${ctx.lapseDeltaC} °C`, LAPSE_RATE_C_PER_M.source);
  gen("precip", "Yağış düzeltmesi", "Rainfall adjustment", ctx.precip.mode === "none" ? (ctx.precip.calibrated ? "station calibration already in the series" : "none (POWER as is)") : `${ctx.precip.mode}: ${ctx.precip.factorsMonthly.map((x) => x.toFixed(3)).join(", ")}`,
    ctx.precip.provenance ?? (ctx.precip.check ? `ERA5-Land check annual ratio ${ctx.precip.check.annualRatio.toFixed(2)} (not applied)` : "No independent rainfall check supplied"));
  if (ctx.soil.organicMatterAssumed) gen("soil.om", "Organik madde", "Organic matter", `${DEFAULT_OM_PCT} %`, "Assumption: SOC missing");
  if (ctx.ev.w0Assumed.some(Boolean)) gen("soil.initial", "Başlangıç nemi", "Initial soil moisture", `${ASSUMED_INITIAL_WETNESS * 100} % of TAW`, "Assumption: GWETROOT missing for some windows (spin-up seed only)");
  return out;
}
