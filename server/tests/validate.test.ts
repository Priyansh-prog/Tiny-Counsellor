import { describe, expect, it } from "vitest";
import { parsePlanRequest } from "../src/lib/validate.js";

const base = { rank: 12000, category: "OPEN", quota: "OS" };

describe("parsePlanRequest", () => {
  it("fills documented defaults for a minimal valid request", () => {
    const r = parsePlanRequest({ ...base });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.request.includeTypes).toEqual(["Safe", "Target", "Reach"]);
      expect(r.request.maxSize).toBe(30);
      expect(r.request.category).toBe("OPEN");
    }
  });

  it("rejects invalid ranks with a clear error", () => {
    for (const bad of [0, -5, 12.5, "abc", undefined, 2_000_001]) {
      const r = parsePlanRequest({ ...base, rank: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("rank");
    }
  });

  it("rejects unsupported categories", () => {
    const r = parsePlanRequest({ ...base, category: "OBC" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("OPEN");
  });

  it("rejects invalid or missing quota", () => {
    for (const bad of ["HOME", "os", "", undefined, 1]) {
      const r = parsePlanRequest({ ...base, quota: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("quota");
    }
  });

  it("rejects unknown goal ids", () => {
    const r = parsePlanRequest({ ...base, goalId: "astronaut" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("Unknown goalId");
  });

  it("rejects invalid tier names and empty tier lists", () => {
    for (const bad of [["Sure"], "Safe", ["Safe", "Banana"], []]) {
      const r = parsePlanRequest({ ...base, includeTypes: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("includeTypes");
    }
  });

  it("rejects unreasonable shortlist sizes", () => {
    for (const bad of [0, -1, 51, "many"]) {
      const r = parsePlanRequest({ ...base, maxSize: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("maxSize");
    }
  });

  it("rejects non-object bodies", () => {
    for (const bad of [null, 42, "x", []]) {
      const r = parsePlanRequest(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors[0]).toContain("JSON object");
    }
  });

  it("trims and de-duplicates preferred families while preserving order", () => {
    const r = parsePlanRequest({ ...base, preferredFamilies: ["  CSE ", "CSE", "ECE"] });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.request.preferredFamilies).toEqual(["CSE", "ECE"]);
  });
});
