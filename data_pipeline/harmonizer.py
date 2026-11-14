"""
Harmonization, FAO-56 Penman-Monteith ET0 computation, laboratory-over-SoilGrids
priority resolution, and snapshot ingestion for AgroShift AI.
"""

from __future__ import annotations
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional
from .models import SoilLayerRecord
from .validators import validate_power_daily_record, validate_soil_layer, validate_ndvi_observation


def compute_fao56_et0_daily(
    tmean_c: float,
    tmax_c: float,
    tmin_c: float,
    rh_pct: float,
    wind2m_ms: float,
    rs_mj_m2_day: float,
    elevation_m: float,
    lat_deg: float,
    day_of_year: int,
) -> float:
    """
    FAO-56 Penman-Monteith reference evapotranspiration ET0 (mm/day), Allen et al. (1998) Eq. 6.
    """
    p_kpa = 101.3 * (((293.0 - 0.0065 * elevation_m) / 293.0) ** 5.26)
    gamma = 0.000665 * p_kpa

    es_tmax = 0.6108 * math.exp((17.27 * tmax_c) / (tmax_c + 237.3))
    es_tmin = 0.6108 * math.exp((17.27 * tmin_c) / (tmin_c + 237.3))
    es = (es_tmax + es_tmin) / 2.0
    ea = es * max(0.0, min(100.0, rh_pct)) / 100.0

    t_mean = (tmax_c + tmin_c) / 2.0
    delta = (4098.0 * (0.6108 * math.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

    dr = 1.0 + 0.033 * math.cos((2.0 * math.pi / 365.0) * day_of_year)
    delta_sol = 0.409 * math.sin((2.0 * math.pi / 365.0) * day_of_year - 1.39)
    phi = math.radians(lat_deg)
    ws = math.acos(max(-1.0, min(1.0, -math.tan(phi) * math.tan(delta_sol))))
    ra = (
        (24.0 * 60.0 / math.pi)
        * 0.0820
        * dr
        * (ws * math.sin(phi) * math.sin(delta_sol) + math.cos(phi) * math.cos(delta_sol) * math.sin(ws))
    )
    rso = (0.75 + 2e-5 * elevation_m) * ra
    rns = (1.0 - 0.23) * rs_mj_m2_day
    sigma = 4.903e-9
    tmax_k4 = (tmax_c + 273.16) ** 4
    tmin_k4 = (tmin_c + 273.16) ** 4
    rel_cloud = min(1.0, max(0.25, rs_mj_m2_day / rso)) if rso > 0 else 0.7
    rnl = sigma * ((tmax_k4 + tmin_k4) / 2.0) * (0.34 - 0.14 * math.sqrt(max(0.0, ea))) * (1.35 * rel_cloud - 0.35)
    rn = rns - rnl

    num = 0.408 * delta * rn + gamma * (900.0 / (tmean_c + 273.0)) * wind2m_ms * max(0.0, es - ea)
    den = delta + gamma * (1.0 + 0.34 * wind2m_ms)
    return max(0.0, round(num / den, 3))


def prioritize_soil_layers(
    soilgrids_layers: List[SoilLayerRecord],
    user_lab_layers: Optional[List[SoilLayerRecord]] = None,
) -> Tuple[List[SoilLayerRecord], str]:
    """
    Implements the scientific priority rule:
    If verified user laboratory soil analyses ('user_lab', priority_rank=1) exist for a depth,
    they override ISRIC SoilGrids v2.0 ('soilgrids_v2', priority_rank=2) predictions without
    overwriting or deleting the underlying SoilGrids records in storage.
    """
    if not user_lab_layers:
        return sorted(soilgrids_layers, key=lambda x: x.depth_top_cm), "soilgrids_v2"

    by_interval = {(l.depth_top_cm, l.depth_bottom_cm): l for l in soilgrids_layers}
    for lab in user_lab_layers:
        by_interval[(lab.depth_top_cm, lab.depth_bottom_cm)] = lab

    merged = sorted(by_interval.values(), key=lambda x: x.depth_top_cm)
    return merged, "user_lab_override"


def harmonize_snapshot_file(snapshot_path: Path) -> Dict[str, Any]:
    """
    Loads one of AgroShift AI's verified pilot snapshot JSON files, expands and validates
    its meteorological, soil, and MODIS NDVI series, and produces a quality & readiness summary.
    """
    raw = json.loads(snapshot_path.read_text(encoding="utf-8"))
    field_id = raw["id"]
    climate = raw.get("climate") or {}
    cols = climate.get("cols") or {}
    scales = climate.get("scales") or {}
    n_days = len(cols.get("tmax", []))

    valid_days = 0
    missing_precip_days = 0
    for i in range(min(n_days, 365)):  # Validate first 365 days rapidly + total count check
        rec = {
            k: (None if cols[k][i] is None else cols[k][i] / scales[k])
            for k in ("tmax", "tmin", "tmean", "rh", "wind2m", "rs", "precip", "gwetRoot", "gwetTop")
            if k in cols
        }
        ok, cleaned, _ = validate_power_daily_record(rec)
        if ok:
            valid_days += 1
        if cleaned.get("precip") is None:
            missing_precip_days += 1

    soil_layers = raw.get("soilLayers") or []
    valid_soil_layers = 0
    for sl in soil_layers:
        ok, _ = validate_soil_layer(sl)
        if ok:
            valid_soil_layers += 1

    ndvi_block = raw.get("ndvi") or {}
    ndvi_vals = ndvi_block.get("v") or []
    ndvi_scale = ndvi_block.get("scale", 10000)
    valid_ndvi = 0
    for v in ndvi_vals:
        val, _ = validate_ndvi_observation(v / ndvi_scale, 0)
        if val is not None:
            valid_ndvi += 1

    return {
        "field_id": field_id,
        "lat": raw["lat"],
        "lon": raw["lon"],
        "elevation_m": raw["elevation"],
        "total_climate_days": n_days,
        "sampled_valid_days": valid_days,
        "soil_layers_count": len(soil_layers),
        "valid_soil_layers": valid_soil_layers,
        "wrb_group": raw.get("wrb"),
        "ndvi_composites_count": len(ndvi_vals),
        "valid_ndvi_composites": valid_ndvi,
        "has_era5_precip_crosscheck": raw.get("precipCheck") is not None,
    }


def build_model_readiness_summary(harmonized: Dict[str, Any]) -> Dict[str, Any]:
    """
    Evaluates whether a field has sufficient verified/estimated scientific inputs
    to run the FAO-56 daily water balance, yield response, and 3-year rotation optimizer.
    """
    has_climate = harmonized.get("total_climate_days", 0) >= 3650
    has_soil = harmonized.get("valid_soil_layers", 0) >= 3
    has_ndvi = harmonized.get("valid_ndvi_composites", 0) >= 20
    has_precip_check = bool(harmonized.get("has_era5_precip_crosscheck"))

    score = (
        (45.0 if has_climate else 0.0)
        + (25.0 if has_soil else 10.0)
        + (15.0 if has_ndvi else 0.0)
        + (15.0 if has_precip_check else 5.0)
    )
    return {
        "field_id": harmonized["field_id"],
        "ready_for_simulation": has_climate and has_soil,
        "readiness_score": round(score, 1),
        "verified_components": [
            k
            for k, cond in [
                ("nasa_power_daily_10yr_plus", has_climate),
                ("modis_mod13q1_ndvi", has_ndvi),
                ("era5_precipitation_crosscheck", has_precip_check),
            ]
            if cond
        ],
        "estimated_components": ["isric_soilgrids_v2_6layer", "smap_rootzone_wetness_proxy", "nex_gddp_cmip6_stress_scenarios"],
        "unavailable_components": ["gpm_imerg_live_opendap_without_earthdata_token"],
    }
