import { describe, expect, it } from "vitest";
import { dedupeKey } from "./dedupe";
import { MusicItem } from "./types";

function song(id: string, title: string, artist: string): MusicItem {
  return { id, kind: "song", title, artist };
}

describe("dedupeKey", () => {
  it("matches the same song under different IDs", () => {
    expect(dedupeKey(song("a", "Dreams", "Fleetwood Mac"))).toBe(
      dedupeKey(song("b", "Dreams", "Fleetwood Mac"))
    );
  });

  it("ignores remaster and version suffixes", () => {
    const original = song("a", "Dreams", "Fleetwood Mac");
    expect(dedupeKey(song("b", "Dreams - 2004 Remaster", "Fleetwood Mac"))).toBe(
      dedupeKey(original)
    );
    expect(dedupeKey(song("c", "Dreams (Remastered)", "Fleetwood Mac"))).toBe(
      dedupeKey(original)
    );
  });

  it("ignores featured-artist noise and secondary artists", () => {
    expect(
      dedupeKey(song("a", "Sicko Mode (feat. Drake)", "Travis Scott, Drake"))
    ).toBe(dedupeKey(song("b", "Sicko Mode", "Travis Scott")));
  });

  it("keeps genuinely different songs and artists apart", () => {
    expect(dedupeKey(song("a", "Dreams", "Fleetwood Mac"))).not.toBe(
      dedupeKey(song("b", "Dreams", "The Cranberries"))
    );
    expect(dedupeKey(song("a", "Dreams", "Fleetwood Mac"))).not.toBe(
      dedupeKey(song("b", "The Chain", "Fleetwood Mac"))
    );
  });

  it("separates songs from albums with the same name", () => {
    const album: MusicItem = {
      id: "x",
      kind: "album",
      title: "Dreams",
      artist: "Fleetwood Mac",
    };
    expect(dedupeKey(album)).not.toBe(
      dedupeKey(song("a", "Dreams", "Fleetwood Mac"))
    );
  });
});
