"use client";

import { CROPS } from "@/lib/engine";
import type { ReactNode } from "react";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { shortName } from "@/lib/ui/crops";
import { composeVerdict, deltaTone, metricDelta, planMetrics, SAME_EPS, type MetricKey } from "@/lib/ui/verdict";
import { Num } from "@/components/ui/Num";
import { Chevron, DeltaMark } from "@/components/ui/Glyphs";
import { CropSwatch } from "@/components/field/CropChip";
import { usePlanTitle } from "./Verdict";

/** Column layout shared by the header row and every plan row (md and up). */
const COLS = "md:grid md:grid-cols-[minmax(13rem,1.5fr)_repeat(5,minmax(0,1fr))_1.5rem] md:items-center md:gap-x-4";

const COLUMNS: { k: MetricKey; label: DictKey; unit: DictKey | null }[] = [
  { k: "deficit", label: "tbl.deficit", unit: "tbl.deficitUnit" },
  { k: "budget", label: "tbl.budget", unit: "tbl.budgetUnit" },
  { k: "soil", label: "tbl.soil", unit: "tbl.soilUnit" },
  { k: "margin", label: "tbl.margin", unit: "tbl.marginUnit" },
  { k: "risk", label: "tbl.risk", unit: null },
];

/** Display scale per metric: budget share as %, risk on its 0–1 scale. */
const SCALE: Record<MetricKey, number> = { deficit: 1, budget: 100, soil: 1, margin: 1, risk: 1 };
const DIGITS: Record<MetricKey, number> = { deficit: 0, budget: 0, soil: 0, margin: 0, risk: 2 };

interface Props {
  result: AnalysisResult;
  openId: string | null;
  onToggle: (id: string) => void;
  detailId: (planId: string) => string;
  renderDetail: (p: PlanResult) => ReactNode;
}

/**
 * Current plan + options (+ the user's plans) against five engine metrics. Each cell shows the value,
 * the direction against the current plan, and a mini bar on a shared column scale. Rows open details.
 */
export function CompareTable({ result, openId, onToggle, detailId, renderDetail }: Props) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  const plans = [result.current, ...result.alternatives, ...result.userPlans];
  const best = composeVerdict(result).best;
  const rainfed = result.scenario.budgetNetMm <= 0;

  const domains = Object.fromEntries(
    COLUMNS.map(({ k }) => {
      if (k === "budget" || k === "risk") return [k, [0, 1]];
      if (k === "soil") return [k, [0, 100]];
      const vals = plans.map((p) => planMetrics(p)[k]).filter((v): v is number => v !== null);
      return [k, [Math.min(0, ...vals), Math.max(1, ...vals)]];
    }),
  ) as Record<MetricKey, [number, number]>;

  return (
    <div>
      <h3 className="sr-only">{t("tbl.caption")}</h3>
      <div className={`${COLS} hidden border-b border-rule px-4 pb-2 text-sm text-ink-2`} aria-hidden="true">
        <span>{t("tbl.plan")}</span>
        {COLUMNS.map((c) => (
          <span key={c.k} className="leading-tight">
            <span className="block font-semibold text-ink">{t(c.label)}</span>
            {c.unit && <span className="block text-xs">{t(c.unit)}</span>}
          </span>
        ))}
        <span />
      </div>
      <ul className="divide-y divide-rule">
        {plans.map((p) => {
          const open = openId === p.id;
          const isBest = p === best;
          const m = planMetrics(p);
          return (
            <li key={p.id}>
              <button
                type="button"
                className={`cmp-row tap w-full rounded-xl px-4 py-4 text-left ${COLS} ${open ? "bg-panel" : ""}`}
                aria-expanded={open}
                aria-controls={open ? detailId(p.id) : undefined}
                onClick={() => onToggle(p.id)}
              >
                <span className="flex min-w-0 items-start justify-between gap-3 md:block">
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold ${p.kind === "current" ? "text-ink-2" : "text-sky"}`}>{title(p)}</span>
                      {isBest && <span className="rounded-full bg-ink px-2 py-0.5 text-[0.7rem] font-semibold leading-none text-paper">{t("tbl.best")}</span>}
                    </span>
                    <span className="mt-1 flex flex-wrap gap-x-2.5 gap-y-1 text-[0.95rem] font-medium leading-snug">
                      {p.crops.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5">
                          <CropSwatch id={c} size={11} />
                          {shortName(L(CROPS[c].name))}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="shrink-0 text-right md:mt-1 md:block md:text-left">
                    <span className="text-xs text-ink-2">{t("plan.score")} </span>
                    <span className="font-serif text-lg font-semibold tabular-nums">
                      <Num value={p.score.composite} />
                    </span>
                  </span>
                </span>

                <span className="mt-3 grid grid-cols-3 gap-x-3 gap-y-3 sm:grid-cols-5 md:contents">
                  {COLUMNS.map(({ k, label }) => {
                    const v = m[k];
                    const isRainfedBudget = k === "budget" && rainfed;
                    const delta = p.kind === "current" ? null : metricDelta(p, result.current, k);
                    const tone = deltaTone(k, delta, SAME_EPS[k]);
                    const [lo, hi] = domains[k];
                    const frac = v === null ? 0 : Math.max(0, Math.min(1, (v - lo) / (hi - lo || 1)));
                    return (
                      <span key={k} className="block min-w-0">
                        <span className="block text-xs text-ink-2 md:sr-only">{t(label)}</span>
                        {isRainfedBudget ? (
                          <span className="text-sm text-ink-2">{t("tbl.rainfed")}</span>
                        ) : k === "risk" ? (
                          <span className="block leading-tight">
                            <span className="font-serif text-[1.35rem] font-semibold">{t(`plan.risk.${p.risk.score < 1 / 3 ? "low" : p.risk.score < 2 / 3 ? "mid" : "high"}`)}</span>{" "}
                            <span className="text-xs text-ink-2 tabular-nums">
                              <Num value={v} digits={2} />
                            </span>
                          </span>
                        ) : (
                          <span className="block font-serif text-[1.35rem] font-semibold leading-tight tabular-nums">
                            <Num value={v === null ? null : v * SCALE[k]} digits={DIGITS[k]} />
                          </span>
                        )}
                        {!isRainfedBudget && (
                          <>
                            <span className="mt-1 block h-1 w-full max-w-[6.5rem] rounded-full bg-panel-2" aria-hidden="true">
                              <span
                                className="block h-full origin-left rounded-full transition-transform duration-200 ease-out"
                                style={{ transform: `scaleX(${frac})`, background: tone === "worse" ? "var(--bad)" : tone === "better" ? "var(--c-green)" : "var(--ink-2)" }}
                              />
                            </span>
                            {tone && (
                              <span className={`mt-1 flex items-center gap-1 text-xs font-semibold tabular-nums ${tone === "better" ? "text-[var(--c-green)]" : tone === "worse" ? "text-bad" : "text-ink-2"}`}>
                                <DeltaMark delta={tone === "same" ? 0 : delta} />
                                {tone !== "same" && (
                                  <span>
                                    {delta! > 0 ? "+" : "−"}
                                    <Num value={delta! * SCALE[k]} digits={DIGITS[k]} abs />
                                  </span>
                                )}
                                <span className="sr-only">{t(`tbl.${tone}`)}</span>
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    );
                  })}
                </span>

                <span className="hidden text-ink-2 transition-transform duration-200 md:block" style={{ transform: open ? "rotate(90deg)" : undefined }} aria-hidden="true">
                  <Chevron />
                </span>
              </button>
              {open && (
                <div id={detailId(p.id)} role="region" aria-label={t("tbl.detailOf", { plan: title(p) })} className="enter pb-4 pt-1">
                  {renderDetail(p)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
