import { describe, expect, it } from "vitest";
import { GS_BOOT_SCRIPT } from "./bootScripts";
import { GS_EMPTY, gsAttr, parseGs } from "./gettingStarted";

describe("getting-started state", () => {
  it("parses defensively", () => {
    expect(parseGs(null)).toEqual(GS_EMPTY);
    expect(parseGs("not json")).toEqual(GS_EMPTY);
    expect(parseGs("[1,2]").done).toEqual([]);
    expect(parseGs('{"done":["water","bogus","field"],"dismissed":true}')).toEqual({ done: ["field", "water"], dismissed: true, reopened: false });
  });
  it("derives the html attribute", () => {
    expect(gsAttr(GS_EMPTY)).toBe("");
    expect(gsAttr({ done: ["field"], dismissed: true, reopened: false })).toBe("dismissed");
    const all = { done: ["field", "water", "compare", "scenario", "evidence"] as const };
    expect(gsAttr({ done: [...all.done], dismissed: false, reopened: false })).toBe("done");
    expect(gsAttr({ done: [...all.done], dismissed: false, reopened: true })).toBe("");
  });
  it("boot script and store agree on the storage key", () => {
    expect(GS_BOOT_SCRIPT).toContain("agroshift.gettingStarted");
  });
});
