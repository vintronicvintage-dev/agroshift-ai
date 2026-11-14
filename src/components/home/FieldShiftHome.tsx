"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  Droplets,
  Globe2,
  Layers,
  MapPin,
  Satellite,
  ShieldCheck,
  Sprout,
  UserCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useI18n } from "@/lib/i18n";

const WORKSPACE_ANCHORS = new Set([
  "#harita-bolumu",
  "#urun-onerileri",
  "#analiz-grafikler",
  "#risk-simulasyonlari",
  "#field-shift-karsilastirma",
]);

const HOW_IT_WORKS_STEPS = [
  {
    step: "1",
    icon: MapPin,
    trTitle: "Arazinizi Tanımlayın",
    enTitle: "Define Your Parcel",
    trDesc: "Haritada konumunuzu seçin veya parsel sınırlarınızı çizin; 81 il ve Konya–Çumra hazır örneğiyle hemen başlayın.",
    enDesc: "Pick your location or draw parcel boundaries on the map across 81 provinces or start with the Konya–Çumra example.",
    href: "/tarlalarim",
  },
  {
    step: "2",
    icon: Layers,
    trTitle: "Verilerinizi Analiz Edelim",
    enTitle: "Analyze Field Data",
    trDesc: "24 yıllık NASA POWER iklim serisi, ISRIC SoilGrids toprak profili ve SRTM topoğrafyası tek modelde birleştirilir.",
    enDesc: "24-year NASA POWER climate series, ISRIC SoilGrids soil profile, and SRTM terrain are fused into one hydrological balance.",
    href: "/toprak",
  },
  {
    step: "3",
    icon: Sprout,
    trTitle: "Size Özel Planınızı Alın",
    enTitle: "Get Your Rotation Plan",
    trDesc: "3 yıllık ürün sırası, sulama bütçesi aşımı olan yıllar, toprak sağlığı ve senaryo kârlılığını yan yana görün.",
    enDesc: "Compare 3-year crop sequences, budget exceedance years, soil health indicators, and scenario margins side by side.",
    href: "/plan",
  },
] as const;

const SCIENTIFIC_PILLARS = [
  {
    name: "NASA POWER & MERRA-2",
    roleTr: "Günlük Meteoroloji (2001–2024)",
    roleEn: "Daily Meteorology (2001–2024)",
    detailTr: "T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN ve GWETROOT kök nemi yeniden analizi.",
    detailEn: "T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, and GWETROOT root-zone reanalysis.",
  },
  {
    name: "ISRIC SoilGrids 250m",
    roleTr: "6 Katmanlı Toprak Profili",
    roleEn: "6-Layer Soil Profile",
    detailTr: "0–200 cm derinlikte kil, kum, silt, pH, organik karbon ve Saxton–Rawls (2006) TAW hidroliği.",
    detailEn: "0–200 cm clay, sand, silt, pH, organic carbon, and Saxton–Rawls (2006) TAW soil hydraulics.",
  },
  {
    name: "FAO-56 & TOPSIS",
    roleTr: "Su Dengesi ve Çok Kriterli Karar",
    roleEn: "Water Balance & Multi-Criteria",
    detailTr: "Penman–Monteith ET₀, gün gün kök bölgesi su dengesi, kuraklık stres analizi ve 18 ürünlük münavebe taraması.",
    detailEn: "Penman–Monteith ET₀, daily root-zone water balance, drought stress testing, and 18-crop rotation screening.",
  },
  {
    name: "TMO & TÜİK 2025–26",
    roleTr: "Referans Ekonomi ve Verim",
    roleEn: "Reference Economics & Yield",
    detailTr: "Güncel alım fiyatları, il bazlı TAGEM tarım bölgeleri ve senaryo çıktısı olarak P10–P90 kârlılık bandı.",
    detailEn: "Current reference crop prices, provincial TAGEM agro-zones, and P10–P90 scenario profitability bands.",
  },
] as const;

const CROP_GALLERY = [
  {
    src: "/images/agro/crop-wheat.png",
    trName: "Kışlık Buğday",
    enName: "Winter Wheat",
    trNote: "Serin mevsim tahıl · Kc 1.15 · Derin kök",
    enNote: "Cool-season cereal · Kc 1.15 · Deep rooting",
  },
  {
    src: "/images/agro/crop-chickpea.png",
    trName: "Nohut",
    enName: "Chickpea",
    trDesc: "Azot fiksasyonu · Kısıtlı suya yüksek uyum",
    trNote: "Azot bağlayıcı baklagil · Kısıtlı suya uygun",
    enNote: "Nitrogen-fixing legume · Low-water suited",
  },
  {
    src: "/images/agro/crop-lentil.png",
    trName: "Kırmızı & Yeşil Mercimek",
    enName: "Red & Green Lentil",
    trNote: "Kuru tarım dostu · Nadas alternatifi",
    enNote: "Dryland-friendly · Fallow replacement",
  },
  {
    src: "/images/agro/crop-sunflower.png",
    trName: "Ayçiçeği",
    enName: "Sunflower",
    trNote: "Yazlık yağ bitkisi · Yüksek pazar değeri",
    enNote: "Summer oilseed · Strong market margin",
  },
] as const;

export function FieldShiftHome() {
  const { lang, setLang } = useI18n();
  const [activePreview, setActivePreview] = useState<"dashboard" | "rotation" | "soil">("dashboard");
  const tr = lang === "tr";

  useEffect(() => {
    const { hash, search } = window.location;
    if (/^#(?:ornek|f)=/.test(hash) || WORKSPACE_ANCHORS.has(hash)) {
      window.location.replace(`/tarla${search}${hash}`);
    }
  }, []);

  return (
    <div className="min-h-dvh bg-[#F8F8F3] text-[#17251B]">
      <a className="skip" href="#landing-main">
        {tr ? "İçeriğe geç" : "Skip to content"}
      </a>

      {/* ── Top Navigation ── */}
      <header className="sticky top-0 z-40 border-b border-[#E5E9E0] bg-[#F8F8F3]/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none">
              <Logo tone="dark" size={30} />
            </Link>
            <span className="hidden h-4 w-px bg-[#E5E9E0] md:block" />
            <span className="hidden text-[12.5px] font-medium text-[#66746B] md:block">
              {tr ? "Akıllı Tarımsal Karar Destek Platformu" : "Agricultural Decision Support Platform"}
            </span>
          </div>

          <nav aria-label={tr ? "Ana menü" : "Main navigation"} className="hidden items-center gap-7 text-[14px] font-medium text-[#17251B] lg:flex">
            <a href="#nasil-calisir" className="transition-colors hover:text-[#397A42]">
              {tr ? "Nasıl Çalışır?" : "How It Works"}
            </a>
            <a href="#bilimsel-yaklasim" className="transition-colors hover:text-[#397A42]">
              {tr ? "Bilimsel Yaklaşım" : "Scientific Approach"}
            </a>
            <a href="#cozumler" className="transition-colors hover:text-[#397A42]">
              {tr ? "Çözümler" : "Solutions"}
            </a>
            <Link href="/dayanak" className="transition-colors hover:text-[#397A42]">
              {tr ? "Bilimsel Dayanak" : "Evidence"}
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setLang(tr ? "en" : "tr")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E5E9E0] bg-white px-3 text-[13px] font-semibold text-[#17251B] transition-colors hover:border-[#397A42]"
              aria-label={tr ? "Switch to English" : "Türkçeye geç"}
            >
              <Globe2 className="size-4 text-[#66746B]" />
              {tr ? "EN" : "TR"}
            </button>
            <Link
              href="/giris"
              className="hidden h-10 items-center gap-1.5 rounded-xl border border-[#E5E9E0] bg-white px-3.5 text-[13.5px] font-semibold text-[#17251B] transition-colors hover:border-[#123D2A] sm:inline-flex"
            >
              <UserCheck className="size-4 text-[#397A42]" />
              {tr ? "Giriş Yap" : "Sign In"}
            </Link>
            <Link
              href="/tarla"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#123D2A] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#0B281C]"
            >
              {tr ? "Paneli Aç" : "Open App"}
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main id="landing-main">
        {/* ── Hero Section ── */}
        <section className="mx-auto max-w-[1320px] px-4 pb-12 pt-10 sm:px-6 lg:pb-16 lg:pt-14">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="space-y-6 lg:col-span-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#E5E9E0] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#123D2A]">
                <Satellite className="size-3.5 text-[#397A42]" />
                {tr ? "NASA POWER · SoilGrids · FAO-56 Su Dengesi" : "NASA POWER · SoilGrids · FAO-56 Water Balance"}
              </div>

              <h1 className="font-display text-[36px] font-bold leading-[1.1] tracking-tight text-[#123D2A] sm:text-[48px] lg:text-[54px]">
                {tr ? "Tarım kararlarını veriye dayandırın." : "Ground agricultural decisions in real data."}
              </h1>

              <p className="max-w-xl text-[16px] leading-relaxed text-[#66746B] sm:text-[17px]">
                {tr
                  ? "Toprak, iklim ve uydu verilerini bir araya getirerek araziniz için uygun üretim stratejilerini bilimsel modellerle keşfedin."
                  : "Combine soil, climate, and satellite records to evaluate crop rotations, irrigation budgets, and drought resilience with transparent scientific models."}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/tarla"
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#123D2A] px-5 text-[14.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#0B281C]"
                >
                  {tr ? "Arazimi Analiz Et" : "Analyze My Field"}
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#nasil-calisir"
                  className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-[#E5E9E0] bg-white px-5 text-[14.5px] font-semibold text-[#17251B] transition-colors hover:border-[#397A42]"
                >
                  {tr ? "Nasıl Çalışır?" : "How It Works"}
                </a>
                <Link
                  href="/tarla#field-shift-karsilastirma"
                  className="inline-flex min-h-[46px] items-center gap-1.5 px-2 text-[14px] font-semibold text-[#397A42] hover:underline"
                >
                  {tr ? "Konya–Çumra Örneğini Aç" : "Open Konya–Çumra Demo"}
                  <ChevronRight className="size-4" />
                </Link>
              </div>

              {/* 3 Key Figures */}
              <div className="grid grid-cols-3 gap-4 border-t border-[#E5E9E0] pt-6 tabular-nums">
                <div>
                  <div className="font-display text-[24px] font-bold text-[#123D2A]">18</div>
                  <div className="text-[12.5px] font-medium text-[#66746B]">
                    {tr ? "Ürün & Rotasyon Modeli" : "Crop & Rotation Models"}
                  </div>
                </div>
                <div>
                  <div className="font-display text-[24px] font-bold text-[#123D2A]">24 Yıl</div>
                  <div className="text-[12.5px] font-medium text-[#66746B]">
                    {tr ? "Günlük NASA İklim Serisi" : "Daily NASA Climate Series"}
                  </div>
                </div>
                <div>
                  <div className="font-display text-[24px] font-bold text-[#123D2A]">81 İl</div>
                  <div className="text-[12.5px] font-medium text-[#66746B]">
                    {tr ? "Türkiye Tarım Kapsamı" : "Türkiye Coverage"}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero Right Visual — Illustrative Farmland Aerial Photo (distinct from real GIS map) */}
            <div className="lg:col-span-6">
              <figure className="relative overflow-hidden rounded-3xl border border-[#E5E9E0] bg-white p-2 shadow-sm">
                <div className="relative aspect-[16/11] w-full overflow-hidden rounded-2xl">
                  <Image
                    src="/images/agro/aerial-parcels.png"
                    alt={tr ? "Yukarıdan tarım parselleri temsili görünümü" : "Illustrative aerial view of agricultural parcels"}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 620px"
                    className="object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0B281C]/90 via-[#0B281C]/45 to-transparent p-5 text-white">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[12px] font-semibold text-[#A3C75B]">
                          {tr ? "Temsilî Tarım Parseli Görünümü" : "Illustrative Parcel View"}
                        </div>
                        <div className="text-[14px] font-semibold">
                          {tr
                            ? "Uydu, toprak ve iklim verileriyle bilimsel üretim planlaması"
                            : "Scientific production planning powered by satellite, soil & climate data"}
                        </div>
                      </div>
                      <Link
                        href="/tarlalarim"
                        className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-xs hover:bg-white/25"
                      >
                        {tr ? "Gerçek Haritayı Aç" : "Open Live Map"}
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
          </div>
        </section>

        {/* ── 3-Step How It Works Strip ── */}
        <section id="nasil-calisir" className="border-y border-[#E5E9E0] bg-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#397A42]">
                  {tr ? "Üç Adımda Karar Süreci" : "Three-Step Workflow"}
                </span>
                <h2 className="mt-1 font-display text-[26px] font-bold text-[#17251B] sm:text-[30px]">
                  {tr ? "Nasıl Çalışır?" : "How It Works"}
                </h2>
              </div>
              <p className="max-w-md text-[14px] text-[#66746B]">
                {tr
                  ? "Üç basit adımda araziniz için su bütçesine uygun bilimsel ekim nöbeti önerileri alın."
                  : "Receive water-budget-verified crop rotation recommendations for your parcel in three steps."}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              {HOW_IT_WORKS_STEPS.map((item) => {
                const IconComp = item.icon;
                return (
                  <Link
                    key={item.step}
                    href={item.href}
                    className="group flex flex-col justify-between rounded-2xl border border-[#E5E9E0] bg-[#F8F8F3] p-6 transition-colors hover:border-[#397A42] hover:bg-white"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#123D2A] text-white">
                          <IconComp className="size-5" />
                        </span>
                        <span className="font-display text-[13px] font-bold text-[#397A42]">
                          {tr ? `Adım ${item.step}` : `Step ${item.step}`}
                        </span>
                      </div>
                      <h3 className="mt-4 font-display text-[18px] font-bold text-[#17251B] group-hover:text-[#123D2A]">
                        {tr ? item.trTitle : item.enTitle}
                      </h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#66746B]">
                        {tr ? item.trDesc : item.enDesc}
                      </p>
                    </div>
                    <div className="mt-5 inline-flex items-center gap-1 text-[13px] font-semibold text-[#123D2A]">
                      {tr ? "Modülü incele" : "Explore module"}
                      <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Interactive Product Screen Previews ── */}
        <section id="cozumler" className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[#397A42]">
                {tr ? "Platform Modülleri" : "Platform Modules"}
              </span>
              <h2 className="mt-1 font-display text-[26px] font-bold text-[#17251B] sm:text-[30px]">
                {tr ? "Tek Platformda Uçtan Uca Tarımsal Karar Altyapısı" : "End-to-End Agronomic Decision Infrastructure"}
              </h2>
            </div>

            <div className="inline-flex flex-wrap gap-1.5 rounded-xl border border-[#E5E9E0] bg-white p-1">
              {(
                [
                  { id: "dashboard", tr: "Genel Bakış & Harita", en: "Dashboard & Map" },
                  { id: "rotation", tr: "3 Yıllık Rotasyon", en: "3-Year Rotation" },
                  { id: "soil", tr: "Toprak & İklim", en: "Soil & Climate" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePreview(tab.id)}
                  className={`rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    activePreview === tab.id
                      ? "bg-[#123D2A] text-white"
                      : "text-[#66746B] hover:text-[#17251B]"
                  }`}
                >
                  {tr ? tab.tr : tab.en}
                </button>
              ))}
            </div>
          </div>

          <div className="grid items-center gap-8 rounded-3xl border border-[#E5E9E0] bg-white p-6 lg:grid-cols-12 lg:p-8">
            <div className="space-y-4 lg:col-span-5">
              {activePreview === "dashboard" && (
                <>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4ED] px-3 py-1 text-[12px] font-semibold text-[#123D2A]">
                    <BarChart3 className="size-3.5" />
                    {tr ? "Genel Bakış & Parsel Yönetimi" : "Dashboard & Parcel Management"}
                  </div>
                  <h3 className="font-display text-[22px] font-bold text-[#17251B]">
                    {tr ? "Araziniz için kritik kararlar tek ekranda" : "Critical field decisions on one clear screen"}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#66746B]">
                    {tr
                      ? "Parsel sınırınızı çizin, sulama bütçenizi belirleyin ve mevcut ekim nöbetinizin hangi yılda bütçeyi aştığını anında görün."
                      : "Draw your parcel boundary, set your annual irrigation budget, and immediately inspect which year exceeds the water cap."}
                  </p>
                  <ul className="space-y-2 text-[13.5px] text-[#17251B]">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#397A42]" />
                      {tr ? "Etkileşimli harita ve 81 il parsel seçici" : "Interactive map and 81-province selector"}
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#397A42]" />
                      {tr ? "Kuraklık ve sıcaklık şok senaryoları" : "Drought and heat-stress scenario toggles"}
                    </li>
                  </ul>
                  <Link href="/tarla" className="btn btn-primary mt-2">
                    {tr ? "Çalışma Alanını Aç" : "Open Workspace"}
                    <ArrowRight className="size-4" />
                  </Link>
                </>
              )}
              {activePreview === "rotation" && (
                <>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4ED] px-3 py-1 text-[12px] font-semibold text-[#123D2A]">
                    <Droplets className="size-3.5" />
                    {tr ? "3 Yıllık Rotasyon Planlayıcısı" : "3-Year Rotation Planner"}
                  </div>
                  <h3 className="font-display text-[22px] font-bold text-[#17251B]">
                    {tr ? "Mevcut planla iki geçerli alternatifi karşılaştırın" : "Compare your current sequence against two valid alternatives"}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#66746B]">
                    {tr
                      ? "18 ürün arasında 1.000+ geçerli ekim sırası taranır; su açığı, brüt kâr (P10–P90 senaryo bandı) ve azot dengesi yan yana sunulur."
                      : "Over 1,000 feasible sequences across 18 crops are screened for water deficit, P10–P90 margin bands, and nitrogen balance."}
                  </p>
                  <Link href="/plan" className="btn btn-primary mt-2">
                    {tr ? "Rotasyon Planlayıcıyı Aç" : "Open Rotation Planner"}
                    <ArrowRight className="size-4" />
                  </Link>
                </>
              )}
              {activePreview === "soil" && (
                <>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-[#EBF4ED] px-3 py-1 text-[12px] font-semibold text-[#123D2A]">
                    <Database className="size-3.5" />
                    {tr ? "Toprak ve İklim Analizi" : "Soil & Climate Diagnostics"}
                  </div>
                  <h3 className="font-display text-[22px] font-bold text-[#17251B]">
                    {tr ? "Gözlem ve model tahminleri şeffaf biçimde ayrılır" : "Clear separation between observations and model estimates"}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#66746B]">
                    {tr
                      ? "ISRIC SoilGrids toprak profili ile yerel laboratuvar ölçümleri ayrı etiketlenir; NASA POWER yağış ve ET₀ serileri gün gün incelenir."
                      : "ISRIC SoilGrids estimates are clearly separated from lab tests while NASA POWER rainfall and ET₀ series are audited daily."}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link href="/toprak" className="btn btn-primary">
                      {tr ? "Toprak Analizi" : "Soil Analysis"}
                    </Link>
                    <Link href="/iklim" className="btn">
                      {tr ? "İklim Analizi" : "Climate Analysis"}
                    </Link>
                  </div>
                </>
              )}
            </div>

            <div className="lg:col-span-7">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-[#E5E9E0]">
                <Image
                  src={
                    activePreview === "soil"
                      ? "/images/agro/soil-texture.png"
                      : activePreview === "rotation"
                        ? "/images/agro/sunset-farmland.png"
                        : "/images/agro/combine-harvester.png"
                  }
                  alt={tr ? "AgroShift AI tarımsal modül görseli" : "AgroShift AI agricultural module visual"}
                  fill
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Crop Showcase with Real Curated Photos ── */}
        <section className="border-t border-[#E5E9E0] bg-white py-14">
          <div className="mx-auto max-w-[1320px] px-4 sm:px-6">
            <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[#397A42]">
                  {tr ? "Ürün Kütüphanesi (18 Ürün)" : "Crop Library (18 Crops)"}
                </span>
                <h2 className="mt-1 font-display text-[26px] font-bold text-[#17251B]">
                  {tr ? "Anadolu Ekim Nöbeti Ürünleri" : "Anatolian Rotation Crops"}
                </h2>
              </div>
              <Link href="/urunler" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#123D2A] hover:underline">
                {tr ? "Tüm 18 ürünü ve gereksinimleri gör" : "View all 18 crops & requirements"}
                <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {CROP_GALLERY.map((crop) => (
                <Link
                  key={crop.src}
                  href="/urunler"
                  className="group overflow-hidden rounded-2xl border border-[#E5E9E0] bg-[#F8F8F3] transition-colors hover:border-[#397A42]"
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <Image
                      src={crop.src}
                      alt={tr ? crop.trName : crop.enName}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 310px"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display text-[16px] font-bold text-[#17251B]">
                      {tr ? crop.trName : crop.enName}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-[#66746B]">
                      {tr ? crop.trNote : crop.enNote}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Scientific Data Sources Section ── */}
        <section id="bilimsel-yaklasim" className="mx-auto max-w-[1320px] px-4 py-16 sm:px-6">
          <div className="mb-8 max-w-2xl">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#397A42]">
              {tr ? "Şeffaf Bilimsel Altyapı" : "Transparent Scientific Infrastructure"}
            </span>
            <h2 className="mt-1 font-display text-[26px] font-bold text-[#17251B] sm:text-[30px]">
              {tr ? "Her sonucun arkasındaki resmî veri kaynakları" : "Verified data sources behind every calculation"}
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {SCIENTIFIC_PILLARS.map((item) => (
              <div key={item.name} className="rounded-2xl border border-[#E5E9E0] bg-white p-5">
                <div className="flex items-center gap-2 text-[#123D2A]">
                  <ShieldCheck className="size-4 shrink-0 text-[#397A42]" />
                  <span className="font-display text-[15px] font-bold">{item.name}</span>
                </div>
                <div className="mt-1.5 text-[12.5px] font-semibold text-[#397A42]">
                  {tr ? item.roleTr : item.roleEn}
                </div>
                <p className="mt-2.5 text-[13px] leading-relaxed text-[#66746B]">
                  {tr ? item.detailTr : item.detailEn}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Bottom CTA Banner ── */}
        <section className="mx-auto max-w-[1320px] px-4 pb-16 sm:px-6">
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-[#123D2A] p-8 text-white sm:flex-row sm:items-center sm:p-10">
            <div className="max-w-xl space-y-2">
              <h2 className="font-display text-[24px] font-bold sm:text-[28px]">
                {tr ? "Araziniz için bilimsel ekim planını hemen oluşturun." : "Build your parcel's scientific rotation plan today."}
              </h2>
              <p className="text-[14.5px] text-[#D7E6DC]">
                {tr
                  ? "Hesap oluşturarak parsellerinizi kaydedin veya giriş yapmadan Konya–Çumra ve 81 il verileriyle hemen deneyin."
                  : "Create an account to save your parcels or launch the workspace immediately without signing in."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/kayit"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl bg-[#A3C75B] px-5 text-[14px] font-bold text-[#0B281C] transition-opacity hover:opacity-90"
              >
                {tr ? "Ücretsiz Hesap Oluştur" : "Create Account"}
              </Link>
              <Link
                href="/tarla"
                className="inline-flex min-h-[46px] items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-white/20"
              >
                {tr ? "Paneli Aç" : "Open Workspace"}
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E9E0] bg-white py-10">
        <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6">
          <div className="space-y-1.5">
            <Logo tone="dark" size={24} />
            <p className="text-[12.5px] text-[#66746B]">
              {tr
                ? "NASA POWER, ISRIC SoilGrids ve FAO-56 tabanlı tarımsal karar destek platformu."
                : "Agricultural decision support platform built on NASA POWER, ISRIC SoilGrids, and FAO-56."}
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px] font-medium text-[#66746B]">
            <Link href="/tarla" className="hover:text-[#123D2A]">{tr ? "Genel Bakış" : "Dashboard"}</Link>
            <Link href="/plan" className="hover:text-[#123D2A]">{tr ? "Rotasyon Planlayıcı" : "Rotation Planner"}</Link>
            <Link href="/dayanak" className="hover:text-[#123D2A]">{tr ? "Bilimsel Dayanak" : "Evidence"}</Link>
            <Link href="/yontem" className="hover:text-[#123D2A]">{tr ? "Yöntem" : "Methods"}</Link>
            <Link href="/giris" className="hover:text-[#123D2A]">{tr ? "Giriş Yap" : "Sign In"}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
