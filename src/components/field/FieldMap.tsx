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
}

/** NASA GIBS WMTS (REST, Web Mercator). Time omitted = latest available composite. Verified to return PNG tiles. */
const GIBS_NDVI =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_L3_NDVI_16Day/default/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png";

const TURKEY_CENTER: [number, number] = [38.9, 34.5];

export default function FieldMap({ pilots, selected, showNdvi, onPick, onPilot, label }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  const pilotLayer = useRef<LayerGroup | null>(null);
  const pickLayer = useRef<LayerGroup | null>(null);
  const ndviLayer = useRef<TileLayer | null>(null);
  const handlers = useRef({ onPick, onPilot });
  const readyRef = useRef<() => void>(() => {});

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
      map = L.map(el.current, { center: TURKEY_CENTER, zoom: 5, minZoom: 3, maxZoom: 15, worldCopyJump: true, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        className: "osm-base",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
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
  }, []);

  // sync layers whenever props change (and once the map becomes ready)
  useEffect(() => {
    const sync = () => {
      const L = LRef.current;
      const map = mapRef.current;
      if (!L || !map || !pilotLayer.current || !pickLayer.current || !ndviLayer.current) return;
      pilotLayer.current.clearLayers();
      for (const p of pilots) {
        L.circleMarker([p.lat, p.lon], { radius: 7, color: "#1d2a23", weight: 2, fillColor: "#E69F00", fillOpacity: 1 })
          .bindTooltip(p.name, { direction: "top", offset: [0, -6] })
          .on("click", (e) => {
            L.DomEvent.stopPropagation(e);
            handlers.current.onPilot(p.id);
          })
          .addTo(pilotLayer.current);
      }
      pickLayer.current.clearLayers();
      if (selected) {
        L.circleMarker([selected.lat, selected.lon], { radius: 12, color: "#0072B2", weight: 3, fill: false }).addTo(pickLayer.current);
        L.circleMarker([selected.lat, selected.lon], { radius: 3, color: "#0072B2", weight: 0, fillColor: "#0072B2", fillOpacity: 1 }).addTo(pickLayer.current);
        if (!map.getBounds().pad(-0.1).contains([selected.lat, selected.lon])) map.setView([selected.lat, selected.lon], Math.max(map.getZoom(), 7));
      }
      if (showNdvi && !map.hasLayer(ndviLayer.current)) ndviLayer.current.addTo(map);
      if (!showNdvi && map.hasLayer(ndviLayer.current)) map.removeLayer(ndviLayer.current);
    };
    readyRef.current = sync;
    sync();
  }, [pilots, selected, showNdvi]);

  return <div ref={el} role="application" aria-label={label} className="h-full w-full" />;
}
