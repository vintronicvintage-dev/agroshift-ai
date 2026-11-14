/**
 * AgroShift brand v2 geometry ("Orbit furrows"), generated from one source (see docs/brand.md).
 * Hand-constructed: an orbital arc passes over a field whose three furrow bands run to the
 * horizon; the middle band starts one step lower (the shift). The construction values are in
 * docs/brand.md §2; if a path changes, re-export public/brand/*.svg and the app icons with it.
 */

/** Master mark on a 24-unit grid (circle R12): arc 2.4 thick over 198°–342°, field from y 13, middle band from y 15.5. */
export const MARK_PATH = "M0.587 8.292A12 12 0 0 1 23.413 8.292L21.13 9.033A9.6 9.6 0 0 0 2.87 9.033ZM0.042 13L8.596 13L6.033 22.411A12 12 0 0 1 0.042 13ZM8.11 23.352L9.447 15.5L14.553 15.5L15.89 23.352A12 12 0 0 1 8.11 23.352ZM17.967 22.411L15.404 13L23.958 13A12 12 0 0 1 17.967 22.411Z";
export const MARK_VIEWBOX = "0 0 24 24";

/** Pixel-hinted mark for 16-18 px: 16-unit grid, 2 px arc, 1 px vertical furrows on whole pixels, 2 px shift. */
export const MARK_PATH_16 = "M0.482 5.264A8 8 0 0 1 15.518 5.264L13.638 5.948A6 6 0 0 0 2.362 5.948ZM0.063 9L5 9L5 15.416A8 8 0 0 1 0.063 9ZM6 15.746L6 11L10 11L10 15.746A8 8 0 0 1 6 15.746ZM11 15.416L11 9L15.937 9A8 8 0 0 1 11 15.416Z";
export const MARK_VIEWBOX_16 = "0 0 16 16";

/** 14-unit hinted mark, used inside the 16 px favicon tile (1 px inset). */
export const MARK_PATH_14 = "M0.422 4.606A7 7 0 0 1 13.578 4.606L11.698 5.29A5 5 0 0 0 2.302 5.29ZM0.072 8L4 8L4 13.325A7 7 0 0 1 0.072 8ZM5 13.708L5 10L9 10L9 13.708A7 7 0 0 1 5 13.708ZM10 13.325L10 8L13.928 8A7 7 0 0 1 10 13.325Z";

/**
 * Drawn "AgroShift" lettering (sentence case) on a condensed grotesque skeleton made to sit with
 * Archivo (wdth ~85, wght 600). Units: cap height 24 (y 6..30), x-height 17.5, baseline 30.
 * Rendered as one filled path (A, f/t crossbars) and two stroked centreline paths: "Agro" at
 * WORD_STROKE_AGRO, "Shift" heavier at WORD_STROKE_SHIFT. Butt caps, miter joins.
 */
export const WORD_FILL_PATH = "M0 30L4.9 6H10.3L15.2 30H11.379L10.214 24.296H4.986L3.821 30ZM5.618 21.2H9.582L7.6 11.492ZM95.6 12.5H104.8V16.284H95.6ZM104.8 12.5H113.8V16.284H104.8Z";
export const WORD_STROKE_AGRO_PATH = "M17.7 18.4A4.5 4.5 0 0 1 26.7 18.4V24.1A4.5 4.5 0 0 1 17.7 24.1ZM26.7 12.5V32.6A4 4 0 0 1 22.7 36.6H18.1M32.9 12.5V30M32.9 19.3C32.9 15.1 35.3 13.9 38.5 13.9H41.1M44.2 18.4A4.5 4.5 0 0 1 53.2 18.4V24.1A4.5 4.5 0 0 1 44.2 24.1Z";
export const WORD_STROKE_SHIFT_PATH = "M69.3 11C69.3 8.9 67.46 7.8 64.7 7.8C61.94 7.8 60.1 9.78 60.1 12.75C60.1 16.215 61.48 17.2 64.7 17.7C67.92 18.2 69.3 19.275 69.3 22.95C69.3 26.1 67.46 28.2 64.7 28.2C61.94 28.2 60.1 27.1 60.1 24.8M76.2 5.4V30M76.2 18.9C76.2 14.9 77.7 14.3 80.3 14.3C83.1 14.3 84.4 16.1 84.4 18.1V30M91.5 12.5V30M91.5 5.4V9.8M99.6 30V11.6C99.6 8.9 101.2 7.6 103.8 7.6H105M108.8 7.6V24.2C108.8 26.9 110.4 28.2 113 28.2H114.2";
export const WORD_STROKE_AGRO = 3.6;
export const WORD_STROKE_SHIFT = 4.4;
export const WORD_VIEWBOX = "0 4.6 114.2 35";
export const WORD_WIDTH = 114.2;

export type LockupGeometry = { viewBox: string; width: number; height: number; markX: number; markY: number; markSize: number; wordX: number };
/** Horizontal lockup: mark 29 units, centred on the cap band, 7-unit gap, then the word. */
export const LOCKUP_H: LockupGeometry = { viewBox: "0 3.5 150.2 36.1", width: 150.2, height: 36.1, markX: 0, markY: 3.5, markSize: 29, wordX: 36 };
/** Stacked lockup: mark 46 units, centred, 9 units above the cap line. */
export const LOCKUP_S: LockupGeometry = { viewBox: "0 -49 114.2 88.6", width: 114.2, height: 88.6, markX: 34.1, markY: -49, markSize: 46, wordX: 0 };

/** Fixed brand colours for known grounds (Ortho Console tokens). In the app prefer theme tokens. */
export const BRAND_COLORS = {
  signal: "#d4ff3a",
  signalDeep: "#3d5a00",
  ink: "#101612",
  paper: "#eef2ec",
  ground: "#0b0e0c",
  groundLight: "#f4f5f0"
} as const;

/** Smallest rendered heights (px). Below 19 px the mark switches to the hinted 16-grid path. */
export const BRAND_MIN_SIZE = { mark: 16, horizontal: 20, stacked: 64 } as const;
/** Clear space on every side, as a fraction of the mark's height. */
export const BRAND_CLEAR_SPACE = 0.25;
