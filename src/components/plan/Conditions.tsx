"use client";

import { useState } from "react";
import { CROP_CONSTANTS, CROP_IDS, CROPS } from "@/lib/engine";
import type { CropId, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { IRRIGATION_LEVELS, PRIORITY_KEYS, PRIORITY_PRESETS, priorityPresetFor, prioritySharesOf, weightsForPreset, type PriorityPresetId } from "@/lib/ui/presets";
import { DEFAULT_SCENARIO, METHOD_EFF, setInputs, setStore, TON_PER_IRRIGATION, useStore, type IrrigationMethod, type ScenarioPreset } from "@/lib/ui/fieldStore";
import { usdaTextureClass } from "@/lib/engine";
import { useFieldData } from "@/components/data/FieldData";
import { cropFull } from "./planKit";
import { texName } from "@/components/tarla/FieldPanel";

/** Scenario control: Tipik / Kurak / Sıcak ve kurak / Kendi (engine presets + own sliders). */
export function ScenarioControl() {
  const { t, n } = useI18n();
  const s = useStore();
  const sc = s.scenario;
  const presets: { id: ScenarioPreset; rain: number; temp: number }[] = [
    { id: "typical", rain: 1, temp: 0 },
    { id: "dry", rain: 0.75, temp: 0 },
    { id: "hot_dry", rain: 0.75, temp: 2 },
  ];
  return (
    <div>
      <div className="seg seg-scroll" role="group" aria-label={t("sc.label")}>
        {presets.map((p) => (
          <button key={p.id} type="button" aria-pressed={sc.preset === p.id} onClick={() => setStore({ scenario: { preset: p.id, rainMultiplier: p.rain, tempDeltaC: p.temp, priceMultiplier: sc.priceMultiplier } })}>
            {t(`sc.${p.id}`)}
          </button>
        ))}
        <button type="button" aria-pressed={sc.preset === "custom"} onClick={() => setStore({ scenario: { ...sc, preset: "custom" } })}>
          {t("sc.custom")}
        </button>
      </div>
      {sc.preset === "custom" && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Slider label={t("sc.rain")} min={0.6} max={1.2} step={0.05} value={sc.rainMultiplier} fmt={(v) => `${v >= 1 ? "+" : "−"}%${n(Math.abs(v - 1) * 100)}`} onChange={(v) => setStore({ scenario: { ...sc, rainMultiplier: v } })} />
          <Slider label={t("sc.temp")} min={0} max={4} step={0.5} value={sc.tempDeltaC} fmt={(v) => `+${n(v, 1)} °C`} onChange={(v) => setStore({ scenario: { ...sc, tempDeltaC: v } })} />
          <Slider label={t("sc.price")} min={0.5} max={1.5} step={0.05} value={sc.priceMultiplier} fmt={(v) => `×${n(v, 2)}`} onChange={(v) => setStore({ scenario: { ...sc, priceMultiplier: v } })} />
          <button type="button" className="btn btn-quiet sm:col-span-3 sm:justify-self-start" onClick={() => setStore({ scenario: DEFAULT_SCENARIO })}>
            {t("common.reset")}
          </button>
        </div>
      )}
    </div>
  );
}

function Slider({ label, min, max, step, value, fmt, onChange }: { label: string; min: number; max: number; step: number; value: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block text-[13px]">
      <span className="flex justify-between">
        <span className="text-ink-2">{label}</span>
        <span className="font-mono">{fmt(value)}</span>
      </span>
      <input type="range" className="mt-1 h-11 w-full accent-[var(--accent-ink)]" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/**
 * The farmer's own conditions, asked after the first result as light controls: water,
 * current sequence, priority, crops to leave out, prices, own soil numbers.
 */
export function Conditions() {
  const { t, n, lang } = useI18n();
  const s = useStore();
  const inp = s.inputs;
  const presetPrio = priorityPresetFor(inp.priorities);
  const level = inp.rainfed ? "none" : (IRRIGATION_LEVELS.find((l) => l.budgetM3PerDa === inp.budget)?.id ?? "custom");
  return (
    <div className="space-y-6">
      <section aria-labelledby="q-water">
        <h3 id="q-water" className="text-[15px] font-semibold">
          {t("q.water")}
        </h3>
        <div className="seg mt-2" role="group" aria-labelledby="q-water">
          <button type="button" aria-pressed={level === "none"} onClick={() => setInputs({ rainfed: true })}>
            {t("q.water.none")}
          </button>
          {IRRIGATION_LEVELS.map((l) => (
            <button key={l.id} type="button" aria-pressed={level === l.id} onClick={() => setInputs({ rainfed: false, budget: l.budgetM3PerDa })}>
              {t(`q.water.${l.id}`, { k: n(l.budgetM3PerDa / TON_PER_IRRIGATION) })}
            </button>
          ))}
        </div>
        {!inp.rainfed && (
          <>
            <label className="mt-3 block text-[13px]">
              <span className="flex justify-between">
                <span className="text-ink-2">{t("q.water.amount")}</span>
                <span className="font-mono">
                  {n(inp.budget)} {t("u.tonDa")} ≈ {n(inp.budget / TON_PER_IRRIGATION, 1)} {t("q.water.times")}
                </span>
              </span>
              <input type="range" className="mt-1 h-11 w-full accent-[var(--accent-ink)]" min={0} max={800} step={10} value={inp.budget} onChange={(e) => setInputs({ budget: Number(e.target.value), rainfed: Number(e.target.value) === 0 })} />
            </label>
            <p className="text-[12px] text-ink-2">{t("q.water.bridge", { k: TON_PER_IRRIGATION })}</p>
            <div className="mt-3">
              <span className="text-[13px] text-ink-2">{t("q.method")}</span>
              <div className="seg mt-1" role="group" aria-label={t("q.method")}>
                {(Object.keys(METHOD_EFF) as IrrigationMethod[]).map((m) => (
                  <button key={m} type="button" aria-pressed={inp.method === m} onClick={() => setInputs({ method: m })}>
                    {t(`q.method.${m}`)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[12px] text-ink-2">{t("q.method.help", { e: n(METHOD_EFF[inp.method] * 10, 1) })}</p>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="q-rot">
        <h3 id="q-rot" className="text-[15px] font-semibold">
          {t("q.rot")}
        </h3>
        <p className="text-[13px] text-ink-2">{t("q.rot.help")}</p>
        <div className="mt-2 grid gap-2">
          {inp.rotation.map((c, i) => (
            <label key={i} className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-center gap-2 text-[13px]">
              <span className="text-ink-2">{t("plan.yearN", { y: i + 1 })}</span>
              <select
                className="input"
                value={c}
                onChange={(e) => {
                  const next = [...inp.rotation] as RotationSequence;
                  next[i] = e.target.value as CropId;
                  setInputs({ rotation: next });
                }}
              >
                {CROP_IDS.map((x) => (
                  <option key={x} value={x}>
                    {cropFull(x, lang)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="q-prio">
        <h3 id="q-prio" className="text-[15px] font-semibold">
          {t("q.prio")}
        </h3>
        <div className="seg mt-2" role="group" aria-labelledby="q-prio">
          {PRIORITY_PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={presetPrio === p.id} onClick={() => setInputs({ priorities: weightsForPreset(p.id as PriorityPresetId) })}>
              {t(`q.prio.${p.id}`)}
            </button>
          ))}
        </div>
        <details className="mt-2">
          <summary className="tap text-[13px] font-medium text-ink-2">
            <span className="chev mr-1">›</span>
            {t("q.prio.fine")}
          </summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PRIORITY_KEYS.map((k) => (
              <label key={k} className="block text-[13px]">
                <span className="flex justify-between">
                  <span className="text-ink-2">{t(`q.prio.k.${k}`)}</span>
                  <span className="font-mono">%{n(prioritySharesOf(inp.priorities)[k] * 100)}</span>
                </span>
                <input type="range" className="mt-1 h-11 w-full accent-[var(--accent-ink)]" min={0} max={10} step={1} value={inp.priorities[k]} onChange={(e) => setInputs({ priorities: { ...inp.priorities, [k]: Number(e.target.value) } })} />
              </label>
            ))}
          </div>
        </details>
      </section>

      <section aria-labelledby="q-ex">
        <h3 id="q-ex" className="text-[15px] font-semibold">
          {t("q.excl")}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CROP_IDS.filter((c) => c !== "fallow").map((c) => {
            const on = inp.excluded.includes(c);
            return (
              <button key={c} type="button" aria-pressed={on} className={`btn btn-sm ${on ? "line-through decoration-2" : ""}`} onClick={() => setInputs({ excluded: on ? inp.excluded.filter((x) => x !== c) : [...inp.excluded, c] })}>
                {cropFull(c, lang)}
              </button>
            );
          })}
        </div>
      </section>

      <EconomicsEditor />
      <SoilEditor />
    </div>
  );
}

function EconomicsEditor() {
  const { t, L } = useI18n();
  const s = useStore();
  const e = s.econ;
  const set = (id: CropId, k: "price" | "cost", v: string) => setStore({ econ: { ...e, crops: { ...e.crops, [id]: { ...e.crops[id], [k]: v } } } });
  return (
    <details>
      <summary className="tap text-[15px] font-semibold">
        <span className="chev mr-1.5 text-ink-2">›</span>
        {t("econ.title")}
      </summary>
      <p className="mt-1 text-[13px] text-ink-2">{t("econ.lead")}</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[22rem] text-[13px]">
          <thead>
            <tr className="text-left text-ink-2">
              <th className="py-1 pr-2 font-medium">{t("econ.crop")}</th>
              <th className="py-1 pr-2 font-medium">{t("econ.price")}</th>
              <th className="py-1 font-medium">{t("econ.cost")}</th>
            </tr>
          </thead>
          <tbody>
            {CROP_IDS.filter((c) => c !== "fallow").map((id) => {
              const c = CROPS[id];
              return (
                <tr key={id} className="border-t border-line">
                  <th scope="row" className="py-1 pr-2 text-left font-normal">
                    {L(c.name)}
                  </th>
                  <td className="py-1 pr-2">
                    <input className="input" inputMode="decimal" aria-label={`${L(c.name)}: ${t("econ.price")}`} placeholder={String(c.priceTLPerKg.value)} value={e.crops[id]?.price ?? ""} onChange={(ev) => set(id, "price", ev.target.value)} />
                  </td>
                  <td className="py-1">
                    <input className="input" inputMode="decimal" aria-label={`${L(c.name)}: ${t("econ.cost")}`} placeholder={String(c.varCostTLPerDa.value)} value={e.crops[id]?.cost ?? ""} onChange={(ev) => set(id, "cost", ev.target.value)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <label className="text-[13px]">
          <span className="text-ink-2">{t("econ.water")}</span>
          <input className="input mt-1 max-w-[9rem]" inputMode="decimal" placeholder={String(CROP_CONSTANTS.waterPriceTLPerM3.value)} value={e.water} onChange={(ev) => setStore({ econ: { ...e, water: ev.target.value } })} />
        </label>
        <button type="button" className="btn" onClick={() => setStore({ econ: { crops: {}, water: "" } })}>
          {t("common.reset")}
        </button>
      </div>
      <p className="mt-2 text-[12px] text-ink-2">{t("econ.note")}</p>
    </details>
  );
}

function SoilEditor() {
  const { t, n } = useI18n();
  const s = useStore();
  const d = useFieldData();
  const base = d.soil && d.soil.origin !== "user" ? d.soil : null;
  const o = s.soil;
  const [draft, setDraft] = useState({ sand: o ? String(o.sand) : "", silt: o ? String(o.silt) : "", clay: o ? String(o.clay) : "", ph: o?.ph != null ? String(o.ph) : "", soc: o?.soc != null ? String(o.soc) : "" });
  const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
  const sand = num(draft.sand), silt = num(draft.silt), clay = num(draft.clay);
  const sum = (sand ?? 0) + (silt ?? 0) + (clay ?? 0);
  const ok = sand !== null && silt !== null && clay !== null && [sand, silt, clay].every((v) => Number.isFinite(v) && v >= 0) && Math.abs(sum - 100) <= 2;
  return (
    <details>
      <summary className="tap text-[15px] font-semibold">
        <span className="chev mr-1.5 text-ink-2">›</span>
        {t("soilE.title")}
      </summary>
      <p className="mt-1 text-[13px] text-ink-2">
        {o ? t("soilE.usingYours") : base ? t("soilE.usingSat", { cls: texName(base.textureClass, t), sand: n(base.sand), silt: n(base.silt), clay: n(base.clay) }) : t("soilE.none")}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(["sand", "silt", "clay", "ph", "soc"] as const).map((k) => (
          <label key={k} className="block text-[13px]">
            <span className="text-ink-2">{t(`soilE.${k}`)}</span>
            <input className="input mt-1" inputMode="decimal" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
          </label>
        ))}
      </div>
      <p className="mt-1 text-[12px] text-ink-2">
        {ok ? t("soilE.class", { cls: texName(usdaTextureClass(sand!, silt!, clay!), t) }) : t("soilE.sum", { s: n(sum) })}
      </p>
      <div className="mt-2 flex gap-2">
        <button type="button" className="btn" disabled={!ok} onClick={() => ok && setStore({ soil: { sand: sand!, silt: silt!, clay: clay!, ph: num(draft.ph), soc: num(draft.soc) } })}>
          {t("soilE.apply")}
        </button>
        {o && (
          <button type="button" className="btn btn-quiet" onClick={() => setStore({ soil: null })}>
            {t("soilE.back")}
          </button>
        )}
      </div>
    </details>
  );
}
