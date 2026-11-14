// Precipitation cross-check: NASA POWER (PRECTOTCORR) vs ECMWF reanalysis served by Open-Meteo (no key).
// ERA5-Land precipitation is requested first; Open-Meteo currently returns null for it everywhere, so we fall
// back to ERA5 (0.25 deg) and label the reference honestly. The POWER series is never modified.
import type { ClimateSeries } from "@/lib/types";
import type { PrecipCrossCheck, SourceMeta } from "./fieldTypes";
import { fetchJson } from "./http";

const BASE = "https://archive-api.open-meteo.com/v1/archive";

interface OmResp {
  daily?: { time: string[]; precipitation_sum: (number | null)[] };
}

export interface RefDaily {
  dates: string[];
  values: (number | null)[];
}

/** Pure: build the cross-check from POWER daily rows and a reference daily series (same calendar dates). */
export function buildPrecipCrossCheck(
  power: { date: string; precip: number | null }[],
  ref: RefDaily,
  reference: PrecipCrossCheck["reference"],
  sources: SourceMeta[],
): PrecipCrossCheck | null {
  const refMap = new Map<string, number | null>();
  ref.dates.forEach((d, i) => refMap.set(d, ref.values[i]));
  type Acc = { n: number; pSum: number; rSum: number; monthP: number[]; monthR: number[]; ok: boolean };
  const years = new Map<number, Acc>();
  for (const row of power) {
    const y = Number(row.date.slice(0, 4));
    const m = Number(row.date.slice(5, 7)) - 1;
    const a = years.get(y) ?? { n: 0, pSum: 0, rSum: 0, monthP: Array(12).fill(0), monthR: Array(12).fill(0), ok: true };
    const rv = refMap.get(row.date);
    if (row.precip === null || rv === null || rv === undefined) {
      a.ok = false;
    } else {
      a.pSum += row.precip;
      a.rSum += rv;
      a.monthP[m] += row.precip;
      a.monthR[m] += rv;
    }
    a.n++;
    years.set(y, a);
  }
  const full = [...years.entries()]
    .filter(([y, a]) => a.ok && a.n === (isLeap(y) ? 366 : 365))
    .sort((a, b) => a[0] - b[0]);
  if (full.length < 3) return null;
  const mp = Array(12).fill(0);
  const mr = Array(12).fill(0);
  for (const [, a] of full) {
    for (let m = 0; m < 12; m++) {
      mp[m] += a.monthP[m];
      mr[m] += a.monthR[m];
    }
  }
  const sumP = full.reduce((s, [, a]) => s + a.pSum, 0);
  const sumR = full.reduce((s, [, a]) => s + a.rSum, 0);
  if (!(sumP > 0)) return null;
  const r3 = (v: number) => Math.round(v * 1000) / 1000;
  return {
    reference,
    years: full.map(([y]) => y),
    powerAnnual: full.map(([, a]) => Math.round(a.pSum * 10) / 10),
    referenceAnnual: full.map(([, a]) => Math.round(a.rSum * 10) / 10),
    // a month with zero POWER rain in every year has no meaningful ratio: 1 if the reference is also dry, else capped at 99
    monthlyRatio: mp.map((p, m) => (p > 0 ? r3(mr[m] / p) : mr[m] > 0 ? 99 : 1)),
    annualRatio: r3(sumR / sumP),
    sources,
  };
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

export function archiveUrl(lat: number, lon: number, start: string, end: string, model: string): string {
  return `${BASE}?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&start_date=${start}&end_date=${end}&daily=precipitation_sum&models=${model}&timezone=UTC`;
}

async function fetchRef(lat: number, lon: number, start: string, end: string, model: string): Promise<RefDaily> {
  const r = await fetchJson<OmResp>(archiveUrl(lat, lon, start, end, model), { timeoutMs: 60_000, retries: 2, backoffMs: 3000 });
  if (!r.daily?.time?.length) throw new Error("Open-Meteo returned no daily data");
  return { dates: r.daily.time, values: r.daily.precipitation_sum };
}

const share = (v: (number | null)[]) => v.filter((x) => x !== null).length / Math.max(1, v.length);

function sourceMeta(model: "era5_land" | "era5", ref: RefDaily, retrievedAt: string, lat: number, lon: number): SourceMeta {
  return {
    name: model === "era5_land" ? "ERA5-Land daily precipitation via Open-Meteo Historical Weather API" : "ERA5 daily precipitation via Open-Meteo Historical Weather API",
    provider: "ECMWF / Copernicus Climate Change Service (C3S), served by Open-Meteo.com",
    url: "https://open-meteo.com/en/docs/historical-weather-api",
    retrievedAt,
    spatialResolution: model === "era5_land" ? "0.1 deg (~9 km)" : "0.25 deg (~28 km)",
    note:
      (model === "era5"
        ? "ERA5-Land precipitation was requested first (models=era5_land) but Open-Meteo returns null for it (checked across sites and years on 2026-11-13), so plain ERA5 is the reference instead. "
        : "") +
      `Daily sums (UTC) ${ref.dates[0]}..${ref.dates[ref.dates.length - 1]} for the grid cell nearest ${lat.toFixed(2)}, ${lon.toFixed(2)}. ` +
      "Licence: Open-Meteo data is CC BY 4.0, free API for non-commercial use (< 10,000 calls/day); required credit: \"Weather data by Open-Meteo.com\" plus \"Generated using Copernicus Climate Change Service information (ERA5/ERA5-Land)\" (Copernicus licence CC BY 4.0). " +
      "Reanalysis precipitation is a model product, not a gauge measurement; both reference and POWER (MERRA-2 corrected) differ from station climatology.",
  };
}

/** Cross-check POWER annual precipitation against ERA5(-Land). Throws if the reference is unavailable. */
export async function fetchPrecipCrossCheck(climate: ClimateSeries, lat: number, lon: number): Promise<PrecipCrossCheck | null> {
  const retrievedAt = new Date().toISOString();
  const end = new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10); // ERA5 lags ~5 days
  const lastPower = climate.end < end ? climate.end : end;
  let model: "era5_land" | "era5" = "era5_land";
  let ref = await fetchRef(lat, lon, climate.start, lastPower, model);
  if (share(ref.values) < 0.5) {
    model = "era5";
    ref = await fetchRef(lat, lon, climate.start, lastPower, model);
  }
  if (share(ref.values) < 0.5) throw new Error("Open-Meteo returned mostly empty precipitation");
  return buildPrecipCrossCheck(climate.daily, ref, model === "era5_land" ? "era5-land" : "era5", [sourceMeta(model, ref, retrievedAt, lat, lon)]);
}
