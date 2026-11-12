// Pilot regions (spec §3). Safe to import from client and server code.
export interface Pilot {
  id: string;
  nameTr: string;
  nameEn: string;
  lat: number;
  lon: number;
}

export const PILOTS: Pilot[] = [
  { id: "konya-cumra", nameTr: "Konya-Çumra", nameEn: "Konya-Cumra", lat: 37.57, lon: 32.77 },
  { id: "sanliurfa-harran", nameTr: "Şanlıurfa-Harran", nameEn: "Sanliurfa-Harran", lat: 36.87, lon: 39.03 },
  { id: "adana-yuregir", nameTr: "Adana-Yüreğir", nameEn: "Adana-Yuregir", lat: 36.98, lon: 35.43 },
  { id: "edirne-uzunkopru", nameTr: "Edirne-Uzunköprü", nameEn: "Edirne-Uzunkopru", lat: 41.27, lon: 26.69 },
  { id: "polatli-ankara", nameTr: "Polatlı-Ankara", nameEn: "Polatli-Ankara", lat: 39.58, lon: 32.15 },
];
