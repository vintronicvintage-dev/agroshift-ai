"use client";

import type { ClimateSummary, NdviSeries, TrendResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { CHART_FONT, GridY, linear, niceTicks, useWidth, YearAxis } from "./chartKit";

const M = { l: 48, r: 12, t: 10, b: 26 };

function senAt(tr: TrendResult | undefined, year: number): number | null {
  if (!tr || !tr.years.length) return null;
  return tr.intercept + tr.senSlope * (year - tr.years[0]);
}

type Annual = ClimateSummary["annual"];

export function AnnualPrecipEt0Chart({ annual, trends, height = 240 }: { annual: Annual; trends: TrendResult[]; height?: number }) {
  const { n, t } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const rows = annual.filter((a) => a.precipMm !== null || a.et0Mm !== null);
  const years = rows.map((r) => r.year);
  const maxV = Math.max(1, ...rows.flatMap((r) => [r.precipMm ?? 0, r.et0Mm ?? 0]));
  const ticks = niceTicks(0, maxV, 4);
  const y = linear(0, ticks.at(-1) ?? maxV, height - M.b, M.t);
  const band = (w - M.l - M.r) / Math.max(1, rows.length);
  const x = (i: number) => M.l + band * (i + 0.5);
  const tp = trends.find((tr) => tr.variable === "precip");
  const te = trends.find((tr) => tr.variable === "et0");
  const et0Pts = rows.map((r, i) => (r.et0Mm === null ? null : `${x(i)},${y(r.et0Mm)}`)).filter(Boolean);
  const sen = (tr: TrendResult | undefined) => {
    if (!tr || !years.length) return null;
    const a = senAt(tr, years[0]), b = senAt(tr, years.at(-1)!);
    return a === null || b === null ? null : { x1: x(0), x2: x(years.length - 1), y1: y(a), y2: y(b) };
  };
  const sp = sen(tp), se = sen(te);
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={t("ev.annualTitle")}>
          <GridY ticks={ticks} y={y} x0={M.l} x1={w - M.r} fmt={(v) => n(v)} />
          {rows.map((r, i) =>
            r.precipMm === null ? null : (
              <rect key={r.year} x={x(i) - band * 0.34} width={band * 0.68} y={y(r.precipMm)} height={Math.max(0, y(0) - y(r.precipMm))} fill="var(--c-precip)" opacity={0.85}>
                <title>{`${r.year}: ${t("ev.precipShort")} ${n(r.precipMm)} mm, ET₀ ${n(r.et0Mm)} mm`}</title>
              </rect>
            ),
          )}
          <polyline points={et0Pts.join(" ")} fill="none" stroke="var(--c-et0)" strokeWidth={2} />
          {rows.map((r, i) => (r.et0Mm === null ? null : <circle key={r.year} cx={x(i)} cy={y(r.et0Mm)} r={2.6} fill="var(--c-et0)" />))}
          {sp && <line {...sp} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="5 4" />}
          {se && <line {...se} stroke="var(--c-et0)" strokeWidth={1.5} strokeDasharray="5 4" />}
          <YearAxis years={years} x={x} y={height - 8} width={w - M.l - M.r} />
        </svg>
      )}
    </div>
  );
}

export function MonthlyBalanceChart({ monthly, height = 220 }: { monthly: ClimateSummary["monthly"]; height?: number }) {
  const { n, t, locale } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const maxV = Math.max(1, ...monthly.flatMap((m) => [m.precipMm ?? 0, m.et0Mm ?? 0]));
  const ticks = niceTicks(0, maxV, 4);
  const y = linear(0, ticks.at(-1) ?? maxV, height - M.b, M.t);
  const band = (w - M.l - M.r) / 12;
  const x = (i: number) => M.l + band * (i + 0.5);
  const monthName = (i: number) => new Intl.DateTimeFormat(locale, { month: w < 520 ? "narrow" : "short", timeZone: "UTC" }).format(new Date(Date.UTC(2001, i, 1)));
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height + 26} role="img" aria-label={t("ev.monthlyTitle")}>
          <GridY ticks={ticks} y={y} x0={M.l} x1={w - M.r} fmt={(v) => n(v)} />
          {monthly.map((m, i) => (
            <g key={m.month}>
              {m.precipMm !== null && (
                <rect x={x(i) - band * 0.4} width={band * 0.38} y={y(m.precipMm)} height={y(0) - y(m.precipMm)} fill="var(--c-precip)">
                  <title>{`${monthName(i)}: ${t("ev.precipShort")} ${n(m.precipMm)} mm`}</title>
                </rect>
              )}
              {m.et0Mm !== null && (
                <rect x={x(i) + band * 0.02} width={band * 0.38} y={y(m.et0Mm)} height={y(0) - y(m.et0Mm)} fill="var(--c-et0)" opacity={0.85}>
                  <title>{`${monthName(i)}: ET₀ ${n(m.et0Mm)} mm`}</title>
                </rect>
              )}
              <text x={x(i)} y={height - 8} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
                {monthName(i)}
              </text>
              {m.balanceMm !== null && (
                <text x={x(i)} y={height + 16} textAnchor="middle" fontSize={band < 34 ? 10 : CHART_FONT} fontWeight={600} fill={m.balanceMm >= 0 ? "var(--c-precip)" : "var(--c-et0)"}>
                  {(m.balanceMm > 0 ? "+" : "") + n(m.balanceMm)}
                </text>
              )}
            </g>
          ))}
          <text x={M.l - 6} y={height + 16} textAnchor="end" fontSize={CHART_FONT} fill="var(--ink-2)">
            {t("ev.balance")}
          </text>
        </svg>
      )}
    </div>
  );
}

export function CountBarsChart({ annual, field, trend, color, height = 150, label }: { annual: Annual; field: "frostDays" | "hotDays"; trend?: TrendResult; color: string; height?: number; label: string }) {
  const { n } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const rows = annual.filter((a) => a[field] !== null);
  const years = rows.map((r) => r.year);
  const maxV = Math.max(1, ...rows.map((r) => r[field] ?? 0));
  const ticks = niceTicks(0, maxV, 3);
  const y = linear(0, ticks.at(-1) ?? maxV, height - M.b, M.t);
  const band = (w - M.l - M.r) / Math.max(1, rows.length);
  const x = (i: number) => M.l + band * (i + 0.5);
  const a = trend && years.length ? senAt(trend, years[0]) : null;
  const b = trend && years.length ? senAt(trend, years.at(-1)!) : null;
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label}>
          <GridY ticks={ticks} y={y} x0={M.l} x1={w - M.r} fmt={(v) => n(v)} />
          {rows.map((r, i) => (
            <rect key={r.year} x={x(i) - band * 0.34} width={band * 0.68} y={y(r[field]!)} height={y(0) - y(r[field]!)} fill={color}>
              <title>{`${r.year}: ${n(r[field])}`}</title>
            </rect>
          ))}
          {a !== null && b !== null && <line x1={x(0)} x2={x(years.length - 1)} y1={y(Math.max(0, a))} y2={y(Math.max(0, b))} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="5 4" />}
          <YearAxis years={years} x={x} y={height - 8} width={w - M.l - M.r} />
        </svg>
      )}
    </div>
  );
}

/** GWETROOT annual anomaly (year − record mean), diverging bars. */
export function WetnessAnomalyChart({ annual, trend, height = 190 }: { annual: Annual; trend?: TrendResult; height?: number }) {
  const { n, t } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const rows = annual.filter((a) => a.gwetRootMean !== null);
  const mean = rows.length ? rows.reduce((s, r) => s + r.gwetRootMean!, 0) / rows.length : 0;
  const an = rows.map((r) => r.gwetRootMean! - mean);
  const ext = Math.max(0.01, ...an.map(Math.abs));
  const ticks = niceTicks(-ext, ext, 4);
  const y = linear(ticks[0], ticks.at(-1)!, height - M.b, M.t);
  const band = (w - M.l - M.r) / Math.max(1, rows.length);
  const x = (i: number) => M.l + band * (i + 0.5);
  const years = rows.map((r) => r.year);
  const a = trend && years.length ? senAt(trend, years[0]) : null;
  const b = trend && years.length ? senAt(trend, years.at(-1)!) : null;
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={t("ev.gwetTitle")}>
          <GridY ticks={ticks} y={y} x0={M.l} x1={w - M.r} fmt={(v) => (v > 0 ? "+" : "") + n(v, 2)} />
          {rows.map((r, i) => (
            <rect key={r.year} x={x(i) - band * 0.34} width={band * 0.68} y={Math.min(y(0), y(an[i]))} height={Math.abs(y(an[i]) - y(0))} fill={an[i] >= 0 ? "var(--c-precip)" : "var(--loam)"}>
              <title>{`${r.year}: GWETROOT ${n(r.gwetRootMean, 3)} (${an[i] >= 0 ? "+" : ""}${n(an[i], 3)})`}</title>
            </rect>
          ))}
          {a !== null && b !== null && <line x1={x(0)} x2={x(years.length - 1)} y1={y(a - mean)} y2={y(b - mean)} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="5 4" />}
          <YearAxis years={years} x={x} y={height - 8} width={w - M.l - M.r} />
        </svg>
      )}
    </div>
  );
}

export function NdviChart({ ndvi, height = 190 }: { ndvi: NdviSeries; height?: number }) {
  const { n, t } = useI18n();
  const [ref, w] = useWidth<HTMLDivElement>();
  const pts = ndvi.points;
  if (!pts.length) return null;
  const t0 = Date.parse(pts[0].date), t1 = Date.parse(pts.at(-1)!.date);
  const x = linear(t0, t1, M.l, w - M.r);
  const lo = Math.min(0, ...pts.map((p) => p.ndvi));
  const ticks = niceTicks(lo, Math.max(0.6, ...pts.map((p) => p.ndvi)), 4);
  const y = linear(ticks[0], ticks.at(-1)!, height - M.b, M.t);
  const y0 = new Date(t0).getUTCFullYear(), y1 = new Date(t1).getUTCFullYear();
  const yearTicks: number[] = [];
  const step = Math.max(1, Math.ceil(((y1 - y0 + 1) * 40) / Math.max(1, w - M.l - M.r)));
  for (let yr = y0 + 1; yr <= y1; yr += step) yearTicks.push(yr);
  const path = pts.map((p, i) => `${i ? "L" : "M"}${x(Date.parse(p.date)).toFixed(1)},${y(p.ndvi).toFixed(1)}`).join("");
  return (
    <div ref={ref} className="w-full">
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={t("ev.ndviTitle")}>
          <rect x={M.l} width={w - M.l - M.r} y={y(0.2)} height={Math.max(0, y(ticks[0]) - y(0.2))} fill="var(--c-muted)" opacity={0.22} />
          <GridY ticks={ticks} y={y} x0={M.l} x1={w - M.r} fmt={(v) => n(v, 1)} />
          {yearTicks.map((yr) => {
            const xx = x(Date.UTC(yr, 0, 1));
            return (
              <g key={yr} aria-hidden="true">
                <line x1={xx} x2={xx} y1={M.t} y2={height - M.b} stroke="var(--rule)" strokeWidth={0.6} />
                <text x={xx} y={height - 8} textAnchor="middle" fontSize={CHART_FONT} fill="var(--ink-2)">
                  {yr}
                </text>
              </g>
            );
          })}
          <path d={path} fill="none" stroke="var(--c-green)" strokeWidth={1.6} strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
