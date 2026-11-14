import { describe, it, expect } from "vitest";
import { mannKendall, senSlope, normalCdf } from "./trends";

describe("Mann–Kendall and Sen slope on known series (spec §7)", () => {
  it("normal CDF reference values", () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.959964)).toBeCloseTo(0.975, 4);
    expect(normalCdf(-1.644854)).toBeCloseTo(0.05, 4);
  });
  it("strictly increasing 1..10: S = 45, Var = 125, Z = 3.935, p ≈ 8.3e-5, slope 1", () => {
    const y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const mk = mannKendall(y);
    expect(mk.s).toBe(45);
    expect(mk.varS).toBeCloseTo(125, 9);
    expect(mk.z).toBeCloseTo(44 / Math.sqrt(125), 6);
    expect(mk.p).toBeLessThan(1e-4);
    expect(mk.p).toBeGreaterThan(5e-5);
    const s = senSlope(y.map((_, i) => 2001 + i), y);
    expect(s.slope).toBe(1);
  });
  it("tie correction (Gilbert 1987 style)", () => {
    const y = [1, 1, 2, 2, 3];
    const mk = mannKendall(y);
    // pairs: S = 8; ties: two groups of 2 → Σ t(t−1)(2t+5) = 2·18 = 36
    expect(mk.s).toBe(8);
    expect(mk.varS).toBeCloseTo((5 * 4 * 15 - 36) / 18, 9);
  });
  it("a trendless alternating series is not significant", () => {
    const y = [5, 3, 5, 3, 5, 3, 5, 3, 5, 3, 5, 3];
    const mk = mannKendall(y);
    expect(mk.p).toBeGreaterThan(0.05);
  });
  it("decreasing series gives negative Z and slope", () => {
    const y = [10, 9.5, 9, 8.8, 7, 6.5, 6, 5, 4.2, 3];
    const mk = mannKendall(y);
    expect(mk.z).toBeLessThan(0);
    expect(mk.p).toBeLessThan(0.01);
    expect(senSlope(y.map((_, i) => i), y).slope).toBeLessThan(0);
  });
});
