/**
 * AgroShift AI — Comprehensive Scientific & Farmer-Friendly Term Glossary (`?` Hover Cards).
 *
 * Every technical, hydrological, agronomic, soil, satellite, and economic term shown in the UI
 * is defined here with:
 *  - Plain farmer-friendly explanation ("Ne Anlama Gelir?")
 *  - Scientific formula / unit / optimal range ("Bilimsel Karşılığı & Birim")
 *  - Practical impact on parcel decisions ("Tarla Kararına Etkisi")
 */

export type GlossaryCategory =
  | "climate_water"
  | "soil_hydrology"
  | "satellite"
  | "agronomy_rotation"
  | "economics_decision";

export type GlossaryTermId =
  | "et0"
  | "etc"
  | "eta"
  | "kc"
  | "ky"
  | "pe"
  | "dn"
  | "dt"
  | "wue"
  | "gdd"
  | "vernalization"
  | "lapse_rate"
  | "taw"
  | "raw"
  | "theta_fc"
  | "theta_wp"
  | "theta_sat"
  | "ksat"
  | "scs_cn"
  | "rusle"
  | "ph"
  | "soc"
  | "salinity_ece"
  | "soil_texture"
  | "soil_health"
  | "ndvi"
  | "smap"
  | "imerg"
  | "ecostress"
  | "srtm"
  | "cmip6"
  | "nasa_power"
  | "munavebe"
  | "no_till"
  | "n_fixation"
  | "biofumigation"
  | "break_years"
  | "bare_soil_days"
  | "irrigation_efficiency"
  | "p10_p50_p90"
  | "cvar20"
  | "topsis_pareto"
  | "gross_margin"
  | "confidence_grade";

export interface GlossaryTermSpec {
  id: GlossaryTermId;
  symbol: string;
  category: GlossaryCategory;
  categoryLabelTr: string;
  categoryLabelEn: string;
  titleTr: string;
  titleEn: string;
  unitOrFormula: string;
  idealRangeTr: string;
  plainMeaningTr: string;
  plainMeaningEn: string;
  decisionImpactTr: string;
  decisionImpactEn: string;
  sourceRef: string;
}

export const GLOSSARY_CATEGORY_LABELS: Record<
  GlossaryCategory,
  { tr: string; en: string; colorClass: string }
> = {
  climate_water: {
    tr: "İklim & Su Dengesi",
    en: "Climate & Water Balance",
    colorClass: "bg-sky-50 text-sky-900 border-sky-200",
  },
  soil_hydrology: {
    tr: "Toprak & Hidroloji",
    en: "Soil & Hydrology",
    colorClass: "bg-amber-50 text-amber-900 border-amber-200",
  },
  satellite: {
    tr: "NASA Uydu & Gözlem",
    en: "NASA Satellite & Sensing",
    colorClass: "bg-emerald-50 text-emerald-900 border-emerald-200",
  },
  agronomy_rotation: {
    tr: "Münavebe & Agronomi",
    en: "Rotation & Agronomy",
    colorClass: "bg-green-50 text-green-900 border-green-200",
  },
  economics_decision: {
    tr: "Ekonomi & Karar Modeli",
    en: "Economics & Decision Model",
    colorClass: "bg-purple-50 text-purple-900 border-purple-200",
  },
};

export const GLOSSARY_TERMS: Record<GlossaryTermId, GlossaryTermSpec> = {
  et0: {
    id: "et0",
    symbol: "ET₀",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Referans Buharlaşma-Terleme (Evapotranspirasyon)",
    titleEn: "Reference Evapotranspiration (Penman–Monteith)",
    unitOrFormula: "mm/gün veya mm/yıl · FAO-56 Denklem 6",
    idealRangeTr: "Türkiye geneli 850 – 1.550 mm/yıl",
    plainMeaningTr:
      "Güneş radyasyonu, sıcaklık, rüzgâr hızı ve havanın kuruluğu nedeniyle standart bir çim örtüsünden atmosfere buharlaşan su miktarıdır; havanın 'su çekme gücünü' gösterir.",
    plainMeaningEn:
      "Atmospheric evaporative demand from a reference grass surface driven by solar radiation, temperature, wind speed, and humidity.",
    decisionImpactTr:
      "ET₀ yükseldikçe bitkilerin su ihtiyacı artar. Sıcak ve rüzgârlı ovalarda (ör. Harran) aynı ürün yaylaya göre çok daha fazla sulama suyu ister.",
    decisionImpactEn:
      "Higher ET₀ directly increases crop water requirement (ETc = Kc × ET₀) and irrigation frequency.",
    sourceRef: "Allen et al. (1998) FAO-56 Eq. 6 · NASA POWER MERRA-2",
  },

  etc: {
    id: "etc",
    symbol: "ETc",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Bitki Su Tüketimi (Potansiyel Evapotranspirasyon)",
    titleEn: "Crop Evapotranspiration Requirement",
    unitOrFormula: "ETc = Kc × ET₀ (mm/sezon = ton/dekar)",
    idealRangeTr: "Mercimek ~280 mm · Buğday ~480 mm · Mısır/Yonca ~750–1100 mm",
    plainMeaningTr:
      "Seçilen mahsulün ekimden hasada kadar hiçbir su sıkıntısı çekmeden tam verim verebilmesi için topraktan ve yağıştan toplamda tüketmesi gereken su miktarıdır.",
    plainMeaningEn:
      "Total seasonal water required by a specific crop from sowing to harvest under unstressed conditions.",
    decisionImpactTr:
      "1 mm su = dekara 1 ton (1 m³) suya eşittir. ETc değeri yağıştan yüksekse aradaki farkın sulama ile karşılanması gerekir.",
    decisionImpactEn:
      "1 mm equals 1 m³/decare. Any gap between ETc and effective rainfall must be met by soil moisture or irrigation.",
    sourceRef: "FAO-56 Ch. 6 & TAGEM/DSİ (2017) Bitki Su Tüketimi Rehberi",
  },

  eta: {
    id: "eta",
    symbol: "ETa",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Gerçekleşen Buharlaşma-Terleme",
    titleEn: "Actual Evapotranspiration",
    unitOrFormula: "ETa = Ks × ETc (mm/sezon)",
    idealRangeTr: "ETa / ETc oranı %85–100 arası idealdir",
    plainMeaningTr:
      "Bitkinin tarladaki mevcut yağış ve sulama imkanlarıyla gerçekten bulup tüketebildiği su miktarıdır. Toprak kuruduğunda ETa, ETc'nin altına düşer.",
    plainMeaningEn:
      "The actual water transpired by the crop given real soil moisture availability (reduced by water stress coefficient Ks).",
    decisionImpactTr:
      "ETa / ETc oranı 1'in altına düştüğünde bitki su stresine girer ve Stewart denklemi uyarınca verim kaybı başlar.",
    decisionImpactEn:
      "Whenever ETa < ETc, relative yield drops proportionally to the crop's sensitivity factor Ky.",
    sourceRef: "FAO-56 Chapter 8 (Ks Water Stress Coefficient)",
  },

  kc: {
    id: "kc",
    symbol: "Kc",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Bitki Katsayısı (Başlangıç / Orta / Son Evre)",
    titleEn: "Crop Coefficient (Kc_ini, Kc_mid, Kc_end)",
    unitOrFormula: "Boyutsuz katsayı (0.25 – 1.25)",
    idealRangeTr: "Çimlenme: 0.30–0.45 · Tam Kaplama (Orta): 1.00–1.20 · Olgunlaşma: 0.25–0.75",
    plainMeaningTr:
      "Bitkinin gelişim evresine (fide, sapa kalkma/çiçeklenme, hasat olumu) göre yaprak alanının ne kadar su tükettiğini belirleyen çarpan katsayısıdır.",
    plainMeaningEn:
      "Stage-dependent ratio comparing the crop's water use to reference grass across initial, mid-season, and late stages.",
    decisionImpactTr:
      "Bitki çiçeklenme ve tepe gelişim evresindeyken (Kc_mid) su ihtiyacı zirveye çıkar; sulama takvimi bu evreye göre planlanır.",
    decisionImpactEn:
      "Identifies peak water demand windows during mid-season canopy closure.",
    sourceRef: "FAO-56 Table 12 & TAGEM/DSİ (2017)",
  },

  ky: {
    id: "ky",
    symbol: "Ky",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Su Stresi Verim Tepki Katsayısı",
    titleEn: "Yield Response to Water Factor (Stewart Equation)",
    unitOrFormula: "1 − (Ya / Ym) = Ky × (1 − ETa / ETc)",
    idealRangeTr: "Kuraklığa dayanıklı: Ky < 0.90 (Aspir 0.80) · Hassas: Ky > 1.10 (Mısır 1.25)",
    plainMeaningTr:
      "Bitkinin susuzluğa ne kadar hassas olduğunu gösterir. Ky = 1.25 ise %20'lik su eksikliği verimi %25 düşürür; Ky = 0.80 ise %20'lik su eksikliği verimi sadece %16 düşürür.",
    plainMeaningEn:
      "Proportionality factor linking relative evapotranspiration deficit to relative yield loss.",
    decisionImpactTr:
      "Su kısıtı olan tarlalarda Ky değeri yüksek ürünlerden (Mısır 1.25, Kuru Fasulye 1.15, Patates 1.10) kaçınılıp Ky değeri düşük ürünlere (Aspir 0.80, Pamuk/Soya 0.85, Nohut 0.90) yönelinir.",
    decisionImpactEn:
      "Guides crop selection under limited irrigation budgets by penalizing high-Ky crops when water is scarce.",
    sourceRef: "Doorenbos & Kassam (1979) FAO-33 · Steduto et al. (2012) FAO-66",
  },

  pe: {
    id: "pe",
    symbol: "Pe",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Etkili Yağış (Kök Bölgesine Yarayışlı Yağış)",
    titleEn: "Effective Precipitation",
    unitOrFormula: "Pe = P_toplam − Yüzey Akışı (Q) − Derine Sızma (mm)",
    idealRangeTr: "Toplam yağışın ~%65–82'si (Anıza ekimde +%12 daha yüksek)",
    plainMeaningTr:
      "Yağan yağmurun yüzeyden akıp gitmeyen ve kök derinliğinin altına kaçmayan, doğrudan bitki köklerinin emebildiği kısmıdır.",
    plainMeaningEn:
      "Fraction of total rainfall retained within the active root zone after subtracting surface runoff and deep percolation.",
    decisionImpactTr:
      "Anıza doğrudan ekim (No-Till) ve düşük eğim yüzey akışını azaltarak etkili yağışı (Pe) artırır, sulama ihtiyacını düşürür.",
    decisionImpactEn:
      "No-till residue cover increases infiltration and effective rainfall, directly cutting irrigation demand.",
    sourceRef: "USDA-NRCS SCS-CN & TAGEM/DSİ (2017)",
  },

  dn: {
    id: "dn",
    symbol: "Dn",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Net Sulama Suyu İhtiyacı",
    titleEn: "Net Irrigation Requirement",
    unitOrFormula: "Dn = max(0, ETc − Pe − Kök Nemi Kredisi) (mm = m³/da)",
    idealRangeTr: "Kışlık tahıl/baklagil: 0–160 mm · Yazlık ürünler: 280–650 mm",
    plainMeaningTr:
      "Yağış ve topraktaki mevcut kış nemi düşüldükten sonra, bitki kök bölgesine net olarak ulaştırılması gereken saf sulama suyu miktarıdır.",
    plainMeaningEn:
      "Net depth of irrigation water that must reach the root zone after accounting for effective rain and stored soil moisture.",
    decisionImpactTr:
      "Parselin yıllık su kotası (m³/da) ile doğrudan karşılaştırılan temel su bütçesi göstergesidir.",
    decisionImpactEn:
      "Determines whether the rotation can be sustained within the farmer's net water quota.",
    sourceRef: "TAGEM & DSİ (2017) · FAO-56",
  },

  dt: {
    id: "dt",
    symbol: "Dt",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Toplam (Brüt) Sulama Suyu İhtiyacı",
    titleEn: "Gross Irrigation Water Withdrawal",
    unitOrFormula: "Dt = Dn / (Ea × Ec) (mm = m³/da = ton/da)",
    idealRangeTr: "Damla sulamada Dt ≈ 1.11×Dn · Salma sulamada Dt ≈ 1.82×Dn",
    plainMeaningTr:
      "Boru hattı, kanal ve tarla içi uygulama kayıpları hesaba katıldığında kuyudan veya kanaldan fiilen çekilmesi gereken toplam su miktarıdır.",
    plainMeaningEn:
      "Total water volume pumped or diverted from the source after accounting for conveyance (Ec) and application (Ea) losses.",
    decisionImpactTr:
      "Salma sulamadan (%55 randıman) damla sulamaya (%90 randıman) geçildiğinde kuyudan çekilen su ve elektrik/su faturası ~%39 azalır.",
    decisionImpactEn:
      "Switching from furrow (55%) to drip irrigation (90%) cuts gross water pumping and cost by ~39%.",
    sourceRef: "DSİ Sulama Randımanı Rehberi & FAO-56",
  },

  wue: {
    id: "wue",
    symbol: "WUE",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Su Kullanım Randımanı (Su Üretkenliği)",
    titleEn: "Water Use Efficiency / Water Productivity",
    unitOrFormula: "kg ürün / m³ su veya TL gelir / m³ su",
    idealRangeTr: "Tahıl/Baklagil: 0.9–1.8 kg/m³ · Gelir: 8–25 TL/m³",
    plainMeaningTr:
      "Tarlaya düşen ve verilen her 1 metreküp (1 ton) suya karşılık kaç kilogram ürün veya kaç TL brüt gelir elde edildiğini gösterir.",
    plainMeaningEn:
      "Kilograms of harvested crop or Turkish Lira of gross revenue produced per cubic meter of water consumed.",
    decisionImpactTr:
      "Su kısıtlı bölgelerde amaç sadece az su harcamak değil, harcanan her 1 m³ sudan en yüksek geliri (TL/m³) üretmektir.",
    decisionImpactEn:
      "Prevents the optimizer from rewarding idle fallow land; maximizes economic output per drop of water.",
    sourceRef: "French & Schultz (1984) · FAO-66 AquaCrop WP*",
  },

  gdd: {
    id: "gdd",
    symbol: "GDD",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Büyüme Derece-Gün (Toplam Isı Birimi)",
    titleEn: "Growing Degree Days (Thermal Time)",
    unitOrFormula: "GDD = Σ max(0, (Tmax + Tmin)/2 − T_baz) (°C·gün)",
    idealRangeTr: "Mercimek/Nohut: ~1000–1100 · Buğday: ~1700 · Pamuk: ≥ 1200 (baz 15.5 °C)",
    plainMeaningTr:
      "Bitkinin çimlenmeden tam olgunlaşmaya (hasada) ulaşabilmesi için sezon boyunca biriktirmesi gereken toplam sıcaklık enerjisidir.",
    plainMeaningEn:
      "Accumulated daily heat units above a crop-specific base temperature required to reach physiological maturity.",
    decisionImpactTr:
      "Yüksek rakımlı ve serin illerde (ör. Erzurum, Sivas) Pamuk ve İkinci Ürün Mısır GDD barajını dolduramadığı için sistem tarafından otomatik olarak elenir.",
    decisionImpactEn:
      "Hard biophysical filter that excludes warm-season crops where the local growing season lacks sufficient thermal units.",
    sourceRef: "FAO-56 & AgroShift Suitability Engine",
  },

  vernalization: {
    id: "vernalization",
    symbol: "Soğuklama",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Vernalizasyon (Kışlık Soğuklama İhtiyacı)",
    titleEn: "Vernalization Chilling Requirement",
    unitOrFormula: "0 °C ile +7 °C arasında geçen gün sayısı",
    idealRangeTr: "Kışlık Buğday: 35–55 gün · Kışlık Kanola: 30–50 gün · Kışlık Arpa: 20–40 gün",
    plainMeaningTr:
      "Kışlık tahılların ve kanolanın ilkbaharda sapa kalkıp başak/çiçek oluşturabilmesi için kışın belirli bir süre soğuk hava görmesi zorunluluğudur.",
    plainMeaningEn:
      "Exposure to winter chilling (0–7 °C) required by winter cereals and winter rapeseed to trigger reproductive bolting and heading.",
    decisionImpactTr:
      "Kışlık çeşitler geç ilkbaharda ekilirse soğuklama alamaz, yalnız yaprak yapar ve başak bağlamaz.",
    decisionImpactEn:
      "Governs autumn vs. spring sowing windows across lowland and highland climate zones.",
    sourceRef: "FAO EcoCrop & TAGEM Yetiştiricilik Rehberleri",
  },

  lapse_rate: {
    id: "lapse_rate",
    symbol: "Lapse ΔT",
    category: "climate_water",
    categoryLabelTr: "İklim & Su Dengesi",
    categoryLabelEn: "Climate & Water Balance",
    titleTr: "Rakım Sıcaklık Düzeltmesi (Atmosferik Lapse Rate)",
    titleEn: "Adiabatic Elevation Temperature Correction",
    unitOrFormula: "ΔT = −0.0065 × (Rakım_parsel − Rakım_hücre) (°C)",
    idealRangeTr: "Her +100 metre yükseltide sıcaklık −0.65 °C düşer",
    plainMeaningTr:
      "NASA iklim uydularının ~50 km'lik geniş hücresi ile sizin tarlanızın gerçek 30 m SRTM rakımı arasındaki yükseklik farkına göre sıcaklığın hassas düzeltilmesidir.",
    plainMeaningEn:
      "Adjusts coarse satellite grid temperatures to the exact 30 m SRTM elevation of your drawn field at −6.5 °C per km.",
    decisionImpactTr:
      "Dağ eteğindeki veya yayladaki bir tarlanın ova merkezine göre daha serin olduğunu ve daha az buharlaşma (ET₀) yaşadığını doğru hesaplar.",
    decisionImpactEn:
      "Prevents lowland grid averages from distorting frost risk and GDD on highland parcels.",
    sourceRef: "ICAO Standard Atmosphere & NASA SRTM 30m",
  },

  taw: {
    id: "taw",
    symbol: "TAW",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Kullanılabilir Su Tutma Kapasitesi",
    titleEn: "Total Available Soil Water Capacity",
    unitOrFormula: "TAW = 1000 × (θ_FC − θ_WP) × Z_r × (1 − Çakıl) (mm)",
    idealRangeTr: "Kumlu: 70–100 mm/m · Tınlı/Killi-Tınlı: 130–185 mm/m",
    plainMeaningTr:
      "Toprağın bir sünger gibi kök bölgesinde tutabildiği ve bitkinin solmadan emebileceği toplam su deposu büyüklüğüdür.",
    plainMeaningEn:
      "Total depth of plant-extractable water held between field capacity (θ_FC) and permanent wilting point (θ_WP) across the root zone.",
    decisionImpactTr:
      "TAW yüksekse toprak kış yağışlarını daha çok depolar ve sulamalar arası süre uzar; kurak yıllarda verim sigortası görevi görür.",
    decisionImpactEn:
      "High TAW buffers crops against dry spells and allows deeper, less frequent irrigations.",
    sourceRef: "Saxton & Rawls (2006) SSSAJ 70:1569 · FAO-56 Eq. 82",
  },

  raw: {
    id: "raw",
    symbol: "RAW",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Kolay Alınabilir Su (Stressiz Tüketim Payı)",
    titleEn: "Readily Available Water (p × TAW)",
    unitOrFormula: "RAW = p × TAW (mm)",
    idealRangeTr: "Patates: p = 0.35 · Tahıl/Nohut: p = 0.50–0.55 · Aspir/Pamuk: p = 0.60–0.65",
    plainMeaningTr:
      "Topraktaki su deposunun (TAW), bitki hiç zorlanmadan ve verim kaybetmeden rahatça çekebildiği üst kısmıdır. Su bu sınırın altına inince sulama gerekir.",
    plainMeaningEn:
      "Fraction (p) of Total Available Water that a crop can extract from the root zone before experiencing stomatal water stress.",
    decisionImpactTr:
      "Günlük su dengesi motoru, kök bölgesindeki su tüketimi RAW sınırını aştığı gün sulama tetikler.",
    decisionImpactEn:
      "Triggers automatic irrigation events in the daily FAO-56 soil water balance model.",
    sourceRef: "FAO-56 Table 22 & Eq. 83",
  },

  theta_fc: {
    id: "theta_fc",
    symbol: "θ_FC",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Tarla Kapasitesi (33 kPa Nem İçeriği)",
    titleEn: "Field Capacity Volumetric Moisture",
    unitOrFormula: "Hacimsel % veya m³/m³ (33 kPa matrik potansiyel)",
    idealRangeTr: "Kumlu: %14–20 · Tınlı: %26–33 · Killi: %35–42",
    plainMeaningTr:
      "Şiddetli bir yağmur veya sulamadan 2–3 gün sonra, yerçekimiyle sızan fazla su gittikten sonra toprağın gözeneklerinde tutabildiği en yüksek faydalı su oranıdır.",
    plainMeaningEn:
      "Volumetric water content retained in soil micropores after gravity drainage ceases (at −33 kPa).",
    decisionImpactTr:
      "Tarla kapasitesinin üzerinde verilen her damla su kök bölgesinden aşağı sızarak (derine perkolasyon) boşa gider ve nitrat yıkanmasına yol açar.",
    decisionImpactEn:
      "Defines the upper storage ceiling of the soil bucket; water above θ_FC is lost to deep percolation.",
    sourceRef: "Saxton & Rawls (2006) & ISRIC SoilGrids v2.0 wv0033",
  },

  theta_wp: {
    id: "theta_wp",
    symbol: "θ_WP",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Devamlı Solma Noktası (1500 kPa)",
    titleEn: "Permanent Wilting Point",
    unitOrFormula: "Hacimsel % veya m³/m³ (1500 kPa matrik potansiyel)",
    idealRangeTr: "Kumlu: %6–10 · Tınlı: %13–18 · Killi: %20–26",
    plainMeaningTr:
      "Toprakta hâlâ bir miktar nem bulunsa bile kil tanecikleri tarafından çok sıkı tutulduğu için bitki köklerinin artık suyu çekemediği ve bitkinin pörsüyüp kuruduğu alt sınırdır.",
    plainMeaningEn:
      "Lower soil moisture limit (−1500 kPa) below which plant roots can no longer extract water and plants irreversibly wilt.",
    decisionImpactTr:
      "Killi toprakların θ_WP değeri yüksektir; yani %20 nemde bile bitki susuz kalabilir. Kullanılabilir su her zaman (θ_FC − θ_WP) farkıdır.",
    decisionImpactEn:
      "Sets the zero-available-water floor in the daily root-zone water balance.",
    sourceRef: "Saxton & Rawls (2006) & ISRIC SoilGrids v2.0 wv1500",
  },

  theta_sat: {
    id: "theta_sat",
    symbol: "θ_Sat",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Doygunluk Noktası (Toplam Gözeneklilik)",
    titleEn: "Saturated Volumetric Water Content",
    unitOrFormula: "Hacimsel % (0 kPa — tüm gözenekler suyla dolu)",
    idealRangeTr: "Genellikle %42 – %52 arası",
    plainMeaningTr:
      "Topraktaki tüm hava boşluklarının suyla dolduğu çamurlaşma anıdır. Uzun sürerse kökler oksijensiz kalarak boğulur.",
    plainMeaningEn:
      "Maximum water content when all soil pores are completely filled with water.",
    decisionImpactTr:
      "θ_Sat ile θ_FC arasındaki fark toprağın havalanma kapasitesini ve drenaj hızını belirler.",
    decisionImpactEn:
      "Determines aeration porosity and waterlogging risk for sensitive crops like chickpea, barley, and potato.",
    sourceRef: "Saxton & Rawls (2006) Eq. 5",
  },

  ksat: {
    id: "ksat",
    symbol: "K_sat",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Doygun Hidrolik İletkenlik (Su Emiş Hızı)",
    titleEn: "Saturated Hydraulic Conductivity",
    unitOrFormula: "mm/saat",
    idealRangeTr: "Killi (Grup D): < 2 mm/sa · Tınlı (Grup B/C): 6–25 mm/sa · Kumlu (Grup A): > 40 mm/sa",
    plainMeaningTr:
      "Toprağın yağmur veya yağmurlama suyunu saatte kaç milimetre hızla içine çekebildiğini (infiltrasyon hızını) gösterir.",
    plainMeaningEn:
      "Rate at which water moves downward through saturated soil pores (mm/hour).",
    decisionImpactTr:
      "K_sat düşükse şiddetli sağanak yağışlar toprağa giremez ve yüzey akışına (sel/erozyon) dönüşür; yağmurlama sulamada göllenme olmaması için uygulama hızı K_sat'ı aşmamalıdır.",
    decisionImpactEn:
      "Assigns the USDA Hydrologic Soil Group (A/B/C/D) and governs runoff generation.",
    sourceRef: "Saxton & Rawls (2006) Eq. 15",
  },

  scs_cn: {
    id: "scs_cn",
    symbol: "SCS-CN",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Yüzey Akış Eğri Numarası (Curve Number)",
    titleEn: "USDA SCS Runoff Curve Number",
    unitOrFormula: "Q = (P − 0.2S)² / (P + 0.8S) · CN: 30–95",
    idealRangeTr: "Sık Baklagil Örtüsü: 72–78 · Tahıl: 76–82 · Çıplak Toprak: 86–91",
    plainMeaningTr:
      "Yağmur yağdığında suyun ne kadarının toprağa sızacağını, ne kadarının yüzeyden akıp gideceğini belirleyen 0–100 arası hidrolojik katsayıdır (sayı büyüdükçe su kaybı artar).",
    plainMeaningEn:
      "Empirical hydrological parameter (30–100) predicting direct surface runoff from daily rainfall based on soil group, crop cover, and slope.",
    decisionImpactTr:
      "Toprağı nadasla çıplak bırakmak CN değerini 89'a çıkarıp yağmur suyunu kaçırırken; fiğ/yonca örtüsü ve anıza ekim CN'yi düşürüp suyu tarlada tutar.",
    decisionImpactEn:
      "Quantifies how vegetative cover and slope control rainwater capture versus runoff loss.",
    sourceRef: "USDA-NRCS TR-55 Table 2-2b & Williams (1995) Slope Adjustment",
  },

  rusle: {
    id: "rusle",
    symbol: "RUSLE",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Yenilenmiş Evrensel Toprak Kaybı Denklemi",
    titleEn: "Revised Universal Soil Loss Equation",
    unitOrFormula: "A = R × K × LS × C × P (ton/hektar/yıl veya ton/dekar/yıl)",
    idealRangeTr: "Sürdürülebilir sınır: < 1.0 ton/ha/yıl (< 0.1 ton/da/yıl)",
    plainMeaningTr:
      "Yağış şiddeti (R), toprak aşınabilirliği (K), arazi eğimi (LS) ve bitki örtüsü (C) çarpanlarıyla tarlanızdan yılda kaç ton verimli üst toprağın erozyonla taşındığını hesaplar.",
    plainMeaningEn:
      "Predicts annual sheet and rill soil erosion loss as the product of rainfall erosivity (R), soil erodibility (K), slope (LS), cover (C), and practice (P).",
    decisionImpactTr:
      "Eğimli tarlalarda çapa bitkileri ve nadas RUSLE toprak kaybını 3–5 kat artırır; kışlık örtü bitkileri (Fiğ, Kanola, Buğday) erozyonu %70+ önler.",
    decisionImpactEn:
      "Penalizes bare-soil fallow and wide-row crops on sloped fields inside the Soil Health Index.",
    sourceRef: "Renard et al. (1997) USDA Agriculture Handbook 703",
  },

  ph: {
    id: "ph",
    symbol: "pH",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Toprak Reaksiyonu (Asitlik – Alkalilik Derecesi)",
    titleEn: "Soil pH (0–30 cm Topsoil Reaction)",
    unitOrFormula: "pH (H₂O) · 0–14 logaritmik ölçek",
    idealRangeTr: "Çoğu kültür bitkisi için ideal: 6.2 – 7.8 (Nötr / Hafif Alkali)",
    plainMeaningTr:
      "Toprağın asidik (< 6.5), nötr (6.5–7.5) veya kireçli/alkali (> 7.5) olduğunu gösterir; gübre olarak verdiğiniz besinlerin bitki tarafından emilip emilemeyeceğini yönetir.",
    plainMeaningEn:
      "Measure of soil acidity or alkalinity in the 0–30 cm root zone, governing nutrient solubility and microbial activity.",
    decisionImpactTr:
      "İç ve Güneydoğu Anadolu'da pH genelde 7.8–8.3 arasındadır; bu seviyede Fosfor, Demir ve Çinko kireçle bağlanır. Kuru fasulye ve patates yüksek pH'ta kloroz (sararma) yaşarken arpa, korunga, aspir ve nohut yüksek pH'a dayanıklıdır.",
    decisionImpactEn:
      "Flags micronutrient (Fe/Zn/P) lockup risks on calcareous high-pH soils for sensitive crops like dry bean and potato.",
    sourceRef: "ISRIC SoilGrids v2.0 phh2o & FAO EcoCrop",
  },

  soc: {
    id: "soc",
    symbol: "SOC / OM",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Toprak Organik Karbonu ve Organik Madde",
    titleEn: "Soil Organic Carbon & Organic Matter",
    unitOrFormula: "SOC (g/kg) · Organik Madde (%) ≈ SOC × 0.1724",
    idealRangeTr: "Türkiye ortalaması: %1.0–1.5 · İdeal hedef: > %2.0 (SOC > 12 g/kg)",
    plainMeaningTr:
      "Topraktaki çürümüş bitki artıkları, humus ve canlı mikroorganizma varlığının ölçüsüdür; toprağın hem besin deposu hem de su tutan süngeridir.",
    plainMeaningEn:
      "Carbon stored in soil organic matter (humus and microbial biomass), converted to % Organic Matter via the Van Bemmelen factor (1.724).",
    decisionImpactTr:
      "Organik madde %1'den %2'ye çıktığında toprağın su tutma kapasitesi (TAW) belirgin şekilde artar, kaymak tabakası kırılır ve gübre randımanı yükselir.",
    decisionImpactEn:
      "Directly enters the Saxton–Rawls pedotransfer equations to compute soil water-holding capacity.",
    sourceRef: "ISRIC SoilGrids v2.0 soc & Saxton & Rawls (2006)",
  },

  salinity_ece: {
    id: "salinity_ece",
    symbol: "ECe Tuzluluk",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "Toprak Tuzluluk Eşiği (Elektriksel İletkenlik)",
    titleEn: "Soil Saturation Extract Salinity Threshold (ECe)",
    unitOrFormula: "dS/m (deciSiemens / metre) · FAO-56 Tablo 23",
    idealRangeTr: "Tuzsuz: < 2 dS/m · Hassas ürünler: < 1.7 dS/m · Toleranslı (Arpa/Pamuk/Kanola): 7–9 dS/m",
    plainMeaningTr:
      "Toprak suyundaki çözünmüş tuz yoğunluğudur. Tuz oranı bitkinin eşik değerini aşarsa ozmotik basınç nedeniyle kökler topraktan su çekemez.",
    plainMeaningEn:
      "Electrical conductivity of the saturated soil paste extract above which crop yield begins to decline linearly.",
    decisionImpactTr:
      "Drenajı zayıf veya tuzlu taban arazilerde Kuru Fasulye (1.0 dS/m) ve Mısır (1.7 dS/m) büyük verim kaybederken; Arpa (8.0 dS/m), Kanola (9.0 dS/m), Pamuk (7.7 dS/m) ve Şeker Pancarı (7.0 dS/m) güvenle yetişir.",
    decisionImpactEn:
      "Matches crop salt tolerance thresholds against soil salinity risks.",
    sourceRef: "FAO-56 Table 23 (Maas & Hoffman Salinity Model)",
  },

  soil_texture: {
    id: "soil_texture",
    symbol: "Toprak Bünyesi",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "USDA Toprak Tekstürü (Kum / Silt / Kil Oranı)",
    titleEn: "USDA Soil Texture Triangle Classification",
    unitOrFormula: "% Kum (0.05–2 mm) + % Silt (0.002–0.05 mm) + % Kil (< 0.002 mm) = %100",
    idealRangeTr: "Tınlı (Loam) ve Killi-Tınlı (Clay Loam) en dengeli tarım topraklarıdır",
    plainMeaningTr:
      "Toprağın iri (kum), orta (silt/mil) ve çok ince (kil) taneciklerinin yüzdesel dağılımıdır; toprağın 'ağır' (killi) mı yoksa 'hafif/süzek' (kumlu) mi olduğunu belirler.",
    plainMeaningEn:
      "Relative proportions of sand, silt, and clay particles defining soil workability, drainage, and water retention.",
    decisionImpactTr:
      "Yumrulu bitkiler (Patates, Şeker Pancarı) ve Nohut ağır killi (>%35 kil) topraklarda şekil bozukluğu ve kök çürüklüğü yaşar; Buğday ve Pamuk ise killi-tınlı toprakları sever.",
    decisionImpactEn:
      "Drives both hydraulic parameters (θ_FC, θ_WP, K_sat) and physical crop suitability scoring.",
    sourceRef: "USDA Soil Survey Manual & ISRIC SoilGrids 250m",
  },

  soil_health: {
    id: "soil_health",
    symbol: "Toprak Puanı",
    category: "soil_hydrology",
    categoryLabelTr: "Toprak & Hidroloji",
    categoryLabelEn: "Soil & Hydrology",
    titleTr: "6 Bileşenli Toprak Sağlığı İndeksi",
    titleEn: "6-Component Rotation Soil Health Score",
    unitOrFormula: "0 – 100 Puan (Baklagil + Çeşitlilik + Örtü + Anız + N Dengesi + Erozyon)",
    idealRangeTr: "70 – 100: Sürdürülebilir / Onarıcı · < 50: Toprak Yorgunluğu Riski",
    plainMeaningTr:
      "Seçtiğiniz 3 yıllık ekim sırasının toprağı yorup yormadığını; baklagil varlığı, ürün ailesi çeşitliliği, çıplak toprak süresi, anız miktarı, azot dengesi ve erozyon riskine göre 100 üzerinden puanlar.",
    plainMeaningEn:
      "Composite 0–100 score evaluating how a 3-year rotation builds or depletes soil fertility across 6 agronomic indicators.",
    decisionImpactTr:
      "Üst üste tahıl veya nadas içeren planlar düşük puan alırken; tahıl + baklagil + yağlı tohum/örtü bitkisi içeren dengeli münavebeler 75+ puan alır.",
    decisionImpactEn:
      "Represents the 'Soil' objective in the multi-criteria TOPSIS rotation optimizer.",
    sourceRef: "AgroShift Engine v2 Soil Health Model",
  },

  ndvi: {
    id: "ndvi",
    symbol: "NDVI",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "Normalize Edilmiş Fark Bitki Örtüsü İndeksi",
    titleEn: "Normalized Difference Vegetation Index (MODIS / HLS)",
    unitOrFormula: "NDVI = (NIR − Red) / (NIR + Red) · (−1.0 ile +1.0 arası)",
    idealRangeTr: "Çıplak Toprak: 0.12–0.22 · Gelişen Ekili Alan: 0.35–0.55 · Yoğun Yeşil Örtü: 0.65–0.85",
    plainMeaningTr:
      "NASA uydularının (MODIS 250m ve Sentinel-2/Landsat HLS 10–30m) bitki klorofilinin yansıttığı yakın kızılötesi ışığı ölçerek tarladaki yeşil biyokütle yoğunluğunu ve gelişim hızını takip etmesidir.",
    plainMeaningEn:
      "Satellite spectral index measuring photosynthetically active green canopy density from red and near-infrared reflectance.",
    decisionImpactTr:
      "Parselin hangi aylarda yoğun bitki örtüsüyle kaplı olduğunu, hangi aylarda çıplak (nadas/hasat sonrası) kaldığını ve mevsimsel fenolojiyi doğrular.",
    decisionImpactEn:
      "Tracks seasonal crop phenology, bare-soil erosion windows, and historical vegetative vigor.",
    sourceRef: "NASA LP DAAC MOD13Q1 v061 & HLS 30m",
  },

  smap: {
    id: "smap",
    symbol: "SMAP L4",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA SMAP Kök Bölgesi Toprak Nemi",
    titleEn: "NASA SMAP L4 Root-Zone Soil Moisture (0–100 cm)",
    unitOrFormula: "m³/m³ veya % Doygunluk (9 km L-Band Radar/Radyometre Asimilasyonu)",
    idealRangeTr: "Kış/İlkbahar: 0.24–0.36 m³/m³ · Yaz Kuraklığı: 0.11–0.19 m³/m³",
    plainMeaningTr:
      "NASA'nın SMAP uydusunun L-bant mikrodalga sensörleriyle toprağın ilk 100 cm'lik kök bölgesindeki nem miktarını 3 saatlik/günlük olarak uzaydan izlemesidir.",
    plainMeaningEn:
      "Assimilated L-band satellite microwave soil moisture product estimating volumetric water content in the 0–100 cm root zone.",
    decisionImpactTr:
      "Ekim öncesinde toprakta biriken kış/ilkbahar nem kredisini belirleyerek ilk sulama tarihini ve net sulama ihtiyacını (Dn) hassaslaştırır.",
    decisionImpactEn:
      "Provides seasonal root-zone moisture credit and regional drought anomaly tracking.",
    sourceRef: "NASA JPL / NSIDC SPL4SMGP v007 (9 km)",
  },

  imerg: {
    id: "imerg",
    symbol: "GPM IMERG",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA GPM IMERG Küresel Yağış Gözlemi",
    titleEn: "NASA Global Precipitation Measurement (IMERG v07)",
    unitOrFormula: "mm/ay ve Sağanak Şiddet İndeksi (0.1° ≈ 10 km)",
    idealRangeTr: "Konvektif sağanaklarda yüzey akış kaybı %15–25'e çıkabilir",
    plainMeaningTr:
      "NASA ve JAXA'nın uydu takımından 30 dakikalık aralıklarla Türkiye üzerindeki yağmur ve kar yağışı şiddetini ölçen yüksek çözünürlüklü yağış sistemidir.",
    plainMeaningEn:
      "Multi-satellite precipitation dataset providing high-resolution rainfall totals and convective storm intensity.",
    decisionImpactTr:
      "Yağışın yumuşak çisenti mi yoksa toprağın ememeyeceği kadar sert sağanak mı olduğunu tespit ederek etkili yağış (Pe) hesabını düzeltir.",
    decisionImpactEn:
      "Calibrates storm runoff losses and cross-checks station/reanalysis precipitation.",
    sourceRef: "NASA GES DISC GPM_3IMERGM v07",
  },

  ecostress: {
    id: "ecostress",
    symbol: "ECOSTRESS LST",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA/JPL ECOSTRESS Yüzey Sıcaklığı ve Termal Stres",
    titleEn: "ISS ECOSTRESS Land Surface Temperature & Canopy Stress (70 m)",
    unitOrFormula: "LST (°C) ve ESI (Evaporative Stress Index) · 70 m çözünürlük",
    idealRangeTr: "Bitki örtüsü sıcaklığı > 32–35 °C olduğunda stoma kapanması başlar",
    plainMeaningTr:
      "Uluslararası Uzay İstasyonu'ndaki (ISS) NASA termal kamerasının tarlaların yüzey sıcaklığını 70 metre çözünürlükle ölçerek bitkilerin susuzluktan 'ateşinin çıktığı' anı yakalamasıdır.",
    plainMeaningEn:
      "High-resolution (70 m) thermal infrared radiometer aboard the ISS measuring canopy temperature and early water stress before visible wilting.",
    decisionImpactTr:
      "Yapraklar henüz sararmadan önce termal stres gün sayısını tespit eder ve sıcak/kurak yıllarda verim riskini (Ky) önceden uyarır.",
    decisionImpactEn:
      "Quantifies summer thermal stress days and evaporative demand spikes at parcel scale.",
    sourceRef: "NASA JPL ECOSTRESS ECO2LSTE / ECO3ETPTJPL (70 m)",
  },

  srtm: {
    id: "srtm",
    symbol: "SRTM 30m",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA SRTM Sayısal Yükselti, Eğim ve Bakı Modeli",
    titleEn: "NASA Shuttle Radar Topography Mission (30 m DEM)",
    unitOrFormula: "Rakım (m), Eğim (%) ve Bakı Açısı (°) · 30 m çözünürlük",
    idealRangeTr: "Tarla tarımı için ideal eğim: %0 – %6 · > %8 eğimde kontur/örtü şart",
    plainMeaningTr:
      "Tarlanızın deniz seviyesinden yüksekliğini (rakım), yüzde kaç eğimli olduğunu ve hangi yöne (güney/kuzey) baktığını 30 metre hassasiyetle ölçen radar haritasıdır.",
    plainMeaningEn:
      "30-meter radar digital elevation model computing parcel altitude, slope gradient (%), and aspect.",
    decisionImpactTr:
      "Rakım üzerinden sıcaklık düzeltmesi (Lapse Rate), eğim üzerinden ise SCS yüzey akışı ve RUSLE toprak erozyonu doğrudan hesaplanır.",
    decisionImpactEn:
      "Feeds elevation lapse rate (−6.5 °C/km), slope-adjusted Curve Number, and RUSLE LS-factor.",
    sourceRef: "NASA JPL SRTMGL1 v3.0 (30 m)",
  },

  cmip6: {
    id: "cmip6",
    symbol: "CMIP6 2035",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA NEX-GDDP-CMIP6 İklim Değişikliği Senaryoları (SSP2-4.5 & SSP5-8.5)",
    titleEn: "NASA Downscaled CMIP6 Climate Projections (2035 Horizon)",
    unitOrFormula: "SSP2-4.5 (Orta Emisyon) & SSP5-8.5 (Yüksek Emisyon / Ağır Kuraklık)",
    idealRangeTr: "2035 Türkiye projeksiyonu: +1.3…+2.2 °C ısınma, −%6…−%16 yağış değişimi",
    plainMeaningTr:
      "NASA'nın küresel iklim modellerini 25 km çözünürlüğe indirgeyerek 2030–2035 döneminde ilinizde sıcaklığın ve buharlaşmanın ne kadar artacağını, yağışın ne kadar azalacağını simüle etmesidir.",
    plainMeaningEn:
      "Bias-corrected, spatially downscaled IPCC CMIP6 projections modeling future warming and rainfall shifts under SSP2-4.5 and SSP5-8.5.",
    decisionImpactTr:
      "Bugün kurduğunuz 3 yıllık rotasyonun gelecekteki kurak ve sıcak yıllarda da iflas etmeden dayanıklı (robust) kalmasını test eder.",
    decisionImpactEn:
      "Powers minimax-regret robustness testing across future drought and warming scenarios.",
    sourceRef: "NASA NCCS NEX-GDDP-CMIP6 (Thrasher et al. 2022)",
  },

  nasa_power: {
    id: "nasa_power",
    symbol: "NASA POWER",
    category: "satellite",
    categoryLabelTr: "NASA Uydu & Gözlem",
    categoryLabelEn: "NASA Satellite & Sensing",
    titleTr: "NASA POWER Günlük Tarımsal Meteoroloji Serisi",
    titleEn: "NASA LaRC POWER Agroclimatology Daily Archive",
    unitOrFormula: "2001–2026 (25 Yıl · ~9.440 Günlük Kesintisiz Gözlem)",
    idealRangeTr: "Tmax, Tmin, RH2M, Rüzgâr (WS2M), Güneş Radyasyonu (Rs), Yağış",
    plainMeaningTr:
      "NASA Langley Araştırma Merkezi'nin 2001 yılından bugüne kadar her gün için sıcaklık, nem, rüzgâr, güneş enerjisi ve yağışı sunduğu tarımsal iklim veri tabanıdır.",
    plainMeaningEn:
      "25-year daily meteorological archive (MERRA-2 & CERES) providing all inputs required for daily FAO-56 Penman–Monteith simulation.",
    decisionImpactTr:
      "Tek bir 'ortalama yıl' varsayımı yapmak yerine, planınızı geçmiş 22 farklı 3-yıllık gerçek hava döneminde gün gün test etmemizi sağlar.",
    decisionImpactEn:
      "Enables multi-window historical replay across 22 sliding 3-year weather realizations.",
    sourceRef: "NASA LaRC POWER Project (MERRA-2 / CERES)",
  },

  munavebe: {
    id: "munavebe",
    symbol: "Münavebe",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Münavebe (Bilimsel Ekim Nöbeti / 3 Yıllık Rotasyon)",
    titleEn: "3-Year Crop Rotation Sequence",
    unitOrFormula: "1. Yıl → 2. Yıl → 3. Yıl (Farklı Kök Derinliği ve Bitki Ailesi Döngüsü)",
    idealRangeTr: "İdeal şablon: Baklagil / Yağlı Tohum → Kışlık Hububat → Çapa / Yem Bitkisi",
    plainMeaningTr:
      "Aynı tarlaya her yıl üst üste aynı ürünü ekmek yerine; toprağın suyunu, azotunu ve sağlığını koruyacak şekilde farklı bitki ailelerinin 3 yıllık sırayla yetiştirilmesidir.",
    plainMeaningEn:
      "Planned multi-year sequence of crops from different botanical families and rooting depths on the same parcel.",
    decisionImpactTr:
      "Doğru münavebe hastalık ve yabancı ot döngüsünü kırar, gübre maliyetini %20–35 düşürür ve tahıl verimini %10–15 artırır.",
    decisionImpactEn:
      "Breaks soil-borne pathogen cycles, captures biological nitrogen credits, and stabilizes multi-year farm income.",
    sourceRef: "Angus et al. (2015) · Ryan et al. (2008) · TAGEM",
  },

  no_till: {
    id: "no_till",
    symbol: "Anıza Ekim",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Anıza Doğrudan Ekim (Koruyucu / Sıfır Toprak İşleme)",
    titleEn: "No-Till / Direct Seeding into Crop Residue",
    unitOrFormula: "Toprak Nemi Koruma: +22–28 mm/yıl · Mazot Tasarrufu: −%55 (3.8 vs 8.5 L/da)",
    idealRangeTr: "Yüzeyde ≥ %30 anız örtüsü korunur, pullukla devirme yapılmaz",
    plainMeaningTr:
      "Hasat sonrasında tarladaki sap/anız örtüsünü yakmadan veya pullukla devirmeden, özel diskli/bıçaklı mibzerle tohumu doğrudan anızın içine bırakma yöntemidir.",
    plainMeaningEn:
      "Sowing directly into previous crop stubble without moldboard plowing, preserving surface mulch and soil pore continuity.",
    decisionImpactTr:
      "Toprak yüzeyini güneşten ve rüzgârdan koruyarak buharlaşmayı azaltır, yağmurun toprağa sızmasını artırır, dekara ~4.7 litre mazot tasarrufu sağlar ve organik maddeyi yılda +%0.08 artırır.",
    decisionImpactEn:
      "Conserves 22–28 mm of soil moisture, cuts tractor diesel use by 55%, and builds topsoil organic carbon.",
    sourceRef: "FAO Conservation Agriculture & TAGEM Anıza Ekim Araştırmaları",
  },

  n_fixation: {
    id: "n_fixation",
    symbol: "Azot Kredisi",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Biyolojik Azot Fiksasyonu ve Ön-Bitki Azot Kredisi",
    titleEn: "Symbiotic Biological Nitrogen Fixation & Residual N Credit",
    unitOrFormula: "kg saf Azot (N) / dekar veya hektar · Rhizobium Simbiyozu",
    idealRangeTr: "Nohut/Mercimek: +2–4.5 kg N/da · Soya/Fiğ: +4–8 kg N/da · Yonca/Korunga: +6–15 kg N/da",
    plainMeaningTr:
      "Baklagillerin (Nohut, Mercimek, Soya, Fiğ, Korunga, Yonca, Fasulye) köklerindeki yumrucuk (Rhizobium) bakterileri sayesinde havadaki serbest azotu yakalayıp toprağa gübre olarak bırakmasıdır.",
    plainMeaningEn:
      "Atmospheric N₂ fixed by root-nodule Rhizobium bacteria in legumes and left in the soil for the following non-legume crop.",
    decisionImpactTr:
      "Baklagilden sonra ekilen Buğday, Arpa veya Mısır'ın üre/amonyum nitrat gübresi ihtiyacı azalır; hem gübre parası cebinizde kalır hem de verim +%10 artar.",
    decisionImpactEn:
      "Directly credited as fertilizer cost savings (kg N × TL/kg N) and a +5–10% yield multiplier on the subsequent cereal.",
    sourceRef: "Herridge et al. (2008) Plant Soil 311:1–18 · Angus et al. (2015)",
  },

  biofumigation: {
    id: "biofumigation",
    symbol: "Biyo-Fümigasyon",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Biyo-Fümigasyon (Kanola Kök Temizleme Etkisi)",
    titleEn: "Brassica Glucosinolate Root Biofumigation",
    unitOrFormula: "Kanola → Buğday Verim Çarpanı: ×1.10 (+%10 Verim)",
    idealRangeTr: "Tahıl ağırlıklı münavebelerde 3 yılda 1 Kanola/Kolza",
    plainMeaningTr:
      "Turpgiller (Brassicaceae) ailesinden olan Kanolanın kök ve bitki artıklarındaki doğal 'glukozinolat' bileşiklerinin toprakta parçalanarak tahıl kök çürüklüğü mantarlarını ve nematodları doğal yolla baskılamasıdır.",
    plainMeaningEn:
      "Natural suppression of soil-borne cereal root pathogens (take-all, Gaeumannomyces) by isothiocyanates released from Brassica roots.",
    decisionImpactTr:
      "Buğday-Buğday üst üste ekiminde oluşan %10'luk verim kaybını tersine çevirerek takip eden buğdayda +%10 verim artışı sağlar.",
    decisionImpactEn:
      "Provides a proven non-legume break-crop yield boost (+10%) for subsequent winter wheat or barley.",
    sourceRef: "Kirkegaard et al. (2008) Field Crops Research 107:185–195",
  },

  break_years: {
    id: "break_years",
    symbol: "Dinlenme Yılı",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Zorunlu Münavebe Ara Süresi (Hastalık Kırma Yılı)",
    titleEn: "Minimum Phytosanitary Rotation Break Interval",
    unitOrFormula: "Aynı tarlaya tekrar ekim için gereken minimum yıl (1 – 4 yıl)",
    idealRangeTr: "Şeker Pancarı & Patates: 4 yıl · Nohut/Mercimek/Ayçiçeği/Kanola: 3–4 yıl",
    plainMeaningTr:
      "Toprakta biriken kist nematodu, solgunluk mantarı (Fusarium/Verticillium) veya canavar otu (Orabanş) tohumlarının ölmesi için o ürünün aynı tarlaya kaç yıl boyunca tekrar ekilmemesi gerektiğini belirtir.",
    plainMeaningEn:
      "Minimum number of years required between plantings of the same crop or host family to prevent soil-borne pathogen and parasite build-up.",
    decisionImpactTr:
      "Optimizasyon motoru, üst üste ekilmesi yasak olan ürünleri (maxConsecutive = 1) sert kısıt olarak otomatik engeller.",
    decisionImpactEn:
      "Enforced as a hard constraint and local review warning in the rotation optimizer.",
    sourceRef: "TÜRKŞEKER & Tarım Bakanlığı Münavebe Yönetmeliği",
  },

  bare_soil_days: {
    id: "bare_soil_days",
    symbol: "Çıplak Toprak",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Yıllık Çıplak Toprak Günü (Erozyon Penceresi)",
    titleEn: "Annual Bare-Soil Exposure Days",
    unitOrFormula: "Gün / yıl (365 gün içinde bitki örtüsüz geçen süre)",
    idealRangeTr: "İdeal: < 110 gün/yıl · Riskli (Nadaslı): > 200 gün/yıl",
    plainMeaningTr:
      "Bir ürünün hasadı ile bir sonraki ürünün ekimi arasında tarlanın hiçbir bitki örtüsü olmadan yağmur, rüzgâr ve güneşe açık kaldığı gün sayısıdır.",
    plainMeaningEn:
      "Number of days per year the parcel surface lacks living vegetative cover between harvest and subsequent sowing.",
    decisionImpactTr:
      "Çıplak toprak günü azaldıkça rüzgâr ve su erozyonu düşer, topraktaki nem buharlaşmaz ve Toprak Sağlığı Puanı yükselir.",
    decisionImpactEn:
      "Minimizing bare-soil days reduces RUSLE erosion and evaporative moisture loss.",
    sourceRef: "AgroShift Calendar & Soil Cover Engine",
  },

  irrigation_efficiency: {
    id: "irrigation_efficiency",
    symbol: "Sulama Randımanı",
    category: "agronomy_rotation",
    categoryLabelTr: "Münavebe & Agronomi",
    categoryLabelEn: "Rotation & Agronomy",
    titleTr: "Toplam Sulama Randımanı (Ea × Ec)",
    titleEn: "Overall Irrigation Application Efficiency",
    unitOrFormula: "Toplam Randıman = İletim (Ec) × Tarla İçi Uygulama (Ea)",
    idealRangeTr: "Damla: %90 · Center Pivot: %82 · Yağmurlama: %75 · Salma/Karık: %55–60",
    plainMeaningTr:
      "Kaynaktan çektiğiniz 100 ton suyun kaç tonunun buharlaşmadan ve derine kaçmadan gerçekten bitki köklerine ulaştığını gösterir.",
    plainMeaningEn:
      "Fraction of gross irrigation water withdrawn from the source that is beneficially stored in the crop root zone.",
    decisionImpactTr:
      "Randıman yükseldikçe aynı su kotasıyla daha geniş alan sulanır ve dekar başına sulama enerjisi maliyeti düşer.",
    decisionImpactEn:
      "Converts net root-zone irrigation requirement (Dn) into gross water withdrawal (Dt = Dn / Efficiency).",
    sourceRef: "FAO Irrigation Manual & DSİ Rehberi",
  },

  p10_p50_p90: {
    id: "p10_p50_p90",
    symbol: "P10 / P50 / P90",
    category: "economics_decision",
    categoryLabelTr: "Ekonomi & Karar Modeli",
    categoryLabelEn: "Economics & Decision Model",
    titleTr: "Olasılık Dilimleri: Kötü Yıl (P10), Tipik Yıl (P50), İyi Yıl (P90)",
    titleEn: "Historical Distribution Percentiles (P10, P50 Median, P90)",
    unitOrFormula: "22 farklı 3-yıllık geçmiş iklim döneminin istatistiksel dağılımı",
    idealRangeTr: "P50 = Normal (Medyan) Yıl · P10–P90 bandı ne kadar darsa plan o kadar istikrarlıdır",
    plainMeaningTr:
      "Tek bir tahmin yerine; P50 normal bir yıldaki beklenen sonucu, P10 kurak geçen kötü yıllardaki (10 yılın 1'i) alt sınırı, P90 ise yağışlı iyi yıllardaki üst sınırı gösterir.",
    plainMeaningEn:
      "10th, 50th (median), and 90th percentiles across all 22 historical 3-year weather windows.",
    decisionImpactTr:
      "Çiftçinin 'Kurak yılda en kötü ne kazanırım?' (P10) sorusuna gerçek tarihsel iklim simülasyonuyla yanıt verir.",
    decisionImpactEn:
      "Quantifies downside drought risk (P10) alongside typical performance (P50) and favorable years (P90).",
    sourceRef: "AgroShift Historical Window Replay Engine",
  },

  cvar20: {
    id: "cvar20",
    symbol: "CVaR₂₀",
    category: "economics_decision",
    categoryLabelTr: "Ekonomi & Karar Modeli",
    categoryLabelEn: "Economics & Decision Model",
    titleTr: "En Kötü %20 Dönem Ortalaması (Koşullu Risk Değeri)",
    titleEn: "Conditional Value at Risk (Worst 20% Windows Mean)",
    unitOrFormula: "TL/dekar/yıl (En kurak/stresli %20'lik dilimin ortalama kazancı)",
    idealRangeTr: "CVaR₂₀ pozitif (> 0 TL/da) ve mümkün olduğunca yüksek olmalıdır",
    plainMeaningTr:
      "Son 25 yılın en kurak ve en zorlu %20'lik döneminde (en kötü 4–5 dönemde) bu rotasyon planının dekar başına ortalama kaç TL kazandıracağını gösteren 'iflas koruma' ölçütüdür.",
    plainMeaningEn:
      "Average annual gross margin across the worst 20% of historical climate windows, measuring tail-risk resilience.",
    decisionImpactTr:
      "Normal yılda çok kazandıran ama kurak yılda zarar ettiren riskli planları eleyip, her koşulda ayakta kalan sağlam (robust) planları öne çıkarır.",
    decisionImpactEn:
      "Used in robust ranking to protect farmers against catastrophic drought years.",
    sourceRef: "Rockafellar & Uryasev (2000) CVaR Risk Model",
  },

  topsis_pareto: {
    id: "topsis_pareto",
    symbol: "TOPSIS & Pareto",
    category: "economics_decision",
    categoryLabelTr: "Ekonomi & Karar Modeli",
    categoryLabelEn: "Economics & Decision Model",
    titleTr: "Çok Kriterli Uzlaşık Karar (TOPSIS) ve Pareto Cephesi",
    titleEn: "Multi-Criteria Compromise Programming & Non-Dominated Pareto Front",
    unitOrFormula: "Bileşik Uyum Puanı: 0–100 (Su + Kazanç + Toprak Sağlığı + Düşük Risk)",
    idealRangeTr: "Pareto Knee (Uzlaşık Çözüm): 75 – 95 / 100",
    plainMeaningTr:
      "Hem az su harcayan, hem yüksek kâr bırakan, hem toprağı koruyan hem de riski düşük olan planları aynı anda değerlendirip, başka hiçbir planın tüm başlıklarda geçemediği 'en dengeli şampiyon' sıraları seçen matematiksel yöntemdir.",
    plainMeaningEn:
      "Finds non-dominated rotation plans on the (Water ↓, Margin ↑, Soil Health ↑, Risk ↓) frontier and ranks them by farmer priority weights.",
    decisionImpactTr:
      "Binlerce olası 3 yıllık kombinasyon içinden sizin önceliğinize (Su kıtlığı, Kazanç, Toprak koruma) en uygun 3 farklı rotasyonu saniyeler içinde bulur.",
    decisionImpactEn:
      "Screens 1,728+ candidate sequences and selects diverse, Pareto-optimal recommendations.",
    sourceRef: "Zeleny (1973) Compromise Programming",
  },

  gross_margin: {
    id: "gross_margin",
    symbol: "Brüt Kazanç",
    category: "economics_decision",
    categoryLabelTr: "Ekonomi & Karar Modeli",
    categoryLabelEn: "Economics & Decision Model",
    titleTr: "Dekar Başına Yıllık Brüt Kazanç (Net Gelir Göstergesi)",
    titleEn: "Annual Gross Margin per Decare (TL/da/yr)",
    unitOrFormula: "Kazanç = (Verim × Fiyat) − Değişken Masraf − Sulama Maliyeti + Azot Tasarrufu",
    idealRangeTr: "Kuru tarım: 2.000–5.500 TL/da · Sulu tarım: 6.000–18.000+ TL/da",
    plainMeaningTr:
      "Ürünün satış gelirinden tohum, gübre, mazot, ilaç ve sulama suyu masrafları düşüldükten ve önceki baklagilin bıraktığı bedava azot gübresi eklendikten sonra dekar başına cebinizde kalan yıllık kazançtır.",
    plainMeaningEn:
      "Crop revenue minus variable input costs and gross irrigation water cost, plus biological nitrogen fertilizer savings per decare.",
    decisionImpactTr:
      "Sadece brüt ciroya değil, gübre ve su masrafı düşülmüş gerçek net kârlılığa göre ürün seçimi yapılmasını sağlar.",
    decisionImpactEn:
      "Evaluates true farm profitability after accounting for water pumping costs and legume N savings.",
    sourceRef: "TMO / Trakya Birlik / Türkşeker 2025–2026 & AgroShift Economics",
  },

  confidence_grade: {
    id: "confidence_grade",
    symbol: "Güven (A–D)",
    category: "economics_decision",
    categoryLabelTr: "Ekonomi & Karar Modeli",
    categoryLabelEn: "Economics & Decision Model",
    titleTr: "Model Veri ve Karar Güven Derecesi (A / B / C / D)",
    titleEn: "Scientific Data & Rank-Stability Confidence Grade",
    unitOrFormula: "0–100 Puan → A (≥80 Çok Yüksek), B (65–79 İyi), C (50–64 Orta), D (<50 Düşük)",
    idealRangeTr: "A ve B derecesi: Yerel istasyon/ERA5 kalibrasyonlu ve ±%20 duyarlılıkta kararlı",
    plainMeaningTr:
      "Önerilen planın arkasındaki uydu/toprak verisinin ne kadar eksiksiz olduğunu ve fiyatlar veya verimler %20 oynasa bile bu planın hâlâ ilk 3'te kalıp kalmadığını gösteren güven notudur.",
    plainMeaningEn:
      "Composite grade combining climate/soil data completeness, rainfall cross-check agreement, and ±20% parameter perturbation stability.",
    decisionImpactTr:
      "Kullanıcıya modelin hangi noktalarda kesin veriye, hangi noktalarda bölgesel varsayıma dayandığını dürüstçe bildirir.",
    decisionImpactEn:
      "Communicates epistemic uncertainty and sensitivity robustness transparently.",
    sourceRef: "AgroShift Engine v2 Sensitivity & Provenance Module",
  },
};

export const GLOSSARY_LIST: GlossaryTermSpec[] = Object.values(GLOSSARY_TERMS);

const TERM_ALIASES: Record<string, GlossaryTermId> = {
  topsis: "topsis_pareto",
  pareto: "topsis_pareto",
  ece: "salinity_ece",
  ece_salinity: "salinity_ece",
  salinity: "salinity_ece",
  crop_rotation: "munavebe",
  rotation: "munavebe",
  tthdm: "munavebe",
  aniza_ekim: "no_till",
  notill: "no_till",
  fc: "theta_fc",
  wp: "theta_wp",
  sat: "theta_sat",
  cn: "scs_cn",
  power: "nasa_power",
  p10: "p10_p50_p90",
  p50: "p10_p50_p90",
  p90: "p10_p50_p90",
  cvar: "cvar20",
  margin: "gross_margin",
  confidence: "confidence_grade",
};

export function getGlossaryTerm(id: string): GlossaryTermSpec | undefined {
  const key = (id in GLOSSARY_TERMS ? id : TERM_ALIASES[id]) as
    | GlossaryTermId
    | undefined;
  return key ? GLOSSARY_TERMS[key] : undefined;
}

