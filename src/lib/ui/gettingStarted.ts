import { useSyncExternalStore } from "react";
import { GS_KEY } from "./bootScripts";

/** The five "Getting started" cards, in order. Each is ticked by a real user action. */
export const GS_STEPS = ["field", "water", "compare", "scenario", "evidence"] as const;
export type GsStep = (typeof GS_STEPS)[number];

export interface GsState {
  done: GsStep[];
  dismissed: boolean;
  /** Reopened from the sidebar after completion: show the full strip again. */
  reopened: boolean;
}

export const GS_EMPTY: GsState = { done: [], dismissed: false, reopened: false };

/** Value of html[data-gs] for a state (must match GS_BOOT_SCRIPT). */
export function gsAttr(s: GsState): string {
  const a: string[] = [];
  if (s.dismissed) a.push("dismissed");
  if (s.done.length >= GS_STEPS.length && !s.reopened) a.push("done");
  return a.join(" ");
}

export function parseGs(raw: string | null): GsState {
  if (!raw) return GS_EMPTY;
  try {
    const v = JSON.parse(raw) as Partial<GsState> | null;
    if (!v || typeof v !== "object") return GS_EMPTY;
    const done = Array.isArray(v.done) ? GS_STEPS.filter((s) => (v.done as unknown[]).includes(s)) : [];
    return { done, dismissed: v.dismissed === true, reopened: v.reopened === true };
  } catch {
    return GS_EMPTY;
  }
}

// ── store ──────────────────────────────────────────────────────────────────
let cache: GsState | null = null;
const listeners = new Set<() => void>();

function read(): GsState {
  if (cache) return cache;
  try {
    cache = parseGs(localStorage.getItem(GS_KEY));
  } catch {
    cache = GS_EMPTY;
  }
  return cache;
}

function write(next: GsState) {
  cache = next;
  try {
    localStorage.setItem(GS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable: progress lasts for this page view only */
  }
  const attr = gsAttr(next);
  if (attr) document.documentElement.setAttribute("data-gs", attr);
  else document.documentElement.removeAttribute("data-gs");
  listeners.forEach((l) => l());
}

export function markGsDone(step: GsStep) {
  const s = read();
  if (s.done.includes(step)) return;
  write({ ...s, done: GS_STEPS.filter((x) => x === step || s.done.includes(x)) });
}

export function dismissGs() {
  write({ ...read(), dismissed: true });
}

export function reopenGs() {
  write({ ...read(), dismissed: false, reopened: true });
}

/** Collapse the strip back to its one-line summary once everything is ticked. */
export function collapseGs() {
  write({ ...read(), reopened: false });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Server render and hydration see the empty state; the client then reads storage. */
export function useGettingStarted(): GsState {
  return useSyncExternalStore(subscribe, read, () => GS_EMPTY);
}
