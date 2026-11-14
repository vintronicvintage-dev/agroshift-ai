"use client";

import Link from "next/link";
import { ArrowRight, CloudRain, Sun, Thermometer, Wind } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard, StatCard, StatusNotice } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, useStore } from "@/lib/ui/fieldStore";

export default function ClimateAnalysisPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const climateSummary = result?.climate;
  const daily = data.climate.status === "ok" ? data.climate.data.daily : [];
  const validDays = daily.filter((d) => d.tmean !== null && d.precip !== null);

  const avgRh = validDays.length
    ? validDays.reduce((acc, d) => acc + (d.rh ?? 0), 0) / validDays.length
    : null;
  const avgWind = validDays.length
    ? validDays.reduce((acc, d) => acc + (d.wind2m ?? 0), 0) / validDays.length
    : null;

  const annualRain = climateSummary?.monthly
    ? climateSummary.monthly.reduce((acc, m) => acc + (m.precipMm ?? 0), 0)
    : null;
  const annualEt0 = climateSummary?.monthly
    ? climateSummary.monthly.reduce((acc, m) => acc + (m.et0Mm ?? 0), 0)
    : null;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow="NASA POWER · MERRA-2 (2001–2024)"
          title={tr ? "İklim Analizi ve Kuraklık Göstergeleri" : "Climate Analysis & Drought Indicators"}
          description={
            tr
              ? "Günlük sıcaklık, yağış, bağıl nem, rüzgâr hızı ve FAO-56 Penman–Monteith referans evapotranspirasyonu (ET₀)."
              : "Daily temperature, rainfall, relative humidity, wind speed, and FAO-56 Penman–Monteith reference evapotranspiration (ET₀)."
          }
          badge={<ProvenanceBadge kind="reanalysis" label="NASA POWER / MERRA-2" />}
          actions={
            <Link href="/urunler" className="btn btn-primary">
              {tr ? "Ürün Önerilerine Geç" : "Crop Recommendations"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tr ? "Yıllık Ortalama Yağış" : "Mean Annual Rainfall"}
            value={annualRain !== null ? n(annualRain, 0) : "—"}
            unit="mm/yıl"
            sub={tr ? "PRECTOTCORR düzeltilmiş" : "PRECTOTCORR adjusted"}
            provenance="reanalysis"
            icon={<CloudRain className="size-4" />}
          />
          <StatCard
            label={tr ? "Yıllık Referans ET₀" : "Mean Annual ET₀"}
            value={annualEt0 !== null ? n(annualEt0, 0) : "—"}
            unit="mm/yıl"
            sub="FAO-56 Penman–Monteith"
            provenance="model"
            icon={<Sun className="size-4" />}
          />
          <StatCard
            label={tr ? "Ortalama Bağıl Nem (RH2M)" : "Mean Relative Humidity"}
            value={avgRh !== null ? n(avgRh, 0) : "—"}
            unit="%"
            sub={tr ? `${validDays.length} günlük gözlem` : `${validDays.length} daily records`}
            provenance="reanalysis"
            icon={<Thermometer className="size-4" />}
          />
          <StatCard
            label={tr ? "Ortalama Rüzgâr (WS2M)" : "Mean Wind Speed (2m)"}
            value={avgWind !== null ? n(avgWind, 1) : "—"}
            unit="m/s"
            provenance="reanalysis"
            icon={<Wind className="size-4" />}
          />
        </div>

        <StatusNotice
          kind="info"
          title={tr ? "Tarihsel Yeniden Analiz ve Senaryo Ayrımı" : "Historical Reanalysis vs. Stress Scenario"}
          message={
            store.scenario.preset === "typical"
              ? tr
                ? "Şu anda 2001–2024 NASA POWER gözlenen tarihsel serisi değişiklik yapılmadan kullanılıyor."
                : "Currently using the unmodified 2001–2024 NASA POWER historical series."
              : tr
                ? `Aktif senaryo (${store.scenario.preset}): Günlük yağış ×${n(store.scenario.rainMultiplier, 2)} ve sıcaklık +${n(store.scenario.tempDeltaC, 1)} °C kaydırması uygulanıyor.`
                : `Active scenario (${store.scenario.preset}): Daily precipitation ×${n(store.scenario.rainMultiplier, 2)} and temperature +${n(store.scenario.tempDeltaC, 1)} °C shift applied.`
          }
        />

        {/* Monthly Table */}
        <SectionCard
          title={tr ? "Aylık İklim Dengesi (Yağış vs ET₀)" : "Monthly Climate Balance (Rainfall vs ET₀)"}
          subtitle={tr ? "Uzun yıllar aylık ortalamaları ve kuraklık farkı" : "Long-term monthly means and climatic water balance"}
        >
          {climateSummary?.monthly ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] tabular-nums">
                <thead>
                  <tr className="border-b border-line text-[12px] text-ink-2">
                    <th className="py-2 pr-3 font-semibold">{tr ? "Ay" : "Month"}</th>
                    <th className="py-2 pr-3 font-semibold">{tr ? "Yağış (mm)" : "Rain (mm)"}</th>
                    <th className="py-2 pr-3 font-semibold">ET₀ (mm)</th>
                    <th className="py-2 font-semibold">{tr ? "Su Dengesi (P − ET₀)" : "Balance (P − ET₀)"}</th>
                  </tr>
                </thead>
                <tbody>
                  {climateSummary.monthly.map((m) => {
                    const p = m.precipMm ?? 0;
                    const e = m.et0Mm ?? 0;
                    const bal = m.balanceMm ?? p - e;
                    return (
                      <tr key={m.month} className="border-b border-line/60">
                        <td className="py-2 pr-3 font-semibold">{m.month}. Ay</td>
                        <td className="py-2 pr-3">{m.precipMm != null ? n(m.precipMm, 1) : "—"}</td>
                        <td className="py-2 pr-3">{m.et0Mm != null ? n(m.et0Mm, 1) : "—"}</td>
                        <td className={`py-2 font-semibold ${bal < 0 ? "text-bad" : "text-[#397A42]"}`}>
                          {bal >= 0 ? `+${n(bal, 1)}` : n(bal, 1)} mm
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[13.5px] text-ink-2">
              {tr ? "İklim serisi yükleniyor..." : "Loading climate series..."}
            </p>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
