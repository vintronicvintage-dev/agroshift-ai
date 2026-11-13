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
import { CropSwatch } from "@/components/field/CropChip";
import { MonthlyBalanceChart } from "@/components/charts/ClimateCharts";
import { Swatch } from "@/components/charts/chartKit";
import { StripCalendar } from "@/components/compare/StripCalendar";
import { usePlanTitle, Verdict } from "@/components/compare/Verdict";
import { CalibrationBadge } from "@/components/evidence/CalibrationBadge";
import { JudgmentNote } from "@/components/shell/JudgmentNote";
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

/** The overview bento. Every number comes from the data layer or the engine result. */
export function Overview(p: Props) {
  const { t } = useI18n();
  const best = p.result ? composeVerdict(p.result).best : null;
  return (
    <div className="bento">
      <MapCard {...p} />
      <StatTiles climate={p.climate} calibration={p.calibration} fit={best?.score.composite ?? null} running={p.running && !p.result} />
      <BestPlanCard result={p.result} running={p.running} hasSite={!!p.site} />
      <ClimateDayCard data={p.data} raw={p.rawClimate} hasSite={!!p.site} />
      <Card className="md:col-span-3 xl:col-span-5" title={t("ov.wb.title")} action={p.climate ? <SectionLink to="kanit" label={t("ov.wb.more")} /> : undefined}>
        {p.climate ? (
          <>
            <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-2">
              <Swatch color="var(--c-precip)" label={t("ev.precipShort")} />
              <Swatch color="var(--c-et0)" label="ET₀" />
              <CalibrationBadge calibration={p.calibration} small />
            </div>
            <MonthlyBalanceChart monthly={p.climate.monthly} height={168} />
          </>
        ) : (
          <Empty icon="rain">{t("ov.wb.empty")}</Empty>
        )}
      </Card>
      <AlertsCard {...p} />
      <PlanTable result={p.result} onOpenPlan={p.onOpenPlan} />
      <SoilCard result={p.result} />
    </div>
  );
}

// ── building blocks ───────────────────────────────────────────────────────

function Card({ title, action, className = "", children, labelledBy }: { title: string; action?: ReactNode; className?: string; children: ReactNode; labelledBy?: string }) {
  const id = labelledBy ?? `c-${title.replace(/[^\p{L}\d]+/gu, "-").toLowerCase()}`;
  return (
    <section className={`card flex flex-col p-4 sm:p-5 ${className}`} aria-labelledby={id}>
      <header className="mb-3 flex min-h-7 items-center justify-between gap-3">
        <h3 id={id} className="card-title">
          {title}
        </h3>
        {action}
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

function SectionLink({ to, label }: { to: SectionId; label: string }) {
  return (
    <HashLink to={to} className="tap inline-flex min-h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-[0.8rem] font-semibold text-accent-ink hover:bg-panel-2">
      {label}
      <Icon name="arrow" size={14} />
    </HashLink>
  );
}

function Empty({ icon, children, action }: { icon: Parameters<typeof Icon>[0]["name"]; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-start justify-center gap-3 rounded-xl border border-dashed border-rule-strong px-4 py-5 text-sm text-ink-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-panel-2 text-ink-2">
        <Icon name={icon} size={18} />
      </span>
      <div className="max-w-[38ch]">{children}</div>
      {action}
    </div>
  );
}

const PickFirst = () => {
  const { t } = useI18n();
  return (
    <HashLink to="tarlam" className="btn btn-primary">
      {t("ov.map.pick")}
      <Icon name="arrow" size={16} />
    </HashLink>
  );
};

// ── map ──────────────────────────────────────────────────────────────────

function MapCard(p: Props) {
  const { t, n, lang } = useI18n();
  const pname = (x: { nameTr: string | null; nameEn: string | null }) => (lang === "tr" ? x.nameTr : x.nameEn) ?? "";
  const elevation = p.rawClimate?.elevation ?? null;
  return (
    <section className="card relative isolate h-[19rem] overflow-hidden md:col-span-6 xl:col-span-5 xl:h-[21rem]" aria-label={t("ov.map.title")}>
      <FieldMap
        pilots={(p.pilots ?? []).map((x) => ({ id: x.id, name: pname(x), lat: x.lat, lon: x.lon }))}
        selected={p.site ? { lat: p.site.lat, lon: p.site.lon } : null}
        showNdvi={false}
        onPick={p.onPoint}
        onPilot={p.onPilot}
        label={t("ov.map.label")}
        base="satellite"
        focusZoom={7}
      />
      <HashLink to="tarlam" className="btn absolute right-3 top-3 z-[500] bg-panel/90 backdrop-blur">
        <Icon name="pin" size={16} />
        {p.site ? t("ov.map.change") : t("ov.map.pick")}
      </HashLink>
      <div className="pointer-events-none absolute inset-x-3 bottom-7 z-[500]">
        <div className="pointer-events-auto inline-block max-w-full rounded-xl border border-rule-strong bg-panel/92 px-3.5 py-2.5 shadow-[0_10px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur" aria-live="polite">
          {p.site ? (
            <>
              <p className="font-display text-[1.15rem] font-semibold leading-tight tracking-[-0.01em]">{p.siteName}</p>
              <dl className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.8rem] text-ink-2 tabular-nums">
                <div className="flex gap-1">
                  <dt className="sr-only">{t("site.selected")}</dt>
                  <dd>
                    {n(p.site.lat, 2)}° N, {n(p.site.lon, 2)}° E
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
            </>
          ) : (
            <p className="max-w-[34ch] text-sm text-ink">{t("ov.map.empty")}</p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── stat tiles ───────────────────────────────────────────────────────────

function StatTiles({ climate, calibration, fit, running }: { climate: ClimateSummary | null; calibration: CalibrationInfo | null; fit: number | null; running: boolean }) {
  const { t } = useI18n();
  const P = climate?.meanAnnualPrecipMm ?? null;
  const E = climate?.meanAnnualEt0Mm ?? null;
  const gap = P !== null && E !== null ? E - P : null;
  const years = climate ? t("ov.st.years", { n: climate.completeYears.length }) : t("ov.st.wait");
  return (
    <div className="grid grid-cols-2 gap-3 md:col-span-6 md:grid-cols-4 xl:col-span-3 xl:grid-cols-2 xl:gap-4" role="group" aria-label={`${t("ov.st.precip")}, ${t("ov.st.et0")}, ${t("ov.st.gap")}, ${t("ov.st.fit")}`}>
      <Stat label={t("ov.st.precip")} value={P} unit="mm" sub={years} tone="var(--c-precip)" extra={climate && !calibration ? <span className="text-warn-ink">{t("cal.none")}</span> : undefined} />
      <Stat label={t("ov.st.et0")} value={E} unit="mm" sub={years} tone="var(--c-et0)" />
      <Stat label={t("ov.st.gap")} value={gap} unit="mm" sub={t("ov.st.gapSub")} />
      <Stat label={t("ov.st.fit")} value={fit} unit="/100" sub={running ? t("run.first") : fit === null ? t("ov.st.wait") : t("ov.st.fitSub")} tone="var(--accent-ink)" busy={running} />
    </div>
  );
}

function Stat({ label, value, unit, sub, tone, extra, busy }: { label: string; value: number | null; unit: string; sub: string; tone?: string; extra?: ReactNode; busy?: boolean }) {
  return (
    <div className="card flex min-h-[8.75rem] flex-col justify-between p-3.5 xl:min-h-[9.75rem] xl:p-4">
      <p className="text-[0.8rem] font-medium leading-tight text-ink-2">{label}</p>
      <p className={`mt-2 flex items-baseline gap-1 ${busy ? "recalc" : ""}`}>
        <span className="text-[clamp(1.65rem,1.95vw,2.2rem)] font-light leading-none tracking-[-0.035em] tabular-nums" style={tone && value !== null ? { color: tone } : undefined}>
          <Num value={value} />
        </span>
        <span className="text-[0.8rem] text-ink-2">{unit}</span>
      </p>
      <p className="mt-1.5 text-[0.72rem] leading-tight text-ink-2">
        {sub}
        {extra && <>, {extra}</>}
      </p>
    </div>
  );
}

// ── best plan ────────────────────────────────────────────────────────────

function BestPlanCard({ result, running, hasSite }: { result: AnalysisResult | null; running: boolean; hasSite: boolean }) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  const v = result ? composeVerdict(result) : null;
  return (
    <Card
      className="md:col-span-6 xl:col-span-4"
      title={t("ov.best.title")}
      action={
        v ? (
          <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[0.78rem] font-semibold tabular-nums text-accent-ink">
            {t("plan.score")} <Num value={v.best.score.composite} />
          </span>
        ) : undefined
      }
    >
      {result && v ? (
        <div className={`flex flex-1 flex-col gap-3 ${running ? "opacity-80 transition-opacity" : ""}`}>
          <Verdict result={result} size="sm" />
          <div>
            <p className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8rem] text-ink-2">
              <span className="font-semibold text-ink">{title(v.best)}</span>
              {v.best.crops.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1">
                  <CropSwatch id={c} size={9} />
                  {shortName(L(CROPS[c].name))}
                </span>
              ))}
            </p>
            <StripCalendar crops={v.best.crops} zone={result.zone} />
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            <JudgmentNote compact />
            <HashLink to="oneriler" className="btn btn-primary">
              {t("ov.best.compare")}
              <Icon name="arrow" size={16} />
            </HashLink>
          </div>
        </div>
      ) : (
        <Empty icon="options" action={hasSite ? undefined : <PickFirst />}>
          <p className={running ? "recalc" : undefined}>{running ? t("run.first") : t("ov.best.empty")}</p>
          <div className="mt-3">
            <JudgmentNote compact />
          </div>
        </Empty>
      )}
    </Card>
  );
}

// ── climate day ──────────────────────────────────────────────────────────

function lastRecord(raw: ClimateSeries): DailyWeather | null {
  for (let i = raw.daily.length - 1; i >= 0; i--) {
    const d = raw.daily[i];
    if (d.tmean !== null || d.tmax !== null || d.precip !== null) return d;
  }
  return null;
}

function ClimateDayCard({ data, raw, hasSite }: { data: SiteData | null; raw: ClimateSeries | null; hasSite: boolean }) {
  const { t, n, locale } = useI18n();
  const day = raw ? lastRecord(raw) : null;
  const status = data?.climate.status;
  const dateText = day ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${day.date}T00:00:00Z`)) : null;
  return (
    <Card className="md:col-span-3 xl:col-span-3" title={t("ov.cl.title")}>
      {day && dateText ? (
        <div className="flex flex-1 flex-col">
          <p className="text-[0.8rem] text-ink-2">
            <time dateTime={day.date} className="font-semibold text-ink">
              {dateText}
            </time>
            <span className="block">{t("ov.cl.source", { date: day.date })}</span>
          </p>
          <p className="mt-3">
            <span className="text-[2.6rem] font-light leading-none tracking-[-0.04em] tabular-nums">{n(day.tmean, 1)}°</span>
            <span className="mt-1 block text-[0.78rem] text-ink-2 tabular-nums">
              {t("ov.cl.temp")}, {t("ov.cl.range", { lo: n(day.tmin, 1), hi: n(day.tmax, 1) })}
            </span>
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <Row icon="rain" label={t("ov.cl.rain")} value={`${n(day.precip, 1)} mm`} />
            <Row icon="wind" label={t("ov.cl.wind")} value={`${n(day.wind2m, 1)} m/s`} />
            <Row icon="drop" label={t("ov.cl.root")} value={day.gwetRoot === null ? "—" : `%${n(day.gwetRoot * 100)}`} hint={t("ov.cl.rootHelp")} />
          </dl>
          <p className="mt-auto pt-3 text-[0.72rem] leading-snug text-ink-2">{t("ov.cl.note")}</p>
        </div>
      ) : status === "loading" ? (
        <Empty icon="satellite">
          <span className="recalc">{t("ov.cl.loading")}</span>
        </Empty>
      ) : status === "error" ? (
        <Empty icon="alert" action={<HashLink to="tarlam" className="btn">{t("load.retry")}</HashLink>}>
          {t("ov.cl.error")}
        </Empty>
      ) : (
        <Empty icon="thermo" action={hasSite ? undefined : <PickFirst />}>
          {t("ov.cl.empty")}
        </Empty>
      )}
    </Card>
  );
}

function Row({ icon, label, value, hint }: { icon: "rain" | "wind" | "drop"; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-rule pt-2">
      <span className="text-ink-2">
        <Icon name={icon} size={17} />
      </span>
      <dt className="min-w-0 flex-1 text-ink-2">
        {label}
        {hint && <span className="sr-only">, {hint}</span>}
      </dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

// ── things to watch ──────────────────────────────────────────────────────

function AlertsCard(p: Props) {
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
    unit: (v) => (v === "hot_days" || v === "frost_days" ? t("unit.days") : v === "gwet_root" ? "" : t("unit.mm")),
    dir: (d) => t(`ev.dir.${d}`),
  });
  return (
    <Card className="md:col-span-6 xl:col-span-4" title={t("ov.al.title")} action={alerts.length ? <span className="rounded-full bg-panel-2 px-2 py-0.5 text-[0.75rem] font-semibold tabular-nums text-ink-2">{alerts.length}</span> : undefined}>
      {!p.site ? (
        <Empty icon="alert" action={<PickFirst />}>
          {t("ov.al.noSite")}
        </Empty>
      ) : alerts.length === 0 ? (
        <Empty icon="check">{t("ov.al.empty")}</Empty>
      ) : (
        <ul className="-mr-1 max-h-[19rem] space-y-2 overflow-y-auto pr-1">
          {alerts.map((a) => (
            <AlertRow key={a.id} a={a} plan={best ? title(best) : ""} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AlertRow({ a, plan }: { a: Alert; plan: string }) {
  const { t, L } = useI18n();
  const warn = a.tone === "warn";
  const sub = a.subText ? L(a.subText) : a.sub ? t(a.sub, { plan, ...a.subParams }) : null;
  return (
    <li className="flex items-start gap-3 rounded-xl bg-panel-2 p-2.5">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${warn ? "bg-warn text-warn-ink" : "bg-sky-soft text-sky"}`}>
        <Icon name={warn ? "alert" : "info"} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[0.86rem] font-semibold leading-snug">{t(a.title, a.params)}</p>
        {sub && <p className="mt-0.5 text-[0.76rem] leading-snug text-ink-2">{sub}</p>}
      </div>
      <HashLink to={a.section} className="btn shrink-0 px-2.5 py-1 text-[0.76rem]">
        {t(a.action)}
      </HashLink>
    </li>
  );
}

// ── compact plan table ───────────────────────────────────────────────────

function PlanTable({ result, onOpenPlan }: { result: AnalysisResult | null; onOpenPlan: (id: string) => void }) {
  const { t, L } = useI18n();
  const title = usePlanTitle();
  if (!result) {
    return (
      <Card className="md:col-span-6 xl:col-span-8" title={t("ov.tbl.title")}>
        <Empty icon="options">{t("ov.tbl.empty")}</Empty>
      </Card>
    );
  }
  const plans = [result.current, ...result.alternatives, ...result.userPlans];
  const best = composeVerdict(result).best;
  const cols: { k: DictKey; unit?: DictKey }[] = [
    { k: "tbl.fit", unit: "tbl.soilUnit" },
    { k: "tbl.deficit", unit: "tbl.deficitUnit" },
    { k: "tbl.margin", unit: "tbl.marginUnit" },
  ];
  return (
    <Card className="md:col-span-6 xl:col-span-8" title={t("ov.tbl.title")} action={<SectionLink to="oneriler" label={t("ov.tbl.all")} />}>
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">{t("tbl.caption")}</caption>
          <thead>
            <tr className="text-[0.76rem] text-ink-2">
              <th scope="col" className="px-1.5 pb-2 font-medium sm:px-2">
                {t("tbl.plan")}
              </th>
              {cols.map((c) => (
                <th key={c.k} scope="col" className="px-1.5 pb-2 text-right font-medium sm:px-2">
                  {t(c.k)}
                  {c.unit && <span className="block text-[0.7rem] font-normal">{t(c.unit)}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plans.map((pl) => (
              <tr key={pl.id} className="cmp-row cursor-pointer border-t border-rule" onClick={() => onOpenPlan(pl.id)}>
                <th scope="row" className="px-1.5 py-2.5 font-normal sm:px-2">
                  <button type="button" className="tap -mx-1 rounded-md px-1 text-left" aria-label={t("ov.tbl.open", { plan: title(pl) })} onClick={(e) => (e.stopPropagation(), onOpenPlan(pl.id))}>
                    <span className="flex items-center gap-2">
                      <span className={`text-[0.82rem] font-semibold ${pl.kind === "current" ? "text-ink-2" : "text-ink"}`}>{title(pl)}</span>
                      {pl === best && <span className="rounded-full bg-accent px-1.5 py-0.5 text-[0.66rem] font-bold leading-none text-on-accent">{t("tbl.best")}</span>}
                    </span>
                    <span className="mt-0.5 flex flex-wrap gap-x-2 text-[0.76rem] text-ink-2">
                      {pl.crops.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1">
                          <CropSwatch id={c} size={8} />
                          {shortName(L(CROPS[c].name))}
                        </span>
                      ))}
                    </span>
                  </button>
                </th>
                <td className="px-1.5 py-2.5 text-right text-[1.05rem] font-semibold tabular-nums sm:px-2">
                  <Num value={pl.score.composite} />
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums sm:px-2">
                  <Num value={pl.water.requirementMmPerYr?.p50 ?? null} />
                </td>
                <td className="px-1.5 py-2.5 text-right tabular-nums sm:px-2">
                  <Num value={pl.economics.grossMarginTLPerDaPerYr?.p50 ?? null} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── soil indicator ───────────────────────────────────────────────────────

function SoilCard({ result }: { result: AnalysisResult | null }) {
  const { t, n, L } = useI18n();
  const title = usePlanTitle();
  const best = result ? composeVerdict(result).best : null;
  if (!best) {
    return (
      <Card className="md:col-span-6 xl:col-span-4" title={t("ov.soil.title")}>
        <Empty icon="field">{t("ov.soil.empty")}</Empty>
      </Card>
    );
  }
  const sh = best.soilHealth;
  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = Math.max(0, Math.min(1, sh.score / 100));
  return (
    <Card className="md:col-span-6 xl:col-span-4" title={t("ov.soil.title")}>
      <p className="-mt-2 mb-3 text-[0.76rem] text-ink-2">
        {t("ov.soil.sub", { plan: title(best) })}. {t("plan.soilNote")}
      </p>
      <div className="flex items-center gap-4">
        <div className="relative h-[5.5rem] w-[5.5rem] shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" role="img" aria-label={`${t("plan.soil")}: ${n(sh.score)} / 100`}>
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--panel-2)" strokeWidth="8" />
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--c-green)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} style={{ transition: "stroke-dasharray 220ms var(--ease-out)" }} />
          </svg>
          <span className="absolute inset-0 grid place-items-center text-center">
            <span className="text-[1.6rem] font-light leading-none tracking-[-0.03em] tabular-nums">
              <Num value={sh.score} />
            </span>
          </span>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5">
          {sh.components.map((c) => (
            <li key={c.key} className="text-[0.76rem]">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-ink-2">{L(c.label)}</span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {n(c.value * c.weight)}/{n(c.weight)}
                </span>
              </span>
              <span className="mt-0.5 block h-1 rounded-full bg-panel-2" aria-hidden="true">
                <span className="block h-full origin-left rounded-full bg-[var(--c-green)] transition-transform duration-200 ease-out" style={{ transform: `scaleX(${Math.max(0, Math.min(1, c.value))})` }} />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
