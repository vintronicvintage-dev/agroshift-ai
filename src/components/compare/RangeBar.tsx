import type { Dist } from "@/lib/types";

/** P10–P90 whisker with a P50 tick on a shared domain, so cards can be compared by eye. */
export function RangeBar({ d, domain, color = "var(--ink)", label }: { d: Dist | null; domain: [number, number]; color?: string; label: string }) {
  if (!d) return null;
  const [lo, hi] = domain;
  const span = hi - lo || 1;
  const p = (v: number) => `${Math.min(100, Math.max(0, ((v - lo) / span) * 100))}%`;
  return (
    <div className="relative mt-2 h-3" role="img" aria-label={label}>
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-rule" aria-hidden="true" />
      <span
        className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
        style={{ left: p(d.p10), width: `calc(${p(d.p90)} - ${p(d.p10)})`, background: color, opacity: 0.35 }}
        aria-hidden="true"
      />
      <span className="absolute top-0 h-3 w-[3px] -translate-x-1/2 rounded-sm" style={{ left: p(d.p50), background: color }} aria-hidden="true" />
    </div>
  );
}
