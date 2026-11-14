"use client";

import type { FieldResponse } from "@/lib/data/fieldTypes";
import { useI18n } from "@/lib/i18n";
import { compassLabel, recommendParcelManagement, type ParcelSummary } from "@/lib/ui/parcelScan";

interface Props {
  summary: ParcelSummary;
  scanData: FieldResponse | null;
  scanning: boolean;
}

export function ParcelScanCard({ summary, scanData, scanning }: Props) {
  const { t, n, lang } = useI18n();
  const terrain = scanData?.terrain ?? null;
  const layers = scanData?.soilLayers ?? null;
  const slope = terrain?.slopePct ?? null;
  const aspect = compassLabel(terrain?.aspectDeg, lang);
  const mgmt = recommendParcelManagement(slope, summary.compactnessPct, summary.dominantAxis, lang);
  const basinName = lang === "tr" ? summary.nearestBasin.basin.nameTr : summary.nearestBasin.basin.nameEn;

  return (
    <div className="mt-4 rounded-xl border border-rule bg-panel p-4 text-sm shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2.5">
        <div>
          <h4 className="font-display text-base font-semibold text-ink">{t("scan.title")}</h4>
          <p className="text-xs text-ink-2">
            {t("scan.subtitle", { pts: summary.scanPoints.length, v: summary.vertexCount })}
          </p>
        </div>
        {scanning && (
          <span className="recalc text-xs font-medium text-sky">{t("scan.scanning")}</span>
        )}
      </div>

      {summary.selfIntersecting && (
        <p className="mt-2.5 rounded-lg bg-warn px-3 py-1.5 text-xs font-medium text-warn-ink">
          {t("scan.selfInt")}
        </p>
      )}

      {/* Primary metrics grid */}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-rule bg-paper px-3 py-2">
          <dt className="text-xs text-ink-2">{t("scan.area")}</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">
            {n(summary.geometry.areaDa, 1)} da{" "}
            <span className="text-xs font-normal text-ink-2">({n(summary.geometry.areaHa, 2)} ha)</span>
          </dd>
        </div>
        <div className="rounded-lg border border-rule bg-paper px-3 py-2">
          <dt className="text-xs text-ink-2">{t("scan.perim")}</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">
            {n(Math.round(summary.geometry.perimeterM))} m{" "}
            <span className="text-xs font-normal text-ink-2">
              ({n(summary.widthM)}×{n(summary.heightM)} m)
            </span>
          </dd>
        </div>
        <div className="col-span-2 rounded-lg border border-rule bg-paper px-3 py-2 sm:col-span-1">
          <dt className="text-xs text-ink-2">{t("scan.terrain")}</dt>
          <dd className="mt-0.5 font-semibold text-ink tabular-nums">
            {terrain ? (
              <>
                {n(terrain.elevationMean, 0)} m · %{n(terrain.slopePct, 1)}{" "}
                <span className="text-xs font-normal text-ink-2">
                  (Δh {n(Math.max(0, terrain.elevationMax - terrain.elevationMin), 1)} m)
                </span>
              </>
            ) : (
              <span className="text-xs font-normal text-ink-2">SRTM DEM ({summary.scanPoints.length} pt)</span>
            )}
          </dd>
        </div>
      </dl>

      {/* Interior 3-zone breakdown */}
      <div className="mt-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-ink">{t("scan.zones")}</span>
          <span className="text-ink-2 tabular-nums">
            {basinName} (~{n(summary.nearestBasin.distanceKm, 0)} km)
          </span>
        </div>
        <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-paper" aria-hidden="true">
          <span style={{ width: `${summary.zoneShares.upperPct}%`, background: "#E69F00" }} />
          <span style={{ width: `${summary.zoneShares.midPct}%`, background: "#009E73" }} />
          <span style={{ width: `${summary.zoneShares.lowerPct}%`, background: "#56B4E9" }} />
        </div>
        <div className="mt-1.5 flex flex-wrap justify-between gap-2 text-xs text-ink-2 tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#E69F00" }} />
            {t("scan.zone.upper")}: <strong className="text-ink">%{summary.zoneShares.upperPct}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#009E73" }} />
            {t("scan.zone.mid")}: <strong className="text-ink">%{summary.zoneShares.midPct}</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#56B4E9" }} />
            {t("scan.zone.lower")}: <strong className="text-ink">%{summary.zoneShares.lowerPct}</strong>
          </span>
        </div>
      </div>

      {/* Aspect & Management */}
      <div className="mt-3 space-y-1.5 border-t border-rule pt-2.5 text-xs text-ink-2">
        <p>
          <strong className="text-ink">{t("scan.aspect")}:</strong> {aspect.dir} — {aspect.note}
        </p>
        <p>
          <strong className="text-ink">{t("scan.mgmt")}:</strong> {mgmt}
        </p>
      </div>

      {/* 6-layer scanned soil profile */}
      {layers && layers.length > 0 && (
        <details className="mt-3 border-t border-rule pt-2 text-xs">
          <summary className="cursor-pointer font-semibold text-ink">
            {t("scan.layers")} {scanData?.wrb ? `· WRB: ${scanData.wrb}` : ""}
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead>
                <tr className="border-b border-rule text-ink-2">
                  <th className="py-1 pr-2">cm</th>
                  <th className="py-1 px-2">{t("soil.sand")} %</th>
                  <th className="py-1 px-2">{t("soil.silt")} %</th>
                  <th className="py-1 px-2">{t("soil.clay")} %</th>
                  <th className="py-1 px-2">SOC g/kg</th>
                  <th className="py-1 pl-2">pH</th>
                </tr>
              </thead>
              <tbody>
                {layers.map((ly) => (
                  <tr key={`${ly.top}-${ly.bottom}`} className="border-b border-rule/50 last:border-0">
                    <td className="py-1 pr-2 font-medium text-ink">
                      {ly.top}–{ly.bottom}
                    </td>
                    <td className="py-1 px-2">{n(ly.sand, 0)}</td>
                    <td className="py-1 px-2">{n(ly.silt, 0)}</td>
                    <td className="py-1 px-2">{n(ly.clay, 0)}</td>
                    <td className="py-1 px-2">{ly.soc !== null ? n(ly.soc, 1) : "—"}</td>
                    <td className="py-1 pl-2">{ly.ph !== null ? n(ly.ph, 1) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
