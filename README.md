# AgroShift AI

Türkçe | [English](#english)

## Nedir

AgroShift AI, bir çiftçinin önümüzdeki üç yıl için hangi ürünleri hangi sırayla ekeceğine karar verirken kullanabileceği bir karar destek aracıdır. NASA verisinden türetilen iklim kanıtıyla, mevcut rotasyonu ve en fazla üç alternatifi aynı tarlada yan yana karşılaştırır. Her plan için su açığı, sulama bütçesi aşımı, toprak sağlığı göstergesi ve senaryo etiketli brüt marj aralığı gösterilir. NASA Space Apps Challenge 2026 "Field Shift: Adapting Farms with NASA Data" görevi için geliştirildi. Araç karar vermez, çiftçinin ve yerel uzmanın yargısını destekler.

## Göreve nasıl yanıt veriyor

- **Üç ve daha fazla rotasyon karşılaştırması:** mevcut rotasyon, en fazla 3 çeşitli alternatif ve kullanıcının kurduğu planlar yan yana kartlarda gösterilir.
- **Her plan için:** neden önerildiği, dayandığı kanıt, olası faydalar, bilgi boşlukları ve yerel uzmana sorulacak riskler ("Neden bu plan?" bölümü). Metinler şablon ve gerçek sayılardan kural tabanlı üretilir.
- **Kanıt:** yağış ve ET₀ serileri, Mann–Kendall eğilimleri, kök bölgesi nemi, NDVI serisi ve her sayının kaynağı arayüzde görünür.
- **Karar desteği:** her ekranda "Karar sizin" notu bulunur. Ekonomik çıktılar senaryodur ve varsayımlar kullanıcı tarafından düzenlenebilir.

## Hızlı başlangıç

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run snapshots  # pilot bölge kopyalarını yeniden üretir (ağ gerekir)
```

İsteğe bağlı: IMERG çapraz kontrolü için `.env.local` dosyasına `EARTHDATA_TOKEN=...` yazılabilir. Token yalnızca ortam değişkeninden okunur, loglanmaz. Token olmadan veya çalışmazsa kontrol atlanır ve "doğrulanmadı" olarak kaydedilir.

## Mimari

```
src/lib/engine/      saf TypeScript hesap motoru (I/O yok, deterministik, 183 birim testiyle doğrulanmış)
src/lib/crops/       ürün veritabanı (kaynak ve güven etiketli), ekim takvimi, rotasyon ve ön-ürün N kuralları
src/lib/data/        NASA POWER, MODIS (MOD13Q1 & MOD16A2), SoilGrids, SRTM, ERA5-Land, IMERG istemcileri
src/app/api/         /api/climate, /api/soil, /api/ndvi, /api/tiles (yerel karo vekili ve önbellek)
src/data/snapshots/  5 pilot bölgenin gömülü kopyaları (kaynak ve erişim tarihli) + MOD16 uydu doğrulaması
src/lib/ui/          kalibrasyon, analiz worker'ı, durum yönetimi, oturum ve paylaşılabilir URL durumu
src/app, src/components  arayüz (TR/EN), /yontem sayfası, çevrimdışı Türkiye vektör haritası
scripts/             build-snapshots.ts, verify-snapshots.ts
```

Veri akışı: pilot bölge seçilirse gömülü kopya anında yüklenir, haritadan başka nokta seçilirse `/api/*` verileri çeker ve `.cache/` altında önbelleğe alır. Hesap tarayıcıdaki worker'da çalışır: günlük hava serisi, toprak ve kullanıcı girdileri motora verilir, motor rotasyon sonuçlarını, kanıtı ve gerekçeleri döndürür. Pilot bölgeler: Konya-Çumra, Şanlıurfa-Harran, Adana-Yüreğir, Edirne-Uzunköprü, Polatlı-Ankara.

## Kullanılan veri kaynakları

| Kaynak | Kullanım | URL |
|---|---|---|
| NASA POWER Daily (AG) | Sıcaklık, nem, rüzgâr, güneş radyasyonu, yağış (`PRECTOTCORR`), kök bölgesi ve yüzey toprak nemi (`GWETROOT`, `GWETTOP`, MERRA-2/CERES tabanlı), 2001'den bugüne | https://power.larc.nasa.gov/docs/services/api/temporal/daily/ |
| MODIS Terra MOD13Q1 NDVI (NASA LP DAAC, ORNL DAAC web servisi) | 16 günlük, 250 m NDVI serisi; kalite süzgeci uygulanır | https://modis.ornl.gov/data/modis_webservice.html |
| MODIS Terra MOD16A2 ET_a (NASA LP DAAC / ORNL DAAC) | 8 günlük, 500 m gerçek evapotranspirasyon; 5 pilot havzada FAO-56 su dengesi motorunun bağımsız uydu çapraz doğrulaması | https://modis.ornl.gov/data/modis_webservice.html |
| NASA GIBS & SRTM (Open-Elevation / Open-Meteo DEM) | Haritada MODIS Terra NDVI ve Blue Marble katmanları; arazi rakımı, eğim (%) ve sıcaklık lapse-rate düzeltmesi | https://earthdata.nasa.gov/gibs |
| SoilGrids v2.0 (ISRIC, **NASA değil**) | 0–200 cm (6 katman) toprak dokusu, organik karbon, pH, hacim ağırlığı ve kaba parça tahmini; ulaşılamazsa bölgesel varsayılan ve işaret | https://www.isric.org/explore/soilgrids |
| GPM IMERG & ERA5-Land | Yağış çapraz kontrolü ve çoklu kaynak duyarlılık analizi (`precipUncertainty`) | https://gpm.nasa.gov/data/imerg |

Harita altlığı OpenStreetMap, NASA GIBS Blue Marble ve ağ kesintilerine dayanıklı gömülü Türkiye vektör katmanıdır (`/api/tiles` yerel önbellekli). Her kaynağın erişim tarihi gömülü kopyalarda ve arayüzde kayıtlıdır.

## Yöntem özeti

- **ET₀:** FAO-56 Penman–Monteith (günlük), Hargreaves yedek ve çapraz kontrol (Allen vd. 1998).
- **Günlük çift katmanlı su dengesi, derece-gün kar modülü ve dinamik $\theta_0$:** FAO-56 çift $K_c$ ($K_{cb} + K_e$, Tablo 12 & Eş. 71), evreye göre büyüyen kök derinliği, TAW/RAW ve $K_s$, toprak hidrolik özellikleri Saxton ve Rawls (2006) (6 katmanlı profil veya üst toprak), yüzey akışı SCS-CN (USDA TR-55). Günlük $T_{\text{mean}} < 0\ ^\circ\text{C}$ olduğunda yağış kar örtüsü ($\text{SWE}$, mm) olarak birikir; $T_{\text{mean}} > 0\ ^\circ\text{C}$ olduğunda derece-gün katsayısı ($C_m = 2{,}8\text{ mm/}^\circ\text{C/gün}$, USDA-NRCS NEH Part 630 Ch. 11) ile eriyerek sızma ve yüzey akışı dengesine katılır. Simülasyonun 1. günündeki başlangıç toprak nemi ($\theta_0$), önceki 60 günlük NASA POWER yağış–$\text{ET}_0$ su bilançosundan ve NASA SMAP/MERRA-2 `GWETROOT` katmanından dinamik olarak (`derived` / `literature` etiketli) türetilir. Sezonlar arası toprak nemi ve kar örtüsü $\pm 0{,}01\text{ mm}$ kütle korunumuyla taşınır.
- **Verim tepkisi ve ön-ürün etkisi:** FAO-33/66 evre çarpanlı su stresi $\prod (1 - K_{y,s}(1 - \text{ET}_{a,s}/\text{ET}_{c,s}))$, French ve Schultz (1984) / Sadras ve Angus (2006) terleme su verimliliği üst sınırı ve önceki ürün (baklagil biyolojik N kredisi / allelopati) çarpanı.
- **Toprak örtüsü, azot bilançosu ve RUSLE erozyon göstergesi:** yıllık örtülü/çıplak gün sayısı, baklagil biyolojik N fiksasyonu ve hasatla çıkan N dengesi, RUSLE toprak kaybı göstergesi ($A = R \cdot K \cdot LS \cdot C \cdot P$, Renard vd. 1997).
- **Tarihsel yeniden oynatma:** her plan, kayıttaki her ardışık üç yıllık pencerede oynatılır; sonuç P10/P50/P90 ve $\text{CVaR}_{20}$ dağılımıdır. Sentetik gürültü eklenmez.
- **Senaryolar ve iklim sağlamlığı:** yağış çarpanı, sıcaklık farkı ($\text{ET}_0$ yeniden hesaplanır), sulama bütçesi, fiyat çarpanı. Hazır ayarlar: Tipik, Kurak (yağış −%25), Sıcak ve kurak (+2 °C, yağış −%25). Senaryolar arası en az pişmanlık (*minimax regret*) ve $\pm\%20$ parametre duyarlılık taraması (`stabilityPct`) hesaplanır.
- **Toprak sağlığı göstergesi:** ürün çeşitliliği, aile kırılması, baklagil, çıplak toprak, kök çeşitliliği, artık; ağırlıklar (20/20/20/20/10/10) sayfada görünür. Ölçüm değil göstergedir.
- **Optimizasyon:** aday ürünlerden tüm üç yıllık diziler numaralandırılır, sert kısıtlar (ekim takvimi, iklim uygunluğu, dışlanan ürünler, üst üste ekim sınırı) uygulanır, çok amaçlı puanla sıralanır, Pareto cephesi ve diz noktası (*knee point*) çıkarılır. Hızlı eleme sonrası adaylar gün gün yeniden oynatılır.
- **Eğilim:** yıllık yağış, $\text{ET}_0$, sıcak ve don günleri, kök bölgesi nemi için Mann–Kendall ve Sen eğimi (Mann 1945, Kendall 1975, Sen 1968).

Ayrıntılı atıflar uygulamadaki `/yontem` sayfasındadır.

## Doğrulama

`npm test` şunları denetler: FAO-56 Örnek 2, 3, 5, 8, 9, 11, 17 ara değerleri ve Örnek 18 (Brüksel) ET₀ ≈ 3,9 mm/gün; Saxton ve Rawls tablosu, USDA doku sınıfları, SCS-CN; su dengesi kütle korunumu (±0,01 mm); tek yönlülük (yağış azalınca açık azalmaz, bütçe düşünce karşılanamayan açık azalmaz, ısınınca ET₀ azalmaz); sıfır bütçe ve bütçeyi aşan planlar; eksik verinin uydurulmaması ve boşlukların raporlanması; optimizasyon kısıtları ve Pareto cephesinin baskın olmayan yapısı; hızlı elemenin tam oynatmaya yakınlığı; Mann–Kendall bilinen seriler; belirlilik (aynı girdi, aynı çıktı); veri dönüştürücüleri (-999 → null, birim denetimi, kalite süzgeci); gömülü kopya sıkıştırma ve yükleme; yağış kalibrasyonu.

## Bilinen sınırlar

- **POWER yağışı Konya-Çumra'da yüksek.** Gömülü kopyada ortalama yaklaşık 551 mm/yıl; bölgenin istasyon iklimatolojisi kabaca 320 mm civarındadır. NASA POWER hücre ölçekli bir model/uydu tahminidir. Arayüz, kalibre edilmemiş yağış için uyarı gösterir ve isteğe bağlı bir **istasyon ortalaması** girdisi sunar: günlük yağış, istasyon ortalaması / POWER tam yıl ortalaması oranında tek bir çarpanla ölçeklenir. Yağışlı gün düzeni ve yıllar arası yayılım korunur, yalnızca düzey düzeltilir. Bu, yerel ölçüm yerine geçmez; istasyon değeri kullanıcıdan gelir.
- **Fiyat, maliyet ve referans verimler varsayımdır.** Ürün veritabanındaki her alan `literature` veya `assumption` olarak etiketlidir; ekonomik çıktılar senaryodur ve kesin kâr tahmini değildir.
- **IMERG doğrulaması tamamlanmadı.** Beş pilot kopyanın tümünde durum "not_validated": GES DISC sunucusuna bağlantı zaman aşımına uğradı. Arayüz bunu "yapılmadı" olarak belirtir. POWER yağışı bağımsız bir uydu ürünüyle çapraz kontrol edilmedi.
- NDVI tek bir 250 m piksele dayanır, tarla sınırını temsil etmeyebilir.
- Toprak değerleri SoilGrids tahminidir; laboratuvar analizi girilmelidir.
- Toprak sağlığı puanı, azot katkısı ve risk bileşenleri kural tabanlı göstergelerdir.
- Hastalık, zararlı, pazar ve kayıt dışı yerel koşullar modellenmez; yerel ziraat uzmanı incelemesi gerekir.

## Yapay zekâ kullanım beyanı

Bu projenin kodu ve belgeleri, ekibin yönlendirmesi ve denetimi altında yapay zekâ kodlama asistanlarıyla (Anthropic Claude modelleri) yazıldı. Ürünün kendisi üretken yapay zekâ modeli içermez; tüm çıktılar deterministik hesaplardır ve gerekçe metinleri şablon ve gerçek sayılardan üretilir.

## Lisans

MIT License (MIT Lisansı)

---

<a id="english"></a>

# AgroShift AI (English)

[Türkçe](#agroshift-ai)

## What it is

AgroShift AI is a decision-support tool for a farmer choosing which crops to plant, and in what order, over the next three years. Using climate evidence derived from NASA data, it compares the current rotation and up to three alternatives on the same field. For each plan it shows water deficit, irrigation budget overrun, a soil-health indicator and a scenario-labelled gross-margin range. It was built for the NASA Space Apps Challenge 2026 "Field Shift: Adapting Farms with NASA Data". It does not make the decision; it supports the farmer's and the local expert's judgment.

## How it answers the challenge

- **Three or more rotations compared:** the current rotation, up to 3 diverse alternatives and any plans the user builds are shown side by side.
- **For every plan:** why it is suggested, the evidence behind it, possible benefits, information gaps and risks for local review (the "Why this plan?" section). The text is rule-based, built from templates and real numbers.
- **Evidence:** precipitation and ET₀ series, Mann–Kendall trends, root-zone moisture, the NDVI series and the source of every number are visible in the interface.
- **Decision support:** every screen carries a "the decision is yours" note. Economic outputs are scenarios and the assumptions are editable.

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # vitest
npm run snapshots  # rebuild the pilot-region snapshots (needs network)
```

Optional: put `EARTHDATA_TOKEN=...` in `.env.local` to enable the IMERG cross-check. The token is read only from the environment and is never logged. Without a working token the check is skipped and recorded as not validated.

## Architecture

```
src/lib/engine/      pure TypeScript calculation engine (no I/O, deterministic, verified by 183 unit tests)
src/lib/crops/       crop database (source and confidence labelled), calendar, rotation & pre-crop N rules
src/lib/data/        NASA POWER, MODIS (MOD13Q1 & MOD16A2), SoilGrids, SRTM, ERA5-Land, IMERG clients
src/app/api/         /api/climate, /api/soil, /api/ndvi, /api/tiles (local tile proxy & disk cache)
src/data/snapshots/  bundled snapshots of 5 pilot regions + MOD16 satellite cross-validation
src/lib/ui/          calibration, analysis worker, state handling, session & shareable URL state
src/app, src/components  UI (TR/EN), /yontem methods page, offline-resilient Türkiye vector map
scripts/             build-snapshots.ts, verify-snapshots.ts
```

Data flow: a pilot region loads instantly from its bundled snapshot; any other map point is fetched by `/api/*` and cached under `.cache/`. The calculation runs in a browser worker: the daily weather series, soil and user inputs go into the engine, which returns rotation results, evidence and explanations. Pilot regions: Konya-Cumra, Sanliurfa-Harran, Adana-Yuregir, Edirne-Uzunkopru, Polatli-Ankara.

## Data sources used

| Source | Use | URL |
|---|---|---|
| NASA POWER Daily (AG) | Temperature, humidity, wind, solar radiation, precipitation (`PRECTOTCORR`), root-zone and surface soil moisture (`GWETROOT`, `GWETTOP`, MERRA-2/CERES based), 2001 to present | https://power.larc.nasa.gov/docs/services/api/temporal/daily/ |
| MODIS Terra MOD13Q1 NDVI (NASA LP DAAC, via the ORNL DAAC web service) | 16-day, 250 m NDVI series with quality filtering | https://modis.ornl.gov/data/modis_webservice.html |
| MODIS Terra MOD16A2 ET_a (NASA LP DAAC / ORNL DAAC) | 8-day, 500 m actual evapotranspiration; independent satellite cross-validation of the FAO-56 water balance engine across all 5 pilot basins | https://modis.ornl.gov/data/modis_webservice.html |
| NASA GIBS & SRTM (Open-Elevation / Open-Meteo DEM) | MODIS Terra NDVI and Blue Marble map layers; terrain elevation, slope (%) and temperature lapse-rate adjustment | https://earthdata.nasa.gov/gibs |
| SoilGrids v2.0 (ISRIC, **not NASA**) | 0–200 cm (6-layer) soil texture, organic carbon, pH, bulk density and coarse fragments; a flagged regional default if unreachable | https://www.isric.org/explore/soilgrids |
| GPM IMERG & ERA5-Land | Rainfall cross-check and multi-source sensitivity analysis (`precipUncertainty`) | https://gpm.nasa.gov/data/imerg |

The base map combines OpenStreetMap, NASA GIBS Blue Marble, and an offline-resilient embedded Türkiye vector layer (`/api/tiles` with local disk caching). Each source's retrieval date is recorded in the snapshots and shown in the interface.

## Method summary

- **ET₀:** FAO-56 Penman–Monteith (daily), with Hargreaves as fallback and cross-check (Allen et al. 1998).
- **Daily dual-bucket water balance, degree-day snow module & dynamic $\theta_0$:** FAO-56 dual-$K_c$ ($K_{cb} + K_e$, Table 12 & Eq. 71), root depth growing by stage, TAW/RAW and $K_s$ (FAO-56), soil hydraulics from Saxton and Rawls (2006) (6-layer profile or topsoil), runoff by SCS-CN (USDA TR-55). When daily $T_{\text{mean}} < 0\ ^\circ\text{C}$, precipitation accumulates as snow water equivalent ($\text{SWE}$, mm); when $T_{\text{mean}} > 0\ ^\circ\text{C}$, snow melts via a degree-day factor ($C_m = 2.8\text{ mm/}^\circ\text{C/day}$, USDA-NRCS NEH Part 630 Ch. 11) and enters infiltration and runoff. Day-1 initial soil moisture ($\theta_0$) is dynamically derived (`derived` / `literature` labelled) from the preceding 60-day NASA POWER precipitation–$\text{ET}_0$ water balance and NASA SMAP/MERRA-2 `GWETROOT`. Soil moisture and snowpack carry over between seasons with $\pm 0.01\text{ mm}$ mass conservation.
- **Yield response & pre-crop effect:** stage-multiplicative FAO-33/66 water stress $\prod (1 - K_{y,s}(1 - \text{ET}_{a,s}/\text{ET}_{c,s}))$, French and Schultz (1984) / Sadras and Angus (2006) transpiration water-productivity ceiling, and pre-crop multiplier (legume biological N credit / allelopathy).
- **Soil cover, nitrogen balance & RUSLE erosion indicator:** annual covered/bare days, legume biological N fixation vs. harvest N removal, and RUSLE soil-loss indicator ($A = R \cdot K \cdot LS \cdot C \cdot P$, Renard et al. 1997).
- **Historical replay:** each plan is replayed over every consecutive three-year window in the record; the result is a P10/P50/P90 and $\text{CVaR}_{20}$ distribution. No synthetic noise is added.
- **Scenarios & climate robustness:** rainfall multiplier, temperature offset ($\text{ET}_0$ recomputed, relative humidity held constant), irrigation budget, price multiplier. Presets: Typical, Dry (rain −25 %), Hot and dry (+2 °C, rain −25 %). Cross-scenario minimax regret and a $\pm 20\%$ parameter sensitivity sweep (`stabilityPct`) are computed.
- **Soil-health indicator:** crop diversity, family break, legume, bare soil, root diversity, residue; the weights (20/20/20/20/10/10) are shown on the page. It is an indicator, not a measurement.
- **Optimizer:** all three-year sequences of the candidate crops are enumerated, hard constraints (sowing calendar, climate suitability, excluded crops, consecutive-planting limit) are applied, plans are ranked by a multi-objective score and a Pareto front + knee point are extracted. After a fast screening pass the candidates are replayed exactly day by day.
- **Trends:** Mann–Kendall and Sen slope for annual precipitation, $\text{ET}_0$, hot and frost days, and root-zone moisture (Mann 1945, Kendall 1975, Sen 1968).

Full citations are on the `/yontem` page in the app.

## Validation

`npm test` checks: FAO-56 Examples 2, 3, 5, 8, 9, 11, the Example 17 intermediates and Example 18 (Brussels) ET₀ of about 3.9 mm/day; the Saxton and Rawls reference, USDA texture classes, SCS-CN; water-balance mass conservation (±0.01 mm); monotonicity (less rain never lowers the deficit, a smaller budget never lowers the unmet deficit, warming never lowers ET₀); zero budget and plans that exceed the budget; missing data is never invented and gaps are reported; optimizer constraints and a non-dominated Pareto front; closeness of the fast screening to the exact replay; Mann–Kendall on known series; determinism (same input, same output); data converters (-999 to null, unit checks, quality filter); snapshot compression and loading; rainfall calibration.

## Known limitations

- **POWER precipitation is high at Konya-Cumra.** The bundled snapshot averages about 551 mm/yr, while the station climatology there is roughly 320 mm. NASA POWER is a cell-scale model/satellite estimate. The interface warns about uncalibrated rainfall and offers an optional **station mean** input: daily precipitation is scaled by one factor, station mean / POWER complete-year mean. The wet-day pattern and year-to-year spread are kept; only the level is corrected. This does not replace a local measurement; the station value comes from the user.
- **Prices, costs and reference yields are assumptions.** Every field in the crop database is labelled `literature` or `assumption`; economic outputs are scenarios, not profit forecasts.
- **IMERG validation was not completed.** All five pilot snapshots record "not_validated" because the connection to the GES DISC server timed out. The interface states this as not done. POWER precipitation has not been cross-checked against an independent satellite product.
- NDVI comes from a single 250 m pixel and may not represent the field boundary.
- Soil values are SoilGrids estimates; a laboratory analysis should be entered.
- The soil-health score, nitrogen contribution and risk components are rule-based indicators.
- Disease, pests, markets and unrecorded local conditions are not modelled; local agronomist review is required.

## AI-use disclosure

The code and documentation of this project were written with AI coding assistants (Anthropic Claude models) under the team's direction and review. The product itself contains no generative AI model; all outputs are deterministic calculations and the reasoning text is built from templates and real numbers.

## License

MIT License
