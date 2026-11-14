"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icons";

export interface SourceParameterSpec {
  symbol: string;
  nameTr: string;
  nameEn: string;
  unit: string;
  sampleValue?: string;
}

export interface ScientificSourceCardSpec {
  id: string;
  badgeCode: string;
  category: "climate" | "satellite" | "soil" | "agronomy" | "economics";
  categoryLabelTr: string;
  categoryLabelEn: string;
  titleTr: string;
  titleEn: string;
  providerTr: string;
  providerEn: string;
  photoSrc: string;
  photoCredit: string;
  resolution: string;
  temporalRange: string;
  officialUrl: string;
  formulaUsed: string;
  parameters: SourceParameterSpec[];
  descriptionTr: string;
  descriptionEn: string;
}

export const SCIENTIFIC_SOURCE_CARDS: ScientificSourceCardSpec[] = [
  {
    id: "NASA_POWER",
    badgeCode: "NASA POWER MERRA-2",
    category: "climate",
    categoryLabelTr: "Meteoroloji & Buharlaşma",
    categoryLabelEn: "Meteorology & ET₀",
    titleTr: "NASA POWER Günlük Tarımsal Meteoroloji Serisi",
    titleEn: "NASA POWER Agroclimatology Daily Series",
    providerTr: "NASA Langley Research Center (GMAO MERRA-2)",
    providerEn: "NASA Langley Research Center (GMAO MERRA-2)",
    photoSrc: "/images/gs-evidence.webp",
    photoCredit: "NASA/JPL Aqua & MERRA-2 Earth Observation (PIA18156)",
    resolution: "0.5° × 0.625° (~50 km)",
    temporalRange: "2001–2026 (Günlük)",
    officialUrl: "https://power.larc.nasa.gov/docs/services/api/",
    formulaUsed: "ET₀ = [0.408Δ(Rₙ−G) + γ(900/(T+273))u₂(eₛ−eₐ)] / [Δ + γ(1+0.34u₂)]",
    parameters: [
      { symbol: "T2M / T2M_MAX / T2M_MIN", nameTr: "Günlük Ortalama, Maks. ve Min. Sıcaklık", nameEn: "Daily Mean, Max & Min Temp", unit: "°C" },
      { symbol: "PRECTOTCORR", nameTr: "Düzeltilmiş Günlük Toplam Yağış", nameEn: "Bias-Corrected Daily Rainfall", unit: "mm/gün" },
      { symbol: "ALLSKY_SFC_SW_DWN", nameTr: "Yüzeye Ulaşan Kısa Dalga Güneş Radyasyonu", nameEn: "Downward Shortwave Solar Radiation", unit: "MJ/m²/gün" },
      { symbol: "RH2M & WS2M", nameTr: "Bağıl Nem (2m) ve Rüzgâr Hızı (2m)", nameEn: "Relative Humidity & 2m Wind Speed", unit: "% · m/s" },
    ],
    descriptionTr:
      "FAO-56 Penman–Monteith referans evapotranspirasyon (ET₀), don günleri (T_min < 0°C), sıcak stres günleri (T_max > 34°C) ve 24 yıllık tarihsel su dengesi simülasyonunun ana iklim girdisidir.",
    descriptionEn:
      "Primary meteorological driver for FAO-56 Penman–Monteith reference evapotranspiration (ET₀), frost days, heat-stress days, and 24-year daily water balance.",
  },
  {
    id: "TAGEM_DSI_2017",
    badgeCode: "TAGEM & DSİ (2017)",
    category: "agronomy",
    categoryLabelTr: "Resmî Sulama & Su Dengesi",
    categoryLabelEn: "Official Crop Water Guide",
    titleTr: "TAGEM & DSİ Türkiye'de Sulanan Bitkilerin Su Tüketimleri Rehberi",
    titleEn: "TAGEM & DSI Guide to Crop Water Consumption in Türkiye",
    providerTr: "T.C. Tarım ve Orman Bakanlığı TAGEM & DSİ Genel Müdürlüğü",
    providerEn: "Ministry of Agriculture TAGEM & State Hydraulic Works (DSI)",
    photoSrc: "/images/sources/irrigation-pivot.jpg",
    photoCredit: "NASA Earth Observation — Center-Pivot & Surface Irrigation (PIA15849)",
    resolution: "81 İl · 30 İklim Bölgesi",
    temporalRange: "2017–2026 Standart",
    officialUrl: "https://www.tarimorman.gov.tr/TAGEM",
    formulaUsed: "ETc = Kc × ET₀ · dn = max(0, ETc − Pe − ΔS_kök) · dt = dn / (Ea × Ec)",
    parameters: [
      { symbol: "Kc₁ / Kc₃ / Kc₄", nameTr: "Başlangıç, Tam Örtü ve Olgunlaşma Bitki Katsayısı", nameEn: "Initial, Mid & Late Crop Coefficients", unit: "boyutsuz" },
      { symbol: "ETc & Pe", nameTr: "Mevsimlik Bitki Su Tüketimi ve Etkili Yağış", nameEn: "Seasonal Crop ET & Effective Rainfall", unit: "mm/sezon" },
      { symbol: "dn & dt", nameTr: "Net Sulama İhtiyacı ve Brüt Su Çekimi", nameEn: "Net & Gross Irrigation Requirement", unit: "mm (m³/da)" },
      { symbol: "Ea × Ec", nameTr: "Sulama Uygulama ve İletim Randımanı (Damla %88,2 · Salma %53,9)", nameEn: "Irrigation Application & Conveyance Efficiency", unit: "%" },
    ],
    descriptionTr:
      "81 ilin her biri için ürün bazlı ekim-hasat tarihlerini, gelişme evresi uzunluklarını, Kc katsayılarını ve sulama yöntemine (Damla, Center Pivot, Yağmurlama, Salma) göre brüt su hacmini (dt) belirler.",
    descriptionEn:
      "Defines province-specific sowing/harvest dates, growth stage durations, Kc curves, and gross irrigation demand (dt) by irrigation method across all 81 provinces.",
  },
  {
    id: "ISRIC_SOILGRIDS",
    badgeCode: "ISRIC SoilGrids v2.0",
    category: "soil",
    categoryLabelTr: "Toprak Fiziksel & Kimyasal",
    categoryLabelEn: "Soil Physical & Chemical",
    titleTr: "ISRIC SoilGrids v2.0 250m Küresel Toprak Özellikleri (0–30 cm)",
    titleEn: "ISRIC SoilGrids v2.0 250m Soil Property Maps (0–30 cm)",
    providerTr: "ISRIC — World Soil Information & USDA Saxton-Rawls PTF",
    providerEn: "ISRIC — World Soil Information & USDA Saxton-Rawls PTF",
    photoSrc: "/images/sources/soil-profile.jpg",
    photoCredit: "NASA ISS Agricultural Soil & Alluvial Plains Observation (iss026e025373)",
    resolution: "250 m (0–5, 5–15, 15–30 cm)",
    temporalRange: "v2.0 (2020–2026)",
    officialUrl: "https://soilgrids.org/",
    formulaUsed: "TAW = 1000 × (θ_FC − θ_WP) × Z_r × (1 − CFVO) · RAW = p × TAW",
    parameters: [
      { symbol: "Kil / Silt / Kum", nameTr: "Toprak Tekstür Fraksiyonları (USDA Doku Sınıfı)", nameEn: "Clay, Silt & Sand Fractions", unit: "%" },
      { symbol: "θ_FC & θ_WP", nameTr: "Tarla Kapasitesi ve Solma Noktası Hacimsel Nemi", nameEn: "Field Capacity & Wilting Point", unit: "m³/m³" },
      { symbol: "TAW (AWC)", nameTr: "Yararlanılabilir Su Tutma Kapasitesi", nameEn: "Total Available Water Capacity", unit: "mm/m" },
      { symbol: "pH · SOC · CEC · EC", nameTr: "Toprak Reaksiyonu, Organik Karbon, KDK ve Tuzluluk", nameEn: "pH, Organic Carbon, CEC & Salinity", unit: "pH · g/kg · dS/m" },
    ],
    descriptionTr:
      "Parsel koordinatındaki kil, silt, kum, organik karbon ve hacim ağırlığından Saxton & Rawls (2006) pedotransfer denklemleriyle kök bölgesi su deposunu (TAW) ve SCS-CN yüzey akış katsayısını hesaplar.",
    descriptionEn:
      "Computes root-zone water storage (TAW) and SCS-CN runoff curve numbers from 250m clay, silt, sand, organic carbon, and bulk density via Saxton & Rawls (2006) equations.",
  },
  {
    id: "NASA_NSIDC_SMAP",
    badgeCode: "NASA SMAP L4 (9 km)",
    category: "satellite",
    categoryLabelTr: "Uydu Kök Bölgesi Nemi",
    categoryLabelEn: "Satellite Root Moisture",
    titleTr: "NASA SMAP L4 Kök Bölgesi Toprak Nemi & L3 Donma-Çözülme",
    titleEn: "NASA SMAP L4 Root-Zone Soil Moisture & L3 Freeze/Thaw",
    providerTr: "NASA JPL & NSIDC (SPL4SMGP v07 / SPL3FTA)",
    providerEn: "NASA JPL & NSIDC (SPL4SMGP v07 / SPL3FTA)",
    photoSrc: "/images/sources/nasa-smap.jpg",
    photoCredit: "NASA JPL Soil Moisture Active Passive (SMAP) Global Map (PIA23146)",
    resolution: "9 km (L4 Kök Nemi) · 3 km (L3 Don)",
    temporalRange: "2015–2026 (3 Saatlik / Mevsimlik)",
    officialUrl: "https://smap.jpl.nasa.gov/",
    formulaUsed: "ΔS_kök = 1000 × (θ_SMAP − θ_WP) × Z_r + ΔS_anız (+25 mm)",
    parameters: [
      { symbol: "θ_kök (4 Mevsim)", nameTr: "Kış, İlkbahar, Yaz, Sonbahar Kök Bölgesi Nemi", nameEn: "4-Season Root-Zone Soil Moisture", unit: "m³/m³" },
      { symbol: "θ_kritik", nameTr: "Bitki Su Stresi Başlangıç Eşiği", nameEn: "Critical Water Stress Threshold", unit: "m³/m³" },
      { symbol: "L3_F/T Don Günü", nameTr: "Kış Toprak Donma Dönemi ve Don Gün Sayısı", nameEn: "Soil Freeze/Thaw Period & Frost Days", unit: "gün/yıl" },
    ],
    descriptionTr:
      "Ekim öncesi toprakta biriken başlangıç nem kredisini (ΔS_kök) ve anıza doğrudan ekimin sağladığı +25 mm nem koruma avantajını doğrulamak için kullanılır.",
    descriptionEn:
      "Quantifies pre-sowing root-zone moisture credit and validates the +25 mm moisture conservation benefit of no-till direct seeding.",
  },
  {
    id: "NASA_GPM_IMERG",
    badgeCode: "NASA GPM IMERG v07",
    category: "satellite",
    categoryLabelTr: "Uydu Sağanak & Yağış",
    categoryLabelEn: "Satellite Precipitation",
    titleTr: "NASA GPM IMERG Günlük Yağış ve Konvektif Sağanak Analizi",
    titleEn: "NASA GPM IMERG Daily Precipitation & Convective Storm Profile",
    providerTr: "NASA GES DISC (GPM_3IMERGDF v07 Final)",
    providerEn: "NASA GES DISC (GPM_3IMERGDF v07 Final)",
    photoSrc: "/images/sources/nasa-gpm.jpg",
    photoCredit: "NASA Global Precipitation Measurement (GPM) Core Observatory (201404250029HQ)",
    resolution: "0.1° (~10 km)",
    temporalRange: "2005–2026 (Günlük)",
    officialUrl: "https://gpm.nasa.gov/data/imerg",
    formulaUsed: "Pe_etkin = Pe_baz × f_infiltrasyon(ekim) × (1 − kayıp_GPM>25mm)",
    parameters: [
      { symbol: "P_GPM", nameTr: "Uydu Tabanlı Günlük Yağış Miktarı", nameEn: "Satellite Daily Precipitation", unit: "mm/gün" },
      { symbol: "N_sağanak (>25mm)", nameTr: "Yıllık Şiddetli Konvektif Sağanak Gün Sayısı", nameEn: "Heavy Convective Storm Days (>25 mm/d)", unit: "gün/yıl" },
      { symbol: "f_kayıp", nameTr: "Geleneksel Sürüm (%22) vs Anıza Ekim (%8) Yüzey Akışı Kaybı", nameEn: "Tillage Storm Runoff Loss Ratio", unit: "%" },
    ],
    descriptionTr:
      ">25 mm/gün şiddetli sağanaklarda pulluklu sürümde yüzey akışıyla kaybedilen yağışın, anıza doğrudan ekimle nasıl kök bölgesine sızdırıldığını (infiltrasyon ×1.12) modeller.",
    descriptionEn:
      "Models runoff loss during >25 mm/day convective storms under conventional plowing (22% loss) vs. no-till residue retention (8% loss, ×1.12 infiltration).",
  },
  {
    id: "NASA_JPL_ECOSTRESS",
    badgeCode: "NASA ECOSTRESS 70m",
    category: "satellite",
    categoryLabelTr: "Termal Kanopi Stresi",
    categoryLabelEn: "Canopy Thermal Stress",
    titleTr: "NASA JPL ECOSTRESS 70m Yüzey Sıcaklığı (LST) ve Buharlaşma Stresi",
    titleEn: "NASA JPL ECOSTRESS 70m Land Surface Temperature & ESI",
    providerTr: "NASA JPL / ISS (ECO2LSTE v001 & ESI)",
    providerEn: "NASA JPL / ISS (ECO2LSTE v001 & ESI)",
    photoSrc: "/images/sources/nasa-ecostress.jpg",
    photoCredit: "NASA JPL ECOSTRESS ISS Thermal Radiometer Imagery (PIA25488)",
    resolution: "70 m × 70 m",
    temporalRange: "2018–2026 (Yaz Pik Dönemi)",
    officialUrl: "https://ecostress.jpl.nasa.gov/",
    formulaUsed: "T_stres = max(0, LST_yaz − T_eşik) · Risk_termal = f(N_LST>38°C)",
    parameters: [
      { symbol: "LST_yaz", nameTr: "Yaz Ortası Kanopi/Yüzey Sıcaklığı (70m)", nameEn: "Mid-Summer Land Surface Temperature", unit: "°C" },
      { symbol: "N_termal_stres", nameTr: "Yıllık Termal Stres ve Polen Yanıklığı Gün Sayısı", nameEn: "Annual Canopy Thermal Stress Days", unit: "gün/yıl" },
      { symbol: "T_polen_eşik", nameTr: "Çiçeklenme Dönemi Kritik Polen Yanıklığı Eşiği", nameEn: "Critical Pollen Sterility Threshold", unit: "°C" },
    ],
    descriptionTr:
      "70 metre çözünürlükte bitki kanopi sıcaklığını ölçerek çiçeklenme dönemindeki gizli su stresini ve polen yanıklığı riskini (Temmuz–Ağustos) tespit eder.",
    descriptionEn:
      "Detects mid-summer canopy heat stress and flowering pollen sterility risk at 70m parcel resolution.",
  },
  {
    id: "LANDSAT_SENTINEL_MODIS_NDVI",
    badgeCode: "HLS 10–30m & MODIS 250m",
    category: "satellite",
    categoryLabelTr: "Bitki Örtüsü & Fenoloji",
    categoryLabelEn: "Vegetation & Phenology",
    titleTr: "NASA/USGS Landsat-8/9, Sentinel-2 HLS ve MODIS NDVI Zaman Serisi",
    titleEn: "Harmonized Landsat Sentinel-2 (HLS) & MODIS NDVI Time Series",
    providerTr: "NASA LP DAAC & ESA Copernicus (MOD13Q1 / HLSL30)",
    providerEn: "NASA LP DAAC & ESA Copernicus (MOD13Q1 / HLSL30)",
    photoSrc: "/images/harran-plain-2002.webp",
    photoCredit: "NASA Earth Observatory / USDA FAS — Landsat Irrigated Cropland",
    resolution: "10 m – 30 m (HLS) · 250 m (MODIS)",
    temporalRange: "2005–2026 (12 Aylık Profil)",
    officialUrl: "https://lpdaac.usgs.gov/products/mod13q1v061/",
    formulaUsed: "NDVI = (NIR − Red) / (NIR + Red) · C_RUSLE = f(NDVI_örtü, çıplak_gün)",
    parameters: [
      { symbol: "NDVI (12 Ay)", nameTr: "Aylık Normalize Edilmiş Fark Bitki Örtüsü İndeksi", nameEn: "12-Month Normalized Difference Vegetation Index", unit: "-1..+1" },
      { symbol: "NDVI_pik", nameTr: "Kışlık/Yazlık Maksimum Biyokütle Pik Değeri", nameEn: "Seasonal Peak Canopy NDVI", unit: "0.65–0.82" },
      { symbol: "Ay_çıplak (NDVI<0.20)", nameTr: "Çıplak Toprak ve Erozyona Açık Pencere Ayları", nameEn: "Bare Soil Erosion Window Months", unit: "ay" },
    ],
    descriptionTr:
      "Parselin 12 aylık yeşil örtü dinamiklerini, hasat sonrası çıplak toprak süresini ve RUSLE erozyon modelindeki bitki örtüsü koruma çarpanını (C faktörü) kalibre eder.",
    descriptionEn:
      "Calibrates 12-month canopy greenness, post-harvest bare-soil exposure days, and the RUSLE C-factor cover multiplier.",
  },
  {
    id: "FAO_56_33_GAEZ",
    badgeCode: "FAO-56 · FAO-33 · GAEZ v4",
    category: "agronomy",
    categoryLabelTr: "Su-Verim & Ekolojik Uyum",
    categoryLabelEn: "Water-Yield & Suitability",
    titleTr: "FAO-56 Su Dengesi, FAO-33 Stewart Verim Tepkisi ve GAEZ v4 Uygunluk",
    titleEn: "FAO-56 Water Balance, FAO-33 Yield Response & GAEZ v4 Suitability",
    providerTr: "Birleşmiş Milletler Gıda ve Tarım Örgütü (FAO & IIASA)",
    providerEn: "Food and Agriculture Organization of the UN (FAO & IIASA)",
    photoSrc: "/images/sources/wheat-harvest.jpg",
    photoCredit: "NASA Earth Observatory — Landsat 8 Rainfed & Irrigated Wheat Fields",
    resolution: "Parsel & Havza Ölçekli",
    temporalRange: "FAO-56 (1998) · FAO-66 (2012) · GAEZ v4",
    officialUrl: "https://www.fao.org/land-water/",
    formulaUsed: "1 − (Yₐ / Yₘ) = Kᵧ × (1 − ETₐ / ETc) · Y = Yₘ × (Yₐ/Yₘ) × f_önBitki",
    parameters: [
      { symbol: "Kᵧ", nameTr: "Su Stresine Verim Duyarlılık Faktörü (Mısır 1.25 · Nohut 0.85)", nameEn: "Water Stress Yield Response Factor", unit: "boyutsuz" },
      { symbol: "Kₛ (0..1)", nameTr: "Günlük Kök Bölgesi Su Stresi Katsayısı", nameEn: "Daily Root Water Stress Coefficient", unit: "0..1" },
      { symbol: "GAEZ Sınıfı", nameTr: "Ekolojik Uygunluk (Uygun / Kısıtlı Uygun / Don Riski)", nameEn: "Agro-Ecological Suitability Class", unit: "S1 / S2 / S3" },
      { symbol: "WUE (WP)", nameTr: "Su Kullanım Etkinliği (Birim Su Başına Dane Verimi)", nameEn: "Crop Water Productivity", unit: "kg/m³" },
    ],
    descriptionTr:
      "Su kısıtı altında verim kaybını (Stewart denklemi), önceki bitkinin (baklagil/tahıl) verim çarpanını ve il bazında ekolojik uygunluk sınıflarını hesaplar.",
    descriptionEn:
      "Computes yield reduction under water deficit (Stewart equation), pre-crop rotation multipliers, and provincial agro-ecological suitability.",
  },
  {
    id: "NASA_NEX_GDDP_CMIP6",
    badgeCode: "NASA NEX-GDDP-CMIP6",
    category: "climate",
    categoryLabelTr: "2035 İklim Projeksiyonu",
    categoryLabelEn: "2035 Climate Projections",
    titleTr: "NASA NEX-GDDP-CMIP6 2035 İklim Değişikliği Stres Senaryoları",
    titleEn: "NASA NEX-GDDP-CMIP6 Downscaled 2035 Climate Stress Scenarios",
    providerTr: "NASA Center for Climate Simulation (NCCS) & IPCC AR6",
    providerEn: "NASA Center for Climate Simulation (NCCS) & IPCC AR6",
    photoSrc: "/images/sources/nasa-cmip6.jpg",
    photoCredit: "NASA NCCS Global Downscaled Climate Projection Visualization (PIA26185)",
    resolution: "0.25° (~25 km) · 81 İl",
    temporalRange: "2026–2035 (SSP2-4.5 & SSP5-8.5)",
    officialUrl: "https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/",
    formulaUsed: "ETc_2035 = ETc_tipik × (1 + ΔET₀_SSP) · Pe_2035 = Pe_tipik × (1 + ΔP_SSP)",
    parameters: [
      { symbol: "ΔT (SSP2-4.5 / SSP5-8.5)", nameTr: "2035 Ufku Ortalama Sıcaklık Artışı", nameEn: "2035 Projected Temperature Anomaly", unit: "+°C" },
      { symbol: "ΔP (%)", nameTr: "2035 Mevsimlik Yağış Değişimi", nameEn: "2035 Projected Precipitation Change", unit: "%" },
      { symbol: "ΔET₀ (%)", nameTr: "Artan Buharlaşma Talebi ve Fenolojik Erken Olgunlaşma", nameEn: "ET₀ Increase & Phenological Shift", unit: "% · gün" },
    ],
    descriptionTr:
      "Seçilen 3 yıllık münavebe planının 2035 yılında SSP2-4.5 (ılımlı) ve SSP5-8.5 (yüksek emisyon) senaryolarında ne kadar ek sulama suyu (m³) gerektireceğini test eder.",
    descriptionEn:
      "Stress-tests 3-year rotation plans against 2035 SSP2-4.5 and SSP5-8.5 warming and precipitation anomalies.",
  },
  {
    id: "NASA_SRTM_DEM",
    badgeCode: "NASA SRTM 30m DEM",
    category: "satellite",
    categoryLabelTr: "Topoğrafya & Erozyon",
    categoryLabelEn: "Topography & Erosion",
    titleTr: "NASA SRTM 30m Dijital Yükselti Modeli, Eğim ve RUSLE Erozyon",
    titleEn: "NASA SRTM 30m Digital Elevation Model, Slope & RUSLE Erosion",
    providerTr: "NASA JPL & USGS LP DAAC (SRTMGL1 v003)",
    providerEn: "NASA JPL & USGS LP DAAC (SRTMGL1 v003)",
    photoSrc: "/images/sources/nasa-srtm-dem.jpg",
    photoCredit: "NASA JPL Shuttle Radar Topography Mission (SRTM) Shaded Relief (PIA04967)",
    resolution: "1 Arc-Second (~30 m)",
    temporalRange: "SRTM v003 + RUSLE",
    officialUrl: "https://lpdaac.usgs.gov/products/srtmgl1v003/",
    formulaUsed: "ΔT_rakım = −0.0065 × (Z_parsel − Z_grid) · A = R · K · LS · C · P",
    parameters: [
      { symbol: "Z (Rakım)", nameTr: "Parsel Ortalama Yüksekliği ve Lapse-Rate Sıcaklık Düzeltmesi", nameEn: "Parcel Elevation & Lapse-Rate Correction", unit: "m · °C" },
      { symbol: "Eğim (%) & LS", nameTr: "Yüzey Eğimi ve RUSLE Topoğrafik Faktörü", nameEn: "Surface Slope & RUSLE LS Factor", unit: "%" },
      { symbol: "A (Toprak Kaybı)", nameTr: "Yıllık Tahmini Toprak Erozyonu Kaybı", nameEn: "Estimated Annual Soil Erosion Loss", unit: "ton/ha/yıl" },
    ],
    descriptionTr:
      "Parselin 9 noktadan örneklenen rakımıyla 50 km'lik iklim hücresini yerel sıcaklığa uyarlar (−6,5°C/km) ve eğimden kaynaklanan su erozyonu riskini hesaplar.",
    descriptionEn:
      "Applies Adiabatic lapse-rate temperature correction (−6.5°C/km) from 9-point parcel elevation sampling and computes RUSLE slope erosion.",
  },
  {
    id: "TMO_TUIK_2026",
    badgeCode: "TMO · TÜİK · Borsa 2025/26",
    category: "economics",
    categoryLabelTr: "Ekonomi & Piyasa Verisi",
    categoryLabelEn: "Economics & Market Data",
    titleTr: "TMO, TÜİK, Trakya Birlik ve Ticaret Borsaları 2025/2026 Fiyat & Maliyet Serisi",
    titleEn: "TMO, TurkStat & Commodity Exchange 2025/2026 Crop Price & Cost Series",
    providerTr: "Toprak Mahsulleri Ofisi (TMO), TÜİK, Türkşeker, Trakya Birlik",
    providerEn: "Turkish Grain Board (TMO), TurkStat, Turkseker & Commodity Exchanges",
    photoSrc: "/images/gs-compare.webp",
    photoCredit: "NASA Earth Observatory / USDA FAS — Anatolian & Eurasian Grain Production",
    resolution: "Ulusal & İl Bazlı (TL/kg · TL/da)",
    temporalRange: "2025/2026 Üretim Sezonu",
    officialUrl: "https://www.tmo.gov.tr/",
    formulaUsed: "Brüt Kâr = (Y_kg/da × Fiyat) − Maliyet×(0.6+0.4s) + ΔN_kredi − (dt × Su_₺)",
    parameters: [
      { symbol: "Fiyat (TL/kg)", nameTr: "TMO Alım ve Ticaret Borsası Referans Satış Fiyatı", nameEn: "Reference Farm-Gate Crop Price", unit: "TL/kg" },
      { symbol: "Maliyet (TL/da)", nameTr: "Tohum, Gübre, Mazot, İlaç ve Hasat Değişken Maliyeti", nameEn: "Variable Production Cost per Decare", unit: "TL/da" },
      { symbol: "ΔN_kredi (TL/da)", nameTr: "Baklagil Biyolojik Azot Fiksasyonu Gübre Tasarrufu", nameEn: "Legume Biological Nitrogen Fertilizer Credit", unit: "TL/da" },
      { symbol: "CVaR₂₀ & P10–P90", nameTr: "En Kötü %20 Dönem Kârı ve Gelir Oynaklık Bandı", nameEn: "Worst 20% Window CVaR & Income Band", unit: "TL/da/yıl" },
    ],
    descriptionTr:
      "Her ürün için gerçek 2025/2026 alım fiyatlarını, sulama şiddetine duyarlı değişken masrafları, anıza ekim mazot tasarrufunu (6,8 → 1,9 L/da) ve azot kredisini birleştirir.",
    descriptionEn:
      "Integrates 2025/2026 farm-gate prices, irrigation-scaled variable costs, no-till fuel savings (6.8 → 1.9 L/da), and legume nitrogen credits.",
  },
];

const CATEGORY_META: Record<
  ScientificSourceCardSpec["category"] | "all",
  { tr: string; en: string; colorClass: string }
> = {
  all: { tr: "Tüm Kaynaklar (10)", en: "All Sources (10)", colorClass: "bg-[#e6f4ea] text-[#1e6b34]" },
  climate: { tr: "İklim & CMIP6", en: "Climate & CMIP6", colorClass: "bg-[#e0f2fe] text-[#0277bd]" },
  satellite: { tr: "NASA Uydu Sensörleri", en: "NASA Satellite Sensors", colorClass: "bg-[#ede9fe] text-[#5b21b6]" },
  soil: { tr: "Toprak & Hidrolik", en: "Soil & Hydraulics", colorClass: "bg-[#fef3c7] text-[#92400e]" },
  agronomy: { tr: "TAGEM, DSİ & FAO", en: "TAGEM, DSI & FAO", colorClass: "bg-[#dcfce7] text-[#166534]" },
  economics: { tr: "Ekonomi & TMO", en: "Economics & TMO", colorClass: "bg-[#ffedd5] text-[#9a3412]" },
};

export function SourceVisualCardsGrid({
  lang = "tr",
  filterIds,
  compact = false,
}: {
  lang?: "tr" | "en";
  filterIds?: string[];
  compact?: boolean;
}) {
  const [selectedCat, setSelectedCat] = useState<ScientificSourceCardSpec["category"] | "all">("all");

  const baseList = filterIds
    ? SCIENTIFIC_SOURCE_CARDS.filter((c) => filterIds.includes(c.id))
    : SCIENTIFIC_SOURCE_CARDS;

  const visibleCards =
    selectedCat === "all" ? baseList : baseList.filter((c) => c.category === selectedCat);

  return (
    <div className="space-y-4">
      {/* Category Filter Pills (shown when not filtered to a tiny subset) */}
      {!filterIds && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["all", "satellite", "climate", "agronomy", "soil", "economics"] as const).map((cat) => {
              const active = selectedCat === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCat(cat)}
                  className={`rounded-xl px-3 py-1.5 text-[12px] font-semibold transition-all ${
                    active
                      ? "bg-[#1e6b34] text-white shadow-sm"
                      : "border border-line bg-surface text-ink-2 hover:border-accent/40 hover:text-ink"
                  }`}
                >
                  {lang === "tr" ? CATEGORY_META[cat].tr : CATEGORY_META[cat].en}
                </button>
              );
            })}
          </div>
          <span className="font-mono text-[11px] text-ink-2">
            {lang === "tr"
              ? "Gerçek uydu/saha fotoğrafları ve doğrulanmış bilimsel parametreler"
              : "Real satellite/field photography & verified scientific parameters"}
          </span>
        </div>
      )}

      {/* Cards Grid */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          compact ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {visibleCards.map((card) => (
          <article
            key={card.id}
            className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-surface shadow-xs transition-all hover:border-[#2e7d32]/45 hover:shadow-md"
          >
            <div>
              {/* Top Real Photograph Header */}
              <div className="relative h-40 w-full overflow-hidden bg-[#0f2917]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.photoSrc}
                  alt={lang === "tr" ? card.titleTr : card.titleEn}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(10, 26, 15, 0.35) 0%, rgba(10, 26, 15, 0.88) 100%)",
                  }}
                />
                {/* Top badges */}
                <div className="absolute left-3 right-3 top-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-white/92 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-[#14532d] shadow-xs">
                    {card.badgeCode}
                  </span>
                  <span className="rounded-full border border-white/25 bg-black/55 px-2.5 py-0.5 font-mono text-[10px] font-medium text-white backdrop-blur-xs">
                    {card.resolution}
                  </span>
                </div>

                {/* Bottom title overlay on image */}
                <div className="absolute bottom-2.5 left-3 right-3">
                  <span className="inline-block rounded bg-[#22c55e]/25 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#bbf7d0]">
                    {lang === "tr" ? card.categoryLabelTr : card.categoryLabelEn} · {card.temporalRange}
                  </span>
                  <h3 className="mt-1 line-clamp-2 font-display text-[15.5px] font-semibold leading-snug text-white">
                    {lang === "tr" ? card.titleTr : card.titleEn}
                  </h3>
                </div>
              </div>

              {/* Card Body: Provider, Description & Explicit Parameters */}
              <div className="p-4">
                <p className="font-mono text-[11px] font-medium text-ink-2">
                  {lang === "tr" ? card.providerTr : card.providerEn}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink">
                  {lang === "tr" ? card.descriptionTr : card.descriptionEn}
                </p>

                {/* Formula Pill */}
                <div className="mt-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3 py-2">
                  <span className="block font-mono text-[10px] font-semibold uppercase tracking-wider text-[#166534]">
                    {lang === "tr" ? "Hesaplama Denklemi" : "Calculation Equation"}
                  </span>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold text-[#14532d]">
                    {card.formulaUsed}
                  </p>
                </div>

                {/* Parameters List */}
                <div className="mt-3">
                  <span className="block font-mono text-[10.5px] font-semibold uppercase tracking-wider text-ink-2">
                    {lang === "tr" ? "Kullanılan Parametreler ve Birimler" : "Parameters & Units Used"}
                  </span>
                  <ul className="mt-1.5 space-y-1.5">
                    {card.parameters.map((p, idx) => (
                      <li
                        key={idx}
                        className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg/70 px-2.5 py-1.5 text-[11.5px]"
                      >
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-[#1e6b34]">{p.symbol}</span>
                          <span className="ml-1.5 text-ink-2">
                            — {lang === "tr" ? p.nameTr : p.nameEn}
                          </span>
                        </div>
                        <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-ink">
                          {p.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Footer with Photo Credit & Official Source Link */}
            <div className="flex items-center justify-between gap-2 border-t border-line bg-bg/50 px-4 py-2.5 text-[11px]">
              <span className="truncate text-ink-2" title={card.photoCredit}>
                📷 {card.photoCredit}
              </span>
              <a
                href={card.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#1e6b34] hover:underline"
              >
                <span>{lang === "tr" ? "Resmî Kaynak" : "Official Source"}</span>
                <Icon name="arrow" size={12} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
