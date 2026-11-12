import type { CropId, FieldInput, PriorityWeights, RotationSequence, SoilProfile } from "@/lib/types";
import { usdaTextureClass } from "@/lib/engine";

export type IrrigationMethod = "furrow" | "sprinkler" | "drip" | "custom";

/** Typical application efficiencies (FAO irrigation guidance); user can override with "custom". */
export const METHOD_EFF: Record<Exclude<IrrigationMethod, "custom">, number> = { furrow: 0.6, sprinkler: 0.75, drip: 0.9 };

export interface SoilDraft {
  sand: string;
  silt: string;
  clay: string;
  soc: string;
  ph: string;
}

/** Everything the farmer types, kept as strings so half-typed values do not jump around. */
export interface FieldDraft {
  areaDa: string;
  slopePct: string;
  rainfed: boolean;
  budget: string;
  method: IrrigationMethod;
  efficiency: string;
  rotation: RotationSequence;
  priorities: PriorityWeights;
  excluded: CropId[];
  stationMm: string;
}

/** Example starting values (shown as such in the form). The station rainfall is deliberately empty. */
export const DEFAULT_FIELD: FieldDraft = {
  areaDa: "50",
  slopePct: "",
  rainfed: false,
  budget: "250",
  method: "sprinkler",
  efficiency: String(METHOD_EFF.sprinkler),
  rotation: ["wheat_winter", "fallow", "wheat_winter"],
  priorities: { water: 5, income: 5, soil: 5, risk: 5 },
  excluded: [],
  stationMm: "",
};

export function parseNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

export function soilToDraft(s: SoilProfile): SoilDraft {
  const f = (v: number | null) => (v === null ? "" : String(v));
  return { sand: f(s.sand), silt: f(s.silt), clay: f(s.clay), soc: f(s.soc), ph: f(s.ph) };
}

export interface SoilCheck {
  profile: SoilProfile | null;
  sum: number | null;
  texture: string | null;
}

/**
 * Build the engine's SoilProfile from the draft. If the draft equals the fetched profile, the fetched
 * profile (with its origin and sources) is used; otherwise origin becomes "user".
 */
export function soilFromDraft(d: SoilDraft, base: SoilProfile | null): SoilCheck {
  const sand = parseNum(d.sand), silt = parseNum(d.silt), clay = parseNum(d.clay);
  if (sand === null || silt === null || clay === null || sand < 0 || silt < 0 || clay < 0) return { profile: null, sum: null, texture: null };
  const sum = sand + silt + clay;
  if (Math.abs(sum - 100) > 2) return { profile: null, sum, texture: null };
  const soc = parseNum(d.soc);
  const ph = parseNum(d.ph);
  const texture = usdaTextureClass(sand, silt, clay);
  if (base && sameDraft(d, soilToDraft(base))) return { profile: base, sum, texture: base.textureClass || texture };
  return {
    profile: { sand, silt, clay, soc: soc !== null && soc >= 0 ? soc : null, ph, textureClass: texture, origin: "user", sources: [] },
    sum,
    texture,
  };
}

function sameDraft(a: SoilDraft, b: SoilDraft) {
  return a.sand === b.sand && a.silt === b.silt && a.clay === b.clay && a.soc === b.soc && a.ph === b.ph;
}

export interface FieldCheck {
  field: Omit<FieldInput, "soil"> | null;
  areaOk: boolean;
  budgetOk: boolean;
  effOk: boolean;
}

export function fieldFromDraft(d: FieldDraft): FieldCheck {
  const area = parseNum(d.areaDa);
  const budget = d.rainfed ? 0 : parseNum(d.budget);
  const eff = d.method === "custom" ? parseNum(d.efficiency) : METHOD_EFF[d.method];
  const slope = parseNum(d.slopePct);
  const areaOk = area !== null && area > 0 && area <= 1e6;
  const budgetOk = budget !== null && budget >= 0 && budget <= 5000;
  const effOk = eff !== null && eff > 0.05 && eff <= 1;
  if (!areaOk || !budgetOk || !effOk) return { field: null, areaOk, budgetOk, effOk };
  return {
    field: {
      areaDa: area!,
      slopePct: slope !== null && slope >= 0 ? slope : null,
      irrigationBudgetMm: budget!,
      budgetBasis: "net",
      irrigationEfficiency: eff!,
      currentRotation: d.rotation,
      excludedCrops: d.excluded,
      priorities: d.priorities,
    },
    areaOk,
    budgetOk,
    effOk,
  };
}
