/**
 * Agricultural Basin Climate Normals (MGM 1991–2020).
 *
 * Provides long-term reference normals for the 7 primary agricultural basins of Turkey,
 * geospatial matching for arbitrary map coordinates, and monthly/annual satellite bias
 * calculation against NASA POWER records.
 */
import type { ClimateSeries } from "@/lib/types";

export interface AgriculturalBasin {
  id: string;
  nameTr: string;
  nameEn: string;
  stationName: string;
  referencePeriod: string; // e.g. "1991–2020"
  lat: number;
  lon: number;
  /** 12 monthly precipitation normals (Jan..Dec) in mm */
  monthlyPrecipMm: number[];
  /** Long-term mean annual precipitation in mm */
  annualPrecipMm: number;
  /** 12 monthly mean temperature normals (Jan..Dec) in °C */
  monthlyTempC: number[];
  /** Long-term mean annual temperature in °C */
  annualTempC: number;
  representativeCities: string[];
}

export interface MonthlyDeviation {
  month: number; // 1..12
  stationPrecipMm: number;
  modelPrecipMm: number;
  precipFactor: number; // station / model
  precipBiasMm: number; // model - station
  precipBiasPct: number; // ((model - station) / station) * 100
}

export interface BasinDeviation {
  basin: AgriculturalBasin;
  distanceKm: number;
  stationAnnualPrecipMm: number;
  modelAnnualPrecipMm: number;
  annualFactor: number;
  annualBiasMm: number;
  annualBiasPct: number;
  monthlyStats: MonthlyDeviation[];
  years: number[];
}

/**
 * Turkey's 7 main agricultural basins with verified MGM 1991–2020 climatological normals.
 */
export const AGRICULTURAL_BASINS: readonly AgriculturalBasin[] = [
  {
    id: "ic-anadolu",
    nameTr: "İç Anadolu (Konya - Ankara)",
    nameEn: "Central Anatolia (Konya - Ankara)",
    stationName: "MGM Konya - Ankara İstasyonları",
    referencePeriod: "1991–2020",
    lat: 37.87,
    lon: 32.49,
    // Monthly precipitation totaling 320.0 mm (MGM Konya-Çumra agricultural climatology)
    monthlyPrecipMm: [32.0, 27.0, 30.0, 37.0, 41.0, 23.0, 7.0, 6.0, 15.0, 30.0, 33.0, 39.0],
    annualPrecipMm: 320.0,
    monthlyTempC: [-0.5, 1.2, 5.8, 11.2, 16.1, 20.8, 24.2, 23.9, 19.1, 13.0, 6.8, 1.5],
    annualTempC: 11.9,
    representativeCities: ["Konya", "Ankara", "Aksaray", "Karaman", "Eskişehir"],
  },
  {
    id: "cukurova",
    nameTr: "Çukurova (Adana)",
    nameEn: "Cukurova (Adana)",
    stationName: "MGM Adana Bölge İstasyonu",
    referencePeriod: "1991–2020",
    lat: 37.00,
    lon: 35.32,
    monthlyPrecipMm: [107.5, 87.2, 65.4, 51.3, 44.8, 19.5, 6.2, 5.8, 17.6, 46.2, 75.4, 133.1],
    annualPrecipMm: 660.0,
    monthlyTempC: [9.8, 11.2, 14.5, 18.6, 23.2, 27.1, 29.5, 29.8, 26.7, 21.9, 15.8, 11.1],
    annualTempC: 19.9,
    representativeCities: ["Adana", "Mersin", "Osmaniye", "Hatay"],
  },
  {
    id: "gap",
    nameTr: "Güneydoğu Anadolu - GAP (Şanlıurfa)",
    nameEn: "Southeastern Anatolia - GAP (Sanliurfa)",
    stationName: "MGM Şanlıurfa / Harran İstasyonu",
    referencePeriod: "1991–2020",
    lat: 37.16,
    lon: 38.79,
    monthlyPrecipMm: [86.4, 71.2, 62.5, 44.8, 25.1, 4.2, 1.5, 1.2, 4.8, 28.5, 48.6, 75.2],
    annualPrecipMm: 454.0,
    monthlyTempC: [6.2, 7.8, 12.1, 17.4, 23.8, 29.8, 33.6, 33.0, 28.1, 21.2, 13.5, 8.0],
    annualTempC: 19.5,
    representativeCities: ["Şanlıurfa", "Diyarbakır", "Mardin", "Gaziantep", "Batman"],
  },
  {
    id: "trakya",
    nameTr: "Trakya (Edirne)",
    nameEn: "Thrace (Edirne)",
    stationName: "MGM Edirne / Ergene İstasyonu",
    referencePeriod: "1991–2020",
    lat: 41.68,
    lon: 26.56,
    monthlyPrecipMm: [62.4, 51.8, 50.2, 47.6, 56.4, 48.2, 34.5, 26.8, 39.4, 58.1, 68.5, 66.1],
    annualPrecipMm: 610.0,
    monthlyTempC: [3.1, 4.9, 8.7, 13.6, 19.1, 23.8, 26.2, 26.0, 20.8, 14.9, 9.4, 4.7],
    annualTempC: 14.6,
    representativeCities: ["Edirne", "Tekirdağ", "Kırklareli"],
  },
  {
    id: "ege",
    nameTr: "Ege Kıyı - İç Ege (İzmir - Manisa)",
    nameEn: "Aegean Coast - Inland Aegean (Izmir - Manisa)",
    stationName: "MGM İzmir / Manisa İstasyonları",
    referencePeriod: "1991–2020",
    lat: 38.42,
    lon: 27.14,
    monthlyPrecipMm: [124.5, 96.8, 74.2, 47.8, 28.4, 9.5, 2.1, 3.4, 18.2, 48.6, 88.5, 146.0],
    annualPrecipMm: 688.0,
    monthlyTempC: [9.1, 10.3, 13.2, 17.4, 22.6, 27.4, 30.1, 29.9, 25.4, 20.0, 14.8, 10.4],
    annualTempC: 19.2,
    representativeCities: ["İzmir", "Manisa", "Aydın", "Denizli", "Muğla"],
  },
  {
    id: "karadeniz",
    nameTr: "Karadeniz (Samsun - Trabzon)",
    nameEn: "Black Sea (Samsun - Trabzon)",
    stationName: "MGM Samsun Bölge İstasyonu",
    referencePeriod: "1991–2020",
    lat: 41.29,
    lon: 36.33,
    monthlyPrecipMm: [68.2, 54.5, 59.8, 56.4, 51.2, 48.6, 36.5, 42.1, 62.4, 84.5, 82.1, 78.7],
    annualPrecipMm: 725.0,
    monthlyTempC: [7.4, 7.6, 9.5, 12.8, 17.1, 21.6, 24.3, 24.8, 21.3, 17.2, 12.9, 9.4],
    annualTempC: 15.5,
    representativeCities: ["Samsun", "Trabzon", "Ordu", "Giresun", "Rize"],
  },
  {
    id: "dogu-anadolu",
    nameTr: "Doğu Anadolu (Malatya - Erzurum)",
    nameEn: "Eastern Anatolia (Malatya - Erzurum)",
    stationName: "MGM Malatya / Erzurum İstasyonları",
    referencePeriod: "1991–2020",
    lat: 38.35,
    lon: 38.31,
    monthlyPrecipMm: [39.5, 38.2, 52.4, 58.6, 52.1, 21.4, 3.2, 2.8, 9.5, 38.4, 44.2, 42.7],
    annualPrecipMm: 403.0,
    monthlyTempC: [0.1, 1.8, 7.2, 13.1, 18.2, 23.9, 28.2, 28.0, 22.8, 15.6, 7.8, 2.3],
    annualTempC: 14.1,
    representativeCities: ["Malatya", "Erzurum", "Elazığ", "Erzincan", "Kars", "Iğdır"],
  },
];

/**
 * Earth's mean radius in kilometres.
 */
const EARTH_RADIUS_KM = 6371;

/**
 * Calculates great-circle distance between two geographic coordinates using Haversine formula.
 */
export function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Matches any latitude/longitude coordinate to the nearest Turkish agricultural basin.
 */
export function findNearestBasin(lat: number, lon: number): { basin: AgriculturalBasin; distanceKm: number } {
  let best = AGRICULTURAL_BASINS[0];
  let minDistance = Infinity;

  for (const basin of AGRICULTURAL_BASINS) {
    const dist = haversineDistanceKm(lat, lon, basin.lat, basin.lon);
    if (dist < minDistance) {
      minDistance = dist;
      best = basin;
    }
  }

  return { basin: best, distanceKm: minDistance };
}

const isLeapYear = (y: number) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0);
const daysInYear = (y: number) => (isLeapYear(y) ? 366 : 365);

/**
 * Calculates monthly mean precipitation from a daily climate series over complete calendar years.
 * Returns an array of 12 values (index 0 = Jan .. index 11 = Dec) in mm.
 */
export function monthlyPrecipStats(daily: { date: string; precip: number | null }[]): {
  monthlyMeans: number[];
  annualMeanMm: number | null;
  years: number[];
} {
  const sumsByYear = new Map<number, { sum: number; count: number }>();
  const monthlySumsByYear = new Map<number, number[]>();

  for (const d of daily) {
    const y = Number(d.date.slice(0, 4));
    const m = Number(d.date.slice(5, 7)) - 1; // 0..11

    let yEntry = sumsByYear.get(y);
    if (!yEntry) {
      yEntry = { sum: 0, count: 0 };
      sumsByYear.set(y, yEntry);
    }
    let mEntry = monthlySumsByYear.get(y);
    if (!mEntry) {
      mEntry = new Array(12).fill(0);
      monthlySumsByYear.set(y, mEntry);
    }

    if (d.precip !== null && Number.isFinite(d.precip)) {
      yEntry.sum += d.precip;
      yEntry.count += 1;
      mEntry[m] += d.precip;
    }
  }

  const completeYears: number[] = [];
  let totalAnnualSum = 0;
  const monthTotals = new Array(12).fill(0);

  for (const [y, entry] of [...sumsByYear.entries()].sort((a, b) => a[0] - b[0])) {
    if (entry.count === daysInYear(y)) {
      completeYears.push(y);
      totalAnnualSum += entry.sum;
      const mArr = monthlySumsByYear.get(y)!;
      for (let m = 0; m < 12; m++) {
        monthTotals[m] += mArr[m];
      }
    }
  }

  const nYears = completeYears.length;
  const monthlyMeans = nYears > 0 ? monthTotals.map((tot) => tot / nYears) : new Array(12).fill(0);
  const annualMeanMm = nYears > 0 ? totalAnnualSum / nYears : null;

  return { monthlyMeans, annualMeanMm, years: completeYears };
}

/**
 * Computes monthly and annual calibration scaling and bias between NASA POWER satellite data
 * and the target basin's ground station normals.
 */
export function calculateBasinDeviation(
  climate: Pick<ClimateSeries, "daily">,
  basin: AgriculturalBasin,
  distanceKm = 0,
): BasinDeviation | null {
  const { monthlyMeans, annualMeanMm, years } = monthlyPrecipStats(climate.daily);
  if (annualMeanMm === null || annualMeanMm <= 0) return null;

  const annualFactor = basin.annualPrecipMm / annualMeanMm;
  const annualBiasMm = annualMeanMm - basin.annualPrecipMm;
  const annualBiasPct = (annualBiasMm / basin.annualPrecipMm) * 100;

  const monthlyStats: MonthlyDeviation[] = [];
  for (let m = 0; m < 12; m++) {
    const stationMm = basin.monthlyPrecipMm[m];
    const modelMm = monthlyMeans[m];
    const precipFactor = modelMm > 0 ? stationMm / modelMm : 1.0;
    const precipBiasMm = modelMm - stationMm;
    const precipBiasPct = stationMm > 0 ? (precipBiasMm / stationMm) * 100 : 0;

    monthlyStats.push({
      month: m + 1,
      stationPrecipMm: stationMm,
      modelPrecipMm: modelMm,
      precipFactor,
      precipBiasMm,
      precipBiasPct,
    });
  }

  return {
    basin,
    distanceKm,
    stationAnnualPrecipMm: basin.annualPrecipMm,
    modelAnnualPrecipMm: annualMeanMm,
    annualFactor,
    annualBiasMm,
    annualBiasPct,
    monthlyStats,
    years,
  };
}
