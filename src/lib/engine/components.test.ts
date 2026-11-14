import { describe, it, expect } from "vitest";
import { scheduleSequence, climateZone, harvestMonthDay, sowMonthDay } from "../crops/calendar";
import { soilHealth } from "./soilHealth";
import { syntheticClimate, LOAM_SOIL } from "./testFixtures";
import { prepareClimate } from "./climate";
import { soilHydraulics } from "./soil";
import { createSetup, replayWindows } from "./rotation";
import { buildEvalContext, evaluateExact, evaluateScreening, planMetrics } from "./evaluation";
import { Screener } from "./screening";
import type { RotationSequence } from "../types";

describe("crop calendar scheduling", () => {
  it("zones by elevation and latitude", () => {
    expect(climateZone(37.57, 1010)).toBe("highland");
    expect(climateZone(36.87, 375)).toBe("south_lowland");
    expect(climateZone(41.27, 50)).toBe("north_lowland");
  });
  it("a late beet harvest delays and compresses the following winter wheat, harvest date kept", () => {
    const s = scheduleSequence(["sugar_beet", "wheat_winter", "fallow"], "highland");
    const beet = s.slots[0]!, wheat = s.slots[1]!;
    expect(harvestMonthDay(beet)).toBe("10-28");
    // Oct 28 + 10 turnaround days = Nov 7 (preferred Oct 10, latest Nov 15)
    expect(wheat.delay).toBe(28);
    expect(sowMonthDay(wheat)).toBe("11-07");
    expect(harvestMonthDay(wheat)).toBe("07-15");
    expect(wheat.stages[0]).toBe(12);
    expect(s.conflictYears).toHaveLength(0);
  });
  it("cotton harvest on the plateau is too late for winter wheat → calendar conflict", () => {
    const s = scheduleSequence(["cotton", "wheat_winter", "fallow"], "highland");
    expect(s.conflictYears).toEqual([2]);
  });
  it("fallow gives long bare periods; continuous cover gives short ones", () => {
    const wf = scheduleSequence(["wheat_winter", "fallow", "wheat_winter"], "highland");
    const wv = scheduleSequence(["wheat_winter", "vetch", "barley_winter"], "highland");
    expect(wf.bareDaysPerYear).toBeGreaterThan(wv.bareDaysPerYear + 60);
  });
});

describe("soil-health indicator", () => {
  const sc = (seq: RotationSequence) => soilHealth(seq, scheduleSequence(seq, "highland"));
  it("weights sum to 100 and components are within 0–1", () => {
    const r = sc(["wheat_winter", "chickpea", "sunflower"]);
    expect(r.components.reduce((s, c) => s + c.weight, 0)).toBe(100);
    for (const c of r.components) { expect(c.value).toBeGreaterThanOrEqual(0); expect(c.value).toBeLessThanOrEqual(1); }
  });
  it("a diverse legume rotation beats wheat monoculture-with-fallow", () => {
    const good = sc(["wheat_winter", "chickpea", "sunflower"]);
    const poor = sc(["wheat_winter", "fallow", "wheat_winter"]);
    expect(good.score).toBeGreaterThan(poor.score + 15);
    expect(good.legumeYears).toBe(1);
    expect(good.nContributionKgHa.high).toBeGreaterThan(0);
    expect(poor.sameFamilyPairs).toBe(1); // W-F-W repeated: year-3 wheat is followed by year-1 wheat
    expect(sc(["wheat_winter", "barley_winter", "maize_grain"]).sameFamilyPairs).toBe(3);
  });
  it("slope raises the bare-soil penalty", () => {
    const seq: RotationSequence = ["wheat_winter", "fallow", "wheat_winter"];
    const flat = soilHealth(seq, scheduleSequence(seq, "highland"), 0);
    const steep = soilHealth(seq, scheduleSequence(seq, "highland"), 12);
    expect(steep.score).toBeLessThan(flat.score);
  });
});

describe("screening pass approximates the exact replay", () => {
  it("water deficit and margin agree closely for representative plans", () => {
    const clim = prepareClimate(syntheticClimate(), 1, 0);
    const setup = createSetup(clim, soilHydraulics(LOAM_SOIL), "highland");
    const ev = buildEvalContext(setup, replayWindows(clim), 250, 0.7, 1, 1);
    const screener = new Screener(setup);
    const plans: RotationSequence[] = [
      ["wheat_winter", "fallow", "wheat_winter"], ["sugar_beet", "wheat_winter", "chickpea"],
      ["maize_grain", "sunflower", "barley_winter"], ["alfalfa", "vetch", "lentil_red"], ["dry_bean", "wheat_winter", "sunflower"],
    ];
    for (const p of plans) {
      const sch = scheduleSequence(p, "highland");
      const ex = planMetrics(evaluateExact(ev, sch))!;
      const sc = planMetrics(evaluateScreening(ev, screener, sch))!;
      expect(Math.abs(ex.requirementP50 - sc.requirementP50)).toBeLessThan(15);
      expect(Math.abs(ex.marginP50 - sc.marginP50)).toBeLessThan(Math.max(300, 0.1 * Math.abs(ex.marginP50)));
    }
  });
});
