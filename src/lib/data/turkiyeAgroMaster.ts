import masterJson from "../../../data/turkiye_agro_master.json";
import type { CropId, RotationSequence } from "@/lib/types";

export type MasterTillageCode = "geleneksel_surum" | "aniza_dogrudan_ekim";
export type MasterIrrigationCode = "kuru_tarim" | "salma" | "yagmurlama" | "center_pivot" | "damla";
export type MasterClimateMode = "tipik" | "kurak" | "ssp245" | "ssp585";
export type MasterCropCode =
  | "Bugday"
  | "Arpa"
  | "Nohut"
  | "Kirmizi_Mercimek"
  | "Yesil_Mercimek"
  | "Aycicegi"
  | "Dane_Misir"
  | "Pamuk"
  | "Soya_Fasulyesi"
  | "Korunga_Yonca"
  | "Fig_Yem_Bezelyesi";

export type EcologicalSuitabilityStatus = "Uygun" | "Kisitli_Uygun" | "Iklim_Don_Nedeniyle_Riskli";

export interface MasterCropMatrixEntry {
  urun_kodu: MasterCropCode;
  urun_adi: string;
  familya: string;
  ekolojik_uygunluk_durumu: EcologicalSuitabilityStatus;
  ekim_donemi: string;
  hasat_donemi: string;
  yetisme_suresi_gun: number;
  Kc_katsayilari: {
    Kc1: number;
    Kc3: number;
    Kc4: number;
    sezon_agirlikli_Kc: number;
  };
  Ky_verim_tepki_faktoru: number;
  ETc_mm: number;
  Pe_etkin_mm: number;
  net_su_ihtiyaci_dn_mm: number;
  sulu_verim_kg_da: number;
  kuru_verim_kg_da: number;
  su_kullanim_etkinligi_WUE_kg_m3: number;
  biyolojik_azot_etkisi_kg_da: number;
  ekonomik_azot_etkisi_tl_da: number;
}

export interface MasterRotationPackage {
  rotasyon_3_yil: [MasterCropCode, MasterCropCode, MasterCropCode];
  onerilen_ekim_bicimi: MasterTillageCode;
  onerilen_sulama_bicimi: MasterIrrigationCode;
  aciklama: string;
}

export interface MasterProvinceRecord {
  kimlik_ve_cografya: {
    plaka: string;
    il_adi: string;
    cografi_bolge: string;
    havza_kodu: string;
    tagem_iklim_kodu: string;
    merkez_koordinat: { lat: number; lon: number };
    il_sinir_kutusu_bbox: { min_lat: number; max_lat: number; min_lon: number; max_lon: number };
    ortalama_tarim_rakimi_m: number;
    ortalama_egim_yuzde: number;
    srtm_erozyon_sinifi: string;
    onemli_tarim_ovalari: string[];
  };
  toprak_profili_0_30cm_soilgrids: {
    toprak_dokusu_sinifi: string;
    kil_yuzde: number;
    silt_yuzde: number;
    kum_yuzde: number;
    ph: number;
    kirec_CaCO3_yuzde: number;
    organik_madde_yuzde: number;
    organik_karbon_SOC_g_kg: number;
    toplam_azot_N_g_kg: number;
    hacim_agirligi_g_cm3: number;
    CEC_cmol_kg: number;
    tuzluluk_EC_dS_m: number;
    tarla_kapasitesi_m3_m3: number;
    solma_noktasi_m3_m3: number;
    yararlanilabilir_su_kapasitesi_TAW_mm_m: number;
    drenaj_durumu: string;
    uncertainty_note: string;
  };
  iklim_ve_su_serisi_2005_2026: {
    tarim_yili_tanimi: string;
    tipik_sezon_etiketi: string;
    kurak_sezon_etiketi: string;
    yillik_yagis_tipik_mm: number;
    yillik_yagis_kurak_mm: number;
    yillik_yagis_maks_mm: number;
    yillik_referans_ETo_mm: number;
    aylik_yagis_12_ay_mm: number[];
    aylik_ETo_12_ay_mm: number[];
    aylik_ortalama_sicaklik_12_ay_C: number[];
    yaz_maks_sicaklik_ort_C: number;
    kis_min_sicaklik_ort_C: number;
    son_ilkbahar_don_tarihi: string;
    ilk_sonbahar_don_tarihi: string;
    donsuz_gun_sayisi: number;
    gpm_siddetli_saganak_gun_sayisi: number;
    iklim_kaymasi_2005_2015_vs_2016_2026: {
      yagis_degisim_yuzde: number;
      sicaklik_artis_C: number;
      eto_artis_mm: number;
    };
  };
  uydu_gozlem_smap_hls_ecostress: {
    smap_kok_nemi_4_mevsim_m3_m3: {
      kis: number;
      ilkbahar: number;
      yaz: number;
      sonbahar: number;
    };
    hls_modis_aylik_ndvi_12_ay: number[];
    ecostress_yaz_yuzey_sicakligi_LST_C: number;
    ecostress_termal_stres_gun_sayisi: number;
    ciplak_toprak_erozyon_penceresi_aylar: string[];
  };
  projeksiyon_2035_cmip6: {
    ssp245: {
      sicaklik_artisi_C: number;
      yagis_degisimi_yuzde: number;
      ETo_artisi_yuzde: number;
      etkili_yagis_katsayisi_Pe: number;
      fenolojik_erken_olgunlasma_gun: number;
      "2035_kuraklik_risk_sinifi": string;
    };
    ssp585: {
      sicaklik_artisi_C: number;
      yagis_degisimi_yuzde: number;
      ETo_artisi_yuzde: number;
      etkili_yagis_katsayisi_Pe: number;
      fenolojik_erken_olgunlasma_gun: number;
      "2035_kuraklik_risk_sinifi": string;
    };
  };
  il_urun_verim_su_ve_rotasyon_matrisi: {
    stratejik_urunler: MasterCropCode[];
    urun_detay_tablosu: Record<MasterCropCode, MasterCropMatrixEntry>;
    onerilen_3_yillik_rotasyon_paketleri: {
      Dengeli_Gelir: MasterRotationPackage;
      Maksimum_Su_Tasarrufu: MasterRotationPackage;
      Toprak_Azot_Onarimi: MasterRotationPackage;
    };
    yerel_hastalik_zararli_uyarisi: string;
    il_ozel_tarimsal_not: string;
  };
}

export interface MasterTillageSpec {
  kod: MasterTillageCode;
  ad: string;
  buharlasma_katsayisi: number;
  toprak_nemi_koruma_mm: number;
  infiltrasyon_katsayisi: number;
  gpm_saganak_kayip_orani: number;
  erozyon_ve_sikisma_riski: string;
  organik_madde_yillik_degisim_pct: number;
  yakit_tuketimi_lt_da: number;
  aciklama: string;
}

export interface MasterIrrigationSpec {
  kod: MasterIrrigationCode;
  ad: string;
  Ea: number;
  Ec: number;
  toplam_randiman: number;
  sulama_uygulanir_mi: boolean;
  aciklama: string;
}

const rawMaster = masterJson as unknown as {
  metadata: Record<string, unknown>;
  ekim_bicimleri: Record<MasterTillageCode, MasterTillageSpec>;
  sulama_bicimleri: Record<MasterIrrigationCode, MasterIrrigationSpec>;
  tarim_havzalari: Record<string, Record<string, unknown>>;
  urun_katalogu: Record<MasterCropCode, Record<string, unknown>>;
  iller_detayli_81: Record<string, MasterProvinceRecord>;
};

export const TURKIYE_AGRO_MASTER = rawMaster;

/** Map AgroShift CropId -> MasterCropCode */
export const CROP_ID_TO_MASTER: Record<CropId, MasterCropCode> = {
  wheat_winter: "Bugday",
  barley_winter: "Arpa",
  chickpea: "Nohut",
  lentil_red: "Kirmizi_Mercimek",
  lentil_green: "Yesil_Mercimek",
  sugar_beet: "Dane_Misir",
  maize_grain: "Dane_Misir",
  sunflower: "Aycicegi",
  soybean: "Soya_Fasulyesi",
  canola: "Aycicegi",
  safflower: "Nohut",
  dry_bean: "Soya_Fasulyesi",
  potato: "Dane_Misir",
  alfalfa: "Korunga_Yonca",
  sainfoin: "Korunga_Yonca",
  vetch: "Fig_Yem_Bezelyesi",
  cotton: "Pamuk",
  fallow: "Fig_Yem_Bezelyesi",
};

/** Map MasterCropCode -> AgroShift CropId */
export const MASTER_TO_CROP_ID: Record<MasterCropCode, CropId> = {
  Bugday: "wheat_winter",
  Arpa: "barley_winter",
  Nohut: "chickpea",
  Kirmizi_Mercimek: "lentil_red",
  Yesil_Mercimek: "lentil_green",
  Aycicegi: "sunflower",
  Dane_Misir: "maize_grain",
  Pamuk: "cotton",
  Soya_Fasulyesi: "soybean",
  Korunga_Yonca: "sainfoin",
  Fig_Yem_Bezelyesi: "vetch",
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface MatchedProvinceResult {
  plaka: string;
  distanceKm: number;
  isInTurkey: boolean;
  province: MasterProvinceRecord;
  basin: Record<string, unknown>;
}

/**
 * Matches any (lat, lon) coordinate in Turkey to one of the 81 provinces ("01".."81")
 * using bounding-box containment + Haversine distance to provincial agricultural centers.
 * Sets `isInTurkey: false` when the coordinate lies outside Turkey's borders/bounds so
 * global parcels (e.g. in the Americas) are never mislabeled as a Turkish province like Edirne.
 */
export function matchMasterProvince(lat: number, lon: number): MatchedProvinceResult {
  const iller = rawMaster.iller_detayli_81;
  let insideBestPlaka: string | null = null;
  let insideBestDist = Infinity;
  let globalBestPlaka = "42";
  let globalBestDist = Infinity;

  for (const [plaka, pdata] of Object.entries(iller)) {
    const kc = pdata.kimlik_ve_cografya;
    const c = kc.merkez_koordinat;
    const bbox = kc.il_sinir_kutusu_bbox;
    const d = haversineKm(lat, lon, c.lat, c.lon);

    if (d < globalBestDist) {
      globalBestDist = d;
      globalBestPlaka = plaka;
    }

    if (
      lat >= bbox.min_lat &&
      lat <= bbox.max_lat &&
      lon >= bbox.min_lon &&
      lon <= bbox.max_lon &&
      d < insideBestDist
    ) {
      insideBestDist = d;
      insideBestPlaka = plaka;
    }
  }

  const chosenPlaka = insideBestPlaka ?? globalBestPlaka;
  const chosenDist = insideBestPlaka ? insideBestDist : globalBestDist;
  const inTurkeyBbox = lat >= 35.8 && lat <= 42.15 && lon >= 25.6 && lon <= 44.85;
  const isInTurkey = insideBestPlaka !== null || (inTurkeyBbox && chosenDist <= 120);
  const province = iller[chosenPlaka];
  const basin = rawMaster.tarim_havzalari[province.kimlik_ve_cografya.havza_kodu];

  return {
    plaka: chosenPlaka,
    distanceKm: Number(chosenDist.toFixed(1)),
    isInTurkey,
    province,
    basin,
  };
}

export function getMasterProvinceByPlaka(plaka: string): MasterProvinceRecord | null {
  const key = plaka.padStart(2, "0");
  return rawMaster.iller_detayli_81[key] ?? null;
}

export interface MasterYearlyEval {
  year: 1 | 2 | 3;
  cropId: CropId;
  masterCode: MasterCropCode;
  cropNameTr: string;
  familyTr: string;
  suitability: EcologicalSuitabilityStatus;
  sowingPeriod: string;
  harvestPeriod: string;
  durationDays: number;
  kcWeighted: number;
  ky: number;
  etcMm: number;
  peMm: number;
  smapRootCreditMm: number;
  dnNetMm: number;
  dtGrossMm: number;
  dtGrossM3PerDa: number;
  expectedYieldKgDa: number;
  wueKgM3: number;
  nitrogenDeltaKgDa: number;
  nitrogenValueTlDa: number;
}

export interface MasterRotationEval {
  plaka: string;
  provinceName: string;
  regionName: string;
  tagemClimateCode: string;
  agriculturalPlains: string[];
  tillage: MasterTillageSpec;
  irrigation: MasterIrrigationSpec;
  climateMode: MasterClimateMode;
  years: [MasterYearlyEval, MasterYearlyEval, MasterYearlyEval];
  totals: {
    totalEtcMm: number;
    totalPeMm: number;
    totalDnNetMm: number;
    totalDtGrossMm: number;
    avgAnnualDnMm: number;
    avgAnnualDtMm: number;
    totalYieldKgDa3Yr: number;
    netNitrogenKgDa3Yr: number;
    organicMatterChangePct3Yr: number;
    fuelLitersPerDa3Yr: number;
    hasLegume: boolean;
  };
  packages: {
    id: "Dengeli_Gelir" | "Maksimum_Su_Tasarrufu" | "Toprak_Azot_Onarimi";
    titleTr: string;
    titleEn: string;
    badgeTr: string;
    crops: RotationSequence;
    masterCrops: [MasterCropCode, MasterCropCode, MasterCropCode];
    recommendedTillage: MasterTillageCode;
    recommendedIrrigation: MasterIrrigationCode;
    description: string;
    avgDnMm: number;
    avgDtMm: number;
    netNitrogenKgDa: number;
  }[];
  warnings: string[];
  agronomicNote: string;
  pestDiseaseWarning: string;
}

export function evaluateMasterPlan(params: {
  lat: number;
  lon: number;
  crops: RotationSequence;
  tillageCode?: MasterTillageCode;
  irrigationCode?: MasterIrrigationCode;
  climateMode?: MasterClimateMode;
}): MasterRotationEval {
  const { plaka, province } = matchMasterProvince(params.lat, params.lon);
  const kc = province.kimlik_ve_cografya;
  const matris = province.il_urun_verim_su_ve_rotasyon_matrisi;
  const tillageCode = params.tillageCode ?? "aniza_dogrudan_ekim";
  const irrigationCode = params.irrigationCode ?? "damla";
  const climateMode = params.climateMode ?? "tipik";

  const tillage = rawMaster.ekim_bicimleri[tillageCode] ?? rawMaster.ekim_bicimleri.aniza_dogrudan_ekim;
  const irrigation = rawMaster.sulama_bicimleri[irrigationCode] ?? rawMaster.sulama_bicimleri.damla;

  const evalSingleYear = (cropId: CropId, yr: 1 | 2 | 3): MasterYearlyEval => {
    const masterCode = CROP_ID_TO_MASTER[cropId] ?? "Bugday";
    const entry = matris.urun_detay_tablosu[masterCode] ?? matris.urun_detay_tablosu.Bugday;

    const etcMult =
      climateMode === "kurak"
        ? 1.09
        : climateMode === "ssp585"
          ? 1 + province.projeksiyon_2035_cmip6.ssp585.ETo_artisi_yuzde / 100
          : climateMode === "ssp245"
            ? 1 + province.projeksiyon_2035_cmip6.ssp245.ETo_artisi_yuzde / 100
            : 1.0;

    const peMult =
      climateMode === "kurak"
        ? 0.68
        : climateMode === "ssp585"
          ? Math.max(0.55, 1 + province.projeksiyon_2035_cmip6.ssp585.yagis_degisimi_yuzde / 100)
          : climateMode === "ssp245"
            ? Math.max(0.65, 1 + province.projeksiyon_2035_cmip6.ssp245.yagis_degisimi_yuzde / 100)
            : 1.0;

    const etcMm =
      cropId === "fallow"
        ? 145
        : Number((entry.ETc_mm * etcMult * (0.82 + 0.18 * tillage.buharlasma_katsayisi)).toFixed(1));
    const peMm = Number((entry.Pe_etkin_mm * peMult * tillage.infiltrasyon_katsayisi).toFixed(1));
    const smapRootCreditMm = Number((22 + tillage.toprak_nemi_koruma_mm).toFixed(1));
    const dnNetMm = cropId === "fallow" ? 0 : Math.max(0, Number((etcMm - peMm - smapRootCreditMm).toFixed(1)));
    const dtGrossMm =
      irrigation.sulama_uygulanir_mi && irrigation.toplam_randiman > 0
        ? Number((dnNetMm / irrigation.toplam_randiman).toFixed(1))
        : 0;

    const baseYield =
      cropId === "fallow"
        ? 0
        : irrigation.sulama_uygulanir_mi
          ? entry.sulu_verim_kg_da
          : entry.kuru_verim_kg_da;
    const climateYieldFactor = climateMode === "kurak" ? 0.86 : climateMode === "ssp585" ? 0.89 : climateMode === "ssp245" ? 0.94 : 1.0;
    const tillageYieldBonus = tillageCode === "aniza_dogrudan_ekim" && !irrigation.sulama_uygulanir_mi ? 1.08 : 1.02;

    return {
      year: yr,
      cropId,
      masterCode,
      cropNameTr: cropId === "fallow" ? "Nadas (Toprak Dinlendirme)" : entry.urun_adi,
      familyTr: entry.familya,
      suitability: entry.ekolojik_uygunluk_durumu,
      sowingPeriod: entry.ekim_donemi,
      harvestPeriod: entry.hasat_donemi,
      durationDays: entry.yetisme_suresi_gun,
      kcWeighted: entry.Kc_katsayilari.sezon_agirlikli_Kc,
      ky: entry.Ky_verim_tepki_faktoru,
      etcMm,
      peMm,
      smapRootCreditMm,
      dnNetMm,
      dtGrossMm,
      dtGrossM3PerDa: Number((dtGrossMm).toFixed(1)),
      expectedYieldKgDa: Math.round(baseYield * climateYieldFactor * tillageYieldBonus),
      wueKgM3: entry.su_kullanim_etkinligi_WUE_kg_m3,
      nitrogenDeltaKgDa: cropId === "fallow" ? 1.5 : entry.biyolojik_azot_etkisi_kg_da,
      nitrogenValueTlDa: cropId === "fallow" ? 63 : entry.ekonomik_azot_etkisi_tl_da,
    };
  };

  const years: [MasterYearlyEval, MasterYearlyEval, MasterYearlyEval] = [
    evalSingleYear(params.crops[0], 1),
    evalSingleYear(params.crops[1], 2),
    evalSingleYear(params.crops[2], 3),
  ];

  const totalEtcMm = Number(years.reduce((s, y) => s + y.etcMm, 0).toFixed(1));
  const totalPeMm = Number(years.reduce((s, y) => s + y.peMm, 0).toFixed(1));
  const totalDnNetMm = Number(years.reduce((s, y) => s + y.dnNetMm, 0).toFixed(1));
  const totalDtGrossMm = Number(years.reduce((s, y) => s + y.dtGrossMm, 0).toFixed(1));
  const totalYieldKgDa3Yr = years.reduce((s, y) => s + y.expectedYieldKgDa, 0);
  const netNitrogenKgDa3Yr = Number(years.reduce((s, y) => s + y.nitrogenDeltaKgDa, 0).toFixed(1));
  const hasLegume = years.some((y) => y.nitrogenDeltaKgDa > 2);

  const omBase = tillage.organik_madde_yillik_degisim_pct * 3 + (hasLegume ? 0.06 : -0.02);
  const organicMatterChangePct3Yr = Number(omBase.toFixed(2));

  const warnings: string[] = [];
  for (const y of years) {
    if (y.suitability === "Iklim_Don_Nedeniyle_Riskli") {
      warnings.push(
        `${y.year}. yıldaki ${y.cropNameTr} ürünü ${kc.il_adi} ilinde don/vejetasyon süresi nedeniyle ekolojik olarak risklidir (${y.sowingPeriod}).`,
      );
    } else if (y.suitability === "Kisitli_Uygun") {
      warnings.push(
        `${y.year}. yıldaki ${y.cropNameTr} ürünü ${kc.il_adi} ilinde kısıtlı uygundur; mikro-klima ve sulama zamanlamasına dikkat edilmelidir.`,
      );
    }
  }
  if (!hasLegume) {
    warnings.push(
      `3 yıllık dizilimde hiç baklagil (Nohut, Mercimek, Soya, Fiğ, Yonca) yer almıyor. Toprakta 3 yılda ${netNitrogenKgDa3Yr} kg/da azot açığı oluşur.`,
    );
  }
  if (params.crops[0] === params.crops[1] || params.crops[1] === params.crops[2]) {
    warnings.push(
      "Ardışık yıllarda aynı ürünün (monokültür) ekilmesi kök çürüklüğü, yabancı ot direnci ve verim düşüşü riskini artırır.",
    );
  }

  const rawPkgs = matris.onerilen_3_yillik_rotasyon_paketleri;
  const pkgDefs: {
    id: "Dengeli_Gelir" | "Maksimum_Su_Tasarrufu" | "Toprak_Azot_Onarimi";
    titleTr: string;
    titleEn: string;
    badgeTr: string;
    pkg: MasterRotationPackage;
  }[] = [
    {
      id: "Dengeli_Gelir",
      titleTr: `${kc.il_adi} Dengeli Gelir & İklim Paketi`,
      titleEn: `${kc.il_adi} Balanced Income & Climate Package`,
      badgeTr: "Dengeli Gelir",
      pkg: rawPkgs.Dengeli_Gelir,
    },
    {
      id: "Maksimum_Su_Tasarrufu",
      titleTr: `${kc.il_adi} Maksimum Su Tasarrufu Paketi`,
      titleEn: `${kc.il_adi} Maximum Water Saving Package`,
      badgeTr: "Su Kalkanı",
      pkg: rawPkgs.Maksimum_Su_Tasarrufu,
    },
    {
      id: "Toprak_Azot_Onarimi",
      titleTr: `${kc.il_adi} Toprak & Biyolojik Azot Onarımı`,
      titleEn: `${kc.il_adi} Soil & Biological Nitrogen Recovery`,
      badgeTr: "Azot Onarımı",
      pkg: rawPkgs.Toprak_Azot_Onarimi,
    },
  ];

  const packages = pkgDefs.map((d) => {
    const mappedCrops: RotationSequence = [
      MASTER_TO_CROP_ID[d.pkg.rotasyon_3_yil[0]] ?? "wheat",
      MASTER_TO_CROP_ID[d.pkg.rotasyon_3_yil[1]] ?? "chickpea",
      MASTER_TO_CROP_ID[d.pkg.rotasyon_3_yil[2]] ?? "sunflower",
    ];
    const pYears = [
      evalSingleYear(mappedCrops[0], 1),
      evalSingleYear(mappedCrops[1], 2),
      evalSingleYear(mappedCrops[2], 3),
    ];
    const pDn = Number((pYears.reduce((s, y) => s + y.dnNetMm, 0) / 3).toFixed(0));
    const pDt = Number((pYears.reduce((s, y) => s + y.dtGrossMm, 0) / 3).toFixed(0));
    const pN = Number(pYears.reduce((s, y) => s + y.nitrogenDeltaKgDa, 0).toFixed(1));
    return {
      id: d.id,
      titleTr: d.titleTr,
      titleEn: d.titleEn,
      badgeTr: d.badgeTr,
      crops: mappedCrops,
      masterCrops: d.pkg.rotasyon_3_yil,
      recommendedTillage: d.pkg.onerilen_ekim_bicimi,
      recommendedIrrigation: d.pkg.onerilen_sulama_bicimi,
      description: d.pkg.aciklama,
      avgDnMm: pDn,
      avgDtMm: pDt,
      netNitrogenKgDa: pN,
    };
  });

  return {
    plaka,
    provinceName: kc.il_adi,
    regionName: kc.cografi_bolge,
    tagemClimateCode: kc.tagem_iklim_kodu,
    agriculturalPlains: kc.onemli_tarim_ovalari,
    tillage,
    irrigation,
    climateMode,
    years,
    totals: {
      totalEtcMm,
      totalPeMm,
      totalDnNetMm,
      totalDtGrossMm,
      avgAnnualDnMm: Number((totalDnNetMm / 3).toFixed(1)),
      avgAnnualDtMm: Number((totalDtGrossMm / 3).toFixed(1)),
      totalYieldKgDa3Yr,
      netNitrogenKgDa3Yr,
      organicMatterChangePct3Yr,
      fuelLitersPerDa3Yr: Number((tillage.yakit_tuketimi_lt_da * 3).toFixed(1)),
      hasLegume,
    },
    packages,
    warnings,
    agronomicNote: matris.il_ozel_tarimsal_not,
    pestDiseaseWarning: matris.yerel_hastalik_zararli_uyarisi,
  };
}
