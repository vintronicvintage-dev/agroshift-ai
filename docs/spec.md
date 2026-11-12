# AgroShift AI v1.0 — Spesifikasyon

NASA Space Apps Challenge 2026, "Field Shift: Adapting Farms with NASA Data".

## 1. Amaç

Çiftçi tarlasını haritadan seçer, toprağını, sulama suyu bütçesini, mevcut rotasyonunu ve
önceliklerini girer. Araç NASA verileriyle **en az üç** üç yıllık rotasyon stratejisini
(mevcut rotasyon dahil) karşılaştırır. Her strateji için: neden önerildi, hangi kanıta
dayanıyor, olası faydalar, bilgi boşlukları ve yerel uzman incelemesi gereken riskler.

Araç karar vermez, karar destekler. Her ekranda bu açıkça görünür.

### Anti-hedefler (bunlar olursa proje başarısızdır)
- Uydurma veri veya rastgele sayı. Veri yoksa "veri yok" yazılır.
- "Yapay zekâ" diye sunulan ama içi boş bir kutu. Her sayı kaynağına ve formülüne izlenebilir.
- Kesinmiş gibi sunulan kâr/verim rakamı. Ekonomi çıktıları **senaryo** etiketlidir, aralıkla
  (P10–P50–P90) gösterilir ve varsayımları kullanıcı düzenleyebilir.
- Demo sırasında API bekleyip donan ekran.

## 2. Mimari

Tek Next.js 16 (App Router, TypeScript, Tailwind 4) uygulaması, kök: `agroshift/`.

```
src/lib/engine/     saf TS hesap motoru (I/O yok, deterministik, vitest ile testli)
src/lib/crops/      ürün veritabanı + rotasyon kuralları (kaynak atıflı)
src/lib/data/       NASA/SoilGrids istemcileri, önbellek, tip dönüştürme (yalnız sunucu)
src/app/api/        route handler'lar: /api/climate, /api/soil, /api/ndvi
src/data/snapshots/ gömülü anlık kopyalar (JSON, kaynak+tarih+birim meta verili)
scripts/            snapshot üretimi, doğrulama betikleri (tsx ile)
src/app, src/components  arayüz
```

Hesap tarayıcıda çalışır (motor saf TS). Sunucu yalnızca veri getirir ve önbelleğe alır.
Hazır pilot bölgeler gömülü kopyadan anında açılır; haritadan seçilen başka nokta canlı çekilir.

Sahiplik: `engine/` ve `crops/` = motor ajanı. `data/`, `api/`, `scripts/`, `snapshots/` = veri
ajanı. `app/`, `components/` = arayüz ajanı. Kimse başkasının klasörüne yazmaz.
`src/lib/types.ts` motor ajanınındır; veri ajanı yalnız §3'teki sözleşmeye uyar.

## 3. Veri sözleşmesi (veri katmanı → motor)

```ts
// src/lib/types.ts içinde aynen yer alır
export interface DailyWeather {
  date: string;        // "YYYY-MM-DD"
  tmax: number | null; // °C, 2 m
  tmin: number | null; // °C
  tmean: number | null;// °C
  rh: number | null;   // %, 2 m bağıl nem
  wind2m: number | null;// m/s, 2 m
  rs: number | null;   // MJ/m²/gün, yüzeye gelen kısa dalga
  precip: number | null;// mm/gün
  gwetRoot: number | null; // 0–1, kök bölgesi toprak ıslaklığı (MERRA-2)
  gwetTop: number | null;  // 0–1
}
export interface SourceMeta {
  name: string; provider: string; url: string;
  retrievedAt: string; spatialResolution: string; note?: string;
}
export interface ClimateSeries {
  lat: number; lon: number; elevation: number; // m
  start: string; end: string;
  daily: DailyWeather[];
  sources: SourceMeta[];
}
export interface SoilProfile {
  sand: number; silt: number; clay: number; // %, 0–30 cm ağırlıklı ortalama
  soc: number | null;   // g/kg
  ph: number | null;
  textureClass: string; // USDA
  origin: "soilgrids" | "user" | "default";
  sources: SourceMeta[];
}
export interface NdviSeries {
  lat: number; lon: number;
  points: { date: string; ndvi: number }[]; // 16 günlük MODIS
  sources: SourceMeta[];
}
```

Eksik değer `null` kalır (POWER'ın -999'u null'a çevrilir). Motor boşlukları raporlar,
sessizce doldurmaz; yalnız ≤3 günlük boşlukları doğrusal enterpolasyonla doldurur ve sayısını
bildirir.

### Kaynaklar
- **NASA POWER Daily API** (kimlik gerekmez), community=AG. Parametreler: `T2M_MAX,T2M_MIN,T2M,
  RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR,GWETROOT,GWETTOP`. Dönem 2001-01-01 → son tam yıl sonu
  + içinde bulunulan yıl. Birimleri yanıt başlığından doğrula (ALLSKY MJ/m²/gün olmalı).
- **MODIS MOD13Q1 NDVI**, ORNL DAAC web servisi `https://modis.ornl.gov/rst/api/v1/` (kimlik
  gerekmez; istek başına 10 tarih sınırı var, parçala). Ölçek çarpanı 0.0001, kalite filtresi uygula.
- **GPM IMERG / SMAP**: `EARTHDATA_TOKEN` (.env.local) varsa ve çalışıyorsa aylık IMERG ile POWER
  yağışını çapraz kontrol et. Token çalışmazsa bu adımı atla, arayüzde "IMERG doğrulaması
  yapılmadı" olarak görünsün. Token'ı asla loglama, koda ya da git'e yazma.
- **SoilGrids v2.0** (ISRIC, NASA değil; "yerel toprak bilgisi" için varsayılan tahmin):
  `https://rest.isric.org/soilgrids/v2.0/properties/query`. Servis sık düşer: zaman aşımı 15 sn,
  hata olursa `origin: "default"` ile bölgesel varsayılan döndür ve bunu işaretle.
- Harita altlığı OSM; NDVI katmanı için **NASA GIBS** WMTS (MODIS_Terra_NDVI_8Day veya eşdeğeri).

### Önbellek ve kopyalar
`/api/*` yanıtları koordinat 0.05° ızgaraya yuvarlanarak `.cache/` altında diske yazılır (TTL 7 gün).
`scripts/build-snapshots.ts` şu pilot noktalar için gerçek veriyi çekip `src/data/snapshots/`
altına yazar: Konya-Çumra (37.57, 32.77), Şanlıurfa-Harran (36.87, 39.03), Adana-Yüreğir
(36.98, 35.43), Edirne-Uzunköprü (41.27, 26.69), Polatlı-Ankara (39.58, 32.15).
Kopyalar git'e girer. Günlük seri büyükse alan adlarını kısaltıp sıkıştırılmış dizi biçiminde
sakla, yükleyicide `ClimateSeries`'e aç.

## 4. Hesap motoru

Hepsi saf fonksiyon. Her çıktı `evidence` taşır: kullanılan formül adı, girdiler, kaynak.

### 4.1 ET₀ — FAO-56 Penman–Monteith (günlük)
FAO-56 Bölüm 3–4 denklemleri: Eq. 6 (PM), 7 (basınç), 8 (γ), 11–13 (es, Δ), 19 (ea, RHmean'den;
RHmax/min yok), 21–25 (Ra, N), 37 (Rso), 38–40 (Rns, Rnl, Rn). G=0. Rüzgâr zaten 2 m.
Test: FAO-56 Örnek 18 (Brüksel, 6 Temmuz) ET₀ ≈ 3.9 mm/gün (RH'den ea türetimi farkı için
tolerans ±0.15) ve Örnek 17 ara değerleri. Ayrıca Hargreaves (Eq. 52) yedek ve çapraz kontrol.

### 4.2 Ürün su dengesi (günlük, FAO-56 Bölüm 6–8)
- Tek Kc yaklaşımı, evre uzunluklarına göre Kc eğrisi (ini, dev, mid, late).
- Kök derinliği evreyle büyür; TAW = 1000·(θFC−θWP)·Zr. θFC/θWP toprak dokusundan
  (Saxton & Rawls 2006 pedotransfer; sand, clay, organik madde).
- RAW = p·TAW; Ks = (TAW−Dr)/((1−p)·TAW) (Eq. 84). ETa = Ks·Kc·ET₀.
- Etkili yağış: günlük dengede yağış doğrudan girer, TAW'ı aşan kısım derin süzülme;
  yüzey akışı için basit SCS-CN (doku sınıfına göre CN).
- Sulama: yıllık bütçe (mm, net) ve sulama verimi kullanıcı girdisi. Kural: Dr ≥ RAW olduğunda
  ve bütçe kaldıysa RAW kadar sula. Bütçe biterse stres başlar. Çıktı: sulama olayları,
  kullanılan su, karşılanamayan açık (mm ve m³; 1 mm × 1 da = 1 m³).
- Sezonlar arası toprak nemi taşınır (rotasyonun gerçek etkisi: nadas ve erken hasat su biriktirir).
- Verim tepkisi (FAO-33/66): 1 − Ya/Ym = Ky·(1 − ETa/ETc), sezonluk Ky.
- Stres günleri: kritik evrede don (tmin < ürün eşiği), sıcak stresi (tmax > eşik).

### 4.3 Tarihsel yeniden oynatma
Üç yıllık her plan, kayıttaki **her** ardışık üç yıllık pencereye (2001→bugün) uygulanır.
Çıktı dağılımdır: P10/P50/P90 su açığı, verim oranı, brüt marj; "bütçeyi aşan pencere oranı".
Belirsizlik budur: gerçek yılların yayılımı. Sentetik gürültü eklenmez.

### 4.4 Senaryo kaydırıcıları
Yağış çarpanı (−40%…+20%), sıcaklık farkı (0…+4 °C; tmax/tmin/tmean'e eklenir, ET₀ yeniden
hesaplanır, RH sabit tutulur ve bu varsayım belirtilir), sulama bütçesi, ürün fiyatı çarpanı.
Hazır ayarlar: "Tipik", "Kurak (yağış −25%)", "Sıcak ve kurak (+2 °C, −25%)".

### 4.5 Toprak sağlığı ve rotasyon göstergeleri (kural tabanlı, su hesabından ayrı gösterilir)
- Ürün çeşitliliği (farklı aile sayısı), ardışık aynı aile cezası (hastalık/zararlı döngüsü),
- Baklagil varlığı ve tahmini azot katkısı (kg N/ha aralığı, literatür),
- Çıplak toprak günleri (hasat → sonraki ekim arası; erozyon riski, eğim varsa ağırlaşır),
- Kök derinliği çeşitliliği, artık/organik madde katkısı sınıfı (düşük/orta/yüksek),
- 0–100 bileşik "toprak sağlığı puanı"; ağırlıklar görünür ve belgelidir.
Bunlar ölçüm değil göstergedir; arayüz böyle etiketler.

### 4.6 Optimizasyon
Aday ürün kümesinden tüm üç yıllık diziler numaralandırılır (n³, n ≤ 12). Sert kısıtlar:
ekim takvimi çakışması yok, bölge iklimine uygunluk (GDD ve don penceresi), kullanıcının
dışladığı ürünler, aynı ürün üst üste en çok 2 (şeker pancarı, ayçiçeği, nohut, mercimek, kuru fasulye ve fiğ için 1).
Kural döngüseldir: 3. yıldan sonraki 1. yıla geçiş de sayılır. Farklı baklagillerin art arda
gelmesi yasak değildir ama toprak sağlığı puanında cezalandırılır ve yerel inceleme maddesi olur.
Amaç: çiftçi öncelik ağırlıklarıyla (su tasarrufu, gelir, toprak sağlığı, risk azlığı)
normalize edilmiş çok amaçlı puan. Çıktı: mevcut rotasyon + en iyi 3 alternatif + Pareto
cephesi (su açığı × marj × toprak puanı). Her öneri için gerekçe metni kural tabanlı üretilir
(şablon + gerçek sayılar), LLM kullanılmaz.

### 4.7 İklim eğilimleri
Yıllık yağış, ET₀, sıcak gün sayısı, don günü sayısı, GWETROOT için Mann–Kendall + Sen eğimi;
p değeri ile "anlamlı / anlamlı değil" etiketi.

## 5. Ürün veritabanı
En az: buğday (kışlık), arpa (kışlık), nohut, kırmızı mercimek, şeker pancarı, dane mısır,
ayçiçeği, kuru fasulye, yonca (tek yıllık dilim olarak), macar fiği (yem/örtü), pamuk, nadas.
Her ürün: aile, ekim/hasat penceresi (bölge enlemine göre kışlık/yazlık), evre uzunlukları,
Kc ini/mid/end, maksimum kök derinliği, p, Ky (FAO-56 Tablo 11, 12, 22; FAO-33/66), don ve sıcak
eşikleri, azot bağlama, artık sınıfı, referans verim (t/ha, sulu/kuru; TÜİK mertebesi), fiyat ve
değişken maliyet (TL; **varsayım**, kullanıcı düzenler). Her alan `source` ve
`confidence: "literature" | "assumption"` taşır. Emin olunmayan değer `assumption` işaretlenir.

## 6. Arayüz

Diller: Türkçe (varsayılan) ve İngilizce, tek tuşla. Tüm metinler sözlük dosyasından.

Akış (tek sayfa, üç bölüm):
1. **Tarla**: harita (MapLibre veya Leaflet + OSM, NASA GIBS NDVI katmanı aç/kapa), tıkla-seç
   ya da hazır pilot bölge. Alan (da), toprak (SoilGrids tahmini otomatik gelir, kullanıcı
   değiştirebilir), sulama bütçesi (m³/da/yıl ya da "kuru tarım"), sulama yöntemi (verim),
   mevcut rotasyon (3 yıl), öncelik kaydırıcıları, dışlanan ürünler.
2. **İklim kanıtı**: yağış ve ET₀ yıllık seri + eğilim, aylık su dengesi, don/sıcak günleri,
   kök bölgesi nemi, NDVI serisi (çıplak dönemleri gösterir). Terimler için kısa açıklama
   balonları (evapotranspirasyon, NDVI, su dengesi...).
3. **Rotasyon karşılaştırma**: mevcut + 3 öneri yan yana kart. Kartta: 3 yıllık şerit takvim,
   su açığı (P10–P90), bütçe aşımı hangi yıl, toprak sağlığı puanı ve bileşenleri, marj senaryosu
   aralığı, risk. "Neden bu plan?" açılır bölümü: gerekçe, kanıt (veri kaynağına bağlantılı),
   fayda, bilgi boşluğu, yerel uzmana sorulacaklar. Üstte senaryo kaydırıcıları; değişince
   kartlar anında güncellenir. Pareto grafiği. Kullanıcı kendi rotasyonunu da kurup ekleyebilir.
4. **Yöntem ve kaynaklar** sayfası: formüller, varsayımlar, sınırlar, veri kaynakları ve
   erişim tarihleri, yapay zekâ kullanım beyanı.

Tasarım: çiftçiye ve jüriye aynı anda okunaklı; sakin, toprak ve gökyüzü tonları, mobilde
kullanılabilir, açık/koyu tema. Genel şablon görünümünden kaçın. Grafikler: Recharts veya
doğrudan SVG. Erişilebilirlik: klavye, kontrast, renk körlüğüne uygun palet.

## 7. Test ve kabul
- `npm test` (vitest): ET₀ FAO örnekleri; su dengesi kütle korunumu (yağış+sulama = ETa+süzülme+
  akış+Δdepo, ±0.01 mm); tek yönlülük (yağış azalınca açık azalamaz, bütçe düşünce karşılanamayan
  açık azalamaz, sıcaklık artınca ET₀ azalamaz); eksik veri (null) uydurulmaz; sıfır bütçe;
  bütün planların bütçeyi aşması; optimizasyon kısıtları; Mann–Kendall bilinen seri.
- `npm run build` ve `npm run lint` hatasız.
- Gerçek veri: 5 pilot nokta için snapshot üretildi; Konya ET₀ yıllık toplamı literatür
  mertebesinde (≈1000–1300 mm), yıllık yağış ≈280–400 mm.
- Tarayıcıda uçtan uca: pilot seç → kartlar gelir → senaryo değiştir → sayılar değişir;
  haritadan rastgele nokta seç → canlı veri gelir.
