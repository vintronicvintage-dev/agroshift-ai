"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { AnalysisResult, PlanResult, TrendResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { setStore, useHydrated, useStore } from "@/lib/ui/fieldStore";
import { useFieldData } from "@/components/data/FieldData";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";
import { JudgmentNote } from "@/components/shell/AppShell";
import { MiniTable } from "@/components/tarla/CardKit";
import { cropName, planLabel, signed, useL } from "@/components/plan/planKit";

type ClaimId = "water" | "money" | "why" | "climate" | "frost" | "soil" | "rain" | "periods";

export function EvidencePage() {
  const { t, lang } = useI18n();
  const hydrated = useHydrated();
  const s = useStore();
  const d = useFieldData();
  const r = d.analysis.result;
  const [cur, setCur] = useState<ClaimId>("water");
  const eng = s.view === "engineer";

  if (!hydrated) return <div className="mx-auto max-w-[1200px] px-4 py-8"><div className="skel h-64" /></div>;
  if (!s.field || !r || !r.alternatives[0]) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-start px-4 py-12">
        <SpotArt name={s.field ? "loading-data" : "no-field"} width={220} className="text-ink-3" />
        <h1 className="display mt-4 text-[34px]">{t("ev.title")}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{s.field ? t("ev.waiting") : t("ev.noField")}</p>
        <Link href={s.field ? "/plan" : "/"} className="btn btn-primary mt-5">
          {s.field ? t("nav.plan") : t("pl.toField")}
        </Link>
      </div>
    );
  }
  const best = r.alternatives[0];
  const claims: { id: ClaimId; key: DictKey }[] = [
    { id: "water", key: "ev.c.water" },
    { id: "money", key: "ev.c.money" },
    { id: "why", key: "ev.c.why" },
    { id: "climate", key: "ev.c.climate" },
    { id: "frost", key: "ev.c.frost" },
    { id: "soil", key: "ev.c.soil" },
    { id: "rain", key: "ev.c.rain" },
    ...(eng ? [{ id: "periods" as const, key: "ev.c.periods" as const }] : []),
  ];
  const idx = Math.max(0, claims.findIndex((c) => c.id === cur));
  const active = claims[idx];
  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="display text-[34px] sm:text-[42px]">{t("ev.title")}</h1>
          <p className="mt-1 max-w-[70ch] text-[15px] text-ink-2">{t("ev.lead", { seq: planLabel(best, lang), name: s.field.name })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg" role="group" aria-label={t("ev.view")}>
            <button type="button" aria-pressed={!eng} onClick={() => setStore({ view: "farmer" })}>
              {t("ev.farmer")}
            </button>
            <button type="button" aria-pressed={eng} onClick={() => setStore({ view: "engineer" })}>
              {t("ev.engineer")}
            </button>
          </div>
          {eng && (
            <button type="button" className="btn" onClick={() => downloadCsv(r, lang)}>
              <Icon name="download" size={18} />
              {t("ev.csv")}
            </button>
          )}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label={t("ev.claims")} className="lg:sticky lg:top-20 lg:self-start">
          <label className="lg:hidden">
            <span className="sr-only">{t("ev.claims")}</span>
            <select className="input" value={active.id} onChange={(e) => setCur(e.target.value as ClaimId)}>
              {claims.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {i + 1}. {t(c.key)}
                </option>
              ))}
            </select>
          </label>
          <ol className="hidden space-y-0.5 lg:block">
            {claims.map((c, i) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-current={c.id === active.id ? "step" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-md px-2.5 text-left text-[14px] ${c.id === active.id ? "bg-surface-2 font-semibold text-ink" : "text-ink-2 hover:text-ink"}`}
                  onClick={() => setCur(c.id)}
                >
                  <span className="numeral w-5 text-[16px]">{i + 1}</span>
                  {t(c.key)}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0">
          <article className="panel p-4 sm:p-6" aria-labelledby="iddia-h">
            <p className="label">{t("ev.claimN", { n: idx + 1, of: claims.length })}</p>
            <Claim id={active.id} r={r} best={best} eng={eng} />
          </article>
          <div className="mt-3 flex justify-between gap-2">
            <button type="button" className="btn" disabled={idx === 0} onClick={() => setCur(claims[idx - 1].id)}>
              <Icon name="chevron-left" size={18} />
              {t("common.back")}
            </button>
            <button type="button" className="btn" disabled={idx === claims.length - 1} onClick={() => setCur(claims[idx + 1].id)}>
              {t("common.next")}
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
          <JudgmentNote className="mt-6" />
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 border-t border-line pt-4">
      <h3 className="text-[14px] font-semibold">{title}</h3>
      <div className="mt-1.5 text-[14px]">{children}</div>
    </section>
  );
}

function trendWord(tr: TrendResult | undefined, t: (k: DictKey) => string) {
  if (!tr) return "–";
  if (!tr.significant) return t("ev.trend.none");
  return tr.direction === "increasing" ? t("ev.trend.up") : t("ev.trend.down");
}

function Claim({ id, r, best, eng }: { id: ClaimId; r: AnalysisResult; best: PlanResult; eng: boolean }) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const cur = r.current;
  const H = (s: string) => (
    <h2 id="iddia-h" className="display mt-1 max-w-[40ch] text-[24px] sm:text-[30px]">
      {s}
    </h2>
  );
  const pct = (p: number) => (lang === "tr" ? `%${n(p * 100)}` : `${n(p * 100)} %`);
  const distTable = (rows: [string, PlanResult["water"]["irrigationNetMmPerYr"]][], unit: string) => (
    <MiniTable head={["", "P10", "P50", "P90", t("ev.n")]} rows={rows.map(([k, d]) => [k, d ? n(d.p10) : "–", d ? n(d.p50) : "–", d ? n(d.p90) : "–", d ? `${d.n} ${unit}` : "–"])} />
  );

  if (id === "water") {
    const a = cur.water.irrigationNetMmPerYr?.p50 ?? null;
    const b = best.water.irrigationNetMmPerYr?.p50 ?? null;
    return (
      <>
        {H(t("ev.water.claim", { seq: planLabel(best, lang), b: n(b), a: n(a) }))}
        <PairBars
          labels={[1, 2, 3].map((y) => t("plan.yearN", { y }))}
          a={cur.years.map((y) => y.irrigationNetMm?.p50 ?? 0)}
          b={best.years.map((y) => y.irrigationNetMm?.p50 ?? 0)}
          aLabel={`${t("plan.mine")}: ${planLabel(cur, lang)}`}
          bLabel={`${t("plan.rec", { n: 1 })}: ${planLabel(best, lang)}`}
          unit={t("u.tonDa")}
        />
        <Block title={t("ev.source")}>{t("ev.water.src", { w: r.windows.count, a: r.climate.period.start.slice(0, 4), b: r.climate.period.end.slice(0, 4) })}</Block>
        <Block title={t("ev.formula")}>
          <p className="font-mono text-[13px]">{t("ev.water.formula")}</p>
        </Block>
        {eng && (
          <Block title={t("ev.eng")}>
            {distTable(
              [
                [t("plan.mine"), cur.water.irrigationNetMmPerYr],
                [t("plan.rec", { n: 1 }), best.water.irrigationNetMmPerYr],
                [`${t("plan.rec", { n: 1 })}: ${t("cmp.need")}`, best.water.requirementMmPerYr],
                [`${t("plan.rec", { n: 1 })}: ${t("cmp.unmet")}`, best.water.unmetDeficitMmPerYr],
              ],
              t("ev.periods"),
            )}
            {best.water.massBalanceMaxErrorMm !== null && <p className="mt-2 text-[13px] text-ink-2">{t("ev.massBalance", { e: n(best.water.massBalanceMaxErrorMm, 3) })}</p>}
          </Block>
        )}
      </>
    );
  }

  if (id === "money") {
    const wins = (p: PlanResult) => (p.windows ?? []).map((w) => ({ x: w.startYear, y: w.marginTLPerDaPerYr }));
    return (
      <>
        {H(t("ev.money.claim", { d: signed(best.trade?.marginDiffTLPerDaPerYr ?? 0, n), w: r.windows.count }))}
        <Lines series={[{ label: t("plan.mine"), pts: wins(cur), dashed: true }, { label: t("plan.rec", { n: 1 }), pts: wins(best) }]} unit="TL/da" />
        <p className="mt-2 text-[14px]">{t("ev.money.range", { a: n(best.economics.grossMarginTLPerDaPerYr?.p10 ?? null), b: n(best.economics.grossMarginTLPerDaPerYr?.p90 ?? null) })}</p>
        <Block title={t("ev.source")}>{t("ev.money.src")}</Block>
        <Block title={t("ev.formula")}>
          <p className="font-mono text-[13px]">{t("ev.money.formula")}</p>
        </Block>
        {eng && (
          <Block title={t("ev.eng")}>
            {distTable(
              [
                [t("plan.mine"), cur.economics.grossMarginTLPerDaPerYr],
                [t("plan.rec", { n: 1 }), best.economics.grossMarginTLPerDaPerYr],
              ],
              t("ev.periods"),
            )}
            {best.robust && <p className="mt-2 text-[13px]">{t("ev.cvar", { v: n(best.robust.cvar20MarginTLPerDaPerYr) })}</p>}
          </Block>
        )}
      </>
    );
  }

  if (id === "why") {
    const ex = best.explanation;
    const list = (items: typeof ex.why) => (
      <ul className="space-y-1.5">
        {items.map((x, i) => (
          <li key={i} className="border-l-2 border-line-strong pl-2.5">
            {L(x.text)}
            {x.sources && x.sources.length > 0 && <span className="block font-mono text-[12px] text-ink-2">{x.sources.join(" · ")}</span>}
          </li>
        ))}
      </ul>
    );
    return (
      <>
        {H(t("ev.why.claim", { seq: planLabel(best, lang) }))}
        <Block title={t("ev.why.reasons")}>{list(ex.why)}</Block>
        <Block title={t("ev.why.benefits")}>{list(ex.benefits)}</Block>
        {eng && <Block title={t("ev.why.evidence")}>{list(ex.evidence)}</Block>}
        <Block title={t("ev.why.gaps")}>{list(ex.gaps)}</Block>
        <Block title={t("ev.why.local")}>{list(ex.localReview)}</Block>
      </>
    );
  }

  if (id === "climate") {
    const tp = r.climate.trends.find((x) => x.variable === "precip");
    const te = r.climate.trends.find((x) => x.variable === "et0");
    return (
      <>
        {H(t("ev.climate.claim", { p: n(r.climate.meanAnnualPrecipMm), e: n(r.climate.meanAnnualEt0Mm), tp: trendWord(tp, t) }))}
        <BarsLine years={r.climate.annual.map((a) => a.year)} bars={r.climate.annual.map((a) => a.precipMm)} line={r.climate.annual.map((a) => a.et0Mm)} barLabel={t("climate.rain")} lineLabel={t("climate.et0Short")} />
        <Block title={t("ev.source")}>{t("ev.climate.src", { y: r.climate.completeYears.length })}</Block>
        <Block title={t("ev.formula")}>
          <p className="font-mono text-[13px]">{t("ev.climate.formula")}</p>
        </Block>
        {eng && (
          <Block title={t("ev.eng")}>
            <MiniTable
              head={[t("ev.var"), "S", "Z", "p", t("ev.sen")]}
              rows={[tp, te].filter((x): x is TrendResult => !!x).map((x) => [x.variable, n(x.s), n(x.z, 2), n(x.p, 3), `${n(x.senSlope, 2)} ${x.unit}`])}
            />
            <p className="mt-2 text-[13px] text-ink-2">{t("ev.quality", { d: n(r.climate.quality.totalDays), pm: n(r.climate.quality.et0PenmanMonteithDays), hg: n(r.climate.quality.et0HargreavesDays), u: n(r.climate.quality.unusableDays) })}</p>
          </Block>
        )}
      </>
    );
  }

  if (id === "frost") {
    const tf = r.climate.trends.find((x) => x.variable === "frost_days");
    const th = r.climate.trends.find((x) => x.variable === "hot_days");
    const fy = best.years.filter((y) => y.frostDaysMean !== null && y.cropId !== "fallow");
    return (
      <>
        {H(t("ev.frost.claim", { f: trendWord(tf, t), h: trendWord(th, t) }))}
        <BarsLine years={r.climate.annual.map((a) => a.year)} bars={r.climate.annual.map((a) => a.frostDays)} line={r.climate.annual.map((a) => a.hotDays)} barLabel={t("ev.frostDays")} lineLabel={t("ev.hotDays")} unit={t("ev.days")} />
        <ul className="mt-3 space-y-1 text-[14px]">
          {fy.map((y) => (
            <li key={y.year}>{t("ev.frost.crop", { y: y.year, crop: cropName(y.cropId, lang), f: n(y.frostDaysMean, 1), h: n(y.heatDaysMean ?? 0, 1) })}</li>
          ))}
        </ul>
        <Block title={t("ev.source")}>{t("ev.frost.src")}</Block>
        {eng && tf && th && (
          <Block title={t("ev.eng")}>
            <MiniTable head={[t("ev.var"), "p", t("ev.sen")]} rows={[tf, th].map((x) => [x.variable, n(x.p, 3), `${n(x.senSlope, 2)} ${x.unit}`])} />
          </Block>
        )}
      </>
    );
  }

  if (id === "soil") {
    const comps = best.soilHealth.components;
    return (
      <>
        {H(t("ev.soil.claim", { a: n(cur.soilHealth.score), b: n(best.soilHealth.score) }))}
        <ul className="mt-3 space-y-2.5">
          {comps.map((c) => {
            const cc = cur.soilHealth.components.find((x) => x.key === c.key);
            return (
              <li key={c.key}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-medium">{L(c.label)}</span>
                  <span className="text-ink-2">
                    {n(c.value * c.weight, 1)} / {n(c.weight)} ({t("plan.mine")}: {cc ? n(cc.value * cc.weight, 1) : "–"})
                  </span>
                </div>
                <div className="relative mt-1 h-3 rounded-sm bg-surface-2">
                  <div className="absolute inset-y-0 left-0 rounded-sm bg-[var(--crop)]" style={{ width: `${c.value * 100}%` }} />
                  {cc && <div className="absolute -inset-y-1 w-0.5 bg-ink" style={{ left: `${cc.value * 100}%` }} title={t("plan.mine")} />}
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-[12px] text-ink-2">{t("ev.soil.legend")}</p>
        <Block title={t("ev.source")}>{t("ev.soil.src")}</Block>
        {eng && (
          <Block title={t("ev.eng")}>
            <MiniTable head={[t("ev.var"), t("ev.value")]} rows={comps.map((c) => [L(c.label), c.detail])} />
          </Block>
        )}
      </>
    );
  }

  if (id === "rain") {
    const pu = r.precipUncertainty;
    return (
      <>
        {H(pu ? t("ev.rain.claim", { a: n(pu.rangeMm[0]), b: n(pu.rangeMm[1]) }) : t("ev.rain.none"))}
        {pu && (
          <>
            <ul className="mt-3 space-y-2">
              {pu.sources.map((s) => (
                <li key={s.id}>
                  <div className="flex justify-between text-[13px]">
                    <span className="font-medium">{L(s.label)}</span>
                    <span>{n(s.annualMm)} mm</span>
                  </div>
                  <div className="mt-1 h-3 rounded-sm bg-surface-2">
                    <div className="h-3 rounded-sm" style={{ width: `${(s.annualMm / pu.rangeMm[1]) * 100}%`, background: s.id === "chosen" ? "var(--rain)" : "var(--ref)" }} />
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[14px]">{pu.sensitive === true ? t("ev.rain.sensitive") : pu.sensitive === false ? t("ev.rain.stable") : ""}</p>
            <p className="mt-2 text-[14px] text-ink-2">{L(pu.note)}</p>
            {eng && (
              <Block title={t("ev.eng")}>
                <p className="text-[13px]">{t("ev.rain.factor", { f: n(pu.chosenFactorAnnual, 3) })}</p>
                {pu.alternativeTop3 && <p className="text-[13px]">{t("ev.rain.alt", { ids: pu.alternativeTop3.join("; ") })}</p>}
              </Block>
            )}
          </>
        )}
        <Block title={t("ev.source")}>{t("ev.rain.src")}</Block>
      </>
    );
  }

  // periods (engineer)
  const all = [cur, best];
  return (
    <>
      {H(t("ev.periods.claim", { w: r.windows.count }))}
      <div className="mt-3 max-h-[60vh] overflow-auto">
        <MiniTable
          head={[t("ev.p.start"), ...all.flatMap((p) => [`${p.kind === "current" ? t("plan.mine") : t("plan.rec", { n: 1 })}: ${t("ev.p.unmet")}`, t("ev.p.yield"), t("ev.p.margin")])]}
          rows={(best.windows ?? []).map((w, i) => [
            `${w.startYear - 1}–${w.startYear + 2}`,
            ...all.flatMap((p) => {
              const x = p.windows?.[i];
              return x ? [`${n(x.unmetMmPerYr)}${x.budgetExceeded ? " ×" : ""}`, x.yieldRatio !== null ? pct(x.yieldRatio) : "–", n(x.marginTLPerDaPerYr)] : ["–", "–", "–"];
            }),
          ])}
        />
      </div>
      <p className="mt-2 text-[12px] text-ink-2">{t("ev.periods.note")}</p>
    </>
  );
}

// ── small charts ─────────────────────────────────────────────────────────
function PairBars({ labels, a, b, aLabel, bLabel, unit }: { labels: string[]; a: number[]; b: number[]; aLabel: string; bLabel: string; unit: string }) {
  const { n } = useI18n();
  const W = 640, H = 200, T = 16, B = 26, L = 8;
  const max = Math.max(1, ...a, ...b);
  const gw = (W - L) / labels.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={labels.map((l, i) => `${l}: ${n(a[i])} / ${n(b[i])} ${unit}`).join("; ")}>
        {labels.map((l, i) => (
          <g key={l}>
            <rect x={L + gw * i + gw * 0.12} y={y(a[i])} width={gw * 0.34} height={y(0) - y(a[i])} fill="none" stroke="var(--water)" strokeWidth="1.5" />
            <rect x={L + gw * i + gw * 0.5} y={y(b[i])} width={gw * 0.34} height={y(0) - y(b[i])} fill="var(--water)" />
            <text x={L + gw * i + gw * 0.29} y={y(a[i]) - 4} textAnchor="middle" fontSize="12" fill="var(--ink)">{n(a[i])}</text>
            <text x={L + gw * i + gw * 0.67} y={y(b[i]) - 4} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--ink)">{n(b[i])}</text>
            <text x={L + gw * (i + 0.5)} y={H - 6} textAnchor="middle" fontSize="12" fill="var(--ink-2)">{l}</text>
          </g>
        ))}
        <line x1={L} x2={W} y1={y(0)} y2={y(0)} stroke="var(--axis)" />
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 border-[1.5px] border-[var(--water)]" />{aLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 bg-[var(--water)]" />{bLabel}</span>
        <span>{unit}</span>
      </figcaption>
    </figure>
  );
}

function Lines({ series, unit }: { series: { label: string; pts: { x: number; y: number }[]; dashed?: boolean }[]; unit: string }) {
  const { n } = useI18n();
  const W = 640, H = 220, L = 52, R = 10, T = 12, B = 24;
  const xs = series.flatMap((s) => s.pts.map((p) => p.x));
  const ys = series.flatMap((s) => s.pts.map((p) => p.y));
  if (!xs.length) return null;
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys), y1 = Math.max(...ys) * 1.08;
  const x = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => `${s.label}: ${s.pts.map((p) => `${p.x} ${n(p.y)}`).join(", ")}`).join(". ")}>
        {[y0, 0, y1 / 2, y1].filter((v, i, a) => a.indexOf(v) === i).map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={v === 0 ? 1 : 0.6} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">{n(v)}</text>
          </g>
        ))}
        <text x={x(x0)} y={H - 6} fontSize="11" fill="var(--ink-2)">{x0 - 1}</text>
        <text x={x(x1)} y={H - 6} textAnchor="end" fontSize="11" fill="var(--ink-2)">{x1 - 1}</text>
        {series.map((s) => (
          <g key={s.label}>
            <polyline points={s.pts.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")} fill="none" stroke={s.dashed ? "var(--ref)" : "var(--ink)"} strokeWidth={s.dashed ? 1.5 : 2.2} strokeDasharray={s.dashed ? "5 4" : undefined} />
            {s.pts.length > 0 && (
              <text x={W - R} y={y(s.pts[s.pts.length - 1].y) - 6} textAnchor="end" fontSize="12" fontWeight="600" fill="var(--ink)">{s.label}</text>
            )}
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-[12px] text-ink-2">{unit}</figcaption>
    </figure>
  );
}

function BarsLine({ years, bars, line, barLabel, lineLabel, unit = "mm" }: { years: number[]; bars: (number | null)[]; line: (number | null)[]; barLabel: string; lineLabel: string; unit?: string }) {
  const { n, t } = useI18n();
  const W = 640, H = 220, L = 44, R = 8, T = 12, B = 24;
  const max = Math.max(1, ...bars.map((v) => v ?? 0), ...line.map((v) => v ?? 0)) * 1.05;
  const bw = (W - L - R) / years.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const valid = bars.filter((v): v is number => v !== null);
  const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;
  return (
    <figure className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={years.map((yr, i) => `${yr}: ${n(bars[i])} / ${n(line[i])} ${unit}`).join("; ")}>
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={v === 0 ? 1 : 0.6} />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">{n(v)}</text>
          </g>
        ))}
        {bars.map((v, i) => (v !== null ? <rect key={i} x={L + bw * i + 1.5} y={y(v)} width={bw - 3} height={y(0) - y(v)} fill="var(--rain)" /> : null))}
        <polyline points={line.map((v, i) => (v !== null ? `${L + bw * (i + 0.5)},${y(v)}` : "")).filter(Boolean).join(" ")} fill="none" stroke="var(--et0)" strokeWidth="2" />
        {mean !== null && (
          <>
            <line x1={L} x2={W - R} y1={y(mean)} y2={y(mean)} stroke="var(--ref)" strokeDasharray="4 3" />
            <text x={W - R} y={y(mean) - 4} textAnchor="end" fontSize="11" fill="var(--ink)" paintOrder="stroke" stroke="var(--surface)" strokeWidth="3">{t("ev.mean", { v: n(mean) })}</text>
          </>
        )}
        <text x={L} y={H - 6} fontSize="11" fill="var(--ink-2)">{years[0]}</text>
        <text x={W - R} y={H - 6} textAnchor="end" fontSize="11" fill="var(--ink-2)">{years[years.length - 1]}</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-4 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block size-3 bg-[var(--rain)]" />{barLabel}</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[3px] w-4 bg-[var(--et0)]" />{lineLabel}</span>
        <span>{unit}</span>
      </figcaption>
    </figure>
  );
}

function downloadCsv(r: AnalysisResult, lang: "tr" | "en") {
  const rows: string[] = ["plan_id,crops,kind,start_ag_year,deficit_mm_yr,unmet_mm_yr,budget_exceeded,yield_ratio,margin_tl_da_yr"];
  const plans = [r.current, ...r.alternatives, ...r.userPlans, ...(r.robustBest ? [r.robustBest] : [])];
  for (const p of plans)
    for (const w of p.windows ?? [])
      rows.push([p.id, `"${p.crops.join(">")}"`, p.kind, w.startYear, w.deficitMmPerYr.toFixed(2), w.unmetMmPerYr.toFixed(2), w.budgetExceeded, w.yieldRatio?.toFixed(4) ?? "", w.marginTLPerDaPerYr.toFixed(2)].join(","));
  rows.push("");
  rows.push("year,precip_mm,et0_mm,hot_days,frost_days,gwet_root_mean");
  for (const a of r.climate.annual) rows.push([a.year, a.precipMm ?? "", a.et0Mm ?? "", a.hotDays ?? "", a.frostDays ?? "", a.gwetRootMean ?? ""].join(","));
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const el = document.createElement("a");
  el.href = URL.createObjectURL(blob);
  el.download = lang === "tr" ? "agroshift-donemler.csv" : "agroshift-periods.csv";
  el.click();
  setTimeout(() => URL.revokeObjectURL(el.href), 2000);
}
