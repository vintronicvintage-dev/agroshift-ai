import { describe, expect, it } from "vitest";
import { lsFactor } from "@/lib/engine/indicators";
import {
  REGIONAL_DEFAULT_SLOPE_PCT,
  buildSrtm3PointUrl,
  computeSlopeFromElevations,
  fetchParcelTerrainSlope,
  rusleLsFactor,
} from "./terrainSlope";

describe("NASA SRTM 30m parcel slope and RUSLE LS", () => {
  it("builds the exact 3-point OpenTopoData SRTM30m URL (~100m N and E)", () => {
    const url = buildSrtm3PointUrl(37.57, 32.77);
    expect(url).toBe(
      "https://api.opentopodata.org/v1/srtm30m?locations=37.570000,32.770000|37.570900,32.770000|37.570000,32.771100",
    );
  });

  it("computes parcel slope (%) from 3 elevation samples and matches RUSLE LS", () => {
    // 3 m rise over ~100.19 m north and 0 m east -> ~2.99% slope
    const g = computeSlopeFromElevations(37.57, 1020, 1023, 1020);
    expect(g.slopePct).toBeCloseTo(2.99, 1);
    expect(rusleLsFactor(g.slopePct)).toBeCloseTo(lsFactor(g.slopePct), 3);
    expect(rusleLsFactor(6.0)).toBeGreaterThan(rusleLsFactor(2.0));
  });

  it("parses live SRTM30m response and computes deterministic RUSLE LS", async () => {
    const mockFetch = (async () =>
      new Response(
        JSON.stringify({
          status: "OK",
          results: [{ elevation: 1015 }, { elevation: 1019 }, { elevation: 1018 }],
        }),
        { status: 200 },
      )) as typeof fetch;

    const res = await fetchParcelTerrainSlope(37.57, 32.77, { fetchFn: mockFetch });
    expect(res.fallbackUsed).toBe(false);
    expect(res.source).toBe("srtm30m");
    expect(res.elevationM).toBe(1015);
    expect(res.slopePct).toBeGreaterThan(4);
    expect(res.rusleLsFactor).toBeCloseTo(lsFactor(res.slopePct), 3);
  });

  it("silently falls back to regional default slope on network error or timeout", async () => {
    const failingFetch = (async () => {
      throw new Error("Network offline");
    }) as typeof fetch;

    const res = await fetchParcelTerrainSlope(37.57, 32.77, { fetchFn: failingFetch });
    expect(res.fallbackUsed).toBe(true);
    expect(res.source).toBe("regional_fallback");
    expect(res.regionId).toBe("konya-cumra");
    expect(res.slopePct).toBe(REGIONAL_DEFAULT_SLOPE_PCT["konya-cumra"]);
    expect(res.rusleLsFactor).toBeCloseTo(lsFactor(res.slopePct), 3);
  });
});
