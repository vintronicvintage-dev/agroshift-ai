"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard, StatCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROPS } from "@/lib/engine";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, setStore, useStore } from "@/lib/ui/fieldStore";

export default function RiskSimulationsPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const best = result?.alternatives[0] ?? null;

  const scenarios = [
    {
      id: "typical",
      tr: "Tipik İklim (2001–2024)",
      en: "Typical Climate (2001–2024)",
      descTr: "Gözlenen yağış (×1,00) ve sıcaklık (ΔT = 0 °C)",
      descEn: "Observed rainfall (×1.00) and temp (ΔT = 0 °C)",
      apply: () => setStore({ scenario: { preset: "typical", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 } }),
      active: store.scenario.preset === "typical",
    },
    {
      id: "dry",
      tr: "Kurak Senaryo (−%25 Yağış)",
      en: "Drought Scenario (−25% Rain)",
      descTr: "Günlük yağış ×0,75 ile su dengesi simülasyonu",
      descEn: "Daily rainfall ×0.75 water balance replay",
      apply: () => setStore({ scenario: { preset: "dry", rainMultiplier: 0.75, tempDeltaC: 0, priceMultiplier: 1 } }),
      active: store.scenario.preset === "dry",
    },
    {
      id: "hot_dry",
      tr: "Sıcak & Kurak (+2 °C & −%25 Yağış)",
      en: "Hot & Dry (+2 °C & −25% Rain)",
      descTr: "Yağış ×0,75 ve +2 °C ile yeniden hesaplanan ET₀",
      descEn: "Rainfall ×0.75 and +2 °C recomputed ET₀",
      apply: () => setStore({ scenario: { preset: "hot_dry", rainMultiplier: 0.75, tempDeltaC: 2, priceMultiplier: 1 } }),
      active: store.scenario.preset === "hot_dry",
    },
    {
      id: "price_drop",
      tr: "Piyasa Fiyat Düşüşü (−%20)",
      en: "Market Price Drop (−20%)",
      descTr: "Tüm ürün fiyatlarında %20 düşüş şoku",
      descEn: "20% drop across all crop reference prices",
      apply: () => setStore({ scenario: { preset: "custom", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 0.8 } }),
      active: store.scenario.preset === "custom" && store.scenario.priceMultiplier === 0.8,
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "Dayanıklılık ve Stres Testi" : "Resilience & Stress Testing"}
          title={tr ? "Risk Simülasyonları ve Senaryo Karşılaştırması" : "Risk Simulations & Scenario Comparison"}
          description={
            tr
              ? "Kuraklık, aşırı sıcaklık, yağış azalması ve fiyat şokları altında planların su açığı ve kârlılık dayanıklılığını test edin."
              : "Stress-test water deficits and margins under drought, warming, and price shocks."
          }
          badge={<ProvenanceBadge kind="scenario" />}
          actions={
            <Link href="/dayanak" className="btn btn-primary">
              {tr ? "Bilimsel Dayanakları Gör" : "View Scientific Evidence"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scenarios.map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={sc.apply}
              className={`rounded-2xl border p-4 text-left transition-colors ${
                sc.active
                  ? "border-[#123D2A] bg-[#123D2A] text-white"
                  : "border-line bg-surface text-ink hover:border-[#397A42]"
              }`}
            >
              <div className="flex items-center justify-between">
                <ShieldAlert className={`size-4 ${sc.active ? "text-[#A3C75B]" : "text-[#397A42]"}`} />
                {sc.active && (
                  <span className="rounded-full bg-[#A3C75B] px-2 py-0.5 text-[10.5px] font-bold text-[#0B281C]">
                    {tr ? "Aktif" : "Active"}
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-[15px] font-bold">{tr ? sc.tr : sc.en}</div>
              <div className={`mt-1 text-[12px] ${sc.active ? "text-[#D7E6DC]" : "text-ink-2"}`}>
                {tr ? sc.descTr : sc.descEn}
              </div>
            </button>
          ))}
        </div>

        {best?.robust && (
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label={tr ? "En Kötü %20 Dönem Kazancı (CVaR20)" : "Worst 20% Window Margin (CVaR20)"}
              value={n(best.robust.cvar20MarginTLPerDaPerYr, 0)}
              unit="₺/da·yıl"
              provenance="scenario"
            />
            <StatCard
              label={tr ? "Maksimum Pişmanlık (Minimax Regret)" : "Max Regret"}
              value={n(best.robust.maxRegret, 1)}
              unit={tr ? "puan" : "pts"}
              provenance="model"
            />
            <StatCard
              label={tr ? "Sıralama Kararlılığı (±%20 Duyarlılık)" : "Rank Stability (±20% Sweep)"}
              value={best.stability ? `%${Math.round(best.stability.top3Share * 100)}` : "—"}
              sub={tr ? "İlk 3'te kalma oranı" : "Top-3 retention share"}
              provenance="model"
            />
          </div>
        )}

        <SectionCard
          title={tr ? "Senaryolar Arası Plan Karşılaştırması" : "Cross-Scenario Plan Comparison"}
          subtitle={tr ? "Aktif senaryodaki mevcut plan ve en iyi iki alternatif" : "Current rotation and top 2 alternatives under active scenario"}
        >
          {result ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-2">
                    <th className="py-2 pr-3 font-semibold">{tr ? "Plan" : "Plan"}</th>
                    <th className="py-2 pr-3 font-semibold">{tr ? "3 Yıllık Sıra" : "3-Year Sequence"}</th>
                    <th className="py-2 pr-3 font-semibold">{tr ? "Sulama İhtiyacı" : "Irrigation"}</th>
                    <th className="py-2 pr-3 font-semibold">{tr ? "Su Açığı (P50)" : "Deficit (P50)"}</th>
                    <th className="py-2 font-semibold">{tr ? "Brüt Kâr (P50)" : "Margin (P50)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {[result.current, ...result.alternatives.slice(0, 2)].map((p, idx) => (
                    <tr key={p.id} className="border-b border-line/60">
                      <td className="py-2.5 pr-3 font-semibold">
                        {idx === 0 ? (tr ? "Mevcut Plan" : "Current") : `${tr ? "Alternatif" : "Alt"} ${idx}`}
                      </td>
                      <td className="py-2.5 pr-3">
                        {p.crops.map((c) => (tr ? CROPS[c].name.tr : CROPS[c].name.en)).join(" → ")}
                      </td>
                      <td className="py-2.5 pr-3">{n(p.water.irrigationNetMmPerYr?.p50 ?? 0, 0)} mm/yıl</td>
                      <td className={`py-2.5 pr-3 font-semibold ${(p.water.unmetDeficitMmPerYr?.p50 ?? 0) > 15 ? "text-bad" : "text-[#397A42]"}`}>
                        +{n(p.water.unmetDeficitMmPerYr?.p50 ?? 0, 0)} mm
                      </td>
                      <td className="py-2.5 font-semibold">{n(p.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} ₺/da</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13.5px] text-ink-2">{tr ? "Simülasyon sonuçları hazırlanıyor..." : "Preparing simulation results..."}</p>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
