export type SpotName = "no-field" | "loading-data" | "no-alerts" | "email-sent";

export const SPOT_ART: Readonly<Record<SpotName, string>> = {
  "no-field": "/illustrations/spots/no-field.svg",
  "loading-data": "/illustrations/spots/loading-data.svg",
  "no-alerts": "/illustrations/spots/no-alerts.svg",
  "email-sent": "/illustrations/spots/email-sent.svg",
};

export type SpotArtProps = {
  name: SpotName;
  /** Width in px; height is always width × 2/3 (240×160 artboard). */
  width?: number;
  /** Accessible name. Omit (decorative) when the empty-state text next to it says the same thing. */
  title?: string;
  className?: string;
};

/** Empty-state illustration from the drawn family: the shared isometric parcel field. */
export function SpotArt({ name, width = 240, title, className }: SpotArtProps) {
  const height = Math.round((width * 2) / 3);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SPOT_ART[name]} width={width} height={height} alt={title ?? ""} aria-hidden={title ? undefined : true} decoding="async" draggable={false} className={`select-none ${className ?? ""}`} />
  );
}
