/**
 * Soil hydraulic properties from texture and runoff.
 * - Saxton, K.E. & Rawls, W.J. (2006) Soil water characteristic estimates by texture and
 *   organic matter for hydrologic solutions. SSSAJ 70:1569–1578 (Eq. 1–3, 5, 16).
 * - USDA texture triangle (Soil Survey Manual).
 * - USDA-NRCS TR-55 (1986) curve numbers, Table 2-2b; SCS-CN runoff equation.
 * - FAO-56 Table 19 readily evaporable water (REW).
 */
import type { CoverType, SoilHydraulics, SoilLayer, SoilLayerHydraulics, SoilProfile } from "../types";

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

/**
 * Saxton & Rawls (2006) density adjustment (Eq. 6–10): DF = measured bulk density / normal density
 * ρN = (1 − θS)·2.65 (clamped 0.9–1.3); θ33 is lowered by 0.2·(θS − θS,DF); θ1500 is unchanged.
 */
export function densityAdjust(sr: SaxtonRawlsResult, bulkDensity: number | null): { thetaFC: number; thetaWP: number; thetaSat: number; df: number | null } {
  if (bulkDensity == null || !Number.isFinite(bulkDensity) || bulkDensity <= 0) return { thetaFC: sr.thetaFC, thetaWP: sr.thetaWP, thetaSat: sr.thetaSat, df: null };
  const rhoN = (1 - sr.thetaSat) * 2.65;
  const df = Math.min(1.3, Math.max(0.9, bulkDensity / rhoN));
  const thetaSatDF = 1 - (rhoN * df) / 2.65;
  const thetaFC = Math.max(sr.thetaWP + 0.01, sr.thetaFC - 0.2 * (sr.thetaSat - thetaSatDF));
  return { thetaFC, thetaWP: sr.thetaWP, thetaSat: thetaSatDF, df };
}

/**
 * Piecewise-linear cumulative plant-available water of the soil column, TAW(z) in mm for depth z (m).
 * `uniform` is set for a homogeneous profile so that TAW(z) = uniform·z exactly (single-layer path).
 */
export interface TawProfile {
  /** Layer tops, m (bounds[0] = 0). */
  bounds: number[];
  /** Cumulative TAW at each layer top, mm. */
  cum: number[];
  /** TAW per metre of each layer, mm/m. */
  perM: number[];
  uniform: number | null;
}

export function uniformProfile(tawMmPerM: number): TawProfile {
  return { bounds: [0], cum: [0], perM: [tawMmPerM], uniform: tawMmPerM };
}

/** Cumulative TAW from the surface to depth z (m), mm. The deepest layer extends below its bottom. */
export function tawCum(p: TawProfile, z: number): number {
  if (p.uniform !== null) return p.uniform * z;
  const b = p.bounds;
  let i = b.length - 1;
  while (i > 0 && z < b[i]) i--;
  return p.cum[i] + p.perM[i] * (z - b[i]);
}

/**
 * Plausibility cap for SOC used in pedotransfer / erodibility, g/kg (≈ 5.2 % OM). Mineral arable
 * soils of Türkiye rarely exceed it; larger SoilGrids topsoil values (e.g. 52 g/kg at 0–5 cm) are
 * treated as artefacts, capped and flagged (assumption).
 */
export const SOC_PLAUSIBLE_MAX_GKG = 30;
export function capSoc(soc: number | null | undefined): number | null {
  if (soc == null || !Number.isFinite(soc)) return null;
  return Math.min(SOC_PLAUSIBLE_MAX_GKG, Math.max(0, soc));
}

/** OM % from SOC g/kg (van Bemmelen 1.724), SOC capped at SOC_PLAUSIBLE_MAX_GKG. */
export function omFromSoc(soc: number | null | undefined): number | null {
  const c = capSoc(soc);
  if (c === null) return null;
  return Math.min(8, (c / 10) * 1.724);
}

/**
 * Per-layer hydraulics. θ from measured wv0033/wv1500 when both are present, else Saxton–Rawls with
 * the density adjustment; both are converted to bulk soil with the coarse-fragment volume
 * (θ_bulk = θ_fine·(1 − Rv), Saxton & Rawls 2006 gravel correction; assumption that measured
 * values refer to the fine earth). Layers with missing texture copy the nearest layer above.
 */
export function layerHydraulics(layers: readonly SoilLayer[], fallback: SoilProfile): SoilLayerHydraulics[] {
  const sorted = [...layers].filter((l) => Number.isFinite(l.top) && Number.isFinite(l.bottom) && l.bottom > l.top).sort((a, b) => a.top - b.top);
  const out: SoilLayerHydraulics[] = [];
  let prev: SoilLayerHydraulics | null = null;
  for (const l of sorted) {
    const rv = Math.min(0.9, Math.max(0, (l.coarseFragments ?? 0) / 100));
    const om = omFromSoc(l.soc) ?? omFromSoc(fallback.soc) ?? DEFAULT_OM_PCT;
    let fc: number, wp: number, method: SoilLayerHydraulics["method"], df: number | null = null;
    if (l.thetaFC != null && l.thetaWP != null && Number.isFinite(l.thetaFC) && Number.isFinite(l.thetaWP) && l.thetaFC > l.thetaWP && l.thetaFC < 0.8) {
      fc = l.thetaFC; wp = l.thetaWP; method = "measured";
    } else if (l.sand != null && l.clay != null && Number.isFinite(l.sand) && Number.isFinite(l.clay)) {
      const silt = l.silt ?? Math.max(0, 100 - l.sand - l.clay);
      const tot = l.sand + silt + l.clay || 1;
      const sr = saxtonRawls((l.sand / tot) * 100, (l.clay / tot) * 100, om);
      const d = densityAdjust(sr, l.bulkDensity);
      fc = d.thetaFC; wp = d.thetaWP; df = d.df; method = "saxton-rawls";
    } else if (prev) {
      const f = 1 - prev.coarseFragmentsPct / 100;
      fc = prev.thetaFC / f; wp = prev.thetaWP / f; method = "extrapolated";
    } else {
      const tot = fallback.sand + fallback.silt + fallback.clay || 1;
      const sr = saxtonRawls((fallback.sand / tot) * 100, (fallback.clay / tot) * 100, om);
      fc = sr.thetaFC; wp = sr.thetaWP; method = "extrapolated";
    }
    const thetaFC = fc * (1 - rv), thetaWP = wp * (1 - rv);
    const h: SoilLayerHydraulics = {
      top: l.top, bottom: l.bottom, thetaFC, thetaWP, tawMmPerM: Math.max(20, 1000 * (thetaFC - thetaWP)),
      method, densityFactor: df, coarseFragmentsPct: rv * 100, organicMatterPct: om, ph: l.ph ?? null,
    };
    out.push(h);
    prev = h;
  }
  return out;
}

/** Build the TAW profile from layer hydraulics (first layer starts at 0 cm). */
export function profileFromLayers(layers: readonly SoilLayerHydraulics[]): TawProfile {
  if (layers.length === 0) return uniformProfile(100);
  const bounds: number[] = [], cum: number[] = [], perM: number[] = [];
  let c = 0;
  layers.forEach((l, i) => {
    // Contiguous by construction: a layer starts where the previous one ended (gaps are bridged by the layer below).
    const top = i === 0 ? 0 : layers[i - 1].bottom / 100;
    bounds.push(top); cum.push(c); perM.push(l.tawMmPerM);
    c += l.tawMmPerM * Math.max(0, l.bottom / 100 - top);
  });
  // Homogeneous profile → exact single-layer path.
  if (perM.every((x) => Math.abs(x - perM[0]) < 1e-12)) return uniformProfile(perM[0]);
  return { bounds, cum, perM, uniform: null };
}

/**
 * Slope adjustment of CN2 (Williams 1995, as in the SWAT Theoretical Documentation, Eq. 2:1.1.4 with
 * CN3 from Eq. 2:1.1.2): CN2s = (CN3 − CN2)/3 · (1 − 2·exp(−13.86·slp)) + CN2, slp in m/m.
 * TR-55 table values are taken as valid for a 5 % slope (CN2s = CN2 at 5 %).
 */
export function slopeAdjustedCN(cn2: number, slopePct: number): number {
  const slp = Math.max(0, slopePct) / 100;
  const cn3 = cn2 * Math.exp(0.00673 * (100 - cn2));
  return Math.min(98, Math.max(30, ((cn3 - cn2) / 3) * (1 - 2 * Math.exp(-13.86 * slp)) + cn2));
}

/**
 * USLE/RUSLE soil erodibility K (Williams 1995 EPIC equation, SWAT Theoretical Documentation
 * Eq. 4:1.1.5–9), t·ha·h/(ha·MJ·mm). sand/silt/clay %, organic carbon %.
 */
export function erodibilityK(sand: number, silt: number, clay: number, ocPct: number): number {
  const fcsand = 0.2 + 0.3 * Math.exp(-0.256 * sand * (1 - silt / 100));
  const fclsi = Math.pow(silt / Math.max(1e-6, clay + silt), 0.3);
  const forgc = 1 - (0.25 * ocPct) / (ocPct + Math.exp(3.72 - 2.95 * ocPct));
  const sn = 1 - sand / 100;
  const fhisand = 1 - (0.7 * sn) / (sn + Math.exp(-5.51 + 22.9 * sn));
  return fcsand * fclsi * forgc * fhisand * 0.1317;
}

/** Simulated soil column depth, m (kept equal to CROP_CONSTANTS.zColumnM, checked by a test). */
export const SOIL_COLUMN_M = 1.5;

/**
 * Derive everything the water balance needs from the soil profile.
 * @param layers optional layered profile (engine v2): layered TAW, depth-weighted θ, topsoil pH.
 * @param slopePct optional slope, %: curve numbers are slope-adjusted (TR-55 values valid at 5 %).
 */
export function soilHydraulics(soil: SoilProfile, layers?: readonly SoilLayer[] | null, slopePct?: number | null): SoilHydraulics {
  const textureClassComputed = usdaTextureClass(soil.sand, soil.silt, soil.clay);
  const organicMatterAssumed = soil.soc == null || !Number.isFinite(soil.soc);
  // Van Bemmelen factor 1.724: OM = 1.724 · SOC; SOC g/kg → % is /10.
  const organicMatterPct = organicMatterAssumed ? DEFAULT_OM_PCT : (omFromSoc(soil.soc) as number);
  let socCapped = !organicMatterAssumed && (soil.soc as number) > SOC_PLAUSIBLE_MAX_GKG;
  const tot = soil.sand + soil.silt + soil.clay || 1;
  const sr = saxtonRawls((soil.sand / tot) * 100, (soil.clay / tot) * 100, organicMatterPct);
  let tawMmPerM = Math.max(20, 1000 * (sr.thetaFC - sr.thetaWP));
  let thetaFC = sr.thetaFC, thetaWP = sr.thetaWP;
  const hsg = hydrologicGroup(textureClassComputed);
  const curveNumbersBase: Record<CoverType, number> = {
    row: CURVE_NUMBERS.row[hsg], small_grain: CURVE_NUMBERS.small_grain[hsg],
    close_legume: CURVE_NUMBERS.close_legume[hsg], bare: CURVE_NUMBERS.bare[hsg],
  };
  const slope = slopePct != null && Number.isFinite(slopePct) ? Math.max(0, slopePct) : null;
  const curveNumbers: Record<CoverType, number> = slope === null ? { ...curveNumbersBase } : {
    row: slopeAdjustedCN(curveNumbersBase.row, slope), small_grain: slopeAdjustedCN(curveNumbersBase.small_grain, slope),
    close_legume: slopeAdjustedCN(curveNumbersBase.close_legume, slope), bare: slopeAdjustedCN(curveNumbersBase.bare, slope),
  };
  const rewMm = REW_BY_TEXTURE[textureClassComputed] ?? 9;
  const sources = soil.sources.map((s) => s.name);
  const zCol = SOIL_COLUMN_M;
  let layerOut: SoilLayerHydraulics[] | undefined;
  let tawColumnMm = tawMmPerM * zCol;
  let phTopsoil: number | null = soil.ph ?? null;
  const evidence: SoilHydraulics["evidence"] = [
    {
      formula: "Saxton & Rawls (2006) Eq. 1–3, 5, 16; TAW/m = 1000·(θFC − θWP)",
      inputs: { sandPct: soil.sand, siltPct: soil.silt, clayPct: soil.clay, omPct: round(organicMatterPct, 2), soilOrigin: soil.origin },
      sources: ["Saxton & Rawls 2006", ...sources],
    },
    {
      formula: "SCS-CN runoff Q = (P − 0.2S)² / (P + 0.8S), S = 25400/CN − 254; CN from USDA TR-55 Table 2-2b" +
        (slope === null ? "" : "; slope-adjusted CN2s = (CN3 − CN2)/3·(1 − 2e^(−13.86·slp)) + CN2 (Williams 1995 / SWAT)"),
      inputs: { hydrologicGroup: hsg, texture: textureClassComputed, slopePct: slope },
      sources: ["USDA-NRCS TR-55 (1986)", ...(slope === null ? [] : ["Williams (1995) / SWAT Theoretical Documentation (Neitsch et al. 2011)"])],
    },
  ];
  if (layers && layers.length) {
    const lh = layerHydraulics(layers, soil);
    if (layers.some((l) => l.soc != null && l.soc > SOC_PLAUSIBLE_MAX_GKG)) socCapped = true;
    if (lh.length) {
      layerOut = lh;
      const prof = profileFromLayers(lh);
      tawColumnMm = tawCum(prof, zCol);
      tawMmPerM = tawColumnMm / zCol;
      let fcS = 0, wpS = 0, wS = 0, phS = 0, phW = 0;
      lh.forEach((l, i) => {
        const top = i === 0 ? 0 : l.top / 100;
        const bot = i === lh.length - 1 ? Math.max(zCol, l.bottom / 100) : l.bottom / 100;
        const w = Math.max(0, Math.min(bot, zCol) - Math.min(top, zCol));
        fcS += l.thetaFC * w; wpS += l.thetaWP * w; wS += w;
        const wTop = Math.max(0, Math.min(l.bottom, 30) - Math.min(l.top, 30));
        if (l.ph !== null && Number.isFinite(l.ph) && wTop > 0) { phS += l.ph * wTop; phW += wTop; }
      });
      if (wS > 0) { thetaFC = fcS / wS; thetaWP = wpS / wS; }
      if (phW > 0) phTopsoil = phS / phW;
      evidence.push({
        formula: "Layered TAW(z) = Σ 1000·(θFC,i − θWP,i)·Δz_i; θ from measured 33/1500 kPa water contents if present, else Saxton & Rawls with density factor (Eq. 6–10); × (1 − coarse-fragment volume)",
        inputs: Object.fromEntries(lh.map((l) => [`${l.top}-${l.bottom}cm`, `${round(l.tawMmPerM, 0)} mm/m (${l.method})`])),
        sources: ["Saxton & Rawls 2006", ...sources],
      });
    }
  }
  return {
    textureClassComputed,
    textureClassInput: soil.textureClass,
    organicMatterPct,
    organicMatterAssumed,
    thetaWP,
    thetaFC,
    thetaSat: sr.thetaSat,
    ksatMmH: sr.ksatMmH,
    tawMmPerM,
    hydrologicGroup: hsg,
    curveNumbers,
    rewMm,
    evidence,
    ...(layerOut ? { layers: layerOut } : {}),
    tawColumnMm,
    curveNumbersBase,
    slopePct: slope,
    socCapped,
    phTopsoil,
  };
}

/** TAW profile for the water balance: layered when layers are present, else uniform. */
export function tawProfileOf(h: SoilHydraulics): TawProfile {
  return h.layers && h.layers.length ? profileFromLayers(h.layers) : uniformProfile(h.tawMmPerM);
}

function round(x: number, d: number): number {
  const f = Math.pow(10, d);
  return Math.round(x * f) / f;
}
