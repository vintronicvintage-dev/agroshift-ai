"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { loadSnapshotIndex, type SnapshotIndexEntry } from "@/lib/data/snapshots";
import { TILE_SOURCES } from "@/lib/data/tiles";
import { CROPS, CROP_IDS, METHOD_SOURCES, RISK_WEIGHTS, SOIL_HEALTH_WEIGHTS } from "@/lib/engine";
import type { AssumptionItem } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { useLastRun } from "@/lib/ui/lastRun";
import { isoDay } from "@/lib/ui/sources";
import { IMAGES, IMAGE_LIST, IMAGES_RETRIEVED } from "@/lib/ui/images";
import { useFieldData } from "@/components/data/FieldData";
import { ImageCredit } from "@/components/ui/ImageCredit";
import { useL } from "@/components/plan/planKit";
import { Mod16ValidationCard } from "@/components/yontem/Mod16ValidationCard";
import { TarsimValidationCard } from "@/components/yontem/TarsimValidationCard";

const SECTIONS: { id: string; key: DictKey }[] = [
  { id: "veri", key: "m.data" },
  { id: "mod16", key: "y.val.mod16" },
  { id: "tarsim", key: "y.val.tarsim" },
  { id: "harita", key: "y.tiles" },
  { id: "formuller", key: "m.formulas" },
  { id: "varsayimlar", key: "y.assumptions" },
  { id: "agirliklar", key: "m.weights" },
  { id: "urunler", key: "m.crops" },
  { id: "sinirlar", key: "m.limits" },
  { id: "gorseller", key: "m.images" },
  { id: "kaynakca", key: "m.methodRefs" },
  { id: "yapay-zeka", key: "m.ai" },
];

function Sec({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-20 border-t border-line pt-6">
      <h2 id={`${id}-h`} className="display text-[26px]">
        {title}
      </h2>
      <div className="mt-3 text-[15px] leading-relaxed">{children}</div>
    </section>
  );
}

export function MethodsPage() {
  const { t, n, lang, L: Lraw } = useI18n();
  const L = useL();
  const d = useFieldData();
  const last = useLastRun();
  const [index, setIndex] = useState<SnapshotIndexEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadSnapshotIndex()
      .then((x) => alive && setIndex(x))
      .catch(() => alive && setIndex([]));
    return () => {
      alive = false;
    };
  }, []);
  const assumptions: AssumptionItem[] | null = d.analysis.result?.assumptions ?? last?.assumptions ?? null;
  const formulas: DictKey[] = ["m.f.et0", "m.f.wb", "m.f.soil", "m.f.irr", "m.f.yield", "m.f.replay", "m.f.trend", "m.f.opt"];
  const dataItems: DictKey[] = ["y.d.power", "y.d.srtm", "y.d.soilgrids", "y.d.modis", "y.d.mod16", "y.d.tarsim", "y.d.era5", "y.d.gibs", "y.d.eox", "y.d.osm"];
  const limits: DictKey[] = ["m.limit.1", "m.limit.2", "m.limit.3", "m.limit.4", "m.limit.5", "m.limit.6", "y.limit.7", "y.limit.8"];

  return (
    <div className="mx-auto max-w-[1200px] px-4 pt-6 sm:px-6">
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t("y.index")} className="sticky top-14 z-20 -mx-4 border-b border-line bg-bg px-4 py-2 lg:top-20 lg:mx-0 lg:self-start lg:border-b-0 lg:bg-transparent lg:p-0">
          <p className="label hidden lg:block">{t("y.index")}</p>
          <ol className="flex gap-1.5 overflow-x-auto scroll-thin lg:mt-2 lg:block lg:overflow-visible">
            {SECTIONS.map((s) => (
              <li key={s.id} className="shrink-0">
                <a href={`#${s.id}`} className="flex min-h-10 items-center rounded-md border border-line bg-surface px-2.5 text-[13px] text-ink-2 hover:text-ink lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:text-[14px]">
                  {t(s.key)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="min-w-0 max-w-[78ch] space-y-10">
          <header>
            <h1 className="display text-[36px] sm:text-[44px]">{t("m.title")}</h1>
            <p className="lead mt-3 text-[16px]">{t("y.lead")}</p>
            <figure className="mt-6 grid items-end gap-4 sm:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
              <div className="relative aspect-[1400/1662] overflow-hidden rounded-[10px] border border-line">
                <Image src={IMAGES.harranPlain.src} alt={Lraw(IMAGES.harranPlain.alt)} fill sizes="(min-width: 640px) 288px, calc(100vw - 2rem)" placeholder="blur" blurDataURL={IMAGES.harranPlain.blurDataURL} className="object-cover" />
                <ImageCredit text={IMAGES.harranPlain.creditShort} className="absolute bottom-2 left-2" />
              </div>
              <figcaption className="text-[14px] text-ink-2">{t("m.hero.caption")}</figcaption>
            </figure>
          </header>

          <Sec id="veri" title={t("m.data")}>
            <ul className="space-y-2">
              {dataItems.map((k) => (
                <li key={k} className="border-l-2 border-line-strong pl-3">
                  {t(k)}
                </li>
              ))}
            </ul>
            <h3 className="mt-5 text-[15px] font-semibold">{t("m.snapshots")}</h3>
            {index === null ? (
              <div className="skel mt-2 h-16" />
            ) : index.length === 0 ? (
              <p className="text-ink-2">{t("m.snapshotsNone")}</p>
            ) : (
              <ul className="mt-1 text-[14px]">
                {index.map((e) => (
                  <li key={e.id}>
                    {lang === "tr" ? e.nameTr : e.nameEn}: <span className="font-mono text-[13px]">{e.start}–{e.end}</span>, {t("trace.retrieved", { d: isoDay(e.retrievedAt) })}
                  </li>
                ))}
              </ul>
            )}
          </Sec>

          <Sec id="mod16" title={t("y.val.mod16")}>
            <Mod16ValidationCard />
          </Sec>

          <Sec id="tarsim" title={t("y.val.tarsim")}>
            <TarsimValidationCard />
          </Sec>

          <Sec id="harita" title={t("y.tiles")}>
            <p className="text-ink-2">{t("y.tilesLead")}</p>
            <ul className="mt-3 space-y-3">
              {TILE_SOURCES.filter((s) => s.id !== "eox-s2cloudless-2024").map((s) => (
                <li key={s.id} className="text-[14px]">
                  <span className="font-semibold">{lang === "tr" ? s.titleTr : s.titleEn}</span>
                  <span className="block text-ink-2">
                    {t("y.tileZoom", { z: s.maxNativeZoom })}
                    {s.timeEnabled ? ` · ${t("y.tileTime")}` : ""}
                  </span>
                  <span className="block text-[13px] text-ink-2" dangerouslySetInnerHTML={{ __html: s.attributionHtml }} />
                  <span className="block text-[13px] text-ink-2">{s.licenceNote}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[14px] text-ink-2">{t("y.nominatim")}</p>
          </Sec>

          <Sec id="formuller" title={t("m.formulas")}>
            <ul className="space-y-3">
              {formulas.map((k) => (
                <li key={k} className="border-l-2 border-line-strong pl-3">
                  {t(k)}
                </li>
              ))}
              <li className="border-l-2 border-line-strong pl-3">{t("y.f.precip")}</li>
              <li className="border-l-2 border-line-strong pl-3">{t("y.f.units")}</li>
              <li className="border-l-2 border-line-strong pl-3">{t("y.f.geodesic")}</li>
            </ul>
          </Sec>

          <Sec id="varsayimlar" title={t("y.assumptions")}>
            {assumptions ? (
              <>
                <p className="text-ink-2">{t("y.assumptionsLead", { n: assumptions.length, a: assumptions.filter((a) => a.confidence === "assumption").length })}</p>
                <details className="mt-3">
                  <summary className="tap text-[14px] font-medium">
                    <span className="chev mr-1.5 text-ink-2">›</span>
                    {t("y.assumptionsOpen")}
                  </summary>
                  <div className="mt-2 max-h-[60vh] overflow-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="text-left text-ink-2">
                          <th className="py-1 pr-3 font-medium">{t("y.a.item")}</th>
                          <th className="py-1 pr-3 font-medium">{t("y.a.value")}</th>
                          <th className="py-1 pr-3 font-medium">{t("y.a.kind")}</th>
                          <th className="py-1 font-medium">{t("y.a.source")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assumptions.map((a) => (
                          <tr key={a.key} className="border-t border-line align-top">
                            <td className="py-1 pr-3">{L(a.label)}</td>
                            <td className="py-1 pr-3 font-mono text-[12px]">{a.value}</td>
                            <td className="py-1 pr-3">{t(`asm.conf.${a.confidence}`)}</td>
                            <td className="py-1 text-ink-2">{a.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                {last && <p className="mt-2 text-[13px] text-ink-2">{t("m.at", { d: isoDay(last.at) })}</p>}
              </>
            ) : (
              <p className="text-ink-2">{t("m.lastRunNone")}</p>
            )}
          </Sec>

          <Sec id="agirliklar" title={t("m.weights")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-[15px] font-semibold">{t("m.weights.soil")}</h3>
                <ul className="mt-1 text-[14px]">
                  {Object.entries(SOIL_HEALTH_WEIGHTS).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-line py-1">
                      <span>{t(`y.soil.${k as keyof typeof SOIL_HEALTH_WEIGHTS}`)}</span>
                      <span className="font-mono">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">{t("m.weights.risk")}</h3>
                <ul className="mt-1 text-[14px]">
                  {Object.entries(RISK_WEIGHTS).map(([k, v]) => (
                    <li key={k} className="flex justify-between border-b border-line py-1">
                      <span>{t(`y.risk.${k as keyof typeof RISK_WEIGHTS}`)}</span>
                      <span className="font-mono">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Sec>

          <Sec id="urunler" title={t("m.crops")}>
            <p className="text-ink-2">{t("y.cropsLead")}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-[13px] tabular-nums">
                <thead>
                  <tr className="text-left text-ink-2">
                    <th className="py-1 pr-3 font-medium">{t("m.col.crop")}</th>
                    <th className="py-1 pr-3 font-medium">{t("m.col.kc")}</th>
                    <th className="py-1 pr-3 font-medium">{t("m.col.root")}</th>
                    <th className="py-1 pr-3 font-medium">{t("m.col.ky")}</th>
                    <th className="py-1 pr-3 font-medium">{t("y.col.yield")}</th>
                    <th className="py-1 pr-3 font-medium">{t("m.col.price")}</th>
                    <th className="py-1 font-medium">{t("m.col.cost")}</th>
                  </tr>
                </thead>
                <tbody>
                  {CROP_IDS.filter((c) => c !== "fallow").map((id) => {
                    const c = CROPS[id];
                    const a = c.agronomy!;
                    return (
                      <tr key={id} className="border-t border-line">
                        <td className="py-1 pr-3">{Lraw(c.name)}</td>
                        <td className="py-1 pr-3">{`${n(a.kc.value.ini, 2)} / ${n(a.kc.value.mid, 2)} / ${n(a.kc.value.end, 2)}`}</td>
                        <td className="py-1 pr-3">{n(a.rootDepthMaxM.value, 1)}</td>
                        <td className="py-1 pr-3">{n(a.ky.value, 2)}</td>
                        <td className="py-1 pr-3">{`${n(c.refYieldTHa.value.irrigated * 100)} / ${n(c.refYieldTHa.value.rainfed * 100)}`}</td>
                        <td className="py-1 pr-3">{n(c.priceTLPerKg.value, 2)}</td>
                        <td className="py-1">{n(c.varCostTLPerDa.value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Sec>

          <Sec id="sinirlar" title={t("m.limits")}>
            <ul className="list-disc space-y-1.5 pl-5">
              {limits.map((k) => (
                <li key={k}>{t(k)}</li>
              ))}
            </ul>
          </Sec>

          <Sec id="gorseller" title={t("m.images")}>
            <p className="text-ink-2">{t("m.images.lead", { d: IMAGES_RETRIEVED })}</p>
            <ul className="mt-3 space-y-4">
              {IMAGE_LIST.map((img) => (
                <li key={img.id} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 text-[13px]">
                  <Image src={img.src} alt={Lraw(img.alt)} width={64} height={64} className="size-16 rounded-md border border-line object-cover" />
                  <div>
                    <p className="font-semibold">{img.title}</p>
                    <p className="text-ink-2">{img.credit}</p>
                    <p className="text-ink-2">
                      {t("m.images.licence")}: {Lraw(img.licence)} · {t("m.images.used")}: {Lraw(img.usedIn)} · {t("m.images.edits")}: {Lraw(img.edits)}
                    </p>
                    <a href={img.sourceUrl} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">
                      {t("m.images.source")}
                    </a>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[13px] text-ink-2">{t("m.images.note")}</p>
            <p className="mt-1 text-[13px] text-ink-2">{t("y.brandNote")}</p>
          </Sec>

          <Sec id="kaynakca" title={t("m.methodRefs")}>
            <ol className="list-decimal space-y-1.5 pl-5 text-[14px]">
              {METHOD_SOURCES.map((m) => (
                <li key={m.id}>
                  {m.citation}{" "}
                  {m.url && (
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-accent-ink underline underline-offset-2">
                      {t("y.link")}
                    </a>
                  )}
                </li>
              ))}
            </ol>
          </Sec>

          <Sec id="yapay-zeka" title={t("m.ai")}>
            <p>{t("m.ai.body")}</p>
            <p className="mt-2">{t("footer.noGen")}</p>
          </Sec>
          <p className="readout pb-6">{t("footer.challenge")}</p>
        </div>
      </div>
    </div>
  );
}
