import { LOCKUP_H, LOCKUP_S, MARK_PATH, MARK_VIEWBOX, WORD_PATH, WORD_STROKE } from "@/lib/ui/brand";

export type LogoVariant = "mark" | "horizontal" | "stacked";
/**
 * auto: follows the theme tokens (sprout mark + ink word in dark, deep green + ink in light).
 * light: light logo for a dark ground whatever the theme (e.g. over the Landsat panel).
 * dark: dark logo for a light ground whatever the theme.
 */
export type LogoTone = "auto" | "light" | "dark";

export type LogoProps = {
  variant?: LogoVariant;
  /** Rendered height in px. Width follows the fixed aspect ratio, so there is no layout shift. */
  size?: number;
  tone?: LogoTone;
  /** Accessible name. Pass "" when visible text next to the logo already names the product. */
  title?: string;
  className?: string;
};

const TONES: Record<LogoTone, { mark: string; word: string }> = {
  auto: { mark: "var(--accent-ink)", word: "var(--ink)" },
  light: { mark: "#c8f25a", word: "#e6ede4" },
  dark: { mark: "#456100", word: "#142019" },
};

const DEFAULT_SIZE: Record<LogoVariant, number> = { mark: 28, horizontal: 28, stacked: 96 };

/** The AgroShift logo as inline SVG: the leaf-parcel mark, the custom lettering, or both. */
export function Logo({ variant = "horizontal", size, tone = "auto", title = "AgroShift", className }: LogoProps) {
  const h = size ?? DEFAULT_SIZE[variant];
  const c = TONES[tone];
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  const word = <path d={WORD_PATH} fill="none" stroke={c.word} strokeWidth={WORD_STROKE} strokeLinejoin="round" />;

  if (variant === "mark") {
    return (
      <svg width={h} height={h} viewBox={MARK_VIEWBOX} className={className} {...a11y} style={{ flexShrink: 0 }}>
        {title ? <title>{title}</title> : null}
        <path d={MARK_PATH} fill={c.mark} />
      </svg>
    );
  }

  const L = variant === "horizontal" ? LOCKUP_H : LOCKUP_S;
  const w = Math.round((h * L.width) / L.height * 100) / 100;
  return (
    <svg width={w} height={h} viewBox={L.viewBox} className={className} {...a11y} style={{ flexShrink: 0 }}>
      {title ? <title>{title}</title> : null}
      <path d={MARK_PATH} fill={c.mark} transform={`translate(${L.markX} ${L.markY}) scale(${L.markScale})`} />
      {variant === "horizontal" ? <g transform={`translate(${LOCKUP_H.wordX} 0)`}>{word}</g> : word}
    </svg>
  );
}
