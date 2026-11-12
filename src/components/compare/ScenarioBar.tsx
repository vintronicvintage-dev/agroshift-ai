"use client";

import { SCENARIO_PRESETS } from "@/lib/engine";
import type { ScenarioPresetId } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";

export interface ScenarioDraft {
  preset: ScenarioPresetId | "custom";
  rainMultiplier: number;
  tempDeltaC: number;
  priceMultiplier: number;
  /** null = use the field's budget */
  budgetOverride: number | null;
}

export const DEFAULT_SCENARIO: ScenarioDraft = { preset: "typical", ...SCENARIO_PRESETS[0].scenario, budgetOverride: null };

interface Props {
  value: ScenarioDraft;
  onChange: (v: ScenarioDraft) => void;
  fieldBudget: number | null;
  rainfed: boolean;
  running: boolean;
  status: string | null;
  calibration: CalibrationInfo | null;
}

export function ScenarioBar({ value, onChange, fieldBudget, rainfed, running, status, calibration }: Props) {
  const { t, n, L } = useI18n();
  const set = (patch: Partial<ScenarioDraft>) => onChange({ ...value, ...patch, preset: "custom" });
  const budget = value.budgetOverride ?? fieldBudget ?? 0;
  const budgetMax = Math.max(800, Math.ceil(((fieldBudget ?? 0) * 2) / 50) * 50);
  return (
    <div className="rounded-lg border border-rule bg-panel p-4 shadow-[0_1px_0_var(--rule)] lg:sticky lg:top-0 lg:z-[500]">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 className="font-serif text-lg font-semibold">{t("sc.title")}</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("sc.presets")}>
          {SCENARIO_PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn" aria-pressed={value.preset === p.id} onClick={() => onChange({ ...value, ...p.scenario, preset: p.id })}>
              {L(p.label)}
            </button>
          ))}
          {value.preset === "custom" && (
            <span className="btn" aria-pressed="true">
              {t("sc.custom")}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-ink-2" aria-live="polite">
          <CalibrationBadge calibration={calibration} small />
          {running ? <span className="recalc font-medium text-sky">{t("sc.updating")}</span> : status && <span className="tabular-nums">{status}</span>}
        </div>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <Slider id="sc-rain" label={t("sc.rain")} value={value.rainMultiplier} min={0.6} max={1.2} step={0.05} display={`×${n(value.rainMultiplier, 2)} (${value.rainMultiplier >= 1 ? "+" : "−"}${n(Math.abs(value.rainMultiplier - 1) * 100)} %)`} onChange={(v) => set({ rainMultiplier: v })} />
        <Slider id="sc-temp" label={t("sc.temp")} value={value.tempDeltaC} min={0} max={4} step={0.5} display={`+${n(value.tempDeltaC, 1)} °C`} onChange={(v) => set({ tempDeltaC: v })} />
        <Slider
          id="sc-budget"
          label={t("sc.budget")}
          value={rainfed ? 0 : budget}
          min={0}
          max={budgetMax}
          step={10}
          disabled={rainfed}
          display={rainfed ? t("field.rainfed") : `${n(budget)} m³/da`}
          onChange={(v) => set({ budgetOverride: v })}
        />
        <Slider id="sc-price" label={t("sc.price")} value={value.priceMultiplier} min={0.5} max={1.5} step={0.05} display={`×${n(value.priceMultiplier, 2)}`} onChange={(v) => set({ priceMultiplier: v })} />
      </div>
    </div>
  );
}

function Slider({ id, label, value, min, max, step, display, onChange, disabled }: { id: string; label: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <div className={disabled ? "opacity-60" : undefined}>
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <label htmlFor={id} className="text-ink-2">
          {label}
        </label>
        <output htmlFor={id} className="font-semibold tabular-nums">
          {display}
        </output>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
