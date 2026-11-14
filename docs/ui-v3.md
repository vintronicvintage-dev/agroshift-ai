# AgroShift v3 — Kurul kararı ve yeni arayüz şartnamesi

Kaynak raporlar (uygulayıcı dördünü de baştan sona okur; ayrıntı oradadır):
`docs/board/ux-heuristics.md` (5,6/10), `docs/board/visual-direction.md` (5,4/10),
`docs/board/farmer-and-accessibility.md` (5,4/10), `docs/board/map-and-dataviz.md` (harita 2/10).
Veri ve motor sözleşmeleri: `docs/engine-v2.md`, `src/lib/types.ts`, `src/lib/data/tiles.ts`, `POST /api/field`.

## Kurulun ortak teşhisi
1. Araç bir "sayı panosu" gibi okunuyor; kullanıcının **kendi arazisi** ekranda yok.
2. Alan seçimi en zayıf halka: ülke ölçeğinde haritada nokta tıklama, sınır yok, alan varsayım.
3. "En uygun" plan mevcut plandan daha az kazandırıyor ve bu açıklanmıyor: güven kırıcı.
4. Ana akışta mühendis dili ve çiftçinin kullanmadığı birimler var.
5. Kimlik zayıf: logo yalnız "S", ürün çizimleri clip-art, üç yazı tipi çekişiyor, uydu görüntüsü kullanılmıyor.

## Başkanın kararları (çelişkilerde bağlayıcı)
- **Yön: "Ortho Console"** (görsel rapordaki A) taban. Uydu görüntüsü zemindir. Kanıt ve Yöntem'de B'nin
  sade tabloları, şekil altyazıları ve kenar sözlüğü. C'nin halka fikri yalnız logo ve yükleme durumunda.
  Belirteçler, yazı sistemi ve sekiz kural görsel rapordan alınır.
- **Tema:** Koyu varsayılan (jüri ve referans), açık tema eşit özenle ve yüksek kontrastlı; ilk açılışta
  sistem tercihini izler. Çiftçi raporundaki güneş altı okunurluk açık temada sağlanır.
- **Giriş duvarı kalkar.** Araç girişsiz kullanılır (jüri ve çiftçi ilk dakikada sonuç görmeli). Giriş ve
  kayıt sayfaları ve oturum kalır; oturum açan kullanıcının adı görünür. `proxy.ts` artık `/` adresini
  korumaz, yalnız oturumu yeniler. Kayıtlı tarlalar şimdilik tarayıcıda (localStorage) tutulur ve bu
  açıkça söylenir. "Supabase / altyapı" içeren hiçbir şerit kullanıcıya gösterilmez.
- **Altlık lisansı:** Varsayılan uydu altlığı `src/lib/data/tiles.ts` içindeki CC BY 4.0 lisanslı EOX
  Sentinel-2 cloudless katmanı (`eox-s2cloudless-2017`, gerçek çözünürlük zoom 14). Daha yeni yıllar
  CC BY-NC-SA olduğu için kullanılmaz. Esri World Imagery kullanılmaz. Güncel görüntü için NASA GIBS
  HLS (30 m) tarih seçimli katman. Etiketler ayrı katman. Atıflar haritada görünür.
- **Logo ve ürün işaretleri yeniden yapılır** (ayrı marka ajanı; `docs/brand.md` v2). Arayüz `Logo`,
  `CropGlyph`, `cropTexture` bileşenlerini kullanır.
- **Dil:** "rotasyon" yerine ana akışta "ekim nöbeti / münavebe"; birimler dekar, kg/da, ton, TL/da, TL/tarla,
  "kaç sulama"; 1 mm = 1 m³/da = dekara 1 ton su köprüsü görünür. İstatistik "Ayrıntı" altında.
  Çiftçi raporundaki 40 dizelik tablo uygulanır.

## Bilgi mimarisi (tek kalıcı "Tarla" nesnesi üzerinde üç yer)
1. **Tarla** (`/`): tam ekran uydu haritası + arazi kartı.
   - Üstte arama (il/ilçe/köy, koordinat), "Konumumu kullan", örnek tarlalar (5 pilot).
   - Çizim: çokgen, dikdörtgen, daire (pivot); köşe düzenleme, geri al; canlı alan (dekar ve hektar);
     GeoJSON içe/dışa aktarma; kayıtlı tarlalar listesi. Hiç çizmemiş biri için: "Tarlanın ortasına dokun,
     sonra köşelerine dokun" yönlendirmesi ve tek dokunuşla "yaklaşık alan" (iğne + dekar) seçeneği.
   - Katmanlar: Sentinel-2 altlık, HLS güncel görüntü (tarih kaydırıcı; boş karo algılanır), NDVI, SMAP nem,
     IMERG yağış, yükselti; "Veri hücreleri" katmanı gerçek 250 m / 9 km / ~55 km ayak izlerini çizer.
   - **Arazi kartı** alan seçilir seçilmez, veri geldikçe dolan kartlarla (harita raporu §3, 10 kart):
     özet (alan, çevre, yer adı), yükselti/eğim/bakı (SRTM), toprak sütunu (6 katman, doku üçgeni),
     kimya çubukları (pH, organik karbon, KDK, azot; tarımsal eşiklerle), kök bölgesi nemi (normale göre),
     iklim (klimograf), don tarihleri ve sıcaklık toplamı, NDVI fenolojisi (çıplak dönem gölgeli),
     aylık sulama ihtiyacı, kaynak ve çözünürlük. Her sayıda çözünürlük etiketi ve "tarlanın içi / birkaç
     piksel / çevre hücre" kademesi. Üç sade cümlelik "Bu arazi ne diyor?" özeti.
   - Yağış: POWER ile ERA5-Land karşılaştırması gösterilir; kullanıcı düzeltmeyi kendi seçer
     (yok / ERA5-Land'e göre / kendi istasyon değeri). Sessiz düzeltme yok.
   - Tek birincil eylem: **Ekim nöbetini planla**.
2. **Ekim nöbeti** (`/plan` ya da `#plan`): kurucu + karşılaştırma.
   - Sorular sonuçtan sonra: su durumu ve öncelik burada, hafif denetimler olarak.
   - **Hüküm** tek cümle + üçlü: Ne kazanırım / Ne kaybederim / Nelere dikkat. Kâr kaybı varsa başlıkta
     söylenir ve yanında "Kazancı öne alırsan" seçeneği durur. Dayanıklı en iyi ile tipik yıl en iyisi
     ayrıysa ikisi de gösterilir. Her planda güven notu (A–D) ve nedeni.
   - **36 aylık zaman çizelgesi**: ürün dokulu bantlar, ekiş/hasat, çıplak toprak boşlukları, don bandı,
     altında su ihtiyacı şeridi. Telefonda dikey.
   - **Karşılaştırma**: ölçüt başına ortak ölçekli nokta-ve-bıyık satırları (dönemlerin %80'i), "Benim
     planım" sabit. Radar yok.
   - **Yıl şeridi**: her plan için 22 başlangıç yılı; hangi yıllarda su yetmedi (renk + işaret).
     "22 dönemin 18'inde su yetti" cümlesiyle.
   - **Kurucu**: ürünleri yıllara sürükle, dokun ya da klavyeyle yerleştir; kural ihlalleri canlı rozet;
     puan ve farklar 150 ms içinde güncellenir.
   - Su-kâr dengesi (Pareto) doğrudan etiketli, görünür. Senaryo: Tipik / Kurak / Sıcak ve kurak + kendi.
   - Çıktı: tek sayfa A4 yazdırma görünümü ve "WhatsApp'ta paylaş" (özet metin + bağlantı).
3. **Dayanak** (`/dayanak`): her iddia için "Neden?" — grafik, kaynak, formül; Çiftçi/Mühendis anahtarı
   (mühendis kipinde P10/P50/P90, p değerleri, dönem tablosu, CSV dışa aktarma).
4. **Yöntem** (`/yontem`): içindekiler dizinli; kaynaklar, varsayımlar, görsel kaynakları, sınırlar.

## Değişmeyenler
Motor sayıları ve izlenebilirlik; "Karar senin" notu; fotoğraf atıfları; TR/EN; hiçbir özelliğin silinmemesi.
Ekrandaki her sayı motor ya da veri kaynaklı ya da etiketli varsayım.

## Kabul ölçütleri
- İlk açılıştan itibaren girişsiz, en çok 3 etkileşimde (örnek tarla → plan) ilk hüküm görünür.
- Kullanıcı uydu görüntüsü üzerinde çokgen çizer; alan dekar olarak anında görünür; arazi kartının ilk dört
  kartı 10 sn içinde dolar (önbellekli pilotta anında); bir kaynağın hatası diğer kartları engellemez.
- Zoom 14'te altlık gerçek görüntü gösterir; atıf görünür; HLS tarihi değişince karo değişir.
- "En uygun" planın kârı mevcut plandan düşükse bu hükümde yazılır.
- 1440×900, 1024×768, 390×844; koyu ve açık; yatay taşma yok; metin kontrastı ≥ 4,5:1 (ölçülmüş);
  dokunma hedefi ≥ 44 px; klavye ile çizim dışındaki her şey yapılabilir, çizimin klavye/koordinat alternatifi var.
- `tsc`, lint, test, build temiz; konsolda hata ve hydration uyarısı yok.
