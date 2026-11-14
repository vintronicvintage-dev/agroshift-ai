/**
 * Turns window simulations (exact or screening) into plan metrics: water, yield, scenario
 * economics, risk. Pure functions.
 *
 * Engine v2:
 * - Every plan is replayed as a REPEATING cycle (`simulatePlanChain` / `Screener.screenChain`).
 * - Simulation results are kept "raw" (water only); yields and margins are derived from them by
 *   `summarizeRaw`, so economic sweeps (prices, costs, yields) never re-simulate.
 * - Yield: Ya = Ym · (1 − Ky(1 − ETa/ETc)) · preCropFactor, with
 *     Ym = Yrainfed-ceiling + (Yirrigated − Yrainfed-ceiling) · s,
 *     s = min(1, Σ irrigation / (0.5 · Σ rainfed deficit)) of this rotation slot over all windows
 *     (0 = rainfed management, 1 = irrigated management; covering half the deficit already counts),
 *   and for small-grain cereals the French & Schultz (1984) water-productivity bound
 *     Ya ≤ 20 kg/ha/mm · (seasonal ETa − 110 mm).
 * - Previous-crop N credit lowers the following crop's variable cost (N price × credit).
 */
import type { CropId, RiskResult, WaterResult, YearResult, Dist } from "../types";
import { CROPS, CROP_IDS, CROP_CONSTANTS } from "../crops/database";
import { preCropEffect, previousCrops, N_NEED_KG_HA, ROTATION_GROUP } from "../crops/preCrop";
import type { EngineSetup, ReplayWindow } from "./rotation";
import { initialWetnessFromGwet, ASSUMED_INITIAL_WETNESS, simulatePlanChain, windowUsable } from "./rotation";
import type { SequenceSchedule } from "../crops/calendar";
import type { Screener } from "./screening";
import { yieldRatio, type MonthlyDiag } from "./waterBalance";
import { dist } from "./stats";

/** Visible risk weights (sum 1). */
export const RISK_WEIGHTS = { budgetExceeded: 0.35, lowYield: 0.25, climateStress: 0.2, marginDownside: 0.2 } as const;
/** A crop-year counts as climate-stressed with ≥ 1 frost/winter-kill day or ≥ 5 heat days (assumption). */
export const STRESS_HEAT_DAYS = 5;
/** Yield ratio below which a crop-year counts as a poor year. */
export const LOW_YIELD_RATIO = 0.5;
/** Margin downside is scaled by max(|P50|, this) TL/da. */
export const MARGIN_SCALE_TL = 1000;
/** A year counts as "budget exceeded" when the deficit accrued after the budget ran out is ≥ this (mm). */
export const BUDGET_SHORTFALL_MM = 10;

export interface CropEconomics {
  priceTLPerKg: number; varCostTLPerDa: number;
  /** Irrigated (water- and input-unlimited) reference yield, t/ha. */
  ymTHa: number;
  /** Rainfed-management ceiling, t/ha (engine v2). */
  ymRainfedTHa: number;
}

export interface EvalContext {
  setup: EngineSetup;
  windows: ReplayWindow[];
  /** Initial column wetness per window (from GWETROOT or assumed) — spin-up seed only in v2. */
  w0: number[];
  w0Assumed: boolean[];
  budgetNet: number;
  efficiency: number;
  waterPriceTLPerM3: number;
  priceMultiplier: number;
  econ: Record<CropId, CropEconomics>;
  nPriceTLPerKgN: number;
}

export type EconOverrides = Partial<Record<CropId, { priceTLPerKg?: number; varCostTLPerDa?: number; refYieldIrrigatedTHa?: number; refYieldRainfedCeilingTHa?: number }>>;

export function cropEconomics(overrides: EconOverrides = {}): Record<CropId, CropEconomics> {
  const econ = {} as Record<CropId, CropEconomics>;
  for (const id of CROP_IDS) {
    const o = overrides[id] ?? {};
    const c = CROPS[id];
    const ymTHa = o.refYieldIrrigatedTHa ?? c.refYieldTHa.value.irrigated;
    const rf = o.refYieldRainfedCeilingTHa ?? c.rainfedCeilingTHa?.value ?? c.refYieldTHa.value.irrigated;
    econ[id] = {
      priceTLPerKg: o.priceTLPerKg ?? c.priceTLPerKg.value,
      varCostTLPerDa: o.varCostTLPerDa ?? c.varCostTLPerDa.value,
      ymTHa, ymRainfedTHa: Math.min(ymTHa, rf),
    };
  }
  return econ;
}

export function buildEvalContext(
  setup: EngineSetup, windows: ReplayWindow[], budgetNet: number, efficiency: number,
  waterPriceTLPerM3: number, priceMultiplier: number, overrides: EconOverrides = {},
): EvalContext {
  const w0: number[] = [], w0Assumed: boolean[] = [];
  for (const w of windows) {
    const g = initialWetnessFromGwet(setup.ctx.clim, setup.soil, w.startIdx);
    w0.push(g ?? ASSUMED_INITIAL_WETNESS);
    w0Assumed.push(g === null);
  }
  return {
    setup, windows, w0, w0Assumed, budgetNet, efficiency, waterPriceTLPerM3, priceMultiplier,
    econ: cropEconomics(overrides), nPriceTLPerKgN: CROP_CONSTANTS.nPriceTLPerKgN.value,
  };
}

/**
 * Gross margin TL/da for one crop-year (scenario). yield t/ha × 100 = kg/da; 1 mm net = 1 m³/da net.
 * Without `opts` the irrigated Ym is used (v1 behaviour, kept for callers and tests).
 */
export function grossMargin(
  ev: EvalContext, cropId: CropId, ratio: number | null, irrigationNetMm: number,
  opts?: { ymTHa?: number; yieldTHa?: number; nSavingTLPerDa?: number; costFactor?: number; econ?: Record<CropId, CropEconomics>; priceMultiplier?: number },
): { margin: number; yieldTHa: number } {
  const e = (opts?.econ ?? ev.econ)[cropId];
  const ym = opts?.ymTHa ?? e.ymTHa;
  const yieldTHa = opts?.yieldTHa ?? (ratio === null ? 0 : ym * ratio);
  const revenue = yieldTHa * 100 * e.priceTLPerKg * (opts?.priceMultiplier ?? ev.priceMultiplier);
  const water = (irrigationNetMm / Math.max(0.05, ev.efficiency)) * ev.waterPriceTLPerM3;
  const cost = e.varCostTLPerDa * (opts?.costFactor ?? 1) - (opts?.nSavingTLPerDa ?? 0);
  return { margin: revenue - cost - water, yieldTHa };
}

/** Water-only outcome of one crop-year. */
export interface RawYear {
  etc: number; eta: number; irrigation: number; shortfall: number;
  /** ETc − ETa of the same year in the rainfed shadow run. */
  rfDeficit: number;
  frost: number; wk: number; heat: number; aw: number;
}
export interface RawWindow {
  firstAy: number;
  years: (RawYear | null)[];
  /** Σ (ETc − ETa) of the rainfed shadow run, mm (3 years). */
  rainfedDeficit: number;
  deepPerc: number; runoff: number; massErr: number; yearsLen: number;
  start: "chained" | "spinup" | "given" | "screening";
}

/** Per-window summary common to exact and screening evaluation. */
export interface WindowSummary {
  firstAy: number;
  requirement: number; // mm/yr
  irrigation: number;  // mm/yr net
  unmet: number;       // mm/yr
  exceeded: boolean[]; // per rotation year
  ratios: (number | null)[];
  yields: number[];
  irrYear: number[];
  unmetYear: number[];
  margins: number[];
  marginMean: number;
  lowYield: boolean;
  stressedCropYears: number;
  cropYears: number;
  wpCapped: boolean[];
  // exact-only extras (NaN in screening)
  frost: number[]; winterKill: number[]; heat: number[]; awAtSow: number[];
  deepPerc: number; runoff: number; massErr: number; years: number;
}

/** Plan-level yield parameters per rotation slot (derived over all windows). */
export interface SlotYield {
  cropId: CropId;
  prev: CropId;
  intensity: number | null;
  ymTHa: number | null;
  preCropFactor: number;
  nCreditKgHa: { low: number; high: number };
  nSavingTLPerDa: number;
  wpBound: boolean;
  /** Variable-cost multiplier from management intensity (rainfed share … 1). */
  costFactor: number;
}

const RF_COST = CROP_CONSTANTS.rainfedCostShare.value;
const IRR_SHARE = CROP_CONSTANTS.irrigatedManagementShare.value;
const SMALL_GRAIN = (id: CropId) => ROTATION_GROUP[id] === "small_grain";

/** Irrigation intensity and Ym per slot from raw windows. */
export function slotYields(ev: EvalContext, crops: readonly CropId[], raws: readonly RawWindow[], econ: Record<CropId, CropEconomics> = ev.econ): SlotYield[] {
  const prevs = previousCrops(crops);
  return [0, 1, 2].map((k) => {
    const id = crops[k];
    const eff = preCropEffect(prevs[k], id);
    const nMid = (eff.nCreditKgHa.low + eff.nCreditKgHa.high) / 2;
    const nSaving = (Math.min(nMid, N_NEED_KG_HA[id]) * ev.nPriceTLPerKgN) / 10;
    if (!CROPS[id].agronomy) {
      return { cropId: id, prev: prevs[k], intensity: null, ymTHa: null, preCropFactor: 1, nCreditKgHa: eff.nCreditKgHa, nSavingTLPerDa: 0, wpBound: false, costFactor: 1 };
    }
    let irr = 0, def = 0;
    for (const r of raws) { const y = r.years[k]; if (y) { irr += y.irrigation; def += y.rfDeficit; } }
    const s = ev.budgetNet <= 0 ? 0 : def > 1 ? Math.min(1, irr / (IRR_SHARE * def)) : 1;
    const e = econ[id];
    return {
      cropId: id, prev: prevs[k], intensity: s, ymTHa: e.ymRainfedTHa + (e.ymTHa - e.ymRainfedTHa) * s,
      preCropFactor: eff.yieldFactor, nCreditKgHa: eff.nCreditKgHa, nSavingTLPerDa: nSaving, wpBound: SMALL_GRAIN(id),
      costFactor: RF_COST + (1 - RF_COST) * s,
    };
  });
}

/**
 * Derive yields, margins and flags from raw windows.
 * @param econ / priceMultiplier optional overrides for sensitivity sweeps (no re-simulation).
 */
export function summarizeRaw(
  ev: EvalContext, crops: readonly CropId[], raws: readonly RawWindow[],
  econ: Record<CropId, CropEconomics> = ev.econ, priceMultiplier = ev.priceMultiplier,
): { windows: WindowSummary[]; slots: SlotYield[] } {
  const slots = slotYields(ev, crops, raws, econ);
  const te = CROP_CONSTANTS.wpTranspirationEfficiencyKgHaMm.value, e0 = CROP_CONSTANTS.wpEvaporationMm.value;
  const windows = raws.map((raw) => {
    const s: WindowSummary = {
      firstAy: raw.firstAy,
      requirement: raw.rainfedDeficit / 3, irrigation: 0, unmet: 0, exceeded: [false, false, false], ratios: [null, null, null],
      yields: [0, 0, 0], irrYear: [0, 0, 0], unmetYear: [0, 0, 0], margins: [0, 0, 0], marginMean: 0, lowYield: false,
      stressedCropYears: 0, cropYears: 0, wpCapped: [false, false, false],
      frost: [NaN, NaN, NaN], winterKill: [NaN, NaN, NaN], heat: [NaN, NaN, NaN], awAtSow: [NaN, NaN, NaN],
      deepPerc: raw.deepPerc, runoff: raw.runoff, massErr: raw.massErr, years: raw.yearsLen,
    };
    for (let k = 0; k < 3; k++) {
      const se = raw.years[k];
      const id = crops[k];
      const sl = slots[k];
      if (!se) {
        s.margins[k] = grossMargin(ev, id, null, 0, { econ, priceMultiplier }).margin;
        continue;
      }
      const ky = CROPS[id].agronomy!.ky.value;
      const r = yieldRatio(ky, se.eta, se.etc);
      let y = (sl.ymTHa ?? 0) * r * sl.preCropFactor;
      if (sl.wpBound) {
        const cap = (te * Math.max(0, se.eta - e0)) / 1000;
        if (y > cap) { y = cap; s.wpCapped[k] = true; }
      }
      const g = grossMargin(ev, id, r, se.irrigation, { yieldTHa: y, nSavingTLPerDa: sl.nSavingTLPerDa, costFactor: sl.costFactor, econ, priceMultiplier });
      s.ratios[k] = r; s.yields[k] = y; s.margins[k] = g.margin;
      s.irrYear[k] = se.irrigation; s.unmetYear[k] = se.etc - se.eta;
      s.irrigation += se.irrigation / 3;
      s.unmet += (se.etc - se.eta) / 3;
      // Rainfed (budget 0): there is no budget to exceed; the deficit is reported as unmet demand only.
      s.exceeded[k] = ev.budgetNet > 0 && se.shortfall >= BUDGET_SHORTFALL_MM;
      if (r < LOW_YIELD_RATIO) s.lowYield = true;
      s.cropYears++;
      if (se.frost + se.wk >= 1 || se.heat >= STRESS_HEAT_DAYS) s.stressedCropYears++;
      s.frost[k] = se.frost; s.winterKill[k] = se.wk; s.heat[k] = se.heat; s.awAtSow[k] = se.aw;
    }
    s.marginMean = (s.margins[0] + s.margins[1] + s.margins[2]) / 3;
    return s;
  });
  return { windows, slots };
}

function usableFlags(ev: EvalContext, schedule: SequenceSchedule): boolean[] {
  const clim = ev.setup.ctx.clim;
  return ev.windows.map((w) => windowUsable(clim, w, schedule));
}

/** Exact repeating-cycle replay over every usable window (water only). */
export function evaluateExactRaw(ev: EvalContext, schedule: SequenceSchedule, diag?: MonthlyDiag[] | null): RawWindow[] {
  const main = simulatePlanChain(ev.setup, schedule, ev.windows, ev.budgetNet, ev.w0, diag);
  const rf = ev.budgetNet > 0 ? simulatePlanChain(ev.setup, schedule, ev.windows, 0, ev.w0) : main;
  const out: RawWindow[] = [];
  main.forEach((o, i) => {
    const r = rf[i];
    if (!o || !r) return;
    const w = ev.windows[i];
    let def = 0;
    const years = o.years.map((y, k) => {
      const rs = r.years[k].season;
      const rfd = rs ? rs.etc - rs.eta : 0;
      def += rfd;
      const se = y.season;
      return se ? {
        etc: se.etc, eta: se.eta, irrigation: se.irrigation, shortfall: se.shortfall, rfDeficit: rfd,
        frost: se.frostDays, wk: se.winterKillDays, heat: se.heatDays, aw: se.awAtSow,
      } : null;
    });
    const days = Math.max(o.endIdx, w.coreEndIdx) - w.startIdx;
    out.push({
      firstAy: w.firstAy, years, rainfedDeficit: def,
      deepPerc: o.flux.deepPerc, runoff: o.flux.runoff, massErr: o.massBalanceError,
      yearsLen: Math.max(1, days) / 365.25, start: o.start,
    });
  });
  return out;
}

/** Screening (cached pieces, repeating cycle) over every usable window (water only). */
export function evaluateScreeningRaw(ev: EvalContext, screener: Screener, schedule: SequenceSchedule): RawWindow[] {
  const usable = usableFlags(ev, schedule);
  const a = screener.screenChain(schedule, ev.windows, usable, ev.w0, ev.budgetNet, 0);
  const rf = ev.budgetNet > 0 ? screener.screenChain(schedule, ev.windows, usable, ev.w0, 0, 1) : a;
  const out: RawWindow[] = [];
  a.forEach((sw, i) => {
    const r = rf[i];
    if (!sw || !r) return;
    let def = 0;
    const years = sw.years.map((y, k) => {
      const ry = r.years[k];
      const rfd = ry ? ry.etc - ry.eta : 0;
      def += rfd;
      return y ? { etc: y.etc, eta: y.eta, irrigation: y.irrigation, shortfall: y.shortfall, rfDeficit: rfd, frost: y.frostDays, wk: 0, heat: y.heatDays, aw: NaN } : null;
    });
    out.push({ firstAy: ev.windows[i].firstAy, years, rainfedDeficit: def, deepPerc: NaN, runoff: NaN, massErr: NaN, yearsLen: 3, start: "screening" });
  });
  return out;
}

/** Exact replay → window summaries (v1-compatible entry point). */
export function evaluateExact(ev: EvalContext, schedule: SequenceSchedule): WindowSummary[] {
  return summarizeRaw(ev, schedule.crops, evaluateExactRaw(ev, schedule)).windows;
}

/** Screening pass → window summaries (v1-compatible entry point). */
export function evaluateScreening(ev: EvalContext, screener: Screener, schedule: SequenceSchedule): WindowSummary[] {
  return summarizeRaw(ev, schedule.crops, evaluateScreeningRaw(ev, screener, schedule)).windows;
}

export interface PlanMetrics {
  windows: number;
  requirementP50: number;
  marginP50: number;
  marginP10: number;
  risk: RiskResult;
}

export function planMetrics(ws: WindowSummary[]): PlanMetrics | null {
  if (ws.length === 0) return null;
  const req = dist(ws.map((w) => w.requirement))!;
  const mar = dist(ws.map((w) => w.marginMean))!;
  const exceed = ws.filter((w) => w.exceeded.some(Boolean)).length / ws.length;
  const low = ws.filter((w) => w.lowYield).length / ws.length;
  const cy = ws.reduce((s, w) => s + w.cropYears, 0);
  const stressed = ws.reduce((s, w) => s + w.stressedCropYears, 0);
  const climateStress = cy ? stressed / cy : 0;
  const downside = Math.min(1, Math.max(0, (mar.p50 - mar.p10) / Math.max(Math.abs(mar.p50), MARGIN_SCALE_TL)));
  const components = { budgetExceeded: exceed, lowYield: low, climateStress, marginDownside: downside };
  const score = RISK_WEIGHTS.budgetExceeded * exceed + RISK_WEIGHTS.lowYield * low +
    RISK_WEIGHTS.climateStress * climateStress + RISK_WEIGHTS.marginDownside * downside;
  return {
    windows: ws.length, requirementP50: req.p50, marginP50: mar.p50, marginP10: mar.p10,
    risk: { score, components, weights: { ...RISK_WEIGHTS } },
  };
}

export function waterResult(ws: WindowSummary[], efficiency: number, areaDa: number): WaterResult {
  if (ws.length === 0) {
    return {
      requirementMmPerYr: null, irrigationNetMmPerYr: null, irrigationGrossM3PerDaPerYr: null,
      unmetDeficitMmPerYr: null, unmetDeficitFieldM3PerYr: null, budgetExceededShare: null,
      budgetExceededShareByYear: [null, null, null], deepPercolationMmPerYr: null, runoffMmPerYr: null, massBalanceMaxErrorMm: null,
    };
  }
  const by = (k: number) => ws.filter((w) => w.exceeded[k]).length / ws.length;
  return {
    requirementMmPerYr: dist(ws.map((w) => w.requirement)),
    irrigationNetMmPerYr: dist(ws.map((w) => w.irrigation)),
    irrigationGrossM3PerDaPerYr: dist(ws.map((w) => w.irrigation / Math.max(0.05, efficiency))),
    unmetDeficitMmPerYr: dist(ws.map((w) => w.unmet)),
    unmetDeficitFieldM3PerYr: dist(ws.map((w) => w.unmet * areaDa)),
    budgetExceededShare: ws.filter((w) => w.exceeded.some(Boolean)).length / ws.length,
    budgetExceededShareByYear: [by(0), by(1), by(2)],
    deepPercolationMmPerYr: dist(ws.map((w) => w.deepPerc / w.years)),
    runoffMmPerYr: dist(ws.map((w) => w.runoff / w.years)),
    massBalanceMaxErrorMm: ws.reduce((m, w) => Math.max(m, Math.abs(w.massErr)), 0),
  };
}

export function yearResults(ws: WindowSummary[], crops: readonly CropId[], slots?: SlotYield[]): YearResult[] {
  const meanOrNull = (v: number[]) => { const f = v.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null; };
  return [0, 1, 2].map((k) => {
    const fallow = !CROPS[crops[k]].agronomy;
    const d = (f: (w: WindowSummary) => number | null): Dist | null =>
      ws.length && !fallow ? dist(ws.map(f).filter((x): x is number => x !== null)) : null;
    const sl = slots?.[k];
    return {
      year: k + 1,
      cropId: crops[k],
      yieldRatio: d((w) => w.ratios[k]),
      yieldTHa: d((w) => w.yields[k]),
      irrigationNetMm: d((w) => w.irrYear[k]),
      unmetDeficitMm: d((w) => w.unmetYear[k]),
      budgetExceededShare: ws.length && !fallow ? ws.filter((w) => w.exceeded[k]).length / ws.length : null,
      frostDaysMean: fallow ? null : meanOrNull(ws.map((w) => w.frost[k])),
      winterKillDaysMean: fallow ? null : meanOrNull(ws.map((w) => w.winterKill[k])),
      heatDaysMean: fallow ? null : meanOrNull(ws.map((w) => w.heat[k])),
      soilWaterAtSowingMm: d((w) => (Number.isFinite(w.awAtSow[k]) ? w.awAtSow[k] : null)),
      grossMarginTLPerDa: ws.length ? dist(ws.map((w) => w.margins[k])) : null,
      ...(sl ? {
        ymTHa: sl.ymTHa, irrigationIntensity: sl.intensity, preCropFactor: fallow ? null : sl.preCropFactor,
        wpCapShare: fallow || !ws.length ? null : ws.filter((w) => w.wpCapped[k]).length / ws.length,
      } : {}),
    };
  });
}
