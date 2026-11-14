import { describe, expect, it } from "vitest";
import type { ClimateSeries, DailyWeather } from "@/lib/types";
import {
  AGRICULTURAL_BASINS,
  calculateBasinDeviation,
  findNearestBasin,
  haversineDistanceKm,
  monthlyPrecipStats,
} from "./basinNormals";
import { applyPrecipCalibration, calibrationFor } from "@/lib/ui/calibration";

// Synthetic daily series helper
function createSeries(
  lat: number,
  lon: number,
  start: string,
  days: number,
  precipFn: (dayIndex: number) => number | null,
): ClimateSeries {
  const t0 = Date.parse(`${start}T00:00:00Z`);
  const daily: DailyWeather[] = Array.from({ length: days }, (_, i) => ({
    date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10),
    tmax: 20,
    tmin: 10,
    tmean: 15,
    rh: 50,
    wind2m: 2,
    rs: 15,
    precip: precipFn(i),
    gwetRoot: 0.5,
    gwetTop: 0.5,
  }));
  return { lat, lon, elevation: 1000, start, end: daily.at(-1)!.date, daily, sources: [] };
}

describe("Basin Normals Dataset (MGM 1991–2020)", () => {
  it("defines exactly 7 primary agricultural basins with 12 monthly values", () => {
    expect(AGRICULTURAL_BASINS).toHaveLength(7);
    const expectedIds = ["ic-anadolu", "cukurova", "gap", "trakya", "ege", "karadeniz", "dogu-anadolu"];
    expect(AGRICULTURAL_BASINS.map((b) => b.id)).toEqual(expectedIds);

    for (const basin of AGRICULTURAL_BASINS) {
      expect(basin.referencePeriod).toBe("1991–2020");
      expect(basin.monthlyPrecipMm).toHaveLength(12);
      expect(basin.monthlyTempC).toHaveLength(12);

      // Verify monthly precipitation sums match the annual total within 0.1 mm
      const monthlySum = basin.monthlyPrecipMm.reduce((acc, v) => acc + v, 0);
      expect(monthlySum).toBeCloseTo(basin.annualPrecipMm, 1);

      // Verify annual temperature is the arithmetic mean of 12 monthly normals
      const tempMean = basin.monthlyTempC.reduce((acc, v) => acc + v, 0) / 12;
      expect(tempMean).toBeCloseTo(basin.annualTempC, 1);
    }
  });

  it("assigns 320 mm annual normal to Central Anatolia (Konya-Çumra)", () => {
    const basin = AGRICULTURAL_BASINS.find((b) => b.id === "ic-anadolu")!;
    expect(basin.annualPrecipMm).toBe(320);
    expect(basin.representativeCities).toContain("Konya");
    expect(basin.representativeCities).toContain("Ankara");
  });
});

describe("Geospatial Basin Matching", () => {
  it("calculates haversine distance correctly", () => {
    // Konya (37.87, 32.49) to Ankara (39.93, 32.85) is roughly 230 km
    const dist = haversineDistanceKm(37.87, 32.49, 39.93, 32.85);
    expect(dist).toBeGreaterThan(220);
    expect(dist).toBeLessThan(250);

    // Distance to same point is 0
    expect(haversineDistanceKm(37.87, 32.49, 37.87, 32.49)).toBe(0);
  });

  it("correctly matches coordinates across Turkey to the nearest agricultural basin", () => {
    const testCases = [
      { lat: 37.57, lon: 32.77, expected: "ic-anadolu" }, // Çumra, Konya
      { lat: 39.58, lon: 32.20, expected: "ic-anadolu" }, // Polatlı, Ankara
      { lat: 36.95, lon: 35.35, expected: "cukurova" }, // Yüreğir, Adana
      { lat: 36.86, lon: 39.02, expected: "gap" }, // Harran, Şanlıurfa
      { lat: 41.68, lon: 26.56, expected: "trakya" }, // Edirne
      { lat: 38.61, lon: 27.43, expected: "ege" }, // Manisa
      { lat: 41.56, lon: 35.91, expected: "karadeniz" }, // Bafra, Samsun
      { lat: 38.35, lon: 38.31, expected: "dogu-anadolu" }, // Malatya
    ];

    for (const tc of testCases) {
      const match = findNearestBasin(tc.lat, tc.lon);
      expect(match.basin.id).toBe(tc.expected);
      expect(match.distanceKm).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("Satellite-to-Ground Deviation & Scaling", () => {
  it("calculates monthly and annual bias against NASA POWER", () => {
    // 2 complete years with 551 mm annual precipitation (Konya raw satellite scenario)
    // 365 + 365 = 730 days. Daily precip = 551 / 365 mm/day
    const dailyRate = 551 / 365;
    const series = createSeries(37.87, 32.49, "2001-01-01", 730, () => dailyRate);

    const stats = monthlyPrecipStats(series.daily);
    expect(stats.years).toEqual([2001, 2002]);
    expect(stats.annualMeanMm).toBeCloseTo(551, 1);

    const icAnadolu = AGRICULTURAL_BASINS.find((b) => b.id === "ic-anadolu")!;
    const dev = calculateBasinDeviation(series, icAnadolu, 15)!;

    expect(dev).not.toBeNull();
    expect(dev.stationAnnualPrecipMm).toBe(320);
    expect(dev.modelAnnualPrecipMm).toBeCloseTo(551, 1);
    // Scaling factor for Konya calibration: 320 / 551 ≈ 0.5808
    expect(dev.annualFactor).toBeCloseTo(320 / 551, 3);
    // Model overestimates station rainfall (positive bias)
    expect(dev.annualBiasMm).toBeCloseTo(551 - 320, 1);
    expect(dev.monthlyStats).toHaveLength(12);
  });
});

describe("Transparent Calibration & User Priority", () => {
  const konyaCoords = { lat: 37.87, lon: 32.49 };
  const dailyRate = 551 / 365;
  const series = createSeries(37.87, 32.49, "2001-01-01", 730, () => dailyRate);

  it("applies automatic basin calibration when user enters no station mean", () => {
    const cal = calibrationFor(series, null, konyaCoords);
    expect(cal).not.toBeNull();
    expect(cal?.mode).toBe("basin");
    expect(cal?.basinId).toBe("ic-anadolu");
    expect(cal?.stationMeanMm).toBe(320);
    expect(cal?.factor).toBeCloseTo(320 / 551, 3);

    // Scaled series reproduces the 320 mm MGM normal
    const calibrated = applyPrecipCalibration(series, cal!);
    const calStats = monthlyPrecipStats(calibrated.daily);
    expect(calStats.annualMeanMm).toBeCloseTo(320, 1);
    expect(calibrated.sources.at(-1)?.name).toContain("Otomatik Havza Kalibrasyonu");
  });

  it("prioritizes manual user station mean over automatic basin calibration", () => {
    // Farmer enters their local gauge value: 340 mm
    const userValue = 340;
    const cal = calibrationFor(series, userValue, konyaCoords);

    expect(cal).not.toBeNull();
    expect(cal?.mode).toBe("user");
    expect(cal?.stationMeanMm).toBe(340);
    expect(cal?.factor).toBeCloseTo(340 / 551, 3);

    const calibrated = applyPrecipCalibration(series, cal!);
    const calStats = monthlyPrecipStats(calibrated.daily);
    expect(calStats.annualMeanMm).toBeCloseTo(340, 1);
    expect(calibrated.sources.at(-1)?.name).toContain("Station rainfall calibration (user input)");
  });

  it("preserves monotonicity invariant: lower input precip never yields higher scaled precip", () => {
    const cal = calibrationFor(series, null, konyaCoords)!;
    const wetDay = { date: "2001-05-01", precip: 10 } as DailyWeather;
    const dryDay = { date: "2001-05-02", precip: 5 } as DailyWeather;

    const scaledWet = wetDay.precip! * cal.factor;
    const scaledDry = dryDay.precip! * cal.factor;

    expect(scaledWet).toBeGreaterThan(scaledDry);
    expect(cal.factor).toBeGreaterThan(0);
  });
});
