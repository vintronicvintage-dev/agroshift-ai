"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { CROPS } from "@/lib/engine";
import type { SnapshotIndexEntry } from "@/lib/data/snapshots";
import type { AnalysisResult, ClimateSeries, ClimateSummary, DailyWeather, SoilProfile } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { buildAlerts, type Alert } from "@/lib/ui/alerts";
import type { CalibrationInfo } from "@/lib/ui/calibration";
import { shortName } from "@/lib/ui/crops";
import type { SiteData } from "@/lib/ui/siteData";
import { composeVerdict } from "@/lib/ui/verdict";
import type { SectionId } from "@/lib/ui/steps";
import type { Site } from "@/components/field/site";
import { CropArt } from "@/components/brand/CropArt";
import { SpotArt } from "@/components/brand/SpotArt";
import { MonthlyBalanceChart } from "@/components/charts/ClimateCharts";
import { Swatch } from "@/components/charts/chartKit";
import { StripCalendar } from "@/components/compare/StripCalendar";
import { usePlanTitle, Verdict } from "@/components/compare/Verdict";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";
import { JudgmentNote } from "@/components/shell/JudgmentNote";
import { EmptyArt } from "@/components/ui/EmptyArt";
import { Num } from "@/components/ui/Num";
import { HashLink } from "@/components/ui/HashLink";
import { Icon } from "@/components/ui/Icons";

const FieldMap = dynamic(() => import("@/components/field/FieldMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-panel-2" />,
});

interface Props {
  pilots: SnapshotIndexEntry[] | null;
  site: Site | null;
  siteName: string | null;
  data: SiteData | null;
  rawClimate: ClimateSeries | null;
  climate: ClimateSummary | null;
  result: AnalysisResult | null;
  running: boolean;
  calibration: CalibrationInfo | null;
  imerg: "validated" | "not_validated" | null;
  soil: SoilProfile | null;
  areaDa: number | null;
  zoneLabel: string | null;
  onPilot: (id: string) => void;
  onPoint: (lat: number, lon: number) => void;
  onOpenPlan: (planId: string) => void;
}

/**
 * The overview, read in this order: the answer (which plan, how it differs from yours), where the
 * field is, the three climate readouts, then the plan table and what to watch, then supporting
 * detail. Sections sit on the paper under hairlines on one 12-column grid. Every number comes from
 * the data layer or the engine result.
 */
export function Overview(p: Props) {
  if (!p.site) return <OverviewEmpty {...p} />;
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-6 xl:grid-cols-12">
      <BestPlan result={p.result} running={p.running} />
      <MapBlock {...p} />
      <Readouts climate={p.climate} calibration={p.calibration} />
      <PlanTable result={p.result} onOpenPlan={p.onOpenPlan} />
      <AlertsSection {...p} />
      <WaterBalance climate={p.climate} calibration={p.calibration} />
      <ClimateDay data={p.data} raw={p.rawClimate} />
      <SoilSection result={p.result} />
    </div>
  );
}

// ── building blocks ───────────────────────────────────────────────────────

/** One section anatomy everywhere: hairline, serif title, optional quiet link on the right. */
function Section({ title, action, className = "", children }: { title: string; action?: ReactNode; className?: string; children: ReactNode }) {
  const id = `s-${title.replace(/[^\p{L}\d]+/gu, "-").toLowerCase()}`;
  return (
    <section className={`sec flex flex-col ${className}`} aria-labelledby={id}>
      <header className="mb-4 flex min-h-8 items-baseline justify-between gap-3">
        <h2 id={id} className="sec-title">
          {title}
        </h2>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function SectionLink({ to, label }: { to: SectionId; label: string }) {
  return (
    <HashLink to={to} className="tap inline-flex min-h-8 shrink-0 items-center gap-1 rounded-md px-1.5 text-[0.85rem] font-semibold text-accent-ink hover:bg-panel-2">
      {label}
      <Icon name="arrow" size={14} />
    </HashLink>
  );
}

function Waiting({ children }: { children: ReactNode }) {
  return <p className="lbl recalc py-2">{children}</p>;
}

// ── nothing picked yet: one empty state, one action ────────────────────────

function OverviewEmpty(p: Props) {
  const { t, lang } = useI18n();
  const pname = (x: { nameTr: string | null; nameEn: string | null }) => (lang === "tr" ? x.nameTr : x.nameEn) ?? "";
  return (
    <div className="grid gap-8 md:grid-cols-6 xl:grid-cols-12">
      <section className="sec md:col-span-6 xl:col-span-5" aria-labelledby="ov-empty-h">
        <EmptyArt kind="field" />
        <h2 id="ov-empty-h" className="mt-4 font-display text-[length:var(--text-step-3)] font-[560] leading-[1.1] tracking-[-0.02em]">
          {t("ov.empty.title")}
        </h2>
        <p className="mt-3 max-w-[52ch] text-ink-2">{t("ov.empty.body")}</p>
        <ul className="mt-4 max-w-[52ch] space-y-2 text-[0.95rem]">
          {(["ov.empty.i1", "ov.empty.i2", "ov.empty.i3"] as const).map((k) => (
            <li key={k} className="flex gap-2.5">
              <span className="mt-[0.55rem] h-px w-3 shrink-0 bg-ink-2" aria-hidden="true" />
              {t(k)}
            </li>
          ))}
        </ul>
        <HashLink to="tarlam" className="btn btn-primary btn-lg mt-6">
          {t("ov.map.pick")}
          <Icon name="arrow" size={16} />
        </HashLink>
        <div className="mt-6 border-t border-rule pt-4">
          <JudgmentNote compact />
        </div>
      </section>
      <div className="md:col-span-6 xl:col-span-7">
        <div className="card relative isolate h-[20rem] overflow-hidden xl:h-[28rem]">
          <FieldMap
            pilots={(p.pilots ?? []).map((x) => ({ id: x.id, name: pname(x), lat: x.lat, lon: x.lon }))}
            selected={null}
            showNdvi={false}
            onPick={p.onPoint}
            onPilot={p.onPilot}
            label={t("ov.map.label")}
            base="satellite"
            focusZoom={7}
          />
        </div>
        <p className="lbl mt-2">{t("ov.map.empty")}</p>
      </div>
    </div>
  );
}

// ── the answer ───────────────────────────────────────────────────────────

function BestPlan({ result, running }: { result: AnalysisResult | null; running: boolean }) {
  const { t } = useI18n();
  const v = result ? composeVerdict(result) : null;
  return (
    <section className="md:col-span-6 xl:col-span-7" aria-labelledby="ov-best-h">
      <h2 id="ov-best-h" className="sr-only">
        {t("ov.best.title")}
      </h2>
      {result && v ? (
        <div className={running ? "opacity-80 transition-opacity" : undefined}>
          <Verdict result={result} />
          <div className="mt-6">
            <StripCalendar crops={v.best.crops} zone={result.zone} />
          </div>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
            <p className="flex items-baseline gap-3">
              <span className="lbl">{t("plan.score")}</span>
              <span className="readout text-[length:var(--text-step-3)] text-accent-ink">
                <Num value={v.best.score.composite} />
              </span>
              <span className="unit">/100</span>
              {!v.bestIsCurrent && (
                <span className="lbl ml-1 tabular-nums">
                  {t("ov.fitRef", { s: String(Math.round(result.current.score.composite)) })}
                </span>
              )}
            </p>
            <HashLink to="oneriler" className="btn btn-primary btn-lg">
              {t("ov.best.compare")}
              <Icon name="arrow" size={16} />
            </HashLink>
          </div>
          <div className="mt-5 border-t border-rule pt-4">
            <JudgmentNote compact />
          </div>
        </div>
      ) : (
        <div>
          <p className="recalc font-display text-[length:var(--text-step-2)] font-[560] leading-tight">{running ? t("run.first") : t("ov.best.empty")}</p>
          <div className="mt-5 border-t border-rule pt-4">
            <JudgmentNote compact />
          </div>
        </div>
      )}
    </section>
  );
}

// ── where ────────────────────────────────────────────────────────────────

function MapBlock(p: Props) {
  const { t, n, lang } = useI18n();
  const pname = (x: { nameTr: string | null; nameEn: string | null }) => (lang === "tr" ? x.nameTr : x.nameEn) ?? "";
  const elevation = p.rawClimate?.elevation ?? null;
  const site = p.site!;
  return (
    <section className="md:col-span-6 xl:col-span-5" aria-label={t("ov.map.title")}>
      <div className="card relative isolate h-[15rem] overflow-hidden sm:h-[17rem]">
        <FieldMap
          pilots={(p.pilots ?? []).map((x) => ({ id: x.id, name: pname(x), lat: x.lat, lon: x.lon }))}
          selected={{ lat: site.lat, lon: site.lon }}
          showNdvi={false}
          onPick={p.onPoint}
          onPilot={p.onPilot}
          label={t("ov.map.label")}
          base="satellite"
          focusZoom={7}
        />
      </div>
      <div className="mt-3 flex items-start justify-between gap-3" aria-live="polite">
        <div className="min-w-0">
          <p className="font-display text-[length:var(--text-step-1)] font-[560] leading-tight">{p.siteName}</p>
          <dl className="lbl mt-1 flex flex-wrap gap-x-4 gap-y-0.5 tabular-nums">
            <div className="flex gap-1">
              <dt className="sr-only">{t("site.selected")}</dt>
              <dd>
                {n(site.lat, 2)}° N, {n(site.lon, 2)}° E
              </dd>
            </div>
            {elevation !== null && (
              <div className="flex gap-1">
                <dt>{t("ov.map.elevation")}</dt>
                <dd className="text-ink">{n(elevation)} m</dd>
              </div>
            )}
            {p.areaDa !== null && (
              <div className="flex gap-1">
                <dt>{t("ov.map.area")}</dt>
                <dd className="text-ink">
                  {n(p.areaDa)} {t("field.areaUnit")}
                </dd>
              </div>
            )}
            {p.zoneLabel && (
              <div className="flex gap-1">
                <dt>{t("ov.map.zone")}</dt>
                <dd className="text-ink">{p.zoneLabel}</dd>
              </div>
            )}
          </dl>
        </div>
        <HashLink to="tarlam" className="btn shrink-0">
          <Icon name="pin" size={16} />
          {t("ov.map.change")}
        </HashLink>
      </div>
    </section>
  );
}

// ── three climate readouts, each with a reference ─────────────────────────

function Readouts({ climate, calibration }: { climate: ClimateSummary | null; calibration: CalibrationInfo | null }) {
  const { t, n } = useI18n();
  const P = climate?.meanAnnualPrecipMm ?? null;
  const E = climate?.meanAnnualEt0Mm ?? null;
  const gap = P !== null && E !== null ? E - P : null;
  const years = climate ? t("ov.st.years", { n: climate.completeYears.length }) : "";
  return (
    <section className="sec md:col-span-6 xl:col-span-12" aria-labelledby="ov-rd-h">
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="ov-rd-h" className="sec-title">
          {t("ov.rd.title")}
        </h2>
        {climate && (
          <span className="flex items-center gap-3">
            <span className="lbl">{years}</span>
            <CalibrationBadge calibration={calibration} small />
          </span>
        )}
      </header>
      {climate ? (
        <dl className="grid grid-cols-1 gap-y-5 sm:grid-cols-3 sm:divide-x sm:divide-rule">
          <Readout label={t("ov.st.precip")} value={P} unit="mm" sub={P !== null && E ? t("ov.st.precipRef", { p: n((P / E) * 100) }) : ""} color="var(--c-precip)" />
          <Readout label={t("ev.et0")} value={E} unit="mm" sub={t("ov.st.et0Sub")} color="var(--c-et0)" />
          <Readout label={t("ov.st.gap")} value={gap} unit="mm" sub={t("ov.st.gapSub")} />
        </dl>
      ) : (
        <Waiting>{t("ov.cl.loading")}</Waiting>
      )}
    </section>
  );
}

function Readout({ label, value, unit, sub, color }: { label: string; value: number | null; unit: string; sub: string; color?: string }) {
  return (
    <div className="min-w-0 sm:px-6 sm:first:pl-0">
      <dt className="lbl flex items-center gap-2">
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden="true" />}
        {label}
      </dt>
      <dd className="mt-2">
        <span className="readout text-[length:var(--text-step-3)] xl:text-[length:var(--text-step-4)]">
          <Num value={value} />
        </span>
        <span className="unit ml-1.5">{unit}</span>
        <span className="lbl mt-1.5 block">{sub}</span>
      </dd>
    </div>
  );
}

// ── plans ────────────────────────────────────────────────────────────────

function PlanTable({ result, onOpenPlan }: { result: AnalysisResult | null; onOpenPlan: (id: string) => void }) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  const cls = "md:col-span-6 xl:col-span-8";
  if (!result) {
    return (
      <Section className={cls} title={t("ov.tbl.title")}>
        <Waiting>{t("ov.tbl.empty")}</Waiting>
      </Section>
    );
  }
  const plans = [result.current, ...result.alternatives, ...result.userPlans];
  const best = composeVerdict(result).best;
  const cols: { k: DictKey; unit: DictKey }[] = [
    { k: "tbl.fit", unit: "tbl.soilUnit" },
    { k: "tbl.deficit", unit: "tbl.deficitUnit" },
    { k: "tbl.margin", unit: "tbl.marginUnit" },
  ];
  return (
    <Section className={cls} title={t("ov.tbl.title")} action={<SectionLink to="oneriler" label={t("ov.tbl.all")} />}>
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{t("tbl.caption")}</caption>
          <thead>
            <tr className="lbl align-bottom">
              <th scope="col" className="px-2 pb-2 font-normal">
                {t("tbl.plan")}
              </th>
              {cols.map((c) => (
                <th key={c.k} scope="col" className="px-2 pb-2 text-right font-normal">
                  <span className="block font-semibold text-ink">{t(c.k)}</span>
                  {t(c.unit)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((pl) => (
              <tr key={pl.id} className="cmp-row border-t border-rule">
                <th scope="row" className="px-2 py-3 font-normal">
                  <button type="button" className="tap -mx-1 rounded-md px-1 text-left" aria-label={t("ov.tbl.open", { plan: title(pl) })} onClick={() => onOpenPlan(pl.id)}>
                    <span className="flex items-center gap-2">
                      <span className={`font-semibold ${pl.kind === "current" ? "text-ink-2" : "text-ink"}`}>{title(pl)}</span>
                      {pl === best && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-on-accent">{t("tbl.best")}</span>}
                    </span>
                    <span className="lbl mt-0.5 flex flex-wrap gap-x-2.5">
                      {pl.crops.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <CropArt crop={c} size={28} />
                          {shortName(L(CROPS[c].name))}
                        </span>
                      ))}
                    </span>
                  </button>
                </th>
                <td className="readout px-2 py-3 text-right text-[1.1rem]">
                  <Num value={pl.score.composite} />
                </td>
                <td className="readout px-2 py-3 text-right text-[1rem]">
                  <Num value={pl.water.requirementMmPerYr?.p50 ?? null} />
                </td>
                <td className="readout px-2 py-3 text-right text-[1rem]">
                  <Num value={pl.economics.grossMarginTLPerDaPerYr?.p50 ?? null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ── things to watch ──────────────────────────────────────────────────────

function AlertsSection(p: Props) {
  const { t, n } = useI18n();
  const title = usePlanTitle();
  const best = p.result ? composeVerdict(p.result).best : null;
  const alerts = buildAlerts({
    data: p.data,
    climate: p.climate,
    result: p.result,
    calibration: p.calibration,
    imerg: p.imerg,
    soil: p.soil,
    best,
    n: (v, d) => n(v, d),
    unit: (v) => (v === "hot_days" || v === "frost_days" ? ` ${t("unit.days")}` : v === "gwet_root" ? "" : ` ${t("unit.mm")}`),
    dir: (d) => t(`ev.dir.${d}`),
  });
  return (
    <Section className="md:col-span-6 xl:col-span-4" title={t("ov.al.title")} action={alerts.length ? <span className="lbl tabular-nums">{t("ov.al.count", { n: alerts.length })}</span> : undefined}>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-4">
          <SpotArt name="no-alerts" width={96} />
          <p className="lbl">{t("ov.al.empty")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-rule">
          {alerts.map((a) => (
            <AlertRow key={a.id} a={a} plan={best ? title(best) : ""} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function AlertRow({ a, plan }: { a: Alert; plan: string }) {
  const { t, L } = useI18n();
  const warn = a.tone === "warn";
  const sub = a.subText ? L(a.subText) : a.sub ? t(a.sub, { plan, ...a.subParams }) : null;
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0">
      <span className={`mt-0.5 shrink-0 ${warn ? "text-warn-ink" : "text-ink-2"}`}>
        <Icon name={warn ? "alert" : "info"} size={17} />
        <span className="sr-only">{warn ? t("ov.al.warn") : t("ov.al.info")}</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] font-semibold leading-snug">{t(a.title, a.params)}</p>
        {sub && <p className="lbl mt-0.5">{sub}</p>}
        <HashLink to={a.section} className="tap mt-1 inline-flex min-h-7 items-center gap-1 text-[0.82rem] font-semibold text-accent-ink hover:underline">
          {t(a.action)}
          <Icon name="arrow" size={13} />
        </HashLink>
      </div>
    </li>
  );
}

// ── supporting detail ────────────────────────────────────────────────────

function WaterBalance({ climate, calibration }: { climate: ClimateSummary | null; calibration: CalibrationInfo | null }) {
  const { t } = useI18n();
  return (
    <Section className="md:col-span-6 xl:col-span-6" title={t("ov.wb.title")} action={climate ? <SectionLink to="kanit" label={t("ov.wb.more")} /> : undefined}>
      {climate ? (
        <>
          <div className="lbl mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <Swatch color="var(--c-precip)" label={t("ev.precipShort")} />
            <Swatch color="var(--c-et0)" label={t("ov.wb.need")} />
            {!calibration && <span>{t("cal.none")}</span>}
          </div>
          <MonthlyBalanceChart monthly={climate.monthly} height={180} />
        </>
      ) : (
        <Waiting>{t("ov.cl.loading")}</Waiting>
      )}
    </Section>
  );
}

function lastRecord(raw: ClimateSeries): DailyWeather | null {
  for (let i = raw.daily.length - 1; i >= 0; i--) {
    const d = raw.daily[i];
    if (d.tmean !== null || d.tmax !== null || d.precip !== null) return d;
  }
  return null;
}

function ClimateDay({ data, raw }: { data: SiteData | null; raw: ClimateSeries | null }) {
  const { t, n, locale } = useI18n();
  const day = raw ? lastRecord(raw) : null;
  const status = data?.climate.status;
  const dateText = day ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`)) : null;
  return (
    <Section className="md:col-span-3 xl:col-span-3" title={t("ov.cl.title")}>
      {day && dateText ? (
        <div className="flex flex-1 flex-col">
          <p className="lbl">
            <time dateTime={day.date} className="font-semibold text-ink">
              {dateText}
            </time>
            , {t("ov.cl.source")}
          </p>
          <p className="mt-3">
            <span className="readout text-[length:var(--text-step-3)]">{n(day.tmean, 1)}°</span>
            <span className="lbl mt-1 block tabular-nums">
              {t("ov.cl.temp")}, {t("ov.cl.range", { lo: n(day.tmin, 1), hi: n(day.tmax, 1) })}
            </span>
          </p>
          <dl className="mt-4 text-sm">
            <Row label={t("ov.cl.rain")} value={`${n(day.precip, 1)} mm`} />
            <Row label={t("ov.cl.wind")} value={`${n(day.wind2m, 1)} m/s`} />
            <Row label={t("ov.cl.root")} value={day.gwetRoot === null ? t("plan.noData") : `%${n(day.gwetRoot * 100)}`} hint={t("ov.cl.rootHelp")} />
          </dl>
          <p className="lbl mt-3">{t("ov.cl.note")}</p>
        </div>
      ) : status === "error" ? (
        <div>
          <p className="lbl">{t("ov.cl.error")}</p>
          <HashLink to="tarlam" className="btn mt-3">
            {t("load.retry")}
          </HashLink>
        </div>
      ) : (
        <Waiting>{t("ov.cl.loading")}</Waiting>
      )}
    </Section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-baseline gap-2 border-t border-rule py-2">
      <dt className="min-w-0 flex-1 text-ink-2">
        {label}
        {hint && <span className="sr-only">, {hint}</span>}
      </dt>
      <dd className="readout text-[0.95rem]">{value}</dd>
    </div>
  );
}

function SoilSection({ result }: { result: AnalysisResult | null }) {
  const { t, n, L } = useI18n();
  const title = usePlanTitle();
  const best = result ? composeVerdict(result).best : null;
  const cls = "md:col-span-3 xl:col-span-3";
  if (!best) {
    return (
      <Section className={cls} title={t("ov.soil.title")}>
        <Waiting>{t("ov.soil.empty")}</Waiting>
      </Section>
    );
  }
  const sh = best.soilHealth;
  return (
    <Section className={cls} title={t("ov.soil.title")}>
      <p className="flex items-baseline gap-1.5">
        <span className="readout text-[length:var(--text-step-3)]">
          <Num value={sh.score} />
        </span>
        <span className="unit">/100</span>
        <span className="lbl ml-2">{t("ov.soil.sub", { plan: title(best) })}</span>
      </p>
      <ul className="mt-4 space-y-2">
        {sh.components.map((c) => (
          <li key={c.key} className="text-[0.8rem]">
            <span className="flex items-baseline justify-between gap-2">
              <span className="truncate text-ink-2" title={L(c.label)}>
                {L(c.label)}
              </span>
              <span className="readout shrink-0">
                {n(c.value * c.weight)}/{n(c.weight)}
              </span>
            </span>
            <span className="mt-1 block h-1 rounded-full bg-panel-2" aria-hidden="true">
              <span className="block h-full origin-left rounded-full bg-[var(--c-green)] transition-transform duration-200 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(1, c.value))})` }} />
            </span>
          </li>
        ))}
      </ul>
      <p className="lbl mt-3">{t("plan.soilNote")}</p>
    </Section>
  );
}
