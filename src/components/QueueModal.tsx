"use client";

import { motion } from "motion/react";
import { MusicItem } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { Artwork } from "./Artwork";

export function QueueModal({
  onRank,
  onClose,
}: {
  onRank: (item: MusicItem) => void;
  onClose: () => void;
}) {
  const queue = useLibrary((s) => s.queue);
  const removeFromQueue = useLibrary((s) => s.removeFromQueue);
  const clearQueue = useLibrary((s) => s.clearQueue);

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
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display italic text-2xl">
            Up next{" "}
            <span className="font-mono not-italic text-sm text-muted tabular-nums">
              {queue.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {queue.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Remove everything from the queue?")) {
                    clearQueue();
                  }
                }}
                className="rounded-lg px-2.5 py-1 text-xs text-muted hover:text-disliked transition-colors"
              >
                Clear all
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close"
              className="h-8 w-8 rounded-full border border-line text-muted hover:text-ink hover:border-muted transition-colors"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-y-auto scrollbar-none p-2">
          {queue.length === 0 && (
            <p className="p-6 text-center text-sm text-muted">
              Queue is empty. Import or search to add more.
            </p>
          )}
          {queue.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-surface-2 transition-colors"
            >
              <Artwork item={item} className="h-11 w-11 shrink-0 rounded-lg text-sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.title}</p>
                <p className="truncate text-xs text-muted">
                  {item.artist}
                  <span className="ml-1.5 rounded bg-surface-2 px-1 py-0.5 font-mono text-[10px] uppercase">
                    {item.kind}
                  </span>
                </p>
              </div>
              <button
                onClick={() => removeFromQueue(item.id)}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-disliked hover:border-muted transition-colors"
              >
                Remove
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
