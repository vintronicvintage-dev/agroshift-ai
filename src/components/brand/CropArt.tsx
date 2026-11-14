import type { CropId } from "@/lib/types";
import { CropGlyph } from "./CropGlyph";

/**
 * Static monoline SVGs of the crop glyphs (currentColor; for docs, print and external use).
 * The app renders the glyphs inline through <CropGlyph />, so they follow the text colour.
 */
export const CROP_ART: Readonly<Record<CropId, string>> = {
  wheat_winter: "/illustrations/crops/wheat_winter.svg",
  barley_winter: "/illustrations/crops/barley_winter.svg",
  chickpea: "/illustrations/crops/chickpea.svg",
  lentil_red: "/illustrations/crops/lentil_red.svg",
  sugar_beet: "/illustrations/crops/sugar_beet.svg",
  maize_grain: "/illustrations/crops/maize_grain.svg",
  sunflower: "/illustrations/crops/sunflower.svg",
  dry_bean: "/illustrations/crops/dry_bean.svg",
  alfalfa: "/illustrations/crops/alfalfa.svg",
  vetch: "/illustrations/crops/vetch.svg",
  cotton: "/illustrations/crops/cotton.svg",
  fallow: "/illustrations/crops/fallow.svg",
};

export type CropArtProps = {
  /** A crop id from the database. Unknown ids draw a neutral parcel outline. */
  crop: CropId | (string & {});
  /** Square size in px. */
  size?: number;
  /** Accessible name. Omit (decorative) when the crop name is already visible next to it. */
  title?: string;
  className?: string;
};

/**
 * Backward-compatible wrapper: the v1 clip-art illustrations are retired from the data UI
 * (board verdict), so CropArt now draws the monoline glyph. New code should use <CropGlyph />.
 */
export function CropArt({ crop, size = 28, title, className }: CropArtProps) {
  return <CropGlyph crop={crop} size={size} title={title} className={className} />;
}
