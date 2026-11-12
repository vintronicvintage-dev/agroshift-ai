/**
 * Rotation optimiser (spec §4.6).
 *
 * 1. Enumerate all n³ three-year sequences over the candidate crops.
 * 2. Hard constraints: excluded/candidate set, max consecutive (2; sugar beet & sunflower 1),
 *    calendar conflicts, climate suitability (GDD, frost window).
 * 3. Screen every feasible sequence over every historical window with the cached piece model.
 * 4. Replay the shortlist (best screening composite + screening Pareto front + current + user plans) exactly.
 * 5. Rank on exact metrics with the farmer's priority weights; pick 3 diverse alternatives.
 */
import type {
  ClimateZone, ConstraintCode, ConstraintViolation, CropId, PlanScore, PriorityWeights, RotationSequence, SoilHealthResult,
} from "../types";
import { CROPS } from "../crops/database";
import { scheduleSequence, type SequenceSchedule } from "../crops/calendar";
import { staticViolations } from "../crops/rules";
import type { CropSuitability } from "./suitability";
import { soilHealth } from "./soilHealth";
import { type EvalContext, type PlanMetrics, type WindowSummary, evaluateExact, evaluateScreening, planMetrics } from "./evaluation";
import { Screener } from "./screening";

export const DEFAULT_PRIORITIES: PriorityWeights = { water: 0.25, income: 0.25, soil: 0.25, risk: 0.25 };
export const DEFAULT_SHORTLIST = 40;
const MAX_SCREEN_PARETO = 40;

export interface PlanRecord {
  id: string;
  crops: RotationSequence;
  schedule: SequenceSchedule;
  violations: ConstraintViolation[];
  feasible: boolean;
  soil: SoilHealthResult;
  screening: PlanMetrics | null;
  exact: { windows: WindowSummary[]; metrics: PlanMetrics | null } | null;
  score: PlanScore | null;
  screeningScore: number;
  paretoScreening: boolean;
  paretoExact: boolean;
}

export function planId(seq: readonly CropId[]): string {
  return seq.join(">");
}

export function normalizePriorities(p?: Partial<PriorityWeights>): PriorityWeights {
  const w = { ...DEFAULT_PRIORITIES, ...(p ?? {}) };
  for (const k of Object.keys(w) as (keyof PriorityWeights)[]) w[k] = Math.max(0, Number.isFinite(w[k]) ? w[k] : 0);
  const s = w.water + w.income + w.soil + w.risk;
  if (s <= 0) return { ...DEFAULT_PRIORITIES };
  return { water: w.water / s, income: w.income / s, soil: w.soil / s, risk: w.risk / s };
}

function suitabilityViolations(seq: RotationSequence, suit: Record<CropId, CropSuitability>): ConstraintViolation[] {
  const v: ConstraintViolation[] = [];
  const done = new Set<CropId>();
  seq.forEach((c, i) => {
    if (done.has(c)) return;
    done.add(c);
    const s = suit[c];
    const n = CROPS[c].name;
    for (const r of s.reasons) {
      if (r === "gdd_insufficient") {
        v.push({ code: r, cropId: c, year: i + 1, text: {
          tr: `${n.tr}: medyan GDD ${Math.round(s.medianGdd ?? 0)} < gereken ${s.requiredGdd}`,
          en: `${n.en}: median GDD ${Math.round(s.medianGdd ?? 0)} < required ${s.requiredGdd}` } });
      } else {
        v.push({ code: r, cropId: c, year: i + 1, text: {
          tr: `${n.tr}: yılların %${Math.round((s.frostYearShare ?? 0) * 100)}'inde kritik evrede don`,
          en: `${n.en}: damaging frost in the critical stage in ${Math.round((s.frostYearShare ?? 0) * 100)} % of years` } });
      }
    }
  });
  return v;
}

/** Build a plan record (schedule + constraints + soil health). */
export function makeRecord(
  seq: RotationSequence, zone: ClimateZone, suit: Record<CropId, CropSuitability>,
  excluded: ReadonlySet<CropId>, candidates: ReadonlySet<CropId>, slopePct?: number | null,
): PlanRecord {
  const schedule = scheduleSequence(seq, zone);
  const violations = [...staticViolations(seq, schedule, excluded, candidates), ...suitabilityViolations(seq, suit)];
  return {
    id: planId(seq), crops: seq, schedule, violations, feasible: violations.length === 0,
    soil: soilHealth(seq, schedule, slopePct), screening: null, exact: null, score: null,
    screeningScore: 0, paretoScreening: false, paretoExact: false,
  };
}

interface Objectives { water: number; income: number; soil: number; risk: number }

function objectives(r: PlanRecord, m: PlanMetrics): Objectives {
  return { water: m.requirementP50, income: m.marginP50, soil: r.soil.score, risk: m.risk.score };
}

/** Min–max normalised, higher-is-better components and composite (0–100). */
export function scorePlans(items: { r: PlanRecord; m: PlanMetrics }[], w: PriorityWeights): PlanScore[] {
  const objs = items.map(({ r, m }) => objectives(r, m));
  const range = (k: keyof Objectives) => {
    let lo = Infinity, hi = -Infinity;
    for (const o of objs) { lo = Math.min(lo, o[k]); hi = Math.max(hi, o[k]); }
    return { lo, hi };
  };
  const R = { water: range("water"), income: range("income"), soil: range("soil"), risk: range("risk") };
  const norm = (k: keyof Objectives, v: number, lowerBetter: boolean) => {
    const { lo, hi } = R[k];
    if (!(hi - lo > 1e-9)) return 0.5;
    const x = (v - lo) / (hi - lo);
    return lowerBetter ? 1 - x : x;
  };
  return objs.map((o) => {
    const components = {
      water: norm("water", o.water, true),
      income: norm("income", o.income, false),
      soil: norm("soil", o.soil, false),
      risk: norm("risk", o.risk, true),
    };
    const composite = 100 * (w.water * components.water + w.income * components.income + w.soil * components.soil + w.risk * components.risk);
    return { composite, components, weights: { ...w } };
  });
}

/** Non-dominated set on (requirement ↓, margin ↑, soil ↑). Returns flags. */
export function paretoFlags(points: { req: number; margin: number; soil: number }[]): boolean[] {
  const n = points.length;
  const flags = new Array<boolean>(n).fill(true);
  for (let i = 0; i < n; i++) {
    const a = points[i];
    for (let j = 0; j < n && flags[i]; j++) {
      if (i === j) continue;
      const b = points[j];
      const geq = b.req <= a.req && b.margin >= a.margin && b.soil >= a.soil;
      const strict = b.req < a.req || b.margin > a.margin || b.soil > a.soil;
      if (geq && strict) flags[i] = false;
    }
  }
  return flags;
}

function cyclicShifts(seq: readonly CropId[]): string[] {
  return [0, 1, 2].map((s) => planId([seq[s], seq[(s + 1) % 3], seq[(s + 2) % 3]]));
}
function hamming(a: readonly CropId[], b: readonly CropId[]): number {
  return (a[0] !== b[0] ? 1 : 0) + (a[1] !== b[1] ? 1 : 0) + (a[2] !== b[2] ? 1 : 0);
}

const cropSet = (seq: readonly CropId[]) => [...seq].sort().join("+");

/**
 * Pick up to `k` diverse plans, best first. Never the current plan or a cyclic shift of it or of
 * a chosen plan. Strictest level first: a different crop multiset and Hamming distance ≥ 2 from
 * every chosen plan; relaxed to Hamming ≥ 2, then ≥ 1 only if too few plans qualify.
 */
export function pickDiverse(sorted: PlanRecord[], current: RotationSequence, k = 3): PlanRecord[] {
  const curShifts = new Set(cyclicShifts(current));
  const levels = [{ set: true, h: 2 }, { set: false, h: 2 }, { set: false, h: 1 }];
  let best: PlanRecord[] = [];
  for (const lv of levels) {
    const chosen: PlanRecord[] = [];
    const blocked = new Set<string>(curShifts);
    for (const r of sorted) {
      if (chosen.length >= k) break;
      if (blocked.has(r.id)) continue;
      if (chosen.some((c) => hamming(c.crops, r.crops) < lv.h || (lv.set && cropSet(c.crops) === cropSet(r.crops)))) continue;
      chosen.push(r);
      for (const s of cyclicShifts(r.crops)) blocked.add(s);
    }
    if (chosen.length > best.length) best = chosen;
    if (chosen.length >= k) return chosen;
  }
  return best;
}

export interface OptimizeInput {
  ev: EvalContext;
  zone: ClimateZone;
  suitability: Record<CropId, CropSuitability>;
  candidates: CropId[];
  excluded: CropId[];
  current: RotationSequence;
  extraPlans: RotationSequence[];
  priorities: PriorityWeights;
  slopePct?: number | null;
  shortlistSize?: number;
}

export interface OptimizeOutput {
  current: PlanRecord;
  alternatives: PlanRecord[];
  userPlans: PlanRecord[];
  /** Every feasible enumerated record (screening metrics; exact when replayed). */
  feasible: PlanRecord[];
  exactSet: PlanRecord[];
  enumerated: number;
  infeasibleByReason: Partial<Record<ConstraintCode, number>>;
  pieceSimulations: number;
}

export function optimize(input: OptimizeInput): OptimizeOutput {
  const { ev, zone, suitability, priorities } = input;
  const excluded = new Set(input.excluded);
  // Excluded crops stay in the enumeration so the report shows how many sequences they remove.
  const candidates = new Set(input.candidates);
  const pool = [...candidates];
  const all: PlanRecord[] = [];
  const infeasibleByReason: Partial<Record<ConstraintCode, number>> = {};
  for (const a of pool) for (const b of pool) for (const c of pool) {
    const r = makeRecord([a, b, c], zone, suitability, excluded, candidates, input.slopePct);
    if (!r.feasible) {
      const codes = new Set(r.violations.map((v) => v.code));
      for (const code of codes) infeasibleByReason[code] = (infeasibleByReason[code] ?? 0) + 1;
    }
    all.push(r);
  }
  const feasible = all.filter((r) => r.feasible);

  // Screening
  const screener = new Screener(ev.setup);
  const screened: { r: PlanRecord; m: PlanMetrics }[] = [];
  for (const r of feasible) {
    r.screening = planMetrics(evaluateScreening(ev, screener, r.schedule));
    if (r.screening) screened.push({ r, m: r.screening });
  }
  const sScores = scorePlans(screened, priorities);
  screened.forEach((x, i) => { x.r.screeningScore = sScores[i].composite; });
  const sPareto = paretoFlags(screened.map(({ r, m }) => ({ req: m.requirementP50, margin: m.marginP50, soil: r.soil.score })));
  screened.forEach((x, i) => { x.r.paretoScreening = sPareto[i]; });

  // Shortlist
  const byScore = [...screened].sort((a, b) => b.r.screeningScore - a.r.screeningScore || a.r.id.localeCompare(b.r.id));
  const shortlist = new Map<string, PlanRecord>();
  for (const x of byScore.slice(0, input.shortlistSize ?? DEFAULT_SHORTLIST)) shortlist.set(x.r.id, x.r);
  for (const x of byScore.filter((y) => y.r.paretoScreening).slice(0, MAX_SCREEN_PARETO)) shortlist.set(x.r.id, x.r);

  const byId = new Map(all.map((r) => [r.id, r]));
  const getOrMake = (seq: RotationSequence) =>
    byId.get(planId(seq)) ?? makeRecord(seq, zone, suitability, excluded, candidates, input.slopePct);
  const current = getOrMake(input.current);
  const userPlans = input.extraPlans.map(getOrMake);

  const exactSet = new Map<string, PlanRecord>(shortlist);
  exactSet.set(current.id, current);
  for (const u of userPlans) exactSet.set(u.id, u);
  for (const r of exactSet.values()) {
    const windows = evaluateExact(ev, r.schedule);
    r.exact = { windows, metrics: planMetrics(windows) };
  }
  const scored = [...exactSet.values()].filter((r) => r.exact?.metrics).map((r) => ({ r, m: r.exact!.metrics! }));
  const scores = scorePlans(scored, priorities);
  scored.forEach((x, i) => { x.r.score = scores[i]; });
  const eParetoPool = scored.filter((x) => x.r.feasible || x.r.id === current.id);
  const eFlags = paretoFlags(eParetoPool.map(({ r, m }) => ({ req: m.requirementP50, margin: m.marginP50, soil: r.soil.score })));
  eParetoPool.forEach((x, i) => { x.r.paretoExact = eFlags[i]; });

  const ranked = scored.filter((x) => x.r.feasible && shortlist.has(x.r.id))
    .map((x) => x.r)
    .sort((a, b) => (b.score!.composite - a.score!.composite) || a.id.localeCompare(b.id));
  const alternatives = pickDiverse(ranked, input.current, 3);

  return {
    current, alternatives, userPlans, feasible, exactSet: [...exactSet.values()],
    enumerated: all.length, infeasibleByReason, pieceSimulations: screener.pieceSimulations,
  };
}
