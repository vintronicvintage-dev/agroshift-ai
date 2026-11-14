"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY as KEY } from "./bootScripts";

export type Theme = "light" | "dark";
const listeners = new Set<() => void>();

function current(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function setTheme(t: Theme) {
  document.documentElement.setAttribute("data-theme", t);
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* storage unavailable: the choice lasts for this page view */
  }
  listeners.forEach((l) => l());
}

/** Server and hydration render "light"; the real value arrives right after hydration. */
export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    current,
    () => "light",
  );
}
