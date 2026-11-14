<!-- impeccable:design-schema 1 -->

# AgroShift — Tasarım Sistemi ve Görsel Mimari ("Anadolu Tarımsal Komuta Merkezi")

Bu belge, AgroShift platformunun görsel dilini, renk jetonlarını, tipografik hiyerarşisini ve yüksek çözünürlüklü Türkiye harita mimarisini tanımlar.

## 1. Renk Paleti ve Yüzey Mimarisi
- **Ana Zemin (`--bg: #f3f6ef`):** Gün ışığında okunabilirliği artıran sıcak fildişi/krem zemin.
- **Bento Kart Yüzeyleri (`--surface: #ffffff`):** `#dce4d6` sınır çizgisi ve hafif botanik gölge (`0 10px 28px -12px rgb(20 54 29 / 0.08)`) ile ayrışan beyaz kartlar.
- **Sol Komuta Menüsü (`--sidebar-bg: #14361d` → `#1d4928`):** Derin orman yeşili sol navigasyon sütunu ve `#2e7d32` aktif sekme vurgusu.
- **Vurgu ve Eylem (`--accent: #1e6b34`):** Birincil butonlar, uygunluk çubukları ve tarla poligon sınırları için zümrüt yeşili.
- **Koyu Tema (`data-theme="dark"`):** `#0b130e` gece zemini ve `#121f17` kart yüzeyleriyle tam karanlık mod desteği.

## 2. Türkiye Derin Zoom (`maxZoom: 20`) Harita Mimarisi
- **Esri World Imagery (`maxNativeZoom: 18`, `maxZoom: 20`):** Türkiye genelinde ~0,3 m/piksel (Maxar/GeoEye) çözünürlüklü uydu görüntüsü; `z=19` ve `z=20` seviyelerinde gri veri-yok karosu üretmeden net parsel sınırı çizimi sağlar.
- **CartoDB Voyager Retina (`@2x`, `maxNativeZoom: 19`):** İl, ilçe, belde, köy ve mahalle adlarını keskin tipografiyle sunar.
- **Esri World Transportation (`maxNativeZoom: 19`):** Uydu görüntüsü üzerinde köy ve tarla bağlantı yollarını şeffaf katman olarak gösterir.
- **OpenTopoMap (`maxNativeZoom: 17`) & NASA SRTM (`30m`):** Eşyükselti eğrileri ve arazi eğim/rakım analizi.
- **81 İl ve 16 Tarım Havzası Atlası (`src/lib/data/turkeyRegions.ts`):** Çevrimdışı/anlık arama ve tek tıkla havza odaklama.
