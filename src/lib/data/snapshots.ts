// Bundled snapshots: compact (columnar, scaled-integer) <-> ClimateSeries / SoilProfile / NdviSeries.
// No Node APIs: usable from server and client components. Snapshot JSON is loaded lazily with import().
import type { ClimateSeries, DailyWeather, NdviSeries, SoilProfile, SourceMeta } from "@/lib/types";

export const DAILY_VARS = ["tmax", "tmin", "tmean", "rh", "wind2m", "rs", "precip", "gwetRoot", "gwetTop"] as const;
export type DailyVar = (typeof DAILY_VARS)[number];

/** Integer scale per variable: stored = round(value * scale). Chosen to keep source precision where it matters. */
export const SCALES: Record<DailyVar, number> = {
  tmax: 10,
  tmin: 10,
  tmean: 10,
  rh: 10,
  wind2m: 100,
  rs: 100,
  precip: 100,
  gwetRoot: 100,
  gwetTop: 100,
};

export interface CompactSnapshot {
  v: 1;
  id: string;
  lat: number;
  lon: number;
  elevation: number;
  start: string;
  end: string;
  retrievedAt: string;
  climate: {
    scales: Record<DailyVar, number>;
    cols: Record<DailyVar, (number | null)[]>; // one entry per day, contiguous from `start`
    sources: SourceMeta[];
  } | null;
  soil: SoilProfile;
  ndvi: { dates: string[]; v: number[]; scale: number; sources: SourceMeta[] };
  /** Human-readable record of anything that failed or was substituted while building. */
  notes: string[];
  imerg?: { status: "validated" | "not_validated"; reason?: string; detail?: unknown };
}

export interface SnapshotIndexEntry {
  id: string;
  nameTr: string;
  nameEn: string;
  lat: number;
  lon: number;
  elevation: number;
  start: string;
  end: string;
  retrievedAt: string;
}

export interface Snapshot {
  id: string;
  climate: ClimateSeries | null;
  soil: SoilProfile;
  ndvi: NdviSeries;
  notes: string[];
  imerg?: CompactSnapshot["imerg"];
}

const DAY = 86_400_000;
export function addDays(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
}

export function compactClimate(c: ClimateSeries): NonNullable<CompactSnapshot["climate"]> {
  const cols = Object.fromEntries(DAILY_VARS.map((k) => [k, [] as (number | null)[]])) as Record<DailyVar, (number | null)[]>;
  c.daily.forEach((d, i) => {
    if (d.date !== addDays(c.start, i)) throw new Error(`Daily series is not contiguous at ${d.date}`);
    for (const k of DAILY_VARS) {
      const v = d[k];
      cols[k].push(v === null ? null : Math.round(v * SCALES[k]));
    }
  });
  return { scales: { ...SCALES }, cols, sources: c.sources };
}

export function expandClimate(
  meta: Pick<CompactSnapshot, "lat" | "lon" | "elevation" | "start" | "end">,
  c: NonNullable<CompactSnapshot["climate"]>,
): ClimateSeries {
  const n = c.cols.tmax.length;
  const daily: DailyWeather[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const row = { date: addDays(meta.start, i) } as DailyWeather;
    for (const k of DAILY_VARS) {
      const v = c.cols[k][i];
      row[k] = v === null || v === undefined ? null : v / c.scales[k];
    }
    daily[i] = row;
  }
  return { lat: meta.lat, lon: meta.lon, elevation: meta.elevation, start: meta.start, end: meta.end, daily, sources: c.sources };
}

export function compactNdvi(n: NdviSeries): CompactSnapshot["ndvi"] {
  return {
    dates: n.points.map((p) => p.date),
    v: n.points.map((p) => Math.round(p.ndvi * 10000)),
    scale: 10000,
    sources: n.sources,
  };
}

export function expandNdvi(lat: number, lon: number, c: CompactSnapshot["ndvi"]): NdviSeries {
  return { lat, lon, points: c.dates.map((date, i) => ({ date, ndvi: c.v[i] / c.scale })), sources: c.sources };
}

export function compactSnapshot(
  id: string,
  retrievedAt: string,
  climate: ClimateSeries | null,
  soil: SoilProfile,
  ndvi: NdviSeries,
  notes: string[],
  meta: { lat: number; lon: number; elevation: number | null; start?: string; end?: string },
  imerg?: CompactSnapshot["imerg"],
): CompactSnapshot {
  return {
    v: 1,
    id,
    lat: meta.lat,
    lon: meta.lon,
    elevation: climate?.elevation ?? meta.elevation ?? 0,
    start: climate?.start ?? meta.start ?? "",
    end: climate?.end ?? meta.end ?? "",
    retrievedAt,
    climate: climate ? compactClimate(climate) : null,
    soil,
    ndvi: compactNdvi(ndvi),
    notes,
    imerg,
  };
}

export function expandSnapshot(c: CompactSnapshot): Snapshot {
  return {
    id: c.id,
    climate: c.climate ? expandClimate(c, c.climate) : null,
    soil: c.soil,
    ndvi: expandNdvi(c.lat, c.lon, c.ndvi),
    notes: c.notes,
    imerg: c.imerg,
  };
}

// ---------- loader (static literal import() paths so bundlers can split each file) ----------
const loaders: Record<string, () => Promise<{ default: unknown }>> = {
  "konya-cumra": () => import("@/data/snapshots/konya-cumra.json"),
  "sanliurfa-harran": () => import("@/data/snapshots/sanliurfa-harran.json"),
  "adana-yuregir": () => import("@/data/snapshots/adana-yuregir.json"),
  "edirne-uzunkopru": () => import("@/data/snapshots/edirne-uzunkopru.json"),
  "polatli-ankara": () => import("@/data/snapshots/polatli-ankara.json"),
};

export async function loadSnapshotIndex(): Promise<SnapshotIndexEntry[]> {
  const m = await import("@/data/snapshots/index.json");
  return m.default as unknown as SnapshotIndexEntry[];
}

export async function loadSnapshot(id: string): Promise<Snapshot | null> {
  const load = loaders[id];
  if (!load) return null;
  const m = await load();
  return expandSnapshot(m.default as CompactSnapshot);
}

/** Id of the bundled snapshot within `tol` degrees (default 0.05°) of the point, if any. */
export function matchSnapshotId(
  index: Pick<SnapshotIndexEntry, "id" | "lat" | "lon">[],
  lat: number,
  lon: number,
  tol = 0.05,
): string | null {
  let best: { id: string; d: number } | null = null;
  for (const e of index) {
    const dLat = Math.abs(e.lat - lat);
    const dLon = Math.abs(e.lon - lon);
    if (dLat <= tol + 1e-9 && dLon <= tol + 1e-9) {
      const d = Math.hypot(dLat, dLon);
      if (!best || d < best.d) best = { id: e.id, d };
    }
  }
  return best?.id ?? null;
}

export async function findSnapshotAt(lat: number, lon: number): Promise<Snapshot | null> {
  const id = matchSnapshotId(await loadSnapshotIndex(), lat, lon);
  return id ? loadSnapshot(id) : null;
}
