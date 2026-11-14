/**
 * Field-card numbers computed in the browser from the real daily series (NASA POWER) and the
 * MODIS NDVI series. Pure functions; nothing here invents a value: a missing input gives null.
 */
import type { ClimateSeries, NdviSeries } from "@/lib/types";

const doy = (iso: string) => {
  const d = Date.parse(`${iso}T00:00:00Z`);
  const y = Date.parse(`${iso.slice(0, 4)}-01-01T00:00:00Z`);
  return Math.round((d - y) / 86_400_000) + 1;
};

export function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

function completeYears(c: ClimateSeries): Map<number, ClimateSeries["daily"]> {
  const by = new Map<number, ClimateSeries["daily"]>();
  for (const d of c.daily) {
    const y = Number(d.date.slice(0, 4));
    let a = by.get(y);
    if (!a) by.set(y, (a = []));
    a.push(d);
  }
  for (const [y, a] of by) if (a.length < 365) by.delete(y);
  return by;
}

export interface MonthlyTemps {
  tmax: (number | null)[];
  tmin: (number | null)[];
  /** Share of days with tmin ≤ 0 °C, by month. */
  frostShare: (number | null)[];
}

export function monthlyTemps(c: ClimateSeries): MonthlyTemps {
  const sx = Array(12).fill(0), nx = Array(12).fill(0), sn = Array(12).fill(0), nn = Array(12).fill(0), fr = Array(12).fill(0);
  for (const d of c.daily) {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (d.tmax !== null) {
      sx[m] += d.tmax;
      nx[m]++;
    }
    if (d.tmin !== null) {
      sn[m] += d.tmin;
      nn[m]++;
      if (d.tmin <= 0) fr[m]++;
    }
  }
  return {
    tmax: sx.map((s, i) => (nx[i] ? s / nx[i] : null)),
    tmin: sn.map((s, i) => (nn[i] ? s / nn[i] : null)),
    frostShare: fr.map((f, i) => (nn[i] ? f / nn[i] : null)),
  };
}

export interface FrostStats {
  /** Day of year of the last spring frost (tmin ≤ 0 °C before 1 July): median, earliest, latest, 90 % date. */
  lastSpring: { median: number; earliest: number; latest: number; p90: number } | null;
  /** First autumn frost (on or after 1 July). p10 = the date by which 90 % of years are still frost-free. */
  firstAutumn: { median: number; earliest: number; latest: number; p10: number } | null;
  years: number;
  /** Mean annual growing degree days, base 0 °C and base 10 °C (complete years). */
  gdd0: number | null;
  gdd10: number | null;
  /** Mean cumulative GDD (base 0) by month end, Jan first. */
  gdd0Cum: number[];
}

export function frostStats(c: ClimateSeries): FrostStats {
  const yrs = completeYears(c);
  const spring: number[] = [];
  const autumn: number[] = [];
  const g0: number[] = [];
  const g10: number[] = [];
  const cum = Array(12).fill(0);
  for (const [, days] of yrs) {
    let ls = 0;
    let fa = 0;
    let s0 = 0;
    let s10 = 0;
    let ok = true;
    const monthCum = Array(12).fill(0);
    for (const d of days) {
      if (d.tmin === null || d.tmax === null) {
        ok = false;
        continue;
      }
      const k = doy(d.date);
      if (d.tmin <= 0) {
        if (k < 182) ls = k;
        else if (!fa) fa = k;
      }
      const tm = (d.tmax + d.tmin) / 2;
      s0 += Math.max(0, tm);
      s10 += Math.max(0, tm - 10);
      monthCum[Number(d.date.slice(5, 7)) - 1] = s0;
    }
    if (!ok) continue;
    if (ls) spring.push(ls);
    if (fa) autumn.push(fa);
    g0.push(s0);
    g10.push(s10);
    for (let i = 0; i < 12; i++) cum[i] += monthCum[i];
  }
  const sp = [...spring].sort((a, b) => a - b);
  const au = [...autumn].sort((a, b) => a - b);
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return {
    lastSpring: sp.length ? { median: Math.round(quantile(sp, 0.5)), earliest: sp[0], latest: sp[sp.length - 1], p90: Math.round(quantile(sp, 0.9)) } : null,
    firstAutumn: au.length ? { median: Math.round(quantile(au, 0.5)), earliest: au[0], latest: au[au.length - 1], p10: Math.round(quantile(au, 0.1)) } : null,
    years: g0.length,
    gdd0: mean(g0),
    gdd10: mean(g10),
    gdd0Cum: g0.length ? cum.map((v) => v / g0.length) : [],
  };
}

export interface MoistureNow {
  date: string;
  value: number;
  /** Percentile of the value among the same ±7-day window in other years, 0–1. */
  percentile: number;
  bands: { p10: number; p25: number; p50: number; p75: number; p90: number };
  years: number;
  staleDays: number;
}

/** Last recorded root-zone wetness (POWER GWETROOT, 0–1) against the same time of year in the record. */
export function moistureNow(c: ClimateSeries, today = new Date()): MoistureNow | null {
  let last: ClimateSeries["daily"][number] | null = null;
  for (let i = c.daily.length - 1; i >= 0; i--) {
    if (c.daily[i].gwetRoot !== null) {
      last = c.daily[i];
      break;
    }
  }
  if (!last || last.gwetRoot === null) return null;
  const k = doy(last.date);
  const yLast = Number(last.date.slice(0, 4));
  const ref: number[] = [];
  const yearsSeen = new Set<number>();
  for (const d of c.daily) {
    if (d.gwetRoot === null) continue;
    const y = Number(d.date.slice(0, 4));
    if (y === yLast) continue;
    const dk = Math.abs(doy(d.date) - k);
    if (Math.min(dk, 365 - dk) <= 7) {
      ref.push(d.gwetRoot);
      yearsSeen.add(y);
    }
  }
  if (ref.length < 20) return null;
  ref.sort((a, b) => a - b);
  const below = ref.filter((v) => v < last!.gwetRoot!).length;
  const stale = Math.max(0, Math.round((today.getTime() - Date.parse(`${last.date}T00:00:00Z`)) / 86_400_000));
  return {
    date: last.date,
    value: last.gwetRoot,
    percentile: below / ref.length,
    bands: { p10: quantile(ref, 0.1), p25: quantile(ref, 0.25), p50: quantile(ref, 0.5), p75: quantile(ref, 0.75), p90: quantile(ref, 0.9) },
    years: yearsSeen.size,
    staleDays: stale,
  };
}

export interface NdviYears {
  /** Year → points (day of year, NDVI). */
  years: { year: number; pts: { doy: number; v: number }[] }[];
  median: { doy: number; v: number }[];
  last: { date: string; v: number } | null;
  /** Share of composites below 0.2 (bare soil) in the latest complete year. */
  bareShareLastYear: number | null;
}

export function ndviYears(s: NdviSeries, keep = 5): NdviYears {
  const by = new Map<number, { doy: number; v: number }[]>();
  for (const p of s.points) {
    const y = Number(p.date.slice(0, 4));
    let a = by.get(y);
    if (!a) by.set(y, (a = []));
    a.push({ doy: doy(p.date), v: p.ndvi });
  }
  const all = [...by.keys()].sort((a, b) => a - b);
  const years = all.slice(-keep).map((year) => ({ year, pts: by.get(year)!.sort((a, b) => a.doy - b.doy) }));
  // median by 16-day bin over the whole record
  const bins = new Map<number, number[]>();
  for (const [, pts] of by) for (const p of pts) {
    const b = Math.round(p.doy / 16);
    let a = bins.get(b);
    if (!a) bins.set(b, (a = []));
    a.push(p.v);
  }
  const median = [...bins.entries()].sort((a, b) => a[0] - b[0]).map(([b, v]) => ({ doy: b * 16, v: quantile([...v].sort((x, y) => x - y), 0.5) }));
  const lastP = s.points.at(-1);
  const fullYears = all.filter((y) => (by.get(y)?.length ?? 0) >= 20);
  const ly = fullYears.at(-1);
  const bare = ly !== undefined ? by.get(ly)!.filter((p) => p.v < 0.2).length / by.get(ly)!.length : null;
  return { years, median, last: lastP ? { date: lastP.date, v: lastP.ndvi } : null, bareShareLastYear: bare };
}

/** Day of year → "12 Nis" style label. */
export function doyLabel(k: number, lang: "tr" | "en"): string {
  const d = new Date(Date.UTC(2023, 0, 1) + (k - 1) * 86_400_000);
  return d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export function isoLabel(iso: string, lang: "tr" | "en", withYear = true): string {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" });
}

export const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
export const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthNames = (lang: "tr" | "en") => (lang === "tr" ? MONTHS_TR : MONTHS_EN);
