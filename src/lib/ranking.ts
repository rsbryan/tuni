import { RankedEntry, Tier, TierLists } from "./types";

// Tiered scoring: each tier owns a fixed slice of the 0-10 scale and
// items are spread evenly across their tier's slice by rank position.
export const TIER_ORDER: Tier[] = ["liked", "fine", "disliked"];

export const TIER_RANGES: Record<Tier, [number, number]> = {
  liked: [6.7, 10],
  fine: [3.4, 6.6],
  disliked: [0, 3.3],
};

// Binary-search insertion driven by head-to-head picks.
// The candidate is being placed into a list where index 0 is the best item.
// [lo, hi) is the range of indices where the candidate could still land.
export interface InsertionState {
  lo: number;
  hi: number;
}

export function startInsertion(listLength: number): InsertionState {
  return { lo: 0, hi: listLength };
}

export function isResolved(state: InsertionState): boolean {
  return state.lo >= state.hi;
}

export function comparisonIndex(state: InsertionState): number {
  return Math.floor((state.lo + state.hi) / 2);
}

export function advance(
  state: InsertionState,
  preferCandidate: boolean
): InsertionState {
  const mid = comparisonIndex(state);
  return preferCandidate
    ? { lo: state.lo, hi: mid }
    : { lo: mid + 1, hi: state.hi };
}

// "Too close to call" ends the search and drops the candidate at the pivot.
export function resolveTooClose(state: InsertionState): InsertionState {
  const mid = comparisonIndex(state);
  return { lo: mid, hi: mid };
}

export function maxComparisons(listLength: number): number {
  return listLength === 0 ? 0 : Math.ceil(Math.log2(listLength + 1));
}

// Tier picks are coarse; a song landing at the very edge of its tier may
// really belong in the neighboring tier. These checks add at most two extra
// comparisons, and only for edge placements, to catch that.
export type BoundarySide = "upper" | "lower";

export function adjacentTier(tier: Tier, side: BoundarySide): Tier | null {
  const i = TIER_ORDER.indexOf(tier);
  const j = side === "upper" ? i - 1 : i + 1;
  return TIER_ORDER[j] ?? null;
}

export function boundaryChecks(
  tier: Tier,
  index: number,
  lists: TierLists
): BoundarySide[] {
  const checks: BoundarySide[] = [];
  const upper = adjacentTier(tier, "upper");
  if (index === 0 && upper && lists[upper].length > 0) {
    checks.push("upper");
  }
  const lower = adjacentTier(tier, "lower");
  if (index === lists[tier].length && lower && lists[lower].length > 0) {
    checks.push("lower");
  }
  return checks;
}

export function scoreFor(tier: Tier, index: number, count: number): number {
  const [lo, hi] = TIER_RANGES[tier];
  const score = hi - ((index + 0.5) * (hi - lo)) / count;
  return Math.round(score * 10) / 10;
}

export function flattenRanked(lists: TierLists): RankedEntry[] {
  return [...lists.liked, ...lists.fine, ...lists.disliked];
}

export interface ScoredEntry {
  entry: RankedEntry;
  rank: number;
  score: number;
}

export function scoredEntries(lists: TierLists): ScoredEntry[] {
  const rows: ScoredEntry[] = [];
  let rank = 1;
  for (const tier of TIER_ORDER) {
    const tierList = lists[tier];
    tierList.forEach((entry, i) => {
      rows.push({
        entry,
        rank: rank++,
        score: scoreFor(tier, i, tierList.length),
      });
    });
  }
  return rows;
}
