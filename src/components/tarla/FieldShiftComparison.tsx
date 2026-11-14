"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CROP_IDS, CROPS } from "@/lib/engine";
import type { AnalysisResult, CropId, RotationSequence, YearResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import {
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
  error?: boolean;
  onRetry?: () => void;
  children?: ReactNode;
  effectiveAreaDa: number;
  soilTextureLabel: string;
  provinceName: string;
  /** Optional callbacks when embedded in the main workspace (`/`) */
  onPinField?: () => void;
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

  const exceeded = exceededShare > 0;
  const hasDeficit = (yr.unmetDeficitMm?.p50 ?? 0) > 0;

  if (exceeded) {
    const statusBadge = lang === "tr" ? "AŞIM" : "EXCEEDED";
    const reasonText = lang === "tr"
      ? `${yr.year}. Yıl (${cropName}): ${budgetNetMm} mm net bütçe, ${totalWindows} dönemin ${exceededWindows}’inde su talebini karşılamadı (Kc=${kcMid.toFixed(2)}).`
      : `Year ${yr.year} (${cropName}): The ${budgetNetMm} mm net budget fell short in ${exceededWindows} of ${totalWindows} periods (Kc=${kcMid.toFixed(2)}).`;

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
    statusBadge: hasDeficit ? (lang === "tr" ? "Su açığı" : "Water deficit") : (lang === "tr" ? "UYGUN" : "Within budget"),
    reasonText:
      lang === "tr"
        ? `${yr.year}. Yıl (${cropName}): Net sulama medyanı ${irrigatedMm} mm. ${budgetNetMm} mm bütçeyi aşmadan hesaplanan su açığı medyanı ${unmetDeficitP50Mm} mm (P90: ${unmetDeficitP90Mm} mm).`
        : `Year ${yr.year} (${cropName}): Median net irrigation was ${irrigatedMm} mm. Within the ${budgetNetMm} mm budget, the median deficit was ${unmetDeficitP50Mm} mm (P90: ${unmetDeficitP90Mm} mm).`,
  };
}

export function FieldShiftComparison({
  result,
  running,
  error,
  onRetry,
  children,
  effectiveAreaDa,
  soilTextureLabel,
  provinceName,
  onPinField,
  onDrawPolygon,
  onOpenCoords,
  onJumpToMap,
  onJumpToProfitability,
  onJumpToFormulas,
}: FieldShiftComparisonProps) {
  const { lang, n, L } = useI18n();
  const store = useStore();
  const budgetNetMm = store.inputs.rainfed ? 0 : store.inputs.budget;
  const scenarioPreset = store.scenario.preset;
  const tr = lang === "tr";
  const needsField = Boolean(children && !store.field);

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
        { role: "current" as const, plan: result.current, badgeTr: "Mevcut plan", badgeEn: "Current plan" },
        ...validAlternatives.map((alt, idx) => ({
          role: `alt_${idx}` as const,
          plan: alt,
          badgeTr: `Alternatif ${idx + 1}`,
          badgeEn: `Alternative ${idx + 1}`,
        })),
      ]
    : [];

  const totalWindows = result?.windows.count ?? 0;
  const currentResults = store.field && !running && !error && result;
  const withoutExceedance = comparedPlans.filter(({ plan }) => plan.water.budgetExceededShare === 0);
  const noBudgetFit = budgetNetMm > 0 && comparedPlans.length > 0 &&
    comparedPlans.every(({ plan }) => (plan.water.budgetExceededShare ?? 0) > 0);
  const agYears = result?.windows.agYears ?? [];
  const formatMm = (mm: number | undefined) => mm == null ? "—" : `${n(mm, 0)} mm`;


  return (
    <section
      id="field-shift-karsilastirma"
      aria-label={
        lang === "tr"
          ? "Tarla Seç, Su Koşullarını Belirle ve Planları Karşılaştır"
          : "Select Parcel, Set Water Conditions, and Compare Plans"
      }
      className="fieldshift-decision"
    >
      <header className="fieldshift-decision-heading">
        <div>
          <h1 className="display text-[28px] leading-tight text-ink sm:text-[36px]">
            {children ? (tr ? "Tarla çalışma alanı" : "Field workspace") : (tr ? "Ekim planları" : "Crop plans")}
          </h1>
          {!needsField && <p className="mt-2 text-base text-ink-2">
            {tr ? "Sulama bütçeni ve iklim koşullarını değiştir, her planın su açığını gör." : "Change the irrigation budget and climate conditions to see each plan’s water deficit."}
          </p>}
        </div>
        {!needsField && <div className="flex flex-wrap gap-2">
          {onPinField && (
            <button type="button" className="btn btn-primary min-h-11" onClick={onPinField}>
              <Icon name="pin" size={17} /> {tr ? "Haritadan nokta seç" : "Choose a point on the map"}
            </button>
          )}
          {onDrawPolygon ? (
            <button type="button" data-testid="draw-own-parcel-btn" className="btn min-h-11" onClick={onDrawPolygon}>
              {tr ? "Tarla çiz" : "Draw a field"}
            </button>
          ) : (
            <Link href="/tarla#harita-bolumu" className="btn min-h-11">{tr ? "Tarla haritası" : "Field map"}</Link>
          )}
          {onOpenCoords && (
            <button type="button" className="btn min-h-11" onClick={onOpenCoords}>
              {tr ? "Koordinat gir" : "Enter coordinates"}
            </button>
          )}
        </div>}
      </header>

      {needsField && (
        <div className="field-desk">
          <div className="field-desk-map">{children}</div>
          <aside className="field-desk-guide" aria-labelledby="field-desk-title">
            <Icon name="sprout" size={46} />
            <h2 id="field-desk-title">{tr ? "Bir tarla seçerek başlayın" : "Start by selecting a field"}</h2>
            <p>{tr ? "Konumu bulun, sınırı çizin veya bir nokta seçip alanı girin." : "Find a location, draw the boundary or select a point and enter the field area."}</p>
            <div className="field-desk-actions">
              <button type="button" className="btn btn-primary" onClick={onPinField}><Icon name="pin" size={19} />{tr ? "Haritada nokta seç" : "Choose a map point"}</button>
              <button type="button" className="btn" onClick={onDrawPolygon}><Icon name="polygon" size={19} />{tr ? "Sınır çiz" : "Draw a boundary"}</button>
              <button type="button" className="btn" onClick={onOpenCoords}><Icon name="pin" size={19} />{tr ? "Koordinat gir" : "Enter coordinates"}</button>
            </div>
          </aside>
        </div>
      )}
      {/* ── UNIFIED CONTROL BAR RIGHT ABOVE COMPARISON: 1. Seçili Tarla | 2. Yıllık Sulama Bütçesi | 3. İklim Senaryosu ── */}
      {children && !needsField && <div className="fieldshift-decision-map">{children}</div>}
      {store.field && <>
      <div id="sulama-ayarlari" className="fieldshift-decision-controls grid scroll-mt-36 grid-cols-1 gap-3 lg:grid-cols-3">
        {/* BOX 1: 1. TARLA SEÇ & MEVCUT EKİM NÖBETİ */}
        <div className="flex flex-col justify-between min-w-0 rounded-xl border border-line bg-surface p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#1e6b34]">
                <span>{lang === "tr" ? "Tarla ve ürün senaryosu" : "Field and crop scenario"}</span>
              </span>
            </div>
            <div className="mt-2 text-sm text-ink">
              <strong>{store.field?.name ?? (tr ? "Henüz tarla seçilmedi" : "No field selected")}</strong>
              {store.field && <p className="mt-1 text-ink-2">{n(effectiveAreaDa, 1)} da · {soilTextureLabel} · {provinceName}</p>}
            </div>

            <p className="mt-2 text-xs text-ink-2">
              {tr ? "Tarladaki ürünü biliyorsan aşağıda seç. Seçilen sıra hesapta senaryo olarak kullanılır." : "Choose the crops below if known. The rotation is used as a scenario input."}
            </p>
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
                      className="mt-0.5 min-h-9 w-full truncate bg-transparent text-sm font-semibold text-ink cursor-pointer"
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
        <div className="flex flex-col justify-between min-w-0 rounded-xl border border-line bg-surface p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#0277bd]">
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
        <div className="flex flex-col justify-between min-w-0 rounded-xl border border-line bg-surface p-3.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-[#b45309]">
                <span>{lang === "tr" ? "İklim Senaryosu" : "Climate Scenario"}</span>
                <TermTooltip termId="et0" />
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
                    subTr: "Tarihsel seri",
                    en: "Typical Climate",
                    subEn: "Historical series",
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

        </div>
      </div>

      <div id="field-shift-sonuclar" className="fieldshift-decision-results" aria-busy={running}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="display text-[24px] text-ink">
            {tr ? "Su bütçene hangi plan uyuyor?" : "Which plan fits your water budget?"}
          </h2>
          <p role="status" data-testid="comparison-status-bar" className="text-sm text-ink-2">
            {!store.field ? (tr ? "Başlamak için bir tarla seç." : "Select a field to get started.")
              : error ? (tr ? "Analiz yüklenemedi." : "Could not load the analysis.")
              : !currentResults ? (tr ? "Planlar hesaplanıyor…" : "Calculating plans…")
              : tr ? `${totalWindows} tarihsel dönem` : `${totalWindows} historical periods`}
          </p>
        </div>

        {error && store.field && (
          <button className="btn min-h-11" type="button" onClick={onRetry}>
            {tr ? "Yeniden dene" : "Try again"}
          </button>
        )}
        {currentResults && (
          <>
            {noBudgetFit && (
              <p data-testid="all-plans-exceed-budget-alert" className="rounded-lg border border-line bg-bg p-3 text-sm font-semibold text-ink">
                {tr ? "Gösterilen her planda bütçenin yetmediği dönemler var." : "Every displayed plan has periods when the budget fell short."}
              </p>
            )}
            {budgetNetMm > 0 && withoutExceedance.length > 0 && (
              <p className="text-sm text-ink-2">
                {tr ? "Tüm dönemlerde bütçeye uyan: " : "Within budget in every period: "}
                <strong>{withoutExceedance.map((entry) => tr ? entry.badgeTr : entry.badgeEn).join(", ")}</strong>
              </p>
            )}
            <div className="fieldshift-decision-plans">
              {comparedPlans.map(({ role, plan, badgeTr, badgeEn }) => {
                const years = plan.years.map((year) => evaluateYearBudgetStatus(year, budgetNetMm, totalWindows, lang));
                const exceedingYears = years.filter((year) => year.exceeded);
                const status = exceedingYears.length
                  ? (tr ? `Aşım: ${exceedingYears.map((year) => `${year.year}. yıl`).join(", ")}`
                    : `Over budget: ${exceedingYears.map((year) => `Year ${year.year}`).join(", ")}`)
                  : plan.water.budgetExceededShare == null
                    ? (tr ? "Veri yok" : "No data")
                    : budgetNetMm === 0 ? (tr ? "Kuru tarım" : "Rainfed")
                      : (tr ? "Bütçe aşımı yok" : "No budget exceedance");
                return (
                  <article key={role} data-testid={`comparison-card-${role}`}
                    data-budget-fit={budgetNetMm > 0 && plan.water.budgetExceededShare === 0}
                    className="fieldshift-decision-plan min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="display text-xl text-ink">{tr ? badgeTr : badgeEn}</h3>
                      <span data-testid={`plan-budget-badge-${role}`} className="text-xs font-semibold text-ink-2">{status}</span>
                    </div>
                    <ol className="mt-3 divide-y divide-line rounded-lg border border-line bg-surface">
                      {years.map((year) => (
                        <li key={year.year} data-testid={`plan-${role}-year-${year.year}`}
                          className="flex flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-2 text-sm">
                          <span className="min-w-10 text-xs text-ink-2">{tr ? `${year.year}. yıl` : `Year ${year.year}`}</span>
                          <CropArt crop={year.cropId} size={24} />
                          <span className="flex-1 font-medium">{year.cropName}</span>
                          <span className="text-xs text-ink-2">
                            {year.exceeded
                              ? (tr ? `${year.exceededWindows}/${totalWindows} dönemde aşım` : `Shortfall in ${year.exceededWindows}/${totalWindows} periods`)
                              : year.statusBadge}
                          </span>
                        </li>
                      ))}
                    </ol>
                    <dl className="mt-3 divide-y divide-line text-sm">
                      {[
                        [tr ? "Yıllık net su ihtiyacı" : "Annual net irrigation need", formatMm(plan.water.requirementMmPerYr?.p50)],
                        [tr ? "Yıllık kalan su açığı" : "Annual unmet water deficit", formatMm(plan.water.unmetDeficitMmPerYr?.p50)],
                        [tr ? "Toprak sağlığı göstergesi" : "Soil health indicator", `${n(plan.soilHealth.score, 0)}/100`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2 py-2">
                          <dt className="text-ink-2">{label}</dt><dd className="shrink-0 font-semibold">{value}</dd>
                        </div>
                      ))}
                    </dl>
                    <details className="mt-2 rounded-lg border border-line bg-surface">
                      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">
                        {tr ? "Planın gerekçesi" : "Plan rationale"}
                      </summary>
                      <div className="space-y-2 border-t border-line px-3 py-3 text-sm text-ink-2">
                        <ul className="space-y-2">
                          {years.map((year) => <li key={year.year}>{year.reasonText}</li>)}
                        </ul>
                        <p>{tr ? "Toprak sağlığı puanı ekim nöbetinden hesaplanan model göstergesidir." : "The soil health score is a model indicator derived from the rotation."}</p>
                      </div>
                    </details>
                    {role !== "current" && (
                      <button type="button" className="btn mt-3 min-h-11 w-full justify-center"
                        onClick={() => setInputs({ rotation: [...plan.crops] })}>
                        {tr ? "Mevcut plan olarak kullan" : "Use as current plan"}
                      </button>
                    )}
                  </article>
                );
              })}
            </div>
            {validAlternatives.length < 2 && (
              <p data-testid="honest-missing-alternative-notice" className="text-sm text-ink-2">
                {tr ? "Bu koşullarda iki geçerli alternatif bulunamadı." : "Fewer than two alternatives satisfy these conditions."}
              </p>
            )}
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-bg/50 p-3 text-sm">
          <p className="text-ink-2">
            {tr ? "Yağış: NASA POWER" : "Rainfall: NASA POWER"}
            {scenarioPreset === "typical" ? (tr ? " · Tipik senaryo" : " · Typical scenario")
              : ` · ×${n(store.scenario.rainMultiplier, 2)} · ΔT ${n(store.scenario.tempDeltaC, 1)} °C`}
            {currentResults && agYears.length > 0 && ` · ${agYears[0]}–${agYears.at(-1)}`}
          </p>
          <div className="flex flex-wrap gap-2">
            {onJumpToMap && <button type="button" className="btn min-h-11" onClick={onJumpToMap}>{tr ? "Harita" : "Map"}</button>}
            {onJumpToProfitability && <button type="button" className="btn min-h-11" onClick={onJumpToProfitability}>{tr ? "Ekonomik senaryo" : "Economic scenario"}</button>}
            {onJumpToFormulas
              ? <button type="button" className="btn min-h-11" onClick={onJumpToFormulas}>{tr ? "Veri ve yöntem" : "Data and methods"}</button>
              : <Link href="/dayanak" className="btn min-h-11">{tr ? "Veri ve yöntem" : "Data and methods"}</Link>}
          </div>
        </div>
      </div>
      </>}
    </section>
  );
}
