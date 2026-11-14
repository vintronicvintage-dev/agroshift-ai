"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnalysisResult, PlanResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { pilotField, setField, useHydrated, useStore } from "@/lib/ui/fieldStore";
import { monthlyTemps } from "@/lib/ui/derive";
import { useFieldData } from "@/components/data/FieldData";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";
import { Verdict } from "./Verdict";
import { Timeline, bareLines } from "./Timeline";
import { Compare, MarkerIcon, WindowStrip } from "./Compare";
import { Builder } from "./Builder";
import { Pareto } from "./Pareto";
import { Conditions, ScenarioControl } from "./Conditions";
import { ShareBar, PrintReport } from "./Share";
import { allPlans, cropFull, GradeBadge, planLabel, planTitle, Sequence, useL } from "./planKit";
import { irrigations, outOf } from "./units";

export function PlanPage() {
  const { t, n, lang } = useI18n();
  const hydrated = useHydrated();
  const s = useStore();
  const d = useFieldData();
  const r = d.analysis.result;
  const [openId, setOpenId] = useState<string | null>(null);
  const climate = d.climate.status === "ok" ? d.climate.data : null;
  const frost = useMemo(() => (climate ? monthlyTemps(climate).frostShare.map((v) => (v ?? 0) >= 0.3) : Array(12).fill(false)), [climate]);

  if (!hydrated) return <div className="mx-auto max-w-[1280px] px-4 py-8"><div className="skel h-64" /></div>;
  if (!s.field) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-start px-4 py-12">
        <SpotArt name="no-field" width={220} className="text-ink-3" />
        <h1 className="display mt-4 text-[34px]">{t("pl.noField")}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{t("pl.noFieldLead")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            <Icon name="polygon" size={18} />
            {t("pl.toField")}
          </Link>
          <button type="button" className="btn" onClick={() => setField(pilotField("konya-cumra", lang))}>
            {t("empty.example", { name: "Konya-Çumra" })}
          </button>
        </div>
      </div>
    );
  }

  const area = s.inputs.areaOverrideDa ?? s.field.areaDa;
  const plans = r ? allPlans(r) : [];
  const best = r?.alternatives[0] ?? null;
  const selected = openId ?? best?.id ?? null;
  const open = (id: string) => {
    setOpenId(id);
    requestAnimationFrame(() => document.getElementById(`plan-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="mx-auto max-w-[1320px] px-4 pt-6 sm:px-6">
      <div className="no-print">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="display text-[34px] sm:text-[42px]">{t("pl.title")}</h1>
            <p className="mt-1 text-[15px] text-ink-2">
              {t("pl.lead", { name: s.field.name, da: n(area, area < 100 ? 1 : 0) })}{" "}
              <Link href="/" className="font-medium text-accent-ink underline underline-offset-2">
                {t("pl.changeField")}
              </Link>
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className="label">{t("sc.label")}</span>
            <ScenarioControl />
          </div>
        </div>
        {(d.analysis.running || !r) && <div className="progress-line mb-3" aria-hidden="true" />}
        <p className="sr-only" aria-live="polite">
          {d.analysis.running ? t("pl.busy") : r ? t("pl.ready") : ""}
        </p>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="min-w-0 space-y-8">
            {!r && <Waiting />}
            {r && (
              <>
                <Verdict result={r} onOpen={open} />
                <ShareBar result={r} />
                <Section id="takvim" title={t("pl.timeline")} lead={t("pl.timelineLead")}>
                  <Timeline
                    frostMonths={frost}
                    rows={[r.current, ...(plans.find((p) => p.id === selected && p.kind !== "current") ? [plans.find((p) => p.id === selected)!] : best ? [best] : [])].map((p) => ({
                      id: p.id,
                      title: planTitle(p, r, t),
                      calendar: p.calendar,
                      monthly: p.monthlyDemand ?? null,
                    }))}
                  />
                </Section>
                <Section id="planlar" title={t("pl.plans")} lead={t("pl.plansLead", { n: r.optimizer.feasible, w: r.windows.count })}>
                  <ul className="divide-y divide-line rounded-[10px] border border-line">
                    {plans.map((p, i) => (
                      <PlanRow key={p.id} p={p} i={i} r={r} open={selected === p.id} onToggle={() => setOpenId(selected === p.id ? "__none" : p.id)} area={area} />
                    ))}
                  </ul>
                </Section>
                <Section id="karsilastir" title={t("pl.compare")} lead={t("pl.compareLead")}>
                  <Compare result={r} plans={plans} selectedId={selected} onSelect={(id) => setOpenId(id)} />
                </Section>
                <Section id="yillar" title={t("pl.years")} lead={t("pl.yearsLead", { w: r.windows.count })}>
                  <WindowStrip result={r} plans={plans} />
                </Section>
                <Section id="kurucu" title={t("pl.builder")}>
                  {d.engineInput && <Builder input={d.engineInput} current={r.current} />}
                </Section>
                <Section id="denge" title={t("pl.pareto")} lead={t("pl.paretoLead")}>
                  <Pareto result={r} plans={plans} />
                </Section>
              </>
            )}
          </div>
          <aside className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1 scroll-thin" aria-labelledby="sartlar-h">
            <div className="panel p-4">
              <h2 id="sartlar-h" className="display text-[22px]">
                {t("pl.conditions")}
              </h2>
              <p className="mt-1 text-[13px] text-ink-2">{t("pl.conditionsLead")}</p>
              <div className="mt-4">
                <Conditions />
              </div>
            </div>
          </aside>
        </div>
      </div>
      {r && <PrintReport result={r} frost={frost} />}
    </div>
  );
}

function Waiting() {
  const { t } = useI18n();
  const d = useFieldData();
  const err = d.analysis.error || d.climate.status === "error" || (d.soilPart.status === "error" && !d.soil);
  return (
    <div className="panel flex flex-col items-start gap-3 p-6">
      <SpotArt name={err ? "offline" : "loading-data"} width={200} className="text-ink-3" />
      <h2 className="display text-[26px]">{err ? t("pl.errTitle") : t("pl.waitTitle")}</h2>
      <p className="text-[15px] text-ink-2">{err ? t("pl.errLead") : d.climate.status === "loading" ? t("climate.slow") : t("pl.waitLead")}</p>
      {err && (
        <div className="flex flex-wrap gap-2">
          {d.climate.status === "error" && (
            <button type="button" className="btn" onClick={() => d.retry("climate")}>
              {t("card.retry")}
            </button>
          )}
          {d.soilPart.status === "error" && (
            <button type="button" className="btn" onClick={() => d.retry("soilPart")}>
              {t("card.retry")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20">
      <h2 id={`${id}-h`} className="display text-[24px] sm:text-[28px]">
        {title}
      </h2>
      {lead && <p className="lead mt-1 text-[14px]">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function PlanRow({ p, i, r, open, onToggle, area }: { p: PlanResult; i: number; r: AnalysisResult; open: boolean; onToggle: () => void; area: number }) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const ok = p.kind === "current" ? (r.alternatives[0]?.trade?.okWindowsCurrent ?? null) : (p.trade?.okWindowsPlan ?? null);
  const req = p.water.irrigationNetMmPerYr?.p50 ?? null;
  const mar = p.economics.grossMarginTLPerDaPerYr;
  return (
    <li id={`plan-${p.id}`} className="scroll-mt-20">
      <button type="button" className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left hover:bg-surface-2 sm:p-4" aria-expanded={open} onClick={onToggle}>
        <MarkerIcon i={i} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-semibold">{planTitle(p, r, t)}</span>
            <span className="text-[14px] text-ink-2">{planLabel(p, lang)}</span>
            {p.id === r.typicalBestId && <span className="chip border-[var(--accent-edge)] text-accent-ink">{t("pl.bestTag")}</span>}
            {p.id === r.kneeId && <span className="chip">{t("pl.kneeTag")}</span>}
          </span>
          <span className="mt-0.5 flex flex-wrap gap-x-4 text-[13px] text-ink-2">
            <span>{t("pl.rowWater", { v: n(req), k: n(irrigations(req ?? 0), 1) })}</span>
            <span>{t("pl.rowMoney", { v: n(mar?.p50 ?? null) })}</span>
            {ok !== null && <span>{t("pl.rowOk", { s: outOf(ok, r.windows.count, lang) })}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {p.confidence && <GradeBadge grade={p.confidence.grade} />}
          <Icon name="chevron-down" size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      {open && (
        <div className="space-y-4 border-t border-line bg-surface p-4 sm:p-5">
          <Sequence crops={p.crops} />
          {p.narrative && p.kind !== "current" && <p className="text-[15px]">{L(p.narrative.verdict)}</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[13px] tabular-nums">
              <caption className="sr-only">{t("pl.yearTable")}</caption>
              <thead>
                <tr className="text-left text-ink-2">
                  <th className="py-1 pr-3 font-medium">{t("pl.col.year")}</th>
                  <th className="py-1 pr-3 font-medium">{t("pl.col.crop")}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t("pl.col.yield")}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t("pl.col.bad")}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t("pl.col.irr")}</th>
                  <th className="py-1 pr-3 text-right font-medium">{t("pl.col.money")}</th>
                  <th className="py-1 text-left font-medium">{t("pl.col.dates")}</th>
                </tr>
              </thead>
              <tbody>
                {p.years.map((y) => {
                  const cal = p.calendar.find((c) => c.year === y.year);
                  const big = y.cropId === "sugar_beet" || y.cropId === "alfalfa";
                  const fmtY = (tHa: number) => (big ? `${n(tHa / 10, 2)} ton/da` : `${n(tHa * 100)} kg/da`);
                  return (
                    <tr key={y.year} className="border-t border-line">
                      <td className="py-1.5 pr-3">{y.year}</td>
                      <td className="py-1.5 pr-3">{cropFull(y.cropId, lang)}</td>
                      <td className="py-1.5 pr-3 text-right">{y.yieldTHa ? fmtY(y.yieldTHa.p50) : "–"}</td>
                      <td className="py-1.5 pr-3 text-right">{y.yieldTHa ? fmtY(y.yieldTHa.p10) : "–"}</td>
                      <td className="py-1.5 pr-3 text-right">{y.irrigationNetMm ? `${n(y.irrigationNetMm.p50)} ${t("u.tonDa")}` : "–"}</td>
                      <td className="py-1.5 pr-3 text-right">{y.grossMarginTLPerDa ? `${n(y.grossMarginTLPerDa.p50)} TL/da` : "–"}</td>
                      <td className="py-1.5">{cal?.sow && cal.harvest ? t("pl.dates", { s: fmtMD(cal.sow, lang), h: fmtMD(cal.harvest, lang) }) : t("pl.fallowRow")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] text-ink-2">{t("pl.yieldNote")}</p>
          {mar && (
            <p className="text-[14px]">
              {t("pl.moneyRange", { a: n(mar.p10), b: n(mar.p90), w: r.windows.count })}{" "}
              {p.economics.fieldTotal3yrTL && t("pl.fieldTotal", { tl: n(p.economics.fieldTotal3yrTL.p50 / 3), da: n(area) })}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-[14px] font-semibold">{t("pl.bare")}</h4>
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {bareLines(p.calendar, lang).map((b) => (
                  <li key={b.year}>{t("pl.bareLine", { y: b.year, crop: b.name, d: b.days })}</li>
                ))}
              </ul>
              {p.cover && <p className="mt-1 text-[13px] text-ink-2">{t("pl.bareYear", { d: n(p.soilHealth.bareDaysPerYear) })}</p>}
            </div>
            <div>
              <h4 className="text-[14px] font-semibold">{t("pl.soilN")}</h4>
              <p className="mt-1 text-[13px]">{t("pl.soilScore", { s: n(p.soilHealth.score) })}</p>
              {p.nitrogen && <p className="text-[13px]">{t("pl.nBalance", { a: n(p.nitrogen.balanceKgHaYr.low / 10, 1), b: n(p.nitrogen.balanceKgHaYr.high / 10, 1) })}</p>}
              {p.erosion?.aTHaYr != null && <p className="text-[13px]">{t("pl.erosion", { v: n(p.erosion.aTHaYr / 10, 1), c: t(`pl.eros.${p.erosion.class ?? "low"}`) })}</p>}
            </div>
          </div>
          {p.preCrop && p.preCrop.some((x) => x.yieldFactor !== 1 || x.nCostSavingTLPerDa > 0) && (
            <div>
              <h4 className="text-[14px] font-semibold">{t("pl.precrop")}</h4>
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {p.preCrop.map((x) => (
                  <li key={x.year}>
                    {t("pl.precropLine", { y: x.year, prev: cropFull(x.prev, lang), crop: cropFull(x.cropId, lang), f: n((x.yieldFactor - 1) * 100) })} <span className="text-ink-2">{L(x.note)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.warnings && p.warnings.length > 0 && (
            <div>
              <h4 className="text-[14px] font-semibold">{t("pl.warnings")}</h4>
              <ul className="mt-1 space-y-1 text-[13px]">
                {p.warnings.map((w, k) => (
                  <li key={k} className="flex gap-1.5">
                    <Icon name={w.severity === "warn" ? "alert" : "info"} size={16} className="mt-0.5 shrink-0 text-ink-2" />
                    {L(w.text)}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {p.violations.length > 0 && (
            <ul className="space-y-1 text-[13px]">
              {p.violations.map((v, k) => (
                <li key={k} className="flex gap-1.5 text-bad">
                  <Icon name="alert" size={16} className="mt-0.5 shrink-0" />
                  {L(v.text)}
                </li>
              ))}
            </ul>
          )}
          {p.confidence && (
            <div>
              <h4 className="text-[14px] font-semibold">{t("pl.conf", { g: p.confidence.grade })}</h4>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px] text-ink-2">
                {p.confidence.reasons.map((x, k) => (
                  <li key={k}>{L(x)}</li>
                ))}
              </ul>
            </div>
          )}
          <Link href="/dayanak" className="inline-flex items-center gap-1.5 text-[14px] font-medium text-accent-ink underline underline-offset-2">
            {t("pl.why")}
          </Link>
        </div>
      )}
    </li>
  );
}

const fmtMD = (mmdd: string, lang: "tr" | "en") =>
  new Date(Date.UTC(2023, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(3, 5)))).toLocaleDateString(lang === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
