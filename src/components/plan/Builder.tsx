"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { CROP_IDS, evaluateCustomPlan, type CustomPlanResult } from "@/lib/engine";
import type { AnalysisInput, CropId, PlanResult, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { setStore, useStore } from "@/lib/ui/fieldStore";
import { useTheme } from "@/lib/ui/theme";
import { cropTextureStyle } from "@/components/brand/cropTexture";
import { CropGlyph } from "@/components/brand/CropGlyph";
import { Icon } from "@/components/ui/Icons";
import { cropFull, cropName, signed, useL } from "./planKit";
import { outOf, irrigations } from "./units";

/**
 * Rotation builder: drag a crop onto a year, or tap a crop and then a year, or use the
 * year's own list (keyboard). Every change re-runs the engine for this one plan
 * (evaluateCustomPlan, a few ms once warm) and shows its rule badges and key numbers.
 */
export function Builder({ input, current }: { input: AnalysisInput; current: PlanResult }) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const s = useStore();
  const theme = useTheme();
  const seq = s.builder;
  const [picked, setPicked] = useState<CropId | null>(null);
  const [res, setRes] = useState<{ key: string; r: CustomPlanResult; ms: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = `${seq.join(">")}`;

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBusy(true);
    timer.current = setTimeout(() => {
      const t0 = performance.now();
      try {
        const r = evaluateCustomPlan(input, seq);
        setRes({ key, r, ms: performance.now() - t0 });
      } catch {
        setRes(null);
      }
      setBusy(false);
    }, 16);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // re-run when the plan or the analysis input changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, input]);

  const place = (year: number, crop: CropId) => {
    const next = [...seq] as RotationSequence;
    next[year] = crop;
    setStore({ builder: next });
    setPicked(null);
    setLive(t("b.placed", { y: year + 1, crop: cropFull(crop, lang) }));
  };

  const r = res?.key === key ? res.r : null;
  const p = r?.plan ?? null;
  const msgsFor = (year: number) => (r ? r.messages.filter((m) => m.year === year + 1 || (year === 0 && m.year === 0)) : []);
  const curReq = current.water.requirementMmPerYr?.p50 ?? null;
  const curMar = current.economics.grossMarginTLPerDaPerYr?.p50 ?? null;
  const already = s.extraPlans.some((x) => x.join(">") === key);
  const ids = CROP_IDS.filter((c) => !s.inputs.excluded.includes(c));

  return (
    <div>
      <p className="text-[14px] text-ink-2">{t("b.lead")}</p>
      {/* palette */}
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t("b.palette")}>
        {ids.map((c) => (
          <li key={c}>
            <button
              type="button"
              draggable
              onDragStart={(e: DragEvent) => {
                e.dataTransfer.setData("text/plain", c);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => setPicked(picked === c ? null : c)}
              aria-pressed={picked === c}
              className={`inline-flex min-h-11 cursor-grab items-center gap-1.5 rounded-md border px-2.5 text-[14px] ${picked === c ? "border-ink bg-surface-2 font-semibold" : "border-line-strong bg-surface"}`}
            >
              <span className="inline-block size-3.5 rounded-[3px] border border-line" style={cropTextureStyle(c, theme)} aria-hidden="true" />
              <CropGlyph crop={c} size={18} />
              {cropName(c, lang)}
            </button>
          </li>
        ))}
      </ul>
      {picked && <p className="mt-2 text-[13px] font-medium">{t("b.pickedHint", { crop: cropFull(picked, lang) })}</p>}
      {/* slots */}
      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {seq.map((c, i) => {
          const ms = msgsFor(i);
          const hard = ms.some((m) => m.kind === "constraint");
          return (
            <li key={i}>
              <div
                className={`rounded-[10px] border-2 p-3 ${hard ? "border-dashed border-bad" : picked ? "border-dashed border-ink-2" : "border-line"} bg-surface`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const v = e.dataTransfer.getData("text/plain") as CropId;
                  if ((CROP_IDS as readonly string[]).includes(v)) place(i, v);
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="label">{t("plan.yearN", { y: i + 1 })}</span>
                  {picked && (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => place(i, picked)}>
                      {t("b.putHere")}
                    </button>
                  )}
                </div>
                <div className="mt-2 flex h-12 items-center gap-2 rounded-md border border-line px-2" style={cropTextureStyle(c, theme)}>
                  <span className="inline-flex items-center gap-1.5 rounded bg-bg/90 px-1.5 py-0.5 text-[14px] font-semibold">
                    <CropGlyph crop={c} size={18} />
                    {cropName(c, lang)}
                  </span>
                </div>
                <label className="mt-2 block text-[12px] text-ink-2" htmlFor={`slot-${i}`}>
                  {t("b.choose", { y: i + 1 })}
                </label>
                <select id={`slot-${i}`} className="input mt-1" value={c} onChange={(e) => place(i, e.target.value as CropId)}>
                  {CROP_IDS.map((x) => (
                    <option key={x} value={x}>
                      {cropFull(x, lang)}
                    </option>
                  ))}
                </select>
                <ul className="mt-2 space-y-1.5" aria-live="polite">
                  {ms.map((m, k) => (
                    <li key={k} className="flex items-start gap-1.5 text-[13px]">
                      <Icon name={m.kind === "constraint" ? "alert" : "info"} size={16} className={`mt-0.5 shrink-0 ${m.kind === "constraint" ? "text-bad" : "text-caution"}`} />
                      <span>
                        <strong className="font-semibold">{m.kind === "constraint" ? t("b.rule") : t("b.advice")}:</strong> {L(m.text)}
                      </span>
                    </li>
                  ))}
                  {r && ms.length === 0 && (
                    <li className="flex items-center gap-1.5 text-[13px] text-ink-2">
                      <Icon name="check" size={16} className="text-good" />
                      {t("b.ok")}
                    </li>
                  )}
                </ul>
              </div>
            </li>
          );
        })}
      </ol>
      {/* live numbers */}
      <div className="mt-4 rounded-[10px] border border-line bg-surface p-4" aria-busy={busy}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h4 className="text-[15px] font-semibold">{t("b.result")}</h4>
          <span className="readout">{busy ? t("b.busy") : res ? t("b.ms", { ms: n(res.ms) }) : ""}</span>
        </div>
        {p && (
          <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Num label={t("b.need")} v={p.water.requirementMmPerYr?.p50 ?? null} unit={t("u.tonDa")} diff={curReq !== null && p.water.requirementMmPerYr ? p.water.requirementMmPerYr.p50 - curReq : null} goodLow />
            <Num label={t("b.margin")} v={p.economics.grossMarginTLPerDaPerYr?.p50 ?? null} unit={t("u.tlDa")} diff={curMar !== null && p.economics.grossMarginTLPerDaPerYr ? p.economics.grossMarginTLPerDaPerYr.p50 - curMar : null} />
            <Num label={t("b.soil")} v={p.soilHealth.score} unit="/100" diff={p.soilHealth.score - current.soilHealth.score} />
            <div>
              <dt className="text-[12px] text-ink-2">{t("b.ok.windows")}</dt>
              <dd className="mt-0.5 text-[14px] font-medium">{p.trade ? outOf(p.trade.okWindowsPlan, p.trade.windows, lang) : "–"}</dd>
            </div>
          </dl>
        )}
        {p?.water.irrigationNetMmPerYr && !s.inputs.rainfed && (
          <p className="mt-2 text-[13px] text-ink-2">{t("b.irr", { v: n(p.water.irrigationNetMmPerYr.p50), k: n(irrigations(p.water.irrigationNetMmPerYr.p50), 1) })}</p>
        )}
        {r && !r.feasible && <p className="note mt-2 px-3 py-2 text-[13px]">{t("b.infeasible")}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={already || !p} onClick={() => setStore((st) => ({ extraPlans: [...st.extraPlans, seq].slice(-4) }))}>
            <Icon name="plus" size={18} />
            {already ? t("b.added") : t("b.add")}
          </button>
          <button type="button" className="btn btn-quiet" onClick={() => setStore({ builder: current.crops })}>
            {t("b.fromMine")}
          </button>
        </div>
        {s.extraPlans.length > 0 && (
          <ul className="mt-3 flex flex-wrap gap-1.5 text-[13px]" aria-label={t("b.mine")}>
            {s.extraPlans.map((x) => (
              <li key={x.join(">")} className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-0.5">
                {x.map((c) => cropName(c, lang)).join(", ")}
                <button type="button" className="btn btn-quiet btn-icon -my-2 -mr-2" aria-label={t("b.remove")} onClick={() => setStore((st) => ({ extraPlans: st.extraPlans.filter((y) => y.join(">") !== x.join(">")) }))}>
                  <Icon name="close" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}

function Num({ label, v, unit, diff, goodLow = false }: { label: string; v: number | null; unit: string; diff: number | null; goodLow?: boolean }) {
  const { t, n } = useI18n();
  const better = diff !== null && diff !== 0 ? (goodLow ? diff < 0 : diff > 0) : null;
  return (
    <div>
      <dt className="text-[12px] text-ink-2">{label}</dt>
      <dd className="mt-0.5">
        <span className="numeral text-[26px]">{v !== null ? n(v) : "–"}</span> <span className="text-[12px] text-ink-2">{unit}</span>
        {diff !== null && Math.abs(diff) >= 0.5 && (
          <span className="block text-[12px]">
            {diff > 0 ? "▲" : "▼"} {signed(diff, n)} {t("b.vsMine")} <span className="sr-only">{better ? t("b.better") : t("b.worse")}</span>
          </span>
        )}
      </dd>
    </div>
  );
}
