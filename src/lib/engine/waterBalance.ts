/**
 * Daily soil water balance (FAO-56 Chapters 6–8, single crop coefficient).
 *
 * Soil column of fixed depth Zcol split into two buckets that hold plant-available water
 * (water above wilting point, mm):
 *   top  = current root zone (0…Zr) during a crop, evaporation layer (0…Ze) when bare;
 *   sub  = Zr…Zcol, a store that roots grow into (carry-over between seasons).
 * When the top depth changes, water moves between buckets assuming a uniform profile in the
 * bucket that loses depth (mass conserving). Water above field capacity in the top drains to
 * the sub bucket the same day; above field capacity in the column it leaves as deep percolation.
 *
 * Crop day (FAO-56): Kc curve (Fig. 34), Zr linear to max at start of mid-season, p adjusted
 * for ETc (Table 22 note: p = p_tab + 0.04(5 − ETc)), TAW = TAW/m · Zr, RAW = p·TAW,
 * Ks (Eq. 84), ETa = Ks·Kc·ET₀. Irrigation: when Dr ≥ RAW and budget remains, refill the
 * root zone (Dr ≈ RAW at trigger), limited by the remaining net budget.
 * Bare day: E = Kr·Ke,max·ET₀ with Kr from the evaporation-layer depletion (FAO-56 Eq. 74).
 * Runoff: SCS-CN with a cover-dependent CN.
 *
 * Mass balance per run: P + I = ET + RO + DP + ΔS (tested to ±0.01 mm).
 */
import type { CoverType, CropDef, StageName } from "../types";
import type { PreparedClimate } from "./climate";
import { scsRunoff, tawCum, type TawProfile } from "./soil";

export const DEGREE_DAY_MELT_MM_PER_C_DAY = 2.8;
export const SNOW_TEMP_THRESHOLD_C = 0;

export interface SnowStepResult {
  rainMm: number;
  meltMm: number;
  liquidMm: number;
  sweMm: number;
}

/**
 * Degree-day snow accumulation and melt step (USDA-NRCS NEH Part 630 Ch. 11 / WMO 1986).
 * - When daily mean temperature T_mean < thresholdC (0 °C), precipitation accumulates as snow water equivalent (SWE, mm).
 * - When T_mean > thresholdC (0 °C), snow melts at rate Cm · (T_mean − thresholdC) up to available SWE.
 * Exact mass identity per day: swe_next − swe_prev = precipMm − liquidMm.
 */
export function stepSnow(
  precipMm: number,
  tmeanC: number,
  sweMm: number,
  meltFactor = DEGREE_DAY_MELT_MM_PER_C_DAY,
  thresholdC = SNOW_TEMP_THRESHOLD_C,
): SnowStepResult {
  if (tmeanC < thresholdC) {
    return { rainMm: 0, meltMm: 0, liquidMm: 0, sweMm: sweMm + precipMm };
  }
  const melt = sweMm > 0 && tmeanC > thresholdC
    ? Math.min(sweMm, meltFactor * (tmeanC - thresholdC))
    : 0;
  return {
    rainMm: precipMm,
    meltMm: melt,
    liquidMm: precipMm + melt,
    sweMm: sweMm - melt,
  };
}

export interface SimContext {
  clim: PreparedClimate;
  /** Column-mean TAW per metre, mm/m (= profile TAW(zCol)/zCol). */
  tawPerM: number;
  /** Engine v2: cumulative TAW profile (layered or uniform). */
  profile: TawProfile;
  /** TAW of the whole column, mm. */
  tawCol: number;
  zCol: number;
  zBare: number;
  zMin: number;
  rew: number;
  keMax: number;
  cn: Record<CoverType, number>;
  /** Degree-day snowmelt factor Cm, mm/°C/day (default 2.8; 0 disables snow accumulation). */
  snowMeltFactor?: number;
  /** Rain/snow threshold and melt base temperature, °C (default 0). */
  snowTempThresholdC?: number;
}

export interface SoilState { wTop: number; wSub: number; zTop: number; swe?: number }

/**
 * Optional monthly diagnostics (engine v2): `arr` holds 36 months × DIAG_N values, month index =
 * clim.absMonth[day] − base, wrapped modulo 36 (steady-state cycle: a late harvest after the
 * window spills into year 1 of the next cycle).
 */
export interface MonthlyDiag { arr: Float64Array; base: number }
export const DIAG_ETC = 0, DIAG_ETA = 1, DIAG_EFFR = 2, DIAG_IRR = 3, DIAG_BARE = 4, DIAG_N = 5;

export interface Fluxes {
  precip: number;
  runoff: number;
  irrigation: number;
  et: number;
  deepPerc: number;
  snowMelt?: number;
  peakSwe?: number;
  diag?: MonthlyDiag | null;
}

export function newFluxes(diag?: MonthlyDiag | null): Fluxes {
  return { precip: 0, runoff: 0, irrigation: 0, et: 0, deepPerc: 0, snowMelt: 0, peakSwe: 0, diag: diag ?? null };
}

function diagAdd(d: MonthlyDiag, absMonth: number, k: number, v: number): void {
  let m = (absMonth - d.base) % 36;
  if (m < 0) m += 36;
  d.arr[m * DIAG_N + k] += v;
}

/** Resolved, flat per-crop parameters for the inner loop. */
export interface CropParams {
  kcIni: number; kcMid: number; kcEnd: number;
  zMax: number; pTab: number; ky: number; cn: number;
  frostC: number; frostMask: number; winterKillC: number;
  heatC: number; heatMask: number; gddBase: number;
}

const STAGE_BIT: Record<StageName, number> = { ini: 1, dev: 2, mid: 4, late: 8 };

export function cropParams(def: CropDef, cn: Record<CoverType, number>): CropParams {
  const a = def.agronomy;
  if (!a) throw new Error(`cropParams: ${def.id} has no agronomy (fallow)`);
  const mask = (s: StageName[]) => s.reduce((m, x) => m | STAGE_BIT[x], 0);
  return {
    kcIni: a.kc.value.ini, kcMid: a.kc.value.mid, kcEnd: a.kc.value.end,
    zMax: a.rootDepthMaxM.value, pTab: a.p.value, ky: a.ky.value, cn: cn[a.cover.value],
    frostC: a.frost.value.criticalC, frostMask: mask(a.frost.value.stages),
    winterKillC: a.frost.value.winterKillC ?? -Infinity,
    heatC: a.heat.value.thresholdC, heatMask: mask(a.heat.value.stages),
    gddBase: a.gdd.value.baseC,
  };
}

export function uniformState(ctx: SimContext, wetness: number): SoilState {
  const w = Math.min(1, Math.max(0, wetness));
  const top = tawCum(ctx.profile, ctx.zBare);
  return { wTop: w * top, wSub: w * (ctx.tawCol - top), zTop: ctx.zBare, swe: 0 };
}

export function storage(s: SoilState): number {
  return s.wTop + s.wSub + (s.swe ?? 0);
}

/**
 * Change the top-bucket depth, moving water between buckets. The bucket that loses depth is assumed
 * to have a uniform RELATIVE wetness, so the water moved is proportional to the TAW of the moved
 * slice (layered profile); with a uniform profile this is the depth ratio.
 */
export function setTopDepth(s: SoilState, z: number, ctx: SimContext): void {
  if (z === s.zTop) return;
  const p = ctx.profile;
  if (p.uniform !== null) {
    const zCol = ctx.zCol;
    if (z > s.zTop) {
      const subDepth = zCol - s.zTop;
      const moved = subDepth > 0 ? (s.wSub * (z - s.zTop)) / subDepth : 0;
      s.wSub -= moved; s.wTop += moved;
    } else {
      const moved = s.zTop > 0 ? (s.wTop * (s.zTop - z)) / s.zTop : 0;
      s.wTop -= moved; s.wSub += moved;
    }
  } else {
    const tOld = tawCum(p, s.zTop), tNew = tawCum(p, z);
    if (z > s.zTop) {
      const cap = ctx.tawCol - tOld;
      const moved = cap > 0 ? (s.wSub * (tNew - tOld)) / cap : 0;
      s.wSub -= moved; s.wTop += moved;
    } else {
      const moved = tOld > 0 ? (s.wTop * (tOld - tNew)) / tOld : 0;
      s.wTop -= moved; s.wSub += moved;
    }
  }
  s.zTop = z;
}

export interface SeasonOutcome {
  etc: number; eta: number;
  irrigation: number; events: number;
  /** ETc − ETa over the season (unmet crop water demand). */
  unmet: number;
  /** 1 if at some point irrigation was due (Dr ≥ RAW) but the budget could not refill the root zone. */
  limited: number;
  /** ETc − ETa accumulated from the first budget-limited day on (deficit caused by the budget running out), mm. */
  shortfall: number;
  frostDays: number; winterKillDays: number; heatDays: number; gdd: number;
  /** Plant-available water in the column at sowing, mm. */
  awAtSow: number;
}

export function emptySeason(): SeasonOutcome {
  return { etc: 0, eta: 0, irrigation: 0, events: 0, unmet: 0, limited: 0, shortfall: 0, frostDays: 0, winterKillDays: 0, heatDays: 0, gdd: 0, awAtSow: 0 };
}

/**
 * Simulate one crop season starting at `sowIdx` (inclusive) for sum(stages) days.
 * `budgetNet` is the net irrigation water available for this season (mm); 0 = rainfed.
 * State is mutated; on return the top bucket is reset to the bare evaporation layer (harvest).
 */
export function simulateSeason(
  ctx: SimContext, cp: CropParams, sowIdx: number, stages: readonly number[],
  state: SoilState, budgetNet: number, flux: Fluxes,
): SeasonOutcome {
  const c = ctx.clim;
  const prof = ctx.profile, tawCol = ctx.tawCol;
  const diag = flux.diag ?? null;
  const L1 = stages[0], L2 = L1 + stages[1], L3 = L2 + stages[2], L4 = L3 + stages[3];
  const out = emptySeason();
  out.awAtSow = state.wTop + state.wSub + (state.swe ?? 0);
  let remaining = budgetNet;
  const zMin = Math.min(ctx.zMin, cp.zMax);
  const cm = ctx.snowMeltFactor ?? DEGREE_DAY_MELT_MM_PER_C_DAY;
  const tSnow = ctx.snowTempThresholdC ?? SNOW_TEMP_THRESHOLD_C;
  let swe = state.swe ?? 0;
  let snowMeltSum = flux.snowMelt ?? 0;
  let peakSwe = flux.peakSwe ?? 0;
  for (let t = 0; t < L4; t++) {
    const d = sowIdx + t;
    // Stage, Kc, root depth
    let kc: number, bit: number;
    if (t < L1) { kc = cp.kcIni; bit = 1; }
    else if (t < L2) { kc = cp.kcIni + ((cp.kcMid - cp.kcIni) * (t - L1 + 1)) / (L2 - L1); bit = 2; }
    else if (t < L3) { kc = cp.kcMid; bit = 4; }
    else { kc = cp.kcMid + ((cp.kcEnd - cp.kcMid) * (t - L3 + 1)) / (L4 - L3); bit = 8; }
    const zr = L2 > 0 ? zMin + (cp.zMax - zMin) * Math.min(1, (t + 1) / L2) : cp.zMax;
    setTopDepth(state, zr, ctx);
    const taw = tawCum(prof, zr);
    const et0 = c.et0[d];
    const etc = kc * et0;
    let p = cp.pTab + 0.04 * (5 - etc);
    p = p < 0.1 ? 0.1 : p > 0.8 ? 0.8 : p;
    const raw = p * taw;
    let dr = taw - state.wTop;
    if (dr < 0) dr = 0;
    // Irrigation decision at the start of the day (yesterday's state)
    if (dr >= raw && dr > 0) {
      if (remaining > 0) {
        const irr = dr < remaining ? dr : remaining;
        if (irr < dr - 1e-9) out.limited = 1;
        remaining -= irr;
        state.wTop += irr;
        out.irrigation += irr;
        out.events++;
        flux.irrigation += irr;
        if (diag) diagAdd(diag, c.absMonth[d], DIAG_IRR, irr);
        dr -= irr;
      } else {
        out.limited = 1;
      }
    }
    const ks = dr <= raw ? 1 : (taw - dr) / ((1 - p) * taw);
    let eta = (ks > 0 ? ks : 0) * etc;
    const tn = c.tmin[d], tx = c.tmax[d];
    const tmean = 0.5 * (tx + tn);
    const P = c.precip[d];
    let rainMm = P;
    let liquidMm = P;
    if (cm > 0 && (P > 0 || swe > 0)) {
      if (tmean < tSnow) {
        swe += P;
        rainMm = 0;
        liquidMm = 0;
        if (swe > peakSwe) peakSwe = swe;
      } else if (swe > 0) {
        const pot = tmean > tSnow ? cm * (tmean - tSnow) : 0;
        const melt = pot < swe ? pot : swe;
        swe -= melt;
        liquidMm = P + melt;
        snowMeltSum += melt;
      }
    }
    const ro = rainMm > 0 ? scsRunoff(rainMm, cp.cn) : 0;
    state.wTop += liquidMm - ro - eta;
    if (state.wTop < 0) { eta += state.wTop; state.wTop = 0; }
    let dp = 0;
    if (state.wTop > taw) {
      state.wSub += state.wTop - taw;
      state.wTop = taw;
      const capSub = tawCol - taw;
      if (state.wSub > capSub) { dp = state.wSub - capSub; flux.deepPerc += dp; state.wSub = capSub; }
    }
    flux.precip += P; flux.runoff += ro; flux.et += eta;
    out.etc += etc; out.eta += eta;
    if (diag) {
      const am = c.absMonth[d];
      diagAdd(diag, am, DIAG_ETC, etc); diagAdd(diag, am, DIAG_ETA, eta); diagAdd(diag, am, DIAG_EFFR, liquidMm - ro - dp);
    }
    if (out.limited) out.shortfall += etc - eta;
    // Climate stress counters
    if ((cp.frostMask & bit) !== 0 && tn < cp.frostC) out.frostDays++;
    if (bit <= 2 && tn < cp.winterKillC) out.winterKillDays++;
    if ((cp.heatMask & bit) !== 0 && tx > cp.heatC) out.heatDays++;
    const g = tmean - cp.gddBase;
    if (g > 0) out.gdd += g;
  }
  state.swe = swe;
  flux.snowMelt = snowMeltSum;
  flux.peakSwe = peakSwe;
  out.unmet = out.etc - out.eta;
  setTopDepth(state, ctx.zBare, ctx);
  return out;
}

/** Simulate bare soil from `startIdx` (inclusive) to `endIdx` (exclusive). Returns soil evaporation, mm. */
export function simulateBare(ctx: SimContext, startIdx: number, endIdx: number, state: SoilState, flux: Fluxes): number {
  const c = ctx.clim;
  setTopDepth(state, ctx.zBare, ctx);
  const tew = tawCum(ctx.profile, ctx.zBare);
  const rew = Math.min(ctx.rew, 0.8 * tew);
  const capSub = ctx.tawCol - tew;
  const diag = flux.diag ?? null;
  const cn = ctx.cn.bare;
  const cm = ctx.snowMeltFactor ?? DEGREE_DAY_MELT_MM_PER_C_DAY;
  const tSnow = ctx.snowTempThresholdC ?? SNOW_TEMP_THRESHOLD_C;
  let swe = state.swe ?? 0;
  let snowMeltSum = flux.snowMelt ?? 0;
  let peakSwe = flux.peakSwe ?? 0;
  let evap = 0;
  for (let d = startIdx; d < endIdx; d++) {
    const P = c.precip[d];
    const tmean = 0.5 * (c.tmax[d] + c.tmin[d]);
    let rainMm = P;
    let liquidMm = P;
    if (cm > 0 && (P > 0 || swe > 0)) {
      if (tmean < tSnow) {
        swe += P;
        rainMm = 0;
        liquidMm = 0;
        if (swe > peakSwe) peakSwe = swe;
      } else if (swe > 0) {
        const pot = tmean > tSnow ? cm * (tmean - tSnow) : 0;
        const melt = pot < swe ? pot : swe;
        swe -= melt;
        liquidMm = P + melt;
        snowMeltSum += melt;
      }
    }
    const de = tew - state.wTop;
    const kr = de <= rew ? 1 : Math.max(0, (tew - de) / (tew - rew));
    const snowCoverFactor = swe > 0 ? Math.max(0.1, 1 - swe / 10) : 1;
    let e = kr * ctx.keMax * c.et0[d] * snowCoverFactor;
    const ro = rainMm > 0 ? scsRunoff(rainMm, cn) : 0;
    state.wTop += liquidMm - ro - e;
    if (state.wTop < 0) { e += state.wTop; state.wTop = 0; }
    let dp = 0;
    if (state.wTop > tew) {
      state.wSub += state.wTop - tew;
      state.wTop = tew;
      if (state.wSub > capSub) { dp = state.wSub - capSub; flux.deepPerc += dp; state.wSub = capSub; }
    }
    flux.precip += P; flux.runoff += ro; flux.et += e;
    evap += e;
    if (diag) { const am = c.absMonth[d]; diagAdd(diag, am, DIAG_BARE, e); diagAdd(diag, am, DIAG_EFFR, liquidMm - ro - dp); }
  }
  state.swe = swe;
  flux.snowMelt = snowMeltSum;
  flux.peakSwe = peakSwe;
  return evap;
}

/** FAO-33 yield response: Ya/Ym = 1 − Ky (1 − ETa/ETc), clamped to [0, 1]. */
export function yieldRatio(ky: number, eta: number, etc: number): number {
  if (etc <= 0) return 1;
  const r = 1 - ky * (1 - eta / etc);
  return r < 0 ? 0 : r > 1 ? 1 : r;
}
