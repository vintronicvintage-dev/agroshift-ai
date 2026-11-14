"use client";

import { useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { parseLatLon } from "@/lib/ui/geo";
import { Icon } from "@/components/ui/Icons";

interface Result {
  name: string;
  detail: string;
  lat: number;
  lon: number;
  kind: string;
  bbox: [number, number, number, number] | null;
}

const cache = new Map<string, Result[]>();

/**
 * Place or coordinate search. Searches only when submitted (no search-as-you-type, per the
 * Nominatim policy); one request at a time; answers cached for the session.
 */
export function SearchBox({ onPlace }: { onPlace: (p: LonLat, bbox: [number, number, number, number] | null) => void }) {
  const { t, lang, n } = useI18n();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s || busy) return;
    setErr(null);
    const coord = parseLatLon(s);
    if (coord) {
      setResults(null);
      onPlace(coord, null);
      return;
    }
    const key = `${lang}|${s.toLocaleLowerCase("tr")}`;
    const hit = cache.get(key);
    if (hit) {
      setResults(hit);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(s)}&lang=${lang}`);
      const body = (await res.json().catch(() => null)) as { results?: Result[] } | null;
      if (!res.ok || !body?.results) throw new Error("search");
      cache.set(key, body.results);
      setResults(body.results);
    } catch {
      setErr(t("search.err"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative min-w-0 flex-1">
      <form role="search" onSubmit={submit} className="plate flex h-11 items-center overflow-hidden pl-3">
        <Icon name="search" size={18} className="shrink-0 text-ink-2" />
        <label htmlFor="yer-ara" className="sr-only">
          {t("search.label")}
        </label>
        <input
          ref={inputRef}
          id="yer-ara"
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] text-plate-ink outline-none placeholder:text-ink-3"
          placeholder={t("search.ph")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          enterKeyHint="search"
        />
        <button type="submit" className="h-full shrink-0 border-l border-line px-3 text-[14px] font-semibold disabled:opacity-50" disabled={busy || !q.trim()} aria-busy={busy}>
          {busy ? t("search.busy") : t("search.go")}
        </button>
      </form>
      {(results || err) && (
        <div className="plate absolute inset-x-0 top-12 z-10 max-h-[50vh] overflow-y-auto p-1" role="region" aria-label={t("search.results")}>
          {err && <p className="p-2 text-[14px] text-bad">{err}</p>}
          {results && results.length === 0 && <p className="p-2 text-[14px]">{t("search.none")}</p>}
          {results && results.length > 0 && (
            <ul>
              {results.map((r, i) => (
                <li key={`${r.lat},${r.lon},${i}`}>
                  <button
                    type="button"
                    className="flex min-h-11 w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left hover:bg-surface-2"
                    onClick={() => {
                      setResults(null);
                      onPlace({ lat: r.lat, lon: r.lon }, r.bbox);
                    }}
                  >
                    <span className="text-[14px] font-semibold">{r.name}</span>
                    <span className="text-[13px] text-ink-2">
                      {r.detail} <span className="readout">({n(r.lat, 3)}, {n(r.lon, 3)})</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-2 pt-1.5 pb-1">
            <span className="readout">© OpenStreetMap contributors (ODbL)</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => { setResults(null); setErr(null); }}>
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
