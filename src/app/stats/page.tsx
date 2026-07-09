"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { scoredEntries, ScoredEntry, TIER_ORDER } from "@/lib/ranking";
import { getTopTracks, isConnected } from "@/lib/spotify";
import { MusicItem, Tier, TierLists } from "@/lib/types";
import { useMounted } from "@/lib/use-mounted";
import { useLibrary } from "@/store/library";
import { Artwork } from "@/components/Artwork";

const TIER_COLORS: Record<Tier, string> = {
  liked: "bg-liked",
  fine: "bg-fine",
  disliked: "bg-disliked",
};

const TIER_NAMES: Record<Tier, string> = {
  liked: "Loved",
  fine: "Fine",
  disliked: "Not for me",
};

export default function StatsPage() {
  const mounted = useMounted();
  if (!mounted) return null;
  return <StatsContent />;
}

function StatsContent() {
  const songs = useLibrary((s) => s.songs);
  const albums = useLibrary((s) => s.albums);
  const songRows = useMemo(() => scoredEntries(songs), [songs]);
  const albumRows = useMemo(() => scoredEntries(albums), [albums]);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24">
      <header className="py-6">
        <Link
          href="/"
          className="text-sm text-muted hover:text-ink transition-colors"
        >
          &larr; Back to rankings
        </Link>
      </header>

      <h1 className="font-display text-4xl sm:text-5xl mt-4 mb-8">
        The state of your <em className="text-accent">taste.</em>
      </h1>

      {songRows.length === 0 && albumRows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line py-20 text-center">
          <p className="font-display italic text-2xl text-muted">
            No data yet
          </p>
          <p className="mt-2 text-sm text-muted">
            Rank a few songs and come back.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Songs ranked" value={String(songRows.length)} />
            <StatCard label="Albums ranked" value={String(albumRows.length)} />
            <StatCard label="Avg song score" value={average(songRows)} />
            <StatCard label="Avg album score" value={average(albumRows)} />
          </section>

          <section className="rounded-3xl border border-line bg-surface p-6">
            <h2 className="font-display italic text-2xl mb-5">Tier split</h2>
            <div className="flex flex-col gap-5">
              <TierBar label="Songs" lists={songs} total={songRows.length} />
              <TierBar label="Albums" lists={albums} total={albumRows.length} />
            </div>
          </section>

          {songRows.length > 0 && (
            <section className="rounded-3xl border border-line bg-surface p-6">
              <h2 className="font-display italic text-2xl mb-5">
                Most ranked artists
              </h2>
              <TopArtists rows={songRows} />
            </section>
          )}

          <Decades songRows={songRows} albumRows={albumRows} />
          <TasteVsPlays songRows={songRows} />
        </div>
      )}
    </div>
  );
}

function average(rows: ScoredEntry[]): string {
  if (rows.length === 0) return "-";
  const sum = rows.reduce((acc, r) => acc + r.score, 0);
  return (sum / rows.length).toFixed(1);
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="font-mono text-3xl tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function TierBar({
  label,
  lists,
  total,
}: {
  label: string;
  lists: TierLists;
  total: number;
}) {
  if (total === 0) {
    return (
      <div>
        <p className="text-sm text-muted mb-2">{label}: nothing ranked yet</p>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="font-mono text-xs text-muted tabular-nums">{total}</p>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
        {TIER_ORDER.map((tier) =>
          lists[tier].length > 0 ? (
            <div
              key={tier}
              className={TIER_COLORS[tier]}
              style={{ width: `${(lists[tier].length / total) * 100}%` }}
            />
          ) : null
        )}
      </div>
      <div className="mt-2 flex gap-4">
        {TIER_ORDER.map((tier) => (
          <span key={tier} className="flex items-center gap-1.5 text-xs text-muted">
            <span className={`h-2 w-2 rounded-full ${TIER_COLORS[tier]}`} />
            {TIER_NAMES[tier]}{" "}
            <span className="font-mono tabular-nums">{lists[tier].length}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TopArtists({ rows }: { rows: ScoredEntry[] }) {
  const artists = useMemo(() => {
    const groups = new Map<string, { count: number; sum: number }>();
    for (const { entry, score } of rows) {
      const name = entry.artist.split(",")[0].trim();
      const g = groups.get(name) ?? { count: 0, sum: 0 };
      g.count += 1;
      g.sum += score;
      groups.set(name, g);
    }
    return [...groups.entries()]
      .map(([name, g]) => ({ name, count: g.count, avg: g.sum / g.count }))
      .sort((a, b) => b.count - a.count || b.avg - a.avg)
      .slice(0, 8);
  }, [rows]);

  const max = artists[0]?.count ?? 1;

  return (
    <div className="flex flex-col gap-2.5">
      {artists.map((artist) => (
        <div key={artist.name} className="flex items-center gap-3">
          <p className="w-40 truncate text-sm">{artist.name}</p>
          <div className="flex-1 h-2.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full rounded-full bg-accent/70"
              style={{ width: `${(artist.count / max) * 100}%` }}
            />
          </div>
          <p className="w-24 text-right font-mono text-xs text-muted tabular-nums">
            {artist.count} &middot; {artist.avg.toFixed(1)} avg
          </p>
        </div>
      ))}
    </div>
  );
}

function Decades({
  songRows,
  albumRows,
}: {
  songRows: ScoredEntry[];
  albumRows: ScoredEntry[];
}) {
  const decades = useMemo(() => {
    const groups = new Map<string, { count: number; sum: number }>();
    for (const { entry, score } of [...songRows, ...albumRows]) {
      if (!entry.year) continue;
      const year = parseInt(entry.year, 10);
      if (Number.isNaN(year)) continue;
      const label = `${Math.floor(year / 10) * 10}s`;
      const g = groups.get(label) ?? { count: 0, sum: 0 };
      g.count += 1;
      g.sum += score;
      groups.set(label, g);
    }
    return [...groups.entries()]
      .map(([label, g]) => ({ label, count: g.count, avg: g.sum / g.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [songRows, albumRows]);

  if (decades.length === 0) return null;
  const max = Math.max(...decades.map((d) => d.count));

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display italic text-2xl mb-5">Decades</h2>
      <div className="flex items-end gap-3 h-36">
        {decades.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-2 h-full justify-end">
            <p className="font-mono text-[11px] text-muted tabular-nums">
              {d.count}
            </p>
            <div
              className="w-full rounded-t-lg bg-accent/70"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: "4px" }}
            />
            <p className="text-xs text-muted">{d.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface Divergence {
  item: MusicItem;
  userRank: number;
  playRank: number;
  delta: number;
}

function TasteVsPlays({ songRows }: { songRows: ScoredEntry[] }) {
  const [connected] = useState(() => isConnected());
  const [plays, setPlays] = useState<MusicItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    getTopTracks("long_term")
      .then((items) => {
        if (!cancelled) setPlays(items);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Spotify fetch failed");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);

  const divergences = useMemo(() => {
    if (!plays || songRows.length < 4) return null;
    const playIndex = new Map(plays.map((item, i) => [item.id, i + 1]));
    const matched: Divergence[] = [];
    for (const { entry, rank } of songRows) {
      const playRank = playIndex.get(entry.id);
      if (playRank === undefined) continue;
      const userPct = rank / songRows.length;
      const playPct = playRank / plays.length;
      matched.push({ item: entry, userRank: rank, playRank, delta: playPct - userPct });
    }
    if (matched.length < 4) return null;
    const sorted = [...matched].sort((a, b) => b.delta - a.delta);
    return {
      underrated: sorted.slice(0, 3).filter((d) => d.delta > 0.1),
      overplayed: sorted.slice(-3).reverse().filter((d) => d.delta < -0.1),
    };
  }, [plays, songRows]);

  if (!connected) return null;

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <h2 className="font-display italic text-2xl mb-1">Taste vs plays</h2>
      <p className="text-sm text-muted mb-5">
        Your ranking compared to your all-time most played on Spotify.
      </p>
      {error && <p className="text-sm text-disliked">{error}</p>}
      {!error && !divergences && (
        <p className="text-sm text-muted">
          Not enough overlap yet. Rank more of your imported top songs to see
          where your taste and your play counts disagree.
        </p>
      )}
      {divergences && (
        <div className="grid sm:grid-cols-2 gap-6">
          <DivergenceList
            title="Better than the play count"
            sub="You rank these higher than you play them"
            items={divergences.underrated}
          />
          <DivergenceList
            title="On repeat, but mid"
            sub="Heavy rotation, modest ranking"
            items={divergences.overplayed}
          />
        </div>
      )}
    </section>
  );
}

function DivergenceList({
  title,
  sub,
  items,
}: {
  title: string;
  sub: string;
  items: Divergence[];
}) {
  return (
    <div>
      <p className="font-medium">{title}</p>
      <p className="text-xs text-muted mb-3">{sub}</p>
      {items.length === 0 ? (
        <p className="text-sm text-muted">No standouts here.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map(({ item, userRank, playRank }) => (
            <div key={item.id} className="flex items-center gap-3">
              <Artwork item={item} className="h-10 w-10 shrink-0 rounded-lg text-xs" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{item.title}</p>
                <p className="font-mono text-[11px] text-muted tabular-nums">
                  you #{userRank} &middot; plays #{playRank}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
