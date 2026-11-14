import { describe, expect, it } from "vitest";
import { POWER_PARAMS, powerToDaily, type PowerResponse } from "@/lib/data/converters";
import {
  OFFLINE_GWET_PROFILES,
  calibrateInitialRootZoneMoisture,
  resolveOfflineRegionId,
  seasonalDefaultGwet,
} from "./rootZoneMoisture";

describe("NASA POWER GWETROOT & GWETPROF parameters and calibration", () => {
  it("includes both GWETROOT and GWETPROF in POWER_PARAMS", () => {
    expect(POWER_PARAMS).toContain("GWETROOT");
    expect(POWER_PARAMS).toContain("GWETPROF");
  });

  it("parses GWETROOT and GWETPROF from NASA POWER daily response", () => {
    const resp: PowerResponse = {
      geometry: { coordinates: [32.77, 37.57, 1020] },
      parameters: {
        T2M_MAX: { units: "C" },
        T2M_MIN: { units: "C" },
        T2M: { units: "C" },
        RH2M: { units: "%" },
        WS2M: { units: "m/s" },
        ALLSKY_SFC_SW_DWN: { units: "MJ/m^2/day" },
        PRECTOTCORR: { units: "mm/day" },
        GWETROOT: { units: "1" },
        GWETPROF: { units: "1" },
        GWETTOP: { units: "1" },
      },
      properties: {
        parameter: {
          T2M_MAX: { "20251015": 20 },
          T2M_MIN: { "20251015": 8 },
          T2M: { "20251015": 14 },
          RH2M: { "20251015": 55 },
          WS2M: { "20251015": 2.1 },
          ALLSKY_SFC_SW_DWN: { "20251015": 15.2 },
          PRECTOTCORR: { "20251015": 0 },
          GWETROOT: { "20251015": 0.42 },
          GWETPROF: { "20251015": 0.48 },
          GWETTOP: { "20251015": 0.36 },
        },
      },
    };
    const out = powerToDaily(resp);
    expect(out.daily[0].gwetRoot).toBe(0.42);
    expect(out.daily[0].gwetProf).toBe(0.48);
  });

  it("resolves offline seasonal GWETROOT profiles for Konya-Çumra, Edirne-Uzunköprü, and Şanlıurfa-Harran", () => {
    expect(resolveOfflineRegionId(37.57, 32.77)).toBe("konya-cumra");
    expect(resolveOfflineRegionId(41.27, 26.69)).toBe("edirne-uzunkopru");
    expect(resolveOfflineRegionId(36.87, 39.03)).toBe("sanliurfa-harran");

    for (const id of ["konya-cumra", "edirne-uzunkopru", "sanliurfa-harran", "default"] as const) {
      expect(OFFLINE_GWET_PROFILES[id].monthlyGwetRoot).toHaveLength(12);
      expect(OFFLINE_GWET_PROFILES[id].monthlyGwetProf).toHaveLength(12);
    }

    const edirneOct = seasonalDefaultGwet(41.27, 26.69, "2025-10-15");
    const harranOct = seasonalDefaultGwet(36.87, 39.03, "2025-10-15");
    expect(edirneOct.gwetRoot).toBeGreaterThan(harranOct.gwetRoot);
  });

  it("calibrates initial root-zone moisture reserve from live GWETROOT+GWETPROF and falls back offline", () => {
    const live = calibrateInitialRootZoneMoisture({
      lat: 37.57,
      lon: 32.77,
      dateOrMonth: "2025-10-15",
      gwetRoot: 0.65,
      gwetProf: 0.55,
      thetaSat: 0.45,
      thetaFC: 0.30,
      thetaWP: 0.14,
      rootDepthM: 1.5,
    });
    expect(live.usedOfflineFallback).toBe(false);
    expect(live.wetness).toBeGreaterThan(0.5);
    expect(live.theta0M3M3).toBeGreaterThan(0.14);
    expect(live.initialReserveMm).toBeGreaterThan(100);

    const offline = calibrateInitialRootZoneMoisture({
      lat: 37.57,
      lon: 32.77,
      dateOrMonth: "2025-10-15",
      gwetRoot: null,
      gwetProf: null,
      thetaSat: 0.45,
      thetaFC: 0.30,
      thetaWP: 0.14,
      rootDepthM: 1.5,
    });
    expect(offline.usedOfflineFallback).toBe(true);
    expect(offline.regionId).toBe("konya-cumra");
    expect(offline.gwetRootUsed).toBe(OFFLINE_GWET_PROFILES["konya-cumra"].monthlyGwetRoot[9]);
    expect(offline.initialReserveMm).toBeGreaterThan(0);
  });
});
