import { describe, expect, it } from "vitest";
import { FIELD_PARTS, getFieldParts, parseParts } from "./field";
import { ValidationError } from "./service";

describe("field parts selector", () => {
  it("defaults to every part and keeps order without duplicates", () => {
    expect(parseParts(null)).toEqual([...FIELD_PARTS]);
    expect(parseParts("")).toEqual([...FIELD_PARTS]);
    expect(parseParts("soil, TERRAIN,soil")).toEqual(["soil", "terrain"]);
    expect(parseParts("precip")).toEqual(["precip"]);
  });

  it("rejects unknown part names", () => {
    expect(() => parseParts("terrain,climate")).toThrow(ValidationError);
  });

  it("computes only the requested parts (bundled Konya pilot: no network needed)", async () => {
    const r = await getFieldParts({ point: { lat: 37.57, lon: 32.77 } }, ["precip"]);
    expect(r.parts).toEqual(["precip"]);
    expect("terrain" in r).toBe(false);
    expect("soil" in r).toBe(false);
    expect(r.precipCheck?.years.length).toBeGreaterThan(2);
  });
});
