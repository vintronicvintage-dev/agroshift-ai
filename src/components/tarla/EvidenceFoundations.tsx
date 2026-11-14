"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CROPS } from "@/lib/crops/database";
import type { AnalysisResult, CropId, LocalizedText, PlanResult, RotationSequence } from "@/lib/types";
import { IMAGES } from "@/lib/ui/images";
import { setInputs, useStore } from "@/lib/ui/fieldStore";
import { describeRing } from "@/lib/ui/geo";
import {
  evaluateMasterPlan,
  MASTER_TO_CROP_ID,
  matchMasterProvince,
  type MasterClimateMode,
  type MasterIrrigationCode,
  type MasterTillageCode,
} from "@/lib/data/turkiyeAgroMaster";
import { CropArt } from "@/components/brand/CropArt";
import { SourceVisualCardsGrid, SCIENTIFIC_SOURCE_CARDS } from "@/components/brand/SourceVisualCards";
import { Icon } from "@/components/ui/Icons";

/**
 * Decluttered, high-clarity Scientific Calculation Hub, 81-Province Rotation Studio & Photo Source Cards.
 * Addresses Screenshot 1 decluttering + integrates `turkiye_agro_master.json` + photo-backed Source Cards.
 */
export function EvidenceFoundations({
  res,
  best,
  currentPlan: _currentPlan,
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
  const store = useStore();
  void _currentPlan;
  const [activeTab, setActiveTab] = useState<"summary" | "province_master" | "sources">("summary");
  const [tillageCode, setTillageCode] = useState<MasterTillageCode>("aniza_dogrudan_ekim");
  const [climateMode, setClimateMode] = useState<MasterClimateMode>("tipik");

  // Map store irrigation method to MasterIrrigationCode
  const derivedIrrigationCode: MasterIrrigationCode = store.inputs.rainfed
    ? "kuru_tarim"
    : store.inputs.method === "drip"
      ? "damla"
      : store.inputs.method === "sprinkler"
        ? "yagmurlama"
        : "salma";
  const [customIrrCode, setCustomIrrCode] = useState<MasterIrrigationCode | null>(null);
  const activeIrrCode = customIrrCode ?? derivedIrrigationCode;

  const fieldGeo = useMemo(() => (store.field ? describeRing(store.field.ring) : null), [store.field]);
  const lat = fieldGeo?.centroid.lat ?? 37.5677;
  const lon = fieldGeo?.centroid.lon ?? 32.7804;

  const matched = useMemo(() => matchMasterProvince(lat, lon), [lat, lon]);
  const masterEval = useMemo(
    () =>
      evaluateMasterPlan({
        lat,
        lon,
        crops: best.crops,
        tillageCode,
        irrigationCode: activeIrrCode,
        climateMode,
      }),
    [lat, lon, best.crops, tillageCode, activeIrrCode, climateMode],
  );

  const prov = matched.province;
  const sat = prov.uydu_gozlem_smap_hls_ecostress;
  const clim = prov.iklim_ve_su_serisi_2005_2026;
  const soil = prov.toprak_profili_0_30cm_soilgrids;
  const cmip = prov.projeksiyon_2035_cmip6;
  const matris = prov.il_urun_verim_su_ve_rotasyon_matrisi;

  const applyRotationPackage = (crops: RotationSequence, recIrr: MasterIrrigationCode, recTillage: MasterTillageCode) => {
    setTillageCode(recTillage);
    setCustomIrrCode(recIrr);
    setInputs({
      rotation: [...crops],
      rainfed: recIrr === "kuru_tarim",
      method: recIrr === "damla" ? "drip" : recIrr === "salma" ? "furrow" : "sprinkler",
    });
  };

  const assignCropToYear = (cropId: CropId, yearIdx: 0 | 1 | 2) => {
    const next: RotationSequence = [...store.inputs.rotation] as RotationSequence;
    next[yearIdx] = cropId;
    setInputs({ rotation: next });
  };

  return (
    <section
      id="kanit-ve-dayanaklar"
      aria-label={lang === "tr" ? "Bilimsel Hesaplama Özeti, 81 İl Münavebe Paketi ve Kaynaklar" : "Scientific Calculation Summary, 81-Province Rotation Packages & Sources"}
      className="bento-card overflow-hidden p-5 sm:p-6"
    >
      {/* Clean Header with Key Badges & 3 Clear View Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3.5">
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
                {prov.kimlik_ve_cografya.plaka} {prov.kimlik_ve_cografya.il_adi} · {prov.kimlik_ve_cografya.tagem_iklim_kodu}
              </span>
              {best.confidence && (
                <span className="rounded-full border border-[#86efac] bg-[#f0fdf4] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#14532d]">
                  {lang === "tr"
                    ? `Güven Derecesi: ${best.confidence.grade} (${n(best.confidence.score, 0)}/100)`
                    : `Confidence: ${best.confidence.grade} (${n(best.confidence.score, 0)}/100)`}
                </span>
              )}
              <span className="rounded-full border border-line bg-bg px-2.5 py-0.5 font-mono text-[11px] text-ink-2">
                {lang === "tr"
                  ? `Kütle Dengesi Hatası: ${n(best.water.massBalanceMaxErrorMm ?? 0, 4)} mm`
                  : `Mass Balance Error: ${n(best.water.massBalanceMaxErrorMm ?? 0, 4)} mm`}
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-[21px] font-semibold text-ink sm:text-[24px]">
              {lang === "tr"
                ? "Hesaplama Parametreleri, 81 İl Münavebe Rehberi ve Veri Kaynakları"
                : "Calculation Parameters, 81-Province Rotation Guide & Data Sources"}
            </h2>
            <p className="mt-0.5 text-[13.5px] text-ink-2">
              {lang === "tr"
                ? "Karmaşık formül yığınları yerine arazinizde kullanılan net parametreleri, ilinize özel hazır münavebe paketlerini ve fotoğraflı veri kaynaklarını inceleyin."
                : "Inspect the exact parcel parameters, province-specific 3-year rotation packages, and photo-backed scientific sources without visual clutter."}
            </p>
          </div>
        </div>

        {/* 3 Clear View Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                id: "summary",
                icon: "chart" as const,
                tr: "1. Hesaplama & Parametre Özeti",
                en: "1. Calculation & Parameters",
              },
              {
                id: "province_master",
                icon: "plan" as const,
                tr: `2. ${prov.kimlik_ve_cografya.il_adi} Münavebe & Ürün Seçimi`,
                en: `2. ${prov.kimlik_ve_cografya.il_adi} Rotation Studio`,
              },
              {
                id: "sources",
                icon: "satellite" as const,
                tr: `3. Fotoğraflı Kaynak Kartları (${SCIENTIFIC_SOURCE_CARDS.length})`,
                en: `3. Photo Source Cards (${SCIENTIFIC_SOURCE_CARDS.length})`,
              },
            ] as const
          ).map((tb) => (
            <button
              key={tb.id}
              type="button"
              onClick={() => setActiveTab(tb.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-[12.5px] font-semibold transition-all ${
                activeTab === tb.id
                  ? "bg-[#1e6b34] text-white shadow-sm"
                  : "border border-line bg-bg text-ink-2 hover:border-accent/40 hover:text-ink"
              }`}
            >
              <Icon name={tb.icon} size={15} />
              <span>{lang === "tr" ? tb.tr : tb.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 1: DECLUTTERED 4-PILLAR CALCULATION & PARAMETER SUMMARY
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "summary" && (
        <div className="mt-5 space-y-5">
          {/* 4 Visual Pillar Cards (Clean, spacious, easy to scan) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {/* PILLAR 1: İklim & Buharlaşma */}
            <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/55 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e0f2fe] px-2.5 py-1 font-mono text-[11px] font-bold text-[#0277bd]">
                    1. İklim & Buharlaşma
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
                    NASA POWER · GPM
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Yıllık Yağış (P)" : "Annual Rain (P)"}</p>
                    <p className="numeral text-[26px] text-[#0277bd]">
                      {n(res.climate.meanAnnualPrecipMm ?? clim.yillik_yagis_tipik_mm, 0)}{" "}
                      <span className="text-[13px] font-normal">mm</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Referans ET₀" : "Reference ET₀"}</p>
                    <p className="numeral text-[26px] text-[#c0392b]">
                      {n(res.climate.meanAnnualEt0Mm ?? clim.yillik_referans_ETo_mm, 0)}{" "}
                      <span className="text-[13px] font-normal">mm</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] font-semibold text-ink">
                  ETc = Kc × ET₀ · Pe = 0.80 × P × f_sızma
                </div>
                <div className="mt-3 space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-ink-2">Donsuz Gün / Sağanak (&gt;25mm):</span>
                    <span className="font-mono font-semibold text-ink">
                      {clim.donsuz_gun_sayisi} gün · {clim.gpm_siddetli_saganak_gun_sayisi} sağanak
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">ECOSTRESS Yaz Yüzey Sıcaklığı:</span>
                    <span className="font-mono font-semibold text-[#b45309]">
                      {n(sat.ecostress_yaz_yuzey_sicakligi_LST_C, 1)} °C ({sat.ecostress_termal_stres_gun_sayisi} stres günü)
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
                Allen et al. (1998) FAO-56 · NASA POWER 2005–2026
              </p>
            </article>

            {/* PILLAR 2: Toprak & Kök Bölgesi Su Deposu */}
            <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/55 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fef3c7] px-2.5 py-1 font-mono text-[11px] font-bold text-[#92400e]">
                    2. Toprak & Su Deposu
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
                    SoilGrids · SMAP L4
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Su Tutma (TAW)" : "Water Cap. (TAW)"}</p>
                    <p className="numeral text-[26px] text-[#1e6b34]">
                      {n(res.soil.tawMmPerM, 0)} <span className="text-[13px] font-normal">mm/m</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "SMAP Bahar Nemi" : "SMAP Spring θ"}</p>
                    <p className="numeral text-[26px] text-[#0277bd]">
                      %{n(sat.smap_kok_nemi_4_mevsim_m3_m3.ilkbahar * 100, 1)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] font-semibold text-ink">
                  TAW = 1000 × (θ_FC − θ_WP) × Z_r
                </div>
                <div className="mt-3 space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-ink-2">Kil / Silt / Kum (0–30 cm):</span>
                    <span className="font-mono font-semibold text-ink">
                      %{n(soil.kil_yuzde, 0)} / %{n(soil.silt_yuzde, 0)} / %{n(soil.kum_yuzde, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">pH · Organik Madde · Tuzluluk:</span>
                    <span className="font-mono font-semibold text-ink">
                      pH {n(soil.ph, 1)} · %{n(soil.organik_madde_yuzde, 2)} · {n(soil.tuzluluk_EC_dS_m, 2)} dS/m
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
                ISRIC SoilGrids 250m · Saxton & Rawls (2006)
              </p>
            </article>

            {/* PILLAR 3: Sulama İhtiyacı & Su-Verim Tepkisi */}
            <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/55 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e6f4ea] px-2.5 py-1 font-mono text-[11px] font-bold text-[#1e6b34]">
                    3. Su Dengesi & Verim
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
                    TAGEM/DSİ · FAO-33
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Net Sulama (dn)" : "Net Irrigation (dn)"}</p>
                    <p className="numeral text-[26px] text-[#0277bd]">
                      {n(masterEval.totals.avgAnnualDnMm, 0)}{" "}
                      <span className="text-[13px] font-normal">mm/yıl</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Brüt Su (dt)" : "Gross Water (dt)"}</p>
                    <p className="numeral text-[26px] text-ink">
                      {n(masterEval.totals.avgAnnualDtMm, 0)}{" "}
                      <span className="text-[13px] font-normal">m³/da</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] font-semibold text-ink">
                  dt = dn / (Ea × Ec) · 1 − Yₐ/Yₘ = Kᵧ(1 − ETₐ/ETc)
                </div>
                <div className="mt-3 space-y-1 text-[12px]">
                  {masterEval.years.map((y) => (
                    <div key={y.year} className="flex justify-between">
                      <span className="text-ink-2">
                        {y.year}. Yıl {L(CROPS[y.cropId].name)} (Kc={y.kcWeighted}, Ky={y.ky}):
                      </span>
                      <span className="font-mono font-semibold text-[#1e6b34]">
                        {n(y.expectedYieldKgDa, 0)} kg/da ({n(y.dnNetMm, 0)} mm)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
                TAGEM & DSİ (2017) · Doorenbos & Kassam FAO-33
              </p>
            </article>

            {/* PILLAR 4: Ekonomik Kazanç, Azot & 2035 Risk */}
            <article className="flex flex-col justify-between rounded-2xl border border-line bg-bg/55 p-4">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffedd5] px-2.5 py-1 font-mono text-[11px] font-bold text-[#9a3412]">
                    4. Kâr, Azot & 2035 Risk
                  </span>
                  <span className="rounded bg-surface px-2 py-0.5 font-mono text-[10.5px] font-semibold text-ink-2">
                    TMO 2026 · CMIP6
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "Yıllık Brüt Kâr" : "Annual Gross Margin"}</p>
                    <p className="numeral text-[26px] text-[#1e6b34]">
                      +{n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)}{" "}
                      <span className="text-[13px] font-normal">₺/da</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11.5px] text-ink-2">{lang === "tr" ? "3Y Azot Dengesi" : "3Y N Balance"}</p>
                    <p
                      className={`numeral text-[26px] ${
                        masterEval.totals.netNitrogenKgDa3Yr >= 0 ? "text-[#1e6b34]" : "text-[#b45309]"
                      }`}
                    >
                      {masterEval.totals.netNitrogenKgDa3Yr >= 0 ? "+" : ""}
                      {n(masterEval.totals.netNitrogenKgDa3Yr, 1)}{" "}
                      <span className="text-[13px] font-normal">kg/da</span>
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl border border-line bg-surface px-3 py-2 font-mono text-[11px] font-semibold text-ink">
                  Kâr = Gelir − Masraf + ΔN_kredi − Su_Maliyeti
                </div>
                <div className="mt-3 space-y-1 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-ink-2">P10 (Kurak) – P90 (Yağışlı) Kâr:</span>
                    <span className="font-mono font-semibold text-ink">
                      {n(best.economics.grossMarginTLPerDaPerYr?.p10 ?? 0, 0)} …{" "}
                      {n(best.economics.grossMarginTLPerDaPerYr?.p90 ?? 0, 0)} ₺/da
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-2">2035 CMIP6 (SSP2-4.5 / SSP5-8.5):</span>
                    <span className="font-mono font-semibold text-[#b45309]">
                      +{n(cmip.ssp245.sicaklik_artisi_C, 1)}°C / +{n(cmip.ssp585.sicaklik_artisi_C, 1)}°C
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-3 border-t border-line pt-2 font-mono text-[10.5px] text-ink-2">
                TMO / Borsa 2025–26 · NASA NEX-GDDP-CMIP6
              </p>
            </article>
          </div>

          {/* Explicit Calculation Parameter Strip (Kullanılan Canlı Parametreler) */}
          <div className="rounded-2xl border border-line bg-bg/45 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <h3 className="font-display text-[16px] font-semibold text-ink">
                  {lang === "tr"
                    ? "Hesaplamada Kullanılan Canlı Parametreler ve Kaynak Etiketleri"
                    : "Live Parameters & Source Provenance Used in Calculations"}
                </h3>
                <p className="text-[12px] text-ink-2">
                  {lang === "tr"
                    ? "Aşağıdaki her parametre doğrudan seçili parselinizin koordinatından ve ürün diziliminden okunmuştur:"
                    : "Every parameter below is read directly from your selected parcel coordinates and rotation sequence:"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("sources")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#e6f4ea] px-3 py-1.5 text-[12px] font-semibold text-[#1e6b34] hover:bg-[#bbf7d0]"
              >
                <Icon name="satellite" size={14} />
                <span>{lang === "tr" ? "Fotoğraflı Kaynak Kartlarını Aç →" : "Open Photo Source Cards →"}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  sym: "ET₀ (Referans)",
                  val: `${n(res.climate.meanAnnualEt0Mm ?? clim.yillik_referans_ETo_mm, 0)} mm/yıl`,
                  src: "NASA POWER",
                },
                {
                  sym: "P / Pe (Etkili Yağış)",
                  val: `${n(clim.yillik_yagis_tipik_mm, 0)} / ${n(masterEval.totals.totalPeMm / 3, 0)} mm`,
                  src: "GPM IMERG & TAGEM",
                },
                {
                  sym: "TAW & θ_FC / θ_WP",
                  val: `${n(res.soil.tawMmPerM, 0)} mm/m (%${n(soil.tarla_kapasitesi_m3_m3 * 100, 0)}/%${n(soil.solma_noktasi_m3_m3 * 100, 0)})`,
                  src: "ISRIC SoilGrids v2.0",
                },
                {
                  sym: "θ_SMAP (4 Mevsim)",
                  val: `${n(sat.smap_kok_nemi_4_mevsim_m3_m3.kis, 2)}–${n(sat.smap_kok_nemi_4_mevsim_m3_m3.yaz, 2)} m³/m³`,
                  src: "NASA SMAP L4 9km",
                },
                {
                  sym: "LST_yaz (Termal)",
                  val: `${n(sat.ecostress_yaz_yuzey_sicakligi_LST_C, 1)} °C (${sat.ecostress_termal_stres_gun_sayisi} gün)`,
                  src: "NASA ECOSTRESS 70m",
                },
                {
                  sym: "Ea × Ec (Randıman)",
                  val: `%${n(masterEval.irrigation.toplam_randiman * 100, 1)} (${masterEval.irrigation.kod})`,
                  src: "TAGEM & DSİ 2017",
                },
              ].map((item, i) => (
                <div key={i} className="rounded-xl border border-line bg-surface p-2.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[11px] font-bold text-[#1e6b34]">{item.sym}</span>
                  </div>
                  <p className="mt-1 font-mono text-[13px] font-semibold text-ink">{item.val}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-ink-2">Kaynak: {item.src}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 2: 81-PROVINCE ROTATION PACKAGES & DECISIVE CROP SELECTION STUDIO
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "province_master" && (
        <div className="mt-5 space-y-5">
          {/* Top Control Bar: Province Identity + Tillage Toggle + Irrigation Selector + Climate Mode */}
          <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#86efac]/60 bg-[#f0fdf4]/70 p-4 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-[#1e6b34] px-2.5 py-1 font-mono text-[12px] font-bold text-white">
                  Plaka {prov.kimlik_ve_cografya.plaka}
                </span>
                <h3 className="font-display text-[18px] font-semibold text-ink">
                  {prov.kimlik_ve_cografya.il_adi} — {prov.kimlik_ve_cografya.cografi_bolge}
                </h3>
              </div>
              <p className="mt-1 text-[12.5px] font-medium text-[#166534]">
                Ovalar: {prov.kimlik_ve_cografya.onemli_tarim_ovalari.join(" · ")}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-ink-2">
                {matris.il_ozel_tarimsal_not}
              </p>
            </div>

            {/* Interactive Controls: Toprak İşleme + Sulama + İklim Senaryosu */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-7">
              {/* Control 1: Toprak İşleme (Tillage) */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <span className="block font-mono text-[10.5px] font-bold uppercase text-ink-2">
                  Toprak İşleme Biçimi
                </span>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {(["aniza_dogrudan_ekim", "geleneksel_surum"] as const).map((tc) => (
                    <button
                      key={tc}
                      type="button"
                      onClick={() => setTillageCode(tc)}
                      className={`rounded-lg px-2.5 py-1.5 text-left text-[11.5px] font-semibold transition-colors ${
                        tillageCode === tc
                          ? "bg-[#1e6b34] text-white"
                          : "border border-line bg-bg text-ink-2 hover:text-ink"
                      }`}
                    >
                      {tc === "aniza_dogrudan_ekim"
                        ? "🌱 Anıza Doğrudan Ekim (+25mm nem, 1.9 L/da)"
                        : "🚜 Geleneksel Pulluklu Sürüm (6.8 L/da)"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 2: Sulama Biçimi */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <span className="block font-mono text-[10.5px] font-bold uppercase text-ink-2">
                  Sulama Sistemi (Ea × Ec)
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  {(
                    [
                      { code: "damla", label: "Damla (%88)" },
                      { code: "center_pivot", label: "Pivot (%78)" },
                      { code: "yagmurlama", label: "Yağmurlama (%74)" },
                      { code: "salma", label: "Salma (%54)" },
                      { code: "kuru_tarim", label: "Kuru Tarım (0)" },
                    ] as const
                  ).map((ir) => (
                    <button
                      key={ir.code}
                      type="button"
                      onClick={() => {
                        setCustomIrrCode(ir.code);
                        setInputs({
                          rainfed: ir.code === "kuru_tarim",
                          method: ir.code === "damla" ? "drip" : ir.code === "salma" ? "furrow" : "sprinkler",
                        });
                      }}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        activeIrrCode === ir.code
                          ? "bg-[#0277bd] text-white"
                          : "border border-line bg-bg text-ink-2 hover:text-ink"
                      }`}
                    >
                      {ir.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Control 3: İklim Modu */}
              <div className="rounded-xl border border-line bg-surface p-3">
                <span className="block font-mono text-[10.5px] font-bold uppercase text-ink-2">
                  İklim & CMIP6 2035 Modu
                </span>
                <div className="mt-1.5 grid grid-cols-2 gap-1">
                  {(
                    [
                      { code: "tipik", label: "Tipik Sezon" },
                      { code: "kurak", label: "Kurak (P20)" },
                      { code: "ssp245", label: "2035 SSP2-4.5" },
                      { code: "ssp585", label: "2035 SSP5-8.5" },
                    ] as const
                  ).map((cm) => (
                    <button
                      key={cm.code}
                      type="button"
                      onClick={() => setClimateMode(cm.code)}
                      className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                        climateMode === cm.code
                          ? "bg-[#b45309] text-white"
                          : "border border-line bg-bg text-ink-2 hover:text-ink"
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3 Ready-to-Apply Province Rotation Packages (1-Click Decisive Action) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-[17px] font-semibold text-ink">
                {prov.kimlik_ve_cografya.il_adi} İli İçin Hazır 3 Yıllık Uzman Münavebe Paketleri (Tek Tıkla Uygula)
              </h3>
              <span className="font-mono text-[11.5px] text-ink-2">
                Kaynak: TAGEM & DSİ (2017) + FAO GAEZ v4 {prov.kimlik_ve_cografya.il_adi} Matrisi
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-3">
              {masterEval.packages.map((pkg) => {
                const isCurrentMatch =
                  store.inputs.rotation[0] === pkg.crops[0] &&
                  store.inputs.rotation[1] === pkg.crops[1] &&
                  store.inputs.rotation[2] === pkg.crops[2];
                return (
                  <article
                    key={pkg.id}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-all ${
                      isCurrentMatch
                        ? "border-2 border-[#1e6b34] bg-[#f0fdf4]"
                        : "border-line bg-surface hover:border-[#1e6b34]/50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#1e6b34]">
                          {pkg.badgeTr}
                        </span>
                        <span className="font-mono text-[11px] text-ink-2">
                          Net Su: {n(pkg.avgDnMm, 0)} mm/yıl · ΔN: {pkg.netNitrogenKgDa >= 0 ? "+" : ""}
                          {n(pkg.netNitrogenKgDa, 1)} kg/da
                        </span>
                      </div>
                      <h4 className="mt-2 font-display text-[16px] font-semibold text-ink">
                        {lang === "tr" ? pkg.titleTr : pkg.titleEn}
                      </h4>
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-2">{pkg.description}</p>

                      {/* 3 Crop Chips */}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {pkg.crops.map((cid, idx) => (
                          <div
                            key={idx}
                            className="flex flex-col items-center rounded-xl border border-line bg-bg/80 p-2 text-center"
                          >
                            <span className="font-mono text-[10px] text-ink-2">{idx + 1}. Yıl</span>
                            <CropArt crop={cid} size={28} className="my-1" />
                            <span className="truncate w-full font-display text-[12px] font-semibold text-ink">
                              {L(CROPS[cid].name)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => applyRotationPackage(pkg.crops, pkg.recommendedIrrigation, pkg.recommendedTillage)}
                      className={`mt-4 w-full rounded-xl py-2 text-[12.5px] font-semibold transition-colors ${
                        isCurrentMatch
                          ? "bg-[#14532d] text-white"
                          : "bg-[#1e6b34] text-white hover:bg-[#165227]"
                      }`}
                    >
                      {isCurrentMatch
                        ? "✓ Aktif Olarak Seçili Paket"
                        : "Bu 3 Yıllık Rotasyonu Arazime Uygula →"}
                    </button>
                  </article>
                );
              })}
            </div>
          </div>

          {/* Interactive Provincial Crop Suitability & Direct Year Assignment Matrix */}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
              <div>
                <h3 className="font-display text-[16px] font-semibold text-ink">
                  {prov.kimlik_ve_cografya.il_adi} İli Ürün Uygunluk Matrisi ve Hızlı Yıl Atama
                </h3>
                <p className="text-[12px] text-ink-2">
                  İstediğiniz ürünü doğrudan 1. Yıl, 2. Yıl veya 3. Yıl sırasına tek tıkla yerleştirin:
                </p>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 text-[#166534]">● Uygun</span>
                <span className="rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[#92400e]">● Kısıtlı Uygun</span>
                <span className="rounded-full bg-[#fee2e2] px-2.5 py-0.5 text-[#991b1b]">● Don/İklim Riskli</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Object.values(matris.urun_detay_tablosu).map((entry) => {
                const mappedId = MASTER_TO_CROP_ID[entry.urun_kodu] ?? "wheat";
                const suitClass =
                  entry.ekolojik_uygunluk_durumu === "Uygun"
                    ? "bg-[#dcfce7] text-[#166534] border-[#86efac]"
                    : entry.ekolojik_uygunluk_durumu === "Kisitli_Uygun"
                      ? "bg-[#fef3c7] text-[#92400e] border-[#fde68a]"
                      : "bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]";
                const suitLabel =
                  entry.ekolojik_uygunluk_durumu === "Uygun"
                    ? "Uygun"
                    : entry.ekolojik_uygunluk_durumu === "Kisitli_Uygun"
                      ? "Kısıtlı Uygun"
                      : "Don Riskli";

                return (
                  <div
                    key={entry.urun_kodu}
                    className="flex flex-col justify-between rounded-xl border border-line bg-bg/60 p-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <CropArt crop={mappedId} size={26} />
                          <span className="truncate font-display text-[14px] font-semibold text-ink">
                            {entry.urun_adi.split(" (")[0]}
                          </span>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${suitClass}`}>
                          {suitLabel}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-1 text-center font-mono text-[10.5px]">
                        <div className="rounded bg-surface px-1.5 py-1">
                          <span className="block text-[9.5px] text-ink-2">ETc / dn</span>
                          <strong className="text-ink">{n(entry.ETc_mm, 0)}/{n(entry.net_su_ihtiyaci_dn_mm, 0)}</strong>
                        </div>
                        <div className="rounded bg-surface px-1.5 py-1">
                          <span className="block text-[9.5px] text-ink-2">Sulu/Kuru</span>
                          <strong className="text-[#1e6b34]">{entry.sulu_verim_kg_da}/{entry.kuru_verim_kg_da}</strong>
                        </div>
                        <div className="rounded bg-surface px-1.5 py-1">
                          <span className="block text-[9.5px] text-ink-2">Azot (ΔN)</span>
                          <strong className={entry.biyolojik_azot_etkisi_kg_da >= 0 ? "text-[#1e6b34]" : "text-[#b45309]"}>
                            {entry.biyolojik_azot_etkisi_kg_da >= 0 ? "+" : ""}{entry.biyolojik_azot_etkisi_kg_da}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* 1-Click Year Placement Buttons */}
                    <div className="mt-2.5 flex items-center justify-between gap-1 border-t border-line pt-2">
                      <span className="text-[10.5px] font-medium text-ink-2">Yıla Ata:</span>
                      <div className="flex items-center gap-1">
                        {([0, 1, 2] as const).map((yIdx) => {
                          const isSelected = store.inputs.rotation[yIdx] === mappedId;
                          return (
                            <button
                              key={yIdx}
                              type="button"
                              onClick={() => assignCropToYear(mappedId, yIdx)}
                              className={`rounded px-2 py-0.5 font-mono text-[10.5px] font-bold transition-colors ${
                                isSelected
                                  ? "bg-[#1e6b34] text-white"
                                  : "border border-line bg-surface text-ink-2 hover:border-[#1e6b34] hover:text-ink"
                              }`}
                            >
                              {yIdx + 1}. Yıl
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          TAB 3: PHOTO-BACKED SCIENTIFIC SOURCE CARDS
         ═══════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sources" && (
        <div className="mt-5">
          <SourceVisualCardsGrid lang={lang} />
        </div>
      )}

      {/* Bottom Action Strip */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5 text-[12.5px]">
        <p className="text-ink-2">{L(res.disclaimer)}</p>
        <div className="flex items-center gap-2">
          <Link href="/plan" className="btn btn-sm">
            <Icon name="plan" size={15} />
            <span>{lang === "tr" ? "Münavebe Stüdyosu (/plan)" : "Rotation Studio (/plan)"}</span>
          </Link>
          <Link href="/dayanak" className="btn btn-sm">
            <Icon name="evidence" size={15} />
            <span>{lang === "tr" ? "Kanıt & Kaynak Merkezi (/dayanak)" : "Evidence Hub (/dayanak)"}</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
