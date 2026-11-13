"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSnapshot, loadSnapshotIndex, matchSnapshotId, type SnapshotIndexEntry } from "@/lib/data/snapshots";
import { METHOD_SOURCES, ZONE_LABEL, climateEvidence } from "@/lib/engine";
import type { ClimateSeries, RotationSequence, SoilProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { applyPrecipCalibration, calibrationFor, parseStationMm } from "@/lib/ui/calibration";
import { DEFAULT_FIELD, fieldFromDraft, soilFromDraft, soilToDraft, type FieldDraft, type SoilDraft } from "@/lib/ui/fieldState";
import { fetchPart, type PartName, type SiteData } from "@/lib/ui/siteData";
import { makeSourceResolver, metaToRef } from "@/lib/ui/sources";
import { useAnalysis } from "@/lib/ui/useAnalysis";
import type { AnalysisRequest } from "@/lib/ui/analysisProtocol";
import { saveLastRun } from "@/lib/ui/lastRun";
import { goToSection, useSectionHash, type SectionId } from "@/lib/ui/steps";
import { markGsDone } from "@/lib/ui/gettingStarted";
import { composeVerdict } from "@/lib/ui/verdict";
import type { Site } from "./field/site";
import { FieldStep } from "./field/FieldStep";
import { EvidenceSection } from "./evidence/EvidenceSection";
import { DEFAULT_SCENARIO, type ScenarioDraft } from "./compare/ScenarioBar";
import { EMPTY_ECON, econToInput, type EconDraft } from "./compare/EconomicsEditor";
import type { CompareContext } from "./compare/PlanCard";
import { ResultsStep } from "./compare/ResultsStep";
import { StepHint } from "./flow/StepBar";
import { Onboarding } from "./onboarding/Onboarding";
import { DashboardShell } from "./shell/DashboardShell";
import { JudgmentNote } from "./shell/JudgmentNote";
import { Overview } from "./overview/Overview";
import { GettingStarted } from "./overview/GettingStarted";
import { TopbarControls } from "./overview/TopbarControls";

type Imerg = "validated" | "not_validated" | null;

export function AgroShiftApp() {
  const { t, n, L, lang } = useI18n();
  const [pilots, setPilots] = useState<SnapshotIndexEntry[] | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [data, setData] = useState<SiteData | null>(null);
  const [imerg, setImerg] = useState<Imerg>(null);
  const [soilBase, setSoilBase] = useState<SoilProfile | null>(null);
  const [soilDraft, setSoilDraft] = useState<SoilDraft | null>(null);
  const [draft, setDraft] = useState<FieldDraft>(DEFAULT_FIELD);
  const [scenario, setScenario] = useState<ScenarioDraft>(DEFAULT_SCENARIO);
  const [econ, setEcon] = useState<EconDraft>(EMPTY_ECON);
  const [extraPlans, setExtraPlans] = useState<RotationSequence[]>([]);
  const [openPlanId, setOpenPlanId] = useState<string | null>(null);
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  /** "Try a sample field" clicked before the pilot index arrived. */
  const pendingSample = useRef(false);

  /** Apply one finished part, if it still belongs to the current site. */
  const applyPart = useCallback(<K extends PartName>(gen: number, k: K, part: SiteData[K]) => {
    if (gen !== genRef.current) return;
    setData((d) => (d ? { ...d, [k]: part } : d));
    if (k === "soil") {
      if (part.status === "ok") {
        const s = (part as Extract<SiteData["soil"], { status: "ok" }>).data;
        setSoilBase(s);
        setSoilDraft(soilToDraft(s));
      } else if (part.status === "error") {
        setSoilBase(null);
        setSoilDraft({ sand: "", silt: "", clay: "", soc: "", ph: "" });
      }
    }
  }, []);

  const fetchLive = useCallback(
    (gen: number, parts: PartName[], lat: number, lon: number, signal: AbortSignal) => {
      const now = Date.now();
      setData((d) => {
        const base: SiteData = d ?? { climate: { status: "loading", startedAt: now }, soil: { status: "loading", startedAt: now }, ndvi: { status: "loading", startedAt: now } };
        const next = { ...base };
        for (const p of parts) next[p] = { status: "loading", startedAt: now };
        return next;
      });
      for (const p of parts) void fetchPart(p, lat, lon, signal).then((r) => applyPart(gen, p, r));
    },
    [applyPart],
  );

  const startSite = useCallback((s: Site) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const gen = ++genRef.current;
    const now = Date.now();
    setSite(s);
    setImerg(null);
    setSoilBase(null);
    setSoilDraft(null);
    setScenario((sc) => ({ ...sc, budgetOverride: null }));
    setData({ climate: { status: "loading", startedAt: now }, soil: { status: "loading", startedAt: now }, ndvi: { status: "loading", startedAt: now } });
    return { gen, signal: ctrl.signal };
  }, []);

  const selectEntry = useCallback(
    (entry: SnapshotIndexEntry) => {
      const id = entry.id;
      const { gen, signal } = startSite({ kind: "pilot", id, nameTr: entry.nameTr, nameEn: entry.nameEn, lat: entry.lat, lon: entry.lon, retrievedAt: entry.retrievedAt });
      loadSnapshot(id)
        .then((snap) => {
          if (gen !== genRef.current) return;
          if (!snap) {
            fetchLive(gen, ["climate", "soil", "ndvi"], entry.lat, entry.lon, signal);
            return;
          }
          setImerg(snap.imerg?.status ?? null);
          const missing: PartName[] = [];
          if (snap.climate) applyPart(gen, "climate", { status: "ok", data: snap.climate });
          else missing.push("climate");
          applyPart(gen, "soil", { status: "ok", data: snap.soil });
          if (snap.ndvi.points.length) applyPart(gen, "ndvi", { status: "ok", data: snap.ndvi });
          else missing.push("ndvi");
          if (missing.length) fetchLive(gen, missing, entry.lat, entry.lon, signal);
        })
        .catch(() => fetchLive(gen, ["climate", "soil", "ndvi"], entry.lat, entry.lon, signal));
    },
    [startSite, fetchLive, applyPart],
  );

  useEffect(() => {
    let alive = true;
    loadSnapshotIndex()
      .then((idx) => {
        if (!alive) return;
        setPilots(idx);
        if (pendingSample.current && idx[0]) {
          pendingSample.current = false;
          selectEntry(idx[0]);
        }
      })
      .catch(() => alive && setPilots([]));
    return () => {
      alive = false;
    };
  }, [selectEntry]);

  const selectPilot = useCallback(
    (id: string) => {
      const entry = pilots?.find((p) => p.id === id);
      if (entry) selectEntry(entry);
    },
    [pilots, selectEntry],
  );

  const selectPoint = useCallback(
    (lat: number, lon: number) => {
      const match = pilots ? matchSnapshotId(pilots, lat, lon) : null;
      if (match) {
        selectPilot(match);
        return;
      }
      const { gen, signal } = startSite({ kind: "point", id: null, nameTr: null, nameEn: null, lat, lon, retrievedAt: null });
      fetchLive(gen, ["climate", "soil", "ndvi"], lat, lon, signal);
    },
    [pilots, selectPilot, startSite, fetchLive],
  );

  const retry = useCallback(
    (p: PartName) => {
      if (!site || !abortRef.current) return;
      fetchLive(genRef.current, [p], site.lat, site.lon, abortRef.current.signal);
    },
    [site, fetchLive],
  );

  // ── derived inputs ──────────────────────────────────────────────────────
  const rawClimate: ClimateSeries | null = data?.climate.status === "ok" ? data.climate.data : null;
  const stationMm = parseStationMm(draft.stationMm);
  const stationInvalid = draft.stationMm.trim() !== "" && stationMm === null;
  const { climate, calibration } = useMemo(() => {
    if (!rawClimate) return { climate: null, calibration: null };
    const cal = calibrationFor(rawClimate, stationMm);
    return { climate: cal ? applyPrecipCalibration(rawClimate, cal) : rawClimate, calibration: cal };
  }, [rawClimate, stationMm]);
  const calibrationImpossible = stationMm !== null && rawClimate !== null && calibration === null;
  const climateKey = `${site?.lat},${site?.lon}|${calibration ? calibration.factor.toFixed(6) : "raw"}`;

  const soilCheck = useMemo(() => (soilDraft ? soilFromDraft(soilDraft, soilBase) : { profile: null, sum: null, texture: null }), [soilDraft, soilBase]);
  const fieldCheck = useMemo(() => fieldFromDraft(draft), [draft]);

  const request = useMemo<AnalysisRequest | null>(() => {
    if (!fieldCheck.field || !soilCheck.profile) return null;
    return {
      field: { ...fieldCheck.field, soil: soilCheck.profile },
      scenario: {
        rainMultiplier: scenario.rainMultiplier,
        tempDeltaC: scenario.tempDeltaC,
        priceMultiplier: scenario.priceMultiplier,
        irrigationBudgetMm: draft.rainfed ? 0 : scenario.budgetOverride,
      },
      economics: econToInput(econ),
      options: extraPlans.length ? { extraPlans } : undefined,
    };
  }, [fieldCheck, soilCheck, scenario, econ, extraPlans, draft.rainfed]);

  const analysis = useAnalysis(climate, climateKey, request);
  // Climate evidence does not depend on the field or scenario: show it as soon as data is loaded.
  const climateSummary = useMemo(() => (climate ? climateEvidence(climate) : null), [climate]);
  const result = analysis.result;

  useEffect(() => {
    if (result && site) saveLastRun(result, calibration, site.kind === "pilot" ? (site.nameEn ?? site.id ?? "") : `${site.lat}, ${site.lon}`);
  }, [result, calibration, site]);

  const resolve = useMemo(() => {
    const metas = [...(result?.climate.sources ?? []), ...(soilCheck.profile?.sources ?? []), ...(data?.ndvi.status === "ok" ? data.ndvi.data.sources : [])];
    return makeSourceResolver(metas, METHOD_SOURCES);
  }, [result, soilCheck.profile, data]);

  const compareCtx: CompareContext | null = (() => {
    if (!result || !fieldCheck.field) return null;
    const plans = [result.current, ...result.alternatives, ...result.userPlans];
    const def = plans.flatMap((p) => (p.water.requirementMmPerYr ? [p.water.requirementMmPerYr.p10, p.water.requirementMmPerYr.p90] : []));
    const mar = plans.flatMap((p) => (p.economics.grossMarginTLPerDaPerYr ? [p.economics.grossMarginTLPerDaPerYr.p10, p.economics.grossMarginTLPerDaPerYr.p90] : []));
    return {
      result,
      calibration,
      resolve,
      climateRefs: result.climate.sources.map(metaToRef),
      areaDa: fieldCheck.field.areaDa,
      domains: { deficit: [Math.min(0, ...def), Math.max(1, ...def)], margin: [Math.min(0, ...mar), Math.max(1, ...mar)] },
    };
  })();

  const fieldBudget = draft.rainfed ? 0 : fieldCheck.field?.irrigationBudgetMm ?? null;
  const status = result ? t("sc.ms", { n: result.optimizer.replayedExactly, w: result.windows.count, ms: n(analysis.ms ?? 0) }) : null;
  const zoneLabel = result ? L(ZONE_LABEL[result.zone]) : null;

  // ── dashboard sections ──────────────────────────────────────────────────
  const hashSection = useSectionHash();
  const locked = site === null;
  const section: SectionId = locked && (hashSection === "oneriler" || hashSection === "kanit") ? "genel" : hashSection;
  const soilLoading = data?.soil.status === "loading";
  const blocker = !site ? t("cta.needSite") : !fieldCheck.field || (soilDraft !== null && !soilCheck.profile) ? t("cta.invalid") : null;
  const siteName = site ? (site.kind === "pilot" ? ((lang === "tr" ? site.nameTr : site.nameEn) ?? "") : `${n(site.lat, 2)}°, ${n(site.lon, 2)}°`) : null;
  const bestScore = result ? composeVerdict(result).best.score.composite : null;
  const sub: Partial<Record<SectionId, string>> = {
    tarlam: siteName ?? t("step.fieldSub"),
    oneriler: analysis.running && site ? t("step.compareBusy") : bestScore !== null ? t("step.compareSub", { s: n(bestScore) }) : "",
    kanit: climateSummary ? t("step.evidenceSub", { n: climateSummary.completeYears.length }) : "",
  };

  // ── getting-started ticks, each from a real action ───────────────────────
  useEffect(() => {
    if (site) markGsDone("field");
  }, [site]);
  useEffect(() => {
    if (section === "oneriler" && result) markGsDone("compare");
    if (section === "kanit" && climateSummary) markGsDone("evidence");
  }, [section, result, climateSummary]);
  const onDraft = useCallback((next: FieldDraft) => {
    setDraft((prev) => {
      if (prev.rainfed !== next.rainfed || prev.budget !== next.budget || prev.rotation.join() !== next.rotation.join()) queueMicrotask(() => markGsDone("water"));
      return next;
    });
  }, []);
  const onScenario = useCallback((next: ScenarioDraft) => {
    if (next.preset !== "typical") markGsDone("scenario");
    setScenario(next);
  }, []);

  // A new section starts at the top of the page (or at the plan opened from the overview),
  // with focus on its content for screen readers.
  const rootRef = useRef<HTMLDivElement>(null);
  const firstStep = useRef(true);
  const scrollToPlan = useRef<string | null>(null);
  const openPlan = useCallback((id: string) => {
    setOpenPlanId(id);
    scrollToPlan.current = id;
    goToSection("oneriler");
  }, []);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const planId = scrollToPlan.current;
    scrollToPlan.current = null;
    const target = planId && section === "oneriler" ? document.getElementById(`detay-${planId}`)?.parentElement : null;
    if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "instant", block: "start" });
    else window.scrollTo({ top: 0, behavior: reduce ? "auto" : "instant" });
    rootRef.current?.focus({ preventScroll: true });
  }, [section]);

  const runSample = () => {
    const first = pilots?.[0];
    if (first) selectEntry(first);
    else pendingSample.current = true;
    goToSection("oneriler");
  };

  const sampleName = pilots?.[0] ? (lang === "tr" ? pilots[0].nameTr : pilots[0].nameEn) : null;
  const lead: Record<SectionId, string> = {
    genel: site ? t("ov.lead") : t("ov.emptyLead"),
    tarlam: t("step.field.lead"),
    oneriler: "",
    kanit: t("step.evidence.lead"),
  };

  return (
    <>
      <Onboarding sampleName={sampleName} onSample={runSample} onOwn={() => goToSection("tarlam")} />
      <DashboardShell
        place={section}
        locked={locked}
        sub={sub}
        topbar={<TopbarControls siteName={siteName} scenario={scenario} onScenario={onScenario} running={analysis.running && !!site} />}
      >
        <div ref={rootRef} data-step-root tabIndex={-1} className="outline-none" aria-labelledby={`h-${section}`}>
          <div key={section} className="enter">
            <header className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <h1 id={`h-${section}`} className="font-display text-[1.55rem] font-semibold leading-tight tracking-[-0.025em] sm:text-[1.7rem]">
                {t(SECTION_TITLE[section])}
              </h1>
              {lead[section] && <p className="max-w-[72ch] text-[0.92rem] text-ink-2">{lead[section]}</p>}
            </header>

            {section === "genel" && (
              <>
                <GettingStarted locked={locked} />
                <Overview
                  pilots={pilots}
                  site={site}
                  siteName={siteName}
                  data={data}
                  rawClimate={rawClimate}
                  climate={climateSummary}
                  result={result}
                  running={analysis.running}
                  calibration={calibration}
                  imerg={imerg}
                  soil={soilCheck.profile ?? soilBase}
                  areaDa={fieldCheck.field?.areaDa ?? null}
                  zoneLabel={zoneLabel}
                  onPilot={selectPilot}
                  onPoint={selectPoint}
                  onOpenPlan={openPlan}
                />
                <div className="mt-4">
                  <JudgmentNote />
                </div>
              </>
            )}

            {section !== "genel" && <StepHint id={section} />}

            {section === "tarlam" && (
              <FieldStep
                pilots={pilots}
                site={site}
                data={data}
                elevation={rawClimate?.elevation ?? null}
                zoneLabel={zoneLabel}
                onPilot={selectPilot}
                onPoint={selectPoint}
                onRetry={retry}
                draft={draft}
                onDraft={onDraft}
                soil={soilDraft}
                onSoil={setSoilDraft}
                soilBase={soilBase}
                soilCheck={soilCheck}
                onSoilReset={() => soilBase && setSoilDraft(soilToDraft(soilBase))}
                fieldCheck={fieldCheck}
                calibration={calibration}
                stationInvalid={stationInvalid}
                calibrationImpossible={calibrationImpossible}
                soilLoading={soilLoading}
                econ={econ}
                onEcon={setEcon}
                blocker={blocker}
                onShow={() => goToSection("oneriler")}
              />
            )}

            {section === "oneriler" && (
              <ResultsStep
                result={result}
                ctx={compareCtx}
                running={analysis.running}
                error={analysis.error}
                status={status}
                scenario={scenario}
                onScenario={onScenario}
                fieldBudget={fieldBudget}
                rainfed={draft.rainfed}
                calibration={calibration}
                econ={econ}
                onEcon={setEcon}
                extraPlans={extraPlans}
                onExtraPlans={setExtraPlans}
                openId={openPlanId}
                onOpenId={setOpenPlanId}
              />
            )}

            {section === "kanit" &&
              (climateSummary && data ? (
                <EvidenceSection climate={climateSummary} ndvi={data.ndvi} calibration={calibration} imerg={imerg} methodRef={resolve} onRetryNdvi={() => retry("ndvi")} />
              ) : (
                <p className={`rounded-2xl border border-dashed border-rule-strong px-4 py-12 text-center text-ink-2 ${analysis.running ? "recalc" : ""}`}>{t("ev.waitingData")}</p>
              ))}
          </div>
        </div>
      </DashboardShell>
    </>
  );
}

const SECTION_TITLE: Record<SectionId, "nav.overview" | "step.field" | "step.compare" | "step.evidence"> = {
  genel: "nav.overview",
  tarlam: "step.field",
  oneriler: "step.compare",
  kanit: "step.evidence",
};
