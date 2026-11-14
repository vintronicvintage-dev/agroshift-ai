"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const cw = Math.floor(entries[0].contentRect.width);
      setW((prev) => (Math.abs(prev - cw) >= 1 ? cw : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function linear(d0: number, d1: number, r0: number, r1: number) {
  const k = d1 === d0 ? 0 : (r1 - r0) / (d1 - d0);
  return (v: number) => r0 + (v - d0) * k;
}

/** "Nice" tick values covering [lo, hi]. */
export function niceTicks(lo: number, hi: number, count = 5): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return [];
  if (hi === lo) hi = lo + 1;
  const span = hi - lo;
  const step0 = span / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(step0));
  const err = step0 / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const start = Math.floor(lo / step) * step;
  const out: number[] = [];
  for (let v = start; v <= hi + step * 0.5; v += step) out.push(+v.toFixed(10));
  return out;
}

export const CHART_FONT = 12;

export function GridY({ ticks, y, x0, x1, fmt }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; fmt: (v: number) => string }) {
  return (
    <g aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke="var(--rule)" strokeWidth={t === 0 ? 1.2 : 0.8} />
          <text x={x0 - 6} y={y(t)} dy="0.32em" textAnchor="end" fontSize={CHART_FONT} fill="var(--ink-2)">
            {fmt(t)}
          </text>
        </g>
      ))}
    </g>
  );
}

/** Year labels along the bottom, thinned to fit. */
export function YearAxis({ years, x, y, width }: { years: number[]; x: (i: number) => number; y: number; width: number }) {
  const every = Math.max(1, Math.ceil((years.length * 34) / Math.max(1, width)));
  return (
    <g aria-hidden="true">
      {years.map((yr, i) =>
        i % every === 0 || i === years.length - 1 ? (
          <text key={yr} x={x(i)} y={y} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
            {i % every === 0 ? yr : ""}
          </text>
        ) : null,
      )}
    </g>
  );
}

export function ChartCard({ title, badge, legend, children, table, footer, id }: { title: ReactNode; badge?: ReactNode; legend?: ReactNode; children: ReactNode; table?: ReactNode; footer?: ReactNode; id?: string }) {
  const { t } = useI18n();
  return (
    <figure id={id} className="min-w-0 card p-4">
      <figcaption>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="sec-title">{title}</h3>
          {badge}
        </div>
        {legend && <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-2">{legend}</div>}
      </figcaption>
      <div className="mt-3">{children}</div>
      {footer && <div className="mt-2 text-sm text-ink-2">{footer}</div>}
      {table && (
        <details className="mt-2 text-sm">
          <summary className="text-ink-2 hover:text-ink">
            <span className="chev mr-1">›</span>
            {t("ev.table")}
          </summary>
          <div className="mt-2 max-h-64 overflow-auto">{table}</div>
        </details>
      )}
    </figure>
  );
}

export function Swatch({ color, label, kind = "box" }: { color: string; label: ReactNode; kind?: "box" | "line" | "dash" }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {kind === "box" && <span className="inline-block h-3 w-3 rounded-sm" style={{ background: color }} aria-hidden="true" />}
      {kind === "line" && <span className="inline-block h-0.5 w-4" style={{ background: color }} aria-hidden="true" />}
      {kind === "dash" && <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: color }} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function SimpleTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full border-collapse text-left tabular-nums">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="border-b border-rule py-1 pr-3 font-semibold">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className="border-b border-rule/60 py-1 pr-3">
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
