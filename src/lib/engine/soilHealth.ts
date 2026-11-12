/**
 * Rule-based soil-health / rotation indicators (spec §4.5). These are indicators, not
 * measurements. The composite 0–100 score uses the visible weights in SOIL_HEALTH_WEIGHTS.
 */
import type { CropId, RotationSequence, SoilHealthComponent, SoilHealthResult } from "../types";
import { CROPS } from "../crops/database";
import type { SequenceSchedule } from "../crops/calendar";

/** Points per component (sum = 100). Documented on the method page. */
export const SOIL_HEALTH_WEIGHTS = {
  diversity: 20,
  family_break: 20,
  legume: 20,
  bare_soil: 20,
  root_diversity: 10,
  residue: 10,
} as const;

const RESIDUE_POINTS = { low: 0, medium: 0.5, high: 1 } as const;

/**
 * @param slopePct optional field slope; bare-soil penalty is multiplied by (1 + slope/10), capped at 2.
 */
export function soilHealth(seq: RotationSequence, schedule: SequenceSchedule, slopePct?: number | null): SoilHealthResult {
  const crops = seq.filter((c) => c !== "fallow");
  const families = new Set(crops.map((c) => CROPS[c].family));
  const familyCount = families.size;
  // Same-family pairs, cyclic (the plan repeats): (1,2), (2,3), (3,1)
  let sameFamilyPairs = 0;
  for (let i = 0; i < 3; i++) {
    const a = seq[i], b = seq[(i + 1) % 3];
    if (a !== "fallow" && b !== "fallow" && CROPS[a].family === CROPS[b].family) sameFamilyPairs++;
  }
  const legumeYears = seq.filter((c) => CROPS[c].family === "fabaceae").length;
  const n = seq.reduce((acc, c) => ({ low: acc.low + CROPS[c].nContributionKgHa.value.low, high: acc.high + CROPS[c].nContributionKgHa.value.high }), { low: 0, high: 0 });
  const roots = crops.map((c) => CROPS[c].agronomy!.rootDepthMaxM.value);
  const rootRange = roots.length ? Math.max(...roots) - Math.min(...roots) : 0;
  const residuePts: number[] = seq.map((c: CropId) => RESIDUE_POINTS[CROPS[c].residue.value]);
  const residueMean = residuePts.reduce((a, b) => a + b, 0) / 3;
  const residueClass: "low" | "medium" | "high" = residueMean >= 0.67 ? "high" : residueMean >= 0.34 ? "medium" : "low";
  const slopeFactor = Math.min(2, 1 + Math.max(0, slopePct ?? 0) / 10);
  const bare = schedule.bareDaysPerYear;

  const v = {
    diversity: familyCount / 3,
    family_break: 1 - sameFamilyPairs / 3,
    legume: legumeYears === 0 ? 0 : legumeYears === 1 ? 0.75 : 1,
    bare_soil: Math.max(0, 1 - (bare / 365) * slopeFactor),
    root_diversity: Math.min(1, rootRange / 0.8),
    residue: residueMean,
  };
  const label = {
    diversity: { tr: "Ürün ailesi çeşitliliği", en: "Crop family diversity" },
    family_break: { tr: "Aynı aile ardışıklığı (hastalık/zararlı döngüsü)", en: "Same-family succession (pest/disease cycle)" },
    legume: { tr: "Baklagil ve azot katkısı", en: "Legume and nitrogen contribution" },
    bare_soil: { tr: "Çıplak toprak günleri (erozyon)", en: "Bare-soil days (erosion)" },
    root_diversity: { tr: "Kök derinliği çeşitliliği", en: "Rooting depth diversity" },
    residue: { tr: "Artık / organik madde katkısı", en: "Residue / organic matter input" },
  };
  const detail = {
    diversity: `${familyCount} families`,
    family_break: `${sameFamilyPairs} of 3 cyclic pairs share a family`,
    legume: `${legumeYears} legume years, N ${n.low}–${n.high} kg/ha per cycle`,
    bare_soil: `${Math.round(bare)} bare days/yr, slope factor ${slopeFactor.toFixed(2)}`,
    root_diversity: `root depth range ${rootRange.toFixed(2)} m`,
    residue: `mean residue class ${residueClass}`,
  };
  const components: SoilHealthComponent[] = (Object.keys(SOIL_HEALTH_WEIGHTS) as (keyof typeof SOIL_HEALTH_WEIGHTS)[]).map((k) => ({
    key: k, label: label[k], value: v[k], weight: SOIL_HEALTH_WEIGHTS[k], detail: detail[k],
  }));
  const score = components.reduce((s, c) => s + c.value * c.weight, 0);
  return {
    score: Math.round(score * 10) / 10,
    components,
    familyCount,
    sameFamilyPairs,
    legumeYears,
    nContributionKgHa: n,
    bareDaysPerYear: bare,
    rootDepthRangeM: rootRange,
    residueClass,
  };
}
