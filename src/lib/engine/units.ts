/**
 * Farmer units (engine v2). Pure conversions and formatters for the UI.
 *
 * 1 da (dekar) = 1000 m² = 0.1 ha.  1 t/ha = 100 kg/da.  1 mm of water on 1 da = 1 m³ = 1 ton of water.
 */
export type Lang = "tr" | "en";

export const tHaToKgDa = (tHa: number): number => tHa * 100;
export const kgDaToTHa = (kgDa: number): number => kgDa / 100;
/** mm (water depth) → m³ per dekar. */
export const mmToM3PerDa = (mm: number): number => mm;
export const m3PerDaToMm = (m3: number): number => m3;
/** m³ of water → metric tons of water (density 1 t/m³). */
export const m3ToTonWater = (m3: number): number => m3;
/** mm → tons of water per dekar. */
export const mmToTonPerDa = (mm: number): number => mm;
export const daToHa = (da: number): number => da / 10;
export const haToDa = (ha: number): number => ha * 10;
/** TL/ha ↔ TL/da */
export const perHaToPerDa = (x: number): number => x / 10;
export const perDaToPerHa = (x: number): number => x * 10;
/** kg N/ha → kg N/da */
export const kgHaToKgDa = (x: number): number => x / 10;

/** Number with locale separators: tr "1.234,5", en "1,234.5". `digits` defaults by magnitude. */
export function formatNumber(x: number, lang: Lang, digits?: number): string {
  if (!Number.isFinite(x)) return "–";
  const abs = Math.abs(x);
  const d = digits ?? (abs >= 100 || Number.isInteger(x) ? 0 : abs >= 10 ? 1 : 2);
  const s = x.toFixed(d);
  const [int, dec] = s.split(".");
  const sign = int.startsWith("-") ? "−" : "";
  const body = int.replace("-", "").replace(/\B(?=(\d{3})+(?!\d))/g, lang === "tr" ? "." : ",");
  return sign + body + (dec ? (lang === "tr" ? "," : ".") + dec : "");
}

/** Yield from t/ha as "245 kg/da". */
export const formatYieldKgDa = (tHa: number, lang: Lang): string => `${formatNumber(Math.round(tHaToKgDa(tHa)), lang)} kg/da`;
/** Large yields (sugar beet, hay) in t/da: "6,5 t/da". */
export const formatYieldTDa = (tHa: number, lang: Lang): string => `${formatNumber(tHa / 10, lang, 2)} t/da`;
/** Water from mm as "320 m³/da". */
export const formatWaterM3Da = (mm: number, lang: Lang): string => `${formatNumber(Math.round(mmToM3PerDa(mm)), lang)} m³/da`;
/** Water from mm as "320 ton su/da" / "320 t water per da". */
export const formatWaterTonDa = (mm: number, lang: Lang): string =>
  lang === "tr" ? `dekara ${formatNumber(Math.round(mm), lang)} ton su` : `${formatNumber(Math.round(mm), lang)} t of water per da`;
export const formatTLPerDa = (tl: number, lang: Lang): string => `${formatNumber(Math.round(tl), lang)} TL/da`;
export const formatTL = (tl: number, lang: Lang): string => `${formatNumber(Math.round(tl), lang)} TL`;
export const formatPct = (share01: number, lang: Lang): string => (lang === "tr" ? `%${formatNumber(Math.round(share01 * 100), lang)}` : `${formatNumber(Math.round(share01 * 100), lang)} %`);

/** Turkish locative case suffix for a number written in digits: 8 → "8'inde", 6 → "6'sında", 10 → "10'unda". */
export function trLocative(n: number): string {
  return `${formatNumber(n, "tr", 0)}'${trSuffix(n, "nda")}`;
}

/** Suffix after the apostrophe following Turkish vowel harmony of the spoken number. kind "nda" = locative (-(s)ında). */
function trSuffix(n: number, kind: "nda"): string {
  void kind;
  const i = Math.abs(Math.round(n));
  // Last spoken word decides harmony and whether the stem ends in a vowel (→ buffer "s").
  const words: [number, string, boolean][] = [];
  const last = i % 10, tens = Math.floor(i / 10) % 10;
  const ones: Record<number, [string, boolean]> = {
    1: ["i", false], 2: ["i", true], 3: ["ü", false], 4: ["ü", false], 5: ["i", false], 6: ["ı", true], 7: ["i", true], 8: ["i", false], 9: ["u", false],
  };
  const tenW: Record<number, [string, boolean]> = {
    1: ["u", false], 2: ["i", true], 3: ["u", false], 4: ["ı", false], 5: ["i", true], 6: ["ı", false], 7: ["i", false], 8: ["i", false], 9: ["ı", false],
  };
  let v: [string, boolean];
  if (last !== 0) v = ones[last];
  else if (tens !== 0) v = tenW[tens];
  else if (i === 0) v = ["ı", false];
  else if (i % 1000 === 0) v = ["i", false]; // bin
  else v = ["ü", false]; // yüz
  void words;
  const vowel = v[0];
  const d = vowel === "ı" || vowel === "a" || vowel === "u" || vowel === "o" ? "a" : "e";
  return `${v[1] ? "s" : ""}${vowel}nd${d}`;
}

/** "22 dönemin 18'inde" (TR) / "in 18 of 22 periods" (EN). */
export function outOf(m: number, n: number, lang: Lang, unitTr = "dönemin", unitEn = "periods"): string {
  return lang === "tr" ? `${formatNumber(n, "tr", 0)} ${unitTr} ${trLocative(m)}` : `in ${m} of ${n} ${unitEn}`;
}
