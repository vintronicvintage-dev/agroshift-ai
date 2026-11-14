# Mimari Karar Kayıtları (`DECISIONS.md`)

Bu belge, AgroShift AI'ın mühendislik derinleştirme sürecinde alınan kritik mimari kararları, değerlendirilen alternatifleri ve gerekçelerini kayıt altına alır.

## ADR-001: İki Katmanlı `AnalysisContext` Önbelleklemesi (Plan-Bağımsız vs. Plan-Bağımlı Durum)
- **Bağlam:** `src/lib/engine/context.ts` içindeki `inputKey(input)` fonksiyonu `options.extraPlans` ve `options.shortlistSize` değerlerini anahtara dahil ediyordu. Kullanıcı kendi rotasyonunu karşılaştırma listesine eklediğinde (`extraPlans` değişimi) 9.444 günlük iklim hazırlığı, toprak hidroliği ve su dengesi kurulumu (`buildContext`) baştan çalışıyordu. Ayrıca `evaluateCustomPlan` çağrısında `input` nesnesi içinde `options.extraPlans` farklıysa `getContext(input)` mevcut sıcak bağlamı (`scoreItems` dahil) kaçırıp yeni bir soğuk bağlam üretiyordu.
- **Seçenekler:**
  1. Mevcut tek katmanlı `inputKey` yapısını korumak.
  2. `inputKey` fonksiyonunu yalnızca fiziksel/ekonomik ortam parametrelerine (`field`, `scenario`, `economics`, `precipAdjustment`, `precipCheck`, `options.maxFallowYears`) bağlamak; böylece aynı ortamda `analyze` tarafından ısıtılan `ctx.scoreItems` ve `ctx.current` referanslarının `evaluateCustomPlan` ve sonraki `extraPlans` güncellemeleri tarafından %100 paylaşılmasını sağlamak.
- **Karar:** Seçenek 2.
- **Gerekçe:** Fiziksel ortam (`PreparedClimate`, `SoilHydraulics`, `EngineSetup`, `EvalContext`, `landUse`) kullanıcının eklediği özel planlardan (`extraPlans`) tamamen bağımsızdır. Anahtarın ortam parametrelerine indirgenmesi hem gereksiz yeniden hesaplamayı sıfırlar hem de `evaluateCustomPlan` ile `analyze` arasında `scoreItems` paylaşımını garanti eder.

## ADR-002: Web Worker Üzerinden `evaluateCustomPlan` ve Ana İş Parçacığı Senkronizasyonu
- **Bağlam:** `FieldData.tsx` ana analizi (`analyze`) Web Worker'da (`analyze.worker.ts`) çalıştırırken, `Builder.tsx` içindeki `evaluateCustomPlan` ana iş parçacığında (main thread) çalışıyordu. Worker ayrı bir bellek izolesinde (V8 isolate) çalıştığı için Worker içindeki `ctx.scoreItems` ana iş parçacığında `null` kalıyor, bu da hem ilk çağrıda ~500 ms ana iş parçacığı blokajına hem de özel planın bileşik puanının (`score.composite`) tüm `exactSet` yerine yalnız mevcut rotasyona karşı normalize edilmesine yol açıyordu.
- **Seçenekler:**
  1. `evaluateCustomPlan` çağrısını ana iş parçacığında bırakıp `scoreItems` metriklerini Worker'dan kopyalamak.
  2. Hem `context.ts` içinde referans kümesi senkronizasyonunu sağlamak hem de `analyze.worker.ts` / `analysisProtocol.ts` protokolüne `custom` değerlendirme mesajı ekleyerek veya `AnalysisResult` içinden sıcak referans metriklerini (`exactSet` özetini) aktararak deterministik skor eşdeğerliğini ($\pm 10^{-9}$) garanti altına almak.
- **Karar:** Seçenek 2 (Hem `context.ts` içinde ortam anahtarı birleştirmesi + sıcak referans aktarımı hem de Worker protokolü desteği).
- **Gerekçe:** Hem birim testlerinde (`evaluateCustomPlan` doğrudan çağrıldığında) hem de tarayıcıda Worker üzerinden çalışırken `evaluateCustomPlan(input, seq).plan.score.composite` değeri `analyze({ ...input, options: { extraPlans: [seq] } }).userPlans[0].score.composite` ile birebir aynı olmalıdır.

## ADR-003: İstemci Veri Orkestrasyonunda (`FieldData.tsx`) Poligon (`ringKey`) ve Merkez (`siteKey`) Ayrımı
- **Bağlam:** Kullanıcı haritada poligonun bir köşesini oynattığında `ringKey` değişiyor, ancak merkezin 0.05° (≈ 5 km) hücresi aynı kalsa bile `/api/field?parts=soil` ve `/api/field?parts=precip` yeniden çağrılıyordu.
- **Karar:** `FieldData.tsx` içinde `field` (`parts=terrain`) poligon geometrisine (`ringKey`) bağlı kalırken; `soilPart` (`parts=soil`), `precip` (`parts=precip`), `climate` ve `ndvi` parçaları `siteKey` anahtarına bağlanır. Pilot bölgelerde gömülü kopyada (`snapshot`) mevcut olan `soilLayers` ve `precipCheck` doğrudan anlık kopyadan yüklenerek gereksiz ağ trafiği ve ardışık Worker tetiklemeleri önlenir.

## ADR-004: Sunucu API Korumaları, Singleflight Önbellek ve Atomik Disk Yazımı
- **Bağlam:**
  - `cache.ts` içindeki `${file}.${process.pid}.tmp` aynı süreçteki eşzamanlı yazmalarda çakışabiliyordu.
  - `field/route.ts` ve `geometry.ts` poligon köşe sayısını sınırlamıyordu (CPU DoS riski).
  - `geocode/route.ts` ve `terrain.ts` hız sınırlayıcıları sınırsız Promise zinciri kuruyordu.
- **Karar:**
  - `cache.ts`: Geçici dosya adına monotonik sayaç (`++tmpCounter`) eklenir ve `inFlight` Promise haritasıyla eşzamanlı aynı anahtar okumaları/yazmaları birleştirilir (Singleflight).
  - `geometry.ts` & `field/route.ts`: Poligon halkası için `MAX_VERTICES = 200` ve JSON gövdesi için `MAX_FIELD_BODY_BYTES = 65536` (64 KB) sınırı uygulanır.
  - `geocode/route.ts` & `terrain.ts`: Hız sınırlayıcı kuyruk derinliği `MAX_QUEUE_DEPTH = 15` ile sınırlandırılır; aşım durumunda bekletmeden hata döndürülür.

## ADR-005: Motor-Arayüz Terminoloji Birliği
- **Bağlam:** `src/components/plan/planKit.tsx` içindeki `TR_FIX` düzenli ifadeleri, motorun ürettiği Türkçe metinlerdeki "rotasyon" ve "brüt marj" ifadelerini çalışma zamanında yamalıyordu; `DISCLAIMER` içinde ise çoğul/resmî ("danışın") hitap kalmıştı.
- **Karar:** Motorun kendi açıklama ve anlatı modülleri (`explain.ts`, `narrate.ts`, `index.ts`) doğrudan v3 terminolojisini ("ekim nöbeti", "kazanç (brüt)", "bugünkü sıran", "danış") üretecek şekilde güncellenir; `planKit.tsx` içindeki `useL()` geriye dönük uyumluluk için korunur.

## ADR-006: Türkiye Derin Yakınlaştırma (`maxZoom: 20`) ve Çoklu Yüksek Çözünürlüklü Harita Katmanları
- **Bağlam:** EOX Sentinel-2 Cloudless katmanı (`maxNativeZoom: 14`, ~10 m/piksel) tek başına parsel sınırı çizimi (`zoom 16–20`) için bulanık kalıyordu. Ayrıca kırsal Anadolu'da Esri World Imagery sunucusu `z=18` (~0,3 m Maxar görüntüsü) seviyesine kadar gerçek yüksek çözünürlüklü JPEG karosu döndürürken, `z=19` seviyesinde 2.521 baytlık gri "Map data not yet available" yer tutucu karosu döndürmektedir.
- **Karar:**
  - `src/lib/data/tiles.ts` içinde `esri-world-imagery` (`https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, `maxNativeZoom: 18`), `carto-voyager` (`@2x` Retina sokak/köy haritası, `maxNativeZoom: 19`), `opentopomap` (`maxNativeZoom: 17`), `carto-voyager-labels` (`@2x` Retina şeffaf yerleşim etiketleri) ve `esri-world-transportation` (`maxNativeZoom: 19` köy/tarla yol ağı) tanımlandı.
  - `MapCanvas.tsx` üzerinde harita `maxZoom: 20` olarak ayarlandı; böylece `z=18` (~0,3 m) yerel uydu karoları `z=19` ve `z=20` (~0,12 m/piksel ekran ölçeği) seviyelerine gri karo oluşmadan keskin biçimde ölçeklenir.
  - `src/lib/data/turkeyRegions.ts` içine 81 il ve 16 büyük tarım havzası/ovası eklendi; `SearchBox.tsx` hem yerel 81 il/16 ova atlasını anında arar hem de Nominatim (`countrycodes=tr`) ile köy/mahalle bazında sonuç getirir.

## ADR-007: Anadolu Tarımsal Komuta Merkezi ("Anatolian Agronomic Command Center") Arayüz Mimarisi
- **Bağlam:** Kullanıcının referans tasarım görseli (`media_1794652347798_4af8cf5a.jpg`) doğrultusunda `/impeccable` ve `/design-taste-frontend` ilkeleriyle tüm platformun gün ışığı odaklı sıcak fildişi zemin (`#f3f6ef`), derin orman yeşili sol navigasyon sütunu (`#14361d` → `#1d4928`), beyaz Bento kartlar (`#ffffff`) ve gerçek zamanlı bilimsel grafiklerle yeniden tasarlanması talep edildi.
- **Karar:**
  - `AppShell.tsx` kalıcı sol orman yeşili komuta menüsü + üst hızlı pilot/senaryo kontrol çubuğu + mobil alt bar/çekmece olarak yeniden inşa edildi.
  - `FieldWorkspace.tsx` üzerinde Tanıtım Hero Alanı, 5 KPI Özet Kartı, Asimetrik Harita (`NASA Uydu Katmanları` yüzer kontrol paneli + `HD Uydu z20` seçici) + `Mevcut Durum Özeti`, 3 Sütunlu Bento (`Akıllı Ürün Önerileri`, `Üç Yıllık Ürün Rotasyon Planı`, çift eksenli `Verim ve Kârlılık Analizi` SVG grafiği), 2 Sütunlu Alt Bölüm (`Risk Simülasyonları` tablosu/yatay çubuk grafiği + `Açıklanabilir Karar Dayanağı XAI`) ve genişletilebilir 11 detaylı bilimsel sensör kartı (`FieldPanel`) %100 gerçek motor/uydu verisiyle birleştirildi.

## ADR-008: 2025/2026 TMO/Borsa Ekonomik Kalibrasyonu, P10–P90 Grafikleri, Canlı Formül Kanıtları ve 3 Adımlı Rehber Akışı
- **Bağlam:** Kullanıcının geri bildirimi doğrultusunda:
  1. Verim ve kârlılık analizinin gerçek 2025/2026 alım fiyatlarıyla (TMO, Trakya Birlik, Türkşeker, Ticaret Borsaları) ve şeffaf gelir–maliyet kırılımıyla gösterilmesi,
  2. Grafiklerin P10–P90 belirsizlik bantları, karşılaştırma referans çizgileri ve 12 aylık su dengesi (yağış, $ET_0$, $ET_c$, sulama) klimografı ile zenginleştirilmesi,
  3. Kanıtların ve 6 adımlı matematiksel formül zincirinin (`FAO-56 Penman-Monteith`, `Saxton & Rawls 2006`, `FAO-33/66 Stewart`, `Ekonomik Kazanç Denklemi`, `RUSLE & Biyolojik Azot`, `TOPSIS & ±%20 Duyarlılık`) doğrudan kontrol panelinde canlı parsel değerleriyle gösterilmesi,
  4. Kullanımın 3 adımlı rehber şeridi ve satır içi su/fiyat kalibrasyon kontrolleriyle basitleştirilmesi,
  5. Tam renkli botanik ürün illüstrasyonları (`CropArt.tsx`) ve doğrulanan NASA/USGS uydu görsellerinin (`IMAGES`) kartlara entegre edilmesi talep edildi.
- **Karar:**
  - `src/lib/crops/database.ts` içindeki referans ürün fiyatları ve değişken maliyetler 2025/2026 TMO (destek dahil buğday 14,50 TL/kg, arpa 13,52 TL/kg, mısır 11,97 TL/kg), Trakya Birlik (ayçiçeği 28,00 TL/kg), Türkşeker (şeker pancarı 3,40 TL/kg) ve Ticaret Borsaları (nohut 38 TL/kg, kırmızı mercimek 34 TL/kg, kuru fasulye 72 TL/kg) verileriyle kalibre edildi ve `sources.json` / `docs/SOURCES.md` içine kaydedildi.
  - `src/components/tarla/DashboardCharts.tsx` ve `src/components/tarla/EvidenceFoundations.tsx` modülleri oluşturularak kontrol paneline entegre edildi.


