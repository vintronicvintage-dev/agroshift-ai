// SoilGrids v2.0 six-layer profile (GlobalSoilMap depths) + WRB reference soil group. Server-side only.
import type { SoilLayer, SoilProfile } from "@/lib/types";
import { classifyTexture, weightedDepthMean } from "./converters";
import { errMsg, fetchJson } from "./http";
import { defaultSoil, neighbourOffsets, soilSourceMeta, type SoilOpts } from "./soilgrids";

const URL_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query";
const CLASS_URL = "https://rest.isric.org/soilgrids/v2.0/classification/query";

export const SOIL_LAYER_DEPTHS = [
  { label: "0-5cm", top: 0, bottom: 5 },
  { label: "5-15cm", top: 5, bottom: 15 },
  { label: "15-30cm", top: 15, bottom: 30 },
  { label: "30-60cm", top: 30, bottom: 60 },
  { label: "60-100cm", top: 60, bottom: 100 },
  { label: "100-200cm", top: 100, bottom: 200 },
] as const;

/**
 * SoilGrids v2.0 mapped-unit -> conventional-unit conversion (d_factor, per the SoilGrids FAQ table; the
 * `unit_measure.d_factor` of the API response takes precedence when present):
 *   sand/silt/clay g/kg -> % (10) | soc dg/kg -> g/kg (10) | phh2o pH*10 -> pH (10) | cec mmol(c)/kg -> cmol(c)/kg (10)
 *   nitrogen cg/kg -> g/kg (100) | bdod cg/cm3 -> g/cm3 = kg/dm3 (100) | cfvo cm3/dm3 -> vol % (10)
 *   wv0033 / wv1500 (water content at 33 / 1500 kPa; served by v2.0, verified live): mapped (10^-2 cm3/cm3)*10 -> d_factor 10 gives vol %,
 *   then /100 -> m3/m3 (thetaFC, thetaWP). Layers with no value stay null; nothing is estimated here.
 */
export const SOILGRIDS_LAYER_PROPS = {
  sand: 10,
  silt: 10,
  clay: 10,
  soc: 10,
  phh2o: 10,
  cec: 10,
  nitrogen: 100,
  bdod: 100,
  cfvo: 10,
  wv0033: 10,
  wv1500: 10,
} as const;
/** vol % -> m3/m3 on top of the d_factor. */
const VOL_PCT_PROPS = new Set<string>(["wv0033", "wv1500"]);
export type SoilLayerProp = keyof typeof SOILGRIDS_LAYER_PROPS;

interface SgLayersResp {
  properties?: {
    layers?: {
      name: string;
      unit_measure?: { d_factor?: number };
      depths: { label: string; values: { mean?: number | null } }[];
    }[];
  };
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Pure: convert a v2.0 response to the six standard layers; null if no layer has complete texture (masked pixel). */
export function sgToLayers(resp: SgLayersResp): SoilLayer[] | null {
  const layers = resp.properties?.layers;
  if (!layers) throw new Error("Malformed SoilGrids response");
  const get = (prop: SoilLayerProp, label: string): number | null => {
    const l = layers.find((x) => x.name === prop);
    const raw = l?.depths.find((d) => d.label === label)?.values?.mean;
    if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
    const dFactor = l?.unit_measure?.d_factor;
    const v = raw / (typeof dFactor === "number" && dFactor > 0 ? dFactor : SOILGRIDS_LAYER_PROPS[prop]);
    return VOL_PCT_PROPS.has(prop) ? v / 100 : v;
  };
  const out: SoilLayer[] = SOIL_LAYER_DEPTHS.map((d) => {
    const q = (p: SoilLayerProp, dec: number) => {
      const v = get(p, d.label);
      return v === null ? null : Math.round(v * 10 ** dec) / 10 ** dec;
    };
    return {
      top: d.top,
      bottom: d.bottom,
      sand: q("sand", 1),
      silt: q("silt", 1),
      clay: q("clay", 1),
      soc: q("soc", 1),
      ph: q("phh2o", 2),
      cec: q("cec", 1),
      nitrogen: q("nitrogen", 2),
      bulkDensity: q("bdod", 2),
      coarseFragments: q("cfvo", 1),
      thetaFC: q("wv0033", 3),
      thetaWP: q("wv1500", 3),
    };
  });
  return out.some((l) => l.sand !== null && l.silt !== null && l.clay !== null) ? out : null;
}

/** Thickness-weighted 0-30 cm SoilProfile fields from the first three layers; null if texture is incomplete there. */
export function layersToProfile(layers: SoilLayer[]): Pick<SoilProfile, "sand" | "silt" | "clay" | "soc" | "ph" | "textureClass"> | null {
  const top = layers.filter((l) => l.bottom <= 30);
  const th = top.map((l) => l.bottom - l.top);
  const avg = (k: "sand" | "silt" | "clay" | "soc" | "ph") =>
    weightedDepthMean(
      top.map((l) => l[k]),
      th,
    );
  const sand = avg("sand");
  const silt = avg("silt");
  const clay = avg("clay");
  if (sand === null || silt === null || clay === null) return null;
  const soc = avg("soc");
  const ph = avg("ph");
  const s = r1(sand);
  const si = r1(silt);
  const c = r1(clay);
  return { sand: s, silt: si, clay: c, soc: soc === null ? null : r1(soc), ph: ph === null ? null : r2(ph), textureClass: classifyTexture(s, si, c) };
}

const LAYER_PROPS = Object.keys(SOILGRIDS_LAYER_PROPS) as SoilLayerProp[];

export function layersQuery(lat: number, lon: number): string {
  const q = [`lon=${lon}`, `lat=${lat}`, ...LAYER_PROPS.map((p) => `property=${p}`), ...SOIL_LAYER_DEPTHS.map((d) => `depth=${d.label}`), "value=mean"];
  return `${URL_BASE}?${q.join("&")}`;
}

interface SgClassResp {
  wrb_class_name?: string;
  wrb_class_probability?: [string, number][];
}

/** WRB reference soil group at the point (e.g. "Calcisols (34 % probability)"); null if none. */
export async function fetchWrb(lat: number, lon: number, opts: SoilOpts = {}): Promise<string | null> {
  const r = await fetchJson<SgClassResp>(`${CLASS_URL}?lon=${lon}&lat=${lat}&number_classes=3`, {
    timeoutMs: opts.timeoutMs ?? 20_000,
    retries: opts.retries ?? 1,
    backoffMs: 2000,
  });
  const name = r.wrb_class_name;
  if (!name) return null;
  const top = r.wrb_class_probability?.find((p) => p[0] === name);
  return top && typeof top[1] === "number" ? `${name} (${top[1]} % probability)` : name;
}

export interface SoilBundle {
  soil: SoilProfile;
  layers: SoilLayer[] | null;
  wrb: string | null;
  notes: string[];
}

/**
 * One SoilGrids pass for a field centre: six layers (which also give the 0-30 cm SoilProfile) and the WRB class.
 * Never throws: failures become a labelled default SoilProfile plus notes. Nearest valid pixel (<= ~2 km) if masked.
 */
export async function fetchSoilBundle(lat: number, lon: number, opts: SoilOpts = {}): Promise<SoilBundle> {
  const { timeoutMs = 15_000, retries = 1, budgetMs = 60_000 } = opts;
  const retrievedAt = new Date().toISOString();
  const t0 = Date.now();
  const notes: string[] = [];
  let layers: SoilLayer[] | null = null;
  let usedLat = lat;
  let usedLon = lon;
  let failure = "";
  try {
    layers = sgToLayers(await fetchJson<SgLayersResp>(layersQuery(lat, lon), { timeoutMs, retries, backoffMs: 2000 }));
    if (!layers) {
      for (const [dy, dx] of neighbourOffsets()) {
        if (Date.now() - t0 > budgetMs) break;
        const la = Math.round((lat + dy) * 1e4) / 1e4;
        const lo = Math.round((lon + dx) * 1e4) / 1e4;
        try {
          layers = sgToLayers(await fetchJson<SgLayersResp>(layersQuery(la, lo), { timeoutMs, retries: 0 }));
        } catch {
          continue;
        }
        if (layers) {
          usedLat = la;
          usedLon = lo;
          const km = Math.round(Math.hypot(dy * 111, dx * 111 * Math.cos((lat * Math.PI) / 180)) * 10) / 10;
          notes.push(`The exact 250 m SoilGrids pixel is masked (urban/water/no data); the nearest valid pixel (${la}, ${lo}; about ${km} km away) is used.`);
          break;
        }
      }
      if (!layers) failure = "no valid SoilGrids pixel within about 2 km of the point";
    }
  } catch (e) {
    failure = errMsg(e);
  }

  let wrb: string | null = null;
  if (layers) {
    try {
      wrb = await fetchWrb(usedLat, usedLon, { timeoutMs: 20_000, retries: 1 });
      if (!wrb) notes.push("SoilGrids returned no WRB class for this pixel.");
    } catch (e) {
      notes.push(`WRB class unavailable: ${errMsg(e)}`);
    }
  }

  if (!layers) {
    notes.push(`SoilGrids layers unavailable: ${failure}`);
    return { soil: defaultSoil(failure, retrievedAt), layers: null, wrb: null, notes };
  }
  const prof = layersToProfile(layers);
  if (!prof) {
    const reason = "SoilGrids has no complete 0-30 cm texture at this pixel";
    notes.push(reason);
    return { soil: defaultSoil(reason, retrievedAt), layers, wrb, notes };
  }
  const sNote =
    "Thickness-weighted mean of the 0-5, 5-15 and 15-30 cm layers (5:10:15); d_factor conversions applied (g/kg -> %, dg/kg -> g/kg, pH*10 -> pH)." +
    (usedLat !== lat || usedLon !== lon ? ` Nearest valid pixel (${usedLat}, ${usedLon}) used.` : "");
  return { soil: { ...prof, origin: "soilgrids", sources: [soilSourceMeta(retrievedAt, sNote)] }, layers, wrb, notes };
}
