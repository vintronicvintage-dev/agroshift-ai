# AGROSHIFT AI — VERİ KAYNAKLARI DOĞRULAMA VE ERİŞİM RAPORU (`DATA_SOURCE_REPORT.md`)

**Temel İlke:** `NO FAKE DATA. NO FABRICATED RESULTS. NO UNVERIFIED SCIENTIFIC CLAIMS.`

Bu rapor, AgroShift AI Bilimsel Veri Altyapısı (*Agricultural Scientific Data Infrastructure*) kapsamında incelenen, doğrulanan ve entegre edilen 12 dış veri kaynağının resmî erişim yöntemlerini, çözünürlüklerini, kimlik doğrulama gereksinimlerini, lisanslarını ve doğrulama sınıflarını (`Verified`, `Estimated`, `Unavailable`) belgeler.

---

## 1. Veri Kaynakları Özet Matrisi

| Kaynak Kodu (`source_id`) | Kurum / Ürün | Erişim Yöntemi | Uzamsal Çözünürlük | Zamansal Çözünürlük | Kimlik Doğrulama | Doğrulama Sınıfı | Sistemdeki Canlı Durum |
|---|---|---|---|---|---|---|---|
| `nasa_power_daily` | NASA LaRC — POWER Daily Agroclimatology API v2 | REST JSON API (`community=AG`) | $0.5^\circ \times 0.625^\circ$ (~50 km MERRA-2) / $1^\circ$ (CERES) | Günlük (`2001-01-01` – günümüz) | Gerekmez (`NONE`) | **`Verified`** | Aktif (5 pilot havzada 9.444'er gün + canlı istemci) |
| `nasa_gpm_imerg` | NASA GSFC / GES DISC — GPM IMERG V07B (`GPM_3IMERGM`) | OPeNDAP HDF5 / NASA GIBS WMTS | $0.1^\circ \times 0.1^\circ$ (~10 km) | 30 dk / Günlük / Aylık | `EARTHDATA_TOKEN` (Bearer) | **`Unavailable`** *(Nokta sorgusu)* | `EARTHDATA_TOKEN` olmadan OPeNDAP nokta sorgusu `not_validated` döner; GIBS harita katmanı ve ERA5/MGM çapraz kontrolü aktiftir |
| `nasa_smap_l4` | NASA JPL / NSIDC — SMAP L4 (`SPL4SMGP` v007) & MERRA-2 `GWET` | OPeNDAP HDF5 / POWER `GWETROOT` & `GWETTOP` | 9 km EASE-Grid 2.0 (L4) / 36 km (L3) | 3 saatlik / Günlük | Earthdata (L4 HDF5) / Açık (POWER) | **`Estimated`** | Bölgesel kök bölgesi (0–100 cm) ve yüzey (0–5 cm) ıslaklık indeksi olarak aktif; parsel ölçek uyarısı zorunlu |
| `nasa_modis_mod13q1` | NASA LP DAAC / ORNL DAAC — MODIS Terra `MOD13Q1` v061 | ORNL DAAC REST JSON API | 250 m × 250 m (~6,25 ha/piksel) | 16 günlük kompozit (`2000` – günümüz) | Gerekmez (`NONE`) | **`Verified`** | Aktif (`pixel_reliability` Rank 0 ve 1 filtreli NDVI serisi) |
| `nasa_nex_gddp_cmip6` | NASA NCCS / Ames — NEX-GDDP-CMIP6 | AWS S3 (`s3://nex-gddp-cmip6`) & NCCS THREDDS | $0.25^\circ \times 0.25^\circ$ (~25 km, BCSD) | Günlük (`1950–2100`, `SSP2-4.5`, `SSP5-8.5`) | Gerekmez (`--no-sign-request`) | **`Estimated`** | Koşullu 3 yıllık iklim stres senaryoları (`SSP2-4.5` ve `SSP5-8.5`) olarak aktif; kısa vadeli tahmin olarak kullanılmaz |
| `nasa_srtm_dem` | NASA / JPL / NGA — SRTMGL1 v3.0 DEM | OpenTopoData REST API (`srtm30m`) | 1 arc-second (~30 m) | Statik baz DEM | Gerekmez (`NONE`) | **`Verified`** | Aktif (Poligon ve 3×3 90 m şablonu üzerinde rakım, eğim % ve bakı hesabı) |
| `ecmwf_era5_land` | ECMWF Copernicus C3S — ERA5 / ERA5-Land | Open-Meteo Historical Archive API | $0.25^\circ$ (~28 km ERA5) / $0.1^\circ$ (~9 km) | Günlük (`1940` – günümüz) | Gerekmez (`NONE`) | **`Verified`** | 25 tam yıl boyunca NASA POWER yağışının bağımsız çapraz kontrolü olarak aktif |
| `isric_soilgrids_v2` | ISRIC — SoilGrids v2.0 & WRB Toprak Grubu | ISRIC REST / WCS (`v2.0/properties/query`) | 250 m × 250 m, 6 derinlik (0–200 cm) | Statik v2.0 (Poggio vd. 2021) | Gerekmez (`NONE`) | **`Estimated`** | Aktif (`priorityRank=2`; kullanıcı laboratuvar sonucu `priorityRank=1` geldiğinde otomatik öncelik devreder) |
| `fao_56_aquacrop` | FAO — Irrigation & Drainage Paper 56, 33, 66 ve AquaCrop v7.1 | Resmî Literatür & Parametre Tabloları | İklim kuşağı ve ürün düzeyi | Fenolojik evre (`ini`, `dev`, `mid`, `late`) | Gerekmez | **`Verified`** / **`Estimated`** | Tablo değerleri (`Kc`, `Zr`, `p`, `Ky`, `WP*`, `HI0`) `Verified`; bölgesel ekim takvimleri `Estimated` |
| `tuik_crop_stats` | Türkiye İstatistik Kurumu (TÜİK) — Bitkisel Üretim İstatistikleri | Resmi İstatistik Bültenleri (2024 ve 2025) | Ulusal ve 81 İl Düzeyi | Yıllık | Gerekmez | **`Verified`** | 2024 ve 2025 rekolte tonajları, yıllık kuraklık değişim oranları ve sulu/kuru referans verimler aktif |
| `tarim_bakanligi_tmo` | T.C. Tarım ve Orman Bakanlığı, TMO, Trakya Birlik, Türkşeker, Borsalar | Resmi Kararnameler ve Alım Duyuruları | Türkiye Tarımsal Havzaları | 2025/2026 Üretim Sezonu | Gerekmez | **`Verified`** / **`Estimated`** | TMO/Türkşeker/Trakya Birlik alım fiyatları `Verified`; 2025–2027 Yeni Destekleme Modeli (244 TL/da katsayı) ve girdi maliyetleri aktif |
| `mgm_climate_normals` | Meteoroloji Genel Müdürlüğü (MGM) & DSİ | WMO 1991–2020 Resmi İl İklim Normalleri | İl Sinoptik İstasyonu ve DSİ Havzası | 30 Yıllık Normal (`1991–2020`) | Gerekmez | **`Verified`** | Konya, Şanlıurfa, Adana, Edirne ve Ankara uzun yıllar yağış/sıcaklık normalleri ve DSİ su kısıtı havza bayrakları aktif |

---

## 2. Kaynak Bazlı Teknik Doğrulama Detayları

### A. NASA POWER (`src/lib/data/power.ts`)
- **Resmî Dokümantasyon:** https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- **Toplanan Değişkenler:** `T2M` (°C), `T2M_MAX` (°C), `T2M_MIN` (°C), `PRECTOTCORR` (mm/gün), `RH2M` (%), `WS2M` (m/s), `ALLSKY_SFC_SW_DWN` ($\text{MJ/m}^2\text{/gün}$), `GWETROOT` (0–1), `GWETTOP` (0–1).
- **Eksik Değer ve Birim Doğrulaması:** NASA POWER, henüz CERES radyasyon işlemesi tamamlanmamış son 2–5 günde `-999` (veya `-99`) doldurma değeri (*fill value*) döndürür. `powerToDaily()` fonksiyonu tüm `-999`/`-99` değerlerini `null` olarak işaretler, sondaki tamamen boş günleri kırpar ve `ALLSKY_SFC_SW_DWN` birimini yanıt başlığından (`parameters.ALLSKY_SFC_SW_DWN.units`) doğrulayarak $\text{kWh/m}^2\text{/gün}$ gelmesi halinde $\times 3{,}6$ ile $\text{MJ/m}^2\text{/gün}$ birimine çevirir.

### B. NASA GPM IMERG (`src/lib/data/imerg.ts`)
- **Resmî Kaynak:** https://gpm.nasa.gov/data/imerg ve `GPM_3IMERGM.07` (V07B Final Run, $0.1^\circ$ aylık).
- **Kimlik Doğrulama ve Dürüst Hata Yönetimi:** GES DISC OPeNDAP sunucusu (`gpm1.gesdisc.eosdis.nasa.gov`) üzerinden tekil grid hücresi (`precipitation[0:0][lon_idx][lat_idx]`) çekmek için `EARTHDATA_TOKEN` ortam değişkeninde geçerli bir NASA Earthdata Login Bearer Token bulunması gerekir. Token tanımlı değilse veya GES DISC yetkisi yoksa sistem **asla sahte IMERG verisi üretmez**; durumu `status: "not_validated"` ve `verificationStatus: "Unavailable"` olarak kaydeder ve yağış çapraz doğrulamasını ECMWF ERA5 + MGM 1991–2020 normalleri üzerinden yürütür.

### C. NASA SMAP (`src/lib/data-infra/sourcesCatalog.ts` & `repository.ts`)
- **Resmî Kaynak:** https://smap.jpl.nasa.gov/ (`SPL4SMGP` v007 — 9 km EASE-Grid 2.0 Yüzey 0–5 cm ve Kök Bölgesi 0–100 cm Toprak Nemi).
- **Bilimsel Ölçek Kuralı:** 9 km × 9 km boyutundaki bir SMAP L4 pikseli **8.100 hektar (81.000 dekar)** alanı temsil eder. Sistemde `isParcelScaleSensor: false` bayrağı sabitlenmiş olup, kullanıcıya ve API tüketicilerine uydu toprak neminin parsel içi sensör ölçümü olmadığı, yalnızca bölgesel kuraklık anomalisi ve başlangıç nemi referansı olduğu açıkça bildirilir.

### D. NASA MODIS (`src/lib/data/modis.ts`)
- **Resmî Kaynak:** https://modis.gsfc.nasa.gov/ (`MOD13Q1` v061, 250 m, 16 günlük NDVI ve EVI).
- **Kalite Kontrol Bayrakları:** `250m_16_days_pixel_reliability` bandı okunarak yalnızca `Rank 0` (*Good*) ve `Rank 1` (*Marginal*) pikseller kabul edilir; `Rank 2` (*Snow/Ice*), `Rank 3` (*Cloudy*) ve `-1` (*Fill / -3000*) değerleri reddedilir.
- **Sistem Seviyesi Agronomik Kural:** NDVI ve EVI değerleri tek başına kesin verim ($\text{t/ha}$) veya spesifik besin elementi ($\text{N/P/K}$) eksikliği ölçümü olarak **kullanılmaz**; yalnızca parselin fenolojik takvim uyumu ve kanopi gelişim eğrisini doğrulamak için kullanılır.

### E. NASA NEX-GDDP-CMIP6 (`src/lib/data-infra/turkishAgData.ts`)
- **Resmî Kaynak:** https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/ (AWS S3 `s3://nex-gddp-cmip6`, CC0 1.0 Kamu Malı lisansı, $0.25^\circ$ günlük BCSD projeksiyonları).
- **Kullanım Kısıtı:** CMIP6 çıktıları kesinlikle kısa vadeli hava tahmini olarak kullanılmaz. 3 yıllık ekim nöbeti optimizasyonunda tarihsel 25 yıllık pencereler üzerine `SSP2-4.5` (orta emisyon) ve `SSP5-8.5` (yüksek emisyon) sıcaklık ($\Delta T$) ve yağış çarpanları uygulanarak **koşullu iklim stres senaryoları** (*minimax regret* ve *CVaR20*) üretilir.

### F. ISRIC SoilGrids v2.0 (`src/lib/data/soilgrids.ts` & `soillayers.ts`)
- **Resmî Kaynak:** https://soilgrids.org/ (Poggio vd., 2021, 250 m çözünürlük, 6 standart GlobalSoilMap derinliği: `0-5`, `5-15`, `15-30`, `30-60`, `60-100`, `100-200 cm`).
- **Dönüşüm Katsayıları (`d_factor`):** `sand`, `silt`, `clay` ($\text{g/kg} \div 10 \rightarrow \%$), `soc` ($\text{dg/kg} \div 10 \rightarrow \text{g/kg}$), `phh2o` ($\text{pH}\times 10 \div 10 \rightarrow \text{pH}$), `cec` ($\text{mmol(c)/kg} \div 10 \rightarrow \text{cmol(c)/kg}$), `nitrogen` ($\text{cg/kg} \div 100 \rightarrow \text{g/kg}$), `bdod` ($\text{cg/cm}^3 \div 100 \rightarrow \text{g/cm}^3$), `cfvo` ($\text{cm}^3/\text{dm}^3 \div 10 \rightarrow \text{hacim }\%$), `wv0033` ve `wv1500` ($\div 10 \div 100 \rightarrow \text{m}^3/\text{m}^3$).
- **Laboratuvar Öncelik Kuralı:** SoilGrids tahminleri `dataOrigin = 'soilgrids_v2'` (`priorityRank = 2`, `Estimated`) olarak saklanır. Kullanıcı laboratuvar analizi girdiğinde `dataOrigin = 'user_lab'` (`priorityRank = 1`, `Verified`) ayrı bir kayıt olarak saklanır ve modelde öncelikli kullanılır; SoilGrids kayıtları silinmez.

### G. Türkiye Resmî Veri Kaynakları (TÜİK, Tarım ve Orman Bakanlığı, TMO, MGM, DSİ)
- **TÜİK (`https://data.tuik.gov.tr/`):** 2024 ve 2025 Bitkisel Üretim İstatistikleri bültenlerinden ulusal üretim miktarları (ör. 2025 Buğday 17,9 milyon ton, Arpa 6,0 milyon ton, Dane Mısır 8,5 milyon ton, Şeker Pancarı 22,0 milyon ton, Ayçiçeği 1,9 milyon ton, Nohut 413 bin ton, Kırmızı Mercimek 250 bin ton) ve sulu/kuru referans verimler entegre edilmiştir.
- **Tarım ve Orman Bakanlığı & TMO (`https://www.tarimorman.gov.tr/`, `https://www.tmo.gov.tr/`):** 2025/2026 sezonu TMO, Trakya Birlik, Türkşeker ve Ticaret Borsaları referans alım fiyatları ile 2025–2027 Yeni Bitkisel Üretim Destekleme Modeli (244 TL/da temel katsayı üzerinden Temel Destek, Planlı Üretim Desteği ve Su Kısıtı Desteği) entegre edilmiştir.
- **MGM (`https://www.mgm.gov.tr/`):** 1991–2020 WMO 30 yıllık resmi il iklim normalleri (Konya 325,3 mm / 11,9 °C; Ankara 413,6 mm / 12,6 °C; Şanlıurfa 450,5 mm / 19,0 °C; Edirne 625,2 mm / 14,2 °C; Adana 668,4 mm / 19,3 °C) yağış kalibrasyon referansı olarak tanımlanmıştır.
