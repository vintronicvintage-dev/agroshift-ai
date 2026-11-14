/**
 * Cheap screening pass for the optimiser.
 *
 * The exact replay carries a two-bucket soil state day by day. For screening all n³ sequences
 * we cut each window into pieces (crop seasons and bare periods) and cache each piece as a
 * function of the column wetness at its start, sampled at 11 levels (0, 0.1 … 1) and linearly
 * interpolated. At every piece boundary the state is collapsed to a uniform profile with the
 * same total water. Pieces are shared by every sequence that uses the same crop in the same
 * season, so the full n³ × windows search costs a few hundred thousand cache look-ups.
 * Only the shortlist is then replayed exactly; the result says so.
 */
import type { CropId } from "../types";
import type { EngineSetup, ReplayWindow } from "./rotation";
import { slotIndices } from "./rotation";
import type { SequenceSchedule } from "../crops/calendar";
import { newFluxes, simulateBare, simulateSeason, uniformState, type CropParams } from "./waterBalance";
import { CROP_IDS } from "../crops/database";

const LEVELS = 10; // 11 sample points

// Crop-piece vector layout
const C_ETC = 0, C_ETA = 1, C_IRR = 2, C_LIM = 3, C_FROST = 4, C_HEAT = 5, C_W = 6, C_LEN = 7;

export interface ScreenYear {
  cropId: CropId;
  etc: number; eta: number; irrigation: number; shortfall: number; frostDays: number; heatDays: number;
}

export interface ScreenWindow {
  years: (ScreenYear | null)[];
  /** Engine v2: relative column wetness and day index at the end of the window (chaining). */
  wEnd: number;
  endIdx: number;
}

export class Screener {
  private cropCache = new Map<number, Float64Array>();
  private bareCache = new Map<number, number>();
  private cropIndex: Record<CropId, number>;
  pieceSimulations = 0;

  constructor(private setup: EngineSetup) {
    this.cropIndex = Object.fromEntries(CROP_IDS.map((c, i) => [c, i])) as Record<CropId, number>;
  }

  private colCapacity(): number {
    return this.setup.ctx.tawCol;
  }

  private cropPieceAt(cropId: CropId, sowIdx: number, stages: readonly number[], budget: number, mode: number, level: number): Float64Array {
    const len = stages[0] + stages[1] + stages[2] + stages[3];
    const key = ((((this.cropIndex[cropId] * 16384 + sowIdx) * 1024 + len) * 2 + mode) * 16) + level;
    let v = this.cropCache.get(key);
    if (v) return v;
    const ctx = this.setup.ctx;
    const st = uniformState(ctx, level / LEVELS);
    const flux = newFluxes();
    const o = simulateSeason(ctx, this.setup.params[cropId] as CropParams, sowIdx, stages, st, budget, flux);
    v = new Float64Array(C_LEN);
    v[C_ETC] = o.etc; v[C_ETA] = o.eta; v[C_IRR] = o.irrigation; v[C_LIM] = o.shortfall;
    v[C_FROST] = o.frostDays + o.winterKillDays; v[C_HEAT] = o.heatDays;
    v[C_W] = (st.wTop + st.wSub) / this.colCapacity();
    this.cropCache.set(key, v);
    this.pieceSimulations++;
    return v;
  }

  private barePieceAt(start: number, end: number, level: number): number {
    const key = (start * 16384 + end) * 16 + level;
    const hit = this.bareCache.get(key);
    if (hit !== undefined) return hit;
    const ctx = this.setup.ctx;
    const st = uniformState(ctx, level / LEVELS);
    simulateBare(ctx, start, end, st, newFluxes());
    const w = (st.wTop + st.wSub) / this.colCapacity();
    this.bareCache.set(key, w);
    this.pieceSimulations++;
    return w;
  }

  private bare(start: number, end: number, w: number): number {
    if (end <= start) return w;
    const x = Math.min(1, Math.max(0, w)) * LEVELS;
    const i = Math.min(LEVELS - 1, Math.floor(x));
    const f = x - i;
    const a = this.barePieceAt(start, end, i);
    if (f === 0) return a;
    return a + f * (this.barePieceAt(start, end, i + 1) - a);
  }

  private crop(cropId: CropId, sowIdx: number, stages: readonly number[], budget: number, mode: number, w: number, out: Float64Array): void {
    const x = Math.min(1, Math.max(0, w)) * LEVELS;
    const i = Math.min(LEVELS - 1, Math.floor(x));
    const f = x - i;
    const a = this.cropPieceAt(cropId, sowIdx, stages, budget, mode, i);
    if (f === 0) { out.set(a); return; }
    const b = this.cropPieceAt(cropId, sowIdx, stages, budget, mode, i + 1);
    for (let j = 0; j < C_LEN; j++) out[j] = a[j] + f * (b[j] - a[j]);
  }

  /**
   * Screen one scheduled plan over one window.
   * @param mode 0 = with budget, 1 = rainfed shadow run.
   */
  screenWindow(schedule: SequenceSchedule, win: ReplayWindow, w0: number, budget: number, mode: 0 | 1, startCursor?: number): ScreenWindow {
    const clim = this.setup.ctx.clim;
    const buf = new Float64Array(C_LEN);
    let w = w0;
    let cursor = startCursor !== undefined ? Math.max(win.startIdx, startCursor) : win.startIdx;
    const years: (ScreenYear | null)[] = [];
    for (let k = 0; k < 3; k++) {
      const slot = schedule.slots[k];
      if (!slot) { years.push(null); continue; }
      let { sowIdx } = slotIndices(clim, win, slot);
      if (sowIdx < cursor) sowIdx = cursor;
      w = this.bare(cursor, sowIdx, w);
      this.crop(slot.cropId, sowIdx, slot.stages, mode === 1 ? 0 : budget, mode, w, buf);
      years.push({
        cropId: slot.cropId, etc: buf[C_ETC], eta: buf[C_ETA], irrigation: buf[C_IRR],
        shortfall: buf[C_LIM], frostDays: buf[C_FROST], heatDays: buf[C_HEAT],
      });
      w = buf[C_W];
      cursor = sowIdx + slot.stages[0] + slot.stages[1] + slot.stages[2] + slot.stages[3];
    }
    const end = Math.max(cursor, win.coreEndIdx);
    w = this.bare(cursor, end, w);
    return { years, wEnd: w, endIdx: end };
  }

  /**
   * Engine v2: screen a plan over all windows as a repeating cycle (same chaining rule as
   * `simulatePlanChain`; spin-up windows iterate the cached piece model to a fixed point).
   */
  screenChain(schedule: SequenceSchedule, windows: readonly ReplayWindow[], usable: readonly boolean[], w0: readonly number[], budget: number, mode: 0 | 1): (ScreenWindow | null)[] {
    const out: (ScreenWindow | null)[] = new Array(windows.length).fill(null);
    const byAy = new Map<number, number>();
    windows.forEach((w, i) => byAy.set(w.firstAy, i));
    const order = windows.map((_, i) => i).sort((a, b) => windows[a].firstAy - windows[b].firstAy);
    for (const i of order) {
      if (!usable[i]) continue;
      const win = windows[i];
      const pi = byAy.get(win.firstAy - 3);
      const pred = pi === undefined ? null : out[pi];
      if (pred && pred.endIdx >= win.startIdx && pred.endIdx - win.startIdx < 200) {
        out[i] = this.screenWindow(schedule, win, pred.wEnd, budget, mode, pred.endIdx);
        continue;
      }
      let r = this.screenWindow(schedule, win, w0[i], budget, mode);
      for (let it = 1; it < 6; it++) {
        const cur = win.startIdx + Math.max(0, r.endIdx - win.coreEndIdx);
        const n = this.screenWindow(schedule, win, r.wEnd, budget, mode, cur);
        const done = Math.abs(n.wEnd - r.wEnd) * this.colCapacity() < 0.5;
        r = n;
        if (done) break;
      }
      out[i] = r;
    }
    return out;
  }
}
