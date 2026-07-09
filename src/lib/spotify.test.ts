import { describe, expect, it } from "vitest";
import { albumCohesionScore } from "./spotify";

describe("albumCohesionScore", () => {
  it("ranks a mostly-played short album above a one-hit long album", () => {
    // 6 of 8 tracks vs 6 of 24 tracks: same count, very different cohesion
    expect(albumCohesionScore(6, 8, false)).toBeGreaterThan(
      albumCohesionScore(6, 24, false)
    );
    // 4 of 8 tracks beats 5 of 30 tracks: coverage outweighs one extra hit
    expect(albumCohesionScore(4, 8, false)).toBeGreaterThan(
      albumCohesionScore(5, 30, false)
    );
  });

  it("gives saved albums a boost without letting them beat real listening", () => {
    expect(albumCohesionScore(2, 10, true)).toBeGreaterThan(
      albumCohesionScore(2, 10, false)
    );
    expect(albumCohesionScore(0, 10, true)).toBeLessThan(
      albumCohesionScore(3, 10, false)
    );
  });

  it("tolerates missing track totals", () => {
    expect(albumCohesionScore(3, undefined, false)).toBeGreaterThan(0);
    expect(albumCohesionScore(3, 0, false)).toBeGreaterThan(0);
  });
});
