"use client";

import { useSyncExternalStore } from "react";
import { HINTS_KEY, INTRO_KEY } from "./bootScripts";

/*
 * Welcome overlay and one-line hints. The <html> attributes set by INTRO_BOOT_SCRIPT are the
 * source of truth for what is visible; this store only mirrors them for React effects (focus, inert).
 */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const root = () => document.documentElement;

function readIntroOpen(): boolean {
  return root().getAttribute("data-intro") === "open";
}

/** null during server rendering and hydration. */
export function useIntroOpen(): boolean | null {
  return useSyncExternalStore(subscribe, readIntroOpen, () => null);
}

export function openIntro() {
  root().setAttribute("data-intro", "open");
  emit();
}

export function closeIntro() {
  root().setAttribute("data-intro", "closed");
  try {
    localStorage.setItem(INTRO_KEY, "1");
  } catch {
    /* storage unavailable: the intro will show again next visit, the page still works */
  }
  emit();
}

export type HintId = "tarlam" | "oneriler" | "kanit";

export function dismissHint(id: HintId) {
  const seen = new Set((root().getAttribute("data-hints-seen") ?? "").split(" ").filter(Boolean));
  seen.add(id);
  const v = [...seen].join(" ");
  root().setAttribute("data-hints-seen", v);
  try {
    localStorage.setItem(HINTS_KEY, v);
  } catch {
    /* ignore */
  }
}
