"use client";

import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { MiniTable, TableToggle } from "@/components/tarla/CardKit";
import { planLabel, planTitle } from "./planKit";

/**
 * Water–income trade-off: every feasible sequence as a faint dot (screening values), the
 * exactly replayed non-dominated plans joined by a step line, and the named plans labelled
 * directly. Up-left is better (less water, more income).
 */
export function Pareto({ result, plans }: { result: AnalysisResult; plans: PlanResult[] }) {
  const { t, n, lang } = useI18n();
  const W = 640, H = 340, L = 54, R = 16, T = 18, B = 40;
  const pts = result.candidates;
  const named = plans.map((p) => ({ p, x: p.water.requirementMmPerYr?.p50 ?? null, y: p.economics.grossMarginTLPerDaPerYr?.p50 ?? null })).filter((q) => q.x !== null && q.y !== null) as { p: PlanResult; x: number; y: number }[];
  const xs = [...pts.map((c) => c.requirementMmPerYr), ...named.map((q) => q.x)];
  const ys = [...pts.map((c) => c.grossMarginTLPerDaPerYr), ...named.map((q) => q.y)];
  const x0 = Math.min(0, ...xs), x1 = Math.max(...xs) * 1.05;
  const y0 = Math.min(0, ...ys) * 1.05, y1 = Math.max(...ys) * 1.08;
  const x = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  const front = [...result.pareto].sort((a, b) => a.requirementMmPerYr - b.requirementMmPerYr);
  // non-dominated on the 2D view: keep points whose margin beats every point with less water
  const step: { x: number; y: number }[] = [];
  let best = -Infinity;
  for (const f of front) if (f.grossMarginTLPerDaPerYr > best) {
    best = f.grossMarginTLPerDaPerYr;
    step.push({ x: f.requirementMmPerYr, y: f.grossMarginTLPerDaPerYr });
  }
  const path = step.map((s, i) => (i === 0 ? `M${x(s.x)} ${y(s.y)}` : `H${x(s.x)}V${y(s.y)}`)).join("");
  const ticks = (a: number, b: number) => {
    const span = b - a;
    const stp = 10 ** Math.floor(Math.log10(span / 4 || 1));
    const k = [1, 2, 5, 10].find((m) => span / (m * stp) <= 6) ?? 10;
    const s = k * stp;
    const out: number[] = [];
    for (let v = Math.ceil(a / s) * s; v <= b; v += s) out.push(v);
    return out;
  };
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={t("par.aria", { n: pts.length })}>
        <rect x={L} y={T} width={(W - L - R) * 0.42} height={(H - T - B) * 0.42} fill="var(--good)" opacity="0.06" />
        <text x={L + 6} y={T + 14} fontSize="11" fill="var(--ink-2)">
          {t("par.good")}
        </text>
        {ticks(y0, y1).map((v) => (
          <g key={`y${v}`}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={v === 0 ? 1 : 0.6} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
              {n(v)}
            </text>
          </g>
        ))}
        {ticks(x0, x1).map((v) => (
          <text key={`x${v}`} x={x(v)} y={H - B + 16} textAnchor="middle" fontSize="11" fill="var(--ink-2)">
            {n(v)}
          </text>
        ))}
        <text x={W - R} y={H - 6} textAnchor="end" fontSize="11.5" fill="var(--ink-2)">
          {t("par.xAxis")}
        </text>
        <text x={4} y={T - 6} fontSize="11.5" fill="var(--ink-2)">
          {t("par.yAxis")}
        </text>
        {pts.map((c) => (
          <circle key={c.id} cx={x(c.requirementMmPerYr)} cy={y(c.grossMarginTLPerDaPerYr)} r={c.basis === "exact" ? 2.6 : 1.8} fill="var(--ink-3)" opacity={c.basis === "exact" ? 0.8 : 0.35} />
        ))}
        {path && <path d={path} fill="none" stroke="var(--ink)" strokeWidth="1.4" strokeDasharray="5 3" />}
        {named.map((q, i) => {
          const cx = x(q.x), cy = y(q.y);
          const right = cx < W - 200;
          return (
            <g key={q.p.id}>
              <circle cx={cx} cy={cy} r="6" fill={i === 0 ? "var(--bg)" : "var(--ink)"} stroke="var(--ink)" strokeWidth="1.6" />
              <text x={right ? cx + 10 : cx - 10} y={cy + 4 + (i % 2 ? 12 : -4)} textAnchor={right ? "start" : "end"} fontSize="12" fontWeight="600" fill="var(--ink)" paintOrder="stroke" stroke="var(--bg)" strokeWidth="3">
                {planTitle(q.p, result, t)}: {planLabel(q.p, lang)}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-[12px] text-ink-2">{t("par.caption", { n: pts.length, e: result.optimizer.replayedExactly })}</figcaption>
      <TableToggle label={t("common.table")}>
        <MiniTable
          head={[t("win.plan"), t("par.colWater"), t("par.colMargin"), t("cmp.soil")]}
          rows={named.map((q) => [`${planTitle(q.p, result, t)}: ${planLabel(q.p, lang)}`, n(q.x), n(q.y), n(q.p.soilHealth.score)])}
        />
      </TableToggle>
    </figure>
  );
}
