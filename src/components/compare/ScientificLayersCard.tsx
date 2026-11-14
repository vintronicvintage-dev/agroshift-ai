"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { calibrateInitialRootZoneMoisture } from "@/lib/physics/rootZoneMoisture";
import { fetchParcelTerrainSlope, regionalDefaultSlopePct, rusleLsFactor, type TerrainSlopeResult } from "@/lib/physics/terrainSlope";
import type { AnalysisResult } from "@/lib/types";

const ZONE_COORDS = {
  highland: { lat: 37.57, lon: 32.77 },
  north_lowland: { lat: 41.27, lon: 26.69 },
  south_lowland: { lat: 36.87, lon: 39.03 },
} as const;

function resolveSiteCoords(result: AnalysisResult): { lat: number; lon: number } {
  if (typeof window !== "undefined") {
    const sp = new URLSearchParams(window.location.search);
    const la = Number(sp.get("lat"));
    const lo = Number(sp.get("lon"));
    if (Number.isFinite(la) && Number.isFinite(lo) && la >= 35 && la <= 43 && lo >= 25 && lo <= 46) {
      return { lat: la, lon: lo };
    }
  }
  return ZONE_COORDS[result.zone] ?? ZONE_COORDS.highland;
}

export function ScientificLayersCard({ result }: { result: AnalysisResult }) {
  const { lang, n } = useI18n();
  const tr = lang === "tr";
  const { lat, lon } = resolveSiteCoords(result);

  const latestGwetRoot =
    [...result.climate.annual].reverse().find((a) => a.gwetRootMean !== null)?.gwetRootMean ?? null;

  const moisture = calibrateInitialRootZoneMoisture({
    lat,
    lon,
    dateOrMonth: result.climate.period.end || "2026-10-15",
    gwetRoot: latestGwetRoot,
    gwetProf: null,
    thetaSat: result.soil.thetaSat,
    thetaFC: result.soil.thetaFC,
    thetaWP: result.soil.thetaWP,
    rootDepthM: 1.5,
  });

  const fb = regionalDefaultSlopePct(lat, lon);
  const [slopeData, setSlopeData] = useState<TerrainSlopeResult>(() => ({
    lat,
    lon,
    elevationM: result.terrain?.elevationMean ?? null,
    northElevationM: null,
    eastElevationM: null,
    slopePct: result.terrain?.slopePct ?? fb.slopePct,
    rusleLsFactor: rusleLsFactor(result.terrain?.slopePct ?? fb.slopePct),
    slopeLengthM: 50,
    source: "regional_fallback",
    fallbackUsed: true,
    regionId: fb.regionId,
  }));

  useEffect(() => {
    let active = true;
    void fetchParcelTerrainSlope(lat, lon).then((res) => {
      if (active) setSlopeData(res);
    });
    return () => {
      active = false;
    };
  }, [lat, lon]);

  return (
    <section className="break-inside-avoid rounded-2xl border border-rule bg-panel p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule/70 pb-2">
        <h3 className="font-display text-base font-semibold text-ink">
          {tr ? "Uydu Toprak Nemi & SRTM 30m Topoğrafya Kalibrasyonu" : "Satellite Soil Moisture & SRTM 30m Terrain Calibration"}
        </h3>
        <span className="text-xs text-ink-2 tabular-nums">
          {n(lat, 3)}° N, {n(lon, 3)}° E
        </span>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-rule/70 bg-paper p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              {tr ? "NASA POWER Kök Bölgesi Nemi (GWETROOT & GWETPROF)" : "NASA POWER Root-Zone Wetness (GWETROOT & GWETPROF)"}
            </span>
            <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
              {moisture.usedOfflineFallback ? (tr ? "Çevrimdışı Mevsimsel" : "Offline Seasonal") : "NASA POWER"}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
            <div>
              <dt className="text-ink-2">GWETROOT / PROF</dt>
              <dd className="font-semibold text-ink">
                {n(moisture.gwetRootUsed, 2)} / {n(moisture.gwetProfUsed, 2)}
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">{tr ? "Başlangıç θ₀" : "Initial θ₀"}</dt>
              <dd className="font-semibold text-ink">{n(moisture.theta0M3M3, 3)} m³/m³</dd>
            </div>
            <div>
              <dt className="text-ink-2">{tr ? "Kök Rezervi" : "Root Reserve"}</dt>
              <dd className="font-semibold text-sky">{n(moisture.initialReserveMm, 1)} mm</dd>
            </div>
          </dl>
          <p className="mt-1.5 text-[11px] text-ink-2">{moisture.source}</p>
        </div>

        <div className="rounded-xl border border-rule/70 bg-paper p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-ink">
              {tr ? "NASA SRTM 30m Parsel Eğimi & RUSLE LS" : "NASA SRTM 30m Parcel Slope & RUSLE LS"}
            </span>
            <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[11px] font-medium text-ink-2">
              {slopeData.fallbackUsed ? (tr ? "Bölgesel Fallback" : "Regional Fallback") : "SRTM 30m Canlı"}
            </span>
          </div>
          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs tabular-nums">
            <div>
              <dt className="text-ink-2">{tr ? "Merkez Rakım" : "Elevation"}</dt>
              <dd className="font-semibold text-ink">
                {slopeData.elevationM !== null ? `${n(slopeData.elevationM, 0)} m` : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">{tr ? "Parsel Eğimi" : "Parcel Slope"}</dt>
              <dd className="font-semibold text-ink">%{n(slopeData.slopePct, 2)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">RUSLE LS</dt>
              <dd className="font-semibold text-[var(--c-green)]">{n(slopeData.rusleLsFactor, 3)}</dd>
            </div>
          </dl>
          <p className="mt-1.5 text-[11px] text-ink-2">
            {slopeData.fallbackUsed
              ? tr
                ? `Çevrimdışı / zaman aşımı koruması: ${slopeData.regionId} bölgesel eğim varsayılanı`
                : `Offline/timeout protection: ${slopeData.regionId} regional default slope`
              : tr
                ? "OpenTopoData SRTM 30m (merkez + 100 m K/D gradyanı, λ = 50 m)"
                : "OpenTopoData SRTM 30m (center + 100 m N/E gradient, λ = 50 m)"}
          </p>
        </div>
      </div>
    </section>
  );
}
