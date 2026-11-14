// NASA POWER Daily API client (community=AG). Server-side only.
import type { ClimateSeries, DailyWeather, SourceMeta } from "@/lib/types";
import { POWER_PARAMS, powerToDaily, type PowerResponse } from "./converters";
import { fetchJson, HttpError } from "./http";

const BASE = "https://power.larc.nasa.gov/api/temporal/daily/point";
export const POWER_START = "2001-01-01";

const compact = (d: string) => d.replace(/-/g, "");

export function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function powerUrl(lat: number, lon: number, start: string, end: string): string {
  const q = new URLSearchParams({
    parameters: POWER_PARAMS.join(","),
    community: "AG",
    longitude: String(lon),
    latitude: String(lat),
    start: compact(start),
    end: compact(end),
    format: "JSON",
  });
  return `${BASE}?${q.toString().replace(/%2C/g, ",")}`;
}

async function fetchRange(lat: number, lon: number, start: string, end: string) {
  const resp = await fetchJson<PowerResponse>(powerUrl(lat, lon, start, end), { timeoutMs: 90_000, retries: 2 });
  return powerToDaily(resp);
}

/** Year-based windows used if a single full-range request is refused. */
export function yearChunks(startYear: number, endIso: string, span = 5): [string, string][] {
  const endYear = Number(endIso.slice(0, 4));
  const out: [string, string][] = [];
  for (let y = startYear; y <= endYear; y += span) {
    const ye = Math.min(y + span - 1, endYear);
    out.push([`${y}-01-01`, ye === endYear ? endIso : `${ye}-12-31`]);
  }
  return out;
}

export async function fetchPowerClimate(
  lat: number,
  lon: number,
  opts: { start?: string; end?: string } = {},
): Promise<ClimateSeries> {
  const start = opts.start ?? POWER_START;
  const end = opts.end ?? todayIso();
  const retrievedAt = new Date().toISOString();
  let daily: DailyWeather[];
  let elevation: number;
  let unitNote: string | undefined;
  let split = false;
  try {
    ({ daily, elevation, unitNote } = await fetchRange(lat, lon, start, end));
  } catch (e) {
    // Unit assertion failures must never be retried around.
    if (!(e instanceof HttpError) || (e.status !== 422 && e.status !== 400 && e.status !== 413)) throw e;
    split = true;
    daily = [];
    elevation = NaN;
    for (const [s, en] of yearChunks(Number(start.slice(0, 4)), end)) {
      const part = await fetchRange(lat, lon, s, en);
      if (Number.isNaN(elevation)) elevation = part.elevation;
      unitNote = unitNote ?? part.unitNote;
      daily.push(...part.daily);
    }
  }
  if (!daily.length) throw new Error("NASA POWER returned no data");
  const note = [
    "Daily MERRA-2/CERES-derived point values, community AG; fill value -999 converted to null.",
    "ALLSKY_SFC_SW_DWN units verified as MJ/m^2/day from the response header." +
      (unitNote ? ` ${unitNote}` : ""),
    split ? "Request was split into multi-year windows." : undefined,
    `Elevation from the POWER response (${elevation} m).`,
  ]
    .filter(Boolean)
    .join(" ");
  const source: SourceMeta = {
    name: "NASA POWER Daily (AG)",
    provider: "NASA Langley Research Center POWER Project",
    url: "https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
    retrievedAt,
    spatialResolution: "0.5° x 0.625° (MERRA-2) / 1° (CERES SYN1deg), point query",
    note,
  };
  return {
    lat,
    lon,
    elevation,
    start: daily[0].date,
    end: daily[daily.length - 1].date,
    daily,
    sources: [source],
  };
}
