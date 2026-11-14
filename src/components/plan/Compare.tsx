"use client";

import type { CSSProperties } from "react";
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
  get: (plan: PlanResult) => Dist | number | null;
  bounded?: boolean;
  water?: boolean;
}

function metricValue(value: Dist | number | null) {
  return typeof value === "number" ? value : value?.p50 ?? null;
}

function metricScale(metric: Metric, plans: PlanResult[]) {
  const values = plans.flatMap((plan) => {
    const value = metric.get(plan);
    if (value === null) return [];
    return typeof value === "number" ? [value] : [value.p10, value.p50, value.p90];
  });
  const low = metric.bounded ? 0 : Math.min(0, ...values);
  const high = metric.bounded ? 100 : Math.max(1, ...values);
  return (value: number) => `${((value - low) / (high - low)) * 100}%`;
}

const budgetCopy = {
  tr: { title: "Yıllık sulama bütçesi", subtitle: "Suyun yetmediği dönemler", years: ["1. yıl", "2. yıl", "3. yıl"], selected: "Seçili", range: "Geçmiş dönemlerin %80 aralığı" },
  en: { title: "Annual irrigation budget", subtitle: "Periods with insufficient water", years: ["Year 1", "Year 2", "Year 3"], selected: "Selected", range: "Range for 80% of past periods" },
};

export function Compare({ result, plans, selectedId, onSelect }: { result: AnalysisResult; plans: PlanResult[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { t, n, lang } = useI18n();
  const copy = budgetCopy[lang];
  const metrics: Metric[] = [
    { key: "need", label: "cmp.need", unit: t("u.tonDa"), better: "low", water: true, get: (p) => p.water.requirementMmPerYr },
    { key: "unmet", label: "cmp.unmet", unit: t("u.tonDa"), better: "low", water: true, get: (p) => p.water.unmetDeficitMmPerYr },
    { key: "margin", label: "cmp.margin", unit: t("u.tlDa"), better: "high", get: (p) => p.economics.grossMarginTLPerDaPerYr },
    { key: "soil", label: "cmp.soil", unit: "/100", better: "high", bounded: true, get: (p) => p.soilHealth.score },
    { key: "risk", label: "cmp.risk", unit: "/100", better: "low", bounded: true, get: (p) => p.risk.score * 100 },
  ];
  const baseline = plans.find((plan) => plan.kind === "current");
  const scales = metrics.map((metric) => ({
    metric,
    position: metricScale(metric, plans),
    reference: baseline ? metricValue(metric.get(baseline)) : null,
  }));

  if (plans.length === 0) return null;

  return (
    <div className="plan-compare-comparison">
      <div className="plan-compare-heading" aria-hidden="true">
        <span>{t("win.plan")}</span>
        {metrics.map((metric) => (
          <div key={metric.key}>
            <span>{t(metric.label)}</span>
            <small>{t(metric.better === "low" ? "cmp.lowBetter" : "cmp.highBetter")}</small>
          </div>
        ))}
        <div>
          <span>{copy.title}</span>
          <small>{copy.subtitle}</small>
        </div>
      </div>
      <ul role="list" aria-label={t("cmp.legend")} className="plan-compare-plans">
        {plans.map((plan, index) => {
          const selected = selectedId === plan.id;
          const title = planTitle(plan, result, t);
          return (
            <li key={plan.id} className="plan-compare-plan" data-selected={selected} data-baseline={plan.kind === "current"}>
              <button type="button" className="plan-compare-selection" aria-pressed={selected} onClick={() => onSelect(plan.id)}>
                <span className="plan-compare-plan-name"><MarkerIcon i={index} />{title}</span>
                <span className="plan-compare-crop-names">{planLabel(plan, lang)}</span>
                {selected ? <span aria-hidden="true" className="plan-compare-selected">{copy.selected}</span> : null}
              </button>
              <dl className="plan-compare-metrics">
                {scales.map(({ metric, position, reference }) => {
                  const value = metric.get(plan);
                  const median = metricValue(value);
                  const range = typeof value === "object" ? value : null;
                  return (
                    <div className="plan-compare-metric" key={metric.key} data-water={metric.water}>
                      <dt className="plan-compare-metric-name">{t(metric.label)}</dt>
                      <dd className="plan-compare-metric-value">
                        <strong>{n(median)}</strong>
                        {median !== null ? <small>{metric.unit}</small> : null}
                      </dd>
                      {median !== null ? (
                        <dd className="plan-compare-track" aria-hidden="true">
                          {range ? (
                            <span className="plan-compare-whisker" style={{ "--from": position(range.p10), "--to": position(range.p90) } as CSSProperties} />
                          ) : null}
                          {reference !== null ? <span className="plan-compare-reference" style={{ left: position(reference) }} /> : null}
                          <span className="plan-compare-median" style={{ left: position(median) }} />
                        </dd>
                      ) : null}
                      {range ? <dd className="plan-compare-interval" aria-label={`${copy.range}: ${n(range.p10)}–${n(range.p90)} ${metric.unit}`}>{n(range.p10)}–{n(range.p90)}</dd> : null}
                    </div>
                  );
                })}
                <div className="plan-compare-budget">
                  <dt className="plan-compare-metric-name">{copy.title} <small>{copy.subtitle}</small></dt>
                  <dd>
                    <ul role="list" aria-label={`${copy.title} · ${copy.subtitle}`} className="plan-compare-budget-years">
                      {copy.years.map((year, slot) => {
                        const share = plan.water.budgetExceededShareByYear?.[slot] ?? null;
                        const count = share === null || result.windows.count === 0 ? null : Math.round(share * result.windows.count);
                        return (
                          <li key={year} data-exceeded={count !== null && count > 0}>
                            <span>{year}</span>
                            <strong>{count === null ? "—" : `${n(count)}/${n(result.windows.count)}`}</strong>
                          </li>
                        );
                      })}
                    </ul>
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <p className="plan-compare-gloss">{t("cmp.gloss", { w: result.windows.count, k: TON_PER_IRRIGATION_LABEL })}</p>
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
