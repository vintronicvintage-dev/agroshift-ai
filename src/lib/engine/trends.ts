/**
 * Mann–Kendall trend test (with tie correction, normal approximation with continuity
 * correction, two-sided p) and Sen's slope estimator.
 * Mann (1945), Kendall (1975), Sen (1968); Gilbert (1987) Ch. 16.
 */

export interface MannKendall { s: number; varS: number; z: number; p: number; n: number }

/** Standard normal CDF via the Abramowitz & Stegun 7.1.26 erf approximation (|ε| < 1.5e-7). */
export function normalCdf(x: number): number {
  const z = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * z);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z);
  return x >= 0 ? 0.5 * (1 + y) : 0.5 * (1 - y);
}

export function mannKendall(values: readonly number[]): MannKendall {
  const x = values.filter((v) => Number.isFinite(v));
  const n = x.length;
  let s = 0;
  for (let i = 0; i < n - 1; i++) for (let j = i + 1; j < n; j++) s += Math.sign(x[j] - x[i]);
  // Tie correction
  const counts = new Map<number, number>();
  for (const v of x) counts.set(v, (counts.get(v) ?? 0) + 1);
  let tie = 0;
  for (const t of counts.values()) if (t > 1) tie += t * (t - 1) * (2 * t + 5);
  const varS = (n * (n - 1) * (2 * n + 5) - tie) / 18;
  let z = 0;
  if (varS > 0) z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = n < 3 ? 1 : 2 * (1 - normalCdf(Math.abs(z)));
  return { s, varS, z, p: Math.min(1, Math.max(0, p)), n };
}

/** Sen's slope (median of pairwise slopes) and intercept (median of y − slope·x). */
export function senSlope(xs: readonly number[], ys: readonly number[]): { slope: number; intercept: number } {
  const slopes: number[] = [];
  for (let i = 0; i < xs.length - 1; i++)
    for (let j = i + 1; j < xs.length; j++)
      if (xs[j] !== xs[i]) slopes.push((ys[j] - ys[i]) / (xs[j] - xs[i]));
  if (slopes.length === 0) return { slope: 0, intercept: ys.length ? ys[0] : 0 };
  slopes.sort((a, b) => a - b);
  const mid = (a: number[]) => (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2);
  const slope = mid(slopes);
  const intercepts = ys.map((y, i) => y - slope * xs[i]).sort((a, b) => a - b);
  return { slope, intercept: mid(intercepts) };
}
