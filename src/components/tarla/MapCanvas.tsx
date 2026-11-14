"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import type * as Leaf from "leaflet";
import type { LonLat } from "@/lib/data/fieldTypes";
import { tileSourceById } from "@/lib/data/tiles";
import { circleRing, cornersRing, describeRing, distanceM, ringAreaM2, ringPerimeterM, type Ring } from "@/lib/ui/geo";

export type DrawMode = "none" | "polygon" | "rectangle" | "circle" | "pin" | "edit";
export type BaseId = "esri" | "street" | "topo" | "s2" | "hls-s30" | "hls-l30" | "relief";
export type OverlayId = "labels" | "roads" | "ndvi" | "smap" | "imerg" | "srtm";

export const BASE_SOURCE: Record<BaseId, string> = {
  esri: "esri-world-imagery",
  street: "carto-voyager",
  topo: "opentopomap",
  s2: "eox-s2cloudless-2017",
  "hls-s30": "gibs-hls-s30",
  "hls-l30": "gibs-hls-l30",
  relief: "gibs-aster-relief",
};
export const OVERLAY_SOURCE: Record<OverlayId, string> = {
  labels: "carto-voyager-labels",
  roads: "esri-world-transportation",
  ndvi: "gibs-modis-ndvi-8day",
  smap: "gibs-smap-l4-surface-sm",
  imerg: "gibs-imerg-precip",
  srtm: "gibs-srtm-color",
};

export interface MapHandle {
  addVertexAtCenter: () => void;
  finish: () => void;
  undoVertex: () => boolean;
  cancel: () => void;
  flyTo: (p: LonLat, zoom?: number) => void;
  fitRing: (r: Ring, maxZoom?: number) => void;
  fitTurkey: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  center: () => LonLat | null;
}

export interface LiveShape {
  areaM2: number;
  perimeterM: number;
  radiusM?: number;
  vertices: number;
}

export interface CellBox {
  id: string;
  label: string;
  bounds: [[number, number], [number, number]];
  dash?: string;
}

interface Props {
  ref?: Ref<MapHandle>;
  label: string;
  ring: Ring | null;
  fieldName?: string;
  fieldAreaLabel?: string;
  saved: { id: string; ring: Ring; name: string }[];
  mode: DrawMode;
  base: BaseId;
  overlays: OverlayId[];
  dates: Partial<Record<string, string>>;
  cells: CellBox[] | null;
  onCommit: (ring: Ring, kind: "polygon" | "rectangle" | "circle", extra?: { center?: LonLat; radiusM?: number }) => void;
  onEdit: (ring: Ring) => void;
  onPin: (p: LonLat) => void;
  onLive: (s: LiveShape | null) => void;
  onView: (v: { zoom: number; center: LonLat }) => void;
  onPickSaved: (id: string) => void;
  onTileError: (sourceId: string) => void;
  onProblem: (code: "few") => void;
}

const TURKEY: [number, number] = [38.9, 35.2];
const TURKEY_BOUNDS: [[number, number], [number, number]] = [
  [35.8, 25.6],
  [42.15, 44.85],
];
const ACCENT_STROKE = "#86efac";
const ACCENT_FILL = "#22c55e";

export default function MapCanvas(props: Props) {
  const el = useRef<HTMLDivElement>(null);
  const L = useRef<typeof Leaf | null>(null);
  const map = useRef<Leaf.Map | null>(null);
  const layers = useRef<{ base: Leaf.TileLayer[]; overlays: Map<string, Leaf.TileLayer>; field: Leaf.LayerGroup | null; saved: Leaf.LayerGroup | null; draft: Leaf.LayerGroup | null; edit: Leaf.LayerGroup | null; cells: Leaf.LayerGroup | null }>({
    base: [],
    overlays: new Map(),
    field: null,
    saved: null,
    draft: null,
    edit: null,
    cells: null,
  });
  const draft = useRef<{ pts: LonLat[]; cursor: LonLat | null }>({ pts: [], cursor: null });
  const p = useRef(props);
  const [ready, setReady] = useReadyFlag();
  useEffect(() => {
    p.current = props;
  });

  // ── create the map once ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | null = null;
    let cleanupExtra: (() => void) | null = null;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current) return;
      const Lf = mod.default ?? mod;
      L.current = Lf;
      const m = Lf.map(el.current, {
        center: TURKEY,
        zoom: 6,
        minZoom: 4,
        maxZoom: 20,
        zoomSnap: 0.5,
        zoomDelta: 1,
        zoomControl: false,
        worldCopyJump: true,
        keyboardPanDelta: 60,
      });
      Lf.control.zoom({ position: "topright" }).addTo(m);
      Lf.control.scale({ position: "bottomright", metric: true, imperial: false, maxWidth: 140 }).addTo(m);
      m.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      m.attributionControl.setPosition("bottomright");
      layers.current.saved = Lf.layerGroup().addTo(m);
      layers.current.field = Lf.layerGroup().addTo(m);
      layers.current.cells = Lf.layerGroup().addTo(m);
      layers.current.draft = Lf.layerGroup().addTo(m);
      layers.current.edit = Lf.layerGroup().addTo(m);
      map.current = m;
      const report = () => {
        const c = m.getCenter();
        p.current.onView({ zoom: Math.round(m.getZoom() * 10) / 10, center: { lat: c.lat, lon: c.lng } });
      };
      m.on("moveend zoomend", report);
      m.on("click", (e: Leaf.LeafletMouseEvent) => onMapClick({ lat: e.latlng.lat, lon: e.latlng.lng }));
      m.on("mousemove", (e: Leaf.LeafletMouseEvent) => {
        if (p.current.mode === "none" || p.current.mode === "edit" || p.current.mode === "pin") return;
        draft.current.cursor = { lat: e.latlng.lat, lon: e.latlng.lng };
        scheduleDraft();
      });
      m.on("dblclick", () => {
        if (p.current.mode === "polygon") finishPolygon();
      });
      el.current.addEventListener("keydown", onKey);
      let frame = 0;
      const remeasure = () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => map.current?.invalidateSize({ pan: false }));
      };
      ro = new ResizeObserver(remeasure);
      ro.observe(el.current);
      void document.fonts?.ready.then(remeasure);
      window.addEventListener("load", remeasure);
      cleanupExtra = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener("load", remeasure);
      };
      m.invalidateSize({ pan: false });
      report();
      setReady();
    });
    const node = el.current;
    return () => {
      cancelled = true;
      ro?.disconnect();
      cleanupExtra?.();
      node?.removeEventListener("keydown", onKey);
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── drawing logic ────────────────────────────────────────────────────
  let raf = 0;
  function scheduleDraft() {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      renderDraft();
    });
  }

  function liveRing(): { ring: Ring; radius?: number } | null {
    const { pts, cursor } = draft.current;
    const mode = p.current.mode;
    if (mode === "polygon") return { ring: cursor ? [...pts, cursor] : pts };
    if (mode === "rectangle" && pts.length === 1 && cursor) return { ring: cornersRing(pts[0], cursor) };
    if (mode === "circle" && pts.length === 1 && cursor) {
      const r = distanceM(pts[0], cursor);
      return { ring: circleRing(pts[0], Math.max(r, 1)), radius: r };
    }
    return null;
  }

  function renderDraft() {
    const Lf = L.current;
    const g = layers.current.draft;
    if (!Lf || !g) return;
    g.clearLayers();
    const { pts } = draft.current;
    const live = liveRing();
    const ll = (q: LonLat) => [q.lat, q.lon] as [number, number];
    if (live && live.ring.length >= 2) {
      const shape =
        live.ring.length >= 3
          ? Lf.polygon(live.ring.map(ll), { color: ACCENT_STROKE, weight: 2.5, dashArray: "6 5", fillColor: ACCENT_FILL, fillOpacity: 0.22, interactive: false })
          : Lf.polyline(live.ring.map(ll), { color: ACCENT_STROKE, weight: 2.5, dashArray: "6 5", interactive: false });
      shape.addTo(g);
    }
    pts.forEach((q, i) => {
      const mk = Lf.marker(ll(q), { icon: Lf.divIcon({ className: "", html: '<div class="vtx"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), keyboard: false });
      if (i === 0 && p.current.mode === "polygon") {
        mk.on("click", (e) => {
          Lf.DomEvent.stop(e);
          finishPolygon();
        });
      }
      mk.addTo(g);
    });
    if (live && live.ring.length >= 3) {
      p.current.onLive({ areaM2: ringAreaM2(live.ring), perimeterM: ringPerimeterM(live.ring), radiusM: live.radius, vertices: pts.length });
    } else if (pts.length) p.current.onLive({ areaM2: 0, perimeterM: 0, vertices: pts.length });
    else p.current.onLive(null);
  }

  function resetDraft() {
    draft.current = { pts: [], cursor: null };
    renderDraft();
  }

  function onMapClick(q: LonLat) {
    const mode = p.current.mode;
    if (mode === "pin") {
      p.current.onPin(q);
      return;
    }
    if (mode === "polygon") {
      draft.current.pts.push(q);
      renderDraft();
      return;
    }
    if (mode === "rectangle" || mode === "circle") {
      if (!draft.current.pts.length) {
        draft.current.pts = [q];
        renderDraft();
        return;
      }
      const a = draft.current.pts[0];
      if (mode === "rectangle") p.current.onCommit(cornersRing(a, q), "rectangle");
      else {
        const r = distanceM(a, q);
        p.current.onCommit(circleRing(a, r), "circle", { center: a, radiusM: r });
      }
      resetDraft();
    }
  }

  function finishPolygon() {
    const pts = draft.current.pts;
    const clean = pts.filter((q, i) => i === 0 || distanceM(q, pts[i - 1]) > 0.5);
    if (clean.length < 3) {
      p.current.onProblem("few");
      return;
    }
    p.current.onCommit(clean, "polygon");
    resetDraft();
  }

  function addAtCenter() {
    const m = map.current;
    if (!m) return;
    const c = m.getCenter();
    onMapClick({ lat: c.lat, lon: c.lng });
  }

  function onKey(e: KeyboardEvent) {
    const mode = p.current.mode;
    if (mode === "none" || mode === "edit") return;
    if (e.key === "Enter") {
      e.preventDefault();
      addAtCenter();
    } else if (e.key === "Escape") {
      e.preventDefault();
      resetDraft();
    } else if (e.key === "Backspace") {
      e.preventDefault();
      draft.current.pts.pop();
      renderDraft();
    }
  }

  useImperativeHandle(props.ref, () => ({
    addVertexAtCenter: addAtCenter,
    finish: () => {
      if (p.current.mode === "polygon") finishPolygon();
    },
    undoVertex: () => {
      if (!draft.current.pts.length) return false;
      draft.current.pts.pop();
      renderDraft();
      return true;
    },
    cancel: resetDraft,
    flyTo: (q, zoom = 16) => {
      map.current?.invalidateSize({ pan: false });
      map.current?.flyTo([q.lat, q.lon], zoom, { duration: reduced() ? 0 : 0.75 });
    },
    fitRing: (r, maxZoom = 17) => {
      const Lf = L.current;
      if (!Lf || !map.current || r.length < 2) return;
      map.current.invalidateSize({ pan: false });
      map.current.fitBounds(Lf.latLngBounds(r.map((q) => [q.lat, q.lon] as [number, number])), { padding: [56, 56], maxZoom, animate: !reduced() });
    },
    fitTurkey: () => {
      const Lf = L.current;
      if (!Lf || !map.current) return;
      map.current.invalidateSize({ pan: false });
      map.current.fitBounds(Lf.latLngBounds(TURKEY_BOUNDS), { padding: [24, 24], maxZoom: 7, animate: !reduced() });
    },
    zoomIn: () => map.current?.zoomIn(1),
    zoomOut: () => map.current?.zoomOut(1),
    center: () => {
      const c = map.current?.getCenter();
      return c ? { lat: c.lat, lon: c.lng } : null;
    },
  }));

  // mode changes: reset any half-drawn shape, toggle double-click zoom, cursor
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    resetDraft();
    if (props.mode === "none" || props.mode === "edit") m.doubleClickZoom.enable();
    else m.doubleClickZoom.disable();
    m.getContainer().style.cursor = props.mode === "none" || props.mode === "edit" ? "" : "crosshair";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode, ready]);

  // ── base + overlays ──────────────────────────────────────────────────
  const dateKey = JSON.stringify(props.dates);
  useEffect(() => {
    const Lf = L.current;
    const m = map.current;
    if (!Lf || !m) return;
    for (const l of layers.current.base) l.remove();
    const mk = (id: string, opts: Leaf.TileLayerOptions = {}) => {
      const s = tileSourceById(id) ?? tileSourceById("esri-world-imagery")!;
      const url = s.urlTemplate.replace("{time}", props.dates[id] ?? s.defaultDate ?? "");
      const tl = Lf.tileLayer(url, {
        maxNativeZoom: s.maxNativeZoom,
        maxZoom: 20,
        attribution: s.attributionHtml,
        crossOrigin: true,
        ...opts,
      });
      tl.on("tileerror", () => p.current.onTileError(id));
      return tl;
    };
    const list: Leaf.TileLayer[] = [];
    const baseKey: BaseId = BASE_SOURCE[props.base] ? props.base : "esri";
    if (baseKey === "hls-s30" || baseKey === "hls-l30") {
      // Underlay high-res Esri imagery so swath gaps of daily HLS show real ground
      list.push(mk(BASE_SOURCE.esri, { opacity: 0.7 }));
      list.push(mk(BASE_SOURCE[baseKey]));
    } else {
      list.push(mk(BASE_SOURCE[baseKey]));
    }
    for (const l of list) {
      l.addTo(m);
      l.bringToBack();
    }
    list.forEach((l, i) => l.setZIndex(i + 1));
    layers.current.base = list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.base, dateKey, ready]);

  useEffect(() => {
    const Lf = L.current;
    const m = map.current;
    if (!Lf || !m) return;
    const cur = layers.current.overlays;
    for (const [k, l] of cur) {
      l.remove();
      cur.delete(k);
    }
    props.overlays.forEach((o, i) => {
      const id = OVERLAY_SOURCE[o];
      if (!id) return;
      const s = tileSourceById(id);
      if (!s) return;
      const url = s.urlTemplate.replace("{time}", props.dates[id] ?? s.defaultDate ?? "");
      const analytic = o === "ndvi" || o === "smap" || o === "imerg" || o === "srtm";
      const tl = Lf.tileLayer(url, {
        maxNativeZoom: s.maxNativeZoom,
        maxZoom: 20,
        minZoom: 0,
        attribution: s.attributionHtml,
        crossOrigin: true,
        opacity: analytic ? 0.68 : 1,
        zIndex: analytic ? 10 + i : 30 + i,
      });
      tl.on("tileerror", () => p.current.onTileError(id));
      tl.addTo(m);
      cur.set(o, tl);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.overlays.join(","), dateKey, ready]);

  // ── active field: outline + agricultural sub-grid + label badge ──────
  const ringKey = props.ring ? props.ring.map((q) => `${q.lat},${q.lon}`).join(";") : "";
  useEffect(() => {
    const Lf = L.current;
    const g = layers.current.field;
    if (!Lf || !g) return;
    g.clearLayers();
    const r = props.ring;
    if (!r || r.length < 3) return;
    const ll = r.map((q) => [q.lat, q.lon] as [number, number]);
    const world: [number, number][] = [
      [85, -180],
      [85, 180],
      [-85, 180],
      [-85, -180],
    ];
    // Subtle outside vignette so the active parcel pops against satellite imagery
    Lf.polygon([world, ll], { stroke: false, fillColor: "#07140b", fillOpacity: 0.24, interactive: false }).addTo(g);
    // Lush emerald field fill + double border
    Lf.polygon(ll, { color: "#0b2412", weight: 5, opacity: 0.65, fillColor: ACCENT_FILL, fillOpacity: 0.26, interactive: false }).addTo(g);
    Lf.polygon(ll, { color: ACCENT_STROKE, weight: 2.5, fill: false, interactive: false }).addTo(g);

    // Subtle internal management-zone grid lines inside the bounding box of the ring
    const lats = r.map((q) => q.lat);
    const lons = r.map((q) => q.lon);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLon = Math.min(...lons), maxLon = Math.max(...lons);
    if (r.length === 4) {
      for (const f of [0.333, 0.667]) {
        const latA = r[0].lat + (r[3].lat - r[0].lat) * f;
        const lonA = r[0].lon + (r[3].lon - r[0].lon) * f;
        const latB = r[1].lat + (r[2].lat - r[1].lat) * f;
        const lonB = r[1].lon + (r[2].lon - r[1].lon) * f;
        Lf.polyline([[latA, lonA], [latB, lonB]], { color: "#bbf7d0", weight: 1, opacity: 0.45, dashArray: "4 4", interactive: false }).addTo(g);

        const latC = r[0].lat + (r[1].lat - r[0].lat) * f;
        const lonC = r[0].lon + (r[1].lon - r[0].lon) * f;
        const latD = r[3].lat + (r[2].lat - r[3].lat) * f;
        const lonD = r[3].lon + (r[2].lon - r[3].lon) * f;
        Lf.polyline([[latC, lonC], [latD, lonD]], { color: "#bbf7d0", weight: 1, opacity: 0.45, dashArray: "4 4", interactive: false }).addTo(g);
      }
    } else if (maxLat - minLat > 0.0005 && maxLon - minLon > 0.0005) {
      const midLat = (minLat + maxLat) / 2;
      const midLon = (minLon + maxLon) / 2;
      Lf.polyline([[midLat, minLon], [midLat, maxLon]], { color: "#bbf7d0", weight: 1, opacity: 0.35, dashArray: "4 4", interactive: false }).addTo(g);
      Lf.polyline([[minLat, midLon], [maxLat, midLon]], { color: "#bbf7d0", weight: 1, opacity: 0.35, dashArray: "4 4", interactive: false }).addTo(g);
    }

    // Center badge showing field name and area
    const geo = describeRing(r);
    const title = props.fieldName || "Arazi-1";
    const sub = props.fieldAreaLabel || `${Math.round(geo.areaDa)} dekar`;
    const badgeHtml = `<div class="parcel-badge"><span class="parcel-badge-title">${escapeHtml(title)}</span><span class="parcel-badge-sub">${escapeHtml(sub)}</span></div>`;
    Lf.marker([geo.centroid.lat, geo.centroid.lon], {
      icon: Lf.divIcon({ className: "parcel-badge-wrap", html: badgeHtml, iconSize: [148, 44], iconAnchor: [74, 22] }),
      interactive: false,
      keyboard: false,
    }).addTo(g);
  }, [ringKey, props.fieldName, props.fieldAreaLabel, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── edit handles ─────────────────────────────────────────────────────
  useEffect(() => {
    const Lf = L.current;
    const g = layers.current.edit;
    if (!Lf || !g) return;
    g.clearLayers();
    const r = props.ring;
    if (props.mode !== "edit" || !r) return;
    const icon = (cls: string, s: number) => Lf.divIcon({ className: "", html: `<div class="vtx ${cls}"></div>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] });
    const working = r.map((q) => ({ ...q }));
    const shape = Lf.polygon(working.map((q) => [q.lat, q.lon] as [number, number]), { color: ACCENT_STROKE, weight: 2, dashArray: "4 4", fill: false, interactive: false }).addTo(g);
    const redraw = () => shape.setLatLngs(working.map((q) => [q.lat, q.lon] as [number, number]));
    working.forEach((q, i) => {
      const mk = Lf.marker([q.lat, q.lon], { draggable: true, icon: icon("", 18), title: `${i + 1}`, keyboard: true });
      mk.on("drag", (e) => {
        const ll = (e.target as Leaf.Marker).getLatLng();
        working[i] = { lat: ll.lat, lon: ll.lng };
        redraw();
        p.current.onLive({ areaM2: ringAreaM2(working), perimeterM: ringPerimeterM(working), vertices: working.length });
      });
      mk.on("dragend", () => p.current.onEdit(working.map((x) => ({ ...x }))));
      mk.on("contextmenu", () => {
        if (working.length <= 3) return;
        p.current.onEdit(working.filter((_, j) => j !== i));
      });
      mk.addTo(g);
    });
    working.forEach((q, i) => {
      const nx = working[(i + 1) % working.length];
      const mid = { lat: (q.lat + nx.lat) / 2, lon: (q.lon + nx.lon) / 2 };
      const mk = Lf.marker([mid.lat, mid.lon], { icon: icon("mid", 12), keyboard: false });
      mk.on("click", (e) => {
        Lf.DomEvent.stop(e);
        const next = [...working.slice(0, i + 1), mid, ...working.slice(i + 1)];
        p.current.onEdit(next);
      });
      mk.addTo(g);
    });
  }, [ringKey, props.mode, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── saved fields (thin dashed outlines) ──────────────────────────────
  const savedKey = props.saved.map((s) => s.id + s.ring.length).join(",");
  useEffect(() => {
    const Lf = L.current;
    const g = layers.current.saved;
    if (!Lf || !g) return;
    g.clearLayers();
    for (const s of props.saved) {
      const pl = Lf.polygon(
        s.ring.map((q) => [q.lat, q.lon] as [number, number]),
        { color: "#eef2ec", weight: 1.5, dashArray: "5 5", fillOpacity: 0.08, fillColor: "#22c55e" },
      );
      pl.bindTooltip(s.name, { className: "area-label", direction: "center" });
      pl.on("click", (e) => {
        if (p.current.mode !== "none") return;
        Lf.DomEvent.stop(e);
        p.current.onPickSaved(s.id);
      });
      pl.addTo(g);
    }
  }, [savedKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── data-cell footprints ─────────────────────────────────────────────
  const cellsKey = JSON.stringify(props.cells);
  useEffect(() => {
    const Lf = L.current;
    const g = layers.current.cells;
    if (!Lf || !g) return;
    g.clearLayers();
    for (const c of props.cells ?? []) {
      const r = Lf.rectangle(c.bounds, { color: "#38bdf8", weight: 1.5, dashArray: c.dash, fill: false, interactive: false });
      r.bindTooltip(c.label, { permanent: true, direction: "top", className: "cell-label", offset: [0, -2] });
      r.addTo(g);
    }
  }, [cellsKey, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} className="absolute inset-0" role="application" aria-label={props.label} tabIndex={0} />;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function reduced() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useReadyFlag(): [boolean, () => void] {
  const [r, setR] = useState(false);
  return [r, () => setR(true)];
}
