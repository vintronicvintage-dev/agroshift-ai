"use client";

import { useI18n } from "@/lib/i18n";
import mod16Data from "@/data/validation/mod16_crosscheck.json";

export function Mod16ValidationCard() {
  const { lang, n } = useI18n();
  const isTr = lang === "tr";
  const { summary, regions } = mod16Data;

  return (
    <div className="space-y-6">
      <p className="text-[14px] leading-relaxed text-ink-2">
        {isTr ? summary.verdictTr : summary.verdictEn}
      </p>

      {/* KPI Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[8px] border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink-3">
            {isTr ? "Korelasyon (r)" : "Correlation (r)"}
          </p>
          <p className="mt-1 font-mono text-[22px] font-semibold text-emerald">
            {n(summary.meanCorrelationR, 3)}
          </p>
          <p className="text-[11px] text-ink-3">
            {isTr ? "Uyduyla Yüksek Uyum" : "High Satellite Agreement"}
          </p>
        </div>

        <div className="rounded-[8px] border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink-3">
            {isTr ? "Ortalama Hata (RMSE)" : "Mean Error (RMSE)"}
          </p>
          <p className="mt-1 font-mono text-[22px] font-semibold text-ink">
            {n(summary.meanRmseMm, 1)} <span className="text-[13px] font-normal text-ink-2">mm/yıl</span>
          </p>
          <p className="text-[11px] text-ink-3">
            {isTr ? "Düşük Yıllık Sapma" : "Low Annual Variance"}
          </p>
        </div>

        <div className="rounded-[8px] border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink-3">
            {isTr ? "Ortalama Sapma" : "Mean Bias"}
          </p>
          <p className="mt-1 font-mono text-[22px] font-semibold text-sky">
            +{n(summary.meanBiasPct, 2)}%
          </p>
          <p className="text-[11px] text-ink-3">
            {isTr ? "Asgari Sistematik Hata" : "Minimal Systematic Error"}
          </p>
        </div>

        <div className="rounded-[8px] border border-line bg-surface p-3">
          <p className="text-[12px] font-medium text-ink-3">
            {isTr ? "Zaman Serisi" : "Time Series"}
          </p>
          <p className="mt-1 font-mono text-[22px] font-semibold text-ink">
            24 Yıl
          </p>
          <p className="text-[11px] text-ink-3">
            {isTr ? "2001–2025 Tarım Yılları" : "2001–2025 Ag Years"}
          </p>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="rounded-[8px] border border-line bg-surface p-4">
        <h4 className="text-[15px] font-semibold text-ink">
          {isTr ? "5 Pilot Havza Model vs. MODIS Karşılaştırması" : "5 Pilot Basins Model vs. MODIS Comparison"}
        </h4>
        <div className="mt-3 overflow-x-auto scroll-thin">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-ink-2">
                <th className="py-2 pr-3 font-medium">{isTr ? "Havza / Bölge" : "Basin / Region"}</th>
                <th className="py-2 pr-3 font-medium">{isTr ? "Temsili Münavebe" : "Rotation"}</th>
                <th className="py-2 pr-3 font-medium">{isTr ? "Model ETa" : "Model ETa"}</th>
                <th className="py-2 pr-3 font-medium">{isTr ? "MODIS ET" : "MODIS ET"}</th>
                <th className="py-2 pr-3 font-medium">RMSE</th>
                <th className="py-2 pr-3 font-medium">{isTr ? "Sapma" : "Bias"}</th>
                <th className="py-2 font-medium">Korelasyon (r)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {regions.map((r) => (
                <tr key={r.id} className="hover:bg-bg">
                  <td className="py-2.5 pr-3 font-medium text-ink">
                    {isTr ? r.nameTr : r.nameEn}
                    <span className="block text-[11px] text-ink-3">{isTr ? r.basinTr : r.basinEn}</span>
                  </td>
                  <td className="py-2.5 pr-3 text-[12px] text-ink-2">
                    {isTr ? r.typicalCropRotationTr : r.typicalCropRotationEn}
                  </td>
                  <td className="py-2.5 pr-3 font-mono text-ink">{n(r.modelEtaAnnualMm, 1)} mm</td>
                  <td className="py-2.5 pr-3 font-mono text-ink-2">{n(r.modisEtAnnualMm, 1)} mm</td>
                  <td className="py-2.5 pr-3 font-mono text-ink">{n(r.rmseMm, 1)} mm</td>
                  <td className="py-2.5 pr-3 font-mono text-sky">{r.biasPct > 0 ? `+${n(r.biasPct, 1)}` : n(r.biasPct, 1)}%</td>
                  <td className="py-2.5 font-mono font-medium text-emerald">{n(r.correlationR, 3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Methodology & SoilGrids Disclaimer */}
      <div className="rounded-[8px] border border-line bg-surface p-4 text-[13px] leading-relaxed text-ink-2">
        <p className="font-medium text-ink">
          {isTr ? "NASA MODIS MOD16A2 Çapraz Kontrol Metodolojisi:" : "NASA MODIS MOD16A2 Cross-Check Methodology:"}
        </p>
        <p className="mt-1">
          {isTr
            ? "NASA ORNL DAAC MODIS MOD16A2 (v061, 500 m, 8 günlük kompozit) karasal evapotranspirasyon ürünü, Türkiye'deki 5 pilot bölgenin FAO-56 çift katmanlı su dengesi çıktılarıyla (P + I = ETa + DP + RO + ΔS) karşılaştırılmıştır. 24 tarım yılı (1 Ekim - 30 Eylül) boyunca model ile uydu gözlemleri arasında ortalama r = 0.94 korelasyon ve %0.64 ortalama sapma tespit edilmiştir."
            : "NASA ORNL DAAC MODIS MOD16A2 (v061, 500 m, 8-day composite) terrestrial actual ET observations were evaluated against AgroShift's FAO-56 dual-bucket water balance (P + I = ETa + DP + RO + ΔS). Across 24 agricultural years (Oct 1 - Sep 30), a mean correlation of r = 0.94 and minimal bias of +0.64% were achieved."}
        </p>
        <p className="mt-2 text-[12px] text-ink-3">
          {mod16Data.metadata.disclaimer}
        </p>
      </div>
    </div>
  );
}
