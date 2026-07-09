import { Tier } from "@/lib/types";

const TIER_STYLES: Record<Tier, string> = {
  liked: "text-liked bg-liked/10 border-liked/30",
  fine: "text-fine bg-fine/10 border-fine/30",
  disliked: "text-disliked bg-disliked/10 border-disliked/30",
};

export function ScorePill({
  score,
  tier,
  size = "sm",
}: {
  score: number;
  tier: Tier;
  size?: "sm" | "lg";
}) {
  const sizing =
    size === "lg"
      ? "text-3xl px-5 py-2 rounded-2xl"
      : "text-sm px-2.5 py-1 rounded-lg";
  return (
    <span
      className={`font-mono font-semibold tabular-nums border ${sizing} ${TIER_STYLES[tier]}`}
    >
      {score.toFixed(1)}
    </span>
  );
}
