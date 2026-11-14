"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { searchTurkeyLocations, TURKEY_BASINS } from "@/lib/data/turkeyRegions";
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
 * Place, province, agricultural basin, village or coordinate search across Turkey.
 * Instant local index covers all 81 provinces + 16 major Turkish agricultural plains;
 * submitting also queries Nominatim for any village/neighborhood/street.
 */
export function SearchBox({ onPlace }: { onPlace: (p: LonLat, bbox: [number, number, number, number] | null, zoom?: number) => void }) {
  const { t, lang, n } = useI18n();
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const localHits = useMemo(() => {
    const s = q.trim();
    if (!s) return [];
    return searchTurkeyLocations(s, 6);
  }, [q]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const s = q.trim();
    if (!s || busy) return;
    setErr(null);
    const coord = parseLatLon(s);
    if (coord) {
      setResults(null);
      setFocused(false);
      onPlace(coord, null, 17);
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
      if (localHits.length === 0) setErr(t("search.err"));
    } finally {
      setBusy(false);
    }
  };

  const showDropdown = focused || results !== null || err !== null || localHits.length > 0;

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
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[14px] text-plate-ink outline-none placeholder:text-ink-3"
          placeholder={t("search.ph")}
          value={q}
          onFocus={() => setFocused(true)}
          onChange={(e) => {
            setQ(e.target.value);
            if (!e.target.value.trim()) setResults(null);
          }}
          autoComplete="off"
          enterKeyHint="search"
        />
        {q && (
          <button
            type="button"
            className="flex h-full items-center px-2 text-ink-2 hover:text-ink"
            aria-label={t("common.close")}
            onClick={() => {
              setQ("");
              setResults(null);
              setErr(null);
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={15} />
          </button>
        )}
        <button type="submit" className="h-full shrink-0 border-l border-line px-3 text-[13px] font-semibold disabled:opacity-50" disabled={busy || !q.trim()} aria-busy={busy}>
          {busy ? t("search.busy") : t("search.go")}
        </button>
      </form>
      {showDropdown && (
        <div className="plate absolute inset-x-0 top-12 z-[1200] max-h-[56vh] overflow-y-auto p-1.5 shadow-xl" role="region" aria-label={t("search.results")}>
          {err && <p className="p-2 text-[13px] text-bad">{err}</p>}
          {!q.trim() && focused && (
            <div className="p-1.5">
              <p className="mb-1.5 px-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
                {lang === "tr" ? "Türkiye Tarımsal Havzaları (Hızlı Geçiş)" : "Turkey Agricultural Basins (Quick Jump)"}
              </p>
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                {TURKEY_BASINS.slice(0, 8).map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="flex flex-col items-start rounded-md border border-line/60 px-2.5 py-1.5 text-left hover:bg-surface-2"
                    onClick={() => {
                      setQ(lang === "tr" ? b.nameTr : b.nameEn);
                      setFocused(false);
                      setResults(null);
                      onPlace({ lat: b.lat, lon: b.lon }, null, b.zoom);
                    }}
                  >
                    <span className="text-[13px] font-semibold">{lang === "tr" ? b.nameTr : b.nameEn}</span>
                    <span className="truncate text-[11px] text-ink-2">{b.cropsTr}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {localHits.length > 0 && (
            <div className="mb-1">
              <p className="px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
                {lang === "tr" ? "Türkiye İl ve Havza Rehberi" : "Turkey Provinces & Basins"}
              </p>
              <ul>
                {localHits.map((h) => (
                  <li key={h.id}>
                    <button
                      type="button"
                      className="flex min-h-10 w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left hover:bg-surface-2"
                      onClick={() => {
                        setResults(null);
                        setFocused(false);
                        onPlace(h.point, null, h.zoom);
                      }}
                    >
                      <span className="text-[13px] font-semibold">{h.label}</span>
                      <span className="text-[12px] text-ink-2">
                        {h.sublabel} <span className="readout">({n(h.point.lat, 3)}, {n(h.point.lon, 3)})</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {results && results.length === 0 && localHits.length === 0 && <p className="p-2 text-[13px]">{t("search.none")}</p>}
          {results && results.length > 0 && (
            <div>
              <p className="px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-2">
                {lang === "tr" ? "Köy, Mahalle ve Yerleşim Sonuçları (OSM)" : "Village & Settlement Results (OSM)"}
              </p>
              <ul>
                {results.map((r, i) => (
                  <li key={`${r.lat},${r.lon},${i}`}>
                    <button
                      type="button"
                      className="flex min-h-11 w-full flex-col items-start rounded-md px-2.5 py-1.5 text-left hover:bg-surface-2"
                      onClick={() => {
                        setResults(null);
                        setFocused(false);
                        onPlace({ lat: r.lat, lon: r.lon }, r.bbox, 16);
                      }}
                    >
                      <span className="text-[14px] font-semibold">{r.name}</span>
                      <span className="text-[12px] text-ink-2">
                        {r.detail} <span className="readout">({n(r.lat, 3)}, {n(r.lon, 3)})</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line px-2 pt-1.5 pb-1">
            <span className="readout">© OpenStreetMap / HGM 81 İl Atlası</span>
            <button
              type="button"
              className="btn btn-quiet btn-sm"
              onClick={() => {
                setResults(null);
                setErr(null);
                setFocused(false);
              }}
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
