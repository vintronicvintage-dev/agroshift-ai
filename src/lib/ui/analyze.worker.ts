/// <reference lib="webworker" />
// Runs the deterministic engine off the main thread. The climate series is sent once per key and
// kept here, so the engine's per-object ET₀ memo survives across scenario changes.
import { analyze } from "@/lib/engine";
import type { ClimateSeries } from "@/lib/types";
import type { WorkerRequest, WorkerResponse } from "./analysisProtocol";

const climates = new Map<string, ClimateSeries>();

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const m = e.data;
  if (m.type === "climate") {
    // keep at most two series (e.g. calibrated and uncalibrated of the same site)
    if (climates.size >= 2) climates.delete(climates.keys().next().value as string);
    climates.set(m.key, m.climate);
    return;
  }
  const climate = climates.get(m.key);
  const post = (r: WorkerResponse) => (self as unknown as Worker).postMessage(r);
  if (!climate) {
    post({ type: "error", id: m.id, message: "climate series not loaded in worker" });
    return;
  }
  try {
    const t0 = performance.now();
    const result = analyze({ ...m.input, climate });
    post({ type: "result", id: m.id, result, ms: performance.now() - t0 });
  } catch (err) {
    post({ type: "error", id: m.id, message: err instanceof Error ? err.message : String(err) });
  }
};
