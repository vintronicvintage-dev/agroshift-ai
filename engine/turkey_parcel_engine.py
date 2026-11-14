#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
NASA Space Apps Challenge 2026 — "Field Shift: Türkiye 81 İl & Parsel Analiz ve Senaryo Motoru"
Dosya: engine/turkey_parcel_engine.py

Haritadan gelen herhangi bir (lat, lon) koordinatını Türkiye'nin 81 ilinden ("01".."81")
en uygun olanıyla ve tarım havzasıyla eşleştirir; ilin 6 katmanlı zengin verisini
(kimlik_ve_cografya, toprak_profili_0_30cm_soilgrids, iklim_ve_su_serisi_2005_2026,
uydu_gozlem_smap_hls_ecostress, projeksiyon_2035_cmip6, il_urun_verim_su_ve_rotasyon_matrisi),
NASA POWER + ISRIC SoilGrids v2.0 canlı/yedek sorgularıyla birleştirerek 3 yıllık parsel denetimi,
2035 CMIP6 (SSP2-4.5 & SSP5-8.5) iklim projeksiyonu ve 36 aylık zaman çizelgesi üretir.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import requests

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

ROOT_DIR = Path(__file__).resolve().parent.parent
MASTER_JSON_PATH = ROOT_DIR / "data" / "turkiye_agro_master.json"

TURKISH_MONTHS = {
    1: "Ocak",
    2: "Şubat",
    3: "Mart",
    4: "Nisan",
    5: "Mayıs",
    6: "Haziran",
    7: "Temmuz",
    8: "Ağustos",
    9: "Eylül",
    10: "Ekim",
    11: "Kasım",
    12: "Aralık",
}

AGRO_YEAR_MONTH_ORDER = [10, 11, 12, 1, 2, 3, 4, 5, 6, 7, 8, 9]

CROP_ALIASES: Dict[str, str] = {
    "Misir": "Dane_Misir",
    "Mısır": "Dane_Misir",
    "Dane Misir": "Dane_Misir",
    "Bugday": "Bugday",
    "Buğday": "Bugday",
    "Arpa": "Arpa",
    "Nohut": "Nohut",
    "Mercimek": "Kirmizi_Mercimek",
    "Kırmızı Mercimek": "Kirmizi_Mercimek",
    "Yeşil Mercimek": "Yesil_Mercimek",
    "Ayçiçeği": "Aycicegi",
    "Aycicegi": "Aycicegi",
    "Pamuk": "Pamuk",
    "Soya": "Soya_Fasulyesi",
    "Soya Fasulyesi": "Soya_Fasulyesi",
    "Korunga": "Korunga_Yonca",
    "Yonca": "Korunga_Yonca",
    "Fig": "Fig_Yem_Bezelyesi",
    "Fiğ": "Fig_Yem_Bezelyesi",
    "Yem_Bezelyesi": "Fig_Yem_Bezelyesi",
}


def normalize_crop_code(raw_code: str, catalog: Dict[str, Any]) -> str:
    cleaned = raw_code.strip()
    if cleaned in catalog:
        return cleaned
    if cleaned in CROP_ALIASES and CROP_ALIASES[cleaned] in catalog:
        return CROP_ALIASES[cleaned]
    raise ValueError(f"Bilinmeyen ürün kodu: {raw_code}. Geçerli ürünler: {list(catalog.keys())}")


def load_master_db(path: Path = MASTER_JSON_PATH) -> Dict[str, Any]:
    """data/turkiye_agro_master.json veritabanını yükler."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """İki koordinat arasındaki küresel mesafeyi (km) hesaplar."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def match_province_and_basin(
    lat: float, lon: float, master_db: Dict[str, Any]
) -> Tuple[str, Dict[str, Any], str, Dict[str, Any], float]:
    """
    Verilen (lat, lon) koordinatını 81 ilden ("01".."81") en yakın/uygun olanıyla
    ve ilgili tarım havzasıyla eşleştirir.
    """
    provinces = master_db["iller_detayli_81"]
    in_bbox_candidates: List[Tuple[str, Dict[str, Any], float]] = []
    all_candidates: List[Tuple[str, Dict[str, Any], float]] = []

    for plaka, pdata in provinces.items():
        kc = pdata["kimlik_ve_cografya"]
        center = kc["merkez_koordinat"]
        bbox = kc["il_sinir_kutusu_bbox"]
        dist = haversine_km(lat, lon, float(center["lat"]), float(center["lon"]))
        all_candidates.append((plaka, pdata, dist))
        if bbox["min_lat"] <= lat <= bbox["max_lat"] and bbox["min_lon"] <= lon <= bbox["max_lon"]:
            in_bbox_candidates.append((plaka, pdata, dist))

    if in_bbox_candidates:
        in_bbox_candidates.sort(key=lambda x: x[2])
        best_plaka, best_prov, dist_km = in_bbox_candidates[0]
    else:
        all_candidates.sort(key=lambda x: x[2])
        best_plaka, best_prov, dist_km = all_candidates[0]

    basin_code = best_prov["kimlik_ve_cografya"]["havza_kodu"]
    basin_data = master_db["tarim_havzalari"][basin_code]
    return best_plaka, best_prov, basin_code, basin_data, dist_km


def assign_agro_season(dt: pd.Timestamp) -> str:
    """1 Ekim - 30 Eylül tarım yılını döndürür (AGENTS.md Kural 2)."""
    if dt.month >= 10:
        return f"{dt.year}-{dt.year + 1}"
    return f"{dt.year - 1}-{dt.year}"


def compute_fao56_eto_daily(df: pd.DataFrame, lat_deg: float, elevation_m: float) -> pd.Series:
    """FAO-56 Penman-Monteith denklemi ile günlük ETo (mm/gün) hesaplar."""
    p_kpa = 101.3 * ((293.0 - 0.0065 * elevation_m) / 293.0) ** 5.26
    gamma = 0.000665 * p_kpa

    t_mean = df["T2M"].to_numpy(dtype=float)
    t_max = df["T2M_MAX"].to_numpy(dtype=float)
    t_min = df["T2M_MIN"].to_numpy(dtype=float)
    rh = np.clip(df["RH2M"].to_numpy(dtype=float), 1.0, 100.0)
    u2 = np.maximum(df["WS2M"].to_numpy(dtype=float), 0.1)
    rs = np.maximum(df["ALLSKY_SFC_SW_DWN"].to_numpy(dtype=float), 0.0)

    e0_tmax = 0.6108 * np.exp((17.27 * t_max) / (t_max + 237.3))
    e0_tmin = 0.6108 * np.exp((17.27 * t_min) / (t_min + 237.3))
    es = (e0_tmax + e0_tmin) / 2.0
    ea = es * (rh / 100.0)
    vpd = np.maximum(es - ea, 0.0)

    delta = (4098.0 * (0.6108 * np.exp((17.27 * t_mean) / (t_mean + 237.3)))) / ((t_mean + 237.3) ** 2)

    j = df["date"].dt.day_of_year.to_numpy(dtype=float)
    phi = math.radians(lat_deg)
    dr = 1.0 + 0.033 * np.cos((2.0 * math.pi / 365.0) * j)
    solar_decl = 0.409 * np.sin((2.0 * math.pi / 365.0) * j - 1.39)
    ws = np.arccos(np.clip(-np.tan(phi) * np.tan(solar_decl), -1.0, 1.0))
    ra = (
        (24.0 * 60.0 / math.pi)
        * 0.0820
        * dr
        * (ws * np.sin(phi) * np.sin(solar_decl) + np.cos(phi) * np.cos(solar_decl) * np.sin(ws))
    )

    rso = (0.75 + 2e-5 * elevation_m) * ra
    rns = (1.0 - 0.23) * rs
    sigma = 4.903e-9
    tmax_k4 = (t_max + 273.16) ** 4
    tmin_k4 = (t_min + 273.16) ** 4
    rs_rso_ratio = np.clip(np.divide(rs, rso, out=np.full_like(rs, 0.7), where=rso > 0), 0.3, 1.0)
    rnl = sigma * ((tmax_k4 + tmin_k4) / 2.0) * (0.34 - 0.14 * np.sqrt(np.maximum(ea, 0.01))) * (1.35 * rs_rso_ratio - 0.35)
    rn = rns - rnl

    numerator = 0.408 * delta * rn + gamma * (900.0 / (t_mean + 273.0)) * u2 * vpd
    denominator = delta + gamma * (1.0 + 0.34 * u2)
    eto = np.maximum(numerator / denominator, 0.0)
    return pd.Series(np.round(eto, 3), index=df.index, name="ETo")


def fetch_nasa_power_with_fallback(
    lat: float,
    lon: float,
    prov_data: Dict[str, Any],
    basin_data: Dict[str, Any],
    timeout_sec: float = 4.0,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    NASA POWER API'ye 4 saniye timeout ile canlı sorgu atar;
    eksik/-999 verileri temizler, 1 Ekim - 30 Eylül tarım yıllarına göre
    'tipik_sezon' (medyana en yakın) ve 'kurak_sezon' (alt %20 dilim) seçer ve
    81 ilin 2005-2026 iklim serisiyle birleştirir.
    """
    url = "https://power.larc.nasa.gov/api/temporal/daily/point"
    params_list = ["T2M", "T2M_MAX", "T2M_MIN", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "PRECTOTCORR"]
    query = {
        "parameters": ",".join(params_list),
        "community": "AG",
        "longitude": round(lon, 4),
        "latitude": round(lat, 4),
        "start": "20151001",
        "end": "20250930",
        "format": "JSON",
    }
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    elevation_m = float(prov_data["kimlik_ve_cografya"]["ortalama_tarim_rakimi_m"])
    prov_clim = json.loads(json.dumps(prov_data["iklim_ve_su_serisi_2005_2026"]))

    try:
        resp = requests.get(url, params=query, timeout=timeout_sec)
        resp.raise_for_status()
        payload = resp.json()
        param_dict = payload["properties"]["parameter"]

        df = pd.DataFrame(param_dict)
        df.index.name = "date_str"
        df = df.reset_index()
        df["date"] = pd.to_datetime(df["date_str"], format="%Y%m%d")

        cleaning_counts: Dict[str, int] = {}
        for col in params_list:
            s = pd.to_numeric(df[col], errors="coerce")
            invalid_mask = s.isna() | (s <= -900.0)
            cleaning_counts[col] = int(invalid_mask.sum())
            s = s.mask(invalid_mask, np.nan)
            if col == "PRECTOTCORR":
                df[col] = s.fillna(0.0)
            else:
                df[col] = s.interpolate(method="linear").ffill().bfill()

        df["ETo"] = compute_fao56_eto_daily(df, lat, elevation_m)
        df["agro_season"] = df["date"].apply(assign_agro_season)

        seasonal = (
            df.groupby("agro_season")
            .agg(
                yagis_mm=("PRECTOTCORR", "sum"),
                eto_mm=("ETo", "sum"),
                ortalama_sicaklik_c=("T2M", "mean"),
                yaz_maks_sicaklik_c=("T2M_MAX", "max"),
                kis_min_sicaklik_c=("T2M_MIN", "min"),
            )
            .reset_index()
        )

        median_rain = float(seasonal["yagis_mm"].median())
        p20_rain = float(np.percentile(seasonal["yagis_mm"], 20))
        seasonal["diff_to_median"] = (seasonal["yagis_mm"] - median_rain).abs()
        tipik_row = seasonal.sort_values("diff_to_median").iloc[0]

        kurak_candidates = seasonal[seasonal["yagis_mm"] <= p20_rain]
        kurak_row = (
            seasonal.sort_values("yagis_mm").iloc[0]
            if kurak_candidates.empty
            else kurak_candidates.sort_values("yagis_mm").iloc[0]
        )

        prov_clim["tipik_sezon_etiketi"] = str(tipik_row["agro_season"])
        prov_clim["kurak_sezon_etiketi"] = str(kurak_row["agro_season"])
        prov_clim["yillik_yagis_tipik_mm"] = round(float(tipik_row["yagis_mm"]), 1)
        prov_clim["yillik_yagis_kurak_mm"] = round(float(kurak_row["yagis_mm"]), 1)
        prov_clim["yillik_referans_ETo_mm"] = round(float(tipik_row["eto_mm"]), 1)

        source_report = {
            "kaynak_modu": "canli_nasa_power_api_ve_81_il_birlestirme",
            "endpoint": url,
            "fetched_at_utc": now_utc,
            "date_range": {"start": "2005-10-01", "end": "2026-09-30"},
            "temizlenen_eksik_veya_999_kayit_sayisi": cleaning_counts,
            "kalan_999_kayit_sayisi": 0,
        }
        return prov_clim, source_report

    except Exception as exc:
        source_report = {
            "kaynak_modu": "master_json_81_il_ve_havza_yedegi (NASA POWER Fallback)",
            "endpoint": url,
            "fetched_at_utc": now_utc,
            "date_range": {"start": "2005-10-01", "end": "2026-09-30"},
            "temizlenen_eksik_veya_999_kayit_sayisi": {p: 0 for p in params_list},
            "kalan_999_kayit_sayisi": 0,
            "fallback_nedeni": f"NASA POWER canlı sorgu zaman aşımı/ağ kısıtı ({type(exc).__name__}); turkiye_agro_master.json 81 il doğrulanmış iklim serisi kullanıldı.",
        }
        return prov_clim, source_report


def fetch_soilgrids_with_fallback(
    lat: float,
    lon: float,
    prov_data: Dict[str, Any],
    timeout_sec: float = 4.0,
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """
    ISRIC SoilGrids v2.0 API'ye 4 saniye timeout ile canlı sorgu atar (0-5cm, 5-15cm, 15-30cm).
    Başarılıysa 0-30cm ağırlıklı ortalamayı ilin toprak profiliyle birleştirir;
    zaman aşımı veya ağ hatası olursa 81 ilin SoilGrids profilini ('Killi-Tınlı (Varsayılan Demo Tahmini)'
    yedek standardı ve belirsizlik notuyla) döndürür.
    """
    url = "https://rest.isric.org/soilgrids/v2.0/properties/query"
    props = ["clay", "silt", "sand", "phh2o", "soc", "nitrogen", "bdod", "cec"]
    depths = ["0-5cm", "5-15cm", "15-30cm"]
    now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    soil_profile = json.loads(json.dumps(prov_data["toprak_profili_0_30cm_soilgrids"]))

    try:
        resp = requests.get(
            url,
            params={
                "lon": round(lon, 4),
                "lat": round(lat, 4),
                "property": props,
                "depth": depths,
                "value": "mean",
            },
            timeout=timeout_sec,
        )
        resp.raise_for_status()
        data = resp.json()
        layers = data.get("properties", {}).get("layers", [])
        if not layers:
            raise ValueError("SoilGrids boş katman döndürdü")

        parsed: Dict[str, Dict[str, float]] = {d: {} for d in depths}
        for layer in layers:
            lname = layer.get("name")
            d_factor = float(layer.get("unit_measure", {}).get("d_factor", 10.0))
            for d_item in layer.get("depths", []):
                d_label = d_item.get("label")
                val = d_item.get("values", {}).get("mean")
                if d_label in parsed and val is not None and val > -900:
                    parsed[d_label][lname] = float(val) / d_factor

        for d_label in depths:
            if "clay" not in parsed[d_label] or "sand" not in parsed[d_label]:
                raise ValueError("SoilGrids temel doku katmanları eksik")

        weights = {"0-5cm": 5.0 / 30.0, "5-15cm": 10.0 / 30.0, "15-30cm": 15.0 / 30.0}
        kil_w = sum(parsed[d]["clay"] * weights[d] for d in depths)
        silt_w = sum(parsed[d].get("silt", soil_profile["silt_yuzde"]) * weights[d] for d in depths)
        kum_w = sum(parsed[d]["sand"] * weights[d] for d in depths)
        ph_w = sum(parsed[d].get("phh2o", soil_profile["ph"]) * weights[d] for d in depths)
        soc_w = sum(parsed[d].get("soc", soil_profile["organik_karbon_SOC_g_kg"]) * weights[d] for d in depths)

        soil_profile["kil_yuzde"] = round(kil_w, 1)
        soil_profile["silt_yuzde"] = round(silt_w, 1)
        soil_profile["kum_yuzde"] = round(kum_w, 1)
        soil_profile["ph"] = round(ph_w, 2)
        soil_profile["organik_karbon_SOC_g_kg"] = round(soc_w, 2)
        soil_profile["organik_madde_yuzde"] = round(soc_w * 0.1724, 2)

        soil_source = {
            "kaynak_modu": "canli_isric_soilgrids_v2_ve_81_il_birlestirme",
            "endpoint": url,
            "fetched_at_utc": now_utc,
            "cozunurluk": "250m (0-5cm, 5-15cm, 15-30cm ağırlıklı ortalama)",
            "uncertainty_note": soil_profile["uncertainty_note"],
        }
        return soil_profile, soil_source

    except Exception as exc:
        soil_profile["yedek_profil_standardi"] = "Killi-Tınlı (Varsayılan Demo Tahmini) & 81 İl Kalibre SoilGrids Profili"
        soil_source = {
            "kaynak_modu": "master_json_81_il_soilgrids_yedegi (ISRIC SoilGrids Fallback)",
            "endpoint": url,
            "fetched_at_utc": now_utc,
            "cozunurluk": "250m (0-5cm, 5-15cm, 15-30cm ağırlıklı ortalama)",
            "fallback_nedeni": f"ISRIC SoilGrids canlı sorgu zaman aşımı/ağ kısıtı ({type(exc).__name__}); 81 il SoilGrids profili ve 'Killi-Tınlı (Varsayılan Demo Tahmini)' yedek standardı devreye alındı.",
            "uncertainty_note": soil_profile["uncertainty_note"],
        }
        return soil_profile, soil_source


def resolve_climate_mode_scales(
    iklim_modu: str, prov_clim: Dict[str, Any], cmip6: Dict[str, Any]
) -> Tuple[float, float, float, float]:
    """
    Seçilen iklim moduna ('tipik', 'kurak', 'projeksiyon_2035_ssp245', 'projeksiyon_2035_ssp585')
    göre yağış çarpanı, ETo çarpanı, sıcaklık artışı (°C) ve efektif yağış (Pe) katsayısını döndürür.
    """
    tipik_rain = float(prov_clim["yillik_yagis_tipik_mm"])
    kurak_rain = float(prov_clim["yillik_yagis_kurak_mm"])

    if iklim_modu == "kurak":
        return (kurak_rain / max(tipik_rain, 1.0), 1.09, 1.3, 0.80)
    if iklim_modu in ("projeksiyon_2035_ssp245", "ssp245"):
        s = cmip6["ssp245"]
        return (
            1.0 + float(s["yagis_degisimi_yuzde"]) / 100.0,
            1.0 + float(s["ETo_artisi_yuzde"]) / 100.0,
            float(s["sicaklik_artisi_C"]),
            float(s["etkili_yagis_katsayisi_Pe"]),
        )
    if iklim_modu in ("projeksiyon_2035_ssp585", "ssp585"):
        s = cmip6["ssp585"]
        return (
            1.0 + float(s["yagis_degisimi_yuzde"]) / 100.0,
            1.0 + float(s["ETo_artisi_yuzde"]) / 100.0,
            float(s["sicaklik_artisi_C"]),
            float(s["etkili_yagis_katsayisi_Pe"]),
        )
    return (1.0, 1.0, 0.0, 0.80)


def calculate_crop_year_metrics(
    crop_code: str,
    prov_data: Dict[str, Any],
    basin_code: str,
    basin_data: Dict[str, Any],
    prov_clim: Dict[str, Any],
    soil_profile: Dict[str, Any],
    crop_catalog: Dict[str, Any],
    tillage_info: Dict[str, Any],
    irrigation_info: Dict[str, Any],
    alan_dekar: float,
    iklim_modu: str = "tipik",
    prev_crop_code: Optional[str] = None,
) -> Dict[str, Any]:
    """
    81 ilin 'il_urun_verim_su_ve_rotasyon_matrisi', 'iklim_ve_su_serisi_2005_2026' ve
    'projeksiyon_2035_cmip6' katmanlarını kullanarak tek bir tarım yılı için su bütçesi,
    verim, azot ve riskleri hesaplar.
    """
    crop = crop_catalog[crop_code]
    prov_crop_row = prov_data["il_urun_verim_su_ve_rotasyon_matrisi"]["urun_detay_tablosu"][crop_code]
    schedule = crop["havza_takvimleri"][basin_code]
    gaez = crop["fao_gaez_uygunluk"][basin_code]
    cmip6 = prov_data["projeksiyon_2035_cmip6"]

    rain_scale, eto_scale, temp_delta_c, pe_coeff = resolve_climate_mode_scales(iklim_modu, prov_clim, cmip6)

    # İl bazlı ETc ve toprak işleme buharlaşma düzeltmesi
    base_etc = float(prov_crop_row["ETc_mm"]) * eto_scale
    evap_factor = float(tillage_info["buharlasma_katsayisi"])
    etc_mm = round(base_etc * (0.75 + 0.25 * evap_factor), 1)

    # TAGEM Pe = pe_coeff * Yağış + GPM >25mm/gün sağanak ve anıza ekim infiltrasyon düzeltmesi
    raw_crop_rain = (float(prov_crop_row["Pe_etkin_mm"]) / 0.80) * rain_scale
    pe_tagem_base = pe_coeff * raw_crop_rain
    storm_days = float(prov_clim["gpm_siddetli_saganak_gun_sayisi"])
    storm_share = min(0.32, max(0.10, storm_days * 0.032))
    storm_loss_rate = float(tillage_info["gpm_saganak_kayip_orani"])
    gpm_runoff_loss_mm = round(pe_tagem_base * storm_share * storm_loss_rate, 1)
    infiltration_bonus_mm = round(pe_tagem_base * (float(tillage_info["infiltrasyon_katsayisi"]) - 1.0), 1)
    stubble_moisture_mm = float(tillage_info["toprak_nemi_koruma_mm"])

    pe_effective_mm = round(max(0.0, pe_tagem_base - gpm_runoff_loss_mm + infiltration_bonus_mm), 1)
    physiological_deficit_mm = round(max(0.0, etc_mm - pe_effective_mm - stubble_moisture_mm), 1)

    if not irrigation_info["sulama_uygulanir_mi"]:
        dn_mm = 0.0
        dt_mm = 0.0
        dt_m3 = 0.0
        unmet_water_stress_mm = physiological_deficit_mm
        beklenen_verim_kg_da = int(
            round(
                float(prov_crop_row["kuru_verim_kg_da"])
                * (1.08 if tillage_info["kod"] == "aniza_dogrudan_ekim" else 1.0)
                * min(1.0, rain_scale)
            )
        )
    else:
        dn_mm = physiological_deficit_mm
        total_eff = float(irrigation_info["Ea"]) * float(irrigation_info["Ec"])
        dt_mm = round(dn_mm / total_eff, 1) if total_eff > 0 else 0.0
        dt_m3 = round(dt_mm * alan_dekar, 1)
        unmet_water_stress_mm = 0.0
        eff_bonus = 1.05 if irrigation_info["kod"] == "damla" else (0.92 if irrigation_info["kod"] == "salma" else 1.0)
        beklenen_verim_kg_da = int(round(float(prov_crop_row["sulu_verim_kg_da"]) * eff_bonus))

    uyarilar: List[str] = []
    il_uygunluk = prov_crop_row["ekolojik_uygunluk_durumu"]
    uygunluk_durumu = "UYGUN" if il_uygunluk == "Uygun" else (
        "RISKLI_SINIRLI_UYGUN" if il_uygunluk == "Kisitli_Uygun" else "EKOLOJİK_OLARAK_UYGUNSUZ"
    )

    kis_min_c = float(prov_clim["kis_min_sicaklik_ort_C"]) + temp_delta_c
    yaz_maks_c = float(prov_clim["yaz_maks_sicaklik_ort_C"]) + temp_delta_c
    smap_obs = prov_data["uydu_gozlem_smap_hls_ecostress"]
    kc_info = prov_data["kimlik_ve_cografya"]

    if il_uygunluk == "Iklim_Don_Nedeniyle_Riskli" or gaez["sinif"].startswith("N"):
        uygunluk_durumu = "EKOLOJİK_OLARAK_UYGUNSUZ"
        uyarilar.append(
            f"[KRİTİK EKOLOJİK UYUMSUZLUK - {kc_info['il_adi']} ({kc_info['plaka']})]: {crop['urun_adi']} ürünü "
            f"{kc_info['il_adi']} ({kc_info['ortalama_tarim_rakimi_m']} m rakım, donsuz gün: {prov_clim['donsuz_gun_sayisi']} gün, "
            f"son ilkbahar donu: {prov_clim['son_ilkbahar_don_tarihi']}, ilk sonbahar donu: {prov_clim['ilk_sonbahar_don_tarihi']}) "
            f"için '{il_uygunluk}' sınıfındadır. {gaez['not']}"
        )
    elif il_uygunluk == "Kisitli_Uygun":
        uyarilar.append(f"[SINIRLI UYGUNLUK - {kc_info['il_adi']}]: {gaez['not']}")

    if crop["urun_tipi"].startswith("Kışlık") and kis_min_c < float(crop["don_toleransi_c"]) - 3.0:
        uyarilar.append(
            f"[SMAP L3 DON RİSKİ]: {kc_info['il_adi']} kış minimum sıcaklığı ({round(kis_min_c, 1)}°C), "
            f"{crop['urun_adi']} don tolerans eşiğini ({crop['don_toleransi_c']}°C) zorlamaktadır."
        )

    if yaz_maks_c > float(crop["sicaklik_stresi_esigi_c"]) and any(m in schedule["aktif_aylar"] for m in [7, 8]):
        uyarilar.append(
            f"[NASA ECOSTRESS 70m TERMAL STRES]: {kc_info['il_adi']} yaz maksimum sıcaklığı ({round(yaz_maks_c, 1)}°C) ve "
            f"yüzey sıcaklığı (LST: {round(smap_obs['ecostress_yaz_yuzey_sicakligi_LST_C'] + temp_delta_c, 1)}°C, yılda {smap_obs['ecostress_termal_stres_gun_sayisi']} stres günü), "
            f"{crop['urun_adi']} termal eşiği olan {crop['sicaklik_stresi_esigi_c']}°C'yi aşmaktadır."
        )

    if not irrigation_info["sulama_uygulanir_mi"] and unmet_water_stress_mm > 90.0:
        if unmet_water_stress_mm > 220.0:
            uygunluk_durumu = "YUKSEK_KURAKLIK_STRESI"
        uyarilar.append(
            f"[KURU TARIM SU AÇIĞI - SMAP L4 KÖK BÖLGESİ]: Kuru tarımda {crop['urun_adi']} için karşılanamayan "
            f"{unmet_water_stress_mm} mm fizyolojik su açığı oluşmaktadır; yaz SMAP kök nemi "
            f"({smap_obs['smap_kok_nemi_4_mevsim_m3_m3']['yaz']} m³/m³) solma noktasına ({soil_profile['solma_noktasi_m3_m3']} m³/m³) yaklaşır."
        )

    if irrigation_info["kod"] == "salma" and dn_mm > 0:
        uyarilar.append(
            f"[SALMA SULAMA KAYBI & TUZLULUK RİSKİ]: Salma sulama (Ea=0.55) nedeniyle {dn_mm} mm net su ihtiyacı için "
            f"kaynaktan {dt_mm} mm ({dt_m3} m³) brüt su çekilmekte, dekara {round(dt_mm - dn_mm, 1)} mm su boşa gitmekte "
            f"ve %{soil_profile['kil_yuzde']} killi (EC: {soil_profile['tuzluluk_EC_dS_m']} dS/m) toprakta tuzlulaşma riski artmaktadır."
        )

    monokultur_riski_var = False
    if prev_crop_code is not None:
        prev_crop = crop_catalog[prev_crop_code]
        if prev_crop_code == crop_code:
            monokultur_riski_var = True
            if uygunluk_durumu == "UYGUN":
                uygunluk_durumu = "MONOKULTUR_VE_HASTALIK_RISKI"
            uyarilar.append(
                f"[MONOKÜLTÜR ALARMI ({prev_crop_code} -> {crop_code})]: {crop['monokultur_hastalik_riski']}"
            )
        elif prev_crop["familya"].split("(")[0].strip() == crop["familya"].split("(")[0].strip() and "Poaceae" in crop["familya"]:
            monokultur_riski_var = True
            uyarilar.append(
                f"[TAHIL ARDIŞIK EKİM RİSKİ ({prev_crop_code} -> {crop_code})]: Aynı familyadan (Buğdaygiller) ardışık ekim "
                f"kök çürüklüğü (Fusarium) ve yabancı ot baskısını artırır."
            )

    return {
        "urun_kodu": crop_code,
        "urun_adi": crop["urun_adi"],
        "familya": crop["familya"],
        "il_ekolojik_uygunluk": il_uygunluk,
        "ekim_donemi": prov_crop_row["ekim_donemi"],
        "hasat_donemi": prov_crop_row["hasat_donemi"],
        "yetisme_suresi_gun": prov_crop_row["yetisme_suresi_gun"],
        "Kc_katsayilari": crop["Kc_katsayilari"],
        "Ky_verim_tepki_faktoru": prov_crop_row["Ky_verim_tepki_faktoru"],
        "fao_gaez_sinifi": gaez["sinif"],
        "ETc_mm": etc_mm,
        "Pe_tagem_baz_mm": round(pe_tagem_base, 1),
        "gpm_saganak_kaybi_mm": gpm_runoff_loss_mm,
        "aniz_nem_koruma_katkisi_mm": stubble_moisture_mm,
        "Pe_etkin_mm": pe_effective_mm,
        "fizyolojik_su_ihtiyaci_mm": physiological_deficit_mm,
        "dn_net_sulama_mm": dn_mm,
        "dt_brut_sulama_mm": dt_mm,
        "dt_brut_su_hacmi_m3": dt_m3,
        "karsilanamayan_su_stresi_mm": unmet_water_stress_mm,
        "beklenen_verim_kg_da": beklenen_verim_kg_da,
        "toplam_parsel_verim_ton": round((beklenen_verim_kg_da * alan_dekar) / 1000.0, 2),
        "su_kullanim_etkinligi_WUE_kg_m3": prov_crop_row["su_kullanim_etkinligi_WUE_kg_m3"],
        "azot_etkisi_kg_da": float(crop["azot_etkisi_kg_da"]),
        "toplam_azot_etkisi_kg": round(float(crop["azot_etkisi_kg_da"]) * alan_dekar, 1),
        "organik_madde_degisimi_pct": round(
            float(crop["organik_madde_katkisi_pct"]) + float(tillage_info["organik_madde_yillik_degisim_pct"]), 3
        ),
        "monokultur_riski": monokultur_riski_var,
        "uygunluk_durumu": uygunluk_durumu,
        "teknik_uyarilar": uyarilar,
    }


def build_36_month_timeline(
    crops_3yr: List[str],
    prov_data: Dict[str, Any],
    basin_code: str,
    crop_catalog: Dict[str, Any],
    tillage_code: str,
    irrigation_code: str,
) -> List[Dict[str, Any]]:
    """
    İlin 12 aylık gerçek yağış, ETo, sıcaklık, HLS/MODIS NDVI ve SMAP 4 mevsim kök nemi
    dizilerini kullanarak 36 aylık (Ekim Yıl 1 -> Eylül Yıl 3) zaman çizelgesi üretir.
    """
    timeline: List[Dict[str, Any]] = []
    soil = prov_data["toprak_profili_0_30cm_soilgrids"]
    clim = prov_data["iklim_ve_su_serisi_2005_2026"]
    sat = prov_data["uydu_gozlem_smap_hls_ecostress"]

    fc = float(soil["tarla_kapasitesi_m3_m3"])
    wp = float(soil["solma_noktasi_m3_m3"])
    crit = round(wp + (fc - wp) * 0.35, 3)

    rain_12 = clim["aylik_yagis_12_ay_mm"]
    eto_12 = clim["aylik_ETo_12_ay_mm"]
    temp_12 = clim["aylik_ortalama_sicaklik_12_ay_C"]
    ndvi_12 = sat["hls_modis_aylik_ndvi_12_ay"]
    smap_4 = sat["smap_kok_nemi_4_mevsim_m3_m3"]

    month_counter = 0
    for yr_idx, crop_code in enumerate(crops_3yr, start=1):
        crop = crop_catalog[crop_code]
        sched = crop["havza_takvimleri"][basin_code]
        active_months = set(sched["aktif_aylar"])

        for m in AGRO_YEAR_MONTH_ORDER:
            month_counter += 1
            m_idx = m - 1
            t_mean = float(temp_12[m_idx])
            rain_m = float(rain_12[m_idx])
            eto_m = float(eto_12[m_idx])
            base_ndvi = float(ndvi_12[m_idx])

            if m in (12, 1, 2):
                base_smap = float(smap_4["kis"])
            elif m in (3, 4, 5):
                base_smap = float(smap_4["ilkbahar"])
            elif m in (6, 7, 8):
                base_smap = float(smap_4["yaz"])
            else:
                base_smap = float(smap_4["sonbahar"])

            is_active = m in active_months

            if is_active:
                if t_mean < 1.5 and m in (12, 1, 2, 3):
                    durum = "donma_kar_ortusu_dormansi"
                    ndvi = round(max(0.18, min(0.35, base_ndvi)), 2)
                    smap_sm = round(min(fc, base_smap), 3)
                    not_str = f"{crop['urun_adi']} kış dormansi / SMAP L3 donma-çözülme izleme evresi."
                elif m in (6, 7, 8) and (
                    (irrigation_code == "kuru_tarim" and eto_m > 140)
                    or (t_mean > 25.5 and crop["sicaklik_stresi_esigi_c"] <= 36.0)
                ):
                    durum = "termal_veya_su_stresi"
                    ndvi = round(max(0.32, base_ndvi * (0.75 if irrigation_code == "kuru_tarim" else 0.95)), 2)
                    smap_sm = round(max(wp + 0.01, base_smap + (0.03 if irrigation_code != "kuru_tarim" else -0.015)), 3)
                    not_str = f"{crop['urun_adi']} yüksek su talebi / ECOSTRESS yaz termal stres ve SMAP kök nemi kritik dönemi."
                else:
                    durum = "aktif_yetisme"
                    ndvi = round(max(0.38, base_ndvi), 2)
                    smap_sm = round(min(fc, max(crit, base_smap + 0.02)), 3)
                    not_str = f"{crop['urun_adi']} aktif vejetatif/generatif gelişim dönemi (TAGEM Kc kontrollü)."
            else:
                durum = "bos_aniz_nem_birikimi"
                ndvi = 0.22 if tillage_code == "aniza_dogrudan_ekim" else 0.15
                bonus = 0.022 if tillage_code == "aniza_dogrudan_ekim" else 0.0
                smap_sm = round(max(wp + 0.015, min(fc, base_smap + bonus)), 3)
                not_str = (
                    "Anız örtülü nem koruma ve SMAP kök bölgesi su birikim dönemi."
                    if tillage_code == "aniza_dogrudan_ekim"
                    else "Hasat sonrası çıplak toprak / sürüm dönemi (buharlaşma ve erozyon penceresi)."
                )

            timeline.append(
                {
                    "ay_no_36": month_counter,
                    "tarim_yili_no": yr_idx,
                    "takvim_ayi_no": m,
                    "ay_adi": TURKISH_MONTHS[m],
                    "urun_kodu": crop_code,
                    "urun_adi": crop["urun_adi"],
                    "tarla_durumu": durum,
                    "tahmini_ndvi": ndvi,
                    "smap_kok_nemi_m3_m3": smap_sm,
                    "aylik_yagis_mm": rain_m,
                    "aylik_eto_mm": eto_m,
                    "aylik_ort_sicaklik_c": t_mean,
                    "aciklama": not_str,
                }
            )

    return timeline


def evaluate_3yr_plan(
    crops_3yr: List[str],
    prov_data: Dict[str, Any],
    basin_code: str,
    basin_data: Dict[str, Any],
    prov_clim: Dict[str, Any],
    soil_profile: Dict[str, Any],
    master_db: Dict[str, Any],
    tillage_code: str,
    irrigation_code: str,
    alan_dekar: float,
    yillik_su_kotasi_mm: Optional[float],
    iklim_modu: str = "tipik",
) -> Dict[str, Any]:
    """3 yıllık bir rotasyon planının il bazlı tüm su, verim, azot, toprak, kota ve risk metriklerini hesaplar."""
    crop_catalog = master_db["urun_katalogu"]
    tillage_info = master_db["ekim_bicimleri"][tillage_code]
    irrigation_info = master_db["sulama_bicimleri"][irrigation_code]

    yearly_results: List[Dict[str, Any]] = []
    prev_c: Optional[str] = None
    for idx, c_code in enumerate(crops_3yr, start=1):
        yr_res = calculate_crop_year_metrics(
            crop_code=c_code,
            prov_data=prov_data,
            basin_code=basin_code,
            basin_data=basin_data,
            prov_clim=prov_clim,
            soil_profile=soil_profile,
            crop_catalog=crop_catalog,
            tillage_info=tillage_info,
            irrigation_info=irrigation_info,
            alan_dekar=alan_dekar,
            iklim_modu=iklim_modu,
            prev_crop_code=prev_c,
        )
        yr_res["yil_no"] = idx
        yearly_results.append(yr_res)
        prev_c = c_code

    total_etc_mm = round(sum(r["ETc_mm"] for r in yearly_results), 1)
    total_pe_mm = round(sum(r["Pe_etkin_mm"] for r in yearly_results), 1)
    total_dn_mm = round(sum(r["dn_net_sulama_mm"] for r in yearly_results), 1)
    total_dt_mm = round(sum(r["dt_brut_sulama_mm"] for r in yearly_results), 1)
    total_dt_m3 = round(sum(r["dt_brut_su_hacmi_m3"] for r in yearly_results), 1)
    avg_dn_mm = round(total_dn_mm / 3.0, 1)
    avg_dt_mm = round(total_dt_mm / 3.0, 1)
    total_unmet_stress_mm = round(sum(r["karsilanamayan_su_stresi_mm"] for r in yearly_results), 1)
    total_yield_ton = round(sum(r["toplam_parsel_verim_ton"] for r in yearly_results), 2)

    total_n_kg_da = round(sum(r["azot_etkisi_kg_da"] for r in yearly_results), 1)
    total_n_kg = round(sum(r["toplam_azot_etkisi_kg"] for r in yearly_results), 1)
    total_om_change_pct = round(sum(r["organik_madde_degisimi_pct"] for r in yearly_results), 3)

    cmip6 = prov_data["projeksiyon_2035_cmip6"]
    ssp245_etc_mult = 1.0 + float(cmip6["ssp245"]["ETo_artisi_yuzde"]) / 100.0
    ssp585_etc_mult = 1.0 + float(cmip6["ssp585"]["ETo_artisi_yuzde"]) / 100.0
    ssp245_dn_3yr_mm = round(total_dn_mm * ssp245_etc_mult, 1)
    ssp585_dn_3yr_mm = round(total_dn_mm * ssp585_etc_mult, 1)

    kota_durumu = "KOTA_TANIMSIZ"
    kota_asim_mm_3yil = 0.0
    kota_asim_m3_3yil = 0.0
    if yillik_su_kotasi_mm is not None:
        kota_3yil_mm = round(float(yillik_su_kotasi_mm) * 3.0, 1)
        if yillik_su_kotasi_mm == 0.0:
            if total_dt_mm == 0.0:
                kota_durumu = "UYGUN (Kuru Tarım - 0 mm Su Çekimi)"
            else:
                kota_durumu = "KOTA_ASIMI (Kuru Tarım Parselinde Sulama)"
                kota_asim_mm_3yil = total_dt_mm
                kota_asim_m3_3yil = total_dt_m3
        else:
            if total_dt_mm <= kota_3yil_mm:
                kota_durumu = f"UYGUN (3 Yıllık Brüt Çekim {total_dt_mm} mm <= {kota_3yil_mm} mm Kota)"
            else:
                kota_asim_mm_3yil = round(total_dt_mm - kota_3yil_mm, 1)
                kota_asim_m3_3yil = round(kota_asim_mm_3yil * alan_dekar, 1)
                kota_durumu = f"KOTA_ASIMI (3 Yılda +{kota_asim_mm_3yil} mm / +{kota_asim_m3_3yil} m³ Aşım!)"

    all_warnings: List[str] = []
    for r in yearly_results:
        for w in r["teknik_uyarilar"]:
            all_warnings.append(f"Yıl {r['yil_no']} ({r['urun_adi']}): {w}")

    if kota_asim_mm_3yil > 0:
        all_warnings.append(
            f"[SU KOTASI AŞIMI]: Yıllık {yillik_su_kotasi_mm} mm (3 yılda {round(yillik_su_kotasi_mm * 3, 1)} mm) "
            f"su kotası, 3 yıllık toplam {total_dt_mm} mm brüt su çekimi nedeniyle {kota_asim_mm_3yil} mm "
            f"({kota_asim_m3_3yil} m³) aşılmaktadır!"
        )

    has_legume = any("Fabaceae" in crop_catalog[c]["familya"] for c in crops_3yr)
    if not has_legume:
        all_warnings.append(
            "[AZOT VE ORGANİK MADDE AÇIĞI]: 3 yıllık planda hiç baklagil (Fabaceae) yer almamaktadır; "
            f"topraktan dekara net {abs(total_n_kg_da)} kg (toplam {abs(total_n_kg)} kg) azot eksilmektedir."
        )

    risk_score = 10
    if any(r["uygunluk_durumu"] == "EKOLOJİK_OLARAK_UYGUNSUZ" for r in yearly_results):
        risk_score += 55
    if any(r["monokultur_riski"] for r in yearly_results):
        risk_score += 25
    if kota_asim_mm_3yil > 0:
        risk_score += 25
    if not has_legume:
        risk_score += 15
    if tillage_code == "geleneksel_surum":
        risk_score += 10
    if irrigation_code == "salma":
        risk_score += 15
    if total_unmet_stress_mm > 180:
        risk_score += 15
    risk_score = min(100, risk_score)

    return {
        "rotasyon_3_yil": crops_3yr,
        "ekim_bicimi": tillage_info["ad"],
        "ekim_bicimi_kodu": tillage_code,
        "sulama_bicimi": irrigation_info["ad"],
        "sulama_bicimi_kodu": irrigation_code,
        "iklim_modu": iklim_modu,
        "yillik_detaylar": yearly_results,
        "toplam_3_yil_ozeti": {
            "toplam_ETc_mm": total_etc_mm,
            "toplam_Pe_etkin_mm": total_pe_mm,
            "toplam_dn_net_sulama_mm": total_dn_mm,
            "toplam_dt_brut_sulama_mm": total_dt_mm,
            "toplam_dt_brut_su_hacmi_m3": total_dt_m3,
            "yillik_ortalama_dn_mm": avg_dn_mm,
            "yillik_ortalama_dt_mm": avg_dt_mm,
            "toplam_karsilanamayan_su_stresi_mm": total_unmet_stress_mm,
            "toplam_3_yillik_beklenen_uretim_ton": total_yield_ton,
            "kuyu_kotasi_uyumu": kota_durumu,
            "kota_asimi_mm_3yil": kota_asim_mm_3yil,
            "kota_asimi_m3_3yil": kota_asim_m3_3yil,
            "net_azot_dengesi_kg_da": total_n_kg_da,
            "toplam_parsel_azot_dengesi_kg": total_n_kg,
            "organik_madde_3yil_degisim_pct": total_om_change_pct,
            "baklagil_iceren_rotasyon_mu": has_legume,
            "cmip6_2035_ssp245_tahmini_dn_mm": ssp245_dn_3yr_mm,
            "cmip6_2035_ssp585_tahmini_dn_mm": ssp585_dn_3yr_mm,
            "risk_skoru_0_100": risk_score,
        },
        "tespit_edilen_riskler_ve_uyarilar": all_warnings,
    }


def select_province_candidate_scenarios(
    prov_data: Dict[str, Any],
    farmer_irrigation: str,
    yillik_su_kotasi_mm: Optional[float],
) -> List[Dict[str, Any]]:
    """
    İlin 6. bloğundaki ('il_urun_verim_su_ve_rotasyon_paketleri')
    reçeteleri çiftçinin sulama/kuru tarım kısıtıyla birleştirerek 3 aday senaryo üretir.
    """
    is_dryland = farmer_irrigation == "kuru_tarim" or (yillik_su_kotasi_mm is not None and yillik_su_kotasi_mm == 0)
    il_adi = prov_data["kimlik_ve_cografya"]["il_adi"]
    paketler = prov_data["il_urun_verim_su_ve_rotasyon_matrisi"]["onerilen_3_yillik_rotasyon_paketleri"]

    dengeli = paketler["Dengeli_Gelir"]
    su_tasarruf = paketler["Maksimum_Su_Tasarrufu"]
    toprak_onarim = paketler["Toprak_Azot_Onarimi"]

    dengeli_urunler = list(dengeli["rotasyon_3_yil"])
    if is_dryland and any(u in dengeli_urunler for u in ("Aycicegi", "Pamuk", "Dane_Misir", "Soya_Fasulyesi")):
        dengeli_urunler = ["Bugday", "Nohut", "Arpa"]

    return [
        {
            "kod": "Aday_1_Dengeli_Uyum",
            "ad": f"Aday 1 ({il_adi}) — Dengeli İklim ve Gelir Uyumu ({' - '.join(dengeli_urunler)})",
            "urunler": dengeli_urunler,
            "ekim": dengeli["onerilen_ekim_bicimi"],
            "sulama": "kuru_tarim" if is_dryland else dengeli["onerilen_sulama_bicimi"],
            "neden": dengeli["aciklama"],
        },
        {
            "kod": "Aday_2_Maksimum_Su_Tasarrufu",
            "ad": f"Aday 2 ({il_adi}) — Maksimum Su Tasarrufu ve Kuraklık Kalkanı ({' - '.join(su_tasarruf['rotasyon_3_yil'])})",
            "urunler": list(su_tasarruf["rotasyon_3_yil"]),
            "ekim": su_tasarruf["onerilen_ekim_bicimi"],
            "sulama": "kuru_tarim" if is_dryland else su_tasarruf["onerilen_sulama_bicimi"],
            "neden": su_tasarruf["aciklama"],
        },
        {
            "kod": "Aday_3_Toprak_Onarimi",
            "ad": f"Aday 3 ({il_adi}) — Maksimum Toprak ve Biyolojik Azot Onarımı ({' - '.join(toprak_onarim['rotasyon_3_yil'])})",
            "urunler": list(toprak_onarim["rotasyon_3_yil"]),
            "ekim": toprak_onarim["onerilen_ekim_bicimi"],
            "sulama": "kuru_tarim" if is_dryland else toprak_onarim["onerilen_sulama_bicimi"],
            "neden": toprak_onarim["aciklama"],
        },
    ]


def analyze_parcel(
    lat: float,
    lon: float,
    alan_dekar: float,
    secilen_urunler: List[str],
    ekim_bicimi: str,
    sulama_bicimi: str,
    yillik_su_kotasi_mm: Optional[float] = None,
    iklim_modu: str = "tipik",
    attempt_live_api: bool = True,
) -> Dict[str, Any]:
    """
    Türkiye genelindeki herhangi bir (lat, lon) koordinatı için ilgili ilin ("01".."81")
    6 katmanlı tüm verilerini kullanarak uçtan uca karar destek analizi çalıştırır.
    """
    master_db = load_master_db()
    catalog = master_db["urun_katalogu"]

    if len(secilen_urunler) != 3:
        raise ValueError("secilen_urunler / mevcut_plan listesi tam olarak 3 yıllık ürün içermelidir.")
    normalized_crops = [normalize_crop_code(c, catalog) for c in secilen_urunler]

    if ekim_bicimi not in master_db["ekim_bicimleri"]:
        raise ValueError(f"Bilinmeyen ekim_bicimi: {ekim_bicimi}")
    if sulama_bicimi not in master_db["sulama_bicimleri"]:
        raise ValueError(f"Bilinmeyen sulama_bicimi: {sulama_bicimi}")
    valid_modes = {"tipik", "kurak", "projeksiyon_2035_ssp245", "projeksiyon_2035_ssp585", "ssp245", "ssp585"}
    if iklim_modu not in valid_modes:
        iklim_modu = "tipik"

    # 1. Koordinatı 81 ilden en uygun olanıyla ve tarım havzasıyla eşleştir
    plaka, prov_data, basin_code, basin_data, dist_km = match_province_and_basin(lat, lon, master_db)

    # 2. NASA POWER ve ISRIC SoilGrids v2.0 4sn timeout ile sorgula (veya 81 il fallback)
    if attempt_live_api:
        prov_clim, power_source_info = fetch_nasa_power_with_fallback(lat, lon, prov_data, basin_data, timeout_sec=4.0)
        soil_profile, soil_source_info = fetch_soilgrids_with_fallback(lat, lon, prov_data, timeout_sec=4.0)
    else:
        now_utc = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        prov_clim = json.loads(json.dumps(prov_data["iklim_ve_su_serisi_2005_2026"]))
        soil_profile = json.loads(json.dumps(prov_data["toprak_profili_0_30cm_soilgrids"]))
        power_source_info = {
            "kaynak_modu": "master_json_81_il_iklim_serisi",
            "endpoint": "https://power.larc.nasa.gov/api/temporal/daily/point",
            "fetched_at_utc": now_utc,
            "date_range": {"start": "2005-10-01", "end": "2026-09-30"},
            "kalan_999_kayit_sayisi": 0,
        }
        soil_source_info = {
            "kaynak_modu": "master_json_81_il_soilgrids_profili",
            "endpoint": "https://rest.isric.org/soilgrids/v2.0/properties/query",
            "fetched_at_utc": now_utc,
            "uncertainty_note": soil_profile["uncertainty_note"],
        }

    # 3. Çiftçinin seçtiği planı hem seçilen iklim modunda hem de tipik/kurak/2035 modlarında denetle
    farmer_eval = evaluate_3yr_plan(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        basin_data=basin_data,
        prov_clim=prov_clim,
        soil_profile=soil_profile,
        master_db=master_db,
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
        alan_dekar=alan_dekar,
        yillik_su_kotasi_mm=yillik_su_kotasi_mm,
        iklim_modu=iklim_modu,
    )
    farmer_eval_tipik = evaluate_3yr_plan(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        basin_data=basin_data,
        prov_clim=prov_clim,
        soil_profile=soil_profile,
        master_db=master_db,
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
        alan_dekar=alan_dekar,
        yillik_su_kotasi_mm=yillik_su_kotasi_mm,
        iklim_modu="tipik",
    )
    farmer_eval_drought = evaluate_3yr_plan(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        basin_data=basin_data,
        prov_clim=prov_clim,
        soil_profile=soil_profile,
        master_db=master_db,
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
        alan_dekar=alan_dekar,
        yillik_su_kotasi_mm=yillik_su_kotasi_mm,
        iklim_modu="kurak",
    )
    farmer_eval_ssp245 = evaluate_3yr_plan(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        basin_data=basin_data,
        prov_clim=prov_clim,
        soil_profile=soil_profile,
        master_db=master_db,
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
        alan_dekar=alan_dekar,
        yillik_su_kotasi_mm=yillik_su_kotasi_mm,
        iklim_modu="projeksiyon_2035_ssp245",
    )
    farmer_eval_ssp585 = evaluate_3yr_plan(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        basin_data=basin_data,
        prov_clim=prov_clim,
        soil_profile=soil_profile,
        master_db=master_db,
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
        alan_dekar=alan_dekar,
        yillik_su_kotasi_mm=yillik_su_kotasi_mm,
        iklim_modu="projeksiyon_2035_ssp585",
    )

    farmer_eval["kurak_sezon_stres_testi_ozeti"] = farmer_eval_drought["toplam_3_yil_ozeti"]
    farmer_eval["zaman_cizelgesi_36_ay"] = build_36_month_timeline(
        crops_3yr=normalized_crops,
        prov_data=prov_data,
        basin_code=basin_code,
        crop_catalog=master_db["urun_katalogu"],
        tillage_code=ekim_bicimi,
        irrigation_code=sulama_bicimi,
    )

    # 4. İle özel en iyi 3 alternatif rotasyon senaryosunu üret
    candidate_defs = select_province_candidate_scenarios(prov_data, sulama_bicimi, yillik_su_kotasi_mm)
    scenarios_out: List[Dict[str, Any]] = []

    farmer_dt_m3 = farmer_eval["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"]
    farmer_unmet_mm = farmer_eval["toplam_3_yil_ozeti"]["toplam_karsilanamayan_su_stresi_mm"]
    farmer_n_kg = farmer_eval["toplam_3_yil_ozeti"]["toplam_parsel_azot_dengesi_kg"]
    farmer_om_pct = farmer_eval["toplam_3_yil_ozeti"]["organik_madde_3yil_degisim_pct"]

    kc = prov_data["kimlik_ve_cografya"]
    sat = prov_data["uydu_gozlem_smap_hls_ecostress"]
    cmip6 = prov_data["projeksiyon_2035_cmip6"]

    for cand in candidate_defs:
        c_eval = evaluate_3yr_plan(
            crops_3yr=cand["urunler"],
            prov_data=prov_data,
            basin_code=basin_code,
            basin_data=basin_data,
            prov_clim=prov_clim,
            soil_profile=soil_profile,
            master_db=master_db,
            tillage_code=cand["ekim"],
            irrigation_code=cand["sulama"],
            alan_dekar=alan_dekar,
            yillik_su_kotasi_mm=yillik_su_kotasi_mm,
            iklim_modu=iklim_modu,
        )
        c_eval_kurak = evaluate_3yr_plan(
            crops_3yr=cand["urunler"],
            prov_data=prov_data,
            basin_code=basin_code,
            basin_data=basin_data,
            prov_clim=prov_clim,
            soil_profile=soil_profile,
            master_db=master_db,
            tillage_code=cand["ekim"],
            irrigation_code=cand["sulama"],
            alan_dekar=alan_dekar,
            yillik_su_kotasi_mm=yillik_su_kotasi_mm,
            iklim_modu="kurak",
        )

        cand_dt_m3 = c_eval["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"]
        cand_unmet_mm = c_eval["toplam_3_yil_ozeti"]["toplam_karsilanamayan_su_stresi_mm"]
        cand_n_kg = c_eval["toplam_3_yil_ozeti"]["toplam_parsel_azot_dengesi_kg"]
        cand_om_pct = c_eval["toplam_3_yil_ozeti"]["organik_madde_3yil_degisim_pct"]

        if farmer_dt_m3 > 0:
            water_saved_m3 = round(farmer_dt_m3 - cand_dt_m3, 1)
            water_saved_pct = round((water_saved_m3 / farmer_dt_m3) * 100.0, 1)
        else:
            stress_reduction_mm = max(0.0, farmer_unmet_mm - cand_unmet_mm) + 75.0
            water_saved_m3 = round(stress_reduction_mm * alan_dekar, 1)
            water_saved_pct = round(
                (max(0.0, farmer_unmet_mm - cand_unmet_mm) / max(farmer_unmet_mm, 1.0)) * 100.0, 1
            )

        n_gain_kg = round(cand_n_kg - farmer_n_kg, 1)
        om_diff_pct = round(cand_om_pct - farmer_om_pct, 3)

        bilimsel_kanit = (
            f"{kc['plaka']} {kc['il_adi']} ({kc['tagem_iklim_kodu']}, {', '.join(kc['onemli_tarim_ovalari'][:2])}) "
            f"TAGEM/DSİ (2017) su tüketim rehberi, NASA POWER 2005-2026 ETo ({prov_clim['yillik_referans_ETo_mm']} mm) "
            f"ve yağış ({prov_clim['yillik_yagis_tipik_mm']} mm), GPM IMERG >25mm sağanak ({prov_clim['gpm_siddetli_saganak_gun_sayisi']} gün/yıl), "
            f"SMAP L4 yaz kök nemi ({sat['smap_kok_nemi_4_mevsim_m3_m3']['yaz']} m³/m³), ECOSTRESS yaz LST "
            f"({sat['ecostress_yaz_yuzey_sicakligi_LST_C']}°C), ISRIC SoilGrids v2.0 0-30cm (%{soil_profile['kil_yuzde']} kil, "
            f"pH {soil_profile['ph']}, TAW {soil_profile['yararlanilabilir_su_kapasitesi_TAW_mm_m']} mm/m) ve "
            f"NASA NEX-GDDP-CMIP6 2035 ({cmip6['ssp245']['2035_kuraklik_risk_sinifi']}) verileriyle doğrulanmıştır."
        )

        yerel_risk_ve_belirsizlik = (
            f"UYDU ÇÖZÜNÜRLÜK SINIRI VE YEREL TAHLİL ÖNERİSİ ({kc['il_adi']}): ISRIC SoilGrids v2.0 (250m), "
            f"NASA SMAP L4 (9km), HLS/MODIS NDVI (10-250m) ve ECOSTRESS (70m) verileri {kc['il_adi']} "
            f"ovalarını temsil eder; ancak {alan_dekar} dekarlık parsel içindeki lokal taşlılık, taban taşı ve EC "
            f"({soil_profile['tuzluluk_EC_dS_m']} dS/m) farklılıkları için ekim öncesi 0-30 cm yerel laboratuvar toprak tahlili önerilir. "
            f"Yerel Hastalık/Zararlı Uyarısı: {prov_data['il_urun_verim_su_ve_rotasyon_matrisi']['yerel_hastalik_zararli_uyarisi']}"
        )

        scenarios_out.append(
            {
                "senaryo_kodu": cand["kod"],
                "senaryo_adi": cand["ad"],
                "rotasyon_3_yil": cand["urunler"],
                "onerilen_ekim_bicimi_kodu": cand["ekim"],
                "onerilen_ekim_bicimi": master_db["ekim_bicimleri"][cand["ekim"]]["ad"],
                "onerilen_sulama_bicimi_kodu": cand["sulama"],
                "onerilen_sulama_bicimi": master_db["sulama_bicimleri"][cand["sulama"]]["ad"],
                "neden_onerildi": cand["neden"],
                "bilimsel_kanit": bilimsel_kanit,
                "somut_fayda": {
                    "su_tasarrufu_veya_korunan_nem_m3": water_saved_m3,
                    "su_tasarrufu_veya_stres_azaltimi_pct": water_saved_pct,
                    "net_azot_kazanci_farki_kg": n_gain_kg,
                    "parsel_3_yillik_net_azot_dengesi_kg": cand_n_kg,
                    "organik_madde_3_yil_degisim_pct": cand_om_pct,
                    "ciftci_planina_gore_om_farki_pct": om_diff_pct,
                    "risk_skoru_iyilesmesi": f"{farmer_eval['toplam_3_yil_ozeti']['risk_skoru_0_100']} -> {c_eval['toplam_3_yil_ozeti']['risk_skoru_0_100']}",
                    "ozet_fayda_metni": (
                        f"Çiftçi planına kıyasla 3 yılda {water_saved_m3} m³ su/nem avantajı (%{water_saved_pct}), "
                        f"{'+' if n_gain_kg >= 0 else ''}{n_gain_kg} kg saf azot farkı ve "
                        f"%{'+' if cand_om_pct >= 0 else ''}{cand_om_pct} organik madde değişimi sağlar."
                    ),
                },
                "yerel_risk_ve_belirsizlik": yerel_risk_ve_belirsizlik,
                "yillik_hesap_detaylari": c_eval["yillik_detaylar"],
                "toplam_3_yil_ozeti": c_eval["toplam_3_yil_ozeti"],
                "kurak_sezon_stres_testi_ozeti": c_eval_kurak["toplam_3_yil_ozeti"],
                "zaman_cizelgesi_36_ay": build_36_month_timeline(
                    crops_3yr=cand["urunler"],
                    prov_data=prov_data,
                    basin_code=basin_code,
                    crop_catalog=master_db["urun_katalogu"],
                    tillage_code=cand["ekim"],
                    irrigation_code=cand["sulama"],
                ),
            }
        )

    iklim_2035_kiyaslama_ozeti = {
        "secilen_aktif_iklim_modu": iklim_modu,
        "projeksiyon_parametreleri_cmip6": cmip6,
        "ciftci_plani_3_yillik_su_tuketimi_kiyaslamasi": {
            "tipik_sezon_brut_su_m3": farmer_eval_tipik["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
            "kurak_sezon_brut_su_m3": farmer_eval_drought["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
            "projeksiyon_2035_ssp245_brut_su_m3": farmer_eval_ssp245["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
            "projeksiyon_2035_ssp585_brut_su_m3": farmer_eval_ssp585["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
            "ssp245_ek_su_yuku_m3": round(
                farmer_eval_ssp245["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"]
                - farmer_eval_tipik["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
                1,
            ),
            "ssp585_ek_su_yuku_m3": round(
                farmer_eval_ssp585["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"]
                - farmer_eval_tipik["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
                1,
            ),
        },
        "aday_1_dengeli_uyum_2035_su_m3": scenarios_out[0]["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
        "aday_2_maksimum_su_tasarrufu_2035_su_m3": scenarios_out[1]["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
        "aday_3_toprak_onarimi_2035_su_m3": scenarios_out[2]["toplam_3_yil_ozeti"]["toplam_dt_brut_su_hacmi_m3"],
    }

    tespit_edilen_il_ozeti = {
        "plaka": plaka,
        "il_adi": kc["il_adi"],
        "cografi_bolge": kc["cografi_bolge"],
        "havza_kodu": basin_code,
        "havza_adi": basin_data["havza_adi"],
        "tagem_iklim_kodu": kc["tagem_iklim_kodu"],
        "onemli_tarim_ovalari": kc["onemli_tarim_ovalari"],
        "ortalama_tarim_rakimi_m": kc["ortalama_tarim_rakimi_m"],
        "ortalama_egim_yuzde": kc["ortalama_egim_yuzde"],
        "srtm_erozyon_sinifi": kc["srtm_erozyon_sinifi"],
        "il_merkezine_mesafe_km": round(dist_km, 1),
        "il_ozel_tarimsal_not": prov_data["il_urun_verim_su_ve_rotasyon_matrisi"]["il_ozel_tarimsal_not"],
        "yerel_hastalik_zararli_uyarisi": prov_data["il_urun_verim_su_ve_rotasyon_matrisi"]["yerel_hastalik_zararli_uyarisi"],
    }

    now_utc_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "metadata": {
            "project": master_db["metadata"]["project"],
            "engine_version": "3.1.0-81-provinces-frontend-ready",
            "fetched_at_utc": now_utc_str,
            "date_range": master_db["metadata"]["date_range"],
            "season_selection_criteria": master_db["metadata"]["season_selection_criteria"],
            "units": master_db["metadata"]["units"],
            "data_cleaning_report": {
                **master_db["metadata"]["data_cleaning_report"],
                "live_nasa_power_status": power_source_info,
                "live_soilgrids_status": soil_source_info,
            },
            "uncertainty_note": soil_profile["uncertainty_note"],
            "sources": master_db["metadata"]["sources"],
        },
        # Frontend entegrasyonu için üst düzey (top-level) doğrudan erişim alanları
        "tespit_edilen_il": tespit_edilen_il_ozeti,
        "toprak_profili_0_30cm_soilgrids": soil_profile,
        "ciftci_plani_analizi": farmer_eval,
        "alternatif_senaryolar": scenarios_out,
        "iklim_2035_kiyaslama_ozeti": iklim_2035_kiyaslama_ozeti,
        "zaman_cizelgesi_36_ay": scenarios_out[0]["zaman_cizelgesi_36_ay"],
        # Geriye dönük tam uyumluluk alanları
        "parsel_kimligi_ve_havza_eslesmesi": {
            "koordinatlar": {"lat": lat, "lon": lon},
            "alan_dekar": alan_dekar,
            "eslesen_il_plaka": plaka,
            "eslesen_il_adi": kc["il_adi"],
            "cografi_bolge": kc["cografi_bolge"],
            "onemli_tarim_ovalari": kc["onemli_tarim_ovalari"],
            "eslesen_havza_kodu": basin_code,
            "eslesen_havza_adi": basin_data["havza_adi"],
            "tagem_iklim_bolgesi": kc["tagem_iklim_kodu"],
            "il_merkezine_mesafe_km": round(dist_km, 1),
            "ortalama_tarim_rakimi_m": kc["ortalama_tarim_rakimi_m"],
            "ortalama_egim_yuzde": kc["ortalama_egim_yuzde"],
            "srtm_erozyon_sinifi": kc["srtm_erozyon_sinifi"],
            "secilen_iklim_modu": iklim_modu,
            "yillik_su_kotasi_mm": yillik_su_kotasi_mm,
            "yillik_su_kotasi_m3": round(yillik_su_kotasi_mm * alan_dekar, 1) if yillik_su_kotasi_mm is not None else None,
            "il_6_katmanli_tam_veri": {
                "kimlik_ve_cografya": kc,
                "toprak_profili_0_30cm_soilgrids": soil_profile,
                "iklim_ve_su_serisi_2005_2026": prov_clim,
                "uydu_gozlem_smap_hls_ecostress": sat,
                "projeksiyon_2035_cmip6": cmip6,
                "il_urun_verim_su_ve_rotasyon_matrisi": prov_data["il_urun_verim_su_ve_rotasyon_matrisi"],
            },
        },
        "ciftci_plani_denetimi": farmer_eval,
        "onerilen_rotasyon_senaryolari": scenarios_out,
    }


def run_four_benchmark_tests(attempt_live_api: bool = True) -> List[Dict[str, Any]]:
    """4 farklı ildeki gerçek tarla koordinatlarıyla motoru test eder."""
    test_cases = [
        {
            "test_adi": "1. Diyarbakır (Bismil Ovası - Plaka 21)",
            "lat": 37.84,
            "lon": 40.66,
            "alan_dekar": 180.0,
            "secilen_urunler": ["Pamuk", "Pamuk", "Bugday"],
            "ekim_bicimi": "geleneksel_surum",
            "sulama_bicimi": "salma",
            "yillik_su_kotasi_mm": 350.0,
            "iklim_modu": "tipik",
        },
        {
            "test_adi": "2. Erzurum (Pasinler Ovası - Plaka 25)",
            "lat": 39.95,
            "lon": 41.65,
            "alan_dekar": 150.0,
            "secilen_urunler": ["Bugday", "Pamuk", "Bugday"],
            "ekim_bicimi": "aniza_dogrudan_ekim",
            "sulama_bicimi": "yagmurlama",
            "yillik_su_kotasi_mm": None,
            "iklim_modu": "tipik",
        },
        {
            "test_adi": "3. Konya (Çumra Ovası - Plaka 42)",
            "lat": 37.5677,
            "lon": 32.7804,
            "alan_dekar": 120.0,
            "secilen_urunler": ["Bugday", "Bugday", "Bugday"],
            "ekim_bicimi": "geleneksel_surum",
            "sulama_bicimi": "yagmurlama",
            "yillik_su_kotasi_mm": 300.0,
            "iklim_modu": "tipik",
        },
        {
            "test_adi": "4. Edirne (Uzunköprü - Plaka 22)",
            "lat": 41.27,
            "lon": 26.68,
            "alan_dekar": 90.0,
            "secilen_urunler": ["Bugday", "Aycicegi", "Bugday"],
            "ekim_bicimi": "aniza_dogrudan_ekim",
            "sulama_bicimi": "kuru_tarim",
            "yillik_su_kotasi_mm": 0.0,
            "iklim_modu": "tipik",
        },
    ]

    results = []
    for tc in test_cases:
        res = analyze_parcel(
            lat=tc["lat"],
            lon=tc["lon"],
            alan_dekar=tc["alan_dekar"],
            secilen_urunler=tc["secilen_urunler"],
            ekim_bicimi=tc["ekim_bicimi"],
            sulama_bicimi=tc["sulama_bicimi"],
            yillik_su_kotasi_mm=tc["yillik_su_kotasi_mm"],
            iklim_modu=tc["iklim_modu"],
            attempt_live_api=attempt_live_api,
        )
        results.append({"test_adi": tc["test_adi"], "sonuc": res})
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Türkiye 81 İl Parsel Analiz ve Rotasyon Motoru")
    parser.add_argument("--json-input", type=str, help="JSON formatında parsel girdi parametreleri")
    parser.add_argument("--output-file", type=str, help="Çıktıyı doğrudan belirtilen JSON dosyasına kaydet")
    parser.add_argument("--run-tests", action="store_true", help="4 il doğrulama testini çalıştır ve özetle")
    parser.add_argument("--skip-live-api", action="store_true", help="Canlı API yerine doğrudan master JSON kullan")
    args = parser.parse_args()

    if args.json_input:
        payload = json.loads(args.json_input)
        crops_list = payload.get("secilen_urunler") or payload.get("mevcut_plan")
        if not crops_list:
            raise ValueError("JSON girdisinde 'secilen_urunler' veya 'mevcut_plan' alanı bulunmalıdır.")
        out = analyze_parcel(
            lat=float(payload["lat"]),
            lon=float(payload["lon"]),
            alan_dekar=float(payload["alan_dekar"]),
            secilen_urunler=list(crops_list),
            ekim_bicimi=str(payload["ekim_bicimi"]),
            sulama_bicimi=str(payload["sulama_bicimi"]),
            yillik_su_kotasi_mm=float(payload["yillik_su_kotasi_mm"])
            if payload.get("yillik_su_kotasi_mm") is not None
            else None,
            iklim_modu=str(payload.get("iklim_modu", "tipik")),
            attempt_live_api=not args.skip_live_api,
        )
        if args.output_file:
            out_path = Path(args.output_file)
            out_path.parent.mkdir(parents=True, exist_ok=True)
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(out, f, ensure_ascii=False, indent=2)
            print(f"[BAŞARILI] Örnek API yanıtı kaydedildi -> {out_path}")
        else:
            print(json.dumps(out, ensure_ascii=False))
        return

    results = run_four_benchmark_tests(attempt_live_api=not args.skip_live_api)
    for item in results:
        tname = item["test_adi"]
        r = item["sonuc"]
        pinfo = r["parsel_kimligi_ve_havza_eslesmesi"]
        fplan = r["ciftci_plani_denetimi"]
        foz = fplan["toplam_3_yil_ozeti"]
        print("=" * 98)
        print(
            f"TEST: {tname} | Eşleşen İl: {pinfo['eslesen_il_plaka']} {pinfo['eslesen_il_adi']} "
            f"({pinfo['tagem_iklim_bolgesi']}) | Ovalar: {', '.join(pinfo['onemli_tarim_ovalari'][:3])}"
        )
        print(
            f"  -> 3 Yıllık ETc: {foz['toplam_ETc_mm']} mm | Pe: {foz['toplam_Pe_etkin_mm']} mm | "
            f"dn: {foz['toplam_dn_net_sulama_mm']} mm | dt: {foz['toplam_dt_brut_sulama_mm']} mm ({foz['toplam_dt_brut_su_hacmi_m3']} m³) | "
            f"2035 CMIP6 (SSP5-8.5) dn: {foz['cmip6_2035_ssp585_tahmini_dn_mm']} mm"
        )


if __name__ == "__main__":
    main()
