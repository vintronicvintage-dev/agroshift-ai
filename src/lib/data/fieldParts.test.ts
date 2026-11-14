import { describe, expect, it } from "vitest";
import { FIELD_PARTS, getFieldParts, parseParts } from "./field";
import { ValidationError } from "./service";
import { loadSnapshot } from "./snapshots";
import { partsForRingChange, snapshotToParts } from "@/components/data/FieldData";

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

  it("only refetches polygon-specific terrain ('field') when ringKey changes within the same siteKey", () => {
    // Same centroid (siteKey), polygon vertex moved slightly -> only "field" (terrain) is refetched
    expect(partsForRingChange("37.5700,32.7700", "37.5700,32.7700", false)).toEqual(["field"]);
    expect(partsForRingChange("37.5700,32.7700", "37.5700,32.7700", true)).toEqual(["field"]);
    // Different siteKey with pilot snapshot -> only "field" fetched immediately; climate/ndvi/soilPart/precip come from snapshot
    expect(partsForRingChange("", "37.5700,32.7700", true)).toEqual(["field"]);
    // Different siteKey without pilot snapshot -> all 5 parts fetched for the new site
    expect(partsForRingChange("", "39.1234,35.6789", false)).toEqual(["field", "soilPart", "precip", "climate", "ndvi"]);
  });

  it("populates climate, ndvi, soilPart, and precip directly from a bundled pilot snapshot without redundant API calls", async () => {
    const snap = await loadSnapshot("konya-cumra");
    expect(snap).not.toBeNull();
    const ring = [
      { lat: 37.569, lon: 32.769 },
      { lat: 37.569, lon: 32.771 },
      { lat: 37.571, lon: 32.771 },
      { lat: 37.571, lon: 32.769 },
    ];
    const resolved = snapshotToParts(snap!, ring);
    expect(resolved.missing).toEqual([]);
    expect(resolved.climate?.status).toBe("ok");
    expect(resolved.ndvi?.status).toBe("ok");
    expect(resolved.soilPart?.status).toBe("ok");
    if (resolved.soilPart?.status === "ok") {
      expect(resolved.soilPart.from).toBe("snapshot");
      expect(resolved.soilPart.data.soilLayers?.length).toBeGreaterThan(0);
    }
    expect(resolved.precip?.status).toBe("ok");
    if (resolved.precip?.status === "ok") {
      expect(resolved.precip.from).toBe("snapshot");
      expect(resolved.precip.data.precipCheck?.years.length).toBeGreaterThan(2);
    }
  });
});
