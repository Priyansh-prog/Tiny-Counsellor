import type { PlanOption, PlanRequest, PlanResponse, Tier } from "../../../shared/types.js";
import { GOALS, SUPPORTED_TIERS } from "../../../shared/types.js";
import type { CatalogueItem, CutoffRow, PlannerData } from "./data.js";
import { tierOf } from "./scoring.js";

export const NEUTRAL_FAMILY_ORDER: readonly string[] = ["CSE", "AI", "IT", "ECE", "EE", "MECH", "CIVIL", "MISC"];

const RANK_TYPE = "CRL";

const EXPECTED_POOL: Partial<Record<string, "OS" | "AI">> = { NIT: "OS", IIIT: "AI" };

function roundRank(round: string): number {
  if (round === "final") return 99;
  const n = parseInt(round, 10);
  return Number.isNaN(n) ? 0 : n;
}

export function resolvePreferences(
  goalId: PlanRequest["goalId"],
  preferredFamilies?: string[]
): { order: string[]; warnings: string[] } {
  const warnings: string[] = [];
  if (preferredFamilies && preferredFamilies.length > 0) {
    for (const f of preferredFamilies) {
      if (!NEUTRAL_FAMILY_ORDER.includes(f)) {
        warnings.push(`Preference "${f}" is not a branch family we know; kept as stated but no option can match it (no invented preference).`);
      }
    }
    return { order: [...preferredFamilies], warnings };
  }
  const goal = goalId ? GOALS[goalId] : undefined;
  if (goal && goal.families.length > 0) return { order: [...goal.families], warnings };
  return { order: [...NEUTRAL_FAMILY_ORDER], warnings };
}

function neutralIndex(family: string): number {
  const i = NEUTRAL_FAMILY_ORDER.indexOf(family);
  return i === -1 ? NEUTRAL_FAMILY_ORDER.length : i;
}

function prefIndex(prefs: string[], family: string): number {
  const i = prefs.indexOf(family);
  return i === -1 ? prefs.length : i;
}

export function buildPlan(req: PlanRequest, data: PlannerData, opts: { nowYear: number }): PlanResponse {
  const warnings: string[] = [];
  const prefs = resolvePreferences(req.goalId, req.preferredFamilies);
  warnings.push(...prefs.warnings);
  const includeTiers: Tier[] = req.includeTypes ?? [...SUPPORTED_TIERS];

  const catalogueByBranch = new Map<number, CatalogueItem>(data.catalogue.map((c) => [c.branchId, c]));

  let latest: CutoffRow | null = null;
  for (const r of data.rows) {
    if (
      !latest ||
      r.ingestedAt > latest.ingestedAt ||
      (r.ingestedAt === latest.ingestedAt && r.snapshotId > latest.snapshotId)
    ) {
      latest = r;
    }
  }

  let basedOn: PlanResponse["basedOn"] = null;
  const snapshotRows: CutoffRow[] = latest ? data.rows.filter((r) => r.snapshotId === latest!.snapshotId) : [];
  if (latest) {
    basedOn = {
      year: latest.year,
      round: latest.snapRound,
      ingestedAt: latest.ingestedAt,
      isIllustrative: latest.isIllustrative,
      rankType: latest.rankType,
      sourceUrl: latest.source.url,
      dataYear: latest.source.dataYear,
    };
  }

  let incompatibleCount = 0;
  const byBranch = new Map<number, CutoffRow[]>();
  for (const r of snapshotRows) {
    if (r.category === req.category && r.rankType === RANK_TYPE && r.quota === req.quota) {
      const list = byBranch.get(r.branchId) ?? [];
      list.push(r);
      byBranch.set(r.branchId, list);
    } else {
      incompatibleCount += 1;
    }
  }

  const bestFor = new Map<number, CutoffRow>();
  for (const [branchId, list] of byBranch) {
    list.sort((a, b) => roundRank(b.round) - roundRank(a.round));
    const best = list[0];
    const item = catalogueByBranch.get(branchId);
    const expectedPool = item ? EXPECTED_POOL[item.instituteType] : undefined;
    if (expectedPool !== req.quota) {
      incompatibleCount += 1;
      continue;
    }
    bestFor.set(branchId, best);
  }

  const seatsByBranch = new Map<number, number | null>();
  if (latest) {
    for (const s of data.seats) {
      if (s.snapshotId === latest.snapshotId) seatsByBranch.set(s.branchId, s.totalSeats);
    }
  }

  const tierIdx = (t: Tier) => SUPPORTED_TIERS.indexOf(t);
  const tiered: PlanOption[] = [];
  const noData: { item: CatalogueItem; reason: string }[] = [];

  for (const item of data.catalogue) {
    const row = bestFor.get(item.branchId);
    if (!row || row.closingRank == null) {
      noData.push({ item, reason: row ? "the stored record has empty rank fields" : "no compatible record exists" });
      continue;
    }
    const tier = tierOf(req.rank, row.closingRank);
    if (tier == null) continue;
    if (!includeTiers.includes(tier)) continue;
    tiered.push({
      branch: { name: item.branchName, family: item.family, degree: item.degree },
      institute: {
        name: item.instituteName,
        shortName: item.instituteShort,
        city: item.instituteCity,
        type: item.instituteType,
      },
      tier,
      cutoff: { year: row.year, round: row.round, openingRank: row.openingRank, closingRank: row.closingRank },
      seats: seatsByBranch.get(item.branchId) ?? null,
      source: { url: row.source.url, dataYear: row.source.dataYear, kind: row.source.kind },
      explanation: "",
    });
  }

  tiered.sort((a, b) => {
    const pa = prefIndex(prefs.order, a.branch.family);
    const pb = prefIndex(prefs.order, b.branch.family);
    if (pa !== pb) return pa - pb;
    const ta = tierIdx(a.tier!);
    const tb = tierIdx(b.tier!);
    if (ta !== tb) return ta - tb;
    if (a.cutoff!.closingRank !== b.cutoff!.closingRank) {
      return a.cutoff!.closingRank! - b.cutoff!.closingRank!;
    }
    return a.branch.name.localeCompare(b.branch.name) || a.institute.name.localeCompare(b.institute.name);
  });

  noData.sort(
    (a, b) =>
      prefIndex(prefs.order, a.item.family) - prefIndex(prefs.order, b.item.family) ||
      neutralIndex(a.item.family) - neutralIndex(b.item.family) ||
      a.item.branchName.localeCompare(b.item.branchName) ||
      a.item.instituteName.localeCompare(b.item.instituteName)
  );

  const goal = req.goalId ? GOALS[req.goalId].label : undefined;
  const cut = [...tiered, ...noData.map((n) => n.item.branchId)].slice(0, req.maxSize);

  const options: PlanOption[] = [];
  const noDataById = new Map(noData.map((n) => [n.item.branchId, n]));
  for (const entry of cut) {
    if (typeof entry === "number") {
      const { item, reason } = noDataById.get(entry)!;
      const p = prefIndex(prefs.order, item.family);
      const prefTxt = p < prefs.order.length ? `Preference ${p + 1} (${item.family}). ` : `${item.family} (after your listed preferences). `;
      options.push({
        branch: { name: item.branchName, family: item.family, degree: item.degree },
        institute: {
          name: item.instituteName,
          shortName: item.instituteShort,
          city: item.instituteCity,
          type: item.instituteType,
        },
        tier: null,
        cutoff: null,
        seats: seatsByBranch.get(item.branchId) ?? null,
        source: null,
        explanation: `${goal ? `Goal "${goal}": ` : ""}${prefTxt}No compatible ${req.category}/${req.quota} cutoff because ${reason} — shown as "No data".`,
      });
      continue;
    }
    const o = entry;
    const p = prefIndex(prefs.order, o.branch.family);
    const prefTxt =
      p < prefs.order.length ? `Preference ${p + 1} (${o.branch.family}). ` : `${o.branch.family} (after your listed preferences). `;
    o.explanation = `${goal ? `Goal "${goal}": ` : ""}${prefTxt}${o.tier} — ${o.cutoff!.year} round ${o.cutoff!.round} ${req.category}/${req.quota} closing rank ${o.cutoff!.closingRank} vs your rank ${req.rank}${basedOn?.isIllustrative ? " (ILLUSTRATIVE data)" : ""}.`;
    options.push(o);
  }

  const counts = {
    safe: options.filter((o) => o.tier === "Safe").length,
    target: options.filter((o) => o.tier === "Target").length,
    reach: options.filter((o) => o.tier === "Reach").length,
    noData: options.filter((o) => o.tier === null).length,
  };

  if (basedOn?.isIllustrative) {
    warnings.push("The current dataset is ILLUSTRATIVE seed data — NOT official JoSAA data. Verify before relying on it.");
  }
  if (basedOn && basedOn.year < opts.nowYear) {
    warnings.push(`Cutoff data is from ${basedOn.year} (round ${basedOn.round}); JoSAA cutoffs shift year to year.`);
  }
  if (latest == null) {
    warnings.push("No cutoff data ingested yet — every option is shown as 'No data'.");
  }
  warnings.push(
    "Tiers use an UNVALIDATED heuristic on historical closing ranks (>=1.43x, >=0.91x, >=0.71x your rank) — not a prediction of admission."
  );
  if (counts.noData > 0) {
    warnings.push(`${counts.noData} option(s) are listed without cutoff data and carry no tier.`);
  }
  if (incompatibleCount > 0) {
    warnings.push(`${incompatibleCount} cutoff record(s) were ignored as incompatible (category, rank type, or seat pool).`);
  }
  if (tiered.length === 0 && options.length > 0) {
    warnings.push("No option matched the requested tiers for your rank; only 'No data' rows are listed.");
  }

  return {
    ok: true,
    input: { ...req, rankType: RANK_TYPE },
    basedOn,
    options,
    counts,
    warnings,
  };
}
