"""
Connectors and source definitions for NASA POWER, GPM IMERG, SMAP, MODIS,
NEX-GDDP-CMIP6, ISRIC SoilGrids, FAO AquaCrop, and Turkish Agricultural Sources.
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, List
from .models import VerificationStatus


@dataclass(frozen=True)
class SourceSpecification:
    source_id: str
    name: str
    organization: str
    official_url: str
    api_docs_url: str
    spatial_resolution: str
    spatial_resolution_m: float
    temporal_resolution: str
    auth_required: bool
    default_status: VerificationStatus
    variables: List[str]


SCIENTIFIC_SOURCES: Dict[str, SourceSpecification] = {
    "nasa_power_daily": SourceSpecification(
        source_id="nasa_power_daily",
        name="NASA POWER Daily Agroclimatology API",
        organization="NASA Langley Research Center (LaRC)",
        official_url="https://power.larc.nasa.gov/",
        api_docs_url="https://power.larc.nasa.gov/docs/services/api/temporal/daily/",
        spatial_resolution="0.5 deg x 0.625 deg (MERRA-2) / 1.0 deg (CERES)",
        spatial_resolution_m=50000.0,
        temporal_resolution="Daily (2001-present)",
        auth_required=False,
        default_status=VerificationStatus.VERIFIED,
        variables=["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "GWETROOT", "GWETTOP"],
    ),
    "nasa_gpm_imerg": SourceSpecification(
        source_id="nasa_gpm_imerg",
        name="NASA GPM IMERG V07B Final / Late Precipitation",
        organization="NASA Goddard Earth Sciences Data and Information Services Center (GES DISC)",
        official_url="https://gpm.nasa.gov/data/imerg",
        api_docs_url="https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary",
        spatial_resolution="0.1 deg x 0.1 deg (~10 km)",
        spatial_resolution_m=10000.0,
        temporal_resolution="30-minute / Daily / Monthly (V07B)",
        auth_required=True,
        default_status=VerificationStatus.UNAVAILABLE,  # Requires Earthdata OPeNDAP token; ERA5 cross-check active
        variables=["precipitation", "randomError", "precipitationQualityIndex"],
    ),
    "nasa_smap_l4": SourceSpecification(
        source_id="nasa_smap_l4",
        name="NASA SMAP L4 Global 9 km Surface and Root-Zone Soil Moisture (SPL4SMGP v007)",
        organization="NASA JPL / NSIDC DAAC",
        official_url="https://smap.jpl.nasa.gov/",
        api_docs_url="https://nsidc.org/data/spl4smgp/versions/7",
        spatial_resolution="9 km EASE-Grid 2.0 (L4) / 36 km (L3 Radiometer)",
        spatial_resolution_m=9000.0,
        temporal_resolution="3-hourly / Daily",
        auth_required=True,
        default_status=VerificationStatus.ESTIMATED,
        variables=["sm_surface (0-5 cm)", "sm_rootzone (0-100 cm)", "sm_profile_wetness"],
    ),
    "nasa_modis_mod13q1": SourceSpecification(
        source_id="nasa_modis_mod13q1",
        name="NASA MODIS Terra MOD13Q1 v061 Vegetation Indices",
        organization="NASA LP DAAC / ORNL DAAC Global Subsets REST API",
        official_url="https://modis.gsfc.nasa.gov/",
        api_docs_url="https://modis.ornl.gov/data/modis_webservice.html",
        spatial_resolution="250 m Sinusoidal Grid",
        spatial_resolution_m=250.0,
        temporal_resolution="16-day composite",
        auth_required=False,
        default_status=VerificationStatus.VERIFIED,
        variables=["250m_16_days_NDVI", "250m_16_days_EVI", "250m_16_days_pixel_reliability", "250m_16_days_VI_Quality"],
    ),
    "nasa_nex_gddp_cmip6": SourceSpecification(
        source_id="nasa_nex_gddp_cmip6",
        name="NASA NEX-GDDP-CMIP6 Global Daily Downscaled Climate Projections",
        organization="NASA Center for Climate Simulation (NCCS) / Ames Research Center",
        official_url="https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
        api_docs_url="https://registry.opendata.aws/nex-gddp-cmip6/",
        spatial_resolution="0.25 deg x 0.25 deg (~25 km)",
        spatial_resolution_m=25000.0,
        temporal_resolution="Daily (1950-2100, SSP2-4.5 & SSP5-8.5)",
        auth_required=False,
        default_status=VerificationStatus.ESTIMATED,
        variables=["tas", "tasmax", "tasmin", "pr", "hurs", "sfcWind", "rsds"],
    ),
    "isric_soilgrids_v2": SourceSpecification(
        source_id="isric_soilgrids_v2",
        name="ISRIC SoilGrids v2.0 Global 250 m Soil Information",
        organization="ISRIC — World Soil Information",
        official_url="https://soilgrids.org/",
        api_docs_url="https://rest.isric.org/soilgrids/v2.0/docs",
        spatial_resolution="250 m",
        spatial_resolution_m=250.0,
        temporal_resolution="Static baseline (v2.0, Poggio et al. 2021)",
        auth_required=False,
        default_status=VerificationStatus.ESTIMATED,
        variables=["phh2o", "soc", "nitrogen", "sand", "silt", "clay", "bdod", "cec", "cfvo", "wv0033", "wv1500"],
    ),
    "fao_56_aquacrop": SourceSpecification(
        source_id="fao_56_aquacrop",
        name="FAO-56 Penman-Monteith & FAO AquaCrop v7.1 Crop Parameter Database",
        organization="Food and Agriculture Organization of the United Nations (FAO)",
        official_url="https://www.fao.org/aquacrop/",
        api_docs_url="https://www.fao.org/land-water/databases-and-software/aquacrop/en/",
        spatial_resolution="Agro-climatic zone / cultivar level",
        spatial_resolution_m=0.0,
        temporal_resolution="Seasonal / Phenological stage",
        auth_required=False,
        default_status=VerificationStatus.VERIFIED,
        variables=["Kc_ini", "Kc_mid", "Kc_end", "Zr_max", "p", "Ky", "WP_star", "HI0", "CGC", "CDC"],
    ),
    "tuik_mgm_tarim": SourceSpecification(
        source_id="tuik_mgm_tarim",
        name="TÜİK Bitkisel Üretim İstatistikleri, Tarım Bakanlığı/TMO & MGM 1991-2020 İklim Normalleri",
        organization="TÜİK / T.C. Tarım ve Orman Bakanlığı / MGM",
        official_url="https://data.tuik.gov.tr/",
        api_docs_url="https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx",
        spatial_resolution="Provincial / Basin / Station level",
        spatial_resolution_m=15000.0,
        temporal_resolution="Annual / Monthly Normals (1991-2020 & 2024-2026)",
        auth_required=False,
        default_status=VerificationStatus.VERIFIED,
        variables=["crop_yield_kg_da", "national_production_t", "tmo_reference_price_tl", "mgm_normal_precip_mm", "mgm_normal_temp_c"],
    ),
}
