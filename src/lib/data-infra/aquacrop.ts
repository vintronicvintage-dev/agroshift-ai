/**
 * AgroShift AI — FAO-56, FAO-33/66 & FAO AquaCrop v7.1 Scientific Parameter Harmonizer
 *
 * References:
 * - Allen, R.G. et al. (1998) FAO Irrigation and Drainage Paper 56 (Tables 11, 12, 22)
 * - Doorenbos, J. & Kassam, A.H. (1979) FAO Irrigation and Drainage Paper 33
 * - Steduto, P., Hsiao, T.C., Fereres, E., Raes, D. (2012) FAO Irrigation and Drainage Paper 66 (Crop yield response to water / AquaCrop)
 * - Raes, D. et al. (2023) FAO AquaCrop Reference Manual Version 7.1, Chapter 3 (Crop Parameters)
 *
 * Explicitly separates Verified (tabulated in FAO-56/33/66/AquaCrop Annexes) from
 * Estimated (regional engineering adaptation for Turkish agro-climatic zones or forage species).
 */

import { CROP_CONSTANTS, CROP_IDS, CROPS } from "@/lib/crops/database";
import type { CropId } from "@/lib/types";
import type { ScientificCropParameterRecord, VerificationStatus } from "./types";

interface AquaCropAnnexSpec {
  pathway: "C3" | "C4" | "NONE";
  wpStarGm2: number | null;
  wpYieldFormationAdjFactor: number | null;
  hi0Pct: number | null;
  cc0Pct: number | null;
  ccxPct: number | null;
  cgcPctDay: number | null;
  cdcPctDay: number | null;
  pUpperCanopyExpansion: number | null;
  pLowerCanopyExpansion: number | null;
  pUpperStomatalClosure: number | null;
  pUpperCanopySenescence: number | null;
  pUpperPollinationFailure: number | null;
  verificationStatus: VerificationStatus;
  sourceCitation: string;
}

const AQUACROP_ANNEX_PARAMS: Record<CropId, AquaCropAnnexSpec> = {
  wheat_winter: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 45.0,
    cc0Pct: 4.5,
    ccxPct: 96.0,
    cgcPctDay: 12.0,
    cdcPctDay: 7.5,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.7,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 92–101 Wheat) & AquaCrop v7.1 Annex I Conservative Parameters",
  },
  barley_winter: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 46.0,
    cc0Pct: 4.5,
    ccxPct: 94.0,
    cgcPctDay: 12.5,
    cdcPctDay: 8.0,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.65,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 102–109 Barley) & AquaCrop v7.1 Annex I",
  },
  chickpea: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.9, // high-protein grain legume adjustment during pod fill
    hi0Pct: 42.0,
    cc0Pct: 3.5,
    ccxPct: 85.0,
    cgcPctDay: 10.5,
    cdcPctDay: 8.5,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.65,
    pUpperPollinationFailure: 0.8,
    verificationStatus: "Estimated",
    sourceCitation: "FAO-66 C3 grain-legume class (WP* = 15 g/m²) + regional chickpea canopy calibration (Estimated)",
  },
  lentil_red: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.9,
    hi0Pct: 40.0,
    cc0Pct: 3.5,
    ccxPct: 82.0,
    cgcPctDay: 10.0,
    cdcPctDay: 9.0,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.65,
    pUpperPollinationFailure: 0.8,
    verificationStatus: "Estimated",
    sourceCitation: "FAO-66 C3 grain-legume class (WP* = 15 g/m²) + Southeastern Anatolia red lentil calibration (Estimated)",
  },
  sugar_beet: {
    pathway: "C3",
    wpStarGm2: 17.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 70.0, // root dry matter / total biomass harvest index in AquaCrop
    cc0Pct: 1.0,
    ccxPct: 95.0,
    cgcPctDay: 13.0,
    cdcPctDay: 5.0,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.75,
    pUpperPollinationFailure: null,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 174–181 Sugar Beet) & AquaCrop v7.1 Annex I",
  },
  maize_grain: {
    pathway: "C4",
    wpStarGm2: 33.7,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 48.0,
    cc0Pct: 0.65,
    ccxPct: 96.0,
    cgcPctDay: 16.3,
    cdcPctDay: 11.7,
    pUpperCanopyExpansion: 0.14,
    pLowerCanopyExpansion: 0.72,
    pUpperStomatalClosure: 0.69,
    pUpperCanopySenescence: 0.69,
    pUpperPollinationFailure: 0.8,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 114–123 Maize, Hsiao et al. 2009) & AquaCrop v7.1 Default Maize File",
  },
  sunflower: {
    pathway: "C3",
    wpStarGm2: 18.0,
    wpYieldFormationAdjFactor: 0.8, // lipid-rich achene synthesis reduction factor post-anthesis
    hi0Pct: 35.0,
    cc0Pct: 2.0,
    ccxPct: 92.0,
    cgcPctDay: 15.0,
    cdcPctDay: 10.5,
    pUpperCanopyExpansion: 0.15,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.7,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 182–191 Sunflower, Todorovic et al. 2009) & AquaCrop v7.1 Annex I",
  },
  dry_bean: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.9,
    hi0Pct: 40.0,
    cc0Pct: 3.8,
    ccxPct: 90.0,
    cgcPctDay: 12.5,
    cdcPctDay: 9.5,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.55,
    pUpperStomatalClosure: 0.5,
    pUpperCanopySenescence: 0.6,
    pUpperPollinationFailure: 0.78,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 192–197 Dry Bean) & AquaCrop v7.1 Annex I",
  },
  alfalfa: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 85.0, // forage harvestable shoot fraction across cuttings
    cc0Pct: 15.0,
    ccxPct: 95.0,
    cgcPctDay: 14.0,
    cdcPctDay: 4.0,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.7,
    pUpperCanopySenescence: 0.8,
    pUpperPollinationFailure: null,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 236–245 Alfalfa) & AquaCrop v7.1 Perennial Forage Module",
  },
  vetch: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 80.0,
    cc0Pct: 5.0,
    ccxPct: 90.0,
    cgcPctDay: 11.0,
    cdcPctDay: 6.0,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.7,
    pUpperPollinationFailure: null,
    verificationStatus: "Estimated",
    sourceCitation: "Estimated from FAO-56/66 cool-season forage legume (berseem/clover) proxy; not natively tabulated in AquaCrop v7.1",
  },
  cotton: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.75, // seed + lint lipid/cellulose synthesis adjustment
    hi0Pct: 35.0, // seed cotton harvest index
    cc0Pct: 1.5,
    ccxPct: 95.0,
    cgcPctDay: 12.0,
    cdcPctDay: 6.5,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.7,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.75,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 164–173 Cotton, Farahani et al. 2009) & AquaCrop v7.1 Annex I",
  },
  lentil_green: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.9,
    hi0Pct: 40.0,
    cc0Pct: 3.5,
    ccxPct: 84.0,
    cgcPctDay: 10.5,
    cdcPctDay: 8.5,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.65,
    pUpperPollinationFailure: 0.8,
    verificationStatus: "Estimated",
    sourceCitation: "FAO-66 C3 grain-legume class (WP* = 15 g/m²) + Central Anatolia plateau green lentil calibration",
  },
  soybean: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.65,
    hi0Pct: 40.0,
    cc0Pct: 4.5,
    ccxPct: 95.0,
    cgcPctDay: 11.5,
    cdcPctDay: 7.5,
    pUpperCanopyExpansion: 0.15,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.7,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 124–133 Soybean) & AquaCrop v7.1 Annex I Conservative Parameters",
  },
  canola: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 0.8,
    hi0Pct: 32.0,
    cc0Pct: 4.0,
    ccxPct: 92.0,
    cgcPctDay: 11.0,
    cdcPctDay: 7.5,
    pUpperCanopyExpansion: 0.2,
    pLowerCanopyExpansion: 0.6,
    pUpperStomatalClosure: 0.6,
    pUpperCanopySenescence: 0.7,
    pUpperPollinationFailure: 0.85,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, Rapeseed/Canola) & AquaCrop v7.1 Annex I",
  },
  safflower: {
    pathway: "C3",
    wpStarGm2: 15.5,
    wpYieldFormationAdjFactor: 0.8,
    hi0Pct: 30.0,
    cc0Pct: 3.5,
    ccxPct: 86.0,
    cgcPctDay: 10.5,
    cdcPctDay: 8.0,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.75,
    pUpperPollinationFailure: 0.88,
    verificationStatus: "Estimated",
    sourceCitation: "FAO-66 C3 oilseed class + TAGEM Central Anatolia dryland safflower calibration",
  },
  potato: {
    pathway: "C3",
    wpStarGm2: 18.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 75.0,
    cc0Pct: 5.0,
    ccxPct: 92.0,
    cgcPctDay: 12.5,
    cdcPctDay: 8.0,
    pUpperCanopyExpansion: 0.15,
    pLowerCanopyExpansion: 0.55,
    pUpperStomatalClosure: 0.35,
    pUpperCanopySenescence: 0.6,
    pUpperPollinationFailure: null,
    verificationStatus: "Verified",
    sourceCitation: "FAO-66 (Steduto et al. 2012, p. 206–215 Potato) & AquaCrop v7.1 Annex I Conservative Parameters",
  },
  sainfoin: {
    pathway: "C3",
    wpStarGm2: 15.0,
    wpYieldFormationAdjFactor: 1.0,
    hi0Pct: 80.0,
    cc0Pct: 4.5,
    ccxPct: 88.0,
    cgcPctDay: 11.0,
    cdcPctDay: 6.5,
    pUpperCanopyExpansion: 0.25,
    pLowerCanopyExpansion: 0.65,
    pUpperStomatalClosure: 0.65,
    pUpperCanopySenescence: 0.75,
    pUpperPollinationFailure: null,
    verificationStatus: "Estimated",
    sourceCitation: "FAO-66 perennial C3 forage legume class + TAGEM dryland sainfoin calibration",
  },
  fallow: {
    pathway: "NONE",
    wpStarGm2: null,
    wpYieldFormationAdjFactor: null,
    hi0Pct: null,
    cc0Pct: 0,
    ccxPct: 0,
    cgcPctDay: null,
    cdcPctDay: null,
    pUpperCanopyExpansion: null,
    pLowerCanopyExpansion: null,
    pUpperStomatalClosure: null,
    pUpperCanopySenescence: null,
    pUpperPollinationFailure: null,
    verificationStatus: "Verified",
    sourceCitation: "Bare-soil evaporation governed by FAO-56 Ch. 7 Ke_max = 1.05 and Ze = 0.15 m",
  },
};

const toVerif = (conf: "literature" | "assumption"): VerificationStatus =>
  conf === "literature" ? "Verified" : "Estimated";

export function getScientificCropParameters(cropId?: CropId): ScientificCropParameterRecord[] {
  const targetIds = cropId ? [cropId] : CROP_IDS;
  return targetIds.map((id) => {
    const c = CROPS[id];
    const ag = c.agronomy;
    const aq = AQUACROP_ANNEX_PARAMS[id];

    return {
      cropId: id,
      nameTr: c.name.tr,
      nameEn: c.name.en,
      botanicalFamily: c.family,
      photosyntheticPathway: aq.pathway,
      fao56: {
        kcIni: ag ? ag.kc.value.ini : null,
        kcMid: ag ? ag.kc.value.mid : null,
        kcEnd: ag ? ag.kc.value.end : null,
        kcVerification: ag ? toVerif(ag.kc.confidence) : "Verified",
        kcSource: ag ? ag.kc.source : "FAO-56 Chapter 7 bare-soil evaporation",
        rootDepthMinM: CROP_CONSTANTS.rootDepthMinM.value,
        rootDepthMaxM: ag ? ag.rootDepthMaxM.value : null,
        depletionFractionP: ag ? ag.p.value : null,
        yieldResponseKy: ag ? ag.ky.value : null,
        kyVerification: ag ? toVerif(ag.ky.confidence) : "Verified",
        kySource: ag ? ag.ky.source : "No crop",
        calendarsByZone: ag
          ? {
              south_lowland: {
                sow: ag.calendar.south_lowland.value.sow,
                latestSow: ag.calendar.south_lowland.value.latestSow,
                stagesDays: ag.calendar.south_lowland.value.stages,
                verificationStatus: toVerif(ag.calendar.south_lowland.confidence),
              },
              north_lowland: {
                sow: ag.calendar.north_lowland.value.sow,
                latestSow: ag.calendar.north_lowland.value.latestSow,
                stagesDays: ag.calendar.north_lowland.value.stages,
                verificationStatus: toVerif(ag.calendar.north_lowland.confidence),
              },
              highland: {
                sow: ag.calendar.highland.value.sow,
                latestSow: ag.calendar.highland.value.latestSow,
                stagesDays: ag.calendar.highland.value.stages,
                verificationStatus: toVerif(ag.calendar.highland.confidence),
              },
            }
          : null,
      },
      aquacrop: {
        wpStarGm2: aq.wpStarGm2,
        wpYieldFormationAdjFactor: aq.wpYieldFormationAdjFactor,
        hi0Pct: aq.hi0Pct,
        cc0Pct: aq.cc0Pct,
        ccxPct: aq.ccxPct,
        cgcPctDay: aq.cgcPctDay,
        cdcPctDay: aq.cdcPctDay,
        pUpperCanopyExpansion: aq.pUpperCanopyExpansion,
        pLowerCanopyExpansion: aq.pLowerCanopyExpansion,
        pUpperStomatalClosure: aq.pUpperStomatalClosure,
        pUpperCanopySenescence: aq.pUpperCanopySenescence,
        pUpperPollinationFailure: aq.pUpperPollinationFailure,
        verificationStatus: aq.verificationStatus,
        sourceCitation: aq.sourceCitation,
      },
      thermalAndSoilLimits: {
        gddBaseC: ag ? ag.gdd.value.baseC : null,
        gddRequired: ag ? ag.gdd.value.required : null,
        frostCriticalC: ag ? ag.frost.value.criticalC : null,
        heatThresholdC: ag ? ag.heat.value.thresholdC : null,
        phMin: c.phRange ? c.phRange.value.min : null,
        phMax: c.phRange ? c.phRange.value.max : null,
        maxConsecutiveYears: c.maxConsecutive.value,
        verificationStatus: ag ? toVerif(ag.gdd.confidence) : "Verified",
      },
    };
  });
}
