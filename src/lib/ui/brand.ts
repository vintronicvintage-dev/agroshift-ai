/**
 * AgroShift brand geometry, generated from one source (see docs/brand.md). Hand-constructed:
 * the mark is a leaf-shaped parcel cut by two furrows that open on alternate sides, so the
 * plough's three passes (the three rotation years) read as an S for Shift.
 * Do not edit the paths by hand; regenerate them and keep the public/brand files in sync.
 */

/** Mark on a 24-unit grid: bands 6, furrows 3, turn corners R12, free ends r1.5. */
export const MARK_PATH =
  "M12 0h10.5A1.5 1.5 0 0 1 24 1.5V6H9a1.5 1.5 0 0 0 0 3h15v3A12 12 0 0 1 12 24H1.5A1.5 1.5 0 0 1 0 22.5V18h15a1.5 1.5 0 0 0 0-3H0v-3A12 12 0 0 1 12 0Z";
export const MARK_VIEWBOX = "0 0 24 24";

/** Custom monoline lowercase "agroshift": centreline paths, stroked. x-height 14, ascender 12, baseline 34. */
export const WORD_PATH =
  "M7.4 21.3a5.7 5.7 0 1 0 0 11.4a5.7 5.7 0 1 0 0 -11.4ZM13.1 20V34M24.6 21.3a5.7 5.7 0 1 0 0 11.4a5.7 5.7 0 1 0 0 -11.4ZM30.3 20V36a3.4 3.4 0 0 1-3.4 3.4H22M36.5 34V20M36.5 26.8A5.4 5.4 0 0 1 41.9 21.4H43.1M51.5 21.3a5.7 5.7 0 1 0 0 11.4a5.7 5.7 0 1 0 0 -11.4ZM71.8 21.4H65.7a2.8 2.8 0 0 0 0 5.6H67.9a2.8 2.8 0 0 1 0 5.6H61.8M76.9 12V34M76.9 26.9a5.5 5.5 0 0 1 11 0V34M94.2 20V34M94.2 13.4V16.8M101.6 34V17.7a4 4 0 0 1 4 -4H107.6M98.2 21.4H115M109.8 14.6V28.6a4 4 0 0 0 4 4H115.4";
export const WORD_STROKE = 3.4;
export const WORD_VIEWBOX = "0 11.5 115.4 30";

/** Horizontal lockup: mark 22 units tall (ascender to baseline), 7-unit gap, then the word. */
export const LOCKUP_H = { viewBox: "0 11.5 144.4 30", width: 144.4, height: 30, markX: 0, markY: 12, markScale: 0.9167, wordX: 29 } as const;
/** Stacked lockup: mark 36 units, centred, 8 units above the ascender line. */
export const LOCKUP_S = { viewBox: "0 -32 115.4 73.6", width: 115.4, height: 73.6, markX: 39.7, markY: -32, markScale: 1.5 } as const;

/** Fixed colours for the brand on a known ground. In the app, prefer the theme tokens. */
export const BRAND_COLORS = {
  sprout: "#c8f25a",
  deep: "#456100",
  ink: "#142019",
  paper: "#e6ede4",
  ground: "#0d1310",
  groundLight: "#edf1e9",
} as const;

/** Pixel-hinted mark for 16 px rasters: 14-unit grid, bands 4, furrows 1. Use at exactly 14 or 16 px. */
export const MARK_PATH_14 =
  "M7 0h6.25a.75.75 0 0 1 .75.75V4H5a.5.5 0 0 0 0 1h9v2A7 7 0 0 1 7 14H.75A.75.75 0 0 1 0 13.25V10h9a.5.5 0 0 0 0-1H0V7A7 7 0 0 1 7 0Z";

/** Smallest sizes at which each form stays legible (px, rendered height). */
export const BRAND_MIN_SIZE = { mark: 16, horizontal: 18, stacked: 48 } as const;
