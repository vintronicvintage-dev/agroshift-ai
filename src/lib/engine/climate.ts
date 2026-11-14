/**
 * Climate preparation: contiguous daily arrays, ≤3-day gap interpolation (counted),
 * scenario transforms and one-time ET₀ computation per scenario.
 *
 * Missing values are never invented: gaps longer than 3 days stay missing (NaN) and every
 * agricultural year touching them is excluded from the replay and reported.
 */
import type { ClimateSeries, DataQualityReport } from "../types";
import { toEpochDay, ymdOfEpochDay, epochDayOf } from "./dates";
import { et0PenmanMonteith, et0Hargreaves, extraterrestrialRadiation } from "./et0";

export const MAX_INTERP_GAP_DAYS = 3;

type VarKey = "tmax" | "tmin" | "rh" | "wind2m" | "rs" | "precip" | "gwetRoot";
const VARS: VarKey[] = ["tmax", "tmin", "rh", "wind2m", "rs", "precip", "gwetRoot"];

export interface AgYear {
  /** AY c = 1 Oct (c−1) … 30 Sep c */
  year: number;
  startIdx: number; // index of 1 Oct (c−1)
  endIdx: number;   // index of 30 Sep c (inclusive)
  extEndIdx: number; // index of 30 Nov c (inclusive): late harvests spill over
  coreValid: boolean;
  extValid: boolean;
  firstInvalidDate: string | null;
}

export interface PreparedClimate {
  lat: number; lon: number; elevation: number;
  startDay: number; // epoch day at index 0
  n: number;
  tmax: Float64Array; tmin: Float64Array; rh: Float64Array; wind: Float64Array; rs: Float64Array;
  precip: Float64Array; gwetRoot: Float64Array; et0: Float64Array;
  /** 1 = PM, 2 = Hargreaves, 0 = none */
  et0Method: Uint8Array;
  /** 1 when ET₀, precipitation, tmax and tmin are all usable. */
  valid: Uint8Array;
  ays: AgYear[];
  quality: DataQualityReport;
  rainMultiplier: number;
  tempDeltaC: number;
  /** Engine v2: monthly precipitation factors applied on top of rainMultiplier (Jan first; all 1 = none). */
  monthlyFactors: number[];
  /** Engine v2: absolute month number (year·12 + month − 1) per day index. */
  absMonth: Int32Array;
}

function toArray(len: number): Float64Array {
  const a = new Float64Array(len);
  a.fill(NaN);
  return a;
}

/** Linearly interpolate interior NaN runs of length ≤ maxGap. Returns number of filled days. */
export function interpolateShortGaps(a: Float64Array, maxGap = MAX_INTERP_GAP_DAYS): number {
  let filled = 0;
  let i = 0;
  const n = a.length;
  while (i < n) {
    if (!Number.isNaN(a[i])) { i++; continue; }
    let j = i;
    while (j < n && Number.isNaN(a[j])) j++;
    const len = j - i;
    if (i > 0 && j < n && len <= maxGap) {
      const v0 = a[i - 1], v1 = a[j];
      for (let k = i; k < j; k++) a[k] = v0 + ((v1 - v0) * (k - i + 1)) / (len + 1);
      filled += len;
    }
    i = j;
  }
  return filled;
}

interface BaseArrays {
  startDay: number; n: number;
  absMonth: Int32Array;
  doy: Int16Array;
  et0ByTemp: Map<number, { et0: Float64Array; method: Uint8Array; tmax: Float64Array; tmin: Float64Array; pm: number; hg: number }>;
  arrays: Record<VarKey, Float64Array>;
  interpolated: Record<VarKey, number>;
  inserted: number;
}

const baseCache = new WeakMap<ClimateSeries, BaseArrays>();

function buildBase(series: ClimateSeries): BaseArrays {
  const cached = baseCache.get(series);
  if (cached) return cached;
  let minDay = Infinity, maxDay = -Infinity;
  for (const d of series.daily) {
    const e = toEpochDay(d.date);
    if (e < minDay) minDay = e;
    if (e > maxDay) maxDay = e;
  }
  if (!Number.isFinite(minDay)) { minDay = toEpochDay(series.start); maxDay = minDay - 1; }
  const n = Math.max(0, maxDay - minDay + 1);
  const arrays = Object.fromEntries(VARS.map((k) => [k, toArray(n)])) as Record<VarKey, Float64Array>;
  const seen = new Uint8Array(n);
  for (const d of series.daily) {
    const i = toEpochDay(d.date) - minDay;
    seen[i] = 1;
    for (const k of VARS) {
      const v = d[k];
      arrays[k][i] = v == null || !Number.isFinite(v) || v <= -998 ? NaN : v;
    }
  }
  let inserted = 0;
  for (let i = 0; i < n; i++) if (!seen[i]) inserted++;
  const interpolated = {} as Record<VarKey, number>;
  for (const k of VARS) interpolated[k] = interpolateShortGaps(arrays[k]);
  const absMonth = new Int32Array(n);
  const doy = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    const { y, m } = ymdOfEpochDay(minDay + i);
    absMonth[i] = y * 12 + m - 1;
    doy[i] = minDay + i - epochDayOf(y, 1, 1) + 1;
  }
  const base: BaseArrays = { startDay: minDay, n, arrays, interpolated, inserted, absMonth, doy, et0ByTemp: new Map() };
  baseCache.set(series, base);
  return base;
}

const prepCache = new WeakMap<ClimateSeries, Map<string, PreparedClimate>>();

/** ET₀ (FAO-56 PM, Hargreaves fallback) for a temperature shift; memoised per series and shift. */
function et0For(series: ClimateSeries, base: BaseArrays, tempDeltaC: number) {
  const hit = base.et0ByTemp.get(tempDeltaC);
  if (hit) return hit;
  const { n, arrays } = base;
  const tmax = new Float64Array(n), tmin = new Float64Array(n);
  for (let i = 0; i < n; i++) { tmax[i] = arrays.tmax[i] + tempDeltaC; tmin[i] = arrays.tmin[i] + tempDeltaC; }
  const rh = arrays.rh, wind = arrays.wind2m, rs = arrays.rs;
  const et0 = toArray(n);
  const method = new Uint8Array(n);
  let pm = 0, hg = 0;
  for (let i = 0; i < n; i++) {
    const doy = base.doy[i];
    const tx = tmax[i], tn = tmin[i];
    if (Number.isFinite(tx) && Number.isFinite(tn)) {
      const hi = Math.max(tx, tn), lo = Math.min(tx, tn);
      if (Number.isFinite(rh[i]) && Number.isFinite(wind[i]) && Number.isFinite(rs[i])) {
        et0[i] = et0PenmanMonteith({
          tmax: hi, tmin: lo, rhMean: Math.min(100, Math.max(0, rh[i])), u2: Math.max(0, wind[i]), rs: Math.max(0, rs[i]),
          latDeg: series.lat, elevation: series.elevation, doy,
        }).et0;
        method[i] = 1; pm++;
      } else {
        et0[i] = et0Hargreaves(hi, lo, extraterrestrialRadiation(series.lat, doy));
        method[i] = 2; hg++;
      }
    }
  }
  const out = { et0, method, tmax, tmin, pm, hg };
  base.et0ByTemp.set(tempDeltaC, out);
  return out;
}

/**
 * Prepare a climate series for a scenario. Memoised per (series object, rain multiplier,
 * temperature delta, monthly factors); ET₀ is computed once per temperature delta (rain does not
 * change ET₀).
 * @param monthlyFactors optional 12 precipitation factors (January first), e.g. an explicit
 *        `precipAdjustment`; combined multiplicatively with `rainMultiplier`.
 */
export function prepareClimate(series: ClimateSeries, rainMultiplier = 1, tempDeltaC = 0, monthlyFactors?: readonly number[]): PreparedClimate {
  let byScen = prepCache.get(series);
  if (!byScen) { byScen = new Map(); prepCache.set(series, byScen); }
  const mf = monthlyFactors && monthlyFactors.length === 12 ? monthlyFactors.map((x) => (Number.isFinite(x) && x >= 0 ? x : 1)) : Array<number>(12).fill(1);
  const key = `${rainMultiplier}|${tempDeltaC}|${mf.join(",")}`;
  const hit = byScen.get(key);
  if (hit) return hit;

  const base = buildBase(series);
  const { n, startDay, arrays } = base;
  const t = et0For(series, base, tempDeltaC);
  const precip = new Float64Array(n);
  const fac = mf.map((x) => x * rainMultiplier);
  for (let i = 0; i < n; i++) precip[i] = arrays.precip[i] * fac[base.absMonth[i] % 12];
  const rh = arrays.rh, wind = arrays.wind2m, rs = arrays.rs, gwetRoot = arrays.gwetRoot;
  const valid = new Uint8Array(n);
  let unusable = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(t.et0[i]) && Number.isFinite(precip[i])) valid[i] = 1; else unusable++;
  }

  const ays = buildAgYears(startDay, n, valid);
  const missing = {} as Record<VarKey, number>;
  for (const k of VARS) { let c = 0; const a = arrays[k]; for (let i = 0; i < n; i++) if (Number.isNaN(a[i])) c++; missing[k] = c; }
  const quality: DataQualityReport = {
    totalDays: n,
    interpolatedDays: { ...base.interpolated },
    missingDays: missing,
    et0PenmanMonteithDays: t.pm,
    et0HargreavesDays: t.hg,
    unusableDays: unusable,
    insertedMissingDates: base.inserted,
  };
  const prepared: PreparedClimate = {
    lat: series.lat, lon: series.lon, elevation: series.elevation,
    startDay, n, tmax: t.tmax, tmin: t.tmin, rh, wind, rs, precip, gwetRoot, et0: t.et0, et0Method: t.method, valid, ays, quality,
    rainMultiplier, tempDeltaC, monthlyFactors: mf, absMonth: base.absMonth,
  };
  byScen.set(key, prepared);
  return prepared;
}

function buildAgYears(startDay: number, n: number, valid: Uint8Array): AgYear[] {
  const out: AgYear[] = [];
  if (n === 0) return out;
  const firstY = ymdOfEpochDay(startDay).y;
  const lastY = ymdOfEpochDay(startDay + n - 1).y;
  for (let c = firstY; c <= lastY + 1; c++) {
    const startIdx = epochDayOf(c - 1, 10, 1) - startDay;
    const endIdx = epochDayOf(c, 9, 30) - startDay;
    const extEndIdx = epochDayOf(c, 11, 30) - startDay;
    if (startIdx < 0 || endIdx >= n) continue;
    let coreValid = true, firstInvalid: number | null = null;
    for (let i = startIdx; i <= endIdx; i++) if (!valid[i]) { coreValid = false; firstInvalid = i; break; }
    let extValid = extEndIdx < n;
    if (extValid) for (let i = endIdx + 1; i <= extEndIdx; i++) if (!valid[i]) { extValid = false; if (firstInvalid === null) firstInvalid = i; break; }
    out.push({
      year: c, startIdx, endIdx, extEndIdx, coreValid, extValid,
      firstInvalidDate: firstInvalid === null ? null : isoOf(startDay + firstInvalid),
    });
  }
  return out;
}

function isoOf(day: number): string {
  const { y, m, d } = ymdOfEpochDay(day);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Mean annual precipitation over complete calendar years (all days valid), mm/yr; null if none. */
export function meanAnnualPrecip(c: PreparedClimate): number | null {
  const sums = new Map<number, { p: number; n: number; ok: boolean }>();
  for (let i = 0; i < c.n; i++) {
    const y = Math.floor(c.absMonth[i] / 12);
    let e = sums.get(y);
    if (!e) { e = { p: 0, n: 0, ok: true }; sums.set(y, e); }
    const v = c.precip[i];
    if (Number.isFinite(v)) e.p += v; else e.ok = false;
    e.n++;
  }
  let t = 0, k = 0;
  for (const [y, e] of sums) {
    const days = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
    if (e.ok && e.n === days) { t += e.p; k++; }
  }
  return k ? t / k : null;
}
