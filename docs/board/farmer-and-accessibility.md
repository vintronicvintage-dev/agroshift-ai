# AgroShift AI: Çiftçi ve Erişilebilirlik Kurul Değerlendirmesi

Bakış açısı: Mehmet (52, Konya, 180 dekar buğday ve şeker pancarı, Android telefon, açık havada, WhatsApp ve e-Devlet kullanıyor, kara kutuya güvenmiyor). İkinci kişi: Ayşe (29, ilçe müdürlüğü ziraat mühendisi).

Yöntem: Ekran görüntüleri (390 koyu 8 adet, 1440 koyu öneriler ve genel, 1440 açık genel), `src/lib/i18n/dict.ts`, bileşen kaynağı, WCAG 2.2 AA, Vercel Web Interface Guidelines (kurallar `command.md` kaynağından çekildi), sade dil ilkeleri ve yarışmanın şartları ("çiftçi kolayca yorumlayabilmeli", "kendi öncelik ve kısıtlarını girebilmeli", "yerel uzmanın yerine geçmez", "ET, nem anomalisi, NDVI, don riski, su dengesi açıklanmalı").

Not: Kontrast oranları ekran görüntülerinden gözle tahmin edildi, ölçülmedi. Ölçüm gerektiren maddeler "doğrulanmalı" diye işaretli.

---

## 0. Tek paragraf hüküm

Araç mühendislik açısından dürüst ve izlenebilir (varsayım etiketleri, "Karar senin", kaynak açma, sınırlar sayfası). Ama ilk ekran, sözlük ve sonuç cümlesi Mehmet için değil, hesabı yazan kişi için yazılmış. Ana akışta "Uyum 68/100", "Su açığı mm/yıl", "ET₀", "p = 0,009", "Sen eğimi", "P90", "Öneri 1" var; çiftçinin sorduğu iki soru ("dekara kaç kilo, kaç lira?" ve "kaç sulama?") hiçbir yerde doğrudan cevaplanmıyor. En ağır güven kırıcı: "en uygun" denen plan, mevcut plandan **1.016 TL/da daha az brüt kâr** getiriyor (102 ve 1.117) ve bu kırmızı bir satır olarak "en uygun" başlığının altında duruyor; Mehmet bunu okuyup aracı kapatır.

---

## 1. Puanlı değerlendirme (0-10)

| Ölçüt | Puan | Tek satır gerekçe |
|---|---|---|
| İlk ekran netliği | 5 | Genel bakış boşken "Önce tarlanı seç" net; ama üstte "Giriş kapalı, pano misafir" şeridi, "Tipik" senaryo seçici, kesilen Başlarken kartları ve "pilot" dili dikkat dağıtıyor; "bu araç bana ne verecek?" cümlesi tek satırda yok. |
| Sözcük dağarcığı | 4 | "Uyum, su açığı, ET₀, NDVI, kalibrasyon, randıman, pano, pilot, senaryo, rotasyon, anomali, doku sınıfı (USDA), Sen eğimi" günlük çiftçi Türkçesi değil; "nadas, buğday, sulama, don, yağış" yerinde ve iyi. |
| Sayılar ve birimler | 4 | Dekar doğru seçilmiş ama "da" kısaltması ve "mm / m³/da / ton su" üçlüsü çiftçiye bağlanmıyor; kg/da verim ve toplam TL hiç yok; Yöntem sayfasında t/ha çıkıyor (dekar-hektar karışıklığı); ondalık risk "0,42" anlamsız. |
| Güven ve şeffaflık | 7 | Varsayım rozeti, "Karar senin", kaynak/formül penceresi, "yağış düzeltilmedi" uyarısı, "üretken YZ yok" çok iyi; ama "en uygun" etiketi kâr kaybını örtüyor ve belirsizlik "P10/P90/%80" diliyle veriliyor. |
| Hata mesajları | 6 | Auth hataları ("E-posta ya da parola yanlış", "Birkaç dakika bekleyip tekrar dene") sade ve çözüm veriyor; veri hataları ("Ağ hatası: sunucuya ulaşılamadı", "Sunucu zamanında yanıt vermedi") neyin kaybolduğunu ve ne yapılacağını söylemiyor; "Supabase" gibi altyapı adı çiftçiye gösteriliyor. |
| Mobil, açık hava kullanılabilirliği | 5 | Alt sekme çubuğu ve büyük "Önerileri göster" düğmesi iyi (başparmak bölgesi); ama varsayılan koyu tema güneşte okunmaz, 11-12 px etiketler, kapat (×) düğmeleri küçük, ürün seçici "Buğ…" diye kesiliyor, 1 sayfa 9.000 px uzunlukta (Yöntem), yatay kaydırmalı kartlar. |
| Erişilebilirlik | 6 | Atlama bağlantısı, aria-label'lar, tablo alternatifi, `prefers-reduced-motion`, koordinatla seçim (harita alternatifi), ▲▼ + yazı çifti var; kontrast, küçük yazı, harita `role="application"`, canlı bölge eksikliği ve odak yönetimi açıkları var (Bölüm 5). |
| İlk kullanım (onboarding) | 6 | Tanıtım 4 kare, "Örnek tarlayla dene", dört soruluk Tarlam, hazır değerler: iyi iskelet; ama giriş/kayıt duvarı, "Başlarken" 5 kart + ipucu + tanıtım üç ayrı rehber olarak çakışıyor ve ilk değer göstergesi çok geç. |

Ağırlıklı genel: **5,4 / 10**. Motor 8, dil ve çıktı biçimi 4.

---

## 2. Dize dize denetim: en önemli 40 Türkçe arayüz metni

Çiftçi dili ilkeleri: kısa, konuşma Türkçesi, "sen" tutarlı, yabancı sözcük yok, istatistik terimi ana akışta yok (detay açılırında kalabilir). Önerilen metinlerde varsayım gerektiren sayılar köşeli parantezle gösterildi.

| # | Anahtar | Mevcut | Sorun | Önerilen |
|---|---|---|---|---|
| 1 | `app.tagline` | NASA verisiyle üç yıllık ekim nöbeti karşılaştırması | İyi ("ekim nöbeti" doğru) ama ne kazandıracağını söylemiyor | Tarlana uygun ekim nöbetini, NASA verisi ve kendi şartlarınla seç |
| 2 | `judgment.body` | Bu araç senin ve yerel uzmanının bilgisini tamamlar, onların yerine geçmez. | "Tamamlar" soyut; ziraat mühendisi/ilçe müdürlüğü adı geçmiyor | Bu araç sana yardımcı olur, karar vermez. Ekmeden önce ilçe tarım müdürlüğündeki veya bildiğin ziraat mühendisiyle konuş. |
| 3 | `step.compare` / `nav` | Öneriler | Genel; "Planlar" ne? | Ekim nöbeti önerileri |
| 4 | `step.evidence` | Kanıt | Mahkeme dili; çiftçi "iklim verisi"ni arar | Veriler (iklim, toprak) |
| 5 | `step.field.lead` | Dört soruyu yanıtla. Gerisinin hazır bir değeri var. | Çok iyi; sadece "gerisi" belirsiz | Dört soruya cevap ver. Kalanını biz tipik değerle dolduruyoruz, sonra değiştirebilirsin. |
| 6 | `site.mapHint` | Haritada tarlanın olduğu yere dokun. Hazır bölgeler dışındaki noktaların verisi canlı gelir, biraz sürebilir. | "Canlı veri", "hazır bölge" teknik; "biraz" belirsiz (gerçekte 30-90 sn) | Haritada tarlanın olduğu yere dokun. Hazır köyler hemen açılır; başka yer seçersen veri internetten iner, 1-2 dakika sürebilir. |
| 7 | `load.loadingLong` | NASA POWER 2001'den bu yana günlük seriyi hazırlıyor. Bu 30 ile 90 saniye sürebilir; bu sırada sayfayı kullanabilirsin. | "Günlük seri", kurum adı baskın | Tarlanın 25 yıllık hava verisi indiriliyor. 1-2 dakika sürebilir; bekleyen sürede soruları cevaplayabilirsin. |
| 8 | `load.timeout` + `load.network` | Sunucu zamanında yanıt vermedi. / Ağ hatası: sunucuya ulaşılamadı. | Neyin kaybolmadığını ve ne yapacağını söylemiyor | İnternet yavaş ya da kesildi. Girdiğin bilgiler duruyor. Bağlantın düzelince "Tekrar dene"ye bas. |
| 9 | `field.area` | Alan / dekar | Doğru birim; ama varsayılan 50 "örnek değer", Mehmet'in 180'i | Tarlanın büyüklüğü (dekar). "Bilmiyorum" için 100 dekar gibi hazır seçenek ve "Tapu/ÇKS'deki alan" ipucu |
| 10 | `field.slope` | Ortalama eğim (isteğe bağlı) % | "Yüzde eğim" çiftçi için "yatay mı, meyilli mi" | Tarla ne kadar meyilli? Düz / Hafif meyilli / Dik |
| 11 | `field.soil` + `field.sand/silt/clay` | Toprak (0–30 cm), Kum, Silt, Kil | "Silt" Türkçe değil (tınlı/mil); yüzde girişi laboratuvarsız mümkün değil | Toprağın nasıl? Kumlu / Tınlı / Killi (fotoğraflı seçim). Analizin varsa yüzdeleri gelişmişte gir. |
| 12 | `field.texture` | Doku sınıfı (USDA): {cls} | USDA ve "doku sınıfı" yabancı | Toprak cinsi: {cls} (ör. killi tın) |
| 13 | `field.rainfed` | Kuru tarım (sulama yok) | İyi; "kuru tarım" yerleşik | Kuru tarım (sulamam yok) |
| 14 | `field.budget` | Yıllık sulama suyu (net) m³/da/yıl | "Net" ve m³/da bütçe kavramı yabancı; su hakkı dilimine bağlı değil | Bir yılda dekara kaç ton su verebiliyorsun? (1 ton = 1 m³ = dekara 1 mm) Kaçı: [250 ton ≈ 4-5 sulama] |
| 15 | `field.efficiencyHelp` | Suyun ne kadarının bitkiye ulaştığı. Tipik değerler: karık 0,60, … Kaynaktan çekilen su = net / randıman. | Formül dili, ondalık oran | Verdiğin suyun ne kadarı bitkiye ulaşıyor? Salma ≈ 10'da 6, yağmurlama ≈ 10'da 7-8, damla ≈ 10'da 9. |
| 16 | `q.water.level.*` | Kısıtlı / Orta / Bol, 125/250/500 m³/da | Etiket ile sayı birbirine bağlı değil; birim "m³/da" | Az (yılda ≈ 2 sulama) / Orta (≈ 4) / Bol (≈ 8) [her sulama ≈ 60 ton/da varsayımı yazılsın] |
| 17 | `field.rotation` / `q.crops` | Şu anki ekim sıran / Şu an ne ekiyorsun? Üç yıllık sıran | "Şu an ne ekiyorsun" ile "üç yıllık sıra" çelişiyor; 1.-2.-3. yıl hangisi bugün? | Son üç yılda ne ektin? (geçen yıl, bu yıl, gelecek yıl) ya da "Bu sene ektiğim ve gelecek iki yıl için aklımdaki" |
| 18 | `q.prio` + `prio.*` | En çok neyi önemsiyorsun? Su tasarrufu / Gelir / Toprak sağlığı / Dengeli | Kartların alt metni "%50 bu, kalan üçü %17" matematik | En çok neye önem veriyorsun? Su kıtlığı / Kazanç / Toprağım yorulmasın / Hepsi bir arada. Alt metin yalnız "daha çok kazanç yönünde" gibi |
| 19 | `calCard.*` | Yakın istasyonun yıllık yağışını biliyor musun? Uydu yağışı bazı yerlerde yüksek çıkar. | "İstasyon", "uydu yağışı", "kalibrasyon" kopuk; çiftçi bunu bilmez | Senin bölgede yılda yaklaşık kaç mm yağmur yağar? (Biliyorsan yaz; bilmiyorsan boş bırak. MGM/DSİ de kullanılabilir.) |
| 20 | `cal.none` / `al.uncal` | Yağış düzeltilmedi / Yağış istasyonla düzeltilmedi | "Düzeltilmedi" hata gibi okunuyor, ne yapacağını söylemiyor | Yağış rakamları yaklaşık. Bölgenin yıllık yağışını yazarsan daha doğru olur. |
| 21 | `adv.title` | Gelişmiş ayarlar / 50 da, toprak: SoilGrids tahmini | "Gelişmiş" korkutur; "da" ve "SoilGrids" açılmamış | Daha ayrıntılı bilgi (isteğe bağlı) / 50 dekar, toprak: uydu tahmini |
| 22 | `cta.show` | Önerileri göster | Tamam ama bekleme süresini bilmiyor | Ekim nöbeti önerilerini göster |
| 23 | `v.lead` | Önceliklerine en uygun plan {plan} (Öneri 1) | "Öneri 1" boş bir etiket; ürün adı alt satırda; hüküm cümlesi değil | Senin için en uygun sıra: Arpa, nadas, macar fiği. (Bunun neden böyle çıktığı aşağıda.) |
| 24 | `v.def.better` | 57 mm/yıl daha az su açığı | "Su açığı mm/yıl" soyut | Yılda dekara ≈ 57 ton daha az sulama suyu gerekir. |
| 25 | `v.mar.worse` | 1.016 TL/da daha düşük brüt kâr | Kırmızı ve gerekçesiz; en çok güven kıran satır | Dikkat: Bugünkü sıranın yanında dekara yılda ≈ 1.016 TL daha az kazanç beklenir (varsayılan fiyatlarla). Su ve toprak kazancı bunun karşılığı. |
| 26 | `v.soil.better` | toprak göstergesi 32 puan daha iyi | "Gösterge", "puan" ölçü olarak anlamsız; tarla toprağı için ne demek? | Toprak daha dinlenmiş kalır (baklagil ve nadas sayesinde) |
| 27 | `plan.score` / `plan.scoreHelp` | Uyum 68/100 | 68 neye göre? 40 neye göre? Ölçeği yok | Sana uygunluk: İyi (68/100). Bugünkü sıran: Zayıf (40/100). Üç harfli şerit: zayıf-orta-iyi |
| 28 | `plan.deficit` | Su açığı / yağışın ve topraktaki suyun karşılamadığı yıllık ihtiyaç | Doğru ama çiftçi "eksik su" der | Yağmurun karşılamadığı su (dekara, yılda) |
| 29 | `plan.budgetYears` | Suyun yetmediği dönemler / Su her dönemde yetti | "Dönem" = hangi üç yıl? | Sulama suyun kaç yılda bitti? "25 yılın 25'inde yetti" yerine "10 yılın 10'unda yetti" |
| 30 | `plan.margin` | Brüt kâr / varsayım | "Brüt kâr" doğru ama gider kalemleri yok; "varsayım" rozeti iyi | Tahmini kazanç (masraf düşülmüş, TL/dekar). Fiyatı kendin yaz. |
| 31 | `plan.risk` + `plan.riskComp.*` | Risk Düşük 0,08; Bütçe aşımı, Düşük verim yılı, Don/sıcak stresi 0,34 | Ondalık oran anlamsız; "Don/sıcak stresi 0,34" korkutur ya da hiçbir şey demez | Zarar etme ihtimali: Az. "10 yılın 1'inde verim düşük kalır" |
| 32 | `plan.range` | Dönemlerin %80'i: 61–111 mm | İstatistik | 10 yılın 8'inde bu aralıkta kalır: 61-111 ton/dekar |
| 33 | `plan.yield` | Verim oranı (Ya/Ym, P50) | Tamamen jargon | Beklenen verim: normalin %85'i (kuru yıl ≈ %60) ve **kg/dekar** olarak |
| 34 | `plan.why` + `plan.sec.*` | Neden bu plan? / Gerekçe, Kanıt, Olası faydalar, Bilgi boşlukları, Yerel uzmana sor | Başlıklar iyi fikir, adlar ağır ("bilgi boşlukları") | Neden bu sıra? / Neden / Neye dayanıyor / Ne kazanırsın / Nelere dikkat et / Müdürlüğe ne sor |
| 35 | `ev.et0` | Bitkinin su ihtiyacı (ET₀) | ET₀ kısaltması ve "bitkinin su ihtiyacı" aslında "referans çimin" ihtiyacı; yanlış izlenim | Bölgede bitkilerin bir yılda kullanabileceği su (buharlaşma + terleme) / terim açılır notta: ET₀ |
| 36 | `ev.gap` / `ov.st.gap` | Su açığı (ET₀ eksi yağış) 640 mm | 640 mm hangi ürün için? "açık" sürekli aynı sözcük farklı anlamda | Yağmurun karşılamadığı su: yılda ≈ 640 ton/dekar (sulamasız olsa bu kadar eksik kalırdı) |
| 37 | `ev.trendSig` | belirgin eğilim… tesadüf olması zor (p = 0,009) / yılda −1,23 gün (Sen eğimi) | p değeri ve Sen eğimi ana akışta | Don günleri azalıyor: 25 yılda yaklaşık 30 gün azalmış. Teknik ayrıntı: p = 0,009 (açılır nota) |
| 38 | `al.violation` / `al.trend.*` | Şu anki planın bir kısıtı aşıyor / Kök bölgesi nemi azalıyor | "Kısıt" belirsiz; "Kök bölgesi nemi" tarladaki toprak nemi mi? | Şu anki sıran sorun çıkarabilir: buğday arka arkaya... / Toprak nemi yıllar içinde azalıyor |
| 39 | `ev.qualityBody` | 9.444 gün. Komşu günlerden doldurulan… Penman–Monteith, Hargreaves yedeği | Mühendis için doğru, çiftçi için gürültü; ana sayfada | Ana ekranda: "Veri 25 yıl, eksik 6 gün (önemsiz)". Detay: Mühendis ayrıntısı (açılır) |
| 40 | `auth.guest.*` / `guest.strip` | Giriş altyapısı bağlı değil. Bu kurulumda giriş servisi (Supabase) bağlı değil… / Giriş kapalı, pano misafir olarak açık. | Geliştirici dili, ilk ekranda hata gibi görünüyor | Giriş şimdilik gerekmiyor, doğrudan kullanabilirsin. (Bu şerit üretimde hiç görünmemeli.) |

Ek hızlı düzeltmeler (aynı ruhla): `build.duplicate` "Bu rotasyon zaten…" -> "Bu ekim nöbeti zaten listede."; `pareto.rotation` "Rotasyon" -> "Ekim nöbeti"; `al.climateError` "Rotasyon hesabı" -> "Ekim nöbeti hesabı"; "pano" -> "sayfa/ekran"; "pilot" -> "hazır bölge/köy"; "dönem" tek başına geçtiği yerde "yıl grubu (üç yıllık)" ya da "yıl" denmeli; "Ekiş 5 Eki, hasat 27 haz" -> "5 Ekim'de ek, 27 Haziran'da biç" (kısaltma yok); tarih formatı ISO "2001-01-01" -> "1 Ocak 2001" (`Intl.DateTimeFormat`).

---

## 3. Mehmet'in takılacağı veya güveni kaybedeceği 10 an

1. **İlk saniye: hata gibi görünen şerit ve banner** (`390-dark-giris`, `390-dark-kayit`, `390-dark-genel-empty` üst şerit). "Giriş altyapısı bağlı değil (Supabase)". Mehmet "bozuk mu?" der. **Çözüm:** Giriş zorunlu olmasın, ilk ekran doğrudan aracı açsın; hesap, sonuç sonrası "kaydet/paylaş" anında istensin. Şerit üretimde hiç görünmesin. Parolasız giriş düğmesi devre dışı gibi (soluk) duruyor; ana düğme yapılsın, e-posta yerine telefon numarası/SMS ve e-Devlet seçeneği düşünülsün.
2. **"Önce tarlanı seç" ve haritada sarı noktalar** (`390-dark-genel-empty`). Mehmet'in tarlası sarı noktalardan biri değil (yalnız 5 hazır bölge). "Haritaya dokun" bilgisi harita 160 px yüksekliğinde Türkiye'nin tamamında, parmakla köy seçmek imkânsız. **Çözüm:** Önce "İl, ilçe, köy/mahalle" arama kutusu ve "Konumumu kullan" düğmesi; harita sonra. Bkz. Bölüm 6.
3. **Dört soru ekranı: "Kısıtlı/Orta/Bol m³/da"** (`390-dark-tarlam`). "125/250/500 m³/da" Mehmet'in su hakkıyla (dekar başına kaç saat/hangi kanal/kaç sulama) örtüşmüyor. **Çözüm:** "Yılda kaç sulama yapabiliyorsun?" 0-1-2-3-4+, altında "≈ 240 ton/dekar" çevirisi.
4. **Ürün seçici "Buğ…" "Nad…"** (`390-dark-tarlam`). Yarım yazılmış isimler; üç yıllık sıra mantığı (hangi yıl hangisi?) belirsiz; şeker pancarı listede var ama Mehmet'in aklındaki "geçen yıl pancar, bu yıl buğday" akışı sorulmuyor. **Çözüm:** Üç büyük kart, tam ad, ürün ikonu; "geçen yıl / bu yıl / gelecek yıl" etiketi; liste tam ekran seçim sayfası.
5. **"Önceliklerine en uygun plan Öneri 1" ve kırmızı "1.016 TL/da daha düşük brüt kâr"** (`390-dark-genel`, `1440-dark-genel`, `1440-dark-oneriler`). En uygun denen şey cebinden para götürüyor; Öneri 3 hem +621 TL/da hem 12 mm fazla su (daha çok kâr!). Gerekçe "Neden bu plan?" kapalı. **Çözüm:** Hükmü açık cümleyle yaz, kâr kaybını başlıkta söyle, "Kazancı öncelik yaparsan şu sıra çıkar" seçeneğini yan yana göster. Varsayılan öncelik "Dengeli" yerine tek soruyla netleştirilsin.
6. **"Uyum 68/100, şu anki planın 40"** (`390-dark-genel`). Mehmet hangi okulda 68 geçer? Kendi puanlama yok, ölçek yok. **Çözüm:** Puanı ana akıştan çıkar; yerine "Su: 57 ton/dekar daha az, Kazanç: 1.016 TL daha az, Toprak: daha iyi" şeklinde üç satır ve yeşil/sarı/kırmızı + metin.
7. **"Su açığı 74 mm/yıl", "Su yetmedi 0 %"** (`1440-dark-oneriler`). mm Mehmet için yağmur ölçüsü, sulama ölçüsü değil; "0" iyi mi kötü mü? **Çözüm:** "Dekara yılda 74 ton su eksik, sulamayla kapatılır, ≈ 1,5 sulama" ve "25 yılın 25'inde su yetti".
8. **Risk "Orta 0,42" / "Düşük 0,08" ve "Dönemlerin %80'i: 61–111 mm", "P90 0 mm"** (`1440-dark-oneriler`, `390-dark-oneriler`). İstatistik. Mehmet "ya bu sene kurak olursa?" diye sorar, cevap "0,34 don/sıcak stresi". **Çözüm:** "10 yılın 8'inde ... 2'sinde en kötü ..." (Bölüm 6).
9. **Kanıt sayfası: "Sen eğimi", "p = 0,107", "MERRA-2", "CERES SYN1deg", "Penman–Monteith"** (`390-dark-kanit`). Beş satırda beş yabancı terim; "Terimler ve veri hakkında" en altta, kapalı ve "ET₀" için ayrı açıklama gerektiriyor. **Çözüm:** Kanıt sayfası üç cümlelik "Bu veri ne diyor?" ile açılsın; teknik satırlar "Mühendis ayrıntısı" altında. Her kısaltma ilk geçtiği yerde açıklanmış olsun (alt çizgili dokun-aç).
10. **Hiçbir sonucu cebine/WhatsApp'a alamıyor.** Kaynak koda göre yazdırma, paylaşma, PDF, çevrimdışı yok (`window.print`, `navigator.share`, service worker, manifest araması boş). Mehmet sonucu eşine/kooperatife/ziraat mühendisine göstermek ister; ekran görüntüsü alınca 9.000 px'lik sayfa sığmıyor. **Çözüm:** "WhatsApp'ta paylaş" ve tek sayfa PDF (Bölüm 6).

---

## 4. Ayşe'nin ihtiyaçları: eksik veya gömülü olanlar

Mevcut iyi şeyler: formül/kaynak penceresi (`trace.*`), varsayım tablosu (`asm.*`), Yöntem sayfası (kaynaklar, formüller, sınırlar, ürün parametreleri, görsel lisansları), "Tablo olarak göster", deterministik hesap beyanı, veri kalitesi satırı.

Eksik veya gömülü:

1. **Dışa aktarma yok.** Ayşe için CSV/JSON (aylık su dengesi, yıllık seri, plan sonuçları) ve girdilerin tamamı bir dosyada "analiz paketi" olarak indirilmeli. (Yöntem sayfasında "Son analiz" yalnız ekranda.)
2. **Yeniden üretilebilirlik.** Analiz kimliği/URL'sinde girdiler (konum, alan, toprak, bütçe, öncelikler, senaryo, fiyatlar) kodlanmalı; aynı bağlantı aynı sonucu versin. Şu an durum URL'ye yansımıyor görünüyor (Vercel: "URL reflects state").
3. **Belirsizlik şeffaflığı.** P10/P50/P90 var ama hangi yıllar hangi sonucu verdi görünmüyor. Ayşe "2007-2009 dönemi neden kötü" görmek ister: dönem bazlı tablo (yıl, yağış, sulama, verim oranı, kâr).
4. **Çözünürlük uyarısı yanında görsel.** NASA POWER ≈ 50 km hücresi tarla ölçeğinden çok kaba; bu "Uydu ve model verisi, yer ölçümü değildir" notuyla var ama kapalı akordeonda. Ayşe için ana ekranda "veri çözünürlüğü: 50 km hücre, toprak 250 m" kısa satırı olmalı.
5. **Parametre düzenleme.** Kc, kök derinliği, Ky, ekim tarihi ve hasat tarihi Yöntem sayfasında salt okunur tablo; Ayşe "yerel çeşit ve tarihle" değiştirmek ister (`m.limit.6` bunu kabul ediyor). Gelişmiş modda düzenleme + "varsayılandan farklı" rozeti.
6. **Eksik süreç/ürün uygunluğu.** Şeker pancarı kotası ve sözleşme gerçekliği, gübre, hastalık, tuzluluk hesapta yok (`m.limit.4`). Bu sınırlar sonuç sayfasında "Bu hesaba girmeyenler" olarak 3 maddeyle görünmeli, yalnız Yöntem'de değil.
7. **Doğrulama kanıtı.** Modelin gerçek verimlere karşı sınaması yok; "IMERG doğrulaması yapılmadı" uyarısı çok iyi ama başarısızlığı belirtilen tek kanıt bu. Ayşe için en az bir yerel doğrulama örneği (il verimi vs hesaplanan) gerekir.
8. **Mühendis görünümü anahtarı.** "Çiftçi görünümü / Mühendis görünümü": aynı sayfada teknik terimleri açar (P10/P90, ETa/ETc, Ky). Şu an aynı yoğunluk herkese.
9. **Kaynak atfı kopyalama.** Alıntı için kısa kaynak metni ("NASA POWER v..., erişim tarihi") tek tuşla kopyalansın.

---

## 5. Erişilebilirlik kusurları (WCAG 2.2 AA)

Not: Kontrast ve hedef boyutları ölçüm gerektirir; "doğrulanmalı" olanlar görüntüden tahmindir.

| # | Kusur | Nerede | WCAG | Ağırlık |
|---|---|---|---|---|
| 1 | Soluk ikincil metin ve devre dışı gibi görünen "Parolasız giriş bağlantısı gönder" düğmesi, koyu temada yeşil-gri üstünde düşük kontrast (≈ 3:1 ve altı olabilir, doğrulanmalı) | `390-dark-giris` | 1.4.3, 1.4.11 | Yüksek |
| 2 | Çok küçük metin: tablo başlık alt etiketleri, tab etiketleri, "Denge" satırı, harita atıf, "mm/yıl" alt etiketleri yaklaşık 11-12 px (kaynakta 15 küçük font eşleşmesi) | `390-dark-oneriler`, `1440-dark-genel` | 1.4.4, 1.4.12 (yeniden boyutlandırma ve metin aralığı doğrulanmalı) | Yüksek |
| 3 | Dokunma hedefleri küçük: ipucu kartı ve Başlarken (×) kapatma düğmesi, "Tarlayı değiştir", ürün seçici açılırları, tablo satırı ok simgesi (≈ 24 px) | `390-dark-tarlam`, `390-dark-genel` | 2.5.8 Hedef Boyutu (Minimum 24×24; 44×44 hedeflenmeli) | Yüksek |
| 4 | Harita `role="application"` ve yalnız etiket; klavye ile gezinme/seçim açıkça belirtilmemiş. Alternatif koordinat girişi var (iyi) ama sürüklemesiz, dokunuşa dayalı seçim klavye yolu belirsiz | `FieldMap.tsx:136` | 2.1.1, 2.5.1 (alternatif var, kısmen karşılıyor), 4.1.2 | Orta |
| 5 | Yalnız renk ve sembolle: Yağış (mavi) / ET₀ (turuncu) çubukları, ▲▼ yeşil/kırmızı değişim, risk çubukları, ilerleme çubukları. ▲▼ yanında metin var (iyi), ama çubuk grafikte desen yok; renk körü için mavi-turuncu uygun, kırmızı-yeşil değişim çifti sorunlu olabilir | `1440-dark-oneriler`, `390-dark-genel` | 1.4.1 | Orta |
| 6 | Açık tema: lime yeşili bağlantılar ve rozetler krem zeminde "Düzelt/İncele" gibi küçük bağlantılar için kontrast sınırda (doğrulanmalı); `Yağış düzeltilmedi` rozeti düşük kontrastlı sarı üstüne kahve | `1440-light-genel` | 1.4.3 | Orta |
| 7 | Odak göstergesi: kaynakta `focus-visible` geçiyor (13 dosyada kısmi); ama alt sekme çubuğu, grafik sekmeleri, harita üstü yakınlaştırma düğmeleri için odak halkası ekranda doğrulanamadı | tüm sayfalar | 2.4.7, 2.4.11 (odak gizlenmemeli; yapışkan üst çubuk odaklı öğeyi örtmemeli) | Orta (doğrulanmalı) |
| 8 | Canlı bölge: `aria-live` yalnız 1 dosyada geçiyor; "Hesaplanıyor…" → sonuç, "İlk hesap yapılıyor…", yükleme hatası ve "kaydedildi/düzeltildi" durum değişimleri ekran okuyucuya duyurulmuyor olabilir | `AgroShiftApp`, `useAnalysis` | 4.1.3 Durum Mesajları | Orta |
| 9 | Hata odağı: kayıt/giriş formunda hata mesajları satır içi (iyi) ama ilk hataya odak ve `aria-describedby` bağı doğrulanmalı; Boş (placeholder'sız) giriş alanları "ne yazılacak" ipucu vermiyor | `390-dark-giris/kayit` | 3.3.1, 3.3.2, 3.3.3 | Orta |
| 10 | Yatay kaydırmalı Başlarken kartları (ikinci kart kesiliyor, ekran okuyucu ve klavye sırası belirsiz); Yöntem sayfası tabloları dar ekranda yatay taşıyor ve tek tek satır olarak çok küçük | `390-dark-genel-empty`, `390-dark-yontem` | 1.4.10 Yeniden Akış (320 px'te iki yönlü kaydırma gerektirmemeli; tablolar istisna ama okunur kalmalı) | Orta |
| 11 | Hareket: `prefers-reduced-motion` bloğu var (iyi, `globals.css:893`); tanıtım karelerinin otomatik oynatması ve harita animasyonları için duraklatma kontrolü doğrulanmalı | `Onboarding.tsx` | 2.2.2, 2.3.3 | Düşük |
| 12 | Anlamsız veya tekrarlı bağlantı metni: "İncele", "Düzelt", "Ayrıntı" (aynı sayfada beş tane "İncele →") ekran okuyucu bağlantı listesinde ayırt edilemez | `1440-dark-genel` Dikkat edilecekler | 2.4.4, 2.4.9 | Düşük-Orta |
| 13 | Ürün seçici metninin "Buğ…" diye kesilmesi, uzun içerikte `truncate` ile bilgi kaybı | `390-dark-tarlam` | 1.4.4 | Orta |
| 14 | Renk tek başına tema: varsayılan koyu tema (güneşte), açık/kontrast modu yalnız simge düğmesi; `prefers-contrast` desteği ve büyük yazı seçeneği yok | `TopbarControls` | 1.4.3, 1.4.8 (AAA) pratikte gerekli | Orta |
| 15 | Dil: Metinde İngilizce çalışan düğme "EN" iyi; Türkçe sayfada yabancı sözcükler (`Supabase`, `GWETROOT`, `MERRA-2`) `lang` ve `translate="no"` ile işaretlenmeli (Vercel: Locale kuralı) | `390-dark-kanit` | 3.1.2 | Düşük |
| 16 | Sayı biçimi: ondalık ve binlik ayırıcı Türkçe (doğru, iyi) ama tablo sayıları `tabular-nums` olmadan hizalama (kaynaktan ekranda iyi görünüyor); birimlerde bölünmez boşluk doğrulanmalı ("551 mm") | genel | Vercel Tipografi | Düşük |

Vercel kuralları ekten: `touch-action: manipulation` ve `-webkit-tap-highlight-color`, `color-scheme`, `theme-color` meta, `overscroll-behavior` modal içinde, `autocomplete` ve `inputmode` (sayı alanları için `inputmode="decimal"`) için kaynak taraması yapıldı: `autoComplete`/`inputmode` auth formlarında 12 eşleşme var (iyi), saha formunda (alan, yağış, toprak yüzdeleri) `inputmode="decimal"` doğrulanmalı.

---

## 6. Sıfırdan yeniden tasarım için çiftçi tarafı önerileri

### 6.1 İlk ekranın söylemesi ve sorması gerekenler

Üstte tek cümle: **"Tarlana hangi ürünü, hangi sırayla ekersen daha az su harcar, daha çok kazanırsın? 2 dakikada bak."** Altında tek düğme: "Başla". Giriş yok, tanıtım videosu zorunlu değil.

Soru sırası (her biri tek ekran, tek parmakla):
1. Neredesin? İl > ilçe > köy araması ve "Konumumu kullan". (Harita bunun altında doğrulama.)
2. Kaç dekar? Hazır dokunmatik seçenekler: 50, 100, 150, 200, 300+ ve elle giriş. "ÇKS'deki alan" ipucu.
3. Sulaman var mı? Yok (kuru) / Var: kaç sulama yapabiliyorsun?
4. Son üç yılda ne ektin? Büyük ürün kartları: Buğday, Arpa, Şeker pancarı, Mısır, Ayçiçeği, Nohut, Mercimek, Nadas…
5. En çok neye önem veriyorsun? Kazanç / Su / Toprak / Hepsi.
Yıldız işaretli son bir "Biliyorsan: bölgenin yıllık yağışı".

Her ekran en üstte "3 / 5" gösterir ve geri alınabilir. İlk sonuç 5 soru sonunda ≤ 15 sn ve önceden hesaplanmış hazır bölge varsa anında gelmeli; canlı veri için "arka planda iniyor" ilerleme çubuğu ve tahmini süre.

### 6.2 Sonuç cümlesi ve yapı

Bir tek, sesli okunabilen hüküm cümlesi: **"Senin için en iyi sıra: arpa, nadas, macar fiği. Bugünkü sıranın yanında yılda dekara yaklaşık 57 ton daha az su harcar ama yılda dekara yaklaşık 1.016 TL daha az kazandırır."** Hüküm hemen altında üç başlık:

- **Ne kazanırım:** sulama suyundan tasarruf (ton ve sulama sayısı), toprak dinlenmesi, risk azalması.
- **Ne kaybederim:** kazançtaki fark (TL/dekar ve tarla toplamı TL), hangi yıl boş (nadas).
- **Nelere dikkat etmeliyim:** varsayım ve veri kısıtları: fiyatın varsayım olduğu, yağış düzeltilmedi, ürün kotası/gübre hesapta yok, ekim tarihi çeşide göre değişir.

Alternatifleri yan yana göstermek için kart yerine tek tabloda "En az su", "En çok kazanç", "Dengeli" üç etiketli seçenek. Her seçenek: ürün sırası, dekara tahmini verim (kg/da), gelir ve masraf, sulama sayısı, risk cümlesi. "Uyum 68/100" kaldırılsın; sıralama sırayla ve adla.

Her sonucun sonunda sabit çubuk: "Bu bir tahmindir. Ekmeden önce ilçe tarım müdürlüğü veya bildiğin ziraat mühendisiyle konuş."

### 6.3 Belirsizlik: çiftçi dili

- "P10/P50/P90" yerine **"Son 25 yılın hepsini denedik: 10 yılın 8'inde kazanç X-Y TL/dekar arasında kaldı; en kötü 2 yılda Z TL'nin altına indi."**
- Su: **"25 yılın 25'inde sulama suyun yetti."** ya da **"25 yılın 6'sında su ekim sezonu sonuna yetişmedi (kurak yıllar: 2007, 2008, 2014...)."**
- Don ve sıcak: **"Son 25 yılda 3 yılda çiçeklenmede don vurdu."**
- Görsel olarak: 25 küçük kutucuk ("yıl şeridi"), her biri o yılın sonucu (iyi/orta/kötü; renge ek olarak desen veya harf). Dokununca o yılın ayrıntısı.
- Tahmin değil geçmiş denemesi olduğu açık yazılsın: "Bu geçmişin tekrarı garanti değil."

### 6.4 Birim politikası

- **Alan:** her yerde "dekar" (da kısaltması yalnız dar tabloda, "dekar" tam yazılı ipucuyla). Hektar hiç gösterilmez; Yöntem'deki "t/ha" sütunu "kg/dekar"a çevrilir (1 t/ha = 100 kg/da).
- **Verim:** kg/dekar (ana), ton toplam (alt). Şeker pancarı ton/dekar.
- **Para:** TL/dekar/yıl (ana), tarla toplamı TL/yıl (ikinci), üç yıllık toplam (üçüncü). Fiyat TL/kg yanında "tarih ve kaynak" (TMO, Türkşeker vb. kullanıcının girişi).
- **Su:** ana birim "ton/dekar" (1 mm = 1 m³/da = 1 ton/da; bu eşitlik her yerde aynı rozetle açıklanır) ve "kaç sulama" (örnek varsayım: 1 sulama = 50-60 ton/da, değiştirilebilir). "mm" yağış/buharlaşma için kalır (çiftçi yağmuru mm bilir). "m³/da" yalnız gelişmiş modda. "Ton su" yalnız dekar başına, tarla toplamı için "tarlan için ≈ 13.300 ton (180 dekar)".
- **Sayı biçimi:** `Intl.NumberFormat("tr-TR")`, bölünmez boşluk, bin ayırıcı nokta (şu an doğru). Ondalık oranlar ("0,42") çiftçi metninde olmasın; yüzde veya "10'da 4".

### 6.5 Saha seçimi: poligon çizmemiş biri için harita

1. **Hiçbir zaman çizim şart olmasın.** Varsayılan: il-ilçe-köy araması, ardından "Konumumu kullan" (izin metni Türkçe ve neden istendiği yazılı).
2. Harita "uydu görüntüsü + yol" açılışında seçilen köy merkezinde, yakınlaştırma yeterli seviyede; kullanıcı **tek dokunuşla işaretler**, işaret sürüklenebilir. Dokunma sonrası geri bildirim: "Konya, Çumra yakını işaretlendi. Doğru mu? [Evet] [Değiştir]".
3. Alan için çizim isteğe bağlı: "Tarlanı çiz" yerine **"Alanı dekar olarak yaz"** öncelik; çizim isteyenlere "köşelere dokun" (3-6 nokta) ve geri al/temizle düğmeleri; parmak titremesi için büyük düğmeler. Kapatmak için açık düğme ve hata mesajı: "En az 3 köşe işaretle."
4. Haritanın bir klavye/okuyucu eşdeğeri (koordinat ve adres) kalmalı (şu an var).
5. Harita açılırken bütün Türkiye değil, kullanıcının konumu/kayıtlı tarlası; hazır bölgelere sarı nokta yerine "Konya, Çumra: veri hazır" etiketli rozetler.
6. Harita gestürleri (iki parmakla yakınlaştır) için düğme alternatifi (+/−) kalmalı (var); sayfa kaydırmasıyla çakışmaması için harita içi kaydırma kilidi "iki parmakla gez" ipucu.
7. Çok kaba çözünürlük açıkça söylensin: "Veri yaklaşık 50 km'lik hücre; komşu köyle aynı çıkabilir."

### 6.6 Çevrimdışı ve yavaş bağlantı

- Köyde 2G/3G ve kesilen bağlantıyı varsay. PWA: ana ekrana eklenebilir, uygulama kabuğu çevrimdışı açılsın (şu an manifest/service worker yok).
- Son sonuç ve girişler yerelde saklansın; "Son baktığın tarla: Çumra, 12 Kasım" çevrimdışı açılsın.
- Hazır bölge verileri (kayıtlı veri) küçük paketlerle önceden indirilebilsin ("Bu bölgeyi çevrimdışı kullan, 1,2 MB").
- Canlı veri çekimi (30-90 sn) arka planda sürsün; sekme değişse de bildirim. Başarısız olursa "Girdiklerin duruyor" ve otomatik yeniden deneme.
- Ağır grafikler yerine ilk yüklemede metin özeti; grafik sonradan ("Grafiği göster").
- Veri tasarrufu modu: harita katmanı (NASA GIBS) isteğe bağlı, varsayılan kapalı.

### 6.7 Tek sayfa tarla raporu: PDF ve WhatsApp

- Sonuç sayfasında sabit alt çubuk: **[WhatsApp'ta paylaş] [PDF indir] [Yazdır]**; `navigator.share` ile uygulama menüsü açılsın, yedek olarak kısa metin + bağlantı.
- **WhatsApp metni (örnek):** "Çumra, 180 dekar. Önerilen sıra: arpa, nadas, macar fiği. Bugünkü sıraya göre su: −57 ton/dekar, kazanç: −1.016 TL/dekar (varsayılan fiyatlarla). Detay: [bağlantı]. Bu bir tahmindir; ekmeden önce ilçe tarım müdürlüğüne danışın."
- **Tek sayfa A4 PDF:** üst: tarla adı, il/ilçe, dekar, tarih ve analiz kimliği; ortada hüküm cümlesi ve üç sütun (Ne kazanırım / Ne kaybederim / Dikkat); üç yıllık takvim şeridi (büyük harf, renk + desen); 25 yıllık yıl şeridi; kullanılan varsayımlar (fiyat, sulama, yağış düzeltmesi) tek kutuda; altta kaynaklar ve "Bu araç karar vermez" notu; QR ile aynı analizi açan bağlantı. Siyah-beyaz yazıcıda okunur (renge ek desen).
- Yazdırma CSS'i: koyu temada bile beyaz zemin, 12 pt+ yazı, sayfa kırılımı.
- Ayşe için ikinci sayfa isteğe bağlı: "Mühendis ekleri" (tüm varsayımlar, kaynaklar, dönem tablosu).

### 6.8 Mobil ve açık hava

- **Varsayılan açık/yüksek kontrast tema** (güneşte koyu tema okunmaz); koyu tema isteğe bağlı. Metin ≥ 16 px gövde, ≥ 14 px yardımcı; kontrast ≥ 7:1 ana metinlerde hedef.
- Dokunma hedefi ≥ 48 px, birincil eylemler ekranın alt yarısında (var olan alt sekme ve "Önerileri göster" iyi örnek). Kapatma (×) düğmeleri 44 px.
- Sayfa uzunluğunu kes: Yöntem 9.000 px; sonuç ekranı tek kaydırmada hüküm + 3 başlık, gerisi akordeon.
- Tablolar mobilde kart/satır yığını; tek tablo yatay kaydırmasız.
- Sesli okuma düğmesi ("Hükmü dinle") düşük okuryazarlık ve eldiven/ter durumunda yararlı olabilir.
- Büyük yazı seçeneği (A / A+ / A++) görünür yerde.

### 6.9 Güven mekanizmaları

- Hükmün yanında "Bu hesap neye dayanıyor?" üç madde: 25 yıllık hava (NASA), toprağın (tahmin), fiyat (varsayım, senin değiştirebileceğin).
- "Kendi değerini gir" her kritik sayıda: fiyat, sulama, yağış, ekim tarihi. Girildiğinde sonucun yanında "senin değerin" rozeti.
- Yerel uzman bağlantısı: "İlçe tarım müdürlüğü / Ziraat Odası iletişim" kartı ve bu sonuçla götürülecek PDF.
- Geri bildirim: "Bu sonuç sana mantıklı geldi mi? Neden?" tek dokunuş + isteğe bağlı not; ilk yıl yerel doğrulama verisi toplar.

---

## 7. Öncelikli aksiyon listesi (en yüksek etki, en düşük maliyet)

1. "En uygun" ile kâr kaybı çelişkisini çöz: hüküm cümlesi + kazanç/kayıp/dikkat üçlüsü + "Kazancı öncelik yaparsan" alternatifi.
2. Ana akıştan "Uyum, P10/P90, Ya/Ym, p, Sen eğimi, ET₀ kısaltması" çıkar; Çiftçi/Mühendis görünümü anahtarı ekle.
3. Birim köprüsü: mm = ton/dekar = m³/da; "kaç sulama"; kg/dekar ve TL/tarla ekle.
4. Giriş duvarını ve Supabase şeridini ilk akıştan kaldır; ilk değer 2 dakikada.
5. WhatsApp + tek sayfa PDF + çevrimdışı/PWA.
6. Açık tema varsayılan, yazı ≥ 14-16 px, dokunma hedefi ≥ 44 px, canlı bölgeler (`aria-live`), tekrarlı bağlantı metinleri düzeltilsin.
7. Sözlük süpürmesi: rotasyon -> ekim nöbeti, pilot, pano, senaryo, kalibrasyon, silt, dönem.
