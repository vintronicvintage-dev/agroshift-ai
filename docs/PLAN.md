# AgroShift AI — Derin Mühendislik ve Mimari Gelişim Planı (`PLAN.md`)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `test-driven-development` and `verify-and-review` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kapsamı şişirmeden AgroShift AI'ın hesap motoru, Web Worker protokolü, sunucu veri/önbellek katmanı ve v3 kullanıcı arayüzü arasındaki mimari çatlakları, yarış durumlarını ve UX pürüzlerini deterministik kanıtlarla gidermek.

**Architecture:** Saf TypeScript hesap motoru (`src/lib/engine/*`), iki katmanlı bağlam önbelleklemesi (`context.ts`), Worker/Main-thread skor tutarlılığı, Singleflight + atomik sunucu önbelleği (`src/lib/data/*`) ve v3 Ortho Console arayüzü (`src/components/*`).

**Tech Stack:** Next.js 16.4.6 (App Router), React 19.3, TypeScript 5.9, Tailwind CSS 4.3, Vitest 5.1, Leaflet 1.9.4.

## Global Constraints
- Veri sözleşmesi (`src/lib/types.ts` §1) geriye dönük uyumlu kalmalıdır.
- Hesap motoru (`src/lib/engine/**`) saf (pure), deterministik ve I/O'suz kalmalıdır.
- Gerçek dünya verileri asla kaynak koda sabitlenmez; her sayı formülüne ve kaynağına izlenebilir olmalıdır.
- Her dilim sonunda `npm test`, `npm run lint` ve `npx tsc --noEmit` sıfır hata ve sıfır uyarıyla geçmelidir.

---

### Dilim 1: Kalite Kapısı, Git Başlatma ve Konfigürasyon Hijyeni

**Files:**
- Create: `.gitignore`
- Modify: `agroshift/package.json`
- Modify: `agroshift/src/components/dayanak/EvidencePage.tsx`

- [x] **Step 1: `.gitignore` oluştur ve Git deposunu başlat**
- [x] **Step 2: `EvidencePage.tsx` içindeki kullanılmayan `useMemo` import'unu kaldır ve `vitest` ESM uyarısını gider**
- [x] **Step 3: `npm test` ve `npm run lint` çalıştırarak 0 hata / 0 uyarı doğrula ve baseline commit al**

---

### Dilim 2: İki Katmanlı Bağlam (`AnalysisContext`) Önbelleklemesi ve Skor Normalizasyon Bütünlüğü

**Files:**
- Modify: `agroshift/src/lib/engine/context.ts`
- Modify: `agroshift/src/lib/engine/index.ts`
- Modify: `agroshift/src/lib/engine/screening.ts`
- Test: `agroshift/src/lib/engine/engineV2.test.ts`

- [ ] **Step 1: Başarısız birim testlerini yaz (`engineV2.test.ts`)**
  - Test 1: `evaluateCustomPlan(input, seq)` çağrısının, öncesinde `analyze(input)` çalışmasa bile (veya `input.options.extraPlans` farklı olsa bile) `analyze({ ...input, options: { extraPlans: [seq] } }).userPlans[0]` ile birebir aynı `score.composite` ($\pm 10^{-9}$) değerini ürettiğini doğrula.
  - Test 2: `options.extraPlans` değiştiğinde `getContext` içindeki fiziksel/iklimsel bağlamın (`PreparedClimate`, `SoilHydraulics`, `EngineSetup`, `EvalContext`) yeniden hesaplanmadığını (aynı referansı koruduğunu) doğrula.
  - Test 3: `Screener` sınıfının farklı `budget` değerleriyle çağrıldığında önbellek çakışması yaşamadığını doğrula.
- [ ] **Step 2: Testleri çalıştır ve RED durumunu kanıtla**
- [ ] **Step 3: `context.ts` ve `screening.ts` içinde minimal implementasyonu tamamla**
- [ ] **Step 4: Testleri ve Python çapraz kontrol betiklerini çalıştırarak GREEN durumunu kanıtla ve commit al**

---

### Dilim 3: İstemci Veri Orkestrasyonu (`FieldData.tsx`) ve Worker Protokolü Optimizasyonu

**Files:**
- Modify: `agroshift/src/components/data/FieldData.tsx`
- Modify: `agroshift/src/lib/ui/analysisProtocol.ts`
- Modify: `agroshift/src/lib/ui/analyze.worker.ts`
- Modify: `agroshift/src/lib/ui/useAnalysis.ts`
- Test: `agroshift/src/lib/data/fieldParts.test.ts`

- [ ] **Step 1: `FieldData` parça ayrıştırma ve pilot snapshot kısa devre mantığı için birim testi yaz**
- [ ] **Step 2: Testi çalıştır ve RED durumunu kanıtla**
- [ ] **Step 3: `FieldData.tsx` içinde `soilPart` ve `precip` isteklerini `siteKey` değişimine bağla; pilot bölgelerde gömülü `soilLayers` ve `precipCheck` mevcutsa gereksiz ağ isteklerini atla**
- [ ] **Step 4: Testleri çalıştır, GREEN durumunu kanıtla ve commit al**

---

### Dilim 4: Sunucu API Güvenliği, Singleflight Atomik Önbellek ve Sınırlı Kuyruk (Bounded Queue)

**Files:**
- Modify: `agroshift/src/lib/data/cache.ts`
- Modify: `agroshift/src/lib/data/geometry.ts`
- Modify: `agroshift/src/lib/data/field.ts`
- Modify: `agroshift/src/app/api/field/route.ts`
- Modify: `agroshift/src/app/api/geocode/route.ts`
- Modify: `agroshift/src/lib/data/terrain.ts`
- Test: `agroshift/src/lib/data/field.test.ts`

- [ ] **Step 1: Başarısız güvenlik ve eşzamanlılık testlerini yaz (`field.test.ts`)**
  - Test 1: >256 köşeli poligonun `GeometryError` / `ValidationError` ile reddedilmesi.
  - Test 2: Aynı koordinat için eşzamanlı `cacheSet` ve `withCache` (Singleflight) çağrılarının yarış durumu yaratmadan tek bir upstream çağrısını paylaşması.
  - Test 3: `terrain` / `geocode` hız sınırlayıcı kuyruğunun maksimum derinliği aştığında bekletmeden hata fırlatması.
- [ ] **Step 2: Testleri çalıştır ve RED durumunu kanıtla**
- [ ] **Step 3: `cache.ts`, `geometry.ts`, `field/route.ts`, `geocode/route.ts` ve `terrain.ts` implementasyonunu tamamla**
- [ ] **Step 4: Testleri çalıştır, GREEN durumunu kanıtla ve commit al**

---

### Dilim 5: Motor-Arayüz Terminoloji Birliği ve UI v3 Pürüzlerinin Giderilmesi

**Files:**
- Modify: `agroshift/src/lib/engine/index.ts`
- Modify: `agroshift/src/lib/engine/explain.ts`
- Modify: `agroshift/src/components/plan/Conditions.tsx`
- Modify: `agroshift/src/components/yontem/MethodsPage.tsx`
- Test: `agroshift/src/lib/engine/review.test.ts`

- [ ] **Step 1: Motorun Türkçe çıktı metinlerinde (`DISCLAIMER`, `explainPlan`) doğrudan v3 terminolojisinin ("ekim nöbeti", "kazanç (brüt)", tekil "danış" hitabı) üretildiğini denetleyen testi yaz**
- [ ] **Step 2: Testi çalıştır ve RED durumunu kanıtla**
- [ ] **Step 3: Motor metinlerini güncelle; `/yontem` sayfasına sayfa içi hızlı gezinme indeksi (anchor nav) ekle ve mobil görünüm pürüzlerini düzelt**
- [ ] **Step 4: Testleri çalıştır, GREEN durumunu kanıtla ve commit al**

---

### Dilim 6: Uçtan Uca Doğrulama, Görsel Denetim ve Bağımsız Kanıt İncelemesi (`verify-and-review`)

- [ ] **Step 1: Tüm test paketini, tip kontrolünü, linter'ı, Python çapraz kontrol betiklerini ve üretim derlemesini (`npm run build`) çalıştır**
- [ ] **Step 2: Uygulamayı başlat ve tarayıcı alt-ajanı (`browser`) ile 1440×900 ve 390×844 çözünürlüklerde doğrulama yap**
- [ ] **Step 3: `evidence-reviewer` alt-ajanı ile bağımsız denetim gerçekleştir ve nihai Türkçe raporu sun**
