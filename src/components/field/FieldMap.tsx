"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LMap, LayerGroup, TileLayer } from "leaflet";

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
  /** "osm" street map (default) or the NASA Blue Marble satellite mosaic. */
  base?: "osm" | "satellite";
  /** Initial zoom when a point is selected. */
  focusZoom?: number;
}

/** NASA GIBS WMTS (REST, Web Mercator). Time omitted = latest available composite. Verified to return PNG tiles. */
const GIBS_NDVI =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_16Day/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png";

/** NASA GIBS Blue Marble Next Generation: cloud-free monthly composite, 500 m, level 8. */
const GIBS_BLUE_MARBLE =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/BlueMarble_NextGeneration/default/GoogleMapsCompatible_Level8/{z}/{y}/{x}.jpeg";

const TURKEY_CENTER: [number, number] = [38.9, 34.5];

export default function FieldMap({ pilots, selected, showNdvi, onPick, onPilot, label, base = "osm", focusZoom = 7 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const pilotLayer = useRef<LayerGroup | null>(null);
  const pickLayer = useRef<LayerGroup | null>(null);
  const ndviLayer = useRef<TileLayer | null>(null);
  const handlers = useRef({ onPick, onPilot });
  const readyRef = useRef<() => void>(() => {});
  const lastFocus = useRef<string | null>(null);

  useEffect(() => {
    handlers.current = { onPick, onPilot };
  }, [onPick, onPilot]);

  // create the map once
  useEffect(() => {
    let cancelled = false;
    let map: LMap | null = null;
    void import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      LRef.current = L;
      map = L.map(el.current, { center: TURKEY_CENTER, zoom: 5, minZoom: 3, maxZoom: base === "satellite" ? 10 : 15, worldCopyJump: true, scrollWheelZoom: false });
      if (base === "satellite") {
        L.tileLayer(GIBS_BLUE_MARBLE, {
          maxNativeZoom: 8,
          maxZoom: 10,
          className: "sat-base",
          attribution: 'Imagery: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> Blue Marble',
        }).addTo(map);
      } else {
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          className: "osm-base",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);
      }
      map.createPane("ndvi");
      const pane = map.getPane("ndvi");
      if (pane) pane.style.zIndex = "350";
      ndviLayer.current = L.tileLayer(GIBS_NDVI, {
        pane: "ndvi",
        maxNativeZoom: 9,
        maxZoom: 15,
        opacity: 0.7,
        attribution: 'NDVI: <a href="https://earthdata.nasa.gov/gibs">NASA GIBS</a> / MODIS Terra',
      });
      pilotLayer.current = L.layerGroup().addTo(map);
      pickLayer.current = L.layerGroup().addTo(map);
      map.on("click", (e) => handlers.current.onPick(+e.latlng.lat.toFixed(4), +e.latlng.lng.toFixed(4)));
      map.on("focus", () => map?.scrollWheelZoom.enable());
      map.on("blur", () => map?.scrollWheelZoom.disable());
      mapRef.current = map;
      readyRef.current();
    });
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
    // the base layer is fixed for the life of the map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // sync layers whenever props change (and once the map becomes ready)
  useEffect(() => {
    const sync = () => {
      const L = LRef.current;
      const map = mapRef.current;
      if (!L || !map || !pilotLayer.current || !pickLayer.current || !ndviLayer.current) return;
      pilotLayer.current.clearLayers();
      for (const p of pilots) {
        L.circleMarker([p.lat, p.lon], { radius: 7, color: "#0d1310", weight: 2, fillColor: "#E69F00", fillOpacity: 1 })
          .bindTooltip(p.name, { direction: "top", offset: [0, -6] })
          .on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            handlers.current.onPilot(p.id);
          })
          .addTo(pilotLayer.current);
      }
      pickLayer.current.clearLayers();
      if (selected) {
        const ring = base === "satellite" ? "#c8f25a" : "#0072B2";
        L.circleMarker([selected.lat, selected.lon], { radius: 13, color: ring, weight: 2.5, fill: false }).addTo(pickLayer.current);
        L.circleMarker([selected.lat, selected.lon], { radius: 3.5, color: ring, weight: 0, fillColor: ring, fillOpacity: 1 }).addTo(pickLayer.current);
        const key = `${selected.lat},${selected.lon}`;
        if (base === "satellite") {
          // centre once per newly selected point; later re-syncs must not undo the user's panning
          if (lastFocus.current !== key) map.setView([selected.lat, selected.lon], focusZoom);
        } else if (!map.getBounds().pad(-0.1).contains([selected.lat, selected.lon])) map.setView([selected.lat, selected.lon], Math.max(map.getZoom(), focusZoom));
        lastFocus.current = key;
      }
      if (showNdvi && !map.hasLayer(ndviLayer.current)) ndviLayer.current.addTo(map);
      if (!showNdvi && map.hasLayer(ndviLayer.current)) map.removeLayer(ndviLayer.current);
    };
    readyRef.current = sync;
    sync();
  }, [pilots, selected, showNdvi, base, focusZoom]);

  return <div ref={el} role="application" aria-label={label} className="h-full w-full" />;
}
