"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CROP_IDS, CROPS } from "@/lib/engine";
import type { AnalysisResult, CropId, RotationSequence, YearResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { PILOTS } from "@/lib/data/pilots";
import {
  DEFAULT_SCENARIO,
  METHOD_EFF,
  pilotField,
  setField,
  setInputs,
  setStore,
  TON_PER_IRRIGATION,
  useStore,
  type IrrigationMethod,
  type ScenarioPreset,
} from "@/lib/ui/fieldStore";
import { CropArt } from "@/components/brand/CropArt";
import { Icon } from "@/components/ui/Icons";
import { TermTooltip } from "@/components/ui/TermTooltip";

export interface FieldShiftComparisonProps {
  result: AnalysisResult | null;
  running: boolean;
  effectiveAreaDa: number;
  soilTextureLabel: string;
  provinceName: string;
  /** Optional callbacks when embedded in the main workspace (`/`) */
  onDrawPolygon?: () => void;
  onOpenCoords?: () => void;
  onJumpToMap?: () => void;
  onJumpToProfitability?: () => void;
  onJumpToFormulas?: () => void;
}

interface YearExceedanceDetail {
  year: number;
  cropId: CropId;
  cropName: string;
  irrigatedMm: number;
  unmetDeficitP50Mm: number;
  unmetDeficitP90Mm: number;
  exceededShare: number;
  exceededWindows: number;
  totalWindows: number;
  exceeded: boolean;
  statusBadge: string;
  reasonText: string;
}

/**
 * Deterministically evaluates whether a specific rotation year (1, 2, or 3) exceeds the farmer's
 * annual irrigation water budget and explains the agronomic/hydrological reason in plain text.
 */
export function evaluateYearBudgetStatus(
  yr: YearResult,
  budgetNetMm: number,
  totalWindows: number,
  lang: "tr" | "en",
): YearExceedanceDetail {
  const def = CROPS[yr.cropId];
  const cropName = lang === "tr" ? def.name.tr : def.name.en;
  const irrigatedMm = Math.round(yr.irrigationNetMm?.p50 ?? 0);
  const unmetDeficitP50Mm = Math.round(yr.unmetDeficitMm?.p50 ?? 0);
  const unmetDeficitP90Mm = Math.round(yr.unmetDeficitMm?.p90 ?? 0);
  const exceededShare = yr.budgetExceededShare ?? 0;
  const exceededWindows = Math.round(exceededShare * totalWindows);
  const kcMid = def.agronomy?.kc.value.mid ?? 0;
  const ky = def.agronomy?.ky.value ?? 0;
  const yaYmPct = Math.round((yr.yieldRatio?.p50 ?? 1) * 100);

  if (yr.cropId === "fallow") {
    return {
      year: yr.year,
      cropId: yr.cropId,
      cropName,
      irrigatedMm: 0,
      unmetDeficitP50Mm: 0,
      unmetDeficitP90Mm: 0,
      exceededShare: 0,
      exceededWindows: 0,
      totalWindows,
      exceeded: false,
      statusBadge: lang === "tr" ? "UYGUN · 0 mm (Nadas)" : "OK · 0 mm (Fallow)",
      reasonText:
        lang === "tr"
          ? `${yr.year}. Yıl (${cropName}): Sulama yapılmaz (0 mm); kış ve ilkbahar yağışları sonraki ürün için kök bölgesinde biriktirilir.`
          : `Year ${yr.year} (${cropName}): No irrigation applied (0 mm); winter and spring rainfall is stored in the root zone for the next crop.`,
    };
  }

  // Determine exceedance under irrigated vs. rainfed (0 mm budget) conditions
  const isRainfed = budgetNetMm <= 0;
  const exceeded = isRainfed
    ? unmetDeficitP50Mm >= 20 || (unmetDeficitP90Mm >= 40 && yaYmPct < 85)
    : exceededShare > 0.04 || unmetDeficitP50Mm >= 10 || (irrigatedMm >= budgetNetMm - 2 && unmetDeficitP90Mm >= 18);

  if (exceeded) {
    const statusBadge = isRainfed
      ? lang === "tr"
        ? `AŞIM · +${ Math.max(unmetDeficitP50Mm, unmetDeficitP90Mm) } mm su açığı`
        : `DEFICIT · +${ Math.max(unmetDeficitP50Mm, unmetDeficitP90Mm) } mm deficit`
      : lang === "tr"
        ? `AŞIM · Bütçe yetmedi (+${Math.max(unmetDeficitP50Mm, unmetDeficitP90Mm)} mm açık)`
        : `EXCEEDED · Over budget (+${Math.max(unmetDeficitP50Mm, unmetDeficitP90Mm)} mm deficit)`;

    const reasonText = isRainfed
      ? lang === "tr"
        ? `${yr.year}. Yıl (${cropName}): Yıllık sulama bütçesi 0 mm (kuru tarım) olduğundan, bitkinin tepe su tüketimi (Kc=${kcMid.toFixed(2)}, Ky=${ky.toFixed(2)}) doğal yağış ve kök nemini aştı; medyan +${unmetDeficitP50Mm} mm (kurak yıllarda +${unmetDeficitP90Mm} mm) karşılanamayan su açığı oluştu (Ya/Ym=%${yaYmPct}).`
        : `Year ${yr.year} (${cropName}): With a 0 mm (rainfed) budget, crop water demand (Kc=${kcMid.toFixed(2)}, Ky=${ky.toFixed(2)}) exceeded rainfall and root storage, leaving a median +${unmetDeficitP50Mm} mm (+${unmetDeficitP90Mm} mm in dry years) unmet deficit (Ya/Ym=${yaYmPct}%).`
      : lang === "tr"
        ? `${yr.year}. Yıl (${cropName}): Yıllık ${Math.round(budgetNetMm)} mm net sulama bütçesi tamamen tükendi (${irrigatedMm} mm uygulandı). Ürün su talebi (Kc=${kcMid.toFixed(2)}, Ky=${ky.toFixed(2)}) bütçeyi aştığı için ${totalWindows} tarihsel dönemin ${Math.max(1, exceededWindows)}'inde su yetmedi ve medyan +${unmetDeficitP50Mm} mm (kurak yıllarda +${unmetDeficitP90Mm} mm) su açığı kaldı.`
        : `Year ${yr.year} (${cropName}): The ${Math.round(budgetNetMm)} mm annual net budget was exhausted (${irrigatedMm} mm applied). Crop ETc demand (Kc=${kcMid.toFixed(2)}, Ky=${ky.toFixed(2)}) exceeded the budget in ${Math.max(1, exceededWindows)} of ${totalWindows} windows, leaving a +${unmetDeficitP50Mm} mm median (+${unmetDeficitP90Mm} mm dry-year) deficit.`;

    return {
      year: yr.year,
      cropId: yr.cropId,
      cropName,
      irrigatedMm,
      unmetDeficitP50Mm,
      unmetDeficitP90Mm,
      exceededShare,
      exceededWindows: Math.max(1, exceededWindows),
      totalWindows,
      exceeded: true,
      statusBadge,
      reasonText,
    };
  }

  return {
    year: yr.year,
    cropId: yr.cropId,
    cropName,
    irrigatedMm,
    unmetDeficitP50Mm,
    unmetDeficitP90Mm,
    exceededShare,
    exceededWindows,
    totalWindows,
    exceeded: false,
    statusBadge:
      lang === "tr"
        ? `UYGUN · ${irrigatedMm} mm (Bütçe içinde)`
        : `OK · ${irrigatedMm} mm (Within budget)`,
    reasonText:
      lang === "tr"
        ? `${yr.year}. Yıl (${cropName}): Yıllık ${irrigatedMm} mm net sulama ile su talebi (Kc=${kcMid.toFixed(2)}) ${Math.round(budgetNetMm)} mm bütçeyi aşmadan karşılandı.`
        : `Year ${yr.year} (${cropName}): Net irrigation of ${irrigatedMm} mm met crop demand (Kc=${kcMid.toFixed(2)}) within the ${Math.round(budgetNetMm)} mm budget.`,
  };
}

export function FieldShiftComparison({
  result,
  running,
  effectiveAreaDa,
  soilTextureLabel,
  provinceName,
  onDrawPolygon,
  onOpenCoords,
  onJumpToMap,
  onJumpToProfitability,
  onJumpToFormulas,
}: FieldShiftComparisonProps) {
  const { lang, n, L } = useI18n();
  const store = useStore();
  const [expandedWhy, setExpandedWhy] = useState<Record<string, boolean>>({
    alt_0: true,
  });
  const [recentChangePulse, setRecentChangePulse] = useState(false);

  const budgetNetMm = store.inputs.rainfed ? 0 : store.inputs.budget;
  const scenarioPreset = store.scenario.preset;

  // Trigger a brief computing/updating pulse whenever the user changes budget, scenario, or current rotation
  const settingsSignature = `${store.field?.id ?? "none"}|${budgetNetMm}|${store.inputs.method}|${scenarioPreset}|${store.scenario.rainMultiplier}|${store.scenario.tempDeltaC}|${store.inputs.rotation.join(",")}`;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRecentChangePulse(true);
    const timer = setTimeout(() => setRecentChangePulse(false), 320);
    return () => clearTimeout(timer);
  }, [settingsSignature]);

  const isBusy = running || recentChangePulse;

  // Action: Open Konya-Çumra Example
  const openKonyaCumraExample = (presetRotation?: RotationSequence) => {
    const f = pilotField("konya-cumra", lang);
    if (f) setField(f);
    setInputs({
      rainfed: false,
      budget: 200,
      method: "sprinkler",
      rotation: presetRotation ?? ["wheat_winter", "sugar_beet", "wheat_winter"],
      excluded: [],
    });
    setStore({ scenario: DEFAULT_SCENARIO });
  };

  const assignCurrentCropYear = (cropId: CropId, yrIdx: 0 | 1 | 2) => {
    const next: RotationSequence = [...store.inputs.rotation] as RotationSequence;
    next[yrIdx] = cropId;
    setInputs({ rotation: next });
  };

  // Valid alternatives from engine (up to 2, NEVER fabricated if fewer exist)
  const validAlternatives = result
    ? result.alternatives.filter((a) => a && a.crops && a.crops.length === 3).slice(0, 2)
    : [];

  const comparedPlans = result
    ? [
        { role: "current" as const, plan: result.current, badgeTr: "Mevcut Ekim Nöbetin", badgeEn: "Your Current Rotation" },
        ...validAlternatives.map((alt, idx) => ({
          role: `alt_${idx}` as const,
          plan: alt,
          badgeTr: `Alternatif ${idx + 1}${idx === 0 ? " (Önerilen)" : ""}`,
          badgeEn: `Alternative ${idx + 1}${idx === 0 ? " (Recommended)" : ""}`,
        })),
      ]
    : [];

  const totalWindows = result?.windows.count ?? 22;

  // Evaluate per-year budget exceedance for each compared plan
  const planDiagnostics = comparedPlans.map((entry) => {
    const years = entry.plan.years.map((yr) =>
      evaluateYearBudgetStatus(yr, budgetNetMm, totalWindows, lang),
    );
    const exceedingYears = years.filter((y) => y.exceeded);
    const maxYearDeficitP50 = Math.max(0, ...years.map((y) => y.unmetDeficitP50Mm));
    const maxYearDeficitP90 = Math.max(0, ...years.map((y) => y.unmetDeficitP90Mm));
    const annualUnmetP50 = Math.round(entry.plan.water.unmetDeficitMmPerYr?.p50 ?? 0);
    const annualUnmetP90 = Math.round(entry.plan.water.unmetDeficitMmPerYr?.p90 ?? 0);
    const remainingDeficitMm = Math.max(annualUnmetP50, maxYearDeficitP50);
    const remainingDeficitDryMm = Math.max(annualUnmetP90, maxYearDeficitP90);
    const okWindows =
      entry.role === "current"
        ? (result?.alternatives[0]?.trade?.okWindowsCurrent ??
          Math.round((1 - (entry.plan.water.budgetExceededShare ?? 0)) * totalWindows))
        : (entry.plan.trade?.okWindowsPlan ??
          Math.round((1 - (entry.plan.water.budgetExceededShare ?? 0)) * totalWindows));

    return {
      ...entry,
      years,
      exceedingYears,
      hasExceedance: exceedingYears.length > 0 || remainingDeficitMm >= 10,
      remainingDeficitMm,
      remainingDeficitDryMm,
      okWindows,
    };
  });

  // Check if NO plan fits within the budget
  const allPlansExceedBudget =
    planDiagnostics.length > 0 && planDiagnostics.every((d) => d.hasExceedance);

  // Active scenario description matching exact code in src/lib/engine/climate.ts
  const scenarioCodeExplanation =
    scenarioPreset === "dry"
      ? lang === "tr"
        ? "Kodda uygulanan yöntem (prepareClimate): 2001–2024 NASA POWER günlük yağış serisinin (PRECTOTCORR) her günü 0,75 ile çarpılır (−%25 yağış); günlük sıcaklık değişmez (ΔT = 0 °C) ve günlük su dengesi 22 tarihsel 3 yıllık dönemde yeniden oynatılır."
        : "Method in code (prepareClimate): Every daily precipitation record (PRECTOTCORR) in the 2001–2024 NASA POWER series is multiplied by 0.75 (−25% rain) with ΔT = 0 °C, and the daily water balance is re-simulated across all 22 3-year windows."
      : scenarioPreset === "hot_dry"
        ? lang === "tr"
          ? "Kodda uygulanan yöntem (prepareClimate): Günlük yağış 0,75 ile çarpılır (−%25 yağış) ve günlük Tmin/Tmax değerlerine +2 °C eklenir; bağıl nem, rüzgâr ve güneş radyasyonu sabit tutularak FAO-56 Penman–Monteith referans buharlaşması (ET₀) her gün için yeniden hesaplanır."
          : "Method in code (prepareClimate): Daily precipitation is multiplied by 0.75 (−25% rain) and +2 °C is added to daily Tmin/Tmax; FAO-56 Penman–Monteith ET₀ is recomputed for every day with relative humidity, wind, and solar radiation held at observed values."
        : scenarioPreset === "custom"
          ? lang === "tr"
            ? `Kodda uygulanan yöntem (prepareClimate): Günlük yağış ×${n(store.scenario.rainMultiplier, 2)} ve sıcaklık +${n(store.scenario.tempDeltaC, 1)} °C kaydırması ile FAO-56 Penman–Monteith ET₀ yeniden hesaplanır.`
            : `Method in code (prepareClimate): Daily precipitation ×${n(store.scenario.rainMultiplier, 2)} and temperature +${n(store.scenario.tempDeltaC, 1)} °C shift with daily FAO-56 Penman–Monteith ET₀ recomputation.`
          : lang === "tr"
            ? "Kodda uygulanan yöntem (prepareClimate): 2001–2024 NASA POWER / MERRA-2 gözlenen günlük yağış (×1,00) ve sıcaklık (ΔT = 0 °C) serisi değiştirilmeden 22 tarihsel 3 yıllık dönemde gün gün oynatılır."
            : "Method in code (prepareClimate): Observed 2001–2024 NASA POWER / MERRA-2 daily precipitation (×1.00) and temperature (ΔT = 0 °C) series replayed day-by-day across 22 historical 3-year windows.";

  const activeScenarioLabel =
    scenarioPreset === "dry"
      ? lang === "tr"
        ? "Kurak Senaryo (Yağış −%25)"
        : "Drought Scenario (Rain −25%)"
      : scenarioPreset === "hot_dry"
        ? lang === "tr"
          ? "Sıcak ve Kurak (+2 °C, Yağış −%25)"
          : "Hot & Dry (+2 °C, Rain −25%)"
        : scenarioPreset === "custom"
          ? lang === "tr"
            ? "Özel İklim Senaryosu"
            : "Custom Climate Scenario"
          : lang === "tr"
            ? "Normal İklim (2001–2024)"
            : "Typical Climate (2001–2024)";

  const isKonyaSelected = store.field?.pilotId === "konya-cumra";

  return (
    <section
      id="field-shift-karsilastirma"
      aria-label={
        lang === "tr"
          ? "Tarla Seç, Su Koşullarını Belirle ve Planları Karşılaştır"
          : "Select Parcel, Set Water Conditions, and Compare Plans"
      }
      className="bento-card overflow-hidden border-2 border-[#1e6b34]/25 bg-surface shadow-sm"
    >
      {/* ── COMPACT TOP BANNER: 3-Step Flow Spine + "Konya–Çumra örneğini aç" + Own Parcel Actions ── */}
      <div className="border-b border-line bg-[#112e18] px-4 py-3.5 text-white sm:px-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-[#86efac]">
              <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-0.5 font-mono text-[11px] text-white">
                NASA Space Apps · Field Shift
              </span>
              <span>
                {lang === "tr"
                  ? "1. Tarla seç → 2. Su koşullarını belirle → 3. Planları karşılaştır"
                  : "1. Select parcel → 2. Set water conditions → 3. Compare plans"}
              </span>
            </div>
            <h1 className="font-display text-[20px] font-semibold leading-snug text-white sm:text-[24px]">
              {lang === "tr"
                ? "Su Kısıtlı Tarlada 3 Yıllık Ekim Nöbeti ve Bütçe Aşımı Karşılaştırması"
                : "3-Year Crop Rotation & Water Budget Exceedance Comparison"}
            </h1>
            <p className="max-w-3xl text-[13px] text-[#d5e8d8]">
              {lang === "tr"
                ? "Mevcut 3 yıllık ekim nöbetinizi iki geçerli alternatifle aynı ölçütlerle karşılaştırın. Su bütçesini düşürün veya kurak senaryoyu seçin; hangi planın hangi yılda bütçeyi aştığını ve nedenini görün."
                : "Compare your current 3-year crop rotation against two valid alternatives using identical criteria. Lower the water budget or select the drought scenario to see which plan exceeds the budget in which year and why."}
            </p>
          </div>

          {/* Primary First-Open CTA: "Konya–Çumra örneğini aç" + Own Field Actions */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              data-testid="open-konya-cumra-btn"
              onClick={() => openKonyaCumraExample(["wheat_winter", "sugar_beet", "wheat_winter"])}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[#86efac]/60 bg-[#22c55e] px-4 py-2 text-[13px] font-bold text-[#071f0d] shadow-sm transition-colors hover:bg-[#4ade80] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Icon name="sprout" size={17} />
              <span>
                {lang === "tr" ? "Konya–Çumra örneğini aç" : "Open Konya–Çumra example"}
              </span>
            </button>

            {onDrawPolygon ? (
              <button
                type="button"
                data-testid="draw-own-parcel-btn"
                onClick={onDrawPolygon}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Icon name="polygon" size={16} />
                <span>{lang === "tr" ? "Kendi Tarlanı Çiz" : "Draw Your Parcel"}</span>
              </button>
            ) : (
              <Link
                href="/#harita-bolumu"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                <Icon name="polygon" size={16} />
                <span>{lang === "tr" ? "Haritada Tarla Seç / Çiz" : "Select / Draw Parcel on Map"}</span>
              </Link>
            )}

            {onOpenCoords && (
              <button
                type="button"
                onClick={onOpenCoords}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[12px] font-medium text-[#d5e8d8] hover:bg-white/15 hover:text-white"
              >
                <Icon name="keyboard" size={15} />
                <span>{lang === "tr" ? "Koordinat Gir" : "Enter Coords"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── UNIFIED CONTROL BAR RIGHT ABOVE COMPARISON: 1. Seçili Tarla | 2. Yıllık Sulama Bütçesi | 3. İklim Senaryosu ── */}
      <div className="grid grid-cols-1 gap-4 border-b border-line bg-bg/75 p-4 sm:px-6 lg:grid-cols-3">
        {/* BOX 1: 1. TARLA SEÇ & MEVCUT EKİM NÖBETİ */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#1e6b34]">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#1e6b34] text-[11px] text-white">
                  1
                </span>
                <span>{lang === "tr" ? "Seçili Tarla ve Mevcut Sıra" : "Selected Parcel & Current Sequence"}</span>
              </span>
              {isKonyaSelected && (
                <span className="rounded-full bg-[#dcfce7] px-2 py-0.5 font-mono text-[10px] font-bold text-[#166534]">
                  {lang === "tr" ? "Çumra Demo Aktif" : "Çumra Demo Active"}
                </span>
              )}
            </div>

            {/* Pilot Basin Selector + Parcel Stats */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="field-shift-pilot-select" className="sr-only">
                  {lang === "tr" ? "Tarla veya Örnek Havza Seç" : "Select Parcel or Pilot Basin"}
                </label>
                <select
                  id="field-shift-pilot-select"
                  aria-label={lang === "tr" ? "Seçili tarla havzası" : "Selected parcel basin"}
                  value={store.field?.pilotId ?? "custom"}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") return;
                    const pf = pilotField(val, lang);
                    if (pf) setField(pf);
                  }}
                  className="w-full rounded-xl border border-line bg-bg px-2.5 py-1.5 font-display text-[15px] font-semibold text-ink cursor-pointer"
                >
                  {PILOTS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {lang === "tr" ? p.nameTr : p.nameEn}
                    </option>
                  ))}
                  {!store.field?.pilotId && (
                    <option value="custom">
                      {store.field?.name ?? (lang === "tr" ? "Özel Çizilen Tarla" : "Custom Drawn Parcel")}
                    </option>
                  )}
                </select>
              </div>
              <div className="text-right font-mono text-[11.5px] text-ink-2">
                <strong className="text-ink">{n(effectiveAreaDa, 0)} da</strong> · {soilTextureLabel}
                <div className="text-[10.5px] text-ink-3">{provinceName}</div>
              </div>
            </div>

            {/* Farmer's Current 3-Year Rotation Selectors */}
            <div className="mt-3">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[11.5px] font-semibold text-ink-2">
                  {lang === "tr" ? "Mevcut 3 Yıllık Ekim Nöbetin:" : "Your Current 3-Year Rotation:"}
                </span>
                <div className="flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setInputs({ rotation: ["wheat_winter", "sugar_beet", "wheat_winter"] })
                    }
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                      store.inputs.rotation[0] === "wheat_winter" &&
                      store.inputs.rotation[1] === "sugar_beet" &&
                      store.inputs.rotation[2] === "wheat_winter"
                        ? "bg-[#1e6b34] text-white"
                        : "border border-line bg-bg text-ink-2 hover:text-ink"
                    }`}
                  >
                    {lang === "tr" ? "Buğday–Pancar–Buğday" : "Wheat–Beet–Wheat"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setInputs({ rotation: ["wheat_winter", "fallow", "wheat_winter"] })
                    }
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold transition-colors ${
                      store.inputs.rotation[0] === "wheat_winter" &&
                      store.inputs.rotation[1] === "fallow" &&
                      store.inputs.rotation[2] === "wheat_winter"
                        ? "bg-[#1e6b34] text-white"
                        : "border border-line bg-bg text-ink-2 hover:text-ink"
                    }`}
                  >
                    {lang === "tr" ? "Buğday–Nadas–Buğday" : "Wheat–Fallow–Wheat"}
                  </button>
                </div>
              </div>

              <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                {([0, 1, 2] as const).map((yrIdx) => (
                  <div key={yrIdx} className="rounded-lg border border-line bg-bg p-1.5">
                    <label
                      htmlFor={`cur-rot-yr-${yrIdx + 1}`}
                      className="block font-mono text-[10px] font-bold text-ink-2"
                    >
                      {yrIdx + 1}. {lang === "tr" ? "Yıl" : "Year"}
                    </label>
                    <select
                      id={`cur-rot-yr-${yrIdx + 1}`}
                      value={store.inputs.rotation[yrIdx]}
                      onChange={(e) => assignCurrentCropYear(e.target.value as CropId, yrIdx)}
                      className="mt-0.5 w-full truncate bg-transparent text-[12px] font-semibold text-ink outline-none cursor-pointer"
                    >
                      {CROP_IDS.map((cid) => (
                        <option key={cid} value={cid}>
                          {L(CROPS[cid].name)}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* BOX 2: 2. YILLIK SULAMA BÜTÇESİ VE YÖNTEMİ */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0277bd]">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#0277bd] text-[11px] text-white">
                  2
                </span>
                <span>{lang === "tr" ? "Yıllık Sulama Bütçesi" : "Annual Irrigation Budget"}</span>
                <TermTooltip termId="dn" />
              </span>
              <span className="numeral text-[17px] font-bold text-[#0277bd]" data-testid="active-budget-readout">
                {budgetNetMm} mm/yıl{" "}
                <span className="font-sans text-[11.5px] font-normal text-ink-2">
                  ({budgetNetMm === 0 ? (lang === "tr" ? "Kuru tarım" : "Rainfed") : `≈ ${n(budgetNetMm / TON_PER_IRRIGATION, 1)} ${lang === "tr" ? "sulama" : "irrig."}`})
                </span>
              </span>
            </div>

            {/* Quick Budget Preset Buttons for Easy Testing */}
            <div
              className="mt-2.5 flex flex-wrap gap-1.5"
              role="group"
              aria-label={lang === "tr" ? "Hızlı su bütçesi seçenekleri" : "Quick water budget presets"}
            >
              {[
                { mm: 0, tr: "0 mm (Kuru)", en: "0 mm (Rainfed)" },
                { mm: 80, tr: "80 mm (Çok Kısıtlı)", en: "80 mm (Very Low)" },
                { mm: 150, tr: "150 mm (Kısıtlı)", en: "150 mm (Limited)" },
                { mm: 250, tr: "250 mm (Orta)", en: "250 mm (Medium)" },
                { mm: 450, tr: "450 mm (Bol)", en: "450 mm (High)" },
              ].map((b) => {
                const active = budgetNetMm === b.mm;
                return (
                  <button
                    key={b.mm}
                    type="button"
                    data-testid={`budget-preset-${b.mm}`}
                    aria-pressed={active}
                    onClick={() =>
                      b.mm === 0
                        ? setInputs({ rainfed: true })
                        : setInputs({ rainfed: false, budget: b.mm })
                    }
                    className={`min-h-[36px] rounded-lg px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                      active
                        ? "bg-[#0277bd] text-white shadow-2xs"
                        : "border border-line bg-bg text-ink-2 hover:border-[#0277bd]/50 hover:text-ink"
                    }`}
                  >
                    {lang === "tr" ? b.tr : b.en}
                  </button>
                );
              })}
            </div>

            {/* Range Slider */}
            <div className="mt-2.5">
              <label htmlFor="field-shift-budget-slider" className="flex items-center justify-between text-[11.5px] text-ink-2">
                <span>
                  {lang === "tr"
                    ? "Bütçeyi kaydırarak düşürün veya artırın (1 mm = 1 ton/da):"
                    : "Adjust annual water budget (1 mm = 1 m³/da):"}
                </span>
                <span className="font-mono font-semibold text-ink">{budgetNetMm} ton/da</span>
              </label>
              <input
                id="field-shift-budget-slider"
                data-testid="budget-slider"
                type="range"
                min={0}
                max={600}
                step={10}
                value={budgetNetMm}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val <= 0) setInputs({ rainfed: true, budget: 0 });
                  else setInputs({ rainfed: false, budget: val });
                }}
                className="mt-1 h-2.5 w-full cursor-pointer accent-[#0277bd]"
              />
            </div>
          </div>

          {/* Irrigation Method */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[11.5px]">
            <span className="text-ink-2 flex items-center gap-1">
              <span>{lang === "tr" ? "Sulama Yöntemi:" : "Irrigation Method:"}</span>
              <TermTooltip termId="irrigation_efficiency" />
            </span>
            <div className="inline-flex rounded-lg border border-line bg-bg p-0.5">
              {(
                [
                  { id: "drip" as IrrigationMethod, tr: "Damla (%90)", en: "Drip (90%)" },
                  { id: "sprinkler" as IrrigationMethod, tr: "Yağmurlama (%75)", en: "Sprinkler (75%)" },
                  { id: "furrow" as IrrigationMethod, tr: "Karık (%60)", en: "Furrow (60%)" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={store.inputs.method === m.id}
                  onClick={() => setInputs({ method: m.id })}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                    store.inputs.method === m.id
                      ? "bg-[#0277bd] text-white"
                      : "text-ink-2 hover:text-ink"
                  }`}
                >
                  {lang === "tr" ? m.tr : m.en}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* BOX 3: 3. İKLİM SENARYOSU VE KODDA UYGULANAN YÖNTEM */}
        <div className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-2xs">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#b45309]">
                <span className="flex size-5 items-center justify-center rounded-full bg-[#b45309] text-[11px] text-white">
                  3
                </span>
                <span>{lang === "tr" ? "İklim Senaryosu" : "Climate Scenario"}</span>
                <TermTooltip termId="et0" />
              </span>
              <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#92400e]">
                {activeScenarioLabel}
              </span>
            </div>

            {/* Scenario Preset Buttons */}
            <div
              className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3"
              role="group"
              aria-label={lang === "tr" ? "İklim senaryosu seçimi" : "Climate scenario selection"}
            >
              {(
                [
                  {
                    id: "typical" as ScenarioPreset,
                    rain: 1,
                    temp: 0,
                    tr: "Normal İklim",
                    subTr: "2001–2024 Gözlem",
                    en: "Typical Climate",
                    subEn: "2001–2024 Observed",
                  },
                  {
                    id: "dry" as ScenarioPreset,
                    rain: 0.75,
                    temp: 0,
                    tr: "Kurak Senaryo",
                    subTr: "Günlük yağış ×0,75 (−%25)",
                    en: "Drought Scenario",
                    subEn: "Daily rain ×0.75 (−25%)",
                  },
                  {
                    id: "hot_dry" as ScenarioPreset,
                    rain: 0.75,
                    temp: 2,
                    tr: "Sıcak ve Kurak",
                    subTr: "+2 °C & yağış ×0,75",
                    en: "Hot & Dry",
                    subEn: "+2 °C & rain ×0.75",
                  },
                ] as const
              ).map((sc) => {
                const active = scenarioPreset === sc.id;
                return (
                  <button
                    key={sc.id}
                    type="button"
                    data-testid={`scenario-btn-${sc.id}`}
                    aria-pressed={active}
                    onClick={() =>
                      setStore({
                        scenario: {
                          preset: sc.id,
                          rainMultiplier: sc.rain,
                          tempDeltaC: sc.temp,
                          priceMultiplier: store.scenario.priceMultiplier,
                        },
                      })
                    }
                    className={`flex min-h-[44px] flex-col items-start justify-center rounded-xl border px-2.5 py-1.5 text-left transition-colors ${
                      active
                        ? "border-[#b45309] bg-[#fef3c7] text-[#78350f] shadow-2xs"
                        : "border-line bg-bg text-ink-2 hover:border-[#b45309]/40 hover:text-ink"
                    }`}
                  >
                    <span className="text-[12px] font-bold">{lang === "tr" ? sc.tr : sc.en}</span>
                    <span className="font-mono text-[10px] opacity-85">
                      {lang === "tr" ? sc.subTr : sc.subEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Honest Code-Method Explanation Box */}
          <div className="mt-2.5 rounded-xl border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-[11.5px] leading-relaxed text-[#78350f]">
            {scenarioCodeExplanation}
          </div>
        </div>
      </div>

      {/* ── LIVE COMPUTING STATUS & UPDATED RESULT BAR ── */}
      <div
        role="status"
        aria-live="polite"
        data-testid="comparison-status-bar"
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5 text-[12.5px] transition-colors sm:px-6 ${
          isBusy ? "bg-[#fef3c7] text-[#92400e]" : "bg-[#f0fdf4] text-[#14532d]"
        }`}
      >
        <div className="flex items-center gap-2 font-medium">
          {isBusy ? (
            <>
              <span className="size-2.5 animate-ping rounded-full bg-[#d97706]" />
              <span data-testid="computing-indicator">
                {lang === "tr"
                  ? "Hesaplanıyor... Su bütçesi ve iklim senaryosu 22 tarihsel 3 yıllık dönemde yeniden simüle ediliyor."
                  : "Computing... Re-simulating water budget and climate scenario across 22 historical 3-year windows."}
              </span>
            </>
          ) : (
            <>
              <span className="flex size-5 items-center justify-center rounded-full bg-[#16a34a] text-white">
                <Icon name="check" size={13} />
              </span>
              <span data-testid="updated-result-indicator">
                {lang === "tr"
                  ? `Sonuç güncellendi · Tarla: ${store.field?.name ?? "Konya — Çumra"} (${n(effectiveAreaDa, 0)} da) · Yıllık Bütçe: ${budgetNetMm} mm/yıl · Senaryo: ${activeScenarioLabel}`
                  : `Result updated · Parcel: ${store.field?.name ?? "Konya — Çumra"} (${n(effectiveAreaDa, 0)} da) · Annual Budget: ${budgetNetMm} mm/yr · Scenario: ${activeScenarioLabel}`}
              </span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 font-mono text-[11.5px]">
          {result && (
            <span>
              {lang === "tr"
                ? `${result.optimizer.feasible} geçerli sıra tarandı · ${totalWindows} dönem (2001–2024)`
                : `${result.optimizer.feasible} feasible sequences screened · ${totalWindows} windows (2001–2024)`}
            </span>
          )}
        </div>
      </div>

      {/* ── EXPLICIT ALERT WHEN NO PLAN FITS WITHIN THE WATER BUDGET ── */}
      {allPlansExceedBudget && (
        <div
          role="alert"
          data-testid="all-plans-exceed-budget-alert"
          className="border-b border-[#fca5a5] bg-[#fef2f2] px-4 py-3.5 text-[#7f1d1d] sm:px-6"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-[#dc2626] font-mono text-[13px] font-bold text-white">
              !
            </span>
            <div className="space-y-1 text-[13px]">
              <p className="font-display text-[15px] font-bold text-[#991b1b]">
                {lang === "tr"
                  ? `Hiçbir plan ${budgetNetMm} mm/yıl su bütçesine tam uymuyor — Kalan su açıkları:`
                  : `No plan fits within the ${budgetNetMm} mm/yr water budget without deficit — Remaining water deficits:`}
              </p>
              <p className="text-[12.5px] text-[#7f1d1d]">
                {lang === "tr"
                  ? "Seçtiğiniz su bütçesi ve iklim senaryosunda mevcut plan ve alternatiflerin tamamında en az bir yılda karşılanamayan su açığı (ETc − ETa) oluşmaktadır:"
                  : "Under your selected water budget and climate scenario, both the current plan and the alternatives experience an unmet water deficit (ETc − ETa) in at least one year:"}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-2 font-mono text-[12px]">
                {planDiagnostics.map((d) => (
                  <li
                    key={d.plan.id}
                    className="rounded-lg border border-[#fca5a5] bg-white px-2.5 py-1 font-semibold text-[#991b1b]"
                  >
                    {lang === "tr" ? d.badgeTr : d.badgeEn} (
                    {d.plan.crops.map((c) => L(CROPS[c].name).split(" (")[0]).join(" → ")}):{" "}
                    {lang === "tr"
                      ? `Yıllık kalan açık +${d.remainingDeficitMm} mm (kurak yıllarda +${d.remainingDeficitDryMm} mm)`
                      : `Remaining deficit +${d.remainingDeficitMm} mm/yr (+${d.remainingDeficitDryMm} mm in dry years)`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ── 3-COLUMN SIDE-BY-SIDE PLAN COMPARISON: MEVCUT PLAN vs. ALTERNATİF 1 & ALTERNATİF 2 ── */}
      <div className="p-4 sm:p-6">
        {!result ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="skel h-96 rounded-2xl" />
            <div className="skel h-96 rounded-2xl" />
            <div className="skel h-96 rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {planDiagnostics.map((diag, idx) => {
              const { plan, role, badgeTr, badgeEn, years, exceedingYears, hasExceedance, okWindows } = diag;
              const isCurrent = role === "current";
              const isWhyOpen = !!expandedWhy[role];

              const irrP50 = Math.round(plan.water.irrigationNetMmPerYr?.p50 ?? 0);
              const reqP50 = Math.round(plan.water.requirementMmPerYr?.p50 ?? 0);
              const unmetP50 = Math.round(plan.water.unmetDeficitMmPerYr?.p50 ?? 0);
              const unmetP90 = Math.round(plan.water.unmetDeficitMmPerYr?.p90 ?? 0);

              const marginP50 = Math.round(plan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0);
              const marginP10 = Math.round(plan.economics.grossMarginTLPerDaPerYr?.p10 ?? 0);
              const marginP90 = Math.round(plan.economics.grossMarginTLPerDaPerYr?.p90 ?? 0);

              const soilScore = Math.round(plan.soilHealth.score);
              const bareDays = Math.round(plan.soilHealth.bareDaysPerYear);
              const nLow = plan.nitrogen ? (plan.nitrogen.balanceKgHaYr.low / 10).toFixed(1) : "0.0";
              const nHigh = plan.nitrogen ? (plan.nitrogen.balanceKgHaYr.high / 10).toFixed(1) : "0.0";

              // Build structured "Bu plan neden öne çıktı?" (1. Outcome sentence -> 2. Data source -> 3. Assumption)
              const cropNamesJoined = plan.crops.map((c) => L(CROPS[c].name)).join(" → ");
              const curIrrP50 = Math.round(result.current.water.irrigationNetMmPerYr?.p50 ?? 0);
              const curMarginP50 = Math.round(result.current.economics.grossMarginTLPerDaPerYr?.p50 ?? 0);
              const waterDiff = irrP50 - curIrrP50;
              const marginDiff = marginP50 - curMarginP50;

              const singleSentenceOutcome = isCurrent
                ? lang === "tr"
                  ? `Mevcut ekim nöbetiniz (${cropNamesJoined}), ${budgetNetMm} mm/yıl su bütçesi ve ${activeScenarioLabel} altında yılda medyan ${irrP50} mm sulama suyu kullanır; ${
                      exceedingYears.length > 0
                        ? `${exceedingYears.map((y) => `${y.year}. yılda (${y.cropName})`).join(" ve ")} su bütçesini aşar`
                        : `hiçbir yılda su bütçesini aşmaz`
                    } ve dekar başına medyan ${n(marginP50, 0)} ₺/yıl brüt kâr üretir.`
                  : `Your current rotation (${cropNamesJoined}) uses a median ${irrP50} mm/yr of irrigation under the ${budgetNetMm} mm/yr budget and ${activeScenarioLabel}, ${
                      exceedingYears.length > 0
                        ? `exceeding the water budget in ${exceedingYears.map((y) => `Year ${y.year} (${y.cropName})`).join(" and ")}`
                        : `staying within the water budget in all 3 years`
                    }, and yields a median gross margin of ${n(marginP50, 0)} TL/da/yr.`
                : lang === "tr"
                  ? `Bu alternatif plan (${cropNamesJoined}), mevcut ekim nöbetinize göre yılda ${
                      waterDiff <= 0 ? `${Math.abs(waterDiff)} mm daha az` : `${waterDiff} mm daha fazla`
                    } su kullanarak ${totalWindows} tarihsel dönemin ${okWindows}'inde bütçe içinde kalır ve dekar başına yılda ${
                      marginDiff >= 0 ? `+${n(marginDiff, 0)} ₺ daha yüksek` : `${n(marginDiff, 0)} ₺ farkla`
                    } medyan senaryo çıktısı (${n(marginP50, 0)} ₺/da/yıl) ile ${soilScore}/100 toprak sağlığı model göstergesi sağlar.`
                  : `This alternative plan (${cropNamesJoined}) uses ${
                      waterDiff <= 0 ? `${Math.abs(waterDiff)} mm/yr less` : `${waterDiff} mm/yr more`
                    } water than your current rotation, stays within budget in ${okWindows} of ${totalWindows} historical windows, and delivers ${
                      marginDiff >= 0 ? `+${n(marginDiff, 0)} TL/da/yr higher` : `${n(marginDiff, 0)} TL/da/yr difference in`
                    } median scenario output (${n(marginP50, 0)} TL/da/yr) with a ${soilScore}/100 soil health model indicator.`;

              const dataSourceText =
                lang === "tr"
                  ? "NASA POWER / MERRA-2 günlük meteoroloji serisi (2001–2024: T2M, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN ve GWETROOT yeniden analiz kök nemi — doğrudan SMAP parsel ölçümü değildir), ISRIC SoilGrids 250m (0–200 cm 6 katmanlı kil/kum/silt/pH/SOC), NASA SRTM 30m DEM arazi eğimi/rakımı, FAO-56 / TAGEM ürün katsayıları (Kc, Ky) ve 2025/2026 TMO–TÜİK referans alım fiyatları."
                  : "NASA POWER / MERRA-2 daily meteorology (2001–2024: T2M, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, and GWETROOT reanalysis root-zone wetness — not a direct SMAP parcel sensor measurement), ISRIC SoilGrids 250m (0–200 cm 6-layer clay/sand/silt/pH/SOC), NASA SRTM 30m DEM slope/elevation, FAO-56 / TAGEM crop coefficients (Kc, Ky), and 2025/2026 TMO–TÜİK reference prices.";

              const assumptionText =
                lang === "tr"
                  ? `FAO-56 Penman–Monteith günlük ET₀ ve 1,5 m kök kolonunda Saxton–Rawls (2006) su dengesi; sulama randımanı %${Math.round(
                      METHOD_EFF[store.inputs.method] * 100,
                    )}; iklim senaryosu: ${
                      scenarioPreset === "dry"
                        ? "günlük yağış ×0,75 (−%25), ΔT = 0 °C"
                        : scenarioPreset === "hot_dry"
                          ? "günlük yağış ×0,75 (−%25), Tmin/Tmax +2 °C ve sabit bağıl nemde yeniden hesaplanan ET₀"
                          : "2001–2024 gözlenen günlük seri (×1,00)"
                    }. Ekonomik P10–P90 aralıkları 22 dönemin senaryo çıktısıdır; toprak sağlığı puanı (0–100) ise baklagil payı, kök derinliği çeşitliliği, çıplak gün ve azot dengesinden oluşan bir model göstergesidir.`
                  : `FAO-56 Penman–Monteith daily ET₀ and 1.5 m root-zone Saxton–Rawls (2006) water balance; irrigation efficiency ${Math.round(
                      METHOD_EFF[store.inputs.method] * 100,
                    )}%; climate scenario: ${
                      scenarioPreset === "dry"
                        ? "daily rain ×0.75 (−25%), ΔT = 0 °C"
                        : scenarioPreset === "hot_dry"
                          ? "daily rain ×0.75 (−25%), Tmin/Tmax +2 °C with recomputed ET₀ at constant relative humidity"
                          : "observed 2001–2024 daily series (×1.00)"
                    }. Economic P10–P90 ranges are scenario outputs across 22 windows; the soil health score (0–100) is a model indicator combining legume share, root-depth diversity, bare-soil days, and N balance.`;

              return (
                <article
                  key={plan.id}
                  data-testid={`comparison-card-${role}`}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-4 transition-all sm:p-5 ${
                    idx === 1
                      ? "border-[#1e6b34] bg-[#f8fdf9] shadow-sm"
                      : isCurrent
                        ? "border-line-strong bg-surface"
                        : "border-line bg-surface"
                  }`}
                >
                  <div className="space-y-4">
                    {/* Card Header: Plan Role + Explicit Text Budget Status Badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                            isCurrent
                              ? "bg-surface-2 text-ink"
                              : idx === 1
                                ? "bg-[#1e6b34] text-white"
                                : "bg-[#e6f4ea] text-[#1e6b34]"
                          }`}
                        >
                          {lang === "tr" ? badgeTr : badgeEn}
                        </span>
                        <h3 className="mt-1.5 font-display text-[17px] font-semibold text-ink">
                          {plan.crops.map((c) => L(CROPS[c].name).split(" (")[0]).join(" → ")}
                        </h3>
                      </div>

                      {/* Text-Based Budget Exceedance Badge (Never color alone!) */}
                      <span
                        data-testid={`plan-budget-badge-${role}`}
                        className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold ${
                          hasExceedance
                            ? "border-[#fca5a5] bg-[#fef2f2] text-[#991b1b]"
                            : "border-[#86efac] bg-[#dcfce7] text-[#166534]"
                        }`}
                      >
                        <span>{hasExceedance ? "⚠️" : "✓"}</span>
                        <span>
                          {hasExceedance
                            ? exceedingYears.length > 0
                              ? lang === "tr"
                                ? `BÜTÇE AŞIMI: ${exceedingYears.map((y) => `${y.year}. Yıl`).join(", ")}`
                                : `OVER BUDGET: Yr ${exceedingYears.map((y) => y.year).join(", ")}`
                              : lang === "tr"
                                ? `SU AÇIĞI: +${unmetP50} mm`
                                : `DEFICIT: +${unmetP50} mm`
                            : lang === "tr"
                              ? "BÜTÇEYE UYGUN (3 Yıl)"
                              : "WITHIN BUDGET (All 3 Yrs)"}
                        </span>
                      </span>
                    </div>

                    {/* CRITERION 1: 3-Year Crop Sequence & Per-Year Irrigation + Exceedance Badge */}
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-2">
                        {lang === "tr"
                          ? "1. Üç Yıllık Ürün Sırası ve Yıllık Su Durumu"
                          : "1. 3-Year Crop Sequence & Annual Water Status"}
                      </p>
                      <ol className="mt-2 space-y-2">
                        {years.map((y) => (
                          <li
                            key={y.year}
                            data-testid={`plan-${role}-year-${y.year}`}
                            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[12.5px] ${
                              y.exceeded
                                ? "border-[#fca5a5] bg-[#fef2f2]/80"
                                : "border-line bg-bg/70"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono text-[11px] font-bold text-ink-2 shrink-0">
                                {y.year}. {lang === "tr" ? "Yıl" : "Yr"}
                              </span>
                              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                                <CropArt crop={y.cropId} size={22} />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-ink">{y.cropName}</p>
                                <p className="font-mono text-[11px] text-ink-2">
                                  {lang === "tr" ? "Sulama:" : "Irrig.:"} <strong>{y.irrigatedMm} mm</strong>
                                  {y.unmetDeficitP50Mm > 0 || y.unmetDeficitP90Mm > 0
                                    ? ` · ${lang === "tr" ? "Açık" : "Deficit"}: +${Math.max(y.unmetDeficitP50Mm, y.unmetDeficitP90Mm)} mm`
                                    : ""}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold ${
                                y.exceeded
                                  ? "bg-[#dc2626] text-white"
                                  : "bg-[#dcfce7] text-[#166534]"
                              }`}
                            >
                              {y.statusBadge}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* CRITERION 2: Bütçe Aşımı Olan Yıllar ve Nedeni (Explicit Text Explanation) */}
                    <div
                      data-testid={`plan-${role}-exceedance-reason`}
                      className={`rounded-xl border p-3 text-[12px] leading-relaxed ${
                        hasExceedance
                          ? "border-[#fca5a5] bg-[#fff5f5] text-[#7f1d1d]"
                          : "border-[#bbf7d0] bg-[#f0fdf4] text-[#14532d]"
                      }`}
                    >
                      <p className="font-mono text-[11px] font-bold uppercase">
                        {hasExceedance
                          ? lang === "tr"
                            ? "2. Bütçe Aşımı Olan Yıllar ve Nedeni"
                            : "2. Budget-Exceeding Years & Reason"
                          : lang === "tr"
                            ? "2. Su Bütçesi Uyumu ve Nedeni"
                            : "2. Water Budget Compliance & Reason"}
                      </p>
                      {exceedingYears.length > 0 ? (
                        <ul className="mt-1.5 space-y-1.5">
                          {exceedingYears.map((ey) => (
                            <li key={ey.year} className="flex items-start gap-1.5">
                              <span className="font-bold">•</span>
                              <span>{ey.reasonText}</span>
                            </li>
                          ))}
                        </ul>
                      ) : hasExceedance ? (
                        <p className="mt-1">
                          {lang === "tr"
                            ? `Yıllık ortalama +${unmetP50} mm (kurak yıllarda +${unmetP90} mm) karşılanamayan su açığı oluşmaktadır (${okWindows}/${totalWindows} dönemde bütçe yetti).`
                            : `An average unmet deficit of +${unmetP50} mm/yr (+${unmetP90} mm in dry years) occurs (${okWindows}/${totalWindows} windows within budget).`}
                        </p>
                      ) : (
                        <p className="mt-1">
                          {lang === "tr"
                            ? `1., 2. ve 3. yıllarda ürünlerin net sulama suyu talebi (${irrP50} mm/yıl), belirlediğiniz ${budgetNetMm} mm/yıl bütçenin altında kalır; ${totalWindows} tarihsel dönemin ${okWindows}'inde bütçe aşımı yaşanmaz.`
                            : `Across Years 1, 2, and 3, net crop irrigation demand (${irrP50} mm/yr) stays within your ${budgetNetMm} mm/yr budget; ${okWindows} of ${totalWindows} historical windows have zero budget exceedance.`}
                        </p>
                      )}
                    </div>

                    {/* CRITERION 3, 4 & 5: Metrics Grid (Water Demand | Rotation & Soil Model Indicator | Scenario Economic Output) */}
                    <dl className="grid grid-cols-1 gap-2 rounded-xl border border-line bg-bg/60 p-3 text-[12px] sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      {/* Sulama İhtiyacı */}
                      <div className="rounded-lg bg-surface p-2.5 border border-line/60">
                        <dt className="text-[11px] font-medium text-ink-2 flex items-center justify-between">
                          <span>{lang === "tr" ? "Sulama İhtiyacı" : "Irrigation Need"}</span>
                          <TermTooltip termId="dn" />
                        </dt>
                        <dd className="numeral mt-1 text-[17px] font-bold text-[#0277bd]">
                          {irrP50} <span className="text-[12px] font-normal">mm/yıl</span>
                        </dd>
                        <dd className="mt-0.5 font-mono text-[10.5px] text-ink-2">
                          {lang === "tr"
                            ? `Toplam talep: ${reqP50} mm · ${okWindows}/${totalWindows} dönem güvenli`
                            : `Total req: ${reqP50} mm · ${okWindows}/${totalWindows} windows safe`}
                        </dd>
                      </div>

                      {/* Rotasyon & Toprak Sağlığı (Model Göstergesi) */}
                      <div className="rounded-lg bg-surface p-2.5 border border-line/60">
                        <dt className="text-[11px] font-medium text-ink-2 flex items-center justify-between">
                          <span>{lang === "tr" ? "Toprak & Rotasyon" : "Soil & Rotation"}</span>
                          <TermTooltip termId="soil_health" />
                        </dt>
                        <dd className="numeral mt-1 text-[17px] font-bold text-[#1e6b34]">
                          {soilScore} / 100
                        </dd>
                        <dd className="mt-0.5 font-mono text-[10.5px] text-ink-2">
                          <span className="font-semibold text-[#1e6b34]">
                            {lang === "tr" ? "Model göstergesi" : "Model indicator"}
                          </span>{" "}
                          · ΔN {nLow}..{nHigh} kg/da · {bareDays}g açık
                        </dd>
                      </div>

                      {/* Ekonomik Aralık (Senaryo Çıktısı P10-P90) */}
                      <div className="rounded-lg bg-surface p-2.5 border border-line/60">
                        <dt className="text-[11px] font-medium text-ink-2 flex items-center justify-between">
                          <span>{lang === "tr" ? "Brüt Kâr (Medyan)" : "Gross Margin (P50)"}</span>
                          <TermTooltip termId="p10_p50_p90" />
                        </dt>
                        <dd className="numeral mt-1 text-[17px] font-bold text-ink">
                          {n(marginP50, 0)} <span className="text-[12px] font-normal">₺/da/yıl</span>
                        </dd>
                        <dd className="mt-0.5 font-mono text-[10.5px] text-ink-2">
                          <span className="font-semibold text-[#b45309]">
                            {lang === "tr" ? "Senaryo çıktısı" : "Scenario output"}
                          </span>{" "}
                          P10–P90: {n(marginP10, 0)}–{n(marginP90, 0)} ₺
                        </dd>
                      </div>
                    </dl>

                    {/* EXPANDABLE "BU PLAN NEDEN ÖNE ÇIKTI?" (1. Outcome Sentence -> 2. Data Source -> 3. Assumption) */}
                    <div className="rounded-xl border border-line bg-bg/50">
                      <button
                        type="button"
                        data-testid={`why-plan-toggle-${role}`}
                        aria-expanded={isWhyOpen}
                        onClick={() =>
                          setExpandedWhy((prev) => ({ ...prev, [role]: !prev[role] }))
                        }
                        className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] font-semibold text-accent-ink hover:bg-surface-2/60"
                      >
                        <span className="flex items-center gap-2">
                          <Icon name="evidence" size={16} />
                          <span>
                            {lang === "tr"
                              ? "Bu plan neden öne çıktı? (Sonuç, Veri Kaynağı ve Varsayım)"
                              : "Why did this plan stand out? (Outcome, Data Source & Assumption)"}
                          </span>
                        </span>
                        <Icon
                          name="chevron-down"
                          size={16}
                          className={`transition-transform ${isWhyOpen ? "rotate-180" : ""}`}
                        />
                      </button>

                      {isWhyOpen && (
                        <div
                          data-testid={`why-plan-content-${role}`}
                          className="space-y-2.5 border-t border-line bg-surface px-3.5 py-3 text-[12px] leading-relaxed"
                        >
                          {/* 1. Single Outcome Sentence First */}
                          <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-2.5 text-[#14532d]">
                            <p className="font-mono text-[10.5px] font-bold uppercase text-[#166534]">
                              {lang === "tr" ? "1. Sonuç Özeti (Tek Cümle)" : "1. Outcome Summary (Single Sentence)"}
                            </p>
                            <p className="mt-0.5 font-medium">{singleSentenceOutcome}</p>
                          </div>

                          {/* 2. Data Source */}
                          <div className="rounded-lg border border-line bg-bg/70 p-2.5 text-ink">
                            <p className="font-mono text-[10.5px] font-bold uppercase text-[#0277bd]">
                              {lang === "tr" ? "2. Veri Kaynağı" : "2. Data Source"}
                            </p>
                            <p className="mt-0.5 text-ink-2">{dataSourceText}</p>
                          </div>

                          {/* 3. Assumption */}
                          <div className="rounded-lg border border-line bg-bg/70 p-2.5 text-ink">
                            <p className="font-mono text-[10.5px] font-bold uppercase text-[#b45309]">
                              {lang === "tr" ? "3. Varsayım ve Hesap Yöntemi" : "3. Assumption & Calculation Method"}
                            </p>
                            <p className="mt-0.5 text-ink-2">{assumptionText}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Apply Plan + Reachability Links to Profitability, Map Layers & Formulas */}
                  <div className="mt-4 space-y-2 border-t border-line pt-3">
                    {!isCurrent && (
                      <button
                        type="button"
                        onClick={() => setInputs({ rotation: [...plan.crops] })}
                        className="btn btn-primary btn-sm w-full justify-center"
                      >
                        <Icon name="check" size={15} />
                        <span>
                          {lang === "tr"
                            ? "Bu Planı Mevcut Sıram Olarak Uygula"
                            : "Apply as My Current Rotation"}
                        </span>
                      </button>
                    )}

                    {/* Direct Links to Profitability, Detailed Map Layers, and Formulas */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11.5px]">
                      {onJumpToProfitability ? (
                        <button
                          type="button"
                          onClick={onJumpToProfitability}
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-ink-2 hover:border-accent hover:text-ink"
                        >
                          💰 {lang === "tr" ? "Kârlılık Tablosu" : "Profitability"}
                        </button>
                      ) : (
                        <a
                          href="#analiz-grafikler"
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-ink-2 hover:border-accent hover:text-ink"
                        >
                          💰 {lang === "tr" ? "Kârlılık" : "Profitability"}
                        </a>
                      )}

                      {onJumpToMap ? (
                        <button
                          type="button"
                          onClick={onJumpToMap}
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-ink-2 hover:border-accent hover:text-ink"
                        >
                          🛰️ {lang === "tr" ? "Harita Katmanları" : "Map Layers"}
                        </button>
                      ) : (
                        <Link
                          href="/#harita-bolumu"
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-ink-2 hover:border-accent hover:text-ink"
                        >
                          🛰️ {lang === "tr" ? "Harita Katmanları" : "Map Layers"}
                        </Link>
                      )}

                      {onJumpToFormulas ? (
                        <button
                          type="button"
                          onClick={onJumpToFormulas}
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-accent-ink hover:border-accent"
                        >
                          📐 {lang === "tr" ? "Formüller & Dayanak" : "Formulas"}
                        </button>
                      ) : (
                        <Link
                          href="/dayanak"
                          className="rounded-lg border border-line bg-bg px-2.5 py-1 font-semibold text-accent-ink hover:border-accent"
                        >
                          📐 {lang === "tr" ? "Formüller & Dayanak" : "Formulas"}
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}

            {/* HONEST MISSING-ALTERNATIVE CARD: Never fabricate a plan if the engine produced fewer than 2 */}
            {validAlternatives.length < 2 && (
              <div
                data-testid="honest-missing-alternative-notice"
                className="flex flex-col justify-center rounded-2xl border-2 border-dashed border-line-strong bg-bg/50 p-5 text-[13px] text-ink-2"
              >
                <p className="font-display text-[16px] font-semibold text-ink">
                  {lang === "tr"
                    ? validAlternatives.length === 0
                      ? "Motor Geçerli Bir Alternatif Üretemedi"
                      : "Motor Yalnızca 1 Geçerli Alternatif Üretebildi"
                    : validAlternatives.length === 0
                      ? "Engine Could Not Produce a Valid Alternative"
                      : "Engine Produced Only 1 Valid Alternative"}
                </p>
                <p className="mt-2 leading-relaxed">
                  {lang === "tr"
                    ? "Seçili ürün kısıtları, iklim uygunluğu ve münavebe kuralları altında ikinci bir geçerli alternatif bulunamadı. Bilimsel dürüstlük ilkesi gereği eksik plan uydurulmamıştır. Hariç tutulan ürünleri azaltarak yeni alternatifler tarayabilirsiniz."
                    : "Under the active crop exclusions, climate suitability, and rotation rules, no second valid alternative met all constraints. In accordance with scientific integrity rules, no missing plan is fabricated. Remove crop exclusions to scan more alternatives."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
