"use client";

import { useState } from "react";
import { CROPS, CROP_CONSTANTS } from "@/lib/crops/database";
import type { AnalysisResult, ClimateSummary, CropId, LocalizedText, PlanResult } from "@/lib/types";
import { setStore, useStore } from "@/lib/ui/fieldStore";
import { CropArt } from "@/components/brand/CropArt";
import { Icon } from "@/components/ui/Icons";

const RF_COST_SHARE = CROP_CONSTANTS.rainfedCostShare.value;

export interface YearEconBreakdown {
  year: number;
  cropId: CropId;
  cropName: string;
  yieldKgDaP10: number;
  yieldKgDaP50: number;
  yieldKgDaP90: number;
  yieldTonDaP50: number;
  yaYmPct: number;
  priceTLPerKg: number;
  revenueTLPerDa: number;
  varCostTLPerDa: number;
  waterCostTLPerDa: number;
  nCreditSavingTLPerDa: number;
  marginP10: number;
  marginP50: number;
  marginP90: number;
}

/**
 * Computes exact per-year economic breakdown using the same equations as `src/lib/engine/evaluation.ts`.
 */
export function computeYearBreakdowns(
  plan: PlanResult,
  res: AnalysisResult,
  econOverrides: Partial<Record<CropId, { price?: string; cost?: string }>>,
  waterPriceOverride: string,
  L: (v: LocalizedText) => string,
): YearEconBreakdown[] {
  const priceMult = res.scenario.priceMultiplier ?? 1;
  const eff = Math.max(0.1, res.scenario.irrigationEfficiency ?? 0.75);
  const parsedWaterPrice = Number(String(waterPriceOverride ?? "").replace(",", "."));
  const waterPrice =
    Number.isFinite(parsedWaterPrice) && parsedWaterPrice >= 0 && String(waterPriceOverride ?? "").trim() !== ""
      ? parsedWaterPrice
      : res.scenario.waterPriceTLPerM3 ?? CROP_CONSTANTS.waterPriceTLPerM3.value;

  return plan.years.slice(0, 3).map((y, idx) => {
    const def = CROPS[y.cropId];
    const ov = econOverrides[y.cropId];
    const parsedPrice = Number(String(ov?.price ?? "").replace(",", "."));
    const basePrice =
      Number.isFinite(parsedPrice) && parsedPrice >= 0 && String(ov?.price ?? "").trim() !== ""
        ? parsedPrice
        : def.priceTLPerKg.value;
    const priceTLPerKg = y.cropId === "fallow" ? 0 : basePrice * priceMult;

    const parsedCost = Number(String(ov?.cost ?? "").replace(",", "."));
    const fullVarCost =
      Number.isFinite(parsedCost) && parsedCost >= 0 && String(ov?.cost ?? "").trim() !== ""
        ? parsedCost
        : def.varCostTLPerDa.value;

    const intensity = y.irrigationIntensity ?? (res.scenario.budgetNetMm > 0 ? 1 : 0);
    const costFactor = y.cropId === "fallow" ? 1 : RF_COST_SHARE + (1 - RF_COST_SHARE) * intensity;
    const varCostTLPerDa = Math.round(fullVarCost * costFactor);

    const netIrrMm = y.irrigationNetMm?.p50 ?? 0;
    const grossIrrM3Da = netIrrMm / eff;
    const waterCostTLPerDa = Math.round(grossIrrM3Da * waterPrice);

    const pre = plan.preCrop?.[idx];
    const nCreditSavingTLPerDa = Math.round(pre?.nCostSavingTLPerDa ?? 0);

    const yieldKgDaP10 = Math.round((y.yieldTHa?.p10 ?? 0) * 100);
    const yieldKgDaP50 = Math.round((y.yieldTHa?.p50 ?? 0) * 100);
    const yieldKgDaP90 = Math.round((y.yieldTHa?.p90 ?? 0) * 100);
    const yieldTonDaP50 = (y.yieldTHa?.p50 ?? 0) / 10;
    const yaYmPct = y.cropId === "fallow" ? 0 : Math.round((y.yieldRatio?.p50 ?? 0) * 100);

    const revenueTLPerDa = Math.round(yieldKgDaP50 * priceTLPerKg);
    const marginP50 = Math.round(y.grossMarginTLPerDa?.p50 ?? revenueTLPerDa - varCostTLPerDa + nCreditSavingTLPerDa - waterCostTLPerDa);
    const marginP10 = Math.round(y.grossMarginTLPerDa?.p10 ?? marginP50 * 0.75);
    const marginP90 = Math.round(y.grossMarginTLPerDa?.p90 ?? marginP50 * 1.18);

    return {
      year: idx + 1,
      cropId: y.cropId,
      cropName: L(def.name),
      yieldKgDaP10,
      yieldKgDaP50,
      yieldKgDaP90,
      yieldTonDaP50,
      yaYmPct,
      priceTLPerKg,
      revenueTLPerDa,
      varCostTLPerDa,
      waterCostTLPerDa,
      nCreditSavingTLPerDa,
      marginP10,
      marginP50,
      marginP90,
    };
  });
}

/**
 * Upgraded Yield & Profitability Analysis Panel with:
 * - Recommended vs. Current Plan switcher
 * - Crisp SVG Dual-Axis Combo Chart with P10–P90 uncertainty whiskers & Current Plan reference line
 * - Transparent per-year Revenue / Cost / N-Credit / Water Cost / Net Margin breakdown table
 * - Inline TMO / Market Price & Cost Calibration drawer
 */
export function YieldProfitabilityPanel({
  res,
  best,
  currentPlan,
  effectiveAreaDa,
  lang,
  n,
  L,
  onOpenEvidence,
}: {
  res: AnalysisResult;
  best: PlanResult;
  currentPlan: PlanResult;
  effectiveAreaDa: number;
  lang: "tr" | "en";
  n: (v: number, d?: number) => string;
  L: (v: LocalizedText) => string;
  onOpenEvidence?: () => void;
}) {
  const store = useStore();
  const [activePlanMode, setActivePlanMode] = useState<"best" | "current">("best");
  const [calibrateOpen, setCalibrateOpen] = useState(false);

  const activePlan = activePlanMode === "best" ? best : currentPlan;
  const rows = computeYearBreakdowns(activePlan, res, store.econ.crops, store.econ.water, L);
  const compareRows = computeYearBreakdowns(
    activePlanMode === "best" ? currentPlan : best,
    res,
    store.econ.crops,
    store.econ.water,
    L,
  );

  // Distinct crops in active + current plans for quick inline calibration
  const editableCrops = Array.from(
    new Set<CropId>([
      ...best.crops.filter((c) => c !== "fallow"),
      ...currentPlan.crops.filter((c) => c !== "fallow"),
    ]),
  );

  const avgRevenue = Math.round(rows.reduce((a, r) => a + r.revenueTLPerDa, 0) / 3);
  const avgCost = Math.round(rows.reduce((a, r) => a + r.varCostTLPerDa + r.waterCostTLPerDa - r.nCreditSavingTLPerDa, 0) / 3);
  const avgMargin = Math.round(activePlan.economics.grossMarginTLPerDaPerYr?.p50 ?? rows.reduce((a, r) => a + r.marginP50, 0) / 3);
  const total3YrField = Math.round(activePlan.economics.fieldTotal3yrTL?.p50 ?? avgMargin * effectiveAreaDa * 3);
  const diffVsCurrentPerDa = Math.round(
    (best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0) - (currentPlan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0),
  );

  // Chart geometry with generous margins so labels never collide
  const W = 440;
  const H = 225;
  const padL = 44;
  const padR = 54;
  const padT = 24;
  const padB = 42;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const maxYieldTon = Math.max(
    0.6,
    ...rows.map((r) => Math.max(r.yieldTonDaP50, r.yieldKgDaP90 / 1000)),
  ) * 1.22;

  const allMargins = [
    ...rows.flatMap((r) => [r.marginP10, r.marginP50, r.marginP90]),
    ...compareRows.map((r) => r.marginP50),
  ];
  const maxMargin = Math.max(1500, ...allMargins) * 1.2;
  const minMargin = Math.min(0, ...allMargins) * 1.15;
  const marginSpan = Math.max(1500, maxMargin - minMargin);

  const xCenter = (idx: number) => padL + (plotW / 3) * (idx + 0.5);
  const yForYield = (tonDa: number) => padT + plotH - Math.max(0, Math.min(1, tonDa / maxYieldTon)) * plotH;
  const yForMargin = (m: number) => padT + plotH - Math.max(0, Math.min(1, (m - minMargin) / marginSpan)) * plotH;

  const activeLinePts = rows.map((r, i) => `${xCenter(i).toFixed(1)},${yForMargin(r.marginP50).toFixed(1)}`).join(" ");
  const compareLinePts = compareRows.map((r, i) => `${xCenter(i).toFixed(1)},${yForMargin(r.marginP50).toFixed(1)}`).join(" ");

  // P10–P90 polygon band around active margin line
  const bandPts = [
    ...rows.map((r, i) => `${xCenter(i).toFixed(1)},${yForMargin(r.marginP90).toFixed(1)}`),
    ...[...rows].reverse().map((r, revIdx) => {
      const i = rows.length - 1 - revIdx;
      return `${xCenter(i).toFixed(1)},${yForMargin(r.marginP10).toFixed(1)}`;
    }),
  ].join(" ");

  const hasCustomEcon =
    Object.keys(store.econ.crops).length > 0 || (store.econ.water && store.econ.water.trim() !== "");

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        {/* Header + Plan Toggle + Calibration Trigger */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
              <Icon name="chart" size={18} />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-semibold text-ink">
                {lang === "tr" ? "Verim ve Kârlılık Analizi" : "Yield & Profitability Analysis"}
              </h2>
              <p className="text-[11.5px] text-ink-2">
                {lang === "tr"
                  ? `${res.windows.count} yıllık gerçek iklim penceresi (P10–P50–P90) ve 2025/26 TMO/Borsa verileri`
                  : `${res.windows.count}-window climate replay (P10–P50–P90) & 2025/26 reference prices`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-lg border border-line bg-bg p-0.5 text-[11.5px] font-semibold">
              <button
                type="button"
                onClick={() => setActivePlanMode("best")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  activePlanMode === "best" ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink"
                }`}
              >
                {lang === "tr" ? "Önerilen Plan" : "Recommended"}
              </button>
              <button
                type="button"
                onClick={() => setActivePlanMode("current")}
                className={`rounded-md px-2.5 py-1 transition-colors ${
                  activePlanMode === "current" ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink"
                }`}
              >
                {lang === "tr" ? "Mevcut Plan" : "Current"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setCalibrateOpen((v) => !v)}
              className={`rounded-lg border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                calibrateOpen || hasCustomEcon
                  ? "border-accent bg-[#e6f4ea] text-[#1e6b34]"
                  : "border-line bg-bg text-ink-2 hover:text-ink"
              }`}
              title={lang === "tr" ? "Ürün alım fiyatlarını ve üretim maliyetlerini düzenle" : "Edit crop prices and variable costs"}
            >
              {lang === "tr" ? "Fiyat Kalibrasyonu" : "Calibrate Prices"}
            </button>
          </div>
        </div>

        {/* Inline Price & Cost Calibration Drawer */}
        {calibrateOpen && (
          <div className="mt-3 rounded-xl border border-[#86efac] bg-[#f0fdf4] p-3 text-[12px]">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <p className="font-semibold text-[#14532d]">
                {lang === "tr"
                  ? "Canlı Alım Fiyatı (TL/kg) ve Değişken Maliyet (TL/da) Kalibrasyonu"
                  : "Live Purchase Price (TL/kg) & Variable Cost (TL/da) Calibration"}
              </p>
              {hasCustomEcon && (
                <button
                  type="button"
                  onClick={() => setStore({ econ: { crops: {}, water: "" } })}
                  className="text-[11px] font-semibold text-[#1e6b34] underline"
                >
                  {lang === "tr" ? "TMO 2025/26 Varsayılanlarına Sıfırla" : "Reset to 2025/26 Defaults"}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {editableCrops.map((cid) => {
                const def = CROPS[cid];
                const curOv = store.econ.crops[cid] ?? {};
                return (
                  <div key={cid} className="flex items-center justify-between gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <CropArt crop={cid} size={20} />
                      <span className="truncate">{L(def.name)}</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <label className="flex items-center gap-1 text-[11px] text-ink-2">
                        <span>₺/kg:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          placeholder={String(def.priceTLPerKg.value)}
                          value={curOv.price ?? ""}
                          onChange={(e) =>
                            setStore((s) => ({
                              econ: {
                                ...s.econ,
                                crops: {
                                  ...s.econ.crops,
                                  [cid]: { ...s.econ.crops[cid], price: e.target.value },
                                },
                              },
                            }))
                          }
                          className="w-14 rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-[11.5px] text-ink"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-[11px] text-ink-2">
                        <span>Maliyet:</span>
                        <input
                          type="number"
                          step="100"
                          min="0"
                          placeholder={String(def.varCostTLPerDa.value)}
                          value={curOv.cost ?? ""}
                          onChange={(e) =>
                            setStore((s) => ({
                              econ: {
                                ...s.econ,
                                crops: {
                                  ...s.econ.crops,
                                  [cid]: { ...s.econ.crops[cid], cost: e.target.value },
                                },
                              },
                            }))
                          }
                          className="w-16 rounded border border-line bg-bg px-1.5 py-0.5 font-mono text-[11.5px] text-ink"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-ink-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-3.5 rounded-sm bg-[#2e7d32]" />
              <span>{lang === "tr" ? "Verim (t/da & P10–P90)" : "Yield (t/da & P10–P90)"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1 w-3.5 rounded-full bg-[#d97706]" />
              <span className="inline-block size-2 rounded-full bg-[#d97706]" />
              <span>{lang === "tr" ? "Net/Brüt Kâr (TL/da)" : "Gross Margin (TL/da)"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3.5 border-b border-dashed border-[#64748b]" />
              <span>
                {activePlanMode === "best"
                  ? lang === "tr" ? "Mevcut Plan Kârı" : "Current Plan Margin"
                  : lang === "tr" ? "Önerilen Plan Kârı" : "Recommended Margin"}
              </span>
            </span>
          </div>
        </div>

        {/* Upgraded Dual-Axis SVG Combo Chart */}
        <div className="mt-2 rounded-xl border border-line bg-bg/50 p-2">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full overflow-visible"
            role="img"
            aria-label={lang === "tr" ? "3 Yıllık Verim ve Kârlılık Analizi Grafiği" : "3-Year Yield and Profitability Chart"}
          >
            {/* Axis unit headers */}
            <text x={padL - 6} y={12} textAnchor="end" fontSize="9.5" fontWeight="600" fill="#1e6b34" fontFamily="var(--font-mono)">
              t/da
            </text>
            <text x={W - padR + 6} y={12} textAnchor="start" fontSize="9.5" fontWeight="600" fill="#b45309" fontFamily="var(--font-mono)">
              TL/da
            </text>

            {/* Horizontal grid lines */}
            {[0, 0.33, 0.66, 1].map((f, i) => {
              const y = padT + plotH * (1 - f);
              const yVal = maxYieldTon * f;
              const mVal = minMargin + marginSpan * f;
              return (
                <g key={i}>
                  <line
                    x1={padL}
                    y1={y}
                    x2={W - padR}
                    y2={y}
                    stroke="var(--grid)"
                    strokeWidth={f === 0 ? "1.3" : "1"}
                    strokeDasharray={f === 0 ? undefined : "3 3"}
                  />
                  <text
                    x={padL - 6}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="var(--ink-2)"
                    fontFamily="var(--font-mono)"
                  >
                    {n(yVal, 2)}
                  </text>
                  <text
                    x={W - padR + 6}
                    y={y + 3.5}
                    textAnchor="start"
                    fontSize="10"
                    fill="#b45309"
                    fontFamily="var(--font-mono)"
                  >
                    {n(mVal, 0)}
                  </text>
                </g>
              );
            })}

            {/* Zero-margin reference line if minMargin < 0 */}
            {minMargin < 0 && (
              <line
                x1={padL}
                y1={yForMargin(0)}
                x2={W - padR}
                y2={yForMargin(0)}
                stroke="#c0392b"
                strokeWidth="1"
                strokeDasharray="4 2"
              />
            )}

            {/* P10–P90 Shaded Uncertainty Band for Margin */}
            <polygon points={bandPts} fill="#f59e0b" fillOpacity="0.14" />

            {/* Yield Bars + P10–P90 Whisker Bars */}
            {rows.map((r, i) => {
              const cx = xCenter(i);
              const bw = 54;
              const topY = yForYield(r.yieldTonDaP50);
              const bh = Math.max(16, padT + plotH - topY);
              const yP10 = yForYield(r.yieldKgDaP10 / 1000);
              const yP90 = yForYield(r.yieldKgDaP90 / 1000);

              return (
                <g key={r.year}>
                  <rect
                    x={cx - bw / 2}
                    y={padT + plotH - bh}
                    width={bw}
                    height={bh}
                    rx="7"
                    fill="#2e7d32"
                    fillOpacity="0.92"
                  />
                  {/* P10-P90 Whisker on Yield Bar */}
                  {r.cropId !== "fallow" && (
                    <g stroke="#bbf7d0" strokeWidth="1.6">
                      <line x1={cx} y1={yP90} x2={cx} y2={yP10} />
                      <line x1={cx - 6} y1={yP90} x2={cx + 6} y2={yP90} />
                      <line x1={cx - 6} y1={yP10} x2={cx + 6} y2={yP10} />
                    </g>
                  )}
                  {/* Yield value inside bar */}
                  <text
                    x={cx}
                    y={padT + plotH - 7}
                    textAnchor="middle"
                    fontSize="11"
                    fontWeight="700"
                    fill="#ffffff"
                    fontFamily="var(--font-mono)"
                  >
                    {n(r.yieldTonDaP50, 2)}
                  </text>
                  {/* X-axis Year + Crop Name */}
                  <text
                    x={cx}
                    y={H - 18}
                    textAnchor="middle"
                    fontSize="11.5"
                    fontWeight="700"
                    fill="var(--ink)"
                  >
                    {r.year}. {lang === "tr" ? "Yıl" : "Yr"} ({r.yieldKgDaP50} kg/da)
                  </text>
                  <text
                    x={cx}
                    y={H - 4}
                    textAnchor="middle"
                    fontSize="10.5"
                    fontWeight="500"
                    fill="var(--ink-2)"
                  >
                    {r.cropName}
                  </text>
                </g>
              );
            })}

            {/* Comparison Plan Margin Line (Dashed) */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.8"
              strokeDasharray="4 4"
              points={compareLinePts}
            />

            {/* Active Plan Margin Line + Nodes + Value Badges */}
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={activeLinePts}
            />
            {rows.map((r, i) => {
              const cx = xCenter(i);
              const cy = yForMargin(r.marginP50);
              const badgeY = Math.max(14, cy - 12);
              return (
                <g key={`m-${r.year}`}>
                  <circle cx={cx} cy={cy} r="5" fill="#ffffff" stroke="#d97706" strokeWidth="2.8" />
                  <rect
                    x={cx - 32}
                    y={badgeY - 11}
                    width="64"
                    height="16"
                    rx="4"
                    fill="#fffbeb"
                    stroke="#f59e0b"
                    strokeWidth="1"
                  />
                  <text
                    x={cx}
                    y={badgeY + 0.5}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="700"
                    fill="#b45309"
                    fontFamily="var(--font-mono)"
                  >
                    {n(r.marginP50, 0)} ₺
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Real Year-by-Year Economic Breakdown Table */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-bg/65">
          <table className="w-full text-left text-[11.5px]">
            <thead className="border-b border-line bg-surface text-[11px] font-semibold text-ink-2">
              <tr>
                <th className="px-2.5 py-1.5">{lang === "tr" ? "Yıl / Ürün" : "Yr / Crop"}</th>
                <th className="px-2 py-1.5 text-right">{lang === "tr" ? "Verim (P50)" : "Yield"}</th>
                <th className="px-2 py-1.5 text-right">{lang === "tr" ? "Fiyat" : "Price"}</th>
                <th className="px-2 py-1.5 text-right">{lang === "tr" ? "Brüt Gelir" : "Revenue"}</th>
                <th className="px-2 py-1.5 text-right">{lang === "tr" ? "Net Maliyet" : "Net Cost"}</th>
                <th className="px-2.5 py-1.5 text-right">{lang === "tr" ? "Net Kâr" : "Margin"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-mono">
              {rows.map((r) => {
                const netCost = r.varCostTLPerDa + r.waterCostTLPerDa - r.nCreditSavingTLPerDa;
                return (
                  <tr key={r.year} className="hover:bg-surface/80">
                    <td className="px-2.5 py-1.5 font-sans font-medium text-ink">
                      <span className="inline-flex items-center gap-1.5">
                        <CropArt crop={r.cropId} size={16} />
                        <span>
                          {r.year}. {r.cropName}
                        </span>
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink">
                      {r.cropId === "fallow" ? "—" : `${n(r.yieldKgDaP50, 0)} kg`}
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink-2">
                      {r.cropId === "fallow" ? "—" : `${n(r.priceTLPerKg, 1)} ₺`}
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink">
                      {n(r.revenueTLPerDa, 0)} ₺
                    </td>
                    <td className="px-2 py-1.5 text-right text-ink-2" title={r.nCreditSavingTLPerDa > 0 ? `Baklagil N kredisi tasarrufu: +${r.nCreditSavingTLPerDa} TL/da` : undefined}>
                      −{n(netCost, 0)} ₺
                    </td>
                    <td className={`px-2.5 py-1.5 text-right font-semibold ${r.marginP50 >= 0 ? "text-[#1e6b34]" : "text-bad"}`}>
                      {r.marginP50 >= 0 ? "+" : ""}{n(r.marginP50, 0)} ₺/da
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="border-t border-line bg-surface/90 font-mono text-[11.5px] font-semibold">
              <tr>
                <td className="px-2.5 py-1.5 font-sans text-ink">
                  {lang === "tr" ? "Yıllık Ortalama" : "Annual Mean"}
                </td>
                <td className="px-2 py-1.5 text-right text-ink-2">
                  P10–P90
                </td>
                <td className="px-2 py-1.5 text-right text-ink-2">TMO/Borsa</td>
                <td className="px-2 py-1.5 text-right text-ink">{n(avgRevenue, 0)} ₺</td>
                <td className="px-2 py-1.5 text-right text-ink-2">−{n(avgCost, 0)} ₺</td>
                <td className="px-2.5 py-1.5 text-right text-[#1e6b34]">+{n(avgMargin, 0)} ₺/da</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Footer Summary: 3-Year Total Field Profit + Delta vs Current Plan + Evidence Button */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[12px]">
        <div>
          <span className="text-ink-2">
            {lang === "tr"
              ? `3 Yıllık Toplam Arazi Kazancı (${n(effectiveAreaDa, 0)} da):`
              : `3-Year Total Parcel Profit (${n(effectiveAreaDa, 0)} da):`}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="numeral text-[18px] text-[#1e6b34]">{n(total3YrField, 0)} ₺</span>
            {diffVsCurrentPerDa !== 0 && (
              <span className={`font-mono text-[11px] font-semibold ${diffVsCurrentPerDa > 0 ? "text-[#1e6b34]" : "text-bad"}`}>
                ({diffVsCurrentPerDa > 0 ? "+" : ""}{n(diffVsCurrentPerDa, 0)} ₺/da/yıl {lang === "tr" ? "fark" : "vs current"})
              </span>
            )}
          </div>
        </div>
        {onOpenEvidence && (
          <button
            type="button"
            onClick={onOpenEvidence}
            className="text-[11.5px] font-semibold text-accent-ink hover:underline"
          >
            {lang === "tr" ? "Hesaplama Formülünü Gör →" : "See Formula & Evidence →"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 12-Month Climograph & FAO-56 Crop Water Balance Chart (Yağış vs. ET₀ vs. Sulama İhtiyacı).
 */
export function MonthlyWaterBalanceChart({
  climateSum,
  best,
  lang,
  n,
}: {
  climateSum: ClimateSummary;
  best: PlanResult;
  lang: "tr" | "en";
  n: (v: number, d?: number) => string;
}) {
  const MONTHS_TR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labels = lang === "tr" ? MONTHS_TR : MONTHS_EN;

  // Aggregate mean monthly crop irrigation and ETc across the 3-year cycle by calendar month (1..12)
  const monthlyIrrByCalMonth = new Array(12).fill(0);
  const monthlyEtcByCalMonth = new Array(12).fill(0);
  if (best.monthlyDemand && best.monthlyDemand.length > 0) {
    for (const m of best.monthlyDemand) {
      const idx = (m.month - 1 + 12) % 12;
      monthlyIrrByCalMonth[idx] += m.irrigationMm / 3;
      monthlyEtcByCalMonth[idx] += m.etcMm / 3;
    }
  }

  const months = Array.from({ length: 12 }, (_, idx) => {
    const cm = climateSum.monthly[idx];
    return {
      idx,
      label: labels[idx],
      precipMm: cm?.precipMm ?? 0,
      et0Mm: cm?.et0Mm ?? 0,
      etcMm: monthlyEtcByCalMonth[idx],
      irrMm: monthlyIrrByCalMonth[idx],
    };
  });

  const maxMm = Math.max(120, ...months.flatMap((m) => [m.precipMm, m.et0Mm, m.etcMm, m.irrMm])) * 1.15;

  const W = 540;
  const H = 195;
  const padL = 38;
  const padR = 16;
  const padT = 20;
  const padB = 30;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xSlot = (i: number) => padL + (plotW / 12) * (i + 0.5);
  const yForMm = (v: number) => padT + plotH - Math.max(0, Math.min(1, v / maxMm)) * plotH;

  const et0Pts = months.map((m, i) => `${xSlot(i).toFixed(1)},${yForMm(m.et0Mm).toFixed(1)}`).join(" ");
  const etcPts = months.map((m, i) => `${xSlot(i).toFixed(1)},${yForMm(m.etcMm).toFixed(1)}`).join(" ");

  return (
    <div className="rounded-xl border border-line bg-bg/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[13.5px] font-semibold text-ink">
            {lang === "tr"
              ? "Aylık Su Dengesi: Yağış, Bitki Su İhtiyacı (ETc) ve Sulama Takvimi"
              : "Monthly Water Balance: Rainfall, Crop Demand (ETc) & Irrigation Schedule"}
          </p>
          <p className="text-[11.5px] text-ink-2">
            {lang === "tr"
              ? `NASA POWER (${climateSum.period.start.slice(0, 4)}–${climateSum.period.end.slice(0, 4)}) aylık ortalamaları ve FAO-56 Penman-Monteith hesabı`
              : `NASA POWER (${climateSum.period.start.slice(0, 4)}–${climateSum.period.end.slice(0, 4)}) monthly means & FAO-56 Penman-Monteith`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-3 rounded-sm bg-[#0284c7]" />
            <span>{lang === "tr" ? "Yağış (mm)" : "Rain (mm)"}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-3 rounded-sm bg-[#f59e0b]" />
            <span>{lang === "tr" ? "Net Sulama (mm)" : "Net Irrigation (mm)"}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3.5 bg-[#dc2626]" />
            <span>{lang === "tr" ? "Referans ET₀ (mm)" : "Ref ET₀ (mm)"}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-0.5 w-3.5 bg-[#1e6b34]" />
            <span>{lang === "tr" ? "Bitki ETc (mm)" : "Crop ETc (mm)"}</span>
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="mt-2 w-full overflow-visible"
        role="img"
        aria-label={lang === "tr" ? "12 Aylık Su Dengesi Grafiği" : "12-Month Water Balance Chart"}
      >
        {[0, 0.33, 0.66, 1].map((f, i) => {
          const y = padT + plotH * (1 - f);
          const val = maxMm * f;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="var(--grid)" strokeWidth="1" strokeDasharray={f === 0 ? undefined : "3 3"} />
              <text x={padL - 5} y={y + 3.5} textAnchor="end" fontSize="9.5" fill="var(--ink-2)" fontFamily="var(--font-mono)">
                {n(val, 0)}
              </text>
            </g>
          );
        })}

        {months.map((m, i) => {
          const cx = xSlot(i);
          const bw = 13;
          const rainH = Math.max(1, padT + plotH - yForMm(m.precipMm));
          const irrH = Math.max(0, padT + plotH - yForMm(m.irrMm));
          return (
            <g key={m.idx}>
              {/* Precipitation bar */}
              <rect
                x={cx - bw - 1}
                y={padT + plotH - rainH}
                width={bw}
                height={rainH}
                rx="2.5"
                fill="#0284c7"
              />
              {/* Irrigation bar */}
              {irrH > 0.5 && (
                <rect
                  x={cx + 1}
                  y={padT + plotH - irrH}
                  width={bw}
                  height={irrH}
                  rx="2.5"
                  fill="#f59e0b"
                />
              )}
              <text
                x={cx}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--ink-2)"
              >
                {m.label}
              </text>
            </g>
          );
        })}

        {/* ET0 curve */}
        <polyline
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="4 3"
          points={et0Pts}
        />
        {/* Crop ETc curve */}
        <polyline
          fill="none"
          stroke="#1e6b34"
          strokeWidth="2.4"
          points={etcPts}
        />
        {months.map((m, i) => (
          <circle
            key={`etc-${i}`}
            cx={xSlot(i)}
            cy={yForMm(m.etcMm)}
            r="3"
            fill="#ffffff"
            stroke="#1e6b34"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

/**
 * 22-Window Historical Performance Strip (2001–2024 3-Yıllık Dönemler).
 */
export function HistoricalWindowStrip({
  best,
  lang,
  n,
}: {
  best: PlanResult;
  lang: "tr" | "en";
  n: (v: number, d?: number) => string;
}) {
  const windows = best.windows ?? [];
  if (!windows.length) return null;

  const maxM = Math.max(1000, ...windows.map((w) => Math.abs(w.marginTLPerDaPerYr)));

  return (
    <div className="mt-4 rounded-xl border border-line bg-bg/60 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[12.5px] font-semibold text-ink">
            {lang === "tr"
              ? `24 Yıllık Gerçek İklim Testi (${windows.length} Ayrı 3-Yıllık Dönem Performansı)`
              : `24-Year Historical Climate Replay (${windows.length} Rolling 3-Year Windows)`}
          </p>
          <p className="text-[11px] text-ink-2">
            {best.trade
              ? lang === "tr"
                ? `Önerilen plan ${best.trade.windows} tarihsel dönemin ${best.trade.okWindowsPlan} tanesinde su bütçesi içinde tam verim sağladı (Mevcut plan: ${best.trade.okWindowsCurrent}/${best.trade.windows}).`
                : `Recommended plan succeeded within water budget in ${best.trade.okWindowsPlan} of ${best.trade.windows} historical windows (Current: ${best.trade.okWindowsCurrent}/${best.trade.windows}).`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-11 gap-1 sm:grid-cols-22">
        {windows.map((w) => {
          const ratio = w.yieldRatio ?? 0.75;
          const hPct = Math.max(18, Math.min(100, Math.round((Math.max(0, w.marginTLPerDaPerYr) / maxM) * 100)));
          const color = w.budgetExceeded
            ? "#d97706"
            : ratio >= 0.8
              ? "#1e6b34"
              : "#4a7c59";
          return (
            <div
              key={w.startYear}
              className="flex flex-col items-center justify-end rounded bg-surface p-1"
              title={`${w.startYear}–${w.startYear + 2}: Ya/Ym %${Math.round(ratio * 100)} · ${n(w.marginTLPerDaPerYr, 0)} TL/da/yıl`}
            >
              <div className="flex h-10 w-full items-end rounded-sm bg-surface-2 p-0.5">
                <div
                  className="w-full rounded-sm transition-all"
                  style={{ height: `${hPct}%`, backgroundColor: color }}
                />
              </div>
              <span className="mt-1 font-mono text-[9px] text-ink-2">
                {String(w.startYear).slice(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
