import { describe, expect, it } from "vitest";
import {
  classifyTexture,
  modisNdvi,
  powerToDaily,
  powerValue,
  solarUnitFactor,
  weightedDepthMean,
  soilgridsConvert,
  type PowerResponse,
} from "./converters";
import { sgToProfile } from "./soilgrids";
import { chunk } from "./modis";
import { roundCoord } from "./cache";
import { parseOpendapAscii } from "./imerg";

function powerResp(rsUnits: string, rs: number): PowerResponse {
  const day = (v: number) => ({ "20240101": v, "20240102": -999 });
  return {
    geometry: { coordinates: [32.77, 37.57, 1197.55] },
    parameters: {
      T2M_MAX: { units: "C" },
      T2M_MIN: { units: "C" },
      T2M: { units: "C" },
      RH2M: { units: "%" },
      WS2M: { units: "m/s" },
      ALLSKY_SFC_SW_DWN: { units: rsUnits },
      PRECTOTCORR: { units: "mm/day" },
      GWETROOT: { units: "1" },
      GWETTOP: { units: "1" },
    },
    properties: {
      parameter: {
        T2M_MAX: day(10),
        T2M_MIN: day(-2),
        T2M: day(4),
        RH2M: day(70),
        WS2M: day(2.5),
        ALLSKY_SFC_SW_DWN: day(rs),
        PRECTOTCORR: day(0),
        GWETROOT: day(0.4),
        GWETTOP: day(0.3),
      },
    },
  };
}

describe("POWER conversion", () => {
  it("maps -999 to null, keeps zeros", () => {
    expect(powerValue(-999)).toBeNull();
    expect(powerValue(-999.0)).toBeNull();
    expect(powerValue(0)).toBe(0);
    expect(powerValue(-3.2)).toBe(-3.2);
    expect(powerValue(undefined)).toBeNull();
    expect(powerValue(NaN)).toBeNull();
  });

  it("trims trailing all-null days and returns elevation", () => {
    const { daily, elevation, unitNote } = powerToDaily(powerResp("MJ/m^2/day", 5.4));
    expect(daily).toHaveLength(1);
    expect(daily[0]).toMatchObject({ date: "2024-01-01", tmax: 10, precip: 0, rs: 5.4 });
    expect(elevation).toBe(1197.55);
    expect(unitNote).toBeUndefined();
  });

  it("keeps interior nulls", () => {
    const resp = powerResp("MJ/m^2/day", 5.4);
    resp.properties!.parameter!.T2M_MAX = { "20240101": -999, "20240102": 8 };
    resp.properties!.parameter!.T2M = { "20240101": 1, "20240102": 2 };
    const { daily } = powerToDaily(resp);
    expect(daily).toHaveLength(2);
    expect(daily[0].tmax).toBeNull();
    expect(daily[1].tmax).toBe(8);
  });

  it("converts kWh/m2/day by x3.6 and records it", () => {
    const { daily, unitNote } = powerToDaily(powerResp("kWh-hr/m^2/day", 2));
    expect(daily[0].rs).toBeCloseTo(7.2, 6);
    expect(unitNote).toMatch(/3\.6/);
  });

  it("fails loudly on unknown solar units or other wrong units", () => {
    expect(() => solarUnitFactor("W/m^2")).toThrow(/Unexpected ALLSKY_SFC_SW_DWN/);
    const bad = powerResp("MJ/m^2/day", 5);
    bad.parameters!.PRECTOTCORR = { units: "in/day" };
    expect(() => powerToDaily(bad)).toThrow(/PRECTOTCORR/);
  });
});

describe("MODIS NDVI conversion", () => {
  it("applies scale, drops fill and bad reliability", () => {
    expect(modisNdvi(3336, 0)).toBe(0.3336);
    expect(modisNdvi(3336, 1)).toBe(0.3336);
    expect(modisNdvi(3336, 2)).toBeNull();
    expect(modisNdvi(3336, 3)).toBeNull();
    expect(modisNdvi(3336, -1)).toBeNull();
    expect(modisNdvi(-3000, 0)).toBeNull();
    expect(modisNdvi(12000, 0)).toBeNull();
    expect(modisNdvi(undefined, 0)).toBeNull();
  });
  it("chunks dates in groups of at most 10", () => {
    const c = chunk(Array.from({ length: 23 }, (_, i) => i), 10);
    expect(c.map((x) => x.length)).toEqual([10, 10, 3]);
  });
});

describe("soil conversion", () => {
  it("weights layers by thickness", () => {
    expect(weightedDepthMean([10, 20, 30], [5, 10, 15])).toBeCloseTo((50 + 200 + 450) / 30, 9);
    expect(weightedDepthMean([10, null, 30], [5, 10, 15])).toBeNull();
  });
  it("applies d_factor 10", () => {
    expect(soilgridsConvert(298)).toBe(29.8);
    expect(soilgridsConvert(null)).toBeNull();
  });
  it("USDA texture classes", () => {
    expect(classifyTexture(92, 5, 3)).toBe("sand");
    expect(classifyTexture(82, 12, 6)).toBe("loamy sand");
    expect(classifyTexture(65, 25, 10)).toBe("sandy loam");
    expect(classifyTexture(40, 40, 20)).toBe("loam");
    expect(classifyTexture(20, 65, 15)).toBe("silt loam");
    expect(classifyTexture(7, 88, 5)).toBe("silt");
    expect(classifyTexture(60, 10, 30)).toBe("sandy clay loam");
    expect(classifyTexture(35, 35, 30)).toBe("clay loam");
    expect(classifyTexture(10, 58, 32)).toBe("silty clay loam");
    expect(classifyTexture(50, 5, 45)).toBe("sandy clay");
    expect(classifyTexture(5, 50, 45)).toBe("silty clay");
    expect(classifyTexture(15, 30, 55)).toBe("clay");
  });
  it("renormalises fractions that do not sum to 100", () => {
    expect(classifyTexture(35.1, 34.9, 29.0)).toBe("clay loam");
    expect(classifyTexture(3.5, 3.5, 3)).toBe("clay loam");
  });
  it("builds a 0-30 cm profile from a SoilGrids response and flags masked pixels", () => {
    const layer = (name: string, v: (number | null)[]) => ({
      name,
      depths: ["0-5cm", "5-15cm", "15-30cm"].map((label, i) => ({ label, values: { mean: v[i] } })),
    });
    const ok = sgToProfile({
      properties: {
        layers: [
          layer("sand", [236, 236, 236]),
          layer("silt", [466, 466, 466]),
          layer("clay", [298, 298, 298]),
          layer("soc", [150, 120, 90]),
          layer("phh2o", [72, 72, 74]),
        ],
      },
    });
    expect(ok).toMatchObject({ sand: 23.6, silt: 46.6, clay: 29.8, textureClass: "clay loam" });
    expect(ok!.soc).toBeCloseTo((15 * 5 + 12 * 10 + 9 * 15) / 30, 1);
    const masked = sgToProfile({
      properties: { layers: ["sand", "silt", "clay"].map((n) => layer(n, [null, null, null])) },
    });
    expect(masked).toBeNull();
  });
});

describe("cache and imerg helpers", () => {
  it("rounds to a 0.05 degree grid", () => {
    expect(roundCoord(37.57)).toBe(37.55);
    expect(roundCoord(37.58)).toBe(37.6);
    expect(roundCoord(-0.02)).toBe(-0);
    expect(roundCoord(32.77)).toBe(32.75);
  });
  it("parses OPeNDAP ascii", () => {
    expect(parseOpendapAscii("Dataset: x\nprecipitation, 3.1\n[0][0][0], 0.0123\n")).toBeCloseTo(0.0123);
    expect(parseOpendapAscii("[0][0][0], -9999.9")).toBeNull();
  });
});
