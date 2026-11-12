"use client";

import { useSyncExternalStore } from "react";

/** The three steps of the guided flow, in order. The URL hash holds the current one. */
export const STEPS = ["tarlam", "oneriler", "kanit"] as const;
export type StepId = (typeof STEPS)[number];

export function stepFromHash(hash: string): StepId {
  const h = hash.replace(/^#/, "");
  return (STEPS as readonly string[]).includes(h) ? (h as StepId) : "tarlam";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Server and hydration render "tarlam"; the client then follows the hash (back button included). */
export function useStepHash(): StepId {
  return useSyncExternalStore(
    subscribe,
    () => stepFromHash(window.location.hash),
    () => "tarlam" as StepId,
  );
}

/** Push a history entry so the browser back button walks back through the steps. */
export function goToStep(s: StepId) {
  if (stepFromHash(window.location.hash) === s && window.location.hash) return;
  window.location.hash = s;
}
