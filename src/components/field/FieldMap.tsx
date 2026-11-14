"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import type { Map as LMap, LayerGroup, TileLayer } from "leaflet";
import { ringAreaM2, type Ring } from "@/lib/data/geometry";
import { useI18n } from "@/lib/i18n";
import { buildSampleParcelRing, type ParcelSummary } from "@/lib/ui/parcelScan";
import {
  ANATOLIA_RING,
  CYPRUS_RING,
  NDVI_BELTS,
  SEA_LABELS,
  THRACE_RING,
  TURKEY_LAKES,
  TURKEY_RIVERS,
} from "./turkeyGeo";

export interface MapPilot {
  id: string;
  name: string;
  lat: number;
  lon: number;
}

interface Props {
  pilots: MapPilot[];
  selected: { lat: number; lon: number } | null;
  showNdvi: boolean;
  onPick: (lat: number, lon: number) => void;
  onPilot: (id: string) => void;
  label: string;
  /** "osm" street map (default) or the NASA/Sentinel satellite mosaic. */
  base?: "osm" | "satellite";
  /** Initial zoom when a point is selected. */
  focusZoom?: number;
  /** Active scanned parcel summary (polygon + interior scan grid). */
  scanSummary?: ParcelSummary | null;
  /** True while /api/field is scanning the interior of the polygon. */
  scanning?: boolean;
  /** Called when the user finishes drawing a polygon boundary or clicks "Scan sample parcel". */
  onParcelComplete?: (ring: Ring) => void;
  /** Called when the user clears the active polygon boundary. */
  onParcelClear?: () => void;
}

const TURKEY_CENTER: [number, number] = [38.9, 35.0];

export default function FieldMap({
  pilots,
  selected,
  showNdvi,
  onPick,
  onPilot,
  label,
  base = "satellite",
  focusZoom = 7,
  scanSummary = null,
  scanning = false,
  onParcelComplete,
  onParcelClear,
}: Props) {
  const { t, n } = useI18n();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const osmTileRef = useRef<TileLayer | null>(null);
  const satTileRef = useRef<TileLayer | null>(null);
  const pilotLayer = useRef<LayerGroup | null>(null);
  const pickLayer = useRef<LayerGroup | null>(null);
  const parcelLayer = useRef<LayerGroup | null>(null);
  const ndviLayer = useRef<TileLayer | null>(null);
  const ndviVectorLayer = useRef<LayerGroup | null>(null);
  const [activeBase, setActiveBase] = useState<"osm" | "satellite">(base);
  const [drawing, setDrawing] = useState(false);
  const [draftRing, setDraftRing] = useState<Ring>([]);
  const drawingRef = useRef(false);
  const handlers = useRef({ onPick, onPilot, onParcelComplete });
  const lastFocus = useRef<string | null>(null);
  const lastParcelKey = useRef<string | null>(null);

  useEffect(() => {
    drawingRef.current = drawing;
    const map = mapRef.current;
    if (el.current) {
      el.current.style.cursor = drawing ? "crosshair" : "";
    }
    if (!map) return;
    if (drawing) {
      map.doubleClickZoom.disable();
    } else {
      map.doubleClickZoom.enable();
    }
  }, [drawing]);

  useEffect(() => {
    handlers.current = { onPick, onPilot, onParcelComplete };
  }, [onPick, onPilot, onParcelComplete]);

  // 1. Create the map once with isolated Canvas renderer for the low-zoom country vector backdrop
  useEffect(() => {
    let cancelled = false;
    let map: LMap | null = null;
    let ro: ResizeObserver | null = null;
    const timers: ReturnType<typeof setTimeout>[] = [];

    void import("leaflet").then((mod) => {
      const L = ("default" in mod && mod.default ? mod.default : mod) as typeof import("leaflet");
      if (cancelled || !el.current) return;
      LRef.current = L;

      map = L.map(el.current, {
        center: TURKEY_CENTER,
        zoom: 6,
        minZoom: 3,
        maxZoom: 19,
        worldCopyJump: true,
        scrollWheelZoom: true,
        zoomControl: false,
      });
      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Dedicated Canvas renderer in its own pane (zIndex 150, below tilePane 200) so there is NEVER a blank frame while tiles stream in
      map.createPane("vectorBase");
      const vPane = map.getPane("vectorBase");
      if (vPane) {
        vPane.style.zIndex = "150";
        vPane.style.pointerEvents = "none";
      }
      const baseCanvas = L.canvas({ pane: "vectorBase", padding: 0.25 });
      const vGroup = L.layerGroup([]).addTo(map);

      const landFill = "#1f2b23";
      const landStroke = "#4b6b53";
      const waterFill = "#11222e";
      const riverColor = "#2f6f95";
      const gridColor = "rgba(163, 178, 167, 0.14)";

      for (let lat = 34; lat <= 44; lat += 2) {
        L.polyline(
          [
            [lat, 22],
            [lat, 48],
          ],
          { renderer: baseCanvas, pane: "vectorBase", color: gridColor, weight: 1, dashArray: "3 5", interactive: false },
        ).addTo(vGroup);
      }
      for (let lon = 24; lon <= 46; lon += 2) {
        L.polyline(
          [
            [34, lon],
            [44, lon],
          ],
          { renderer: baseCanvas, pane: "vectorBase", color: gridColor, weight: 1, dashArray: "3 5", interactive: false },
        ).addTo(vGroup);
      }

      for (const ring of [ANATOLIA_RING, THRACE_RING, CYPRUS_RING]) {
        L.polygon(ring, {
          renderer: baseCanvas,
          pane: "vectorBase",
          color: landStroke,
          weight: 1.6,
          fillColor: landFill,
          fillOpacity: 0.9,
          interactive: false,
        }).addTo(vGroup);
      }

      for (const rv of TURKEY_RIVERS) {
        L.polyline(rv.path, {
          renderer: baseCanvas,
          pane: "vectorBase",
          color: riverColor,
          weight: 1.3,
          opacity: 0.7,
          interactive: false,
        }).addTo(vGroup);
      }

      for (const lk of TURKEY_LAKES) {
        L.polygon(lk.ring, {
          renderer: baseCanvas,
          pane: "vectorBase",
          color: riverColor,
          weight: 1,
          fillColor: waterFill,
          fillOpacity: 0.92,
          interactive: false,
        }).addTo(vGroup);
      }

      for (const s of SEA_LABELS) {
        L.marker([s.lat, s.lon], {
          pane: "vectorBase",
          interactive: false,
          icon: L.divIcon({
            className: "pointer-events-none select-none",
            html: `<span style="font-size:10px;letter-spacing:0.14em;color:rgba(124,192,234,0.45);font-weight:600;white-space:nowrap;">${s.name}</span>`,
            iconSize: [80, 14],
            iconAnchor: [40, 7],
          }),
        }).addTo(vGroup);
      }

      // Base tile layers (Retina @2x resolution, cache-busted with v=4, large keepBuffer so tiles stay loaded)
      osmTileRef.current = L.tileLayer("/api/tiles?layer=osm&v=4&z={z}&x={x}&y={y}", {
        maxNativeZoom: 19,
        maxZoom: 19,
        keepBuffer: 6,
        updateWhenIdle: false,
        className: "osm-base",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> / CARTO',
      });
      satTileRef.current = L.tileLayer("/api/tiles?layer=satellite&v=4&z={z}&x={x}&y={y}", {
        maxNativeZoom: 19,
        maxZoom: 19,
        keepBuffer: 6,
        updateWhenIdle: false,
        className: "sat-base",
        attribution: 'Imagery: Hybrid Satellite HD / Sentinel-2 / Esri',
      });
      if (base === "satellite") satTileRef.current.addTo(map);
      else osmTileRef.current.addTo(map);

      // NDVI pane
      map.createPane("ndvi");
      const pane = map.getPane("ndvi");
      if (pane) {
        pane.style.zIndex = "350";
        pane.style.pointerEvents = "none";
      }
      const ndviCanvas = L.canvas({ pane: "ndvi", padding: 0.25 });
      ndviVectorLayer.current = L.layerGroup([]);
      for (const belt of NDVI_BELTS) {
        const green = belt.ndvi > 0.6 ? "#1b8a4b" : belt.ndvi > 0.45 ? "#49a842" : "#9c8a36";
        L.polygon(belt.ring, {
          renderer: ndviCanvas,
          pane: "ndvi",
          color: green,
          weight: 1,
          fillColor: green,
          fillOpacity: 0.35,
          interactive: false,
        }).addTo(ndviVectorLayer.current);
      }

      ndviLayer.current = L.tileLayer("/api/tiles?layer=ndvi&z={z}&x={x}&y={y}", {
        pane: "ndvi",
        maxNativeZoom: 9,
        maxZoom: 18,
        opacity: 0.7,
        attribution: 'NDVI: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> / MODIS Terra',
      });

      pilotLayer.current = L.layerGroup().addTo(map);
      pickLayer.current = L.layerGroup().addTo(map);
      parcelLayer.current = L.layerGroup().addTo(map);

      let pickTimer: ReturnType<typeof setTimeout> | null = null;
      map.on("click", (e) => {
        const lat = +e.latlng.lat.toFixed(5);
        const lon = +e.latlng.lng.toFixed(5);
        if (drawingRef.current) {
          setDraftRing((prev) => [...prev, { lat, lon }]);
          return;
        }
        if (pickTimer) clearTimeout(pickTimer);
        pickTimer = setTimeout(() => {
          pickTimer = null;
          handlers.current.onPick(+lat.toFixed(4), +lon.toFixed(4));
        }, 150);
      });
      map.on("focus", () => map?.scrollWheelZoom.enable());
      map.on("blur", () => map?.scrollWheelZoom.disable());

      if (typeof ResizeObserver !== "undefined" && el.current) {
        ro = new ResizeObserver(() => {
          map?.invalidateSize({ pan: false });
        });
        ro.observe(el.current);
      }
      requestAnimationFrame(() => map?.invalidateSize({ pan: false }));
      timers.push(
        setTimeout(() => map?.invalidateSize({ pan: false }), 120),
        setTimeout(() => map?.invalidateSize({ pan: false }), 260),
      );

      mapRef.current = map;
      // Trigger initial layer syncs once map is ready
      setDraftRing((r) => [...r]);
    });

    return () => {
      cancelled = true;
      for (const t of timers) clearTimeout(t);
      ro?.disconnect();
      map?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Switch base tile layer (OSM street vs high-res Satellite) without recreating the map
  useEffect(() => {
    const map = mapRef.current;
    const osm = osmTileRef.current;
    const sat = satTileRef.current;
    if (!map || !osm || !sat) return;
    if (activeBase === "satellite") {
      if (map.hasLayer(osm)) map.removeLayer(osm);
      if (!map.hasLayer(sat)) sat.addTo(map);
    } else {
      if (map.hasLayer(sat)) map.removeLayer(sat);
      if (!map.hasLayer(osm)) osm.addTo(map);
    }
  }, [activeBase]);

  // 3. Sync pilot markers & NDVI overlay (does NOT run when adding draftRing vertices!)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !pilotLayer.current || !ndviLayer.current || !ndviVectorLayer.current) return;
    pilotLayer.current.clearLayers();
    if (!drawing) {
      for (const p of pilots) {
        const isWest = p.lon < 28;
        L.circleMarker([p.lat, p.lon], {
          radius: 7.5,
          color: "#0d1310",
          weight: 2,
          fillColor: "#E69F00",
          fillOpacity: 1,
        })
          .bindTooltip(p.name, {
            direction: isWest ? "right" : "top",
            offset: isWest ? [8, 0] : [0, -6],
            permanent: true,
            className: "pilot-map-label",
          })
          .on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            handlers.current.onPilot(p.id);
          })
          .addTo(pilotLayer.current);
      }
    }
    if (showNdvi) {
      if (!map.hasLayer(ndviVectorLayer.current)) ndviVectorLayer.current.addTo(map);
      if (!map.hasLayer(ndviLayer.current)) ndviLayer.current.addTo(map);
    } else {
      if (map.hasLayer(ndviVectorLayer.current)) map.removeLayer(ndviVectorLayer.current);
      if (map.hasLayer(ndviLayer.current)) map.removeLayer(ndviLayer.current);
    }
  }, [pilots, showNdvi, drawing]);

  // 4. Sync selected point marker & camera focus ONLY when `selected` actually changes (NEVER during drawing!)
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !pickLayer.current) return;
    pickLayer.current.clearLayers();
    if (!selected) return;
    const ringColor = activeBase === "satellite" ? "#c8f25a" : "#0072B2";
    L.circleMarker([selected.lat, selected.lon], {
      radius: 12,
      color: ringColor,
      weight: 2.2,
      fill: false,
      interactive: false,
    }).addTo(pickLayer.current);
    L.circleMarker([selected.lat, selected.lon], {
      radius: 3.5,
      color: ringColor,
      weight: 0,
      fillColor: ringColor,
      fillOpacity: 1,
      interactive: false,
    }).addTo(pickLayer.current);

    const key = `${selected.lat.toFixed(4)},${selected.lon.toFixed(4)}`;
    if (lastFocus.current !== key && !drawingRef.current) {
      lastFocus.current = key;
      map.setView([selected.lat, selected.lon], Math.max(map.getZoom(), focusZoom), { animate: false });
    }
  }, [selected, activeBase, focusZoom]);

  // 5. Sync irregular polygon drawing (unlimited vertices, draggable corners, midpoint insertion) & interior scan points
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map || !parcelLayer.current) return;
    parcelLayer.current.clearLayers();

    if (drawing) {
      const nPts = draftRing.length;
      if (nPts >= 3) {
        const latlngs = draftRing.map((pt) => [pt.lat, pt.lon] as [number, number]);
        L.polygon(latlngs, {
          color: "#c8f25a",
          weight: 2.5,
          dashArray: "6 4",
          fillColor: "#c8f25a",
          fillOpacity: 0.2,
          interactive: false,
        }).addTo(parcelLayer.current);
      } else if (nPts === 2) {
        const latlngs = draftRing.map((pt) => [pt.lat, pt.lon] as [number, number]);
        L.polyline(latlngs, {
          color: "#c8f25a",
          weight: 2.5,
          dashArray: "6 4",
          interactive: false,
        }).addTo(parcelLayer.current);
      }

      // Edge midpoint (+) handles so the user can split any segment to trace crooked/curved boundaries
      if (nPts >= 2) {
        const segCount = nPts >= 3 ? nPts : 1;
        for (let i = 0; i < segCount; i++) {
          const a = draftRing[i];
          const b = draftRing[(i + 1) % nPts];
          const midLat = +((a.lat + b.lat) / 2).toFixed(5);
          const midLon = +((a.lon + b.lon) / 2).toFixed(5);
          const insertIdx = i + 1;
          L.marker([midLat, midLon], {
            icon: L.divIcon({
              className: "",
              html: `<div title="Kenara yeni köşe ekle" style="width:14px;height:14px;border-radius:999px;background:rgba(13,19,16,0.85);border:1.5px solid #c8f25a;color:#c8f25a;font-size:10px;line-height:11px;text-align:center;font-weight:700;cursor:pointer;">+</div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            }),
          })
            .on("click", (ev) => {
              L.DomEvent.stopPropagation(ev);
              setDraftRing((prev) => {
                const next = [...prev];
                next.splice(insertIdx, 0, { lat: midLat, lon: midLon });
                return next;
              });
            })
            .addTo(parcelLayer.current!);
        }
      }

      // Draggable numbered corner markers (unlimited vertices)
      draftRing.forEach((pt, idx) => {
        const isFirst = idx === 0 && nPts >= 3;
        const bg = isFirst ? "#009E73" : "#c8f25a";
        const fg = isFirst ? "#ffffff" : "#0d1310";
        const size = isFirst ? 22 : 18;
        const marker = L.marker([pt.lat, pt.lon], {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: `<div style="width:${size}px;height:${size}px;border-radius:999px;background:${bg};color:${fg};border:2px solid #0d1310;font-size:10px;font-weight:700;line-height:${size - 4}px;text-align:center;box-shadow:0 2px 6px rgba(0,0,0,0.45);cursor:grab;">${idx + 1}</div>`,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
          }),
        });
        marker.on("dragend", () => {
          const ll = marker.getLatLng();
          setDraftRing((prev) =>
            prev.map((item, j) => (j === idx ? { lat: +ll.lat.toFixed(5), lon: +ll.lng.toFixed(5) } : item)),
          );
        });
        marker.on("click", (ev) => {
          L.DomEvent.stopPropagation(ev);
          if (isFirst) {
            const finished = [...draftRing];
            setDrawing(false);
            setDraftRing([]);
            handlers.current.onParcelComplete?.(finished);
          }
        });
        marker.addTo(parcelLayer.current!);
      });
      return;
    }

    // Completed & scanned polygon + interior scan grid
    if (scanSummary && scanSummary.ring.length >= 3) {
      const latlngs = scanSummary.ring.map((pt) => [pt.lat, pt.lon] as [number, number]);
      const poly = L.polygon(latlngs, {
        color: "#c8f25a",
        weight: 2.8,
        fillColor: "#009E73",
        fillOpacity: 0.22,
        interactive: false,
      }).addTo(parcelLayer.current);

      scanSummary.ring.forEach((pt, idx) => {
        L.circleMarker([pt.lat, pt.lon], {
          radius: 4.5,
          color: "#0d1310",
          weight: 1.5,
          fillColor: "#c8f25a",
          fillOpacity: 1,
        })
          .bindTooltip(`K${idx + 1}: ${pt.lat.toFixed(4)}°, ${pt.lon.toFixed(4)}°`, { direction: "top" })
          .addTo(parcelLayer.current!);
      });

      for (const sp of scanSummary.scanPoints) {
        const zColor = sp.zone === "upper" ? "#E69F00" : sp.zone === "lower" ? "#56B4E9" : "#009E73";
        const zLabel = sp.zone === "upper" ? t("scan.zone.upper") : sp.zone === "lower" ? t("scan.zone.lower") : t("scan.zone.mid");
        L.circleMarker([sp.lat, sp.lon], {
          radius: 5.5,
          color: "#0d1310",
          weight: 1.5,
          fillColor: zColor,
          fillOpacity: 0.95,
        })
          .bindTooltip(`#${sp.id} · ${zLabel} (${sp.lat.toFixed(4)}°, ${sp.lon.toFixed(4)}°)`, { direction: "top" })
          .addTo(parcelLayer.current!);
      }

      const pKey = scanSummary.ring.map((p) => `${p.lat.toFixed(4)},${p.lon.toFixed(4)}`).join("|");
      if (lastParcelKey.current !== pKey) {
        lastParcelKey.current = pKey;
        try {
          map.fitBounds(poly.getBounds().pad(0.35), { maxZoom: 15, animate: false });
        } catch {
          /* ignore bounds error */
        }
      }
    }
  }, [drawing, draftRing, scanSummary, t]);

  const draftAreaDa = draftRing.length >= 3 ? Math.round((ringAreaM2(draftRing) / 1000) * 10) / 10 : 0;

  const startDraw = () => {
    setDraftRing([]);
    setDrawing(true);
  };

  const runSampleParcel = () => {
    const map = mapRef.current;
    const center = selected ?? (map ? { lat: map.getCenter().lat, lon: map.getCenter().lng } : { lat: 37.57, lon: 32.77 });
    const ring = buildSampleParcelRing(center, 72);
    setDrawing(false);
    setDraftRing([]);
    onParcelComplete?.(ring);
  };

  return (
    <div className="relative h-full w-full min-h-[15rem]">
      <div ref={el} role="application" aria-label={label} className="h-full w-full min-h-[15rem]" />
      {onParcelComplete && (
        <div className="pointer-events-none absolute inset-x-2.5 top-2.5 z-[500] flex flex-wrap items-center gap-1.5">
          {!drawing ? (
            <>
              <button
                type="button"
                onClick={startDraw}
                className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-md backdrop-blur hover:bg-panel-2"
              >
                ⌖ {t("scan.drawBtn")}
              </button>
              <button
                type="button"
                onClick={runSampleParcel}
                className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-semibold text-accent-ink shadow-md backdrop-blur hover:bg-panel-2"
              >
                ⬡ {t("scan.sampleBtn")}
              </button>
              <button
                type="button"
                onClick={() => setActiveBase((b) => (b === "satellite" ? "osm" : "satellite"))}
                className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-medium text-ink shadow-md backdrop-blur hover:bg-panel-2"
              >
                🛰 {activeBase === "satellite" ? t("scan.mapView") : t("scan.satView")}
              </button>
              {scanSummary && onParcelClear && (
                <button
                  type="button"
                  onClick={() => {
                    lastParcelKey.current = null;
                    onParcelClear();
                  }}
                  className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-medium text-ink-2 shadow-md backdrop-blur hover:text-ink"
                >
                  ✕ {t("scan.clearBtn")}
                </button>
              )}
            </>
          ) : (
            <>
              <span className="pointer-events-auto rounded-lg border border-ink bg-paper/95 px-2.5 py-1.5 text-xs font-semibold text-ink shadow-md">
                {t("scan.drawActive")} ({draftRing.length})
              </span>
              <button
                type="button"
                onClick={() => setActiveBase((b) => (b === "satellite" ? "osm" : "satellite"))}
                className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-medium text-ink shadow-md hover:bg-panel-2"
              >
                🛰 {activeBase === "satellite" ? t("scan.mapView") : t("scan.satView")}
              </button>
              {draftRing.length > 0 && (
                <button
                  type="button"
                  onClick={() => setDraftRing((r) => r.slice(0, -1))}
                  className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2.5 py-1.5 text-xs font-medium text-ink shadow-md hover:bg-panel-2"
                >
                  ↶ {t("scan.undoBtn")}
                </button>
              )}
              {draftRing.length >= 3 && (
                <button
                  type="button"
                  onClick={() => {
                    const finished = [...draftRing];
                    setDrawing(false);
                    setDraftRing([]);
                    onParcelComplete(finished);
                  }}
                  className="pointer-events-auto rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-paper shadow-md hover:opacity-95"
                >
                  ✓ {t("scan.finishBtn", { n: draftRing.length, da: n(draftAreaDa, 1) })}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setDrawing(false);
                  setDraftRing([]);
                }}
                className="pointer-events-auto rounded-lg border border-rule bg-paper/95 px-2 py-1.5 text-xs text-ink-2 shadow-md hover:text-ink"
              >
                ✕
              </button>
            </>
          )}
        </div>
      )}
      {scanning && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-[500] flex items-center gap-2 rounded-lg border border-rule bg-paper/95 px-3 py-1.5 text-xs font-medium text-ink shadow-md">
          <span className="inline-block h-2 w-2 animate-ping rounded-full bg-accent" />
          {t("scan.scanning")}
        </div>
      )}
    </div>
  );
}
