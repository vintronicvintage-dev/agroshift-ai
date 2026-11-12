# AgroShift v1.1 — Panel sadeleştirme ve ilk giriş tanıtımı

## Sorun (v1.0 ölçümleri, 1024 px genişlik)
- Tek sayfa 7583 px yüksekliğinde, yaklaşık 1700 kelime.
- Tarla formunda 39 kontrol bir anda görünüyor.
- Asıl cevap (rotasyon karşılaştırması) sayfanın yaklaşık 3900 px aşağısında; önce 2169 px iklim grafiği geçiliyor.
- Karşılaştırma bölümünde 67 kontrol var; kartlar uzun, "hangisi daha iyi" tek bakışta okunmuyor.
- Yeni gelen biri aracın ne yaptığını ve nereden başlayacağını bilmiyor.

## Hedef
Bir çiftçi ya da jüri üyesi, hiçbir açıklama okumadan **60 saniyede** ilk önerisini görsün.
Bilimsel derinlik kaybolmasın, yalnızca istenince açılsın.

## Tasarım kararları

### 1. Üç adımlı akış, cevap kanıttan önce
Üstte yapışkan adım çubuğu (mobilde altta): **1 Tarlam → 2 Öneriler → 3 Kanıt**.
Aynı anda yalnız bir adım görünür. URL hash'i adımı tutar (`#tarlam`, `#oneriler`, `#kanit`),
geri tuşu çalışır. Tarla seçilmeden 2 ve 3 kilitli görünür, nedenini söyler.
Sıra değişti: öneriler ikinci, iklim kanıtı üçüncü adım.

### 2. Tarlam adımı: dört soru, gerisi "Gelişmiş"
Görünen yalnız şunlar:
1. **Nerede?** Harita + pilot bölge çipleri.
2. **Suyun var mı?** İki büyük seçenek: "Kuru tarım" / "Sulama var". Sulama seçilirse üç hazır
   düzey (kısıtlı / orta / bol; değerleri m³/da olarak yazar) + ince ayar kaydırıcısı.
3. **Şu an ne ekiyorsun?** Üç yıl için üç ürün seçici (ikonlu çipler).
4. **En çok neyi önemsiyorsun?** Dört tek seçimli kart: Su tasarrufu / Gelir / Toprak sağlığı /
   Dengeli. Her biri motorun öncelik ağırlıklarına bir ön ayar olarak eşlenir.

"Gelişmiş ayarlar" kapalı gelir: alan, eğim, toprak dokusu (SoilGrids tahmini dolu), sulama
yöntemi/verimi, dışlanan ürünler, ayrıntılı öncelik kaydırıcıları, fiyat/maliyet varsayımları.
Alan için varsayılan görünür bir tek satır olarak kalabilir.

İstasyon yağışı kalibrasyonu gizlenmez: yağış kalibre değilse adımın sonunda tek satırlık,
dikkat çeken ama engellemeyen bir kart çıkar ("Yakın istasyonun yıllık yağışını biliyor musun?").

Adımın sonunda tek birincil düğme: **Önerileri göster**.

### 3. Öneriler adımı: önce hüküm, sonra ayrıntı
- En üstte **tek cümlelik özet** (motor sayılarından üretilir, uydurma yok): en yüksek uyum
  puanlı plan, mevcut plana göre su açığı, marj ve toprak göstergesi farkı.
- Altında **karşılaştırma tablosu**: satırlar mevcut + 3 öneri (+ kullanıcının planı), sütunlar
  su açığı, bütçe aşımı, toprak göstergesi, marj (senaryo), risk. Her hücrede mevcut plana göre
  yön oku ve mini çubuk. Mobilde yatay kaydırma yerine yığılmış kompakt kartlar.
- Bir satıra tıklayınca o planın **ayrıntı kartı** açılır (şimdiki PlanCard içeriği: şerit takvim,
  P10–P90, bileşenler, "Neden bu plan?"). Aynı anda bir ayrıntı açık.
- Senaryo: üç hazır ayar büyük segment düğmeleri olarak görünür; kaydırıcılar "Kendi senaryon"
  altında kapalı.
- Pareto grafiği, kendi rotasyonunu ekleme, varsayımlar ve ekonomi düzenleyici "Daha fazla"
  altında toplanır.
- "Karar sizin" notu bu adımda görünür kalır (kısa hâli).

### 4. Kanıt adımı
Üstte üç büyük sayı (yağış, ET₀, su açığı) kalır. Grafikler sekmeli: Yağış ve ET₀ / Aylık denge /
Don ve sıcak / Toprak nemi / NDVI. Aynı anda bir grafik. Açıklama balonları yerinde kalır.

### 5. Dil ve yoğunluk
- Her ekranda en çok bir paragraf giriş metni. Uzun açıklamalar "?" balonuna ya da Yöntem sayfasına.
- Terimler çiftçi diliyle, bilimsel adı balonda: "Bitkinin su ihtiyacı (ET₀)" gibi.
- Sayılar büyük, birimler küçük; renk yalnız anlam taşıdığında (iyi/kötü yönü).

### 6. İlk giriş tanıtımı
İlk ziyarette tam ekran, dört kareden oluşan bir karşılama:
1. **Ne yapar?** "Tarlan için üç yıllık ekim sırasını NASA verisiyle karşılaştırır."
   Arka planda sade, kod ile çizilmiş bir görsel (uydu izi → tarla şeritleri); stok görsel yok.
2. **Nasıl çalışır?** Üç adım: Tarlam → Öneriler → Kanıt, her biri tek satır.
3. **Neye güvenmeli?** Sayılar 2001'den bugüne gerçek yılların yayılımıdır; fiyatlar varsayımdır;
   karar çiftçinin ve yerel uzmanındır.
4. **Başla:** iki düğme: "Örnek tarlayla dene" (index'teki ilk pilotu yükler ve doğrudan Öneriler
   adımına götürür) ve "Kendi tarlamı seçeceğim" (Tarlam adımı).

Kurallar: her karede "Geç" var; Esc kapatır; ok tuşları ve kaydırma ile gezilir; odak tuzağı ve
`aria-modal`; `prefers-reduced-motion` altında animasyon yok; görüldü bilgisi `localStorage`'da
(try/catch; erişilemezse tanıtım her seferinde gösterilir ama sayfa çalışır); üst menüde
"Tanıtımı göster" ile yeniden açılır; Türkçe ve İngilizce. Sunucu tarafı render ile uyumlu:
hydration uyarısı ve içerik sıçraması olmamalı.

Tanıtımdan sonra ilk kullanımda, adım çubuğunun altında tek satırlık bağlamsal ipucu görünür
(adım başına bir kez, kapatılabilir). Çok adımlı "spotlight turu" yapılmaz.

### 7. Hareket
Adım geçişleri ve ayrıntı açılışları kısa (150–220 ms), ease-out, yalnız opacity/transform.
Sayılar senaryo değişince yumuşakça güncellenir. Süs amaçlı sürekli animasyon yok.

## Değişmeyenler
Motor, veri katmanı, API, sayılar, izlenebilirlik diyaloğu, Yöntem sayfası, TR/EN, açık/koyu tema,
kalibrasyon mantığı. Hiçbir özellik silinmez; yalnızca yeri ve görünürlüğü değişir.

## Kabul ölçütleri
- İlk ziyaret: tanıtım açılır; "Örnek tarlayla dene" ile en çok 2 tıklamada öneriler görünür.
- İkinci ziyarette tanıtım açılmaz; menüden yeniden açılabilir.
- 1024 px'te her adımın ilk ekranı kaydırmadan ana eylemi gösterir; Tarlam adımında
  Gelişmiş kapalıyken görünen kontrol sayısı 15'in altında.
- 375 px'te yatay taşma yok, adım çubuğu başparmak erişiminde.
- Klavye ile baştan sona kullanılabilir; odak görünür; kontrast AA.
- `tsc`, lint, test, build temiz; konsolda hata ve hydration uyarısı yok.
