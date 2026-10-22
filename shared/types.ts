export type Tier = "Safe" | "Target" | "Reach";
export const SUPPORTED_TIERS: Tier[] = ["Safe", "Target", "Reach"];

export type Category = "OPEN";
export const SUPPORTED_CATEGORIES: Category[] = ["OPEN"];

export type Quota = "OS" | "AI";
export const SUPPORTED_QUOTAS: Quota[] = ["OS", "AI"];
export const QUOTA_LABELS: Record<Quota, string> = {
  OS: "Other-State pool (NITs in MVP data)",
  AI: "All-India pool (IIITs/GFTIs in MVP data)",
};

export type GoalId = "computer-science" | "electronics" | "core-engineering" | "undecided";
export const GOAL_IDS: GoalId[] = ["computer-science", "electronics", "core-engineering", "undecided"];
export const GOALS: Record<GoalId, { label: string; families: string[] }> = {
  "computer-science": { label: "Software / CS industry", families: ["CSE", "AI", "IT", "ECE"] },
  electronics: { label: "Electronics & hardware", families: ["ECE", "EE", "CSE"] },
  "core-engineering": { label: "Core engineering (mech/civil)", families: ["MECH", "CIVIL", "EE", "ECE"] },
  undecided: { label: "Undecided — neutral order", families: [] },
};

export type PlanRequest = {
  rank: number;
  category: Category;
  quota: Quota;
  goalId?: GoalId;
  preferredFamilies?: string[];
  includeTypes?: Tier[];
  maxSize?: number;
};

export type PlanOption = {
  branch: { name: string; family: string; degree: string };
  institute: { name: string; shortName: string | null; city: string | null; type: string };
  tier: Tier | null;
  cutoff: { year: number; round: string; openingRank: number | null; closingRank: number | null } | null;
  seats: number | null;
  source: { url: string; dataYear: number; kind: string } | null;
  explanation: string;
};

export type PlanResponse = {
  ok: true;
  input: PlanRequest & { rankType: "CRL" };
  basedOn: {
    year: number;
    round: string;
    ingestedAt: string;
    isIllustrative: boolean;
    rankType: string;
    sourceUrl: string;
    dataYear: number;
  } | null;
  options: PlanOption[];
  counts: { safe: number; target: number; reach: number; noData: number };
  warnings: string[];
};

export type PlanErrorResponse = { ok: false; errors: string[] };
