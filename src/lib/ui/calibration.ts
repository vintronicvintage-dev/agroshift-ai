/**
 * Ground-truth rainfall calibration (pure, browser-safe).
 *
 * NASA POWER precipitation (MERRA-2 based) can be biased at a point: e.g. the Konya-Çumra
 * snapshot averages ~551 mm/yr while station climatology there is much lower. When the farmer
 * (or an extension officer) enters the long-term mean annual rainfall of a nearby station, the
 * daily precipitation series is multiplied by one constant factor
 *
 *     factor = station mean annual rainfall / POWER mean annual rainfall (complete calendar years)
 *
 * before the series is passed to the engine. This keeps the day-to-day pattern and the year-to-year
 * spread of the satellite/model record, and only corrects its level. Nothing else is changed.
 *
 * When the user does not enter a station mean, automatic basin calibration is applied using
 * long-term MGM (1991–2020) reference normals for Turkey's 7 primary agricultural basins.
 */
import type { ClimateSeries, SourceMeta } from "@/lib/types";
import {
  findNearestBasin,
  calculateBasinDeviation,
} from "@/lib/data/basinNormals";

export interface AnnualPrecipStats {
  /** Mean of annual totals over complete calendar years, mm/yr. null if no complete year. */
  meanMm: number | null;
  /** Complete calendar years used (every day present with non-null precipitation). */
  years: number[];
}

export type CalibrationMode = "user" | "basin";

export interface CalibrationInfo {
  mode: CalibrationMode;
  stationMeanMm: number;
  modelMeanMm: number;
  factor: number;
  years: number[];
  basinId?: string;
  basinNameTr?: string;
  basinNameEn?: string;
  stationName?: string;
  distanceKm?: number;
  monthlyFactors?: number[];
  modelMonthlyMm?: number[];
  stationMonthlyMm?: number[];
}

/** Lowest and highest station mean the UI accepts, mm/yr. */
export const STATION_MM_MIN = 20;
export const STATION_MM_MAX = 5000;

const daysInYear = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);

/** Mean annual precipitation over complete calendar years of the series. */
export function annualPrecipStats(c: Pick<ClimateSeries, "daily">): AnnualPrecipStats {
  const sums = new Map<number, { sum: number; n: number }>();
  for (const d of c.daily) {
    const y = Number(d.date.slice(0, 4));
    let e = sums.get(y);
    if (!e) {
      e = { sum: 0, n: 0 };
      sums.set(y, e);
    }
    if (d.precip !== null && Number.isFinite(d.precip)) {
      e.sum += d.precip;
      e.n += 1;
    }
  }
  const years: number[] = [];
  let total = 0;
  for (const [y, e] of [...sums.entries()].sort((a, b) => a[0] - b[0])) {
    if (e.n === daysInYear(y)) {
      years.push(y);
      total += e.sum;
    }
  }
  return { meanMm: years.length ? total / years.length : null, years };
}

/** Parse a user-typed station value ("320", "320,5", " 320 "). Returns null when empty or out of range. */
export function parseStationMm(raw: string): number | null {
  const s = raw.trim().replace(",", ".");
  if (s === "") return null;
  const v = Number(s);
  if (!Number.isFinite(v) || v < STATION_MM_MIN || v > STATION_MM_MAX) return null;
  return v;
}

/**
 * Calibration factor for a station mean or automatic nearest basin.
 * Prioritizes user-entered station mean when provided.
 * When `stationMeanMm` is null, automatically applies nearest agricultural basin calibration.
 */
export function calibrationFor(
  c: Pick<ClimateSeries, "daily"> & { lat?: number; lon?: number },
  stationMeanMm: number | null,
  coords?: { lat: number; lon: number } | null,
  options?: { autoBasin?: boolean },
): CalibrationInfo | null {
  if (stationMeanMm !== null && (!Number.isFinite(stationMeanMm) || stationMeanMm <= 0)) {
    return null;
  }

  const { meanMm, years } = annualPrecipStats(c);
  if (meanMm === null || meanMm <= 0) return null;

  // 1. User manual input takes priority
  if (stationMeanMm !== null && Number.isFinite(stationMeanMm) && stationMeanMm > 0) {
    return {
      mode: "user",
      stationMeanMm,
      modelMeanMm: meanMm,
      factor: stationMeanMm / meanMm,
      years,
    };
  }

  // 2. Automatic basin calibration
  if (options?.autoBasin === false) {
    return null;
  }

  const targetLat = coords?.lat ?? c.lat;
  const targetLon = coords?.lon ?? c.lon;

  // Return null if coordinates are not available or are dummy (0, 0 with no explicit coords)
  if (targetLat === undefined || targetLon === undefined || (targetLat === 0 && targetLon === 0 && !coords)) {
    return null;
  }

  const { basin, distanceKm } = findNearestBasin(targetLat, targetLon);
  const deviation = calculateBasinDeviation(c, basin, distanceKm);
  if (!deviation) return null;

  return {
    mode: "basin",
    stationMeanMm: basin.annualPrecipMm,
    modelMeanMm: deviation.modelAnnualPrecipMm,
    factor: deviation.annualFactor,
    years: deviation.years,
    basinId: basin.id,
    basinNameTr: basin.nameTr,
    basinNameEn: basin.nameEn,
    stationName: basin.stationName,
    distanceKm: deviation.distanceKm,
    monthlyFactors: deviation.monthlyStats.map((s) => s.precipFactor),
    modelMonthlyMm: deviation.monthlyStats.map((s) => s.modelPrecipMm),
    stationMonthlyMm: deviation.monthlyStats.map((s) => s.stationPrecipMm),
  };
}

/** Returns a new series with every non-null daily precipitation multiplied by `cal.factor`. Input is not mutated. */
export function applyPrecipCalibration(c: ClimateSeries, cal: CalibrationInfo): ClimateSeries {
  const f = cal.factor;
  const isUser = cal.mode === "user";
  const source: SourceMeta = {
    name: isUser
      ? "Station rainfall calibration (user input)"
      : `Otomatik Havza Kalibrasyonu (${cal.stationName ?? "MGM 1991–2020"})`,
    provider: isUser
      ? "User-entered long-term mean annual rainfall of a nearby station"
      : `${cal.stationName ?? "MGM 1991–2020 Normalleri"} (${cal.basinNameTr ?? "Tarım Havzası"})`,
    url: "/yontem#kalibrasyon",
    retrievedAt: isUser ? "user input" : "MGM 1991–2020 normals",
    spatialResolution: isUser ? "point (station)" : "basin representative station",
    note: isUser
      ? `Daily precipitation × ${f.toFixed(3)} = ${cal.stationMeanMm} mm / ${cal.modelMeanMm.toFixed(1)} mm (POWER mean of ${cal.years.length} complete years).`
      : `Daily precipitation × ${f.toFixed(3)} = ${cal.stationMeanMm} mm / ${cal.modelMeanMm.toFixed(1)} mm [Otomatik Havza: ${cal.basinNameTr ?? "MGM"}, mesafe: ${Math.round(cal.distanceKm ?? 0)} km, ${cal.years.length} tam yıl].`,
  };
  return {
    ...c,
    daily: c.daily.map((d) => (d.precip === null ? d : { ...d, precip: d.precip * f })),
    sources: [...c.sources, source],
  };
}
