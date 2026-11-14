-- =============================================================================
-- AGROSHIFT AI — AGRICULTURAL SCIENTIFIC DATA INFRASTRUCTURE
-- PostgreSQL 15+ / PostGIS 3+ Production Schema (DDL)
-- =============================================================================
-- Core Principle: NO FAKE DATA. NO FABRICATED RESULTS. NO UNVERIFIED CLAIMS.
-- Every record carries source provenance, observation/retrieval timestamps,
-- spatial reference (WGS84 EPSG:4326), unit metadata, quality flags, and
-- verification status ('Verified', 'Estimated', 'Unavailable').
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
    CREATE TYPE verification_status_enum AS ENUM ('Verified', 'Estimated', 'Unavailable');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status_enum AS ENUM ('pending', 'running', 'succeeded', 'partial', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 1. data_sources
-- Registry of external scientific, satellite, soil, and national statistical providers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS data_sources (
    source_id              VARCHAR(64) PRIMARY KEY,
    name                   VARCHAR(160) NOT NULL,
    organization           VARCHAR(160) NOT NULL,
    category               VARCHAR(64) NOT NULL, -- meteorology, precipitation, soil_moisture, vegetation, climate_projection, soil, crop_parameters, national_stats
    official_url           TEXT NOT NULL,
    documentation_url      TEXT NOT NULL,
    api_endpoint           TEXT,
    access_method          VARCHAR(64) NOT NULL, -- REST_JSON, OPENDAP_HDF5, WCS_GEOTIFF, S3_NETCDF, STATIC_OFFICIAL_TABLE
    auth_required          BOOLEAN NOT NULL DEFAULT FALSE,
    auth_mechanism         VARCHAR(64),          -- NONE, EARTHDATA_BEARER_TOKEN, API_KEY
    spatial_resolution     VARCHAR(80) NOT NULL,
    spatial_resolution_m   NUMERIC(10, 2),
    temporal_resolution    VARCHAR(64) NOT NULL,
    update_frequency       VARCHAR(64) NOT NULL,
    refresh_interval_hours INTEGER NOT NULL DEFAULT 24,
    rate_limit_rpm         INTEGER NOT NULL DEFAULT 30,
    max_retries            INTEGER NOT NULL DEFAULT 3,
    backoff_base_ms        INTEGER NOT NULL DEFAULT 2000,
    license                VARCHAR(120) NOT NULL,
    default_verification   verification_status_enum NOT NULL DEFAULT 'Verified',
    is_active              BOOLEAN NOT NULL DEFAULT TRUE,
    notes                  TEXT,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. ingestion_jobs
-- Audit log of all automated and manual data ingestion / refresh runs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    job_id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id) ON DELETE RESTRICT,
    field_id               VARCHAR(128),
    job_type               VARCHAR(64) NOT NULL, -- scheduled_refresh, manual_refresh, initial_backfill, cross_check
    status                 job_status_enum NOT NULL DEFAULT 'pending',
    idempotency_key        VARCHAR(192) NOT NULL UNIQUE,
    request_params         JSONB NOT NULL DEFAULT '{}'::jsonb,
    records_fetched        INTEGER NOT NULL DEFAULT 0,
    records_inserted       INTEGER NOT NULL DEFAULT 0,
    records_updated        INTEGER NOT NULL DEFAULT 0,
    records_rejected       INTEGER NOT NULL DEFAULT 0,
    retry_count            INTEGER NOT NULL DEFAULT 0,
    http_status            INTEGER,
    error_code             VARCHAR(64),
    error_message          TEXT,
    started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_source_status ON ingestion_jobs(source_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ingestion_jobs_field ON ingestion_jobs(field_id, started_at DESC);

-- -----------------------------------------------------------------------------
-- 3. datasets
-- Versioned dataset snapshots and raw storage references
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS datasets (
    dataset_id             VARCHAR(128) PRIMARY KEY,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id) ON DELETE RESTRICT,
    dataset_version        VARCHAR(64) NOT NULL,
    product_code           VARCHAR(64) NOT NULL, -- e.g. POWER_AG_DAILY, MOD13Q1.061, GPM_3IMERGM.07, SPL4SMGP.007, SOILGRIDS_V2
    spatial_crs            VARCHAR(32) NOT NULL DEFAULT 'EPSG:4326',
    spatial_resolution_m   NUMERIC(10, 2),
    temporal_start         DATE,
    temporal_end           DATE,
    raw_storage_uri        TEXT,
    checksum_sha256        VARCHAR(64),
    verification_status    verification_status_enum NOT NULL,
    quality_summary        JSONB NOT NULL DEFAULT '{}'::jsonb,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, product_code, dataset_version, raw_storage_uri)
);

-- -----------------------------------------------------------------------------
-- 4. field_boundaries
-- Validated parcel polygons / multi-polygons in WGS84 (EPSG:4326)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS field_boundaries (
    field_id               VARCHAR(128) PRIMARY KEY,
    field_name             VARCHAR(160) NOT NULL,
    province               VARCHAR(80),
    district               VARCHAR(80),
    basin_id               VARCHAR(64),
    climate_zone           VARCHAR(32) NOT NULL CHECK (climate_zone IN ('south_lowland', 'north_lowland', 'highland')),
    geom                   GEOMETRY(MultiPolygon, 4326) NOT NULL,
    centroid               GEOMETRY(Point, 4326) NOT NULL,
    centroid_lat           DOUBLE PRECISION NOT NULL CHECK (centroid_lat BETWEEN -90 AND 90),
    centroid_lon           DOUBLE PRECISION NOT NULL CHECK (centroid_lon BETWEEN -180 AND 180),
    area_m2                NUMERIC(14, 2) NOT NULL CHECK (area_m2 > 0),
    area_da                NUMERIC(12, 3) NOT NULL CHECK (area_da > 0),
    area_ha                NUMERIC(12, 4) NOT NULL CHECK (area_ha > 0),
    perimeter_m            NUMERIC(12, 2) NOT NULL CHECK (perimeter_m > 0),
    elevation_mean_m       NUMERIC(8, 2),
    slope_mean_pct         NUMERIC(6, 2),
    aspect_deg             NUMERIC(6, 2),
    crs_epsg               INTEGER NOT NULL DEFAULT 4326,
    is_valid_geometry      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_boundaries_geom ON field_boundaries USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_field_boundaries_centroid ON field_boundaries USING GIST (centroid);

-- -----------------------------------------------------------------------------
-- 5. weather_daily
-- Daily meteorological time series (NASA POWER AG Daily, MGM station observations)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_daily (
    weather_id             BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    observation_date       DATE NOT NULL,
    latitude               DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude              DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    spatial_resolution_m   NUMERIC(10, 2) NOT NULL DEFAULT 50000,
    t2m_mean_c             NUMERIC(6, 2) CHECK (t2m_mean_c IS NULL OR t2m_mean_c BETWEEN -60 AND 65),
    t2m_max_c              NUMERIC(6, 2) CHECK (t2m_max_c IS NULL OR t2m_max_c BETWEEN -60 AND 65),
    t2m_min_c              NUMERIC(6, 2) CHECK (t2m_min_c IS NULL OR t2m_min_c BETWEEN -60 AND 65),
    prectotcorr_mm         NUMERIC(8, 2) CHECK (prectotcorr_mm IS NULL OR prectotcorr_mm >= 0),
    rh2m_pct               NUMERIC(5, 2) CHECK (rh2m_pct IS NULL OR rh2m_pct BETWEEN 0 AND 100),
    ws2m_ms                NUMERIC(6, 2) CHECK (ws2m_ms IS NULL OR ws2m_ms >= 0),
    allsky_sfc_sw_dwn_mj   NUMERIC(6, 3) CHECK (allsky_sfc_sw_dwn_mj IS NULL OR allsky_sfc_sw_dwn_mj >= 0),
    et0_fao56_mm           NUMERIC(6, 3) CHECK (et0_fao56_mm IS NULL OR et0_fao56_mm >= 0),
    et0_method             VARCHAR(32), -- penman_monteith, hargreaves
    missing_flags          JSONB NOT NULL DEFAULT '{}'::jsonb,
    quality_flag           VARCHAR(32) NOT NULL DEFAULT 'good', -- good, interpolated, partial_missing, suspect
    verification_status    verification_status_enum NOT NULL DEFAULT 'Verified',
    units_json             JSONB NOT NULL DEFAULT '{"t2m":"C","precip":"mm/day","rh":"%","ws2m":"m/s","rs":"MJ/m2/day"}'::jsonb,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, source_id, observation_date)
);

CREATE INDEX IF NOT EXISTS idx_weather_daily_field_date ON weather_daily(field_id, observation_date);

-- -----------------------------------------------------------------------------
-- 6. precipitation_observations
-- Multi-source precipitation records & cross-checks (NASA GPM IMERG, ERA5, POWER, MGM)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS precipitation_observations (
    precip_obs_id          BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    period_start           DATE NOT NULL,
    period_end             DATE NOT NULL,
    temporal_granularity   VARCHAR(32) NOT NULL CHECK (temporal_granularity IN ('half_hourly', 'daily', 'monthly', 'annual')),
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    spatial_resolution_m   NUMERIC(10, 2) NOT NULL,
    precipitation_mm       NUMERIC(10, 2) CHECK (precipitation_mm IS NULL OR precipitation_mm >= 0),
    climatology_normal_mm  NUMERIC(10, 2),
    anomaly_mm             NUMERIC(10, 2),
    anomaly_pct            NUMERIC(7, 2),
    random_error_mm        NUMERIC(8, 2),
    quality_index          NUMERIC(5, 2),
    quality_flag           VARCHAR(32) NOT NULL,
    verification_status    verification_status_enum NOT NULL,
    uncertainty_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, source_id, temporal_granularity, period_start, period_end)
);

-- -----------------------------------------------------------------------------
-- 7. soil_moisture_observations
-- Satellite & reanalysis soil moisture (NASA SMAP L4 SPL4SMGP, NASA POWER MERRA-2 GWET)
-- Note: Explicitly tagged with spatial resolution & footprint-vs-parcel uncertainty.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soil_moisture_observations (
    sm_obs_id              BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    observation_date       DATE NOT NULL,
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    spatial_resolution_m   NUMERIC(10, 2) NOT NULL, -- e.g. 9000 for SMAP L4, 50000 for MERRA-2
    surface_layer_cm       VARCHAR(32) NOT NULL DEFAULT '0-5cm',
    rootzone_layer_cm      VARCHAR(32) NOT NULL DEFAULT '0-100cm',
    sm_surface_m3m3        NUMERIC(6, 4) CHECK (sm_surface_m3m3 IS NULL OR sm_surface_m3m3 BETWEEN 0 AND 1),
    sm_rootzone_m3m3       NUMERIC(6, 4) CHECK (sm_rootzone_m3m3 IS NULL OR sm_rootzone_m3m3 BETWEEN 0 AND 1),
    wetness_surface_0_1    NUMERIC(6, 4) CHECK (wetness_surface_0_1 IS NULL OR wetness_surface_0_1 BETWEEN 0 AND 1),
    wetness_rootzone_0_1   NUMERIC(6, 4) CHECK (wetness_rootzone_0_1 IS NULL OR wetness_rootzone_0_1 BETWEEN 0 AND 1),
    anomaly_zscore         NUMERIC(6, 3),
    is_parcel_scale_sensor BOOLEAN NOT NULL DEFAULT FALSE, -- Always FALSE for SMAP/MERRA-2 regional grids
    spatial_uncertainty_note TEXT NOT NULL,
    quality_flag           VARCHAR(32) NOT NULL,
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, source_id, observation_date)
);

-- -----------------------------------------------------------------------------
-- 8. vegetation_indices
-- Satellite vegetation phenology (NASA MODIS MOD13Q1 250 m NDVI & EVI)
-- Note: NDVI/EVI alone is never treated as a direct yield or single-nutrient meter.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vegetation_indices (
    veg_obs_id             BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    composite_date         DATE NOT NULL,
    modis_day_of_year      VARCHAR(16),
    latitude               DOUBLE PRECISION NOT NULL,
    longitude              DOUBLE PRECISION NOT NULL,
    spatial_resolution_m   NUMERIC(10, 2) NOT NULL DEFAULT 250,
    ndvi                   NUMERIC(6, 4) CHECK (ndvi IS NULL OR ndvi BETWEEN -0.2000 AND 1.0000),
    evi                    NUMERIC(6, 4) CHECK (evi IS NULL OR evi BETWEEN -0.2000 AND 1.0000),
    pixel_reliability_rank SMALLINT, -- 0: Good, 1: Marginal, 2: Snow/Ice, 3: Cloudy, -1: Fill
    vi_quality_bitmask     INTEGER,
    passed_quality_filter  BOOLEAN NOT NULL DEFAULT TRUE,
    phenology_stage_hint   VARCHAR(32), -- baseline_bare, greenup, peak_canopy, senescence
    agronomic_caveat       TEXT NOT NULL DEFAULT 'NDVI/EVI reflects canopy greenness/vigor; cannot independently diagnose specific nutrient deficiencies or guaranteed harvest yield.',
    verification_status    verification_status_enum NOT NULL DEFAULT 'Verified',
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, source_id, composite_date)
);

-- -----------------------------------------------------------------------------
-- 9. soil_properties
-- Depth-resolved soil profile layers (ISRIC SoilGrids v2.0 predictions vs User Lab Tests)
-- Laboratory analyses ('user_lab') are stored separately and prioritized over SoilGrids.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS soil_properties (
    soil_prop_id           BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    data_origin            VARCHAR(32) NOT NULL CHECK (data_origin IN ('user_lab', 'soilgrids_v2', 'regional_default')),
    priority_rank          SMALLINT NOT NULL CHECK (priority_rank BETWEEN 1 AND 3), -- 1 = user_lab (highest), 2 = soilgrids_v2, 3 = regional_default
    depth_label            VARCHAR(32) NOT NULL, -- 0-5cm, 5-15cm, 15-30cm, 30-60cm, 60-100cm, 100-200cm
    depth_top_cm           SMALLINT NOT NULL CHECK (depth_top_cm >= 0),
    depth_bottom_cm        SMALLINT NOT NULL CHECK (depth_bottom_cm > depth_top_cm),
    sand_pct               NUMERIC(5, 2) CHECK (sand_pct IS NULL OR sand_pct BETWEEN 0 AND 100),
    silt_pct               NUMERIC(5, 2) CHECK (silt_pct IS NULL OR silt_pct BETWEEN 0 AND 100),
    clay_pct               NUMERIC(5, 2) CHECK (clay_pct IS NULL OR clay_pct BETWEEN 0 AND 100),
    texture_class_usda     VARCHAR(32),
    ph_h2o                 NUMERIC(4, 2) CHECK (ph_h2o IS NULL OR ph_h2o BETWEEN 3.0 AND 11.0),
    soc_g_kg               NUMERIC(6, 2) CHECK (soc_g_kg IS NULL OR soc_g_kg >= 0),
    nitrogen_g_kg          NUMERIC(6, 3) CHECK (nitrogen_g_kg IS NULL OR nitrogen_g_kg >= 0),
    bdod_g_cm3             NUMERIC(5, 3) CHECK (bdod_g_cm3 IS NULL OR bdod_g_cm3 BETWEEN 0.5 AND 2.6),
    cec_cmol_kg            NUMERIC(6, 2) CHECK (cec_cmol_kg IS NULL OR cec_cmol_kg >= 0),
    cfvo_vol_pct           NUMERIC(5, 2) CHECK (cfvo_vol_pct IS NULL OR cfvo_vol_pct BETWEEN 0 AND 100),
    theta_fc_m3m3          NUMERIC(5, 3) CHECK (theta_fc_m3m3 IS NULL OR theta_fc_m3m3 BETWEEN 0.02 AND 0.70),
    theta_wp_m3m3          NUMERIC(5, 3) CHECK (theta_wp_m3m3 IS NULL OR theta_wp_m3m3 BETWEEN 0.01 AND 0.55),
    wrb_soil_group         VARCHAR(96),
    scaling_factors_json   JSONB NOT NULL DEFAULT '{"sand":10,"silt":10,"clay":10,"soc":10,"phh2o":10,"cec":10,"nitrogen":100,"bdod":100,"cfvo":10,"wv0033":10,"wv1500":10}'::jsonb,
    uncertainty_json       JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    sampled_or_retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, data_origin, depth_top_cm, depth_bottom_cm)
);

-- -----------------------------------------------------------------------------
-- 10. crop_parameters
-- FAO-56, FAO-33/66, and FAO AquaCrop v7.1 biophysical & phenological parameters
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_parameters (
    crop_id                VARCHAR(64) PRIMARY KEY,
    name_tr                VARCHAR(80) NOT NULL,
    name_en                VARCHAR(80) NOT NULL,
    botanical_family       VARCHAR(64) NOT NULL,
    photosynthetic_pathway VARCHAR(8) NOT NULL CHECK (photosynthetic_pathway IN ('C3', 'C4', 'NONE')),
    kc_ini                 NUMERIC(4, 2),
    kc_mid                 NUMERIC(4, 2),
    kc_end                 NUMERIC(4, 2),
    kc_verification        verification_status_enum NOT NULL,
    root_depth_min_m       NUMERIC(4, 2),
    root_depth_max_m       NUMERIC(4, 2),
    depletion_fraction_p   NUMERIC(4, 2),
    yield_response_ky      NUMERIC(4, 2),
    ky_verification        verification_status_enum NOT NULL,
    aquacrop_wp_star_gm2   NUMERIC(5, 2), -- Normalized water productivity WP* (g/m2)
    aquacrop_hi0_pct       NUMERIC(5, 2), -- Reference Harvest Index (%)
    aquacrop_cgc_pct_day   NUMERIC(5, 2), -- Canopy growth coefficient (%/day)
    aquacrop_cdc_pct_day   NUMERIC(5, 2), -- Canopy decline coefficient (%/day)
    aquacrop_p_upper_exp   NUMERIC(4, 2), -- Canopy expansion upper stress threshold
    aquacrop_p_upper_sto   NUMERIC(4, 2), -- Stomatal closure upper stress threshold
    aquacrop_verification  verification_status_enum NOT NULL,
    gdd_base_c             NUMERIC(4, 1),
    gdd_required           INTEGER,
    frost_critical_c       NUMERIC(4, 1),
    heat_threshold_c       NUMERIC(4, 1),
    ph_min                 NUMERIC(4, 2),
    ph_max                 NUMERIC(4, 2),
    max_consecutive_years  SMALLINT NOT NULL DEFAULT 1,
    calendars_by_zone_json JSONB NOT NULL,
    parameter_sources_json JSONB NOT NULL,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. crop_history
-- Historical parcel crop sequence, management mode, and observed outcomes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_history (
    history_id             BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    agricultural_year      INTEGER NOT NULL CHECK (agricultural_year BETWEEN 1990 AND 2100),
    crop_id                VARCHAR(64) NOT NULL REFERENCES crop_parameters(crop_id),
    management_mode        VARCHAR(32) NOT NULL CHECK (management_mode IN ('rainfed', 'irrigated', 'deficit_irrigated')),
    sowing_date            DATE,
    harvest_date           DATE,
    observed_yield_t_ha    NUMERIC(6, 2),
    residue_management     VARCHAR(32),
    notes                  TEXT,
    verification_status    verification_status_enum NOT NULL DEFAULT 'Verified',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, agricultural_year)
);

-- -----------------------------------------------------------------------------
-- 12. crop_yields
-- Official regional/provincial & national crop yield baselines (TÜİK, Tarım Bakanlığı)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crop_yields (
    yield_record_id        BIGSERIAL PRIMARY KEY,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    crop_id                VARCHAR(64) NOT NULL REFERENCES crop_parameters(crop_id),
    country_code           CHAR(2) NOT NULL DEFAULT 'TR',
    province               VARCHAR(80) NOT NULL, -- 'Türkiye Geneli' or province name ('Konya', 'Şanlıurfa', etc.)
    district               VARCHAR(80),
    reference_year         INTEGER NOT NULL,
    production_regime      VARCHAR(32) NOT NULL CHECK (production_regime IN ('irrigated', 'rainfed', 'combined_average')),
    yield_kg_da            NUMERIC(8, 2) NOT NULL CHECK (yield_kg_da >= 0),
    yield_t_ha             NUMERIC(6, 3) NOT NULL CHECK (yield_t_ha >= 0),
    national_production_t  NUMERIC(14, 0),
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, crop_id, province, reference_year, production_regime)
);

-- -----------------------------------------------------------------------------
-- 13. market_prices
-- Official reference purchase & commodity exchange prices (TMO, Trakya Birlik, Türkşeker, Borsalar)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS market_prices (
    price_id               BIGSERIAL PRIMARY KEY,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    crop_id                VARCHAR(64) NOT NULL REFERENCES crop_parameters(crop_id),
    marketing_season       VARCHAR(32) NOT NULL, -- e.g. '2025/2026'
    pricing_authority      VARCHAR(120) NOT NULL, -- e.g. 'TMO', 'Trakya Birlik', 'Türkşeker', 'Konya Ticaret Borsası'
    base_price_tl_kg       NUMERIC(10, 2) NOT NULL CHECK (base_price_tl_kg >= 0),
    support_premium_tl_kg  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    effective_price_tl_kg  NUMERIC(10, 2) NOT NULL CHECK (effective_price_tl_kg >= 0),
    price_band_min_tl_kg   NUMERIC(10, 2),
    price_band_max_tl_kg   NUMERIC(10, 2),
    currency               CHAR(3) NOT NULL DEFAULT 'TRY',
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    announced_date         DATE,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, crop_id, marketing_season, pricing_authority)
);

-- -----------------------------------------------------------------------------
-- 14. production_costs
-- Official & regional agronomic input cost structures and ministry support payments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_costs (
    cost_id                BIGSERIAL PRIMARY KEY,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    crop_id                VARCHAR(64) NOT NULL REFERENCES crop_parameters(crop_id),
    season                 VARCHAR(32) NOT NULL,
    region_scope           VARCHAR(80) NOT NULL DEFAULT 'Türkiye Geneli',
    var_cost_irrigated_tl_da NUMERIC(10, 2) NOT NULL CHECK (var_cost_irrigated_tl_da >= 0),
    var_cost_rainfed_tl_da   NUMERIC(10, 2) NOT NULL CHECK (var_cost_rainfed_tl_da >= 0),
    seed_fertilizer_share  NUMERIC(4, 2),
    fuel_tillage_share     NUMERIC(4, 2),
    ministry_support_tl_da NUMERIC(10, 2) NOT NULL DEFAULT 0,
    support_details_json   JSONB NOT NULL DEFAULT '{}'::jsonb,
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (source_id, crop_id, season, region_scope)
);

-- -----------------------------------------------------------------------------
-- 15. irrigation_records
-- Field-level water budget, irrigation system efficiency, and basin water constraints
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS irrigation_records (
    irrigation_id          BIGSERIAL PRIMARY KEY,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    agricultural_year      INTEGER NOT NULL,
    water_source_type      VARCHAR(64) NOT NULL, -- groundwater_well, dsi_canal, rainfed_none, pressurized_network
    irrigation_method      VARCHAR(32) NOT NULL CHECK (irrigation_method IN ('drip', 'sprinkler', 'furrow', 'rainfed')),
    application_efficiency NUMERIC(4, 2) NOT NULL CHECK (application_efficiency BETWEEN 0.30 AND 1.00),
    annual_budget_mm       NUMERIC(8, 2) NOT NULL CHECK (annual_budget_mm >= 0),
    budget_basis           VARCHAR(16) NOT NULL DEFAULT 'net' CHECK (budget_basis IN ('net', 'gross')),
    water_price_tl_m3      NUMERIC(8, 2) NOT NULL DEFAULT 1.00,
    is_water_restricted_basin BOOLEAN NOT NULL DEFAULT FALSE,
    verification_status    verification_status_enum NOT NULL,
    notes                  TEXT,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (field_id, agricultural_year)
);

-- -----------------------------------------------------------------------------
-- 16. climate_scenarios
-- Downscaled climate projections (NASA NEX-GDDP-CMIP6 SSP2-4.5 & SSP5-8.5)
-- Strictly used for conditional 3-year stress scenario simulation, never as short-term forecast.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS climate_scenarios (
    scenario_id            VARCHAR(96) PRIMARY KEY,
    source_id              VARCHAR(64) NOT NULL REFERENCES data_sources(source_id),
    dataset_version        VARCHAR(64) NOT NULL,
    ssp_pathway            VARCHAR(32) NOT NULL CHECK (ssp_pathway IN ('Historical_Baseline', 'SSP2-4.5', 'SSP5-8.5')),
    gcm_ensemble           VARCHAR(120) NOT NULL, -- e.g. 'CMIP6 Multi-Model Median (GFDL-ESM4, MRI-ESM2-0, EC-Earth3, MPI-ESM1-2-HR)'
    climate_zone           VARCHAR(32) NOT NULL CHECK (climate_zone IN ('south_lowland', 'north_lowland', 'highland')),
    horizon_period         VARCHAR(32) NOT NULL, -- e.g. '2026-2050 Near-Term'
    temp_delta_c           NUMERIC(5, 2) NOT NULL,
    precip_multiplier      NUMERIC(5, 3) NOT NULL,
    extreme_hot_days_delta NUMERIC(5, 1),
    drought_prob_increase  NUMERIC(5, 2),
    usage_constraint_note  TEXT NOT NULL DEFAULT 'Conditional climate stress scenario for multi-year rotation robustness testing; NOT a deterministic short-term weather forecast.',
    verification_status    verification_status_enum NOT NULL,
    source_url             TEXT NOT NULL,
    retrieved_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 17. model_inputs
-- Immutable, provenance-locked feature vectors assembled for the scientific engine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_inputs (
    model_input_id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    input_hash             VARCHAR(64) NOT NULL UNIQUE,
    readiness_score        NUMERIC(5, 2) NOT NULL,
    soil_origin_used       VARCHAR(32) NOT NULL, -- user_lab (prioritized) or soilgrids_v2
    climate_years_count    INTEGER NOT NULL,
    scenario_id            VARCHAR(96) REFERENCES climate_scenarios(scenario_id),
    verified_layers_json   JSONB NOT NULL,
    estimated_layers_json  JSONB NOT NULL,
    unavailable_layers_json JSONB NOT NULL,
    feature_payload_json   JSONB NOT NULL,
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 18. model_outputs
-- Auditable scientific simulation & multi-objective optimization results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS model_outputs (
    model_output_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_input_id         UUID NOT NULL REFERENCES model_inputs(model_input_id) ON DELETE CASCADE,
    field_id               VARCHAR(128) NOT NULL REFERENCES field_boundaries(field_id) ON DELETE CASCADE,
    engine_version         VARCHAR(32) NOT NULL DEFAULT 'v2.2-scientific',
    recommended_rotations  JSONB NOT NULL,
    water_balance_summary  JSONB NOT NULL,
    yield_distributions    JSONB NOT NULL,
    economic_distributions JSONB NOT NULL,
    soil_health_scores     JSONB NOT NULL,
    risk_scores            JSONB NOT NULL,
    confidence_grade       CHAR(1) NOT NULL CHECK (confidence_grade IN ('A', 'B', 'C', 'D')),
    confidence_score       NUMERIC(5, 2) NOT NULL,
    evidence_trace_json    JSONB NOT NULL,
    computed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_model_outputs_field ON model_outputs(field_id, computed_at DESC);
