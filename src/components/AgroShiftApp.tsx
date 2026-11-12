"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { loadSnapshot, loadSnapshotIndex, matchSnapshotId, type SnapshotIndexEntry } from "@/lib/data/snapshots";
import { METHOD_SOURCES, ZONE_LABEL } from "@/lib/engine";
import type { ClimateSeries, RotationSequence, SoilProfile } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { applyPrecipCalibration, calibrationFor, parseStationMm } from "@/lib/ui/calibration";
import { DEFAULT_FIELD, fieldFromDraft, soilFromDraft, soilToDraft, type FieldDraft, type SoilDraft } from "@/lib/ui/fieldState";
import { fetchPart, type PartName, type SiteData } from "@/lib/ui/siteData";
import { makeSourceResolver, metaToRef } from "@/lib/ui/sources";
import { useAnalysis } from "@/lib/ui/useAnalysis";
import type { AnalysisRequest } from "@/lib/ui/analysisProtocol";
import { saveLastRun } from "@/lib/ui/lastRun";
import { JudgmentNote } from "./shell/JudgmentNote";
import { SitePanel, type Site } from "./field/SitePanel";
import { FieldForm } from "./field/FieldForm";
import { EvidenceSection } from "./evidence/EvidenceSection";
import { DEFAULT_SCENARIO, ScenarioBar, type ScenarioDraft } from "./compare/ScenarioBar";
import { EconomicsEditor, EMPTY_ECON, econToInput, type EconDraft } from "./compare/EconomicsEditor";
import { PlanCard, type CompareContext } from "./compare/PlanCard";
import { ParetoChart } from "./compare/ParetoChart";
import { RotationBuilder } from "./compare/RotationBuilder";
import { AssumptionsPanel } from "./compare/AssumptionsPanel";

type Imerg = "validated" | "not_validated" | null;

export function AgroShiftApp() {
  const { t, n, L } = useI18n();
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
  const genRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let alive = true;
    loadSnapshotIndex()
      .then((idx) => alive && setPilots(idx))
      .catch(() => alive && setPilots([]));
    return () => {
      alive = false;
    };
  }, []);

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

  const selectPilot = useCallback(
    (id: string) => {
      const entry = pilots?.find((p) => p.id === id);
      if (!entry) return;
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
    [pilots, startSite, fetchLive, applyPart],
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

  return (
    <main className="mx-auto max-w-[1320px] px-4 pb-10 sm:px-6">
      <div className="pt-6">
        <JudgmentNote />
      </div>

      <Step n={1} id="tarla" title={t("step.field")} lead={t("step.field.lead")}>
        <SitePanel
          pilots={pilots}
          site={site}
          data={data}
          elevation={rawClimate?.elevation ?? null}
          zoneLabel={zoneLabel}
          onPilot={selectPilot}
          onPoint={selectPoint}
          onRetry={retry}
        />
        {site && (
          <div className="mt-6">
            <FieldForm
              draft={draft}
              onDraft={setDraft}
              soil={soilDraft}
              onSoil={setSoilDraft}
              soilBase={soilBase}
              soilCheck={soilCheck}
              onSoilReset={() => soilBase && setSoilDraft(soilToDraft(soilBase))}
              fieldCheck={fieldCheck}
              calibration={calibration}
              stationInvalid={stationInvalid}
              calibrationImpossible={calibrationImpossible}
              soilLoading={data?.soil.status === "loading"}
            />
          </div>
        )}
      </Step>

      <Step n={2} id="kanit" title={t("step.evidence")} lead={t("step.evidence.lead")}>
        {result && data ? (
          <EvidenceSection result={result} ndvi={data.ndvi} calibration={calibration} imerg={imerg} methodRef={resolve} onRetryNdvi={() => retry("ndvi")} />
        ) : (
          <Placeholder busy={analysis.running}>{analysis.running ? t("run.first") : t("ev.waitingData")}</Placeholder>
        )}
      </Step>

      <Step n={3} id="karsilastir" title={t("step.compare")} lead={t("step.compare.lead")}>
        {site && (
          <div className="mb-5 space-y-3">
            <ScenarioBar value={scenario} onChange={setScenario} fieldBudget={fieldBudget} rainfed={draft.rainfed} running={analysis.running} status={status} calibration={calibration} />
            <JudgmentNote compact />
          </div>
        )}
        {analysis.error && (
          <p className="mb-4 rounded-md bg-warn px-3 py-2 text-warn-ink" role="alert">
            {t("run.error", { msg: analysis.error })}
          </p>
        )}
        {result && compareCtx ? (
          <div className={`space-y-6 ${analysis.running ? "opacity-80 transition-opacity" : ""}`}>
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              <PlanCard plan={result.current} ctx={compareCtx} />
              {result.alternatives.map((p) => (
                <PlanCard key={p.id} plan={p} ctx={compareCtx} />
              ))}
              {result.userPlans.map((p) => (
                <PlanCard key={p.id} plan={p} ctx={compareCtx} onRemove={() => setExtraPlans((xs) => xs.filter((x) => x.join() !== p.crops.join()))} />
              ))}
            </div>
            <RotationBuilder
              existing={[result.current.crops, ...result.alternatives.map((a) => a.crops), ...extraPlans]}
              onAdd={(r) => setExtraPlans((xs) => [...xs, r])}
            />
            <EconomicsEditor value={econ} onChange={setEcon} />
            <ParetoChart result={result} />
            <AssumptionsPanel result={result} calibration={calibration} />
          </div>
        ) : (
          <Placeholder busy={analysis.running}>{analysis.running ? t("run.first") : t("run.waiting")}</Placeholder>
        )}
      </Step>
    </main>
  );
}

function Step({ n, id, title, lead, children }: { n: number; id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-12 first-of-type:mt-10">
      <div className="mb-5 grid grid-cols-[auto_1fr] items-baseline gap-x-4 border-b border-rule pb-3">
        <span className="font-serif text-4xl font-medium leading-none text-loam tabular-nums" aria-hidden="true">
          {n}
        </span>
        <div>
          <h2 id={`${id}-h`} className="font-serif text-[1.85rem] font-semibold leading-tight tracking-tight">
            {title}
          </h2>
          <p className="mt-1 max-w-[72ch] text-ink-2">{lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Placeholder({ children, busy }: { children: ReactNode; busy: boolean }) {
  return <p className={`rounded-lg border border-dashed border-rule px-4 py-8 text-center text-ink-2 ${busy ? "recalc" : ""}`}>{children}</p>;
}
