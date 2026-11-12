/** Small authored icons, one stroke weight (1.6 on a 16 grid). Decorative unless a label is passed. */

export function Chevron({ dir = "right", size = 14 }: { dir?: "right" | "down" | "left"; size?: number }) {
  const rot = dir === "down" ? 90 : dir === "left" ? 180 : 0;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }} className="shrink-0">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Direction of change against the current plan: up/down triangle, or a bar for no change. */
export function DeltaMark({ delta, size = 10 }: { delta: number | null; size?: number }) {
  if (delta === null) return null;
  if (delta === 0)
    return (
      <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
        <rect x="1.5" y="4.2" width="7" height="1.6" rx="0.8" fill="currentColor" />
      </svg>
    );
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" className="shrink-0">
      <path d={delta > 0 ? "M5 1.5 9 8.5H1Z" : "M5 8.5 1 1.5h8Z"} fill="currentColor" />
    </svg>
  );
}

export function Lock({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function Close({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" className="shrink-0">
      <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** Raindrop (rainfed) and a drip line (irrigated), for the water question. */
export function WaterGlyph({ kind }: { kind: "rain" | "irrigated" }) {
  return kind === "rain" ? (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0 text-sky">
      <path d="M6 10a5 5 0 0 1 9.6-1.9A4 4 0 1 1 20 16H8a4 4 0 0 1-2-6Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 20l-1 3M15 20l-1 3M20 20l-1 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ) : (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0 text-sky">
      <path d="M3 9h22" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M8 12.5c0 1.4-1.5 2.6-1.5 3.6a1.5 1.5 0 0 0 3 0c0-1-1.5-2.2-1.5-3.6ZM14 12.5c0 1.4-1.5 2.6-1.5 3.6a1.5 1.5 0 0 0 3 0c0-1-1.5-2.2-1.5-3.6ZM20 12.5c0 1.4-1.5 2.6-1.5 3.6a1.5 1.5 0 0 0 3 0c0-1-1.5-2.2-1.5-3.6Z" fill="currentColor" />
      <path d="M3 23h22" stroke="var(--loam)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
