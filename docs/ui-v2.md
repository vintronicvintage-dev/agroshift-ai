# AgroShift v2 — Pano arayüzü, e-posta ile giriş, öğretici kartlar

## Referanslar ve sınır
- Kullanıcının gösterdiği referans: koyu zeminli, sol kenar çubuklu, bento ızgaralı bir çiftlik
  yönetim panosu (harita kartı, hava kartı, sayı kutuları, uyarılar, grafik, tablo).
- 21st.dev SaaS şablonları (12 Kasım 2026'da bakıldı): "AI CRM dashboard", "Settle - Payment
  Operations Dashboard", "Spike Next.js Admin". Ortak desenler: sabit sol ray + üst çubuk, bento
  kart ızgarası, tek vurgu rengi, el yapımı SVG grafikler, tek tasarım belirteci dosyası,
  sıkı tipografi ölçeği, e-posta ile giriş.
- Bunlar ücretli ve başkalarının işi. **Kod, görsel, ad, logo ya da birebir düzen kopyalanmaz.**
  Yalnız desen dili alınır; AgroShift'in kendi kimliği kurulur.

## Kimlik
Koyu öncelikli (açık tema korunur). Zemin: yeşile çalan kömür. Kartlar: bir ton açık, ince
kenarlık, yumuşak iç ışık. Tek vurgu: taze filiz sarı-yeşili; ikincil sinyaller: su mavisi,
toprak kehribarı, uyarı kırmızısı (yalnız anlam taşıdığında). Rakamlar tabular, büyük; etiketler
küçük ve sakin. Köşe yarıçapı tutarlı. Hareket kısa ve işlevsel. Emoji ikon yok; tek ikon ailesi
(çizgi, 1.5 px).

## Sayfalar

### 1. Giriş ve kayıt (`/giris`, `/kayit`, `/sifre-sifirla`)
- İki sütun: solda form, sağda kod ile çizilmiş marka paneli (uydu izi, tarla şeritleri, üç kısa
  değer cümlesi). Mobilde tek sütun.
- Kayıt: ad, e-posta, parola (güç göstergesi), onay e-postası. Giriş: e-posta + parola, ayrıca
  "Parolasız giriş bağlantısı gönder" (magic link). Parola sıfırlama akışı.
- Altyapı: **Supabase Auth**, `@supabase/ssr`. Ortam değişkenleri:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (.env.local).
- Korumalı alan: pano ve alt sayfaları. Oturum yoksa `/giris`'e yönlendirilir (Next 16'da
  `proxy.ts`; güncel API için context7'ye bak). Çıkış düğmesi kenar çubuğunda.
- **Değişkenler yoksa** uygulama "misafir kipi"nde açılır: pano erişilebilir, üstte ince bir şerit
  "Giriş altyapısı bağlı değil" der, giriş/kayıt formları neden çalışmadığını söyler. Sahte oturum
  ya da sahte kullanıcı üretilmez. `.env.example` eklenir.
- Hata durumları Türkçe/İngilizce ve insan diliyle: yanlış parola, kayıtlı e-posta, onaylanmamış
  e-posta, ağ hatası, hız sınırı.
- Yöntem sayfası (`/yontem`) herkese açık kalır.

### 2. Pano (`/`) — ana sayfa
Düzen: sol kenar çubuğu (masaüstü; dar ekranda ikon rayı; mobilde alt çubuk) + üst çubuk
(seçili tarla, senaryo seçici, dil, tema, kullanıcı menüsü) + bento ızgara.

Kenar çubuğu: Genel bakış, Tarlam, Öneriler, Kanıt, Yöntem; altta Tanıtım kartlarını göster,
Çıkış. v1.1'deki üç adım bu gezinmeye taşınır; hash/URL ile adreslenebilir kalır.

**Öğretici kartlar (ilk iş):** panonun en üstünde "Başlarken" şeridi: 5 küçük kart, her biri bir
bölümü öğretir ve tıklanınca oraya götürür:
1. Tarlanı seç  2. Suyunu ve mevcut ekimini gir  3. Önerileri karşılaştır
4. Senaryoyla dene (kurak / sıcak)  5. Kanıta ve yönteme bak
Her kartta küçük bir çizim, tek cümle, ilerleme işareti (yapıldıysa tik; gerçek kullanıcı
eylemine bağlı). Şerit kapatılabilir, tamamlanınca küçülür, kenar çubuğundan geri açılır.
Durum localStorage'da (try/catch). v1.1'deki tam ekran tanıtım otomatik açılmaz; yerini bu kartlar
alır (bileşen silinebilir ya da "Tanıtımı izle" olarak kalabilir).

**Genel bakış bento kartları — hepsi gerçek veriden ya da motor çıktısından:**
- **Tarla haritası** (büyük kart): harita, seçili nokta, konum adı, rakım, alan; "Tarlayı değiştir".
- **İklim özeti:** kayıttaki son günün sıcaklığı, yağışı, rüzgârı, kök bölgesi nemi (NASA POWER,
  tarihiyle birlikte; "bugün" denmez, verinin tarihi yazılır).
- **Dört sayı kutusu:** yıllık yağış, ET₀, su açığı, en iyi planın uyum puanı.
- **En uygun plan:** hüküm cümlesi + üç yıllık şerit + "Karşılaştır" düğmesi.
- **Su dengesi grafiği:** aylık yağış ve ET₀ (mevcut SVG grafik, pano boyutunda).
- **Dikkat edilecekler:** motor ve veri bayraklarından üretilen gerçek maddeler (yağış kalibre
  değil, bütçe şu yıllarda aşılıyor, don günleri azalıyor/artıyor, IMERG doğrulanmadı, toprak
  varsayılan değer...). Madde yoksa boş durum gösterilir; uydurma uyarı yok.
- **Plan tablosu (kompakt):** mevcut + öneriler, 4 sütun; satır → Öneriler sayfası.
- **Toprak göstergesi:** puan halkası + bileşenler.
- **Karar senin** notu görünür kalır.
Tarla seçilmemişken kartlar iskelet değil, anlamlı boş durum gösterir ve ilk öğretici karta yönlendirir.

Tarlam / Öneriler / Kanıt sayfaları v1.1 içeriğini yeni kabuk ve kimlikle taşır. Hiçbir özellik
silinmez (izlenebilirlik diyaloğu, kalibrasyon, kendi rotasyonu, ekonomi, Pareto, varsayımlar).

## Kurallar
- Motor, veri katmanı, API, sayılar değişmez. Ekrandaki her sayı motor/veri kaynaklı ya da
  etiketli varsayım. Referanstaki "bugünkü işler, işçi sayısı, gelir-gider" gibi alanlar
  bizde yok; karşılığı olmayan kart eklenmez.
- TR (varsayılan) / EN, tüm metin sözlükte. UI metninde uzun tire yok. Hitap: "sen".
- Erişilebilirlik: klavye, görünür odak, AA kontrast (iki temada ölç), 44 px dokunma hedefi,
  `prefers-reduced-motion`.
- Duyarlı: 1440, 1024, 768, 375 px. Yatay taşma yok.
- Gizli anahtar koda/loga/git'e girmez.

## Kabul ölçütleri
- Değişken yokken: `/` misafir kipinde açılır, şerit görünür, `/giris` ve `/kayit` açıklamalı.
- Değişken varken: oturumsuz `/` → `/giris`; kayıt → onay e-postası mesajı; giriş → pano; çıkış çalışır.
- İlk açılışta "Başlarken" kartları görünür; bir adım tamamlanınca tik gelir; kapatma kalıcıdır.
- Genel bakışta tarla seçiliyken tüm kartlar gerçek sayılarla dolar; 1440×900'de ana kartlar
  kaydırmadan görünür.
- `tsc`, lint, test, build temiz; konsolda hata/hydration uyarısı yok.
