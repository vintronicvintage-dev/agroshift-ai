"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { liveDefaultDate, resolveTileUrl, tileSourceById, TILE_SOURCES, type TileSource } from "@/lib/data/tiles";
import { Icon } from "@/components/ui/Icons";
import { isoLabel } from "@/lib/ui/derive";
import { BASE_SOURCE, OVERLAY_SOURCE, type BaseId, type OverlayId } from "./MapCanvas";

/** Date per time-enabled tile source; defaults to the live latest date (today − latency). */
export function useLayerDates() {
  const [dates, setDates] = useState<Record<string, string>>({});
  useEffect(() => {
    const d: Record<string, string> = {};
    for (const s of TILE_SOURCES) {
      const v = s.timeEnabled ? liveDefaultDate(s) : undefined;
      if (v) d[s.id] = v;
    }
    // HLS Landsat: the registry notes the capabilities "latest" can be an empty tile; start from the verified default
    const l30 = tileSourceById("gibs-hls-l30");
    if (l30?.defaultDate) d[l30.id] = l30.defaultDate;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates(d);
  }, []);
  const setDate = useCallback((id: string, v: string) => setDates((s) => ({ ...s, [id]: v })), []);
  return { dates, setDate };
}

function tileXY(p: LonLat, z: number) {
  const n = 2 ** z;
  const x = Math.floor(((p.lon + 180) / 360) * n);
  const r = (p.lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  return { x, y };
}

const addDays = (iso: string, k: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + k * 86_400_000).toISOString().slice(0, 10);

/**
 * GIBS returns HTTP 200 with a ~334-byte transparent PNG on days without a satellite pass, so the
 * status code says nothing. Probe the z10 tile over the field for the last `days` dates and treat
 * bodies under 400 bytes as "no scene".
 */
function useHlsProbe(src: TileSource | undefined, centroid: LonLat | null, end: string | undefined, days = 30) {
  const [res, setRes] = useState<{ key: string; dates: Record<string, boolean> } | null>(null);
  const key = src && centroid && end ? `${src.id}|${centroid.lat.toFixed(2)},${centroid.lon.toFixed(2)}|${end}` : "";
  useEffect(() => {
    if (!key || !src || !centroid || !end) return;
    let alive = true;
    const { x, y } = tileXY(centroid, 10);
    const list = Array.from({ length: days }, (_, i) => addDays(end, -i));
    const out: Record<string, boolean> = {};
    let idx = 0;
    const worker = async () => {
      while (alive && idx < list.length) {
        const d = list[idx++];
        try {
          const r = await fetch(resolveTileUrl(src, 10, x, y, d));
          const b = await r.blob();
          out[d] = r.ok && b.size >= 400;
        } catch {
          out[d] = false;
        }
      }
    };
    void Promise.all(Array.from({ length: 6 }, worker)).then(() => alive && setRes({ key, dates: { ...out } }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return res && res.key === key ? res.dates : null;
}

interface Props {
  base: BaseId;
  overlays: OverlayId[];
  cells: boolean;
  onChange: (p: { base?: BaseId; overlays?: OverlayId[]; cells?: boolean }) => void;
  onClose: () => void;
  dates: Record<string, string>;
  setDate: (id: string, v: string) => void;
  centroid: LonLat | null;
}

export function LayerMenu({ base, overlays, cells, onChange, onClose, dates, setDate, centroid }: Props) {
  const { t, lang } = useI18n();
  const title = (id: string) => {
    const s = tileSourceById(id);
    return s ? (lang === "tr" ? s.titleTr : s.titleEn) : id;
  };
  const toggle = (o: OverlayId) => onChange({ overlays: overlays.includes(o) ? overlays.filter((x) => x !== o) : [...overlays, o] });
  const bases: BaseId[] = ["s2", "hls-s30", "hls-l30", "relief"];
  const ovs: OverlayId[] = ["labels", "roads", "ndvi", "smap", "imerg"];
  const timed = [base === "hls-s30" || base === "hls-l30" ? BASE_SOURCE[base] : null, ...overlays.map((o) => OVERLAY_SOURCE[o])].filter((id): id is string => !!id && !!tileSourceById(id)?.timeEnabled);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="plate absolute right-2 top-[7.25rem] z-[1001] max-h-[calc(100%-9rem)] w-[min(22rem,calc(100%-4.5rem))] overflow-y-auto p-3 scroll-thin sm:right-3" role="dialog" aria-label={t("layers.title")}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{t("layers.title")}</h2>
        <button type="button" className="btn btn-quiet btn-icon -mr-2" aria-label={t("common.close")} onClick={onClose}>
          <Icon name="close" size={18} />
        </button>
      </div>
      <fieldset className="mt-1">
        <legend className="label mb-1">{t("layers.base")}</legend>
        {bases.map((b) => {
          const s = tileSourceById(BASE_SOURCE[b])!;
          return (
            <label key={b} className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5">
              <input type="radio" name="base" className="mt-1 size-4 accent-[var(--accent-ink)]" checked={base === b} onChange={() => onChange({ base: b })} />
              <span>
                <span className="block text-[14px] font-medium">{title(s.id)}</span>
                <span className="block text-[12px] text-ink-2">{t(`layers.note.${b}`)}</span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <fieldset className="mt-2 border-t border-line pt-2">
        <legend className="label mb-1 pt-2">{t("layers.overlays")}</legend>
        {ovs.map((o) => {
          const s = tileSourceById(OVERLAY_SOURCE[o])!;
          return (
            <div key={o}>
              <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--accent-ink)]" checked={overlays.includes(o)} onChange={() => toggle(o)} />
                <span>
                  <span className="block text-[14px] font-medium">{title(s.id)}</span>
                  <span className="block text-[12px] text-ink-2">{t(`layers.note.${o}`)}</span>
                </span>
              </label>
              {overlays.includes(o) && s.legendUrl && (
                <figure className="mb-2 ml-6.5 rounded-md bg-white p-1.5">
                  {/* GIBS publishes the real palette of each layer as an SVG legend */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.legendUrl} alt={t("layers.legendAlt", { layer: title(s.id) })} className="h-auto w-full" loading="lazy" />
                  <figcaption className="mt-1 font-mono text-[11px] text-[#333]">{t("layers.legendNote")}</figcaption>
                </figure>
              )}
            </div>
          );
        })}
        <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1.5">
          <input type="checkbox" className="mt-1 size-4 accent-[var(--accent-ink)]" checked={cells} onChange={() => onChange({ cells: !cells })} />
          <span>
            <span className="block text-[14px] font-medium">{t("layers.cells")}</span>
            <span className="block text-[12px] text-ink-2">{t("layers.note.cells")}</span>
          </span>
        </label>
      </fieldset>
      {timed.map((id) => (
        <DateControl key={id} src={tileSourceById(id)!} value={dates[id]} onChange={(v) => setDate(id, v)} centroid={centroid} />
      ))}
      <p className="mt-3 border-t border-line pt-2 text-[12px] text-ink-2">{t("layers.licence")}</p>
    </div>
  );
}

function DateControl({ src, value, onChange, centroid }: { src: TileSource; value: string | undefined; onChange: (v: string) => void; centroid: LonLat | null }) {
  const { t, lang } = useI18n();
  const latest = liveDefaultDate(src) ?? src.defaultDate;
  const step = src.period === "P16D" ? 16 : 1;
  const isHls = src.id.startsWith("gibs-hls");
  const avail = useHlsProbe(isHls ? src : undefined, centroid, isHls ? latest : undefined);
  const title = lang === "tr" ? src.titleTr : src.titleEn;
  const v = value ?? latest ?? "";
  const clear = avail ? Object.entries(avail).filter(([, ok]) => ok).map(([d]) => d).sort().reverse() : [];
  const move = (k: number) => {
    const nx = addDays(v, k * step);
    if (latest && nx > latest) return;
    if (src.firstDate && nx < src.firstDate) return;
    onChange(nx);
  };
  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="text-[13px] font-semibold">{t("date.title", { layer: title })}</p>
      <div className="mt-1.5 flex items-center gap-1">
        <button type="button" className="btn btn-icon" aria-label={t("date.prev")} onClick={() => move(-1)}>
          <Icon name="chevron-left" size={18} />
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t("date.pick")}</span>
          <input type="date" className="input font-mono text-[14px]" value={v} min={src.firstDate} max={latest} onChange={(e) => e.target.value && onChange(e.target.value)} />
        </label>
        <button type="button" className="btn btn-icon" aria-label={t("date.next")} disabled={!!latest && v >= latest} onClick={() => move(1)}>
          <Icon name="chevron-right" size={18} />
        </button>
      </div>
      <p className="readout mt-1">{t("date.latest", { d: latest ? isoLabel(latest, lang) : "–", lag: src.latencyDays ?? 0 })}</p>
      {isHls && (
        <div className="mt-2">
          {!centroid && <p className="text-[12px] text-ink-2">{t("date.hls.needField")}</p>}
          {centroid && !avail && <p className="text-[12px] text-ink-2">{t("date.hls.probing")}</p>}
          {centroid && avail && (
            <>
              <p className="text-[12px] text-ink-2">{clear.length ? t("date.hls.found", { n: clear.length }) : t("date.hls.none")}</p>
              {v && avail[v] === false && <p className="mt-1 text-[12px] font-medium text-bad">{t("date.hls.blank")}</p>}
              {clear.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {clear.slice(0, 6).map((d) => (
                    <button key={d} type="button" className={`btn btn-sm font-mono text-[12px] ${d === v ? "btn-primary" : ""}`} onClick={() => onChange(d)}>
                      {isoLabel(d, lang, false)}
                    </button>
                  ))}
                </div>
              )}
              <p className="mt-1 text-[12px] text-ink-2">{t("date.hls.cloud")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
