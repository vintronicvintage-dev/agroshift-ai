"use client";

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
}

/** Step 2: the verdict first, then the comparison table; everything deeper opens on request. */
export function ResultsStep(p: Props) {
  const { t, n } = useI18n();
  const { result, ctx, openId } = p;

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
            </div>
          </header>

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
