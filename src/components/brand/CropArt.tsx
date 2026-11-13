import type { CropId } from "@/lib/types";
import { CROPS } from "@/lib/crops/database";
import { CropSwatch } from "@/components/field/CropChip";

/** Crops that have a drawn illustration in public/illustrations/crops/<id>.svg (all 12 today). */
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
  /** A crop id from the database. Unknown ids fall back to the colour swatch glyph. */
  crop: CropId | (string & {});
  /** Square size in px. Legible from 28. */
  size?: number;
  /** Accessible name. Omit (decorative) when the crop name is already visible next to it. */
  title?: string;
  className?: string;
};

/**
 * One crop illustration from the drawn family (64-unit grid, flat, shared ground and greens).
 * Illustrations, not photos: they identify the crop, they do not show the user's field.
 */
export function CropArt({ crop, size = 28, title, className }: CropArtProps) {
  const src = (CROP_ART as Record<string, string | undefined>)[crop];
  if (!src) {
    if (crop in CROPS) return <CropSwatch id={crop as CropId} size={Math.round(size * 0.5)} />;
    return <span aria-hidden="true" className="inline-block shrink-0 rounded-[4px] border border-rule-strong" style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5) }} />;
  }
  return (
    // Plain <img>: a small static SVG, no optimisation to gain, fixed size so no layout shift.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt={title ?? ""} aria-hidden={title ? undefined : true} decoding="async" draggable={false} className={`shrink-0 select-none ${className ?? ""}`} />
  );
}
