"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { loadSnapshotIndex, type SnapshotIndexEntry } from "@/lib/data/snapshots";
import { CROPS, CROP_IDS, METHOD_SOURCES, RISK_WEIGHTS, SOIL_HEALTH_WEIGHTS } from "@/lib/engine";
import type { Sourced } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useLastRun } from "@/lib/ui/lastRun";
import { isoDay } from "@/lib/ui/sources";
import { markGsDone } from "@/lib/ui/gettingStarted";
import { DashboardShell } from "@/components/shell/DashboardShell";

const SOIL_LABEL: Record<keyof typeof SOIL_HEALTH_WEIGHTS, { tr: string; en: string }> = {
  diversity: { tr: "Ürün ailesi çeşitliliği", en: "Crop family diversity" },
  family_break: { tr: "Aynı aile ardışıklığı", en: "Same-family succession" },
  legume: { tr: "Baklagil ve azot katkısı", en: "Legume and nitrogen contribution" },
  bare_soil: { tr: "Çıplak toprak günleri", en: "Bare-soil days" },
  root_diversity: { tr: "Kök derinliği çeşitliliği", en: "Rooting depth diversity" },
  residue: { tr: "Artık / organik madde", en: "Residue / organic matter" },
};

function Sec({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-10 scroll-mt-6">
      <h2 id={`${id}-h`} className="border-b border-rule pb-2 font-display text-[1.45rem] font-semibold tracking-[-0.02em]">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function MethodsPage() {
  const { t, L, n, lang } = useI18n();
  const [index, setIndex] = useState<SnapshotIndexEntry[] | null>(null);
  const last = useLastRun();
  useEffect(() => {
    markGsDone("evidence");
  }, []);
  useEffect(() => {
    let alive = true;
    loadSnapshotIndex()
      .then((x) => alive && setIndex(x))
      .catch(() => alive && setIndex([]));
    return () => {
      alive = false;
    };
  }, []);
  const conf = (s: Sourced<unknown>) => (
    <span className={s.confidence === "assumption" ? "text-loam" : "text-ink-2"} title={s.source}>
      {t(`asm.conf.${s.confidence}`)}
    </span>
  );
  const formulas: DictKey[] = ["m.f.et0", "m.f.wb", "m.f.soil", "m.f.irr", "m.f.yield", "m.f.replay", "m.f.trend", "m.f.opt"];
  const dataItems: DictKey[] = ["m.data.power", "m.data.modis", "m.data.gibs", "m.data.soilgrids", "m.data.imerg", "m.data.osm"];
  const limits: DictKey[] = ["m.limit.1", "m.limit.2", "m.limit.3", "m.limit.4", "m.limit.5", "m.limit.6"];

  return (
    <DashboardShell place="yontem">
    <div className="mx-auto max-w-[980px] pb-6">
      <Link href="/#genel" className="text-sm font-medium text-accent-ink underline underline-offset-2">
        {t("m.back")}
      </Link>
      <h1 className="mt-3 font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.03em]">{t("m.title")}</h1>
      <p className="prose-serif mt-3 max-w-[68ch] text-lg text-ink-2">{t("m.lead")}</p>

      <Sec id="veri" title={t("m.data")}>
        <ul className="prose-serif max-w-[72ch] list-disc space-y-2 pl-5">
          {dataItems.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
        <h3 className="mt-6 font-semibold">{t("m.snapshots")}</h3>
        {index && index.length === 0 && <p className="mt-1 text-ink-2">{t("m.snapshotsNone")}</p>}
        {index && index.length > 0 && (
          <table className="mt-2 w-full text-left text-sm">
            <tbody>
              {index.map((e) => (
                <tr key={e.id} className="border-t border-rule/60">
                  <td className="py-1.5 pr-3 font-medium">{lang === "tr" ? e.nameTr : e.nameEn}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink-2">
                    {n(e.lat, 2)}°, {n(e.lon, 2)}°, {n(e.elevation)} m
                  </td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink-2">
                    {e.start} – {e.end}
                  </td>
                  <td className="py-1.5 tabular-nums">{t("trace.retrieved", { d: isoDay(e.retrievedAt) })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <h3 className="mt-6 font-semibold">{t("m.lastRun")}</h3>
        {!last ? (
          <p className="mt-1 text-ink-2">{t("m.lastRunNone")}</p>
        ) : (
          <div className="mt-1 text-sm">
            <p className="text-ink-2">
              {last.site}. {t("m.at", { d: last.at.slice(0, 16).replace("T", " ") })} UTC
            </p>
            <ul className="mt-2 space-y-2">
              {last.sources.map((s) => (
                <li key={s.name}>
                  {s.url.startsWith("http") ? (
                    <a href={s.url} className="font-medium text-sky underline" target="_blank" rel="noreferrer">
                      {s.name}
                    </a>
                  ) : (
                    <span className="font-medium">{s.name}</span>
                  )}
                  <span className="text-ink-2">
                    , {s.provider}, {s.spatialResolution}, {t("trace.retrieved", { d: isoDay(s.retrievedAt) })}
                  </span>
                  {s.note && <div className="text-ink-2">{s.note}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Sec>

      <Sec id="kalibrasyon" title={t("cal.title")}>
        <p className="prose-serif max-w-[72ch]">{t("m.f.cal")}</p>
        <p className="prose-serif mt-2 max-w-[72ch] text-ink-2">{t("ex.sat.b")}</p>
        {last && (
          <p className={`mt-3 rounded-md px-3 py-2 text-sm ${last.calibration ? "bg-sky-soft" : "bg-warn text-warn-ink"}`}>
            {last.calibration
              ? t("cal.appliedLong", { station: n(last.calibration.stationMeanMm), model: n(last.calibration.modelMeanMm), f: n(last.calibration.factor, 3), n: last.calibration.years.length })
              : t("cal.caution")}
          </p>
        )}
      </Sec>

      <Sec id="formuller" title={t("m.formulas")}>
        <ul className="prose-serif max-w-[72ch] space-y-3">
          {formulas.map((k) => (
            <li key={k} className="border-l-2 border-rule pl-3">
              {t(k)}
            </li>
          ))}
        </ul>
      </Sec>

      <Sec id="agirliklar" title={t("m.weights")}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">{t("m.weights.soil")}</h3>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {(Object.keys(SOIL_HEALTH_WEIGHTS) as (keyof typeof SOIL_HEALTH_WEIGHTS)[]).map((k) => (
                  <tr key={k} className="border-t border-rule/60">
                    <td className="py-1 pr-3">{L(SOIL_LABEL[k])}</td>
                    <td className="py-1 text-right tabular-nums">{SOIL_HEALTH_WEIGHTS[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-ink-2">{t("plan.soilNote")}</p>
          </div>
          <div>
            <h3 className="font-semibold">{t("m.weights.risk")}</h3>
            <table className="mt-2 w-full text-sm">
              <tbody>
                {(Object.keys(RISK_WEIGHTS) as (keyof typeof RISK_WEIGHTS)[]).map((k) => (
                  <tr key={k} className="border-t border-rule/60">
                    <td className="py-1 pr-3">{t(`plan.riskComp.${k}`)}</td>
                    <td className="py-1 text-right tabular-nums">{n(RISK_WEIGHTS[k], 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-sm text-ink-2">{t("f.risk")}</p>
          </div>
        </div>
      </Sec>

      <Sec id="urunler" title={t("m.crops")}>
        <p className="max-w-[72ch] text-ink-2">{t("m.cropsLead")}</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[46rem] text-left text-sm">
            <thead>
              <tr className="text-ink-2">
                <th className="py-1 pr-3 font-medium">{t("m.col.crop")}</th>
                <th className="py-1 pr-3 font-medium">{t("m.col.kc")}</th>
                <th className="py-1 pr-3 font-medium">{t("m.col.root")}</th>
                <th className="py-1 pr-3 font-medium">{t("m.col.ky")}</th>
                <th className="py-1 pr-3 font-medium">{t("m.col.yield")}</th>
                <th className="py-1 pr-3 font-medium">{t("m.col.price")}</th>
                <th className="py-1 font-medium">{t("m.col.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {CROP_IDS.map((id) => {
                const c = CROPS[id];
                const a = c.agronomy;
                return (
                  <tr key={id} className="border-t border-rule/60 align-top">
                    <td className="py-1.5 pr-3 font-medium">{L(c.name)}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{a ? <>{`${n(a.kc.value.ini, 2)} / ${n(a.kc.value.mid, 2)} / ${n(a.kc.value.end, 2)}`} {conf(a.kc)}</> : "—"}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{a ? <>{n(a.rootDepthMaxM.value, 2)} {conf(a.rootDepthMaxM)}</> : "—"}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{a ? <>{n(a.ky.value, 2)} {conf(a.ky)}</> : "—"}</td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {n(c.refYieldTHa.value.irrigated, 1)} / {n(c.refYieldTHa.value.rainfed, 1)} {conf(c.refYieldTHa)}
                    </td>
                    <td className="py-1.5 pr-3 tabular-nums">
                      {n(c.priceTLPerKg.value, 2)} {conf(c.priceTLPerKg)}
                    </td>
                    <td className="py-1.5 tabular-nums">
                      {n(c.varCostTLPerDa.value)} {conf(c.varCostTLPerDa)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {last && last.assumptions.length > 0 && (
          <details className="mt-5 card p-4">
            <summary className="font-semibold">
              <span className="chev mr-1.5 text-ink-2">›</span>
              {t("m.assumptionsLastRun")} ({last.assumptions.length})
            </summary>
            <div className="mt-3 max-h-[28rem] overflow-auto">
              <table className="w-full min-w-[36rem] text-left text-sm">
                <tbody>
                  {last.assumptions.map((a) => (
                    <tr key={a.key} className="border-t border-rule/60 align-top">
                      <td className="py-1 pr-3">{L(a.label)}</td>
                      <td className="py-1 pr-3 tabular-nums">{a.value}</td>
                      <td className="py-1 pr-3 text-ink-2">{a.source}</td>
                      <td className={`py-1 ${a.confidence === "assumption" ? "text-loam" : "text-ink-2"}`}>{t(`asm.conf.${a.confidence}`)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </Sec>

      <Sec id="sinirlar" title={t("m.limits")}>
        <ul className="prose-serif max-w-[72ch] list-disc space-y-2 pl-5">
          {limits.map((k) => (
            <li key={k}>{t(k)}</li>
          ))}
        </ul>
      </Sec>

      <Sec id="yontem-kaynaklari" title={t("m.methodRefs")}>
        <ol className="prose-serif max-w-[72ch] list-decimal space-y-2 pl-5">
          {METHOD_SOURCES.map((s) => (
            <li key={s.id}>
              {s.citation}{" "}
              {s.url && (
                <a href={s.url} target="_blank" rel="noreferrer" className="font-sans text-sm text-sky underline">
                  {s.url.replace(/^https?:\/\//, "")}
                </a>
              )}
            </li>
          ))}
        </ol>
      </Sec>

      <Sec id="yapay-zeka" title={t("m.ai")}>
        <p className="prose-serif max-w-[72ch] text-lg">{t("m.ai.body")}</p>
      </Sec>
    </div>
    </DashboardShell>
  );
}
