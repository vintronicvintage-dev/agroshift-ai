# AgroShift — Proje Durum ve Doğrulama Raporu (`STATUS.md`)

- **Tarih:** 14 Kasım 2026
- **Sürüm:** 2.3.0 (Anatolian Agronomic Command Center & Deep-Zoom Turkey Map)

## 1. Tamamlanan Mühendislik ve Tasarım Dilimleri
1. **Dilim 1–6 (Motor, Worker ve Sunucu Derinleştirmesi):**
   - İki katmanlı `AnalysisContext` önbelleklemesi (`context.ts`), Screener bütçe izolasyonu (`optimizer.ts`), Web Worker `evaluateCustomPlan` senkronizasyonu (`analyze.worker.ts`), istemci `siteKey`/`ringKey` ayrımı (`FieldData.tsx`) ve sunucu Singleflight önbellek + poligon köşe/boyut sınırları (`cache.ts`, `geometry.ts`, `field/route.ts`).
2. **Dilim 7 (Türkiye Derin Yakınlaştırma `maxZoom: 20` ve 81 İl / 16 Tarım Havzası Atlası):**
   - `src/lib/data/tiles.ts`: `esri-world-imagery` (`maxNativeZoom: 18` ~0,3 m Maxar uydu görüntüsü, `z=20`'ye kadar ölçekleme), `carto-voyager` (`@2x` Retina sokak/köy haritası), `opentopomap` (`maxNativeZoom: 17` eşyükselti haritası), `carto-voyager-labels` (`@2x` Retina yerleşim adları) ve `esri-world-transportation` (`maxNativeZoom: 19` köy/tarla yolları).
   - `src/lib/data/turkeyRegions.ts`: 81 il ve 16 büyük tarımsal ova/havza veri tabanı, Türkçe karakter duyarsız arama (`searchTurkeyLocations`) ve piksel başına metre hesabı (`metersPerPixel`).
   - `src/components/tarla/MapCanvas.tsx`: `maxZoom: 20`, zümrüt yeşili parsel dolgusu (`#22c55e`), iç tarla ızgara çizgileri ve parsel merkez etiketi (`.parcel-badge`).
3. **Dilim 8–9 (`/impeccable` & `/design-taste-frontend` Bento Komuta Merkezi Tasarımı):**
   - `src/app/globals.css`: Sıcak fildişi zemin (`#f3f6ef`), derin orman yeşili sol navigasyon sütunu (`#14361d` → `#1d4928`), beyaz Bento kartlar (`#ffffff`) ve tam karanlık tema (`data-theme="dark"`).
   - `src/components/shell/AppShell.tsx`: Kalıcı sol orman yeşili menü, üst hızlı pilot/havza ve iklim senaryosu seçicileri, mobil alt bar ve çekmece menü.
   - `src/components/tarla/FieldWorkspace.tsx`: Collapsible Hero alanı, 5 gerçek zamanlı KPI kartı, yüzer `NASA Uydu Katmanları` kutusuna sahip derin yakınlaştırmalı harita + `Mevcut Durum Özeti`, 3 sütunlu Bento (`Akıllı Ürün Önerileri`, `Üç Yıllık Ürün Rotasyon Planı`, çift eksenli `Verim ve Kârlılık Analizi` SVG grafiği), 2 sütunlu alt bölüm (`Risk Simülasyonları` + `Açıklanabilir Karar Dayanağı XAI`) ve genişletilebilir 11 detaylı bilimsel sensör kartı (`FieldPanel`).
   - `src/components/auth/AuthShell.tsx`: Sol beyaz giriş/kayıt formu + sağ Harran Ovası uydu/tarla görseli ve 3 yetenek rozeti.
4. **Dilim 10 (2025/2026 TMO/Borsa Ekonomik Kalibrasyonu, P10–P90 Grafikleri, Canlı Formül Kanıtları ve 3 Adımlı Rehber):**
   - `src/lib/crops/database.ts`: 2025/2026 TMO, Trakya Birlik, Türkşeker ve Ticaret Borsaları referans alım fiyatları ve değişken maliyetlerle kalibre edildi (`sources.json` ve `docs/SOURCES.md` içine kaydedildi).
   - `src/components/brand/CropArt.tsx`: Tüm 12 ürün için tam renkli botanik SVG illüstrasyonları (altın buğday/arpa başakları, bej nohut, mercan kırmızısı mercimek, sarı-kahve ayçiçeği tablası, altın mısır koçanı, pamuk kozası, şeker pancarı vb.) eklendi.
   - `src/components/tarla/DashboardCharts.tsx`: P10–P90 belirsizlik çubukları, gölgeli kâr bandı, yıllık `Brüt Gelir − Net Maliyet = Net Kâr` kırılım tablosu ve satır içi `Fiyat Kalibrasyonu` çekmecesi içeren `YieldProfitabilityPanel`, 12 aylık `MonthlyWaterBalanceChart` klimografı ve 24 yıllık (22 dönem) `HistoricalWindowStrip` oluşturuldu.
   - `src/components/tarla/EvidenceFoundations.tsx`: 6 adımlı canlı matematiksel formül ve kanıt kartları (`FAO-56 Penman-Monteith`, `Saxton & Rawls 2006`, `FAO-33/66 Stewart`, `Ekonomik Kazanç Denklemi`, `RUSLE & Biyolojik Azot`, `TOPSIS & ±%20 Duyarlılık`), açık model varsayımları tablosu ve birincil akademik kaynak listesi doğrudan kontrol paneline eklendi.
   - `src/components/tarla/FieldWorkspace.tsx`: NASA/USGS uydu görselleriyle desteklenen 3 adımlı hızlı kullanım şeridi (`1. Arazini Seç veya Çiz`, `2. Su ve Mevcut Ürününü Belirle`, `3. Kârı, Grafikleri ve Kanıtları İncele`), satır içi sulama bütçesi kaydırıcısı (`50–600 mm` + Damla/Yağmurlama/Karık) ve `1. Öneri / 2. Öneri / 3. Öneri` seçicisi entegre edildi.

## 2. Deterministik Doğrulama Kanıtları
- **TypeScript (`npx tsc --noEmit`):** `0` hata.
- **ESLint (`npm run lint`):** `0` hata, `0` uyarı.
- **Impeccable Anti-Pattern Denetçisi (`detect.mjs`):** `[]` (`0` ihlal).
- **Birim ve Entegrasyon Testleri (`npm test`):** `19` test dosyası, `205` testin tamamı başarılı (`0` hata).
- **Üretim Derlemesi (`npm run build`):** 20 statik/dinamik rota hatasız derlendi; `a3bd9b8b` tasarım tohum anahtarı üretim çıktısında doğrulandı.
- **Canlı Tarayıcı Doğrulaması (`http://localhost:3005`):**
  - Masaüstü (`1440×900`) ve mobil (`390×844`, `overflowsWidth: false`) görünümleri doğrulandı.
  - Harita yakınlaştırması `Zoom 20,0/20 (~0,12 m/piksel)` seviyesine kadar gri karo olmadan net uydu görüntüsüyle test edildi.
