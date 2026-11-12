// Optional GPM IMERG monthly cross-check of POWER precipitation (GES DISC OPeNDAP, Earthdata token).
// The token is read from process.env only and is never logged, returned or written anywhere.
import type { ClimateSeries, SourceMeta } from "@/lib/types";

export type ImergCheck =
  | {
      status: "validated";
      months: { month: string; powerMm: number; imergMm: number }[];
      meanBiasPct: number;
      correlation: number;
      source: SourceMeta;
    }
  | { status: "not_validated"; reason: string; checkedAt: string };

const HOST = "https://gpm1.gesdisc.eosdis.nasa.gov/opendap/GPM_L3/GPM_3IMERGM.07";

export function imergFileUrl(year: number, month: number): string {
  const mm = String(month).padStart(2, "0");
  return `${HOST}/${year}/3B-MO.MS.MRG.3IMERG.${year}${mm}01-S000000-E235959.${mm}.V07B.HDF5`;
}

/** 0.1° grid index: lon -180..180 -> 0..3599, lat -90..90 -> 0..1799. */
export function imergIndex(lat: number, lon: number): { li: number; la: number } {
  return { li: Math.floor((lon + 180) / 0.1), la: Math.floor((lat + 90) / 0.1) };
}

export function parseOpendapAscii(text: string): number | null {
  const lines = text.trim().split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^\[\d+\]\[\d+\]\[\d+\],\s*(-?[\d.eE+-]+)\s*$/);
    if (m) {
      const v = Number(m[1]);
      return Number.isFinite(v) && v > -9000 ? v : null;
    }
  }
  return null;
}

const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const notValidated = (reason: string): ImergCheck => ({ status: "not_validated", reason, checkedAt: new Date().toISOString() });

export async function imergCrossCheck(series: ClimateSeries, opts: { years?: number[] } = {}): Promise<ImergCheck> {
  const token = process.env.EARTHDATA_TOKEN?.trim();
  if (!token) return notValidated("EARTHDATA_TOKEN is not set");
  const years = opts.years ?? [2021, 2022, 2023];
  const { li, la } = imergIndex(series.lat, series.lon);
  const headers = { Authorization: `Bearer ${token}` };
  const months: { month: string; powerMm: number; imergMm: number }[] = [];
  try {
    for (const y of years) {
      for (let m = 1; m <= 12; m++) {
        const key = `${y}-${String(m).padStart(2, "0")}`;
        const days = series.daily.filter((d) => d.date.startsWith(key));
        if (days.length !== daysIn(y, m) || days.some((d) => d.precip === null)) continue;
        const res = await fetch(`${imergFileUrl(y, m)}.ascii?precipitation[0:0][${li}][${la}]`, {
          headers,
          signal: AbortSignal.timeout(30_000),
        });
        if (res.status === 401 || res.status === 403) {
          return notValidated(
            `GES DISC OPeNDAP returned HTTP ${res.status} for the supplied Earthdata token (point subsetting of GPM_3IMERGM not authorised; reading one point otherwise needs a full global HDF5 file per month).`,
          );
        }
        if (!res.ok) return notValidated(`GES DISC OPeNDAP returned HTTP ${res.status}`);
        const rate = parseOpendapAscii(await res.text()); // mm/hr monthly mean
        if (rate === null) continue;
        months.push({
          month: key,
          powerMm: days.reduce((s, d) => s + (d.precip as number), 0),
          imergMm: rate * 24 * daysIn(y, m),
        });
      }
    }
  } catch (e) {
    const cause = e instanceof Error ? ((e.cause as Error | undefined)?.message ?? e.message) : "error";
    return notValidated(`IMERG request failed (network): ${cause}`);
  }
  if (months.length < 6) return notValidated("fewer than 6 comparable months retrieved");
  const sp = months.reduce((s, x) => s + x.powerMm, 0);
  const si = months.reduce((s, x) => s + x.imergMm, 0);
  const mp = sp / months.length;
  const mi = si / months.length;
  let num = 0;
  let dp = 0;
  let di = 0;
  for (const x of months) {
    num += (x.powerMm - mp) * (x.imergMm - mi);
    dp += (x.powerMm - mp) ** 2;
    di += (x.imergMm - mi) ** 2;
  }
  return {
    status: "validated",
    months,
    meanBiasPct: Math.round(((sp - si) / si) * 1000) / 10,
    correlation: Math.round((num / Math.sqrt(dp * di)) * 1000) / 1000,
    source: {
      name: "GPM IMERG Final monthly V07 (GPM_3IMERGM)",
      provider: "NASA GES DISC",
      url: "https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary",
      retrievedAt: new Date().toISOString(),
      spatialResolution: "0.1°",
      note: "Monthly mean rate (mm/hr) x 24 x days compared with POWER PRECTOTCORR monthly sums.",
    },
  };
}
