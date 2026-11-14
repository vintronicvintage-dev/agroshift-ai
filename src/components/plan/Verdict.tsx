"use client";

import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { setInputs, useStore } from "@/lib/ui/fieldStore";
import { weightsForPreset, priorityPresetFor } from "@/lib/ui/presets";
import { Traced } from "@/components/trace/TraceProvider";
import { Icon } from "@/components/ui/Icons";
import { JudgmentNote } from "@/components/shell/AppShell";
import { GradeBadge, planLabel, Sequence, signed, useL } from "./planKit";
import { irrigations, outOf } from "./units";

/** The plan with the highest typical-year income among the exactly evaluated plans. */
export function incomeBest(r: AnalysisResult): PlanResult | null {
  const pool = [r.current, ...r.alternatives, ...(r.robustBest ? [r.robustBest] : []), ...r.userPlans];
  let best: PlanResult | null = null;
  for (const p of pool) {
    const m = p.economics.grossMarginTLPerDaPerYr?.p50;
    if (m === undefined) continue;
    if (!best || m > (best.economics.grossMarginTLPerDaPerYr?.p50 ?? -Infinity)) best = p;
  }
  return best;
}

export function headline(best: PlanResult, lang: "tr" | "en", t: ReturnType<typeof useI18n>["t"], n: ReturnType<typeof useI18n>["n"]): string {
  const tr = best.trade;
  const seq = planLabel(best, lang);
  const dw = tr?.waterDiffM3PerDaPerYr ?? null;
  const dm = tr?.marginDiffTLPerDaPerYr ?? null;
  if (dw === null || dm === null) return t("v.headPlain", { seq });
  const w = n(Math.abs(dw));
  const m = n(Math.abs(dm));
  if (Math.abs(dw) < 1) return t(dm >= 0 ? "v.headSameWaterMoreMoney" : "v.headSameWaterLessMoney", { seq, m });
  if (dw <= 0 && dm < 0) return t("v.headLessWaterLessMoney", { seq, w, m });
  if (dw <= 0 && dm >= 0) return t("v.headLessWaterMoreMoney", { seq, w, m });
  if (dw > 0 && dm >= 0) return t("v.headMoreWaterMoreMoney", { seq, w, m });
  return t("v.headMoreWaterLessMoney", { seq, w, m });
}

export function Verdict({ result, onOpen }: { result: AnalysisResult; onOpen: (id: string) => void }) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const s = useStore();
  const best = result.alternatives[0] ?? null;
  if (!best) return <p className="text-[15px]">{t("v.none")}</p>;
  const tr = best.trade;
  const robust = result.robustBestId && result.robustBestId !== result.typicalBestId ? [...result.alternatives, ...(result.robustBest ? [result.robustBest] : [])].find((p) => p.id === result.robustBestId) ?? null : null;
  const rich = incomeBest(result);
  const curMargin = result.current.economics.grossMarginTLPerDaPerYr?.p50 ?? null;
  const incomeMode = priorityPresetFor(s.inputs.priorities) === "income";
  const area = s.inputs.areaOverrideDa ?? s.field?.areaDa ?? 0;
  return (
    <section aria-labelledby="hukum-h" className="panel overflow-hidden">
      <div className="border-b border-line p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="label">{t("v.kicker")}</p>
          {best.confidence && <GradeBadge grade={best.confidence.grade} />}
        </div>
        <div className="mt-2">
          <Sequence crops={best.crops} />
        </div>
        <h2 id="hukum-h" className="display mt-3 max-w-[40ch] text-[26px] sm:text-[32px]">
          {headline(best, lang, t, n)}
        </h2>
        {tr && (
          <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="text-[13px] text-ink-2">{t("v.water")}</dt>
              <dd>
                <Traced
                  trace={() => ({
                    title: t("v.water"),
                    value: `${signed(tr.waterDiffM3PerDaPerYr ?? 0, n)} ${t("u.tonDa")}`,
                    formula: t("trace.water"),
                    inputs: [
                      [t("plan.mine"), `${n(result.current.water.irrigationNetMmPerYr?.p50 ?? null)} ${t("u.tonDa")}`],
                      [t("v.kicker"), `${n(best.water.irrigationNetMmPerYr?.p50 ?? null)} ${t("u.tonDa")}`],
                      [t("trace.windows"), String(tr.windows)],
                    ],
                    sources: [{ name: "FAO-56", url: "/yontem#formuller" }, { name: "NASA POWER", url: "https://power.larc.nasa.gov/" }],
                  })}
                >
                  <span className="numeral text-[56px]">
                    {signed(tr.waterDiffM3PerDaPerYr ?? 0, n)}
                    <span className="unit">{t("u.tonDa")}</span>
                  </span>
                </Traced>
                <span className="block text-[13px] text-ink-2">{t("v.waterSub", { k: n(Math.abs(irrigations(tr.waterDiffM3PerDaPerYr ?? 0)), 1) })}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">{t("v.money")}</dt>
              <dd>
                <Traced
                  trace={() => ({
                    title: t("v.money"),
                    value: `${signed(tr.marginDiffTLPerDaPerYr ?? 0, n)} ${t("u.tlDa")}`,
                    formula: t("trace.money"),
                    inputs: [
                      [t("plan.mine"), `${n(curMargin)} ${t("u.tlDa")}`],
                      [t("v.kicker"), `${n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? null)} ${t("u.tlDa")}`],
                      [t("trace.area"), `${n(area)} ${t("u.da")}`],
                    ],
                    sources: [{ name: t("trace.prices"), url: "/yontem#varsayimlar" }],
                    note: t("trace.scenarioNote"),
                  })}
                >
                  <span className="numeral text-[56px]">
                    {signed(tr.marginDiffTLPerDaPerYr ?? 0, n)}
                    <span className="unit">{t("u.tlDa")}</span>
                  </span>
                </Traced>
                <span className="block text-[13px] text-ink-2">{tr.fieldMarginDiffTLPerYr !== null ? t("v.moneySub", { tl: signed(tr.fieldMarginDiffTLPerYr, n) }) : ""}</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-ink-2">{t("v.ok")}</dt>
              <dd>
                <span className="numeral text-[56px]">
                  {tr.okWindowsPlan}
                  <span className="unit">/ {tr.windows}</span>
                </span>
                <span className="block text-[13px] text-ink-2">{t("v.okSub", { s: outOf(tr.okWindowsCurrent, tr.windows, lang) })}</span>
              </dd>
            </div>
          </dl>
        )}
      </div>

      {best.narrative && (
        <div className="grid gap-px bg-line sm:grid-cols-3">
          <Col title={t("v.gains")} icon="check" items={best.narrative.gains.map((g) => L(g.text))} empty={t("v.noneItems")} />
          <Col title={t("v.losses")} icon="minus" items={best.narrative.losses.map((g) => L(g.text))} empty={t("v.noLoss")} />
          <Col title={t("v.watch")} icon="alert" items={best.narrative.watch.map((g) => L(g.text))} empty={t("v.noneItems")} />
        </div>
      )}

      <div className="space-y-3 border-t border-line p-4 sm:p-6">
        {rich && rich.id !== best.id && (
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line-strong p-3.5">
            <div className="min-w-0">
              <p className="text-[14px] font-semibold">{t("v.richTitle")}</p>
              <p className="mt-0.5 text-[14px]">
                {rich.kind === "current"
                  ? t("v.richIsMine", { m: n(rich.economics.grossMarginTLPerDaPerYr?.p50 ?? null) })
                  : t("v.richOther", { seq: planLabel(rich, lang), m: n(rich.economics.grossMarginTLPerDaPerYr?.p50 ?? null), w: n(rich.water.requirementMmPerYr?.p50 ?? null) })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {rich.kind !== "current" && (
                <button type="button" className="btn" onClick={() => onOpen(rich.id)}>
                  {t("v.openPlan")}
                </button>
              )}
              {!incomeMode && (
                <button type="button" className="btn" onClick={() => setInputs({ priorities: weightsForPreset("income") })}>
                  {t("v.incomeFirst")}
                </button>
              )}
            </div>
          </div>
        )}
        {robust && (
          <div className="rounded-md border border-line-strong p-3.5">
            <p className="text-[14px] font-semibold">{t("v.robustTitle")}</p>
            <p className="mt-0.5 text-[14px]">{t("v.robustBody", { typ: planLabel(best, lang), rob: planLabel(robust, lang) })}</p>
            <button type="button" className="btn mt-2" onClick={() => onOpen(robust.id)}>
              {t("v.openPlan")}
            </button>
          </div>
        )}
        {result.robustBestId && result.robustBestId === result.typicalBestId && <p className="text-[13px] text-ink-2">{t("v.robustSame")}</p>}
        {best.confidence && (
          <details>
            <summary className="tap text-[14px] font-medium">
              <span className="chev mr-1.5 text-ink-2">›</span>
              {t("v.confWhy", { g: best.confidence.grade, s: n(best.confidence.score) })}
            </summary>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[14px] text-ink-2">
              {best.confidence.reasons.map((r, i) => (
                <li key={i}>{L(r)}</li>
              ))}
            </ul>
          </details>
        )}
        <p className="text-[13px] text-ink-2">{t(`v.rain.${s.precip.mode}`)}</p>
        <JudgmentNote />
      </div>
    </section>
  );
}

function Col({ title, icon, items, empty }: { title: string; icon: "check" | "minus" | "alert"; items: string[]; empty: string }) {
  return (
    <div className="bg-surface p-4 sm:p-5">
      <h3 className="flex items-center gap-2 text-[15px] font-semibold">
        <Icon name={icon} size={18} className="text-ink-2" />
        {title}
      </h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-[14px]">
          {items.map((x, i) => (
            <li key={i} className="border-l-2 border-line-strong pl-2.5">
              {x}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[14px] text-ink-2">{empty}</p>
      )}
    </div>
  );
}
