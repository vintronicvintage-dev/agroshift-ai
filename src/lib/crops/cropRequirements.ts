/**
 * AgroShift AI — Crop Ecophysiological Growth Requirements & Multi-Factor Habitat Suitability Learning Engine.
 *
 * Teaches the background calculation model the exact agro-ecological, thermal (GDD/vernalization/frost/heat),
 * hydrological (ETc/dryland precip/Ky/p), edaphic (USDA texture, clay/sand limits, pH, ECe salinity, lime, SOC),
 * topographic (SRTM elevation & slope), and rotational/N-P-K requirements for all 18 Turkish field & basin crops.
 *
 * Primary Scientific Sources:
 *  - FAO Irrigation and Drainage Paper 56 (Allen et al. 1998) — Tables 11, 12, 22, 23 (salinity ECe)
 *  - FAO Irrigation and Drainage Paper 33 & 66 (Doorenbos & Kassam 1979; Steduto et al. 2012)
 *  - FAO EcoCrop & IIASA/FAO GAEZ v4 Crop Ecological Requirements Database
 *  - TAGEM & DSİ (2017) Türkiye'de Sulanan Bitkilerin Bitki Su Tüketimleri Rehberi
 *  - Tarım ve Orman Bakanlığı Türkiye Tarım Havzaları Üretim ve Destekleme Modeli (TTHDM)
 */

import type { CropId, LocalizedText } from "../types";
import { CROPS, CROP_IDS } from "./database";
import { preCropEffect } from "./preCrop";

export interface CropGrowthRequirementsSpec {
  cropId: CropId;
  scientificName: string;
  basinSupportCategory: LocalizedText;
  thermal: {
    germinationMinC: number;
    optimalTempRangeC: [number, number];
    gddBaseC: number;
    gddRequired: number;
    frostKillC: number;
    heatStressThresholdC: number;
    vernalizationDays: [number, number];
    photoperiod: "uzun_gun" | "kisa_gun" | "notr_gun";
  };
  water: {
    seasonalEtcRangeMm: [number, number];
    minDrylandPrecipMm: number;
    droughtTolerance: "Cok_Yuksek" | "Yuksek" | "Orta" | "Dusuk_Hassas";
    waterloggingSensitivity: "Hassas" | "Orta" | "Toleransli";
    criticalStage: LocalizedText;
  };
  soil: {
    preferredTextures: LocalizedText;
    clayRangePct: { optMin: number; optMax: number; absMax: number };
    sandRangePct: { optMin: number; optMax: number };
    optimalPh: [number, number];
    toleratedPh: [number, number];
    minOrganicMatterPct: number;
    /** FAO-56 Table 23 soil saturation extract salinity threshold ECe (dS/m) before yield decline. */
    salinityThresholdDsm: number;
    limeTolerance: "Yuksek_Kirec_Sever" | "Orta" | "Dusuk_Kloroz_Riskli";
  };
  topography: {
    elevationRangeM: { min: number; optMax: number; absMax: number };
    maxSlopePct: number;
  };
  nutrientsAndRotation: {
    npkDemandKgDa: { N: number; P2O5: number; K2O: number };
    biologicalNFixationKgDa: [number, number];
    minBreakYears: number;
    idealPreCrops: CropId[];
    incompatiblePreCrops: CropId[];
    keyRisks: LocalizedText;
    growthSummary: LocalizedText;
  };
}

export const CROP_REQUIREMENTS: Record<CropId, CropGrowthRequirementsSpec> = {
  wheat_winter: {
    cropId: "wheat_winter",
    scientificName: "Triticum aestivum L. / T. durum Desf.",
    basinSupportCategory: {
      tr: "Stratejik Hububat (81 İl Havza Desteği)",
      en: "Strategic Cereal (All 81 Provincial Basins)",
    },
    thermal: {
      germinationMinC: 4,
      optimalTempRangeC: [15, 24],
      gddBaseC: 0,
      gddRequired: 1700,
      frostKillC: -20,
      heatStressThresholdC: 32,
      vernalizationDays: [35, 55],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [420, 620],
      minDrylandPrecipMm: 320,
      droughtTolerance: "Yuksek",
      waterloggingSensitivity: "Orta",
      criticalStage: {
        tr: "Sapa kalkma – Başaklanma ve Çiçeklenme (Nisan–Mayıs)",
        en: "Stem elongation to heading and anthesis (Apr–May)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Siltli-Tınlı (derin ve su tutma kapasitesi yüksek)",
        en: "Loam, Clay Loam, Silt Loam (deep with high water-holding capacity)",
      },
      clayRangePct: { optMin: 20, optMax: 42, absMax: 55 },
      sandRangePct: { optMin: 15, optMax: 50 },
      optimalPh: [6.0, 7.8],
      toleratedPh: [5.5, 8.5],
      minOrganicMatterPct: 1.5,
      salinityThresholdDsm: 6.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1650, absMax: 2100 },
      maxSlopePct: 12,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 14, P2O5: 7, K2O: 5 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 1,
      idealPreCrops: ["chickpea", "lentil_red", "lentil_green", "canola", "vetch", "sainfoin", "sunflower"],
      incompatiblePreCrops: ["wheat_winter", "barley_winter", "maize_grain"],
      keyRisks: {
        tr: "Üst üste tahıl ekiminde kökboğazı çürüklüğü (Take-all / Fusarium), süne ve sarı pas",
        en: "Take-all root rot, Fusarium crown rot in continuous cereals, sunn pest and yellow rust",
      },
      growthSummary: {
        tr: "Kışlık soğuklama (35–55 gün 0–7 °C) ve sapa kalkma döneminde yeterli toprak nemi ister; baklagil veya kanola sonrası %10–14 verim artışı sağlar.",
        en: "Requires winter vernalization (35–55 days at 0–7 °C) and root-zone moisture at stem elongation; yields +10–14% after legumes or canola.",
      },
    },
  },

  barley_winter: {
    cropId: "barley_winter",
    scientificName: "Hordeum vulgare L.",
    basinSupportCategory: {
      tr: "Stratejik Yemlik & Maltlık Hububat (Tüm Havzalar)",
      en: "Strategic Feed & Malting Cereal (All Basins)",
    },
    thermal: {
      germinationMinC: 3,
      optimalTempRangeC: [14, 22],
      gddBaseC: 0,
      gddRequired: 1500,
      frostKillC: -18,
      heatStressThresholdC: 32,
      vernalizationDays: [20, 40],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [350, 500],
      minDrylandPrecipMm: 270,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Kardeşlenme sonu – Başaklanma başlangıcı (Mart–Nisan)",
        en: "Late tillering to booting/heading (Mar–Apr)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Kumlu-Tınlı, Kireçli Killi-Tın (iyi drene olan hafif-orta bünyeli topraklar)",
        en: "Loam, Sandy Loam, Calcareous Clay Loam (well-drained medium soils)",
      },
      clayRangePct: { optMin: 15, optMax: 36, absMax: 48 },
      sandRangePct: { optMin: 20, optMax: 60 },
      optimalPh: [6.5, 8.2],
      toleratedPh: [6.0, 8.5],
      minOrganicMatterPct: 1.2,
      salinityThresholdDsm: 8.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1850, absMax: 2300 },
      maxSlopePct: 14,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 10, P2O5: 6, K2O: 4 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 1,
      idealPreCrops: ["chickpea", "lentil_red", "lentil_green", "vetch", "safflower", "sunflower"],
      incompatiblePreCrops: ["barley_winter", "wheat_winter"],
      keyRisks: {
        tr: "Ağır ve su tutan topraklarda kök boğulması, arpa çizgili yaprak lekesi ve yatma",
        en: "Waterlogging in heavy clay soils, barley stripe disease and lodging under excess N",
      },
      growthSummary: {
        tr: "Buğdaya göre 15–20 gün erken olgunlaşarak yaz kuraklığından kaçar; tuzluluğa (8.0 dS/m) en dayanıklı kültür bitkisidir.",
        en: "Matures 15–20 days earlier than wheat to escape summer drought; highest salinity tolerance (8.0 dS/m) among field crops.",
      },
    },
  },

  chickpea: {
    cropId: "chickpea",
    scientificName: "Cicer arietinum L.",
    basinSupportCategory: {
      tr: "Stratejik Yemeklik Dane Baklagil (Kurak/Yarı-Kurak Havzalar)",
      en: "Strategic Grain Legume (Arid/Semi-Arid Basins)",
    },
    thermal: {
      germinationMinC: 8,
      optimalTempRangeC: [18, 28],
      gddBaseC: 0,
      gddRequired: 1100,
      frostKillC: -10,
      heatStressThresholdC: 30,
      vernalizationDays: [0, 0],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [280, 400],
      minDrylandPrecipMm: 300,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Çiçeklenme ve Bakla Bağlama (Mayıs–Haziran)",
        en: "Flowering and pod setting (May–Jun)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Kumlu-Tınlı, Tınlı, Kireçli Tın (iyi havalanan, su tutmayan topraklar)",
        en: "Sandy Loam, Loam, Calcareous Loam (well-aerated, non-waterlogging soils)",
      },
      clayRangePct: { optMin: 12, optMax: 32, absMax: 42 },
      sandRangePct: { optMin: 25, optMax: 65 },
      optimalPh: [6.5, 8.2],
      toleratedPh: [6.0, 9.0],
      minOrganicMatterPct: 1.0,
      salinityThresholdDsm: 1.8,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 50, optMax: 1500, absMax: 1850 },
      maxSlopePct: 12,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 3, P2O5: 6, K2O: 3 },
      biologicalNFixationKgDa: [3.0, 9.0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain"],
      incompatiblePreCrops: ["chickpea", "lentil_red", "lentil_green", "dry_bean", "vetch", "sunflower"],
      keyRisks: {
        tr: "Yağışlı/nemli ilkbaharda Antraknoz (Ascochyta rabiei) yanıklığı ve Fusarium solgunluğu",
        en: "Ascochyta blight in wet springs and Fusarium wilt under short rotations (< 3 years)",
      },
      growthSummary: {
        tr: "Kireçli ve kıraç topraklarda Rhizobium bakterileriyle dekara 3–9 kg saf azot bağlar; nadası ortadan kaldıran en önemli münavebe bitkisidir.",
        en: "Fixes 30–90 kg N/ha on calcareous dryland soils via Rhizobium symbiosis; primary rotation crop to replace bare fallow.",
      },
    },
  },

  lentil_red: {
    cropId: "lentil_red",
    scientificName: "Lens culinaris Medik. (subsp. microsperma)",
    basinSupportCategory: {
      tr: "Stratejik Baklagil (Güneydoğu & Geçit Havzaları Kışlık)",
      en: "Strategic Pulse (Southeast & Transitional Winter Basins)",
    },
    thermal: {
      germinationMinC: 5,
      optimalTempRangeC: [15, 25],
      gddBaseC: 0,
      gddRequired: 1000,
      frostKillC: -12,
      heatStressThresholdC: 30,
      vernalizationDays: [0, 15],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [260, 380],
      minDrylandPrecipMm: 280,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Çiçeklenme ve Erken Bakla Dolumu (Nisan)",
        en: "Flowering and early pod fill (Apr)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Kumlu-Tınlı (taşsız ve düz yüzeyli, biçerdöver hasadına uygun)",
        en: "Loam, Clay Loam, Sandy Loam (stone-free level surface for low cutterbar harvest)",
      },
      clayRangePct: { optMin: 15, optMax: 38, absMax: 46 },
      sandRangePct: { optMin: 20, optMax: 60 },
      optimalPh: [6.0, 8.0],
      toleratedPh: [5.5, 8.5],
      minOrganicMatterPct: 1.1,
      salinityThresholdDsm: 1.5,
      limeTolerance: "Orta",
    },
    topography: {
      elevationRangeM: { min: 100, optMax: 1100, absMax: 1450 },
      maxSlopePct: 8,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 2.5, P2O5: 6, K2O: 2 },
      biologicalNFixationKgDa: [3.0, 9.0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "cotton"],
      incompatiblePreCrops: ["lentil_red", "lentil_green", "chickpea", "vetch", "dry_bean"],
      keyRisks: {
        tr: "Canavar otu (Orobanche), aşırı soğuk kışlarda don zararı ve yabancı ot rekabeti",
        en: "Broomrape (Orobanche), severe winter kill below −12 °C, and early weed competition",
      },
      growthSummary: {
        tr: "Kışlık ekilerek kış ve erken ilkbahar yağışlarını değerlendirir; arkasından gelen buğdaya temiz ve azotça zengin (%10–12 daha verimli) tohum yatağı bırakır.",
        en: "Winter-sown in warm/transitional plains to capture winter rain; leaves 15–40 kg N/ha and boosts subsequent wheat yield by 10–12%.",
      },
    },
  },

  lentil_green: {
    cropId: "lentil_green",
    scientificName: "Lens culinaris Medik. (subsp. macrosperma)",
    basinSupportCategory: {
      tr: "Stratejik Baklagil (İç Anadolu & Orta Karadeniz Geçit Yaylası)",
      en: "Strategic Highland Pulse (Central Anatolia & Transitional Plateau)",
    },
    thermal: {
      germinationMinC: 4,
      optimalTempRangeC: [14, 24],
      gddBaseC: 0,
      gddRequired: 1050,
      frostKillC: -14,
      heatStressThresholdC: 30,
      vernalizationDays: [0, 10],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [270, 390],
      minDrylandPrecipMm: 300,
      droughtTolerance: "Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Çiçeklenme ve İri Dane Dolumu (Mayıs–Haziran)",
        en: "Flowering and macrosperma seed fill (May–Jun)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Kumlu-Tınlı, Kireçli Tın (İç Anadolu bozkır ve yayla toprakları)",
        en: "Loam, Sandy Loam, Calcareous Loam (Central Anatolian plateau soils)",
      },
      clayRangePct: { optMin: 15, optMax: 35, absMax: 44 },
      sandRangePct: { optMin: 20, optMax: 60 },
      optimalPh: [6.2, 8.2],
      toleratedPh: [6.0, 8.5],
      minOrganicMatterPct: 1.1,
      salinityThresholdDsm: 1.5,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 400, optMax: 1550, absMax: 1850 },
      maxSlopePct: 10,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 2.5, P2O5: 6, K2O: 2.5 },
      biologicalNFixationKgDa: [3.5, 9.5],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "safflower"],
      incompatiblePreCrops: ["lentil_green", "lentil_red", "chickpea", "dry_bean", "vetch"],
      keyRisks: {
        tr: "Geç ilkbahar donları, olgunlaşmada bakla çatlaması (shattering) ve kök çürüklüğü",
        en: "Late spring frosts, pod shattering at harvest if delayed, and Fusarium root rot",
      },
      growthSummary: {
        tr: "Yozgat, Çorum, Kırşehir, Konya ve Ankara gibi yüksek rakımlı (800–1550 m) yaylalarda erken ilkbahar ekimiyle nadas alanlarını daraltan yüksek değerli baklagildir.",
        en: "High-value macrosperma green lentil adapted to 800–1550 m Central Anatolian plateaus through early spring sowing.",
      },
    },
  },

  sugar_beet: {
    cropId: "sugar_beet",
    scientificName: "Beta vulgaris L. subsp. vulgaris",
    basinSupportCategory: {
      tr: "Kotalı Endüstri Bitkisi (Sulu Tarım Havzaları — 4 Yıl Münavebe Zorunlu)",
      en: "Quota Industrial Root Crop (Irrigated Basins — Mandatory 4-Year Rotation)",
    },
    thermal: {
      germinationMinC: 5,
      optimalTempRangeC: [16, 25],
      gddBaseC: 3,
      gddRequired: 2400,
      frostKillC: -4,
      heatStressThresholdC: 35,
      vernalizationDays: [0, 0],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [750, 1050],
      minDrylandPrecipMm: 650,
      droughtTolerance: "Orta",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Yumru (Kök) İrileşmesi ve Şeker (Polar) Birikimi (Temmuz–Ağustos)",
        en: "Taproot bulking and sucrose accumulation (Jul–Aug)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Tınlı, Killi-Tınlı, Alüvyal (en az 100 cm derinlik, taşsız ve geçirgen)",
        en: "Deep Loam, Clay Loam, Alluvial (≥ 100 cm depth, stone-free, friable)",
      },
      clayRangePct: { optMin: 18, optMax: 35, absMax: 45 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.8, 8.0],
      toleratedPh: [6.5, 8.5],
      minOrganicMatterPct: 1.8,
      salinityThresholdDsm: 7.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 100, optMax: 1450, absMax: 1750 },
      maxSlopePct: 5,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 16, P2O5: 10, K2O: 18 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 4,
      idealPreCrops: ["wheat_winter", "barley_winter", "chickpea", "vetch"],
      incompatiblePreCrops: ["sugar_beet", "canola", "sunflower", "potato"],
      keyRisks: {
        tr: "Pancar kist nematodu (Heterodera schachtii), Rhizomania, Cercospora yaprak lekesi ve yüksek yeraltı suyu tüketimi",
        en: "Beet cyst nematode (Heterodera schachtii), Rhizomania, Cercospora leaf spot, and high groundwater withdrawal",
      },
      growthSummary: {
        tr: "Derin, taşsız tınlı toprak ve sezon boyu 750–950 mm su ister; kist nematodu nedeniyle aynı tarlaya 4 yıldan önce ekilmemelidir (Kanola ara bitki olamaz).",
        en: "Requires deep stone-free loam and 750–950 mm water; strict 4-year break required due to beet cyst nematode (avoid canola in same rotation).",
      },
    },
  },

  maize_grain: {
    cropId: "maize_grain",
    scientificName: "Zea mays L. indendata",
    basinSupportCategory: {
      tr: "Stratejik C4 Hububat & Yem Hammaddesi (Su Kısıtı Olmayan Sulu Havzalar)",
      en: "Strategic C4 Cereal & Feed Grain (Non-Water-Restricted Irrigated Basins)",
    },
    thermal: {
      germinationMinC: 10,
      optimalTempRangeC: [20, 32],
      gddBaseC: 10,
      gddRequired: 1300,
      frostKillC: 0,
      heatStressThresholdC: 35,
      vernalizationDays: [0, 0],
      photoperiod: "kisa_gun",
    },
    water: {
      seasonalEtcRangeMm: [600, 880],
      minDrylandPrecipMm: 580,
      droughtTolerance: "Dusuk_Hassas",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Tepe Püskülü Çıkarma – Koçan Püskülü ve Tozlaşma (Temmuz, Ky = 1.25)",
        en: "Tasseling, silking and pollination (Jul, Ky = 1.25 — extreme water sensitivity)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Alüvyal Tınlı, Killi-Tınlı, Siltli-Tınlı (organik maddece zengin ve sıcak)",
        en: "Deep Alluvial Loam, Clay Loam, Silt Loam (warm, high organic matter)",
      },
      clayRangePct: { optMin: 15, optMax: 35, absMax: 45 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.0, 7.5],
      toleratedPh: [5.5, 8.0],
      minOrganicMatterPct: 1.8,
      salinityThresholdDsm: 1.7,
      limeTolerance: "Orta",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1250, absMax: 1550 },
      maxSlopePct: 6,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 22, P2O5: 10, K2O: 12 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 1,
      idealPreCrops: ["soybean", "chickpea", "lentil_red", "alfalfa", "vetch", "wheat_winter"],
      incompatiblePreCrops: ["maize_grain"],
      keyRisks: {
        tr: "Tozlaşmada 35 °C üstü sıcaklık + su stresinde koçan boşluğu (Ky=1.25), tuzluluk hassasiyeti (1.7 dS/m) ve mısır kurdu",
        en: "Severe yield collapse under flowering water/heat stress (Ky=1.25), low salinity tolerance (1.7 dS/m), and corn borer",
      },
      growthSummary: {
        tr: "C4 fotosentez mekanizmasıyla sulu şartlarda dekara 1.1–1.4 ton verim verir; ancak su stresine en hassas (Ky = 1.25) ve tuzluluğa duyarlı (1.7 dS/m) üründür.",
        en: "High-yielding C4 crop (11–14 t/ha irrigated) but highly sensitive to water deficit at silking (Ky = 1.25) and soil salinity (1.7 dS/m).",
      },
    },
  },

  sunflower: {
    cropId: "sunflower",
    scientificName: "Helianthus annuus L.",
    basinSupportCategory: {
      tr: "Stratejik Yağlı Tohum (Trakya, İç Anadolu, Çukurova & Geçit Havzaları)",
      en: "Strategic Oilseed (Thrace, Central Anatolia, Çukurova & Transitional Basins)",
    },
    thermal: {
      germinationMinC: 8,
      optimalTempRangeC: [18, 29],
      gddBaseC: 6,
      gddRequired: 1400,
      frostKillC: -2,
      heatStressThresholdC: 35,
      vernalizationDays: [0, 0],
      photoperiod: "notr_gun",
    },
    water: {
      seasonalEtcRangeMm: [450, 680],
      minDrylandPrecipMm: 380,
      droughtTolerance: "Yuksek",
      waterloggingSensitivity: "Orta",
      criticalStage: {
        tr: "Tabla Oluşumu – Çiçeklenme ve Süt Olumu (Haziran–Temmuz)",
        en: "Capitulum bud formation to flowering and seed milk stage (Jun–Jul)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Derin Alüvyal (kazık kökün 1.2–1.5 m inebileceği taban taşı olmayan topraklar)",
        en: "Loam, Clay Loam, Deep Alluvial (no hardpan so taproot reaches 1.2–1.5 m)",
      },
      clayRangePct: { optMin: 18, optMax: 38, absMax: 48 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.2, 7.8],
      toleratedPh: [6.0, 8.2],
      minOrganicMatterPct: 1.4,
      salinityThresholdDsm: 4.8,
      limeTolerance: "Orta",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1350, absMax: 1650 },
      maxSlopePct: 8,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 9, P2O5: 7, K2O: 12 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain"],
      incompatiblePreCrops: ["sunflower", "safflower", "canola", "dry_bean", "soybean", "chickpea"],
      keyRisks: {
        tr: "Canavar otu (Orobanche cumana), tabla çürüklüğü (Sclerotinia sclerotiorum) ve kuş zararı",
        en: "Broomrape (Orobanche cumana), Sclerotinia head/stem rot, and bird damage",
      },
      growthSummary: {
        tr: "Derin kazık köküyle alt katmanlardaki suyu ve besini kullanır; Sclerotinia ve Orabanş (canavar otu) nedeniyle aynı tarlaya en az 3–4 yılda bir ekilmelidir.",
        en: "Deep taproot scavenges subsoil water and nutrients; requires a 3–4 year rotation break against Orobanche and Sclerotinia.",
      },
    },
  },

  soybean: {
    cropId: "soybean",
    scientificName: "Glycine max (L.) Merr.",
    basinSupportCategory: {
      tr: "Yüksek Teşvikli Stratejik Yağlı Tohum & Protein Baklagili (Çukurova, Karadeniz, GAP)",
      en: "High-Incentive Strategic Oilseed Legume (Çukurova, Black Sea, GAP Basins)",
    },
    thermal: {
      germinationMinC: 10,
      optimalTempRangeC: [20, 30],
      gddBaseC: 10,
      gddRequired: 1300,
      frostKillC: 0,
      heatStressThresholdC: 36,
      vernalizationDays: [0, 0],
      photoperiod: "kisa_gun",
    },
    water: {
      seasonalEtcRangeMm: [500, 750],
      minDrylandPrecipMm: 520,
      droughtTolerance: "Orta",
      waterloggingSensitivity: "Orta",
      criticalStage: {
        tr: "Çiçeklenme – Bakla Bağlama ve Dane Dolumu (Temmuz–Ağustos)",
        en: "Flowering, pod development and seed fill (Jul–Aug)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Siltli-Tınlı (organik maddesi iyi, Bradyrhizobium aşılamasına uygun)",
        en: "Loam, Clay Loam, Silt Loam (fertile, suitable for Bradyrhizobium inoculation)",
      },
      clayRangePct: { optMin: 15, optMax: 36, absMax: 45 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.0, 7.5],
      toleratedPh: [5.8, 8.2],
      minOrganicMatterPct: 1.5,
      salinityThresholdDsm: 5.0,
      limeTolerance: "Orta",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 950, absMax: 1250 },
      maxSlopePct: 7,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 3, P2O5: 8, K2O: 10 },
      biologicalNFixationKgDa: [8.0, 18.0],
      minBreakYears: 2,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain", "cotton"],
      incompatiblePreCrops: ["soybean", "dry_bean", "sunflower", "canola"],
      keyRisks: {
        tr: "Yüksek kireçli topraklarda demir klorozu, sıcak-kuru rüzgârlarda kırmızı örümcek ve çiçek dökümü",
        en: "Iron chlorosis on highly calcareous soils, spider mites during hot dry spells, and flower drop",
      },
      growthSummary: {
        tr: "Hem yağlı tohum hem de güçlü bir azot bağlayıcı (dekara 8–18 kg N) baklagildir; buğday ve mısır münavebesinde gübre maliyetini %35 düşürür.",
        en: "Dual oilseed and high-capacity N-fixing legume (80–180 kg N/ha); cuts fertilizer costs for subsequent wheat or maize by 35%.",
      },
    },
  },

  canola: {
    cropId: "canola",
    scientificName: "Brassica napus L. var. oleifera",
    basinSupportCategory: {
      tr: "Stratejik Kışlık Yağlı Tohum (Trakya, Marmara & İç Anadolu Sulu/Yarı-Sulu Havzalar)",
      en: "Strategic Winter Oilseed (Thrace, Marmara & Central Anatolia Basins)",
    },
    thermal: {
      germinationMinC: 4,
      optimalTempRangeC: [12, 23],
      gddBaseC: 0,
      gddRequired: 1650,
      frostKillC: -16,
      heatStressThresholdC: 30,
      vernalizationDays: [30, 50],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [400, 560],
      minDrylandPrecipMm: 380,
      droughtTolerance: "Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Sapa Kalkma – Sarı Çiçeklenme ve Kapsül (Silikva) Bağlama (Nisan–Mayıs)",
        en: "Bolting, yellow flowering and silique pod formation (Apr–May)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Tınlı, Killi-Tınlı (kaymak tabakası bağlamayan, kazık köke uygun topraklar)",
        en: "Deep Loam, Clay Loam (non-crusting soils suitable for fine seed emergence and taproot)",
      },
      clayRangePct: { optMin: 18, optMax: 36, absMax: 45 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.2, 7.8],
      toleratedPh: [5.8, 8.3],
      minOrganicMatterPct: 1.5,
      salinityThresholdDsm: 9.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1300, absMax: 1600 },
      maxSlopePct: 9,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 15, P2O5: 7, K2O: 10 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "vetch"],
      incompatiblePreCrops: ["canola", "sugar_beet", "sunflower", "soybean"],
      keyRisks: {
        tr: "Kışa 6–8 yapraklı rozet evresinde giremezse don zararı, kükürt (S) noksanlığı ve kapsül çatlaması",
        en: "Winter kill if not at 6–8 leaf rosette stage before frost, sulfur (S) deficiency, and pod shattering",
      },
      growthSummary: {
        tr: "Kış yağışlarıyla yetişip Haziran'da erken hasat edilir; köklerindeki glukozinolat salgısıyla (biyo-fümigasyon) buğday kök hastalıklarını temizleyip tahıl verimini %10 artırır.",
        en: "Grows on winter rain and harvests early in June; root glucosinolate biofumigation suppresses cereal take-all and boosts following wheat by +10%.",
      },
    },
  },

  safflower: {
    cropId: "safflower",
    scientificName: "Carthamus tinctorius L.",
    basinSupportCategory: {
      tr: "Kurak Havza Stratejik Yağlı Tohumu (Nadas Azaltma & Su Kısıtı Desteği)",
      en: "Dryland Basin Strategic Oilseed (Fallow Replacement & Water-Deficit Support)",
    },
    thermal: {
      germinationMinC: 5,
      optimalTempRangeC: [17, 30],
      gddBaseC: 5,
      gddRequired: 1150,
      frostKillC: -6,
      heatStressThresholdC: 37,
      vernalizationDays: [0, 0],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [300, 460],
      minDrylandPrecipMm: 260,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Sapa Kalkma ve Tabla Çiçeklenmesi (Mayıs–Haziran)",
        en: "Stem elongation and capitulum flowering (May–Jun)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Kumlu-Tınlı (1.5 m derinliğe inen kazık kök için derin profil)",
        en: "Loam, Clay Loam, Sandy Loam (deep profile for 1.5 m xerophytic taproot)",
      },
      clayRangePct: { optMin: 15, optMax: 38, absMax: 48 },
      sandRangePct: { optMin: 20, optMax: 60 },
      optimalPh: [6.2, 8.2],
      toleratedPh: [6.0, 8.6],
      minOrganicMatterPct: 1.0,
      salinityThresholdDsm: 6.5,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 100, optMax: 1550, absMax: 1850 },
      maxSlopePct: 12,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 7, P2O5: 5, K2O: 5 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 2,
      idealPreCrops: ["wheat_winter", "barley_winter", "chickpea", "lentil_green"],
      incompatiblePreCrops: ["safflower", "sunflower", "canola"],
      keyRisks: {
        tr: "Ağır ve taban suyu yüksek arazilerde kök çürüklüğü (Phytophthora) ve aspir sineği",
        en: "Phytophthora root rot in poorly drained soils and safflower fly",
      },
      growthSummary: {
        tr: "Yağlı tohumlular içinde kuraklığa ve kirece en dayanıklı (Ky = 0.80, kök derinliği 1.5 m) üründür; İç Anadolu kuru tarımında buğday-nadas döngüsünü kırmak için idealdir.",
        en: "Most drought- and lime-tolerant annual oilseed (Ky = 0.80, 1.5 m taproot); ideal for replacing fallow in dryland cereal rotations.",
      },
    },
  },

  dry_bean: {
    cropId: "dry_bean",
    scientificName: "Phaseolus vulgaris L.",
    basinSupportCategory: {
      tr: "Stratejik Yemeklik Baklagil (Konya, Karaman, Niğde, Nevşehir, Erzincan Sulu Yayla)",
      en: "Strategic Food Legume (Central/Highland Irrigated Valleys)",
    },
    thermal: {
      germinationMinC: 10,
      optimalTempRangeC: [18, 27],
      gddBaseC: 10,
      gddRequired: 1000,
      frostKillC: 0,
      heatStressThresholdC: 30,
      vernalizationDays: [0, 0],
      photoperiod: "notr_gun",
    },
    water: {
      seasonalEtcRangeMm: [380, 520],
      minDrylandPrecipMm: 450,
      droughtTolerance: "Dusuk_Hassas",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Çiçeklenme ve Bakla Tutumu (Haziran–Temmuz, Ky = 1.15)",
        en: "Flowering and pod set (Jun–Jul, Ky = 1.15)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Kumlu-Tınlı (gevşek, tuzsuz, pH < 7.8 ve aşırı kireçsiz topraklar)",
        en: "Loam, Sandy Loam (friable, non-saline, pH < 7.8 without excess active lime)",
      },
      clayRangePct: { optMin: 12, optMax: 28, absMax: 36 },
      sandRangePct: { optMin: 25, optMax: 60 },
      optimalPh: [6.0, 7.4],
      toleratedPh: [5.8, 7.8],
      minOrganicMatterPct: 1.6,
      salinityThresholdDsm: 1.0,
      limeTolerance: "Dusuk_Kloroz_Riskli",
    },
    topography: {
      elevationRangeM: { min: 100, optMax: 1550, absMax: 1800 },
      maxSlopePct: 6,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 5, P2O5: 7, K2O: 8 },
      biologicalNFixationKgDa: [2.0, 6.0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain", "potato"],
      incompatiblePreCrops: ["dry_bean", "soybean", "chickpea", "lentil_red", "sunflower"],
      keyRisks: {
        tr: "Tuzluluğa (1.0 dS/m) ve yüksek pH/kirece (Fe/Zn klorozu) çok hassastır; 30 °C üstünde çiçek döker",
        en: "Extremely sensitive to salinity (1.0 dS/m), high pH/lime (Fe/Zn chlorosis), and flower abortion above 30 °C",
      },
      growthSummary: {
        tr: "Birim fiyat ve dekar geliri çok yüksektir; ancak tatlı sulama suyu, ılıman yaz sıcaklığı (< 30 °C) ve hafif-orta bünyeli, pH'ı 7.8'i aşmayan toprak ister.",
        en: "High market value per decare, but requires low-salinity irrigation water, moderate summer temperatures (< 30 °C), and pH ≤ 7.8.",
      },
    },
  },

  potato: {
    cropId: "potato",
    scientificName: "Solanum tuberosum L.",
    basinSupportCategory: {
      tr: "Stratejik Yumrulu Bitki (Niğde, Nevşehir, Konya, Afyon, İzmir, Adana Havzaları)",
      en: "Strategic Tuber Crop (Niğde, Nevşehir, Konya, Afyon, İzmir, Adana Basins)",
    },
    thermal: {
      germinationMinC: 7,
      optimalTempRangeC: [15, 24],
      gddBaseC: 7,
      gddRequired: 1150,
      frostKillC: -1,
      heatStressThresholdC: 31,
      vernalizationDays: [0, 0],
      photoperiod: "notr_gun",
    },
    water: {
      seasonalEtcRangeMm: [500, 720],
      minDrylandPrecipMm: 550,
      droughtTolerance: "Dusuk_Hassas",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Stolon (Yumru) Başlangıcı ve Yumru İrileşmesi (p = 0.35, Ky = 1.10)",
        en: "Stolonization and tuber bulking (p = 0.35, Ky = 1.10 — shallow 0.6 m roots)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Kumlu-Tınlı, Tınlı, Volkanik Tüflü (gevşek, yumru şeklini bozmayan hafif bünyeli topraklar)",
        en: "Sandy Loam, Loam, Volcanic Tuff (loose, well-aerated soil for uniform tuber shape)",
      },
      clayRangePct: { optMin: 8, optMax: 24, absMax: 34 },
      sandRangePct: { optMin: 35, optMax: 75 },
      optimalPh: [5.5, 6.8],
      toleratedPh: [5.2, 7.8],
      minOrganicMatterPct: 1.8,
      salinityThresholdDsm: 1.7,
      limeTolerance: "Dusuk_Kloroz_Riskli",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1650, absMax: 2000 },
      maxSlopePct: 5,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 18, P2O5: 12, K2O: 24 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 4,
      idealPreCrops: ["wheat_winter", "barley_winter", "alfalfa", "vetch", "sainfoin"],
      incompatiblePreCrops: ["potato", "sugar_beet", "sunflower"],
      keyRisks: {
        tr: "Patates siğil hastalığı (Synchytrium endobioticum), kist nematodu, mildiyö (Phytophthora infestans) ve >%34 kilde yumru deformasyonu",
        en: "Potato wart, golden cyst nematode, late blight (Phytophthora infestans), and tuber malformation in heavy clay (> 34%)",
      },
      growthSummary: {
        tr: "Yüzlek kök (0.6 m) yapısı nedeniyle sık ve kontrollü (damla/yağmurlama) sulama ile gevşek kumlu-tınlı toprak ister; 30 °C üzerinde yumru bağlaması durur.",
        en: "Shallow 0.6 m root system demands frequent light irrigation (drip/sprinkler) and sandy-loam soil; tuberization stops above 30–31 °C.",
      },
    },
  },

  alfalfa: {
    cropId: "alfalfa",
    scientificName: "Medicago sativa L.",
    basinSupportCategory: {
      tr: "Stratejik Çok Yıllık Yem Bitkisi (Sulu Tarım Havzaları)",
      en: "Strategic Perennial Forage Legume (Irrigated Basins)",
    },
    thermal: {
      germinationMinC: 5,
      optimalTempRangeC: [18, 30],
      gddBaseC: 5,
      gddRequired: 1200,
      frostKillC: -20,
      heatStressThresholdC: 40,
      vernalizationDays: [0, 0],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [800, 1250],
      minDrylandPrecipMm: 550,
      droughtTolerance: "Orta",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Her Biçim Sonrası Sürgün Yenilenme Dönemi (Mayıs–Eylül)",
        en: "Regrowth phase after each forage cutting (May–Sep)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Tınlı, Killi-Tınlı (taban suyu 1.5 m'den derin, iyi drene olan kireçli topraklar)",
        en: "Deep Loam, Clay Loam (water table > 1.5 m deep, well-drained calcareous soils)",
      },
      clayRangePct: { optMin: 15, optMax: 36, absMax: 45 },
      sandRangePct: { optMin: 20, optMax: 55 },
      optimalPh: [6.8, 8.0],
      toleratedPh: [6.5, 8.5],
      minOrganicMatterPct: 1.5,
      salinityThresholdDsm: 2.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1750, absMax: 2100 },
      maxSlopePct: 8,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 3, P2O5: 12, K2O: 20 },
      biologicalNFixationKgDa: [15.0, 30.0],
      minBreakYears: 3,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain"],
      incompatiblePreCrops: ["alfalfa", "sainfoin", "vetch"],
      keyRisks: {
        tr: "Çok yüksek sezonluk su tüketimi (800–1250 mm), küsküt (Cuscuta) paraziti ve yonca hortumlu böceği",
        en: "Very high seasonal water demand (800–1250 mm), dodder (Cuscuta) parasite, and alfalfa weevil",
      },
      growthSummary: {
        tr: "Yem bitkilerinin kraliçesidir; dekara 15–30 kg saf azot bağlayarak toprağı ihya eder ancak su kısıtı olan kapalı havzalarda yeraltı suyunu hızla tüketir.",
        en: "Fixes 150–300 kg N/ha and rebuilds soil structure, but requires abundant irrigation water (800–1250 mm/yr).",
      },
    },
  },

  sainfoin: {
    cropId: "sainfoin",
    scientificName: "Onobrychis viciifolia Scop.",
    basinSupportCategory: {
      tr: "Stratejik Kuru Tarım Yem Bitkisi (Kıraç, Kireçli ve Eğimli Araziler — Tüm Havzalar)",
      en: "Strategic Dryland Forage Legume (Calcareous & Sloped Dryland Basins)",
    },
    thermal: {
      germinationMinC: 4,
      optimalTempRangeC: [14, 26],
      gddBaseC: 4,
      gddRequired: 1000,
      frostKillC: -22,
      heatStressThresholdC: 36,
      vernalizationDays: [10, 30],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [320, 480],
      minDrylandPrecipMm: 280,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Tomurcuklanma ve Pembe Çiçeklenme Başlangıcı (Mayıs)",
        en: "Budding and early pink flowering before hay cut (May)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Kireçli Tınlı, Kumlu-Tınlı, Çakıllı Kıraç Yamaç Toprakları (pH 6.5–8.8)",
        en: "Calcareous Loam, Sandy Loam, Gravelly Hillside Dryland Soils (pH 6.5–8.8)",
      },
      clayRangePct: { optMin: 10, optMax: 34, absMax: 42 },
      sandRangePct: { optMin: 20, optMax: 65 },
      optimalPh: [6.8, 8.4],
      toleratedPh: [6.2, 8.8],
      minOrganicMatterPct: 0.8,
      salinityThresholdDsm: 3.5,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 300, optMax: 2000, absMax: 2400 },
      maxSlopePct: 20,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 2, P2O5: 8, K2O: 6 },
      biologicalNFixationKgDa: [9.0, 20.0],
      minBreakYears: 2,
      idealPreCrops: ["wheat_winter", "barley_winter"],
      incompatiblePreCrops: ["sainfoin", "alfalfa", "vetch"],
      keyRisks: {
        tr: "Taban suyu yüksek ve ağır killi arazilerde kök çürüklüğü (sulak taban arazide yonca tercih edilir)",
        en: "Root rot in poorly drained heavy bottomlands (suited for dryland slopes rather than wet plains)",
      },
      growthSummary: {
        tr: "Yoncanın yetişemediği kurak, kireçli ve eğimli kıraç arazilerde sulamaya ihtiyaç duymadan dekara 9–20 kg saf azot bağlar; hayvanlarda şişme (timpani) yapmaz.",
        en: "Thrives on dry, calcareous, sloped highlands without irrigation, fixing 90–200 kg N/ha and producing non-bloating condensed-tannin forage.",
      },
    },
  },

  vetch: {
    cropId: "vetch",
    scientificName: "Vicia pannonica Crantz / Vicia sativa L.",
    basinSupportCategory: {
      tr: "Stratejik Tek Yıllık Kışlık Yem & Yeşil Gübre Bitkisi (Tüm Havzalar)",
      en: "Strategic Annual Winter Forage & Cover Legume (All Basins)",
    },
    thermal: {
      germinationMinC: 3,
      optimalTempRangeC: [12, 24],
      gddBaseC: 0,
      gddRequired: 900,
      frostKillC: -18,
      heatStressThresholdC: 32,
      vernalizationDays: [15, 35],
      photoperiod: "uzun_gun",
    },
    water: {
      seasonalEtcRangeMm: [250, 380],
      minDrylandPrecipMm: 270,
      droughtTolerance: "Yuksek",
      waterloggingSensitivity: "Orta",
      criticalStage: {
        tr: "Tam Çiçeklenme ve Ot Biçimi (Nisan–Mayıs)",
        en: "Full bloom and forage hay cut (Apr–May)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Tınlı, Killi-Tınlı, Kumlu-Tınlı (geniş toprak adaptasyonu)",
        en: "Loam, Clay Loam, Sandy Loam (broad edaphic adaptation)",
      },
      clayRangePct: { optMin: 15, optMax: 40, absMax: 50 },
      sandRangePct: { optMin: 15, optMax: 60 },
      optimalPh: [6.0, 7.8],
      toleratedPh: [5.8, 8.2],
      minOrganicMatterPct: 1.0,
      salinityThresholdDsm: 3.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 1750, absMax: 2100 },
      maxSlopePct: 16,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 2, P2O5: 6, K2O: 4 },
      biologicalNFixationKgDa: [6.0, 15.0],
      minBreakYears: 2,
      idealPreCrops: ["wheat_winter", "barley_winter", "maize_grain", "sunflower"],
      incompatiblePreCrops: ["vetch", "lentil_red", "lentil_green", "chickpea"],
      keyRisks: {
        tr: "Saf ekimde yatma eğilimi (%15–20 arpa/yulaf ile karışık ekilmesi önerilir)",
        en: "Lodging when sown pure (recommended with 15–20% barley/oat companion nurse crop)",
      },
      growthSummary: {
        tr: "Kış boyu toprağı erozyondan korur, Mayıs'ta erken biçilerek toprağın derin nemini tüketmez ve sonraki tahıla dekara 4–8 kg hazır azot bırakır.",
        en: "Protects soil over winter, harvests early in May before depleting deep soil water, and leaves 40–80 kg N/ha for the next cereal.",
      },
    },
  },

  cotton: {
    cropId: "cotton",
    scientificName: "Gossypium hirsutum L.",
    basinSupportCategory: {
      tr: "Stratejik Lif & Yağ Bitkisi (GAP, Çukurova, Ege & Antalya Sıcak Ovaları)",
      en: "Strategic Fiber & Oilseed Crop (GAP, Çukurova, Aegean & Antalya Warm Plains)",
    },
    thermal: {
      germinationMinC: 15,
      optimalTempRangeC: [25, 35],
      gddBaseC: 15.5,
      gddRequired: 1200,
      frostKillC: 0,
      heatStressThresholdC: 38,
      vernalizationDays: [0, 0],
      photoperiod: "notr_gun",
    },
    water: {
      seasonalEtcRangeMm: [700, 1050],
      minDrylandPrecipMm: 650,
      droughtTolerance: "Orta",
      waterloggingSensitivity: "Hassas",
      criticalStage: {
        tr: "Taraklanma – Çiçeklenme ve Koza Oluşumu (Temmuz–Ağustos)",
        en: "Squaring, peak flowering and boll development (Jul–Aug)",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Alüvyal Killi-Tınlı, Tınlı (su tutma gücü yüksek sıcak ova toprakları)",
        en: "Deep Alluvial Clay Loam, Loam (high water-retention warm valley soils)",
      },
      clayRangePct: { optMin: 20, optMax: 42, absMax: 52 },
      sandRangePct: { optMin: 15, optMax: 50 },
      optimalPh: [6.2, 8.0],
      toleratedPh: [5.5, 8.5],
      minOrganicMatterPct: 1.4,
      salinityThresholdDsm: 7.7,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 650, absMax: 850 },
      maxSlopePct: 5,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 18, P2O5: 8, K2O: 10 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 1,
      idealPreCrops: ["wheat_winter", "barley_winter", "lentil_red", "soybean", "vetch"],
      incompatiblePreCrops: ["cotton"],
      keyRisks: {
        tr: "850 m üstü rakımlarda yetersiz ısı toplamı (GDD_15.5 < 1200), Verticillium solgunluğu ve pembe kurt",
        en: "Insufficient thermal time above 850 m elevation (GDD_15.5 < 1200), Verticillium wilt, and pink bollworm",
      },
      growthSummary: {
        tr: "Uzun, donsuz ve sıcak (≥ 1200 GDD_15.5) büyüme sezonu ile 700–1050 mm su ister; tuzluluğa (7.7 dS/m) oldukça dayanıklıdır.",
        en: "Demands a long frost-free warm season (≥ 1200 GDD at base 15.5 °C) and 700–1050 mm water; highly salt-tolerant (7.7 dS/m).",
      },
    },
  },

  fallow: {
    cropId: "fallow",
    scientificName: "Nadas (Toprak Dinlendirme / Su Biriktirme)",
    basinSupportCategory: {
      tr: "Geleneksel Kuru Tarım Uygulaması (Bakanlık Destek Modelinde Daraltılması Hedeflenir)",
      en: "Traditional Dryland Fallow (Targeted for Reduction via Legume/Oilseed Substitution)",
    },
    thermal: {
      germinationMinC: 0,
      optimalTempRangeC: [0, 40],
      gddBaseC: 0,
      gddRequired: 0,
      frostKillC: -40,
      heatStressThresholdC: 45,
      vernalizationDays: [0, 0],
      photoperiod: "notr_gun",
    },
    water: {
      seasonalEtcRangeMm: [150, 280],
      minDrylandPrecipMm: 0,
      droughtTolerance: "Cok_Yuksek",
      waterloggingSensitivity: "Toleransli",
      criticalStage: {
        tr: "İlkbahar Yabancı Ot Kontrolü ve Buharlaşma Önleme",
        en: "Spring weed control and bare-soil evaporation suppression",
      },
    },
    soil: {
      preferredTextures: {
        tr: "Derin Killi-Tınlı (> 100 cm derinlikte kış yağışının %20–30'unu depolayabilen topraklar)",
        en: "Deep Clay Loam (able to store 20–30% of fallow-year precipitation in > 100 cm profile)",
      },
      clayRangePct: { optMin: 20, optMax: 45, absMax: 60 },
      sandRangePct: { optMin: 10, optMax: 60 },
      optimalPh: [5.5, 8.5],
      toleratedPh: [5.0, 9.0],
      minOrganicMatterPct: 0.5,
      salinityThresholdDsm: 10.0,
      limeTolerance: "Yuksek_Kirec_Sever",
    },
    topography: {
      elevationRangeM: { min: 0, optMax: 2200, absMax: 2500 },
      maxSlopePct: 8,
    },
    nutrientsAndRotation: {
      npkDemandKgDa: { N: 0, P2O5: 0, K2O: 0 },
      biologicalNFixationKgDa: [0, 0],
      minBreakYears: 1,
      idealPreCrops: ["wheat_winter", "barley_winter"],
      incompatiblePreCrops: ["fallow"],
      keyRisks: {
        tr: "365 gün çıplak toprakta rüzgâr/su erozyonu (RUSLE artışı), organik madde kaybı ve sıfır yıllık gelir",
        en: "365 days of bare-soil wind/water erosion, organic carbon oxidation, and zero annual revenue",
      },
      growthSummary: {
        tr: "Yıllık yağışı 320 mm'nin altındaki çok kurak yıllarda bir sonraki kışlık buğdaya 25–45 mm kök suyu aktarır; ancak nohut, mercimek, aspir veya fiğ ile değiştirilmesi önerilir.",
        en: "Conserves 25–45 mm of root-zone water in < 320 mm/yr dryland zones, but exposes soil to erosion and yields zero income.",
      },
    },
  },
};

export interface ParcelBiophysicalInput {
  lat: number;
  lon: number;
  elevationM: number;
  slopePct: number;
  soil: {
    sandPct: number;
    siltPct: number;
    clayPct: number;
    ph: number;
    organicMatterPct: number;
  };
  climate: {
    annualPrecipMm: number;
    annualEt0Mm: number;
    meanAnnualTempC: number;
    hotDaysPerYr: number;
    frostDaysPerYr: number;
  };
  irrigationBudgetMm: number;
  irrigationEfficiency: number;
  currentCropId: CropId;
}

export interface LearnedCropSuitabilityItem {
  cropId: CropId;
  nameTr: string;
  nameEn: string;
  scientificName: string;
  family: string;
  basinCategory: LocalizedText;
  overallSuitabilityPct: number;
  status: "Ideal_Uygun" | "Kosullu_Uygun" | "Sinirli_Riskli" | "Uygun_Degil";
  statusLabel: LocalizedText;
  dimensions: {
    thermal: number;
    water: number;
    soilPhysical: number;
    soilChemical: number;
    topography: number;
    rotationFit: number;
  };
  preCropMultiplier: number;
  nCreditKgHa: { low: number; high: number };
  matchedStrengths: LocalizedText[];
  limitingFactors: LocalizedText[];
  requirements: CropGrowthRequirementsSpec;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Evaluates all 18 crops in the database against the parcel's real biophysical telemetry
 * across 6 scientific dimensions (Thermal, Water, Soil Physical, Soil Chemical, Topography, Rotation Fit).
 */
export function evaluateAllCropsForParcel(input: ParcelBiophysicalInput): LearnedCropSuitabilityItem[] {
  const effectiveWaterSupplyMm =
    input.climate.annualPrecipMm * 0.72 + input.irrigationBudgetMm * input.irrigationEfficiency;

  const items: LearnedCropSuitabilityItem[] = CROP_IDS.filter((id) => id !== "fallow").map((cropId) => {
    const req = CROP_REQUIREMENTS[cropId];
    const def = CROPS[cropId];
    const strengths: LocalizedText[] = [];
    const limits: LocalizedText[] = [];

    // 1. Thermal & Elevation-Adjusted GDD Score (0-100)
    const approxGdd0 = Math.max(400, (input.climate.meanAnnualTempC + 2.5) * 185);
    const cropGddEst = Math.max(
      200,
      approxGdd0 - req.thermal.gddBaseC * (req.thermal.gddBaseC > 8 ? 115 : 150),
    );
    let thermal = 92;
    if (cropGddEst < req.thermal.gddRequired) {
      const ratio = cropGddEst / Math.max(1, req.thermal.gddRequired);
      thermal = clamp(Math.round(ratio * 85), 15, 78);
      limits.push({
        tr: `Isı toplamı kısıtı: parselde tahmini ~${Math.round(cropGddEst)} GDD (gereken ≥ ${req.thermal.gddRequired} GDD, baz ${req.thermal.gddBaseC} °C).`,
        en: `Thermal time constraint: estimated ~${Math.round(cropGddEst)} GDD vs required ≥ ${req.thermal.gddRequired} GDD (base ${req.thermal.gddBaseC} °C).`,
      });
    } else {
      strengths.push({
        tr: `Isı toplamı (${Math.round(cropGddEst)} ≥ ${req.thermal.gddRequired} GDD) ve optimum sıcaklık aralığı (${req.thermal.optimalTempRangeC[0]}–${req.thermal.optimalTempRangeC[1]} °C) uyumlu.`,
        en: `Thermal requirement (${Math.round(cropGddEst)} ≥ ${req.thermal.gddRequired} GDD) and optimal temperature (${req.thermal.optimalTempRangeC[0]}–${req.thermal.optimalTempRangeC[1]} °C) satisfied.`,
      });
    }
    if (input.climate.frostDaysPerYr > 75 && req.thermal.frostKillC >= -2) {
      thermal = clamp(thermal - 18, 15, 100);
      limits.push({
        tr: `Yüksek don günü (${Math.round(input.climate.frostDaysPerYr)} gün/yıl): don hassasiyeti (${req.thermal.frostKillC} °C) nedeniyle ekim takvimine dikkat edilmeli.`,
        en: `High frost frequency (${Math.round(input.climate.frostDaysPerYr)} days/yr): sensitive below ${req.thermal.frostKillC} °C.`,
      });
    }
    if (input.climate.hotDaysPerYr > 35 && req.thermal.heatStressThresholdC <= 31) {
      thermal = clamp(thermal - 15, 20, 100);
      limits.push({
        tr: `Yaz sıcak stresi (${Math.round(input.climate.hotDaysPerYr)} sıcak gün): >${req.thermal.heatStressThresholdC} °C'de çiçek/yumru stresi riski.`,
        en: `Summer heat stress (${Math.round(input.climate.hotDaysPerYr)} hot days): stress above ${req.thermal.heatStressThresholdC} °C.`,
      });
    }

    // 2. Water & Evapotranspiration Score (0-100)
    const [etcMin, etcMax] = req.water.seasonalEtcRangeMm;
    const etcMid = (etcMin + etcMax) / 2;
    let water = 90;
    if (input.irrigationBudgetMm <= 10) {
      // Rainfed mode: check against minDrylandPrecipMm
      if (input.climate.annualPrecipMm < req.water.minDrylandPrecipMm) {
        const deficitRatio = input.climate.annualPrecipMm / Math.max(1, req.water.minDrylandPrecipMm);
        water = clamp(Math.round(deficitRatio * 75), 12, 74);
        limits.push({
          tr: `Su kısıtı: Kuru tarımda en az ${req.water.minDrylandPrecipMm} mm yağış gerekir (mevcut yağış ${Math.round(input.climate.annualPrecipMm)} mm; sezonluk ETc ${etcMin}–${etcMax} mm).`,
          en: `Water deficit: Requires ≥ ${req.water.minDrylandPrecipMm} mm rain under dryland (current ${Math.round(input.climate.annualPrecipMm)} mm; ETc ${etcMin}–${etcMax} mm).`,
        });
      } else {
        water = clamp(Math.round(82 + ((input.climate.annualPrecipMm - req.water.minDrylandPrecipMm) / 200) * 15), 80, 98);
        strengths.push({
          tr: `Kuru tarım yağış eşiği (${Math.round(input.climate.annualPrecipMm)} ≥ ${req.water.minDrylandPrecipMm} mm) karşılanıyor.`,
          en: `Dryland precipitation threshold (${Math.round(input.climate.annualPrecipMm)} ≥ ${req.water.minDrylandPrecipMm} mm) met.`,
        });
      }
    } else {
      // Irrigated mode: compare effectiveWaterSupplyMm against etcMid
      const cov = effectiveWaterSupplyMm / Math.max(1, etcMid);
      if (cov >= 0.95) {
        water = clamp(Math.round(88 + Math.min(10, (cov - 0.95) * 25)), 88, 98);
        strengths.push({
          tr: `Yağış + sulama bütçesi (${Math.round(effectiveWaterSupplyMm)} mm) bitki su tüketimini (${etcMin}–${etcMax} mm) karşılıyor.`,
          en: `Rain + irrigation supply (${Math.round(effectiveWaterSupplyMm)} mm) covers seasonal ETc (${etcMin}–${etcMax} mm).`,
        });
      } else {
        const ky = def.agronomy?.ky.value ?? 1.0;
        water = clamp(Math.round(cov * 90 - (ky - 0.85) * 22), 18, 84);
        limits.push({
          tr: `Kısmi su açığı: Toplam su arzı ~${Math.round(effectiveWaterSupplyMm)} mm, bitki su ihtiyacı ${etcMin}–${etcMax} mm (Ky = ${ky.toFixed(2)}).`,
          en: `Partial water deficit: Supply ~${Math.round(effectiveWaterSupplyMm)} mm vs ETc ${etcMin}–${etcMax} mm (Ky = ${ky.toFixed(2)}).`,
        });
      }
    }

    // 3. Soil Physical Texture Score (0-100)
    const clay = input.soil.clayPct;
    let soilPhysical = 92;
    if (clay > req.soil.clayRangePct.absMax) {
      soilPhysical = clamp(50 - Math.round((clay - req.soil.clayRangePct.absMax) * 2), 20, 55);
      limits.push({
        tr: `Ağır kil kısıtı (%${Math.round(clay)} kil > maksimum %${req.soil.clayRangePct.absMax}): drenaj ve kök/yumru gelişimi zorlaşır.`,
        en: `Heavy clay constraint (${Math.round(clay)}% clay > max ${req.soil.clayRangePct.absMax}%): restricts drainage and root/tuber growth.`,
      });
    } else if (clay > req.soil.clayRangePct.optMax) {
      soilPhysical = clamp(82 - Math.round((clay - req.soil.clayRangePct.optMax) * 1.5), 60, 82);
    } else if (clay < req.soil.clayRangePct.optMin) {
      soilPhysical = clamp(80 - Math.round((req.soil.clayRangePct.optMin - clay) * 1.5), 62, 82);
    } else {
      strengths.push({
        tr: `Toprak kil oranı (%${Math.round(clay)}) ideal aralıkta (%${req.soil.clayRangePct.optMin}–${req.soil.clayRangePct.optMax}).`,
        en: `Soil clay fraction (${Math.round(clay)}%) within optimal range (${req.soil.clayRangePct.optMin}–${req.soil.clayRangePct.optMax}%).`,
      });
    }

    // 4. Soil Chemical Score: pH, Organic Matter & Lime (0-100)
    const ph = input.soil.ph;
    let soilChemical = 92;
    if (ph < req.soil.toleratedPh[0] || ph > req.soil.toleratedPh[1]) {
      soilChemical = 42;
      limits.push({
        tr: `Toprak pH uyumsuzluğu (pH ${ph.toFixed(1)}, tolere edilen ${req.soil.toleratedPh[0]}–${req.soil.toleratedPh[1]}): Fe/Zn mikro besin kilitlenmesi riski.`,
        en: `Soil pH out of range (pH ${ph.toFixed(1)} vs tolerated ${req.soil.toleratedPh[0]}–${req.soil.toleratedPh[1]}): micronutrient lockup risk.`,
      });
    } else if (ph < req.soil.optimalPh[0] || ph > req.soil.optimalPh[1]) {
      soilChemical = 76;
      if (ph > req.soil.optimalPh[1] && req.soil.limeTolerance === "Dusuk_Kloroz_Riskli") {
        soilChemical = 64;
        limits.push({
          tr: `Yüksek pH (${ph.toFixed(1)} > ${req.soil.optimalPh[1]}) ve kireç hassasiyeti nedeniyle demir/çinko klorozu görülebilir.`,
          en: `Alkaline pH (${ph.toFixed(1)} > ${req.soil.optimalPh[1]}) may induce Fe/Zn chlorosis in this lime-sensitive crop.`,
        });
      }
    } else {
      strengths.push({
        tr: `Toprak reaksiyonu (pH ${ph.toFixed(1)}) optimum aralıkta (${req.soil.optimalPh[0]}–${req.soil.optimalPh[1]}).`,
        en: `Soil reaction (pH ${ph.toFixed(1)}) within optimal range (${req.soil.optimalPh[0]}–${req.soil.optimalPh[1]}).`,
      });
    }
    if (input.soil.organicMatterPct < req.soil.minOrganicMatterPct) {
      soilChemical = clamp(soilChemical - 7, 35, 100);
    }

    // 5. Topography: Elevation & Slope Score (0-100)
    let topography = 95;
    if (input.elevationM > req.topography.elevationRangeM.absMax) {
      topography = 22;
      limits.push({
        tr: `Rakım sınırı aşıldı (${Math.round(input.elevationM)} m > mutlak sınır ${req.topography.elevationRangeM.absMax} m).`,
        en: `Elevation exceeds maximum limit (${Math.round(input.elevationM)} m > ${req.topography.elevationRangeM.absMax} m).`,
      });
    } else if (input.elevationM > req.topography.elevationRangeM.optMax) {
      topography = 68;
      limits.push({
        tr: `Yüksek rakım (${Math.round(input.elevationM)} m > ideal ${req.topography.elevationRangeM.optMax} m): erkenci çeşit seçilmeli.`,
        en: `High elevation (${Math.round(input.elevationM)} m > optimal ${req.topography.elevationRangeM.optMax} m): select early cultivar.`,
      });
    } else if (input.elevationM < req.topography.elevationRangeM.min) {
      topography = 72;
    }
    if (input.slopePct > req.topography.maxSlopePct) {
      topography = clamp(topography - Math.round((input.slopePct - req.topography.maxSlopePct) * 4), 25, 100);
      limits.push({
        tr: `Arazi eğimi (%${input.slopePct.toFixed(1)}) bu ürünün mekanizasyon/erozyon sınırını (%${req.topography.maxSlopePct}) aşıyor.`,
        en: `Parcel slope (${input.slopePct.toFixed(1)}%) exceeds recommended maximum (${req.topography.maxSlopePct}%).`,
      });
    }

    // 6. Rotation Compatibility with Current Crop (0-100)
    const pre = preCropEffect(input.currentCropId, cropId);
    let rotationFit = 82;
    if (pre.yieldFactor > 1.0) {
      rotationFit = clamp(Math.round(85 + (pre.yieldFactor - 1) * 120), 86, 98);
      strengths.push({
        tr: `Mevcut ürün (${CROPS[input.currentCropId].name.tr}) sonrası ekildiğinde ${pre.note.tr}.`,
        en: `Following ${CROPS[input.currentCropId].name.en}: ${pre.note.en}.`,
      });
    } else if (pre.yieldFactor < 1.0) {
      rotationFit = clamp(Math.round(80 - (1 - pre.yieldFactor) * 260), 28, 74);
      limits.push({
        tr: `Münavebe uyarısı (${CROPS[input.currentCropId].name.tr} → ${def.name.tr}): ${pre.note.tr}.`,
        en: `Rotation warning (${CROPS[input.currentCropId].name.en} → ${def.name.en}): ${pre.note.en}.`,
      });
    } else if (def.family === "fabaceae" && CROPS[input.currentCropId].family !== "fabaceae") {
      rotationFit = 94;
      strengths.push({
        tr: `Baklagil münavebe avantajı: Dekara ${req.nutrientsAndRotation.biologicalNFixationKgDa[0]}–${req.nutrientsAndRotation.biologicalNFixationKgDa[1]} kg biyolojik azot bağlar.`,
        en: `Legume break benefit: Fixes ${req.nutrientsAndRotation.biologicalNFixationKgDa[0] * 10}–${req.nutrientsAndRotation.biologicalNFixationKgDa[1] * 10} kg N/ha.`,
      });
    }

    // Weighted Composite Suitability Score
    const rawComposite =
      thermal * 0.24 +
      water * 0.28 +
      soilPhysical * 0.14 +
      soilChemical * 0.12 +
      topography * 0.10 +
      rotationFit * 0.12;

    // Hard limiting factor cap (Liebig's Law of the Minimum moderation)
    const minDim = Math.min(thermal, water, topography, soilChemical);
    const overallSuitabilityPct = clamp(
      Math.round(minDim < 35 ? Math.min(rawComposite, minDim + 18) : rawComposite),
      12,
      98,
    );

    const status: LearnedCropSuitabilityItem["status"] =
      overallSuitabilityPct >= 78
        ? "Ideal_Uygun"
        : overallSuitabilityPct >= 62
          ? "Kosullu_Uygun"
          : overallSuitabilityPct >= 45
            ? "Sinirli_Riskli"
            : "Uygun_Degil";

    const statusLabel: LocalizedText =
      status === "Ideal_Uygun"
        ? { tr: "İdeal Uygun", en: "Highly Suitable" }
        : status === "Kosullu_Uygun"
          ? { tr: "Koşullu Uygun", en: "Conditionally Suitable" }
          : status === "Sinirli_Riskli"
            ? { tr: "Kısıtlı / Riskli", en: "Marginal / Risky" }
            : { tr: "Ekolojik Olarak Uygun Değil", en: "Unsuitable" };

    return {
      cropId,
      nameTr: def.name.tr,
      nameEn: def.name.en,
      scientificName: req.scientificName,
      family: def.family,
      basinCategory: req.basinSupportCategory,
      overallSuitabilityPct,
      status,
      statusLabel,
      dimensions: {
        thermal,
        water,
        soilPhysical,
        soilChemical,
        topography,
        rotationFit,
      },
      preCropMultiplier: pre.yieldFactor,
      nCreditKgHa: def.nContributionKgHa.value,
      matchedStrengths: strengths,
      limitingFactors: limits,
      requirements: req,
    };
  });

  return items.sort((a, b) => b.overallSuitabilityPct - a.overallSuitabilityPct);
}
