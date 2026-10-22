import { describe, expect, it } from "vitest";
import { reachThreshold, safeThreshold, targetThreshold, tierOf } from "../src/lib/scoring.js";

describe("tier boundaries (rank 1000 -> thresholds 1430/910/710)", () => {
  it("uses integer thresholds so boundary tests are exact", () => {
    expect(safeThreshold(1000)).toBe(1430);
    expect(targetThreshold(1000)).toBe(910);
    expect(reachThreshold(1000)).toBe(710);
  });

  it("closing rank exactly at the Safe threshold is Safe", () => {
    expect(tierOf(1000, 1430)).toBe("Safe");
  });

  it("one rank below the Safe threshold is Target", () => {
    expect(tierOf(1000, 1429)).toBe("Target");
  });

  it("closing rank exactly at the Target threshold is Target", () => {
    expect(tierOf(1000, 910)).toBe("Target");
  });

  it("one rank below the Target threshold is Reach", () => {
    expect(tierOf(1000, 909)).toBe("Reach");
  });

  it("closing rank exactly at the Reach threshold is Reach", () => {
    expect(tierOf(1000, 710)).toBe("Reach");
  });

  it("below the Reach threshold is excluded (no tier)", () => {
    expect(tierOf(1000, 709)).toBeNull();
  });

  it("thresholds follow Math.round for non-round ranks", () => {
    expect(safeThreshold(9999)).toBe(14299);
    expect(tierOf(9999, 14299)).toBe("Safe");
    expect(tierOf(9999, 14298)).toBe("Target");
  });

  it("missing closing rank never yields a tier", () => {
    expect(tierOf(1000, null)).toBeNull();
  });
});
