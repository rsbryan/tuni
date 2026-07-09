import { MusicItem } from "./types";

// Catches the same recording arriving under different Spotify IDs: playlist
// copies, singles vs album cuts, remaster reissues, deluxe editions.
const VERSION_PARENS =
  /\((?:feat|with|from|remaster|deluxe|expanded|anniversary|bonus|live|edition|version)[^)]*\)/gi;

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    // Spotify puts version info after " - ", e.g. "Dreams - 2004 Remaster"
    .split(" - ")[0]
    .replace(VERSION_PARENS, "")
    .replace(/\s+/g, " ")
    .trim();
}

function primaryArtist(artist: string): string {
  return artist.split(",")[0].toLowerCase().trim();
}

export function dedupeKey(item: MusicItem): string {
  return `${item.kind}|${normalizeTitle(item.title)}|${primaryArtist(item.artist)}`;
}
