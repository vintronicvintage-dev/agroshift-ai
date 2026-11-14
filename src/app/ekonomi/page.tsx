"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Coins } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard, StatCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROPS } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, setStore, useStore } from "@/lib/ui/fieldStore";

export default function EconomyPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const best = result?.alternatives[0] ?? null;
  const current = result?.current ?? null;
  const areaDa = store.field ? (store.inputs.areaOverrideDa ?? store.field.areaDa) : 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "TMO & TÜİK 2025–2026 Referansları" : "TMO & TÜİK 2025–2026 References"}
          title={tr ? "Verim ve Ekonomik Analiz" : "Yield & Economic Analysis"}
          description={
            tr
              ? "3 yıllık brüt kâr projeksiyonu (kira ve destek hariç), sulama suyu maliyeti, azot tasarrufu ve fiyat şoku duyarlılığı. Tüm ekonomik aralıklar senaryo çıktısıdır."
              : "3-year gross margin projection (excluding rent & subsidies), irrigation cost, nitrogen credit, and price sensitivity. All ranges are scenario outputs."
          }
          badge={<ProvenanceBadge kind="scenario" label={tr ? "Senaryo Çıktısı (P10–P90)" : "Scenario Output (P10–P90)"} />}
          actions={
            <Link href="/risk" className="btn btn-primary">
              {tr ? "Risk Simülasyonlarına Geç" : "Risk Scenarios"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tr ? "Önerilen Plan Yıllık Brüt Kâr (P50)" : "Recommended Annual Margin (P50)"}
            value={best ? n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0) : "—"}
            unit={best ? "₺/da·yıl" : undefined}
            sub={best ? `P10–P90: ${n(best.economics.grossMarginTLPerDaPerYr?.p10 ?? 0, 0)}–${n(best.economics.grossMarginTLPerDaPerYr?.p90 ?? 0, 0)} ₺` : undefined}
            provenance="scenario"
            icon={<Coins className="size-4" />}
          />
          <StatCard
            label={tr ? "Mevcut Plan Yıllık Brüt Kâr (P50)" : "Current Annual Margin (P50)"}
            value={current ? n(current.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0) : "—"}
            unit={current ? "₺/da·yıl" : undefined}
            provenance="scenario"
          />
          <StatCard
            label={tr ? "Tarla Toplamı (3 Yıl Önerilen)" : "Whole-Field 3-Year Total"}
            value={best ? n((best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0) * areaDa * 3, 0) : "—"}
            unit={best ? "₺" : undefined}
            sub={store.field ? `${n(areaDa, 0)} da × 3 yıl` : undefined}
            provenance="scenario"
          />
          <StatCard
            label={tr ? "Su Üretkenliği (Gelir / m³)" : "Water Productivity (Rev / m³)"}
            value={best?.waterProductivity?.revenueTLPerM3 ? n(best.waterProductivity.revenueTLPerM3.p50, 1) : "—"}
            unit="₺/m³"
            provenance="model"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <SectionCard
            className="lg:col-span-8"
            title={tr ? "Yıllara Göre Verim ve Kârlılık (Önerilen Plan)" : "Year-by-Year Yield & Margin (Recommended)"}
            subtitle={tr ? "Ürün fiyatı senaryosu: ×" + n(store.scenario.priceMultiplier, 2) : "Price multiplier: ×" + n(store.scenario.priceMultiplier, 2)}
            right={
              <div className="flex items-center gap-1.5">
                {[0.8, 1, 1.2].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() =>
                      setStore({
                        scenario: {
                          ...store.scenario,
                          preset: mult === 1 && store.scenario.rainMultiplier === 1 && store.scenario.tempDeltaC === 0 ? "typical" : "custom",
                          priceMultiplier: mult,
                        },
                      })
                    }
                    className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold ${
                      store.scenario.priceMultiplier === mult
                        ? "border-[#123D2A] bg-[#123D2A] text-white"
                        : "border-line bg-bg text-ink"
                    }`}
                  >
                    {mult === 1 ? (tr ? "Normal Fiyat" : "Base Price") : mult < 1 ? "−20% Fiyat" : "+20% Fiyat"}
                  </button>
                ))}
              </div>
            }
          >
            {best ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] tabular-nums">
                  <thead>
                    <tr className="border-b border-line text-[12px] text-ink-2">
                      <th className="py-2 pr-3 font-semibold">{tr ? "Yıl" : "Year"}</th>
                      <th className="py-2 pr-3 font-semibold">{tr ? "Ürün" : "Crop"}</th>
                      <th className="py-2 pr-3 font-semibold">{tr ? "Tipik Verim (P50)" : "Median Yield"}</th>
                      <th className="py-2 pr-3 font-semibold">{tr ? "Kötü Yıl (P10)" : "Dry Year (P10)"}</th>
                      <th className="py-2 font-semibold">{tr ? "Brüt Kâr (P50)" : "Gross Margin (P50)"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {best.years.map((yr) => {
                      const crop = CROPS[yr.cropId];
                      return (
                        <tr key={yr.year} className="border-b border-line/60">
                          <td className="py-2.5 pr-3 font-semibold">{yr.year}. Yıl</td>
                          <td className="py-2.5 pr-3 font-medium">{tr ? crop.name.tr : crop.name.en}</td>
                          <td className="py-2.5 pr-3">{yr.yieldTHa ? `${n(yr.yieldTHa.p50 * 100, 0)} kg/da` : "—"}</td>
                          <td className="py-2.5 pr-3">{yr.yieldTHa ? `${n(yr.yieldTHa.p10 * 100, 0)} kg/da` : "—"}</td>
                          <td className="py-2.5 font-semibold text-[#123D2A]">
                            {yr.grossMarginTLPerDa ? `${n(yr.grossMarginTLPerDa.p50, 0)} ₺/da` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[13.5px] text-ink-2">{tr ? "Ekonomik veriler yükleniyor..." : "Loading economics..."}</p>
            )}
          </SectionCard>

          <SectionCard className="lg:col-span-4" title={tr ? "Hasat ve Pazar Referansı" : "Harvest & Market Reference"}>
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-line">
              <Image
                src="/images/agro/combine-harvester.png"
                alt={tr ? "Hasat yapan biçerdöver" : "Combine harvester"}
                fill
                sizes="(max-width: 1024px) 100vw, 400px"
                className="object-cover"
              />
            </div>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              {tr
                ? "Hesaplanan brüt kâr; ürün geliri ile tohum, gübre, ilaç, mazot ve brüt sulama suyu maliyetleri arasındaki farkı gösterir. Kira ve devlet destekleri dahil değildir."
                : "Computed gross margin reflects crop revenue minus seed, fertilizer, chemical, fuel, and gross irrigation water costs; land rent and subsidies are excluded."}
            </p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
