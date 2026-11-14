"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Droplets, Sprout } from "lucide-react";
import { AppShell } from "@/components/shell/AppShell";
import { EmptyFieldBanner, PageHeader, ProvenanceBadge, SectionCard } from "@/components/ui/AgroCard";
import { useFieldData } from "@/components/data/FieldData";
import { CROP_IDS, CROPS } from "@/lib/engine";
import { CROP_REQUIREMENTS } from "@/lib/crops/cropRequirements";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, useStore } from "@/lib/ui/fieldStore";

const CROP_PHOTO_MAP: Record<string, string> = {
  wheat_winter: "/images/agro/crop-wheat.png",
  barley_winter: "/images/agro/crop-wheat.png",
  chickpea: "/images/agro/crop-chickpea.png",
  lentil_red: "/images/agro/crop-lentil.png",
  lentil_green: "/images/agro/crop-lentil.png",
  sunflower: "/images/agro/crop-sunflower.png",
};

export default function CropRecommendationsPage() {
  const { lang, n } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const tr = lang === "tr";

  const result = data.analysis.result;
  const candidateSet = new Set(result?.optimizer.candidateCrops ?? CROP_IDS);

  const visibleCrops = CROP_IDS.filter((id) => id !== "fallow");

  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
        <PageHeader
          eyebrow={tr ? "18 Ürünlük Agronomik Kütüphane" : "18-Crop Agronomic Library"}
          title={tr ? "Ürün Önerileri ve Yetişme Gereksinimleri" : "Crop Recommendations & Growth Requirements"}
          description={
            tr
              ? "Her ürünün su gereksinimi (Kc), toprak pH aralığı, büyüme dönemi uzunluğu ve referans verim potansiyeli. Tarlanız için uygun adaylar yeşil etiketle gösterilir."
              : "Water coefficient (Kc), soil pH range, growing cycle length, and reference yield potential for all crops."
          }
          badge={<ProvenanceBadge kind="model" label={tr ? "FAO-56 & TAGEM Parametreleri" : "FAO-56 & TAGEM Parameters"} />}
          actions={
            <Link href="/plan" className="btn btn-primary">
              {tr ? "3 Yıllık Rotasyon Planla" : "Plan 3-Year Rotation"}
              <ArrowRight className="size-4" />
            </Link>
          }
        />

        {!store.field && <EmptyFieldBanner onSelectExample={() => setField(pilotField("konya-cumra", lang))} />}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleCrops.map((cropId) => {
            const crop = CROPS[cropId];
            const req = CROP_REQUIREMENTS[cropId];
            const isCandidate = candidateSet.has(cropId);
            const photo = CROP_PHOTO_MAP[cropId];
            const kcMid = crop.agronomy?.kc.value.mid ?? 0;
            const rootM = crop.agronomy?.rootDepthMaxM.value ?? 0;
            const totalDays = crop.agronomy?.calendar.highland.value.stages.reduce((a, b) => a + b, 0) ?? 0;

            return (
              <SectionCard
                key={cropId}
                title={tr ? crop.name.tr : crop.name.en}
                subtitle={tr ? `Familya: ${crop.family}` : `Family: ${crop.family}`}
                right={
                  isCandidate ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#EBF4ED] px-2.5 py-0.5 text-[11px] font-semibold text-[#123D2A]">
                      <CheckCircle2 className="size-3.5 text-[#397A42]" />
                      {tr ? "Aday Ürün" : "Suitable"}
                    </span>
                  ) : (
                    <ProvenanceBadge kind="unavailable" label={tr ? "Kısıt Dışı" : "Filtered"} />
                  )
                }
              >
                {photo && (
                  <div className="relative mb-4 aspect-[16/9] w-full overflow-hidden rounded-xl border border-line">
                    <Image
                      src={photo}
                      alt={tr ? crop.name.tr : crop.name.en}
                      fill
                      sizes="(max-width: 768px) 100vw, 420px"
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5 text-[12.5px] tabular-nums">
                  <div className="rounded-xl border border-line bg-bg p-2.5">
                    <div className="text-ink-2">{tr ? "Tepe Kc Katsayısı" : "Mid Kc"}</div>
                    <div className="mt-0.5 font-display text-[15px] font-bold text-ink">{n(kcMid, 2)}</div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg p-2.5">
                    <div className="text-ink-2">{tr ? "Kök Derinliği" : "Max Root Depth"}</div>
                    <div className="mt-0.5 font-display text-[15px] font-bold text-ink">{n(rootM, 2)} m</div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg p-2.5">
                    <div className="text-ink-2">{tr ? "Büyüme Süresi" : "Cycle Length"}</div>
                    <div className="mt-0.5 font-display text-[15px] font-bold text-ink">{totalDays} {tr ? "gün" : "days"}</div>
                  </div>
                  <div className="rounded-xl border border-line bg-bg p-2.5">
                    <div className="text-ink-2">{tr ? "Optimum pH" : "Optimal pH"}</div>
                    <div className="mt-0.5 font-display text-[15px] font-bold text-ink">
                      {req ? `${req.soil.optimalPh[0]}–${req.soil.optimalPh[1]}` : "6.0–8.0"}
                    </div>
                  </div>
                </div>

                {req && (
                  <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-ink-2">
                    <span className="inline-flex items-center gap-1">
                      <Droplets className="size-3.5 text-[#0A689E]" />
                      {tr
                        ? `ETc: ${req.water.seasonalEtcRangeMm[0]}–${req.water.seasonalEtcRangeMm[1]} mm`
                        : `ETc: ${req.water.seasonalEtcRangeMm[0]}–${req.water.seasonalEtcRangeMm[1]} mm`}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Sprout className="size-3.5 text-[#397A42]" />
                      {tr
                        ? `N Fiks.: +${req.nutrientsAndRotation.biologicalNFixationKgDa[1]} kg/da`
                        : `N Fix: +${req.nutrientsAndRotation.biologicalNFixationKgDa[1]} kg/da`}
                    </span>
                  </div>
                )}
              </SectionCard>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
