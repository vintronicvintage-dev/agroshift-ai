# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Birincil Kullanıcılar:** Türkiye'deki çiftçiler, tarım danışmanları ve ziraat mühendisleri (Konya Havzası, Polatlı, Harran Ovası, Gediz/Manisa, Çorum ve Türkiye'nin 81 ilindeki tarımsal işletmeler).
- **Kullanım Bağlamı:** Masaüstü veya mobil tarayıcıda tarlasını yüksek çözünürlüklü Türkiye uydu/harita katmanları üzerinde parsel bazında bularak çizen, mevcut ürününü ve sulama imkanını giren, NASA uydu verileri (POWER, MODIS, SMAP, IMERG, SRTM) ve SoilGrids toprak analizleriyle 3 yıllık bilimsel ekim nöbeti (rotasyon), verim, brüt kazanç ve iklim risk simülasyonu kararları alan kullanıcılar.

## Product Purpose

AgroShift AI, Türkiye'deki tarım arazileri için NASA yer gözlem verilerini, FAO-56 Penman-Monteith günlük su bütçesi simülasyonunu ve çok kriterli TOPSIS optimizasyonunu birleştirerek parsel bazında 3 yıllık sürdürülebilir ekim nöbeti planı, su tasarrufu, toprak sağlığı ve brüt kârlılık analizi sunar.

## Positioning

Tek bir ortalama yıl varsayımı yerine, arazinin gerçek koordinatlarındaki 24 tam tarım yılı (2001–2025) günlük NASA POWER iklim serisi üzerinde 22 kayan 3-yıllık pencereyi FAO-56 çift katsayılı (`Kc` + `Ky`) su bütçesiyle simüle eden, sonuçları doğrudan üretici dilinde (dekar, ton/dekar, sulama sayısı, TL/dekar brüt kazanç) ve açıklanabilir bilimsel gerekçelerle (XAI) sunan karar destek platformu.

## Operating Context

- Yüksek çözünürlüklü, derin yakınlaştırmalı (zoom 20'ye kadar) Türkiye uydu, hibrit cadde/köy, topografya ve NASA GIBS (NDVI, SMAP toprak nemi, IMERG yağış, HLS Sentinel-2/Landsat) katmanlı interaktif harita.
- 5 hazır Türkiye pilot parseli (`Konya-Çumra`, `Ankara-Polatlı`, `Şanlıurfa-Harran`, `Manisa-Salihli`, `Çorum-Alaca`), 81 il / tarımsal havza hızlı erişim rehberi ve serbest parsel çizimi (poligon, dikdörtgen, daire, nokta, GeoJSON).
- İstemci tarafı Web Worker (`analyze.worker.ts`) üzerinde çalışan deterministik FAO-56 + TOPSIS motoru.

## Capabilities and Constraints

- **Gerçek Veri Zorunluluğu:** Arayüzdeki her sayı (alan, toprak tekstürü, pH, organik karbon, kök bölgesi nemi, NDVI, yağış, ET₀, ürün uygunluk yüzdeleri, 3 yıllık rotasyon verim ve brüt kazanç projeksiyonları, kuraklık/sıcaklık/fiyat risk simülasyonları) gerçek API/snapshot verilerinden ve deterministik motordan üretilir; sahte/sabit sayı kullanılmaz.
- **Harita Çözünürlüğü:** Türkiye genelinde parsel sınırlarına, tarla içi ağaçlara ve sulama kanallarına kadar net yakınlaştırma (`maxZoom: 20`, Esri World Imagery ~0.3m Maxar/Earthstar `maxNativeZoom: 18`, Carto/OSM Retina yer adları ve ulaşım ağları `maxNativeZoom: 19`, OpenTopoMap `maxNativeZoom: 17`, Sentinel-2 ve NASA GIBS bilimsel katmanları).
- **Dil:** Türkçe birincil arayüz, İngilizce ikincil dil (`useI18n`).

## Brand Commitments

- **Kullanıcı Tarafından Sabitlenen Görsel Referans (Brief-Pinned Visual World):** Kullanıcının yüklediği AgroShift AI taslak görseli (`media_1794652347798_4af8cf5a.jpg`):
  - Koyu orman yeşili (`#14361D` – `#1B4326`) sol sabit navigasyon sütunu (`Kontrol Paneli`, `Arazilerim & Harita`, `Ürün Önerileri`, `Rotasyon Planı`, `Analiz ve Grafikler`, `Risk Simülasyonları`, `Bilimsel Dayanak`, `Yöntem ve Kaynaklar`) + sıcak fildişi/krem (`#F4F6F0` / `#F8FAF6`) ana çalışma yüzeyi ve temiz beyaz (`#FFFFFF`) Bento kartları.
  - Üstte 5'li özet KPI şeridi (`Arazi Alanı`, `Mevcut Ürün`, `Su Kaynağı`, `Toprak Tipi`, `Genel Verim/İklim Trendi`).
  - Orta bölümde sol tarafta üzerinde "NASA Uydu Katmanları" kontrol kutusu bulunan detaylı interaktif Arazi Haritası, sağ tarafta `Mevcut Durum Özeti` (Toprak Sağlığı, Toprak Nemi, Bitki Sağlığı NDVI, Ortalama Sıcaklık, Toplam Yağış ve NASA Veri Kaynakları kartı).
  - Alt bölümlerde 3 sütunlu Bento (`Uygun Ürün Önerileri` yüzdelik barlarla, `Üç Yıllık Ürün Rotasyon Planı` 1.-2.-3. yıl akışı ve 3 etki rozetiyle, `Verim ve Kârlılık Analizi` sütun+çizgi kombo grafiğiyle) ve en altta 2 sütunlu (`Risk Simülasyonları` senaryo tablosu + 3 yıllık toplam kazanç karşılaştırma barları ve `Açıklanabilir Bilimsel Öneri / XAI` gerekçe maddeleri).
  - Üst/açılışta "Tarıma Yapay Zekâ ile Bilimsel Yön Verin" hero tanıtım şeridi (daraltılabilir veya sekme olarak erişilebilir) ve kimlik doğrulama sayfalarında (`/giris`, `/kayit`) sol form + sağ güneşli tarım arazisi ve 3 özellik rozetli bölünmüş ekran tasarımı.

## Evidence on Hand

- `public/data/snapshots/*.json`: 5 Türkiye pilot parselinin doğrulanmış NASA POWER, ISRIC SoilGrids v2.0, MODIS MOD13Q1 NDVI, SRTM 30m ve ERA5 verileri.
- `src/lib/engine/*`: FAO-56 Penman-Monteith (`et0.ts`), günlük su bütçesi (`waterBalance.ts`), toprak sağlığı (`soilHealth.ts`), çok kriterli TOPSIS (`optimizer.ts`) ve açıklanabilirlik (`explain.ts`, `narrate.ts`) motoru.
- `public/images/*`: Doğrulanmış NASA Earth Observatory / Copernicus uydu ve saha görselleri (`IMAGES`).

## Product Principles

1. **Kanıt Önce Gelir:** Her grafik, yüzde ve TL değeri gerçek uydu/toprak verisinden ve FAO-56 simülasyonundan hesaplanır; tıklanabilir izlenebilirlik (`Traced`) ve bilimsel dayanak (`/dayanak`) korunur.
2. **Parsel Ölçeğinde Netlik:** Harita Türkiye'nin her noktasında tarla sınırlarını, köy yollarını ve komşu parselleri net gösterecek kadar yakınlaşır (`zoom 20`).
3. **Tek Bakışta Karar (Bento Kontrol Paneli):** Çiftçi veya mühendis haritayı, mevcut toprak/iklim durumunu, en uygun ürünleri, 3 yıllık rotasyonu, verim/kâr grafiğini ve kuraklık/sıcaklık risk simülasyonunu tek bir bütünleşik Kontrol Panelinde görür ve anında etkileşime girer.

## Accessibility & Inclusion

- WCAG AA metin kontrastı (≥ 4.5:1), klavye odak halkaları (`:focus-visible`), minimum 44×44 px dokunma hedefleri, `390px` mobil ve `1440px` masaüstü tam uyumluluk, emoji yasağı (tutarlı vektör ikon ve botanik çizim sistemi).
