# AGROSHIFT AI — VERİ KALİTESİ, ANOMALİ TESPİTİ VE BELİRSİZLİK RAPORU (`DATA_QUALITY_REPORT.md`)

Bu rapor, AgroShift AI Bilimsel Veri Altyapısının gerçek veri setleri üzerinde çalıştırılan otomatik doğrulama kurallarını, tespit edilen gerçek veri anomalilerini ve uzamsal çözünürlük belirsizliklerini belgeler.

---

## 1. Otomatik Veri Kalitesi Doğrulama Kuralları (`src/lib/data-infra/quality.ts` & `data_pipeline/validators.py`)

| Kontrol Kodu | Veri Alanı | Doğrulama Kuralı | Başarısızlık / Anomali Durumunda Sistem Davranışı |
|---|---|---|---|
| `QC-CLIM-01` | Meteoroloji (NASA POWER) | `-999`, `-99`, `-9999` ve `NaN` eksik değer (*sentinel*) taraması | Değer `null` yapılır; sondaki tamamı boş günler kırpılır; $\le 3$ günlük iç boşluklar doğrusal enterpolasyonla doldurulup `interpolatedDays` sayacına yazılır. |
| `QC-CLIM-02` | Meteoroloji (Birimler) | `ALLSKY_SFC_SW_DWN` biriminin `MJ/m^2/day` veya `kWh/m^2/day` olduğunun yanıt başlığından kontrolü | `kWh/m^2/day` gelirse $\times 3{,}6$ ile dönüştürülür; tanımsız birim gelirse hata fırlatılır (sessizce geçilmez). |
| `QC-CLIM-03` | Meteoroloji (Fiziksel Sınırlar) | $-60 \le T_{\min} \le T_{\text{mean}} \le T_{\max} \le 60\text{ }^\circ\text{C}$, $0 \le RH \le 100\%$, $0 \le P \le 600\text{ mm/gün}$, $0 \le R_s \le 45\text{ MJ/m}^2\text{/gün}$ | Fiziksel sınır dışı değerler `physicalBoundViolations` listesine kaydedilir ve kalite bayrağı `suspect` olarak işaretlenir. |
| `QC-SOIL-01` | Toprak (SoilGrids / Lab) | Tekstür kapanım kontrolü: $94\% \le \text{Kum} + \text{Silt} + \text{Kil} \le 106\%$ ve $3{,}2 \le \text{pH} \le 10{,}5$ | USDA tekstür üçgeni sınıflandırması öncesi %100'e normalize edilir; pH sınırları ürün toleranslarıyla karşılaştırılır. |
| `QC-SOIL-02` | Toprak (Su Tutma Anomalisi) | Her derinlik katmanında tarla kapasitesi $\theta_{FC}$ (`wv0033`) > solma noktası $\theta_{WP}$ (`wv1500`) kontrolü | $\theta_{FC} \le \theta_{WP}$ tespit edilirse `thetaRetentionAnomalyFlagged = true` işaretlenir ve o katman otomatik olarak Saxton & Rawls (2006) pedotransfer denklemine yönlendirilir. |
| `QC-MODIS-01` | Bitki Örtüsü (MODIS `MOD13Q1`) | `250m_16_days_pixel_reliability` kalite bayrağı ve `[-0.2, 1.0]` aralığı | Yalnızca `Rank 0` (*Good*) ve `Rank 1` (*Marginal*) kabul edilir; `Rank 2` (*Snow/Ice*), `Rank 3` (*Cloudy*) ve `-3000` (*Fill*) elenir. |
| `QC-GEO-01` | Geometri (`Polygon` / `MultiPolygon`) | `WGS84 (EPSG:4326)` koordinat sınırları, kendi kendini kesmeme (*non-self-intersecting*) ve alan sınırları ($0{,}1\text{--}5000\text{ ha}$) | Geçersiz poligonlar HTTP 422 (`GeometryError`) ile reddedilir; geçerli poligonlar için sensör piksel örtüşme oranı (`SpatialResolutionCheck`) hesaplanır. |

---

## 2. Gerçek Verilerde Tespit Edilen Bilimsel Anomaliler ve Çözümleri

### 2.1. Şanlıurfa–Harran 100–200 cm Katmanında SoilGrids `wv0033 / wv1500` Terslik Anomalisi
- **Bulgular:** `src/data/snapshots/sanliurfa-harran.json` içerisindeki gerçek ISRIC SoilGrids v2.0 verisinde, `100-200cm` derinlik katmanı için `thetaFC` (`wv0033`) = **`0.305` $\text{m}^3/\text{m}^3$**, buna karşılık `thetaWP` (`wv1500`) = **`0.306` $\text{m}^3/\text{m}^3$** olarak gelmektedir ($\theta_{FC} < \theta_{WP}$).
- **Bilimsel Nedeni:** ISRIC SoilGrids v2.0, `wv0033` ve `wv1500` değişkenlerini birbirinden bağımsız Kantil Rastgele Orman (*Quantile Random Forest*) modelleriyle tahmin eder. Harran Ovası gibi derin ağır killi (*Vertic Calcisols*) profillerde iki bağımsız modelin tahmin eğrileri 100–200 cm derinlikte kesişebilmektedir.
- **Uygulanan Mühendislik Çözümü:** Hem Python (`data_pipeline/validators.py`) hem TypeScript (`src/lib/data-infra/quality.ts` ve `src/lib/engine/soil.ts`) doğrulayıcılarımız bu fiziksel çelişkiyi yakalar (`thetaRetentionAnomalyFlagged: true`), bozuk su tutma çiftini devre dışı bırakır ve aynı katmanın geçerli tekstür (%24,4 kum, %33,8 silt, %41,8 kil) ve hacim ağırlığı ($1{,}46\text{ g/cm}^3$) değerlerinden Saxton & Rawls (2006) denklemiyle fiziksel olarak tutarlı $\theta_{FC}$ ve $\theta_{WP}$ üretir.

### 2.2. NASA POWER vs. ECMWF ERA5 vs. MGM 1991–2020 Yağış Farklılıkları
- **Bulgular:** İç Anadolu'da (ör. Konya–Çumra) NASA POWER (MERRA-2 düzeltmeli) uzun yıllar ortalaması, ECMWF ERA5 yeniden analiz ürünü ve MGM Konya sinoptik istasyon normali ($325{,}3\text{ mm/yıl}$) arasında %10–%22 arasında sistematik farklar bulunmaktadır.
- **Uygulanan Mühendislik Çözümü:** Sistem tek bir yağış kaynağını "mutlak gerçek" kabul etmez. `PrecipCrossCheck` modülü 25 tam yıl boyunca her iki yağış serisini karşılaştırır, önerilen ilk 3 ürün rotasyonunun alternatif yağış kaynağı altında değişip değişmediğini (`rainSource.inTop3`) test eder ve sonucu güven derecesine (`PlanConfidence`: `A–D`) yansıtır.

---

## 3. Uzamsal Çözünürlük ve Ölçek Uyumu Analizi (300 Dekar = 30 Hektar Örnek Parsel)

| Veri Kaynağı | Piksel Boyutu | 1 Piksel Alanı (ha) | 30 ha Parsel / Piksel Oranı | Ölçek Sınıfı (`adequacy`) | Bilimsel Kullanım Kuralı |
|---|---|---|---|---|---|
| **NASA SRTM v3.0 DEM** | 30 m × 30 m | $0{,}09\text{ ha}$ | **$333{,}3\times$** | `parcel_resolved` | Parsel içi eğim ve bakı farklarını doğrudan çözer. |
| **NASA MODIS `MOD13Q1`** | 250 m × 250 m | $6{,}25\text{ ha}$ | **$4{,}8\times$** | `parcel_resolved` | 30 ha parsel ~5 MODIS pikselini kapsar; 6 ha altı parsellerde komşu parsel karışımı (*mixed-pixel*) uyarısı verilir. |
| **ISRIC SoilGrids v2.0** | 250 m × 250 m | $6{,}25\text{ ha}$ | **$4{,}8\times$** | `parcel_resolved` | Bölgesel dijital toprak haritası tahminidir (`Estimated`); laboratuvar analizi (`user_lab`) girildiğinde devre dışı kalır. |
| **NASA SMAP L4 (`SPL4SMGP`)** | 9 km × 9 km | $8.100\text{ ha}$ | **$0{,}0037\times$** | `regional_grid_proxy` | **Parsel içi sensör değildir (`isParcelScaleSensor = false`).** Bölgesel kök bölgesi nem anomalisi için kullanılır. |
| **NASA GPM IMERG V07B** | 10 km × 10 km | $10.000\text{ ha}$ | **$0{,}0030\times$** | `regional_grid_proxy` | Bölgesel uydu yağış ızgarasıdır. |
| **NASA NEX-GDDP-CMIP6** | 25 km × 25 km | $62.500\text{ ha}$ | **$0{,}00048\times$** | `regional_grid_proxy` | Yalnızca koşullu iklim stres senaryosu ($\Delta T$, yağış çarpanı) üretmek için kullanılır. |
| **NASA POWER Daily** | ~50 km × 62 km | ~$250.000\text{ ha}$ | **$0{,}00012\times$** | `regional_grid_proxy` | Bölgesel sinoptik meteorolojik zorlama (*forcing*) sağlar; parsel rakımına göre sıcaklık lapse-rate ($-6{,}5\text{ }^\circ\text{C/km}$) ile düzeltilir. |
