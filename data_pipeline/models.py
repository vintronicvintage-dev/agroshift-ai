"""
Strongly-typed domain and persistence models for the AgroShift AI
Scientific Data Infrastructure.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Tuple
import hashlib
import json


class VerificationStatus(str, Enum):
    VERIFIED = "Verified"
    ESTIMATED = "Estimated"
    UNAVAILABLE = "Unavailable"


@dataclass(frozen=True)
class ProvenanceMeta:
    source_id: str
    dataset_version: str
    observation_timestamp: str
    retrieval_timestamp: str
    latitude: float
    longitude: float
    spatial_resolution_m: float
    units: Dict[str, str]
    quality_flag: str
    verification_status: VerificationStatus
    source_url: str
    uncertainty_notes: Optional[str] = None

    def idempotency_key(self, record_type: str, extra_key: str = "") -> str:
        raw = f"{record_type}:{self.source_id}:{self.dataset_version}:{self.latitude:.5f}:{self.longitude:.5f}:{self.observation_timestamp}:{extra_key}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class DailyWeatherRecord:
    field_id: str
    date: str
    t2m_mean_c: Optional[float]
    t2m_max_c: Optional[float]
    t2m_min_c: Optional[float]
    prectotcorr_mm: Optional[float]
    rh2m_pct: Optional[float]
    ws2m_ms: Optional[float]
    allsky_sfc_sw_dwn_mj: Optional[float]
    gwet_root: Optional[float]
    gwet_top: Optional[float]
    et0_fao56_mm: Optional[float]
    provenance: ProvenanceMeta


@dataclass(frozen=True)
class SoilLayerRecord:
    field_id: str
    data_origin: str  # 'user_lab' | 'soilgrids_v2' | 'regional_default'
    priority_rank: int  # 1 = user_lab, 2 = soilgrids_v2, 3 = regional_default
    depth_top_cm: int
    depth_bottom_cm: int
    sand_pct: Optional[float]
    silt_pct: Optional[float]
    clay_pct: Optional[float]
    soc_g_kg: Optional[float]
    ph_h2o: Optional[float]
    cec_cmol_kg: Optional[float]
    nitrogen_g_kg: Optional[float]
    bdod_g_cm3: Optional[float]
    cfvo_vol_pct: Optional[float]
    theta_fc_m3m3: Optional[float]
    theta_wp_m3m3: Optional[float]
    provenance: ProvenanceMeta


@dataclass(frozen=True)
class VegetationIndexRecord:
    field_id: str
    composite_date: str
    ndvi: Optional[float]
    evi: Optional[float]
    pixel_reliability_rank: int
    passed_quality_filter: bool
    agronomic_caveat: str
    provenance: ProvenanceMeta


@dataclass(frozen=True)
class AquaCropParameterSet:
    crop_id: str
    name_tr: str
    name_en: str
    photosynthetic_pathway: str  # 'C3' | 'C4' | 'NONE'
    kc_ini: float
    kc_mid: float
    kc_end: float
    root_depth_max_m: float
    depletion_fraction_p: float
    yield_response_ky: float
    wp_star_gm2: float
    hi0_pct: float
    cgc_pct_day: float
    cdc_pct_day: float
    verification_status: VerificationStatus
    citations: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class FieldBoundaryRecord:
    field_id: str
    field_name: str
    geometry_type: str  # 'Polygon' | 'MultiPolygon'
    crs_epsg: int
    area_m2: float
    area_da: float
    area_ha: float
    centroid_lat: float
    centroid_lon: float
    bbox: Tuple[float, float, float, float]
    is_valid: bool
    validation_notes: List[str] = field(default_factory=list)

    def to_json(self) -> str:
        return json.dumps(self.__dict__, ensure_ascii=False)
