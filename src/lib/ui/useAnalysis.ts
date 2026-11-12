"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult, ClimateSeries } from "@/lib/types";
import type { AnalysisRequest, WorkerResponse } from "./analysisProtocol";

interface Done {
  result: AnalysisResult | null;
  error: string | null;
  ms: number | null;
  forClimate: ClimateSeries | null;
  forRequest: AnalysisRequest | null;
}

export interface AnalysisState {
  result: AnalysisResult | null;
  error: string | null;
  ms: number | null;
  /** True while the shown result is older than the current inputs. */
  running: boolean;
}

const DEBOUNCE_MS = 120;

/**
 * Runs `analyze` in a Web Worker (fallback: main thread, deferred) whenever the climate series
 * or the request object changes. The last finished result stays visible while a newer one runs.
 */
export function useAnalysis(climate: ClimateSeries | null, climateKey: string, request: AnalysisRequest | null): AnalysisState {
  const [done, setDone] = useState<Done>({ result: null, error: null, ms: null, forClimate: null, forRequest: null });
  const workerRef = useRef<Worker | null>(null);
  const sentKeyRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const pendingRef = useRef(new Map<number, { climate: ClimateSeries; request: AnalysisRequest }>());

  useEffect(() => {
    let w: Worker | null = null;
    try {
      w = new Worker(new URL("./analyze.worker.ts", import.meta.url), { type: "module" });
    } catch {
      w = null;
    }
    workerRef.current = w;
    sentKeyRef.current = null;
    const pending = pendingRef.current;
    if (w) {
      w.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const m = e.data;
        const meta = pending.get(m.id);
        pending.delete(m.id);
        if (!meta || m.id !== seqRef.current) return; // a newer request superseded this one
        if (m.type === "result") setDone({ result: m.result, error: null, ms: m.ms, forClimate: meta.climate, forRequest: meta.request });
        else setDone((d) => ({ ...d, error: m.message, forClimate: meta.climate, forRequest: meta.request }));
      };
      w.onerror = () => {
        // worker failed to load: fall back to the main thread for the rest of the session
        w?.terminate();
        workerRef.current = null;
      };
    }
    return () => {
      w?.terminate();
      workerRef.current = null;
      pending.clear();
    };
  }, []);

  useEffect(() => {
    if (!climate || !request) return;
    const id = ++seqRef.current;
    const timer = setTimeout(() => {
      const w = workerRef.current;
      if (w) {
        pendingRef.current.set(id, { climate, request });
        if (sentKeyRef.current !== climateKey) {
          w.postMessage({ type: "climate", key: climateKey, climate });
          sentKeyRef.current = climateKey;
        }
        w.postMessage({ type: "run", id, key: climateKey, input: request });
        return;
      }
      void import("@/lib/engine").then(({ analyze }) => {
        if (id !== seqRef.current) return;
        try {
          const t0 = performance.now();
          const result = analyze({ ...request, climate });
          if (id !== seqRef.current) return;
          setDone({ result, error: null, ms: performance.now() - t0, forClimate: climate, forRequest: request });
        } catch (err) {
          setDone((d) => ({ ...d, error: err instanceof Error ? err.message : String(err), forClimate: climate, forRequest: request }));
        }
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [climate, climateKey, request]);

  const upToDate = done.forClimate === climate && done.forRequest === request;
  // A result computed for another site must not be shown for this one.
  const sameSite = done.forClimate !== null && climate !== null && sameKey(done.forClimate, climate);
  return {
    result: sameSite ? done.result : null,
    error: upToDate ? done.error : null,
    ms: done.ms,
    running: !!climate && !!request && !upToDate,
  };
}

function sameKey(a: ClimateSeries, b: ClimateSeries) {
  return a.lat === b.lat && a.lon === b.lon;
}
