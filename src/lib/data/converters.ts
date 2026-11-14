// Pure converters: unit handling, fill values, soil depth averaging, USDA texture class.
import type { DailyWeather } from "@/lib/types";

export const POWER_FILL = -999;
export const KWH_TO_MJ = 3.6;

/** POWER fill value (-999) and non-finite values become null. */
export function powerValue(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (v <= POWER_FILL + 0.5) return null;
  return v;
}

export type RsUnitResult = { factor: number; note?: string };

/** Verify ALLSKY_SFC_SW_DWN units from the POWER header. Throws on anything unexpected. */
export function solarUnitFactor(units: string | undefined): RsUnitResult {
  const u = (units ?? "").replace(/\s+/g, "").toLowerCase();
  if (u === "mj/m^2/day" || u === "mj/m2/day" || u === "mj/m²/day") return { factor: 1 };
  if (u === "kwh-hr/m^2/day" || u === "kwh/m^2/day" || u === "kw-hr/m^2/day" || u === "kwh/m2/day") {
    return { factor: KWH_TO_MJ, note: `ALLSKY_SFC_SW_DWN delivered as ${units}; converted to MJ/m²/day by x3.6.` };
  }
  throw new Error(`Unexpected ALLSKY_SFC_SW_DWN unit from NASA POWER: "${units}" (expected MJ/m^2/day)`);
}

const EXPECTED_UNITS: Record<string, string[]> = {
  T2M_MAX: ["c"],
  T2M_MIN: ["c"],
  T2M: ["c"],
  RH2M: ["%"],
  WS2M: ["m/s"],
  PRECTOTCORR: ["mm/day"],
  GWETROOT: ["1"],
  GWETTOP: ["1"],
};

const OPTIONAL_UNITS: Record<string, string[]> = {
  GWETPROF: ["1"],
};

export function assertPowerUnits(parameters: Record<string, { units?: string }>): RsUnitResult {
  for (const [k, ok] of Object.entries(EXPECTED_UNITS)) {
    const u = (parameters[k]?.units ?? "").trim().toLowerCase();
    if (!ok.includes(u)) throw new Error(`Unexpected unit for ${k} from NASA POWER: "${parameters[k]?.units}"`);
  }
  for (const [k, ok] of Object.entries(OPTIONAL_UNITS)) {
    if (parameters[k] === undefined) continue;
    const u = (parameters[k]?.units ?? "").trim().toLowerCase();
    if (!ok.includes(u)) throw new Error(`Unexpected unit for ${k} from NASA POWER: "${parameters[k]?.units}"`);
  }
  return solarUnitFactor(parameters.ALLSKY_SFC_SW_DWN?.units);
}

export const POWER_PARAMS = [
  "T2M_MAX",
  "T2M_MIN",
  "T2M",
  "RH2M",
  "WS2M",
  "ALLSKY_SFC_SW_DWN",
  "PRECTOTCORR",
  "GWETROOT",
  "GWETPROF",
  "GWETTOP",
] as const;

export interface PowerResponse {
  geometry?: { coordinates?: number[] };
  properties?: { parameter?: Record<string, Record<string, number>> };
  parameters?: Record<string, { units?: string }>;
}

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d;

function allNull(d: DailyWeather): boolean {
  return (
    d.tmax === null &&
    d.tmin === null &&
    d.tmean === null &&
    d.rh === null &&
    d.wind2m === null &&
    d.rs === null &&
    d.precip === null &&
    d.gwetRoot === null &&
    d.gwetTop === null
  );
}

/** Convert a POWER daily response to DailyWeather[] (fill -> null, units asserted). Trailing all-null days are trimmed. */
export function powerToDaily(resp: PowerResponse): { daily: DailyWeather[]; elevation: number; unitNote?: string } {
  if (!resp.properties?.parameter || !resp.parameters) throw new Error("Malformed NASA POWER response");
  const { factor, note } = assertPowerUnits(resp.parameters);
  const p = resp.properties.parameter;
  const dates = Object.keys(p.T2M ?? p.PRECTOTCORR ?? {}).sort();
  const daily: DailyWeather[] = dates.map((k) => {
    const rs = powerValue(p.ALLSKY_SFC_SW_DWN?.[k]);
    return {
      date: `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`,
      tmax: powerValue(p.T2M_MAX?.[k]),
      tmin: powerValue(p.T2M_MIN?.[k]),
      tmean: powerValue(p.T2M?.[k]),
      rh: powerValue(p.RH2M?.[k]),
      wind2m: powerValue(p.WS2M?.[k]),
      rs: rs === null ? null : round(rs * factor, 3),
      precip: powerValue(p.PRECTOTCORR?.[k]),
      gwetRoot: powerValue(p.GWETROOT?.[k]),
      gwetTop: powerValue(p.GWETTOP?.[k]),
      gwetProf: p.GWETPROF ? powerValue(p.GWETPROF[k]) : null,
    };
  });
  while (daily.length && allNull(daily[daily.length - 1])) daily.pop();
  const elevation = resp.geometry?.coordinates?.[2];
  if (typeof elevation !== "number") throw new Error("NASA POWER response has no elevation");
  return { daily, elevation, unitNote: note };
}

// ---------- MODIS ----------
export const NDVI_SCALE = 0.0001;
export const NDVI_FILL = -3000;

/** Apply scale + fill + reliability filter. Reliability 0 (good) and 1 (marginal) kept; 2 snow/ice, 3 cloudy, -1 fill dropped. */
export function modisNdvi(raw: number | null | undefined, reliability: number | null | undefined): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  if (raw === NDVI_FILL || raw < -2000 || raw > 10000) return null;
  if (reliability !== 0 && reliability !== 1) return null;
  return Math.round(raw * NDVI_SCALE * 10000) / 10000;
}

// ---------- SoilGrids ----------
export const SOILGRIDS_DEPTHS = [
  { label: "0-5cm", thickness: 5 },
  { label: "5-15cm", thickness: 10 },
  { label: "15-30cm", thickness: 15 },
] as const;

/** Documented d_factor: sand/silt/clay g/kg -> % (/10), soc dg/kg -> g/kg (/10), phh2o pH*10 -> pH (/10). */
export const SOILGRIDS_DFACTOR = 10;

export function soilgridsConvert(mapped: number | null | undefined): number | null {
  if (typeof mapped !== "number" || !Number.isFinite(mapped)) return null;
  return mapped / SOILGRIDS_DFACTOR;
}

/** Thickness-weighted mean of per-layer values; null if any layer is missing. */
export function weightedDepthMean(values: (number | null)[], thickness: readonly number[]): number | null {
  if (values.length !== thickness.length || values.some((v) => v === null)) return null;
  const tot = thickness.reduce((a, b) => a + b, 0);
  return (values as number[]).reduce((s, v, i) => s + v * thickness[i], 0) / tot;
}

/** USDA texture triangle classification (sand, silt, clay in %). Inputs are renormalised to sum to 100. */
export function classifyTexture(sandIn: number, siltIn: number, clayIn: number): string {
  const tot = sandIn + siltIn + clayIn;
  if (!(tot > 0)) throw new Error("Invalid texture fractions");
  const sand = (sandIn / tot) * 100;
  const silt = (siltIn / tot) * 100;
  const clay = (clayIn / tot) * 100;
  if (silt + 1.5 * clay < 15) return "sand";
  if (silt + 1.5 * clay >= 15 && silt + 2 * clay < 30) return "loamy sand";
  if ((clay >= 7 && clay < 20 && sand > 52 && silt + 2 * clay >= 30) || (clay < 7 && silt < 50 && silt + 2 * clay >= 30))
    return "sandy loam";
  if (clay >= 7 && clay < 27 && silt >= 28 && silt < 50 && sand <= 52) return "loam";
  if ((silt >= 50 && clay >= 12 && clay < 27) || (silt >= 50 && silt < 80 && clay < 12)) return "silt loam";
  if (silt >= 80 && clay < 12) return "silt";
  if (clay >= 20 && clay < 35 && silt < 28 && sand > 45) return "sandy clay loam";
  if (clay >= 27 && clay < 40 && sand > 20 && sand <= 45) return "clay loam";
  if (clay >= 27 && clay < 40 && sand <= 20) return "silty clay loam";
  if (clay >= 35 && sand > 45) return "sandy clay";
  if (clay >= 40 && silt >= 40) return "silty clay";
  if (clay >= 40 && sand <= 45 && silt < 40) return "clay";
  return "loam";
}
