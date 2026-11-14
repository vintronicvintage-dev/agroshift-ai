"use client";

import type { AnalysisResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";

export function AssumptionsPanel({ result, calibration }: { result: AnalysisResult; calibration: CalibrationInfo | null }) {
  const { t, L, n } = useI18n();
  return (
    <details className="card p-4" id="varsayimlar">
      <summary className="tap flex items-center font-semibold">
        <span className="chev mr-1.5 text-ink-2">›</span>
        {t("asm.title")} <span className="font-normal text-ink-2">({result.assumptions.length + 1})</span>
      </summary>
      <p className="mt-2 max-w-[75ch] text-sm text-ink-2">{t("asm.lead")}</p>

      <div className={`mt-3 rounded-md px-3 py-2 text-sm ${calibration ? "bg-sky-soft text-ink" : "bg-warn text-warn-ink"}`}>
        <span className="font-semibold">{t("asm.calibration")}: </span>
        {calibration
          ? (calibration.mode === "basin"
              ? t("cal.appliedBasinLong", { basin: calibration.basinNameTr ?? "MGM", station: n(calibration.stationMeanMm), model: n(calibration.modelMeanMm), f: n(calibration.factor, 3), n: calibration.years.length })
              : t("cal.appliedLong", { station: n(calibration.stationMeanMm), model: n(calibration.modelMeanMm), f: n(calibration.factor, 3), n: calibration.years.length }))
          : t("cal.caution")}
      </div>

      {result.scenario.notes.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold">{t("asm.scenarioNotes")}</p>
          <ul className="mt-1 list-disc pl-5 text-ink-2">
            {result.scenario.notes.map((x, i) => (
              <li key={i}>{L(x)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3 text-sm">
        <p className="font-semibold">{t("asm.optimizer")}</p>
        <p className="mt-1 max-w-[80ch] text-ink-2">{L(result.optimizer.method)}</p>
      </div>

      <div className="mt-3 max-h-[28rem] overflow-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="sticky top-0 bg-panel">
            <tr className="text-ink-2">
              <th className="py-1 pr-3 font-medium">{t("asm.param")}</th>
              <th className="py-1 pr-3 font-medium">{t("asm.value")}</th>
              <th className="py-1 pr-3 font-medium">{t("asm.source")}</th>
              <th className="py-1 font-medium">{t("asm.conf")}</th>
            </tr>
          </thead>
          <tbody>
            {result.assumptions.map((a) => (
              <tr key={a.key} className="border-t border-rule/60 align-top">
                <td className="py-1 pr-3">{L(a.label)}</td>
                <td className="py-1 pr-3 tabular-nums">{a.value}</td>
                <td className="py-1 pr-3 text-ink-2">{a.source}</td>
                <td className={`py-1 ${a.confidence === "assumption" ? "text-loam" : "text-ink-2"}`}>{t(`asm.conf.${a.confidence}`)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
