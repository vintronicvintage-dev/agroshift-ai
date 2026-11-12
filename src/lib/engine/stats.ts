import type { Dist } from "../types";

/** Percentile with linear interpolation between order statistics (Hyndman & Fan type 7). `sorted` must be ascending. */
export function percentileSorted(sorted: ArrayLike<number>, q: number): number {
  const n = sorted.length;
  if (n === 0) return NaN;
  if (n === 1) return sorted[0];
  const h = (n - 1) * q;
  const lo = Math.floor(h), hi = Math.ceil(h);
  return sorted[lo] + (h - lo) * (sorted[hi] - sorted[lo]);
}

/** P10/P50/P90/mean of finite values; null when there are none. */
export function dist(values: readonly number[]): Dist | null {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return null;
  let s = 0;
  for (const x of v) s += x;
  return {
    p10: percentileSorted(v, 0.1),
    p50: percentileSorted(v, 0.5),
    p90: percentileSorted(v, 0.9),
    mean: s / v.length,
    n: v.length,
  };
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  let s = 0;
  for (const x of values) s += x;
  return s / values.length;
}

export function median(values: readonly number[]): number {
  return percentileSorted([...values].sort((a, b) => a - b), 0.5);
}

export function round(x: number, d = 0): number {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}
