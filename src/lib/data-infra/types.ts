/**
 * AgroShift AI — Agricultural Scientific Data Infrastructure
 * Core Domain & Persistence Schema Types (18 Logical Tables + Provenance)
 *
 * Principle: NO FAKE DATA. NO FABRICATED RESULTS. NO UNVERIFIED SCIENTIFIC CLAIMS.
 */

import type { ClimateZone, CropId } from "@/lib/types";

export type VerificationStatus = "Verified" | "Estimated" | "Unavailable";

export type IngestionJobStatus = "pending" | "running" | "succeeded" | "partial" | "failed";

export type DataSourceCategory =
  | "meteorology"
  | "precipitation"
  | "soil_moisture"
  | "vegetation"
  | "climate_projection"
  | "topography"
  | "soil"
  | "crop_parameters"
  | "national_statistics"
  | "market_and_policy";

export interface ProvenanceMetadata {
  sourceId: string;
  datasetVersion: string;
  observationTimestamp: string;
  retrievalTimestamp: string;
  coordinates: { lat: number; lon: number };
  spatialResolution: string;
  spatialResolutionM: number;
  units: Record<string, string>;
  qualityFlag: string;
  verificationStatus: VerificationStatus;
  uncertainty: {
    level: "low" | "moderate" | "high" | "unquantified";
    spatialFootprintRatio?: number;
    confidenceInterval?: { q05?: number | null; q95?: number | null; stdError?: number | null };
    notes: string;
  };
  sourceUrl: string;
}

// -----------------------------------------------------------------------------
// 1. data_sources
// -----------------------------------------------------------------------------
export interface DataSourceRecord {
  sourceId: string;
  name: string;
  organization: string;
  category: DataSourceCategory;
  officialUrl: string;
  documentationUrl: string;
  apiEndpoint: string | null;
  accessMethod: "REST_JSON" | "OPENDAP_HDF5" | "WCS_REST" | "S3_THREDDS_NETCDF" | "OFFICIAL_STATISTICAL_RELEASE";
  authRequired: boolean;
  authMechanism: "NONE" | "EARTHDATA_BEARER_TOKEN" | "API_KEY";
  spatialResolution: string;
  spatialResolutionM: number;
  temporalResolution: string;
  updateFrequency: string;
  refreshPolicy: {
    intervalHours: number;
    rateLimitRpm: number;
    maxRetries: number;
    backoffBaseMs: number;
    idempotencyStrategy: string;
  };
  variablesCollected: string[];
  license: string;
  verificationStatus: VerificationStatus;
  liveAccessStatus: "active" | "cached_verified_snapshot" | "requires_credentials" | "unavailable";
  scientificLimitations: string[];
}

// -----------------------------------------------------------------------------
// 2. ingestion_jobs
// -----------------------------------------------------------------------------
export interface IngestionJobRecord {
  jobId: string;
  sourceId: string;
  fieldId: string | null;
  jobType: "scheduled_refresh" | "manual_refresh" | "initial_seed" | "cross_check";
  status: IngestionJobStatus;
  idempotencyKey: string;
  recordsFetched: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsRejected: number;
  retryCount: number;
  httpStatus: number | null;
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
}

// -----------------------------------------------------------------------------
// 3. datasets
// -----------------------------------------------------------------------------
export interface DatasetRecord {
  datasetId: string;
  sourceId: string;
  datasetVersion: string;
  productCode: string;
  spatialCrs: "EPSG:4326";
  spatialResolutionM: number;
  temporalStart: string | null;
  temporalEnd: string | null;
  rawStorageUri: string;
  verificationStatus: VerificationStatus;
  recordCount: number;
  retrievedAt: string;
}

// -----------------------------------------------------------------------------
// 4. field_boundaries
// -----------------------------------------------------------------------------
export interface GeoJsonPolygonOrMulti {
  type: "Polygon" | "MultiPolygon";
  coordinates: number[][][] | number[][][][];
}

export interface SpatialResolutionCheck {
  sourceId: string;
  productName: string;
  pixelSizeM: number;
  pixelAreaHa: number;
  parcelAreaHa: number;
  parcelToPixelRatio: number;
  adequacy: "parcel_resolved" | "sub_parcel_composite" | "regional_grid_proxy";
  warningTr: string;
  warningEn: string;
}

export interface FieldBoundaryRecord {
  fieldId: string;
  fieldName: string;
  province: string;
  district: string;
  basinId: string;
  climateZone: ClimateZone;
  geometry: GeoJsonPolygonOrMulti;
  crsEpsg: 4326;
  centroid: { lat: number; lon: number };
  bbox: [number, number, number, number];
  areaM2: number;
  areaDa: number;
  areaHa: number;
  perimeterM: number;
  elevationMeanM: number | null;
  slopeMeanPct: number | null;
  aspectDeg: number | null;
  isValidGeometry: boolean;
  spatialChecks: SpatialResolutionCheck[];
  createdAt: string;
  updatedAt: string;
}

// -----------------------------------------------------------------------------
// 5. weather_daily
// -----------------------------------------------------------------------------
export interface WeatherDailyRecord {
  fieldId: string;
  observationDate: string;
  t2mMeanC: number | null;
  t2mMaxC: number | null;
  t2mMinC: number | null;
  prectotcorrMm: number | null;
  rh2mPct: number | null;
  ws2mMs: number | null;
  allskySfcSwDwnMj: number | null;
  et0Fao56Mm: number | null;
  et0Method: "penman_monteith" | "hargreaves" | "unavailable";
  missingFlags: string[];
  qualityFlag: "good" | "interpolated" | "partial_missing" | "suspect";
  verificationStatus: VerificationStatus;
}

// -----------------------------------------------------------------------------
// 6. precipitation_observations
// -----------------------------------------------------------------------------
export interface PrecipitationObservationRecord {
  fieldId: string;
  sourceId: string;
  datasetVersion: string;
  periodStart: string;
  periodEnd: string;
  granularity: "daily" | "monthly" | "annual" | "climatology_normal";
  precipitationMm: number | null;
  climatologyNormalMm: number | null;
  anomalyMm: number | null;
  anomalyPct: number | null;
  qualityFlag: string;
  verificationStatus: VerificationStatus;
  provenance: ProvenanceMetadata;
}

// -----------------------------------------------------------------------------
// 7. soil_moisture_observations
// -----------------------------------------------------------------------------
export interface SoilMoistureObservationRecord {
  fieldId: string;
  sourceId: string;
  datasetVersion: string;
  observationDate: string;
  surfaceLayerCm: "0-5cm";
  rootzoneLayerCm: "0-100cm";
  surfaceWetness0to1: number | null;
  rootzoneWetness0to1: number | null;
  volumetricSurfaceM3M3: number | null;
  volumetricRootzoneM3M3: number | null;
  anomalyZScore: number | null;
  isParcelScaleSensor: false;
  spatialUncertaintyWarning: string;
  qualityFlag: string;
  verificationStatus: VerificationStatus;
  provenance: ProvenanceMetadata;
}

// -----------------------------------------------------------------------------
// 8. vegetation_indices
// -----------------------------------------------------------------------------
export interface VegetationIndexRecord {
  fieldId: string;
  sourceId: string;
  datasetVersion: string;
  compositeDate: string;
  ndvi: number | null;
  evi: number | null;
  pixelReliabilityRank: 0 | 1 | 2 | 3 | -1;
  passedQualityFilter: boolean;
  phenologyStageHint: "bare_or_dormant" | "greenup" | "peak_canopy" | "senescence";
  agronomicCaveat: string;
  verificationStatus: VerificationStatus;
}

// -----------------------------------------------------------------------------
// 9. soil_properties
// -----------------------------------------------------------------------------
export interface SoilPropertyLayerRecord {
  fieldId: string;
  dataOrigin: "user_lab" | "soilgrids_v2" | "regional_default";
  priorityRank: 1 | 2 | 3; // 1 = user_lab (highest priority), 2 = soilgrids_v2, 3 = regional_default
  depthLabel: "0-5cm" | "5-15cm" | "15-30cm" | "30-60cm" | "60-100cm" | "100-200cm";
  depthTopCm: number;
  depthBottomCm: number;
  sandPct: number | null;
  siltPct: number | null;
  clayPct: number | null;
  textureClassUsda: string | null;
  phH2o: number | null;
  socGKg: number | null;
  nitrogenGKg: number | null;
  bdodGCm3: number | null;
  cecCmolKg: number | null;
  cfvoVolPct: number | null;
  thetaFcM3M3: number | null;
  thetaWpM3M3: number | null;
  thetaRetentionAnomalyFlagged: boolean;
  wrbSoilGroup: string | null;
  scalingFactorsApplied: Record<string, number>;
  uncertaintyIntervals: {
    phQ05?: number | null;
    phQ95?: number | null;
    socQ05?: number | null;
    socQ95?: number | null;
    clayQ05?: number | null;
    clayQ95?: number | null;
  };
  verificationStatus: VerificationStatus;
  provenance: ProvenanceMetadata;
}

// -----------------------------------------------------------------------------
// 10. crop_parameters
// -----------------------------------------------------------------------------
export interface ScientificCropParameterRecord {
  cropId: CropId;
  nameTr: string;
  nameEn: string;
  botanicalFamily: string;
  photosyntheticPathway: "C3" | "C4" | "NONE";
  fao56: {
    kcIni: number | null;
    kcMid: number | null;
    kcEnd: number | null;
    kcVerification: VerificationStatus;
    kcSource: string;
    rootDepthMinM: number;
    rootDepthMaxM: number | null;
    depletionFractionP: number | null;
    yieldResponseKy: number | null;
    kyVerification: VerificationStatus;
    kySource: string;
    calendarsByZone: Record<
      ClimateZone,
      {
        sow: string;
        latestSow: string;
        stagesDays: [number, number, number, number];
        verificationStatus: VerificationStatus;
      }
    > | null;
  };
  aquacrop: {
    wpStarGm2: number | null; // Normalized water productivity WP* (g/m^2)
    wpYieldFormationAdjFactor: number | null; // Lipid/protein synthesis reduction factor
    hi0Pct: number | null; // Reference harvest index (%)
    cc0Pct: number | null; // Initial canopy cover (%)
    ccxPct: number | null; // Maximum canopy cover (%)
    cgcPctDay: number | null; // Canopy growth coefficient (%/day)
    cdcPctDay: number | null; // Canopy decline coefficient (%/day)
    pUpperCanopyExpansion: number | null;
    pLowerCanopyExpansion: number | null;
    pUpperStomatalClosure: number | null;
    pUpperCanopySenescence: number | null;
    pUpperPollinationFailure: number | null;
    verificationStatus: VerificationStatus;
    sourceCitation: string;
  };
  thermalAndSoilLimits: {
    gddBaseC: number | null;
    gddRequired: number | null;
    frostCriticalC: number | null;
    heatThresholdC: number | null;
    phMin: number | null;
    phMax: number | null;
    maxConsecutiveYears: number;
    verificationStatus: VerificationStatus;
  };
}

// -----------------------------------------------------------------------------
// 11. crop_history
// -----------------------------------------------------------------------------
export interface CropHistoryRecord {
  fieldId: string;
  agriculturalYear: number;
  cropId: CropId;
  managementMode: "rainfed" | "irrigated" | "deficit_irrigated";
  observedYieldTHa: number | null;
  verificationStatus: VerificationStatus;
  notes: string;
}

// -----------------------------------------------------------------------------
// 12. crop_yields
// -----------------------------------------------------------------------------
export interface CropYieldBaselineRecord {
  sourceId: string;
  cropId: CropId;
  province: string;
  referenceYear: number;
  productionRegime: "irrigated" | "rainfed" | "national_average";
  yieldKgDa: number;
  yieldTHa: number;
  nationalProductionTonnes: number | null;
  yoyChangePct: number | null;
  verificationStatus: VerificationStatus;
  sourceUrl: string;
}

// -----------------------------------------------------------------------------
// 13. market_prices
// -----------------------------------------------------------------------------
export interface MarketPriceRecord {
  sourceId: string;
  cropId: CropId;
  marketingSeason: string;
  pricingAuthority: string;
  basePriceTlKg: number;
  supportPremiumTlKg: number;
  effectivePriceTlKg: number;
  priceRangeMinTlKg: number;
  priceRangeMaxTlKg: number;
  verificationStatus: VerificationStatus;
  sourceUrl: string;
  announcedDate: string;
}

// -----------------------------------------------------------------------------
// 14. production_costs
// -----------------------------------------------------------------------------
export interface ProductionCostRecord {
  sourceId: string;
  cropId: CropId;
  season: string;
  regionScope: string;
  varCostIrrigatedTlDa: number;
  varCostRainfedTlDa: number;
  ministrySupportTlDa: number;
  supportBreakdown: {
    temelDestekTlDa: number;
    planliUretimDestegiTlDa: number;
    suKisitiDestegiTlDa: number;
  };
  verificationStatus: VerificationStatus;
  sourceUrl: string;
}

// -----------------------------------------------------------------------------
// 15. irrigation_records
// -----------------------------------------------------------------------------
export interface IrrigationRecord {
  fieldId: string;
  agriculturalYear: number;
  waterSourceType: "dsi_canal" | "groundwater_well" | "pressurized_pipe" | "rainfed_none";
  irrigationMethod: "drip" | "sprinkler" | "furrow" | "rainfed";
  applicationEfficiency: number;
  annualBudgetMm: number;
  budgetBasis: "net" | "gross";
  waterPriceTlM3: number;
  isWaterRestrictedBasin: boolean;
  dsiBasinName: string;
  verificationStatus: VerificationStatus;
}

// -----------------------------------------------------------------------------
// 16. climate_scenarios
// -----------------------------------------------------------------------------
export interface ClimateScenarioRecord {
  scenarioId: string;
  sourceId: string;
  datasetVersion: string;
  sspPathway: "Historical_1991_2020" | "SSP2-4.5" | "SSP5-8.5";
  gcmEnsemble: string;
  climateZone: ClimateZone;
  horizonPeriod: string;
  tempDeltaC: number;
  precipMultiplier: number;
  hotDaysDeltaPerYear: number;
  droughtFrequencyMultiplier: number;
  usageConstraintWarning: string;
  verificationStatus: VerificationStatus;
  sourceUrl: string;
}

// -----------------------------------------------------------------------------
// 17. model_inputs & 18. model_outputs
// -----------------------------------------------------------------------------
export interface ModelInputRecord {
  modelInputId: string;
  fieldId: string;
  inputHash: string;
  readinessScore: number;
  soilOriginUsed: "user_lab" | "soilgrids_v2" | "regional_default";
  climateCompleteYears: number;
  verifiedLayers: string[];
  estimatedLayers: string[];
  unavailableLayers: string[];
  createdAt: string;
}

export interface ModelOutputRecord {
  modelOutputId: string;
  modelInputId: string;
  fieldId: string;
  engineVersion: string;
  topRecommendedRotation: [CropId, CropId, CropId];
  confidenceGrade: "A" | "B" | "C" | "D";
  confidenceScore: number;
  computedAt: string;
}

// -----------------------------------------------------------------------------
// API Response Contracts
// -----------------------------------------------------------------------------
export interface DataQualityValidationSummary {
  fieldId: string;
  evaluatedAt: string;
  overallStatus: VerificationStatus;
  completenessScore: number; // 0-100
  checks: {
    checkId: string;
    domain: "climate" | "soil" | "vegetation" | "water" | "geospatial" | "crop_params";
    passed: boolean;
    verificationStatus: VerificationStatus;
    details: string;
    anomaliesDetected: number;
  }[];
}

export interface ModelReadinessResponse {
  fieldId: string;
  fieldName: string;
  evaluatedAt: string;
  readyForScientificSimulation: boolean;
  readinessScore: number; // 0-100
  confidenceGradeExpected: "A" | "B" | "C" | "D";
  soilPrioritySourceActive: "user_lab" | "soilgrids_v2" | "regional_default";
  components: {
    component: string;
    sourceId: string;
    verificationStatus: VerificationStatus;
    recordCount: number;
    coveragePeriod: string;
    spatialResolution: string;
    ready: boolean;
    notes: string;
  }[];
  spatialAdequacyWarnings: SpatialResolutionCheck[];
  qualitySummary: DataQualityValidationSummary;
  modelInputSnapshot: ModelInputRecord;
}
