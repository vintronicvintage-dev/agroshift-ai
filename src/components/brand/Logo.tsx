import {
  LOCKUP_H,
  LOCKUP_S,
  MARK_PATH,
  MARK_PATH_16,
  MARK_VIEWBOX,
  MARK_VIEWBOX_16,
  WORD_FILL_PATH,
  WORD_STROKE_AGRO,
  WORD_STROKE_AGRO_PATH,
  WORD_STROKE_SHIFT,
  WORD_STROKE_SHIFT_PATH,
  WORD_VIEWBOX,
} from "@/lib/ui/brand";

export type LogoVariant = "mark" | "horizontal" | "stacked" | "wordmark";
/**
 * auto: follows the theme tokens (signal mark + ink word in dark, deep signal + ink in light).
 * light: light logo for a dark ground whatever the theme (e.g. over satellite imagery).
 * dark: dark logo for a light ground whatever the theme (print, light plates).
 * mono: one colour, currentColor, for both parts.
 */
export type LogoTone = "auto" | "light" | "dark" | "mono";

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
  auto: { mark: "var(--accent-ink, #2e7d32)", word: "var(--ink, #112216)" },
  light: { mark: "#69d17b", word: "#f4f8f4" },
  dark: { mark: "#2e7d32", word: "#112216" },
  mono: { mark: "currentColor", word: "currentColor" },
};

const DEFAULT_SIZE: Record<LogoVariant, number> = { mark: 28, horizontal: 28, stacked: 96, wordmark: 24 };

function Word({ color }: { color: string }) {
  return (
    <>
      <path d={WORD_FILL_PATH} fill={color} fillRule="evenodd" />
      <path d={WORD_STROKE_AGRO_PATH} fill="none" stroke={color} strokeWidth={WORD_STROKE_AGRO} />
      <path d={WORD_STROKE_SHIFT_PATH} fill="none" stroke={color} strokeWidth={WORD_STROKE_SHIFT} />
    </>
  );
}

/**
 * The AgroShift logo as inline SVG: the "Orbit furrows" mark, the drawn sentence-case wordmark,
 * or a lockup. The mark switches to its pixel-hinted 16-grid drawing below 19 px.
 */
export function Logo({ variant = "horizontal", size, tone = "auto", title = "AgroShift", className }: LogoProps) {
  const h = size ?? DEFAULT_SIZE[variant];
  const c = TONES[tone];
  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };
  const label = title ? <title>{title}</title> : null;

  if (variant === "mark") {
    const hinted = h < 19;
    return (
      <svg width={h} height={h} viewBox={hinted ? MARK_VIEWBOX_16 : MARK_VIEWBOX} className={className} {...a11y} style={{ flexShrink: 0 }}>
        {label}
        <path d={hinted ? MARK_PATH_16 : MARK_PATH} fill={c.mark} />
      </svg>
    );
  }

  if (variant === "wordmark") {
    const [, , vw, vh] = WORD_VIEWBOX.split(" ").map(Number);
    return (
      <svg width={Math.round(((h * vw) / vh) * 100) / 100} height={h} viewBox={WORD_VIEWBOX} className={className} {...a11y} style={{ flexShrink: 0 }}>
        {label}
        <Word color={c.word} />
      </svg>
    );
  }

  const L = variant === "horizontal" ? LOCKUP_H : LOCKUP_S;
  const w = Math.round(((h * L.width) / L.height) * 100) / 100;
  const k = L.markSize / 24;
  return (
    <svg width={w} height={h} viewBox={L.viewBox} className={className} {...a11y} style={{ flexShrink: 0 }}>
      {label}
      <path d={MARK_PATH} fill={c.mark} transform={`translate(${L.markX} ${L.markY}) scale(${k})`} />
      <g transform={`translate(${L.wordX} 0)`}>
        <Word color={c.word} />
      </g>
    </svg>
  );
}
