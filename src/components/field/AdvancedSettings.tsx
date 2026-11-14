"use client";

import { useState, type ReactNode } from "react";
import { CROPS, CROP_IDS } from "@/lib/engine";
import type { CropId, PriorityWeights, SoilProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { METHOD_EFF, parseNum, type FieldCheck, type FieldDraft, type IrrigationMethod, type SoilCheck, type SoilDraft } from "@/lib/ui/fieldState";
import { BUDGET_SLIDER, PRIORITY_KEYS, prioritySharesOf } from "@/lib/ui/presets";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";
import { EconomicsEditor, type EconDraft } from "@/components/compare/EconomicsEditor";

export interface AdvancedProps {
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
  econ: EconDraft;
  onEcon: (e: EconDraft) => void;
  showNdvi: boolean;
  onShowNdvi: (v: boolean) => void;
  onPoint: (lat: number, lon: number) => void;
  /** Pilot region chips, for switching place once one is chosen. */
  placeChips: ReactNode;
}

function Group({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <fieldset className="min-w-0 border-t border-rule pt-4">
      <legend className="float-left mb-3 flex w-full flex-wrap items-center justify-between gap-2 sec-title">
        {title}
        {aside}
      </legend>
      <div className="clear-left space-y-3">{children}</div>
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
        <input id={id} className="field-input" inputMode="decimal" autoComplete="off" value={value} placeholder={placeholder} aria-invalid={invalid || undefined} aria-describedby={hint ? `${id}-h` : undefined} onChange={(e) => onChange(e.target.value)} />
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

/** Everything the four questions do not ask, closed by default. Nothing here was removed from v1.0. */
export function AdvancedSettings(p: AdvancedProps) {
  const { t, L, n } = useI18n();
  const d = p.draft;
  const set = (patch: Partial<FieldDraft>) => p.onDraft({ ...d, ...patch });
  const setSoil = (k: keyof SoilDraft, v: string) => p.soil && p.onSoil({ ...p.soil, [k]: v });
  const origin: "soilgrids" | "default" | "user" | null = p.soilCheck.profile ? p.soilCheck.profile.origin : p.soilBase ? p.soilBase.origin : null;
  const toggleExcluded = (c: CropId) => set({ excluded: d.excluded.includes(c) ? d.excluded.filter((x) => x !== c) : [...d.excluded, c] });
  const shares = prioritySharesOf(d.priorities);

  return (
    <div className="space-y-6 pt-2">
      <Group title={t("adv.field")}>
        <div className="grid grid-cols-2 gap-3">
          <NumField id="f-area" label={t("field.area")} unit={t("field.areaUnit")} value={d.areaDa} onChange={(v) => set({ areaDa: v })} invalid={!p.fieldCheck.areaOk} hint={t("field.example")} />
          <NumField id="f-slope" label={t("field.slope")} unit={t("field.slopeUnit")} value={d.slopePct} onChange={(v) => set({ slopePct: v })} />
        </div>
      </Group>

      <Group title={t("field.soil")}>
        {p.soilLoading && !p.soil ? (
          <p className="text-sm text-ink-2">
            {t("load.soil")}: {t("load.loading")}
          </p>
        ) : (
          <>
            {origin && <p className={`rounded-lg px-3 py-2 text-sm ${origin === "default" ? "bg-warn text-warn-ink" : "bg-panel-2 text-ink-2"}`}>{t(`field.soilFrom.${origin}`)}</p>}
            {!p.soilBase && !p.soilCheck.profile && <p className="rounded-lg bg-warn px-3 py-2 text-sm text-warn-ink">{t("field.soilMissing")}</p>}
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
      </Group>

      {!d.rainfed && (
        <Group title={t("adv.method")}>
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
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor="f-budget-fine" className="text-ink-2">
                {t("q.water.fine")}
              </label>
              <output htmlFor="f-budget-fine" className="tabular-nums">
                <span className="sec-title">{n(parseNum(d.budget))}</span> <span className="text-xs text-ink-2">{t("field.budgetUnit")}</span>
              </output>
            </div>
            <input
              id="f-budget-fine"
              type="range"
              min={BUDGET_SLIDER.min}
              max={BUDGET_SLIDER.max}
              step={BUDGET_SLIDER.step}
              value={parseNum(d.budget) ?? 0}
              aria-valuetext={`${n(parseNum(d.budget) ?? 0)} ${t("field.budgetUnit")}`}
              onChange={(e) => set({ budget: e.target.value })}
            />
          </div>
          <NumField id="f-budget" label={t("field.budget")} unit={t("field.budgetUnit")} value={d.budget} onChange={(v) => set({ budget: v })} invalid={!p.fieldCheck.budgetOk} hint={t("field.budgetHelp")} />
          <p className="text-xs text-ink-2">{t("field.efficiencyHelp")}</p>
        </Group>
      )}

      <Group title={t("cal.title")} aside={<CalibrationBadge calibration={p.calibration} small />}>
        <NumField id="f-station-adv" label={t("cal.label")} unit={t("cal.unit")} value={d.stationMm} onChange={(v) => set({ stationMm: v })} invalid={p.stationInvalid} hint={t("cal.help")} />
        {p.stationInvalid && <p className="text-sm text-bad">{t("cal.invalid")}</p>}
        {p.calibrationImpossible && <p className="text-sm text-bad">{t("cal.noComplete")}</p>}
        {p.calibration && (
          <p className="rounded-lg bg-sky-soft px-3 py-2 text-sm">
            {p.calibration.mode === "basin"
              ? t("cal.appliedBasinLong", { station: n(p.calibration.stationMeanMm), model: n(p.calibration.modelMeanMm), f: n(p.calibration.factor, 3), n: p.calibration.years.length, basin: p.calibration.basinNameTr ?? "MGM" })
              : t("cal.appliedLong", { station: n(p.calibration.stationMeanMm), model: n(p.calibration.modelMeanMm), f: n(p.calibration.factor, 3), n: p.calibration.years.length })}
          </p>
        )}
      </Group>

      <Group title={t("field.priorities")}>
        <p className="text-xs text-ink-2">{t("field.prioritiesHelp")}</p>
        {PRIORITY_KEYS.map((k: keyof PriorityWeights) => (
          <div key={k}>
            <div className="flex items-baseline justify-between text-sm">
              <label htmlFor={`p-${k}`} className="text-ink-2">
                {t(`prio.${k}`)}
              </label>
              <output htmlFor={`p-${k}`} className="font-semibold tabular-nums">
                {n(shares[k] * 100)} %
              </output>
            </div>
            <input id={`p-${k}`} type="range" min={0} max={10} step={1} value={d.priorities[k]} onChange={(e) => set({ priorities: { ...d.priorities, [k]: Number(e.target.value) } })} />
          </div>
        ))}
      </Group>

      <Group title={t("field.excluded")}>
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
      </Group>

      <Group title={t("adv.place")}>
        <div>
          <p className="text-sm text-ink-2">{t("site.pilots")}</p>
          {p.placeChips}
        </div>
        <CoordsForm onPoint={p.onPoint} />
        <label className="tap flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.showNdvi} onChange={(e) => p.onShowNdvi(e.target.checked)} />
          <span>{t("site.ndviLayer")}</span>
        </label>
      </Group>

      <div className="border-t border-rule pt-4">
        <EconomicsEditor value={p.econ} onChange={p.onEcon} />
      </div>
    </div>
  );
}

/** Pick a point by typing coordinates (same validation as v1.0). */
export function CoordsForm({ onPoint }: { onPoint: (lat: number, lon: number) => void }) {
  const { t } = useI18n();
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [err, setErr] = useState(false);
  return (
    <form
      className="text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const a = Number(lat.replace(",", ".")), b = Number(lon.replace(",", "."));
        if (lat.trim() === "" || lon.trim() === "" || !Number.isFinite(a) || !Number.isFinite(b) || Math.abs(a) > 90 || Math.abs(b) > 180) {
          setErr(true);
          return;
        }
        setErr(false);
        onPoint(a, b);
      }}
    >
      <fieldset>
        <legend className="text-ink-2">{t("site.coords")}</legend>
        <div className="mt-1 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <label>
            <span className="text-xs text-ink-2">{t("site.lat")}</span>
            <input className="field-input mt-1" inputMode="decimal" autoComplete="off" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="37.57" aria-invalid={err || undefined} />
          </label>
          <label>
            <span className="text-xs text-ink-2">{t("site.lon")}</span>
            <input className="field-input mt-1" inputMode="decimal" autoComplete="off" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="32.77" aria-invalid={err || undefined} />
          </label>
          <button type="submit" className="btn">
            {t("site.go")}
          </button>
        </div>
        {err && (
          <p className="mt-1 text-bad" role="alert">
            {t("site.coordsInvalid")}
          </p>
        )}
      </fieldset>
    </form>
  );
}
