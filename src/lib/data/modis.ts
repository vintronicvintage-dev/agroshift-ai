// MODIS MOD13Q1 NDVI via ORNL DAAC web service. Server-side only.
import type { NdviSeries, SourceMeta } from "@/lib/types";
import { modisNdvi } from "./converters";
import { errMsg, fetchJson, mapLimit } from "./http";

const BASE = "https://modis.ornl.gov/rst/api/v1/MOD13Q1";
const MAX_DATES = 10;

interface DatesResp {
  dates: { modis_date: string; calendar_date: string }[];
}
interface SubsetResp {
  subset: { modis_date: string; calendar_date: string; data: number[] }[];
}

export function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

async function band(lat: number, lon: number, bandName: string, a: string, b: string) {
  const url =
    `${BASE}/subset?latitude=${lat}&longitude=${lon}&band=${bandName}` +
    `&startDate=${a}&endDate=${b}&kmAboveBelow=0&kmLeftRight=0`;
  const r = await fetchJson<SubsetResp>(url, { timeoutMs: 60_000, retries: 3, backoffMs: 2000 });
  const m = new Map<string, number>();
  for (const s of r.subset ?? []) m.set(s.calendar_date, s.data?.[0]);
  return m;
}

export async function fetchModisNdvi(
  lat: number,
  lon: number,
  opts: { startDate: string; concurrency?: number },
): Promise<NdviSeries> {
  const retrievedAt = new Date().toISOString();
  const dl = await fetchJson<DatesResp>(`${BASE}/dates?latitude=${lat}&longitude=${lon}`, {
    timeoutMs: 60_000,
    retries: 3,
    backoffMs: 2000,
  });
  const dates = dl.dates.filter((d) => d.calendar_date >= opts.startDate);
  const chunks = chunk(dates, MAX_DATES);
  let failedChunks = 0;
  const failureNotes: string[] = [];
  const results = await mapLimit(chunks, opts.concurrency ?? 2, async (c) => {
    try {
      const a = c[0].modis_date;
      const b = c[c.length - 1].modis_date;
      const ndvi = await band(lat, lon, "250m_16_days_NDVI", a, b);
      const rel = await band(lat, lon, "250m_16_days_pixel_reliability", a, b);
      return c.map((d) => ({
        date: d.calendar_date,
        ndvi: modisNdvi(ndvi.get(d.calendar_date), rel.get(d.calendar_date)),
      }));
    } catch (e) {
      failedChunks++;
      if (failureNotes.length < 3) failureNotes.push(errMsg(e));
      return [] as { date: string; ndvi: number | null }[];
    }
  });
  const all = results.flat();
  const points = all.filter((p): p is { date: string; ndvi: number } => p.ndvi !== null);
  const dropped = all.length - points.length;
  const note = [
    `MOD13Q1 v061 250m_16_days_NDVI, scale 0.0001, fill -3000 removed; pixel_reliability filter keeps rank 0 (good) and 1 (marginal), drops 2 (snow/ice), 3 (cloudy), -1 (fill).`,
    `Single 250 m pixel at the point. ${dates.length} composites requested from ${opts.startDate}; ${dropped} dropped by quality filter.`,
    failedChunks ? `WARNING: ${failedChunks} of ${chunks.length} date chunks failed after retries and are missing (${failureNotes.join("; ")}).` : undefined,
  ]
    .filter(Boolean)
    .join(" ");
  const source: SourceMeta = {
    name: "MODIS Terra MOD13Q1 NDVI (16-day, 250 m)",
    provider: "NASA LP DAAC via ORNL DAAC MODIS Web Service",
    url: "https://modis.ornl.gov/data/modis_webservice.html",
    retrievedAt,
    spatialResolution: "250 m",
    note,
  };
  if (!points.length && chunks.length) throw new Error(`MODIS NDVI: no valid points (${failureNotes.join("; ") || "all filtered"})`);
  return { lat, lon, points, sources: [source] };
}
