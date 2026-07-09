import { describe, expect, it } from "vitest";
import {
  adjacentTier,
  advance,
  boundaryChecks,
  comparisonIndex,
  isResolved,
  maxComparisons,
  resolveTooClose,
  scoreFor,
  startInsertion,
  TIER_RANGES,
} from "./ranking";
import { emptyTierLists, RankedEntry, Tier } from "./types";

// Simulates a user whose true preference for the candidate is a numeric
// strength; existing list items are strengths sorted descending.
function runInsertion(list: number[], candidate: number): number {
  let state = startInsertion(list.length);
  let comparisons = 0;
  while (!isResolved(state)) {
    const rival = list[comparisonIndex(state)];
    state = advance(state, candidate > rival);
    comparisons += 1;
    expect(comparisons).toBeLessThanOrEqual(maxComparisons(list.length));
  }
  return state.lo;
}

describe("binary insertion", () => {
  it("inserts into an empty list without comparisons", () => {
    const state = startInsertion(0);
    expect(isResolved(state)).toBe(true);
    expect(state.lo).toBe(0);
  });

  it("finds the correct slot for any candidate", () => {
    const list = [90, 80, 70, 60, 50, 40, 30];
    expect(runInsertion(list, 95)).toBe(0);
    expect(runInsertion(list, 85)).toBe(1);
    expect(runInsertion(list, 65)).toBe(3);
    expect(runInsertion(list, 35)).toBe(6);
    expect(runInsertion(list, 10)).toBe(7);
  });

  it("keeps the list sorted across sequential insertions", () => {
    const values = [55, 90, 10, 70, 30, 80, 20, 60, 40, 50];
    const list: number[] = [];
    for (const v of values) {
      list.splice(runInsertion(list, v), 0, v);
    }
    expect(list).toEqual([...values].sort((a, b) => b - a));
  });

  it("resolves too-close at the current pivot", () => {
    const state = resolveTooClose(startInsertion(8));
    expect(isResolved(state)).toBe(true);
    expect(state.lo).toBe(4);
  });
});

describe("boundary checks", () => {
  function entry(id: string, tier: Tier): RankedEntry {
    return {
      id,
      kind: "song",
      title: id,
      artist: "x",
      tier,
      rankedAt: 0,
    };
  }

  function lists(liked: number, fine: number, disliked: number) {
    const result = emptyTierLists();
    for (let i = 0; i < liked; i++) result.liked.push(entry(`l${i}`, "liked"));
    for (let i = 0; i < fine; i++) result.fine.push(entry(`f${i}`, "fine"));
    for (let i = 0; i < disliked; i++)
      result.disliked.push(entry(`d${i}`, "disliked"));
    return result;
  }

  it("maps adjacent tiers correctly", () => {
    expect(adjacentTier("fine", "upper")).toBe("liked");
    expect(adjacentTier("fine", "lower")).toBe("disliked");
    expect(adjacentTier("liked", "upper")).toBeNull();
    expect(adjacentTier("disliked", "lower")).toBeNull();
  });

  it("skips checks for mid-tier placements", () => {
    expect(boundaryChecks("fine", 2, lists(3, 5, 3))).toEqual([]);
  });

  it("checks upward when placed at the top of a tier", () => {
    expect(boundaryChecks("fine", 0, lists(3, 5, 3))).toEqual(["upper"]);
  });

  it("checks downward when placed at the bottom of a tier", () => {
    expect(boundaryChecks("fine", 5, lists(3, 5, 3))).toEqual(["lower"]);
  });

  it("checks both sides for the first item in a tier", () => {
    expect(boundaryChecks("fine", 0, lists(3, 0, 3))).toEqual([
      "upper",
      "lower",
    ]);
  });

  it("never checks past the ends of the scale", () => {
    expect(boundaryChecks("liked", 0, lists(0, 5, 3))).toEqual(["lower"]);
    expect(boundaryChecks("disliked", 3, lists(3, 5, 3))).toEqual([]);
    expect(boundaryChecks("liked", 0, lists(0, 0, 0))).toEqual([]);
  });
});

describe("scoring", () => {
  it("places a lone item at the middle of its tier range", () => {
    const [lo, hi] = TIER_RANGES.liked;
    // Scores round to one decimal, so allow that much drift from the midpoint.
    expect(Math.abs(scoreFor("liked", 0, 1) - (lo + hi) / 2)).toBeLessThanOrEqual(0.06);
  });

  it("is strictly decreasing by rank within a tier", () => {
    const n = 12;
    for (let i = 1; i < n; i++) {
      expect(scoreFor("liked", i, n)).toBeLessThan(scoreFor("liked", i - 1, n));
    }
  });

  it("never crosses tier boundaries", () => {
    const n = 50;
    expect(scoreFor("liked", 0, n)).toBeLessThanOrEqual(10);
    expect(scoreFor("liked", n - 1, n)).toBeGreaterThanOrEqual(6.7);
    expect(scoreFor("fine", 0, n)).toBeLessThanOrEqual(6.6);
    expect(scoreFor("fine", n - 1, n)).toBeGreaterThanOrEqual(3.4);
    expect(scoreFor("disliked", 0, n)).toBeLessThanOrEqual(3.3);
    expect(scoreFor("disliked", n - 1, n)).toBeGreaterThanOrEqual(0);
  });
});
