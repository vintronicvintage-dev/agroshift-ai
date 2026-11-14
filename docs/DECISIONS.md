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
  - `geometry.ts` & `field/route.ts`: Poligon halkası için `MAX_RING_VERTICES = 256` ve JSON gövdesi için `MAX_BODY_BYTES = 65536` (64 KB) sınırı uygulanır.
  - `geocode/route.ts` & `terrain.ts`: Hız sınırlayıcı kuyruk derinliği `MAX_QUEUE_DEPTH = 15` ile sınırlandırılır; aşım durumunda bekletmeden hata döndürülür.

## ADR-005: Motor-Arayüz Terminoloji Birliği
- **Bağlam:** `src/components/plan/planKit.tsx` içindeki `TR_FIX` düzenli ifadeleri, motorun ürettiği Türkçe metinlerdeki "rotasyon" ve "brüt marj" ifadelerini çalışma zamanında yamalıyordu; `DISCLAIMER` içinde ise çoğul/resmî ("danışın") hitap kalmıştı.
- **Karar:** Motorun kendi açıklama ve anlatı modülleri (`explain.ts`, `narrate.ts`, `index.ts`) doğrudan v3 terminolojisini ("ekim nöbeti", "kazanç (brüt)", "bugünkü sıran", "danış") üretecek şekilde güncellenir; `planKit.tsx` içindeki `useL()` geriye dönük uyumluluk için korunur.
