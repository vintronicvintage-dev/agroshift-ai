/// <reference lib="webworker" />
// Runs the deterministic engine off the main thread. The climate series is sent once per key and
// kept here, so the engine's per-object ET₀ memo survives across scenario changes.
import { analyze } from "@/lib/engine";
import type { AnalysisInput, ClimateSeries, SoilLayer } from "@/lib/types";
import type { WorkerRequest, WorkerResponse } from "./analysisProtocol";

interface SiteCacheEntry {
  climate: ClimateSeries;
  soilLayers?: SoilLayer[] | null;
  precipCheck?: AnalysisInput["precipCheck"] | null;
}

const sites = new Map<string, SiteCacheEntry>();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const m = e.data;
  if (m.type === "climate") {
    // keep at most two series (e.g. calibrated and uncalibrated of the same site)
    if (!sites.has(m.key) && sites.size >= 2) sites.delete(sites.keys().next().value as string);
    sites.set(m.key, { climate: m.climate, soilLayers: m.soilLayers, precipCheck: m.precipCheck });
    return;
  }
  const site = sites.get(m.key);
  const post = (r: WorkerResponse) => (self as unknown as Worker).postMessage(r);
  if (!site) {
    post({ type: "error", id: m.id, message: "climate series not loaded in worker" });
    return;
  }
  try {
    const t0 = performance.now();
    const soilLayers = m.input.field.soilLayers ?? (m.useSiteSoilLayers && site.soilLayers ? site.soilLayers : undefined);
    const precipCheck = m.input.precipCheck ?? (m.useSitePrecipCheck && site.precipCheck ? site.precipCheck : undefined);
    const result = analyze({
      ...m.input,
      field: {
        ...m.input.field,
        ...(soilLayers ? { soilLayers } : {}),
      },
      ...(precipCheck ? { precipCheck } : {}),
      climate: site.climate,
    });
    post({ type: "result", id: m.id, result, ms: performance.now() - t0 });
  } catch (err) {
    post({ type: "error", id: m.id, message: err instanceof Error ? err.message : String(err) });
  }
};
