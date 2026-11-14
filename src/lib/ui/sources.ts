import type { AnalysisResult, SourceMeta } from "@/lib/types";

export interface SourceRef {
  name: string;
  url?: string;
  provider?: string;
  retrievedAt?: string;
  detail?: string;
}

const METHOD_KEYWORDS: [RegExp, string][] = [
  [/FAO-?56/i, "fao56"],
  [/FAO-?33/i, "fao33"],
  [/FAO-?66/i, "fao66"],
  [/Saxton/i, "saxton2006"],
  [/TR-?55|USDA-NRCS/i, "tr55"],
  [/Mann|Kendall|\bSen\b/i, "mk"],
  [/NASA POWER/i, "power"],
];

/**
 * Resolve a source *name* used in engine evidence/explanations to a linkable reference: first the
 * actual data sources of the loaded site (with retrieval date), then the method citations.
 */
export function makeSourceResolver(data: SourceMeta[], methods: AnalysisResult["methodSources"]) {
  return (name: string): SourceRef => {
    const exact = data.find((s) => s.name === name) ?? data.find((s) => name.length > 4 && (s.name.startsWith(name) || name.startsWith(s.name)));
    if (exact) return { name: exact.name, url: exact.url, provider: exact.provider, retrievedAt: exact.retrievedAt, detail: exact.note };
    for (const [re, id] of METHOD_KEYWORDS) {
      if (re.test(name)) {
        const m = methods.find((x) => x.id === id);
        if (m) return { name, url: m.url ?? "/yontem#yontem-kaynaklari", detail: m.citation };
      }
    }
    return { name, url: "/yontem#yontem-kaynaklari" };
  };
}

export function metaToRef(s: SourceMeta): SourceRef {
  return { name: s.name, url: s.url, provider: s.provider, retrievedAt: s.retrievedAt, detail: s.note };
}

/** "2026-11-12T15:23:59Z" → "2026-11-12"; anything non-ISO is returned as is. */
export function isoDay(s: string | undefined): string {
  if (!s) return "";
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : s;
}
