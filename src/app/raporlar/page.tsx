"use client";

import { Download, Printer } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROPS } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, useStore } from "@/lib/ui/fieldStore";

export default function ReportsPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const best = result?.alternatives[0] ?? null;
  const current = result?.current ?? null;

  const handleDownloadJson = () => {
    if (!result || !store.field) return;
    const payload = {
      generatedAt: new Date().toISOString(),
      field: store.field,
      budgetMm: store.inputs.rainfed ? 0 : store.inputs.budget,
      scenario: store.scenario,
      current: result.current,
      alternatives: result.alternatives.slice(0, 2),
      sources: result.methodSources,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agroshift-rapor-${store.field.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1200px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "Dışa Aktarma ve Arşiv" : "Export & Archive"}
          title={tr ? "Analiz Raporları ve PDF Çıktısı" : "Analysis Reports & PDF Export"}
          description={
            tr
              ? "Aktif parseliniz için oluşturulan 3 yıllık ekim nöbeti, su bütçesi ve bilimsel dayanak özetini yazdırın veya JSON olarak dışa aktarın."
              : "Print as PDF or export JSON summaries of your 3-year crop rotation, water budget, and scientific evidence."
          }
          badge={<ProvenanceBadge kind="model" />}
          actions={
            <div className="no-print flex flex-wrap gap-2">
              <button type="button" onClick={() => window.print()} className="btn btn-primary" disabled={!result}>
                <Printer className="size-4" />
                {tr ? "PDF Olarak Yazdır" : "Print / Save PDF"}
              </button>
              <button type="button" onClick={handleDownloadJson} className="btn" disabled={!result}>
                <Download className="size-4" />
                {tr ? "JSON İndir" : "Download JSON"}
              </button>
            </div>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        {result && store.field && (
          <SectionCard
            title={`${store.field.name} — ${tr ? "Özet Tarla Raporu" : "Summary Field Report"}`}
            subtitle={`${store.inputs.rainfed ? 0 : store.inputs.budget} mm/yıl · ${store.scenario.preset}`}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-bg p-4">
                <div className="text-[12px] font-semibold text-ink-2">{tr ? "Mevcut Ekim Nöbeti" : "Current Rotation"}</div>
                <div className="mt-1 font-display text-[17px] font-bold">
                  {current?.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ")}
                </div>
                <div className="mt-2 text-[13px] text-ink-2">
                  {tr ? "Su Açığı (P50):" : "Unmet Deficit (P50):"} +{n(current?.water.unmetDeficitMmPerYr?.p50 ?? 0, 0)} mm/yıl ·{" "}
                  {tr ? "Brüt Kâr:" : "Margin:"} {n(current?.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} ₺/da
                </div>
              </div>
              {best && (
                <div className="rounded-xl border border-[#397A42]/40 bg-[#EBF4ED] p-4">
                  <div className="text-[12px] font-semibold text-[#123D2A]">{tr ? "Önerilen Alternatif 1" : "Recommended Alternative 1"}</div>
                  <div className="mt-1 font-display text-[17px] font-bold text-[#123D2A]">
                    {best.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ")}
                  </div>
                  <div className="mt-2 text-[13px] text-[#17251B]">
                    {tr ? "Su Açığı (P50):" : "Unmet Deficit (P50):"} +{n(best.water.unmetDeficitMmPerYr?.p50 ?? 0, 0)} mm/yıl ·{" "}
                    {tr ? "Brüt Kâr:" : "Margin:"} {n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} ₺/da
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>
    </AppShell>
  );
}
