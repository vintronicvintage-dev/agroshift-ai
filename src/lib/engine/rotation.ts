/**
 * Rotation simulation: one 3-year plan over one historical window (exact daily replay with
 * soil water carried across seasons and through fallow/bare periods), and the list of
 * historical windows (every run of 3 consecutive complete agricultural years).
 */
import type { CropId, SoilHydraulics, ClimateZone } from "../types";
import type { PreparedClimate } from "./climate";
import {
  type SimContext, type CropParams, type Fluxes, type SeasonOutcome, type SoilState,
  cropParams, newFluxes, simulateBare, simulateSeason, storage, uniformState, yieldRatio,
} from "./waterBalance";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { type SequenceSchedule, type SlotSchedule, sowEpochDay } from "../crops/calendar";

export interface EngineSetup {
  ctx: SimContext;
  zone: ClimateZone;
  params: Record<CropId, CropParams | null>;
  soil: SoilHydraulics;
}

export function createSetup(clim: PreparedClimate, soil: SoilHydraulics, zone: ClimateZone): EngineSetup {
  const ctx: SimContext = {
    clim,
    tawPerM: soil.tawMmPerM,
    zCol: CROP_CONSTANTS.zColumnM.value,
    zBare: CROP_CONSTANTS.zBareM.value,
    zMin: CROP_CONSTANTS.rootDepthMinM.value,
    rew: soil.rewMm,
    keMax: CROP_CONSTANTS.keMaxBare.value,
    cn: soil.curveNumbers,
  };
  const params = {} as Record<CropId, CropParams | null>;
  for (const id of CROP_IDS) params[id] = CROPS[id].agronomy ? cropParams(CROPS[id], soil.curveNumbers) : null;
  return { ctx, zone, params, soil };
}

export interface ReplayWindow {
  /** Index into clim.ays of rotation year 1. */
  ayIdx: number;
  /** AY of rotation year 1. */
  firstAy: number;
  startIdx: number;
  /** Exclusive end of AY 3 core (1 Oct after rotation year 3). */
  coreEndIdx: number;
  /** Exclusive end of usable data for late harvests. */
  extEndIdx: number;
}

/** Every 3 consecutive complete AYs. Years with unfilled data gaps are excluded (and reported by the caller). */
export function replayWindows(clim: PreparedClimate): ReplayWindow[] {
  const out: ReplayWindow[] = [];
  const a = clim.ays;
  for (let i = 0; i + 2 < a.length; i++) {
    if (a[i + 1].year !== a[i].year + 1 || a[i + 2].year !== a[i].year + 2) continue;
    if (!a[i].coreValid || !a[i + 1].coreValid || !a[i + 2].coreValid || !a[i + 2].extValid) continue;
    out.push({ ayIdx: i, firstAy: a[i].year, startIdx: a[i].startIdx, coreEndIdx: a[i + 2].endIdx + 1, extEndIdx: a[i + 2].extEndIdx + 1 });
  }
  return out;
}

/**
 * Initial plant-available wetness (0–1) at window start from MERRA-2 GWETROOT
 * (fraction of saturation): w = (GWET·θsat − θWP)/(θFC − θWP), clipped.
 * Returns null when GWETROOT is missing (caller uses an assumed 0.5 and reports it).
 */
export function initialWetnessFromGwet(clim: PreparedClimate, soil: SoilHydraulics, idx: number): number | null {
  const g = clim.gwetRoot[idx];
  if (!Number.isFinite(g)) return null;
  const theta = g * soil.thetaSat;
  return Math.min(1, Math.max(0, (theta - soil.thetaWP) / (soil.thetaFC - soil.thetaWP)));
}
export const ASSUMED_INITIAL_WETNESS = 0.5;

export interface SlotIdx { sowIdx: number; harvestIdx: number }

export function slotIndices(clim: PreparedClimate, w: ReplayWindow, slot: SlotSchedule): SlotIdx {
  const sowIdx = sowEpochDay(slot, w.firstAy) - clim.startDay;
  const len = slot.stages[0] + slot.stages[1] + slot.stages[2] + slot.stages[3];
  return { sowIdx, harvestIdx: sowIdx + len };
}

/** Exclusive end index of the window for this plan (late harvests extend past 30 Sep). */
export function windowEnd(clim: PreparedClimate, w: ReplayWindow, schedule: SequenceSchedule): number {
  let end = w.coreEndIdx;
  for (const s of schedule.slots) if (s) end = Math.max(end, slotIndices(clim, w, s).harvestIdx);
  return end;
}

/** True when every day the plan needs in this window has usable data. */
export function windowUsable(clim: PreparedClimate, w: ReplayWindow, schedule: SequenceSchedule): boolean {
  const end = windowEnd(clim, w, schedule);
  if (end > clim.n) return false;
  for (let i = w.coreEndIdx; i < end; i++) if (!clim.valid[i]) return false;
  return true;
}

export interface WindowYear {
  cropId: CropId;
  season: SeasonOutcome | null;
  yieldRatio: number | null;
}

export interface WindowOutcome {
  firstAy: number;
  years: WindowYear[];
  flux: Fluxes;
  storageStart: number;
  storageEnd: number;
  /** P + I − ET − RO − DP − ΔS, mm. */
  massBalanceError: number;
  bareEvap: number;
  initialWetness: number;
  initialWetnessAssumed: boolean;
}

/**
 * Exact daily replay of a scheduled plan over one window.
 * @param budgetNet net irrigation budget per rotation year (mm); 0 = rainfed.
 * @param initialWetness optional override of the starting column wetness (0–1).
 */
export function simulateWindowExact(
  setup: EngineSetup, schedule: SequenceSchedule, w: ReplayWindow, budgetNet: number, initialWetness?: number,
): WindowOutcome {
  const { ctx } = setup;
  const clim = ctx.clim;
  let w0 = initialWetness ?? initialWetnessFromGwet(clim, setup.soil, w.startIdx);
  const assumed = w0 === null || w0 === undefined;
  if (w0 === null || w0 === undefined) w0 = ASSUMED_INITIAL_WETNESS;
  const state: SoilState = uniformState(ctx, w0);
  const s0 = storage(state);
  const flux = newFluxes();
  let cursor = w.startIdx;
  let bareEvap = 0;
  const years: WindowYear[] = [];
  for (let k = 0; k < 3; k++) {
    const slot = schedule.slots[k];
    const cropId = schedule.crops[k];
    if (!slot) { years.push({ cropId, season: null, yieldRatio: null }); continue; }
    const cp = setup.params[cropId] as CropParams;
    let { sowIdx } = slotIndices(clim, w, slot);
    if (sowIdx < cursor) sowIdx = cursor;
    if (sowIdx > cursor) bareEvap += simulateBare(ctx, cursor, sowIdx, state, flux);
    const season = simulateSeason(ctx, cp, sowIdx, slot.stages, state, budgetNet, flux);
    cursor = sowIdx + slot.stages[0] + slot.stages[1] + slot.stages[2] + slot.stages[3];
    years.push({ cropId, season, yieldRatio: yieldRatio(cp.ky, season.eta, season.etc) });
  }
  const end = Math.max(cursor, w.coreEndIdx);
  if (cursor < end) bareEvap += simulateBare(ctx, cursor, end, state, flux);
  const s1 = storage(state);
  const err = flux.precip + flux.irrigation - flux.et - flux.runoff - flux.deepPerc - (s1 - s0);
  return {
    firstAy: w.firstAy, years, flux, storageStart: s0, storageEnd: s1, massBalanceError: err, bareEvap,
    initialWetness: w0, initialWetnessAssumed: assumed,
  };
}
