import type { PriorityWeights } from "@/lib/types";

/**
 * UI presets for the guided "Tarlam" step. They are not engine data: each one maps to plain engine
 * inputs (FieldInput.irrigationBudgetMm, FieldInput.priorities) and the UI shows the mapped values.
 */

export type IrrigationLevelId = "limited" | "moderate" | "ample";

/** Net annual irrigation budget per level, m³/da/yr (= mm/yr). UI assumption, shown next to each level. */
export const IRRIGATION_LEVELS: readonly { id: IrrigationLevelId; budgetM3PerDa: number }[] = [
  { id: "limited", budgetM3PerDa: 125 },
  { id: "moderate", budgetM3PerDa: 250 },
  { id: "ample", budgetM3PerDa: 500 },
];

/** Range of the fine-tune slider, m³/da/yr. */
export const BUDGET_SLIDER = { min: 0, max: 800, step: 5 } as const;

export function irrigationLevelFor(budget: number | null): IrrigationLevelId | null {
  if (budget === null) return null;
  return IRRIGATION_LEVELS.find((l) => l.budgetM3PerDa === budget)?.id ?? null;
}

export function budgetForLevel(id: IrrigationLevelId): number {
  return IRRIGATION_LEVELS.find((l) => l.id === id)!.budgetM3PerDa;
}

export type PriorityPresetId = "water" | "income" | "soil" | "balanced";

/** Raw weights on the same 0–10 scale as the detailed sliders; the engine normalises them to sum 1. */
export const PRIORITY_PRESETS: readonly { id: PriorityPresetId; weights: PriorityWeights }[] = [
  { id: "water", weights: { water: 6, income: 2, soil: 2, risk: 2 } },
  { id: "income", weights: { water: 2, income: 6, soil: 2, risk: 2 } },
  { id: "soil", weights: { water: 2, income: 2, soil: 6, risk: 2 } },
  { id: "balanced", weights: { water: 5, income: 5, soil: 5, risk: 5 } },
];

export const PRIORITY_KEYS = ["water", "income", "soil", "risk"] as const satisfies readonly (keyof PriorityWeights)[];

export function weightsForPreset(id: PriorityPresetId): PriorityWeights {
  return { ...PRIORITY_PRESETS.find((p) => p.id === id)!.weights };
}

/** Normalised shares (sum 1), exactly as the engine will weigh them. All-zero weights count as equal. */
export function prioritySharesOf(w: PriorityWeights): PriorityWeights {
  const total = w.water + w.income + w.soil + w.risk;
  if (!(total > 0)) return { water: 0.25, income: 0.25, soil: 0.25, risk: 0.25 };
  return { water: w.water / total, income: w.income / total, soil: w.soil / total, risk: w.risk / total };
}

/** Which preset the weights correspond to (compared after normalisation), or null for custom sliders. */
export function priorityPresetFor(w: PriorityWeights): PriorityPresetId | null {
  const s = prioritySharesOf(w);
  for (const p of PRIORITY_PRESETS) {
    const ps = prioritySharesOf(p.weights);
    if (PRIORITY_KEYS.every((k) => Math.abs(ps[k] - s[k]) < 1e-9)) return p.id;
  }
  return null;
}
