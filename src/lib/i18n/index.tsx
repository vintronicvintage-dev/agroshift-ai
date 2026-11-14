"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import type { LocalizedText } from "@/lib/types";
import { DICTS, type DictKey, type Lang } from "./dict";

export type { DictKey, Lang } from "./dict";

import { LANG_KEY as KEY } from "@/lib/ui/bootScripts";
const listeners = new Set<() => void>();

function readLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    return v === "en" ? "en" : "tr";
  } catch {
    return "tr";
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    /* storage unavailable: the choice lasts for this page view only */
  }
  document.documentElement.lang = lang;
  memoryLang = lang;
  listeners.forEach((l) => l());
}

let memoryLang: Lang | null = null;

export type Params = Record<string, string | number>;

export interface I18n {
  lang: Lang;
  t: (key: DictKey, params?: Params) => string;
  /** Pick the active language from engine-provided bilingual text. */
  L: (text: LocalizedText) => string;
  locale: string;
  /** Number with fixed decimals, locale separators. null/NaN → "—". */
  n: (v: number | null | undefined, digits?: number) => string;
  setLang: (lang: Lang) => void;
}

const Ctx = createContext<I18n | null>(null);

export function interpolate(s: string, params?: Params): string {
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const lang = useSyncExternalStore(
    subscribe,
    () => memoryLang ?? readLang(),
    () => "tr" as Lang,
  );
  const t = useCallback((key: DictKey, params?: Params) => interpolate(DICTS[lang][key], params), [lang]);
  const value = useMemo<I18n>(() => {
    const locale = lang === "tr" ? "tr-TR" : "en-GB";
    const fmts = new Map<number, Intl.NumberFormat>();
    const n = (v: number | null | undefined, digits = 0) => {
      if (v === null || v === undefined || !Number.isFinite(v)) return "—";
      let f = fmts.get(digits);
      if (!f) {
        f = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
        fmts.set(digits, f);
      }
      // avoid "-0"
      const r = Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v;
      return f.format(r);
    };
    return { lang, t, L: (x) => x[lang], locale, n, setLang };
  }, [lang, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

