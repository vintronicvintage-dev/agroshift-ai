"use client";

import type { ClimateSeries, NdviSeries, SoilProfile } from "@/lib/types";

export type Part<T> =
  | { status: "loading"; startedAt: number }
  | { status: "ok"; data: T }
  | { status: "error"; code: "timeout" | "network" | "http"; message: string };

export interface SiteData {
  climate: Part<ClimateSeries>;
  soil: Part<SoilProfile>;
  ndvi: Part<NdviSeries>;
}

export type PartName = keyof SiteData;

const TIMEOUTS: Record<PartName, number> = { climate: 150_000, soil: 45_000, ndvi: 180_000 };

/** GET /api/{part}?lat&lon with a timeout; never throws. */
export async function fetchPart<K extends PartName>(
  part: K,
  lat: number,
  lon: number,
  signal: AbortSignal,
): Promise<SiteData[K]> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal.addEventListener("abort", onAbort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, TIMEOUTS[part]);
  try {
    const res = await fetch(`/api/${part}?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`, { signal: ctrl.signal });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      const msg = (body as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${res.status}`;
      return { status: "error", code: "http", message: msg } as SiteData[K];
    }
    return { status: "ok", data: body } as SiteData[K];
  } catch (e) {
    if (timedOut) return { status: "error", code: "timeout", message: "timeout" } as SiteData[K];
    return { status: "error", code: "network", message: e instanceof Error ? e.message : String(e) } as SiteData[K];
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
  }
}
