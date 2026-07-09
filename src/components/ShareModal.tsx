"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { scoredEntries } from "@/lib/ranking";
import { renderShareCard } from "@/lib/share-card";
import { ItemKind } from "@/lib/types";
import { useLibrary } from "@/store/library";

const TOP_N = 10;

function computedFontFamily(className: string): string {
  const probe = document.createElement("span");
  probe.className = className;
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  document.body.appendChild(probe);
  const family = getComputedStyle(probe).fontFamily;
  probe.remove();
  return family;
}

export function ShareModal({
  kind,
  onClose,
}: {
  kind: ItemKind;
  onClose: () => void;
}) {
  const lists = useLibrary((s) => (kind === "song" ? s.songs : s.albums));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"rendering" | "ready" | "error">(
    "rendering"
  );
  const count = scoredEntries(lists).length;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rows = scoredEntries(lists).slice(0, TOP_N);
    if (rows.length === 0) return;
    let cancelled = false;
    renderShareCard(canvas, kind, rows, {
      sans: computedFontFamily("font-sans"),
      serif: computedFontFamily("font-display"),
      mono: computedFontFamily("font-mono"),
    })
      .then(() => {
        if (!cancelled) setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [lists, kind]);

  const download = () => {
    canvasRef.current?.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tunordi-top-${kind}s.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[6vh]">
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
        className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display italic text-2xl">Share your top 10</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full border border-line text-muted hover:text-ink hover:border-muted transition-colors"
          >
            &times;
          </button>
        </div>

        {count === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            Rank some {kind === "song" ? "songs" : "albums"} first, then come
            back for your card.
          </p>
        ) : (
          <>
            <div className="max-h-[62vh] overflow-y-auto scrollbar-none rounded-2xl border border-line">
              <canvas ref={canvasRef} className="w-full" />
            </div>
            {status === "error" && (
              <p className="mt-3 text-sm text-disliked">
                Could not render the card. Try again.
              </p>
            )}
            <button
              onClick={download}
              disabled={status !== "ready"}
              className="mt-4 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110 transition-[filter]"
            >
              {status === "rendering" ? "Rendering..." : "Download image"}
            </button>
          </>
        )}
      </motion.div>
    </div>
  );
}
