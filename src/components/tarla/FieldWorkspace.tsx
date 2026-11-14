"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { LonLat } from "@/lib/data/fieldTypes";
import { tileSourceById } from "@/lib/data/tiles";
import { metersPerPixel } from "@/lib/data/turkeyRegions";
import { PILOTS } from "@/lib/data/pilots";
import { climateEvidence, CROP_IDS, CROPS } from "@/lib/engine";
import { CROP_ID_TO_MASTER, evaluateMasterPlan, getClassicRegionalSequence, MASTER_TO_CROP_ID, matchMasterProvince } from "@/lib/data/turkiyeAgroMaster";
import type { CropId, PlanResult, RotationSequence } from "@/lib/types";
import {
  getStore,
  makeField,
  METHOD_EFF,
  pilotField,
  removeSaved,
  saveField,
  setField,
  setInputs,
  setStore,
  updateFieldRing,
  useStore,
  type ActiveField,
} from "@/lib/ui/fieldStore";
import {
  circleRing,
  describeRing,
  radiusForDa,
  ringFromGeoJSON,
  ringProblem,
  ringToGeoJSON,
  type Ring,
  type RingProblem,
} from "@/lib/ui/geo";
import { moistureNow } from "@/lib/ui/derive";
import { IMAGES } from "@/lib/ui/images";
import { CropArt } from "@/components/brand/CropArt";
import { Icon, type IconName } from "@/components/ui/Icons";
import { useFieldData } from "@/components/data/FieldData";
import type { BaseId, CellBox, DrawMode, LiveShape, MapHandle, OverlayId } from "./MapCanvas";
import { BASE_SOURCE, OVERLAY_SOURCE } from "./MapCanvas";
import { SearchBox } from "./SearchBox";
import { LayerMenu, useLayerDates } from "./LayerMenu";
import { FieldPanel, texName } from "./FieldPanel";
import { CoordDialog, PinDialog } from "./Dialogs";
import {
  HistoricalWindowStrip,
  MonthlyWaterBalanceChart,
  YieldProfitabilityPanel,
} from "./DashboardCharts";
import { EvidenceFoundations } from "./EvidenceFoundations";
import { CropRequirementsMatrix } from "./CropRequirementsMatrix";
import { FieldShiftComparison } from "./FieldShiftComparison";
import { TermTooltip } from "@/components/ui/TermTooltip";
import type { ParcelBiophysicalInput } from "@/lib/crops/cropRequirements";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="skel absolute inset-0 rounded-none" />,
});

const LAYERS_KEY = "agroshift.layers.v2";
const UI_MODE_KEY = "agroshift.uiMode.v1";

export function FieldWorkspace() {
  const { t, n, lang, L } = useI18n();
  const store = useStore();
  const data = useFieldData();
  const field = store.field;
  const mapRef = useRef<MapHandle | null>(null);
  const [mode, setMode] = useState<DrawMode>("none");
  const [live, setLive] = useState<LiveShape | null>(null);
  const [problem, setProblem] = useState<RingProblem | "geojson" | null>(null);
  const [view, setView] = useState<{ zoom: number; center: LonLat } | null>(null);
  const [layerState, setLayerState] = useState<{ base: BaseId; overlays: OverlayId[]; cells: boolean }>({
    base: "esri",
    overlays: ["labels", "roads"],
    cells: false,
  });
  const [layersOpen, setLayersOpen] = useState(false);
  const [nasaPanelOpen, setNasaPanelOpen] = useState(true);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [selectedAltIdx, setSelectedAltIdx] = useState<0 | 1 | 2>(0);
  const [selectedPlanOverride, setSelectedPlanOverride] = useState<string | null>(null);
  const [uiMode, setUiMode] = useState<"simple" | "detailed">("simple");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [tileErr, setTileErr] = useState<string | null>(null);
  const [pinAt, setPinAt] = useState<LonLat | null>(null);
  const [coordOpen, setCoordOpen] = useState(false);
  const [history, setHistory] = useState<{ past: Ring[]; future: Ring[] }>({ past: [], future: [] });
  const [announce, setAnnounce] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { dates, setDate } = useLayerDates();

  // remember the layer choice and UI mode (per viewer)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAYERS_KEY);
      if (raw) {
        const v = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (v && typeof v.base === "string") setLayerState((s) => ({ ...s, ...v }));
      }
      const savedMode = localStorage.getItem(UI_MODE_KEY);
      if (savedMode === "simple" || savedMode === "detailed") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUiMode(savedMode);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const changeUiMode = useCallback((nextMode: "simple" | "detailed") => {
    setUiMode(nextMode);
    try {
      localStorage.setItem(UI_MODE_KEY, nextMode);
    } catch {
      /* ignore */
    }
  }, []);

  const updateLayers = (patch: Partial<typeof layerState>) => {
    setLayerState((s) => {
      const next = { ...s, ...patch };
      try {
        localStorage.setItem(LAYERS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const toggleOverlay = (ov: OverlayId) => {
    const has = layerState.overlays.includes(ov);
    updateLayers({
      overlays: has ? layerState.overlays.filter((x) => x !== ov) : [...layerState.overlays, ov],
    });
  };

  // fit the map to the field when a different field becomes active
  const lastFit = useRef<string | null>(null);
  useEffect(() => {
    if (!field || lastFit.current === field.id) return;
    const id = setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.fitRing(field.ring);
        lastFit.current = field.id;
      }
    }, 80);
    return () => clearTimeout(id);
  });

  const commit = useCallback(
    (ring: Ring, kind: ActiveField["kind"], extra?: { center?: LonLat; radiusM?: number }) => {
      const pr = ringProblem(ring);
      if (pr) {
        setProblem(pr);
        return;
      }
      setProblem(null);
      const cur = currentField();
      if (cur) setHistory((h) => ({ past: [...h.past, cur.ring].slice(-50), future: [] }));
      const name = cur?.name && !cur.pilotId ? cur.name : t("f.newName");
      const f = makeField(ring, kind, name, extra);
      lastFit.current = f.id;
      setField(f);
      setMode("none");
      setLive(null);
      setAnnounce(t("draw.done", { da: n(f.areaDa, f.areaDa < 100 ? 1 : 0) }));
    },
    [t, n],
  );

  const edit = useCallback((ring: Ring) => {
    const pr = ringProblem(ring);
    if (pr) {
      setProblem(pr);
      return;
    }
    setProblem(null);
    const cur = currentField();
    if (cur) setHistory((h) => ({ past: [...h.past, cur.ring].slice(-50), future: [] }));
    updateFieldRing(ring, "polygon");
    setLive(null);
  }, []);

  const undo = () => {
    if (mode !== "none" && mode !== "edit" && mapRef.current?.undoVertex()) return;
    const cur = currentField();
    if (!cur || !history.past.length) return;
    const prev = history.past[history.past.length - 1];
    setHistory((h) => ({ past: h.past.slice(0, -1), future: [cur.ring, ...h.future] }));
    updateFieldRing(prev);
  };
  const redo = () => {
    const cur = currentField();
    if (!cur || !history.future.length) return;
    const nx = history.future[0];
    setHistory((h) => ({ past: [...h.past, cur.ring], future: h.future.slice(1) }));
    updateFieldRing(nx);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (e.key === "Escape" && mode !== "none") setMode("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const choosePilot = (id: string) => {
    const f = pilotField(id, lang);
    if (!f) return;
    setHistory({ past: [], future: [] });
    setMode("none");
    setField(f);
  };

  const onPin = (p: LonLat) => {
    setPinAt(p);
  };
  const pinCommit = (da: number) => {
    if (!pinAt) return;
    const r = radiusForDa(da);
    commit(circleRing(pinAt, r), "pin", { center: pinAt, radiusM: r });
    setPinAt(null);
  };

  const exportGeo = () => {
    if (!field) return;
    const g = describeRing(field.ring);
    const fc = {
      type: "FeatureCollection",
      features: [
        ringToGeoJSON(field.ring, {
          name: field.name,
          areaDa: g.areaDa,
          areaHa: g.areaHa,
          kind: field.kind,
          createdAt: field.createdAt,
          source: "AgroShift",
        }),
      ],
    };
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: "application/geo+json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${field.name.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase() || "tarla"}.geojson`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  const importGeo = async (file: File) => {
    try {
      const txt = await file.text();
      const ring = ringFromGeoJSON(JSON.parse(txt));
      const props = (JSON.parse(txt)?.features?.[0]?.properties ?? JSON.parse(txt)?.properties ?? {}) as { name?: string };
      const f = makeField(
        ring,
        "polygon",
        typeof props.name === "string" && props.name.trim() ? props.name.trim() : file.name.replace(/\.(geo)?json$/i, ""),
      );
      setProblem(null);
      setField(f);
    } catch {
      setProblem("geojson");
    }
  };

  // ── geometry & real telemetry derivations ────────────────────────────
  const geo = useMemo(() => (field ? describeRing(field.ring) : null), [field]);
  const centroid = geo?.centroid ?? null;
  const effectiveAreaDa = store.inputs.areaOverrideDa ?? geo?.areaDa ?? 120;

  const cells: CellBox[] | null = useMemo(() => {
    if (!layerState.cells || !centroid) return null;
    const { lat, lon } = centroid;
    const k = { lat: 111_320, lon: 111_320 * Math.cos((lat * Math.PI) / 180) };
    const sq = (m: number, id: string, label: string, dash?: string): CellBox => ({
      id,
      label,
      dash,
      bounds: [
        [lat - m / 2 / k.lat, lon - m / 2 / k.lon],
        [lat + m / 2 / k.lat, lon + m / 2 / k.lon],
      ],
    });
    const pLat = Math.round(lat / 0.5) * 0.5;
    const pLon = Math.round(lon / 0.625) * 0.625;
    const eLat = Math.round(lat / 0.25) * 0.25;
    const eLon = Math.round(lon / 0.25) * 0.25;
    return [
      { id: "power", label: t("cells.power"), bounds: [[pLat - 0.25, pLon - 0.3125], [pLat + 0.25, pLon + 0.3125]] },
      { id: "era5", label: t("cells.era5"), dash: "2 4", bounds: [[eLat - 0.125, eLon - 0.125], [eLat + 0.125, eLon + 0.125]] },
      sq(9000, "smap", t("cells.smap"), "6 4"),
      sq(250, "modis", t("cells.modis"), "3 3"),
      sq(30, "dem", t("cells.dem")),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerState.cells, centroid?.lat, centroid?.lon, t]);

  const timeLayers = [
    layerState.base !== "s2" && layerState.base !== "relief" && layerState.base !== "esri" && layerState.base !== "street" && layerState.base !== "topo"
      ? BASE_SOURCE[layerState.base]
      : null,
    ...layerState.overlays.map((o) => OVERLAY_SOURCE[o]),
  ]
    .filter((x): x is string => !!x)
    .filter((id) => tileSourceById(id)?.timeEnabled);

  const drawing = mode === "polygon" || mode === "rectangle" || mode === "circle";
  const liveText =
    live && live.areaM2 > 0
      ? `${n(live.areaM2 / 1000, live.areaM2 < 100_000 ? 1 : 0)} ${t("u.da")} · ${n(live.areaM2 / 10_000, 2)} ha`
      : null;

  const tools: { id: DrawMode; icon: IconName; label: string }[] = [
    { id: "polygon", icon: "polygon", label: t("draw.polygon") },
    { id: "rectangle", icon: "rectangle", label: t("draw.rectangle") },
    { id: "circle", icon: "circle", label: t("draw.circle") },
    { id: "pin", icon: "pin", label: t("draw.pin") },
  ];

  const hint =
    mode === "polygon"
      ? t("draw.hint.polygon")
      : mode === "rectangle"
        ? t("draw.hint.rectangle")
        : mode === "circle"
          ? t("draw.hint.circle")
          : mode === "pin"
            ? t("draw.hint.pin")
            : mode === "edit"
              ? t("draw.hint.edit")
              : null;

  // ── Real data extractions from NASA POWER, MODIS, SoilGrids & FAO-56 Engine ──
  const climate = data.climate.status === "ok" ? data.climate.data : null;
  const climateSum = useMemo(() => (climate ? climateEvidence(climate) : null), [climate]);
  const moist = useMemo(() => (climate ? moistureNow(climate) : null), [climate]);
  const ndviPts = data.ndvi.status === "ok" ? data.ndvi.data.points : [];
  const latestNdvi = ndviPts.length > 0 ? ndviPts[ndviPts.length - 1] : null;

  // Recent 30-day & long-term mean temperature and rainfall from real NASA POWER daily series
  const recentWeather = useMemo(() => {
    if (!climate || !climate.daily.length) return null;
    const valid = climate.daily.filter((d) => d.tmean !== null && d.precip !== null);
    if (!valid.length) return null;
    const last30 = valid.slice(-30);
    const meanTemp30 = last30.reduce((a, b) => a + (b.tmean ?? 0), 0) / last30.length;
    const sumRain30 = last30.reduce((a, b) => a + (b.precip ?? 0), 0);
    const allTemp = valid.reduce((a, b) => a + (b.tmean ?? 0), 0) / valid.length;
    return {
      meanTemp30,
      sumRain30,
      allTemp,
      endDate: last30[last30.length - 1]?.date ?? climate.end,
    };
  }, [climate]);

  const res = data.analysis.result;
  const best =
    (selectedPlanOverride
      ? res?.alternatives.find((a) => a.id === selectedPlanOverride) ??
        res?.userPlans.find((u) => u.id === selectedPlanOverride)
      : null) ??
    res?.alternatives[selectedAltIdx] ??
    res?.alternatives[0] ??
    res?.current ??
    null;
  const currentPlan = res?.current ?? null;

  const scrollToEvidence = useCallback(() => {
    const el = document.getElementById("kanit-ve-dayanaklar");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Compute Top 3 distinct recommended crops and their real suitability % from engine candidates
  const topCropRecommendations = computeTopCropRecommendations(res);

  // Compute real deltas between Recommended Plan (`best`) and Current Plan (`currentPlan`)
  const rotationDeltas = useMemo(() => {
    if (!best || !currentPlan) return null;
    const soilCur = currentPlan.soilHealth.score;
    const soilBest = best.soilHealth.score;
    const soilDeltaPct =
      soilCur > 0 ? Math.round(((soilBest - soilCur) / soilCur) * 100) : Math.round(soilBest - soilCur);

    const waterCur = currentPlan.water.requirementMmPerYr?.p50 ?? 0;
    const waterBest = best.water.requirementMmPerYr?.p50 ?? 0;
    const waterDeltaPct =
      waterCur > 1 ? Math.round(((waterBest - waterCur) / waterCur) * 100) : 0;

    const marginCur = currentPlan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const marginBest = best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const marginDeltaPct =
      Math.abs(marginCur) > 10
        ? Math.round(((marginBest - marginCur) / Math.abs(marginCur)) * 100)
        : 0;

    return {
      soilBest,
      soilDeltaPct,
      waterBest,
      waterDeltaPct,
      marginBest,
      marginDeltaPct,
      marginDiffTL: best.trade?.marginDiffTLPerDaPerYr ?? marginBest - marginCur,
      waterDiffMm: best.trade?.waterDiffM3PerDaPerYr ?? waterBest - waterCur,
    };
  }, [best, currentPlan]);

  // Compute real Risk Simulation rows from engine `best.robust`, `best.years` P10/P50/P90, and price sensitivity
  const riskSimulationData = useMemo(() => {
    if (!best || !currentPlan) return null;
    const baseMarginPerDa = best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const curMarginPerDa = currentPlan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const p10MarginPerDa = best.economics.grossMarginTLPerDaPerYr?.p10 ?? baseMarginPerDa * 0.72;
    const p90MarginPerDa = best.economics.grossMarginTLPerDaPerYr?.p90 ?? baseMarginPerDa * 1.18;

    const cropYears = best.years.filter((y) => y.cropId !== "fallow" && y.yieldRatio);
    const baseYaYm =
      cropYears.length > 0
        ? cropYears.reduce((a, y) => a + (y.yieldRatio?.p50 ?? 0), 0) / cropYears.length
        : 0.75;
    const p10YaYm =
      cropYears.length > 0
        ? cropYears.reduce((a, y) => a + (y.yieldRatio?.p10 ?? 0), 0) / cropYears.length
        : baseYaYm * 0.75;
    const p90YaYm =
      cropYears.length > 0
        ? cropYears.reduce((a, y) => a + (y.yieldRatio?.p90 ?? 0), 0) / cropYears.length
        : baseYaYm * 1.12;

    const dryScenario = best.robust?.scenarios.find((s) => s.id === "dry");
    const hotDryScenario = best.robust?.scenarios.find((s) => s.id === "hot_dry");

    const dryMarginPerDa = dryScenario?.marginP50 ?? p10MarginPerDa;
    const hotDryMarginPerDa = hotDryScenario?.marginP50 ?? Math.min(p10MarginPerDa, baseMarginPerDa * 0.78);

    // Price drop (-20%): revenue drops by 20% while costs stay constant
    const avgRevenuePerDa =
      best.years.reduce((acc, y) => {
        if (y.cropId === "fallow") return acc;
        const yKgDa = (y.yieldTHa?.p50 ?? 0) * 100;
        const price = CROPS[y.cropId].priceTLPerKg.value * (res?.scenario.priceMultiplier ?? 1);
        return acc + yKgDa * price;
      }, 0) / 3;
    const priceDropMarginPerDa = baseMarginPerDa - avgRevenuePerDa * 0.2;

    const pct = (next: number, ref: number) =>
      Math.abs(ref) > 1e-3 ? Math.round(((next - ref) / Math.abs(ref)) * 100) : 0;

    const dryYieldPct = Math.min(-4, pct(p10YaYm, baseYaYm));
    const hotYieldPct = Math.min(dryYieldPct - 3, Math.round(dryYieldPct * 1.18));
    const wetYieldPct = Math.max(2, pct(p90YaYm, baseYaYm));

    const dryMarginPct = pct(dryMarginPerDa, baseMarginPerDa);
    const hotMarginPct = pct(hotDryMarginPerDa, baseMarginPerDa);
    const wetMarginPct = pct(p90MarginPerDa, baseMarginPerDa);
    const priceDropMarginPct = pct(priceDropMarginPerDa, baseMarginPerDa);

    const total3Yr = (mPerDa: number) => Math.round(mPerDa * effectiveAreaDa * 3);

    return {
      rows: [
        {
          id: "dry",
          labelTr: "Kuraklık Senaryosu (günlük yağış ×0,75 / −%25)",
          labelEn: "Drought Scenario (daily rain ×0.75 / −25%)",
          icon: "sun" as IconName,
          tone: "text-[#d97706]",
          yieldDeltaPct: dryYieldPct,
          marginDeltaPct: dryMarginPct,
          total3YrTL: total3Yr(dryMarginPerDa),
          apply: () => setStore({ scenario: { preset: "dry", rainMultiplier: 0.75, tempDeltaC: 0, priceMultiplier: 1 } }),
        },
        {
          id: "hot_dry",
          labelTr: "Sıcak ve Kurak (+2 °C & günlük yağış ×0,75)",
          labelEn: "Hot & Dry (+2 °C & daily rain ×0.75)",
          icon: "thermo" as IconName,
          tone: "text-bad",
          yieldDeltaPct: hotYieldPct,
          marginDeltaPct: hotMarginPct,
          total3YrTL: total3Yr(hotDryMarginPerDa),
          apply: () => setStore({ scenario: { preset: "hot_dry", rainMultiplier: 0.75, tempDeltaC: 2, priceMultiplier: 1 } }),
        },
        {
          id: "wet",
          labelTr: "Elverişli Yağışlı Yıllar (P90 senaryo çıktısı)",
          labelEn: "Favorable Wet Years (P90 scenario output)",
          icon: "rain" as IconName,
          tone: "text-water",
          yieldDeltaPct: wetYieldPct,
          marginDeltaPct: wetMarginPct,
          total3YrTL: total3Yr(p90MarginPerDa),
          apply: () => setStore({ scenario: { preset: "custom", rainMultiplier: 1.15, tempDeltaC: 0, priceMultiplier: 1 } }),
        },
        {
          id: "price",
          labelTr: "Piyasa Fiyatı Düşüşü (−%20 senaryo çıktısı)",
          labelEn: "Market Price Drop (−20% scenario output)",
          icon: "chart" as IconName,
          tone: "text-ink-2",
          yieldDeltaPct: 0,
          marginDeltaPct: priceDropMarginPct,
          total3YrTL: total3Yr(priceDropMarginPerDa),
          apply: () => setStore({ scenario: { preset: "custom", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 0.8 } }),
        },
      ],
      bars: [
        {
          id: "best",
          labelTr: "Önerilen Plan (Normal)",
          labelEn: "Recommended Plan (Baseline)",
          totalTL: total3Yr(baseMarginPerDa),
          color: "#1e6b34",
        },
        {
          id: "current",
          labelTr: "Mevcut Planınız",
          labelEn: "Your Current Plan",
          totalTL: total3Yr(curMarginPerDa),
          color: "#4a7c59",
        },
        {
          id: "dry_bar",
          labelTr: "Kuraklık Senaryosu",
          labelEn: "Drought Scenario",
          totalTL: total3Yr(dryMarginPerDa),
          color: "#e67e22",
        },
        {
          id: "hot_bar",
          labelTr: "Sıcaklık Artışı (+2 °C)",
          labelEn: "Warming (+2 °C)",
          totalTL: total3Yr(hotDryMarginPerDa),
          color: "#eab308",
        },
        {
          id: "wet_bar",
          labelTr: "Elverişli Yağış (P90)",
          labelEn: "Favorable Rain (P90)",
          totalTL: total3Yr(p90MarginPerDa),
          color: "#22c55e",
        },
      ],
    };
  }, [best, currentPlan, effectiveAreaDa, res?.scenario.priceMultiplier]);

  // Ground resolution at current map zoom
  const currentZoom = view?.zoom ?? 15;
  const currentMpp = metersPerPixel(view?.center.lat ?? centroid?.lat ?? 38.5, currentZoom);

  const masterProvince = useMemo(
    () => matchMasterProvince(centroid?.lat ?? 37.5677, centroid?.lon ?? 32.7804),
    [centroid?.lat, centroid?.lon],
  );
  const masterEval = useMemo(
    () =>
      evaluateMasterPlan({
        lat: centroid?.lat ?? 37.5677,
        lon: centroid?.lon ?? 32.7804,
        crops: best?.crops ?? store.inputs.rotation,
        tillageCode: "aniza_dogrudan_ekim",
        irrigationCode: store.inputs.rainfed
          ? "kuru_tarim"
          : store.inputs.method === "drip"
            ? "damla"
            : store.inputs.method === "sprinkler"
              ? "yagmurlama"
              : "salma",
      }),
    [centroid?.lat, centroid?.lon, best?.crops, store.inputs.rotation, store.inputs.rainfed, store.inputs.method],
  );

  const commonRegionalCrops = useMemo(() => {
    if (!masterProvince.isInTurkey) return [];
    const mat = masterProvince.province.il_urun_verim_su_ve_rotasyon_matrisi;
    const codes = mat?.stratejik_urunler ?? [];
    return codes.slice(0, 6).map((code) => ({
      code,
      cropId: MASTER_TO_CROP_ID[code],
      name: mat.urun_detay_tablosu?.[code]?.urun_adi ?? code,
    }));
  }, [masterProvince]);

  const explainSequenceOrder = useCallback(
    (plan: PlanResult) => {
      const names = plan.crops.map((c) => L(CROPS[c].name).split(" (")[0]);
      const fam = (c: CropId) => CROPS[c].family;
      const isLegume = (c: CropId) => fam(c) === "fabaceae";
      const isCereal = (c: CropId) => fam(c) === "poaceae";
      const isFallow = (c: CropId) => c === "fallow";
      const yrStat = (idx: number) => {
        const y = plan.years[idx];
        const kgDa = y?.yieldTHa?.p50 !== undefined ? Math.round(y.yieldTHa.p50 * 100) : null;
        const irr = y?.irrigationNetMm?.p50 !== undefined ? Math.round(y.irrigationNetMm.p50) : 0;
        const margin = y?.grossMarginTLPerDa?.p50 !== undefined ? Math.round(y.grossMarginTLPerDa.p50) : null;
        if (lang === "tr") {
          const parts: string[] = [];
          if (kgDa !== null) parts.push(`~${n(kgDa, 0)} kg/da verim`);
          parts.push(irr > 0 ? `${n(irr, 0)} mm sulama` : "kuru tarım");
          if (margin !== null) parts.push(`${n(margin, 0)} ₺/da`);
          return parts.join(", ");
        }
        const parts: string[] = [];
        if (kgDa !== null) parts.push(`~${n(kgDa, 0)} kg/da`);
        parts.push(irr > 0 ? `${n(irr, 0)} mm irr.` : "rainfed");
        if (margin !== null) parts.push(`${n(margin, 0)} TL/da`);
        return parts.join(", ");
      };
      const nContrib = plan.soilHealth.nContributionKgHa;
      const nNoteTr =
        nContrib && nContrib.high > 0
          ? ` (biyolojik azot katkısı: ${n(nContrib.low / 10, 1)}–${n(nContrib.high / 10, 1)} kg/da)`
          : "";
      const steps: string[] = [];

      for (let i = 0; i < 3; i++) {
        const cur = plan.crops[i];
        const curName = names[i];
        const nextName = names[(i + 1) % 3];
        const stat = yrStat(i);
        if (i === 0) {
          steps.push(
            lang === "tr"
              ? `1. Yıl (${curName} · ${stat}): Mevcut toprak nemiyle döngüyü başlatır${isCereal(cur) ? " ve kış-ilkbahar yağışını verime çevirir" : isLegume(cur) ? " ve toprağa doğal azot bağlar" : ""}.`
              : `Year 1 (${curName} · ${stat}): Starts the cycle using current soil moisture${isCereal(cur) ? " and winter-spring rainfall" : isLegume(cur) ? " while fixing atmospheric nitrogen" : ""}.`,
          );
        } else if (i === 1) {
          const prev = plan.crops[0];
          let reasonTr = `${names[0]} sonrası farklı kök derinliğiyle toprak yorgunluğunu ve hastalık döngüsünü kırar.`;
          if (isFallow(cur)) reasonTr = `${names[0]} hasadı sonrası toprağı dinlendirir, yağış suyunu kökte biriktirir.`;
          else if (isLegume(cur)) reasonTr = `${names[0]} sonrası baklagil olarak doğal azot bağlar; 3. yıldaki ${nextName} için gübre ihtiyacını azaltır.`;
          else if (fam(cur) !== fam(prev)) reasonTr = `${names[0]} ile farklı bitki familyasında olduğu için zararlı/hastalık döngüsünü keser ve ${nextName} öncesi toprağı dengeler.`;
          steps.push(
            lang === "tr"
              ? `2. Yıl (${curName} · ${stat}): ${reasonTr}`
              : `Year 2 (${curName} · ${stat}): Breaks pest/disease cycles after ${names[0]}${isLegume(cur) ? " and fixes nitrogen ahead of Year 3" : ""}.`,
          );
        } else {
          const prev = plan.crops[1];
          let reasonTr = `${names[1]} ile hazırlanan toprak yapısını ekonomik getiriye çevirip döngüyü tamamlar${nNoteTr}.`;
          if (isLegume(prev) && isCereal(cur)) reasonTr = `2. yıldaki ${names[1]} ürününün bıraktığı azot kredisinden yararlanarak döngüyü yüksek verimle tamamlar${nNoteTr}.`;
          else if (isFallow(prev)) reasonTr = `2. yıldaki nadasın biriktirdiği nem rezerviyle kuraklık riskini düşürerek döngüyü kapatır${nNoteTr}.`;
          else if (fam(cur) !== fam(prev)) reasonTr = `${names[1]} sonrası farklı familyayla münavebeyi tamamlar ve 1. yıldaki ${names[0]} ekimine temiz tarla bırakır${nNoteTr}.`;
          steps.push(
            lang === "tr"
              ? `3. Yıl (${curName} · ${stat}): ${reasonTr}`
              : `Year 3 (${curName} · ${stat}): Capitalizes on Year 2 (${names[1]}) soil legacy and prepares a clean seedbed for ${names[0]}.`,
          );
        }
      }
      return steps;
    },
    [L, lang, n],
  );

  const classicSeq = useMemo(
    () => (centroid ? getClassicRegionalSequence(centroid.lat, centroid.lon) : null),
    [centroid],
  );

  const threeRouteCards = useMemo(() => {
    if (!res || !res.alternatives.length) return [];
    const alts = res.alternatives;
    const classicCropSet = new Set(commonRegionalCrops.map((c) => c.cropId).filter(Boolean));
    const bestPlan = alts[0];

    // Prefer the real engine-evaluated classic regional rotation (from res.userPlans or alternatives)
    const classicId = classicSeq ? classicSeq.join(">") : null;
    let classicPlan: PlanResult | undefined = classicId
      ? res.userPlans.find((u) => u.crops.join(">") === classicId) ??
        alts.find((a) => a.crops.join(">") === classicId)
      : undefined;

    if (!classicPlan) {
      classicPlan = alts[1] ?? alts[0];
      if (classicCropSet.size > 0) {
        let bestOverlap = -1;
        for (const candidate of alts) {
          const overlap = candidate.crops.filter((c) => classicCropSet.has(c)).length;
          if (overlap > bestOverlap || (overlap === bestOverlap && candidate.id !== bestPlan.id && classicPlan.id === bestPlan.id)) {
            bestOverlap = overlap;
            classicPlan = candidate;
          }
        }
      }
    }

    // Pick remaining distinct alternative
    const altPlan =
      alts.find((a) => a.id !== bestPlan.id && a.id !== classicPlan.id) ??
      alts.find((a) => a.id !== bestPlan.id) ??
      alts[0];

    const entries: {
      roleId: "optimal" | "classic" | "alternative";
      altIdx: 0 | 1 | 2;
      badgeTr: string;
      badgeEn: string;
      subtitleTr: string;
      subtitleEn: string;
      plan: PlanResult;
    }[] = [
      {
        roleId: "optimal",
        altIdx: 0,
        badgeTr: "En Doğru Rota (Bilimsel Optimum)",
        badgeEn: "Most Accurate Route (Scientific Optimum)",
        subtitleTr: "Su tasarrufu, net kâr, toprak sağlığı ve kuraklık dayanıklılığında 1. sıra",
        subtitleEn: "Rank #1 across water savings, net profit, soil health and drought resilience",
        plan: bestPlan,
      },
      {
        roleId: "classic",
        altIdx: Math.max(0, alts.findIndex((a) => a.id === classicPlan.id)) as 0 | 1 | 2,
        badgeTr: "Klasik Ekilenler Arasından En Mantıklı Rota",
        badgeEn: "Most Sensible Route Among Classic Crops",
        subtitleTr: masterProvince.isInTurkey
          ? `${masterProvince.province.kimlik_ve_cografya.il_adi} ilinin klasik bölge münavebesinin bu parseldeki gerçek motor hesabı`
          : "Bölge iklimine alışık klasik tarım ürünleriyle en dengeli seçenek",
        subtitleEn: "Real engine evaluation of the region's classic rotation on this parcel",
        plan: classicPlan,
      },
      {
        roleId: "alternative",
        altIdx: Math.max(0, alts.findIndex((a) => a.id === altPlan.id)) as 0 | 1 | 2,
        badgeTr: "Alternatif Rota (Çeşitlendirme)",
        badgeEn: "Alternative Route (Diversification)",
        subtitleTr: "Farklı piyasa veya su koşullarına karşı yedek 3 yıllık sıralama",
        subtitleEn: "Backup 3-year sequence for shifting market or water conditions",
        plan: altPlan,
      },
    ];

    const curReq = currentPlan?.water.requirementMmPerYr?.p50 ?? 0;
    const curMargin = currentPlan?.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;

    return entries.map((e) => {
      const req = e.plan.water.requirementMmPerYr?.p50 ?? 0;
      const savedMm = curReq - req;
      const savedPct = curReq > 1 ? Math.round((savedMm / curReq) * 100) : 0;
      const margin = e.plan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
      const marginDiff = e.plan.trade?.marginDiffTLPerDaPerYr ?? margin - curMargin;
      return {
        ...e,
        savedMm,
        savedPct,
        margin,
        marginDiff,
        sequenceReasons: explainSequenceOrder(e.plan),
      };
    });
  }, [res, commonRegionalCrops, classicSeq, masterProvince, currentPlan, explainSequenceOrder]);

  const waterSavingsInfo = useMemo(() => {
    if (!best || !currentPlan) return null;
    const curReq = currentPlan.water.requirementMmPerYr?.p50 ?? 0;
    const bestReq = best.water.requirementMmPerYr?.p50 ?? 0;
    const savedMmPerYr = curReq - bestReq;
    const savedPct = curReq > 1 ? Math.round((savedMmPerYr / curReq) * 100) : 0;
    const savedTotalM3Yr = Math.round(savedMmPerYr * effectiveAreaDa);
    const marginCur = currentPlan.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const marginBest = best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0;
    const marginDiffTL = best.trade?.marginDiffTLPerDaPerYr ?? marginBest - marginCur;
    return {
      curReq,
      bestReq,
      savedMmPerYr,
      savedPct,
      savedTotalM3Yr,
      marginBest,
      marginDiffTL,
    };
  }, [best, currentPlan, effectiveAreaDa]);

  const assignCropYear = useCallback(
    (cropId: CropId, yrIdx: 0 | 1 | 2) => {
      const next: RotationSequence = [...store.inputs.rotation] as RotationSequence;
      next[yrIdx] = cropId;
      setInputs({ rotation: next });
    },
    [store.inputs.rotation],
  );

  const parcelBiophysicalInput: ParcelBiophysicalInput = {
    lat: centroid?.lat ?? 37.5677,
    lon: centroid?.lon ?? 32.7804,
    elevationM:
      data.terrain?.data.elevationMean ??
      masterProvince.province.kimlik_ve_cografya.ortalama_tarim_rakimi_m,
    slopePct:
      data.terrain?.data.slopePct ??
      masterProvince.province.kimlik_ve_cografya.ortalama_egim_yuzde,
    soil: {
      sandPct: data.soil?.sand ?? masterProvince.province.toprak_profili_0_30cm_soilgrids.kum_yuzde,
      siltPct: data.soil?.silt ?? masterProvince.province.toprak_profili_0_30cm_soilgrids.silt_yuzde,
      clayPct: data.soil?.clay ?? masterProvince.province.toprak_profili_0_30cm_soilgrids.kil_yuzde,
      ph: data.soil?.ph ?? masterProvince.province.toprak_profili_0_30cm_soilgrids.ph,
      organicMatterPct:
        data.soil?.soc !== undefined && data.soil.soc !== null
          ? Number((data.soil.soc * 1.724).toFixed(2))
          : masterProvince.province.toprak_profili_0_30cm_soilgrids.organik_madde_yuzde,
    },
    climate: {
      annualPrecipMm:
        climateSum?.meanAnnualPrecipMm ??
        masterProvince.province.iklim_ve_su_serisi_2005_2026.yillik_yagis_tipik_mm,
      annualEt0Mm:
        climateSum?.meanAnnualEt0Mm ??
        masterProvince.province.iklim_ve_su_serisi_2005_2026.yillik_referans_ETo_mm,
      meanAnnualTempC: recentWeather?.allTemp ?? 12.6,
      hotDaysPerYr:
        masterProvince.province.uydu_gozlem_smap_hls_ecostress.ecostress_termal_stres_gun_sayisi,
      frostDaysPerYr: Math.max(
        0,
        365 - masterProvince.province.iklim_ve_su_serisi_2005_2026.donsuz_gun_sayisi,
      ),
    },
    irrigationBudgetMm: store.inputs.rainfed ? 0 : store.inputs.budget,
    irrigationEfficiency: METHOD_EFF[store.inputs.method],
    currentCropId: store.inputs.rotation[0],
  };

  return (
    <div id="kontrol-paneli" className="mx-auto max-w-[1640px] space-y-5 px-3 py-4 sm:px-6 sm:py-5">
      {/* ── Görünüm Modu Seçici: Kolaylaştırılmış (Çiftçi) vs Detaylı (Teknik) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
            <Icon name="sliders" size={17} />
          </span>
          <div>
            <p className="text-[13.5px] font-semibold text-ink">
              {lang === "tr" ? "Görünüm Modu" : "Workspace Mode"}
            </p>
            <p className="text-[11.5px] text-ink-2">
              {uiMode === "simple"
                ? lang === "tr"
                  ? "Kolaylaştırılmış mod: Bölge ürünleri, 3 yıllık rota, su tasarrufu ve sade veri gerekçeleri"
                  : "Simplified mode: Regional crops, 3-year rotation, water savings and plain explanations"
                : lang === "tr"
                  ? "Detaylı mod: Tüm bilimsel grafikler, P10–P90 aralıkları, formül kanıtları ve 11 sensör kartı"
                  : "Detailed mode: All scientific charts, P10–P90 ranges, live equations and 11 sensor cards"}
            </p>
          </div>
        </div>
        <div
          role="group"
          aria-label={lang === "tr" ? "Görünüm Modu Seçimi" : "Workspace Mode Toggle"}
          className="inline-flex rounded-xl border border-line bg-bg p-1"
        >
          <button
            type="button"
            aria-pressed={uiMode === "simple"}
            onClick={() => changeUiMode("simple")}
            className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              uiMode === "simple"
                ? "bg-[#1e6b34] text-white shadow-xs"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {lang === "tr" ? "Kolaylaştırılmış" : "Simplified"}
          </button>
          <button
            type="button"
            aria-pressed={uiMode === "detailed"}
            onClick={() => changeUiMode("detailed")}
            className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
              uiMode === "detailed"
                ? "bg-[#1e6b34] text-white shadow-xs"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {lang === "tr" ? "Detaylı (Teknik)" : "Detailed (Technical)"}
          </button>
        </div>
      </div>

      {/* ── ROW 1: NASA Space Apps Field Shift — 3-Step Flow (Only in Detailed Mode) ── */}
      {uiMode === "detailed" && (
        <FieldShiftComparison
          result={res}
          running={data.analysis.running}
          effectiveAreaDa={effectiveAreaDa}
          soilTextureLabel={
            data.soil
              ? texName(data.soil.textureClass, t)
              : masterProvince.province.toprak_profili_0_30cm_soilgrids.toprak_dokusu_sinifi
          }
          provinceName={
            masterProvince.isInTurkey
              ? `${masterProvince.province.kimlik_ve_cografya.il_adi} (${masterProvince.province.kimlik_ve_cografya.tagem_iklim_kodu})`
              : lang === "tr"
                ? "Türkiye Dışı · Küresel Uydu Modu"
                : "Outside Turkey · Global Satellite Mode"
          }
          onDrawPolygon={() => {
            setMode("polygon");
            document.getElementById("harita-bolumu")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onOpenCoords={() => setCoordOpen(true)}
          onJumpToMap={() => {
            document.getElementById("harita-bolumu")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onJumpToProfitability={() => {
            document.getElementById("analiz-grafikler")?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onJumpToFormulas={scrollToEvidence}
        />
      )}

      {/* ── ROW 2: Asymmetric Map (Left ~63%) + Mevcut Durum Özeti (Right ~37%) ── */}
      <section
        id="harita-bolumu"
        className={`grid grid-cols-1 gap-5 ${mapExpanded ? "" : "xl:grid-cols-[minmax(0,1.68fr)_minmax(0,1fr)]"}`}
      >
        {/* LEFT CARD: Arazi Haritası ve Uydu Verileri */}
        <div className="bento-card flex flex-col overflow-hidden">
          {/* Card Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                <Icon name="satellite" size={18} />
              </span>
              <div>
                <h2 className="font-display text-[18px] font-semibold text-ink">
                  {lang === "tr" ? "Arazi Haritası ve Uydu Verileri" : "Parcel Map & Satellite Telemetry"}
                </h2>
                <p className="readout text-[11.5px]">
                  {lang === "tr"
                    ? `Türkiye 81 İl Detaylı Harita · Zoom ${n(currentZoom, 1)}/20 (~${currentMpp < 1 ? n(currentMpp, 2) : n(currentMpp, 0)} m/piksel)`
                    : `Turkey 81-Province Deep Zoom · Zoom ${n(currentZoom, 1)}/20 (~${currentMpp < 1 ? n(currentMpp, 2) : n(currentMpp, 0)} m/px)`}
                </p>
              </div>
            </div>

            {/* Base Map Quick Pills + Expand */}
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: "esri" as BaseId, tr: "HD Uydu (z20)", en: "HD Satellite (z20)" },
                  { id: "street" as BaseId, tr: "Türkiye Sokak/Köy", en: "Turkey Street/Village" },
                  { id: "topo" as BaseId, tr: "Topografik", en: "Topographic" },
                  { id: "s2" as BaseId, tr: "Sentinel-2", en: "Sentinel-2" },
                ] as const
              ).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={layerState.base === b.id}
                  onClick={() => updateLayers({ base: b.id })}
                  className={`rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                    layerState.base === b.id
                      ? "bg-accent text-on-accent shadow-sm"
                      : "border border-line bg-bg text-ink-2 hover:text-ink"
                  }`}
                >
                  {lang === "tr" ? b.tr : b.en}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm px-2.5"
                onClick={() => mapRef.current?.fitTurkey()}
                title={lang === "tr" ? "Tüm Türkiye haritasını göster" : "Fit all of Turkey"}
              >
                <Icon name="globe" size={15} />
                <span className="hidden sm:inline">{lang === "tr" ? "Türkiye" : "Turkey"}</span>
              </button>
              <button
                type="button"
                className="btn btn-sm btn-icon"
                aria-label={mapExpanded ? (lang === "tr" ? "Haritayı küçült" : "Restore map size") : (lang === "tr" ? "Haritayı genişlet" : "Expand map")}
                title={mapExpanded ? (lang === "tr" ? "Haritayı küçült" : "Restore map size") : (lang === "tr" ? "Haritayı genişlet" : "Expand map")}
                onClick={() => setMapExpanded((v) => !v)}
              >
                <Icon name={mapExpanded ? "collapse" : "expand"} size={16} />
              </button>
            </div>
          </div>

          {/* Map Viewport */}
          <div className={`relative w-full ${mapExpanded ? "h-[76dvh]" : "h-[460px] sm:h-[520px]"}`}>
            <MapCanvas
              ref={mapRef}
              label={t("map.label")}
              ring={field?.ring ?? null}
              fieldName={field?.name}
              fieldAreaLabel={field ? `${n(effectiveAreaDa, effectiveAreaDa < 100 ? 1 : 0)} ${lang === "tr" ? "dönüm" : "da"}` : undefined}
              saved={store.saved.filter((s) => s.id !== field?.id)}
              mode={mode}
              base={layerState.base}
              overlays={layerState.overlays}
              dates={dates}
              cells={cells}
              onCommit={commit}
              onEdit={edit}
              onPin={onPin}
              onLive={setLive}
              onView={setView}
              onPickSaved={(id) => {
                const s = store.saved.find((x) => x.id === id);
                if (s) setField(s);
              }}
              onTileError={(id) => setTileErr(id)}
              onProblem={(c) => setProblem(c)}
            />

            {drawing && (
              <svg className="crosshair" viewBox="0 0 36 36" aria-hidden="true">
                <path d="M18 2v12M18 22v12M2 18h12M22 18h12" stroke="#14361d" strokeWidth="4" />
                <path d="M18 2v12M18 22v12M2 18h12M22 18h12" stroke="#86efac" strokeWidth="1.8" />
              </svg>
            )}

            {/* Top Overlay inside Map: 81-Province SearchBox + Locate + Advanced Layer Settings */}
            <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex flex-wrap items-start justify-between gap-2">
              <div className="pointer-events-auto flex w-full max-w-[28rem] items-start gap-1.5">
                <SearchBox
                  onPlace={(p, bbox, zoom) => {
                    if (bbox)
                      mapRef.current?.fitRing([
                        { lat: bbox[1], lon: bbox[0] },
                        { lat: bbox[3], lon: bbox[2] },
                      ]);
                    else mapRef.current?.flyTo(p, zoom ?? 16);
                  }}
                />
                <LocateButton onPlace={(p) => mapRef.current?.flyTo(p, 17)} />
                <button
                  type="button"
                  className={`plate flex h-11 shrink-0 items-center gap-1.5 px-3 text-[13px] font-semibold ${
                    layersOpen ? "outline-2 outline-[var(--accent-ink)]" : ""
                  }`}
                  aria-pressed={layersOpen}
                  onClick={() => setLayersOpen((v) => !v)}
                >
                  <Icon name="layers" size={17} />
                  <span className="hidden sm:inline">{t("layers.short")}</span>
                </button>
              </div>
            </div>

            {/* Floating "NASA Uydu Katmanları" Checklist on Left of Map matching the user's reference mockup */}
            <div className="pointer-events-auto absolute left-3 top-[4.25rem] z-[1000] max-w-[240px]">
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#102816]/90 text-white shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/15 px-3.5 py-2.5">
                  <span className="text-[13px] font-semibold text-white">
                    {lang === "tr" ? "NASA Uydu Katmanları" : "NASA Satellite Layers"}
                  </span>
                  <button
                    type="button"
                    className="rounded p-1 text-white/80 hover:bg-white/10 hover:text-white"
                    aria-label={nasaPanelOpen ? "Katman kutusunu küçült" : "Katman kutusunu aç"}
                    onClick={() => setNasaPanelOpen((v) => !v)}
                  >
                    <Icon name={nasaPanelOpen ? "chevron-down" : "chevron-right"} size={15} />
                  </button>
                </div>
                {nasaPanelOpen && (
                  <div className="space-y-1.5 px-3.5 py-2.5 text-[12.5px]">
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="size-4 accent-[#22c55e]"
                          checked={layerState.overlays.includes("ndvi")}
                          onChange={() => toggleOverlay("ndvi")}
                        />
                        <span>{lang === "tr" ? "NDVI (Bitki Sağlığı)" : "NDVI (Crop Vigor)"}</span>
                      </span>
                      <TermTooltip termId="ndvi" variant="dark" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="size-4 accent-[#22c55e]"
                          checked={layerState.overlays.includes("smap")}
                          onChange={() => toggleOverlay("smap")}
                        />
                        <span>{lang === "tr" ? "Bölgesel Nem Katmanı (SMAP ~9km)" : "Regional Moisture Layer (SMAP ~9km)"}</span>
                      </span>
                      <TermTooltip termId="smap" variant="dark" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="size-4 accent-[#22c55e]"
                          checked={layerState.overlays.includes("imerg")}
                          onChange={() => toggleOverlay("imerg")}
                        />
                        <span>{lang === "tr" ? "Yağış (IMERG)" : "Precipitation (IMERG)"}</span>
                      </span>
                      <TermTooltip termId="imerg" variant="dark" />
                    </label>
                    <label className="flex cursor-pointer items-center justify-between gap-2 py-0.5">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          className="size-4 accent-[#22c55e]"
                          checked={layerState.base === "relief"}
                          onChange={() => updateLayers({ base: layerState.base === "relief" ? "esri" : "relief" })}
                        />
                        <span>{lang === "tr" ? "Yüzey Yükselti (SRTM)" : "Elevation (SRTM 30m)"}</span>
                      </span>
                      <TermTooltip termId="srtm" variant="dark" />
                    </label>
                    <label className="flex cursor-pointer items-center gap-2.5 py-0.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-[#22c55e]"
                        checked={layerState.overlays.includes("labels") || layerState.overlays.includes("roads")}
                        onChange={() => {
                          const has = layerState.overlays.includes("labels") || layerState.overlays.includes("roads");
                          updateLayers({
                            overlays: has
                              ? layerState.overlays.filter((x) => x !== "labels" && x !== "roads")
                              : [...new Set([...layerState.overlays, "labels" as OverlayId, "roads" as OverlayId])],
                          });
                        }}
                      />
                      <span>{lang === "tr" ? "İl/İlçe/Köy & Yollar" : "Places & Rural Roads"}</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2.5 py-0.5">
                      <input
                        type="checkbox"
                        className="size-4 accent-[#22c55e]"
                        checked={layerState.cells}
                        onChange={() => updateLayers({ cells: !layerState.cells })}
                      />
                      <span>{lang === "tr" ? "Uydu Piksel Hücreleri" : "Sensor Grid Footprints"}</span>
                    </label>
                  </div>
                )}
              </div>
            </div>

            {layersOpen && (
              <LayerMenu
                base={layerState.base}
                overlays={layerState.overlays}
                cells={layerState.cells}
                onChange={updateLayers}
                onClose={() => setLayersOpen(false)}
                dates={dates}
                setDate={setDate}
                centroid={centroid}
              />
            )}

            {/* Bottom-Left inside Map: Drawing & Parcel Editing Toolbar */}
            <div className="pointer-events-auto absolute bottom-3 left-3 z-[1000] flex flex-wrap items-center gap-1.5">
              <div className="plate flex items-center gap-0.5 p-1" role="toolbar" aria-label={t("draw.toolbar")}>
                {tools.map((tl) => (
                  <ToolButton
                    key={tl.id}
                    icon={tl.icon}
                    label={tl.label}
                    pressed={mode === tl.id}
                    onClick={() => setMode(mode === tl.id ? "none" : tl.id)}
                  />
                ))}
                <ToolButton
                  icon="edit"
                  label={t("draw.edit")}
                  pressed={mode === "edit"}
                  disabled={!field}
                  onClick={() => setMode(mode === "edit" ? "none" : "edit")}
                />
                <ToolButton
                  icon="keyboard"
                  label={t("draw.coords")}
                  onClick={() => setCoordOpen(true)}
                />
                <ToolButton
                  icon="undo"
                  label={t("draw.undo")}
                  disabled={!history.past.length && !(live && live.vertices > 0)}
                  onClick={undo}
                />
                <ToolButton
                  icon="upload"
                  label={t("geo.import")}
                  onClick={() => fileRef.current?.click()}
                />
                <ToolButton
                  icon="download"
                  label={t("geo.export")}
                  disabled={!field}
                  onClick={exportGeo}
                />
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".geojson,.json,application/geo+json,application/json"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importGeo(f);
                  e.target.value = "";
                }}
              />
            </div>

            {/* Active Drawing / Status Banner */}
            {(hint || liveText || problem || drawing || mode === "edit" || (tileErr && timeLayers.includes(tileErr))) && (
              <div className="pointer-events-none absolute inset-x-3 bottom-16 z-[1000] flex flex-col items-center gap-2">
                {(hint || liveText || problem) && (
                  <div
                    className="plate pointer-events-auto flex max-w-[38rem] flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3.5 py-2 text-[13.5px]"
                    role="status"
                  >
                    {hint && <span>{hint}</span>}
                    {liveText && <span className="numeral text-[20px]">{liveText}</span>}
                    {live?.radiusM ? <span className="readout">r = {n(live.radiusM)} m</span> : null}
                    {problem && <span className="font-medium text-bad">{t(`draw.err.${problem}`)}</span>}
                  </div>
                )}
                {drawing && (
                  <div className="pointer-events-auto flex flex-wrap justify-center gap-1.5">
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => mapRef.current?.addVertexAtCenter()}>
                      <Icon name="crosshair" size={16} />
                      {t("draw.addCenter")}
                    </button>
                    {mode === "polygon" && (
                      <button type="button" className="btn btn-sm" onClick={() => mapRef.current?.finish()}>
                        <Icon name="check" size={16} />
                        {t("draw.finish")}
                      </button>
                    )}
                    <button type="button" className="btn btn-sm" onClick={() => mapRef.current?.undoVertex()}>
                      <Icon name="undo" size={16} />
                      {t("draw.undoPoint")}
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => setMode("none")}>
                      {t("draw.cancel")}
                    </button>
                  </div>
                )}
                {mode === "edit" && (
                  <button type="button" className="btn btn-primary btn-sm pointer-events-auto" onClick={() => setMode("none")}>
                    <Icon name="check" size={16} />
                    {t("draw.editDone")}
                  </button>
                )}
                {tileErr && timeLayers.includes(tileErr) && (
                  <p className="plate pointer-events-auto flex items-center gap-2 px-3 py-1.5 text-[12.5px]">
                    <Icon name="alert" size={15} />
                    {t("map.tileErr", {
                      layer: lang === "tr" ? tileSourceById(tileErr)?.titleTr ?? "" : tileSourceById(tileErr)?.titleEn ?? "",
                    })}
                    <button type="button" className="underline" onClick={() => setTileErr(null)}>
                      {t("common.ok")}
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Map Card Footer: Pilot Havzalar & Quick Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-bg/60 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-semibold text-ink-2">
                {lang === "tr" ? "Örnek Tarım Havzaları:" : "Pilot Agricultural Basins:"}
              </span>
              {PILOTS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={field?.pilotId === p.id}
                  onClick={() => choosePilot(p.id)}
                  className={`rounded-lg px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    field?.pilotId === p.id
                      ? "bg-accent text-on-accent font-semibold"
                      : "border border-line bg-surface text-ink-2 hover:text-ink"
                  }`}
                >
                  {lang === "tr" ? p.nameTr : p.nameEn}
                </button>
              ))}
            </div>
            {centroid && (
              <span className="readout text-[11.5px]">
                WGS84: {n(centroid.lat, 4)}°K, {n(centroid.lon, 4)}°D
                {data.terrain ? ` · ${n(data.terrain.data.elevationMean, 0)} m` : ""}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT CARD: Mevcut Durum Özeti + Veri Kaynakları matching right of Row 2 in mockup */}
        <div className="bento-card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                  <Icon name="leaf" size={18} />
                </span>
                <h2 className="font-display text-[18px] font-semibold text-ink">
                  {uiMode === "simple"
                    ? lang === "tr" ? "Tarla Karar Özeti" : "Parcel Decision Summary"
                    : lang === "tr" ? "Mevcut Durum Özeti" : "Current Field Status"}
                </h2>
              </div>
              {data.analysis.running && (
                <span className="chip text-accent-ink">
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                  {lang === "tr" ? "Hesaplanıyor" : "Computing"}
                </span>
              )}
            </div>

            {/* ── Key Map-Side Summary: Bölgede Sıklıkla Ekilenler + 3 Yıllık Rota + Su Tasarrufu ── */}
            <div className="mb-4 space-y-2.5 rounded-xl border border-[#bbf7d0] bg-[#f4fbf6] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11.5px] font-bold uppercase tracking-wide text-[#166534]">
                  {masterProvince.isInTurkey
                    ? `${masterProvince.province.kimlik_ve_cografya.il_adi} · ${n(effectiveAreaDa, 0)} da`
                    : lang === "tr"
                      ? `Türkiye Dışı (${n(centroid?.lat ?? 0, 2)}°, ${n(centroid?.lon ?? 0, 2)}°) · ${n(effectiveAreaDa, 0)} da`
                      : `Outside Turkey (${n(centroid?.lat ?? 0, 2)}°, ${n(centroid?.lon ?? 0, 2)}°) · ${n(effectiveAreaDa, 0)} da`}
                </span>
                <span className="rounded-full bg-white px-2 py-0.5 font-mono text-[10.5px] font-semibold text-[#1e6b34]">
                  {store.inputs.rainfed
                    ? lang === "tr" ? "Kuru Tarım" : "Rainfed"
                    : lang === "tr" ? `${store.inputs.budget} mm Sulama` : `${store.inputs.budget} mm Irrigated`}
                </span>
              </div>

              {/* Bölgede Sıklıkla Ekilen Ürünler */}
              <div>
                <p className="text-[11.5px] font-semibold text-ink-2">
                  {lang === "tr" ? "Bölgede Sıklıkla Ekilen Ürünler:" : "Commonly Grown Regional Crops:"}
                </p>
                {commonRegionalCrops.length > 0 ? (
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {commonRegionalCrops.map((c) => (
                      <span
                        key={c.code}
                        className="rounded-full border border-[#bbf7d0] bg-white px-2.5 py-0.5 text-[11.5px] font-medium text-[#14532d]"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[11.5px] text-ink-2">
                    {!masterProvince.isInTurkey
                      ? lang === "tr"
                        ? "Seçili parsel Türkiye 81 il veri seti dışında. Bu koordinat için bölgesel ürün kaydı yok; yalnızca küresel NASA POWER / SoilGrids / SRTM uydu verileriyle analiz yapılıyor."
                        : "Selected parcel is outside the 81-province Turkey dataset. Analyzing with global NASA POWER / SoilGrids / SRTM satellite data only."
                      : lang === "tr"
                        ? "Bu koordinat için yeterli bölgesel ürün kaydı bulunamadı."
                        : "Insufficient regional crop records for this coordinate."}
                  </p>
                )}
              </div>

              {/* Sonraki 3 Yıl İçin Hesaplanan Rota */}
              <div className="border-t border-[#dcfce7] pt-2.5">
                <p className="text-[11.5px] font-semibold text-ink-2">
                  {lang === "tr" ? "Sonraki 3 Yıl İçin Hesaplanan Rota:" : "Calculated 3-Year Rotation:"}
                </p>
                {best ? (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {best.crops.map((cid, idx) => (
                      <span
                        key={`${cid}-${idx}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#1e6b34] px-2.5 py-1 text-[12px] font-semibold text-white"
                      >
                        <span className="opacity-80">{idx + 1}.</span>
                        <span>{L(CROPS[cid].name).split(" (")[0]}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-[12px] text-ink-2">
                    {lang === "tr" ? "Rota hesaplanıyor..." : "Calculating rotation..."}
                  </p>
                )}
              </div>

              {/* Su Tasarrufu ve Net Kazanç Özeti */}
              {waterSavingsInfo && (
                <div className="grid grid-cols-2 gap-2 border-t border-[#dcfce7] pt-2.5">
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-[10.5px] font-semibold text-ink-2">
                      {lang === "tr" ? "Su Tasarrufu / Bütçe" : "Water Savings / Demand"}
                    </p>
                    <p className="numeral text-[15px] font-bold text-[#0277bd]">
                      {waterSavingsInfo.savedMmPerYr > 0
                        ? `${n(waterSavingsInfo.savedMmPerYr, 0)} m³/da/yıl tasarruf`
                        : `${n(waterSavingsInfo.bestReq, 0)} mm/yıl ihtiyaç`}
                    </p>
                    <p className="text-[10.5px] text-ink-2">
                      {waterSavingsInfo.savedMmPerYr > 0
                        ? lang === "tr"
                          ? `Tarlada toplam ${n(waterSavingsInfo.savedTotalM3Yr, 0)} m³/yıl (%${Math.abs(waterSavingsInfo.savedPct)} daha az)`
                          : `${n(waterSavingsInfo.savedTotalM3Yr, 0)} m³/yr total (${Math.abs(waterSavingsInfo.savedPct)}% less)`
                        : lang === "tr"
                          ? `Mevcut ekime göre ${n(Math.abs(waterSavingsInfo.savedMmPerYr), 0)} mm fark`
                          : `${n(Math.abs(waterSavingsInfo.savedMmPerYr), 0)} mm vs current`}
                    </p>
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    <p className="text-[10.5px] font-semibold text-ink-2">
                      {lang === "tr" ? "Beklenen Net Kazanç" : "Expected Net Profit"}
                    </p>
                    <p className="numeral text-[15px] font-bold text-[#1e6b34]">
                      {n(waterSavingsInfo.marginBest, 0)} ₺/da/yıl
                    </p>
                    <p className="text-[10.5px] text-ink-2">
                      {waterSavingsInfo.marginDiffTL >= 0 ? "+" : ""}
                      {n(waterSavingsInfo.marginDiffTL, 0)} ₺/da {lang === "tr" ? "mevcut ekime göre" : "vs current"}
                    </p>
                  </div>
                </div>
              )}

              {/* Veri Kaynağı Şeffaflığı: Canlı Uydu vs. Yedek/Önbellek */}
              <div className="flex flex-wrap items-center gap-1.5 border-t border-[#dcfce7] pt-2.5 text-[10.5px]">
                <span className="font-semibold text-ink-2">
                  {lang === "tr" ? "Veri Kaynağı:" : "Provenance:"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    data.snapshot?.snap.climate
                      ? "bg-[#fef3c7] text-[#92400e]"
                      : "bg-[#e0f2fe] text-[#0369a1]"
                  }`}
                >
                  {data.snapshot?.snap.climate
                    ? lang === "tr" ? "İklim: Pilot Snapshot" : "Climate: Snapshot"
                    : lang === "tr" ? "İklim: Canlı NASA POWER" : "Climate: Live NASA POWER"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    data.soil?.origin === "soilgrids"
                      ? "bg-[#e6f4ea] text-[#166534]"
                      : data.soil?.origin === "user"
                        ? "bg-[#e0f2fe] text-[#0369a1]"
                        : "bg-[#fee2e2] text-[#991b1b]"
                  }`}
                >
                  {data.soil?.origin === "soilgrids"
                    ? lang === "tr" ? "Toprak: Canlı SoilGrids 250m" : "Soil: Live SoilGrids"
                    : data.soil?.origin === "user"
                      ? lang === "tr" ? "Toprak: Kullanıcı Tahlili" : "Soil: User Lab"
                      : lang === "tr" ? "Toprak: Varsayılan Yedek" : "Soil: Fallback"}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    data.terrain?.basis === "polygon"
                      ? "bg-[#e6f4ea] text-[#166534]"
                      : "bg-[#fef3c7] text-[#92400e]"
                  }`}
                >
                  {data.terrain?.basis === "polygon"
                    ? lang === "tr" ? "Eğim: Canlı SRTM" : "Slope: Live SRTM"
                    : lang === "tr" ? "Eğim: Bölge Noktası" : "Slope: Regional"}
                </span>
              </div>
            </div>

            {uiMode === "detailed" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)]">
              {/* 5 Real Telemetry Status Rows */}
              <div className="space-y-2.5">
                {/* 1. Toprak Sağlığı (Model Göstergesi) */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ea] text-[#1e6b34]">
                      <Icon name="layers" size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                        <span>{lang === "tr" ? "Toprak Sağlığı (Model Göstergesi)" : "Soil Health (Model Indicator)"}</span>
                        <TermTooltip termId="soil_health" />
                      </p>
                      <p className="text-[11.5px] text-ink-2">
                        {currentPlan
                          ? currentPlan.soilHealth.score >= 70
                            ? lang === "tr" ? "Model göstergesi (0–100): İyi" : "Model indicator (0–100): Good"
                            : lang === "tr" ? "Model göstergesi (0–100): Orta" : "Model indicator (0–100): Moderate"
                          : lang === "tr" ? "Model göstergesi (0–100)" : "Model indicator (0–100)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="numeral text-[19px] text-[#1e6b34]">
                      {currentPlan ? `${n(currentPlan.soilHealth.score, 0)} / 100` : "—"}
                    </p>
                  </div>
                </div>

                {/* 2. Kök Bölgesi Nemi (POWER / MERRA-2 GWETROOT — NOT direct SMAP sensor) */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0277bd]">
                      <Icon name="drop" size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                        <span>{lang === "tr" ? "Kök Nemi (POWER / MERRA-2)" : "Root Wetness (POWER / MERRA-2)"}</span>
                        <TermTooltip termId="nasa_power" />
                      </p>
                      <p className="text-[11px] text-ink-2">
                        {lang === "tr"
                          ? "GWETROOT yeniden analiz (doğrudan SMAP ölçümü değildir)"
                          : "GWETROOT reanalysis (not a direct SMAP measurement)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="numeral text-[19px] text-[#0277bd]">
                      {moist ? `%${n(moist.value * 100, 0)}` : "—"}
                    </p>
                  </div>
                </div>

                {/* 3. Bitki Sağlığı (NDVI) */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e6f4ea] text-[#1e6b34]">
                      <Icon name="sprout" size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                        <span>{lang === "tr" ? "Bitki Sağlığı (NDVI)" : "Vegetation (NDVI)"}</span>
                        <TermTooltip termId="ndvi" />
                      </p>
                      <p className="text-[11.5px] text-ink-2">
                        {latestNdvi
                          ? latestNdvi.ndvi >= 0.5
                            ? lang === "tr" ? "Yüksek örtü" : "Dense canopy"
                            : latestNdvi.ndvi >= 0.28
                              ? lang === "tr" ? "Orta" : "Moderate"
                              : lang === "tr" ? "Seyrek / Nadas" : "Sparse / Fallow"
                          : "MODIS 250m"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="numeral text-[19px] text-[#1e6b34]">
                      {latestNdvi ? n(latestNdvi.ndvi, 2) : "—"}
                    </p>
                  </div>
                </div>

                {/* 4. Ortalama Sıcaklık */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#d97706]">
                      <Icon name="thermo" size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                        <span>{lang === "tr" ? "Ortalama Sıcaklık" : "Mean Temperature"}</span>
                        <TermTooltip termId="nasa_power" />
                      </p>
                      <p className="text-[11.5px] text-ink-2">
                        {lang === "tr" ? "Son 30 gün (POWER)" : "Last 30 days (POWER)"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="numeral text-[19px] text-ink">
                      {recentWeather ? `${n(recentWeather.meanTemp30, 1)} °C` : "—"}
                    </p>
                  </div>
                </div>

                {/* 5. Toplam Yağış */}
                <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e0f2fe] text-[#0277bd]">
                      <Icon name="rain" size={18} />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-ink flex items-center gap-1">
                        <span>{lang === "tr" ? "Yıllık / 30G Yağış" : "Annual / 30d Rain"}</span>
                        <TermTooltip termId="pe" />
                      </p>
                      <p className="text-[11.5px] text-ink-2">
                        {recentWeather
                          ? `${lang === "tr" ? "Son 30 gün" : "Last 30d"}: ${n(recentWeather.sumRain30, 0)} mm`
                          : "NASA POWER"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="numeral text-[19px] text-[#0277bd]">
                      {climateSum?.meanAnnualPrecipMm ? `${n(climateSum.meanAnnualPrecipMm, 0)} mm` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column inside Mevcut Durum Özeti: NASA Satellite Visual + Veri Kaynakları */}
              <div className="flex flex-col justify-between rounded-2xl border border-line bg-bg/80 p-3.5">
                <div className="relative h-44 w-full overflow-hidden rounded-xl border border-line bg-[#0d2415] p-3.5 text-white">
                  <Image
                    src={IMAGES.harranPlain.src}
                    alt={L(IMAGES.harranPlain.alt)}
                    fill
                    sizes="280px"
                    className="object-cover opacity-55"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 75% 25%, rgba(30, 107, 52, 0.35), rgba(10, 28, 16, 0.88))",
                    }}
                  />
                  <div className="relative z-10 flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/25 bg-[#1e3a8a]/80 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-[#bfdbfe]">
                        NASA Verileri
                      </span>
                      <Icon name="satellite" size={22} className="text-[#86efac]" />
                    </div>
                    <div>
                      <p className="font-display text-[15px] font-semibold text-white">
                        {field?.name ?? "Konya — Çumra"}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-[#bbf7d0]">
                        {data.terrain
                          ? `${n(data.terrain.data.elevationMean, 0)} m · %${n(data.terrain.data.slopePct, 1)} eğim`
                          : "SRTM 30m DEM"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-xl border border-line bg-surface p-3">
                  <p className="text-[12.5px] font-semibold text-ink">
                    {lang === "tr" ? "Veri Kaynakları" : "Active Data Sources"}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-ink-2">
                    {lang === "tr"
                      ? "POWER/MERRA-2 (İklim & GWETROOT Kök Nemi), SMAP L4 (~9 km Bölgesel Harita Katmanı), IMERG (Yağış), MODIS (NDVI), SoilGrids 250m"
                      : "POWER/MERRA-2 (Climate & GWETROOT Root Wetness), SMAP L4 (~9 km Regional Map Layer), IMERG (Precip), MODIS (NDVI), SoilGrids 250m"}
                  </p>
                  <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[11px]">
                    <span className="font-mono text-ink-2">
                      {climate ? `${climate.start.slice(0, 4)}–${climate.end.slice(0, 4)}` : "2001–2024"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDetailsOpen((v) => !v)}
                      className="font-semibold text-accent-ink hover:underline"
                    >
                      {detailsOpen
                        ? lang === "tr" ? "Detayları Gizle" : "Hide Diagnostics"
                        : lang === "tr" ? "Tüm Sensör Kartları →" : "All Sensor Cards →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Quick Action Bar at bottom of Mevcut Durum Özeti */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-sm" onClick={saveField}>
                <Icon name="save" size={16} />
                <span>{lang === "tr" ? "Araziyi Kaydet" : "Save Parcel"}</span>
              </button>
              <button type="button" className="btn btn-sm" onClick={exportGeo}>
                <Icon name="download" size={16} />
                <span>GeoJSON</span>
              </button>
            </div>
            <Link href="/plan" className="btn btn-primary btn-sm px-3.5">
              <Icon name="plan" size={16} />
              <span>{lang === "tr" ? "Detaylı Rotasyon Stüdyosu" : "Full Rotation Studio"}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── ALT BÖLÜM (HARİTA ALTINDA): 3 Olası Rota, Sıralama Sebepleri ve Veri Kaynağı ── */}
      <section
        id="rota-nedenleri"
        aria-label={lang === "tr" ? "3 Yıllık Olası Rotalar ve Sıralama Sebepleri" : "3-Year Routes & Sequence Reasoning"}
        className="space-y-5"
      >
        <div className="bento-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="font-display text-[19px] font-semibold text-ink">
                {lang === "tr"
                  ? "Sonraki 3 Yıl İçin 3 Olası Rota ve Sıralama Sebepleri"
                  : "3 Possible 3-Year Routes & Sequence Reasoning"}
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-2">
                {lang === "tr"
                  ? "En doğru rota, klasik ekilenler arasından en mantıklı rota ve alternatif rota; 1. → 2. → 3. yıl sıralama gerekçeleriyle birlikte sunulur."
                  : "Most accurate route, most sensible classic-crop route, and alternative route with 1st → 2nd → 3rd year sequence explanations."}
              </p>
            </div>
          </div>

          {threeRouteCards.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {threeRouteCards.map((card) => {
                const isSelected = best ? best.id === card.plan.id : selectedAltIdx === card.altIdx;
                return (
                  <article
                    key={card.roleId}
                    className={`flex flex-col justify-between rounded-2xl border p-4 transition-colors ${
                      isSelected
                        ? "border-[#1e6b34] bg-[#f4fbf6] shadow-xs"
                        : "border-line bg-bg/60 hover:border-[#86efac]"
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${
                            card.roleId === "optimal"
                              ? "bg-[#1e6b34] text-white"
                              : card.roleId === "classic"
                                ? "bg-[#e0f2fe] text-[#0369a1]"
                                : "bg-[#fef3c7] text-[#b45309]"
                          }`}
                        >
                          {lang === "tr" ? card.badgeTr : card.badgeEn}
                        </span>
                        <span className="font-mono text-[11px] font-semibold text-ink-2">
                          {n(card.plan.soilHealth.score, 0)}/100 {lang === "tr" ? "toprak" : "soil"}
                        </span>
                      </div>

                      <p className="mt-2 text-[12px] text-ink-2">
                        {lang === "tr" ? card.subtitleTr : card.subtitleEn}
                      </p>

                      {/* 3 Yıllık Sıra */}
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {card.plan.crops.map((cid, idx) => (
                          <div
                            key={`${card.roleId}-${cid}-${idx}`}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5"
                          >
                            <CropArt crop={cid} size={22} />
                            <span className="text-[12px] font-semibold text-ink">
                              {idx + 1}. {L(CROPS[cid].name).split(" (")[0]}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Su Tasarrufu & Net Kazanç */}
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-line bg-white p-2.5">
                        <div>
                          <p className="text-[10.5px] font-semibold text-ink-2">
                            {lang === "tr" ? "Su Tasarrufu / İhtiyaç" : "Water Savings / Need"}
                          </p>
                          <p className="numeral text-[13.5px] font-bold text-[#0277bd]">
                            {card.savedMm > 0
                              ? `${n(card.savedMm, 0)} m³/da/yıl tasarruf`
                              : `${n(card.plan.water.requirementMmPerYr?.p50 ?? 0, 0)} mm/yıl`}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10.5px] font-semibold text-ink-2">
                            {lang === "tr" ? "Net Kazanç" : "Net Profit"}
                          </p>
                          <p className="numeral text-[13.5px] font-bold text-[#1e6b34]">
                            {n(card.margin, 0)} ₺/da/yıl
                          </p>
                        </div>
                      </div>

                      {/* Neden Bu Sıralama Seçildi? (1 → 2 → 3) */}
                      <div className="mt-3 space-y-1.5 border-t border-line pt-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-2">
                          {lang === "tr" ? "Neden Bu 1. → 2. → 3. Yıl Sıralaması Seçildi?" : "Why This 1→2→3 Sequence?"}
                        </p>
                        {card.sequenceReasons.map((stepText, sIdx) => (
                          <p key={sIdx} className="text-[12px] leading-relaxed text-ink">
                            {stepText}
                          </p>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAltIdx(card.altIdx);
                        setSelectedPlanOverride(card.plan.id);
                      }}
                      className={`btn btn-sm mt-3 w-full justify-center ${
                        isSelected ? "btn-primary" : ""
                      }`}
                    >
                      {isSelected
                        ? lang === "tr" ? "Seçili Rota (Harita Yanında Gösteriliyor)" : "Selected Route"
                        : lang === "tr" ? "Bu Rotayı Seç ve İncele" : "Select This Route"}
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="skel h-40" />
          )}

          {/* Veri Kaynağı Vurgulu Özet (Kolaylaştırılmış modda ana gerekçeler burada görünür) */}
          {uiMode === "simple" && best && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-4 md:grid-cols-2">
              <div className="rounded-xl border border-[#bae6fd] bg-[#f0f9ff] p-4">
                <p className="font-mono text-[11px] font-bold uppercase text-[#0369a1]">
                  {lang === "tr" ? "NASA Uydu Nem ve İklim Verisine Dayanarak" : "Based on NASA Satellite Moisture & Climate"}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#0c4a6e]">
                  {lang === "tr"
                    ? `NASA POWER (MERRA-2) uydu verilerine göre bu koordinatta kök bölgesi nemi %${moist ? n(moist.value * 100, 0) : "—"} ve yıllık ortalama yağış ${climateSum ? n(climateSum.meanAnnualPrecipMm, 0) : n(masterProvince.province.iklim_ve_su_serisi_2005_2026.yillik_yagis_tipik_mm, 0)} mm düzeyindedir. Sıralamalar kurak aylardaki su stresini azaltacak şekilde kurgulandı.`
                    : `According to NASA POWER (MERRA-2) satellite data, root-zone wetness here is ${moist ? n(moist.value * 100, 0) : "—"}% with ${climateSum ? n(climateSum.meanAnnualPrecipMm, 0) : "—"} mm annual rainfall.`}
                </p>
              </div>

              <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-4">
                <p className="font-mono text-[11px] font-bold uppercase text-[#166534]">
                  {lang === "tr" ? "Toprak, Rakım ve Su Tasarrufu" : "Soil, Elevation & Water Savings"}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#14532d]">
                  {lang === "tr"
                    ? `ISRIC SoilGrids toprak verisi (${data.soil ? texName(data.soil.textureClass, t) : "küresel toprak profili"}) ve NASA SRTM yükseklik verisi (${n(data.terrain?.data.elevationMean ?? masterProvince.province.kimlik_ve_cografya.ortalama_tarim_rakimi_m, 0)} m) kullanıldı. ${
                        waterSavingsInfo && waterSavingsInfo.savedMmPerYr > 0
                          ? `Seçili rota mevcut ekiminize göre yılda dekarda ${n(waterSavingsInfo.savedMmPerYr, 0)} m³ (%${Math.abs(waterSavingsInfo.savedPct)}) su tasarrufu ve ${waterSavingsInfo.marginDiffTL >= 0 ? "+" : ""}${n(waterSavingsInfo.marginDiffTL, 0)} ₺/da ek net kazanç öngörüyor.`
                          : `Seçtiğiniz su bütçesi altında ${waterSavingsInfo ? `${n(waterSavingsInfo.marginBest, 0)} ₺/da/yıl` : ""} net kazanç sağlar.`
                      }`
                    : `Uses ISRIC SoilGrids (${data.soil ? texName(data.soil.textureClass, t) : "global soil profile"}) and NASA SRTM elevation (${n(data.terrain?.data.elevationMean ?? 0, 0)} m).`}
                </p>
              </div>

              <div className="rounded-xl border border-line bg-bg/70 p-4">
                <p className="font-mono text-[11px] font-bold uppercase text-ink-2">
                  {lang === "tr" ? "Bölgede Sıklıkla Ekilen Ürünlerle Uyum" : "Alignment with Regional Crops"}
                </p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink">
                  {commonRegionalCrops.length > 0
                    ? lang === "tr"
                      ? `${masterProvince.province.kimlik_ve_cografya.il_adi} ilinde sıklıkla ekilen ${commonRegionalCrops.slice(0, 4).map((c) => c.name).join(", ")} ürünleri ve 2025/2026 TMO–borsa alım fiyatları temel alınarak klasik ve bilimsel rotalar ayrı ayrı çıkarıldı.`
                      : `Aligned with commonly grown crops in ${masterProvince.province.kimlik_ve_cografya.il_adi} (${commonRegionalCrops.slice(0, 4).map((c) => c.name).join(", ")}) and 2025/2026 reference market prices.`
                    : lang === "tr"
                      ? "Bu koordinat Türkiye 81 il veri seti dışında olduğu için bölgesel ürün tablosu yerine yalnızca küresel uydu iklim, toprak ve rakım verileriyle hesaplandı."
                      : "Outside the 81-province Turkey dataset; computed from global satellite climate, soil and elevation data."}
                </p>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-line bg-bg/70 p-4">
                <div>
                  <p className="font-mono text-[11px] font-bold uppercase text-ink-2">
                    {lang === "tr" ? "Daha Fazla Teknik Kanıt İster misiniz?" : "Need Deeper Technical Proof?"}
                  </p>
                  <p className="mt-1.5 text-[13px] text-ink-2">
                    {lang === "tr"
                      ? "P10–P90 belirsizlik grafikleri, kuraklık riski simülasyonu, canlı FAO-56 formülleri ve 11 uydu sensör kartını görmek için Detaylı Moda geçebilirsiniz."
                      : "Switch to Detailed Mode to inspect P10–P90 charts, drought simulations, live FAO-56 equations and all 11 sensor cards."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => changeUiMode("detailed")}
                  className="btn btn-primary btn-sm mt-3 self-start"
                >
                  {lang === "tr" ? "Detaylı (Teknik) Moda Geç →" : "Switch to Detailed Mode →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {uiMode === "detailed" && (
        <>
      {/* ── ROW 3: 3-Column Bento Grid (Ürün Önerileri | 3 Yıllık Rotasyon | Verim & Kârlılık) ── */}
      <section
        id="urun-onerileri"
        aria-label={lang === "tr" ? "Ürün Önerileri, Rotasyon ve Kârlılık" : "Crop Recommendations, Rotation & Profitability"}
        className="grid grid-cols-1 gap-5 lg:grid-cols-3"
      >
        {/* COL 1: Akıllı Ürün Önerileri */}
        <article className="bento-card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                  <Icon name="sprout" size={18} />
                </span>
                <h2 className="font-display text-[18px] font-semibold text-ink">
                  {lang === "tr" ? "Akıllı Ürün Önerileri" : "Smart Crop Recommendations"}
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1e6b34]">
                <span>FAO-56 & TOPSIS</span>
                <TermTooltip termId="topsis_pareto" />
              </span>
            </div>
            <p className="mt-1.5 text-[13px] text-ink-2">
              {lang === "tr"
                ? "Arazinizin toprak dokusu, iklimi ve su bütçesine göre en yüksek uyum puanlı ürünler:"
                : "Highest-suitability crops for your parcel's soil texture, climate and water budget:"}
            </p>

            <ol className="mt-4 space-y-3">
              {topCropRecommendations.length > 0 ? (
                topCropRecommendations.map((item, idx) => {
                  const mCode = CROP_ID_TO_MASTER[item.cropId];
                  const mEntry = masterProvince.province.il_urun_verim_su_ve_rotasyon_matrisi.urun_detay_tablosu[mCode];
                  const suit = mEntry?.ekolojik_uygunluk_durumu ?? "Uygun";
                  return (
                    <li
                      key={item.cropId}
                      className="flex flex-col gap-2 rounded-2xl border border-line bg-bg/65 px-3.5 py-3 transition-colors hover:border-accent/50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="numeral flex size-7 shrink-0 items-center justify-center rounded-full bg-[#e6f4ea] text-[14px] text-[#1e6b34]">
                          {idx + 1}
                        </span>
                        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface shadow-xs">
                          <CropArt crop={item.cropId} size={34} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="truncate font-display text-[16px] font-semibold text-ink">
                                {L(item.def.name)}
                              </p>
                              <span
                                className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] font-bold ${
                                  suit === "Uygun"
                                    ? "bg-[#dcfce7] text-[#166534]"
                                    : suit === "Kisitli_Uygun"
                                      ? "bg-[#fef3c7] text-[#92400e]"
                                      : "bg-[#fee2e2] text-[#991b1b]"
                                }`}
                              >
                                {suit === "Uygun" ? "Uygun" : suit === "Kisitli_Uygun" ? "Kısıtlı" : "Don Riskli"}
                              </span>
                            </div>
                            <span className="font-mono text-[12.5px] font-semibold text-[#1e6b34]">
                              {lang === "tr" ? "Uygunluk" : "Match"}: %{item.suitabilityPct}
                            </span>
                          </div>
                          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-[#22c55e] transition-all duration-300"
                              style={{ width: `${item.suitabilityPct}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[11px]">
                            <span className="font-mono text-ink-2">
                              {lang === "tr" ? "Verim" : "Yield"}: <strong className="text-ink">{n(item.yieldKgDa, 0)} kg/da</strong> · {n(item.def.priceTLPerKg.value, 1)} ₺/kg
                            </span>
                            <span className="font-mono font-semibold text-[#1e6b34]">
                              +{n(item.marginTLPerDa, 0)} ₺/da {lang === "tr" ? "kâr" : "profit"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Decisive 1-Click Year Placement Strip */}
                      <div className="flex items-center justify-between gap-2 border-t border-line/70 pt-1.5 text-[11px]">
                        <span className="font-mono text-[10.5px] text-ink-2">
                          {mEntry ? `ETc ${n(mEntry.ETc_mm, 0)}mm · dn ${n(mEntry.net_su_ihtiyaci_dn_mm, 0)}mm` : "FAO-56"}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10.5px] text-ink-2">{lang === "tr" ? "Rotasyona Ekle:" : "Add to Year:"}</span>
                          {([0, 1, 2] as const).map((yIdx) => {
                            const activeYr = store.inputs.rotation[yIdx] === item.cropId;
                            return (
                              <button
                                key={yIdx}
                                type="button"
                                onClick={() => assignCropYear(item.cropId, yIdx)}
                                className={`rounded px-2 py-0.5 font-mono text-[10.5px] font-bold transition-colors ${
                                  activeYr
                                    ? "bg-[#1e6b34] text-white"
                                    : "border border-line bg-surface text-ink-2 hover:border-[#1e6b34] hover:text-ink"
                                }`}
                              >
                                {yIdx + 1}. Yıl
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </li>
                  );
                })
              ) : (
                <li className="skel h-44" />
              )}
            </ol>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={scrollToEvidence}
              className="text-[12px] font-semibold text-accent-ink hover:underline"
            >
              {lang === "tr" ? "Puanlama Dayanağı →" : "Scoring Basis →"}
            </button>
            <Link href="/plan" className="btn btn-sm">
              <span>{lang === "tr" ? "Tüm Alternatifleri Gör" : "View All Alternatives"}</span>
              <Icon name="arrow" size={15} />
            </Link>
          </div>
        </article>

        {/* COL 2: Üç Yıllık Ürün Rotasyon Planı */}
        <article className="bento-card flex flex-col justify-between p-5">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                  <Icon name="plan" size={18} />
                </span>
                <h2 className="font-display text-[18px] font-semibold text-ink flex items-center gap-1.5">
                  <span>{lang === "tr" ? "Üç Yıllık Ürün Rotasyon Planı" : "Three-Year Crop Rotation Plan"}</span>
                  <TermTooltip termId="munavebe" />
                </h2>
              </div>
              {res && res.alternatives.length > 1 ? (
                <div className="inline-flex rounded-lg border border-line bg-bg p-0.5 text-[11px] font-semibold">
                  {res.alternatives.slice(0, 3).map((alt, i) => (
                    <button
                      key={alt.id}
                      type="button"
                      onClick={() => setSelectedAltIdx(i as 0 | 1 | 2)}
                      className={`rounded-md px-2 py-0.5 transition-colors ${
                        selectedAltIdx === i ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink"
                      }`}
                    >
                      {i + 1}. {lang === "tr" ? "Öneri" : "Plan"}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1e6b34]">
                  {lang === "tr" ? "Sürdürülebilir Plan" : "Sustainable Plan"}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[13px] text-ink-2">
              {lang === "tr"
                ? `${masterProvince.province.kimlik_ve_cografya.il_adi} ili için önerilen münavebe paketleri ve yıllık ürün seçimi:`
                : `Recommended rotation packages and annual crop selection for ${masterProvince.province.kimlik_ve_cografya.il_adi}:`}
            </p>

            {/* 1-Click Province Preset Packages from turkiye_agro_master.json */}
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              {masterEval.packages.map((pkg) => {
                const isAct =
                  store.inputs.rotation[0] === pkg.crops[0] &&
                  store.inputs.rotation[1] === pkg.crops[1] &&
                  store.inputs.rotation[2] === pkg.crops[2];
                return (
                  <button
                    key={pkg.id}
                    type="button"
                    onClick={() => setInputs({ rotation: [...pkg.crops] })}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                      isAct
                        ? "bg-[#1e6b34] text-white shadow-xs"
                        : "border border-line bg-bg text-ink-2 hover:border-[#1e6b34]/50 hover:text-ink"
                    }`}
                    title={pkg.description}
                  >
                    {pkg.badgeTr}: {pkg.crops.map((c) => L(CROPS[c].name).split(" (")[0]).join(" → ")}
                  </button>
                );
              })}
            </div>

            {/* 3 Year Cards connected with arrows */}
            {best ? (
              <div className="mt-3.5 grid grid-cols-3 items-stretch gap-2">
                {best.crops.map((cid, idx) => {
                  const def = CROPS[cid];
                  const yr = best.years[idx];
                  const yKgDa = Math.round((yr?.yieldTHa?.p50 ?? 0) * 100);
                  const mTLDa = Math.round(yr?.grossMarginTLPerDa?.p50 ?? 0);
                  const roleText =
                    def.family === "fabaceae"
                      ? lang === "tr" ? "(Toprak azotu artırır)" : "(Fixes soil nitrogen)"
                      : def.family === "poaceae"
                        ? lang === "tr" ? "(Dengeleyici üretim)" : "(Stabilizing cereal)"
                        : cid === "fallow"
                          ? lang === "tr" ? "(Nem biriktirir)" : "(Stores soil moisture)"
                          : lang === "tr" ? "(Yüksek kârlılık)" : "(High cash return)";
                  return (
                    <div
                      key={idx}
                      className="relative flex flex-col items-center justify-between rounded-2xl border border-line bg-bg/75 p-2.5 text-center"
                    >
                      <span className="text-[12px] font-semibold text-ink-2">
                        {idx + 1}. {lang === "tr" ? "Yıl" : "Year"}
                      </span>
                      <span className="my-1.5 flex size-13 items-center justify-center rounded-full border border-[#bbf7d0] bg-surface shadow-sm">
                        <CropArt crop={cid} size={34} />
                      </span>
                      <div className="w-full">
                        <select
                          aria-label={`${idx + 1}. Yıl Ürün Seçimi`}
                          value={store.inputs.rotation[idx]}
                          onChange={(e) => assignCropYear(e.target.value as CropId, idx as 0 | 1 | 2)}
                          className="w-full truncate rounded-lg border border-line bg-surface px-1.5 py-0.5 text-center font-display text-[13px] font-semibold text-ink cursor-pointer"
                        >
                          {CROP_IDS.map((x) => (
                            <option key={x} value={x}>
                              {L(CROPS[x].name)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1 text-[10px] leading-tight text-ink-2">{roleText}</p>
                        {yr?.yieldTHa && (
                          <p className="readout mt-1 text-[11px] font-semibold text-ink">
                            {yKgDa} kg/da
                          </p>
                        )}
                        <p className={`font-mono text-[11px] font-semibold ${mTLDa >= 0 ? "text-[#1e6b34]" : "text-bad"}`}>
                          {mTLDa >= 0 ? "+" : ""}{n(mTLDa, 0)} ₺/da
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="skel mt-4 h-44" />
            )}
          </div>

          {/* 3 Bottom Impact Pills + 1-Click Apply Button */}
          <div>
            {rotationDeltas && (
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3.5">
                <div className="rounded-xl bg-[#e6f4ea]/70 px-2.5 py-2 text-center">
                  <p className="text-[11px] font-medium text-ink-2">
                    {lang === "tr" ? "Toprak verimliliği" : "Soil health"}
                  </p>
                  <p className="numeral mt-0.5 text-[17px] text-[#1e6b34]">
                    {rotationDeltas.soilDeltaPct >= 0
                      ? `+%${Math.max(4, rotationDeltas.soilDeltaPct)}`
                      : `${n(rotationDeltas.soilBest, 0)}/100`}
                  </p>
                </div>
                <div className="rounded-xl bg-[#e0f2fe]/70 px-2.5 py-2 text-center">
                  <p className="text-[11px] font-medium text-ink-2">
                    {lang === "tr" ? "Su kullanımı" : "Water demand"}
                  </p>
                  <p className="numeral mt-0.5 text-[17px] text-[#0277bd]">
                    {rotationDeltas.waterDeltaPct <= 0
                      ? `${rotationDeltas.waterDeltaPct}%`
                      : `${n(rotationDeltas.waterBest, 0)} mm`}
                  </p>
                </div>
                <div className="rounded-xl bg-[#fef3c7]/80 px-2.5 py-2 text-center">
                  <p className="text-[11px] font-medium text-ink-2">
                    {lang === "tr" ? "Uzun vadeli kârlılık" : "Long-term margin"}
                  </p>
                  <p className="numeral mt-0.5 text-[17px] text-[#b76e00]">
                    {rotationDeltas.marginDeltaPct >= 0
                      ? `+%${Math.max(3, rotationDeltas.marginDeltaPct)}`
                      : `${n(rotationDeltas.marginBest, 0)} TL`}
                  </p>
                </div>
              </div>
            )}
            {best && (
              <div className="mt-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setInputs({ rotation: [...best.crops] })}
                  className="btn btn-primary btn-sm w-full justify-center"
                >
                  <Icon name="check" size={15} />
                  <span>
                    {lang === "tr"
                      ? "Bu 3 Yıllık Planı Arazime Uygula"
                      : "Apply This 3-Year Plan to My Parcel"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </article>

        {/* COL 3: Verim ve Kârlılık Analizi (Upgraded Real Data + P10-P90 Chart + Breakdown Table + Price Calibration) */}
        <article id="analiz-grafikler" className="bento-card p-5">
          {res && best && currentPlan ? (
            <YieldProfitabilityPanel
              res={res}
              best={best}
              currentPlan={currentPlan}
              effectiveAreaDa={effectiveAreaDa}
              lang={lang}
              n={n}
              L={L}
              onOpenEvidence={scrollToEvidence}
            />
          ) : (
            <div className="skel h-80" />
          )}
        </article>
      </section>

      {/* ── ROW 3.25: 18-Mahsul Biyofiziksel Yetişme Gereksinimleri ve Parsel Uyum Öğrenme Matrisi ── */}
      <CropRequirementsMatrix
        parcelInput={parcelBiophysicalInput}
        provinceName={masterProvince.province.kimlik_ve_cografya.il_adi}
        currentRotation={store.inputs.rotation}
        onAssignCropToYear={(yrIdx, cropId) => assignCropYear(cropId, yrIdx)}
      />

      {/* ── ROW 3.5: Monthly Water Balance Climograph & 24-Year Historical Performance Strip ── */}
      {climateSum && best && (
        <section
          aria-label={lang === "tr" ? "Aylık Su Dengesi ve Tarihsel İklim Performansı" : "Monthly Water Balance & Historical Climate Performance"}
          className="bento-card p-5"
        >
          <MonthlyWaterBalanceChart climateSum={climateSum} best={best} lang={lang} n={n} />
          <HistoricalWindowStrip best={best} lang={lang} n={n} />
        </section>
      )}

      {/* ── ROW 4: Risk Simülasyonları (Left ~58%) + Açıklanabilir Karar Dayanağı XAI (Right ~42%) ── */}
      <section
        id="risk-simulasyonlari"
        aria-label={lang === "tr" ? "Risk Simülasyonları ve Bilimsel Gerekçe" : "Risk Simulations & Scientific Explanation"}
        className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)]"
      >
        {/* LEFT: Risk Simülasyonları */}
        <article className="bento-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="relative hidden size-10 shrink-0 overflow-hidden rounded-xl border border-line sm:block">
                <Image
                  src={IMAGES.gsScenario.src}
                  alt={L(IMAGES.gsScenario.alt)}
                  fill
                  sizes="40px"
                  placeholder="blur"
                  blurDataURL={IMAGES.gsScenario.blurDataURL}
                  className="object-cover"
                />
              </div>
              <div>
                <h2 className="font-display text-[18px] font-semibold text-ink flex items-center gap-1.5">
                  <span>{lang === "tr" ? "Risk Simülasyonları" : "Climate & Market Risk Simulations"}</span>
                  <TermTooltip termId="p10_p50_p90" />
                </h2>
                <p className="text-[12.5px] text-ink-2">
                  {lang === "tr"
                    ? "Farklı iklim ve piyasa senaryolarında 3 yıllık üretiminiz nasıl etkilenir? (Senaryoya tıklayarak canlı uygulayın)"
                    : "How does your 3-year production respond to climate and price shocks? (Click any row to apply live)"}
                </p>
              </div>
            </div>
            {(store.scenario.rainMultiplier !== 1 || store.scenario.tempDeltaC !== 0 || store.scenario.priceMultiplier !== 1) && (
              <button
                type="button"
                onClick={() =>
                  setStore({
                    scenario: { preset: "typical", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 },
                  })
                }
                className="rounded-lg border border-accent bg-[#e6f4ea] px-2.5 py-1 text-[11.5px] font-semibold text-[#1e6b34]"
              >
                {lang === "tr" ? "Normal Senaryoya Dön" : "Reset to Baseline"}
              </button>
            )}
          </div>

          {riskSimulationData ? (
            <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              {/* Left Table: Senaryo | Verim Değişimi | Kâr Değişimi */}
              <div className="overflow-x-auto rounded-xl border border-line">
                <table className="w-full text-left text-[13px]">
                  <thead className="border-b border-line bg-bg/90 text-[12px] font-semibold text-ink-2">
                    <tr>
                      <th className="px-3.5 py-2.5">{lang === "tr" ? "Senaryo" : "Scenario"}</th>
                      <th className="px-3 py-2.5 text-right">{lang === "tr" ? "Verim Değişimi" : "Yield Δ"}</th>
                      <th className="px-3.5 py-2.5 text-right">{lang === "tr" ? "Kâr Değişimi" : "Margin Δ"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {riskSimulationData.rows.map((r) => (
                      <tr
                        key={r.id}
                        onClick={r.apply}
                        className="cursor-pointer transition-colors hover:bg-surface-2/60"
                        title={lang === "tr" ? "Bu senaryoyu canlı uygula" : "Apply this scenario live"}
                      >
                        <td className="px-3.5 py-3 font-medium text-ink">
                          <span className="flex items-center gap-2">
                            <Icon name={r.icon} size={17} className={r.tone} />
                            <span>{lang === "tr" ? r.labelTr : r.labelEn}</span>
                          </span>
                        </td>
                        <td
                          className={`numeral px-3 py-3 text-right text-[14.5px] ${
                            r.yieldDeltaPct < 0
                              ? "text-bad"
                              : r.yieldDeltaPct > 0
                                ? "text-[#1e6b34]"
                                : "text-ink-2"
                          }`}
                        >
                          {r.yieldDeltaPct === 0
                            ? "0%"
                            : `${r.yieldDeltaPct > 0 ? "+" : ""}%${Math.abs(r.yieldDeltaPct)}`}
                        </td>
                        <td
                          className={`numeral px-3.5 py-3 text-right text-[14.5px] ${
                            r.marginDeltaPct < 0
                              ? "text-bad"
                              : r.marginDeltaPct > 0
                                ? "text-[#1e6b34]"
                                : "text-ink-2"
                          }`}
                        >
                          {r.marginDeltaPct === 0
                            ? "0%"
                            : `${r.marginDeltaPct > 0 ? "+" : ""}%${Math.abs(r.marginDeltaPct)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Right Horizontal Bar Comparison: Senaryo Karşılaştırması (3 Yıllık Toplam Kâr) */}
              <div className="flex flex-col justify-between rounded-xl border border-line bg-bg/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">
                    {lang === "tr"
                      ? "Senaryo Karşılaştırması (3 Yıllık Toplam Kâr)"
                      : "Scenario Comparison (3-Year Total Margin)"}
                  </p>
                  <span className="font-mono text-[10.5px] text-ink-2">
                    {n(effectiveAreaDa, 0)} da × 3 yıl
                  </span>
                </div>
                <div className="mt-3 space-y-2.5">
                  {(() => {
                    const maxVal = Math.max(1, ...riskSimulationData.bars.map((b) => Math.abs(b.totalTL)));
                    const baseVal = Math.max(0, riskSimulationData.bars[0]?.totalTL ?? 0);
                    const basePct = Math.min(100, Math.round((baseVal / maxVal) * 100));
                    return riskSimulationData.bars.map((b) => {
                      const wPct = Math.max(12, Math.min(100, Math.round((Math.max(0, b.totalTL) / maxVal) * 100)));
                      const perDaYr = Math.round(b.totalTL / Math.max(1, effectiveAreaDa * 3));
                      return (
                        <div key={b.id} className="space-y-1">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="font-medium text-ink-2">{lang === "tr" ? b.labelTr : b.labelEn}</span>
                            <span className="font-mono text-[12px] text-ink">
                              <strong className="numeral text-[13.5px]">{n(b.totalTL, 0)} ₺</strong>{" "}
                              <span className="text-[10.5px] text-ink-2">({n(perDaYr, 0)} ₺/da/yıl)</span>
                            </span>
                          </div>
                          <div className="relative h-3.5 w-full overflow-hidden rounded-md bg-surface-2">
                            <div
                              className="h-full rounded-md transition-all duration-300"
                              style={{ width: `${wPct}%`, backgroundColor: b.color }}
                            />
                            {basePct > 15 && basePct < 98 && (
                              <div
                                className="pointer-events-none absolute inset-y-0 w-0.5 bg-ink/40"
                                style={{ left: `${basePct}%` }}
                                title={lang === "tr" ? "Önerilen Plan Referansı" : "Recommended Plan Baseline"}
                              />
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          ) : (
            <div className="skel mt-4 h-48" />
          )}
        </article>

        {/* RIGHT: Bu Plan Neden Öne Çıktı? (1. Sonuç Cümlesi -> 2. Veri Kaynağı -> 3. Varsayım) */}
        <article className="bento-card flex flex-col justify-between p-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
                  <Icon name="evidence" size={18} />
                </span>
                <div>
                  <h2 className="font-display text-[18px] font-semibold text-ink flex items-center gap-1.5">
                    <span>{lang === "tr" ? "Bu plan neden öne çıktı?" : "Why did this plan stand out?"}</span>
                    <TermTooltip termId="confidence_grade" />
                  </h2>
                  <p className="text-[12.5px] text-ink-2">
                    {lang === "tr"
                      ? "1. Sonuç özeti · 2. Veri kaynağı · 3. Varsayım ve model yöntemi"
                      : "1. Outcome summary · 2. Data source · 3. Assumption & model method"}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-[#e6f4ea] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#1e6b34]">
                XAI
              </span>
            </div>

            {best ? (
              <div className="mt-4 space-y-3">
                {/* 1. Single Sentence Explaining the Outcome First */}
                <div className="rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] p-3.5 text-[13px] leading-relaxed text-[#14532d]">
                  <p className="font-mono text-[11px] font-bold uppercase text-[#166534]">
                    {lang === "tr" ? "1. Sonuç Özeti (Tek Cümle)" : "1. Outcome Summary (Single Sentence)"}
                  </p>
                  <p className="mt-1 font-medium">
                    {best.narrative
                      ? L(best.narrative.verdict)
                      : lang === "tr"
                        ? `Önerilen plan (${best.crops.map((c) => L(CROPS[c].name)).join(" → ")}), seçili su bütçesi altında dekar başına yılda medyan ${n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} ₺ senaryo çıktısı ve ${n(best.soilHealth.score, 0)}/100 toprak sağlığı model göstergesi üretir.`
                        : `The recommended plan (${best.crops.map((c) => L(CROPS[c].name)).join(" → ")}) delivers a median scenario output of ${n(best.economics.grossMarginTLPerDaPerYr?.p50 ?? 0, 0)} TL/da/yr and a ${n(best.soilHealth.score, 0)}/100 soil health model indicator under your selected water budget.`}
                  </p>
                </div>

                {/* 2. Data Source */}
                <div className="rounded-xl border border-line bg-bg/70 p-3 text-[12.5px] leading-relaxed text-ink">
                  <p className="font-mono text-[11px] font-bold uppercase text-[#0277bd]">
                    {lang === "tr" ? "2. Veri Kaynağı" : "2. Data Source"}
                  </p>
                  <p className="mt-1 text-ink-2">
                    {lang === "tr"
                      ? "NASA POWER / MERRA-2 günlük meteoroloji serisi (2001–2024: sıcaklık, yağış, radyasyon, rüzgâr ve GWETROOT kök bölgesi nem tahmini — doğrudan SMAP parsel ölçümü değildir), ISRIC SoilGrids 250m (0–200 cm 6 derinlik profili), NASA SRTM 30m DEM, FAO-56 / TAGEM ürün katsayıları (Kc, Ky) ve 2025/2026 TMO–TÜİK referans fiyatları."
                      : "NASA POWER / MERRA-2 daily meteorology (2001–2024: temperature, rainfall, radiation, wind, and GWETROOT root-zone wetness estimate — not a direct SMAP parcel sensor measurement), ISRIC SoilGrids 250m (0–200 cm 6-depth profile), NASA SRTM 30m DEM, FAO-56 / TAGEM crop coefficients (Kc, Ky), and 2025/2026 TMO–TÜİK reference prices."}
                  </p>
                </div>

                {/* 3. Assumption */}
                <div className="rounded-xl border border-line bg-bg/70 p-3 text-[12.5px] leading-relaxed text-ink">
                  <p className="font-mono text-[11px] font-bold uppercase text-[#b45309]">
                    {lang === "tr" ? "3. Varsayım ve Yöntem" : "3. Assumption & Method"}
                  </p>
                  <p className="mt-1 text-ink-2">
                    {lang === "tr"
                      ? "1,5 m kök kolonunda FAO-56 Penman–Monteith günlük su dengesi ve Saxton–Rawls (2006) pedotransfer denklemleri uygulanır. Kurak senaryoda (prepareClimate) 24 yıllık günlük yağış serisi 0,75 ile çarpılır (−%25 yağış); sıcak-kurak senaryoda buna ek olarak günlük Tmin/Tmax +2 °C artırılıp sabit bağıl nemde ET₀ yeniden hesaplanır. Ekonomik P10–P90 aralıkları 22 dönemin senaryo çıktısıdır; toprak sağlığı puanı (0–100) ise bir model göstergesidir."
                      : "FAO-56 Penman–Monteith daily water balance and Saxton–Rawls (2006) pedotransfer equations in a 1.5 m root column. Under the drought scenario (prepareClimate), every daily precipitation value is multiplied by 0.75 (−25% rain); under hot-dry, +2 °C is also added to daily Tmin/Tmax and ET₀ is recomputed at constant relative humidity. Economic P10–P90 ranges are scenario outputs across 22 windows; the soil health score (0–100) is a model indicator."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="skel mt-4 h-44" />
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2 pt-2">
            <button
              type="button"
              onClick={scrollToEvidence}
              className="btn btn-primary flex-1 justify-center"
            >
              <Icon name="evidence" size={16} />
              <span>{lang === "tr" ? "Formülleri ve Dayanakları Aç" : "Show Formulas & Foundations"}</span>
            </button>
            <Link href="/dayanak" className="btn justify-center">
              <span>{lang === "tr" ? "Tam Rapor" : "Full Report"}</span>
            </Link>
          </div>
        </article>
      </section>

      {/* ── ROW 5: Kanıtlar, Formüller ve Hesaplama Dayanakları (Live Equations & Provenance) ── */}
      {res && best && currentPlan && (
        <EvidenceFoundations res={res} best={best} currentPlan={currentPlan} lang={lang} n={n} L={L} />
      )}

      {/* ── ROW 5: Detailed Field & Sensor Diagnostics (Preserves all 11 granular FieldPanel cards) ── */}
      <section className="bento-card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-[#e6f4ea] text-[#1e6b34]">
              <Icon name="sliders" size={18} />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-semibold text-ink">
                {lang === "tr"
                  ? "Detaylı Toprak Katmanları (0–200 cm), İklim Serisi, Don Tarihleri ve Sulama Kalibrasyonu"
                  : "Detailed Soil Layers (0–200 cm), Climate Series, Frost Dates & Irrigation Calibration"}
              </h2>
              <p className="text-[12.5px] text-ink-2">
                {lang === "tr"
                  ? "SoilGrids 6 derinlik profili, ERA5-Land yağış çapraz kontrolü, MODIS 16 günlük NDVI serisi ve sulama bütçesi ayarları."
                  : "SoilGrids 6-depth profile, ERA5-Land rainfall cross-check, MODIS 16-day NDVI series and irrigation budget controls."}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm"
            aria-expanded={detailsOpen}
            onClick={() => setDetailsOpen((v) => !v)}
          >
            <span>
              {detailsOpen
                ? lang === "tr" ? "Detaylı Kartları Daralt" : "Collapse Detailed Cards"
                : lang === "tr" ? "Tüm Bilimsel Kartları Aç (11 Kart)" : "Expand All Scientific Cards (11 Cards)"}
            </span>
            <Icon name={detailsOpen ? "chevron-down" : "chevron-right"} size={16} />
          </button>
        </div>

        {detailsOpen && (
          <div className="bg-surface">
            <FieldPanel
              onDraw={() => {
                setMode("polygon");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onPin={() => {
                setMode("pin");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              onPilot={choosePilot}
              onSave={saveField}
              onOpenSaved={(id) => {
                const s = store.saved.find((x) => x.id === id);
                if (s) setField(s);
              }}
              onRemoveSaved={removeSaved}
              onCells={() => updateLayers({ cells: !layerState.cells })}
              cellsOn={layerState.cells}
              onDismissHint={() => setStore({ hintDismissed: true })}
              onImport={() => fileRef.current?.click()}
              onExport={exportGeo}
            />
          </div>
        )}
      </section>
        </>
      )}

      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      {pinAt && <PinDialog onCancel={() => setPinAt(null)} onDone={pinCommit} />}
      {coordOpen && (
        <CoordDialog
          center={view?.center ?? null}
          onCancel={() => setCoordOpen(false)}
          onRing={(ring) => {
            setCoordOpen(false);
            commit(ring, "polygon");
            setTimeout(() => mapRef.current?.fitRing(ring), 50);
          }}
          onPin={(p) => {
            setCoordOpen(false);
            mapRef.current?.flyTo(p, 16);
            setPinAt(p);
          }}
        />
      )}
    </div>
  );
}

/** Pure helper computing top 3 distinct crop recommendations from engine output, weighted by water-yield fit, composite score, and positive margin. */
function computeTopCropRecommendations(
  res: ReturnType<typeof useFieldData>["analysis"]["result"],
) {
  if (!res) return [];
  const byCrop = new Map<
    CropId,
    { score: number; margin: number; water: number; yieldKgDa: number; count: number }
  >();
  const pool = [...res.alternatives, ...res.userPlans, res.current];
  for (const pl of pool) {
    for (const yr of pl.years) {
      if (yr.cropId === "fallow") continue;
      const yrRatio = yr.yieldRatio?.p50 ?? 0.75;
      const comp = pl.score.composite / 100;
      const margin = Math.round(yr.grossMarginTLPerDa?.p50 ?? 0);
      const yieldKgDa = Math.round((yr.yieldTHa?.p50 ?? CROPS[yr.cropId].refYieldTHa.value.rainfed) * 100);
      const marginNorm = Math.max(0, Math.min(1, (margin + 500) / 6500));
      const suit = Math.min(
        97,
        Math.max(52, Math.round((yrRatio * 0.45 + comp * 0.35 + marginNorm * 0.2) * 100)),
      );
      const prev = byCrop.get(yr.cropId);
      const water = yr.irrigationNetMm?.p50 ?? 0;
      if (!prev || (margin > 0 && suit > prev.score) || (prev.margin <= 0 && margin > prev.margin)) {
        byCrop.set(yr.cropId, {
          score: suit,
          margin,
          water,
          yieldKgDa,
          count: (prev?.count ?? 0) + 1,
        });
      }
    }
  }
  if (byCrop.size < 4 && res.candidates.length > 0) {
    const sorted = [...res.candidates]
      .filter((c) => c.grossMarginTLPerDaPerYr > 0)
      .sort((a, b) => b.composite - a.composite)
      .slice(0, 30);
    for (const c of sorted) {
      for (const cid of c.crops) {
        if (cid === "fallow" || byCrop.has(cid)) continue;
        const def = CROPS[cid];
        const suit = Math.min(94, Math.max(55, Math.round(c.composite)));
        const estYieldKgDa = Math.round(
          (res.scenario.budgetNetMm > 0 ? def.refYieldTHa.value.irrigated * 0.82 : def.refYieldTHa.value.rainfed) * 100,
        );
        byCrop.set(cid, {
          score: suit,
          margin: Math.round(c.grossMarginTLPerDaPerYr),
          water: c.requirementMmPerYr,
          yieldKgDa: estYieldKgDa,
          count: 1,
        });
      }
    }
  }
  return [...byCrop.entries()]
    .sort((a, b) => {
      // Always rank positive-margin crops ahead of non-positive ones
      if ((a[1].margin > 0) !== (b[1].margin > 0)) return b[1].margin > 0 ? 1 : -1;
      return b[1].score - a[1].score;
    })
    .slice(0, 3)
    .map(([cropId, info]) => ({
      cropId,
      def: CROPS[cropId],
      suitabilityPct: info.score,
      marginTLPerDa: info.margin,
      waterMm: info.water,
      yieldKgDa: info.yieldKgDa,
    }));
}

/** Latest store value, read in event handlers (not during render). */
function currentField(): ActiveField | null {
  return getStore().field;
}

function ToolButton({
  icon,
  label,
  pressed,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
        pressed ? "bg-accent text-on-accent" : "text-plate-ink hover:bg-surface-2"
      } disabled:opacity-40`}
      aria-label={label}
      title={label}
      aria-pressed={pressed === undefined ? undefined : pressed}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name={icon} size={19} />
    </button>
  );
}

function LocateButton({ onPlace }: { onPlace: (p: LonLat) => void }) {
  const { t, n } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "err">("idle");
  const [acc, setAcc] = useState<number | null>(null);
  return (
    <div className="relative">
      <button
        type="button"
        className="plate flex h-11 items-center gap-1.5 px-3 text-[13px] font-semibold"
        aria-busy={state === "busy"}
        onClick={() => {
          if (!navigator.geolocation) {
            setState("err");
            return;
          }
          setState("busy");
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setState("idle");
              setAcc(pos.coords.accuracy);
              onPlace({ lat: pos.coords.latitude, lon: pos.coords.longitude });
            },
            () => setState("err"),
            { enableHighAccuracy: true, timeout: 15_000 },
          );
        }}
      >
        <Icon name="locate" size={17} />
        <span className="hidden sm:inline">{t("loc.use")}</span>
      </button>
      {(state === "err" || (acc !== null && acc > 100)) && (
        <p className="plate absolute right-0 top-12 w-64 p-2.5 text-[12.5px]" role="status">
          {state === "err" ? t("loc.err") : t("loc.coarse", { m: n(acc ?? 0) })}
        </p>
      )}
    </div>
  );
}
