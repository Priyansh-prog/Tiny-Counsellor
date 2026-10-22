import { GOAL_IDS, SUPPORTED_CATEGORIES, SUPPORTED_QUOTAS, SUPPORTED_TIERS } from "../../../shared/types.js";
import type { GoalId, PlanRequest, Quota, Tier } from "../../../shared/types.js";

const RANK_MAX = 2_000_000;
const MAX_SIZE_DEFAULT = 30;
const MAX_SIZE_MAX = 50;

export type ParseResult =
  | { ok: true; request: PlanRequest }
  | { ok: false; errors: string[] };

export function parsePlanRequest(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  const rank = b.rank;
  if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1 || rank > RANK_MAX) {
    errors.push(`rank must be an integer between 1 and ${RANK_MAX}.`);
  }

  if (b.category !== undefined && !SUPPORTED_CATEGORIES.includes(b.category as "OPEN")) {
    errors.push(`category "${String(b.category)}" is not supported; only "OPEN" is available in the MVP.`);
  }

  if (b.quota !== undefined && !SUPPORTED_QUOTAS.includes(b.quota as Quota)) {
    errors.push(`quota must be "OS" (Other-State pool) or "AI" (All-India pool); got "${String(b.quota)}".`);
  }
  if (b.quota === undefined) {
    errors.push('quota is required: "OS" or "AI".');
  }

  if (b.goalId !== undefined && !GOAL_IDS.includes(b.goalId as GoalId)) {
    errors.push(`Unknown goalId "${String(b.goalId)}". Supported: ${GOAL_IDS.join(", ")}.`);
  }

  if (b.preferredFamilies !== undefined) {
    if (!Array.isArray(b.preferredFamilies) || !b.preferredFamilies.every((f) => typeof f === "string")) {
      errors.push("preferredFamilies must be an array of branch-family codes (strings).");
    } else if (b.preferredFamilies.length > 8) {
      errors.push("preferredFamilies must list at most 8 entries.");
    } else if (b.preferredFamilies.every((f) => (f as string).trim().length < 1)) {
      errors.push("preferredFamilies entries must be non-empty strings.");
    }
  }

  if (b.includeTypes !== undefined) {
    if (!Array.isArray(b.includeTypes) || !b.includeTypes.every((t) => SUPPORTED_TIERS.includes(t as Tier))) {
      errors.push(`includeTypes must be an array drawn from ${JSON.stringify(SUPPORTED_TIERS)}.`);
    } else if (b.includeTypes.length === 0) {
      errors.push("includeTypes must contain at least one tier.");
    }
  }

  if (b.maxSize !== undefined) {
    const n = b.maxSize;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > MAX_SIZE_MAX) {
      errors.push(`maxSize must be an integer between 1 and ${MAX_SIZE_MAX}.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const trimList = (v: string[] | undefined): string[] | undefined => {
    if (!v) return undefined;
    const out: string[] = [];
    for (const raw of v) {
      const s = raw.trim();
      if (s && !out.includes(s)) out.push(s);
    }
    return out;
  };
  const dedupeTiers = (v: string[] | undefined): Tier[] | undefined => {
    if (!v) return undefined;
    const out: Tier[] = [];
    for (const t of v) if (!out.includes(t as Tier)) out.push(t as Tier);
    return out;
  };

  const request: PlanRequest = {
    rank: rank as number,
    category: "OPEN",
    quota: b.quota as Quota,
    goalId: b.goalId as PlanRequest["goalId"],
    preferredFamilies: trimList(b.preferredFamilies as string[] | undefined),
    includeTypes: dedupeTiers(b.includeTypes as string[] | undefined) ?? [...SUPPORTED_TIERS],
    maxSize: (b.maxSize as number | undefined) ?? MAX_SIZE_DEFAULT,
  };
  return { ok: true, request };
}
