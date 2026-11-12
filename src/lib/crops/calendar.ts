/**
 * Regional crop calendars and 3-year sequence scheduling.
 *
 * Agricultural year (AY) c runs 1 Oct (c−1) → 30 Sep (c). Rotation year k (1–3) is one AY and
 * holds one main crop. Autumn-sown crops (sowing month Aug–Dec) are sown in calendar year c−1,
 * spring/summer crops in calendar year c. A late-harvested crop can delay the next autumn
 * sowing (stages are compressed for autumn crops, shifted for spring crops); if the delay goes
 * past the crop's latest sowing date the sequence has a calendar conflict.
 */
import type { ClimateZone, CropId, LocalizedText, RotationSequence } from "../types";
import { CROPS, CROP_CONSTANTS } from "./database";
import { epochDayOf, parseMonthDay, monthDayOf } from "../engine/dates";

/** Pick a calendar zone from latitude and elevation (assumption; documented in the result). */
export function climateZone(lat: number, elevation: number): ClimateZone {
  if (elevation >= 700) return "highland";
  if (lat < 38.5) return "south_lowland";
  return "north_lowland";
}

export const ZONE_LABEL: Record<ClimateZone, LocalizedText> = {
  south_lowland: { tr: "Güney ova (Çukurova/GAP tipi, rakım < 700 m, enlem < 38.5°)", en: "Southern lowland (Çukurova/GAP type, < 700 m, < 38.5°N)" },
  north_lowland: { tr: "Kuzey/batı ova (Trakya/Marmara tipi, rakım < 700 m)", en: "Northern/western lowland (Thrace/Marmara type, < 700 m)" },
  highland: { tr: "İç Anadolu platosu tipi (rakım ≥ 700 m)", en: "Central Anatolian plateau type (≥ 700 m)" },
};

/** Reference AY used to compute calendar offsets (non-leap years). */
const REF_AY = 2002;

export interface SlotSchedule {
  cropId: CropId;
  /** 0-based rotation year. */
  k: number;
  sowMonth: number; sowDayOfMonth: number;
  autumn: boolean;
  delay: number;
  stages: [number, number, number, number];
  /** Offsets (days) from the window start (1 Oct before rotation year 1), reference calendar. */
  sowOffset: number;
  harvestOffset: number;
  /** Delay beyond latest sowing date (calendar conflict). */
  conflict: boolean;
}

export interface SequenceSchedule {
  crops: RotationSequence;
  zone: ClimateZone;
  slots: (SlotSchedule | null)[];
  conflictYears: number[];
  /** Bare days after each slot until the next sowing (wrapping to the next cycle). */
  bareDaysAfter: number[];
  bareDaysPerYear: number;
}

function offsetOf(k: number, m: number, d: number, autumn: boolean): number {
  const start = epochDayOf(REF_AY - 1, 10, 1);
  const y = REF_AY + k - (autumn ? 1 : 0);
  return epochDayOf(y, m, d) - start;
}

/** Real epoch day of a slot's (undelayed) sowing date in the window starting at AY `firstAy`. */
export function sowEpochDay(slot: SlotSchedule, firstAy: number): number {
  const y = firstAy + slot.k - (slot.autumn ? 1 : 0);
  return epochDayOf(y, slot.sowMonth, slot.sowDayOfMonth) + slot.delay;
}

/** Schedule a 3-year sequence in a zone. Deterministic, climate independent. */
export function scheduleSequence(crops: RotationSequence, zone: ClimateZone): SequenceSchedule {
  const turnaround = CROP_CONSTANTS.turnaroundDays.value;
  const minIni = CROP_CONSTANTS.minIniDays.value;
  const minDev = CROP_CONSTANTS.minDevDays.value;
  const slots: (SlotSchedule | null)[] = [];
  const conflictYears: number[] = [];
  let prevHarvest = -Infinity;
  for (let k = 0; k < 3; k++) {
    const def = CROPS[crops[k]];
    if (!def.agronomy) { slots.push(null); continue; }
    const c = def.agronomy.calendar[zone].value;
    const { m, d } = parseMonthDay(c.sow);
    const autumn = m >= 8;
    const sowOffset0 = offsetOf(k, m, d, autumn);
    const late = parseMonthDay(c.latestSow);
    const lateAutumn = late.m >= 8;
    const latestOffset = offsetOf(k, late.m, late.d, lateAutumn);
    const earliest = prevHarvest + turnaround;
    const delay = Math.max(0, Math.ceil(earliest - sowOffset0));
    const stages: [number, number, number, number] = [...c.stages];
    let shift = delay;
    if (autumn && delay > 0) {
      // Winter crops: harvest is driven by spring temperatures, so compress the early stages.
      const cutIni = Math.min(delay, Math.max(0, stages[0] - minIni));
      stages[0] -= cutIni;
      const cutDev = Math.min(delay - cutIni, Math.max(0, stages[1] - minDev));
      stages[1] -= cutDev;
      shift = delay; // sowing still moves by `delay`; total length shrinks by cutIni + cutDev
    }
    const sowOffset = sowOffset0 + shift;
    const harvestOffset = sowOffset + stages[0] + stages[1] + stages[2] + stages[3];
    const conflict = sowOffset > latestOffset;
    if (conflict) conflictYears.push(k + 1);
    slots.push({ cropId: crops[k], k, sowMonth: m, sowDayOfMonth: d, autumn, delay, stages, sowOffset, harvestOffset, conflict });
    prevHarvest = harvestOffset;
  }
  // Bare days: from each harvest to the next sowing, wrapping to the next 3-year cycle.
  const bareDaysAfter = [0, 0, 0];
  const cropSlots = slots.filter((s): s is SlotSchedule => s !== null);
  if (cropSlots.length === 0) {
    bareDaysAfter[0] = bareDaysAfter[1] = bareDaysAfter[2] = 365;
  } else {
    const cycle = offsetOf(3, 10, 1, true) - 0; // 3 AYs in days (1096 incl. a leap day)
    for (let i = 0; i < cropSlots.length; i++) {
      const cur = cropSlots[i];
      const next = i + 1 < cropSlots.length ? cropSlots[i + 1].sowOffset : cropSlots[0].sowOffset + cycle;
      bareDaysAfter[cur.k] = Math.max(0, next - cur.harvestOffset);
    }
  }
  const total = bareDaysAfter[0] + bareDaysAfter[1] + bareDaysAfter[2];
  return { crops, zone, slots, conflictYears, bareDaysAfter, bareDaysPerYear: total / 3 };
}

export function harvestMonthDay(slot: SlotSchedule): string {
  const start = epochDayOf(REF_AY - 1, 10, 1);
  return monthDayOf(start + slot.harvestOffset);
}
export function sowMonthDay(slot: SlotSchedule): string {
  const start = epochDayOf(REF_AY - 1, 10, 1);
  return monthDayOf(start + slot.sowOffset);
}
