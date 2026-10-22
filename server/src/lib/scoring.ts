import type { Tier } from "../../../shared/types.js";

export const SAFE_FACTOR = 1.43;
export const TARGET_FACTOR = 0.91;
export const REACH_FACTOR = 0.71;

export function safeThreshold(rank: number): number {
  return Math.round(SAFE_FACTOR * rank);
}
export function targetThreshold(rank: number): number {
  return Math.round(TARGET_FACTOR * rank);
}
export function reachThreshold(rank: number): number {
  return Math.round(REACH_FACTOR * rank);
}

export function tierOf(rank: number, closingRank: number | null): Tier | null {
  if (closingRank == null) return null;
  if (closingRank >= safeThreshold(rank)) return "Safe";
  if (closingRank >= targetThreshold(rank)) return "Target";
  if (closingRank >= reachThreshold(rank)) return "Reach";
  return null;
}
