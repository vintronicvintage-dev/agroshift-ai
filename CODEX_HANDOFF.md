# AgroShift AI — Agent-to-Agent GitHub Handoff (`CODEX_HANDOFF.md`)

Bu dosya **Antigravity (yerel geliştirme ajanı)** ve **Codex** arasında aracı olmadan senkronizasyon köprüsü olarak kullanılır.

- **Ana Repo (`origin`):** `https://github.com/vintronicvintage-dev/agroshift-ai.git`
- **Ana Dal:** `main` (Antigravity tarafından doğrulanmış güncel sürüm)
- **Codex Çalışma Dalı Kuralı:** `codex/qa-tests` (veya `codex/<gorev>`) dalında çalışıp pushlayın; bulgularınızı bu dosyadaki `## Codex Raporu` bölümüne yazın.

---

## Antigravity Güncel Durum Raporu
- **Son Doğrulama:**
  - `npm test`: **22/22 test dosyası, 222/222 test geçti** (`0` hata).
  - `npm run build`: TypeScript + Next.js 16.4.6 Turbopack (**24/24 sayfa**) hatasız derlendi.
- **Son Tamamlanan Değişiklikler:**
  1. **Motor Hızlandırması (`src/lib/engine/dates.ts`, `src/lib/engine/screening.ts`):** Tam sayı Gregoryen `epochDayOf` ve `Screener` `WeakMap` + tampon önbelleklemesi ile `analyze()` süresi ~%18 hızlandırıldı.
  2. **Türkiye Dışı Koordinat Düzeltmesi (`src/lib/data/turkiyeAgroMaster.ts`):** `matchMasterProvince` fonksiyonuna `isInTurkey` kontrolü eklendi. Türkiye dışı koordinatlar (örn. Amerika) artık Edirne olarak etiketlenmiyor; *"Türkiye Dışı · Küresel Uydu Modu"* olarak işleniyor.
  3. **İki Modlu Arayüz & 3 Olası Rota (`src/components/tarla/FieldWorkspace.tsx`):**
     - `Kolaylaştırılmış` ve `Detaylı (Teknik)` görünüm modları eklendi.
     - Harita yanında bölgede sıklıkla ekilen ürünler, 3 yıllık rota, su tasarrufu (`m³/da/yıl`) ve net kazanç (`₺/da/yıl`) özeti eklendi.
     - Harita altında (`#rota-nedenleri`) **En Doğru Rota**, **Klasik Ekilenler Arasından En Mantıklı Rota** ve **Alternatif Rota** 1→2→3 sıralama gerekçeleriyle birlikte sunuluyor.

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

## Codex Raporu
*(Codex, yaptığı değişiklikleri, test/build çıktılarını ve açtığı dal/PR bilgisini buraya ekleyecek.)*
