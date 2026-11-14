import type { CropId } from "@/lib/types";
import { CROP_GLYPHS, GLYPH_STROKE, GLYPH_VIEWBOX, UNKNOWN_GLYPH } from "./cropGlyphs";

export type CropGlyphProps = {
  /** Crop id from the database. Unknown ids draw a neutral parcel outline. */
  crop: CropId | (string & {});
  /** Square size in px. Tested legible from 16 (pair with the crop name below 20). */
  size?: number;
  /** Accessible name. Omit (decorative) when the crop name is visible next to the glyph. */
  title?: string;
  className?: string;
  /** Override the stroke in grid units (default 1.75 = 1.17 px at 16, 1.75 px at 24). */
  strokeWidth?: number;
};

/** Monoline crop glyph: inline SVG, currentColor, 24-unit grid, one stroke weight, round joins. */
export function CropGlyph({ crop, size = 20, title, className, strokeWidth = GLYPH_STROKE }: CropGlyphProps) {
  const d = (CROP_GLYPHS as Record<string, string | undefined>)[crop] ?? UNKNOWN_GLYPH;
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      width={size}
      height={size}
      viewBox={GLYPH_VIEWBOX}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className ?? ""}`}
      {...a11y}
    >
      {title ? <title>{title}</title> : null}
      <path d={d} />
    </svg>
  );
}
