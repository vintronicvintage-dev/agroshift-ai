/**
 * Turns window simulations (exact or screening) into plan metrics: water, yield, scenario
 * economics, risk. Pure functions.
 */
import type { CropId, RiskResult, WaterResult, YearResult, Dist } from "../types";
import { CROPS, CROP_IDS } from "../crops/database";
import type { EngineSetup, ReplayWindow } from "./rotation";
import { simulateWindowExact, windowUsable, initialWetnessFromGwet, ASSUMED_INITIAL_WETNESS } from "./rotation";
import type { SequenceSchedule } from "../crops/calendar";
import type { Screener } from "./screening";
import { yieldRatio } from "./waterBalance";
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

export interface CropEconomics { priceTLPerKg: number; varCostTLPerDa: number; ymTHa: number }

export interface EvalContext {
  setup: EngineSetup;
  windows: ReplayWindow[];
  /** Initial column wetness per window (from GWETROOT or assumed). */
  w0: number[];
  w0Assumed: boolean[];
  budgetNet: number;
  efficiency: number;
  waterPriceTLPerM3: number;
  priceMultiplier: number;
  econ: Record<CropId, CropEconomics>;
}

export function buildEvalContext(
  setup: EngineSetup, windows: ReplayWindow[], budgetNet: number, efficiency: number,
  waterPriceTLPerM3: number, priceMultiplier: number,
  overrides: Partial<Record<CropId, { priceTLPerKg?: number; varCostTLPerDa?: number; refYieldIrrigatedTHa?: number }>> = {},
): EvalContext {
  const w0: number[] = [], w0Assumed: boolean[] = [];
  for (const w of windows) {
    const g = initialWetnessFromGwet(setup.ctx.clim, setup.soil, w.startIdx);
    w0.push(g ?? ASSUMED_INITIAL_WETNESS);
    w0Assumed.push(g === null);
  }
  const econ = {} as Record<CropId, CropEconomics>;
  for (const id of CROP_IDS) {
    const o = overrides[id] ?? {};
    econ[id] = {
      priceTLPerKg: o.priceTLPerKg ?? CROPS[id].priceTLPerKg.value,
      varCostTLPerDa: o.varCostTLPerDa ?? CROPS[id].varCostTLPerDa.value,
      ymTHa: o.refYieldIrrigatedTHa ?? CROPS[id].refYieldTHa.value.irrigated,
    };
  }
  return { setup, windows, w0, w0Assumed, budgetNet, efficiency, waterPriceTLPerM3, priceMultiplier, econ };
}

/** Gross margin TL/da for one crop-year (scenario). yield t/ha × 100 = kg/da; 1 mm net = 1 m³/da net. */
export function grossMargin(ev: EvalContext, cropId: CropId, ratio: number | null, irrigationNetMm: number): { margin: number; yieldTHa: number } {
  const e = ev.econ[cropId];
  const yieldTHa = ratio === null ? 0 : e.ymTHa * ratio;
  const revenue = yieldTHa * 100 * e.priceTLPerKg * ev.priceMultiplier;
  const water = (irrigationNetMm / Math.max(0.05, ev.efficiency)) * ev.waterPriceTLPerM3;
  return { margin: revenue - e.varCostTLPerDa - water, yieldTHa };
}

/** Per-window summary common to exact and screening evaluation. */
export interface WindowSummary {
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
  // exact-only extras (NaN in screening)
  frost: number[]; winterKill: number[]; heat: number[]; awAtSow: number[];
  deepPerc: number; runoff: number; massErr: number; years: number;
}

function summarize(
  ev: EvalContext, crops: readonly CropId[],
  seasons: ({ etc: number; eta: number; irrigation: number; shortfall: number; frost: number; wk: number; heat: number; aw: number } | null)[],
  rainfedDeficit: number, extras?: { deepPerc: number; runoff: number; massErr: number; years: number },
): WindowSummary {
  const s: WindowSummary = {
    requirement: rainfedDeficit / 3, irrigation: 0, unmet: 0, exceeded: [false, false, false], ratios: [null, null, null],
    yields: [0, 0, 0], irrYear: [0, 0, 0], unmetYear: [0, 0, 0], margins: [0, 0, 0], marginMean: 0, lowYield: false,
    stressedCropYears: 0, cropYears: 0,
    frost: [NaN, NaN, NaN], winterKill: [NaN, NaN, NaN], heat: [NaN, NaN, NaN], awAtSow: [NaN, NaN, NaN],
    deepPerc: extras?.deepPerc ?? NaN, runoff: extras?.runoff ?? NaN, massErr: extras?.massErr ?? NaN, years: extras?.years ?? 3,
  };
  for (let k = 0; k < 3; k++) {
    const se = seasons[k];
    const id = crops[k];
    if (!se) {
      s.margins[k] = grossMargin(ev, id, null, 0).margin;
      continue;
    }
    const ky = CROPS[id].agronomy!.ky.value;
    const r = yieldRatio(ky, se.eta, se.etc);
    const g = grossMargin(ev, id, r, se.irrigation);
    s.ratios[k] = r; s.yields[k] = g.yieldTHa; s.margins[k] = g.margin;
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
}

/** Exact replay over every usable window. */
export function evaluateExact(ev: EvalContext, schedule: SequenceSchedule): WindowSummary[] {
  const out: WindowSummary[] = [];
  const clim = ev.setup.ctx.clim;
  ev.windows.forEach((w, i) => {
    if (!windowUsable(clim, w, schedule)) return;
    const o = simulateWindowExact(ev.setup, schedule, w, ev.budgetNet, ev.w0[i]);
    const rf = ev.budgetNet > 0 ? simulateWindowExact(ev.setup, schedule, w, 0, ev.w0[i]) : o;
    let def = 0;
    for (const y of rf.years) if (y.season) def += y.season.etc - y.season.eta;
    const days = (Math.max(w.coreEndIdx, 0) - w.startIdx);
    out.push(summarize(ev, schedule.crops,
      o.years.map((y) => y.season ? {
        etc: y.season.etc, eta: y.season.eta, irrigation: y.season.irrigation, shortfall: y.season.shortfall,
        frost: y.season.frostDays, wk: y.season.winterKillDays, heat: y.season.heatDays, aw: y.season.awAtSow,
      } : null),
      def,
      { deepPerc: o.flux.deepPerc, runoff: o.flux.runoff, massErr: o.massBalanceError, years: days / 365.25 }));
  });
  return out;
}

/** Screening pass (cached pieces) over every usable window. */
export function evaluateScreening(ev: EvalContext, screener: Screener, schedule: SequenceSchedule): WindowSummary[] {
  const out: WindowSummary[] = [];
  const clim = ev.setup.ctx.clim;
  ev.windows.forEach((w, i) => {
    if (!windowUsable(clim, w, schedule)) return;
    const a = screener.screenWindow(schedule, w, ev.w0[i], ev.budgetNet, 0);
    const rf = ev.budgetNet > 0 ? screener.screenWindow(schedule, w, ev.w0[i], 0, 1) : a;
    let def = 0;
    for (const y of rf.years) if (y) def += y.etc - y.eta;
    out.push(summarize(ev, schedule.crops,
      a.years.map((y) => y ? { etc: y.etc, eta: y.eta, irrigation: y.irrigation, shortfall: y.shortfall, frost: y.frostDays, wk: 0, heat: y.heatDays, aw: NaN } : null),
      def));
  });
  return out;
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

export function yearResults(ws: WindowSummary[], crops: readonly CropId[]): YearResult[] {
  const meanOrNull = (v: number[]) => { const f = v.filter(Number.isFinite); return f.length ? f.reduce((a, b) => a + b, 0) / f.length : null; };
  return [0, 1, 2].map((k) => {
    const fallow = !CROPS[crops[k]].agronomy;
    const d = (f: (w: WindowSummary) => number | null): Dist | null =>
      ws.length && !fallow ? dist(ws.map(f).filter((x): x is number => x !== null)) : null;
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
    };
  });
}
