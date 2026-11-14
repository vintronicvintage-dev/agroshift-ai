# AGROSHIFT AI — BİLİMSEL MODEL GİRDİ EŞLEŞTİRME BELGESİ (`MODEL_INPUT_MAPPING.md`)

Bu belge, AgroShift AI Bilimsel Veri Altyapısından (`weather_daily`, `soil_properties`, `vegetation_indices`, `soil_moisture_observations`, `crop_parameters`, `crop_yields`, `market_prices`, `production_costs`, `climate_scenarios`) gelen doğrulanmış verilerin, bilimsel hesaplama motorundaki ([src/lib/engine/](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/index.ts)) denklemlere nasıl bağlandığını gösterir.

---

## 1. Modül Bazlı Veri → Denklem Eşleştirme Tablosu

| Bilimsel Hesaplama Modülü | Kod Dosyası | Kullanılan Denklem / Standart | Girdi Değişkenleri ve Veri Kaynağı (`table.column`) | Doğrulama Durumu |
|---|---|---|---|---|
| **1. Referans Evapotranspirasyon ($ET_0$)** | [et0.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/et0.ts) | FAO-56 Penman–Monteith (Denklem 6) ve Hargreaves yedek (Denklem 52) | `weather_daily.t2m_max_c`, `t2m_min_c`, `t2m_mean_c`, `rh2m_pct`, `ws2m_ms`, `allsky_sfc_sw_dwn_mj` (NASA POWER) + `field_boundaries.elevation_mean_m`, `centroid_lat` (NASA SRTM) | **`Verified`** |
| **2. Katmanlı Toprak Hidroliği (TAW, $\theta_{FC}$, $\theta_{WP}$, $K_{sat}$)** | [soil.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/soil.ts) | Saxton & Rawls (2006) Denklem 1–10 + SoilGrids 6 katmanlı (0–200 cm) ağırlıklı toplam | `soil_properties.sand_pct`, `silt_pct`, `clay_pct`, `soc_g_kg`, `bdod_g_cm3`, `cfvo_vol_pct`, `theta_fc_m3m3`, `theta_wp_m3m3` (`user_lab` öncelikli, yoksa `soilgrids_v2`) | **`Verified`** *(Lab)* / **`Estimated`** *(SoilGrids)* |
| **3. Yüzey Akışı (Runoff) ve Erozyon (RUSLE)** | [soil.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/soil.ts), [indicators.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/indicators.ts) | USDA TR-55 SCS-CN + Williams (1995) eğim düzeltmesi; RUSLE $A = R \cdot K \cdot LS \cdot C \cdot P$ | `weather_daily.prectotcorr_mm`, `field_boundaries.slope_mean_pct` (NASA SRTM 30 m), `crop_parameters.cover` | **`Verified`** *(Yöntem)* / **`Estimated`** *(Gösterge)* |
| **4. Günlük Kök Bölgesi Su Dengesi ($\Delta D_r$)** | [waterBalance.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/waterBalance.ts) | FAO-56 Bölüm 7–8 ($K_c$, $K_s$, çıplak toprak buharlaşması $K_e$, derin süzülme $DP$) | `crop_parameters.kc_ini/mid/end`, `root_depth_max_m`, `depletion_fraction_p` + `irrigation_records.annual_budget_mm`, `application_efficiency` + `soil_moisture_observations.wetness_rootzone_0_1` (ilk pencere tohumlaması) | **`Verified`** |
| **5. Su Kısıtlı Verim Tepkisi ($Y_a / Y_m$) ve AquaCrop $WP^*$** | [waterBalance.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/waterBalance.ts), [aquacrop.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/data-infra/aquacrop.ts) | FAO-33/66 $1 - Y_a/Y_m = K_y(1 - ET_a/ET_c)$, French & Schultz (1984) tahıl su üretkenliği sınırı ve AquaCrop $B = WP^* \sum (Tr/ET_0)$ | `crop_parameters.yield_response_ky`, `aquacrop_wp_star_gm2`, `aquacrop_hi0_pct` + `crop_yields.yield_t_ha` (TÜİK sulu/kuru referans verimleri) | **`Verified`** |
| **6. Ön Bitki (Pre-Crop) ve Biyolojik Azot Kredisi** | [preCrop.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/crops/preCrop.ts) | Angus vd. (2015), Kirkegaard vd. (2008), Herridge vd. (2008) | Baklagil simbiyotik N fiksasyonu (`nFixationKgHa`), ürünle kaldırılan N (`nRemovalKgPerT`) ve 3 yıllık döngüsel geçiş matrisi | **`Estimated`** |
| **7. Ekonomik Brüt Marj ve Bakanlık Destekleri** | [evaluation.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/evaluation.ts), [turkishAgData.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/data-infra/turkishAgData.ts) | $\text{Brüt Kâr} = Y_a \cdot P_{\text{ürün}} - C_{\text{değişken}}(s) - I_{\text{brüt}} \cdot P_{\text{su}} + S_{\text{N kredisi}}$ | `market_prices.effective_price_tl_kg` (TMO / Trakya Birlik / Türkşeker / Borsa), `production_costs.var_cost_irrigated_tl_da`, `ministry_support_tl_da` | **`Verified`** *(Resmî Fiyatlar)* / **`Estimated`** *(Çiftlik Maliyeti)* |
| **8. İklim Stres Senaryoları ve Sağlamlık (Minimax Regret & CVaR20)** | [robust.ts](file:///c:/Users/omerm/Desktop/NASA%20Space%20Apps%20Challenge%202026%20-%20Kopya/agroshift/src/lib/engine/robust.ts) | Zeleny (1973) Pareto Knee, Minimax Regret ve %20 Koşullu Risk Değeri ($\text{CVaR}_{20}$) | `climate_scenarios.temp_delta_c`, `precip_multiplier` (NASA NEX-GDDP-CMIP6 `SSP2-4.5` ve `SSP5-8.5`) | **`Estimated`** |

---

## 2. Temel Bilimsel Formüller ve Veri Bağlantıları

### 2.1. FAO-56 Penman–Monteith Referans Evapotranspirasyon ($ET_0$)
$$ET_0 = \frac{0{,}408\,\Delta\,(R_n - G) + \gamma\,\frac{900}{T + 273}\,u_2\,(e_s - e_a)}{\Delta + \gamma\,(1 + 0{,}34\,u_2)}$$
- $T, T_{\max}, T_{\min}$: `weather_daily.t2m_mean_c`, `t2m_max_c`, `t2m_min_c` (°C, NASA POWER + SRTM rakım farkı düzeltmesi $-6{,}5\text{ }^\circ\text{C/km}$).
- $R_n$: `weather_daily.allsky_sfc_sw_dwn_mj` ($\text{MJ/m}^2\text{/gün}$) üzerinden hesaplanan net radyasyon.
- $u_2$: `weather_daily.ws2m_ms` ($\text{m/s}$).
- $e_s - e_a$: `weather_daily.rh2m_pct` (%) ve doygun buhar basıncı eğrisinden hesaplanan buhar basıncı açığı ($\text{kPa}$).

### 2.2. Toprak Öncelik Kuralı ve Kullanılabilir Su Kapasitesi ($TAW$)
$$TAW = 1000 \sum_{i=1}^{6} (\theta_{FC,i} - \theta_{WP,i}) \cdot (1 - \text{CFVO}_i) \cdot \Delta z_i$$
- **Öncelik Kuralı:** `soil_properties` tablosunda ilgili parsel için `data_origin = 'user_lab'` (`priority_rank = 1`) kaydı mevcutsa doğrudan laboratuvar değerleri kullanılır. Mevcut değilse `data_origin = 'soilgrids_v2'` (`priority_rank = 2`) katmanları kullanılır.
- **Fiziksel Tutarlılık Koruması:** Eğer bir SoilGrids katmanında bağımsız kantil regresyonu nedeniyle $\theta_{FC} \le \theta_{WP}$ veya $AWC < 0{,}05$ anomalisi tespit edilirse (ör. `sanliurfa-harran` 100–200 cm katmanı), bu katmanın doğrudan su tutma tahmini reddedilir (`thetaRetentionAnomalyFlagged = true`) ve aynı katmanın doğrulanmış tekstür (`sand`, `silt`, `clay`), organik karbon (`soc`) ve hacim ağırlığı (`bdod`) değerlerinden **Saxton & Rawls (2006)** pedotransfer denklemleriyle hesaplanır.

### 2.3. FAO-33/66 Su Stresi Altında Verim ve AquaCrop Biyokütle İlişkisi
$$1 - \frac{Y_a}{Y_m} = K_y \left(1 - \frac{ET_a}{ET_c}\right) \quad \text{ve} \quad B = WP^* \cdot \sum \left(\frac{Tr}{ET_0}\right)$$
- $Y_m$: `crop_yields` (TÜİK sulu referans verimi ile kuru tarım verim tavanı arasında sulama yoğunluğuna göre ölçeklenen potansiyel verim, $\text{t/ha}$).
- $K_y$: `crop_parameters.yield_response_ky` (FAO-33/66).
- $WP^*$: `crop_parameters.aquacrop_wp_star_gm2` ($\text{C}_3$ bitkilerde $15\text{--}18\text{ g/m}^2$, $\text{C}_4$ mısırda $33{,}7\text{ g/m}^2$).
