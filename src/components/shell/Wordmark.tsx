/**
 * Wordmark: three field strips, the three rotation years. The first is the sprout accent, the
 * second is water, the third is a fallow outline in soil amber.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
        <rect x="2" y="3.5" width="24" height="6" rx="3" fill="var(--accent)" />
        <rect x="2" y="11" width="17" height="6" rx="3" fill="var(--c-precip)" />
        <rect x="2.75" y="19.25" width="22.5" height="4.5" rx="2.25" fill="none" stroke="var(--loam)" strokeWidth="1.5" strokeDasharray="3 2.4" />
      </svg>
      <span translate="no" className={`font-display text-[1.28rem] font-semibold tracking-[-0.025em] text-ink ${compact ? "sr-only" : ""}`}>AgroShift</span>
    </span>
  );
}
