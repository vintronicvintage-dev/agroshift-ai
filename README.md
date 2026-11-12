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
src/lib/engine/      saf TypeScript hesap motoru (I/O yok, deterministik, testli)
src/lib/crops/       ürün veritabanı (kaynak ve güven etiketli), ekim takvimi, rotasyon kuralları
src/lib/data/        NASA POWER, MODIS, SoilGrids, IMERG istemcileri, önbellek, dönüştürücüler (sunucu)
src/app/api/         /api/climate, /api/soil, /api/ndvi
src/data/snapshots/  5 pilot bölgenin gömülü kopyaları (kaynak ve erişim tarihli)
src/lib/ui/          kalibrasyon, analiz worker'ı, durum yönetimi
src/app, src/components  arayüz (TR/EN), /yontem sayfası
scripts/             build-snapshots.ts, verify-snapshots.ts
```

Veri akışı: pilot bölge seçilirse gömülü kopya anında yüklenir, haritadan başka nokta seçilirse `/api/*` verileri çeker ve `.cache/` altında önbelleğe alır. Hesap tarayıcıdaki worker'da çalışır: günlük hava serisi, toprak ve kullanıcı girdileri motora verilir, motor rotasyon sonuçlarını, kanıtı ve gerekçeleri döndürür. Pilot bölgeler: Konya-Çumra, Şanlıurfa-Harran, Adana-Yüreğir, Edirne-Uzunköprü, Polatlı-Ankara.

## Kullanılan veri kaynakları

| Kaynak | Kullanım | URL |
|---|---|---|
| NASA POWER Daily (AG) | Sıcaklık, nem, rüzgâr, güneş radyasyonu, yağış, kök bölgesi nemi (MERRA-2/CERES tabanlı), 2001'den bugüne | https://power.larc.nasa.gov/docs/services/api/temporal/daily/ |
| MODIS Terra MOD13Q1 NDVI (NASA LP DAAC, ORNL DAAC web servisi) | 16 günlük, 250 m NDVI serisi; kalite süzgeci uygulanır | https://modis.ornl.gov/data/modis_webservice.html |
| NASA GIBS | Haritada NDVI katmanı (MODIS Terra, 16 günlük) | https://earthdata.nasa.gov/gibs |
| SoilGrids v2.0 (ISRIC, **NASA değil**) | 0–30 cm toprak dokusu, organik karbon, pH tahmini; ulaşılamazsa bölgesel varsayılan ve işaret | https://www.isric.org/explore/soilgrids |
| GPM IMERG (NASA GES DISC) | Aylık yağış çapraz kontrolü denendi, **tamamlanamadı** (aşağıya bakın) | https://gpm.nasa.gov/data/imerg |

Harita altlığı OpenStreetMap'tir. Her kaynağın erişim tarihi gömülü kopyalarda ve arayüzde kayıtlıdır.

## Yöntem özeti

- **ET₀:** FAO-56 Penman–Monteith (günlük), Hargreaves yedek ve çapraz kontrol (Allen vd. 1998).
- **Günlük su dengesi:** tek Kc yaklaşımı, evreye göre büyüyen kök derinliği, TAW/RAW ve Ks (FAO-56), toprak hidrolik özellikleri Saxton ve Rawls (2006), yüzey akışı SCS-CN (USDA TR-55). Yıllık sulama bütçesi ve sulama randımanı kullanıcı girdisidir. Sezonlar arası toprak nemi taşınır.
- **Verim tepkisi:** 1 − Ya/Ym = Ky (1 − ETa/ETc) (FAO-33, FAO-66).
- **Tarihsel yeniden oynatma:** her plan, kayıttaki her ardışık üç yıllık pencerede oynatılır; sonuç P10/P50/P90 dağılımıdır. Sentetik gürültü eklenmez.
- **Senaryolar:** yağış çarpanı, sıcaklık farkı (ET₀ yeniden hesaplanır, bağıl nem sabit tutulur), sulama bütçesi, fiyat çarpanı. Hazır ayarlar: Tipik, Kurak (yağış −%25), Sıcak ve kurak (+2 °C, yağış −%25).
- **Toprak sağlığı göstergesi:** ürün çeşitliliği, aile kırılması, baklagil, çıplak toprak, kök çeşitliliği, artık; ağırlıklar (20/20/20/20/10/10) sayfada görünür. Ölçüm değil göstergedir.
- **Optimizasyon:** aday ürünlerden tüm üç yıllık diziler numaralandırılır, sert kısıtlar (ekim takvimi, iklim uygunluğu, dışlanan ürünler, üst üste ekim sınırı) uygulanır, çok amaçlı puanla sıralanır, Pareto cephesi çıkarılır. Hızlı eleme sonrası adaylar gün gün yeniden oynatılır.
- **Eğilim:** yıllık yağış, ET₀, sıcak ve don günleri, kök bölgesi nemi için Mann–Kendall ve Sen eğimi (Mann 1945, Kendall 1975, Sen 1968).

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

License: to be decided by the team

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
src/lib/engine/      pure TypeScript calculation engine (no I/O, deterministic, tested)
src/lib/crops/       crop database (source and confidence labelled), calendar, rotation rules
src/lib/data/        NASA POWER, MODIS, SoilGrids, IMERG clients, cache, converters (server)
src/app/api/         /api/climate, /api/soil, /api/ndvi
src/data/snapshots/  bundled snapshots of 5 pilot regions (with source and retrieval date)
src/lib/ui/          calibration, analysis worker, state handling
src/app, src/components  UI (TR/EN), /yontem methods page
scripts/             build-snapshots.ts, verify-snapshots.ts
```

Data flow: a pilot region loads instantly from its bundled snapshot; any other map point is fetched by `/api/*` and cached under `.cache/`. The calculation runs in a browser worker: the daily weather series, soil and user inputs go into the engine, which returns rotation results, evidence and explanations. Pilot regions: Konya-Cumra, Sanliurfa-Harran, Adana-Yuregir, Edirne-Uzunkopru, Polatli-Ankara.

## Data sources used

| Source | Use | URL |
|---|---|---|
| NASA POWER Daily (AG) | Temperature, humidity, wind, solar radiation, precipitation, root-zone moisture (MERRA-2/CERES based), 2001 to present | https://power.larc.nasa.gov/docs/services/api/temporal/daily/ |
| MODIS Terra MOD13Q1 NDVI (NASA LP DAAC, via the ORNL DAAC web service) | 16-day, 250 m NDVI series with quality filtering | https://modis.ornl.gov/data/modis_webservice.html |
| NASA GIBS | NDVI map layer (MODIS Terra, 16-day) | https://earthdata.nasa.gov/gibs |
| SoilGrids v2.0 (ISRIC, **not NASA**) | 0–30 cm soil texture, organic carbon, pH estimate; a flagged regional default if unreachable | https://www.isric.org/explore/soilgrids |
| GPM IMERG (NASA GES DISC) | Monthly precipitation cross-check attempted, **not completed** (see below) | https://gpm.nasa.gov/data/imerg |

The base map is OpenStreetMap. Each source's retrieval date is recorded in the snapshots and shown in the interface.

## Method summary

- **ET₀:** FAO-56 Penman–Monteith (daily), with Hargreaves as fallback and cross-check (Allen et al. 1998).
- **Daily water balance:** single-Kc approach, root depth growing by stage, TAW/RAW and Ks (FAO-56), soil hydraulics from Saxton and Rawls (2006), runoff by SCS-CN (USDA TR-55). Annual irrigation budget and irrigation efficiency are user inputs. Soil moisture carries over between seasons.
- **Yield response:** 1 − Ya/Ym = Ky (1 − ETa/ETc) (FAO-33, FAO-66).
- **Historical replay:** each plan is replayed over every consecutive three-year window in the record; the result is a P10/P50/P90 distribution. No synthetic noise is added.
- **Scenarios:** rainfall multiplier, temperature offset (ET₀ recomputed, relative humidity held constant), irrigation budget, price multiplier. Presets: Typical, Dry (rain −25 %), Hot and dry (+2 °C, rain −25 %).
- **Soil-health indicator:** crop diversity, family break, legume, bare soil, root diversity, residue; the weights (20/20/20/20/10/10) are shown on the page. It is an indicator, not a measurement.
- **Optimizer:** all three-year sequences of the candidate crops are enumerated, hard constraints (sowing calendar, climate suitability, excluded crops, consecutive-planting limit) are applied, plans are ranked by a multi-objective score and a Pareto front is extracted. After a fast screening pass the candidates are replayed exactly day by day.
- **Trends:** Mann–Kendall and Sen slope for annual precipitation, ET₀, hot and frost days, and root-zone moisture (Mann 1945, Kendall 1975, Sen 1968).

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

License: to be decided by the team
