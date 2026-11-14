import { describe, expect, it } from "vitest";
import { resolveTileUrl, tileSourceById, TILE_SOURCES } from "./tiles";
import { metersPerPixel, searchTurkeyLocations, TURKEY_BASINS, TURKEY_PROVINCES } from "./turkeyRegions";

describe("Turkey high-resolution map tile sources and 81-province atlas", () => {
  it("registers high-resolution satellite, street, topographic, road, and label sources for deep zoom", () => {
    const esri = tileSourceById("esri-world-imagery");
    const street = tileSourceById("carto-voyager");
    const topo = tileSourceById("opentopomap");
    const labels = tileSourceById("carto-voyager-labels");
    const roads = tileSourceById("esri-world-transportation");

    expect(esri?.maxNativeZoom).toBeGreaterThanOrEqual(18);
    expect(street?.maxNativeZoom).toBeGreaterThanOrEqual(19);
    expect(topo?.maxNativeZoom).toBeGreaterThanOrEqual(17);
    expect(labels?.maxNativeZoom).toBeGreaterThanOrEqual(19);
    expect(roads?.maxNativeZoom).toBeGreaterThanOrEqual(19);

    const url = resolveTileUrl(esri!, 18, 154940, 101588);
    expect(url).toBe("https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/18/101588/154940");
  });

  it("includes all 81 provinces of Turkey within Turkey's geographic bounds", () => {
    expect(TURKEY_PROVINCES).toHaveLength(81);
    const codes = new Set(TURKEY_PROVINCES.map((p) => p.code));
    expect(codes.size).toBe(81);
    for (const p of TURKEY_PROVINCES) {
      expect(p.lat).toBeGreaterThanOrEqual(35.8);
      expect(p.lat).toBeLessThanOrEqual(42.2);
      expect(p.lon).toBeGreaterThanOrEqual(25.6);
      expect(p.lon).toBeLessThanOrEqual(44.9);
    }
    expect(TURKEY_BASINS.length).toBeGreaterThanOrEqual(15);
  });

  it("searches Turkish agricultural plains and provinces case- and diacritic-insensitively", () => {
    const hitsKonya = searchTurkeyLocations("çumra");
    expect(hitsKonya.length).toBeGreaterThan(0);
    expect(hitsKonya[0].label).toContain("Konya Ovası");

    const hitsUrfa = searchTurkeyLocations("sanliurfa");
    expect(hitsUrfa.some((h) => h.label.includes("Şanlıurfa"))).toBe(true);

    const hitsPlate = searchTurkeyLocations("42");
    expect(hitsPlate.some((h) => h.label.includes("Konya (42)"))).toBe(true);
  });

  it("achieves sub-meter pixel resolution at zoom 18-20 over Anatolia", () => {
    const mpp18 = metersPerPixel(38.0, 18);
    const mpp20 = metersPerPixel(38.0, 20);
    expect(mpp18).toBeLessThan(0.5);
    expect(mpp20).toBeLessThan(0.15);
    expect(TILE_SOURCES.length).toBeGreaterThanOrEqual(20);
  });
});
