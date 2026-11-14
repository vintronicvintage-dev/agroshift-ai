"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { CROPS } from "@/lib/crops/database";
import type { AnalysisResult, LocalizedText, PlanResult } from "@/lib/types";
import { IMAGES } from "@/lib/ui/images";
import { Icon } from "@/components/ui/Icons";

/**
 * Interactive Scientific Evidence & Calculation Foundations Section ("Kanıtlar, Formüller ve Hesaplama Dayanakları").
 * Surfaces live parcel inputs, exact mathematical equations, mass-balance verification, and primary literature citations
 * directly on the main dashboard.
 */
export function EvidenceFoundations({
  res,
  best,
  currentPlan,
  lang,
  n,
  L,
}: {
  res: AnalysisResult;
  best: PlanResult;
  currentPlan: PlanResult;
  lang: "tr" | "en";
  n: (v: number, d?: number) => string;
  L: (v: LocalizedText) => string;
}) {
  const [activeTab, setActiveTab] = useState<"chain" | "assumptions" | "sources">("chain");

  return (
    <section
      id="kanit-ve-dayanaklar"
      aria-label={lang === "tr" ? "Kanıtlar, Formüller ve Hesaplama Dayanakları" : "Evidence, Formulas & Calculation Foundations"}
      className="bento-card overflow-hidden p-5 sm:p-6"
    >
      {/* Section Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
        <div className="flex items-start gap-3">
          <div className="relative hidden size-14 shrink-0 overflow-hidden rounded-2xl border border-line sm:block">
            <Image
              src={IMAGES.gsEvidence.src}
              alt={L(IMAGES.gsEvidence.alt)}
              fill
              sizes="56px"
              placeholder="blur"
              blurDataURL={IMAGES.gsEvidence.blurDataURL}
              className="object-cover"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1e6b34]">
                {lang === "tr" ? "Canlı Hesaplama İzlenebilirliği" : "Live Calculation Traceability"}
              </span>
              {best.confidence && (
                <span className="rounded-full border border-[#86efac] bg-[#f0fdf4] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#14532d]">
                  {lang === "tr"
                    ? `Model Güven Derecesi: ${best.confidence.grade} (${n(best.confidence.score, 0)}/100)`
                    : `Confidence Grade: ${best.confidence.grade} (${n(best.confidence.score, 0)}/100)`}
                </span>
              )}
              <span className="rounded-full border border-line bg-bg px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
                {lang === "tr"
                  ? `Su Kütle Dengesi Hatası: ${n(best.water.massBalanceMaxErrorMm ?? 0, 4)} mm`
                  : `Mass Balance Error: ${n(best.water.massBalanceMaxErrorMm ?? 0, 4)} mm`}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-[20px] font-semibold text-ink sm:text-[22px]">
              {lang === "tr"
                ? "Kanıtlar, Formüller ve Hesaplama Dayanakları"
                : "Scientific Evidence, Formulas & Calculation Foundations"}
            </h2>
            <p className="mt-0.5 text-[13px] text-ink-2">
              {lang === "tr"
                ? "Ekrandaki her verim, su ve kâr sayısı; arazinizin gerçek uydu/toprak girdileriyle aşağıdaki 6 bilimsel denklem zincirinden canlı hesaplanır."
                : "Every yield, water, and profit figure on screen is computed live from your parcel's satellite/soil telemetry through the 6-step scientific equation chain below."}
            </p>
          </div>
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: "chain", tr: "6 Adımlı Hesaplama Zinciri", en: "6-Step Calculation Chain" },
              { id: "assumptions", tr: `Varsayımlar (${res.assumptions.length})`, en: `Assumptions (${res.assumptions.length})` },
              { id: "sources", tr: `Bilimsel Kaynaklar (${res.methodSources.length})`, en: `Primary Sources (${res.methodSources.length})` },
            ] as const
          ).map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setActiveTab(tb.id)}
              className={`rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                activeTab === tb.id
                  ? "bg-accent text-on-accent shadow-sm"
                  : "border border-line bg-bg text-ink-2 hover:text-ink"
              }`}
            >
              {lang === "tr" ? tb.tr : tb.en}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: 6-Step Live Calculation & Formula Cards */}
      {activeTab === "chain" && (
        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* STEP 1: FAO-56 Penman-Monteith Climate & ET0 */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e0f2fe] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0277bd]">
                  1. {lang === "tr" ? "İklim & Buharlaşma (FAO-56)" : "Climate & ET₀ (FAO-56)"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">NASA POWER</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "Penman–Monteith Referans ET₀ ve Yağış Serisi"
                  : "Penman–Monteith Reference ET₀ & Rainfall"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                ET₀ = [0.408Δ(Rₙ−G) + γ(900/(T+273))u₂(eₛ−eₐ)] / [Δ + γ(1+0.34u₂)]
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Veri Dönemi / Tam Yıl:" : "Record / Complete Years:"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {res.climate.period.start.slice(0, 4)}–{res.climate.period.end.slice(0, 4)} ({res.climate.completeYears.length} yıl · {n(res.climate.quality.totalDays, 0)} gün)
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Yıllık Ortalama Yağış (P):" : "Mean Annual Rain (P):"}</dt>
                  <dd className="font-mono font-semibold text-[#0277bd]">
                    {n(res.climate.meanAnnualPrecipMm ?? 0, 0)} mm/yıl
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Yıllık Referans ET₀:" : "Mean Annual ET₀:"}</dt>
                  <dd className="font-mono font-semibold text-[#c0392b]">
                    {n(res.climate.meanAnnualEt0Mm ?? 0, 0)} mm/yıl ({n(res.climate.quality.et0PenmanMonteithDays, 0)} PM gün)
                  </dd>
                </div>
                {res.terrain && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "Rakım Lapse Düzeltmesi:" : "Elevation Lapse:"}</dt>
                    <dd className="font-mono font-semibold text-ink">
                      {n(res.terrain.siteElevation, 0)} m ({res.terrain.lapseDeltaC >= 0 ? "+" : ""}{n(res.terrain.lapseDeltaC, 2)} °C)
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: Allen et al. (1998) FAO-56 Eq. 6–40 · NASA LaRC POWER MERRA-2
            </p>
          </article>

          {/* STEP 2: Soil Hydraulics (Saxton & Rawls 2006 + SoilGrids) */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fef3c7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#8a521b]">
                  2. {lang === "tr" ? "Toprak Hidroliği (Pedotransfer)" : "Soil Hydraulics (PTF)"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">SoilGrids 250m</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "Saxton & Rawls (2006) Su Tutma ve SCS-CN Akış"
                  : "Saxton & Rawls (2006) Water Retention & SCS-CN"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                TAW = 1000 × (θ_FC − θ_WP) × Z_r × (1 − CFVO) · Q = (P − 0.2S)² / (P + 0.8S)
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Solma (θ_WP) / Tarla Kap. (θ_FC):" : "Wilting (θ_WP) / Field Cap. (θ_FC):"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    %{n(res.soil.thetaWP * 100, 1)} / %{n(res.soil.thetaFC * 100, 1)} (θ_Sat %{n(res.soil.thetaSat * 100, 1)})
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Kullanılabilir Su (TAW):" : "Available Water (TAW):"}</dt>
                  <dd className="font-mono font-semibold text-[#1e6b34]">
                    {n(res.soil.tawMmPerM, 0)} mm/m · 1,5m kolon: {n(res.soil.tawColumnMm ?? res.soil.tawMmPerM * 1.5, 0)} mm
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Doygun İletkenlik (K_sat):" : "Saturated Cond. (K_sat):"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {n(res.soil.ksatMmH, 1)} mm/saat (Grup {res.soil.hydrologicGroup})
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Eğri Numarası (CN_II Tahıl/Çapa):" : "Curve Number (CN_II Grain/Row):"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {n(res.soil.curveNumbers.small_grain, 0)} / {n(res.soil.curveNumbers.row, 0)} (Çıplak: {n(res.soil.curveNumbers.bare, 0)})
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: Saxton & Rawls (2006) SSSAJ 70:1569 · USDA TR-55 · ISRIC SoilGrids
            </p>
          </article>

          {/* STEP 3: FAO-33/66 Stewart Water-Yield Response */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e6f4ea] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1e6b34]">
                  3. {lang === "tr" ? "Su-Verim Tepkisi (FAO-33/66)" : "Water-Yield Response (FAO-33/66)"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">Stewart & French-Schultz</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "Günlük Kök Su Stresi (Ks) ve Verim Kısıtı"
                  : "Daily Root Water Stress (Ks) & Yield Reduction"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                1 − (Yₐ / Yₘ) = Kᵧ × (1 − ETₐ / ETc) · Y = Yₘ × (Yₐ/Yₘ) × f_önBitki
              </div>
              <div className="mt-3 space-y-1.5 text-[12px]">
                {best.years.map((y, idx) => {
                  const def = CROPS[y.cropId];
                  const ky = def.agronomy?.ky.value ?? 1;
                  const ymKgDa = Math.round((y.ymTHa ?? def.refYieldTHa.value.irrigated) * 100);
                  const yaKgDa = Math.round((y.yieldTHa?.p50 ?? 0) * 100);
                  const ratioPct = Math.round((y.yieldRatio?.p50 ?? 0) * 100);
                  const preF = y.preCropFactor ?? 1;
                  return (
                    <div key={idx} className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1">
                      <span className="font-medium text-ink">
                        {idx + 1}. {L(def.name)} (Kᵧ={ky})
                      </span>
                      <span className="font-mono text-[11.5px] font-semibold text-[#1e6b34]">
                        {y.cropId === "fallow"
                          ? "Nadas"
                          : `Yₘ ${ymKgDa} × %${ratioPct} × ${n(preF, 2)} = ${yaKgDa} kg/da`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: Doorenbos & Kassam (1979) FAO-33 · Steduto et al. (2012) FAO-66
            </p>
          </article>

          {/* STEP 4: Economic Gross Margin & Legume Nitrogen Credit */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fef3c7] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#b45309]">
                  4. {lang === "tr" ? "Ekonomik Kazanç Denklemi" : "Economic Margin Equation"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">TMO / Borsa 2025–26</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "Gelir, Sulama Şiddeti Maliyeti ve Azot Kredisi"
                  : "Revenue, Irrigation Cost Factor & N Credit"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                Kâr = (Y_kg/da × Fiyat) − Maliyet×(0.6+0.4s) + N_Tasarruf − (I_net/η)×Su_₺
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Önerilen Plan Yıllık Kâr (P50):" : "Recommended Annual Margin (P50):"}</dt>
                  <dd className="font-mono font-semibold text-[#1e6b34]">
                    +{n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} TL/da/yıl
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Mevcut Plan Yıllık Kâr (P50):" : "Current Plan Annual Margin (P50):"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {n(currentPlan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} TL/da/yıl
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "P10 (Kurak) – P90 (Yağışlı) Bandı:" : "P10 (Dry) – P90 (Wet) Band:"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {n(best.economics.grossMarginTLPerDaPerYr?.p10 ?? 0, 0)} … {n(best.economics.grossMarginTLPerDaPerYr?.p90 ?? 0, 0)} TL/da
                  </dd>
                </div>
                {best.waterProductivity && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "Su Üretkenliği (Gelir / m³ Su):" : "Water Productivity (TL / m³):"}</dt>
                    <dd className="font-mono font-semibold text-[#0277bd]">
                      {n(best.waterProductivity.revenueTLPerM3.p50, 1)} TL/m³
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: TMO / Trakya Birlik / Türkşeker 2025–26 · Angus et al. (2015)
            </p>
          </article>

          {/* STEP 5: Soil Health, Biological Nitrogen Balance & RUSLE Erosion */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e6f4ea] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#1e6b34]">
                  5. {lang === "tr" ? "Toprak Sağlığı, Azot & RUSLE" : "Soil Health, N & RUSLE"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">USDA AH-703</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "6 Bileşenli Toprak İndeksi ve RUSLE Erozyon"
                  : "6-Component Soil Index & RUSLE Soil Loss"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                A = R · K · LS · C · P (t/ha/yıl) · ΔN = N_fiksasyon − N_hasat (kg N/ha/yıl)
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Toprak Sağlığı (Önerilen vs Mevcut):" : "Soil Health (Rec. vs Current):"}</dt>
                  <dd className="font-mono font-semibold text-[#1e6b34]">
                    {n(best.soilHealth.score, 0)}/100 vs {n(currentPlan.soilHealth.score, 0)}/100
                  </dd>
                </div>
                {best.nitrogen && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "Biyolojik N Fiksasyonu / Kaldırılan:" : "Legume N Fixation / Removal:"}</dt>
                    <dd className="font-mono font-semibold text-ink">
                      +{n(best.nitrogen.fixationKgHaYr.low, 0)}…{n(best.nitrogen.fixationKgHaYr.high, 0)} / −{n(best.nitrogen.removalKgHaYr.low, 0)} kg/ha
                    </dd>
                  </div>
                )}
                {best.erosion && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "RUSLE K / Örtü C / Kayıp A:" : "RUSLE K / Cover C / Loss A:"}</dt>
                    <dd className="font-mono font-semibold text-ink">
                      K={n(best.erosion.kFactor, 3)} · C={n(best.erosion.cFactor, 3)}
                      {best.erosion.aTHaYr != null ? ` · A=${n(best.erosion.aTHaYr, 2)} t/ha` : ""}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Yıllık Çıplak Toprak Günü:" : "Bare Soil Days / Year:"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {n(best.soilHealth.bareDaysPerYear, 0)} gün/yıl
                  </dd>
                </div>
              </dl>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: Renard et al. (1997) RUSLE · Herridge et al. (2008) Plant Soil
            </p>
          </article>

          {/* STEP 6: Multi-Criteria Optimization, Sensitivity Sweep & Pareto Knee */}
          <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/65 p-4">
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e0f2fe] px-2.5 py-1 font-mono text-[11px] font-semibold text-[#0277bd]">
                  6. {lang === "tr" ? "Çok Kriterli Karar & Duyarlılık" : "Multi-Criteria & Sensitivity"}
                </span>
                <span className="font-mono text-[11px] text-ink-2">TOPSIS / Pareto</span>
              </div>
              <h3 className="mt-2.5 font-display text-[16px] font-semibold text-ink">
                {lang === "tr"
                  ? "1.728 Rotasyon Taraması ve ±%20 Kararlılık Testi"
                  : "1,728-Sequence Search & ±20% Stability Sweep"}
              </h3>
              <div className="mt-2 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] text-ink">
                Skor = 100 × Σ wᵢ·Sᵢ (Su: %{Math.round(best.score.components.water * 100)}, Gelir: %{Math.round(best.score.components.income * 100)}, Toprak: %{Math.round(best.score.components.soil * 100)}, Risk: %{Math.round(best.score.components.risk * 100)})
              </div>
              <dl className="mt-3 space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Taranan / Uygun / Tam Simüle:" : "Enumerated / Feasible / Exact:"}</dt>
                  <dd className="font-mono font-semibold text-ink">
                    {res.optimizer.enumerated} → {res.optimizer.feasible} → {res.optimizer.replayedExactly} plan
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-2">{lang === "tr" ? "Bileşik Uyum Puanı:" : "Composite Score:"}</dt>
                  <dd className="font-mono font-semibold text-[#1e6b34]">
                    {n(best.score.composite, 1)} / 100 (Pareto cephesi: {res.pareto.length} plan)
                  </dd>
                </div>
                {best.stability && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "±%20 Duyarlılıkta İlk 3 Payı:" : "±20% Sensitivity Top-3 Share:"}</dt>
                    <dd className="font-mono font-semibold text-[#1e6b34]">
                      %{Math.round(best.stability.top3Share * 100)} ({best.stability.runs} pertürbasyon koşusu)
                    </dd>
                  </div>
                )}
                {best.robust && (
                  <div className="flex items-center justify-between">
                    <dt className="text-ink-2">{lang === "tr" ? "En Kötü %20 Dönem Kârı (CVaR₂₀):" : "Worst 20% Window Margin (CVaR₂₀):"}</dt>
                    <dd className="font-mono font-semibold text-ink">
                      {n(best.robust.cvar20MarginTLPerDaPerYr, 0)} TL/da/yıl
                    </dd>
                  </div>
                )}
              </dl>
            </div>
            <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
              Kaynak: Zeleny (1973) Compromise Programming · Mann (1945) & Sen (1968)
            </p>
          </article>
        </div>
      )}

      {/* TAB 2: Explicit Model Assumptions Table */}
      {activeTab === "assumptions" && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-bg/90 text-[11.5px] font-semibold text-ink-2">
              <tr>
                <th className="px-3.5 py-2.5">{lang === "tr" ? "Parametre / Varsayım" : "Parameter / Assumption"}</th>
                <th className="px-3.5 py-2.5">{lang === "tr" ? "Kullanılan Değer" : "Active Value"}</th>
                <th className="px-3.5 py-2.5">{lang === "tr" ? "Dayanak / Kaynak" : "Source / Basis"}</th>
                <th className="px-3.5 py-2.5">{lang === "tr" ? "Sınıf" : "Class"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {res.assumptions.map((a) => (
                <tr key={a.key} className="hover:bg-bg/50">
                  <td className="px-3.5 py-2.5 font-medium text-ink">{L(a.label)}</td>
                  <td className="px-3.5 py-2.5 font-mono text-ink">{a.value}</td>
                  <td className="px-3.5 py-2.5 text-ink-2">{a.source}</td>
                  <td className="px-3.5 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[10.5px] font-semibold ${
                        a.confidence === "literature"
                          ? "bg-[#e6f4ea] text-[#1e6b34]"
                          : "bg-[#fef3c7] text-[#b45309]"
                      }`}
                    >
                      {a.confidence === "literature"
                        ? lang === "tr" ? "Literatür" : "Literature"
                        : lang === "tr" ? "Mühendislik Varsayımı" : "Assumption"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: Primary Literature & Data Sources */}
      {activeTab === "sources" && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {res.methodSources.map((ms) => (
            <div key={ms.id} className="flex flex-col justify-between rounded-xl border border-line bg-bg/65 p-3.5">
              <div>
                <span className="rounded bg-[#e6f4ea] px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#1e6b34]">
                  {ms.id}
                </span>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink">{ms.citation}</p>
              </div>
              {ms.url && (
                <a
                  href={ms.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-accent-ink hover:underline"
                >
                  <span>{ms.url}</span>
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bottom Action Strip */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5 text-[12.5px]">
        <p className="text-ink-2">{L(res.disclaimer)}</p>
        <div className="flex items-center gap-2">
          <Link href="/dayanak" className="btn btn-sm">
            <Icon name="evidence" size={15} />
            <span>{lang === "tr" ? "Tam Kanıt Raporu (/dayanak)" : "Full Evidence Page (/dayanak)"}</span>
          </Link>
          <Link href="/yontem" className="btn btn-sm">
            <Icon name="methods" size={15} />
            <span>{lang === "tr" ? "Metodoloji (/yontem)" : "Methodology (/yontem)"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
