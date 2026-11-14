# AgroShift AI — Agent-to-Agent GitHub Handoff (`CODEX_HANDOFF.md`)

Bu dosya **Antigravity (yerel geliştirme ajanı)** ve **Codex** arasında aracı olmadan senkronizasyon köprüsü olarak kullanılır.

- **Ana Repo (`origin`):** `https://github.com/vintronicvintage-dev/agroshift-ai.git`
- **Ana Dal:** `main` (Antigravity tarafından doğrulanmış güncel sürüm)
- **Codex Çalışma Dalı Kuralı:** `codex/qa-tests` (veya `codex/<gorev>`) dalında çalışıp pushlayın; bulgularınızı bu dosyadaki `## Codex Raporu` bölümüne yazın.

---

## Antigravity Güncel Durum Raporu
- **Son Commit (`main`):** `8cfefa6` (Derinleştirme Paketi)
- **Son Doğrulama:**
  - `npm test`: **24/24 test dosyası, 229/229 test geçti** (`0` hata).
  - `npm run build`: TypeScript + Next.js 16.4.6 Turbopack (**24/24 sayfa**) hatasız derlendi.
- **Son Tamamlanan Değişiklikler:**
  1. **Gerçek İl Klasik Rotasyonu Motor Değerlendirmesi (`src/lib/data/turkiyeAgroMaster.ts`, `src/components/data/FieldData.tsx`, `src/components/tarla/FieldWorkspace.tsx`):** `getClassicRegionalSequence(lat, lon)` eklendi; Türkiye içi parsellerde `Dengeli_Gelir` 3 yıllık rotasyonu `options.extraPlans` üzerinden fizik motoruna gönderilip gerçek su, verim ve kâr hesabıyla `"Klasik Ekilenler Arasından En Mantıklı Rota"` kartında gösteriliyor. 3 rota kartına tıklanınca `selectedPlanOverride` ile aktif rota detayları güncelleniyor.
  2. **Parsel Bazlı Sayısal Sıra Gerekçelendirmesi (`src/components/tarla/FieldWorkspace.tsx`):** `explainSequenceOrder` artık her yıl için motorun hesapladığı `~kg/da` verim, `mm` sulama / `kuru tarım`, `₺/da` (`grossMarginTLPerDa.p50`) ve `plan.soilHealth.nContributionKgHa` biyolojik azot katkısını (`kg/da`) gösteriyor.
  3. **Canlı Uydu vs. Örneklem/Yedek Veri Kaynağı Rozetleri (`src/components/tarla/FieldWorkspace.tsx`):** Harita yanı özet kartına `İklim`, `Toprak` ve `Eğim` kaynaklarını gösteren 3 parçalı `Veri Kaynağı` rozeti eklendi.
  4. **Önceki Temel İyileştirmeler:** Motor hızlandırması (`dates.ts`, `screening.ts`), Türkiye dışı koordinat kontrolü (`isInTurkey`) ve iki modlu (`Kolaylaştırılmış` / `Detaylı`) arayüz + 3 rota kartı aktif.

---

## Codex İçin Sıradaki Görevler (P0–P2)
Önce kendi ortamınızda `npm install && npm test && npm run build` çalıştırıp tabanı doğrulayın, ardından:

1. **API Hata, Zaman Aşımı ve Geçersiz Veri Testleri:**
   - `src/app/api/field/route.ts`, `climate/route.ts`, `soil/route.ts`, `ndvi/route.ts`, `parcel-engine/route.ts` için geçersiz `lat/lon`, upstream timeout/500 ve fallback testleri ekleyin.
   - `matchMasterProvince` (`isInTurkey: true` vs `false` — örn. Konya vs Amerika) için birim testi ekleyin.
2. **`.cache` Bütünlük Kontrolü:**
   - `.cache` altındaki önbellek dosyalarının şema geçerliliğini doğrulayan test/betik ekleyin (canlı ağ yoksa ağ çağrısını atlayıp şema kontrolü yapsın).
3. **Playwright E2E ve Mobil Görünüm Testi:**
   - `Kolaylaştırılmış ↔ Detaylı` mod geçişini, Türkiye içi/dışı koordinat özetini, 3 rota kartını ve `1440x900` + `390x844` (yatay taşma olmadan) görünümleri doğrulayan E2E testi ekleyin.
4. **Supabase Misafir vs. Giriş Kontrolü:**
   - `.env.example` değişkenleri boşken misafir modunun hatasız çalıştığını doğrulayın.

---

## Tamamlanan Ek Doğrulamalar (Antigravity QA)
- **API Hata/Timeout & `isInTurkey` Birim Testleri (`src/lib/data/turkiyeAgroMaster.test.ts`, `src/lib/data/apiValidationAndCache.test.ts`):**
  - `matchMasterProvince` için Türkiye içi (`isInTurkey: true`) ve Türkiye dışı (`isInTurkey: false`, ABD/Brezilya/Japonya) doğrulandı.
  - `/api/climate`, `/api/soil`, `/api/ndvi`, `POST /api/field` ve `POST /api/parcel-engine` için geçersiz koordinat / bozuk JSON / geçersiz parametrelerin HTTP `400` döndürdüğü doğrulandı.
- **`.cache` Bütünlük Kontrolü:** `.cache/climate_*.json` önbellek dosyalarının `{ savedAt, data }` şeması, koordinatları ve günlük tarih serisi doğrulandı.
- **Tarayıcı E2E & Mobil Görünüm + Supabase Misafir Modu (`http://localhost:3000`):**
  - Misafir modunda (Supabase env olmadan) masaüstü (`1440×900`) ve mobil (`390×844`, `scrollWidth = 375.2px <= 390px`, sıfır yatay taşma) doğrulandı.
  - `Kolaylaştırılmış ↔ Detaylı (Teknik)` mod geçişi, harita yanı özet ve 3 olası rota kartı (`En Doğru Rota`, `Klasik Ekilenler Arasından En Mantıklı Rota`, `Alternatif Rota`) doğrulandı.
- **Toplam Test & Derleme:** `npm test` → **24/24 dosya, 229/229 test geçti**; `npm run build` → **hatasız (24/24 sayfa)**.

---

## Codex Raporu
*(Codex / ChatGPT, `origin/main` üzerindeki son durumu inceleyip ek bulgularını buraya ekleyebilir.)*
