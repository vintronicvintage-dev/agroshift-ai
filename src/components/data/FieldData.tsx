"use client";

/**
 * Fetches everything the field needs and runs the engine, once, above every route (root layout),
 * so navigation between Tarla, Ekim nöbeti and Dayanak never refetches or recomputes.
 * Each source resolves on its own; a failing source never blocks the others.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { AnalysisInput, ClimateSeries, NdviSeries, PrecipAdjustment, SoilProfile, TerrainInfo } from "@/lib/types";
import type { FieldResponse } from "@/lib/data/fieldTypes";
import { loadSnapshot, loadSnapshotIndex, matchSnapshotId, type Snapshot, type SnapshotIndexEntry } from "@/lib/data/snapshots";
import { getClassicRegionalSequence } from "@/lib/data/turkiyeAgroMaster";
import { usdaTextureClass } from "@/lib/engine";
import { annualPrecipStats } from "@/lib/ui/calibration";
import { useAnalysis, type AnalysisState } from "@/lib/ui/useAnalysis";
import type { AnalysisRequest } from "@/lib/ui/analysisProtocol";
import { decodeFieldHash, METHOD_EFF, setField, useStore, type EconDraft } from "@/lib/ui/fieldStore";
import { describeRing } from "@/lib/ui/geo";
import { useI18n } from "@/lib/i18n";
import { saveLastRun } from "@/lib/ui/lastRun";

export type Part<T> =
  | { status: "idle" }
  | { status: "loading"; startedAt: number }
  | { status: "ok"; data: T; from: "snapshot" | "live" }
  | { status: "error"; code: "timeout" | "network" | "http"; message: string };

export type PartName = "field" | "soilPart" | "precip" | "climate" | "ndvi";

export interface FieldData {
  /** Terrain for the polygon (POST /api/field?parts=terrain, a few seconds). */
  field: Part<FieldResponse>;
  /** Soil layers (POST /api/field?parts=soil; SoilGrids can take 30 s or time out). */
  soilPart: Part<FieldResponse>;
  /** Rainfall cross-check (slow part: needs the POWER series off the pilots). */
  precip: Part<{ precipCheck: FieldResponse["precipCheck"] }>;
  climate: Part<ClimateSeries>;
  ndvi: Part<NdviSeries>;
  snapshot: { entry: SnapshotIndexEntry; snap: Snapshot } | null;
  pilots: SnapshotIndexEntry[] | null;
  /** Terrain for the cards: live polygon terrain, else the pilot's bundled 3×3 point stencil. */
  terrain: { data: TerrainInfo; basis: "polygon" | "pilotPoint" } | null;
  soil: SoilProfile | null;
  /** Climate passed to the engine (same object across renders). */
  climateForEngine: ClimateSeries | null;
  request: AnalysisRequest | null;
  engineInput: AnalysisInput | null;
  analysis: AnalysisState;
  /** Mean annual POWER rainfall over complete years (for the station factor). */
  powerAnnualMm: number | null;
  retry: (p: PartName) => void;
}

const Ctx = createContext<FieldData | null>(null);
const IDLE = { status: "idle" } as const;

const TIMEOUT: Record<PartName, number> = { field: 60_000, soilPart: 70_000, precip: 160_000, climate: 150_000, ndvi: 180_000 };

async function getJson<T>(url: string, init: RequestInit | undefined, timeoutMs: number, signal: AbortSignal): Promise<Part<T>> {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  signal.addEventListener("abort", abort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok) return { status: "error", code: "http", message: (body as { error?: { message?: string } } | null)?.error?.message ?? `HTTP ${res.status}` };
    return { status: "ok", data: body as T, from: "live" };
  } catch (e) {
    if (timedOut) return { status: "error", code: "timeout", message: "timeout" };
    return { status: "error", code: "network", message: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

export function econToInput(d: EconDraft): AnalysisInput["economics"] {
  const num = (s?: string) => {
    const v = Number((s ?? "").trim().replace(",", "."));
    return (s ?? "").trim() !== "" && Number.isFinite(v) && v >= 0 ? v : null;
  };
  const crops: NonNullable<AnalysisInput["economics"]>["crops"] = {};
  for (const [id, v] of Object.entries(d.crops)) {
    const o: { priceTLPerKg?: number; varCostTLPerDa?: number } = {};
    const p = num(v?.price);
    const c = num(v?.cost);
    if (p !== null) o.priceTLPerKg = p;
    if (c !== null) o.varCostTLPerDa = c;
    if (Object.keys(o).length) (crops as Record<string, typeof o>)[id] = o;
  }
  const w = num(d.water);
  const out: NonNullable<AnalysisInput["economics"]> = {};
  if (Object.keys(crops).length) out.crops = crops;
  if (w !== null) out.waterPriceTLPerM3 = w;
  return Object.keys(out).length ? out : undefined;
}

/**
 * Pure decision helper: which parts need an immediate HTTP fetch when `ringKey` changes?
 * - When `prevSiteKey === nextSiteKey` (polygon vertex moved within the same 0.0001° centroid cell),
 *   only polygon-dependent terrain (`"field"`) is refetched; site-bound parts (`soilPart`, `precip`,
 *   `climate`, `ndvi`) depend solely on the centroid.
 * - When moving to a new `siteKey` that matches a bundled pilot snapshot (`hasSnapshotEntry`),
 *   only `"field"` is fetched immediately while `loadSnapshot` resolves the site-bound parts locally.
 * - When moving to a new non-pilot `siteKey`, all 5 parts are fetched once.
 */
export function partsForRingChange(prevSiteKey: string, nextSiteKey: string, hasSnapshotEntry: boolean): PartName[] {
  if (prevSiteKey === nextSiteKey || hasSnapshotEntry) return ["field"];
  return ["field", "soilPart", "precip", "climate", "ndvi"];
}

/**
 * Extract site-bound `Part` states directly from a bundled pilot `Snapshot` so no redundant
 * `/api/field?parts=soil` or `/api/field?parts=precip` calls are made when snapshot data exists.
 */
export function snapshotToParts(
  snap: Snapshot,
  ring: { lat: number; lon: number }[],
): {
  climate?: Part<ClimateSeries>;
  ndvi?: Part<NdviSeries>;
  soilPart?: Part<FieldResponse>;
  precip?: Part<{ precipCheck: FieldResponse["precipCheck"] }>;
  missing: PartName[];
} {
  const missing: PartName[] = [];
  const climate: Part<ClimateSeries> | undefined = snap.climate
    ? { status: "ok", data: snap.climate, from: "snapshot" }
    : (missing.push("climate"), undefined);
  const ndvi: Part<NdviSeries> | undefined = snap.ndvi.points.length
    ? { status: "ok", data: snap.ndvi, from: "snapshot" }
    : (missing.push("ndvi"), undefined);
  const soilPart: Part<FieldResponse> | undefined = snap.soilLayers?.length && snap.soil.origin !== "default"
    ? {
        status: "ok",
        data: {
          geometry: describeRing(ring),
          terrain: snap.terrain ?? null,
          soil: snap.soil,
          soilLayers: snap.soilLayers,
          precipCheck: snap.precipCheck ?? null,
          ...(snap.wrb ? { wrb: snap.wrb } : {}),
          notes: ["Soil layers from the bundled pilot snapshot."],
        },
        from: "snapshot",
      }
    : (missing.push("soilPart"), undefined);
  const precip: Part<{ precipCheck: FieldResponse["precipCheck"] }> | undefined = snap.precipCheck
    ? { status: "ok", data: { precipCheck: snap.precipCheck }, from: "snapshot" }
    : (missing.push("precip"), undefined);
  return { climate, ndvi, soilPart, precip, missing };
}

export function FieldDataProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { lang } = useI18n();
  const f = store.field;
  const [pilots, setPilots] = useState<SnapshotIndexEntry[] | null>(null);
  const [parts, setParts] = useState<{ key: string; field: Part<FieldResponse>; soilPart: Part<FieldResponse>; precip: FieldData["precip"]; climate: Part<ClimateSeries>; ndvi: Part<NdviSeries>; snapshot: FieldData["snapshot"] }>({
    key: "",
    field: { status: "idle" },
    soilPart: { status: "idle" },
    precip: { status: "idle" },
    climate: { status: "idle" },
    ndvi: { status: "idle" },
    snapshot: null,
  });
  const abortRef = useRef<AbortController | null>(null);
  const genRef = useRef(0);

  // shared links: #ornek=<pilot> or #f=<ring> (on load and on hash change)
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash;
      if (!/(^#|&)(ornek|f)=/.test(h)) return;
      const fld = decodeFieldHash(h, lang);
      if (fld) setField(fld);
      history.replaceState(null, "", window.location.pathname);
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [lang]);

  useEffect(() => {
    let alive = true;
    loadSnapshotIndex()
      .then((x) => alive && setPilots(x))
      .catch(() => alive && setPilots([]));
    return () => {
      alive = false;
    };
  }, []);

  const ringKey = f ? f.ring.map((p) => `${p.lat.toFixed(6)},${p.lon.toFixed(6)}`).join(";") : "";
  const centroid = useMemo(() => (f ? describeRing(f.ring).centroid : null), [f]);
  const siteKey = centroid ? `${centroid.lat.toFixed(4)},${centroid.lon.toFixed(4)}` : "";

  const fetchPart = (gen: number, part: PartName, signal: AbortSignal) => {
      const fld = f;
      if (!fld || !centroid) return;
      const site = siteRef.current;
      const set = (p: Part<unknown>) => {
        if (part === "field" ? gen !== genRef.current : site !== siteRef.current) return;
        setParts((s) => ({ ...s, [part]: p }));
      };
      set({ status: "loading", startedAt: Date.now() });
      const q = `lat=${centroid.lat.toFixed(4)}&lon=${centroid.lon.toFixed(4)}`;
      if (part === "field" || part === "soilPart" || part === "precip") {
        const coords = fld.ring.map((p) => [p.lon, p.lat]);
        coords.push(coords[0]);
        void getJson<FieldResponse>(`/api/field?parts=${part === "field" ? "terrain" : part === "soilPart" ? "soil" : "precip"}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "Polygon", coordinates: [coords] }) }, TIMEOUT.field, signal).then(set);
      } else void getJson(`/api/${part}?${q}`, undefined, TIMEOUT[part], signal).then(set);
  };

  // site-level data (climate, NDVI, soilPart, precip, snapshot): refetch only when the centroid moves to another site
  const siteRef = useRef("");
  useEffect(() => {
    if (!f || !centroid) {
      abortRef.current?.abort();
      siteRef.current = "";
      genRef.current++;
      return;
    }
    if (!pilots) return;
    const prevSite = siteRef.current;
    const sameSite = prevSite === siteKey;
    if (!sameSite) {
      siteRef.current = siteKey;
      abortRef.current?.abort();
      abortRef.current = new AbortController();
    }
    const gen = ++genRef.current;
    const signal = abortRef.current!.signal;
    const now = Date.now();
    const id = !sameSite ? matchSnapshotId(pilots, centroid.lat, centroid.lon) : null;
    const entry = id ? pilots.find((p) => p.id === id) ?? null : null;
    if (!sameSite) {
      setParts({ key: ringKey, field: { status: "loading", startedAt: now }, soilPart: { status: "loading", startedAt: now }, precip: { status: "loading", startedAt: now }, climate: { status: "loading", startedAt: now }, ndvi: { status: "loading", startedAt: now }, snapshot: null });
      if (entry) {
        const ringSnap = f.ring;
        loadSnapshot(entry.id)
          .then((snap) => {
            if (siteRef.current !== siteKey) return;
            if (!snap) throw new Error("missing");
            const resolved = snapshotToParts(snap, ringSnap);
            setParts((s) => ({
              ...s,
              snapshot: { entry, snap },
              climate: resolved.climate ?? s.climate,
              ndvi: resolved.ndvi ?? s.ndvi,
              soilPart: resolved.soilPart ?? s.soilPart,
              precip: resolved.precip ?? s.precip,
            }));
            for (const mp of resolved.missing) fetchPart(genRef.current, mp, signal);
          })
          .catch(() => {
            if (siteRef.current !== siteKey) return;
            for (const mp of ["soilPart", "precip", "climate", "ndvi"] as const) fetchPart(genRef.current, mp, signal);
          });
      }
    } else {
      setParts((s) => ({ ...s, key: ringKey }));
    }
    for (const p of partsForRingChange(prevSite, siteKey, !!entry)) {
      fetchPart(gen, p, signal);
    }
    // ringKey drives refetch of the polygon-specific part
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringKey, pilots]);

  const retry = (p: PartName) => {
    if (!abortRef.current) abortRef.current = new AbortController();
    fetchPart(genRef.current, p, abortRef.current.signal);
  };

  // ── derived ───────────────────────────────────────────────────────────
  const fieldOk = parts.field.status === "ok" ? parts.field.data : null;
  const soilOk = parts.soilPart.status === "ok" ? parts.soilPart.data : null;
  const snap = parts.snapshot?.snap ?? null;
  const terrain: FieldData["terrain"] = fieldOk?.terrain ? { data: fieldOk.terrain, basis: "polygon" } : snap?.terrain ? { data: snap.terrain, basis: "pilotPoint" } : null;

  const soilBase: SoilProfile | null = soilOk?.soil ?? (snap?.soil && snap.soil.origin !== "default" ? snap.soil : null);
  const soil: SoilProfile | null = useMemo(() => {
    const o = store.soil;
    if (o) {
      return { sand: o.sand, silt: o.silt, clay: o.clay, soc: o.soc, ph: o.ph, textureClass: usdaTextureClass(o.sand, o.silt, o.clay), origin: "user", sources: [] };
    }
    return soilBase;
  }, [store.soil, soilBase]);

  const climate = parts.climate.status === "ok" ? parts.climate.data : null;
  const powerAnnualMm = useMemo(() => (climate ? annualPrecipStats(climate).meanMm : null), [climate]);
  const precipCheck = (parts.precip.status === "ok" ? parts.precip.data.precipCheck : null) ?? snap?.precipCheck ?? null;
  const soilLayers = soilOk?.soilLayers ?? snap?.soilLayers ?? null;

  const precipAdjustment: PrecipAdjustment = useMemo(() => {
    const c = store.precip;
    if (c.mode === "reference" && precipCheck?.monthlyRatio?.length === 12) {
      return { mode: "monthly", factorsMonthly: precipCheck.monthlyRatio, provenance: `User choice: POWER scaled to ${precipCheck.reference.toUpperCase()} monthly ratios (${precipCheck.years.length} years)` };
    }
    if (c.mode === "station" && powerAnnualMm && powerAnnualMm > 0) {
      return { mode: "annual", factorAnnual: c.mm / powerAnnualMm, provenance: `User station mean ${c.mm} mm/yr ÷ POWER mean ${powerAnnualMm.toFixed(1)} mm/yr` };
    }
    return { mode: "none", provenance: "User choice: no rainfall adjustment" };
  }, [store.precip, precipCheck, powerAnnualMm]);

  const inp = store.inputs;
  const sc = store.scenario;
  const areaDa = inp.areaOverrideDa ?? f?.areaDa ?? null;
  const econ = useMemo(() => econToInput(store.econ), [store.econ]);
  const terrainData = terrain?.basis === "polygon" ? terrain.data : (snap?.terrain ?? undefined);
  const classicSeq = useMemo(
    () => (centroid ? getClassicRegionalSequence(centroid.lat, centroid.lon) : null),
    [centroid],
  );
  const request = useMemo<AnalysisRequest | null>(() => {
    if (!f || !soil || !areaDa || areaDa <= 0) return null;
    const extraPlans = [...store.extraPlans];
    if (classicSeq) {
      const classicId = classicSeq.join(">");
      if (!extraPlans.some((p) => p.join(">") === classicId)) extraPlans.push(classicSeq);
    }
    return {
      field: {
        areaDa,
        slopePct: terrainData?.slopePct ?? null,
        soil,
        irrigationBudgetMm: inp.rainfed ? 0 : inp.budget,
        budgetBasis: "net",
        irrigationEfficiency: METHOD_EFF[inp.method],
        currentRotation: inp.rotation,
        excludedCrops: inp.excluded,
        priorities: inp.priorities,
        ...(soilLayers && !store.soil ? { soilLayers } : {}),
        ...(terrainData ? { terrain: terrainData } : {}),
      },
      scenario: { rainMultiplier: sc.rainMultiplier, tempDeltaC: sc.tempDeltaC, priceMultiplier: sc.priceMultiplier },
      economics: econ,
      options: extraPlans.length ? { extraPlans } : undefined,
      ...(precipCheck ? { precipCheck: precipCheck as AnalysisInput["precipCheck"] } : {}),
      precipAdjustment,
    };
  }, [f, soil, areaDa, terrainData, inp, sc, econ, store.extraPlans, classicSeq, soilLayers, store.soil, precipCheck, precipAdjustment]);

  const analysis = useAnalysis(climate, siteKey, request);
  const engineInput = useMemo(() => (climate && request ? { ...request, climate } : null), [climate, request]);

  useEffect(() => {
    if (analysis.result && f) saveLastRun(analysis.result, null, f.name);
  }, [analysis.result, f]);

  const value: FieldData = {
    field: f ? parts.field : IDLE,
    soilPart: f ? parts.soilPart : IDLE,
    precip: f ? parts.precip : IDLE,
    climate: f ? parts.climate : IDLE,
    ndvi: f ? parts.ndvi : IDLE,
    snapshot: f ? parts.snapshot : null,
    pilots,
    terrain,
    soil,
    climateForEngine: climate,
    request,
    engineInput,
    analysis,
    powerAnnualMm,
    retry,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFieldData(): FieldData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useFieldData must be used inside FieldDataProvider");
  return v;
}
