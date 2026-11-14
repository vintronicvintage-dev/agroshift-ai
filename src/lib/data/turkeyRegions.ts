import type { LonLat } from "./fieldTypes";

export interface TurkeyBasin {
  id: string;
  nameTr: string;
  nameEn: string;
  regionTr: string;
  lat: number;
  lon: number;
  zoom: number;
  cropsTr: string;
}

export interface TurkeyProvince {
  code: string;
  name: string;
  lat: number;
  lon: number;
}

/** Major agricultural plains and basins of Turkey with verified WGS84 center coordinates. */
export const TURKEY_BASINS: TurkeyBasin[] = [
  { id: "konya-ovasi", nameTr: "Konya Ovası (Çumra / Karatay)", nameEn: "Konya Plain (Cumra / Karatay)", regionTr: "İç Anadolu", lat: 37.5714, lon: 32.7836, zoom: 16, cropsTr: "Buğday, Şekerpancarı, Mısır, Nohut, Ayçiçeği" },
  { id: "harran-ovasi", nameTr: "Harran Ovası (Şanlıurfa / GAP)", nameEn: "Harran Plain (Sanliurfa / GAP)", regionTr: "Güneydoğu Anadolu", lat: 36.8644, lon: 39.0314, zoom: 16, cropsTr: "Pamuk, Buğday, Mercimek, Mısır" },
  { id: "polatli-sakarya", nameTr: "Polatlı Ovası (Ankara)", nameEn: "Polatli Plain (Ankara)", regionTr: "İç Anadolu", lat: 39.5842, lon: 32.1472, zoom: 16, cropsTr: "Kışlık Buğday, Arpa, Nohut, Ayçiçeği" },
  { id: "gediz-ovasi", nameTr: "Gediz Ovası (Manisa / Salihli)", nameEn: "Gediz Basin (Manisa / Salihli)", regionTr: "Ege", lat: 38.4831, lon: 28.1386, zoom: 16, cropsTr: "Pamuk, Mısır, Buğday, Yonca" },
  { id: "corum-alaca", nameTr: "Alaca Ovası (Çorum)", nameEn: "Alaca Plain (Corum)", regionTr: "Karadeniz / İç Anadolu", lat: 40.1683, lon: 34.8425, zoom: 16, cropsTr: "Buğday, Nohut, Mercimek, Ayçiçeği" },
  { id: "cukurova", nameTr: "Çukurova (Adana / Ceyhan)", nameEn: "Cukurova Plain (Adana / Ceyhan)", regionTr: "Akdeniz", lat: 37.0017, lon: 35.6184, zoom: 15, cropsTr: "Mısır, Pamuk, Buğday, Soya, Ayçiçeği" },
  { id: "ergene-trakya", nameTr: "Ergene Havzası (Tekirdağ / Edirne)", nameEn: "Ergene Basin (Thrace)", regionTr: "Marmara", lat: 41.2867, lon: 27.1683, zoom: 15, cropsTr: "Ayçiçeği, Buğday, Kanola, Arpa" },
  { id: "buyuk-menderes", nameTr: "Büyük Menderes Ovası (Aydın / Söke)", nameEn: "Buyuk Menderes Plain (Aydin / Soke)", regionTr: "Ege", lat: 37.7342, lon: 27.4061, zoom: 15, cropsTr: "Pamuk, Mısır, Buğday, Yonca" },
  { id: "bafra-ovasi", nameTr: "Bafra Ovası (Samsun)", nameEn: "Bafra Delta Plain (Samsun)", regionTr: "Karadeniz", lat: 41.5844, lon: 35.9186, zoom: 15, cropsTr: "Mısır, Buğday, Şekerpancarı, Yonca" },
  { id: "carsamba-ovasi", nameTr: "Çarşamba Ovası (Samsun)", nameEn: "Carsamba Delta Plain (Samsun)", regionTr: "Karadeniz", lat: 41.2047, lon: 36.7275, zoom: 15, cropsTr: "Mısır, Buğday, Soya" },
  { id: "amik-ovasi", nameTr: "Amik Ovası (Hatay / Reyhanlı)", nameEn: "Amik Plain (Hatay / Reyhanli)", regionTr: "Akdeniz", lat: 36.3189, lon: 36.3822, zoom: 15, cropsTr: "Pamuk, Buğday, Mısır" },
  { id: "karacabey-ovasi", nameTr: "Karacabey Ovası (Bursa)", nameEn: "Karacabey Plain (Bursa)", regionTr: "Marmara", lat: 40.2036, lon: 28.3561, zoom: 15, cropsTr: "Mısır, Şekerpancarı, Buğday, Ayçiçeği" },
  { id: "ceylanpinar-ovasi", nameTr: "Ceylanpınar Ovası (Şanlıurfa / Mardin)", nameEn: "Ceylanpinar Plain (Sanliurfa / Mardin)", regionTr: "Güneydoğu Anadolu", lat: 36.8572, lon: 40.0419, zoom: 15, cropsTr: "Buğday, Mercimek, Pamuk, Mısır" },
  { id: "eskisehir-alpu", nameTr: "Alpu Ovası (Eskişehir)", nameEn: "Alpu Plain (Eskisehir)", regionTr: "İç Anadolu", lat: 39.7661, lon: 30.9589, zoom: 15, cropsTr: "Şekerpancarı, Buğday, Arpa, Ayçiçeği" },
  { id: "mus-ovasi", nameTr: "Muş Ovası (Muş)", nameEn: "Mus Plain (Mus)", regionTr: "Doğu Anadolu", lat: 38.7936, lon: 41.5519, zoom: 15, cropsTr: "Buğday, Şekerpancarı, Yonca, Nohut" },
  { id: "igdir-ovasi", nameTr: "Iğdır Ovası (Iğdır)", nameEn: "Igdir Plain (Igdir)", regionTr: "Doğu Anadolu", lat: 39.9439, lon: 44.0786, zoom: 15, cropsTr: "Yonca, Buğday, Mısır, Pamuk" },
];

/** All 81 provinces of Turkey with plate codes and WGS84 coordinates (Harita Genel Müdürlüğü / TÜİK reference centers). */
export const TURKEY_PROVINCES: TurkeyProvince[] = [
  { code: "01", name: "Adana", lat: 37.0000, lon: 35.3213 },
  { code: "02", name: "Adıyaman", lat: 37.7648, lon: 38.2786 },
  { code: "03", name: "Afyonkarahisar", lat: 38.7507, lon: 30.5567 },
  { code: "04", name: "Ağrı", lat: 39.7191, lon: 43.0503 },
  { code: "05", name: "Amasya", lat: 40.6499, lon: 35.8353 },
  { code: "06", name: "Ankara", lat: 39.9208, lon: 32.8541 },
  { code: "07", name: "Antalya", lat: 36.8969, lon: 30.7133 },
  { code: "08", name: "Artvin", lat: 41.1828, lon: 41.8183 },
  { code: "09", name: "Aydın", lat: 37.8560, lon: 27.8416 },
  { code: "10", name: "Balıkesir", lat: 39.6484, lon: 27.8826 },
  { code: "11", name: "Bilecik", lat: 40.1451, lon: 29.9799 },
  { code: "12", name: "Bingöl", lat: 38.8854, lon: 40.4980 },
  { code: "13", name: "Bitlis", lat: 38.4006, lon: 42.1095 },
  { code: "14", name: "Bolu", lat: 40.7392, lon: 31.6089 },
  { code: "15", name: "Burdur", lat: 37.7203, lon: 30.2908 },
  { code: "16", name: "Bursa", lat: 40.1885, lon: 29.0610 },
  { code: "17", name: "Çanakkale", lat: 40.1553, lon: 26.4142 },
  { code: "18", name: "Çankırı", lat: 40.6013, lon: 33.6134 },
  { code: "19", name: "Çorum", lat: 40.5506, lon: 34.9556 },
  { code: "20", name: "Denizli", lat: 37.7765, lon: 29.0864 },
  { code: "21", name: "Diyarbakır", lat: 37.9144, lon: 40.2306 },
  { code: "22", name: "Edirne", lat: 41.6818, lon: 26.5623 },
  { code: "23", name: "Elazığ", lat: 38.6810, lon: 39.2264 },
  { code: "24", name: "Erzincan", lat: 39.7500, lon: 39.5000 },
  { code: "25", name: "Erzurum", lat: 39.9043, lon: 41.2679 },
  { code: "26", name: "Eskişehir", lat: 39.7767, lon: 30.5206 },
  { code: "27", name: "Gaziantep", lat: 37.0662, lon: 37.3833 },
  { code: "28", name: "Giresun", lat: 40.9128, lon: 38.3895 },
  { code: "29", name: "Gümüşhane", lat: 40.4603, lon: 39.4814 },
  { code: "30", name: "Hakkâri", lat: 37.5833, lon: 43.7333 },
  { code: "31", name: "Hatay", lat: 36.2021, lon: 36.1606 },
  { code: "32", name: "Isparta", lat: 37.7648, lon: 30.5566 },
  { code: "33", name: "Mersin", lat: 36.8121, lon: 34.6415 },
  { code: "34", name: "İstanbul", lat: 41.0082, lon: 28.9784 },
  { code: "35", name: "İzmir", lat: 38.4237, lon: 27.1428 },
  { code: "36", name: "Kars", lat: 40.6013, lon: 43.0975 },
  { code: "37", name: "Kastamonu", lat: 41.3887, lon: 33.7827 },
  { code: "38", name: "Kayseri", lat: 38.7312, lon: 35.4787 },
  { code: "39", name: "Kırklareli", lat: 41.7333, lon: 27.2167 },
  { code: "40", name: "Kırşehir", lat: 39.1425, lon: 34.1709 },
  { code: "41", name: "Kocaeli", lat: 40.8533, lon: 29.8815 },
  { code: "42", name: "Konya", lat: 37.8746, lon: 32.4932 },
  { code: "43", name: "Kütahya", lat: 39.4167, lon: 29.9833 },
  { code: "44", name: "Malatya", lat: 38.3552, lon: 38.3095 },
  { code: "45", name: "Manisa", lat: 38.6191, lon: 27.4289 },
  { code: "46", name: "Kahramanmaraş", lat: 37.5858, lon: 36.9371 },
  { code: "47", name: "Mardin", lat: 37.3212, lon: 40.7245 },
  { code: "48", name: "Muğla", lat: 37.2153, lon: 28.3636 },
  { code: "49", name: "Muş", lat: 38.7432, lon: 41.5064 },
  { code: "50", name: "Nevşehir", lat: 38.6244, lon: 34.7144 },
  { code: "51", name: "Niğde", lat: 37.9667, lon: 34.6833 },
  { code: "52", name: "Ordu", lat: 40.9839, lon: 37.8764 },
  { code: "53", name: "Rize", lat: 41.0201, lon: 40.5234 },
  { code: "54", name: "Sakarya", lat: 40.7569, lon: 30.3783 },
  { code: "55", name: "Samsun", lat: 41.2867, lon: 36.3300 },
  { code: "56", name: "Siirt", lat: 37.9333, lon: 41.9500 },
  { code: "57", name: "Sinop", lat: 42.0231, lon: 35.1531 },
  { code: "58", name: "Sivas", lat: 39.7477, lon: 37.0179 },
  { code: "59", name: "Tekirdağ", lat: 40.9833, lon: 27.5167 },
  { code: "60", name: "Tokat", lat: 40.3167, lon: 36.5500 },
  { code: "61", name: "Trabzon", lat: 41.0027, lon: 39.7168 },
  { code: "62", name: "Tunceli", lat: 39.1079, lon: 39.5401 },
  { code: "63", name: "Şanlıurfa", lat: 37.1591, lon: 38.7969 },
  { code: "64", name: "Uşak", lat: 38.6823, lon: 29.4082 },
  { code: "65", name: "Van", lat: 38.4891, lon: 43.4089 },
  { code: "66", name: "Yozgat", lat: 39.8181, lon: 34.8147 },
  { code: "67", name: "Zonguldak", lat: 41.4564, lon: 31.7987 },
  { code: "68", name: "Aksaray", lat: 38.3687, lon: 34.0370 },
  { code: "69", name: "Bayburt", lat: 40.2552, lon: 40.2249 },
  { code: "70", name: "Karaman", lat: 37.1759, lon: 33.2287 },
  { code: "71", name: "Kırıkkale", lat: 39.8468, lon: 33.5153 },
  { code: "72", name: "Batman", lat: 37.8812, lon: 41.1351 },
  { code: "73", name: "Şırnak", lat: 37.5164, lon: 42.4611 },
  { code: "74", name: "Bartın", lat: 41.6344, lon: 32.3375 },
  { code: "75", name: "Ardahan", lat: 41.1105, lon: 42.7022 },
  { code: "76", name: "Iğdır", lat: 39.9167, lon: 44.0333 },
  { code: "77", name: "Yalova", lat: 40.6500, lon: 29.2667 },
  { code: "78", name: "Karabük", lat: 41.2061, lon: 32.6204 },
  { code: "79", name: "Kilis", lat: 36.7184, lon: 37.1212 },
  { code: "80", name: "Osmaniye", lat: 37.0742, lon: 36.2478 },
  { code: "81", name: "Düzce", lat: 40.8438, lon: 31.1565 },
];

function normTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/â/g, "a")
    .trim();
}

export interface LocalSearchHit {
  id: string;
  label: string;
  sublabel: string;
  point: LonLat;
  zoom: number;
}

/** Instant local search across Turkey's 16 major agricultural basins and 81 provinces. */
export function searchTurkeyLocations(query: string, limit = 8): LocalSearchHit[] {
  const q = normTr(query);
  if (!q) return [];
  const hits: LocalSearchHit[] = [];
  for (const b of TURKEY_BASINS) {
    if (normTr(b.nameTr).includes(q) || normTr(b.regionTr).includes(q) || normTr(b.cropsTr).includes(q)) {
      hits.push({
        id: `basin-${b.id}`,
        label: b.nameTr,
        sublabel: `${b.regionTr} · ${b.cropsTr}`,
        point: { lat: b.lat, lon: b.lon },
        zoom: b.zoom,
      });
    }
  }
  for (const p of TURKEY_PROVINCES) {
    if (normTr(p.name).includes(q) || p.code === q) {
      hits.push({
        id: `prov-${p.code}`,
        label: `${p.name} (${p.code})`,
        sublabel: "Türkiye İl Merkezi",
        point: { lat: p.lat, lon: p.lon },
        zoom: 13,
      });
    }
  }
  return hits.slice(0, limit);
}

/**Approximate meters-per-pixel at a given latitude and Web-Mercator zoom level. */
export function metersPerPixel(lat: number, zoom: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
}
