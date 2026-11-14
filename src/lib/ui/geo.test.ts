import { describe, expect, it } from "vitest";
import { circleRing, describeRing, parseLatLon, parseRingText, radiusForDa, rectangleRing, ringProblem } from "./geo";

describe("field geometry helpers", () => {
  it("parses Turkish and English coordinate styles", () => {
    expect(parseLatLon("37.57 32.77")).toEqual({ lat: 37.57, lon: 32.77 });
    expect(parseLatLon("37,57 32,77")).toEqual({ lat: 37.57, lon: 32.77 });
    expect(parseLatLon("37.57, 32.77")).toEqual({ lat: 37.57, lon: 32.77 });
    const dms = parseLatLon("37°34'12\"N 32°46'12\"E")!;
    expect(dms.lat).toBeCloseTo(37.57, 4);
    expect(dms.lon).toBeCloseTo(32.77, 4);
    expect(parseLatLon("95 32")).toBeNull();
    expect(parseLatLon("Konya")).toBeNull();
  });

  it("builds a circle whose geodesic area matches the typed decares", () => {
    const ring = circleRing({ lat: 37.57, lon: 32.77 }, radiusForDa(100));
    expect(describeRing(ring).areaDa).toBeGreaterThan(99.5);
    expect(describeRing(ring).areaDa).toBeLessThan(100.5);
  });

  it("measures a 400 m × 300 m rectangle as 120 da", () => {
    const g = describeRing(rectangleRing({ lat: 37.57, lon: 32.77 }, 400, 300));
    expect(g.areaDa).toBeCloseTo(120, 0);
    expect(g.perimeterM).toBeCloseTo(1400, -1);
  });

  it("reports drawing problems in farmer terms", () => {
    expect(ringProblem([{ lat: 37, lon: 32 }])).toBe("few");
    const bow = [
      { lat: 37, lon: 32 },
      { lat: 37.01, lon: 32.01 },
      { lat: 37, lon: 32.01 },
      { lat: 37.01, lon: 32 },
    ];
    expect(ringProblem(bow)).toBe("cross");
    const { ring, bad } = parseRingText("37.569 32.765\nbad line\n37.569 32.775\n37.574 32.775");
    expect(bad).toEqual([2]);
    expect(ring).toHaveLength(3);
  });
});
