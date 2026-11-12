"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { AnalysisResult, AssumptionItem, LocalizedText, SourceMeta } from "@/lib/types";
import type { CalibrationInfo } from "./calibration";

/** What the methods page shows about the user's latest analysis (kept in sessionStorage). */
export interface LastRun {
  at: string;
  site: string;
  sources: SourceMeta[];
  assumptions: AssumptionItem[];
  calibration: CalibrationInfo | null;
  scenarioNotes: LocalizedText[];
  optimizer: LocalizedText;
}

const KEY = "agroshift.lastRun";

export function saveLastRun(r: AnalysisResult, calibration: CalibrationInfo | null, site: string) {
  const v: LastRun = {
    at: new Date().toISOString(),
    site,
    sources: r.climate.sources,
    assumptions: r.assumptions,
    calibration,
    scenarioNotes: r.scenario.notes,
    optimizer: r.optimizer.method,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
}

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function useLastRun(): LastRun | null {
  const raw = useSyncExternalStore(
    () => () => {},
    read,
    () => null,
  );
  return useMemo(() => {
    if (!raw) return null;
    try {
      return JSON.parse(raw) as LastRun;
    } catch {
      return null;
    }
  }, [raw]);
}
