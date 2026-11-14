// ISRIC SoilGrids v2.0 client. Server-side only. Falls back to a labelled regional default.
import type { SoilProfile, SourceMeta } from "@/lib/types";
import {
  classifyTexture,
  SOILGRIDS_DEPTHS,
  soilgridsConvert,
  weightedDepthMean,
} from "./converters";
import { errMsg, fetchJson } from "./http";

const URL_BASE = "https://rest.isric.org/soilgrids/v2.0/properties/query";
const PROPS = ["sand", "silt", "clay", "soc", "phh2o"] as const;

interface SgResp {
  properties?: {
    layers?: { name: string; depths: { label: string; values: { mean: number | null } }[] }[];
  };
}

export interface SoilOpts {
  timeoutMs?: number; // per request, default 15 s
  retries?: number;
  budgetMs?: number; // total time allowed incl. neighbour-pixel search
}

const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;

/** Pure: convert a SoilGrids response to a 0-30 cm profile; null if the pixel has no soil values. */
export function sgToProfile(resp: SgResp): Pick<SoilProfile, "sand" | "silt" | "clay" | "soc" | "ph" | "textureClass"> | null {
  const layers = resp.properties?.layers;
  if (!layers) throw new Error("Malformed SoilGrids response");
  const th = SOILGRIDS_DEPTHS.map((d) => d.thickness);
  const avg = (name: string) => {
    const l = layers.find((x) => x.name === name);
    if (!l) return null;
    const vals = SOILGRIDS_DEPTHS.map((d) => soilgridsConvert(l.depths.find((x) => x.label === d.label)?.values?.mean));
    return weightedDepthMean(vals, th);
  };
  const sand = avg("sand");
  const silt = avg("silt");
  const clay = avg("clay");
  if (sand === null || silt === null || clay === null) return null;
  const soc = avg("soc");
  const ph = avg("phh2o");
  const s = r1(sand);
  const si = r1(silt);
  const c = r1(clay);
  return {
    sand: s,
    silt: si,
    clay: c,
    soc: soc === null ? null : r1(soc),
    ph: ph === null ? null : r2(ph),
    textureClass: classifyTexture(s, si, c),
  };
}

function query(lat: number, lon: number): string {
  const q = [`lon=${lon}`, `lat=${lat}`, ...PROPS.map((p) => `property=${p}`), ...SOILGRIDS_DEPTHS.map((d) => `depth=${d.label}`), "value=mean"];
  return `${URL_BASE}?${q.join("&")}`;
}

/** Offsets (degrees) tried when the exact 250 m pixel is masked (urban/water/no data). ~0.5-2 km. */
export function neighbourOffsets(): [number, number][] {
  const out: [number, number][] = [];
  for (const d of [0.005, 0.01, 0.02]) {
    for (const [a, b] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
    ]) {
      out.push([a * d, b * d]);
    }
  }
  return out;
}

export const soilSourceMeta = (retrievedAt: string, note: string): SourceMeta => ({
  name: "SoilGrids v2.0 (mean, 0-30 cm)",
  provider: "ISRIC - World Soil Information (not a NASA product)",
  url: "https://www.isric.org/explore/soilgrids",
  retrievedAt,
  spatialResolution: "250 m",
  note,
});

/** Labelled generic default for Turkish cropland. It is NOT measured data. */
export function defaultSoil(reason: string, retrievedAt = new Date().toISOString()): SoilProfile {
  const sand = 35;
  const silt = 35;
  const clay = 30;
  return {
    sand,
    silt,
    clay,
    soc: 12,
    ph: 7.6,
    textureClass: classifyTexture(sand, silt, clay),
    origin: "default",
    sources: [
      {
        name: "Regional default (assumption)",
        provider: "AgroShift AI",
        url: "https://www.isric.org/explore/soilgrids",
        retrievedAt,
        spatialResolution: "n/a",
        note: `GENERIC DEFAULT, not measured: clay-loam-like Anatolian cropland (sand 35 / silt 35 / clay 30 %, SOC 12 g/kg, pH 7.6, typical of calcareous central/southern Turkish soils). Used because SoilGrids was unavailable: ${reason}. Edit it with local soil-test values.`,
      },
    ],
  };
}

export async function fetchSoilGrids(lat: number, lon: number, opts: SoilOpts = {}): Promise<SoilProfile> {
  const { timeoutMs = 15_000, retries = 1, budgetMs = 60_000 } = opts;
  const retrievedAt = new Date().toISOString();
  const t0 = Date.now();
  try {
    const centre = await fetchJson<SgResp>(query(lat, lon), { timeoutMs, retries, backoffMs: 2000 });
    let prof = sgToProfile(centre);
    let note = "Mean of the 0-5, 5-15 and 15-30 cm layers weighted by thickness (5:10:15). d_factor 10 applied (g/kg -> %, dg/kg -> g/kg, pH*10 -> pH).";
    if (!prof) {
      for (const [dy, dx] of neighbourOffsets()) {
        if (Date.now() - t0 > budgetMs) break;
        const la = Math.round((lat + dy) * 1e4) / 1e4;
        const lo = Math.round((lon + dx) * 1e4) / 1e4;
        try {
          prof = sgToProfile(await fetchJson<SgResp>(query(la, lo), { timeoutMs, retries: 0 }));
        } catch {
          continue; // a slow neighbour query should not abort the search
        }
        if (prof) {
          const km = Math.round(Math.hypot(dy * 111, dx * 111 * Math.cos((lat * Math.PI) / 180)) * 10) / 10;
          note += ` The exact 250 m pixel has no SoilGrids value (masked: e.g. urban, water or no data), so the nearest valid pixel (${la}, ${lo}; about ${km} km away) is used.`;
          break;
        }
      }
    }
    if (!prof) return defaultSoil("no valid SoilGrids pixel within about 2 km of the point", retrievedAt);
    return { ...prof, origin: "soilgrids", sources: [soilSourceMeta(retrievedAt, note)] };
  } catch (e) {
    return defaultSoil(errMsg(e), retrievedAt);
  }
}
