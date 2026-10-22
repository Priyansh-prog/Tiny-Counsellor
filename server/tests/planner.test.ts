import { describe, expect, it } from "vitest";
import type { PlanRequest } from "../../shared/types.js";
import type { CatalogueItem, CutoffRow, PlannerData } from "../src/lib/data.js";
import { loadPlannerData } from "../src/lib/data.js";
import { buildPlan, NEUTRAL_FAMILY_ORDER, resolvePreferences } from "../src/lib/planner.js";
import { db } from "../src/db.js";
import { runSeed } from "../src/seed/seed.js";

const REQ: PlanRequest = {
  rank: 1000,
  category: "OPEN",
  quota: "OS",
  goalId: "computer-science",
  includeTypes: ["Safe", "Target", "Reach"],
  maxSize: 30,
};

function item(branchId: number, name: string, family: string, instituteType = "NIT"): CatalogueItem {
  return {
    branchId,
    branchName: `${name} Branch`,
    family,
    degree: "B.Tech",
    instituteId: 1,
    instituteName: "Test Institute",
    instituteShort: "TI",
    instituteCity: "Test City",
    instituteType,
  };
}

function row(overrides: Partial<CutoffRow> & { branchId: number; closingRank: number }): CutoffRow {
  return {
    snapshotId: 1,
    round: "1",
    snapRound: "1",
    quota: "OS",
    category: "OPEN",
    openingRank: Math.max(1, overrides.closingRank - 500),
    year: 2025,
    ingestedAt: "2025-07-01T00:00:00.000Z",
    isIllustrative: true,
    rankType: "CRL",
    source: { url: "https://example.source/josaa-2025.csv", dataYear: 2025, kind: "illustrative", publisher: "Illustrative" },
    ...overrides,
  };
}

function data(overrides?: Partial<PlannerData>): PlannerData {
  return {
    catalogue: [
      item(1, "Computer Science", "CSE"),
      item(2, "Information Tech", "IT"),
      item(3, "Mechanical", "MECH"),
      item(4, "Civil", "CIVIL"),
    ],
    rows: [
      row({ branchId: 1, closingRank: 800 }),
      row({ branchId: 2, closingRank: 1500 }),
      row({ branchId: 3, closingRank: 800 }),
    ],
    seats: [{ branchId: 1, snapshotId: 1, totalSeats: 30 }],
    ...overrides,
  };
}

describe("resolvePreferences", () => {
  it("preserves the explicit order of stated preferences", () => {
    expect(resolvePreferences(undefined, ["MECH", "CSE"]).order).toEqual(["MECH", "CSE"]);
  });

  it("never invents a preference for an unknown family and warns instead", () => {
    const r = resolvePreferences(undefined, ["MECH", "SPACE"]);
    expect(r.order).toEqual(["MECH", "SPACE"]);
    expect(r.warnings.join(" ")).toContain("SPACE");
  });

  it("falls back to the documented neutral order when no preference info exists", () => {
    expect(resolvePreferences("undecided").order).toEqual([...NEUTRAL_FAMILY_ORDER]);
    expect(resolvePreferences(undefined).order).toEqual([...NEUTRAL_FAMILY_ORDER]);
  });
});

describe("buildPlan (pure)", () => {
  const out = buildPlan(REQ, data(), { nowYear: 2026 });

  it("is deterministic for identical inputs", () => {
    const again = buildPlan(REQ, data(), { nowYear: 2026 });
    expect(again).toEqual(out);
  });

  it("orders primarily by goal preference, not tier strength", () => {
    expect(out.options.map((o) => o.branch.family)).toEqual(["CSE", "IT", "MECH", "CIVIL"]);
    expect(out.options[0].tier).toBe("Reach");
    expect(out.options[1].tier).toBe("Safe");
  });

  it("applies maxSize after ordering (tiered rows first)", () => {
    const p = buildPlan({ ...REQ, maxSize: 2 }, data(), { nowYear: 2026 });
    expect(p.options.length).toBe(2);
    expect(p.options.map((o) => o.branch.family)).toEqual(["CSE", "IT"]);
  });

  it("lists missing-data options last, without tiers, and explains why", () => {
    const last = out.options[out.options.length - 1];
    expect(last.branch.family).toBe("CIVIL");
    expect(last.tier).toBeNull();
    expect(last.cutoff).toBeNull();
    expect(last.source).toBeNull();
    expect(last.explanation).toContain("No data");
    expect(out.counts.noData).toBe(1);
  });

  it("excludes options outside the provisional ranges (no tier, not 'No data')", () => {
    const p = buildPlan(REQ, { ...data(), rows: [row({ branchId: 1, closingRank: 700 })], seats: [] }, { nowYear: 2026 });
    expect(p.options.find((o) => o.branch.family === "CSE")).toBeUndefined();
  });

  it("excludes records incompatible with the requested seat pool and counts them", () => {
    const p = buildPlan(REQ, data({
      rows: [row({ branchId: 1, closingRank: 1500 }), row({ branchId: 2, closingRank: 950, quota: "AI" })],
    }), { nowYear: 2026 });
    expect(p.options.find((o) => o.branch.family === "IT")?.tier).toBeNull();
    expect(p.warnings.join(" ")).toContain("incompatible");
  });

  it("excludes institute types whose pool is not defined in the MVP and counts them", () => {
    const p = buildPlan(REQ, data({
      catalogue: [item(1, "Computer Science", "CSE"), item(5, "GFTI Branch", "MISC", "GFTI")],
      rows: [row({ branchId: 1, closingRank: 1500 }), row({ branchId: 5, closingRank: 1400 })],
    }), { nowYear: 2026 });
    expect(p.options.find((o) => o.branch.family === "MISC")?.tier).toBeNull();
    expect(p.warnings.join(" ")).toContain("incompatible");
  });

  it("excludes records of other categories and rank types", () => {
    const p = buildPlan(REQ, data({
      rows: [row({ branchId: 1, closingRank: 1500 }), row({ branchId: 2, closingRank: 950, category: "OBC" }), row({ branchId: 3, closingRank: 800, rankType: "STATE" })],
    }), { nowYear: 2026 });
    expect(p.options[0].branch.family).toBe("CSE");
    expect(p.options.filter((o) => o.tier !== null).length).toBe(1);
    expect(p.warnings.join(" ")).toContain("2 cutoff record(s) were ignored");
  });

  it("never compares against older snapshots: only the latest ingestion batch is used", () => {
    const old = row({ branchId: 1, closingRank: 700, snapshotId: 2, year: 2023, ingestedAt: "2024-07-01T00:00:00.000Z" });
    const newer = row({ branchId: 1, closingRank: 1500, snapshotId: 3, year: 2025, ingestedAt: "2025-07-01T00:00:00.000Z" });
    const p = buildPlan(REQ, { ...data(), rows: [old, newer] }, { nowYear: 2026 });
    expect(p.options.find((o) => o.branch.family === "CSE")?.cutoff?.year).toBe(2025);
    expect(p.basedOn?.year).toBe(2025);
  });

  it("picks the latest round of the snapshot when a branch has several rounds", () => {
    const p = buildPlan(REQ, data({
      rows: [row({ branchId: 1, closingRank: 1500, round: "3" }), row({ branchId: 1, closingRank: 1600, round: "5" })],
    }), { nowYear: 2026 });
    expect(p.options.find((o) => o.branch.family === "CSE")?.cutoff?.round).toBe("5");
  });

  it("preserves the source URL and data year on every tiered fact", () => {
    for (const o of out.options.filter((x) => x.tier !== null)) {
      expect(o.source?.url).toBe("https://example.source/josaa-2025.csv");
      expect(o.source?.dataYear).toBe(2025);
      expect(o.cutoff?.year).toBe(2025);
    }
  });

  it("warns about stale data and heuristic uncertainty", () => {
    expect(out.warnings.join(" ")).toContain("2025");
    expect(out.warnings.join(" ")).toContain("UNVALIDATED heuristic");
  });

  it("attaches seat counts when available", () => {
    expect(out.options.find((o) => o.branch.family === "CSE")?.seats).toBe(30);
    expect(out.options.find((o) => o.branch.family === "IT")?.seats).toBeNull();
  });

  it("returns a usable plan even when nothing is ingested yet", () => {
    const p = buildPlan(REQ, { catalogue: data().catalogue, rows: [], seats: [] }, { nowYear: 2026 });
    expect(p.basedOn).toBeNull();
    expect(p.options.every((o) => o.tier === null)).toBe(true);
    expect(p.warnings.join(" ")).toContain("No cutoff data");
  });
});

describe("buildPlan against the real seeded database (read-only)", () => {
  it("traces facts to the illustrative source and keeps the no-data branch tierless", () => {
    runSeed();
    const plan = buildPlan(
      { rank: 2000, category: "OPEN", quota: "OS", goalId: "computer-science", includeTypes: ["Safe", "Target", "Reach"], maxSize: 30 },
      loadPlannerData(db),
      { nowYear: 2026 }
    );
    expect(plan.basedOn?.sourceUrl).toBe("illustrative://tiny-counsellor/seed-v1");
    expect(plan.basedOn?.dataYear).toBe(2025);
    expect(plan.basedOn?.isIllustrative).toBe(true);
    expect(plan.options.map((o) => [o.branch.family, o.tier])).toEqual([
      ["CSE", "Target"],
      ["ECE", "Safe"],
      ["IT", null],
    ]);
    expect(plan.counts).toEqual({ safe: 1, target: 1, reach: 0, noData: 1 });
  });
});
