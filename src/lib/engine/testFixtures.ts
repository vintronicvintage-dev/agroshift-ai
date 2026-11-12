/**
 * TEST FIXTURES ONLY — synthetic, deterministic weather for unit tests.
 * Never used by the product: the engine only consumes ClimateSeries from the data layer.
 */
import type { ClimateSeries, DailyWeather, SoilProfile } from "../types";
import { extraterrestrialRadiation } from "./et0";
import { fromEpochDay, epochDayOf } from "./dates";

/** Small deterministic LCG (Numerical Recipes constants). */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return (s + 0.5) / 4294967296;
  };
}

export interface SyntheticOptions {
  startYear?: number;
  endYear?: number;
  lat?: number;
  lon?: number;
  elevation?: number;
  /** Mean rain amount on a wet day, mm. */
  wetDayMm?: number;
  meanTemp?: number;
  seed?: number;
}

/** Synthetic continental climate (cold wet winters, hot dry summers). TEST FIXTURE. */
export function syntheticClimate(o: SyntheticOptions = {}): ClimateSeries {
  const startYear = o.startYear ?? 2001, endYear = o.endYear ?? 2024;
  const lat = o.lat ?? 37.6, lon = o.lon ?? 32.8, elevation = o.elevation ?? 1000;
  const wet = o.wetDayMm ?? 4.5, tm = o.meanTemp ?? 11.5;
  const rnd = lcg(o.seed ?? 42);
  const d0 = epochDayOf(startYear, 1, 1), d1 = epochDayOf(endYear, 12, 31);
  const daily: DailyWeather[] = [];
  let yearShift = 0;
  for (let day = d0; day <= d1; day++) {
    const date = fromEpochDay(day);
    const doy = day - epochDayOf(Number(date.slice(0, 4)), 1, 1) + 1;
    if (doy === 1) yearShift = (rnd() - 0.5) * 2; // inter-annual temperature anomaly
    const s = Math.sin((2 * Math.PI * (doy - 105)) / 365);
    const tmean = tm + 12 * s + yearShift + (rnd() - 0.5) * 4;
    const range = 12 + 3 * s;
    const pWet = 0.22 + 0.16 * Math.cos((2 * Math.PI * (doy - 20)) / 365);
    const isWet = rnd() < pWet;
    const precip = isWet ? -Math.log(1 - rnd() * 0.999) * wet : 0;
    const ra = extraterrestrialRadiation(lat, doy);
    daily.push({
      date,
      tmax: tmean + range / 2,
      tmin: tmean - range / 2,
      tmean,
      rh: Math.min(95, Math.max(20, 62 - 20 * s + (isWet ? 15 : 0))),
      wind2m: 1.8 + rnd(),
      rs: ra * (isWet ? 0.4 : 0.68),
      precip,
      gwetRoot: Math.min(0.9, Math.max(0.2, 0.5 - 0.2 * s)),
      gwetTop: Math.min(0.9, Math.max(0.1, 0.45 - 0.25 * s)),
    });
  }
  return {
    lat, lon, elevation,
    start: fromEpochDay(d0), end: fromEpochDay(d1),
    daily,
    sources: [{ name: "Synthetic test fixture", provider: "unit tests", url: "", retrievedAt: "n/a", spatialResolution: "n/a" }],
  };
}

export const LOAM_SOIL: SoilProfile = {
  sand: 35, silt: 40, clay: 25, soc: 10, ph: 7.8, textureClass: "loam", origin: "user",
  sources: [{ name: "Test soil", provider: "unit tests", url: "", retrievedAt: "n/a", spatialResolution: "n/a" }],
};
