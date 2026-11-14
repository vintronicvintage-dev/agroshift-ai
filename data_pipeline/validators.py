"""
Scientific validation, missing-value detection, physical plausibility bounds,
and WGS84 equal-area geospatial calculation routines.
"""

from __future__ import annotations
import math
from typing import Any, Dict, List, Optional, Tuple
from .models import FieldBoundaryRecord

POWER_SENTINELS = {-999, -999.0, -99, -99.0, -9999, -9999.0}
MODIS_NDVI_FILL = -3000

# WGS84 ellipsoid constants
WGS84_A = 6378137.0
WGS84_F = 1.0 / 298.257223563
WGS84_E2 = WGS84_F * (2.0 - WGS84_F)
R_AUTHALIC = 6371007.1809


def clean_power_sentinel(val: Any) -> Optional[float]:
    if val is None or isinstance(val, bool):
        return None
    try:
        f = float(val)
    except (ValueError, TypeError):
        return None
    if not math.isfinite(f) or f <= -998.5 or f in POWER_SENTINELS:
        return None
    return f


def validate_power_daily_record(raw: Dict[str, Any]) -> Tuple[bool, Dict[str, Optional[float]], List[str]]:
    """
    Validates a daily meteorological record from NASA POWER.
    Checks sentinel values (-999/-99), physical plausibility bounds, and Tmin <= Tmean <= Tmax.
    """
    issues: List[str] = []
    tmax = clean_power_sentinel(raw.get("tmax"))
    tmin = clean_power_sentinel(raw.get("tmin"))
    tmean = clean_power_sentinel(raw.get("tmean"))
    precip = clean_power_sentinel(raw.get("precip"))
    rh = clean_power_sentinel(raw.get("rh"))
    wind2m = clean_power_sentinel(raw.get("wind2m"))
    rs = clean_power_sentinel(raw.get("rs"))
    gwet_root = clean_power_sentinel(raw.get("gwetRoot"))
    gwet_top = clean_power_sentinel(raw.get("gwetTop"))

    if tmax is not None and not (-55.0 <= tmax <= 60.0):
        issues.append(f"tmax {tmax} C out of physical bounds [-55, 60]")
        tmax = None
    if tmin is not None and not (-60.0 <= tmin <= 50.0):
        issues.append(f"tmin {tmin} C out of physical bounds [-60, 50]")
        tmin = None
    if tmean is not None and not (-58.0 <= tmean <= 55.0):
        issues.append(f"tmean {tmean} C out of physical bounds [-58, 55]")
        tmean = None
    if tmax is not None and tmin is not None and tmin > tmax + 0.5:
        issues.append(f"tmin ({tmin}) > tmax ({tmax})")
    if precip is not None and not (0.0 <= precip <= 600.0):
        issues.append(f"precip {precip} mm/day out of physical bounds [0, 600]")
        precip = None
    if rh is not None and not (0.0 <= rh <= 100.5):
        issues.append(f"rh {rh} % out of physical bounds [0, 100]")
        rh = None
    elif rh is not None:
        rh = min(100.0, max(0.0, rh))
    if wind2m is not None and not (0.0 <= wind2m <= 75.0):
        issues.append(f"wind2m {wind2m} m/s out of physical bounds [0, 75]")
        wind2m = None
    if rs is not None and not (0.0 <= rs <= 45.0):
        issues.append(f"rs {rs} MJ/m2/day out of physical bounds [0, 45]")
        rs = None
    if gwet_root is not None and not (0.0 <= gwet_root <= 1.0):
        issues.append(f"gwetRoot {gwet_root} out of bounds [0, 1]")
        gwet_root = None
    if gwet_top is not None and not (0.0 <= gwet_top <= 1.0):
        issues.append(f"gwetTop {gwet_top} out of bounds [0, 1]")
        gwet_top = None

    cleaned = {
        "tmax": tmax,
        "tmin": tmin,
        "tmean": tmean,
        "precip": precip,
        "rh": rh,
        "wind2m": wind2m,
        "rs": rs,
        "gwetRoot": gwet_root,
        "gwetTop": gwet_top,
    }
    is_valid = len(issues) == 0 and any(v is not None for v in cleaned.values())
    return is_valid, cleaned, issues


def validate_soil_layer(layer: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validates a depth-specific soil horizon (ISRIC SoilGrids v2.0 or laboratory test).
    Verifies texture closure (sand + silt + clay ~ 100%), pH range, bulk density, and water retention order.
    """
    issues: List[str] = []
    top = layer.get("top")
    bottom = layer.get("bottom")
    if not isinstance(top, (int, float)) or not isinstance(bottom, (int, float)) or bottom <= top:
        issues.append(f"Invalid soil depth interval: {top}-{bottom} cm")

    sand = layer.get("sand")
    silt = layer.get("silt")
    clay = layer.get("clay")
    if all(isinstance(x, (int, float)) for x in (sand, silt, clay)):
        total = float(sand) + float(silt) + float(clay)
        if not (94.0 <= total <= 106.0):
            issues.append(f"Texture sum sand+silt+clay = {total:.1f}% outside [94%, 106%]")
    else:
        issues.append("Incomplete texture fractions (sand, silt, clay required)")

    ph = layer.get("ph")
    if ph is not None and not (3.2 <= float(ph) <= 10.5):
        issues.append(f"Soil pH {ph} out of plausible range [3.2, 10.5]")

    bd = layer.get("bulkDensity")
    if bd is not None and not (0.6 <= float(bd) <= 2.2):
        issues.append(f"Bulk density {bd} g/cm3 out of plausible range [0.6, 2.2]")

    fc = layer.get("thetaFC")
    wp = layer.get("thetaWP")
    if fc is not None and wp is not None:
        if float(fc) <= float(wp):
            issues.append(f"Field capacity thetaFC ({fc}) must exceed wilting point thetaWP ({wp})")

    return len(issues) == 0, issues


def validate_ndvi_observation(raw_scaled_or_float: float, reliability_rank: int) -> Tuple[Optional[float], str]:
    """
    Applies MODIS MOD13Q1 v061 quality control filtering.
    Reliability rank 0 (good) and 1 (marginal) pass; 2 (snow/ice), 3 (cloudy), -1 (fill) are rejected.
    """
    if reliability_rank not in (0, 1):
        return None, f"rejected_quality_rank_{reliability_rank}"
    val = float(raw_scaled_or_float)
    if abs(val) > 2.0:
        # Raw integer scaled by 10000
        if val <= -2000 or val > 10000:
            return None, "rejected_fill_or_range"
        val = round(val * 0.0001, 4)
    if not (-0.2 <= val <= 1.0):
        return None, "rejected_out_of_bounds"
    return val, "good" if reliability_rank == 0 else "marginal"


def _authalic_lat(lat_deg: float) -> float:
    phi = math.radians(lat_deg)
    e = math.sqrt(WGS84_E2)

    def q(p: float) -> float:
        s = math.sin(p)
        return (1.0 - WGS84_E2) * (
            s / (1.0 - WGS84_E2 * s * s) - (1.0 / (2.0 * e)) * math.log((1.0 - e * s) / (1.0 + e * s))
        )

    ratio = max(-1.0, min(1.0, q(phi) / q(math.pi / 2.0)))
    return math.asin(ratio)


def compute_wgs84_area_m2(ring: List[Tuple[float, float]]) -> float:
    """
    Computes ellipsoidal equal-area polygon surface area (m^2) on WGS84 for a ring of (lon, lat) tuples.
    """
    pts = list(ring)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    n = len(pts)
    if n < 3:
        return 0.0
    lats = [_authalic_lat(p[1]) for p in pts]
    total = 0.0
    for i in range(n):
        j = (i + 1) % n
        dlon = math.radians(pts[j][0] - pts[i][0])
        if dlon > math.pi:
            dlon -= 2.0 * math.pi
        elif dlon < -math.pi:
            dlon += 2.0 * math.pi
        total += dlon * (2.0 + math.sin(lats[i]) + math.sin(lats[j]))
    return abs(total * R_AUTHALIC * R_AUTHALIC / 2.0)


def validate_geojson_geometry(field_id: str, field_name: str, geojson: Dict[str, Any]) -> FieldBoundaryRecord:
    """
    Validates GeoJSON Polygon or MultiPolygon in WGS84 (EPSG:4326) and calculates equal-area metrics.
    """
    geom = geojson.get("geometry") if geojson.get("type") == "Feature" else geojson
    if not isinstance(geom, dict):
        raise ValueError("Invalid GeoJSON object")
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype not in ("Polygon", "MultiPolygon") or not isinstance(coords, list):
        raise ValueError(f"Unsupported geometry type: {gtype}. Expected Polygon or MultiPolygon.")

    polygons = [coords] if gtype == "Polygon" else coords
    notes: List[str] = []
    total_area_m2 = 0.0
    all_lons: List[float] = []
    all_lats: List[float] = []

    for poly_idx, poly in enumerate(polygons):
        if not poly or not isinstance(poly[0], list):
            raise ValueError(f"Polygon part {poly_idx} has no outer ring")
        outer_raw = poly[0]
        ring: List[Tuple[float, float]] = []
        for pt in outer_raw:
            if not isinstance(pt, (list, tuple)) or len(pt) < 2:
                raise ValueError("Coordinate must be [lon, lat]")
            lon, lat = float(pt[0]), float(pt[1])
            if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
                raise ValueError(f"Coordinate ({lon}, {lat}) outside WGS84 bounds")
            ring.append((lon, lat))
            all_lons.append(lon)
            all_lats.append(lat)
        if len(ring) > 1 and ring[0] == ring[-1]:
            ring.pop()
        if len(ring) < 3:
            raise ValueError("Polygon ring requires at least 3 distinct vertices")
        part_area = compute_wgs84_area_m2(ring)
        total_area_m2 += part_area

    area_da = round(total_area_m2 / 1000.0, 3)
    area_ha = round(total_area_m2 / 10000.0, 4)
    min_lon, max_lon = min(all_lons), max(all_lons)
    min_lat, max_lat = min(all_lats), max(all_lats)
    c_lon = round((min_lon + max_lon) / 2.0, 6)
    c_lat = round((min_lat + max_lat) / 2.0, 6)

    if area_ha < 0.1:
        notes.append(f"Area {area_ha} ha is below recommended 0.1 ha minimum")
    if gtype == "MultiPolygon":
        notes.append(f"MultiPolygon with {len(polygons)} disjunct parts normalized to EPSG:4326")

    return FieldBoundaryRecord(
        field_id=field_id,
        field_name=field_name,
        geometry_type=gtype,
        crs_epsg=4326,
        area_m2=round(total_area_m2, 1),
        area_da=area_da,
        area_ha=area_ha,
        centroid_lat=c_lat,
        centroid_lon=c_lon,
        bbox=(round(min_lon, 6), round(min_lat, 6), round(max_lon, 6), round(max_lat, 6)),
        is_valid=area_ha >= 0.1,
        validation_notes=notes,
    )
