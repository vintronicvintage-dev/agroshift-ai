"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { CROPS } from "@/lib/crops/database";
import type { AnalysisResult, PlanResult, TrendResult } from "@/lib/types";
import { useI18n, type DictKey } from "@/lib/i18n";
import { setStore, useHydrated, useStore } from "@/lib/ui/fieldStore";
import { describeRing } from "@/lib/ui/geo";
import { evaluateMasterPlan, matchMasterProvince } from "@/lib/data/turkiyeAgroMaster";
import { useFieldData } from "@/components/data/FieldData";
import { CropArt } from "@/components/brand/CropArt";
import { SourceVisualCardsGrid, SCIENTIFIC_SOURCE_CARDS } from "@/components/brand/SourceVisualCards";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";
import { JudgmentNote } from "@/components/shell/AppShell";
import { MiniTable } from "@/components/tarla/CardKit";
import { cropName, planLabel, signed, useL } from "@/components/plan/planKit";

type ClaimId = "water" | "money" | "why" | "climate" | "frost" | "soil" | "rain" | "periods";

const CLAIM_SOURCE_MAP: Record<ClaimId, string[]> = {
  water: ["TAGEM_DSI_2017", "NASA_POWER", "ISRIC_SOILGRIDS", "NASA_NSIDC_SMAP"],
  money: ["TMO_TUIK_2026", "FAO_56_33_GAEZ"],
  why: ["FAO_56_33_GAEZ", "TAGEM_DSI_2017", "ISRIC_SOILGRIDS", "LANDSAT_SENTINEL_MODIS_NDVI"],
  climate: ["NASA_POWER", "NASA_GPM_IMERG", "NASA_NEX_GDDP_CMIP6"],
  frost: ["NASA_JPL_ECOSTRESS", "NASA_NSIDC_SMAP", "NASA_POWER"],
  soil: ["ISRIC_SOILGRIDS", "LANDSAT_SENTINEL_MODIS_NDVI", "NASA_SRTM_DEM"],
  rain: ["NASA_GPM_IMERG", "NASA_POWER"],
  periods: ["NASA_POWER", "TAGEM_DSI_2017", "FAO_56_33_GAEZ"],
};

export function EvidencePage() {
  const { t, lang, L } = useI18n();
  const hydrated = useHydrated();
  const s = useStore();
  const d = useFieldData();
  const r = d.analysis.result;
  const [cur, setCur] = useState<ClaimId>("water");
  const [pageMode, setPageMode] = useState<"claims" | "all_sources">("claims");
  const eng = s.view === "engineer";

  const fieldGeo = useMemo(() => (s.field ? describeRing(s.field.ring) : null), [s.field]);
  const lat = fieldGeo?.centroid.lat ?? 37.5677;
  const lon = fieldGeo?.centroid.lon ?? 32.7804;
  const matched = useMemo(() => matchMasterProvince(lat, lon), [lat, lon]);
  const masterEval = useMemo(
    () =>
      evaluateMasterPlan({
        lat,
        lon,
        crops: r?.alternatives[0]?.crops ?? s.inputs.rotation,
        tillageCode: "aniza_dogrudan_ekim",
        irrigationCode: s.inputs.rainfed
          ? "kuru_tarim"
          : s.inputs.method === "drip"
            ? "damla"
            : s.inputs.method === "sprinkler"
              ? "yagmurlama"
              : "salma",
      }),
    [lat, lon, r?.alternatives, s.inputs.rotation, s.inputs.rainfed, s.inputs.method],
  );

  if (!hydrated)
    return (
      <div className="mx-auto max-w-[1380px] px-4 py-8">
        <div className="skel h-64" />
      </div>
    );

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
  const claims: { id: ClaimId; key: DictKey; subTr: string; subEn: string }[] = [
    { id: "water", key: "ev.c.water", subTr: "ETc, Pe, dn ve dt parametreleri", subEn: "ETc, Pe, dn & dt parameters" },
    { id: "money", key: "ev.c.money", subTr: "TMO fiyat, masraf ve N kredisi", subEn: "Prices, costs & N credit" },
    { id: "why", key: "ev.c.why", subTr: "Ekolojik uyum ve münavebe kuralları", subEn: "Suitability & rotation rules" },
    { id: "climate", key: "ev.c.climate", subTr: "24 yıllık yağış ve Penman-Monteith ET₀", subEn: "24-yr rain & Penman-Monteith ET₀" },
    { id: "frost", key: "ev.c.frost", subTr: "Don günleri ve ECOSTRESS 70m LST", subEn: "Frost days & ECOSTRESS 70m LST" },
    { id: "soil", key: "ev.c.soil", subTr: "6 bileşenli indeks, TAW ve RUSLE", subEn: "6-component index, TAW & RUSLE" },
    { id: "rain", key: "ev.c.rain", subTr: "NASA POWER vs GPM IMERG vs ERA5", subEn: "NASA POWER vs GPM IMERG vs ERA5" },
    ...(eng
      ? [{ id: "periods" as const, key: "ev.c.periods" as const, subTr: "22 tarihsel dönem tablosu", subEn: "22 historical windows table" }]
      : []),
  ];

  const idx = Math.max(0, claims.findIndex((c) => c.id === cur));
  const active = claims[idx];
  const kc = matched.province.kimlik_ve_cografya;

  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 py-5 sm:px-6">
      {/* ── TOP HEADER BANNER ── */}
      <header className="bento-card flex flex-col justify-between gap-4 p-5 lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#1e6b34] px-3 py-0.5 font-mono text-[11px] font-bold text-white">
              Kanıt & Parametre Şeffaflığı · {kc.plaka} {kc.il_adi}
            </span>
            <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1e6b34]">
              Önerilen Sıra: {planLabel(best, lang)}
            </span>
          </div>
          <h1 className="mt-2 font-display text-[26px] font-semibold text-ink sm:text-[32px]">
            {lang === "tr"
              ? "Bilimsel Dayanaklar, Hesaplama Parametreleri ve Veri Kaynakları"
              : "Scientific Evidence, Calculation Parameters & Data Sources"}
          </h1>
          <p className="mt-0.5 max-w-[78ch] text-[14px] text-ink-2">
            {t("ev.lead", { seq: planLabel(best, lang), name: s.field.name })}
          </p>
        </div>

        {/* Right Controls: Page Mode + Farmer/Engineer Toggle + CSV */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-line bg-bg p-1 text-[12.5px] font-semibold">
            <button
              type="button"
              onClick={() => setPageMode("claims")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                pageMode === "claims" ? "bg-[#1e6b34] text-white shadow-2xs" : "text-ink-2 hover:text-ink"
              }`}
            >
              {lang === "tr" ? `Adım Adım Kanıtlar (${claims.length})` : `Step-by-Step Claims (${claims.length})`}
            </button>
            <button
              type="button"
              onClick={() => setPageMode("all_sources")}
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                pageMode === "all_sources" ? "bg-[#1e6b34] text-white shadow-2xs" : "text-ink-2 hover:text-ink"
              }`}
            >
              {lang === "tr"
                ? `Fotoğraflı Kaynak Kütüphanesi (${SCIENTIFIC_SOURCE_CARDS.length})`
                : `Photo Source Library (${SCIENTIFIC_SOURCE_CARDS.length})`}
            </button>
          </div>

          <div className="seg" role="group" aria-label={t("ev.view")}>
            <button type="button" aria-pressed={!eng} onClick={() => setStore({ view: "farmer" })}>
              {t("ev.farmer")}
            </button>
            <button type="button" aria-pressed={eng} onClick={() => setStore({ view: "engineer" })}>
              {t("ev.engineer")}
            </button>
          </div>

          {eng && (
            <button type="button" className="btn btn-sm" onClick={() => downloadCsv(r, lang)}>
              <Icon name="download" size={16} />
              {t("ev.csv")}
            </button>
          )}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODE 1: STEP-BY-STEP CLAIMS WITH EXPLICIT PARAMETERS & PHOTO SOURCE CARDS
         ═══════════════════════════════════════════════════════════════════════════ */}
      {pageMode === "claims" && (
        <div className="grid gap-6 lg:grid-cols-[290px_minmax(0,1fr)]">
          {/* Left Navigation Cards */}
          <nav aria-label={t("ev.claims")} className="lg:sticky lg:top-20 lg:self-start">
            <label className="lg:hidden">
              <span className="sr-only">{t("ev.claims")}</span>
              <select className="input mb-3" value={active.id} onChange={(e) => setCur(e.target.value as ClaimId)}>
                {claims.map((c, i) => (
                  <option key={c.id} value={c.id}>
                    {i + 1}. {t(c.key)}
                  </option>
                ))}
              </select>
            </label>

            <div className="bento-card hidden p-3 lg:block">
              <p className="px-2 pb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-2">
                {lang === "tr" ? "Doğrulanan İddialar" : "Verified Claims"}
              </p>
              <ol className="space-y-1.5">
                {claims.map((c, i) => {
                  const isAct = c.id === active.id;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        aria-current={isAct ? "step" : undefined}
                        onClick={() => setCur(c.id)}
                        className={`flex w-full items-start gap-2.5 rounded-xl p-2.5 text-left transition-all ${
                          isAct
                            ? "bg-[#1e6b34] text-white shadow-xs"
                            : "bg-bg/60 text-ink hover:bg-surface-2"
                        }`}
                      >
                        <span
                          className={`numeral flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] ${
                            isAct ? "bg-white/20 text-white" : "bg-[#e6f4ea] text-[#1e6b34]"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-display text-[14px] font-semibold leading-tight">{t(c.key)}</p>
                          <p
                            className={`mt-0.5 truncate font-mono text-[10.5px] ${
                              isAct ? "text-[#bbf7d0]" : "text-ink-2"
                            }`}
                          >
                            {lang === "tr" ? c.subTr : c.subEn}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Active Rotation Mini Preview inside Sidebar */}
              <div className="mt-4 rounded-xl border border-line bg-bg/75 p-3">
                <span className="font-mono text-[10.5px] font-bold uppercase text-ink-2">
                  {lang === "tr" ? "İncelenen 3 Yıllık Sıra" : "Evaluated 3-Year Plan"}
                </span>
                <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                  {best.crops.map((cid, k) => (
                    <div key={k} className="flex flex-col items-center rounded-lg bg-surface p-1.5">
                      <CropArt crop={cid} size={22} />
                      <span className="mt-1 truncate w-full text-[10.5px] font-semibold text-ink">
                        {L(CROPS[cid].name).split(" (")[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </nav>

          {/* Right Main Claim Content + Parameters + Photo Source Cards */}
          <div className="min-w-0 space-y-6">
            <article className="bento-card p-5 sm:p-6" aria-labelledby="iddia-h">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <span className="rounded-full bg-[#e6f4ea] px-3 py-1 font-mono text-[11.5px] font-bold text-[#1e6b34]">
                  {t("ev.claimN", { n: idx + 1, of: claims.length })} — {t(active.key)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={idx === 0}
                    onClick={() => setCur(claims[idx - 1].id)}
                  >
                    <Icon name="chevron-left" size={16} />
                    {t("common.back")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={idx === claims.length - 1}
                    onClick={() => setCur(claims[idx + 1].id)}
                  >
                    {t("common.next")}
                    <Icon name="chevron-right" size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <Claim
                  id={active.id}
                  r={r}
                  best={best}
                  eng={eng}
                  masterEval={masterEval}
                  province={matched.province}
                />
              </div>
            </article>

            {/* Photo-Backed Source Cards Directly Supporting This Claim */}
            <section className="bento-card p-5 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                <div>
                  <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0277bd]">
                    Bu İddianın Dayandığı Veri Kaynakları
                  </span>
                  <h3 className="mt-1 font-display text-[19px] font-semibold text-ink">
                    {lang === "tr"
                      ? `"${t(active.key)}" Hesabında Kullanılan Fotoğraflı Kaynak Kartları`
                      : `Photo-Backed Source Cards Used in "${t(active.key)}"`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPageMode("all_sources")}
                  className="text-[12.5px] font-semibold text-accent-ink hover:underline"
                >
                  {lang === "tr" ? "Tüm 10 Kaynak Kartını Gör →" : "View All 10 Source Cards →"}
                </button>
              </div>

              <SourceVisualCardsGrid
                lang={lang}
                filterIds={CLAIM_SOURCE_MAP[active.id]}
                compact
              />
            </section>

            <JudgmentNote />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════════
          MODE 2: FULL PHOTO-BACKED SCIENTIFIC SOURCES LIBRARY
         ═══════════════════════════════════════════════════════════════════════════ */}
      {pageMode === "all_sources" && (
        <section className="bento-card p-5 sm:p-6">
          <div className="mb-5 border-b border-line pb-4">
            <h2 className="font-display text-[22px] font-semibold text-ink">
              {lang === "tr"
                ? "Tüm Bilimsel Veri Kaynakları, Uydu Sensörleri ve Hesaplama Parametreleri"
                : "All Scientific Data Sources, Satellite Sensors & Calculation Parameters"}
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">
              {lang === "tr"
                ? "AgroShift AI karar motorunda kullanılan 10 birincil veri kaynağının gerçek uydu/saha fotoğrafları, denklemleri ve parametre birimleri:"
                : "Real satellite/field photography, equations, and parameter units for all 10 primary data sources powering AgroShift AI:"}
            </p>
          </div>
          <SourceVisualCardsGrid lang={lang} />
        </section>
      )}
    </div>
  );
}

function ParamGrid({
  title,
  items,
}: {
  title: string;
  items: { sym: string; label: string; val: string; src: string }[];
}) {
  return (
    <section className="mt-5 rounded-2xl border border-[#bbf7d0] bg-[#f0fdf4]/70 p-4">
      <h3 className="font-mono text-[11.5px] font-bold uppercase tracking-wider text-[#166534]">{title}</h3>
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((it, idx) => (
          <div key={idx} className="rounded-xl border border-line bg-surface p-3 shadow-2xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-mono text-[11.5px] font-bold text-[#1e6b34]">{it.sym}</span>
              <span className="rounded bg-bg px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-2">
                {it.src}
              </span>
            </div>
            <p className="mt-1 text-[11.5px] text-ink-2">{it.label}</p>
            <p className="mt-0.5 font-mono text-[14px] font-bold text-ink">{it.val}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-4 rounded-xl border border-line bg-bg/55 p-4">
      <h3 className="font-mono text-[11.5px] font-bold uppercase tracking-wider text-ink-2">{title}</h3>
      <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

function trendWord(tr: TrendResult | undefined, t: (k: DictKey) => string) {
  if (!tr) return "–";
  if (!tr.significant) return t("ev.trend.none");
  return tr.direction === "increasing" ? t("ev.trend.up") : t("ev.trend.down");
}

function Claim({
  id,
  r,
  best,
  eng,
  masterEval,
  province,
}: {
  id: ClaimId;
  r: AnalysisResult;
  best: PlanResult;
  eng: boolean;
  masterEval: ReturnType<typeof evaluateMasterPlan>;
  province: ReturnType<typeof matchMasterProvince>["province"];
}) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const cur = r.current;
  const H = (s: string) => (
    <h2 id="iddia-h" className="font-display text-[22px] font-semibold text-ink sm:text-[26px]">
      {s}
    </h2>
  );
  const pct = (p: number) => (lang === "tr" ? `%${n(p * 100)}` : `${n(p * 100)} %`);
  const distTable = (rows: [string, PlanResult["water"]["irrigationNetMmPerYr"]][], unit: string) => (
    <MiniTable
      head={["", "P10", "P50", "P90", t("ev.n")]}
      rows={rows.map(([k, d]) => [
        k,
        d ? n(d.p10) : "–",
        d ? n(d.p50) : "–",
        d ? n(d.p90) : "–",
        d ? `${d.n} ${unit}` : "–",
      ])}
    />
  );

  const sat = province.uydu_gozlem_smap_hls_ecostress;
  const soil = province.toprak_profili_0_30cm_soilgrids;
  const clim = province.iklim_ve_su_serisi_2005_2026;

  if (id === "water") {
    const a = cur.water.irrigationNetMmPerYr?.p50 ?? null;
    const b = best.water.irrigationNetMmPerYr?.p50 ?? null;
    return (
      <>
        {H(t("ev.water.claim", { seq: planLabel(best, lang), b: n(b), a: n(a) }))}
        <PairBars
          labels={[1, 2, 3].map((y) => `${t("plan.yearN", { y })} (${L(CROPS[best.crops[y - 1]].name).split(" (")[0]})`)}
          a={cur.years.map((y) => y.irrigationNetMm?.p50 ?? 0)}
          b={best.years.map((y) => y.irrigationNetMm?.p50 ?? 0)}
          aLabel={`${t("plan.mine")}: ${planLabel(cur, lang)}`}
          bLabel={`${t("plan.rec", { n: 1 })}: ${planLabel(best, lang)}`}
          unit={t("u.tonDa")}
        />
        <ParamGrid
          title={lang === "tr" ? "Su Dengesi Hesabında Kullanılan Parametreler" : "Water Balance Calculation Parameters"}
          items={[
            {
              sym: "ETc = Kc × ET₀",
              label: "3 Yıllık Toplam Bitki Su Tüketimi",
              val: `${n(masterEval.totals.totalEtcMm, 0)} mm (${n(masterEval.totals.totalEtcMm / 3, 0)} mm/yıl)`,
              src: "TAGEM & FAO-56",
            },
            {
              sym: "Pe (Etkili Yağış)",
              label: "Kök Bölgesine Sızan Efektif Yağış",
              val: `${n(masterEval.totals.totalPeMm, 0)} mm (${n(masterEval.totals.totalPeMm / 3, 0)} mm/yıl)`,
              src: "GPM IMERG",
            },
            {
              sym: "dn (Net Sulama)",
              label: "Bitki Kök Bölgesi Net Sulama İhtiyacı",
              val: `${n(b ?? masterEval.totals.avgAnnualDnMm, 0)} mm/yıl (ton/da)`,
              src: "FAO-56 Günlük",
            },
            {
              sym: "dt = dn / (Ea×Ec)",
              label: `Brüt Su Çekimi (%${n(masterEval.irrigation.toplam_randiman * 100, 1)} randıman)`,
              val: `${n(masterEval.totals.avgAnnualDtMm, 0)} m³/da/yıl`,
              src: "DSİ Sulama",
            },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Block title={t("ev.source")}>
            {t("ev.water.src", {
              w: r.windows.count,
              a: r.climate.period.start.slice(0, 4),
              b: r.climate.period.end.slice(0, 4),
            })}
          </Block>
          <Block title={t("ev.formula")}>
            <p className="font-mono text-[12.5px] font-semibold text-[#14532d]">{t("ev.water.formula")}</p>
          </Block>
        </div>
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
            {best.water.massBalanceMaxErrorMm !== null && (
              <p className="mt-2 text-[13px] text-ink-2">
                {t("ev.massBalance", { e: n(best.water.massBalanceMaxErrorMm, 3) })}
              </p>
            )}
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
        <Lines
          series={[
            { label: t("plan.mine"), pts: wins(cur), dashed: true },
            { label: t("plan.rec", { n: 1 }), pts: wins(best) },
          ]}
          unit="TL/da"
        />
        <ParamGrid
          title={lang === "tr" ? "Ekonomik Kazanç Hesabında Kullanılan Parametreler" : "Economic Margin Calculation Parameters"}
          items={[
            {
              sym: "Brüt Kâr (P50)",
              label: "Medyan Yıllık Net Kazanç",
              val: `+${n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} ₺/da/yıl`,
              src: "TMO / Borsa",
            },
            {
              sym: "P10 – P90 Bandı",
              label: "Kurak ve Yağışlı Yıl Kazanç Aralığı",
              val: `${n(best.economics.grossMarginTLPerDaPerYr?.p10 ?? 0, 0)} … ${n(best.economics.grossMarginTLPerDaPerYr?.p90 ?? 0, 0)} ₺/da`,
              src: "22 Dönem Sim.",
            },
            {
              sym: "ΔN Gübre Kredisi",
              label: "3 Yıllık Biyolojik Azot Ekonomik Değeri",
              val: `${masterEval.totals.netNitrogenKgDa3Yr >= 0 ? "+" : ""}${n(masterEval.totals.netNitrogenKgDa3Yr * 42, 0)} ₺/da`,
              src: "Angus (2015)",
            },
            {
              sym: "CVaR₂₀ (Kötü Yıl)",
              label: "En Kötü %20 İklim Dönemi Ortalama Kârı",
              val: `${n(best.robust?.cvar20MarginTLPerDaPerYr ?? 0, 0)} ₺/da/yıl`,
              src: "Risk Motoru",
            },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Block title={t("ev.source")}>{t("ev.money.src")}</Block>
          <Block title={t("ev.formula")}>
            <p className="font-mono text-[12.5px] font-semibold text-[#14532d]">{t("ev.money.formula")}</p>
          </Block>
        </div>
        {eng && (
          <Block title={t("ev.eng")}>
            {distTable(
              [
                [t("plan.mine"), cur.economics.grossMarginTLPerDaPerYr],
                [t("plan.rec", { n: 1 }), best.economics.grossMarginTLPerDaPerYr],
              ],
              t("ev.periods"),
            )}
          </Block>
        )}
      </>
    );
  }

  if (id === "why") {
    const ex = best.explanation;
    const list = (items: typeof ex.why) => (
      <ul className="space-y-2">
        {items.map((x, i) => (
          <li key={i} className="rounded-lg border-l-4 border-[#1e6b34] bg-surface px-3 py-2">
            <p className="text-[13.5px] text-ink">{L(x.text)}</p>
            {x.sources && x.sources.length > 0 && (
              <span className="mt-1 block font-mono text-[11px] font-semibold text-[#1e6b34]">
                Kaynak: {x.sources.join(" · ")}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
    return (
      <>
        {H(t("ev.why.claim", { seq: planLabel(best, lang) }))}
        <ParamGrid
          title={`${province.kimlik_ve_cografya.il_adi} İli Münavebe Karar Parametreleri`}
          items={[
            {
              sym: "Bileşik Skor",
              label: "TOPSIS Çok Kriterli Uyum Puanı",
              val: `${n(best.score.composite, 1)} / 100`,
              src: "TOPSIS",
            },
            {
              sym: "Pareto Cephesi",
              label: "Taranan / Uygun / Baskın Olmayan Plan",
              val: `${r.optimizer.enumerated} → ${r.optimizer.feasible} → ${r.pareto.length}`,
              src: "Optimizasyon",
            },
            {
              sym: "Kararlılık (±%20)",
              label: "Parametre Oynaklığında İlk 3'te Kalma Oranı",
              val: `%${Math.round((best.stability?.top3Share ?? 1) * 100)}`,
              src: "Duyarlılık",
            },
            {
              sym: "İl Özel Risk",
              label: "Yerel Fitopatoloji ve Zararlı Kısıtı",
              val: province.il_urun_verim_su_ve_rotasyon_matrisi.stratejik_urunler.slice(0, 3).join(", "),
              src: "TAGEM 81 İl",
            },
          ]}
        />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Block title={t("ev.why.reasons")}>{list(ex.why)}</Block>
          <Block title={t("ev.why.benefits")}>{list(ex.benefits)}</Block>
          {eng && <Block title={t("ev.why.evidence")}>{list(ex.evidence)}</Block>}
          <Block title={t("ev.why.gaps")}>{list(ex.gaps)}</Block>
          <Block title={t("ev.why.local")}>{list(ex.localReview)}</Block>
        </div>
      </>
    );
  }

  if (id === "climate") {
    const tp = r.climate.trends.find((x) => x.variable === "precip");
    const te = r.climate.trends.find((x) => x.variable === "et0");
    return (
      <>
        {H(
          t("ev.climate.claim", {
            p: n(r.climate.meanAnnualPrecipMm),
            e: n(r.climate.meanAnnualEt0Mm),
            tp: trendWord(tp, t),
          }),
        )}
        <BarsLine
          years={r.climate.annual.map((a) => a.year)}
          bars={r.climate.annual.map((a) => a.precipMm)}
          line={r.climate.annual.map((a) => a.et0Mm)}
          barLabel={t("climate.rain")}
          lineLabel={t("climate.et0Short")}
        />
        <ParamGrid
          title="İklim ve Evapotranspirasyon Parametreleri"
          items={[
            {
              sym: "Yıllık Yağış (P)",
              label: "24 Yıllık Ortalama Toplam Yağış",
              val: `${n(r.climate.meanAnnualPrecipMm, 0)} mm/yıl`,
              src: "NASA POWER",
            },
            {
              sym: "Referans ET₀",
              label: "Penman–Monteith Buharlaşma Talebi",
              val: `${n(r.climate.meanAnnualEt0Mm, 0)} mm/yıl`,
              src: "FAO-56 PM",
            },
            {
              sym: "GPM Sağanak (>25mm)",
              label: "Şiddetli Konvektif Yağış Günü",
              val: `${clim.gpm_siddetli_saganak_gun_sayisi} gün/yıl`,
              src: "GPM IMERG v07",
            },
            {
              sym: "2035 CMIP6 (SSP5-8.5)",
              label: "Projeksiyon Sıcaklık ve ET₀ Artışı",
              val: `+${province.projeksiyon_2035_cmip6.ssp585.sicaklik_artisi_C}°C / +%${province.projeksiyon_2035_cmip6.ssp585.ETo_artisi_yuzde}`,
              src: "NEX-GDDP-CMIP6",
            },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Block title={t("ev.source")}>{t("ev.climate.src", { y: r.climate.completeYears.length })}</Block>
          <Block title={t("ev.formula")}>
            <p className="font-mono text-[12.5px] font-semibold text-[#14532d]">{t("ev.climate.formula")}</p>
          </Block>
        </div>
        {eng && (
          <Block title={t("ev.eng")}>
            <MiniTable
              head={[t("ev.var"), "S", "Z", "p", t("ev.sen")]}
              rows={[tp, te]
                .filter((x): x is TrendResult => !!x)
                .map((x) => [x.variable, n(x.s), n(x.z, 2), n(x.p, 3), `${n(x.senSlope, 2)} ${x.unit}`])}
            />
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
        <BarsLine
          years={r.climate.annual.map((a) => a.year)}
          bars={r.climate.annual.map((a) => a.frostDays)}
          line={r.climate.annual.map((a) => a.hotDays)}
          barLabel={t("ev.frostDays")}
          lineLabel={t("ev.hotDays")}
          unit={t("ev.days")}
        />
        <ParamGrid
          title="Don ve Termal Stres Parametreleri"
          items={[
            {
              sym: "LST_yaz (ECOSTRESS)",
              label: "70m Yaz Kanopi/Yüzey Sıcaklığı",
              val: `${n(sat.ecostress_yaz_yuzey_sicakligi_LST_C, 1)} °C`,
              src: "ECOSTRESS 70m",
            },
            {
              sym: "N_termal_stres",
              label: "Yıllık Termal Stres Gün Sayısı",
              val: `${sat.ecostress_termal_stres_gun_sayisi} gün/yıl`,
              src: "ECOSTRESS ESI",
            },
            {
              sym: "Donsuz Gün Süresi",
              label: `${clim.son_ilkbahar_don_tarihi} – ${clim.ilk_sonbahar_don_tarihi}`,
              val: `${clim.donsuz_gun_sayisi} gün`,
              src: "SMAP L3 & MGM",
            },
            {
              sym: "Kış Min / Yaz Maks",
              label: "Ekstrem Sıcaklık Eşikleri",
              val: `${clim.kis_min_sicaklik_ort_C}°C / ${clim.yaz_maks_sicaklik_ort_C}°C`,
              src: "NASA POWER",
            },
          ]}
        />
        <Block title={t("ev.source")}>
          <ul className="space-y-1">
            {fy.map((y) => (
              <li key={y.year}>
                •{" "}
                {t("ev.frost.crop", {
                  y: y.year,
                  crop: cropName(y.cropId, lang),
                  f: n(y.frostDaysMean, 1),
                  h: n(y.heatDaysMean ?? 0, 1),
                })}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-ink-2">{t("ev.frost.src")}</p>
        </Block>
      </>
    );
  }

  if (id === "soil") {
    const comps = best.soilHealth.components;
    return (
      <>
        {H(t("ev.soil.claim", { a: n(cur.soilHealth.score), b: n(best.soilHealth.score) }))}
        <ParamGrid
          title="Toprak Fiziksel, Kimyasal ve Erozyon Parametreleri"
          items={[
            {
              sym: "Kil / Silt / Kum",
              label: soil.toprak_dokusu_sinifi,
              val: `%${soil.kil_yuzde} / %${soil.silt_yuzde} / %${soil.kum_yuzde}`,
              src: "SoilGrids 250m",
            },
            {
              sym: "TAW (Su Deposu)",
              label: `θ_FC %${n(soil.tarla_kapasitesi_m3_m3 * 100, 0)} − θ_WP %${n(soil.solma_noktasi_m3_m3 * 100, 0)}`,
              val: `${n(soil.yararlanilabilir_su_kapasitesi_TAW_mm_m, 0)} mm/m`,
              src: "Saxton-Rawls",
            },
            {
              sym: "pH · SOC · EC",
              label: "Kimyasal Toprak Parametreleri",
              val: `pH ${soil.ph} · SOC ${soil.organik_karbon_SOC_g_kg} g/kg · ${soil.tuzluluk_EC_dS_m} dS/m`,
              src: "ISRIC v2.0",
            },
            {
              sym: "RUSLE K & C Faktörü",
              label: "Toprak Aşınabilirliği ve Örtü Koruması",
              val: `K=${n(best.erosion?.kFactor ?? 0.02, 3)} · C=${n(best.erosion?.cFactor ?? 0.25, 3)}`,
              src: "USDA AH-703",
            },
          ]}
        />
        <ul className="mt-4 space-y-3 rounded-2xl border border-line bg-bg/50 p-4">
          {comps.map((c) => {
            const cc = cur.soilHealth.components.find((x) => x.key === c.key);
            return (
              <li key={c.key}>
                <div className="flex justify-between text-[13px]">
                  <span className="font-semibold text-ink">{L(c.label)}</span>
                  <span className="font-mono text-ink-2">
                    <strong className="text-[#1e6b34]">{n(c.value * c.weight, 1)}</strong> / {n(c.weight)} (
                    {t("plan.mine")}: {cc ? n(cc.value * cc.weight, 1) : "–"})
                  </span>
                </div>
                <div className="relative mt-1.5 h-3.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-[#22c55e]"
                    style={{ width: `${c.value * 100}%` }}
                  />
                  {cc && (
                    <div
                      className="absolute -inset-y-1 w-1 bg-ink"
                      style={{ left: `${cc.value * 100}%` }}
                      title={t("plan.mine")}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <Block title={t("ev.source")}>{t("ev.soil.src")}</Block>
      </>
    );
  }

  if (id === "rain") {
    const pu = r.precipUncertainty;
    return (
      <>
        {H(pu ? t("ev.rain.claim", { a: n(pu.rangeMm[0]), b: n(pu.rangeMm[1]) }) : t("ev.rain.none"))}
        {pu && (
          <div className="mt-4 space-y-3 rounded-2xl border border-line bg-bg/50 p-4">
            {pu.sources.map((s) => (
              <div key={s.id}>
                <div className="flex justify-between text-[13.5px]">
                  <span className="font-semibold text-ink">{L(s.label)}</span>
                  <span className="font-mono font-bold text-[#0277bd]">{n(s.annualMm)} mm/yıl</span>
                </div>
                <div className="mt-1.5 h-3.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(s.annualMm / pu.rangeMm[1]) * 100}%`,
                      background: s.id === "chosen" ? "#0277bd" : "#64748b",
                    }}
                  />
                </div>
              </div>
            ))}
            <p className="pt-2 text-[13.5px] text-ink-2">{L(pu.note)}</p>
          </div>
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
      <div className="mt-4 max-h-[60vh] overflow-auto rounded-xl border border-line">
        <MiniTable
          head={[
            t("ev.p.start"),
            ...all.flatMap((p) => [
              `${p.kind === "current" ? t("plan.mine") : t("plan.rec", { n: 1 })}: ${t("ev.p.unmet")}`,
              t("ev.p.yield"),
              t("ev.p.margin"),
            ]),
          ]}
          rows={(best.windows ?? []).map((w, i) => [
            `${w.startYear - 1}–${w.startYear + 2}`,
            ...all.flatMap((p) => {
              const x = p.windows?.[i];
              return x
                ? [
                    `${n(x.unmetMmPerYr)}${x.budgetExceeded ? " ×" : ""}`,
                    x.yieldRatio !== null ? pct(x.yieldRatio) : "–",
                    n(x.marginTLPerDaPerYr),
                  ]
                : ["–", "–", "–"];
            }),
          ])}
        />
      </div>
      <p className="mt-2 text-[12px] text-ink-2">{t("ev.periods.note")}</p>
    </>
  );
}

// ── Modernized, Aesthetic SVG Charts (Replacing Stark Boxy Rectangles) ──────────────
function PairBars({
  labels,
  a,
  b,
  aLabel,
  bLabel,
  unit,
}: {
  labels: string[];
  a: number[];
  b: number[];
  aLabel: string;
  bLabel: string;
  unit: string;
}) {
  const { n } = useI18n();
  const W = 680,
    H = 220,
    T = 28,
    B = 34,
    L = 36;
  const max = Math.max(10, ...a, ...b) * 1.12;
  const gw = (W - L) / labels.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);

  return (
    <figure className="mt-4 rounded-2xl border border-line bg-bg/55 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={labels.map((l, i) => `${l}: ${n(a[i])} / ${n(b[i])} ${unit}`).join("; ")}
      >
        {[0, 0.5, 1].map((frac, idx) => {
          const val = Math.round(max * frac);
          const yPos = y(val);
          return (
            <g key={idx}>
              <line
                x1={L}
                x2={W - 12}
                y1={yPos}
                y2={yPos}
                stroke={frac === 0 ? "var(--axis)" : "var(--grid)"}
                strokeDasharray={frac === 0 ? undefined : "4 4"}
              />
              <text x={L - 6} y={yPos + 4} textAnchor="end" fontSize="10.5" fill="var(--ink-2)">
                {n(val)}
              </text>
            </g>
          );
        })}

        {labels.map((l, i) => {
          const barW = Math.min(54, gw * 0.28);
          const xCenter = L + gw * (i + 0.5);
          const xA = xCenter - barW - 5;
          const xB = xCenter + 5;
          const hA = Math.max(2, y(0) - y(a[i]));
          const hB = Math.max(2, y(0) - y(b[i]));

          return (
            <g key={l}>
              {/* Current Plan Bar */}
              <rect
                x={xA}
                y={y(a[i])}
                width={barW}
                height={hA}
                rx="6"
                fill="rgba(100, 116, 139, 0.22)"
                stroke="#64748b"
                strokeWidth="1.5"
              />
              {/* Recommended Plan Bar */}
              <rect x={xB} y={y(b[i])} width={barW} height={hB} rx="6" fill="#0284c7" />
              <text
                x={xA + barW / 2}
                y={y(a[i]) - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="var(--ink-2)"
              >
                {n(a[i])}
              </text>
              <text
                x={xB + barW / 2}
                y={y(b[i]) - 6}
                textAnchor="middle"
                fontSize="12.5"
                fontWeight="700"
                fill="#0284c7"
              >
                {n(b[i])}
              </text>
              <text
                x={xCenter}
                y={H - 10}
                textAnchor="middle"
                fontSize="12"
                fontWeight="600"
                fill="var(--ink)"
              >
                {l}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-2.5 text-[12px] text-ink-2">
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="inline-block size-3 rounded-xs border border-[#64748b] bg-[#64748b]/25" />
            {aLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
            <span className="inline-block size-3 rounded-xs bg-[#0284c7]" />
            {bLabel}
          </span>
        </div>
        <span className="font-mono text-[11px]">Birim: {unit}</span>
      </figcaption>
    </figure>
  );
}

function Lines({
  series,
  unit,
}: {
  series: { label: string; pts: { x: number; y: number }[]; dashed?: boolean }[];
  unit: string;
}) {
  const { n } = useI18n();
  const W = 680,
    H = 220,
    L = 56,
    R = 14,
    T = 16,
    B = 28;
  const xs = series.flatMap((s) => s.pts.map((p) => p.x));
  const ys = series.flatMap((s) => s.pts.map((p) => p.y));
  if (!xs.length) return null;
  const x0 = Math.min(...xs),
    x1 = Math.max(...xs);
  const y0 = Math.min(0, ...ys),
    y1 = Math.max(...ys) * 1.1;
  const x = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - y0) / (y1 - y0 || 1)) * (H - T - B);

  return (
    <figure className="mt-4 rounded-2xl border border-line bg-bg/55 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={series
          .map((s) => `${s.label}: ${s.pts.map((p) => `${p.x} ${n(p.y)}`).join(", ")}`)
          .join(". ")}
      >
        {[y0, 0, y1 / 2, y1]
          .filter((v, i, a) => a.indexOf(v) === i)
          .map((v) => (
            <g key={v}>
              <line
                x1={L}
                x2={W - R}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0 ? "var(--axis)" : "var(--grid)"}
                strokeWidth={v === 0 ? 1 : 0.7}
                strokeDasharray={v === 0 ? undefined : "4 4"}
              />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
                {n(v)}
              </text>
            </g>
          ))}
        <text x={x(x0)} y={H - 6} fontSize="11" fill="var(--ink-2)">
          {x0 - 1}
        </text>
        <text x={x(x1)} y={H - 6} textAnchor="end" fontSize="11" fill="var(--ink-2)">
          {x1 - 1}
        </text>
        {series.map((s) => (
          <g key={s.label}>
            <polyline
              points={s.pts.map((p) => `${x(p.x)},${y(p.y)}`).join(" ")}
              fill="none"
              stroke={s.dashed ? "#64748b" : "#1e6b34"}
              strokeWidth={s.dashed ? 1.8 : 2.6}
              strokeDasharray={s.dashed ? "5 4" : undefined}
            />
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2 text-[12px] text-ink-2">
        <div className="flex gap-4">
          {series.map((s) => (
            <span key={s.label} className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="inline-block h-1 w-5 rounded-full"
                style={{ background: s.dashed ? "#64748b" : "#1e6b34" }}
              />
              {s.label}
            </span>
          ))}
        </div>
        <span className="font-mono text-[11px]">{unit}</span>
      </figcaption>
    </figure>
  );
}

function BarsLine({
  years,
  bars,
  line,
  barLabel,
  lineLabel,
  unit = "mm",
}: {
  years: number[];
  bars: (number | null)[];
  line: (number | null)[];
  barLabel: string;
  lineLabel: string;
  unit?: string;
}) {
  const { n, t } = useI18n();
  const W = 680,
    H = 220,
    L = 48,
    R = 12,
    T = 16,
    B = 26;
  const max = Math.max(1, ...bars.map((v) => v ?? 0), ...line.map((v) => v ?? 0)) * 1.08;
  const bw = (W - L - R) / years.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const valid = bars.filter((v): v is number => v !== null);
  const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null;

  return (
    <figure className="mt-4 rounded-2xl border border-line bg-bg/55 p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={years.map((yr, i) => `${yr}: ${n(bars[i])} / ${n(line[i])} ${unit}`).join("; ")}
      >
        {[0, max / 2, max].map((v) => (
          <g key={v}>
            <line
              x1={L}
              x2={W - R}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? "var(--axis)" : "var(--grid)"}
              strokeWidth={v === 0 ? 1 : 0.6}
            />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--ink-2)">
              {n(v)}
            </text>
          </g>
        ))}
        {bars.map((v, i) =>
          v !== null ? (
            <rect
              key={i}
              x={L + bw * i + 2}
              y={y(v)}
              width={Math.max(3, bw - 4)}
              height={y(0) - y(v)}
              rx="3"
              fill="var(--rain)"
            />
          ) : null,
        )}
        <polyline
          points={line
            .map((v, i) => (v !== null ? `${L + bw * (i + 0.5)},${y(v)}` : ""))
            .filter(Boolean)
            .join(" ")}
          fill="none"
          stroke="var(--et0)"
          strokeWidth="2.2"
        />
        {mean !== null && (
          <>
            <line x1={L} x2={W - R} y1={y(mean)} y2={y(mean)} stroke="var(--ref)" strokeDasharray="4 3" />
            <text
              x={W - R}
              y={y(mean) - 5}
              textAnchor="end"
              fontSize="11"
              fill="var(--ink)"
              paintOrder="stroke"
              stroke="var(--surface)"
              strokeWidth="3"
            >
              {t("ev.mean", { v: n(mean) })}
            </text>
          </>
        )}
        <text x={L} y={H - 6} fontSize="11" fill="var(--ink-2)">
          {years[0]}
        </text>
        <text x={W - R} y={H - 6} textAnchor="end" fontSize="11" fill="var(--ink-2)">
          {years[years.length - 1]}
        </text>
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-5 border-t border-line pt-2 text-[12px] text-ink-2">
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="inline-block size-3 rounded-xs bg-[var(--rain)]" />
          {barLabel}
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium">
          <span className="inline-block h-[3px] w-4 bg-[var(--et0)]" />
          {lineLabel}
        </span>
        <span className="font-mono">{unit}</span>
      </figcaption>
    </figure>
  );
}

function downloadCsv(r: AnalysisResult, lang: "tr" | "en") {
  const rows: string[] = [
    "plan_id,crops,kind,start_ag_year,deficit_mm_yr,unmet_mm_yr,budget_exceeded,yield_ratio,margin_tl_da_yr",
  ];
  const plans = [r.current, ...r.alternatives, ...r.userPlans, ...(r.robustBest ? [r.robustBest] : [])];
  for (const p of plans)
    for (const w of p.windows ?? [])
      rows.push(
        [
          p.id,
          `"${p.crops.join(">")}"`,
          p.kind,
          w.startYear,
          w.deficitMmPerYr.toFixed(2),
          w.unmetMmPerYr.toFixed(2),
          w.budgetExceeded,
          w.yieldRatio?.toFixed(4) ?? "",
          w.marginTLPerDaPerYr.toFixed(2),
        ].join(","),
      );
  rows.push("");
  rows.push("year,precip_mm,et0_mm,hot_days,frost_days,gwet_root_mean");
  for (const a of r.climate.annual)
    rows.push(
      [a.year, a.precipMm ?? "", a.et0Mm ?? "", a.hotDays ?? "", a.frostDays ?? "", a.gwetRootMean ?? ""].join(","),
    );
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const el = document.createElement("a");
  el.href = URL.createObjectURL(blob);
  el.download = lang === "tr" ? "agroshift-donemler.csv" : "agroshift-periods.csv";
  el.click();
  setTimeout(() => URL.revokeObjectURL(el.href), 2000);
}
