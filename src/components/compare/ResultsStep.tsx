"use client";

import { useState } from "react";
import { CROPS } from "@/lib/engine";
import type { AnalysisResult, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { composeVerdict } from "@/lib/ui/verdict";
import { JudgmentNote } from "@/components/shell/JudgmentNote";
import { EmptyArt } from "@/components/ui/EmptyArt";
import { Chevron } from "@/components/ui/Glyphs";
import { AssumptionsPanel } from "./AssumptionsPanel";
import { CompareTable } from "./CompareTable";
import { EconomicsEditor, type EconDraft } from "./EconomicsEditor";
import { ParetoChart } from "./ParetoChart";
import { PlanCard, type CompareContext } from "./PlanCard";
import { RotationBuilder } from "./RotationBuilder";
import { ScenarioBar, type ScenarioDraft } from "./ScenarioBar";
import { Verdict } from "./Verdict";

interface Props {
  result: AnalysisResult | null;
  ctx: CompareContext | null;
  running: boolean;
  error: string | null;
  status: string | null;
  scenario: ScenarioDraft;
  onScenario: (s: ScenarioDraft) => void;
  fieldBudget: number | null;
  rainfed: boolean;
  calibration: CalibrationInfo | null;
  econ: EconDraft;
  onEcon: (e: EconDraft) => void;
  extraPlans: RotationSequence[];
  onExtraPlans: (f: (xs: RotationSequence[]) => RotationSequence[]) => void;
  /** The plan whose detail is open (lifted so the overview table can open one). */
  openId: string | null;
  onOpenId: (id: string | null) => void;
  onBuildShareUrl?: () => string;
}

/** Step 2: the verdict first, then the comparison table; everything deeper opens on request. */
export function ResultsStep(p: Props) {
  const { t, n, L } = useI18n();
  const { result, ctx, openId } = p;
  const [copied, setCopied] = useState(false);

  const exportCsv = () => {
    if (!result) return;
    const plans = [result.current, ...result.alternatives, ...result.userPlans];
    const header = [
      "Plan ID",
      t("tbl.plan"),
      t("plan.score"),
      `${t("tbl.water")} (mm/${t("unit.yr")})`,
      "P10-P90 Water (mm)",
      `${t("tbl.margin")} (TL/da/${t("unit.yr")})`,
      "P10-P90 Margin (TL/da)",
      t("tbl.soil"),
      t("tbl.risk"),
      "Confidence Grade",
      "Stability (%)",
      "RUSLE C",
    ];
    const rows = plans.map((pl) => {
      const names = pl.crops.map((c) => L(CROPS[c].name)).join(" -> ");
      const wMed = pl.water.requirementMmPerYr ? Math.round(pl.water.requirementMmPerYr.median) : "";
      const wBand = pl.water.requirementMmPerYr
        ? `${Math.round(pl.water.requirementMmPerYr.p10)}-${Math.round(pl.water.requirementMmPerYr.p90)}`
        : "";
      const mMed = pl.economics.grossMarginTLPerDaPerYr ? Math.round(pl.economics.grossMarginTLPerDaPerYr.median) : "";
      const mBand = pl.economics.grossMarginTLPerDaPerYr
        ? `${Math.round(pl.economics.grossMarginTLPerDaPerYr.p10)}-${Math.round(pl.economics.grossMarginTLPerDaPerYr.p90)}`
        : "";
      return [
        pl.id,
        `"${names.replace(/"/g, '""')}"`,
        pl.score.composite,
        wMed,
        `"${wBand}"`,
        mMed,
        `"${mBand}"`,
        pl.soilHealth.total,
        pl.risk.level,
        pl.confidence?.grade ?? "",
        pl.sensitivity?.stabilityPct ?? "",
        pl.erosion?.cFactor ?? "",
      ].join(",");
    });
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agroshift-karsilastirma.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10">
      {p.error && (
        <p className="rounded-xl bg-warn px-4 py-3 text-warn-ink" role="alert">
          {t("run.error", { msg: p.error })}
        </p>
      )}

      {result && ctx ? (
        <>
          <header className={`grid gap-x-10 gap-y-6 xl:grid-cols-[minmax(0,1fr)_20rem] ${p.running ? "opacity-80 transition-opacity" : ""}`}>
            <Verdict result={result} />
            <div className="space-y-4 xl:border-l xl:border-rule xl:pl-6">
              <p className="flex items-baseline gap-2">
                <span className="lbl">{t("plan.score")}</span>
                <span className="readout text-[length:var(--text-step-3)] text-accent-ink">{n(composeVerdict(result).best.score.composite)}</span>
                <span className="unit">/100</span>
              </p>
              <p className="lbl max-w-[60ch]">
                {t("v.basis", { s: n(composeVerdict(result).best.score.composite), w: result.windows.count })} {t("step.compare.lead")}
              </p>
              <JudgmentNote compact />
              <div className="print-hide flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  className="btn text-sm"
                  onClick={() => {
                    if (!openId) p.onOpenId(composeVerdict(result).best.id);
                    setTimeout(() => window.print(), 80);
                  }}
                >
                  {t("v2.printSummary")}
                </button>
                {p.onBuildShareUrl && (
                  <button
                    type="button"
                    className="btn text-sm"
                    onClick={() => {
                      const url = p.onBuildShareUrl?.();
                      if (!url) return;
                      void navigator.clipboard?.writeText(url);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                  >
                    {copied ? t("v2.shareCopied") : t("v2.shareLink")}
                  </button>
                )}
                <button type="button" className="btn text-sm" onClick={exportCsv}>
                  {t("v2.exportCsv")}
                </button>
              </div>
            </div>
          </header>

          {result.precipUncertainty && result.precipUncertainty.sources.length > 1 && (
            <div className="rounded-xl border border-rule bg-panel px-4 py-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">{t("v2.precipUnc.title")}</span>
                <span className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2 tabular-nums">
                  {result.precipUncertainty.sources.map((s) => (
                    <span key={s.id}>
                      {L(s.label)}: <strong className="text-ink">{n(s.annualMm)} mm/{t("unit.yr")}</strong>
                    </span>
                  ))}
                </span>
              </div>
              <p className="mt-1 text-xs text-ink-2">
                {L(result.precipUncertainty.note)}{" "}
                {result.precipUncertainty.sensitive !== null && (
                  <span className="font-medium text-ink">
                    {result.precipUncertainty.sensitive ? t("v2.precipUnc.sensitive") : t("v2.precipUnc.stable")}
                  </span>
                )}
              </p>
            </div>
          )}

          <ScenarioBar value={p.scenario} onChange={p.onScenario} fieldBudget={p.fieldBudget} rainfed={p.rainfed} running={p.running} status={p.status} calibration={p.calibration} />

          <div className={p.running ? "opacity-80 transition-opacity" : undefined}>
            <CompareTable
              result={result}
              openId={openId}
              onToggle={(id) => p.onOpenId(openId === id ? null : id)}
              detailId={(id) => `detay-${id}`}
              renderDetail={(plan) => (
                <PlanCard
                  plan={plan}
                  ctx={ctx}
                  onRemove={plan.kind === "user" ? () => p.onExtraPlans((xs) => xs.filter((x) => x.join() !== plan.crops.join())) : undefined}
                />
              )}
            />
          </div>

          <details className="group border-t border-rule pt-4">
            <summary className="tap flex items-baseline gap-2 rounded-sm">
              <span className="self-center text-ink-2 transition-transform duration-200 group-open:rotate-90">
                <Chevron />
              </span>
              <span className="sec-title">{t("more.title")}</span>
              <span className="hidden text-sm text-ink-2 sm:inline">{t("more.sub")}</span>
            </summary>
            <div className="enter mt-5 space-y-6">
              <ParetoChart result={result} />
              <RotationBuilder existing={[result.current.crops, ...result.alternatives.map((a) => a.crops), ...p.extraPlans]} onAdd={(r) => p.onExtraPlans((xs) => [...xs, r])} />
              <EconomicsEditor value={p.econ} onChange={p.onEcon} />
              <AssumptionsPanel result={result} calibration={p.calibration} />
            </div>
          </details>
        </>
      ) : (
        <div className="sec flex items-center gap-4">
          <EmptyArt kind="options" size={120} />
          <p className={`text-ink-2 ${p.running ? "recalc" : ""}`}>{p.running ? t("run.first") : t("run.waiting")}</p>
        </div>
      )}
    </div>
  );
}
