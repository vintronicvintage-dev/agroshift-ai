/**
 * Robust ranking, rank-stability sweep and confidence grades (engine v2). Deterministic.
 *
 * Robust ranking: the robust pool (best exact plans + Pareto + current) is replayed exactly under
 * the active scenario, the "dry" preset and the "hot-dry" preset (same budget, prices, rainfall
 * adjustment). In every scenario the farmer-priority composite is computed over the pool; regret =
 * best composite in that scenario − the plan's composite. robustBest = minimax regret (ties: higher
 * mean composite, then id). CVaR20 = mean of the worst 20 % of window margins pooled over scenarios.
 *
 * Sensitivity: one-at-a-time ±20 % on prices, variable costs, reference yields (re-priced from cached
 * raw windows, no re-simulation), rainfall and the irrigation budget (exact re-simulation of the
 * small sweep pool only). Each run re-ranks the pool with the same diverse top-3 rule as the main
 * ranking; for every tracked plan we report how often it stays in the top 3 and which run flips it.
 */
import type {
  ClimateSeries, ClimateZone, CropId, LocalizedText, PlanConfidence, PriorityWeights, RobustInfo, RotationSequence,
  ScenarioPresetId, SoilHydraulics, StabilityFlip, StabilityInfo,
} from "../types";
import { CROPS } from "../crops/database";
import { prepareClimate } from "./climate";
import { createSetup, replayWindows } from "./rotation";
import {
  type CropEconomics, type EconOverrides, type EvalContext, type PlanMetrics, type RawWindow,
  buildEvalContext, evaluateExactRaw, planMetrics, summarizeRaw,
} from "./evaluation";
import { type PlanRecord, pickDiverse, scorePlans } from "./optimizer";

export interface ScenarioSpec { id: "active" | ScenarioPresetId; label: LocalizedText; rain: number; temp: number }

export interface EvalEnv {
  series: ClimateSeries; monthlyFactors: number[]; soil: SoilHydraulics; zone: ClimateZone;
  budgetNet: number; efficiency: number; waterPrice: number; priceMultiplier: number; overrides: EconOverrides;
  lapseDeltaC: number;
}

/** EvalContext for another climate (rain multiplier, temperature delta) or budget. */
export function scenarioEv(env: EvalEnv, rain: number, temp: number, budgetNet = env.budgetNet, monthlyFactors = env.monthlyFactors): EvalContext {
  const clim = prepareClimate(env.series, rain, temp + env.lapseDeltaC, monthlyFactors);
  const setup = createSetup(clim, env.soil, env.zone);
  return buildEvalContext(setup, replayWindows(clim), budgetNet, env.efficiency, env.waterPrice, env.priceMultiplier, env.overrides);
}

const rawCache = new WeakMap<EvalContext, Map<string, RawWindow[]>>();
/** Exact raw windows of a plan in a context, memoised per context. */
export function rawsFor(ev: EvalContext, r: PlanRecord): RawWindow[] {
  let m = rawCache.get(ev);
  if (!m) { m = new Map(); rawCache.set(ev, m); }
  let x = m.get(r.id);
  if (!x) { x = evaluateExactRaw(ev, r.schedule); m.set(r.id, x); }
  return x;
}
export function seedRaws(ev: EvalContext, r: PlanRecord, raws: RawWindow[]): void {
  let m = rawCache.get(ev);
  if (!m) { m = new Map(); rawCache.set(ev, m); }
  m.set(r.id, raws);
}

function metricsOf(ev: EvalContext, r: PlanRecord, raws: RawWindow[], econ?: Record<CropId, CropEconomics>, pm?: number) {
  const { windows } = summarizeRaw(ev, r.crops, raws, econ ?? ev.econ, pm ?? ev.priceMultiplier);
  return { m: planMetrics(windows), windows };
}

/** Composite (0–100) of each pool plan in one evaluation. */
function composites(items: { r: PlanRecord; m: PlanMetrics }[], w: PriorityWeights): Map<string, number> {
  const s = scorePlans(items, w);
  return new Map(items.map((x, i) => [x.r.id, s[i].composite]));
}

export interface RobustOutput {
  info: Map<string, RobustInfo>;
  robustBest: PlanRecord | null;
  scenarios: ScenarioSpec[];
}

export function robustRank(
  env: EvalEnv, activeEv: EvalContext, specs: ScenarioSpec[], pool: PlanRecord[], eligible: (r: PlanRecord) => boolean,
  priorities: PriorityWeights,
): RobustOutput {
  const perScen: { spec: ScenarioSpec; comp: Map<string, number>; m: Map<string, PlanMetrics>; margins: Map<string, number[]> }[] = [];
  for (const spec of specs) {
    const ev = spec.id === "active" ? activeEv : scenarioEv(env, spec.rain, spec.temp);
    const items: { r: PlanRecord; m: PlanMetrics }[] = [];
    const margins = new Map<string, number[]>();
    for (const r of pool) {
      const { m, windows } = metricsOf(ev, r, rawsFor(ev, r));
      if (!m) continue;
      items.push({ r, m });
      margins.set(r.id, windows.map((w) => w.marginMean));
    }
    perScen.push({ spec, comp: composites(items, priorities), m: new Map(items.map((x) => [x.r.id, x.m])), margins });
  }
  const info = new Map<string, RobustInfo>();
  for (const r of pool) {
    const sc = perScen.map((p) => {
      const best = Math.max(...[...p.comp.entries()].filter(([id]) => eligibleId(id)).map(([, v]) => v), ...[p.comp.get(r.id) ?? 0]);
      const c = p.comp.get(r.id);
      const m = p.m.get(r.id);
      return c === undefined || !m ? null : {
        id: p.spec.id, label: p.spec.label, rainMultiplier: p.spec.rain, tempDeltaC: p.spec.temp,
        composite: c, regret: Math.max(0, best - c), marginP50: m.marginP50, requirementP50: m.requirementP50,
      };
    });
    if (sc.some((x) => x === null)) continue;
    const s = sc as NonNullable<(typeof sc)[number]>[];
    const pooled = perScen.flatMap((p) => p.margins.get(r.id) ?? []).sort((a, b) => a - b);
    const k = Math.max(1, Math.ceil(pooled.length * 0.2));
    info.set(r.id, {
      scenarios: s, maxRegret: Math.max(...s.map((x) => x.regret)),
      meanComposite: s.reduce((a, x) => a + x.composite, 0) / s.length,
      cvar20MarginTLPerDaPerYr: pooled.slice(0, k).reduce((a, b) => a + b, 0) / k,
    });
  }
  function eligibleId(id: string) { const r = pool.find((p) => p.id === id); return r ? eligible(r) : false; }
  const cands = pool.filter((r) => eligible(r) && info.has(r.id)).sort((a, b) => {
    const x = info.get(a.id)!, y = info.get(b.id)!;
    return x.maxRegret - y.maxRegret || y.meanComposite - x.meanComposite || a.id.localeCompare(b.id);
  });
  return { info, robustBest: cands[0] ?? null, scenarios: specs };
}

/** Exact metrics of one plan in a context (memoised raws). */
export function metricsIn(ev: EvalContext, r: PlanRecord): PlanMetrics | null {
  return metricsOf(ev, r, rawsFor(ev, r)).m;
}

/** Rank a pool in one evaluation context with the main diverse top-3 rule; also returns metrics. */
export function rankPool(ev: EvalContext, pool: PlanRecord[], current: RotationSequence, priorities: PriorityWeights): { top3: string[]; metrics: Map<string, PlanMetrics> } {
  const items: { r: PlanRecord; m: PlanMetrics }[] = [];
  for (const r of pool) {
    const { m } = metricsOf(ev, r, rawsFor(ev, r));
    if (m) items.push({ r, m });
  }
  const comp = composites(items, priorities);
  const sorted = items.map((x) => x.r).sort((a, b) => comp.get(b.id)! - comp.get(a.id)! || a.id.localeCompare(b.id));
  return { top3: pickDiverse(sorted, current, 3).map((r) => r.id), metrics: new Map(items.map((x) => [x.r.id, x.m])) };
}

// ── Sensitivity ──────────────────────────────────────────────────────────────

const ASSUMPTION_LABEL: Record<StabilityFlip["assumption"], LocalizedText> = {
  price: { tr: "ürün fiyatları", en: "crop prices" },
  cost: { tr: "değişken maliyetler", en: "variable costs" },
  yield: { tr: "referans verimler", en: "reference yields" },
  rain: { tr: "yağış miktarı", en: "rainfall amount" },
  budget: { tr: "sulama suyu bütçesi", en: "irrigation budget" },
};

export interface SweepOutput {
  runs: number;
  perturbations: { assumption: StabilityFlip["assumption"]; change: StabilityFlip["change"]; label: LocalizedText; top3: string[] }[];
  stability: Map<string, StabilityInfo>;
  baselineTop3: string[];
}

export function sensitivitySweep(
  env: EvalEnv, activeEv: EvalContext, pool: PlanRecord[], current: RotationSequence, tracked: string[], priorities: PriorityWeights,
  activeRain: number, activeTemp: number,
): SweepOutput {
  const scaleEcon = (f: (e: CropEconomics) => CropEconomics) => {
    const o = {} as Record<CropId, CropEconomics>;
    for (const [id, e] of Object.entries(activeEv.econ) as [CropId, CropEconomics][]) o[id] = f(e);
    return o;
  };
  const rank = (ev: EvalContext, econ?: Record<CropId, CropEconomics>, pm?: number): string[] => {
    const items: { r: PlanRecord; m: PlanMetrics }[] = [];
    for (const r of pool) {
      const { m } = metricsOf(ev, r, rawsFor(ev, r), econ, pm);
      if (m) items.push({ r, m });
    }
    const comp = composites(items, priorities);
    const sorted = items.map((x) => x.r).sort((a, b) => comp.get(b.id)! - comp.get(a.id)! || a.id.localeCompare(b.id));
    return pickDiverse(sorted, current, 3).map((r) => r.id);
  };
  const baselineTop3 = rank(activeEv);
  const runs: SweepOutput["perturbations"] = [];
  for (const [change, f] of [["+20%", 1.2], ["-20%", 0.8]] as const) {
    runs.push({ assumption: "price", change, label: ASSUMPTION_LABEL.price, top3: rank(activeEv, undefined, activeEv.priceMultiplier * f) });
    runs.push({ assumption: "cost", change, label: ASSUMPTION_LABEL.cost, top3: rank(activeEv, scaleEcon((e) => ({ ...e, varCostTLPerDa: e.varCostTLPerDa * f }))) });
    runs.push({ assumption: "yield", change, label: ASSUMPTION_LABEL.yield, top3: rank(activeEv, scaleEcon((e) => ({ ...e, ymTHa: e.ymTHa * f, ymRainfedTHa: e.ymRainfedTHa * f }))) });
    runs.push({ assumption: "rain", change, label: ASSUMPTION_LABEL.rain, top3: rank(scenarioEv(env, activeRain * f, activeTemp)) });
    if (env.budgetNet > 0) runs.push({ assumption: "budget", change, label: ASSUMPTION_LABEL.budget, top3: rank(scenarioEv(env, activeRain, activeTemp, env.budgetNet * f)) });
  }
  const stability = new Map<string, StabilityInfo>();
  for (const id of tracked) {
    let inTop = 0;
    const flips: StabilityFlip[] = [];
    for (const run of runs) {
      if (run.top3.includes(id)) { inTop++; continue; }
      flips.push({ assumption: run.assumption, change: run.change, label: run.label, replacedBy: run.top3.find((x) => !baselineTop3.includes(x)) ?? run.top3[0] ?? null });
    }
    stability.set(id, { runs: runs.length, top3Share: runs.length ? inTop / runs.length : 1, flips });
  }
  return { runs: runs.length, perturbations: runs, stability, baselineTop3 };
}

// ── Confidence ───────────────────────────────────────────────────────────────

export interface ConfidenceInputs {
  dataCompleteness: number; completenessReasons: LocalizedText[];
  rainfall: number; rainfallReason: LocalizedText;
}

/** Share of the plan's crop parameters taken from literature tables (vs. assumption). */
export function literatureShare(crops: readonly CropId[], zone: ClimateZone): number {
  let lit = 0, n = 0;
  for (const id of new Set(crops)) {
    const c = CROPS[id];
    const a = c.agronomy;
    if (!a) continue;
    const ps = [a.kc, a.rootDepthMaxM, a.p, a.ky, a.frost, a.heat, a.gdd, a.cover, a.calendar[zone], c.refYieldTHa, c.priceTLPerKg, c.varCostTLPerDa, c.nContributionKgHa, ...(c.rainfedCeilingTHa ? [c.rainfedCeilingTHa] : [])];
    for (const p of ps) { n++; if (p.confidence === "literature") lit++; }
  }
  return n ? lit / n : 1;
}

export function planConfidence(crops: readonly CropId[], zone: ClimateZone, base: ConfidenceInputs, stability: StabilityInfo | null): PlanConfidence {
  const litShare = literatureShare(crops, zone);
  // Parameter component: 0.4 floor-free mapping of the literature share (most economics are assumptions by design).
  const param = Math.min(1, litShare / 0.6);
  const parts: [number, number][] = [[base.dataCompleteness, 25], [base.rainfall, 30], [param, 20]];
  if (stability) parts.push([stability.top3Share, 25]);
  const wsum = parts.reduce((s, [, w]) => s + w, 0);
  const score = Math.round((100 * parts.reduce((s, [v, w]) => s + v * w, 0)) / wsum);
  const grade = score >= 80 ? "A" : score >= 65 ? "B" : score >= 50 ? "C" : "D";
  const reasons: LocalizedText[] = [...base.completenessReasons, base.rainfallReason];
  reasons.push({
    tr: `Bu planın ürün parametrelerinin %${Math.round(litShare * 100)}'i literatür tablosundan, gerisi varsayım (fiyat, maliyet, takvim, eşikler).`,
    en: `${Math.round(litShare * 100)} % of this plan's crop parameters come from literature tables; the rest are assumptions (prices, costs, calendar, thresholds).`,
  });
  if (stability) {
    const f = stability.flips[0];
    reasons.push(stability.flips.length === 0
      ? { tr: `±%20 duyarlılık taramasının ${stability.runs} çalışmasının hepsinde ilk 3'te kaldı.`, en: `Stayed in the top 3 in all ${stability.runs} runs of the ±20 % sensitivity sweep.` }
      : { tr: `±%20 taramada ${stability.runs} çalışmanın ${stability.runs - stability.flips.length}'inde ilk 3'te kaldı; ${f.label.tr} ${f.change} olunca sıralama değişiyor.`,
          en: `Stayed in the top 3 in ${stability.runs - stability.flips.length} of ${stability.runs} ±20 % runs; ${f.label.en} ${f.change} changes the ranking.` });
  } else {
    reasons.push({ tr: "Sıralama kararlılığı yalnız önerilen planlar için hesaplanır.", en: "Rank stability is computed for recommended plans only." });
  }
  return {
    grade, score,
    factors: { dataCompleteness: round2(base.dataCompleteness), rainfallCalibration: round2(base.rainfall), parameterLiterature: round2(litShare), rankStability: stability ? round2(stability.top3Share) : null },
    reasons,
  };
}

const round2 = (x: number) => Math.round(x * 100) / 100;
