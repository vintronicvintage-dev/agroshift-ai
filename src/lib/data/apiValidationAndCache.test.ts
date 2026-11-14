import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { GET as getClimateRoute } from "@/app/api/climate/route";
import { GET as getSoilRoute } from "@/app/api/soil/route";
import { GET as getNdviRoute } from "@/app/api/ndvi/route";
import { POST as postFieldRoute } from "@/app/api/field/route";
import { POST as postParcelEngineRoute } from "@/app/api/parcel-engine/route";

describe("API routes — validation & error handling", () => {
  it("rejects missing, NaN, and out-of-range coordinates on /api/climate, /api/soil, /api/ndvi with 400", async () => {
    const badUrls = [
      "http://localhost/api/climate",
      "http://localhost/api/climate?lat=abc&lon=32",
      "http://localhost/api/climate?lat=95&lon=32",
      "http://localhost/api/climate?lat=37&lon=200",
    ];
    for (const url of badUrls) {
      const cRes = await getClimateRoute(new Request(url));
      expect(cRes.status).toBe(400);

      const sRes = await getSoilRoute(new Request(url.replace("/climate", "/soil")));
      expect(sRes.status).toBe(400);

      const nRes = await getNdviRoute(new Request(url.replace("/climate", "/ndvi")));
      expect(nRes.status).toBe(400);
    }
  });

  it("rejects invalid JSON and invalid ?parts selector on POST /api/field with 400", async () => {
    const badJsonReq = new Request("http://localhost/api/field", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const res1 = await postFieldRoute(badJsonReq);
    expect(res1.status).toBe(400);

    const badPartsReq = new Request("http://localhost/api/field?parts=nonexistent_part", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ lat: 37.57, lon: 32.78 }),
    });
    const res2 = await postFieldRoute(badPartsReq);
    expect(res2.status).toBe(400);
  });

  it("rejects invalid coordinates or non-3-year crop arrays on POST /api/parcel-engine with 400", async () => {
    const reqBadCoord = new NextRequest("http://localhost/api/parcel-engine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lat: "invalid",
        lon: 32.78,
        alan_dekar: 100,
        ekim_bicimi: "aniza_dogrudan_ekim",
        sulama_bicimi: "damla",
      }),
    });
    const r1 = await postParcelEngineRoute(reqBadCoord);
    expect(r1.status).toBe(400);

    const reqBadCrops = new NextRequest("http://localhost/api/parcel-engine", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        lat: 37.57,
        lon: 32.78,
        alan_dekar: 100,
        secilen_urunler: ["Bugday", "Nohut"],
        ekim_bicimi: "aniza_dogrudan_ekim",
        sulama_bicimi: "damla",
      }),
    });
    const r2 = await postParcelEngineRoute(reqBadCrops);
    expect(r2.status).toBe(400);
  });
});

describe(".cache integrity check", () => {
  it("validates schema of cached climate_*.json files when .cache exists", () => {
    const cacheDir = join(process.cwd(), ".cache");
    if (!existsSync(cacheDir)) return;
    const files = readdirSync(cacheDir).filter((f) => f.startsWith("climate_") && f.endsWith(".json"));
    if (files.length === 0) return;

    for (const file of files.slice(0, 5)) {
      const parsed = JSON.parse(readFileSync(join(cacheDir, file), "utf-8"));
      expect(parsed.savedAt).toBeDefined();
      const series = parsed.data ?? parsed;
      expect(typeof series.lat).toBe("number");
      expect(typeof series.lon).toBe("number");
      expect(Array.isArray(series.daily)).toBe(true);
      expect(series.daily.length).toBeGreaterThan(100);
      expect(typeof series.daily[0].date).toBe("string");
      expect(series.daily[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
