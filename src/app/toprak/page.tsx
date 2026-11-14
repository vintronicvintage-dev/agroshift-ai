"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard, StatCard, StatusNotice } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { useI18n } from "@/lib/i18n";
import { matchMasterProvince } from "@/lib/data/turkiyeAgroMaster";
import { describeRing } from "@/lib/ui/geo";
import { pilotField, setField, useStore } from "@/lib/ui/fieldStore";

export default function SoilAnalysisPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const field = store.field;
  const geo = field ? describeRing(field.ring) : null;
  const master = matchMasterProvince(geo?.centroid.lat ?? 37.5677, geo?.centroid.lon ?? 32.7804);
  const soil = data.soil;
  const layers = data.soilPart.status === "ok" ? data.soilPart.data.soilLayers : null;
  const isLabOverride = Boolean(store.soil) || soil?.origin === "user";

  const phVal = store.soil?.ph ?? soil?.ph ?? master.province.toprak_profili_0_30cm_soilgrids.ph;
  const socVal = store.soil?.soc ?? soil?.soc ?? master.province.toprak_profili_0_30cm_soilgrids.organik_karbon_SOC_g_kg;
  const clayVal = soil?.clay ?? master.province.toprak_profili_0_30cm_soilgrids.kil_yuzde;
  const sandVal = soil?.sand ?? master.province.toprak_profili_0_30cm_soilgrids.kum_yuzde;
  const siltVal = soil?.silt ?? master.province.toprak_profili_0_30cm_soilgrids.silt_yuzde;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "ISRIC SoilGrids & Laboratuvar" : "ISRIC SoilGrids & Lab"}
          title={tr ? "Toprak Analizi ve Derinlik Profili" : "Soil Analysis & Depth Profile"}
          description={
            tr
              ? "0–200 cm toprak katmanları, pH, organik karbon ve doku dağılımı. Gerçek laboratuvar ölçümü olmayan parametreler açıkça belirtilir."
              : "0–200 cm soil layers, pH, organic carbon, and texture distribution. Parameters without lab measurements are explicitly flagged."
          }
          badge={
            isLabOverride ? (
              <ProvenanceBadge kind="observed" label={tr ? "Laboratuvar Analizi Öncelikli" : "Lab Measurement Priority"} />
            ) : (
              <ProvenanceBadge kind="model" label="ISRIC SoilGrids 250m" />
            )
          }
          actions={
            <Link href="/tarlalarim" className="btn">
              {tr ? "Laboratuvar Verisi Gir" : "Enter Lab Data"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Metrics */}
          <div className="space-y-5 lg:col-span-8">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatCard
                label="pH (H₂O)"
                value={phVal !== null ? n(phVal, 2) : "—"}
                sub={tr ? "0–30 cm ağırlıklı" : "0–30 cm weighted"}
                provenance={isLabOverride ? "observed" : "model"}
              />
              <StatCard
                label={tr ? "Organik Karbon (SOC)" : "Organic Carbon (SOC)"}
                value={socVal !== null ? n(socVal, 1) : "—"}
                unit="g/kg"
                sub={tr ? "Toprak verimliliği göstergesi" : "Soil fertility indicator"}
                provenance={isLabOverride ? "observed" : "model"}
              />
              <StatCard
                label={tr ? "Toprak Dokusu" : "Soil Texture"}
                value={soil?.textureClass ?? master.province.toprak_profili_0_30cm_soilgrids.toprak_dokusu_sinifi}
                sub={`${tr ? "Kil" : "Clay"} %${n(clayVal, 0)} · ${tr ? "Kum" : "Sand"} %${n(sandVal, 0)} · ${tr ? "Silt" : "Silt"} %${n(siltVal, 0)}`}
                provenance="model"
              />
              <StatCard
                label={tr ? "Toplam Azot (N)" : "Total Nitrogen (N)"}
                value={layers?.[0]?.nitrogen !== null && layers?.[0]?.nitrogen !== undefined ? n(layers[0].nitrogen, 2) : "—"}
                unit="g/kg"
                provenance={layers?.[0]?.nitrogen ? "model" : "unavailable"}
              />
              <StatCard
                label={tr ? "Fosfor (P) & Potasyum (K)" : "Phosphorus (P) & Potassium (K)"}
                value={tr ? "Ölçüm Yok" : "No Test"}
                sub={tr ? "Uydu/SoilGrids ile ölçülemez" : "Not measurable via satellite"}
                provenance="unavailable"
              />
              <StatCard
                label={tr ? "Tuzluluk (EC)" : "Salinity (EC)"}
                value={tr ? "Ölçüm Yok" : "No Test"}
                sub={tr ? "Yerel laboratuvar testi gerekir" : "Requires local lab test"}
                provenance="unavailable"
              />
            </div>

            <StatusNotice
              kind="info"
              title={tr ? "Gözlem ve Tahmin Ayrımı" : "Observation vs. Model Estimate"}
              message={
                tr
                  ? "Fosfor (P), potasyum (K) ve toprak tuzluluğu (EC) küresel uydu/SoilGrids katmanlarından güvenilir şekilde elde edilemez; bu nedenle kesin sayı gösterilmez. Gerçek laboratuvar sonucunuz varsa Tarlalarım ekranından girebilirsiniz."
                  : "Phosphorus (P), potassium (K), and soil salinity (EC) cannot be reliably measured from global SoilGrids layers, so no fabricated numbers are shown."
              }
            />

            {/* 6-Layer Depth Table */}
            <SectionCard
              title={tr ? "Derinliğe Bağlı Toprak Profili (0–200 cm)" : "Soil Depth Profile (0–200 cm)"}
              subtitle={tr ? "ISRIC SoilGrids 250m ve Saxton–Rawls (2006) hidrolik tahminleri" : "ISRIC SoilGrids 250m & Saxton–Rawls (2006) hydraulics"}
              right={<Layers className="size-4 text-[#397A42]" />}
            >
              {layers && layers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px] tabular-nums">
                    <thead>
                      <tr className="border-b border-line text-[12px] text-ink-2">
                        <th className="py-2 pr-3 font-semibold">{tr ? "Derinlik" : "Depth"}</th>
                        <th className="py-2 pr-3 font-semibold">{tr ? "Kil %" : "Clay %"}</th>
                        <th className="py-2 pr-3 font-semibold">{tr ? "Kum %" : "Sand %"}</th>
                        <th className="py-2 pr-3 font-semibold">pH</th>
                        <th className="py-2 pr-3 font-semibold">SOC (g/kg)</th>
                        <th className="py-2 pr-3 font-semibold">CEC</th>
                        <th className="py-2 font-semibold">{tr ? "Hacim Ağırlığı" : "Bulk Density"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {layers.map((l) => (
                        <tr key={`${l.top}-${l.bottom}`} className="border-b border-line/60">
                          <td className="py-2.5 pr-3 font-semibold">{l.top}–{l.bottom} cm</td>
                          <td className="py-2.5 pr-3">{l.clay !== null ? `${n(l.clay, 1)}%` : "—"}</td>
                          <td className="py-2.5 pr-3">{l.sand !== null ? `${n(l.sand, 1)}%` : "—"}</td>
                          <td className="py-2.5 pr-3">{l.ph !== null ? n(l.ph, 2) : "—"}</td>
                          <td className="py-2.5 pr-3">{l.soc !== null ? n(l.soc, 1) : "—"}</td>
                          <td className="py-2.5 pr-3">{l.cec !== null ? n(l.cec, 1) : "—"}</td>
                          <td className="py-2.5">{l.bulkDensity !== null ? `${n(l.bulkDensity, 2)} g/cm³` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[13.5px] text-ink-2">
                  {tr
                    ? "Katmanlı toprak verisi yükleniyor veya bu koordinat için yalnızca 0–30 cm il profili mevcut."
                    : "Layered soil profile loading or only 0–30 cm provincial profile is available."}
                </p>
              )}
            </SectionCard>
          </div>

          {/* Right: Curated Soil Texture Photo + Texture Breakdown */}
          <div className="space-y-5 lg:col-span-4">
            <SectionCard title={tr ? "Toprak Yapısı ve Doku" : "Soil Structure & Texture"}>
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-line">
                <Image
                  src="/images/agro/soil-texture.png"
                  alt={tr ? "Toprak dokusu yakın görünüm" : "Close-up of fertile soil texture"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 400px"
                  className="object-cover"
                />
              </div>
              <div className="mt-4 space-y-3 text-[13px]">
                <div>
                  <div className="mb-1 flex justify-between font-medium">
                    <span>{tr ? "Kil" : "Clay"}</span>
                    <span>%{n(clayVal, 1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-[#8A521B]" style={{ width: `${Math.min(100, clayVal)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between font-medium">
                    <span>{tr ? "Silt" : "Silt"}</span>
                    <span>%{n(siltVal, 1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-[#397A42]" style={{ width: `${Math.min(100, siltVal)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between font-medium">
                    <span>{tr ? "Kum" : "Sand"}</span>
                    <span>%{n(sandVal, 1)}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full bg-[#A3C75B]" style={{ width: `${Math.min(100, sandVal)}%` }} />
                  </div>
                </div>
              </div>
            </SectionCard>

            <div className="flex justify-end">
              <Link href="/iklim" className="btn btn-primary w-full justify-between">
                <span>{tr ? "İklim Analizine Geç" : "Proceed to Climate Analysis"}</span>
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
