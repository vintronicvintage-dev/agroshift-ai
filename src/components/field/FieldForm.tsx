"use client";

import type { ReactNode } from "react";
import { CROPS, CROP_IDS } from "@/lib/engine";
import type { CropId, PriorityWeights, SoilProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { METHOD_EFF, type FieldCheck, type FieldDraft, type IrrigationMethod, type SoilCheck, type SoilDraft } from "@/lib/ui/fieldState";
import { CropSelect } from "@/components/compare/RotationBuilder";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";

interface Props {
  draft: FieldDraft;
  onDraft: (d: FieldDraft) => void;
  soil: SoilDraft | null;
  onSoil: (s: SoilDraft) => void;
  soilBase: SoilProfile | null;
  soilCheck: SoilCheck;
  onSoilReset: () => void;
  fieldCheck: FieldCheck;
  calibration: CalibrationInfo | null;
  stationInvalid: boolean;
  calibrationImpossible: boolean;
  soilLoading: boolean;
}

function Box({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-lg border border-rule bg-panel p-4">
      <legend className="px-1 font-serif text-lg font-semibold">{title}</legend>
      {aside}
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function NumField({ id, label, unit, value, onChange, invalid, hint, placeholder }: { id: string; label: string; unit?: string; value: string; onChange: (v: string) => void; invalid?: boolean; hint?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm text-ink-2">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input id={id} className="field-input" inputMode="decimal" value={value} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} />
        {unit && <span className="shrink-0 text-sm text-ink-2">{unit}</span>}
      </div>
      {hint && (
        <p id={`${id}-h`} className="mt-1 text-xs text-ink-2">
          {hint}
        </p>
      )}
    </div>
  );
}

export function FieldForm(p: Props) {
  const { t, L, n } = useI18n();
  const d = p.draft;
  const set = (patch: Partial<FieldDraft>) => p.onDraft({ ...d, ...patch });
  const setSoil = (k: keyof SoilDraft, v: string) => p.soil && p.onSoil({ ...p.soil, [k]: v });
  const origin: "soilgrids" | "default" | "user" | null = p.soilCheck.profile ? p.soilCheck.profile.origin : p.soilBase ? p.soilBase.origin : null;
  const toggleExcluded = (c: CropId) => set({ excluded: d.excluded.includes(c) ? d.excluded.filter((x) => x !== c) : [...d.excluded, c] });

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      <Box title={t("field.title")}>
        <NumField id="f-area" label={t("field.area")} unit={t("field.areaUnit")} value={d.areaDa} onChange={(v) => set({ areaDa: v })} invalid={!p.fieldCheck.areaOk} hint={t("field.example")} />
        <NumField id="f-slope" label={t("field.slope")} unit={t("field.slopeUnit")} value={d.slopePct} onChange={(v) => set({ slopePct: v })} />
        <div>
          <p className="text-sm text-ink-2">{t("field.rotation")}</p>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {[0, 1, 2].map((k) => (
              <CropSelect
                key={k}
                id={`f-rot-${k}`}
                label={t("field.year", { n: k + 1 })}
                value={d.rotation[k]}
                onChange={(c) => {
                  const r = [...d.rotation] as FieldDraft["rotation"];
                  r[k] = c;
                  set({ rotation: r });
                }}
              />
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-2">{t("field.example")}</p>
        </div>
      </Box>

      <Box title={t("field.soil")}>
        {p.soilLoading && !p.soil ? (
          <p className="text-sm text-ink-2">
            {t("load.soil")}: {t("load.loading")}
          </p>
        ) : (
          <>
            {origin && (
              <p className={`rounded-md px-3 py-2 text-sm ${origin === "default" ? "bg-warn text-warn-ink" : "bg-panel-2 text-ink-2"}`}>{t(`field.soilFrom.${origin}`)}</p>
            )}
            {!p.soilBase && !p.soilCheck.profile && <p className="rounded-md bg-warn px-3 py-2 text-sm text-warn-ink">{t("field.soilMissing")}</p>}
            {p.soil && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <NumField id="s-sand" label={`${t("field.sand")} %`} value={p.soil.sand} onChange={(v) => setSoil("sand", v)} invalid={p.soilCheck.profile === null} />
                  <NumField id="s-silt" label={`${t("field.silt")} %`} value={p.soil.silt} onChange={(v) => setSoil("silt", v)} invalid={p.soilCheck.profile === null} />
                  <NumField id="s-clay" label={`${t("field.clay")} %`} value={p.soil.clay} onChange={(v) => setSoil("clay", v)} invalid={p.soilCheck.profile === null} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumField id="s-soc" label={t("field.soc")} unit={t("field.socUnit")} value={p.soil.soc} onChange={(v) => setSoil("soc", v)} />
                  <NumField id="s-ph" label={t("field.ph")} value={p.soil.ph} onChange={(v) => setSoil("ph", v)} />
                </div>
                {p.soilCheck.texture && <p className="text-sm">{t("field.texture", { cls: p.soilCheck.texture })}</p>}
                {p.soilCheck.sum !== null && !p.soilCheck.profile && <p className="text-sm text-bad">{t("field.textureSum", { sum: n(p.soilCheck.sum, 1) })}</p>}
                {p.soilBase && origin === "user" && (
                  <button type="button" className="btn" onClick={p.onSoilReset}>
                    {t("field.soilReset")}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </Box>

      <Box title={t("field.water")}>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={d.rainfed} onChange={(e) => set({ rainfed: e.target.checked })} />
          {t("field.rainfed")}
        </label>
        {!d.rainfed && (
          <>
            <NumField id="f-budget" label={t("field.budget")} unit={t("field.budgetUnit")} value={d.budget} onChange={(v) => set({ budget: v })} invalid={!p.fieldCheck.budgetOk} hint={`${t("field.budgetHelp")} ${t("field.example")}.`} />
            <div>
              <label htmlFor="f-method" className="text-sm text-ink-2">
                {t("field.method")}
              </label>
              <select
                id="f-method"
                className="field-input mt-1"
                value={d.method}
                onChange={(e) => {
                  const m = e.target.value as IrrigationMethod;
                  set({ method: m, efficiency: m === "custom" ? d.efficiency : String(METHOD_EFF[m]) });
                }}
              >
                {(["furrow", "sprinkler", "drip", "custom"] as const).map((m) => (
                  <option key={m} value={m}>
                    {t(`field.method.${m}`)}
                    {m !== "custom" ? ` (${n(METHOD_EFF[m], 2)})` : ""}
                  </option>
                ))}
              </select>
            </div>
            {d.method === "custom" && <NumField id="f-eff" label={t("field.efficiency")} value={d.efficiency} onChange={(v) => set({ efficiency: v })} invalid={!p.fieldCheck.effOk} placeholder="0.70" />}
            <p className="text-xs text-ink-2">{t("field.efficiencyHelp")}</p>
          </>
        )}
      </Box>

      <Box title={t("cal.title")} aside={<div className="mb-3"><CalibrationBadge calibration={p.calibration} /></div>}>
        <NumField
          id="f-station"
          label={t("cal.label")}
          unit={t("cal.unit")}
          value={d.stationMm}
          onChange={(v) => set({ stationMm: v })}
          invalid={p.stationInvalid}
          hint={t("cal.help")}
        />
        {p.stationInvalid && <p className="text-sm text-bad">{t("cal.invalid")}</p>}
        {p.calibrationImpossible && <p className="text-sm text-bad">{t("cal.noComplete")}</p>}
        {p.calibration ? (
          <p className="rounded-md bg-sky-soft px-3 py-2 text-sm">
            {t("cal.appliedLong", { station: n(p.calibration.stationMeanMm), model: n(p.calibration.modelMeanMm), f: n(p.calibration.factor, 3), n: p.calibration.years.length })}
          </p>
        ) : (
          <p className="rounded-md bg-warn px-3 py-2 text-sm text-warn-ink">{t("cal.caution")}</p>
        )}
      </Box>

      <Box title={t("field.priorities")}>
        <p className="text-xs text-ink-2">{t("field.prioritiesHelp")}</p>
        {(["water", "income", "soil", "risk"] as (keyof PriorityWeights)[]).map((k) => {
          const total = d.priorities.water + d.priorities.income + d.priorities.soil + d.priorities.risk || 1;
          return (
            <div key={k}>
              <div className="flex items-baseline justify-between text-sm">
                <label htmlFor={`p-${k}`} className="text-ink-2">
                  {t(`prio.${k}`)}
                </label>
                <output htmlFor={`p-${k}`} className="font-semibold tabular-nums">
                  {n((d.priorities[k] / total) * 100)} %
                </output>
              </div>
              <input id={`p-${k}`} type="range" min={0} max={10} step={1} value={d.priorities[k]} onChange={(e) => set({ priorities: { ...d.priorities, [k]: Number(e.target.value) } })} />
            </div>
          );
        })}
      </Box>

      <Box title={t("field.excluded")}>
        <p className="text-xs text-ink-2">{t("field.excludedHelp")}</p>
        <ul className="flex flex-wrap gap-2">
          {CROP_IDS.map((c) => (
            <li key={c}>
              <button type="button" className="btn" aria-pressed={d.excluded.includes(c)} onClick={() => toggleExcluded(c)}>
                {L(CROPS[c].name)}
              </button>
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}
