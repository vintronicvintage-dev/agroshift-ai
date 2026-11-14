/**
 * The welcome illustration, drawn as geometry: a satellite on its ground track sweeping a swath over
 * three field strips (the three rotation years, in the crop-family colours of the strip calendar).
 * Later slides add the year numbers and the P10–P90 spread whiskers. Decorative only.
 */
export function IntroArt({ slide }: { slide: number }) {
  const strips = [
    { y: 262, fill: "#E69F00", label: "1" },
    { y: 304, fill: "#009E73", label: "2" },
    { y: 346, fill: "url(#ia-hatch)", label: "3" },
  ];
  return (
    <svg viewBox="0 0 480 420" className="intro-art h-full w-full" data-slide={Math.min(slide, 2)} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <pattern id="ia-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="7" height="7" fill="var(--panel)" />
          <line x1="0" y1="0" x2="0" y2="7" stroke="var(--loam)" strokeWidth="2" />
        </pattern>
        <linearGradient id="ia-swath" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--sky)" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      {/* horizon and orbit */}
      <path className="orbit" d="M-10 150 C 120 30, 360 30, 490 150" fill="none" stroke="var(--sky)" strokeWidth="1.6" />
      <path d="M-10 196 C 120 92, 360 92, 490 196" fill="none" stroke="var(--rule)" strokeWidth="1" />

      {/* swath from the satellite to the field */}
      <path d="M302 78 L176 250 L436 250 Z" fill="url(#ia-swath)" />
      {[0, 1, 2, 3].map((k) => (
        <line key={k} x1="302" y1="78" x2={196 + k * 72} y2="250" stroke="var(--sky)" strokeWidth="0.8" strokeOpacity="0.45" strokeDasharray="2 5" />
      ))}

      {/* satellite: body, two panels, an antenna, rotated to the orbit tangent */}
      <g transform="translate(302 70) rotate(14)">
        <rect x="-36" y="-5" width="24" height="10" rx="1.5" fill="var(--sky)" />
        <rect x="12" y="-5" width="24" height="10" rx="1.5" fill="var(--sky)" />
        <line x1="-24" y1="-5" x2="-24" y2="5" stroke="var(--paper)" strokeWidth="1" />
        <line x1="24" y1="-5" x2="24" y2="5" stroke="var(--paper)" strokeWidth="1" />
        <rect x="-10" y="-8" width="20" height="16" rx="3" fill="var(--ink)" />
        <line x1="0" y1="8" x2="0" y2="14" stroke="var(--ink)" strokeWidth="1.6" />
        <circle cx="0" cy="15" r="2" fill="var(--ink)" />
      </g>

      {/* the field: three strips = three rotation years */}
      <g>
        {strips.map((s) => (
          <rect key={s.y} x="40" y={s.y} width="400" height="30" rx="5" fill={s.fill} stroke={s.label === "3" ? "var(--loam)" : "none"} strokeWidth="1.2" />
        ))}
      </g>

      {/* slide 2+: the years in order */}
      <g data-from="1">
        {strips.map((s) => (
          <g key={s.y}>
            <circle cx="40" cy={s.y + 15} r="13" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.4" />
            <text x="40" y={s.y + 15} dy="0.35em" textAnchor="middle" fontFamily="var(--font-serif)" fontSize="14" fontWeight="600" fill="var(--ink)">
              {s.label}
            </text>
          </g>
        ))}
      </g>

      {/* slide 3+: the spread of real years, P10–P90 with the P50 tick */}
      <g data-from="2">
        {[
          [250, 330, 392],
          [196, 262, 300],
          [118, 160, 214],
        ].map(([lo, mid, hi], i) => {
          const y = strips[i].y - 7;
          return (
            <g key={i}>
              <line x1={lo} x2={hi} y1={y} y2={y} stroke="var(--ink)" strokeWidth="1.4" />
              <line x1={lo} x2={lo} y1={y - 4} y2={y + 4} stroke="var(--ink)" strokeWidth="1.4" />
              <line x1={hi} x2={hi} y1={y - 4} y2={y + 4} stroke="var(--ink)" strokeWidth="1.4" />
              <rect x={mid - 1.5} y={y - 6} width="3" height="12" rx="1" fill="var(--ink)" />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
