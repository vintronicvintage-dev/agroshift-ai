"use client";

import { CROPS } from "@/lib/engine";
import type { AnalysisResult, Dist, PlanResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import type { SourceRef } from "@/lib/ui/sources";
import { Traced, type Trace } from "@/components/trace/TraceProvider";
import { StripCalendar } from "./StripCalendar";
import { RangeBar } from "./RangeBar";
import { WhyPanel } from "./WhyPanel";
import { EconomicsBreakdownCard } from "./EconomicsBreakdownCard";

export interface CompareContext {
  result: AnalysisResult;
  calibration: CalibrationInfo | null;
  resolve: (name: string) => SourceRef;
  climateRefs: SourceRef[];
  areaDa: number;
  domains: { deficit: [number, number]; margin: [number, number] };
}

export function PlanCard({ plan, ctx, onRemove, id }: { plan: PlanResult; ctx: CompareContext; onRemove?: () => void; id?: string }) {
  const { t, n, L } = useI18n();
  const { result } = ctx;
  const sc = result.scenario;
  const isCurrent = plan.kind === "current";
  const title = plan.kind === "current" ? t("plan.current") : plan.kind === "recommended" ? t("plan.rec", { n: plan.rank ?? 0 }) : t("plan.user");
  const w = plan.water;
  const rainfed = sc.budgetNetMm <= 0;

  const fao = ctx.resolve("FAO-56");
  const saxton = ctx.resolve("Saxton & Rawls 2006");
  const fao33 = ctx.resolve("FAO-33");
  const baseInputs = (): [string, string][] => [
    [t("in.windows"), `${result.windows.count} (${result.windows.agYears[0] ?? "—"}–${result.windows.agYears.at(-1) ?? "—"})`],
    [t("in.budget"), `${n(sc.budgetNetMm)} mm`],
    [t("in.efficiency"), n(sc.irrigationEfficiency, 2)],
    [t("in.calibration"), ctx.calibration ? `×${n(ctx.calibration.factor, 3)}` : t("cal.none")],
    [t("in.rainMult"), `×${n(sc.rainMultiplier, 2)}`],
    [t("in.temp"), `+${n(sc.tempDeltaC, 1)} °C`],
    [t("in.texture"), result.soil.textureClassComputed],
    [t("in.soilTaw"), `${n(result.soil.tawMmPerM)} mm/m`],
  ];
  const distStr = (d: Dist | null, unit: string, digits = 0) => (d ? `P10 ${n(d.p10, digits)}, P50 ${n(d.p50, digits)}, P90 ${n(d.p90, digits)} ${unit} (n = ${d.n})` : t("plan.noData"));
  const yr = t("unit.yr");
  const calNote = ctx.calibration ? undefined : t("cal.caution");

  const tr = {
    score: (): Trace => ({
      title: `${title}: ${t("plan.score")}`,
      value: n(plan.score.composite),
      formula: t("f.score"),
      inputs: (["water", "income", "soil", "risk"] as const).map((k) => [t(`prio.${k}`), `${n(plan.score.components[k], 2)} × ${n(plan.score.weights[k], 2)}`]),
      sources: [{ name: t("nav.methods"), url: "/yontem" }],
    }),
    deficit: (): Trace => ({
      title: `${title}: ${t("plan.deficit")}`,
      value: distStr(w.requirementMmPerYr, `mm/${yr}`),
      formula: t("f.requirement"),
      inputs: baseInputs(),
      sources: [...ctx.climateRefs, fao, saxton],
      note: calNote,
    }),
    unmet: (): Trace => ({
      title: `${title}: ${t("plan.unmet")}`,
      value: `${distStr(w.unmetDeficitMmPerYr, `mm/${yr}`)}; ${distStr(w.unmetDeficitFieldM3PerYr, `m³/${yr}`)}`,
      formula: t("f.unmet"),
      inputs: [...baseInputs(), [t("in.area"), `${n(ctx.areaDa)} da`]],
      sources: [...ctx.climateRefs, fao, saxton],
      note: calNote,
    }),
    irrigation: (): Trace => ({
      title: `${title}: ${t("plan.irrigation")}`,
      value: `${distStr(w.irrigationNetMmPerYr, `m³/da/${yr}`)}; ${t("plan.irrigationGross", { v: n(w.irrigationGrossM3PerDaPerYr?.p50), e: n(sc.irrigationEfficiency, 2) })}`,
      formula: t("f.irrigation"),
      inputs: baseInputs(),
      sources: [...ctx.climateRefs, fao],
    }),
    budget: (): Trace => ({
      title: `${title}: ${t("plan.budgetYears")}`,
      value: w.budgetExceededShare === null ? t("plan.noData") : `${n(w.budgetExceededShare * 100)} %`,
      formula: t("f.budgetYear"),
      inputs: [...w.budgetExceededShareByYear.map((s, i): [string, string] => [t("field.year", { n: i + 1 }), s === null ? "—" : `${n(s * 100)} %`]), ...baseInputs()],
      sources: [...ctx.climateRefs, fao],
    }),
    soil: (): Trace => ({
      title: `${title}: ${t("plan.soil")}`,
      value: `${n(plan.soilHealth.score)} / 100`,
      formula: t("f.soil"),
      inputs: plan.soilHealth.components.map((c) => [L(c.label), `${n(c.value * c.weight, 1)} / ${c.weight} (${c.detail})`]),
      sources: [{ name: t("nav.methods"), url: "/yontem#agirliklar" }],
    }),
    margin: (): Trace => ({
      title: `${title}: ${t("plan.margin")} (${t("plan.marginTag")})`,
      value: distStr(plan.economics.grossMarginTLPerDaPerYr, `TL/da/${yr}`),
      formula: t("f.margin"),
      inputs: [[t("in.price"), `×${n(sc.priceMultiplier, 2)}`], [t("sc.waterPrice"), n(sc.waterPriceTLPerM3, 2)], ...baseInputs()],
      sources: [fao33, ctx.resolve("FAO-66"), { name: t("sc.econ"), url: "/yontem#urunler" }],
      note: t("sc.econHelp"),
    }),
    risk: (): Trace => ({
      title: `${title}: ${t("plan.risk")}`,
      value: n(plan.risk.score, 2),
      formula: t("f.risk"),
      inputs: (Object.keys(plan.risk.components) as (keyof PlanResult["risk"]["components"])[]).map((k) => [t(`plan.riskComp.${k}`), `${n(plan.risk.components[k], 2)} × ${n(plan.risk.weights[k], 2)}`]),
      sources: [...ctx.climateRefs, { name: t("nav.methods"), url: "/yontem#agirliklar" }],
    }),
  };

  // equal thirds of the 0–1 risk indicator (display only)
  const riskLevel = plan.risk.score < 1 / 3 ? "low" : plan.risk.score < 2 / 3 ? "mid" : "high";
  const cur = result.current;
  const delta = (a: Dist | null, b: Dist | null) => (a && b ? a.p50 - b.p50 : null);
  const dDef = isCurrent ? null : delta(w.requirementMmPerYr, cur.water.requirementMmPerYr);
  const dMar = isCurrent ? null : delta(plan.economics.grossMarginTLPerDaPerYr, cur.economics.grossMarginTLPerDaPerYr);
  const sign = (v: number) => (v > 0 ? "+" : "−");

  return (
    <article
      id={id}
      className={`flex min-w-0 flex-col rounded-xl border bg-panel p-4 sm:p-6 ${isCurrent ? "border-ink-2 border-dashed" : "border-rule"}`}
      aria-label={`${title}: ${plan.crops.map((c) => L(CROPS[c].name)).join(", ")}`}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${isCurrent ? "text-ink-2" : "text-ink"}`}>{title}</p>
          <h3 className="sec-title mt-0.5">{plan.crops.map((c) => L(CROPS[c].name)).join(", ")}</h3>
        </div>
        <div className="shrink-0 text-right">
          <Traced trace={tr.score} className="num-mid">
            {n(plan.score.composite)}
          </Traced>
          <p className="text-xs text-ink-2">{t("plan.score")}</p>
        </div>
      </header>

      <div className="mt-3">
        <StripCalendar crops={plan.crops} zone={result.zone} />
      </div>

      {!plan.feasible && plan.violations.length > 0 && (
        <div className="mt-3 rounded-md bg-warn px-3 py-2 text-sm text-warn-ink">
          <p className="font-semibold">{t("plan.infeasible")}</p>
          <ul className="mt-1 list-disc pl-4">
            {plan.violations.map((v, i) => (
              <li key={i}>{L(v.text)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-x-10 md:grid-cols-2">
      {/* water */}
      <section className="mt-4 border-t border-rule pt-3">
        <h4 className="text-[0.95rem] font-semibold">
          {t("plan.deficit")} <span className="lbl font-normal">({t("plan.deficitHelp")})</span>
        </h4>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <Traced trace={tr.deficit} className="num-hero">
            {n(w.requirementMmPerYr?.p50)}
          </Traced>
          <span className="unit">mm/{t("unit.yr")}</span>
          {dDef !== null && Math.abs(dDef) >= 1 && (
            <span className={`ml-1 text-sm font-semibold ${dDef < 0 ? "text-[var(--c-green)]" : "text-[var(--c-et0)]"}`}>
              {sign(dDef)}
              {n(Math.abs(dDef))} {t("plan.vsCurrent")}
            </span>
          )}
        </p>
        <RangeBar d={w.requirementMmPerYr} domain={ctx.domains.deficit} color="var(--c-precip)" label={t("plan.range", { lo: n(w.requirementMmPerYr?.p10), hi: n(w.requirementMmPerYr?.p90) })} />
        <p className="mt-1 text-xs text-ink-2 tabular-nums">{t("plan.range", { lo: n(w.requirementMmPerYr?.p10), hi: n(w.requirementMmPerYr?.p90) })} mm</p>

        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-ink-2">{t("plan.unmet")}</dt>
            <dd className="mt-0.5">
              <Traced trace={tr.unmet} className="text-base font-semibold">
                {n(w.unmetDeficitMmPerYr?.p50)} mm
              </Traced>
              <span className="block text-xs text-ink-2">
                P90 {n(w.unmetDeficitMmPerYr?.p90)} mm; {n(w.unmetDeficitFieldM3PerYr?.p50)} m³
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-ink-2">{t("plan.irrigation")}</dt>
            <dd className="mt-0.5">
              <Traced trace={tr.irrigation} className="text-base font-semibold">
                {n(w.irrigationNetMmPerYr?.p50)}
              </Traced>{" "}
              <span className="text-xs text-ink-2">
                m³/da {t("plan.irrigationOfBudget", { b: n(sc.budgetNetMm) })}
              </span>
              <span className="block text-xs text-ink-2">
                {t("plan.irrigationGross", { v: n(w.irrigationGrossM3PerDaPerYr?.p50), e: n(sc.irrigationEfficiency, 2) })}
              </span>
            </dd>
          </div>
        </dl>
        <div className="mt-3 text-sm">
          <p className="text-ink-2">{t("plan.budgetYears")}</p>
          {rainfed ? (
            <p className="mt-0.5">{t("plan.rainfedNote")}</p>
          ) : (
            <Traced trace={tr.budget} className="mt-0.5 block text-left">
              {w.budgetExceededShareByYear.every((s) => !s) ? (
                t("plan.budgetNever")
              ) : (
                <span className="flex flex-wrap gap-x-3">
                  {w.budgetExceededShareByYear.map((s, i) =>
                    s ? (
                      <span key={i} className="font-semibold text-[var(--c-et0)]">
                        {t("plan.budgetYearShare", { y: i + 1, k: Math.round(s * result.windows.count), n: result.windows.count })}
                      </span>
                    ) : null,
                  )}
                </span>
              )}
            </Traced>
          )}
        </div>
      </section>

      {/* soil */}
      <section className="mt-4 border-t border-rule pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-[0.95rem] font-semibold">{t("plan.soil")}</h4>
          <p>
            <Traced trace={tr.soil} className="num-mid">
              {n(plan.soilHealth.score)}
            </Traced>
            <span className="text-sm text-ink-2"> / 100</span>
          </p>
        </div>
        <ul className="mt-2 space-y-1">
          {plan.soilHealth.components.map((c) => (
            <li key={c.key} className="grid grid-cols-[1fr_6rem] items-center gap-3 text-[0.8125rem]" title={c.detail}>
              <span className="truncate text-ink-2">{L(c.label)}</span>
              <span className="relative h-2 rounded-full bg-paper" aria-label={`${n(c.value * c.weight, 1)} / ${c.weight}`} role="img">
                <span className="absolute inset-y-0 left-0 rounded-full bg-[var(--c-green)]" style={{ width: `${c.value * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-1 text-xs text-ink-2">{t("plan.soilNote")}</p>
      </section>

      {/* margin */}
      <section className="mt-4 border-t border-rule pt-3">
        <h4 className="flex items-center gap-2 text-[0.95rem] font-semibold">
          {t("plan.margin")}
          <span className="rounded-full border border-loam px-2 text-xs font-medium text-loam">{t("plan.marginTag")}</span>
        </h4>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <Traced trace={tr.margin} className="num-mid">
            {n(plan.economics.grossMarginTLPerDaPerYr?.p50)}
          </Traced>
          <span className="unit">TL/da/{t("unit.yr")}</span>
          {dMar !== null && Math.abs(dMar) >= 1 && (
            <span className={`text-sm font-semibold ${dMar > 0 ? "text-[var(--c-green)]" : "text-[var(--c-et0)]"}`}>
              {sign(dMar)}
              {n(Math.abs(dMar))}
            </span>
          )}
        </p>
        <RangeBar d={plan.economics.grossMarginTLPerDaPerYr} domain={ctx.domains.margin} color="var(--loam)" label={t("plan.marginHelp")} />
        <p className="mt-1 text-xs text-ink-2 tabular-nums">
          {t("plan.range", { lo: n(plan.economics.grossMarginTLPerDaPerYr?.p10), hi: n(plan.economics.grossMarginTLPerDaPerYr?.p90) })} TL/da
          <br />
          {t("plan.fieldTotal", { v: `${n(plan.economics.fieldTotal3yrTL?.p50)} TL` })}
        </p>
      </section>

      {/* risk */}
      <section className="mt-4 border-t border-rule pt-3">
        <div className="flex items-baseline justify-between gap-2">
          <h4 className="text-[0.95rem] font-semibold">{t("plan.risk")}</h4>
          <Traced trace={tr.risk} className={`font-semibold ${riskLevel === "high" ? "text-bad" : riskLevel === "mid" ? "text-[var(--c-et0)]" : "text-[var(--c-green)]"}`}>
            {t(`plan.risk.${riskLevel}`)} ({n(plan.risk.score, 2)})
          </Traced>
        </div>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[0.8125rem] text-ink-2 sm:grid-cols-2">
          {(Object.keys(plan.risk.components) as (keyof PlanResult["risk"]["components"])[]).map((k) => (
            <li key={k} className="flex justify-between gap-2">
              <span className="truncate">{t(`plan.riskComp.${k}`)}</span>
              <span className="tabular-nums">{n(plan.risk.components[k], 2)}</span>
            </li>
          ))}
        </ul>
      </section>
      </div>

      {/* Engine v2: Pre-crop N credit, soil cover, RUSLE erosion, climate robustness & sensitivity */}
      {(plan.preCrop || plan.nitrogen || plan.cover || plan.erosion || plan.confidence || plan.stability || plan.robust) && (
        <div className="mt-4 grid gap-x-10 gap-y-4 border-t border-rule pt-3 md:grid-cols-2">
          {(plan.preCrop || plan.nitrogen || plan.cover || plan.erosion) && (
            <section className="space-y-1.5 text-sm">
              <h4 className="text-[0.95rem] font-semibold">{t("v2.sec.agro")}</h4>
              {plan.preCrop && plan.preCrop.length > 0 && (
                <ul className="space-y-1 text-[0.8125rem] text-ink-2">
                  {plan.preCrop.map((pc, i) => (
                    <li key={i}>
                      {t("v2.precrop.row", {
                        y: pc.year,
                        prev: L(CROPS[pc.prev].name),
                        crop: L(CROPS[pc.cropId].name),
                        f: n(pc.yieldFactor, 2),
                        nLow: n(pc.nCreditKgHa.low),
                        nHigh: n(pc.nCreditKgHa.high),
                        save: n(pc.nCostSavingTLPerDa),
                      })}
                    </li>
                  ))}
                </ul>
              )}
              {plan.nitrogen && (
                <p className="text-[0.8125rem] text-ink-2 tabular-nums">
                  {t("v2.nitrogen.row", {
                    fix: `${n(plan.nitrogen.fixationKgHaYr.low)}–${n(plan.nitrogen.fixationKgHaYr.high)}`,
                    rem: `${n(plan.nitrogen.removalKgHaYr.low)}–${n(plan.nitrogen.removalKgHaYr.high)}`,
                    bal: `${n(plan.nitrogen.balanceKgHaYr.low)}…${n(plan.nitrogen.balanceKgHaYr.high)}`,
                  })}
                </p>
              )}
              {plan.cover && (
                <p className="text-[0.8125rem] text-ink-2 tabular-nums">
                  {t("v2.cover.row", {
                    cov: n(plan.cover.coveredDaysByMonth.reduce((a, b) => a + b, 0)),
                    est: n(plan.cover.establishingDaysByMonth.reduce((a, b) => a + b, 0)),
                    bare: n(plan.cover.bareDaysByMonth.reduce((a, b) => a + b, 0)),
                  })}
                </p>
              )}
              {plan.erosion && (
                <p className="text-[0.8125rem] text-ink-2 tabular-nums">
                  {plan.erosion.aTHaYr !== null && plan.erosion.class
                    ? t("v2.erosion.row", {
                        a: n(plan.erosion.aTHaYr, 1),
                        cls: t(`v2.erosion.${plan.erosion.class}`),
                        c: n(plan.erosion.cFactor, 2),
                      })
                    : t("v2.erosion.noSlope", { c: n(plan.erosion.cFactor, 2) })}
                </p>
              )}
            </section>
          )}

          {(plan.confidence || plan.stability || plan.robust) && (
            <section className="space-y-1.5 text-sm">
              <h4 className="text-[0.95rem] font-semibold">{t("v2.sec.robust")}</h4>
              {plan.confidence && (
                <p className="text-[0.8125rem] text-ink-2">
                  <span className="font-medium text-ink">
                    {t("v2.conf.row", { grade: plan.confidence.grade, score: n(plan.confidence.score) })}
                  </span>
                  {plan.confidence.reasons.length > 0 && (
                    <span className="block text-xs text-ink-2">
                      {plan.confidence.reasons.map((r) => L(r)).join(" · ")}
                    </span>
                  )}
                </p>
              )}
              {plan.stability && (
                <p className="text-[0.8125rem] text-ink-2 tabular-nums">
                  {t("v2.stability.row", {
                    pct: n(plan.stability.top3Share * 100),
                    runs: plan.stability.runs,
                  })}
                </p>
              )}
              {plan.robust && (
                <p className="text-[0.8125rem] text-ink-2 tabular-nums">
                  {t("v2.robust.row", {
                    cvar: n(plan.robust.cvar20MarginTLPerDaPerYr),
                    regret: n(plan.robust.maxRegret, 1),
                  })}
                </p>
              )}
            </section>
          )}
        </div>
      )}

      {plan.warnings && plan.warnings.length > 0 && (
        <section className="mt-4 rounded-lg border border-rule bg-paper px-3.5 py-2.5 text-sm">
          <h4 className="text-xs font-semibold tracking-wide text-ink-2 uppercase">{t("v2.sec.warnings")}</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[0.8125rem] text-ink">
            {plan.warnings.map((wItem, i) => (
              <li key={i}>{L(wItem.text)}</li>
            ))}
          </ul>
        </section>
      )}

      <WhyPanel explanation={plan.explanation} resolve={ctx.resolve} extraGaps={ctx.calibration ? undefined : [t("cal.caution")]} />

      <EconomicsBreakdownCard plan={plan} />

      {onRemove && (
        <button type="button" className="btn mt-4 self-start" onClick={onRemove}>
          {t("plan.remove")}
        </button>
      )}
    </article>
  );
}
