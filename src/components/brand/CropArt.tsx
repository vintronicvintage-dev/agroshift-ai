import type { CropId } from "@/lib/types";
import { CropGlyph } from "./CropGlyph";

/**
 * Static monoline SVGs of the crop glyphs (currentColor; for docs, print and external use).
 */
export const CROP_ART: Readonly<Record<CropId, string>> = {
  wheat_winter: "/illustrations/crops/wheat_winter.svg",
  barley_winter: "/illustrations/crops/barley_winter.svg",
  chickpea: "/illustrations/crops/chickpea.svg",
  lentil_red: "/illustrations/crops/lentil_red.svg",
  lentil_green: "/illustrations/crops/lentil_red.svg",
  sugar_beet: "/illustrations/crops/sugar_beet.svg",
  maize_grain: "/illustrations/crops/maize_grain.svg",
  sunflower: "/illustrations/crops/sunflower.svg",
  soybean: "/illustrations/crops/dry_bean.svg",
  canola: "/illustrations/crops/sunflower.svg",
  safflower: "/illustrations/crops/sunflower.svg",
  dry_bean: "/illustrations/crops/dry_bean.svg",
  potato: "/illustrations/crops/sugar_beet.svg",
  alfalfa: "/illustrations/crops/alfalfa.svg",
  sainfoin: "/illustrations/crops/alfalfa.svg",
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
  /** Render full-color botanical illustration (default) or monoline glyph. */
  variant?: "botanical" | "glyph";
};

/**
 * Full-color botanical SVG emblem for every crop in the database (matching the Anatolian
 * Agronomic Command Center visual language: golden wheat spikes, beige chickpeas, coral-red
 * lentils, vibrant yellow-and-brown sunflower head, golden maize cob, etc.).
 */
export function CropArt({ crop, size = 28, title, className, variant = "botanical" }: CropArtProps) {
  if (variant === "glyph") {
    return <CropGlyph crop={crop} size={size} title={title} className={className} />;
  }

  const a11y = title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={`shrink-0 ${className ?? ""}`}
      {...a11y}
    >
      {title ? <title>{title}</title> : null}
      {renderBotanicalCrop(crop)}
    </svg>
  );
}

function renderBotanicalCrop(crop: string) {
  switch (crop as CropId) {
    case "chickpea":
      return (
        <g>
          {/* Small green leaflet accent */}
          <path d="M10 13C10 9.5 13.5 7 17.5 8.5C15.5 12 12.5 14 10 13Z" fill="#2e7d32" />
          <path d="M16 9.5C18 6.5 22 6 24.5 8C22 10.5 18.5 11 16 9.5Z" fill="#43a047" />
          {/* Golden-beige chickpea cluster (Cicer arietinum) */}
          <circle cx="14.5" cy="21" r="6.5" fill="#e6b465" stroke="#b37d2b" strokeWidth="1.2" />
          <path d="M10 18.5C11.2 16.8 13.2 16.5 14.8 17.4" stroke="#fdf0d5" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="25.5" cy="20.5" r="6.5" fill="#f0c57b" stroke="#b37d2b" strokeWidth="1.2" />
          <path d="M21.5 18C22.7 16.4 24.8 16.2 26.2 17" stroke="#fdf0d5" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="19.5" cy="28" r="7" fill="#ecc072" stroke="#9e6b1e" strokeWidth="1.3" />
          <path d="M15.2 25.5C16.8 23.6 19.3 23.4 21.2 24.5" stroke="#fff7e6" strokeWidth="1.5" strokeLinecap="round" />
          {/* Characteristic chickpea beak */}
          <path d="M24.8 25.5L27.2 24.2L26 27.3Z" fill="#d9a048" />
        </g>
      );

    case "lentil_red":
      return (
        <g>
          {/* Delicate green lentil sprig */}
          <path d="M9 12C11 8.5 15 8 18 10.5C14.5 12.5 11.5 13 9 12Z" fill="#2e7d32" />
          <path d="M21 10C23.5 7.5 27.5 8 29.5 11C26 12.2 23 11.8 21 10Z" fill="#43a047" />
          {/* Coral-terracotta red lentil lenses */}
          <ellipse cx="14" cy="21" rx="6.8" ry="5.2" transform="rotate(-14 14 21)" fill="#e0532c" stroke="#a63214" strokeWidth="1.2" />
          <path d="M10.2 19.5C11.8 18 14.2 17.8 16.2 18.6" stroke="#ffb499" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx="26" cy="20.5" rx="6.8" ry="5.2" transform="rotate(15 26 20.5)" fill="#f2663e" stroke="#a63214" strokeWidth="1.2" />
          <path d="M22.5 18.5C24.2 17.4 26.6 17.5 28.4 18.7" stroke="#ffc2ad" strokeWidth="1.3" strokeLinecap="round" />
          <ellipse cx="20" cy="28.5" rx="7.4" ry="5.5" fill="#eb5b34" stroke="#992b0e" strokeWidth="1.3" />
          <path d="M15.5 26.8C17.6 25.3 20.6 25.2 22.8 26.3" stroke="#ffc2ad" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );

    case "wheat_winter":
      return (
        <g>
          {/* Golden awns */}
          <path d="M16 9L12 3M20 7L20 2M24 9L28 3M14 13L9 8M26 13L31 8" stroke="#d97706" strokeWidth="1.3" strokeLinecap="round" />
          {/* Central stem */}
          <path d="M20 10V37" stroke="#b45309" strokeWidth="2.2" strokeLinecap="round" />
          {/* Left & Right golden spikelets */}
          {[12, 17, 22, 27].map((y, idx) => (
            <g key={idx}>
              <ellipse cx="16.2" cy={y} rx="3.4" ry="4.8" transform={`rotate(-28 16.2 ${y})`} fill="#f59e0b" stroke="#b45309" strokeWidth="1.1" />
              <ellipse cx="23.8" cy={y} rx="3.4" ry="4.8" transform={`rotate(28 23.8 ${y})`} fill="#fbbf24" stroke="#b45309" strokeWidth="1.1" />
            </g>
          ))}
          <ellipse cx="20" cy="8.5" rx="3" ry="4.5" fill="#fbbf24" stroke="#b45309" strokeWidth="1.1" />
          {/* Green flag leaves at base */}
          <path d="M20 35C15 33 11 29 9 24C13 26 17 29 20 33Z" fill="#2e7d32" />
          <path d="M20 35C25 33 29 29 31 24C27 26 23 29 20 33Z" fill="#43a047" />
        </g>
      );

    case "barley_winter":
      return (
        <g>
          {/* Long characteristic barley awns */}
          <path d="M15 11L9 2M18 9L15 1.5M22 9L25 1.5M25 11L31 2M13 16L7 8M27 16L33 8" stroke="#ca8a04" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M20 11V37" stroke="#a16207" strokeWidth="2" strokeLinecap="round" />
          {[13, 18, 23, 28].map((y, idx) => (
            <g key={idx}>
              <ellipse cx="16.5" cy={y} rx="3.1" ry="4.4" transform={`rotate(-24 16.5 ${y})`} fill="#eab308" stroke="#a16207" strokeWidth="1.1" />
              <ellipse cx="23.5" cy={y} rx="3.1" ry="4.4" transform={`rotate(24 23.5 ${y})`} fill="#fde047" stroke="#a16207" strokeWidth="1.1" />
            </g>
          ))}
          <path d="M20 35C15 33 11.5 29.5 10 25.5C14 27.5 17.5 30 20 33.5Z" fill="#2e7d32" />
        </g>
      );

    case "sunflower":
      return (
        <g>
          {/* Stem and leaves */}
          <path d="M20 26V38" stroke="#15803d" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M20 35C15 34 11 31 10 27C14 28 17.5 30.5 20 33.5Z" fill="#16a34a" />
          <path d="M20 35C25 34 29 31 30 27C26 28 22.5 30.5 20 33.5Z" fill="#22c55e" />
          {/* 12 Golden-yellow sunflower petals */}
          {Array.from({ length: 12 }, (_, i) => {
            const deg = i * 30;
            return (
              <ellipse
                key={i}
                cx="20"
                cy="7.2"
                rx="3.1"
                ry="5.8"
                transform={`rotate(${deg} 20 18)`}
                fill={i % 2 === 0 ? "#facc15" : "#eab308"}
                stroke="#ca8a04"
                strokeWidth="0.8"
              />
            );
          })}
          {/* Dark brown seed disc */}
          <circle cx="20" cy="18" r="7.5" fill="#451a03" stroke="#78350f" strokeWidth="1.5" />
          {/* Seed stipple pattern */}
          <circle cx="17.5" cy="16" r="1" fill="#d97706" />
          <circle cx="22.5" cy="16" r="1" fill="#d97706" />
          <circle cx="20" cy="18.5" r="1" fill="#f59e0b" />
          <circle cx="17" cy="20.5" r="1" fill="#f59e0b" />
          <circle cx="23" cy="20.5" r="1" fill="#f59e0b" />
          <circle cx="20" cy="14.5" r="1" fill="#f59e0b" />
        </g>
      );

    case "maize_grain":
      return (
        <g>
          {/* Golden maize cob */}
          <rect x="14.5" y="7" width="11" height="22" rx="5.5" fill="#facc15" stroke="#b45309" strokeWidth="1.3" />
          {/* Kernel grid */}
          <path d="M18 8.5V26M22 8.5V26M15 13H25M15 17.5H25M15 22H25" stroke="#d97706" strokeWidth="1.1" />
          {/* Open green husks */}
          <path d="M20 35C13 33 9 25 11 15C13.5 21 16 26 20 31Z" fill="#16a34a" stroke="#14532d" strokeWidth="1" />
          <path d="M20 35C27 33 31 25 29 15C26.5 21 24 26 20 31Z" fill="#22c55e" stroke="#14532d" strokeWidth="1" />
          <path d="M20 31V37" stroke="#15803d" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      );

    case "sugar_beet":
      return (
        <g>
          {/* Lush beet crown foliage */}
          <path d="M20 18C15 13 11 7 14 4C17.5 4.5 19.5 10 20 18Z" fill="#16a34a" />
          <path d="M20 18C25 13 29 7 26 4C22.5 4.5 20.5 10 20 18Z" fill="#22c55e" />
          <path d="M20 18C19 10 20 3 20 3" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
          {/* Swollen sugar beet taproot */}
          <path d="M12.5 19.5C12.5 16 27.5 16 27.5 19.5C27.5 26 22.5 32.5 20 37C17.5 32.5 12.5 26 12.5 19.5Z" fill="#e7e5e4" stroke="#78716c" strokeWidth="1.4" />
          <path d="M15.5 22H24.5M17 26.5H23" stroke="#a8a29e" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      );

    case "dry_bean":
      return (
        <g>
          {/* Green pod */}
          <path d="M9 26C11 15 21 9 31 11C29 22 20 29 9 26Z" fill="#65a30d" stroke="#3f6212" strokeWidth="1.2" />
          {/* Ivory white kidney beans */}
          <ellipse cx="17" cy="23" rx="5.2" ry="3.6" transform="rotate(-20 17 23)" fill="#fafaf9" stroke="#a8a29e" strokeWidth="1.2" />
          <ellipse cx="25" cy="27.5" rx="5.5" ry="3.8" transform="rotate(12 25 27.5)" fill="#ffffff" stroke="#78716c" strokeWidth="1.2" />
        </g>
      );

    case "alfalfa":
      return (
        <g>
          <path d="M20 16V36" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="14" cy="21" r="4.8" fill="#22c55e" stroke="#15803d" strokeWidth="1.1" />
          <circle cx="26" cy="21" r="4.8" fill="#16a34a" stroke="#15803d" strokeWidth="1.1" />
          <circle cx="20" cy="14" r="4.8" fill="#4ade80" stroke="#15803d" strokeWidth="1.1" />
          {/* Purple alfalfa florets */}
          <circle cx="17" cy="7.5" r="2.6" fill="#8b5cf6" />
          <circle cx="23" cy="7.5" r="2.6" fill="#7c3aed" />
          <circle cx="20" cy="5.5" r="2.6" fill="#a78bfa" />
        </g>
      );

    case "vetch":
      return (
        <g>
          <path d="M12 34C15 24 21 15 28 8" stroke="#15803d" strokeWidth="2" strokeLinecap="round" />
          <ellipse cx="14" cy="23" rx="4.2" ry="2.4" transform="rotate(-30 14 23)" fill="#22c55e" />
          <ellipse cx="23" cy="25" rx="4.2" ry="2.4" transform="rotate(25 23 25)" fill="#16a34a" />
          <ellipse cx="18" cy="15" rx="4.2" ry="2.4" transform="rotate(-30 18 15)" fill="#4ade80" />
          <circle cx="27" cy="12" r="3.4" fill="#9333ea" />
          <circle cx="24" cy="8.5" r="2.8" fill="#c084fc" />
        </g>
      );

    case "cotton":
      return (
        <g>
          <path d="M20 27V37" stroke="#78350f" strokeWidth="2.4" strokeLinecap="round" />
          {/* Fluffy white cotton boll */}
          <circle cx="15" cy="19" r="6.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          <circle cx="25" cy="19" r="6.2" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.2" />
          <circle cx="20" cy="13.5" r="6.5" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.2" />
          <circle cx="20" cy="21.5" r="5.8" fill="#ffffff" />
          {/* Brown calyx bracts */}
          <path d="M12 24L20 28L28 24L24 30H16L12 24Z" fill="#78350f" />
        </g>
      );

    case "lentil_green":
      return (
        <g>
          {[
            [14, 15], [22, 13], [27, 19],
            [11, 23], [19, 21], [25, 27],
            [15, 29], [21, 31],
          ].map(([cx, cy], idx) => (
            <g key={idx}>
              <ellipse cx={cx} cy={cy} rx="5.2" ry="3.8" fill="#4d7c0f" stroke="#365314" strokeWidth="1.1" />
              <ellipse cx={cx - 1.2} cy={cy - 1} rx="2" ry="1.1" fill="#bef264" opacity="0.65" />
            </g>
          ))}
        </g>
      );

    case "soybean":
      return (
        <g>
          <path d="M9 24C12 13 22 8 31 11C29 22 19 28 9 24Z" fill="#84cc16" stroke="#3f6212" strokeWidth="1.2" />
          <circle cx="15" cy="24" r="4.6" fill="#eab308" stroke="#a16207" strokeWidth="1.2" />
          <circle cx="23" cy="27" r="4.6" fill="#facc15" stroke="#a16207" strokeWidth="1.2" />
          <circle cx="28" cy="21" r="4.2" fill="#fde047" stroke="#a16207" strokeWidth="1.1" />
        </g>
      );

    case "canola":
      return (
        <g>
          <path d="M20 18V36" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="20" cy="11" r="4.2" fill="#facc15" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="14" cy="16" r="4.2" fill="#fde047" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="26" cy="16" r="4.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="20" cy="19" r="3.6" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
          <circle cx="20" cy="15" r="2.2" fill="#15803d" />
        </g>
      );

    case "safflower":
      return (
        <g>
          <path d="M20 22V36" stroke="#15803d" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M13 24L20 28L27 24L24 17H16L13 24Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.2" />
          <path d="M15 17C14 11 17 6 20 5C23 6 26 11 25 17Z" fill="#f97316" stroke="#c2410c" strokeWidth="1.1" />
          <path d="M17.5 16C17.5 11 19 7 20 6C21 7 22.5 11 22.5 16Z" fill="#facc15" />
        </g>
      );

    case "potato":
      return (
        <g>
          <ellipse cx="17" cy="23" rx="8.5" ry="6.2" transform="rotate(-14 17 23)" fill="#d6a85a" stroke="#854d0e" strokeWidth="1.3" />
          <ellipse cx="25.5" cy="27" rx="7.2" ry="5.4" transform="rotate(15 25.5 27)" fill="#e2b86b" stroke="#854d0e" strokeWidth="1.3" />
          <circle cx="14" cy="21" r="1" fill="#854d0e" />
          <circle cx="19" cy="24" r="1" fill="#854d0e" />
          <circle cx="26" cy="26" r="1" fill="#854d0e" />
          <path d="M18 16C18 11 21 8 24 8" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" />
        </g>
      );

    case "sainfoin":
      return (
        <g>
          <path d="M20 15V36" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="14" cy="25" rx="4.5" ry="2.3" transform="rotate(-25 14 25)" fill="#16a34a" />
          <ellipse cx="26" cy="25" rx="4.5" ry="2.3" transform="rotate(25 26 25)" fill="#16a34a" />
          <path d="M15 16C15 9 18 5 20 5C22 5 25 9 25 16Z" fill="#ec4899" stroke="#be185d" strokeWidth="1.1" />
          <circle cx="20" cy="10" r="2" fill="#fbcfe8" />
        </g>
      );

    case "fallow":
    default:
      return (
        <g>
          {/* Warm Anatolian ploughed soil ridges + conserved moisture drop */}
          <rect x="6" y="21" width="28" height="12" rx="4" fill="#a16207" />
          <path d="M8 25.5C13 23.5 18 23.5 20 25.5C22 27.5 27 27.5 32 25.5" stroke="#fde047" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M8 29.5C13 27.5 18 27.5 20 29.5C22 31.5 27 31.5 32 29.5" stroke="#fef08a" strokeWidth="1.4" strokeLinecap="round" />
          {/* Conserved water droplet */}
          <path d="M20 7C20 7 14.5 13.2 14.5 16.5C14.5 19.5 17 22 20 22C23 22 25.5 19.5 25.5 16.5C25.5 13.2 20 7 20 7Z" fill="#0284c7" stroke="#bae6fd" strokeWidth="1.2" />
        </g>
      );
  }
}
