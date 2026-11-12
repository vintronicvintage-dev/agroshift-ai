"use client";

import { useState } from "react";
import type { AnalysisResult, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { composeVerdict } from "@/lib/ui/verdict";
import { JudgmentNote } from "@/components/shell/JudgmentNote";
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
}

/** Step 2: the verdict first, then the comparison table; everything deeper opens on request. */
export function ResultsStep(p: Props) {
  const { t, n } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const { result, ctx } = p;

  return (
    <div className="space-y-8">
      {p.error && (
        <p className="rounded-xl bg-warn px-4 py-3 text-warn-ink" role="alert">
          {t("run.error", { msg: p.error })}
        </p>
      )}

      {result && ctx ? (
        <>
          <header className={p.running ? "opacity-80 transition-opacity" : undefined}>
            <Verdict result={result} />
            <p className="mt-3 max-w-[80ch] text-sm text-ink-2">
              {t("v.basis", { s: n(composeVerdict(result).best.score.composite), w: result.windows.count })} {t("step.compare.lead")}
            </p>
            <div className="mt-4">
              <JudgmentNote compact />
            </div>
          </header>

          <ScenarioBar value={p.scenario} onChange={p.onScenario} fieldBudget={p.fieldBudget} rainfed={p.rainfed} running={p.running} status={p.status} calibration={p.calibration} />

          <div className={p.running ? "opacity-80 transition-opacity" : undefined}>
            <CompareTable
              result={result}
              openId={openId}
              onToggle={(id) => setOpenId((o) => (o === id ? null : id))}
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
              <span className="font-serif text-xl font-semibold">{t("more.title")}</span>
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
        <p className={`rounded-2xl border border-dashed border-rule px-4 py-12 text-center text-ink-2 ${p.running ? "recalc" : ""}`}>{p.running ? t("run.first") : t("run.waiting")}</p>
      )}
    </div>
  );
}
