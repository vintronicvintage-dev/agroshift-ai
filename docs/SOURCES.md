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
