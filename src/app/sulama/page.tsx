"use client";

import Link from "next/link";
import { ArrowRight, Droplets } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard, StatCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { useI18n } from "@/lib/i18n";
import { METHOD_EFF, pilotField, setField, setInputs, useStore, type IrrigationMethod } from "@/lib/ui/fieldStore";

export default function IrrigationManagementPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const best = result?.alternatives[0] ?? result?.current ?? null;
  const current = result?.current ?? null;
  const budgetNet = store.inputs.rainfed ? 0 : store.inputs.budget;
  const eff = METHOD_EFF[store.inputs.method];
  const grossBudgetM3Da = Math.round(budgetNet / eff);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "FAO-56 Günlük Su Dengesi" : "FAO-56 Daily Water Balance"}
          title={tr ? "Sulama Yönetimi ve Su Bütçesi" : "Irrigation Management & Water Budget"}
          description={
            tr
              ? "Yıllık sulama bütçenizi, sulama yönteminizin tarla randımanını ve 3 yıllık aylık su dağıtım takvimini yönetin."
              : "Manage your annual irrigation budget, application efficiency, and 3-year monthly irrigation schedule."
          }
          badge={<ProvenanceBadge kind="model" label={tr ? "FAO-56 Su Dengesi" : "FAO-56 Water Balance"} />}
          actions={
            <Link href="/plan" className="btn btn-primary">
              {tr ? "Planları Karşılaştır" : "Compare Plans"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tr ? "Net Sulama Bütçesi" : "Net Irrigation Budget"}
            value={budgetNet}
            unit="mm/yıl"
            sub={tr ? `${budgetNet} m³/da·yıl net` : `${budgetNet} m³/da·yr net`}
            icon={<Droplets className="size-4" />}
          />
          <StatCard
            label={tr ? "Brüt Su Çekimi (Kuyu/Kanal)" : "Gross Withdrawal"}
            value={grossBudgetM3Da}
            unit="m³/da·yıl"
            sub={tr ? `Randıman: %${Math.round(eff * 100)}` : `Efficiency: ${Math.round(eff * 100)}%`}
          />
          <StatCard
            label={tr ? "Önerilen Plan İhtiyacı" : "Recommended Plan Demand"}
            value={best ? Math.round(best.water.irrigationNetMmPerYr?.p50 ?? 0) : "—"}
            unit={best ? "mm/yıl" : undefined}
            sub={current ? `${tr ? "Mevcut:" : "Current:"} ${Math.round(current.water.irrigationNetMmPerYr?.p50 ?? 0)} mm` : undefined}
            provenance="model"
          />
          <StatCard
            label={tr ? "Karşılanamayan Su Açığı (P50)" : "Unmet Water Deficit (P50)"}
            value={best ? Math.round(best.water.unmetDeficitMmPerYr?.p50 ?? 0) : "—"}
            unit={best ? "mm/yıl" : undefined}
            tone={best && (best.water.unmetDeficitMmPerYr?.p50 ?? 0) > 20 ? "warn" : "good"}
            provenance="scenario"
          />
        </div>

        {/* Interactive Controls */}
        <div className="grid gap-6 lg:grid-cols-12">
          <SectionCard
            className="lg:col-span-5"
            title={tr ? "Sulama Bütçesi ve Yöntem" : "Irrigation Budget & Method"}
            subtitle={tr ? "Değişiklikler tüm planları anında yeniden hesaplar." : "Changes immediately recompute all rotations."}
          >
            <div className="space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-[13px] font-medium">
                  <span>{tr ? "Yıllık Net Bütçe" : "Annual Net Budget"}</span>
                  <span className="font-display font-bold text-[#123D2A]">{budgetNet} mm/yıl</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={600}
                  step={10}
                  value={budgetNet}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setInputs({ rainfed: val === 0, budget: val });
                  }}
                  className="w-full accent-[#123D2A]"
                />
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[0, 80, 150, 250, 450].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setInputs({ rainfed: v === 0, budget: v })}
                      className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${
                        budgetNet === v
                          ? "border-[#123D2A] bg-[#123D2A] text-white"
                          : "border-line bg-bg text-ink hover:border-[#397A42]"
                      }`}
                    >
                      {v === 0 ? (tr ? "0 mm (Kuru)" : "0 mm (Rainfed)") : `${v} mm`}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-medium">{tr ? "Sulama Yöntemi (Randıman)" : "Irrigation Method (Efficiency)"}</div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: "flood", tr: "Salma (%55)", en: "Flood (55%)" },
                      { id: "sprinkler", tr: "Yağmurlama (%75)", en: "Sprinkler (75%)" },
                      { id: "drip", tr: "Damla (%90)", en: "Drip (90%)" },
                    ] as { id: IrrigationMethod; tr: string; en: string }[]
                  ).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setInputs({ method: m.id })}
                      className={`rounded-xl border px-2.5 py-2 text-[12.5px] font-semibold transition-colors ${
                        store.inputs.method === m.id
                          ? "border-[#123D2A] bg-[#EBF4ED] text-[#123D2A]"
                          : "border-line bg-bg text-ink hover:border-[#397A42]"
                      }`}
                    >
                      {tr ? m.tr : m.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            className="lg:col-span-7"
            title={tr ? "Aylık Sulama Takvimi (Önerilen Plan)" : "Monthly Irrigation Schedule (Recommended Plan)"}
            subtitle={tr ? "İlk 12 aylık dönem için ortalama aylık su akışı (mm)" : "Mean monthly water flows (mm)"}
          >
            {best?.monthlyDemand ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12.5px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-ink-2">
                      <th className="py-2 pr-3 font-semibold">{tr ? "Yıl / Ay" : "Yr / Mo"}</th>
                      <th className="py-2 pr-3 font-semibold">ETc (mm)</th>
                      <th className="py-2 pr-3 font-semibold">{tr ? "Etkin Yağış" : "Eff. Rain"}</th>
                      <th className="py-2 pr-3 font-semibold">{tr ? "Sulama" : "Irrigation"}</th>
                      <th className="py-2 font-semibold">{tr ? "Su Açığı" : "Deficit"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {best.monthlyDemand.slice(0, 12).map((row) => (
                      <tr key={row.index} className="border-b border-line/60">
                        <td className="py-2 pr-3 font-semibold">
                          {row.year}. Yıl · {row.month}. Ay
                        </td>
                        <td className="py-2 pr-3">{n(row.etcMm, 1)}</td>
                        <td className="py-2 pr-3">{n(row.effectiveRainMm, 1)}</td>
                        <td className="py-2 pr-3 font-semibold text-[#0A689E]">{n(row.irrigationMm, 1)} mm</td>
                        <td className={`py-2 ${row.deficitMm > 10 ? "font-semibold text-bad" : "text-ink-2"}`}>
                          {n(row.deficitMm, 1)} mm
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-2">{tr ? "Aylık su akışı hesaplanıyor..." : "Computing monthly schedule..."}</p>
            )}
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
