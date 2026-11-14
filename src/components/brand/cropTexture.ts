import type { CSSProperties } from "react";
import type { CropId } from "@/lib/types";

/**
 * Crop-family textures for timeline bands and map fills (docs/brand.md §6). One pattern per
 * family, readable at 8 px band height and in greyscale print. Colours: board palette
 * (docs/board/map-and-dataviz.md §5.1); "forage" is a brand addition (not in the board table).
 * Colour is never the only channel: pattern + crop name always travel together.
 */
export type TextureFamily = "cereal" | "legume" | "root" | "oilseed" | "fibre" | "forage" | "fallow";
export type TextureTheme = "dark" | "light";

export type TextureSpec = {
  label: { tr: string; en: string };
  /** Base fill per theme. Dark: marks are ground #0b0e0c at 45 %. Light: marks are white at 55 %. Fallow: faint base, hatch in the colour. */
  color: Record<TextureTheme, string>;
  /** Pattern tile in CSS px (userSpaceOnUse), so density is the same at every band size. */
  tile: readonly [number, number];
  mark: string;
  markKind: "stroke" | "fill";
  markWidth: number;
};

export const TEXTURE_FAMILIES: Readonly<Record<TextureFamily, TextureSpec>> = {
  cereal: {
    label: { tr: "Tahıl", en: "Cereal" },
    color: { dark: "#D9B44A", light: "#8F6B00" },
    tile: [4, 4],
    mark: "M-1 1L1-1M0 4L4 0M3 5L5 3",
    markKind: "stroke",
    markWidth: 1.1,
  },
  legume: {
    label: { tr: "Baklagil", en: "Legume" },
    color: { dark: "#CC79A7", light: "#9E3F78" },
    tile: [5, 5],
    mark: "M0.1 1.25a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0-2.3 0ZM2.6 3.75a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0-2.3 0Z",
    markKind: "fill",
    markWidth: 0,
  },
  root: {
    label: { tr: "Kök/yumru", en: "Root crop" },
    color: { dark: "#9D8DF1", light: "#5645C4" },
    tile: [4, 4],
    mark: "M0 2H4",
    markKind: "stroke",
    markWidth: 1.3,
  },
  oilseed: {
    label: { tr: "Yağlı tohum", en: "Oilseed" },
    color: { dark: "#A8C93A", light: "#5A7A00" },
    tile: [5, 5],
    mark: "M-1 1L1-1M0 5L5 0M4 6L6 4M-1 4L1 6M0 0L5 5M4-1L6 1",
    markKind: "stroke",
    markWidth: 0.9,
  },
  fibre: {
    label: { tr: "Lif", en: "Fibre" },
    color: { dark: "#8BB1C6", light: "#3B6A85" },
    tile: [3, 3],
    mark: "M1.5 0V3",
    markKind: "stroke",
    markWidth: 1.1,
  },
  forage: {
    label: { tr: "Yem bitkisi", en: "Forage" },
    color: { dark: "#8FC79A", light: "#2F6E3E" },
    tile: [6, 5],
    mark: "M0 4L1.5 1L3 4L4.5 1L6 4",
    markKind: "stroke",
    markWidth: 1,
  },
  fallow: {
    label: { tr: "Nadas", en: "Fallow" },
    color: { dark: "#8A9690", light: "#6B756F" },
    tile: [6, 6],
    mark: "M-1-1L7 7M5-1L7 1M-1 5L1 7",
    markKind: "stroke",
    markWidth: 1.2,
  },
};

export const TEXTURE_FAMILY_ORDER: readonly TextureFamily[] = ["cereal", "legume", "root", "oilseed", "fibre", "forage", "fallow"];

/** Product role of each crop (vetch counts as forage here; botanically all legumes are Fabaceae). */
export const CROP_TEXTURE_FAMILY: Readonly<Record<CropId, TextureFamily>> = {
  wheat_winter: "cereal",
  barley_winter: "cereal",
  maize_grain: "cereal",
  maize_silage: "forage",
  chickpea: "legume",
  lentil_red: "legume",
  dry_bean: "legume",
  sugar_beet: "root",
  sunflower: "oilseed",
  cotton: "fibre",
  alfalfa: "forage",
  vetch: "forage",
  sainfoin: "forage",
  fallow: "fallow",
};

export function cropFamily(crop: CropId): TextureFamily {
  return CROP_TEXTURE_FAMILY[crop];
}

/** id of the <pattern> rendered by <CropPatternDefs />. */
export function texturePatternId(family: TextureFamily, theme: TextureTheme): string {
  return `agro-tex-${family}-${theme}`;
}

/** SVG fill value, e.g. fill={textureFill("cereal", "dark")} (needs <CropPatternDefs /> on the page). */
export function textureFill(family: TextureFamily, theme: TextureTheme): string {
  return `url(#${texturePatternId(family, theme)})`;
}

export function cropTextureFill(crop: CropId, theme: TextureTheme): string {
  return textureFill(CROP_TEXTURE_FAMILY[crop], theme);
}

function parts(family: TextureFamily, theme: TextureTheme) {
  const s = TEXTURE_FAMILIES[family];
  const bare = family === "fallow";
  const base = s.color[theme];
  const ink = bare ? base : theme === "dark" ? "#0b0e0c" : "#ffffff";
  const op = bare ? 1 : theme === "dark" ? 0.45 : 0.55;
  const baseOpacity = bare ? (theme === "dark" ? 0.16 : 0.12) : 1;
  return { s, base, ink, op, baseOpacity };
}

/** Pattern tile as a standalone SVG string (for data URIs, canvas, print). */
export function textureTileSvg(family: TextureFamily, theme: TextureTheme): string {
  const { s, base, ink, op, baseOpacity } = parts(family, theme);
  const [w, h] = s.tile;
  const mark =
    s.markKind === "fill"
      ? `<path d="${s.mark}" fill="${ink}" fill-opacity="${op}"/>`
      : `<path d="${s.mark}" fill="none" stroke="${ink}" stroke-opacity="${op}" stroke-width="${s.markWidth}" stroke-linecap="square"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${base}" fill-opacity="${baseOpacity}"/>${mark}</svg>`;
}

export function textureDataUri(family: TextureFamily, theme: TextureTheme): string {
  return `url("data:image/svg+xml,${encodeURIComponent(textureTileSvg(family, theme))}")`;
}

/** CSS for an HTML band or swatch: <div style={cropTextureStyle("chickpea", theme)} />. */
export function textureStyle(family: TextureFamily, theme: TextureTheme): CSSProperties {
  const [w, h] = TEXTURE_FAMILIES[family].tile;
  return { backgroundImage: textureDataUri(family, theme), backgroundSize: `${w}px ${h}px`, backgroundRepeat: "repeat" };
}

export function cropTextureStyle(crop: CropId, theme: TextureTheme): CSSProperties {
  return textureStyle(CROP_TEXTURE_FAMILY[crop], theme);
}

/** Edge/outline colour for a band or polygon of this family (3:1 against the app ground). */
export function textureEdge(family: TextureFamily, theme: TextureTheme): string {
  return TEXTURE_FAMILIES[family].color[theme];
}
