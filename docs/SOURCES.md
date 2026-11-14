# Veri ve Yöntem Kaynakları Envanteri (`SOURCES.md`)

Bu belge, AgroShift AI içerisinde kullanılan tüm dış veri kaynaklarını, bilimsel yöntemleri ve erişim durumlarını listeler. Makine tarafından okunabilir tam kayıt [`sources.json`](../sources.json) dosyasındadır.

## 1. Uzaktan Algılama ve İklim/Toprak Veri Kaynakları

| ID | Kaynak | Kurum | Çözünürlük | Lisans | Kullanım Amacı ve Doğrulama Durumu |
|---|---|---|---|---|---|
| `nasa-power` | [NASA POWER Daily API (AG)](https://power.larc.nasa.gov/docs/services/api/temporal/daily/) | NASA LaRC (MERRA-2 / CERES) | ~0.5° × 0.625° | US Public Domain | 2001–2026 günlük meteoroloji ve kök bölgesi nemi (`GWETROOT`). **Doğrulandı** (5 pilot kopyada 9.444 gün). |
| `modis-ornl` | [MODIS Terra MOD13Q1 v061](https://modis.ornl.gov/data/modis_webservice.html) | NASA LP DAAC / ORNL DAAC | 250 m, 16 günlük | US Public Domain | Tarla fenolojisi ve çıplak dönem NDVI serisi. **Doğrulandı**. |
| `srtm-opentopodata` | [NASA SRTM v3.0 DEM (SRTMGL1)](https://www.opentopodata.org/datasets/srtm/) | NASA / JPL / NGA (OpenTopoData) | ~30 m (1 arc-sec) | US Public Domain | Tarla rakımı, sonlu farklar eğimi (%) ve bakı açısı. **Doğrulandı**. |
| `soilgrids-v2` | [SoilGrids v2.0](https://www.isric.org/explore/soilgrids) | ISRIC (Poggio vd. 2021) | 250 m, 6 katman (0–200 cm) | CC BY 4.0 | Katmanlı toprak dokusu, SOC, pH, KDK, azot, hacim ağırlığı, çakıl ve su tutma (`wv0033`/`wv1500`). **Doğrulandı**. |
| `era5-openmeteo` | [ERA5 / ERA5-Land Historical API](https://open-meteo.com/en/docs/historical-weather-api) | ECMWF C3S / Open-Meteo | 0.25° (~28 km) | CC BY 4.0 | 25 tam yıl boyunca NASA POWER yağışının bağımsız çapraz kontrolü. **Doğrulandı**. |
| `gpm-imerg` | [GPM IMERG Final V07B (`GPM_3IMERGM`)](https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGM_07/summary) | NASA GES DISC | 0.1° (~10 km), aylık | US Public Domain | Aylık yağış çapraz kontrolü (`EARTHDATA_TOKEN` ile OPeNDAP). **UNVERIFIED (canlı OPeNDAP erişimi zaman aşımına uğradığı için kopyalarda `not_validated` olarak işaretlidir; harita katmanı GIBS üzerinden aktiftir).** |
| `esri-world-imagery` | [ArcGIS World Imagery MapServer](https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer) | Esri / Maxar / Earthstar Geographics | ~0,3 m (Zoom 18 doğal, Zoom 20 ölçekli) | Esri Master License (Atıflı) | Türkiye genelinde yüksek çözünürlüklü parsel/tarla uydu altlığı ve `World_Transportation` köy/karayolu ağı. **Doğrulandı** (5 Türkiye pilot bölgesinde HTTP 200). |
| `carto-voyager` | [CARTO Voyager & Labels Retina (@2x)](https://carto.com/attributions) | CARTO / OpenStreetMap | Zoom 19 doğal (@2x Retina) | ODbL 1.0 / CC BY 4.0 | Türkiye 81 il, ilçe, köy, mahalle ve ova etiketleri ile detaylı yol/yerleşim altlığı. **Doğrulandı**. |
| `opentopomap` | [OpenTopoMap](https://opentopomap.org) | OpenTopoMap / OSM / NASA SRTM | Zoom 17 doğal | CC BY-SA 3.0 | Türkiye eşyükselti eğrileri ve topografik kabartma haritası. **Doğrulandı**. |
| `tmo-trakya-turkseker-2025` | [TMO / Trakya Birlik / Türkşeker 2025–2026 Alım Fiyatları](https://www.tmo.gov.tr) | TMO, Trakya Birlik, Türkşeker, Ticaret Borsaları | Ülke geneli referans | Kamuya Açık Resmi Duyuru | 2025/2026 sezonu ürün alım fiyatları ve değişken maliyet referansları (Buğday, Arpa, Mısır, Ayçiçeği, Nohut, Mercimek, Şeker Pancarı, Kuru Fasulye, Pamuk). **Doğrulandı**. |
| `nasa-smap-l4` | [NASA SMAP L4 (`SPL4SMGP` v007)](https://smap.jpl.nasa.gov/) | NASA JPL / GMAO / NSIDC | 9 km EASE-Grid 2.0 (L4) / 36 km (L3) | US Public Domain | Yüzey (0–5 cm) ve kök bölgesi (0–100 cm) bölgesel toprak nemi ve parsel ölçek belirsizliği analizi. **Doğrulandı**. |
| `nasa-nex-gddp-cmip6` | [NASA NEX-GDDP-CMIP6](https://www.nccs.nasa.gov/data-collections/nex-gddp-cmip6/) | NASA NCCS / Ames (Thrasher vd. 2022) | 0.25° × 0.25° (~25 km) | CC0 1.0 Public Domain | 3 yıllık rotasyon sağlamlık testleri için `SSP2-4.5` ve `SSP5-8.5` koşullu iklim stres senaryoları (kısa vadeli hava tahmini olarak kullanılmaz). **Doğrulandı**. |
| `fao-aquacrop-v71` | [FAO AquaCrop v7.1 Parametreleri](https://www.fao.org/aquacrop/) | FAO (Raes vd. 2023) | Ürün ve iklim kuşağı | FAO Open Archive | Normalize su üretkenliği ($WP^*$: $\text{C}_3 = 15\text{--}18\text{ g/m}^2$, $\text{C}_4 = 33,7\text{ g/m}^2$), referans hasat indeksi ($HI_0$), kanopi büyüme/gerileme ($CGC$/$CDC$) ve su stresi eşikleri. **Doğrulandı**. |
| `tuik-bitkisel-2025` | [TÜİK Bitkisel Üretim İstatistikleri (2024–2025)](https://data.tuik.gov.tr/Kategori/GetKategori?p=Tarim-111) | Türkiye İstatistik Kurumu (TÜİK) | İl ve ülke geneli | Resmi İstatistik Açık Erişim | 2024 ve 2025 resmi üretim tonajları ve sulu/kuru referans verimler. **Doğrulandı**. |
| `mgm-iklim-normalleri-1991-2020` | [MGM 1991–2020 Resmi İl İklim Normalleri](https://www.mgm.gov.tr/veridegerlendirme/il-ve-ilceler-istatistik.aspx) | Meteoroloji Genel Müdürlüğü (MGM) | İl sinoptik istasyonları | Kamuya Açık Resmi İstatistik | Konya (325,3 mm), Ankara (413,6 mm), Şanlıurfa (450,5 mm), Edirne (625,2 mm) ve Adana (668,4 mm) uzun yıllar iklim normalleri. **Doğrulandı**. |

## 2. Agronomik, Hidrolojik ve İstatistiksel Literatür

- **FAO-56 (`fao56`):** Allen, R.G. vd. (1998). *Crop evapotranspiration*. FAO Irrigation and Drainage Paper 56. — Penman–Monteith $ET_0$ (Denklem 6–40), Hargreaves yedek (Denklem 52), tek $K_c$ günlük su dengesi (Bölüm 6–8).
- **FAO-33 (`fao33`) & FAO-66 (`fao66`):** Doorenbos & Kassam (1979); Steduto vd. (2012). *Crop yield response to water*. — Su kısıtı altında verim tepkisi: $1 - Y_a/Y_m = K_y(1 - ET_a/ET_c)$.
- **Saxton & Rawls (`saxton2006`):** Saxton, K.E., Rawls, W.J. (2006). *Soil water characteristic estimates by texture and organic matter for hydrologic solutions*. SSSAJ 70:1569–1578. — Pedotransfer denklemleri (Denklem 1–10).
- **USDA TR-55 (`tr55`) & Williams (1995):** Yüzey akışı eğri numaraları (SCS-CN) ve eğim düzeltmesi.
- **French & Schultz (1984):** Kuru tarım tahıllarda su kullanım etkinliği üst sınırı ($20\text{ kg/ha/mm} \times (ET_a - 110\text{ mm})$).
- **Angus vd. (2015), Kirkegaard vd. (2008), Ryan vd. (2008):** Ön bitki (pre-crop) verim çarpanları ve biyolojik azot kredisi yön/mertebe referansları.
- **Renard vd. (1997) & Renard & Freimund (1994):** RUSLE erozyon göstergesi ($A = R \cdot K \cdot LS \cdot C \cdot P$).
- **Mann (1945), Kendall (1975), Sen (1968):** Parametrik olmayan iklim eğilim testleri.
- **Zeleny (1973):** Çok amaçlı Pareto cephesi üzerinde uzlaşık çözüm (Pareto knee / compromise programming).
