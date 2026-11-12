/** Wordmark: three field strips (the three rotation years) beside the name. */
export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
        <rect x="1" y="3" width="24" height="5" rx="1.5" fill="#E69F00" />
        <rect x="1" y="10.5" width="24" height="5" rx="1.5" fill="#009E73" />
        <rect x="1" y="18" width="24" height="5" rx="1.5" fill="none" stroke="var(--loam)" strokeWidth="1.3" strokeDasharray="2.5 2" />
      </svg>
      <span className="font-serif text-[1.35rem] font-semibold tracking-tight text-ink">AgroShift</span>
    </span>
  );
}
