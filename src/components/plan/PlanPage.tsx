"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CROP_IDS, CROPS } from "@/lib/engine";
import type { AnalysisResult, CropId, PlanResult, RotationSequence } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { setInputs, useHydrated, useStore } from "@/lib/ui/fieldStore";
import { describeRing } from "@/lib/ui/geo";
import { monthlyTemps } from "@/lib/ui/derive";
import {
  CROP_ID_TO_MASTER,
  evaluateMasterPlan,
  matchMasterProvince,
  type MasterIrrigationCode,
  type MasterTillageCode,
} from "@/lib/data/turkiyeAgroMaster";
import { useFieldData } from "@/components/data/FieldData";
import { CropArt } from "@/components/brand/CropArt";
import { SourceVisualCardsGrid } from "@/components/brand/SourceVisualCards";
import { SpotArt } from "@/components/brand/SpotArt";
import { Icon } from "@/components/ui/Icons";
import { Skeleton } from "@/components/ui/Skeleton";
import { FieldShiftComparison, evaluateYearBudgetStatus } from "@/components/tarla/FieldShiftComparison";
import { Verdict } from "./Verdict";
import { Timeline, bareLines } from "./Timeline";
import { Compare, MarkerIcon, WindowStrip } from "./Compare";
import { Builder } from "./Builder";
import { Pareto } from "./Pareto";
import { Conditions } from "./Conditions";
import { ShareBar, PrintReport } from "./Share";
import { allPlans, cropFull, GradeBadge, planLabel, planTitle, Sequence, useL } from "./planKit";
import { irrigations, outOf } from "./units";

export function PlanPage() {
  const { t, n, lang, L } = useI18n();
  const hydrated = useHydrated();
  const s = useStore();
  const d = useFieldData();
  const r = d.analysis.result;
  const [openId, setOpenId] = useState<string | null>(null);
  const [studioTab, setStudioTab] = useState<"overview" | "custom_builder" | "sources">("overview");
  const [tillageCode, setTillageCode] = useState<MasterTillageCode>("aniza_dogrudan_ekim");
  const [customIrr, setCustomIrr] = useState<MasterIrrigationCode | null>(null);

  const climate = d.climate.status === "ok" ? d.climate.data : null;
  const frost = useMemo(
    () => (climate ? monthlyTemps(climate).frostShare.map((v) => (v ?? 0) >= 0.3) : Array(12).fill(false)),
    [climate],
  );

  const fieldGeo = useMemo(() => (s.field ? describeRing(s.field.ring) : null), [s.field]);
  const lat = fieldGeo?.centroid.lat ?? 37.5677;
  const lon = fieldGeo?.centroid.lon ?? 32.7804;
  const matched = useMemo(() => matchMasterProvince(lat, lon), [lat, lon]);

  const derivedIrr: MasterIrrigationCode = s.inputs.rainfed
    ? "kuru_tarim"
    : s.inputs.method === "drip"
      ? "damla"
      : s.inputs.method === "sprinkler"
        ? "yagmurlama"
        : "salma";
  const activeIrr = customIrr ?? derivedIrr;

  const masterEval = useMemo(
    () =>
      evaluateMasterPlan({
        lat,
        lon,
        crops: r?.alternatives[0]?.crops ?? s.inputs.rotation,
        tillageCode,
        irrigationCode: activeIrr,
      }),
    [lat, lon, r?.alternatives, s.inputs.rotation, tillageCode, activeIrr],
  );

  if (!hydrated)
    return (
      <div className="mx-auto max-w-[1440px] px-4 py-8">
        <Skeleton className="h-64" />
      </div>
    );

  if (!s.field) {
    return (
      <div className="mx-auto flex max-w-[640px] flex-col items-start px-4 py-12">
        <SpotArt name="no-field" width={220} className="text-ink-3" />
        <h1 className="display mt-4 text-[34px]">{t("pl.noField")}</h1>
        <p className="mt-2 text-[15px] text-ink-2">{t("pl.noFieldLead")}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/tarla" className="btn btn-primary">
            <Icon name="polygon" size={18} />
            {t("pl.toField")}
          </Link>
        </div>
      </div>
    );
  }

  const area = s.inputs.areaOverrideDa ?? s.field.areaDa;
  const plans = r ? allPlans(r) : [];
  const best = r?.alternatives[0] ?? null;
  const selected = openId ?? best?.id ?? null;
  const activePlan = plans.find((p) => p.id === selected) ?? best ?? r?.current ?? null;

  const open = (id: string) => {
    setOpenId(id);
    requestAnimationFrame(() =>
      document.getElementById(`plan-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const assignYearCrop = (cropId: CropId, yrIdx: 0 | 1 | 2) => {
    const next: RotationSequence = [...s.inputs.rotation] as RotationSequence;
    next[yrIdx] = cropId;
    setInputs({ rotation: next });
  };

  const prov = matched.province;
  const kc = prov.kimlik_ve_cografya;
  const matris = prov.il_urun_verim_su_ve_rotasyon_matrisi;

  return (
    <div className="mx-auto max-w-[1480px] space-y-5 px-4 py-5 sm:px-6">
      <div className="no-print space-y-5">
        <nav className="plan-route-nav" aria-label={lang === "tr" ? "Ekim planı bölümleri" : "Crop plan sections"}>
          <a href="#field-shift-sonuclar">{lang === "tr" ? "Su bütçesi ve sonuçlar" : "Water budget and results"}</a>
          <a href="#plan-studio" onClick={() => setStudioTab("overview")}>{lang === "tr" ? "Plan ve takvim" : "Plans and calendar"}</a>
          <a href="#plan-studio" onClick={() => setStudioTab("custom_builder")}>{lang === "tr" ? "Kendi planını kur" : "Build your own plan"}</a>
          <Link href="/yontem">{lang === "tr" ? "Veri ve yöntem" : "Data and methods"}</Link>
        </nav>
        {/* ── UNIFIED 3-STEP FIELD SHIFT CONTROLS & COMPARISON AT TOP OF /PLAN ── */}
        <FieldShiftComparison
          result={r ?? null}
          running={d.analysis.running}
          error={Boolean(d.analysis.error || d.climate.status === "error")}
          onRetry={() => d.retry("climate")}
          effectiveAreaDa={area}
          soilTextureLabel={prov.toprak_profili_0_30cm_soilgrids.toprak_dokusu_sinifi}
          provinceName={`${kc.il_adi} (${kc.tagem_iklim_kodu})`}
          onJumpToProfitability={() => {
            setStudioTab("overview");
            requestAnimationFrame(() => document.getElementById("plan-studio")?.scrollIntoView({ block: "start" }));
          }}
        />

        {(d.analysis.running || !r) && <div className="progress-line" aria-hidden="true" />}

        {!r && <Waiting />}

        <div id="plan-studio" className="plan-studio">
        {r && (
          <>
            <header className="plan-studio-heading">
              <h2>{lang === "tr" ? "Plan stüdyosu" : "Plan studio"}</h2>
              <ShareBar result={r} />
            </header>
            <div className="plan-studio-tabs" role="group" aria-label={lang === "tr" ? "Plan görünümü" : "Plan view"}>
              {([
                ["overview", "Plan ve takvim", "Plans and calendar"],
                ["custom_builder", "Plan oluştur ve karşılaştır", "Build and compare"],
                ["sources", "Kaynak kütüphanesi", "Source library"],
              ] as const).map(([id, tr, en]) => (
                <button key={id} type="button" aria-pressed={studioTab === id} onClick={() => setStudioTab(id)}>
                  {lang === "tr" ? tr : en}
                </button>
              ))}
            </div>
            {/* ═════════════════════════════════════════════════════════════════════════
                TAB 1: CROP SELECTION, 36-MONTH TIMELINE & CLEAN PLAN COMPARISON
               ═════════════════════════════════════════════════════════════════════════ */}
            {studioTab === "overview" && best && (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
                <div className="min-w-0 space-y-6">
                  {/* DECISIVE CROP SELECTION & PROVINCE ROTATION DECK */}
                  <section className="bento-card p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
                      <div>
                        <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#1e6b34]">
                          {lang === "tr"
                            ? `${kc.il_adi} İli Ekolojik Münavebe Motoru`
                            : `${kc.il_adi} Ecological Rotation Engine`}
                        </span>
                        <h2 className="mt-1 font-display text-[20px] font-semibold text-ink">
                          {lang === "tr"
                            ? "Net Ürün Seçimi ve Hazır 3 Yıllık Rotasyon Paketleri"
                            : "Decisive Crop Selection & Ready 3-Year Rotation Packages"}
                        </h2>
                      </div>

                      {/* Tillage & Irrigation Quick Selector */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-xl border border-line bg-bg p-1 text-[11.5px] font-semibold">
                          <button
                            type="button"
                            onClick={() => setTillageCode("aniza_dogrudan_ekim")}
                            className={`rounded-lg px-2.5 py-1 ${
                              tillageCode === "aniza_dogrudan_ekim" ? "bg-[#1e6b34] text-white" : "text-ink-2"
                            }`}
                          >
                            {lang === "tr" ? "Anıza Ekim (+25mm)" : "No-Till (+25mm)"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTillageCode("geleneksel_surum")}
                            className={`rounded-lg px-2.5 py-1 ${
                              tillageCode === "geleneksel_surum" ? "bg-[#1e6b34] text-white" : "text-ink-2"
                            }`}
                          >
                            {lang === "tr" ? "Pulluklu Sürüm" : "Conventional Till"}
                          </button>
                        </div>

                        <div className="inline-flex rounded-xl border border-line bg-bg p-1 text-[11.5px] font-semibold">
                          {(
                            [
                              { code: "damla", labelTr: "Damla", labelEn: "Drip" },
                              { code: "center_pivot", labelTr: "Pivot", labelEn: "Pivot" },
                              { code: "yagmurlama", labelTr: "Yağmurlama", labelEn: "Sprinkler" },
                              { code: "salma", labelTr: "Salma", labelEn: "Furrow" },
                              { code: "kuru_tarim", labelTr: "Kuru", labelEn: "Rainfed" },
                            ] as const
                          ).map((ir) => (
                            <button
                              key={ir.code}
                              type="button"
                              onClick={() => {
                                setCustomIrr(ir.code);
                                setInputs({
                                  rainfed: ir.code === "kuru_tarim",
                                  method: ir.code === "damla" ? "drip" : ir.code === "salma" ? "furrow" : "sprinkler",
                                });
                              }}
                              className={`rounded-lg px-2 py-1 ${
                                activeIrr === ir.code ? "bg-[#0277bd] text-white" : "text-ink-2"
                              }`}
                            >
                              {lang === "tr" ? ir.labelTr : ir.labelEn}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 3 Ready Province Packages */}
                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                      {masterEval.packages.map((pkg) => {
                        const isCurrent =
                          s.inputs.rotation[0] === pkg.crops[0] &&
                          s.inputs.rotation[1] === pkg.crops[1] &&
                          s.inputs.rotation[2] === pkg.crops[2];
                        return (
                          <div
                            key={pkg.id}
                            className={`flex flex-col justify-between rounded-2xl border p-3.5 transition-all ${
                              isCurrent
                                ? "border-2 border-[#1e6b34] bg-[#f0fdf4]"
                                : "border-line bg-bg/60 hover:border-[#1e6b34]/50"
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1">
                                <span className="rounded-full bg-[#e6f4ea] px-2 py-0.5 font-mono text-[10.5px] font-bold text-[#1e6b34]">
                                  {pkg.badgeTr}
                                </span>
                                <span className="font-mono text-[10.5px] text-ink-2">
                                  dn: {n(pkg.avgDnMm, 0)}mm · ΔN: {pkg.netNitrogenKgDa >= 0 ? "+" : ""}
                                  {pkg.netNitrogenKgDa}kg
                                </span>
                              </div>
                              <p className="mt-2 font-display text-[14.5px] font-semibold text-ink">
                                {pkg.crops.map((c) => L(CROPS[c].name).split(" (")[0]).join(" → ")}
                              </p>
                              <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-2">{pkg.description}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInputs({ rotation: [...pkg.crops] })}
                              className={`mt-3 w-full rounded-xl py-1.5 text-[12px] font-semibold transition-colors ${
                                isCurrent
                                  ? "bg-[#14532d] text-white"
                                  : "bg-[#1e6b34] text-white hover:bg-[#165227]"
                              }`}
                            >
                              {isCurrent
                                ? lang === "tr"
                                  ? "✓ Seçili Rotasyon"
                                  : "✓ Active Rotation"
                                : lang === "tr"
                                  ? "Paketi Seç ve Uygula"
                                  : "Select & Apply Package"}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* 3 Interactive Year Slots with Full Agronomic Parameters */}
                    <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                      {([0, 1, 2] as const).map((yrIdx) => {
                        const cid = s.inputs.rotation[yrIdx];
                        const mCode = CROP_ID_TO_MASTER[cid];
                        const mEntry = matris.urun_detay_tablosu[mCode] ?? matris.urun_detay_tablosu.Bugday;
                        const suit = mEntry.ekolojik_uygunluk_durumu;
                        const yrEval = masterEval.years[yrIdx];

                        return (
                          <div
                            key={yrIdx}
                            className="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 shadow-2xs"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="rounded-lg bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#1e6b34]">
                                  {yrIdx + 1}. {lang === "tr" ? "ÜRETİM YILI" : "PRODUCTION YEAR"}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-bold ${
                                    suit === "Uygun"
                                      ? "bg-[#dcfce7] text-[#166534]"
                                      : suit === "Kisitli_Uygun"
                                        ? "bg-[#fef3c7] text-[#92400e]"
                                        : "bg-[#fee2e2] text-[#991b1b]"
                                  }`}
                                >
                                  {suit === "Uygun"
                                    ? lang === "tr"
                                      ? "Uygun"
                                      : "Suitable"
                                    : suit === "Kisitli_Uygun"
                                      ? lang === "tr"
                                        ? "Kısıtlı Uygun"
                                        : "Limited"
                                      : lang === "tr"
                                        ? "Don Riskli"
                                        : "Frost Risk"}
                                </span>
                              </div>

                              <div className="mt-3 flex items-center gap-3">
                                <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-[#bbf7d0] bg-bg">
                                  <CropArt crop={cid} size={38} />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <label htmlFor={`studio-crop-year-${yrIdx + 1}`} className="block text-[11px] font-medium text-ink-2">
                                    {lang === "tr" ? `${yrIdx + 1}. Yıl Ürünü Seçin:` : `Select Year ${yrIdx + 1} Crop:`}
                                  </label>
                                  <select
                                    id={`studio-crop-year-${yrIdx + 1}`}
                                    value={cid}
                                    onChange={(e) => assignYearCrop(e.target.value as CropId, yrIdx)}
                                    className="mt-0.5 w-full rounded-xl border border-line bg-bg px-2.5 py-1.5 font-display text-[14.5px] font-semibold text-ink cursor-pointer"
                                  >
                                    {CROP_IDS.map((x) => (
                                      <option key={x} value={x}>
                                        {L(CROPS[x].name)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <dl className="mt-3 grid grid-cols-2 gap-1.5 rounded-xl bg-bg/80 p-2.5 font-mono text-[11px]">
                                <div>
                                  <dt className="text-[10px] text-ink-2">{lang === "tr" ? "Ekim – Hasat" : "Sow – Harvest"}</dt>
                                  <dd className="truncate font-semibold text-ink">
                                    {mEntry.ekim_donemi.split(" (")[0]}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-ink-2">{lang === "tr" ? "Katsayılar (Kc / Ky)" : "Coeffs (Kc / Ky)"}</dt>
                                  <dd className="font-semibold text-ink">
                                    Kc={yrEval.kcWeighted} · Ky={yrEval.ky}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-ink-2">{lang === "tr" ? "ETc / Net Su (dn)" : "ETc / Net Water (dn)"}</dt>
                                  <dd className="font-semibold text-[#0277bd]">
                                    {n(yrEval.etcMm, 0)} / {n(yrEval.dnNetMm, 0)} mm
                                  </dd>
                                </div>
                                <div>
                                  <dt className="text-[10px] text-ink-2">{lang === "tr" ? "Verim & Azot (ΔN)" : "Yield & Nitrogen (ΔN)"}</dt>
                                  <dd className="font-semibold text-[#1e6b34]">
                                    {n(yrEval.expectedYieldKgDa, 0)} kg ({yrEval.nitrogenDeltaKgDa >= 0 ? "+" : ""}
                                    {yrEval.nitrogenDeltaKgDa} N)
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* CLEAN 36-MONTH VISUAL TIMELINE */}
                  <section id="takvim" className="bento-card p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[20px] font-semibold text-ink">{t("pl.timeline")}</h2>
                        <p className="text-[13px] text-ink-2">{t("pl.timelineLead")}</p>
                      </div>
                      <span className="rounded-full bg-[#e0f2fe] px-3 py-1 font-mono text-[11px] font-semibold text-[#0277bd]">
                        {lang === "tr"
                          ? "36 Ay (Ekim Başlangıçlı Tarım Yılı)"
                          : "36 Months (October-Start Agricultural Year)"}
                      </span>
                    </div>
                    <Timeline
                      frostMonths={frost}
                      rows={[
                        r.current,
                        ...(plans.find((p) => p.id === selected && p.kind !== "current")
                          ? [plans.find((p) => p.id === selected)!]
                          : best
                            ? [best]
                            : []),
                      ].map((p) => ({
                        id: p.id,
                        title: planTitle(p, r, t),
                        calendar: p.calendar,
                        monthly: p.monthlyDemand ?? null,
                      }))}
                    />
                  </section>

                  {/* DECLUTTERED PLANS LIST & STRUCTURED CARDS */}
                  <section id="planlar" className="bento-card p-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-[20px] font-semibold text-ink">{t("pl.plans")}</h2>
                        <p className="text-[13px] text-ink-2">
                          {t("pl.plansLead", { n: r.optimizer.feasible, w: r.windows.count })}
                        </p>
                      </div>
                      <Link href="/dayanak" className="btn btn-sm">
                        <Icon name="evidence" size={15} />
                        <span>{lang === "tr" ? "Kanıt & Kaynak Merkezi →" : "Evidence Hub →"}</span>
                      </Link>
                    </div>
                    <ul className="space-y-3">
                      {plans.map((p, i) => (
                        <PlanRow
                          key={p.id}
                          p={p}
                          i={i}
                          r={r}
                          open={selected === p.id}
                          onToggle={() => setOpenId(selected === p.id ? "__none" : p.id)}
                          area={area}
                        />
                      ))}
                    </ul>
                  </section>

                  {/* VERDICT SUMMARY CARD */}
                  <Verdict result={r} onOpen={open} />
                </div>

                {/* RIGHT STICKY SIDEBAR: Clean Farmer Conditions */}
                <aside
                  className="min-w-0 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1 scroll-thin"
                  aria-labelledby="sartlar-h"
                >
                  <div className="bento-card p-5">
                    <div className="flex items-center gap-2 border-b border-line pb-3">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                        <Icon name="sliders" size={17} />
                      </span>
                      <div>
                        <h2 id="sartlar-h" className="font-display text-[18px] font-semibold text-ink">
                          {t("pl.conditions")}
                        </h2>
                        <p className="text-[12px] text-ink-2">{t("pl.conditionsLead")}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <Conditions />
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════════
                TAB 2: CUSTOM ROTATION BUILDER, PARETO & HISTORICAL WINDOWS
               ═════════════════════════════════════════════════════════════════════════ */}
            {studioTab === "overview" && !best && (
              <p className="text-sm text-ink-2" role="status">
                {lang === "tr" ? "Bu koşullarda geçerli alternatif bulunamadı. Kendi planını oluşturup inceleyebilirsin." : "No eligible alternative was found. You can still build and inspect your own plan."}
              </p>
            )}
            {studioTab === "custom_builder" && (
              <div className="space-y-6">
                <section id="kurucu" className="bento-card p-5">
                  <h2 className="font-display text-[22px] font-semibold text-ink">{t("pl.builder")}</h2>
                  <div className="mt-4">
                    {d.engineInput && <Builder input={d.engineInput} current={r.current} />}
                  </div>
                </section>

                <section id="karsilastir" className="bento-card p-5">
                  <h2 className="font-display text-[22px] font-semibold text-ink">{t("pl.compare")}</h2>
                  <p className="mt-1 text-[13.5px] text-ink-2">{t("pl.compareLead")}</p>
                  <div className="mt-4">
                    <Compare result={r} plans={plans} selectedId={selected} onSelect={(id) => setOpenId(id)} />
                  </div>
                </section>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <section id="yillar" className="bento-card p-5">
                    <h2 className="font-display text-[20px] font-semibold text-ink">{t("pl.years")}</h2>
                    <p className="mt-1 text-[13px] text-ink-2">{t("pl.yearsLead", { w: r.windows.count })}</p>
                    <div className="mt-4">
                      <WindowStrip result={r} plans={plans} />
                    </div>
                  </section>

                  <section id="denge" className="bento-card p-5">
                    <h2 className="font-display text-[20px] font-semibold text-ink">{t("pl.pareto")}</h2>
                    <p className="mt-1 text-[13px] text-ink-2">{t("pl.paretoLead")}</p>
                    <div className="mt-4">
                      <Pareto result={r} plans={plans} />
                    </div>
                  </section>
                </div>
              </div>
            )}

            {/* ═════════════════════════════════════════════════════════════════════════
                TAB 3: CALCULATION PARAMETERS & PHOTO SOURCE CARDS
               ═════════════════════════════════════════════════════════════════════════ */}
            {studioTab === "sources" && (
              <div className="space-y-6">
                <section className="bento-card p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
                    <div>
                      <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#1e6b34]">
                        Parametre & Veri Kaynağı Şeffaflığı
                      </span>
                      <h2 className="mt-1 font-display text-[22px] font-semibold text-ink">
                        {lang === "tr"
                          ? `${kc.il_adi} Parsel Hesaplamalarında Kullanılan Bilimsel Kaynak Kartları`
                          : `Scientific Source Cards Used in ${kc.il_adi} Parcel Calculations`}
                      </h2>
                    </div>
                    {activePlan && (
                      <span className="font-mono text-[12px] text-ink-2">
                        Seçili Plan: {planLabel(activePlan, lang)}
                      </span>
                    )}
                  </div>
                  <SourceVisualCardsGrid lang={lang} />
                </section>
              </div>
            )}
          </>
        )}
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
    <div className="bento-card flex flex-col items-start gap-3 p-6">
      <SpotArt name={err ? "offline" : "loading-data"} width={200} className="text-ink-3" />
      <h2 className="display text-[26px]">{err ? t("pl.errTitle") : t("pl.waitTitle")}</h2>
      <p className="text-[15px] text-ink-2">
        {err ? t("pl.errLead") : d.climate.status === "loading" ? t("climate.slow") : t("pl.waitLead")}
      </p>
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

function PlanRow({
  p,
  i,
  r,
  open,
  onToggle,
  area,
}: {
  p: PlanResult;
  i: number;
  r: AnalysisResult;
  open: boolean;
  onToggle: () => void;
  area: number;
}) {
  const { t, n, lang } = useI18n();
  const L = useL();
  const ok =
    p.kind === "current"
      ? (r.alternatives[0]?.trade?.okWindowsCurrent ?? null)
      : (p.trade?.okWindowsPlan ?? null);
  const req = p.water.irrigationNetMmPerYr?.p50 ?? null;
  const mar = p.economics.grossMarginTLPerDaPerYr;

  return (
    <li
      id={`plan-${p.id}`}
      className={`scroll-mt-20 overflow-hidden rounded-2xl border transition-all ${
        open ? "border-[#1e6b34] bg-surface shadow-sm" : "border-line bg-bg/50 hover:border-line-strong"
      }`}
    >
      <button
        type="button"
        className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4 text-left hover:bg-surface-2/60"
        aria-expanded={open}
        onClick={onToggle}
      >
        <MarkerIcon i={i} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-[16px] font-semibold text-ink">{planTitle(p, r, t)}</span>
            <span className="rounded-lg bg-surface px-2.5 py-0.5 font-mono text-[12.5px] font-semibold text-[#1e6b34]">
              {planLabel(p, lang)}
            </span>
            {p.id === r.typicalBestId && (
              <span className="rounded-full bg-[#dcfce7] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#166534]">
                {t("pl.bestTag")}
              </span>
            )}
            {p.id === r.kneeId && <span className="chip">{t("pl.kneeTag")}</span>}
          </span>
          <span className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12.5px] text-ink-2">
            <span>💧 {t("pl.rowWater", { v: n(req), k: n(irrigations(req ?? 0), 1) })}</span>
            <span className="font-semibold text-[#1e6b34]">
              💰 {t("pl.rowMoney", { v: n(mar?.p50 ?? null) })}
            </span>
            {ok !== null && <span>🛡️ {t("pl.rowOk", { s: outOf(ok, r.windows.count, lang) })}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {p.confidence && <GradeBadge grade={p.confidence.grade} />}
          <Icon name="chevron-down" size={18} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-line bg-surface p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Sequence crops={p.crops} />
            <button
              type="button"
              onClick={() => setInputs({ rotation: [...p.crops] })}
              className="btn btn-primary btn-sm"
            >
              <Icon name="check" size={15} />
              <span>{lang === "tr" ? "Bu Sırayı Mevcut Planım Yap" : "Set as My Active Plan"}</span>
            </button>
          </div>

          {p.narrative && p.kind !== "current" && (
            <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-3.5 py-2.5 text-[14px] font-medium text-[#14532d]">
              {L(p.narrative.verdict)}
            </div>
          )}

          {/* Clean Styled Year-by-Year Table with Explicit Budget Status Column */}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[40rem] text-[13px] tabular-nums">
              <caption className="sr-only">{t("pl.yearTable")}</caption>
              <thead className="border-b border-line bg-bg/90 text-left text-[11.5px] font-semibold text-ink-2">
                <tr>
                  <th className="px-3 py-2">{t("pl.col.year")}</th>
                  <th className="px-3 py-2">{t("pl.col.crop")}</th>
                  <th className="px-3 py-2 text-right">{t("pl.col.yield")}</th>
                  <th className="px-3 py-2 text-right">{t("pl.col.bad")}</th>
                  <th className="px-3 py-2 text-right">{t("pl.col.irr")}</th>
                  <th className="px-3 py-2 text-left">
                    {lang === "tr" ? "Su Bütçesi Durumu" : "Budget Status"}
                  </th>
                  <th className="px-3 py-2 text-right">{t("pl.col.money")}</th>
                  <th className="px-3 py-2 text-left">{t("pl.col.dates")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {p.years.map((y) => {
                  const cal = p.calendar.find((c) => c.year === y.year);
                  const big = y.cropId === "sugar_beet" || y.cropId === "alfalfa";
                  const fmtY = (tHa: number) => (big ? `${n(tHa / 10, 2)} ton/da` : `${n(tHa * 100)} kg/da`);
                  const yrDiag = evaluateYearBudgetStatus(y, r.scenario.budgetNetMm, r.windows.count, lang);
                  return (
                    <tr key={y.year} className="hover:bg-bg/50">
                      <td className="px-3 py-2 font-mono font-semibold">{y.year}. {lang === "tr" ? "Yıl" : "Yr"}</td>
                      <td className="px-3 py-2 font-medium text-ink">
                        <span className="inline-flex items-center gap-2">
                          <CropArt crop={y.cropId} size={22} />
                          {cropFull(y.cropId, lang)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-ink">
                        {y.yieldTHa ? fmtY(y.yieldTHa.p50) : "–"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-ink-2">
                        {y.yieldTHa ? fmtY(y.yieldTHa.p10) : "–"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-[#0277bd]">
                        {y.irrigationNetMm ? `${n(y.irrigationNetMm.p50)} ${t("u.tonDa")}` : "–"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold ${
                            yrDiag.exceeded
                              ? "bg-[#dc2626] text-white"
                              : "bg-[#dcfce7] text-[#166534]"
                          }`}
                        >
                          {yrDiag.statusBadge}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-semibold text-[#1e6b34]">
                        {y.grossMarginTLPerDa ? `${n(y.grossMarginTLPerDa.p50)} TL/da` : "–"}
                      </td>
                      <td className="px-3 py-2 text-[12px] text-ink-2">
                        {cal?.sow && cal.harvest
                          ? t("pl.dates", { s: fmtMD(cal.sow, lang), h: fmtMD(cal.harvest, lang) })
                          : t("pl.fallowRow")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Decluttered 3-Column Agronomic Diagnostic Cards (Replacing the old text wall) */}
          <div className="grid gap-3 sm:grid-cols-3">
            {/* Card A: Bare Soil */}
            <div className="rounded-xl border border-line bg-bg/60 p-3">
              <h4 className="font-mono text-[11px] font-bold uppercase text-ink-2">{t("pl.bare")}</h4>
              <p className="mt-1 font-mono text-[15px] font-bold text-ink">
                {n(p.soilHealth.bareDaysPerYear)} {lang === "tr" ? "gün/yıl açıkta" : "bare days/yr"}
              </p>
              <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-2">
                {bareLines(p.calendar, lang).map((b) => (
                  <li key={b.year}>{t("pl.bareLine", { y: b.year, crop: b.name, d: b.days })}</li>
                ))}
              </ul>
            </div>

            {/* Card B: Soil Health (Model Indicator) & Nitrogen */}
            <div className="rounded-xl border border-line bg-bg/60 p-3">
              <h4 className="font-mono text-[11px] font-bold uppercase text-ink-2">{t("pl.soilN")}</h4>
              <p className="mt-1 font-mono text-[15px] font-bold text-[#1e6b34]">
                {lang === "tr" ? "Model göstergesi:" : "Model indicator:"} {n(p.soilHealth.score)} / 100
              </p>
              <div className="mt-1.5 space-y-0.5 text-[12px] text-ink-2">
                {p.nitrogen && (
                  <p>
                    {t("pl.nBalance", {
                      a: n(p.nitrogen.balanceKgHaYr.low / 10, 1),
                      b: n(p.nitrogen.balanceKgHaYr.high / 10, 1),
                    })}
                  </p>
                )}
                {p.erosion?.aTHaYr != null && (
                  <p>
                    {t("pl.erosion", {
                      v: n(p.erosion.aTHaYr / 10, 1),
                      c: t(`pl.eros.${p.erosion.class ?? "low"}`),
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* Card C: Pre-Crop & Scenario Economic Output */}
            <div className="rounded-xl border border-line bg-bg/60 p-3">
              <h4 className="font-mono text-[11px] font-bold uppercase text-ink-2">
                {lang === "tr" ? "Senaryo Ekonomik Çıktısı & Ön Bitki" : "Scenario Economic Output & Pre-Crop"}
              </h4>
              {mar && p.economics.fieldTotal3yrTL && (
                <p className="mt-1 font-mono text-[15px] font-bold text-[#1e6b34]">
                  {n(p.economics.fieldTotal3yrTL.p50 / 3, 0)} ₺/{lang === "tr" ? "yıl" : "yr"} ({n(area)} da)
                </p>
              )}
              {p.preCrop && p.preCrop.some((x) => x.yieldFactor !== 1 || x.nCostSavingTLPerDa > 0) ? (
                <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-2">
                  {p.preCrop.map((x) => (
                    <li key={x.year}>
                      {t("pl.precropLine", {
                        y: x.year,
                        prev: cropFull(x.prev, lang),
                        crop: cropFull(x.cropId, lang),
                        f: n((x.yieldFactor - 1) * 100),
                      })}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[12px] text-ink-2">{t("pl.yieldNote")}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <Link
              href="/dayanak"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-accent-ink hover:underline"
            >
              <Icon name="evidence" size={16} />
              <span>{t("pl.why")}</span>
            </Link>
          </div>
        </div>
      )}
    </li>
  );
}

const fmtMD = (mmdd: string, lang: "tr" | "en") =>
  new Date(Date.UTC(2023, Number(mmdd.slice(0, 2)) - 1, Number(mmdd.slice(3, 5)))).toLocaleDateString(
    lang === "tr" ? "tr-TR" : "en-GB",
    { day: "numeric", month: "long", timeZone: "UTC" },
  );
