import { describe, expect, it } from "vitest";
import { matchMasterProvince } from "./turkiyeAgroMaster";

describe("matchMasterProvince — Turkey vs global coordinate guard", () => {
  it("matches known Turkish agricultural basins with isInTurkey = true", () => {
    const konya = matchMasterProvince(37.5714, 32.7836);
    expect(konya.isInTurkey).toBe(true);
    expect(konya.plaka).toBe("42");

    const edirne = matchMasterProvince(41.6818, 26.5623);
    expect(edirne.isInTurkey).toBe(true);
    expect(edirne.plaka).toBe("22");

    const urfa = matchMasterProvince(36.8644, 39.0314);
    expect(urfa.isInTurkey).toBe(true);
    expect(urfa.plaka).toBe("63");
  });

  it("marks coordinates outside Turkey (e.g. USA, Brazil, Japan) with isInTurkey = false", () => {
    const iowa = matchMasterProvince(41.878, -93.097);
    expect(iowa.isInTurkey).toBe(false);
    expect(iowa.distanceKm).toBeGreaterThan(1000);

    const brazil = matchMasterProvince(-15.79, -47.88);
    expect(brazil.isInTurkey).toBe(false);

    const japan = matchMasterProvince(35.68, 139.76);
    expect(japan.isInTurkey).toBe(false);
  });
});
