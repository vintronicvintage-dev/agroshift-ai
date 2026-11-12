/**
 * Climate evidence for the UI: annual series, monthly climatology, Mann–Kendall/Sen trends.
 * Only calendar years whose days are all present for the variable are used.
 */
import type { ClimateSeries, ClimateSummary, TrendResult } from "../types";
import type { PreparedClimate } from "./climate";
import { ymdOfEpochDay, fromEpochDay, epochDayOf } from "./dates";

const ymdToDay = (y: number) => epochDayOf(y, 1, 1);
import { mannKendall, senSlope } from "./trends";

/** Hot day: tmax > 35 °C; frost day: tmin < 0 °C (WMO/ETCCDI-style indices). */
export const HOT_DAY_C = 35;
export const FROST_DAY_C = 0;
export const TREND_ALPHA = 0.05;

interface YearAcc {
  days: number; daysInYear: number;
  p: number; pOk: number; e: number; eOk: number; hot: number; frost: number; tOk: number; g: number; gOk: number;
  mp: number[]; me: number[]; mOkP: number[]; mOkE: number[]; mDays: number[];
}

export function summarizeClimate(base: PreparedClimate, scen: PreparedClimate, series: ClimateSeries): ClimateSummary {
  const years = new Map<number, YearAcc>();
  for (let i = 0; i < base.n; i++) {
    const { y, m } = ymdOfEpochDay(base.startDay + i);
    let a = years.get(y);
    if (!a) {
      const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
      a = { days: 0, daysInYear: leap ? 366 : 365, p: 0, pOk: 0, e: 0, eOk: 0, hot: 0, frost: 0, tOk: 0, g: 0, gOk: 0,
        mp: Array(12).fill(0), me: Array(12).fill(0), mOkP: Array(12).fill(0), mOkE: Array(12).fill(0), mDays: Array(12).fill(0) };
      years.set(y, a);
    }
    a.days++;
    a.mDays[m - 1]++;
    const p = base.precip[i], e = base.et0[i], tx = base.tmax[i], tn = base.tmin[i], g = base.gwetRoot[i];
    if (Number.isFinite(p)) { a.p += p; a.pOk++; a.mp[m - 1] += p; a.mOkP[m - 1]++; }
    if (Number.isFinite(e)) { a.e += e; a.eOk++; a.me[m - 1] += e; a.mOkE[m - 1]++; }
    if (Number.isFinite(tx) && Number.isFinite(tn)) { a.tOk++; if (tx > HOT_DAY_C) a.hot++; if (tn < FROST_DAY_C) a.frost++; }
    if (Number.isFinite(g)) { a.g += g; a.gOk++; }
  }
  const annual: ClimateSummary["annual"] = [];
  const completeYears: number[] = [];
  const mSumP = Array(12).fill(0), mSumE = Array(12).fill(0), mN = Array(12).fill(0);
  for (const [y, a] of [...years.entries()].sort((x, z) => x[0] - z[0])) {
    const full = a.days === a.daysInYear;
    const row = {
      year: y,
      precipMm: full && a.pOk === a.days ? a.p : null,
      et0Mm: full && a.eOk === a.days ? a.e : null,
      hotDays: full && a.tOk === a.days ? a.hot : null,
      frostDays: full && a.tOk === a.days ? a.frost : null,
      gwetRootMean: full && a.gOk === a.days ? a.g / a.gOk : null,
    };
    if (full) {
      annual.push(row);
      if (row.precipMm !== null && row.et0Mm !== null) {
        completeYears.push(y);
        for (let m = 0; m < 12; m++) { mSumP[m] += a.mp[m]; mSumE[m] += a.me[m]; mN[m]++; }
      }
    }
  }
  const monthly = mSumP.map((_, m) => {
    if (!mN[m]) return { month: m + 1, precipMm: null, et0Mm: null, balanceMm: null };
    const p = mSumP[m] / mN[m], e = mSumE[m] / mN[m];
    return { month: m + 1, precipMm: p, et0Mm: e, balanceMm: p - e };
  });
  const meanOf = (vals: (number | null)[]) => {
    const v = vals.filter((x): x is number => x !== null);
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
  };
  // Scenario annual means over the same complete years
  const complete = new Set(completeYears);
  let sp = 0, se = 0;
  const sn = completeYears.length;
  let curYear = ymdOfEpochDay(scen.startDay).y;
  let nextJan1 = ymdToDay(curYear + 1);
  for (let i = 0; i < scen.n; i++) {
    while (scen.startDay + i >= nextJan1) { curYear++; nextJan1 = ymdToDay(curYear + 1); }
    if (!complete.has(curYear)) continue;
    sp += scen.precip[i]; se += scen.et0[i];
  }
  const trends: TrendResult[] = [];
  const addTrend = (variable: TrendResult["variable"], unit: string, pick: (r: ClimateSummary["annual"][number]) => number | null) => {
    const rows = annual.filter((r) => pick(r) !== null);
    if (rows.length < 4) return;
    const ys = rows.map((r) => r.year), vs = rows.map((r) => pick(r) as number);
    const mk = mannKendall(vs);
    const sen = senSlope(ys, vs);
    const significant = mk.p < TREND_ALPHA;
    trends.push({
      variable, unit, years: ys, values: vs, s: mk.s, z: mk.z, p: mk.p,
      senSlope: sen.slope, intercept: sen.intercept + sen.slope * ys[0],
      significant, direction: !significant ? "none" : sen.slope > 0 || mk.s > 0 ? "increasing" : "decreasing",
    });
  };
  addTrend("precip", "mm/yr", (r) => r.precipMm);
  addTrend("et0", "mm/yr", (r) => r.et0Mm);
  addTrend("hot_days", "days/yr", (r) => r.hotDays);
  addTrend("frost_days", "days/yr", (r) => r.frostDays);
  addTrend("gwet_root", "0–1", (r) => r.gwetRootMean);

  return {
    period: { start: fromEpochDay(base.startDay), end: fromEpochDay(base.startDay + base.n - 1) },
    completeYears,
    meanAnnualPrecipMm: meanOf(annual.map((r) => r.precipMm)),
    meanAnnualEt0Mm: meanOf(annual.map((r) => r.et0Mm)),
    scenarioMeanAnnualPrecipMm: sn ? sp / sn : null,
    scenarioMeanAnnualEt0Mm: sn ? se / sn : null,
    annual,
    monthly,
    trends,
    quality: base.quality,
    sources: series.sources,
    evidence: [
      {
        formula: "FAO-56 Penman–Monteith Eq. 6 (G = 0, ea from RHmean Eq. 19); Hargreaves Eq. 52 when Rs/RH/wind missing",
        inputs: { lat: series.lat, elevation: series.elevation, pmDays: base.quality.et0PenmanMonteithDays, hargreavesDays: base.quality.et0HargreavesDays },
        sources: ["FAO-56", ...series.sources.map((s) => s.name)],
      },
      {
        formula: `Mann–Kendall (two-sided, α = ${TREND_ALPHA}) + Sen slope; hot day tmax > ${HOT_DAY_C} °C, frost day tmin < ${FROST_DAY_C} °C`,
        inputs: { completeYears: completeYears.length },
        sources: ["Mann 1945; Kendall 1975; Sen 1968"],
      },
    ],
  };
}
