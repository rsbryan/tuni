"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { QueueModal } from "@/components/QueueModal";
import { RankFlow } from "@/components/RankFlow";
import { RankedList } from "@/components/RankedList";
import { SearchModal } from "@/components/SearchModal";
import { ShareModal } from "@/components/ShareModal";
import { flattenRanked } from "@/lib/ranking";
import { ItemKind, MusicItem } from "@/lib/types";
import { useMounted } from "@/lib/use-mounted";
import { useLibrary } from "@/store/library";

export default function Home() {
  const mounted = useMounted();
  const [tab, setTab] = useState<ItemKind>("song");
  const [searchOpen, setSearchOpen] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [ranking, setRanking] = useState<MusicItem | null>(null);

  const [genre, setGenre] = useState<string | null>(null);
  const queue = useLibrary((s) => s.queue);
  const songCount = useLibrary((s) => flattenRanked(s.songs).length);
  const albumCount = useLibrary((s) => flattenRanked(s.albums).length);
  const lists = useLibrary((s) => (tab === "song" ? s.songs : s.albums));

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of flattenRanked(lists)) {
      for (const g of entry.genres ?? []) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([g]) => g);
  }, [lists]);

  const switchTab = (kind: ItemKind) => {
    setTab(kind);
    setGenre(null);
  };

  const rankNext = () => {
    if (queue.length > 0) setRanking(queue[0]);
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24">
      <header className="flex items-center justify-between py-6">
        <h1 className="font-display text-3xl">
          tunordi<span className="text-accent">.</span>
        </h1>
        <nav className="flex items-center gap-2">
          <Link
            href="/stats"
            className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink hover:border-muted transition-colors"
          >
            Stats
          </Link>
          <button
            onClick={() => setSearchOpen(true)}
            className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink hover:border-muted transition-colors"
          >
            Search
          </button>
          <Link
            href="/import"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-[filter]"
          >
            Import
          </Link>
        </nav>
      </header>

      <section className="py-8 sm:py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-muted">
          Your taste, settled
        </p>
        <h2 className="font-display text-5xl sm:text-6xl leading-[1.05] mt-3">
          Every song you love,
          <br />
          <em className="text-accent">in order.</em>
        </h2>
      </section>

      {mounted && (
        <>
          {queue.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between rounded-2xl border border-accent/30 bg-accent/5 px-5 py-4"
            >
              <button
                onClick={() => setQueueOpen(true)}
                className="text-left text-sm underline-offset-4 hover:underline"
              >
                <span className="font-mono font-semibold text-accent tabular-nums">
                  {queue.length}
                </span>{" "}
                waiting to be ranked
              </button>
              <button
                onClick={rankNext}
                className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-[filter]"
              >
                Rank next
              </button>
            </motion.div>
          )}

          <div className="mb-5 flex items-center gap-6 border-b border-line">
            {(
              [
                { kind: "song" as ItemKind, label: "Songs", count: songCount },
                { kind: "album" as ItemKind, label: "Albums", count: albumCount },
              ]
            ).map(({ kind, label, count }) => (
              <button
                key={kind}
                onClick={() => switchTab(kind)}
                className={`relative pb-3 text-sm font-medium transition-colors ${
                  tab === kind ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {label}
                <span className="ml-1.5 font-mono text-xs text-muted tabular-nums">
                  {count}
                </span>
                {tab === kind && (
                  <motion.span
                    layoutId="tab-underline"
                    className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                  />
                )}
              </button>
            ))}
            <button
              onClick={() => setShareOpen(true)}
              className="ml-auto pb-3 text-sm font-medium text-muted hover:text-ink transition-colors"
            >
              Share
            </button>
          </div>

          {genres.length > 0 && (
            <div className="mb-5 flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setGenre(null)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  genre === null
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-line text-muted hover:text-ink"
                }`}
              >
                All
              </button>
              {genres.map((g) => (
                <button
                  key={g}
                  onClick={() => setGenre(genre === g ? null : g)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    genre === g
                      ? "border-accent/50 bg-accent/10 text-accent"
                      : "border-line text-muted hover:text-ink"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          <RankedList kind={tab} genre={genre} onReRank={setRanking} />
        </>
      )}

      {shareOpen && (
        <ShareModal kind={tab} onClose={() => setShareOpen(false)} />
      )}

      {queueOpen && (
        <QueueModal
          onClose={() => setQueueOpen(false)}
          onRank={(item) => {
            setQueueOpen(false);
            setRanking(item);
          }}
        />
      )}

      {searchOpen && (
        <SearchModal
          initialKind={tab}
          onClose={() => setSearchOpen(false)}
          onRank={(item) => {
            setSearchOpen(false);
            setRanking(item);
          }}
        />
      )}

      {ranking && (
        <RankFlow
          key={ranking.id}
          item={ranking}
          onClose={() => setRanking(null)}
          onNext={rankNext}
        />
      )}
    </div>
  );
}
