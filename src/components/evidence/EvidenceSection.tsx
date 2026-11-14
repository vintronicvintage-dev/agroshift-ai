"use client";

import { useRef, useState, type ReactNode } from "react";
import type { ClimateSummary, NdviSeries, SourceMeta, TrendResult } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { metaToRef, type SourceRef } from "@/lib/ui/sources";
import { Traced, type Trace } from "@/components/trace/TraceProvider";
import { ChartCard, SimpleTable, Swatch } from "@/components/charts/chartKit";
import { AnnualPrecipEt0Chart, CountBarsChart, MonthlyBalanceChart, NdviChart, WetnessAnomalyChart } from "@/components/charts/ClimateCharts";
import { CalibrationBadge } from "./CalibrationBadge";
import { Explainers } from "./Explainers";
import type { Part } from "@/lib/ui/siteData";

interface Props {
  climate: ClimateSummary;
  ndvi: Part<NdviSeries>;
  calibration: CalibrationInfo | null;
  imerg: "validated" | "not_validated" | null;
  methodRef: (name: string) => SourceRef;
  onRetryNdvi: () => void;
}

export function EvidenceSection({ climate, ndvi, calibration, imerg, methodRef, onRetryNdvi }: Props) {
  const { t, n } = useI18n();
  const c = climate;
  const climateRefs = c.sources.map(metaToRef);
  const fao = methodRef("FAO-56");
  const mk = methodRef("Mann–Kendall");
  const trend = (v: TrendResult["variable"]) => c.trends.find((x) => x.variable === v);
  const nYears = c.completeYears.length;
  const calInputs: [string, string][] = calibration
    ? [[t("in.calibration"), `×${n(calibration.factor, 3)} (${n(calibration.stationMeanMm)} / ${n(calibration.modelMeanMm, 1)} mm)`]]
    : [[t("in.calibration"), t("cal.none")]];

  const precipTrace = (): Trace => ({
    title: t("ev.precip"),
    value: `${n(c.meanAnnualPrecipMm)} mm`,
    formula: t("f.precip"),
    inputs: [[t("in.years"), `${nYears} (${c.completeYears[0] ?? "—"}–${c.completeYears.at(-1) ?? "—"})`], ...calInputs],
    sources: climateRefs,
    note: calibration ? undefined : t("cal.caution"),
  });
  const et0Trace = (): Trace => ({
    title: t("ev.et0"),
    value: `${n(c.meanAnnualEt0Mm)} mm`,
    formula: t("f.et0"),
    inputs: Object.entries(c.evidence[0]?.inputs ?? {}).map(([k, v]) => [k, v === null ? "—" : String(v)]),
    sources: [...climateRefs, fao],
  });
  const gap = c.meanAnnualEt0Mm !== null && c.meanAnnualPrecipMm !== null ? c.meanAnnualEt0Mm - c.meanAnnualPrecipMm : null;
  const gapTrace = (): Trace => ({
    title: t("ev.gap"),
    value: `${n(gap)} mm`,
    formula: t("f.gap"),
    inputs: [
      ["ET₀", `${n(c.meanAnnualEt0Mm)} mm`],
      [t("ev.precipShort"), `${n(c.meanAnnualPrecipMm)} mm`],
      ...calInputs,
    ],
    sources: [...climateRefs, fao],
  });
  const trendTrace = (tr: TrendResult, title: string): Trace => ({
    title: `${title}: ${t("ev.trend")}`,
    value: t("ev.slope", { v: (tr.senSlope > 0 ? "+" : "") + n(tr.senSlope, tr.variable === "gwet_root" ? 4 : 2), unit: unitOf(tr, t) }),
    formula: t("f.trend"),
    inputs: [
      ["S", n(tr.s)],
      ["Z", n(tr.z, 2)],
      ["p", n(tr.p, 3)],
      [t("in.years"), String(tr.years.length)],
    ],
    sources: [...climateRefs, mk],
  });

  const q = c.quality;
  const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        {/* readout */}
        <div className="card p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-sm text-ink-2">{t("ev.period", { start: c.period.start, end: c.period.end, n: nYears })}</p>
            <CalibrationBadge calibration={calibration} />
          </div>
          <dl className="mt-4 grid gap-5 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-ink-2">{t("ev.precip")}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <Traced trace={precipTrace} className="num-hero text-[var(--c-precip)]">
                  {n(c.meanAnnualPrecipMm)}
                </Traced>
                <span className="text-ink-2">mm</span>
              </dd>
              {calibration && <dd className="mt-1 text-sm text-ink-2">NASA POWER: {n(calibration.modelMeanMm)} mm</dd>}
            </div>
            <div>
              <dt className="text-sm text-ink-2">{t("ev.et0")}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <Traced trace={et0Trace} className="num-hero text-[var(--c-et0)]">
                  {n(c.meanAnnualEt0Mm)}
                </Traced>
                <span className="text-ink-2">mm</span>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-ink-2">{t("ev.gap")}</dt>
              <dd className="mt-1 flex items-baseline gap-1.5">
                <Traced trace={gapTrace} className="num-hero">
                  {n(gap)}
                </Traced>
                <span className="text-ink-2">mm</span>
              </dd>
            </div>
          </dl>
          {!calibration && (
            <p className="mt-4 rounded-md bg-warn px-3 py-2 text-sm text-warn-ink" role="note">
              {t("cal.caution")}
            </p>
          )}
          <p className="mt-3 text-sm text-ink-2">{t("ev.scenarioNote")}</p>
        </div>

        <ChartTabs
          label={t("ev.tabs")}
          tabs={[
            { id: "annual", label: t("ev.tab.annual") },
            { id: "monthly", label: t("ev.tab.monthly") },
            { id: "days", label: t("ev.tab.days") },
            { id: "gwet", label: t("ev.tab.gwet") },
            { id: "ndvi", label: t("ev.tab.ndvi") },
          ]}
        >
          {(tab) => (
            <>
          {tab === "annual" && (
            <ChartCard
              title={t("ev.annualTitle")}
              badge={<CalibrationBadge calibration={calibration} small />}
              legend={
                <>
                  <Swatch color="var(--c-precip)" label={t("ev.precipShort")} />
                  <Swatch color="var(--c-et0)" label="ET₀" kind="line" />
                  <Swatch color="var(--ink-2)" label={t("ev.senLine")} kind="dash" />
                </>
              }
              footer={
                <div className="space-y-0.5">
                  <TrendLine label={t("ev.precipShort")} tr={trend("precip")} onTrace={(tr) => trendTrace(tr, t("ev.precip"))} />
                  <TrendLine label="ET₀" tr={trend("et0")} onTrace={(tr) => trendTrace(tr, t("ev.et0"))} />
                </div>
              }
              table={
                <SimpleTable
                  head={[t("ev.year"), `${t("ev.precipShort")} (mm)`, "ET₀ (mm)"]}
                  rows={c.annual.map((a) => [a.year, n(a.precipMm), n(a.et0Mm)])}
                />
              }
            >
              <AnnualPrecipEt0Chart annual={c.annual} trends={c.trends} />
            </ChartCard>
          )}

          {tab === "monthly" && (
          <ChartCard
            title={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {t("ev.monthlyTitle")} <CalibrationBadge calibration={calibration} small />
              </span>
            }
            legend={
              <>
                <Swatch color="var(--c-precip)" label={t("ev.precipShort")} />
                <Swatch color="var(--c-et0)" label="ET₀" />
              </>
            }
            footer={<span>{t("f.monthly")}</span>}
            table={
              <SimpleTable
                head={[t("ev.month"), `${t("ev.precipShort")} (mm)`, "ET₀ (mm)", `${t("ev.balance")} (mm)`]}
                rows={c.monthly.map((m) => [m.month, n(m.precipMm), n(m.et0Mm), n(m.balanceMm)])}
              />
            }
          >
            <MonthlyBalanceChart monthly={c.monthly} />
          </ChartCard>
          )}

          {tab === "days" && (
          <ChartCard
            title={t("ev.daysTitle")}
            legend={
              <>
                <Swatch color="var(--c-frost)" label={t("ev.frostDays")} />
                <Swatch color="var(--c-hot)" label={t("ev.hotDays")} />
              </>
            }
            footer={
              <div className="space-y-0.5">
                <TrendLine label={t("ev.frostDays")} tr={trend("frost_days")} onTrace={(tr) => trendTrace(tr, t("ev.frostDays"))} />
                <TrendLine label={t("ev.hotDays")} tr={trend("hot_days")} onTrace={(tr) => trendTrace(tr, t("ev.hotDays"))} />
              </div>
            }
            table={<SimpleTable head={[t("ev.year"), t("ev.frostDays"), t("ev.hotDays")]} rows={c.annual.map((a) => [a.year, n(a.frostDays), n(a.hotDays)])} />}
          >
            <CountBarsChart annual={c.annual} field="frostDays" trend={trend("frost_days")} color="var(--c-frost)" label={t("ev.frostDays")} height={120} />
            <CountBarsChart annual={c.annual} field="hotDays" trend={trend("hot_days")} color="var(--c-hot)" label={t("ev.hotDays")} height={120} />
          </ChartCard>
          )}

          {tab === "gwet" && (
          <ChartCard
            title={t("ev.gwetTitle")}
            legend={
              <>
                <Swatch color="var(--c-precip)" label="+" />
                <Swatch color="var(--loam)" label="−" />
                <span>{t("ex.gwet.t")}</span>
              </>
            }
            footer={<TrendLine label="GWETROOT" tr={trend("gwet_root")} onTrace={(tr) => trendTrace(tr, t("ev.gwetTitle"))} digits={4} />}
            table={<SimpleTable head={[t("ev.year"), "GWETROOT"]} rows={c.annual.map((a) => [a.year, n(a.gwetRootMean, 3)])} />}
          >
            <WetnessAnomalyChart annual={c.annual} trend={trend("gwet_root")} />
          </ChartCard>
          )}

          {tab === "ndvi" && (
          <ChartCard
            title={t("ev.ndviTitle")}
            legend={<span>{t("ev.ndviBare")}</span>}
            footer={ndvi.status === "ok" && ndvi.data.sources[0] ? <SourceLine s={ndvi.data.sources[0]} /> : undefined}
            table={
              ndvi.status === "ok" ? (
                <SimpleTable head={[t("ev.date"), "NDVI"]} rows={ndvi.data.points.map((p) => [p.date, n(p.ndvi, 3)])} />
              ) : undefined
            }
          >
            {ndvi.status === "loading" && <p className="text-sm text-ink-2">{t("load.ndvi")}: {t("load.loading")}</p>}
            {ndvi.status === "error" && (
              <p className="text-sm">
                {t("ev.ndviMissing")} <span className="text-ink-2">({ndvi.message})</span>{" "}
                <button className="btn ml-1" onClick={onRetryNdvi}>
                  {t("load.retry")}
                </button>
              </p>
            )}
            {ndvi.status === "ok" && (ndvi.data.points.length ? <NdviChart ndvi={ndvi.data} /> : <p className="text-sm text-ink-2">{t("ev.ndviMissing")}</p>)}
          </ChartCard>
          )}
            </>
          )}
        </ChartTabs>

        <div className="rounded-lg border border-rule p-4 text-sm">
          <h3 className="font-semibold">{t("ev.quality")}</h3>
          <p className="mt-1 text-ink-2">
            {t("ev.qualityBody", {
              total: n(q.totalDays),
              interp: n(sum(q.interpolatedDays)),
              missing: n(sum(q.missingDays)),
              pm: n(q.et0PenmanMonteithDays),
              hg: n(q.et0HargreavesDays),
            })}{" "}
            {imerg === "validated" ? t("ev.imerg.validated") : t("ev.imerg.not")}
          </p>
          <ul className="mt-2 space-y-1">
            {c.sources.map((s) => (
              <li key={s.name}>
                <SourceLine s={s} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Explainers />
    </div>
  );
}

/** WAI-ARIA tabs with roving focus (arrows, Home, End). One chart at a time. */
function ChartTabs({ label, tabs, children }: { label: string; tabs: { id: string; label: string }[]; children: (id: string) => ReactNode }) {
  const [active, setActive] = useState(tabs[0].id);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (k: number) => {
    const i = (k + tabs.length) % tabs.length;
    setActive(tabs[i].id);
    refs.current[i]?.focus();
  };
  const idx = tabs.findIndex((x) => x.id === active);
  return (
    <div>
      <div role="tablist" aria-label={label} className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`evtab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`evpanel-${tab.id}`}
            tabIndex={tab.id === active ? 0 : -1}
            className={`tap shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab.id === active ? "bg-accent text-on-accent" : "text-ink-2 hover:bg-panel-2 hover:text-ink"}`}
            onClick={() => setActive(tab.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") move(i + 1);
              else if (e.key === "ArrowLeft") move(i - 1);
              else if (e.key === "Home") move(0);
              else if (e.key === "End") move(tabs.length - 1);
              else return;
              e.preventDefault();
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div key={active} role="tabpanel" id={`evpanel-${active}`} aria-labelledby={`evtab-${active}`} tabIndex={0} className="enter mt-3 rounded-2xl">
        {children(tabs[idx].id)}
      </div>
    </div>
  );
}

function unitOf(tr: TrendResult, t: (k: "unit.days" | "unit.mm") => string) {
  if (tr.variable === "hot_days" || tr.variable === "frost_days") return t("unit.days");
  if (tr.variable === "gwet_root") return "";
  return t("unit.mm");
}

function SourceLine({ s }: { s: SourceMeta }) {
  const { t } = useI18n();
  const day = /^\d{4}-\d{2}-\d{2}/.test(s.retrievedAt) ? s.retrievedAt.slice(0, 10) : s.retrievedAt;
  return (
    <span>
      {s.url ? (
        <a href={s.url} className="underline decoration-ink-2 underline-offset-2 hover:decoration-ink" target={s.url.startsWith("/") ? undefined : "_blank"} rel="noreferrer">
          {s.name}
        </a>
      ) : (
        s.name
      )}
      <span className="text-ink-2">
        , {s.spatialResolution}, {t("trace.retrieved", { d: day })}
      </span>
    </span>
  );
}

function TrendLine({ label, tr, onTrace, digits = 2 }: { label: string; tr?: TrendResult; onTrace: (tr: TrendResult) => Trace; digits?: number }) {
  const { t, n } = useI18n();
  if (!tr) return null;
  const p = n(tr.p, 3);
  const text = tr.significant ? t("ev.trendSig", { dir: t(`ev.dir.${tr.direction}`), p }) : t("ev.trendNs", { p });
  return (
    <p>
      <span className="font-medium text-ink">{label}:</span>{" "}
      <Traced trace={() => onTrace(tr)}>{text}</Traced>
      <span>; {t("ev.slope", { v: (tr.senSlope > 0 ? "+" : "") + n(tr.senSlope, digits), unit: unitOf(tr, t) })}</span>
    </p>
  );
}
