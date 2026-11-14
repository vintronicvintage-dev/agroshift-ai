# Teslim notları (taslak)

## Kısa proje özeti (~150 kelime)

AgroShift AI, bir çiftçinin önümüzdeki üç yıl için hangi ürünü hangi sırayla ekeceğine karar verirken kullanabileceği bir karar destek aracıdır. Çiftçi haritadan tarlasını seçer, toprağını, sulama bütçesini, mevcut rotasyonunu ve önceliklerini girer. Araç NASA POWER iklim verisi, MODIS NDVI ve toprak tahminiyle mevcut rotasyonu ve alternatifleri kayıttaki her üç yıllık dönemde gün gün yeniden oynatır. Her plan için su açığı, bütçe aşımı, toprak sağlığı göstergesi ve senaryo etiketli marj aralığı gösterilir. Sıcak ve kurak gibi senaryolar tek tıkla denenebilir. Her öneri gerekçesi, kanıtı, faydaları, bilgi boşlukları ve yerel uzmana sorulacak riskleriyle gelir. NASA POWER yağışı bazı noktalarda yüksek olduğu için yerel istasyon ortalamasıyla kalibrasyon seçeneği vardır. Araç karar vermez, çiftçinin ve yerel uzmanın yargısını destekler. Üretken yapay zekâ içermez, tüm çıktılar deterministik hesaplardır.

## Proje sayfası için uzun açıklama

**Problem.** İklim değiştikçe bir tarlada alışılmış ekim nöbeti aynı su ve verim sonucunu vermeyebilir. Çiftçi elindeki rotasyonu alternatiflerle, iklim kanıtıyla ve kendi su bütçesiyle karşılaştıracak bir araca zor ulaşıyor.

**Ne yapıyor.** AgroShift, kullanıcının tarlası için mevcut rotasyonu ve en fazla üç çeşitli alternatifi (ayrıca kullanıcının kendi kurduğu planları) yan yana koyar. Karşılaştırma 2001'den bugüne uzanan günlük NASA POWER verisi üzerinde, kayıttaki her ardışık üç yıllık pencerede yapılır. Sonuç tek bir sayı değil, gerçek yılların yayılımını gösteren P10–P90 aralığıdır. Gösterilenler: su açığı, bütçeyle karşılanamayan açık, hangi dönemde bütçenin aşıldığı, toprak sağlığı göstergesi, senaryo etiketli brüt marj ve risk bileşenleri. Yağış ve sıcaklık senaryoları, sulama bütçesi ve fiyat çarpanı kaydırıcılarla değiştirilir, kartlar anında güncellenir.

**Nasıl çalışıyor.** Hesap motoru saf TypeScript ile yazıldı. ET₀ için FAO-56 Penman–Monteith, günlük su dengesi, FAO-33/66 verim tepkisi, Saxton ve Rawls toprak hidroliği, SCS-CN yüzey akışı ve Mann–Kendall eğilim testi kullanılır. Optimizasyon, sert kısıtlar altında tüm üç yıllık dizileri eleyip adayları gün gün yeniden oynatır. Gerekçe metinleri şablon ve gerçek sayılardan üretilir.

**Güven ve sınırlar.** Gömülü pilot kopyalar (Konya-Çumra, Şanlıurfa-Harran, Adana-Yüreğir, Edirne-Uzunköprü, Polatlı-Ankara) sayesinde demo ağa bağlı değildir. NASA POWER yağışı Konya-Çumra'da yüksektir; arayüz bunu uyarır ve istasyon ortalamasıyla kalibrasyon sunar. Fiyat, maliyet ve referans verimler varsayımdır ve açıkça etiketlidir. GPM IMERG ile yağış çapraz kontrolü denendi ama tamamlanamadı; arayüz bunu "yapılmadı" olarak gösterir.

**Karar kimde.** Araç her ekranda kararın çiftçide olduğunu belirtir ve her öneri için yerel uzmana sorulacak noktaları listeler.

## Kullanılan NASA verileri

- NASA POWER Daily API (community AG): T2M, T2M_MAX, T2M_MIN, RH2M, WS2M, ALLSKY_SFC_SW_DWN, PRECTOTCORR, GWETROOT, GWETTOP. https://power.larc.nasa.gov/docs/services/api/temporal/daily/
- MODIS Terra MOD13Q1 NDVI (NASA LP DAAC), ORNL DAAC web servisi üzerinden. https://modis.ornl.gov/data/modis_webservice.html
- NASA GIBS, MODIS Terra NDVI 16 günlük harita katmanı. https://earthdata.nasa.gov/gibs
- GPM IMERG (NASA GES DISC): çapraz kontrol denendi, tamamlanamadı, doğrulama iddiası yok.

NASA dışı: SoilGrids v2.0 (ISRIC) toprak tahmini, OpenStreetMap harita altlığı.

## Yapay zekâ kullanım beyanı

Bu projenin kodu ve belgeleri, ekibin yönlendirmesi ve denetimi altında yapay zekâ kodlama asistanlarıyla (Anthropic Claude modelleri) yazıldı. Ürünün kendisi üretken yapay zekâ modeli içermez; tüm çıktılar deterministik hesaplardır ve aynı girdi her zaman aynı çıktıyı verir. Öneri gerekçeleri şablon ve gerçek sayılardan üretilir.

## Elle yapılacaklar

- [ ] Uygulamayı yayına al (deploy) ve herkese açık URL'yi test et; pilot bölgelerin ağ olmadan da açıldığını doğrula.
- [ ] `npm run build`, `npm run lint` ve `npm test` çıktılarını son bir kez al.
- [ ] 13 Kasım'da yayımlanan Project Submission Guide'ı oku: zorunlu alanları, dosya ve video sınırlarını, teslim son tarihini not et.
- [ ] 13 Kasım'da yayımlanan Judging & Awards Guide'ı oku: değerlendirme ölçütlerine göre özeti ve demoyu gözden geçir.
- [ ] Demo videosunu `docs/demo-script.md` ile kaydet, süre sınırını kontrol et, kalibrasyonda kullandığın istasyon değerinin kaynağını not et.
- [ ] Space Apps proje sayfasını doldur: özet, uzun açıklama, NASA verileri listesi, yapay zekâ beyanı, repo ve demo bağlantıları.
- [ ] Lisansa karar ver ve README'deki "License: to be decided by the team" satırını güncelle.
- [ ] Yönerge, yapay zekâ kullanımı için ayrı bir form veya alan istiyorsa onu doldur.
- [ ] `.env.local` ve token'ın repoya girmediğini kontrol et.
- [ ] Teslimden önce kendin dışında biriyle uygulamayı baştan sona dene.
