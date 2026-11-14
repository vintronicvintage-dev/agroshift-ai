"use client";

import React, { useState, useMemo } from "react";
import type { CropId } from "@/lib/types";
import { CROPS } from "@/lib/crops/database";
import {
  CROP_REQUIREMENTS,
  evaluateAllCropsForParcel,
  type ParcelBiophysicalInput,
  type LearnedCropSuitabilityItem,
} from "@/lib/crops/cropRequirements";
import { CropArt } from "@/components/brand/CropArt";
import { TermTooltip } from "@/components/ui/TermTooltip";
import { Icon } from "@/components/ui/Icons";

export interface CropRequirementsMatrixProps {
  parcelInput: ParcelBiophysicalInput;
  provinceName: string;
  currentRotation: [CropId, CropId, CropId];
  onAssignCropToYear?: (yearIndex: 0 | 1 | 2, cropId: CropId) => void;
}

type CategoryFilter =
  | "all"
  | "cereal"
  | "legume_forage"
  | "oilseed"
  | "industrial_tuber";

const CATEGORY_FILTER_LABELS: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "Tüm Mahsuller (17)" },
  { id: "cereal", label: "Tahıllar (3)" },
  { id: "legume_forage", label: "Baklagil & Yem (7)" },
  { id: "oilseed", label: "Yağlı Tohumlar (4)" },
  { id: "industrial_tuber", label: "Endüstriyel & Yumru (3)" },
];

function matchesCategory(cropId: CropId, filter: CategoryFilter): boolean {
  if (filter === "all") return true;
  if (cropId === "fallow") return false;
  const c = CROPS[cropId];
  if (filter === "cereal") return c.family === "poaceae";
  if (filter === "legume_forage") return c.family === "fabaceae";
  if (filter === "oilseed") {
    return (
      cropId === "sunflower" ||
      cropId === "soybean" ||
      cropId === "canola" ||
      cropId === "safflower"
    );
  }
  if (filter === "industrial_tuber") {
    return (
      cropId === "sugar_beet" || cropId === "cotton" || cropId === "potato"
    );
  }
  return true;
}

const STATUS_BADGE: Record<
  LearnedCropSuitabilityItem["status"],
  { bg: string; border: string; text: string; bar: string }
> = {
  Ideal_Uygun: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-800",
    bar: "bg-[#196a3b]",
  },
  Kosullu_Uygun: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    text: "text-teal-800",
    bar: "bg-teal-600",
  },
  Sinirli_Riskli: {
    bg: "bg-amber-50",
    border: "border-amber-300",
    text: "text-amber-800",
    bar: "bg-amber-500",
  },
  Uygun_Degil: {
    bg: "bg-rose-50",
    border: "border-rose-300",
    text: "text-rose-800",
    bar: "bg-rose-500",
  },
};

const NEWLY_ADDED_CROPS: CropId[] = [
  "lentil_green",
  "soybean",
  "canola",
  "safflower",
  "potato",
  "sainfoin",
];

export function CropRequirementsMatrix({
  parcelInput,
  provinceName,
  currentRotation,
  onAssignCropToYear,
}: CropRequirementsMatrixProps) {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selectedCropId, setSelectedCropId] = useState<CropId>("lentil_green");
  const [showAllCrops, setShowAllCrops] = useState<boolean>(false);

  const evaluations = useMemo(
    () => evaluateAllCropsForParcel(parcelInput),
    [parcelInput],
  );

  const filteredEvaluations = useMemo(
    () =>
      evaluations.filter((ev) => matchesCategory(ev.cropId, categoryFilter)),
    [evaluations, categoryFilter],
  );

  const visibleEvaluations = showAllCrops
    ? filteredEvaluations
    : filteredEvaluations.slice(0, 9);

  const activeEval = useMemo(
    () =>
      evaluations.find((e) => e.cropId === selectedCropId) ??
      filteredEvaluations[0] ??
      evaluations[0],
    [evaluations, filteredEvaluations, selectedCropId],
  );

  const activeReq = CROP_REQUIREMENTS[activeEval.cropId];
  const activeCrop = CROPS[activeEval.cropId];
  const activeKy = activeCrop.agronomy?.ky.value ?? 1.0;
  const activeRootM = activeCrop.agronomy?.rootDepthMaxM.value ?? 1.0;

  return (
    <section
      id="section-crop-requirements"
      data-testid="crop-requirements-matrix"
      className="bento-card p-5"
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 mb-4 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef6f0] border border-[#c6dccb] text-[#196a3b] text-[11px] font-extrabold uppercase tracking-wider mb-1.5">
            <Icon name="sprout" size={14} />
            <span>
              6-Boyutlu Ekofizyolojik Öğrenme Modeli · 18 Stratejik Havza Mahsulü
            </span>
          </div>
          <h2 className="font-display text-[19px] sm:text-[21px] font-semibold text-ink tracking-tight flex flex-wrap items-center gap-1.5">
            <span>
              Mahsul Yetişme Gereksinimleri ve Parsel Uyum Matrisi ({provinceName})
            </span>
            <TermTooltip termId="munavebe" size="md" />
          </h2>
          <p className="text-[12.5px] text-ink-2 mt-1 max-w-4xl leading-relaxed">
            Arka plandaki biyofiziksel karar motoru;{" "}
            <strong className="text-[#196a3b]">
              Yeşil Mercimek, Soya Fasulyesi, Kanola (Kolza), Aspir, Patates ve
              Korunga
            </strong>{" "}
            dahil tüm mahsullerin yetişmesi için gereken{" "}
            <span className="font-semibold text-ink">
              ısı toplamı (GDD), vernalizasyon, su eşiği (ETc), toprak bünyesi,
              pH/tuzluluk (ECe) ve rakım/eğim
            </span>{" "}
            sınırlarını arazinizin canlı verileriyle eşleştirir.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_FILTER_LABELS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-2.5 py-1.5 rounded-xl text-[11.5px] font-bold transition-colors cursor-pointer border ${
                categoryFilter === tab.id
                  ? "bg-[#196a3b] text-white border-[#196a3b]"
                  : "bg-[#f4f8f4] text-[#3c5042] border-[#d6e2d7] hover:bg-[#e7f0e9]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Grid: Left = Ranked Crop Cards, Right = Deep Ecophysiological Profile of Selected Crop */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left 7 Cols: Ranked Crop Suitability Cards */}
        <div className="xl:col-span-7 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 text-[12px] text-ink-2">
            <span className="font-bold flex items-center gap-1 text-ink">
              Parsel Biyofiziksel Uyum Sıralaması (Canlı Hesaplama)
              <TermTooltip termId="topsis_pareto" />
            </span>
            <span>
              Detaylı yetişme gereksinimlerini incelemek için bir mahsule tıklayın
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {visibleEvaluations.map((ev, idx) => {
              const req = ev.requirements;
              const style = STATUS_BADGE[ev.status];
              const isSelected = ev.cropId === activeEval.cropId;
              const isNewlyAdded = NEWLY_ADDED_CROPS.includes(ev.cropId);

              return (
                <div
                  key={ev.cropId}
                  role="button"
                  tabIndex={0}
                  data-testid={`crop-req-card-${ev.cropId}`}
                  onClick={() => setSelectedCropId(ev.cropId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedCropId(ev.cropId);
                    }
                  }}
                  className={`rounded-xl p-3 border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? "bg-[#f1f8f3] border-[#196a3b] ring-2 ring-[#196a3b]/20 shadow-sm"
                      : "bg-[#fafcfa] border-[#dce6dd] hover:border-[#9bc2a6] hover:bg-white"
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white border border-[#dce6dd] flex items-center justify-center shrink-0">
                          <CropArt crop={ev.cropId} size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[12.5px] font-extrabold text-[#16291d] truncate">
                            #{idx + 1} {ev.nameTr}
                          </div>
                          <div className="text-[10px] text-[#647768] italic truncate">
                            {ev.scientificName}
                          </div>
                        </div>
                      </div>
                      {isNewlyAdded && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-700 text-white text-[9px] font-extrabold uppercase shrink-0">
                          Yeni
                        </span>
                      )}
                    </div>

                    {/* Score & Verdict */}
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span
                        className={`px-1.5 py-0.5 rounded-md font-bold text-[10px] border ${style.bg} ${style.border} ${style.text}`}
                      >
                        {ev.statusLabel.tr}
                      </span>
                      <span className="font-extrabold text-[#16291d] tabular-nums">
                        %{ev.overallSuitabilityPct} Uyum
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#e2ebe3] overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${ev.overallSuitabilityPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Quick Requirement Chips */}
                  <div className="grid grid-cols-3 gap-1 pt-1.5 border-t border-[#e5eee6] text-[9.5px] text-[#455849]">
                    <div className="bg-white rounded px-1.5 py-1 border border-[#e3ece4]">
                      <div className="text-[#728576] font-semibold">Su Eşiği</div>
                      <div className="font-bold text-[#16291d] tabular-nums">
                        ≥{req.water.minDrylandPrecipMm}mm
                      </div>
                    </div>
                    <div className="bg-white rounded px-1.5 py-1 border border-[#e3ece4]">
                      <div className="text-[#728576] font-semibold">Opt. pH</div>
                      <div className="font-bold text-[#16291d] tabular-nums">
                        {req.soil.optimalPh[0]}-{req.soil.optimalPh[1]}
                      </div>
                    </div>
                    <div className="bg-white rounded px-1.5 py-1 border border-[#e3ece4]">
                      <div className="text-[#728576] font-semibold">Isı (GDD)</div>
                      <div className="font-bold text-[#16291d] tabular-nums">
                        {req.thermal.gddRequired}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredEvaluations.length > 9 && (
            <button
              type="button"
              onClick={() => setShowAllCrops((v) => !v)}
              data-testid="toggle-all-18-crops-btn"
              className="w-full py-2.5 rounded-xl bg-[#f1f6f2] hover:bg-[#e3ede5] text-[#196a3b] font-bold text-[12.5px] border border-[#c8dcd0] transition-colors cursor-pointer"
            >
              {showAllCrops
                ? "Görünümü Daralt (İlk 9 Mahsulü Göster)"
                : `Tüm ${filteredEvaluations.length} Mahsulün Yetişme Gereksinimlerini Göster (+${
                    filteredEvaluations.length - 9
                  } Mahsul Daha)`}
            </button>
          )}
        </div>

        {/* Right 5 Cols: Deep Learned Ecophysiological Requirements Inspector for Selected Crop */}
        <div
          data-testid="selected-crop-requirements-inspector"
          className="xl:col-span-5 rounded-2xl bg-[#f7faf7] border border-[#cadaca] p-4 shadow-2xs"
        >
          {/* Selected Crop Header */}
          <div className="flex flex-wrap items-start justify-between gap-3 pb-3 mb-3 border-b border-[#dde8de]">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-[#cddccf] flex items-center justify-center shadow-2xs shrink-0">
                <CropArt crop={activeEval.cropId} size={36} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[16.5px] font-extrabold text-[#16291d]">
                    {activeEval.nameTr}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10.5px] font-extrabold border ${
                      STATUS_BADGE[activeEval.status].bg
                    } ${STATUS_BADGE[activeEval.status].border} ${
                      STATUS_BADGE[activeEval.status].text
                    }`}
                  >
                    %{activeEval.overallSuitabilityPct} · {activeEval.statusLabel.tr}
                  </span>
                </div>
                <div className="text-[11px] text-[#55685a] font-medium">
                  <em>{activeReq.scientificName}</em> ·{" "}
                  {activeReq.basinSupportCategory.tr}
                </div>
              </div>
            </div>

            {/* 1-Click Assign to 3-Year Rotation Buttons */}
            {onAssignCropToYear && (
              <div className="flex items-center gap-1">
                {([0, 1, 2] as const).map((yrIdx) => {
                  const isAssigned =
                    currentRotation[yrIdx] === activeEval.cropId;
                  return (
                    <button
                      key={yrIdx}
                      type="button"
                      onClick={() =>
                        onAssignCropToYear(yrIdx, activeEval.cropId)
                      }
                      className={`px-2 py-1 rounded-lg text-[10.5px] font-bold border transition-colors cursor-pointer ${
                        isAssigned
                          ? "bg-[#196a3b] text-white border-[#196a3b]"
                          : "bg-white hover:bg-[#e8f2ea] text-[#196a3b] border-[#bfd5c4]"
                      }`}
                      title={`${activeEval.nameTr} ürününü ${yrIdx + 1}. Yıl rotasyonuna ata`}
                    >
                      {yrIdx + 1}. Yıl{isAssigned ? " ✓" : "a Ata"}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Agronomic Summary */}
          <p className="text-[11.5px] text-[#2c4032] leading-relaxed bg-white border border-[#dce6dd] rounded-xl p-2.5 mb-3">
            {activeReq.nutrientsAndRotation.growthSummary.tr}
          </p>

          {/* 6-Dimensional Biophysical Sub-Scores */}
          <div className="mb-3">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#46594b] mb-2 flex items-center justify-between">
              <span>6-Boyutlu Biyofiziksel Uyum Kırılımı</span>
              <span className="text-[10px] font-normal text-[#647768]">
                Parsel Ölçümü vs. Mahsul Eşiği
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                {
                  label: "İklim & GDD",
                  termId: "gdd",
                  score: activeEval.dimensions.thermal,
                },
                {
                  label: "Su & Kuraklık",
                  termId: "etc",
                  score: activeEval.dimensions.water,
                },
                {
                  label: "Toprak Bünyesi",
                  termId: "soil_texture",
                  score: activeEval.dimensions.soilPhysical,
                },
                {
                  label: "pH & Tuzluluk",
                  termId: "salinity_ece",
                  score: activeEval.dimensions.soilChemical,
                },
                {
                  label: "Rakım & Eğim",
                  termId: "srtm",
                  score: activeEval.dimensions.topography,
                },
                {
                  label: "Münavebe",
                  termId: "munavebe",
                  score: activeEval.dimensions.rotationFit,
                },
              ].map((dim) => (
                <div
                  key={dim.label}
                  className="bg-white border border-[#dce6dd] rounded-xl p-2"
                >
                  <div className="flex items-center justify-between gap-1 text-[10.5px] font-bold text-[#3d5042] mb-1">
                    <span className="truncate">{dim.label}</span>
                    <TermTooltip termId={dim.termId} />
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-extrabold text-[#16291d] mb-1">
                    <span>%{dim.score}</span>
                    <span
                      className={`text-[9.5px] font-bold ${
                        dim.score >= 80
                          ? "text-emerald-700"
                          : dim.score >= 60
                            ? "text-amber-700"
                            : "text-rose-700"
                      }`}
                    >
                      {dim.score >= 80
                        ? "Uygun"
                        : dim.score >= 60
                          ? "Sınırda"
                          : "Kısıtlı"}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[#e6eee7] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        dim.score >= 80
                          ? "bg-[#196a3b]"
                          : dim.score >= 60
                            ? "bg-amber-500"
                            : "bg-rose-500"
                      }`}
                      style={{ width: `${dim.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Growth Requirement Parameters Table */}
          <div className="bg-white border border-[#dce6dd] rounded-xl p-3 mb-3 space-y-2 text-[11px]">
            <div className="text-[11px] font-extrabold text-[#16291d] border-b border-[#ebf1ec] pb-1.5 flex items-center justify-between">
              <span>Yetişmesi İçin Gereken Biyofiziksel Özellikler</span>
              <span className="text-[10px] font-semibold text-[#196a3b]">
                FAO-56 &amp; TAGEM Referanslı
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  <Icon name="thermo" size={13} className="text-amber-600" />
                  Optimum Sıcaklık:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  {activeReq.thermal.optimalTempRangeC[0]}°C –{" "}
                  {activeReq.thermal.optimalTempRangeC[1]}°C (Tb:{" "}
                  {activeReq.thermal.gddBaseC}°C)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  Isı Toplamı (GDD) <TermTooltip termId="gdd" />:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  {activeReq.thermal.gddRequired} °C·gün (Don:{" "}
                  {activeReq.thermal.frostKillC}°C)
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  <Icon name="drop" size={13} className="text-sky-600" />
                  Mevsimlik Su (ETc) <TermTooltip termId="etc" />:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  {activeReq.water.seasonalEtcRangeMm[0]}–
                  {activeReq.water.seasonalEtcRangeMm[1]} mm
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  Kuru Tarım Eşiği / Ky <TermTooltip termId="ky" />:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  ≥{activeReq.water.minDrylandPrecipMm} mm · Ky=
                  {activeKy.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  <Icon name="layers" size={13} className="text-amber-700" />
                  Toprak Bünyesi <TermTooltip termId="soil_texture" />:
                </span>
                <span className="font-bold text-[#16291d] text-right truncate max-w-[165px]">
                  {activeReq.soil.preferredTextures.tr.split("(")[0]}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  Kil Aralığı &amp; Kök Derinliği:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  %{activeReq.soil.clayRangePct.optMin}–
                  {activeReq.soil.clayRangePct.optMax} kil ·{" "}
                  {activeRootM.toFixed(1)} m kök
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  <Icon name="shield" size={13} className="text-emerald-700" />
                  Optimum pH &amp; Tuzluluk <TermTooltip termId="salinity_ece" />:
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  pH {activeReq.soil.optimalPh[0]}–{activeReq.soil.optimalPh[1]} ·
                  ECe ≤{activeReq.soil.salinityThresholdDsm} dS/m
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-[#f1f5f1] pb-1">
                <span className="text-[#586b5c] flex items-center gap-1">
                  Saf Besin Talebi (N-P-K):
                </span>
                <span className="font-bold text-[#16291d] tabular-nums">
                  N:{activeReq.nutrientsAndRotation.npkDemandKgDa.N} · P₂O₅:
                  {activeReq.nutrientsAndRotation.npkDemandKgDa.P2O5} · K₂O:
                  {activeReq.nutrientsAndRotation.npkDemandKgDa.K2O} kg/da
                </span>
              </div>
            </div>
          </div>

          {/* Parcel-Specific Strengths & Limiting Factors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200 p-2.5">
              <div className="font-extrabold text-emerald-900 mb-1 flex items-center gap-1">
                <Icon name="check" size={14} className="text-emerald-700" />
                <span>Parsel Uyum Avantajları</span>
              </div>
              <ul className="space-y-1 text-emerald-950/90">
                {activeEval.matchedStrengths.slice(0, 3).map((s, i) => (
                  <li key={i} className="leading-snug flex items-start gap-1">
                    <span className="text-emerald-700 font-bold">•</span>
                    <span>{s.tr}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-2.5">
              <div className="font-extrabold text-amber-900 mb-1 flex items-center gap-1">
                <Icon name="alert" size={14} className="text-amber-700" />
                <span>Parsel Kısıtları &amp; Kritik Dönem</span>
              </div>
              {activeEval.limitingFactors.length > 0 ? (
                <ul className="space-y-1 text-amber-950/90">
                  {activeEval.limitingFactors.slice(0, 2).map((lf, i) => (
                    <li key={i} className="leading-snug flex items-start gap-1">
                      <span className="text-amber-700 font-bold">•</span>
                      <span>{lf.tr}</span>
                    </li>
                  ))}
                  <li className="leading-snug text-[10.5px] text-amber-900/80 pt-0.5">
                    <strong>Hassas Evre:</strong>{" "}
                    {activeReq.water.criticalStage.tr}
                  </li>
                </ul>
              ) : (
                <div className="text-amber-950/90 leading-snug space-y-1">
                  <p>
                    Bu parselde biyofiziksel eşikleri aşan kritik bir kısıt
                    tespit edilmedi.
                  </p>
                  <p className="text-[10.5px] text-amber-900/80">
                    <strong>Hassas Evre:</strong>{" "}
                    {activeReq.water.criticalStage.tr}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Regions & Optimal Basins Footer */}
          <div className="mt-2.5 pt-2 border-t border-[#dde8de] flex flex-wrap items-center justify-between gap-2 text-[10.5px] text-[#55685a]">
            <span className="inline-flex items-center gap-1 font-semibold">
              <Icon name="sprout" size={13} className="text-[#196a3b]" />
              Havza Kategorisi:{" "}
              <strong className="text-[#16291d]">
                {activeReq.basinSupportCategory.tr}
              </strong>
            </span>
            <span className="inline-flex items-center gap-1">
              Münavebe Ara Süresi:{" "}
              <strong className="text-[#16291d]">
                {activeReq.nutrientsAndRotation.minBreakYears === 0
                  ? "Her yıl ekilebilir"
                  : `En az ${activeReq.nutrientsAndRotation.minBreakYears} yıl ara`}
              </strong>
              <TermTooltip termId="break_years" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
