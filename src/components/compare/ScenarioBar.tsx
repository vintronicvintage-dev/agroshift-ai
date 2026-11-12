"use client";

import { SCENARIO_PRESETS } from "@/lib/engine";
import type { ScenarioPresetId } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";
import { Chevron } from "@/components/ui/Glyphs";

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

/** Three engine scenario presets as one segmented control; the four sliders sit under "Your own scenario". */
export function ScenarioBar({ value, onChange, fieldBudget, rainfed, running, status, calibration }: Props) {
  const { t, n, L } = useI18n();
  const set = (patch: Partial<ScenarioDraft>) => onChange({ ...value, ...patch, preset: "custom" });
  const budget = value.budgetOverride ?? fieldBudget ?? 0;
  const budgetMax = Math.max(800, Math.ceil(((fieldBudget ?? 0) * 2) / 50) * 50);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h3 id="sc-h" className="font-serif text-lg font-semibold">
          {t("sc.title")}
        </h3>
        <div className="seg max-w-full" role="radiogroup" aria-labelledby="sc-h">
          {SCENARIO_PRESETS.map((p) => (
            <label key={p.id}>
              <input type="radio" name="scenario" checked={value.preset === p.id} onChange={() => onChange({ ...value, ...p.scenario, preset: p.id })} />
              <span className="text-sm font-semibold">{L(p.label)}</span>
            </label>
          ))}
          {value.preset === "custom" && (
            <label>
              <input type="radio" name="scenario" checked readOnly />
              <span className="text-sm font-semibold">{t("sc.custom")}</span>
            </label>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-ink-2" aria-live="polite">
          <CalibrationBadge calibration={calibration} small />
          {running ? <span className="recalc font-medium text-sky">{t("sc.updating")}</span> : status && <span className="tabular-nums">{status}</span>}
        </div>
      </div>
      <details className="group mt-2">
        <summary className="tap inline-flex items-center gap-1.5 rounded-sm py-1 text-sm font-semibold text-sky">
          <span className="transition-transform duration-200 group-open:rotate-90">
            <Chevron size={12} />
          </span>
          {t("sc.own")}
        </summary>
        <div className="enter mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
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
      </details>
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
      <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled} aria-valuetext={display} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
