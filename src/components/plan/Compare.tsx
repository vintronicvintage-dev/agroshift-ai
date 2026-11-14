"use client";

import type { AnalysisResult, Dist, PlanResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { outOf, TON_PER_IRRIGATION_LABEL } from "./units";
import { planLabel, planTitle } from "./planKit";

const SHAPES = ["circle", "square", "diamond", "triangle", "circle", "square"] as const;

function Marker({ shape, x, y, filled = true }: { shape: (typeof SHAPES)[number]; x: number; y: number; filled?: boolean }) {
  const f = filled ? "var(--ink)" : "var(--bg)";
  const s = "var(--ink)";
  if (shape === "square") return <rect x={x - 4.5} y={y - 4.5} width="9" height="9" fill={f} stroke={s} strokeWidth="1.4" />;
  if (shape === "diamond") return <rect x={x - 4.2} y={y - 4.2} width="8.4" height="8.4" fill={f} stroke={s} strokeWidth="1.4" transform={`rotate(45 ${x} ${y})`} />;
  if (shape === "triangle") return <path d={`M${x} ${y - 5.5}L${x + 5.5} ${y + 4.5}H${x - 5.5}Z`} fill={f} stroke={s} strokeWidth="1.4" />;
  return <circle cx={x} cy={y} r="5" fill={f} stroke={s} strokeWidth="1.4" />;
}

export function MarkerIcon({ i }: { i: number }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0">
      <Marker shape={SHAPES[i % SHAPES.length]} x={7} y={7} filled={i !== 0} />
    </svg>
  );
}

interface Metric {
  key: string;
  label: DictKey;
  unit: string;
  better: "low" | "high";
  get: (p: PlanResult) => { d: Dist | null; v: number | null };
  digits?: number;
}

/**
 * Comparison as small multiples: one row block per metric, every plan as a dot (typical year,
 * P50) with a whisker over 8 of 10 periods (P10–P90), all on one shared scale per metric.
 * "Benim planım" is always first and drawn as an open marker with a dashed reference line.
 */
export function Compare({ result, plans, selectedId, onSelect }: { result: AnalysisResult; plans: PlanResult[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { t, n, lang } = useI18n();
  const metrics: Metric[] = [
    { key: "need", label: "cmp.need", unit: t("u.tonDa"), better: "low", get: (p) => ({ d: p.water.requirementMmPerYr, v: p.water.requirementMmPerYr?.p50 ?? null }) },
    { key: "unmet", label: "cmp.unmet", unit: t("u.tonDa"), better: "low", get: (p) => ({ d: p.water.unmetDeficitMmPerYr, v: p.water.unmetDeficitMmPerYr?.p50 ?? null }) },
    { key: "margin", label: "cmp.margin", unit: t("u.tlDa"), better: "high", get: (p) => ({ d: p.economics.grossMarginTLPerDaPerYr, v: p.economics.grossMarginTLPerDaPerYr?.p50 ?? null }) },
    { key: "soil", label: "cmp.soil", unit: "/100", better: "high", get: (p) => ({ d: null, v: p.soilHealth.score }) },
    { key: "risk", label: "cmp.risk", unit: "/100", better: "low", get: (p) => ({ d: null, v: p.risk.score * 100 }) },
  ];
  const W = 900, L = 8, R = 8;
  const rowH = 26;
  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px]" aria-label={t("cmp.legend")}>
        {plans.map((p, i) => (
          <li key={p.id}>
            <button type="button" className={`inline-flex min-h-9 items-center gap-1.5 rounded-md px-1.5 ${selectedId === p.id ? "bg-surface-2 font-semibold" : ""}`} aria-pressed={selectedId === p.id} onClick={() => onSelect(p.id)}>
              <MarkerIcon i={i} />
              <span>{planTitle(p, result, t)}</span>
              <span className="text-ink-2">({planLabel(p, lang)})</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="space-y-5">
        {metrics.map((m) => {
          const vals = plans.flatMap((p) => {
            const g = m.get(p);
            return g.d ? [g.d.p10, g.d.p90] : g.v !== null ? [g.v] : [];
          });
          let lo = Math.min(0, ...vals);
          let hi = Math.max(1, ...vals);
          const pad = (hi - lo) * 0.06;
          lo -= m.key === "soil" || m.key === "risk" ? 0 : lo < 0 ? pad : 0;
          hi += pad;
          if (m.key === "soil" || m.key === "risk") {
            lo = 0;
            hi = 100;
          }
          const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
          const cur = m.get(plans[0]).v;
          const H = plans.length * rowH + 30;
          return (
            <section key={m.key} aria-labelledby={`cmp-${m.key}`}>
              <h4 id={`cmp-${m.key}`} className="flex flex-wrap items-baseline justify-between gap-2 text-[14px] font-semibold">
                <span>
                  {t(m.label)} <span className="font-normal text-ink-2">({m.unit})</span>
                </span>
                <span className="text-[12px] font-normal text-ink-2">{m.better === "low" ? t("cmp.lowBetter") : t("cmp.highBetter")}</span>
              </h4>
              <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 h-auto w-full" role="img" aria-label={plans.map((p) => `${planTitle(p, result, t)}: ${m.get(p).v !== null ? n(m.get(p).v!) : "–"} ${m.unit}`).join("; ")}>
                {lo < 0 && <line x1={x(0)} x2={x(0)} y1={0} y2={H - 18} stroke="var(--axis)" />}
                {cur !== null && <line x1={x(cur)} x2={x(cur)} y1={0} y2={H - 18} stroke="var(--ref)" strokeDasharray="4 3" />}
                {plans.map((p, i) => {
                  const g = m.get(p);
                  const y = 20 + i * rowH;
                  const sel = selectedId === p.id;
                  return (
                    <g key={p.id} opacity={selectedId && !sel && i !== 0 ? 0.55 : 1}>
                      <line x1={L} x2={W - R} y1={y} y2={y} stroke="var(--grid)" strokeWidth="0.6" />
                      {g.d && (
                        <>
                          <line x1={x(g.d.p10)} x2={x(g.d.p90)} y1={y} y2={y} stroke="var(--ink-2)" strokeWidth={sel ? 3 : 2} />
                          <line x1={x(g.d.p10)} x2={x(g.d.p10)} y1={y - 4} y2={y + 4} stroke="var(--ink-2)" strokeWidth="1.4" />
                          <line x1={x(g.d.p90)} x2={x(g.d.p90)} y1={y - 4} y2={y + 4} stroke="var(--ink-2)" strokeWidth="1.4" />
                        </>
                      )}
                      {g.v !== null && <Marker shape={SHAPES[i % SHAPES.length]} x={x(g.v)} y={y} filled={i !== 0} />}
                      {g.v !== null && (
                        <text x={x(g.v) > W - 70 ? x(g.v) - 10 : x(g.v) + 10} y={y - 5} textAnchor={x(g.v) > W - 70 ? "end" : "start"} fontSize="11.5" fontWeight={sel ? 700 : 500} fill="var(--ink)">
                          {n(g.v, m.key === "risk" || m.key === "soil" ? 0 : 0)}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={L} y={H - 4} fontSize="11" fill="var(--ink-2)">
                  {n(lo)}
                </text>
                <text x={W - R} y={H - 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
                  {n(hi)}
                </text>
              </svg>
            </section>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-ink-2">{t("cmp.gloss", { w: result.windows.count, k: TON_PER_IRRIGATION_LABEL })}</p>
    </div>
  );
}

/**
 * Year-by-year strip: one cell per historical start year, fill = the weakest crop year's yield
 * share of the water-unlimited yield (lighter = weaker), a cross where the irrigation water ran out.
 */
export function WindowStrip({ result, plans }: { result: AnalysisResult; plans: PlanResult[] }) {
  const { t, lang, n } = useI18n();
  const years = result.windows.agYears;
  const ramp = (v: number) => `color-mix(in srgb, var(--water) ${Math.round(15 + v * 80)}%, var(--surface))`;
  const okCurrent = plans.find((p) => p.trade)?.trade?.okWindowsCurrent ?? null;
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1.5 text-[13px]">
          <caption className="sr-only">{t("win.caption")}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-[30%] text-left font-medium text-ink-2">
                {t("win.plan")}
              </th>
              <th scope="col" className="text-left font-mono text-[11px] font-normal text-ink-2">
                <span className="flex justify-between">
                  <span>{years[0] - 1}–{String(years[0] + 1).slice(2)}</span>
                  <span>{years.at(-1)! - 1}–{String(years.at(-1)! + 1).slice(2)}</span>
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const ok = p.kind === "current" ? okCurrent : (p.trade?.okWindowsPlan ?? null);
              return (
                <tr key={p.id}>
                  <th scope="row" className="pr-3 text-left align-top font-normal">
                    <span className="flex items-center gap-1.5 font-medium">
                      <MarkerIcon i={i} />
                      {planTitle(p, result, t)}
                    </span>
                    {ok !== null && <span className="block text-[12px] text-ink-2">{t("win.ok", { s: outOf(ok, result.windows.count, lang) })}</span>}
                  </th>
                  <td>
                    <div className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${years.length}, minmax(0, 1fr))` }}>
                      {(p.windows ?? []).map((w) => {
                        const yr = w.yieldRatioByYear.filter((v): v is number => v !== null);
                        const worst = yr.length ? Math.min(...yr) : null;
                        return (
                          <span
                            key={w.startYear}
                            className="relative flex h-7 items-center justify-center rounded-[2px] border border-line"
                            style={{ background: worst !== null ? ramp(worst) : "var(--surface-2)" }}
                            title={t("win.cell", { a: w.startYear - 1, b: w.startYear + 2, y: worst !== null ? n(worst * 100) : "–", m: n(w.marginTLPerDaPerYr) })}
                            aria-label={t("win.cell", { a: w.startYear - 1, b: w.startYear + 2, y: worst !== null ? n(worst * 100) : "–", m: n(w.marginTLPerDaPerYr) }) + (w.budgetExceeded ? `, ${t("win.short")}` : "")}
                            role="img"
                          >
                            {w.budgetExceeded && (
                              <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                                <path d="m1.5 1.5 7 7m0-7-7 7" stroke="var(--bg)" strokeWidth="3" />
                                <path d="m1.5 1.5 7 7m0-7-7 7" stroke="var(--risk)" strokeWidth="1.6" />
                              </svg>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-10 rounded-[2px]" style={{ background: "linear-gradient(90deg, color-mix(in srgb, var(--water) 15%, var(--surface)), var(--water))" }} />
          {t("win.legendYield")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="10" height="10" aria-hidden="true">
            <path d="m1.5 1.5 7 7m0-7-7 7" stroke="var(--risk)" strokeWidth="1.6" />
          </svg>
          {t("win.short")}
        </span>
      </p>
    </div>
  );
}
