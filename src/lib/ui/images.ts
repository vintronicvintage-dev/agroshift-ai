import type { LocalizedText } from "@/lib/types";

/**
 * Every photograph in the product, with its credit and licence. Credits on the Methods page and
 * in image corners are rendered from this list, so a picture cannot appear without its source.
 * Files are local WebP derivatives in public/images (originals are not committed); see
 * public/images/CREDITS.md for the full record. All images here are US federal government works
 * (NASA, USGS Landsat data, USDA) and are in the public domain. Using them does not imply NASA
 * endorsement of AgroShift.
 */
export interface ProductImage {
  id: ImageId;
  src: string;
  width: number;
  height: number;
  /** Tiny inline WebP for placeholder="blur" (local files referenced by string get none). */
  blurDataURL: string;
  title: string;
  /** What the picture really shows, in both languages. */
  alt: LocalizedText;
  /** Short corner credit, e.g. "NASA Earth Observatory / USDA FAS". */
  creditShort: string;
  /** Full credit line as given by the source. */
  credit: string;
  licence: LocalizedText;
  sourceUrl: string;
  fileUrl: string;
  /** Where it is used, for the Methods page list. */
  usedIn: LocalizedText;
  /** How the derivative differs from the original. */
  edits: LocalizedText;
}

export type ImageId = "harranPlain" | "gsField" | "gsWater" | "gsCompare" | "gsScenario" | "gsEvidence";

const PD: LocalizedText = {
  tr: "Kamu malı (ABD federal hükümeti eseri)",
  en: "Public domain (US federal government work)",
};

const HARRAN_SOURCE = "https://science.nasa.gov/earth/earth-observatory/just-add-water-a-modern-agricultural-revolution-in-the-fertile-crescent";
const HARRAN_FILE = "https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/harranplains/images/ataturk_2002.jpg";
const HARRAN_CREDIT = "Image courtesy USDA Foreign Agricultural Service (PECAD), Landsat 7 data, 24 August 2002. Published in NASA Earth Observatory, \"Just add water\", by Rebecca Lindsey and Curt Reynolds.";

export const IMAGES: Record<ImageId, ProductImage> = {
  harranPlain: {
    id: "harranPlain",
    src: "/images/harran-plain-2002.webp",
    width: 1400,
    height: 1662,
    blurDataURL: "data:image/webp;base64,UklGRlYAAABXRUJQVlA4IEoAAADQAQCdASoMAA4AA4BaJQBOgBe8CLAJQAD92eP9ebnxTGbM+KDwnjsh7vvofkt3JTfGUITb9KYmC8+mP0UJ4ZYFbAKNGorh6+cAAA==",
    title: "Harran Plain and Atatürk Reservoir, Landsat 7, 24 August 2002",
    alt: {
      tr: "Landsat 7 uydusundan Şanlıurfa: üstte Atatürk Barajı gölü, altta yaz ortasında yeşil kalan sulanan Harran Ovası tarlaları, çevresinde kuru ve kahverengi araziler. 24 Ağustos 2002.",
      en: "Şanlıurfa, Türkiye, from Landsat 7: the Atatürk Reservoir at the top and the irrigated fields of the Harran Plain, green in midsummer, among dry brown land. 24 August 2002.",
    },
    creditShort: "NASA Earth Observatory / USDA FAS, Landsat 7",
    credit: HARRAN_CREDIT,
    licence: PD,
    sourceUrl: HARRAN_SOURCE,
    fileUrl: HARRAN_FILE,
    usedIn: { tr: "Giriş ve kayıt sayfası, Yöntem sayfası başlığı", en: "Sign-in and sign-up pages, Methods page header" },
    edits: { tr: "Kırpıldı, 1400 px genişliğe küçültüldü, WebP", en: "Cropped, resized to 1400 px wide, WebP" },
  },
  gsField: {
    id: "gsField",
    src: "/images/gs-field.webp",
    width: 192,
    height: 192,
    blurDataURL: "data:image/webp;base64,UklGRj4AAABXRUJQVlA4IDIAAACwAQCdASoMAAwAA4BaJQAAXVZzFsYAAP7LXl0YdgqpqP1qWlWyTofQcg2uL/e5aKAQAA==",
    title: "Irrigated parcels on the Harran Plain (detail), Landsat 7, 24 August 2002",
    alt: { tr: "Harran Ovası'nda sulanan tarla parselleri, Landsat 7 görüntüsünden ayrıntı", en: "Irrigated field parcels on the Harran Plain, detail of a Landsat 7 image" },
    creditShort: "NASA Earth Observatory / USDA FAS, Landsat 7",
    credit: HARRAN_CREDIT,
    licence: PD,
    sourceUrl: HARRAN_SOURCE,
    fileUrl: HARRAN_FILE,
    usedIn: { tr: "Başlarken kartı 1: Tarlanı seç", en: "Getting started card 1: Pick your field" },
    edits: { tr: "Ayrıntı kırpıldı, 192 px kare, WebP", en: "Detail crop, 192 px square, WebP" },
  },
  gsWater: {
    id: "gsWater",
    src: "/images/gs-water.webp",
    width: 192,
    height: 192,
    blurDataURL: "data:image/webp;base64,UklGRjAAAABXRUJQVlA4ICQAAABwAQCdASoMAAwAA4BaJZQCdAAAAABryPzsChqZKu6VrrsPQAA=",
    title: "Center-pivot irrigation in western Texas, photographed from the ISS (iss074e0603632), 16 May 2026",
    alt: { tr: "Uluslararası Uzay İstasyonu'ndan Batı Teksas, ABD: dairesel pivot sulama tarlaları", en: "Western Texas, USA, from the International Space Station: circular center-pivot irrigated fields" },
    creditShort: "NASA, ISS",
    credit: "NASA. International Space Station crew Earth observation iss074e0603632, 16 May 2026.",
    licence: PD,
    sourceUrl: "https://images.nasa.gov/details/iss074e0603632",
    fileUrl: "https://images-assets.nasa.gov/image/iss074e0603632/iss074e0603632~large.jpg",
    usedIn: { tr: "Başlarken kartı 2: Suyunu gir", en: "Getting started card 2: Enter your water" },
    edits: { tr: "Kırpıldı, kontrast artırıldı (pus), 192 px kare, WebP", en: "Cropped, contrast raised (haze), 192 px square, WebP" },
  },
  gsCompare: {
    id: "gsCompare",
    src: "/images/gs-compare.webp",
    width: 192,
    height: 192,
    blurDataURL: "data:image/webp;base64,UklGRkoAAABXRUJQVlA4ID4AAADwAQCdASoMAAwAA4BaJZwAAl0GXlQvmMQA/qM/abMlEt6JXH8ZHa/akcj10tVVJBdTs/D2uXGNA6wMUgAAAA==",
    title: "Fall harvest in eastern Kazakhstan, Landsat 8 OLI, 9 September 2013",
    alt: { tr: "Doğu Kazakistan'da yağmurla beslenen buğday tarlaları, kimi hasat edilmiş kimi yeşil, Landsat 8", en: "Rain-fed wheat fields in eastern Kazakhstan, some harvested and some green, Landsat 8" },
    creditShort: "NASA Earth Observatory, Landsat 8",
    credit: "NASA Earth Observatory image by Jesse Allen, using Landsat data from the U.S. Geological Survey. Caption by Holli Riebeek.",
    licence: PD,
    sourceUrl: "https://images.nasa.gov/details/GSFC_20171208_Archive_e001371",
    fileUrl: "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001371/GSFC_20171208_Archive_e001371~large.jpg",
    usedIn: { tr: "Başlarken kartı 3: Önerileri karşılaştır", en: "Getting started card 3: Compare the options" },
    edits: { tr: "Kırpıldı, 192 px kare, WebP", en: "Cropped, 192 px square, WebP" },
  },
  gsScenario: {
    id: "gsScenario",
    src: "/images/gs-scenario.webp",
    width: 192,
    height: 192,
    blurDataURL: "data:image/webp;base64,UklGRk4AAABXRUJQVlA4IEIAAACwAQCdASoMAAwAA4BaJbACdABvidmAAP3PD2XPhUVK5TIGebD2VuNWFsPlX5ZfzZZGa5D6iSm3ii317u0SQBpZAAA=",
    title: "Disappearing Lake Tuz, Landsat 8 OLI false color, 9 August 2021",
    alt: { tr: "Tuz Gölü'nün çekilen batı kıyısı ve kuru tarlalar, Landsat 8 yanlış renk görüntüsü (su turkuaz, bitki örtüsü yeşil)", en: "The shrinking western shore of Lake Tuz and dry fields, Landsat 8 false-color image (water turquoise, vegetation green)" },
    creditShort: "NASA Earth Observatory, Landsat 8",
    credit: "NASA Earth Observatory images by Joshua Stevens, using Landsat data from the U.S. Geological Survey. Story by Kathryn Hansen.",
    licence: PD,
    sourceUrl: "https://science.nasa.gov/earth/earth-observatory/disappearing-lake-tuz-149211",
    fileUrl: "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/149000/149211/tuz_oli_2021228_lrg.jpg",
    usedIn: { tr: "Başlarken kartı 4: Senaryoyla dene", en: "Getting started card 4: Try a scenario" },
    edits: { tr: "Kırpıldı, 192 px kare, WebP", en: "Cropped, 192 px square, WebP" },
  },
  gsEvidence: {
    id: "gsEvidence",
    src: "/images/gs-evidence.webp",
    width: 192,
    height: 192,
    blurDataURL: "data:image/webp;base64,UklGRmYAAABXRUJQVlA4IFoAAABQAgCdASoMAAwAA4BaJZgCdH8AGEv6/3Ii5AAA/vnFTnEtQ/wHYGwDY5vA1Pjeey4Q8+ws6epVv3sHt6uevZGqyODX/6eDyt0TuJMlb8aFhWNHBHCOIHJIAAA=",
    title: "Aqua satellite orbiting Earth, artist concept (PIA18156)",
    alt: { tr: "MODIS aletini taşıyan Aqua uydusu, sanatçı çizimi", en: "The Aqua satellite, which carries the MODIS instrument, artist concept" },
    creditShort: "NASA/JPL",
    credit: "NASA. Artist concept, JPL Photojournal PIA18156.",
    licence: PD,
    sourceUrl: "https://images.nasa.gov/details/PIA18156",
    fileUrl: "https://images-assets.nasa.gov/image/PIA18156/PIA18156~orig.jpg",
    usedIn: { tr: "Başlarken kartı 5: Kanıta bak", en: "Getting started card 5: Look at the evidence" },
    edits: { tr: "Kırpıldı, 192 px kare, WebP", en: "Cropped, 192 px square, WebP" },
  },
};

export const IMAGE_LIST: ProductImage[] = Object.values(IMAGES);

/** Date the sources and licences above were checked. */
export const IMAGES_RETRIEVED = "2026-11-13";
