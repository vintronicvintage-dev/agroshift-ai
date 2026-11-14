import { describe, it, expect } from "vitest";
import { saxtonRawls, usdaTextureClass, hydrologicGroup, scsRunoff, soilHydraulics } from "./soil";
import type { SoilProfile } from "../types";

describe("Saxton & Rawls (2006) pedotransfer", () => {
  it("loam (40 % sand, 20 % clay, 2.5 % OM) is close to the paper's Table 3", () => {
    const r = saxtonRawls(40, 20, 2.5);
    // Paper Table 3, loam: WP ≈ 0.12–0.14, FC ≈ 0.26–0.28, SAT ≈ 0.44–0.46
    expect(r.thetaWP).toBeGreaterThan(0.11);
    expect(r.thetaWP).toBeLessThan(0.15);
    expect(r.thetaFC).toBeGreaterThan(0.24);
    expect(r.thetaFC).toBeLessThan(0.30);
    expect(r.thetaSat).toBeGreaterThan(0.42);
    expect(r.thetaSat).toBeLessThan(0.48);
  });
  it("sand holds less water than clay; FC > WP always", () => {
    const sand = saxtonRawls(88, 5, 2.5);
    const clay = saxtonRawls(25, 50, 2.5);
    expect(sand.thetaFC).toBeLessThan(0.15);
    expect(clay.thetaFC).toBeGreaterThan(0.38);
    expect(sand.ksatMmH).toBeGreaterThan(clay.ksatMmH * 10);
    for (const r of [sand, clay]) {
      expect(r.thetaFC).toBeGreaterThan(r.thetaWP);
      expect(r.thetaSat).toBeGreaterThan(r.thetaFC);
    }
  });
});

describe("USDA texture triangle and SCS-CN", () => {
  it("classifies reference points", () => {
    expect(usdaTextureClass(90, 5, 5)).toBe("sand");
    expect(usdaTextureClass(40, 40, 20)).toBe("loam");
    expect(usdaTextureClass(20, 20, 60)).toBe("clay");
    expect(usdaTextureClass(10, 70, 20)).toBe("silt loam");
    expect(usdaTextureClass(30, 35, 35)).toBe("clay loam");
    expect(usdaTextureClass(5, 90, 5)).toBe("silt");
  });
  it("maps texture to hydrologic soil group", () => {
    expect(hydrologicGroup("sand")).toBe("A");
    expect(hydrologicGroup("loam")).toBe("B");
    expect(hydrologicGroup("clay loam")).toBe("C");
    expect(hydrologicGroup("clay")).toBe("D");
  });
  it("SCS-CN runoff: zero below Ia, monotone, < P", () => {
    expect(scsRunoff(5, 80)).toBe(0);
    const q1 = scsRunoff(40, 80), q2 = scsRunoff(60, 80);
    expect(q1).toBeGreaterThan(0);
    expect(q2).toBeGreaterThan(q1);
    expect(q2).toBeLessThan(60);
    // TR-55: CN 80, P = 50.8 mm (2 in) → Q ≈ 0.56 in = 14.2 mm
    expect(scsRunoff(50.8, 80)).toBeCloseTo(14.2, 0);
  });
  it("soilHydraulics flags assumed organic matter when SOC is null", () => {
    const p: SoilProfile = { sand: 30, silt: 40, clay: 30, soc: null, ph: null, textureClass: "clay loam", origin: "default", sources: [] };
    const h = soilHydraulics(p);
    expect(h.organicMatterAssumed).toBe(true);
    expect(h.tawMmPerM).toBeGreaterThan(80);
    expect(h.tawMmPerM).toBeLessThan(220);
  });
});
