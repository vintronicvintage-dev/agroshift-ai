/**
 * Rotation hard constraints that do not need climate data (spec §4.6):
 * excluded crops, candidate set, max consecutive years of the same crop, calendar conflicts.
 * Climate suitability (GDD, frost window) is checked in the engine (`engine/suitability.ts`).
 */
import type { ConstraintViolation, CropId, RotationSequence } from "../types";
import { CROPS } from "./database";
import type { SequenceSchedule } from "./calendar";

export const LEGUME_FAMILY = "fabaceae";

export function isLegume(id: CropId): boolean {
  return CROPS[id].family === LEGUME_FAMILY;
}

/** Longest run of identical crops inside the 3-year plan. */
function maxRun(seq: RotationSequence, id: CropId): number {
  let best = 0, run = 0;
  for (const c of seq) { run = c === id ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

export function staticViolations(
  seq: RotationSequence,
  schedule: SequenceSchedule,
  excluded: ReadonlySet<CropId>,
  candidates: ReadonlySet<CropId>,
): ConstraintViolation[] {
  const v: ConstraintViolation[] = [];
  seq.forEach((c, i) => {
    const n = CROPS[c].name;
    if (excluded.has(c)) {
      v.push({ code: "excluded", cropId: c, year: i + 1, text: { tr: `${n.tr} kullanıcı tarafından dışlandı`, en: `${n.en} is excluded by the user` } });
    } else if (!candidates.has(c)) {
      v.push({ code: "not_candidate", cropId: c, year: i + 1, text: { tr: `${n.tr} aday listesinde değil`, en: `${n.en} is not in the candidate list` } });
    }
  });
  const seen = new Set<CropId>();
  for (const c of seq) {
    if (seen.has(c)) continue;
    seen.add(c);
    const limit = CROPS[c].maxConsecutive.value;
    const run = maxRun(seq, c);
    if (run > limit) {
      const n = CROPS[c].name;
      v.push({
        code: "max_consecutive", cropId: c, year: 0,
        text: { tr: `${n.tr} üst üste ${run} yıl (sınır ${limit})`, en: `${n.en} ${run} years in a row (limit ${limit})` },
      });
    }
  }
  for (const y of schedule.conflictYears) {
    const c = seq[y - 1];
    const n = CROPS[c].name;
    v.push({
      code: "calendar_conflict", cropId: c, year: y,
      text: {
        tr: `${y}. yıl: önceki hasat ${n.tr} ekimini son ekim tarihinden sonraya itiyor`,
        en: `Year ${y}: the previous harvest pushes ${n.en} sowing past its latest sowing date`,
      },
    });
  }
  return v;
}
