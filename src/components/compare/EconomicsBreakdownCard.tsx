"use client";

import { useI18n } from "@/lib/i18n";
import { computePlanEconomics } from "@/lib/physics/economics";
import type { PlanResult } from "@/lib/types";

export function EconomicsBreakdownCard({ plan }: { plan: PlanResult }) {
  const { lang, n } = useI18n();
  const eco = computePlanEconomics(plan);
  const tr = lang === "tr";

  return (
    <section className="mt-4 break-inside-avoid rounded-xl border border-rule bg-paper p-3.5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule/70 pb-2">
        <h4 className="text-[0.95rem] font-semibold text-ink">
          {tr ? "Ekonomik Net Getiri ve Su Verimliliği (TMO Referans)" : "Economic Net Return & Water Productivity (TMO Ref.)"}
        </h4>
        <span className="text-[11px] text-ink-2 tabular-nums">
          {eco.referenceDate} · {tr ? "Üre %46 N bazlı" : "Urea 46% N basis"}
        </span>
      </div>

      <dl className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="rounded-lg border border-rule/70 bg-panel px-3 py-2">
          <dt className="text-xs text-ink-2">
            {tr ? "Beklenen yıllık net kâr" : "Expected annual net profit"}
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-ink tabular-nums">
            {n(eco.expectedAnnualNetProfitTLPerDa, 0)}{" "}
            <span className="text-xs font-normal text-ink-2">TL/da/{tr ? "yıl" : "yr"}</span>
          </dd>
        </div>

        <div className="rounded-lg border border-rule/70 bg-panel px-3 py-2">
          <dt className="text-xs text-ink-2">
            {tr ? "Baklagil N kredisi gübre tasarrufu" : "Legume N-credit fertilizer saving"}
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-[var(--c-green)] tabular-nums">
            {n(eco.legumeNitrogenSavingTLPerDa, 0)}{" "}
            <span className="text-xs font-normal text-ink-2">TL/da/{tr ? "yıl" : "yr"}</span>
          </dd>
          <p className="mt-0.5 text-[11px] text-ink-2 tabular-nums">
            {eco.ureaEquivalentKgPerDaYr > 0
              ? tr
                ? `≈ ${n(eco.ureaEquivalentKgPerDaYr, 1)} kg Üre/da/yıl (3 yıl: ${n(eco.legumeNitrogenSaving3YrTLPerDa, 0)} TL/da)`
                : `≈ ${n(eco.ureaEquivalentKgPerDaYr, 1)} kg Urea/da/yr (3-yr: ${n(eco.legumeNitrogenSaving3YrTLPerDa, 0)} TL/da)`
              : tr
                ? "Baklagil azot kredisi yok"
                : "No legume N credit"}
          </p>
        </div>

        <div className="rounded-lg border border-rule/70 bg-panel px-3 py-2">
          <dt className="text-xs text-ink-2">
            {tr ? "Su verimliliği (sulama suyu)" : "Water productivity (irrigation)"}
          </dt>
          <dd className="mt-0.5 text-base font-semibold text-sky tabular-nums">
            {eco.waterProductivityTLPerM3 !== null ? (
              <>
                {n(eco.waterProductivityTLPerM3, 2)}{" "}
                <span className="text-xs font-normal text-ink-2">TL/m³</span>
              </>
            ) : (
              <span className="text-sm font-medium text-ink-2">
                {tr ? "Kuru tarım (0 m³ sulama)" : "Rainfed (0 m³ irrigation)"}
              </span>
            )}
          </dd>
          {eco.irrigationM3PerDaYr > 0 && (
            <p className="mt-0.5 text-[11px] text-ink-2 tabular-nums">
              {tr
                ? `Ortalama sulama: ${n(eco.irrigationM3PerDaYr, 0)} m³/da/yıl`
                : `Mean irrigation: ${n(eco.irrigationM3PerDaYr, 0)} m³/da/yr`}
            </p>
          )}
        </div>
      </dl>

      <p className="mt-2 text-[11px] text-ink-2">
        {eco.sourceSummary}
      </p>
    </section>
  );
}
