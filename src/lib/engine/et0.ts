/**
 * Reference evapotranspiration, FAO Irrigation and Drainage Paper 56 (Allen et al., 1998).
 * Equation numbers refer to that document. All functions are pure.
 */
import { toEpochDay } from "./dates";

/** Stefan–Boltzmann constant, MJ K⁻⁴ m⁻² day⁻¹. */
export const SIGMA = 4.903e-9;
/** Solar constant, MJ m⁻² min⁻¹. */
export const GSC = 0.082;
/** Albedo of the hypothetical grass reference crop. */
export const ALBEDO = 0.23;

/** Day of year (1–366) of a "YYYY-MM-DD" string. */
export function dayOfYear(date: string): number {
  return toEpochDay(date) - toEpochDay(`${date.slice(0, 4)}-01-01`) + 1;
}

/** Eq. 7 — atmospheric pressure, kPa, from elevation z (m). */
export function atmosphericPressure(z: number): number {
  return 101.3 * Math.pow((293 - 0.0065 * z) / 293, 5.26);
}

/** Eq. 8 — psychrometric constant γ, kPa/°C. */
export function psychrometricConstant(P: number): number {
  return 0.000665 * P;
}

/** Eq. 11 — saturation vapour pressure e°(T), kPa. */
export function satVaporPressure(T: number): number {
  return 0.6108 * Math.exp((17.27 * T) / (T + 237.3));
}

/** Eq. 13 — slope of the saturation vapour pressure curve Δ, kPa/°C. */
export function slopeSatVaporCurve(T: number): number {
  const t = T + 237.3;
  return (4098 * satVaporPressure(T)) / (t * t);
}

/** Eq. 19 — actual vapour pressure from RHmean (no RHmax/RHmin available), kPa. */
export function actualVaporPressureFromRhMean(rhMean: number, tmax: number, tmin: number): number {
  return (rhMean / 100) * ((satVaporPressure(tmax) + satVaporPressure(tmin)) / 2);
}

/** Eq. 21–25 — extraterrestrial radiation Ra, MJ m⁻² day⁻¹. */
export function extraterrestrialRadiation(latDeg: number, doy: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const decl = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))));
  return ((24 * 60) / Math.PI) * GSC * dr *
    (ws * Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.sin(ws));
}

/** Eq. 34 — daylight hours N. */
export function daylightHours(latDeg: number, doy: number): number {
  const phi = (latDeg * Math.PI) / 180;
  const decl = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))));
  return (24 / Math.PI) * ws;
}

/** Eq. 37 — clear-sky solar radiation Rso, MJ m⁻² day⁻¹. */
export function clearSkyRadiation(ra: number, z: number): number {
  return (0.75 + 2e-5 * z) * ra;
}

/** Eq. 39 — net longwave radiation Rnl, MJ m⁻² day⁻¹. Rs/Rso is capped at 1. */
export function netLongwave(tmax: number, tmin: number, ea: number, rs: number, rso: number): number {
  const tk4 = (Math.pow(tmax + 273.16, 4) + Math.pow(tmin + 273.16, 4)) / 2;
  const ratio = rso > 0 ? Math.min(1, Math.max(0, rs / rso)) : 0.5;
  return SIGMA * tk4 * (0.34 - 0.14 * Math.sqrt(Math.max(0, ea))) * (1.35 * ratio - 0.35);
}

export interface Et0Input {
  tmax: number; tmin: number;
  /** Mean relative humidity, %. */
  rhMean: number;
  /** Wind speed at 2 m, m/s. */
  u2: number;
  /** Incoming shortwave radiation, MJ m⁻² day⁻¹. */
  rs: number;
  latDeg: number; elevation: number; doy: number;
}

export interface Et0Result {
  et0: number;
  terms: {
    P: number; gamma: number; delta: number; es: number; ea: number;
    ra: number; rso: number; rns: number; rnl: number; rn: number;
  };
}

/**
 * Eq. 6 — FAO-56 Penman–Monteith daily reference ET₀ (mm/day) with G = 0.
 * Tmean = (Tmax+Tmin)/2 as FAO-56 prescribes for daily steps. ea from RHmean (Eq. 19).
 * Result is clamped at ≥ 0 (negative values only occur with negative Rn on cold days).
 */
export function et0PenmanMonteith(i: Et0Input): Et0Result {
  const P = atmosphericPressure(i.elevation);
  const gamma = psychrometricConstant(P);
  const tmean = (i.tmax + i.tmin) / 2;
  const delta = slopeSatVaporCurve(tmean);
  const es = (satVaporPressure(i.tmax) + satVaporPressure(i.tmin)) / 2;
  const ea = (i.rhMean / 100) * es;
  const ra = extraterrestrialRadiation(i.latDeg, i.doy);
  const rso = clearSkyRadiation(ra, i.elevation);
  const rns = (1 - ALBEDO) * i.rs;
  const rnl = netLongwave(i.tmax, i.tmin, ea, i.rs, rso);
  const rn = rns - rnl;
  const num = 0.408 * delta * rn + gamma * (900 / (tmean + 273)) * i.u2 * (es - ea);
  const den = delta + gamma * (1 + 0.34 * i.u2);
  return { et0: Math.max(0, num / den), terms: { P, gamma, delta, es, ea, ra, rso, rns, rnl, rn } };
}

/** Eq. 52 — Hargreaves ET₀ (mm/day); Ra in MJ m⁻² day⁻¹ is converted with 0.408. */
export function et0Hargreaves(tmax: number, tmin: number, ra: number): number {
  const tmean = (tmax + tmin) / 2;
  return Math.max(0, 0.0023 * (tmean + 17.8) * Math.sqrt(Math.max(0, tmax - tmin)) * 0.408 * ra);
}
