import type { CropFamily, CropId } from "@/lib/types";
import { CROPS } from "@/lib/engine";

/**
 * Crop-family colours from the Okabe–Ito colour-blind-safe palette. Colour is never the only
 * carrier: every band also shows the crop name, and fallow uses a hatch pattern.
 */
export const FAMILY_COLOR: Record<CropFamily, string> = {
  poaceae: "#E69F00",
  fabaceae: "#009E73",
  amaranthaceae: "#CC79A7",
  asteraceae: "#F0E442",
  malvaceae: "#56B4E9",
  none: "transparent",
};

export function cropColor(id: CropId): string {
  return FAMILY_COLOR[CROPS[id].family];
}

/** Short crop label for tight spaces (strip calendar): the name up to the first bracket. */
export function shortName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, "");
}
