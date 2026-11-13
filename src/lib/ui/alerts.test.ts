import { describe, expect, it } from "vitest";
import type { ClimateSummary, SoilProfile } from "@/lib/types";
import { buildAlerts, type AlertInput } from "./alerts";
import type { SiteData } from "./siteData";

const ok = <T,>(data: T) => ({ status: "ok" as const, data });
const climate = (over: Partial<ClimateSummary> = {}): ClimateSummary =>
  ({
    trends: [],
    quality: { missingDays: { tmax: 0, tmin: 0, rh: 0, wind2m: 0, rs: 0, precip: 0, gwetRoot: 0 } },
    ...over,
  }) as unknown as ClimateSummary;

function input(over: Partial<AlertInput> = {}): AlertInput {
  const data: SiteData = { climate: ok({} as never), soil: ok({} as never), ndvi: ok({} as never) };
  return {
    data,
    climate: climate(),
    result: null,
    calibration: { stationMeanMm: 300, modelMeanMm: 550, factor: 0.55, years: [2001] },
    imerg: "validated",
    soil: { origin: "soilgrids" } as SoilProfile,
    best: null,
    n: (v) => String(Math.round(v)),
    unit: () => "mm",
    dir: (d) => d,
    ...over,
  };
}

describe("buildAlerts", () => {
  it("is empty without a site and when every flag is clear", () => {
    expect(buildAlerts(input({ data: null }))).toEqual([]);
    expect(buildAlerts(input())).toEqual([]);
  });
  it("flags uncalibrated rainfall, missing IMERG, default soil and missing data from real inputs", () => {
    const ids = buildAlerts(
      input({
        calibration: null,
        imerg: null,
        soil: { origin: "default" } as SoilProfile,
        climate: climate({ quality: { missingDays: { tmax: 2, tmin: 0, rh: 0, wind2m: 0, rs: 0, precip: 1, gwetRoot: 0 } } as never }),
      }),
    ).map((a) => a.id);
    expect(ids).toEqual(["soil-default", "uncal", "missing", "imerg"]);
  });
  it("lists only significant trends", () => {
    const tr = (variable: string, significant: boolean) => ({ variable, significant, direction: "decreasing", senSlope: -1.2, p: significant ? 0.01 : 0.4, unit: "days/yr" });
    const a = buildAlerts(input({ climate: climate({ trends: [tr("frost_days", true), tr("precip", false)] as never }) }));
    expect(a.map((x) => x.id)).toEqual(["trend-frost_days"]);
    expect(a[0].params).toEqual({ dir: "decreasing" });
  });
  it("reports failed parts and puts warnings before information", () => {
    const data: SiteData = { climate: { status: "error", code: "network", message: "x" }, soil: { status: "error", code: "http", message: "x" }, ndvi: { status: "error", code: "timeout", message: "x" } };
    const a = buildAlerts(input({ data, climate: null }));
    expect(a.map((x) => x.id)).toEqual(["climate", "soil-error", "ndvi"]);
    expect(a.map((x) => x.tone)).toEqual(["warn", "warn", "info"]);
  });
});
