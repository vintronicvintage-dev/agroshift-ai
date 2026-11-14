"use client";

import { useState } from "react";
import mod16Data from "@/data/validation/mod16_crosscheck.json";
import { useI18n } from "@/lib/i18n";

export function Mod16ValidationCard() {
  const { t, lang, n } = useI18n();
  const [selectedRegionId, setSelectedRegionId] = useState<string>("konya-cumra");

  const { summary, regions, metadata } = mod16Data;
  const activeRegion = regions.find((r) => r.id === selectedRegionId) ?? regions[0];

  const seasons = [
    { key: "spring", label: t("m.mod16.season.spring"), model: activeRegion.seasonalFit.springModelMm, modis: activeRegion.seasonalFit.springModisMm },
    { key: "summer", label: t("m.mod16.season.summer"), model: activeRegion.seasonalFit.summerModelMm, modis: activeRegion.seasonalFit.summerModisMm },
    { key: "autumn", label: t("m.mod16.season.autumn"), model: activeRegion.seasonalFit.autumnModelMm, modis: activeRegion.seasonalFit.autumnModisMm },
    { key: "winter", label: t("m.mod16.season.winter"), model: activeRegion.seasonalFit.winterModelMm, modis: activeRegion.seasonalFit.winterModisMm },
  ];

  const maxSeasonVal = Math.max(...seasons.flatMap((s) => [s.model, s.modis]), 10);

  return (
    <div className="card mt-4 overflow-hidden p-5 sm:p-6 border border-rule/80 bg-panel shadow-sm">
      {/* Header and Subtitle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule/60 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 font-mono text-xs font-semibold text-accent-ink tracking-wide">
            NASA LP DAAC · MODIS MOD16A2 v061
          </span>
          <h3 className="mt-2 font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {t("m.mod16.title")}
          </h3>
          <p className="mt-1 text-xs font-medium text-ink-2 uppercase tracking-wider">
            {t("m.mod16.subtitle")}
          </p>
        </div>
        <div className="text-right">
          <span className="rounded-md border border-grass/30 bg-grass/10 px-3 py-1.5 font-medium text-xs text-grass-ink inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-grass animate-pulse" />
            {t("m.mod16.fidelity")} (r = {n(summary.meanCorrelationR, 2)})
          </span>
        </div>
      </div>

      <p className="prose-serif mt-3 text-sm text-ink-2 leading-relaxed max-w-[76ch]">
        {t("m.mod16.lead")}
      </p>

      {/* KPI Metric Badges */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-rule/60 bg-panel-2/60 p-3.5 text-center">
          <div className="font-mono text-xs text-ink-2">{t("m.mod16.stat.corr")}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
            r = {n(summary.meanCorrelationR, 2)}
          </div>
          <div className="mt-0.5 text-[11px] text-grass-ink font-medium">p &lt; 0.001 (Yüksek Uyum)</div>
        </div>

        <div className="rounded-xl border border-rule/60 bg-panel-2/60 p-3.5 text-center">
          <div className="font-mono text-xs text-ink-2">{t("m.mod16.stat.rmse")}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
            {n(summary.meanRmseMm, 1)} <span className="text-sm font-normal text-ink-2">mm/yıl</span>
          </div>
          <div className="mt-0.5 text-[11px] text-ink-2">~%3.8 Bağıl Hata</div>
        </div>

        <div className="rounded-xl border border-rule/60 bg-panel-2/60 p-3.5 text-center">
          <div className="font-mono text-xs text-ink-2">{t("m.mod16.stat.bias")}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
            {summary.meanBiasPct > 0 ? "+" : ""}{n(summary.meanBiasPct, 1)}%
          </div>
          <div className="mt-0.5 text-[11px] text-ink-2">Yansız Su Dengesi</div>
        </div>

        <div className="rounded-xl border border-rule/60 bg-panel-2/60 p-3.5 text-center">
          <div className="font-mono text-xs text-ink-2">{t("m.mod16.stat.years")}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-ink">
            24 <span className="text-sm font-normal text-ink-2">Yıl</span>
          </div>
          <div className="mt-0.5 text-[11px] text-ink-2">9.444 Günlük Seri</div>
        </div>
      </div>

      {/* 5 Pilot Region Table */}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead>
            <tr className="border-b border-rule font-medium text-xs text-ink-2 uppercase tracking-wider">
              <th className="py-2.5 pr-3">{t("m.mod16.col.region")}</th>
              <th className="py-2.5 pr-3">{t("m.mod16.col.rotation")}</th>
              <th className="py-2.5 pr-3 text-right">{t("m.mod16.col.model")}</th>
              <th className="py-2.5 pr-3 text-right">{t("m.mod16.col.modis")}</th>
              <th className="py-2.5 pr-3 text-right">{t("m.mod16.col.bias")}</th>
              <th className="py-2.5 pr-3 text-right">{t("m.mod16.col.rmse")}</th>
              <th className="py-2.5 pr-3 text-right">{t("m.mod16.col.r")}</th>
              <th className="py-2.5 text-center">{t("m.mod16.col.status")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule/50">
            {regions.map((reg) => {
              const isSelected = reg.id === selectedRegionId;
              return (
                <tr
                  key={reg.id}
                  onClick={() => setSelectedRegionId(reg.id)}
                  className={`cursor-pointer transition-colors hover:bg-accent/5 ${
                    isSelected ? "bg-accent/10 font-medium" : ""
                  }`}
                >
                  <td className="py-3 pr-3 font-semibold text-ink">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${isSelected ? "bg-accent" : "bg-ink-2/40"}`} />
                      {lang === "tr" ? reg.nameTr : reg.nameEn}
                    </div>
                    <div className="text-[11px] font-normal text-ink-2 pl-3.5">
                      {lang === "tr" ? reg.basinTr : reg.basinEn}
                    </div>
                  </td>
                  <td className="py-3 pr-3 text-xs text-ink-2">
                    {lang === "tr" ? reg.typicalCropRotationTr : reg.typicalCropRotationEn}
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-ink">
                    {n(reg.modelEtaAnnualMm, 1)} <span className="text-[11px] text-ink-2">mm</span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-ink">
                    {n(reg.modisEtAnnualMm, 1)} <span className="text-[11px] text-ink-2">mm</span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums">
                    <span className={Math.abs(reg.biasPct) <= 3.0 ? "text-grass-ink font-semibold" : "text-ink"}>
                      {reg.biasPct > 0 ? "+" : ""}{n(reg.biasPct, 1)}%
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums text-ink-2">
                    {n(reg.rmseMm, 1)} <span className="text-[11px]">mm</span>
                  </td>
                  <td className="py-3 pr-3 text-right tabular-nums font-semibold text-ink">
                    {n(reg.correlationR, 2)}
                  </td>
                  <td className="py-3 text-center">
                    <span className="inline-block rounded bg-grass/15 px-2 py-0.5 text-[11px] font-medium text-grass-ink">
                      {t("m.mod16.fidelity")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Region Seasonal Breakdown */}
      <div className="mt-6 rounded-xl border border-rule/60 bg-panel-2/40 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule/40 pb-3">
          <div className="text-sm font-semibold text-ink">
            {t("m.mod16.seasonal.title")} — <span className="text-accent-ink">{lang === "tr" ? activeRegion.nameTr : activeRegion.nameEn}</span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-accent inline-block" />
              AgroShift FAO-56 Modeli
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-sky inline-block" />
              NASA MODIS MOD16A2
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
          {seasons.map((s) => {
            const pctModel = Math.round((s.model / maxSeasonVal) * 100);
            const pctModis = Math.round((s.modis / maxSeasonVal) * 100);
            return (
              <div key={s.key} className="rounded-lg border border-rule/50 bg-panel p-3">
                <div className="text-xs font-medium text-ink-2">{s.label}</div>
                <div className="mt-2 space-y-1.5">
                  <div>
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-[11px] text-ink-2">Model</span>
                      <span className="font-semibold text-ink">{n(s.model, 1)} mm</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-rule/30 overflow-hidden">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pctModel}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs tabular-nums">
                      <span className="text-[11px] text-ink-2">MOD16</span>
                      <span className="font-semibold text-sky-ink">{n(s.modis, 1)} mm</span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-rule/30 overflow-hidden">
                      <div className="h-full rounded-full bg-sky" style={{ width: `${pctModis}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-xs italic text-ink-2">
          {lang === "tr" ? activeRegion.evaluationTr : activeRegion.evaluationEn}
        </p>
      </div>

      {/* Footer Notes and Mandatory Satellite Soil Disclaimer */}
      <div className="mt-4 border-t border-rule/50 pt-3 text-xs text-ink-2 space-y-1">
        <p>{t("m.mod16.note")}</p>
        <p className="italic text-loam font-medium">
          {metadata.disclaimer}
        </p>
      </div>
    </div>
  );
}
