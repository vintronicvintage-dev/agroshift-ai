/**
 * Previous-crop (rotation) effects on the following crop — engine v2.
 *
 * Water legacy (stored soil water, residue-free fallow evaporation) is NOT here: the daily water
 * balance carries it. This table holds the remaining, non-water rotation effects as a transparent
 * yield multiplier plus a fertiliser-N credit:
 *  - legume and broadleaf "break crop" benefits to cereals (disease/weed break, N),
 *  - cereal-after-cereal penalties (take-all, crown rot / Fusarium, Pratylenchus),
 *  - same-pathogen-host penalties (Sclerotinia on sunflower/grain legumes; Fusarium/Rhizoctonia
 *    between grain legumes; Verticillium in cotton; maize residue → wheat Fusarium),
 *  - N mineralised during a clean fallow.
 *
 * Direction and order of magnitude follow the break-crop literature (Angus et al. 2015,
 * Crop & Pasture Science 66:523–552, meta-analysis of wheat after break crops; Kirkegaard et al.
 * 2008, Field Crops Research 107:185–195; the ICARDA long-term rotation trials summarised by
 * Ryan et al. 2008, Advances in Agronomy 97:273–319). The specific percentages used here are
 * engineering assumptions (confidence "assumption"); edit them with local trial data.
 */
import type { Confidence, CropId, LocalizedText } from "../types";
import { CROPS } from "./database";

export type RotationGroup = "small_grain" | "maize" | "grain_legume" | "forage_legume" | "beet" | "sunflower" | "cotton" | "fallow";

export const ROTATION_GROUP: Record<CropId, RotationGroup> = {
  wheat_winter: "small_grain", barley_winter: "small_grain", maize_grain: "maize",
  maize_silage: "maize",
  chickpea: "grain_legume", lentil_red: "grain_legume", dry_bean: "grain_legume",
  alfalfa: "forage_legume", vetch: "forage_legume", sainfoin: "forage_legume",
  sugar_beet: "beet", sunflower: "sunflower", cotton: "cotton", fallow: "fallow",
};

/** Sclerotinia sclerotiorum hosts in the crop list (broadleaf). */
const SCLEROTINIA_HOSTS = new Set<CropId>(["sunflower", "dry_bean", "chickpea", "lentil_red"]);

/** Fertiliser N requirement used to cap the N credit, kg N/ha (assumption, order of magnitude). */
export const N_NEED_KG_HA: Record<CropId, number> = {
  wheat_winter: 120, barley_winter: 90, maize_grain: 200, maize_silage: 180, sugar_beet: 150, sunflower: 80, cotton: 150,
  chickpea: 0, lentil_red: 0, dry_bean: 0, alfalfa: 0, vetch: 0, sainfoin: 0, fallow: 0,
};

export interface PreCropEffect {
  prev: CropId;
  next: CropId;
  yieldFactor: number;
  nCreditKgHa: { low: number; high: number };
  codes: string[];
  note: LocalizedText;
  source: string;
  confidence: Confidence;
}

const SRC_BREAK = "Direction/order of magnitude: Angus et al. 2015 (Crop Pasture Sci. 66:523–552); Kirkegaard et al. 2008 (Field Crops Res. 107:185–195); Ryan et al. 2008 (Adv. Agron. 97:273–319). Percentage: assumption";
const SRC_ASM = "Assumption (agronomic rule of thumb; verify with local trials)";

const isLegume = (g: RotationGroup) => g === "grain_legume" || g === "forage_legume";

const cache = new Map<string, PreCropEffect>();

/**
 * Effect of crop `prev` (grown the year before) on crop `next`. Pure and memoised.
 * `next = fallow` has no effect. Same-crop successions that are blocked by max-consecutive still
 * get a (penalty) entry so custom plans can be evaluated.
 */
export function preCropEffect(prev: CropId, next: CropId): PreCropEffect {
  const key = `${prev}>${next}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const gp = ROTATION_GROUP[prev], gn = ROTATION_GROUP[next];
  let f = 1;
  let credit = { low: 0, high: 0 };
  const codes: string[] = [];
  const tr: string[] = [], en: string[] = [];
  let source = SRC_ASM;
  if (gn !== "fallow") {
    // Nitrogen credit from a legume or from mineralisation during a clean fallow.
    if (isLegume(gp) && !isLegume(gn)) {
      credit = { ...CROPS[prev].nContributionKgHa.value };
      codes.push("n_credit_legume");
      tr.push(`önceki ${CROPS[prev].name.tr} ${credit.low}–${credit.high} kg N/ha bırakır`);
      en.push(`previous ${CROPS[prev].name.en} leaves ${credit.low}–${credit.high} kg N/ha`);
    } else if (gp === "fallow" && !isLegume(gn)) {
      credit = { low: 10, high: 30 };
      codes.push("n_credit_fallow");
      tr.push("nadas yılında mineralleşen azot (10–30 kg N/ha, varsayım)");
      en.push("N mineralised during the fallow year (10–30 kg N/ha, assumption)");
    }
    // Yield effects (non-water).
    if (prev === next) {
      const p = gn === "small_grain" ? 0.9 : gn === "maize" ? 0.92 : gn === "cotton" ? 0.95 : 0.85;
      f *= p;
      codes.push(gn === "small_grain" || gn === "maize" ? "cereal_after_cereal" : gn === "cotton" ? "verticillium" : "same_crop");
      tr.push(`aynı ürün üst üste: verim ×${p} (toprak kaynaklı hastalık birikimi)`);
      en.push(`same crop again: yield ×${p} (soil-borne disease build-up)`);
      source = SRC_BREAK;
    } else if (gp === "small_grain" && gn === "small_grain") {
      f *= 0.95; codes.push("cereal_after_cereal");
      tr.push("tahıl üstüne tahıl: verim ×0,95 (kök çürüklüğü / take-all)"); en.push("cereal after cereal: yield ×0.95 (crown rot / take-all)");
      source = SRC_BREAK;
    } else if (gp === "maize" && gn === "small_grain") {
      f *= 0.95; codes.push("fusarium_maize_residue");
      tr.push("mısır anızı üstüne buğday/arpa: verim ×0,95 (Fusarium başak yanıklığı riski)"); en.push("wheat/barley after maize residue: yield ×0.95 (Fusarium head blight risk)");
    } else if (isLegume(gp) && gn === "small_grain") {
      f *= 1.1; codes.push("legume_break");
      tr.push("baklagil sonrası tahıl: verim ×1,10 (münavebe etkisi)"); en.push("cereal after legume: yield ×1.10 (break-crop effect)");
      source = SRC_BREAK;
    } else if (isLegume(gp) && gn === "maize") {
      f *= 1.05; codes.push("legume_break");
      tr.push("baklagil sonrası mısır: verim ×1,05"); en.push("maize after legume: yield ×1.05");
      source = SRC_BREAK;
    } else if ((gp === "sunflower" || gp === "beet" || gp === "cotton") && gn === "small_grain") {
      f *= 1.05; codes.push("broadleaf_break");
      tr.push("geniş yapraklı ürün sonrası tahıl: verim ×1,05 (tahıl hastalık döngüsü kırılır)"); en.push("cereal after a broadleaf crop: yield ×1.05 (cereal disease break)");
      source = SRC_BREAK;
    } else if (gp === "fallow" && gn === "small_grain") {
      f *= 1.05; codes.push("fallow_break");
      tr.push("nadas sonrası tahıl: su dışı etki ×1,05 (hastalık/ot kırılması; su etkisi su dengesinde)"); en.push("cereal after fallow: non-water effect ×1.05 (disease/weed break; water effect is in the water balance)");
    } else if (gp === "small_grain" && gn === "maize") {
      f *= 0.97; codes.push("cereal_after_cereal");
      tr.push("tahıl üstüne mısır: verim ×0,97"); en.push("maize after a cereal: yield ×0.97");
    }
    if (isLegume(gp) && isLegume(gn) && prev !== next) {
      f *= 0.9; codes.push("legume_after_legume");
      tr.push("baklagil üstüne baklagil: verim ×0,90 (Fusarium/Rhizoctonia, nematod)"); en.push("legume after legume: yield ×0.90 (Fusarium/Rhizoctonia, nematodes)");
    }
    if (SCLEROTINIA_HOSTS.has(prev) && SCLEROTINIA_HOSTS.has(next) && prev !== next) {
      f *= 0.95; codes.push("sclerotinia_host");
      tr.push("ortak Sclerotinia konukçusu: verim ×0,95"); en.push("shared Sclerotinia host: yield ×0.95");
    }
  }
  const e: PreCropEffect = {
    prev, next, yieldFactor: Math.round(f * 10000) / 10000, nCreditKgHa: credit, codes,
    note: { tr: tr.length ? tr.join("; ") : "belirgin önceki ürün etkisi yok", en: en.length ? en.join("; ") : "no notable previous-crop effect" },
    source, confidence: "assumption",
  };
  cache.set(key, e);
  return e;
}

/** Previous crop of each rotation year in the repeating cycle (year 1 follows year 3). */
export function previousCrops(seq: readonly CropId[]): [CropId, CropId, CropId] {
  return [seq[2], seq[0], seq[1]];
}

/**
 * Plan-level break-length advisories in a 3-year repeating cycle (the crop returns every 3 years):
 * sugar beet (beet cyst nematode, rhizomania), sunflower (broomrape/Orobanche, Sclerotinia) and
 * chickpea/lentil (Ascochyta, Fusarium) are usually advised longer breaks (≈ 4 years). Assumption.
 */
export const BREAK_YEARS_ADVISED: Partial<Record<CropId, number>> = { sugar_beet: 4, sunflower: 4, chickpea: 4, lentil_red: 4 };
