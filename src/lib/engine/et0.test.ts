import { describe, it, expect } from "vitest";
import {
  atmosphericPressure, psychrometricConstant, satVaporPressure, slopeSatVaporCurve,
  extraterrestrialRadiation, daylightHours, clearSkyRadiation, netLongwave,
  actualVaporPressureFromRhMean, et0PenmanMonteith, et0Hargreaves, dayOfYear,
} from "./et0";

// Worked examples from FAO Irrigation and Drainage Paper 56 (Allen et al., 1998).
describe("FAO-56 intermediate equations", () => {
  it("Example 2: P and γ at 1800 m", () => {
    const P = atmosphericPressure(1800);
    expect(P).toBeCloseTo(81.8, 1);
    expect(psychrometricConstant(P)).toBeCloseTo(0.054, 3);
  });
  it("Example 3: saturation vapour pressure", () => {
    expect(satVaporPressure(24.5)).toBeCloseTo(3.075, 2);
    expect(satVaporPressure(15)).toBeCloseTo(1.705, 2);
  });
  it("Table 2.4: Δ at 20 °C ≈ 0.145 kPa/°C", () => {
    expect(slopeSatVaporCurve(20)).toBeCloseTo(0.145, 3);
  });
  it("Example 5: ea from RHmean", () => {
    // Tmax 25, Tmin 18, RHmean 68 % → ea ≈ 1.78 kPa
    expect(actualVaporPressureFromRhMean(68, 25, 18)).toBeCloseTo(1.78, 2);
  });
  it("Example 8 and 9: Ra and N at 20°S on 3 September", () => {
    const J = dayOfYear("2001-09-03");
    expect(J).toBe(246);
    expect(extraterrestrialRadiation(-20, J)).toBeCloseTo(32.2, 1);
    expect(daylightHours(-20, J)).toBeCloseTo(11.7, 1);
  });
  it("Example 11: net longwave radiation", () => {
    // Tmax 25.1, Tmin 19.1, ea 2.1, Rs 14.5, Rso 18.8 → Rnl ≈ 3.5
    expect(netLongwave(25.1, 19.1, 2.1, 14.5, 18.8)).toBeCloseTo(3.5, 1);
  });
  it("Example 17 (Bangkok, April) intermediate values", () => {
    // 13°44'N, 2 m, J=105, Tmax 34.8, Tmin 25.6
    const lat = 13 + 44 / 60;
    const Ra = extraterrestrialRadiation(lat, 105);
    expect(Ra).toBeCloseTo(38.06, 0);
    expect(daylightHours(lat, 105)).toBeCloseTo(12.31, 1);
    expect(slopeSatVaporCurve((34.8 + 25.6) / 2)).toBeCloseTo(0.246, 3);
    expect((satVaporPressure(34.8) + satVaporPressure(25.6)) / 2).toBeCloseTo(4.42, 2);
    const Rs = (0.25 + 0.5 * 8.5 / 12.31) * Ra;
    expect(Rs).toBeCloseTo(22.65, 0);
    const Rso = clearSkyRadiation(Ra, 2);
    // Book: Rnl = 3.11, Rns = 17.44, Rn = 14.33 MJ m⁻² day⁻¹
    expect(netLongwave(34.8, 25.6, 2.85, Rs, Rso)).toBeCloseTo(3.11, 1);
    expect(0.77 * Rs).toBeCloseTo(17.44, 0);
  });
});

describe("FAO-56 Example 18 — Brussels, 6 July (daily PM)", () => {
  // 50°48'N, 100 m, Tmax 21.5, Tmin 12.3, RHmax 84, RHmin 63 → RHmean 73.5,
  // u2 = 2.078 m/s, n = 9.25 h → Rs = 22.07 MJ/m²/d. Book ET0 = 3.9 mm/day.
  const res = et0PenmanMonteith({
    tmax: 21.5, tmin: 12.3, rhMean: 73.5, u2: 2.078, rs: 22.07,
    latDeg: 50 + 48 / 60, elevation: 100, doy: 187,
  });
  it("intermediates match the book", () => {
    expect(res.terms.P).toBeCloseTo(100.1, 1);
    expect(res.terms.gamma).toBeCloseTo(0.0666, 3);
    expect(res.terms.delta).toBeCloseTo(0.122, 3);
    expect(res.terms.es).toBeCloseTo(1.997, 2);
    expect(res.terms.ra).toBeCloseTo(41.09, 1);
    expect(res.terms.rso).toBeCloseTo(30.90, 1);
  });
  it("ET0 ≈ 3.9 mm/day (±0.15 for RHmean-derived ea)", () => {
    expect(Math.abs(res.et0 - 3.9)).toBeLessThanOrEqual(0.15);
  });
  it("Hargreaves gives the same order of magnitude", () => {
    const h = et0Hargreaves(21.5, 12.3, res.terms.ra);
    expect(h).toBeGreaterThan(2.5);
    expect(h).toBeLessThan(5.5);
  });
});

describe("ET0 monotonicity in temperature (spec §7)", () => {
  it("adding 0…4 °C never lowers daily ET0 over a synthetic year", () => {
    for (let doy = 1; doy <= 365; doy += 3) {
      // Test fixture: smooth synthetic mid-latitude year (not product data).
      const season = Math.cos((2 * Math.PI * (doy - 200)) / 365);
      const base = {
        tmax: 18 + 14 * season, tmin: 5 + 10 * season, rhMean: 60 - 15 * season,
        u2: 2, rs: 15 + 10 * season, latDeg: 38, elevation: 1000, doy,
      };
      let prev = et0PenmanMonteith(base).et0;
      for (let dT = 0.5; dT <= 4; dT += 0.5) {
        const cur = et0PenmanMonteith({ ...base, tmax: base.tmax + dT, tmin: base.tmin + dT }).et0;
        expect(cur).toBeGreaterThanOrEqual(prev - 1e-12);
        prev = cur;
      }
    }
  });
});
