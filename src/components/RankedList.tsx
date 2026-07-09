"use client";

import { motion } from "motion/react";
import { scoredEntries } from "@/lib/ranking";
import { ItemKind, MusicItem } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { Artwork } from "./Artwork";
import { ScorePill } from "./ScorePill";

export function RankedList({
  kind,
  genre,
  onReRank,
}: {
  kind: ItemKind;
  genre?: string | null;
  onReRank: (item: MusicItem) => void;
}) {
  const lists = useLibrary((s) => (kind === "song" ? s.songs : s.albums));
  const removeRanked = useLibrary((s) => s.removeRanked);

  // Ranks and scores stay global; the genre filter only hides rows.
  const rows = scoredEntries(lists).filter(
    ({ entry }) => !genre || (entry.genres ?? []).includes(genre)
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-line py-20 text-center fade-up">
        <p className="font-display italic text-2xl text-muted">
          {genre ? `Nothing ranked in ${genre}` : "Nothing ranked yet"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {genre
            ? "Try another genre or clear the filter."
            : `Import from Spotify or search to start ranking ${
                kind === "song" ? "songs" : "albums"
              }.`}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map(({ entry, rank, score }) => (
        <motion.li
          key={entry.id}
          layout
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="group flex items-center gap-3 sm:gap-4 rounded-2xl border border-transparent px-3 py-2 hover:border-line hover:bg-surface transition-colors"
        >
          <span className="w-8 shrink-0 text-right font-mono text-sm text-muted tabular-nums">
            {rank}
          </span>
          <Artwork
            item={entry}
            className="h-12 w-12 shrink-0 rounded-lg text-base"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium leading-snug">{entry.title}</p>
            <p className="truncate text-sm text-muted">{entry.artist}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                removeRanked(kind, entry.id);
                onReRank(entry);
              }}
              className="rounded-lg px-2 py-1 text-xs text-muted hover:text-ink hover:bg-surface-2 transition-colors"
            >
              Re-rank
            </button>
            <button
              onClick={() => removeRanked(kind, entry.id)}
              aria-label={`Remove ${entry.title}`}
              className="rounded-lg px-2 py-1 text-xs text-muted hover:text-disliked hover:bg-surface-2 transition-colors"
            >
              Remove
            </button>
          </div>
          <ScorePill score={score} tier={entry.tier} />
        </motion.li>
      ))}
    </ul>
  );
}
