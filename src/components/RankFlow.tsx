"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { startPreview, stopPreview } from "@/lib/preview";
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
  BoundarySide,
  InsertionState,
  TIER_ORDER,
} from "@/lib/ranking";
import { MusicItem, RankedEntry, Tier } from "@/lib/types";
import { useLibrary } from "@/store/library";
import { Artwork } from "./Artwork";
import { ScorePill } from "./ScorePill";

const TIER_CHOICES: { tier: Tier; label: string; sub: string; ring: string }[] = [
  { tier: "liked", label: "Loved it", sub: "One of the good ones", ring: "hover:border-liked/60 hover:bg-liked/5" },
  { tier: "fine", label: "It was fine", sub: "Middle of the road", ring: "hover:border-fine/60 hover:bg-fine/5" },
  { tier: "disliked", label: "Not for me", sub: "Would skip it", ring: "hover:border-disliked/60 hover:bg-disliked/5" },
];

type Step =
  | { name: "tier" }
  | { name: "compare"; tier: Tier; state: InsertionState; asked: number }
  | { name: "boundary"; tier: Tier; index: number; checks: BoundarySide[] }
  | { name: "placed"; tier: Tier; index: number };

export function RankFlow({
  item,
  onClose,
  onNext,
}: {
  item: MusicItem;
  onClose: () => void;
  onNext?: () => void;
}) {
  const [step, setStep] = useState<Step>({ name: "tier" });
  const insertRanked = useLibrary((s) => s.insertRanked);
  const removeRanked = useLibrary((s) => s.removeRanked);
  const skipToBack = useLibrary((s) => s.skipToBack);
  const requeueFront = useLibrary((s) => s.requeueFront);
  const lists = useLibrary((s) => (item.kind === "song" ? s.songs : s.albums));
  const queueRemaining = useLibrary((s) => s.queue.length);
  const inQueue = useLibrary((s) => s.queue.some((q) => q.id === item.id));

  const place = (tier: Tier, index: number) => {
    insertRanked(item, tier, index);
    setStep({ name: "placed", tier, index });
  };

  // Edge placements get verified against the neighboring tier before the
  // item is committed, so a mistaken tier pick can still be corrected.
  const resolve = (tier: Tier, index: number) => {
    const checks = boundaryChecks(tier, index, lists);
    if (checks.length > 0) {
      setStep({ name: "boundary", tier, index, checks });
    } else {
      place(tier, index);
    }
  };

  const chooseTier = (tier: Tier) => {
    const state = startInsertion(lists[tier].length);
    if (isResolved(state)) {
      resolve(tier, state.lo);
    } else {
      setStep({ name: "compare", tier, state, asked: 1 });
    }
  };

  const pick = (preferCandidate: boolean) => {
    if (step.name !== "compare") return;
    const next = advance(step.state, preferCandidate);
    if (isResolved(next)) {
      resolve(step.tier, next.lo);
    } else {
      setStep({ ...step, state: next, asked: step.asked + 1 });
    }
  };

  const pickBoundary = (preferCandidate: boolean) => {
    if (step.name !== "boundary") return;
    const [side, ...rest] = step.checks;
    if (side === "upper") {
      const upper = adjacentTier(step.tier, "upper");
      if (preferCandidate && upper) {
        place(upper, lists[upper].length);
      } else if (rest.length > 0) {
        setStep({ ...step, checks: rest });
      } else {
        place(step.tier, step.index);
      }
    } else {
      const lower = adjacentTier(step.tier, "lower");
      if (!preferCandidate && lower) {
        place(lower, 0);
      } else {
        place(step.tier, step.index);
      }
    }
  };

  const keepInTier = () => {
    if (step.name !== "boundary") return;
    place(step.tier, step.index);
  };

  const tooClose = () => {
    if (step.name !== "compare") return;
    place(step.tier, resolveTooClose(step.state).lo);
  };

  const skip = () => {
    skipToBack(item.id);
    if (queueRemaining > 1 && onNext) {
      onNext();
    } else {
      onClose();
    }
  };

  // Undo puts the item back in the queue so closing the modal cannot lose it.
  const undo = () => {
    removeRanked(item.kind, item.id);
    requeueFront(item);
    setStep({ name: "tier" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (step.name === "tier") {
        if (e.key === "1") chooseTier("liked");
        if (e.key === "2") chooseTier("fine");
        if (e.key === "3") chooseTier("disliked");
      } else if (step.name === "compare") {
        if (e.key === "ArrowLeft") pick(true);
        if (e.key === "ArrowRight") pick(false);
        if (e.key === "ArrowDown") tooClose();
      } else if (step.name === "boundary") {
        if (e.key === "ArrowLeft") pickBoundary(true);
        if (e.key === "ArrowRight") pickBoundary(false);
        if (e.key === "ArrowDown") keepInTier();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={step.name === "placed" ? onClose : undefined}
      />
      <motion.div
        layout
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 sm:p-8 shadow-2xl shadow-black/60"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 h-8 w-8 rounded-full border border-line text-muted hover:text-ink hover:border-muted transition-colors"
        >
          &times;
        </button>

        <AnimatePresence mode="wait">
          {step.name === "tier" && (
            <TierStep
              key="tier"
              item={item}
              onChoose={chooseTier}
              onSkip={inQueue ? skip : undefined}
            />
          )}
          {step.name === "compare" && (
            <CompareStep
              key={`compare-${comparisonIndex(step.state)}-${step.asked}`}
              item={item}
              rival={lists[step.tier][comparisonIndex(step.state)]}
              progress={`${step.asked} / ${maxComparisons(lists[step.tier].length)}`}
              onPick={pick}
              onTooClose={tooClose}
              tooCloseLabel="Too close to call"
            />
          )}
          {step.name === "boundary" && (
            <CompareStep
              key={`boundary-${step.checks[0]}`}
              item={item}
              rival={
                step.checks[0] === "upper"
                  ? lists[adjacentTier(step.tier, "upper")!].at(-1)!
                  : lists[adjacentTier(step.tier, "lower")!][0]!
              }
              progress="tiebreak"
              onPick={pickBoundary}
              onTooClose={keepInTier}
              tooCloseLabel="Keep it where it is"
            />
          )}
          {step.name === "placed" && (
            <PlacedStep
              key="placed"
              item={item}
              tier={step.tier}
              index={step.index}
              queueRemaining={queueRemaining}
              onClose={onClose}
              onNext={onNext}
              onUndo={undo}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function TierStep({
  item,
  onChoose,
  onSkip,
}: {
  item: MusicItem;
  onChoose: (tier: Tier) => void;
  onSkip?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="flex items-center gap-4">
        <Artwork item={item} className="h-20 w-20 rounded-xl text-2xl" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-muted">
            Ranking {item.kind}
          </p>
          <h2 className="font-display text-3xl leading-tight truncate">
            {item.title}
          </h2>
          <p className="text-muted truncate">{item.artist}</p>
        </div>
      </div>
      <p className="font-display italic text-xl text-muted mt-8 mb-4">
        First impression?
      </p>
      <div className="grid gap-3">
        {TIER_CHOICES.map((choice, i) => (
          <button
            key={choice.tier}
            onClick={() => onChoose(choice.tier)}
            className={`flex items-baseline justify-between rounded-2xl border border-line bg-surface-2 px-5 py-4 text-left transition-colors ${choice.ring}`}
          >
            <span className="text-lg font-medium">
              <kbd className="mr-3 font-mono text-xs text-muted">{i + 1}</kbd>
              {choice.label}
            </span>
            <span className="text-sm text-muted">{choice.sub}</span>
          </button>
        ))}
      </div>
      {onSkip && (
        <div className="mt-5 text-center">
          <button
            onClick={onSkip}
            className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline transition-colors"
          >
            Skip for now
          </button>
        </div>
      )}
    </motion.div>
  );
}

const PREVIEW_HOVER_DELAY_MS = 250;

function CompareCard({
  item,
  onClick,
}: {
  item: MusicItem;
  onClick: () => void;
}) {
  const [listening, setListening] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    stopPreview();
    setListening(false);
  };

  const enter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(async () => {
      const playing = await startPreview(item, () => setListening(false));
      setListening(playing);
    }, PREVIEW_HOVER_DELAY_MS);
  };

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      stopPreview();
    };
  }, []);

  return (
    <motion.button
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      onMouseEnter={enter}
      onMouseLeave={stop}
      className="flex flex-1 flex-col items-center gap-3 rounded-2xl border border-line bg-surface-2 p-5 transition-colors hover:border-accent/60 hover:bg-accent/5 min-w-0"
    >
      <div className="relative">
        <Artwork
          item={item}
          className="h-32 w-32 sm:h-40 sm:w-40 rounded-xl text-4xl"
        />
        {listening && (
          <span className="absolute bottom-2 right-2 flex h-6 items-end gap-0.5 rounded-md bg-black/70 px-1.5 pb-1.5">
            <span className="eq-bar" />
            <span className="eq-bar" style={{ animationDelay: "0.2s" }} />
            <span className="eq-bar" style={{ animationDelay: "0.4s" }} />
          </span>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <p className="font-medium leading-snug line-clamp-2">{item.title}</p>
        <p className="text-sm text-muted truncate">{item.artist}</p>
      </div>
    </motion.button>
  );
}

function CompareStep({
  item,
  rival,
  progress,
  onPick,
  onTooClose,
  tooCloseLabel,
}: {
  item: MusicItem;
  rival: RankedEntry;
  progress: string;
  onPick: (preferCandidate: boolean) => void;
  onTooClose: () => void;
  tooCloseLabel: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ type: "spring", stiffness: 350, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display italic text-2xl">Which one wins?</h2>
        <span className="font-mono text-xs text-muted tabular-nums">
          {progress}
        </span>
      </div>
      <div className="flex items-stretch gap-3 sm:gap-5">
        <CompareCard item={item} onClick={() => onPick(true)} />
        <div className="flex items-center">
          <span className="font-display italic text-2xl text-muted">vs</span>
        </div>
        <CompareCard item={rival} onClick={() => onPick(false)} />
      </div>
      <div className="mt-6 text-center">
        <button
          onClick={onTooClose}
          className="text-sm text-muted underline-offset-4 hover:text-ink hover:underline transition-colors"
        >
          {tooCloseLabel}
        </button>
        <p className="mt-3 font-mono text-[11px] text-muted/70">
          hover a card to hear it &middot; arrows: left / right pick, down too close
        </p>
      </div>
    </motion.div>
  );
}

function PlacedStep({
  item,
  tier,
  index,
  queueRemaining,
  onClose,
  onNext,
  onUndo,
}: {
  item: MusicItem;
  tier: Tier;
  index: number;
  queueRemaining: number;
  onClose: () => void;
  onNext?: () => void;
  onUndo: () => void;
}) {
  const lists = useLibrary((s) => (item.kind === "song" ? s.songs : s.albums));
  const { score, overallRank, totalRanked } = useMemo(() => {
    const count = lists[tier].length;
    let before = 0;
    for (const t of TIER_ORDER) {
      if (t === tier) break;
      before += lists[t].length;
    }
    return {
      score: scoreFor(tier, index, count),
      overallRank: before + index + 1,
      totalRanked: TIER_ORDER.reduce((sum, t) => sum + lists[t].length, 0),
    };
  }, [lists, tier, index]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center text-center py-4"
    >
      <motion.div
        initial={{ rotate: -3, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <Artwork item={item} className="h-36 w-36 rounded-2xl text-4xl" />
      </motion.div>
      <h2 className="font-display text-3xl mt-5 leading-tight">{item.title}</h2>
      <p className="text-muted">{item.artist}</p>
      <div className="mt-6">
        <ScorePill score={score} tier={tier} size="lg" />
      </div>
      <p className="mt-3 font-mono text-sm text-muted tabular-nums">
        #{overallRank} of {totalRanked} {item.kind === "song" ? "songs" : "albums"}
      </p>
      <div className="mt-8 flex gap-3">
        <button
          onClick={onUndo}
          className="rounded-full border border-line px-6 py-2.5 text-sm text-muted hover:text-ink hover:border-muted transition-colors"
        >
          Undo
        </button>
        <button
          onClick={onClose}
          className="rounded-full border border-line px-6 py-2.5 text-sm hover:border-muted transition-colors"
        >
          Done
        </button>
        {onNext && queueRemaining > 0 && (
          <button
            onClick={onNext}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-semibold text-black hover:brightness-110 transition-[filter]"
          >
            Rank next ({queueRemaining} left)
          </button>
        )}
      </div>
    </motion.div>
  );
}
