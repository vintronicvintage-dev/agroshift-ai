"use client";

import { useSyncExternalStore } from "react";

/**
 * Sections of the dashboard on "/". The URL hash holds the current one (`#tarlam`, `#oneriler`,
 * `#kanit`); no hash or `#genel` is the overview. The back button walks through them.
 */
export const SECTIONS = ["genel", "tarlam", "oneriler", "kanit"] as const;
export type SectionId = (typeof SECTIONS)[number];
/** The three v1.1 steps, still the order of the work. */
export const STEPS = ["tarlam", "oneriler", "kanit"] as const;
export type StepId = (typeof STEPS)[number];

export function sectionFromHash(hash: string): SectionId {
  const h = hash.replace(/^#/, "");
  return (SECTIONS as readonly string[]).includes(h) ? (h as SectionId) : "genel";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Server and hydration render the overview; the client then follows the hash. */
export function useSectionHash(): SectionId {
  return useSyncExternalStore(
    subscribe,
    () => sectionFromHash(window.location.hash),
    () => "genel" as SectionId,
  );
}

/** Push a history entry so the browser back button walks back through the sections. */
export function goToSection(s: SectionId) {
  if (sectionFromHash(window.location.hash) === s && (window.location.hash || s === "genel")) return;
  window.location.hash = s;
}

export const goToStep = goToSection;
