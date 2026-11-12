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

/**
 * Legume → legume successions, cyclic (the plan repeats: pairs 1→2, 2→3, 3→1).
 * Same-crop successions are already blocked by max-consecutive = 1 for grain legumes and vetch;
 * different legumes in a row (e.g. chickpea → lentil) share soil-borne pathogens and are penalised.
 */
export function legumeSuccessions(seq: readonly CropId[]): { year: number; from: CropId; to: CropId }[] {
  const out: { year: number; from: CropId; to: CropId }[] = [];
  for (let i = 0; i < seq.length; i++) {
    const a = seq[i], b = seq[(i + 1) % seq.length];
    if (isLegume(a) && isLegume(b)) out.push({ year: i + 1, from: a, to: b });
  }
  return out;
}

/** Longest run of identical crops inside a crop list. */
function maxRun(seq: readonly CropId[], id: CropId): number {
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
    // The 3-year plan repeats, so year 3 is followed by year 1 of the next cycle.
    const cyclicRun = Math.min(3, maxRun([...seq, seq[0], seq[1]], c));
    if (run > limit) {
      const n = CROPS[c].name;
      v.push({
        code: "max_consecutive", cropId: c, year: 0,
        text: { tr: `${n.tr} üst üste ${run} yıl (sınır ${limit})`, en: `${n.en} ${run} years in a row (limit ${limit})` },
      });
    } else if (cyclicRun > limit) {
      const n = CROPS[c].name;
      v.push({
        code: "max_consecutive", cropId: c, year: 0,
        text: {
          tr: `${n.tr} plan tekrarlandığında üst üste ${cyclicRun} yıl gelir (3. yıl → sonraki döngünün 1. yılı; sınır ${limit})`,
          en: `${n.en} runs ${cyclicRun} years in a row when the plan repeats (year 3 → year 1 of the next cycle; limit ${limit})`,
        },
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
