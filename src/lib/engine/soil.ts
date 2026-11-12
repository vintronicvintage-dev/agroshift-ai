/**
 * Soil hydraulic properties from texture and runoff.
 * - Saxton, K.E. & Rawls, W.J. (2006) Soil water characteristic estimates by texture and
 *   organic matter for hydrologic solutions. SSSAJ 70:1569–1578 (Eq. 1–3, 5, 16).
 * - USDA texture triangle (Soil Survey Manual).
 * - USDA-NRCS TR-55 (1986) curve numbers, Table 2-2b; SCS-CN runoff equation.
 * - FAO-56 Table 19 readily evaporable water (REW).
 */
import type { CoverType, SoilHydraulics, SoilProfile } from "../types";

export interface SaxtonRawlsResult {
  thetaWP: number; thetaFC: number; thetaSat: number; ksatMmH: number;
}

/**
 * Saxton & Rawls (2006) Eq. 1–3, 5, 16.
 * @param sandPct sand %, @param clayPct clay %, @param omPct organic matter % (valid ≤ 8 %).
 */
export function saxtonRawls(sandPct: number, clayPct: number, omPct: number): SaxtonRawlsResult {
  const S = sandPct / 100;
  const C = clayPct / 100;
  const OM = Math.min(8, Math.max(0, omPct));
  const t1500t = -0.024 * S + 0.487 * C + 0.006 * OM + 0.005 * S * OM - 0.013 * C * OM + 0.068 * S * C + 0.031;
  const thetaWP = t1500t + (0.14 * t1500t - 0.02);
  const t33t = -0.251 * S + 0.195 * C + 0.011 * OM + 0.006 * S * OM - 0.027 * C * OM + 0.452 * S * C + 0.299;
  const thetaFC = t33t + (1.283 * t33t * t33t - 0.374 * t33t - 0.015);
  const tS33t = 0.278 * S + 0.034 * C + 0.022 * OM - 0.018 * S * OM - 0.027 * C * OM - 0.584 * S * C + 0.078;
  const thetaS33 = tS33t + (0.636 * tS33t - 0.107);
  const thetaSat = thetaFC + thetaS33 - 0.097 * S + 0.043;
  const B = (Math.log(1500) - Math.log(33)) / (Math.log(thetaFC) - Math.log(thetaWP));
  const lambda = 1 / B;
  const ksatMmH = 1930 * Math.pow(Math.max(0, thetaSat - thetaFC), 3 - lambda);
  return { thetaWP, thetaFC, thetaSat, ksatMmH };
}

/** USDA soil texture class from sand/silt/clay % (normalised to 100). */
export function usdaTextureClass(sand: number, silt: number, clay: number): string {
  const tot = sand + silt + clay || 1;
  const sa = (sand / tot) * 100, si = (silt / tot) * 100, cl = (clay / tot) * 100;
  if (si + 1.5 * cl < 15) return "sand";
  if (si + 2 * cl < 30) return "loamy sand";
  if (cl >= 40 && si >= 40) return "silty clay";
  if (cl >= 40 && sa <= 45) return "clay";
  if (cl >= 35 && sa > 45) return "sandy clay";
  if (cl >= 27 && cl < 40 && sa <= 20) return "silty clay loam";
  if (cl >= 27 && cl < 40 && sa > 20 && sa <= 45) return "clay loam";
  if (cl >= 20 && cl < 35 && si < 28 && sa > 45) return "sandy clay loam";
  if (si >= 80 && cl < 12) return "silt";
  if ((si >= 50 && cl >= 12 && cl < 27) || (si >= 50 && si < 80 && cl < 12)) return "silt loam";
  if (cl >= 7 && cl < 27 && si >= 28 && si < 50 && sa <= 52) return "loam";
  return "sandy loam";
}

/** Hydrologic soil group from texture class (approximate mapping after Rawls et al., 1983). */
export function hydrologicGroup(texture: string): "A" | "B" | "C" | "D" {
  switch (texture) {
    case "sand": case "loamy sand": return "A";
    case "sandy loam": case "loam": case "silt loam": case "silt": return "B";
    case "sandy clay loam": case "clay loam": case "silty clay loam": return "C";
    default: return "D";
  }
}

/** USDA TR-55 Table 2-2b, straight row, good hydrologic condition (bare = fallow, bare soil). */
export const CURVE_NUMBERS: Record<CoverType, Record<"A" | "B" | "C" | "D", number>> = {
  row: { A: 67, B: 78, C: 85, D: 89 },
  small_grain: { A: 63, B: 75, C: 83, D: 87 },
  close_legume: { A: 58, B: 72, C: 81, D: 85 },
  bare: { A: 77, B: 86, C: 91, D: 94 },
};

/** SCS-CN runoff (mm) for a daily rainfall P (mm), Ia = 0.2 S. */
export function scsRunoff(P: number, CN: number): number {
  const S = 25400 / CN - 254;
  const Ia = 0.2 * S;
  if (P <= Ia) return 0;
  const x = P - Ia;
  return (x * x) / (x + S);
}

/** FAO-56 Table 19, mid-points of REW ranges (mm). */
const REW_BY_TEXTURE: Record<string, number> = {
  "sand": 4.5, "loamy sand": 6, "sandy loam": 8, "loam": 9, "silt loam": 9.5, "silt": 9.5,
  "silty clay loam": 9.5, "silty clay": 10, "clay": 10, "sandy clay loam": 9, "clay loam": 9.5, "sandy clay": 10,
};

/** Organic matter used when SOC is unknown (flagged as an assumption). */
export const DEFAULT_OM_PCT = 1.0;

/** Derive everything the water balance needs from the soil profile. */
export function soilHydraulics(soil: SoilProfile): SoilHydraulics {
  const textureClassComputed = usdaTextureClass(soil.sand, soil.silt, soil.clay);
  const organicMatterAssumed = soil.soc == null || !Number.isFinite(soil.soc);
  // Van Bemmelen factor 1.724: OM = 1.724 · SOC; SOC g/kg → % is /10.
  const organicMatterPct = organicMatterAssumed ? DEFAULT_OM_PCT : Math.min(8, ((soil.soc as number) / 10) * 1.724);
  const tot = soil.sand + soil.silt + soil.clay || 1;
  const sr = saxtonRawls((soil.sand / tot) * 100, (soil.clay / tot) * 100, organicMatterPct);
  const tawMmPerM = Math.max(20, 1000 * (sr.thetaFC - sr.thetaWP));
  const hsg = hydrologicGroup(textureClassComputed);
  const curveNumbers: Record<CoverType, number> = {
    row: CURVE_NUMBERS.row[hsg], small_grain: CURVE_NUMBERS.small_grain[hsg],
    close_legume: CURVE_NUMBERS.close_legume[hsg], bare: CURVE_NUMBERS.bare[hsg],
  };
  const rewMm = REW_BY_TEXTURE[textureClassComputed] ?? 9;
  const sources = soil.sources.map((s) => s.name);
  return {
    textureClassComputed,
    textureClassInput: soil.textureClass,
    organicMatterPct,
    organicMatterAssumed,
    thetaWP: sr.thetaWP,
    thetaFC: sr.thetaFC,
    thetaSat: sr.thetaSat,
    ksatMmH: sr.ksatMmH,
    tawMmPerM,
    hydrologicGroup: hsg,
    curveNumbers,
    rewMm,
    evidence: [
      {
        formula: "Saxton & Rawls (2006) Eq. 1–3, 5, 16; TAW/m = 1000·(θFC − θWP)",
        inputs: { sandPct: soil.sand, siltPct: soil.silt, clayPct: soil.clay, omPct: round(organicMatterPct, 2), soilOrigin: soil.origin },
        sources: ["Saxton & Rawls 2006", ...sources],
      },
      {
        formula: "SCS-CN runoff Q = (P − 0.2S)² / (P + 0.8S), S = 25400/CN − 254; CN from USDA TR-55 Table 2-2b",
        inputs: { hydrologicGroup: hsg, texture: textureClassComputed },
        sources: ["USDA-NRCS TR-55 (1986)"],
      },
    ],
  };
}

function round(x: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}
