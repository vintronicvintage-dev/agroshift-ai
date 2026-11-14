/**
 * Rotation simulation: one 3-year plan over one historical window (exact daily replay with
 * soil water carried across seasons and through fallow/bare periods), and the list of
 * historical windows (every run of 3 consecutive complete agricultural years).
 */
import type { CropId, SoilHydraulics, ClimateZone } from "../types";
import type { PreparedClimate } from "./climate";
import {
  type SimContext, type CropParams, type Fluxes, type SeasonOutcome, type SoilState, type MonthlyDiag,
  cropParams, newFluxes, simulateBare, simulateSeason, storage, uniformState, yieldRatio,
} from "./waterBalance";
import { tawCum, tawProfileOf } from "./soil";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { type SequenceSchedule, type SlotSchedule, sowEpochDay } from "../crops/calendar";

export interface EngineSetup {
  ctx: SimContext;
  zone: ClimateZone;
  params: Record<CropId, CropParams | null>;
  soil: SoilHydraulics;
}

export function createSetup(clim: PreparedClimate, soil: SoilHydraulics, zone: ClimateZone): EngineSetup {
  const profile = tawProfileOf(soil);
  const zCol = CROP_CONSTANTS.zColumnM.value;
  const ctx: SimContext = {
    clim,
    tawPerM: soil.tawMmPerM,
    profile,
    tawCol: tawCum(profile, zCol),
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
  /** Engine v2: soil state and day index at the end of the window (input of the next cycle). */
  endState: SoilState;
  endIdx: number;
  /** Engine v2: how the starting state was obtained. */
  start: "chained" | "spinup" | "given";
  /** Engine v2: steady-state iterations used for a spin-up start (0 otherwise). */
  spinupIterations: number;
}

export interface WindowStart {
  state: SoilState;
  /** Day index where the simulation starts (≥ window start; > when the previous cycle's last harvest spilled over). */
  cursor: number;
}

/**
 * Exact daily replay of a scheduled plan over one window.
 * @param budgetNet net irrigation budget per rotation year (mm); 0 = rainfed.
 * @param initialWetness optional override of the starting column wetness (0–1), uniform profile.
 * @param start optional explicit starting state (engine v2 chaining); overrides `initialWetness`.
 */
export function simulateWindowExact(
  setup: EngineSetup, schedule: SequenceSchedule, w: ReplayWindow, budgetNet: number, initialWetness?: number,
  start?: WindowStart | null, diag?: MonthlyDiag | null,
): WindowOutcome {
  const { ctx } = setup;
  const clim = ctx.clim;
  let w0 = initialWetness ?? initialWetnessFromGwet(clim, setup.soil, w.startIdx);
  const assumed = w0 === null || w0 === undefined;
  if (w0 === null || w0 === undefined) w0 = ASSUMED_INITIAL_WETNESS;
  const state: SoilState = start ? { ...start.state } : uniformState(ctx, w0);
  const s0 = storage(state);
  const flux = newFluxes(diag);
  let cursor = start ? Math.max(w.startIdx, start.cursor) : w.startIdx;
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
    initialWetness: w0, initialWetnessAssumed: assumed && !start,
    endState: { ...state }, endIdx: end, start: start ? "given" : "given", spinupIterations: 0,
  };
}

/** Steady-state spin-up: tolerance on the column storage change between iterations, mm. */
export const SPINUP_TOL_MM = 0.5;
export const SPINUP_MAX_ITER = 6;

/**
 * Engine v2 — the plan as a REPEATING cycle over the record.
 *
 * Windows are processed in three phase chains (start years y, y+3, y+6 …). A window whose
 * predecessor (start year − 3) was simulated starts from that predecessor's final soil state and
 * day index, so water left by year 3 of one cycle is the real input of year 1 of the next. A window
 * without a usable predecessor (the first of each chain, or after a data gap) starts from the
 * periodic steady state of the plan in that window: start from the GWETROOT-based wetness, simulate,
 * restart from the end state, until storage changes by < SPINUP_TOL_MM (max SPINUP_MAX_ITER).
 *
 * @returns outcomes aligned with `windows` (null where the window is unusable for this plan).
 */
export function simulatePlanChain(
  setup: EngineSetup, schedule: SequenceSchedule, windows: readonly ReplayWindow[], budgetNet: number,
  w0: readonly number[], diag?: MonthlyDiag[] | null,
): (WindowOutcome | null)[] {
  const clim = setup.ctx.clim;
  const out: (WindowOutcome | null)[] = new Array(windows.length).fill(null);
  const byAy = new Map<number, number>();
  windows.forEach((w, i) => byAy.set(w.firstAy, i));
  const order = windows.map((_, i) => i).sort((a, b) => windows[a].firstAy - windows[b].firstAy);
  for (const i of order) {
    const w = windows[i];
    if (!windowUsable(clim, w, schedule)) continue;
    const pi = byAy.get(w.firstAy - 3);
    const pred = pi === undefined ? null : out[pi];
    const dg = diag ? diag[i] : null;
    if (pred && pred.endIdx >= w.startIdx && pred.endIdx - w.startIdx < 200) {
      const o = simulateWindowExact(setup, schedule, w, budgetNet, w0[i], { state: pred.endState, cursor: pred.endIdx }, dg);
      o.start = "chained";
      out[i] = o;
      continue;
    }
    // Periodic steady state (spin-up).
    let st: WindowStart | null = null;
    let o = simulateWindowExact(setup, schedule, w, budgetNet, w0[i]);
    let it = 1;
    for (; it < SPINUP_MAX_ITER; it++) {
      const prevEnd = o.storageEnd;
      st = { state: o.endState, cursor: w.startIdx + Math.max(0, o.endIdx - w.coreEndIdx) };
      o = simulateWindowExact(setup, schedule, w, budgetNet, w0[i], st);
      if (Math.abs(o.storageEnd - prevEnd) < SPINUP_TOL_MM) break;
    }
    if (dg) o = simulateWindowExact(setup, schedule, w, budgetNet, w0[i], st, dg);
    o.start = "spinup";
    o.spinupIterations = it;
    o.initialWetnessAssumed = initialWetnessFromGwet(clim, setup.soil, w.startIdx) === null;
    out[i] = o;
  }
  return out;
}
