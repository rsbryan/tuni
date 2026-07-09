"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { searchDemo } from "@/lib/demo-data";
import { isConnected, searchSpotify } from "@/lib/spotify";
import { ItemKind, MusicItem } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { Artwork } from "./Artwork";

const DEBOUNCE_MS = 350;

// This modal only mounts after user interaction, so reading localStorage in
// state initializers is safe.
export function SearchModal({
  initialKind,
  onRank,
  onClose,
}: {
  initialKind: ItemKind;
  onRank: (item: MusicItem) => void;
  onClose: () => void;
}) {
  const [kind, setKind] = useState<ItemKind>(initialKind);
  const [query, setQuery] = useState("");
  const [spotifyResults, setSpotifyResults] = useState<MusicItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<Set<string>>(new Set());
  const [connected] = useState(() => isConnected());
  const addToQueue = useLibrary((s) => s.addToQueue);

  useEffect(() => {
    if (!connected || !query.trim()) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchSpotify(query, kind);
        if (!cancelled) {
          setSpotifyResults(items);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Search failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, kind, connected]);

  const results = connected
    ? query.trim()
      ? spotifyResults
      : []
    : searchDemo(query, kind);

  const queueItem = (item: MusicItem) => {
    addToQueue([item]);
    setQueued((prev) => new Set(prev).add(item.id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh]">
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="relative w-full max-w-xl rounded-3xl border border-line bg-surface shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              connected
                ? `Search Spotify for ${kind === "song" ? "songs" : "albums"}...`
                : "Search the demo library..."
            }
            className="flex-1 bg-transparent text-lg outline-none placeholder:text-muted"
          />
          <div className="flex rounded-full border border-line p-0.5 text-xs">
            {(["song", "album"] as ItemKind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={`rounded-full px-3 py-1 capitalize transition-colors ${
                  kind === k ? "bg-ink text-black font-medium" : "text-muted"
                }`}
              >
                {k}s
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto scrollbar-none p-2">
          {error && <p className="p-4 text-sm text-disliked">{error}</p>}
          {loading && <p className="p-4 text-sm text-muted">Searching...</p>}
          {!loading && results.length === 0 && query.trim() && (
            <p className="p-4 text-sm text-muted">No matches.</p>
          )}
          {results.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2 transition-colors"
            >
              <Artwork item={item} className="h-11 w-11 shrink-0 rounded-lg text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted">
                  {item.artist}
                  {item.year ? ` · ${item.year}` : ""}
                </p>
              </div>
              <button
                onClick={() => queueItem(item)}
                disabled={queued.has(item.id)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-ink hover:border-muted disabled:opacity-50 transition-colors"
              >
                {queued.has(item.id) ? "Queued" : "Queue"}
              </button>
              <button
                onClick={() => onRank(item)}
                className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-black hover:brightness-110 transition-[filter]"
              >
                Rank
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
