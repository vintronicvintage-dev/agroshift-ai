import { describe, expect, it } from "vitest";
import { analyzeParcelRing, buildSampleParcelRing, compassLabel, recommendParcelManagement } from "./parcelScan";

describe("parcelScan — boundary geometry & interior grid scanning", () => {
  it("builds a sample 7-vertex irregular parcel around a centre point and computes ~75 da area and interior scan points", () => {
    const ring = buildSampleParcelRing({ lat: 37.57, lon: 32.77 }, 75);
    expect(ring).toHaveLength(7);
    const summary = analyzeParcelRing(ring, {
      elevationMean: 1012,
      elevationMin: 1008,
      elevationMax: 1017,
      slopePct: 2.8,
      aspectDeg: 175,
      samples: 9,
      sources: [],
    });
    expect(summary.vertexCount).toBe(7);
    expect(summary.selfIntersecting).toBe(false);
    expect(summary.geometry.areaDa).toBeGreaterThan(50);
    expect(summary.geometry.areaDa).toBeLessThan(110);
    expect(summary.scanPoints.length).toBeGreaterThanOrEqual(5);
    expect(summary.zoneShares.upperPct + summary.zoneShares.midPct + summary.zoneShares.lowerPct).toBe(100);
    expect(summary.nearestBasin.basin.id).toBe("ic-anadolu");
  });

  it("formats compass aspect and management advice in both Turkish and English", () => {
    const cTr = compassLabel(180, "tr");
    const cEn = compassLabel(180, "en");
    expect(cTr.dir).toContain("Güney");
    expect(cEn.dir).toContain("South");

    const mSteep = recommendParcelManagement(7.2, 78, "ew", "tr");
    expect(mSteep).toContain("damla sulama");
  });
});
