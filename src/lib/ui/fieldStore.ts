"use client";

/**
 * The one persistent "Tarla" object shared by every route (Tarla, Ekim nöbeti, Dayanak, Yöntem):
 * the selected geometry, the farmer's answers, scenario, prices, custom plans and saved fields.
 * A tiny external store (useSyncExternalStore) so it survives client navigation; mirrored to
 * localStorage (every access in try/catch). Server and hydration render the defaults.
 */
import { useSyncExternalStore } from "react";
import type { CropId, PriorityWeights, RotationSequence } from "@/lib/types";
import type { LonLat } from "@/lib/data/fieldTypes";
import { PILOTS } from "@/lib/data/pilots";
import { describeRing, rectangleRing, type Ring } from "./geo";

export type ShapeKind = "polygon" | "rectangle" | "circle" | "pin";

export interface ActiveField {
  id: string;
  name: string;
  kind: ShapeKind;
  ring: Ring;
  /** Circle / pin centre and radius when drawn that way. */
  center?: LonLat;
  radiusM?: number;
  /** Geodesic area of the ring, dekar. */
  areaDa: number;
  pilotId: string | null;
  createdAt: string;
}

export type IrrigationMethod = "furrow" | "sprinkler" | "drip";
export const METHOD_EFF: Record<IrrigationMethod, number> = { furrow: 0.6, sprinkler: 0.75, drip: 0.9 };

export interface PlanInputs {
  rainfed: boolean;
  /** Net irrigation water per year, m³/da (= mm = ton/da). */
  budget: number;
  method: IrrigationMethod;
  rotation: RotationSequence;
  priorities: PriorityWeights;
  excluded: CropId[];
  /** Area typed by the farmer (dekar) instead of the drawn area. */
  areaOverrideDa: number | null;
}

export type PrecipChoice = { mode: "none" } | { mode: "reference" } | { mode: "station"; mm: number };

export type ScenarioPreset = "typical" | "dry" | "hot_dry" | "custom";
export interface ScenarioState {
  preset: ScenarioPreset;
  rainMultiplier: number;
  tempDeltaC: number;
  priceMultiplier: number;
}

export interface EconDraft {
  crops: Partial<Record<CropId, { price?: string; cost?: string }>>;
  water: string;
}

export interface SoilOverride {
  sand: number;
  silt: number;
  clay: number;
  soc: number | null;
  ph: number | null;
}

export interface StoreState {
  v: 3;
  field: ActiveField | null;
  saved: ActiveField[];
  inputs: PlanInputs;
  precip: PrecipChoice;
  scenario: ScenarioState;
  econ: EconDraft;
  extraPlans: RotationSequence[];
  soil: SoilOverride | null;
  view: "farmer" | "engineer";
  hintDismissed: boolean;
  /** Plan the builder currently edits. */
  builder: RotationSequence;
}

/** 1 irrigation ≈ 60 ton/da: a labelled UI assumption used only to translate m³/da into "kaç sulama". */
export const TON_PER_IRRIGATION = 60;

export const DEFAULT_INPUTS: PlanInputs = {
  rainfed: false,
  budget: 250,
  method: "sprinkler",
  rotation: ["wheat_winter", "fallow", "wheat_winter"],
  priorities: { water: 5, income: 5, soil: 5, risk: 5 },
  excluded: [],
  areaOverrideDa: null,
};

export const DEFAULT_SCENARIO: ScenarioState = { preset: "typical", rainMultiplier: 1, tempDeltaC: 0, priceMultiplier: 1 };

const DEFAULT: StoreState = {
  v: 3,
  field: null,
  saved: [],
  inputs: DEFAULT_INPUTS,
  precip: { mode: "none" },
  scenario: DEFAULT_SCENARIO,
  econ: { crops: {}, water: "" },
  extraPlans: [],
  soil: null,
  view: "farmer",
  hintDismissed: false,
  builder: ["wheat_winter", "chickpea", "barley_winter"],
};

const KEY = "agroshift.v3";
const listeners = new Set<() => void>();
let state: StoreState | null = null;

function load(): StoreState {
  if (state) return state;
  let s: StoreState = DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<StoreState>;
      if (p && p.v === 3) s = { ...DEFAULT, ...p, field: p.field?.pilotId ? null : p.field ?? null, inputs: { ...DEFAULT.inputs, ...p.inputs }, scenario: { ...DEFAULT.scenario, ...p.scenario } };
    }
  } catch {
    s = DEFAULT;
  }
  state = s;
  return s;
}

function persist(s: StoreState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the state still lives for this session */
  }
}

export function getStore(): StoreState {
  return load();
}

export function setStore(patch: Partial<StoreState> | ((s: StoreState) => Partial<StoreState>)) {
  const cur = load();
  const p = typeof patch === "function" ? patch(cur) : patch;
  state = { ...cur, ...p };
  persist(state);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      state = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): StoreState {
  return useSyncExternalStore(subscribe, load, () => DEFAULT);
}

/** True after hydration (the store then shows the saved state). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

// ── actions ──────────────────────────────────────────────────────────────

let seq = 0;
const newId = () => `f${Date.now().toString(36)}${(seq++).toString(36)}`;

export function makeField(ring: Ring, kind: ShapeKind, name: string, extra: Partial<ActiveField> = {}): ActiveField {
  return { id: newId(), name, kind, ring, areaDa: describeRing(ring).areaDa, pilotId: null, createdAt: new Date().toISOString(), ...extra };
}

export function setField(f: ActiveField | null) {
  setStore((s) => f?.id === s.field?.id
    ? { field: f }
    : { field: f, soil: null, precip: { mode: "none" }, inputs: { ...s.inputs, areaOverrideDa: null } });
}

export function updateFieldRing(ring: Ring, kind?: ShapeKind) {
  setStore((s) => (s.field ? { field: { ...s.field, ring, kind: kind ?? s.field.kind, areaDa: describeRing(ring).areaDa } } : {}));
}

export function renameField(name: string) {
  setStore((s) => (s.field ? { field: { ...s.field, name }, saved: s.saved.map((x) => (x.id === s.field!.id ? { ...x, name } : x)) } : {}));
}

export function saveField() {
  setStore((s) => {
    if (!s.field) return {};
    const rest = s.saved.filter((x) => x.id !== s.field!.id);
    return { saved: [s.field, ...rest].slice(0, 30) };
  });
}

export function removeSaved(id: string) {
  setStore((s) => ({ saved: s.saved.filter((x) => x.id !== id) }));
}

export function setInputs(p: Partial<PlanInputs>) {
  setStore((s) => ({ inputs: { ...s.inputs, ...p } }));
}

/** A sensible example polygon for a bundled pilot: a 400 m × 300 m (120 da) parcel centred on the pilot point. */
export function pilotField(id: string, lang: "tr" | "en"): ActiveField | null {
  const p = PILOTS.find((x) => x.id === id);
  if (!p) return null;
  const ring = rectangleRing({ lat: p.lat, lon: p.lon }, 400, 300);
  return makeField(ring, "rectangle", lang === "tr" ? p.nameTr : p.nameEn, { pilotId: p.id });
}

/** Compact share token: name + ring rounded to 5 decimals (about 1 m). Lives in the URL hash only. */
export function encodeField(f: ActiveField): string {
  if (f.pilotId && f.kind === "rectangle") return `ornek=${f.pilotId}`;
  const pts = f.ring.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join(";");
  return `f=${encodeURIComponent(`${f.name}|${f.kind}|${pts}`)}`;
}

export function decodeFieldHash(hash: string, lang: "tr" | "en"): ActiveField | null {
  const h = hash.replace(/^#/, "");
  const ex = h.match(/(?:^|&)ornek=([a-z-]+)/);
  if (ex) return pilotField(ex[1], lang);
  const m = h.match(/(?:^|&)f=([^&]+)/);
  if (!m) return null;
  try {
    const [name, kind, pts] = decodeURIComponent(m[1]).split("|");
    const ring = pts.split(";").map((s) => {
      const [lat, lon] = s.split(",").map(Number);
      return { lat, lon };
    });
    if (ring.length < 3 || ring.some((p) => !Number.isFinite(p.lat) || !Number.isFinite(p.lon))) return null;
    const k = (["polygon", "rectangle", "circle", "pin"] as const).find((x) => x === kind) ?? "polygon";
    return makeField(ring, k, name || "Tarla");
  } catch {
    return null;
  }
}
