"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { tileSourceById } from "@/lib/data/tiles";
import { PILOTS } from "@/lib/data/pilots";
import {
  getStore,
  makeField,
  pilotField,
  removeSaved,
  saveField,
  setField,
  setStore,
  updateFieldRing,
  useStore,
  type ActiveField,
} from "@/lib/ui/fieldStore";
import { circleRing, describeRing, radiusForDa, ringFromGeoJSON, ringProblem, ringToGeoJSON, type Ring, type RingProblem } from "@/lib/ui/geo";
import { Icon, type IconName } from "@/components/ui/Icons";
import { useFieldData } from "@/components/data/FieldData";
import type { BaseId, CellBox, DrawMode, LiveShape, MapHandle, OverlayId } from "./MapCanvas";
import { BASE_SOURCE, OVERLAY_SOURCE } from "./MapCanvas";
import { SearchBox } from "./SearchBox";
import { LayerMenu, useLayerDates } from "./LayerMenu";
import { FieldPanel } from "./FieldPanel";
import { CoordDialog, PinDialog } from "./Dialogs";

const MapCanvas = dynamic(() => import("./MapCanvas"), { ssr: false, loading: () => <div className="skel absolute inset-0 rounded-none" /> });

const LAYERS_KEY = "agroshift.layers";

export function FieldWorkspace() {
  const { t, n, lang } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const field = store.field;
  const mapRef = useRef<MapHandle | null>(null);
  const [mode, setMode] = useState<DrawMode>("none");
  const [live, setLive] = useState<LiveShape | null>(null);
  const [problem, setProblem] = useState<RingProblem | "geojson" | null>(null);
  const [view, setView] = useState<{ zoom: number; center: LonLat } | null>(null);
  const [layerState, setLayerState] = useState<{ base: BaseId; overlays: OverlayId[]; cells: boolean }>({ base: "s2", overlays: ["labels"], cells: false });
  const [layersOpen, setLayersOpen] = useState(false);
  const [tileErr, setTileErr] = useState<string | null>(null);
  const [pinAt, setPinAt] = useState<LonLat | null>(null);
  const [coordOpen, setCoordOpen] = useState(false);
  const [history, setHistory] = useState<{ past: Ring[]; future: Ring[] }>({ past: [], future: [] });
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("half");
  const [announce, setAnnounce] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { dates, setDate } = useLayerDates();

  // remember the layer choice (per viewer)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYERS_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (v && typeof v.base === "string") setLayerState((s) => ({ ...s, ...v }));
      }
    } catch {
      /* ignore */
    }
  }, []);
  const updateLayers = (patch: Partial<typeof layerState>) => {
    setLayerState((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(LAYERS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  // fit the map to the field when a different field becomes active
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    if (!field || lastFit.current === field.id) return;
    const id = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.fitRing(field.ring);
        lastFit.current = field.id;
      }
    }, 60);
    return () => clearTimeout(id);
  });

  const commit = useCallback(
    (ring: Ring, kind: ActiveField["kind"], extra?: { center?: LonLat; radiusM?: number }) => {
      const pr = ringProblem(ring);
      if (pr) {
        setProblem(pr);
        return;
      }
      setProblem(null);
      const cur = currentField();
      if (cur) setHistory((h) => ({ past: [...h.past, cur.ring].slice(-50), future: [] }));
      const name = cur?.name && !cur.pilotId ? cur.name : t("f.newName");
      const f = makeField(ring, kind, name, extra);
      lastFit.current = f.id; // keep the view where the person drew
      setField(f);
      setMode("none");
      setLive(null);
      setAnnounce(t("draw.done", { da: n(f.areaDa, f.areaDa < 100 ? 1 : 0) }));
    },
    [t, n],
  );

  const edit = useCallback(
    (ring: Ring) => {
      const pr = ringProblem(ring);
      if (pr) {
        setProblem(pr);
        return;
      }
      setProblem(null);
      const cur = currentField();
      if (cur) setHistory((h) => ({ past: [...h.past, cur.ring].slice(-50), future: [] }));
      updateFieldRing(ring, "polygon");
      setLive(null);
    },
    [],
  );

  const undo = () => {
    if (mode !== "none" && mode !== "edit" && mapRef.current?.undoVertex()) return;
    const cur = currentField();
    if (!cur || !history.past.length) return;
    const prev = history.past[history.past.length - 1];
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [cur.ring, ...h.future] }));
    updateFieldRing(prev);
  };
  const redo = () => {
    const cur = currentField();
    if (!cur || !history.future.length) return;
    const nx = history.future[0];
    setHistory((h) => ({ past: [...h.past, cur.ring], future: h.future.slice(1) }));
    updateFieldRing(nx);
  };

  // Ctrl+Z / Ctrl+Shift+Z, Esc leaves a drawing mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape" && mode !== "none") setMode("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const choosePilot = (id: string) => {
    const f = pilotField(id, lang);
    if (!f) return;
    setHistory({ past: [], future: [] });
    setMode("none");
    setField(f);
  };

  const onPin = (p: LonLat) => {
    setPinAt(p);
  };
  const pinCommit = (da: number) => {
    if (!pinAt) return;
    const r = radiusForDa(da);
    commit(circleRing(pinAt, r), "pin", { center: pinAt, radiusM: r });
    setPinAt(null);
  };

  const exportGeo = () => {
    if (!field) return;
    const g = describeRing(field.ring);
    const fc = { type: "FeatureCollection", features: [ringToGeoJSON(field.ring, { name: field.name, areaDa: g.areaDa, areaHa: g.areaHa, kind: field.kind, createdAt: field.createdAt, source: "AgroShift" })] };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${field.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "tarla"}.geojson`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const importGeo = async (file: File) => {
    try {
      const txt = await file.text();
      const ring = ringFromGeoJSON(JSON.parse(txt));
      const props = (JSON.parse(txt)?.features?.[0]?.properties ?? JSON.parse(txt)?.properties ?? {}) as { name?: string };
      const f = makeField(ring, "polygon", typeof props.name === "string" && props.name.trim() ? props.name.trim() : file.name.replace(/\.(geo)?json$/i, ""));
      setProblem(null);
      setField(f);
    } catch {
      setProblem("geojson");
    }
  };

  // ── data-cell footprints around the centroid ─────────────────────────
  const centroid = field ? describeRing(field.ring).centroid : null;
  const cells: CellBox[] | null = useMemo(() => {
    if (!layerState.cells || !centroid) return null;
    const { lat, lon } = centroid;
    const k = { lat: 111_320, lon: 111_320 * Math.cos((lat * Math.PI) / 180) };
    const sq = (m: number, id: string, label: string, dash?: string): CellBox => ({ id, label, dash, bounds: [[lat - m / 2 / k.lat, lon - m / 2 / k.lon], [lat + m / 2 / k.lat, lon + m / 2 / k.lon]] });
    // NASA POWER (MERRA-2) grid: 0.5° × 0.625°, cell centres on multiples of the step
    const pLat = Math.round(lat / 0.5) * 0.5;
    const pLon = Math.round(lon / 0.625) * 0.625;
    const eLat = Math.round(lat / 0.25) * 0.25;
    const eLon = Math.round(lon / 0.25) * 0.25;
    return [
      { id: "power", label: t("cells.power"), bounds: [[pLat - 0.25, pLon - 0.3125], [pLat + 0.25, pLon + 0.3125]] },
      { id: "era5", label: t("cells.era5"), dash: "2 4", bounds: [[eLat - 0.125, eLon - 0.125], [eLat + 0.125, eLon + 0.125]] },
      sq(9000, "smap", t("cells.smap"), "6 4"),
      sq(250, "modis", t("cells.modis"), "3 3"),
      sq(30, "dem", t("cells.dem")),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerState.cells, centroid?.lat, centroid?.lon, t]);

  const timeLayers = [layerState.base !== "s2" && layerState.base !== "relief" ? BASE_SOURCE[layerState.base] : null, ...layerState.overlays.map((o) => OVERLAY_SOURCE[o])]
    .filter((x): x is string => !!x)
    .filter((id) => tileSourceById(id)?.timeEnabled);

  const overZoom = view && layerState.base === "s2" && view.zoom > 14;
  const drawing = mode === "polygon" || mode === "rectangle" || mode === "circle";
  const liveText = live && live.areaM2 > 0 ? `${n(live.areaM2 / 1000, live.areaM2 < 100_000 ? 1 : 0)} ${t("u.da")} · ${n(live.areaM2 / 10_000, 2)} ha` : null;

  const tools: { id: DrawMode; icon: IconName; label: string }[] = [
    { id: "polygon", icon: "polygon", label: t("draw.polygon") },
    { id: "rectangle", icon: "rectangle", label: t("draw.rectangle") },
    { id: "circle", icon: "circle", label: t("draw.circle") },
    { id: "pin", icon: "pin", label: t("draw.pin") },
  ];

  const hint =
    mode === "polygon" ? t("draw.hint.polygon") : mode === "rectangle" ? t("draw.hint.rectangle") : mode === "circle" ? t("draw.hint.circle") : mode === "pin" ? t("draw.hint.pin") : mode === "edit" ? t("draw.hint.edit") : null;

  return (
    <div className="workspace relative flex flex-col overflow-hidden md:flex-row">
      {/* ── map ─────────────────────────────────────────────────────── */}
      <section className="relative min-h-0 flex-1" aria-label={t("map.region")}>
        <MapCanvas
          ref={mapRef}
          label={t("map.label")}
          ring={field?.ring ?? null}
          saved={store.saved.filter((s) => s.id !== field?.id)}
          mode={mode}
          base={layerState.base}
          overlays={layerState.overlays}
          dates={dates}
          cells={cells}
          onCommit={commit}
          onEdit={edit}
          onPin={onPin}
          onLive={setLive}
          onView={setView}
          onPickSaved={(id) => {
            const s = store.saved.find((x) => x.id === id);
            if (s) setField(s);
          }}
          onTileError={(id) => setTileErr(id)}
          onProblem={(c) => setProblem(c)}
        />
        {drawing && (
          <svg className="crosshair" viewBox="0 0 36 36" aria-hidden="true">
            <path d="M18 2v12M18 22v12M2 18h12M22 18h12" stroke="#0b0e0c" strokeWidth="4" />
            <path d="M18 2v12M18 22v12M2 18h12M22 18h12" stroke="#d4ff3a" strokeWidth="1.5" />
          </svg>
        )}

        {/* top: search + location + examples */}
        <div className="pointer-events-none absolute inset-x-2 top-2 z-[1000] flex flex-col gap-2 sm:inset-x-3 sm:top-3">
          <div className="pointer-events-auto flex max-w-[34rem] items-start gap-2">
            <SearchBox
              onPlace={(p, bbox) => {
                if (bbox) mapRef.current?.fitRing([{ lat: bbox[1], lon: bbox[0] }, { lat: bbox[3], lon: bbox[2] }]);
                else mapRef.current?.flyTo(p, 15);
              }}
            />
            <LocateButton onPlace={(p) => mapRef.current?.flyTo(p, 16)} />
            <button type="button" className={`plate flex h-11 shrink-0 items-center gap-2 px-3 text-[14px] font-medium ${layersOpen ? "outline-2 outline-[var(--accent-ink)]" : ""}`} aria-pressed={layersOpen} onClick={() => setLayersOpen((v) => !v)}>
              <Icon name="layers" size={18} />
              <span className="hidden lg:inline">{t("layers.short")}</span>
              <span className="sr-only lg:hidden">{t("layers.open")}</span>
            </button>
          </div>
          <div className="pointer-events-auto flex max-w-full gap-1.5 overflow-x-auto pb-1 scroll-thin" role="group" aria-label={t("ex.label")}>
            <span className="plate hidden shrink-0 items-center px-2.5 text-[13px] text-ink-2 sm:flex">{t("ex.label")}</span>
            {PILOTS.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`plate btn-sm shrink-0 px-3 text-[13px] font-medium ${field?.pilotId === p.id ? "outline-2 outline-[var(--accent-ink)]" : ""}`}
                aria-pressed={field?.pilotId === p.id}
                onClick={() => choosePilot(p.id)}
              >
                {lang === "tr" ? p.nameTr : p.nameEn}
              </button>
            ))}
          </div>
          {overZoom && <p className="plate pointer-events-auto self-start px-3 py-1.5 text-[13px] ml-14 max-sm:hidden">{t("map.overzoom")}</p>}
        </div>

        {/* left: drawing toolbar */}
        <div className="absolute left-2 top-[7.25rem] z-[1000] flex flex-col gap-2 sm:left-3" role="toolbar" aria-label={t("draw.toolbar")} aria-orientation="vertical">
          <div className="plate flex flex-col overflow-hidden p-0.5">
            {tools.map((tl) => (
              <ToolButton key={tl.id} icon={tl.icon} label={tl.label} pressed={mode === tl.id} onClick={() => setMode(mode === tl.id ? "none" : tl.id)} />
            ))}
            <ToolButton icon="keyboard" label={t("draw.coords")} onClick={() => setCoordOpen(true)} />
          </div>
          <div className="plate flex flex-col overflow-hidden p-0.5">
            <ToolButton icon="edit" label={t("draw.edit")} pressed={mode === "edit"} disabled={!field} onClick={() => setMode(mode === "edit" ? "none" : "edit")} />
            <ToolButton icon="undo" label={t("draw.undo")} disabled={!history.past.length && !(live && live.vertices > 0)} onClick={undo} />
            <ToolButton icon="redo" label={t("draw.redo")} disabled={!history.future.length} onClick={redo} />
            <ToolButton icon="trash" label={t("draw.clear")} disabled={!field} onClick={() => {
              const cur = currentField();
              if (cur) setHistory((h) => ({ past: [...h.past, cur.ring], future: [] }));
              setField(null);
            }} />
          </div>
          <div className="plate hidden flex-col overflow-hidden p-0.5 [@media(min-height:860px)]:flex">
            <ToolButton icon="upload" label={t("geo.import")} onClick={() => fileRef.current?.click()} />
            <ToolButton icon="download" label={t("geo.export")} disabled={!field} onClick={exportGeo} />
          </div>
          <input ref={fileRef} type="file" accept=".geojson,.json,application/geo+json,application/json" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importGeo(f);
            e.target.value = "";
          }} />
        </div>

        {layersOpen && (
          <LayerMenu
            base={layerState.base}
            overlays={layerState.overlays}
            cells={layerState.cells}
            onChange={updateLayers}
            onClose={() => setLayersOpen(false)}
            dates={dates}
            setDate={setDate}
            centroid={centroid}
          />
        )}

        {/* bottom: drawing bar, notices, time control */}
        <div className="pointer-events-none absolute inset-x-2 bottom-16 z-[1000] flex flex-col items-center gap-2 sm:bottom-28">
          {(hint || liveText || problem) && (
            <div className="plate pointer-events-auto flex max-w-[40rem] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-3 py-2 text-[14px]" role="status">
              {hint && <span>{hint}</span>}
              {liveText && <span className="numeral text-[22px]">{liveText}</span>}
              {live?.radiusM ? <span className="readout">r = {n(live.radiusM)} m</span> : null}
              {problem && <span className="font-medium text-bad">{t(`draw.err.${problem}`)}</span>}
            </div>
          )}
          {drawing && (
            <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5">
              <button type="button" className="btn btn-primary" onClick={() => mapRef.current?.addVertexAtCenter()}>
                <Icon name="crosshair" size={18} />
                {t("draw.addCenter")}
              </button>
              {mode === "polygon" && (
                <button type="button" className="btn" onClick={() => mapRef.current?.finish()}>
                  <Icon name="check" size={18} />
                  {t("draw.finish")}
                </button>
              )}
              <button type="button" className="btn" onClick={() => mapRef.current?.undoVertex()}>
                <Icon name="undo" size={18} />
                {t("draw.undoPoint")}
              </button>
              <button type="button" className="btn" onClick={() => setMode("none")}>
                {t("draw.cancel")}
              </button>
            </div>
          )}
          {mode === "edit" && (
            <button type="button" className="btn btn-primary pointer-events-auto" onClick={() => setMode("none")}>
              <Icon name="check" size={18} />
              {t("draw.editDone")}
            </button>
          )}
          {tileErr && timeLayers.includes(tileErr) && (
            <p className="plate pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-[13px]">
              <Icon name="alert" size={16} />
              {t("map.tileErr", { layer: lang === "tr" ? tileSourceById(tileErr)?.titleTr ?? "" : tileSourceById(tileErr)?.titleEn ?? "" })}
              <button type="button" className="underline" onClick={() => setTileErr(null)}>
                {t("common.ok")}
              </button>
            </p>
          )}
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </section>

      {/* ── field information panel / bottom sheet ─────────────────── */}
      <section
        aria-label={t("panel.region")}
        className={`relative z-[1050] flex min-h-0 flex-col border-line bg-bg md:static md:h-auto md:w-[420px] md:border-l lg:w-[440px] ${sheet === "peek" ? "h-[132px]" : sheet === "half" ? "h-[48%]" : "h-[88%]"} max-md:absolute max-md:inset-x-0 max-md:bottom-0 max-md:rounded-t-[10px] max-md:border-t`}
      >
        <div className="flex items-center justify-center md:hidden">
          <button
            type="button"
            className="tap w-full justify-center gap-2 text-[13px] text-ink-2"
            aria-label={sheet === "full" ? t("sheet.lower") : t("sheet.raise")}
            onClick={() => setSheet(sheet === "peek" ? "half" : sheet === "half" ? "full" : "peek")}
          >
            <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden="true" />
          </button>
        </div>
        <div id="panel-scroll" className="min-h-0 flex-1 overflow-y-auto scroll-thin">
          <FieldPanel
            onDraw={() => {
              setMode("polygon");
              setSheet("peek");
            }}
            onPin={() => {
              setMode("pin");
              setSheet("peek");
            }}
            onPilot={choosePilot}
            onSave={saveField}
            onOpenSaved={(id) => {
              const s = store.saved.find((x) => x.id === id);
              if (s) setField(s);
            }}
            onRemoveSaved={removeSaved}
            onCells={() => updateLayers({ cells: !layerState.cells })}
            cellsOn={layerState.cells}
            onDismissHint={() => setStore({ hintDismissed: true })}
            onImport={() => fileRef.current?.click()}
            onExport={exportGeo}
          />
        </div>
        {field && (
          <div className="no-print border-t border-line bg-bg p-3">
            <Link href="/plan" className="btn btn-primary w-full text-[15px]" style={{ minHeight: 48 }}>
              <Icon name="plan" size={20} />
              {t("cta.plan")}
            </Link>
            {data.analysis.running && <p className="mt-1.5 text-center text-[13px] text-ink-2">{t("cta.planBusy")}</p>}
          </div>
        )}
      </section>

      {pinAt && <PinDialog onCancel={() => setPinAt(null)} onDone={pinCommit} />}
      {coordOpen && (
        <CoordDialog
          center={view?.center ?? null}
          onCancel={() => setCoordOpen(false)}
          onRing={(ring) => {
            setCoordOpen(false);
            commit(ring, "polygon");
            setTimeout(() => mapRef.current?.fitRing(ring), 50);
          }}
          onPin={(p) => {
            setCoordOpen(false);
            mapRef.current?.flyTo(p, 15);
            setPinAt(p);
          }}
        />
      )}
    </div>
  );
}

/** Latest store value, read in event handlers (not during render). */
function currentField(): ActiveField | null {
  return getStore().field;
}

function ToolButton({ icon, label, pressed, disabled, onClick }: { icon: IconName; label: string; pressed?: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`flex size-11 items-center justify-center rounded-[5px] ${pressed ? "bg-accent text-on-accent" : "text-plate-ink hover:bg-surface-2"} disabled:opacity-40`}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={20} />
    </button>
  );
}

function LocateButton({ onPlace }: { onPlace: (p: LonLat) => void }) {
  const { t, n } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "err">("idle");
  const [acc, setAcc] = useState<number | null>(null);
  return (
    <div className="relative">
      <button
        type="button"
        className="plate flex h-11 items-center gap-2 px-3 text-[14px] font-medium"
        aria-busy={state === "busy"}
        onClick={() => {
          if (!navigator.geolocation) {
            setState("err");
            return;
          }
          setState("busy");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setState("idle");
              setAcc(pos.coords.accuracy);
              onPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            },
            () => setState("err"),
            { enableHighAccuracy: true, timeout: 15_000 },
          );
        }}
      >
        <Icon name="locate" size={18} />
        <span className="hidden sm:inline">{t("loc.use")}</span>
      </button>
      {(state === "err" || (acc !== null && acc > 100)) && (
        <p className="plate absolute right-0 top-12 w-64 p-2.5 text-[13px]" role="status">
          {state === "err" ? t("loc.err") : t("loc.coarse", { m: n(acc ?? 0) })}
        </p>
      )}
    </div>
  );
}
