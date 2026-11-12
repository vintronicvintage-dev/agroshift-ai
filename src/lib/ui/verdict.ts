import type { AnalysisResult, PlanResult } from "@/lib/types";

/** The comparable numbers of one plan, all taken straight from the engine result. */
export interface PlanMetrics {
  /** Water deficit P50, mm/yr. */
  deficit: number | null;
  /** Share of periods in which the irrigation budget ran out (0–1). */
  budget: number | null;
  /** Soil-health indicator, 0–100. */
  soil: number;
  /** Gross margin P50, TL/da/yr (scenario). */
  margin: number | null;
  /** Risk indicator, 0–1. */
  risk: number;
}

export type MetricKey = keyof PlanMetrics;

export const METRIC_KEYS: readonly MetricKey[] = ["deficit", "budget", "soil", "margin", "risk"];

/** true when a larger value is better for the farmer. */
export const HIGHER_IS_BETTER: Record<MetricKey, boolean> = { deficit: false, budget: false, soil: true, margin: true, risk: false };

export function planMetrics(p: PlanResult): PlanMetrics {
  return {
    deficit: p.water.requirementMmPerYr?.p50 ?? null,
    budget: p.water.budgetExceededShare,
    soil: p.soilHealth.score,
    margin: p.economics.grossMarginTLPerDaPerYr?.p50 ?? null,
    risk: p.risk.score,
  };
}

export function metricDelta(p: PlanResult, current: PlanResult, k: MetricKey): number | null {
  const a = planMetrics(p)[k];
  const b = planMetrics(current)[k];
  return a === null || b === null ? null : a - b;
}

/** "better" / "worse" / "same" relative to the current plan; |delta| < eps counts as same. */
export function deltaTone(k: MetricKey, delta: number | null, eps: number): "better" | "worse" | "same" | null {
  if (delta === null) return null;
  if (Math.abs(delta) < eps) return "same";
  return delta > 0 === HIGHER_IS_BETTER[k] ? "better" : "worse";
}

/** Threshold below which a difference is shown as "no change", per metric (display units). */
export const SAME_EPS: Record<MetricKey, number> = { deficit: 1, budget: 0.005, soil: 1, margin: 1, risk: 0.005 };

export interface Verdict {
  best: PlanResult;
  bestIsCurrent: boolean;
  /** best − current, mm/yr. */
  deficitDelta: number | null;
  /** best − current, TL/da/yr. */
  marginDelta: number | null;
  /** best − current, points. */
  soilDelta: number;
}

/**
 * The one-sentence summary, from engine numbers only: the plan with the highest fit score among the
 * current plan and the recommendations (user plans are not ranked), and its differences to the current plan.
 * Ties go to the recommendation order, then to the current plan.
 */
export function composeVerdict(result: AnalysisResult): Verdict {
  const pool = [...result.alternatives, result.current];
  let best = pool[0];
  for (const p of pool) if (p.score.composite > best.score.composite) best = p;
  const cur = result.current;
  return {
    best,
    bestIsCurrent: best === cur,
    deficitDelta: metricDelta(best, cur, "deficit"),
    marginDelta: metricDelta(best, cur, "margin"),
    soilDelta: best.soilHealth.score - cur.soilHealth.score,
  };
}
