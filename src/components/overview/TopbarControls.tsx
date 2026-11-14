"use client";

import { SCENARIO_PRESETS } from "@/lib/engine";
import type { ScenarioPresetId } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { ScenarioDraft } from "@/components/compare/ScenarioBar";
import { HashLink } from "@/components/ui/HashLink";
import { Icon } from "@/components/ui/Icons";

/** Top bar: the selected field (opens My field) and the scenario preset, shared with Options. */
export function TopbarControls({ siteName, scenario, onScenario, running }: { siteName: string | null; scenario: ScenarioDraft; onScenario: (s: ScenarioDraft) => void; running: boolean }) {
  const { t, L } = useI18n();
  return (
    <>
      <HashLink to="tarlam" className="tap flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-rule bg-panel px-3 py-1.5 hover:border-rule-strong sm:flex-none sm:max-w-[22rem]">
        <span className={siteName ? "text-accent-ink" : "text-ink-2"}>
          <Icon name="pin" size={18} />
        </span>
        <span className="min-w-0 leading-tight">
          <span className="block text-[0.7rem] text-ink-2">{t("top.field")}</span>
          <span className={`block truncate text-[0.88rem] font-semibold ${siteName ? "" : "text-ink-2"}`}>{siteName ?? t("top.noField")}</span>
        </span>
      </HashLink>
      <label className="flex min-h-10 min-w-0 shrink items-center gap-2 rounded-[10px] border border-rule bg-panel pl-3 pr-1 hover:border-rule-strong">
        <span className={running ? "recalc text-accent-ink" : "text-ink-2"}>
          <Icon name="scenario" size={18} />
        </span>
        <span className="sr-only sm:not-sr-only sm:text-[0.78rem] sm:text-ink-2">{t("sc.title")}</span>
        <select
          className="min-h-9 min-w-0 max-w-[7.5rem] cursor-pointer sm:max-w-[13.5rem] truncate rounded-md bg-panel py-1 pr-1 text-[0.86rem] font-semibold text-ink"
          value={scenario.preset}
          onChange={(e) => {
            const id = e.target.value as ScenarioPresetId | "custom";
            const p = SCENARIO_PRESETS.find((x) => x.id === id);
            if (p) onScenario({ ...scenario, ...p.scenario, preset: p.id });
          }}
        >
          {SCENARIO_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {L(p.label)}
            </option>
          ))}
          {scenario.preset === "custom" && (
            <option value="custom" disabled>
              {t("sc.custom")}
            </option>
          )}
        </select>
      </label>
    </>
  );
}
