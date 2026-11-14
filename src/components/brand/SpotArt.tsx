import { SPOT_MARKUP, type SpotName } from "./spots";

export type { SpotName } from "./spots";
export { SPOT_TITLES } from "./spots";

/** Static copies of the spots (fixed ink #7d897f) for docs and external use. The app draws them inline. */
export const SPOT_ART: Readonly<Record<SpotName, string>> = {
  "no-field": "/illustrations/spots/no-field.svg",
  "loading-data": "/illustrations/spots/loading-data.svg",
  "no-alerts": "/illustrations/spots/no-alerts.svg",
  "email-sent": "/illustrations/spots/email-sent.svg",
  "draw-field": "/illustrations/spots/draw-field.svg",
  "data-cells": "/illustrations/spots/data-cells.svg",
  offline: "/illustrations/spots/offline.svg",
  "print-share": "/illustrations/spots/print-share.svg",
};

export type SpotArtProps = {
  name: SpotName;
  /** Width in px; height is always width × 2/3 (240×160 artboard). */
  width?: number;
  /** Accessible name. Omit (decorative) when the empty-state text next to it says the same thing. */
  title?: string;
  className?: string;
};

/**
 * Empty-state spot in the monoline language: inline SVG in currentColor (set the colour with a
 * text class, e.g. text-ink-2). The markup is static and hand-authored, never user input.
 */
export function SpotArt({ name, width = 240, title, className }: SpotArtProps) {
  const height = Math.round((width * 2) / 3);
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 160"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`select-none ${className ?? ""}`}
      {...a11y}
      dangerouslySetInnerHTML={{ __html: (title ? `<title>${title.replace(/[<&>]/g, "")}</title>` : "") + SPOT_MARKUP[name] }}
    />
  );
}
