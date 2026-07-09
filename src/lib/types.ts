export type ItemKind = "song" | "album";

export type Tier = "liked" | "fine" | "disliked";

export interface MusicItem {
  id: string;
  kind: ItemKind;
  title: string;
  artist: string;
  imageUrl?: string;
  albumName?: string;
  year?: string;
  spotifyUrl?: string;
  genres?: string[];
  artistIds?: string[];
}

export interface RankedEntry extends MusicItem {
  tier: Tier;
  rankedAt: number;
}

export type TierLists = Record<Tier, RankedEntry[]>;

export function emptyTierLists(): TierLists {
  return { liked: [], fine: [], disliked: [] };
}
