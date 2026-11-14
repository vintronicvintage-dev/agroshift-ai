/**
 * Climate suitability hard constraint (spec §4.6): growing degree days and frost window,
 * evaluated on the regional calendar for every usable agricultural year.
 *
 * The frost window counts only LETHAL establishment-phase frost: winter-kill temperature in the
 * initial/development stages, or the crop's critical frost temperature when its critical stages
 * are initial/development (spring-sown seedlings). Frost at flowering is counted as stress in
 * the water-balance outputs (risk score, local review), not as a hard exclusion.
 */
import type { ClimateZone, CropId } from "../types";
import type { PreparedClimate } from "./climate";
import { CROPS, CROP_IDS, asm } from "../crops/database";
import { parseMonthDay } from "./dates";
import { epochDayOf } from "./dates";
import { median } from "./stats";

/** Max share of years with lethal establishment-phase frost for a crop to count as suitable. */
export const MAX_FROST_YEAR_SHARE = asm(0.4, "Assumption: crop is unsuitable if lethal establishment-phase frost occurs in more than 40 % of years");

export interface CropSuitability {
  cropId: CropId;
  suitable: boolean;
  years: number;
  medianGdd: number | null;
  requiredGdd: number | null;
  frostYearShare: number | null;
  reasons: ("gdd_insufficient" | "frost_window")[];
}

export function cropSuitability(clim: PreparedClimate, zone: ClimateZone): Record<CropId, CropSuitability> {
  const out = {} as Record<CropId, CropSuitability>;
  for (const id of CROP_IDS) {
    const a = CROPS[id].agronomy;
    if (!a) { out[id] = { cropId: id, suitable: true, years: 0, medianGdd: null, requiredGdd: null, frostYearShare: null, reasons: [] }; continue; }
    const cal = a.calendar[zone].value;
    const { m, d } = parseMonthDay(cal.sow);
    const autumn = m >= 8;
    const len = cal.stages[0] + cal.stages[1] + cal.stages[2] + cal.stages[3];
    const L1 = cal.stages[0], L2 = L1 + cal.stages[1], L3 = L2 + cal.stages[2];
    const fr = a.frost.value;
    const frostMask = fr.stages.reduce((mm, s) => mm | ({ ini: 1, dev: 2, mid: 4, late: 8 } as const)[s], 0);
    const wk = fr.winterKillC ?? -Infinity;
    const base = a.gdd.value.baseC;
    const gdds: number[] = [];
    let frostYears = 0;
    for (const ay of clim.ays) {
      if (!ay.coreValid || !ay.extValid) continue;
      const sow = epochDayOf(ay.year - (autumn ? 1 : 0), m, d) - clim.startDay;
      if (sow < 0 || sow + len > clim.n) continue;
      let g = 0, frost = 0;
      for (let t = 0; t < len; t++) {
        const i = sow + t;
        const tx = clim.tmax[i], tn = clim.tmin[i];
        const gg = (tx + tn) / 2 - base;
        if (gg > 0) g += gg;
        const bit = t < L1 ? 1 : t < L2 ? 2 : t < L3 ? 4 : 8;
        if (bit <= 2 && (((frostMask & bit) !== 0 && tn < fr.criticalC) || tn < wk)) frost++;
      }
      gdds.push(g);
      if (frost > 0) frostYears++;
    }
    const years = gdds.length;
    const med = years ? median(gdds) : null;
    const share = years ? frostYears / years : null;
    const reasons: CropSuitability["reasons"] = [];
    if (med !== null && med < a.gdd.value.required) reasons.push("gdd_insufficient");
    if (share !== null && share > MAX_FROST_YEAR_SHARE.value) reasons.push("frost_window");
    out[id] = { cropId: id, suitable: reasons.length === 0, years, medianGdd: med, requiredGdd: a.gdd.value.required, frostYearShare: share, reasons };
  }
  return out;
}
