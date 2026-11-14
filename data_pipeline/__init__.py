"""
AgroShift AI — Agricultural Scientific Data Infrastructure (Python Pipeline)
===========================================================================
Modular data ingestion, geospatial normalization, schema validation,
quality scoring, and FAO-56 / AquaCrop harmonization pipeline.

Core Principle:
NO FAKE DATA. NO FABRICATED RESULTS. NO UNVERIFIED SCIENTIFIC CLAIMS.
"""

from .models import (
    VerificationStatus,
    ProvenanceMeta,
    DailyWeatherRecord,
    SoilLayerRecord,
    VegetationIndexRecord,
    AquaCropParameterSet,
    FieldBoundaryRecord,
)
from .validators import (
    validate_power_daily_record,
    validate_soil_layer,
    validate_ndvi_observation,
    validate_geojson_geometry,
    compute_wgs84_area_m2,
)
from .harmonizer import (
    harmonize_snapshot_file,
    compute_fao56_et0_daily,
    prioritize_soil_layers,
    build_model_readiness_summary,
)

__all__ = [
    "VerificationStatus",
    "ProvenanceMeta",
    "DailyWeatherRecord",
    "SoilLayerRecord",
    "VegetationIndexRecord",
    "AquaCropParameterSet",
    "FieldBoundaryRecord",
    "validate_power_daily_record",
    "validate_soil_layer",
    "validate_ndvi_observation",
    "validate_geojson_geometry",
    "compute_wgs84_area_m2",
    "harmonize_snapshot_file",
    "compute_fao56_et0_daily",
    "prioritize_soil_layers",
    "build_model_readiness_summary",
]
