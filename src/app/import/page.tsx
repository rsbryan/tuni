"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Artwork } from "@/components/Artwork";
import { DEMO_ALBUMS, DEMO_SONGS } from "@/lib/demo-data";
import {
  beginAuth,
  disconnect,
  getClientId,
  getPlaylists,
  getPlaylistTracks,
  getProfile,
  getRandomAlbumMix,
  getRandomMix,
  getSavedTracks,
  grantedScopes,
  getTopAlbums,
  getTopTracks,
  isConnected,
  PlaylistSummary,
  redirectUri,
  setClientId,
  withGenres,
} from "@/lib/spotify";
import { MusicItem } from "@/lib/types";
import { useMounted } from "@/lib/use-mounted";
import { useLibrary } from "@/store/library";

type ImportKey =
  | "short"
  | "medium"
  | "long"
  | "saved"
  | "albums"
  | "playlists"
  | "random"
  | "randomAlbums"
  | "demo";

const IMPORTS: { key: ImportKey; title: string; sub: string; spotify: boolean }[] = [
  { key: "short", title: "Top songs, last 4 weeks", sub: "What you have on repeat right now", spotify: true },
  { key: "medium", title: "Top songs, last 6 months", sub: "Your current rotation", spotify: true },
  { key: "long", title: "Top songs, all time", sub: "Your most played ever", spotify: true },
  { key: "saved", title: "Liked songs", sub: "Latest 50 from your library", spotify: true },
  { key: "albums", title: "Top albums", sub: "Albums you play front to back, plus your saved albums", spotify: true },
  { key: "playlists", title: "From a playlist", sub: "Pick any playlist, filter before adding", spotify: true },
  { key: "random", title: "Random mix", sub: "25 random songs from across your library", spotify: true },
  { key: "randomAlbums", title: "Random album mix", sub: "Albums you played through, shuffled", spotify: true },
  { key: "demo", title: "Demo library", sub: "26 classics, no Spotify needed", spotify: false },
];

interface Review {
  source: string;
  items: MusicItem[];
}

export default function ImportPage() {
  const mounted = useMounted();
  if (!mounted) return null;
  return <ImportContent />;
}

function ImportContent() {
  const [connected, setConnected] = useState(() => isConnected());
  const [clientIdInput, setClientIdInput] = useState(() => getClientId());
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [profile, setProfile] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    getProfile()
      .then((p) => {
        if (!cancelled) {
          setProfile(`${p.name} (${p.id})`);
          setProfileError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfileError(
            err instanceof Error ? err.message : "Could not load profile"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);
  const queueLength = useLibrary((s) => s.queue.length);
  const resetAll = useLibrary((s) => s.resetAll);

  const fail = (err: unknown, fallback: string) => {
    setError(err instanceof Error ? err.message : fallback);
    setConnected(isConnected());
  };

  const runImport = async (key: ImportKey) => {
    setBusy(key);
    setError(null);
    setStatus(null);
    try {
      if (key === "playlists") {
        setPlaylists(await getPlaylists());
        return;
      }
      let source: string;
      let items: MusicItem[];
      switch (key) {
        case "short":
          source = "Top songs, last 4 weeks";
          items = await withGenres(await getTopTracks("short_term"));
          break;
        case "medium":
          source = "Top songs, last 6 months";
          items = await withGenres(await getTopTracks("medium_term"));
          break;
        case "long":
          source = "Top songs, all time";
          items = await withGenres(await getTopTracks("long_term"));
          break;
        case "saved":
          source = "Liked songs";
          items = await withGenres(await getSavedTracks());
          break;
        case "albums":
          source = "Top albums";
          items = await withGenres(await getTopAlbums());
          break;
        case "random":
          source = "Random mix";
          items = await withGenres(await getRandomMix());
          break;
        case "randomAlbums":
          source = "Random album mix";
          items = await withGenres(await getRandomAlbumMix());
          break;
        default:
          source = "Demo library";
          items = [...DEMO_SONGS, ...DEMO_ALBUMS];
      }
      setPlaylists(null);
      setReview({ source, items });
    } catch (err) {
      fail(err, "Import failed");
    } finally {
      setBusy(null);
    }
  };

  const reroll = async () => {
    if (!review) return;
    const isAlbums = review.source === "Random album mix";
    setBusy(isAlbums ? "randomAlbums" : "random");
    try {
      const items = await withGenres(
        isAlbums ? await getRandomAlbumMix() : await getRandomMix()
      );
      setReview({ source: review.source, items });
    } catch (err) {
      fail(err, "Reroll failed");
    } finally {
      setBusy(null);
    }
  };

  const openPlaylist = async (playlist: PlaylistSummary) => {
    setBusy(playlist.id);
    setError(null);
    try {
      const items = await withGenres(await getPlaylistTracks(playlist.id));
      setPlaylists(null);
      setReview({ source: playlist.name, items });
    } catch (err) {
      fail(err, "Could not load that playlist");
    } finally {
      setBusy(null);
    }
  };

  const connect = async () => {
    setError(null);
    try {
      setClientId(clientIdInput);
      await beginAuth();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start Spotify auth");
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24">
      <header className="flex items-center justify-between py-6">
        <Link
          href="/"
          className="text-sm text-muted hover:text-ink transition-colors"
        >
          &larr; Back to rankings
        </Link>
        {queueLength > 0 && (
          <Link
            href="/"
            className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:brightness-110 transition-[filter]"
          >
            Rank queue ({queueLength})
          </Link>
        )}
      </header>

      <h1 className="font-display text-4xl sm:text-5xl mt-4 mb-8">
        Import your <em className="text-accent">listening.</em>
      </h1>

      {(status || error) && (
        <p
          className={`mb-6 rounded-2xl border px-5 py-3 text-sm ${
            error
              ? "border-disliked/30 bg-disliked/5 text-disliked"
              : "border-accent/30 bg-accent/5 text-accent"
          }`}
        >
          {error ?? status}
        </p>
      )}

      {review ? (
        <ReviewPanel
          review={review}
          onDone={(message) => {
            setReview(null);
            setStatus(message);
          }}
          onCancel={() => setReview(null)}
          onReroll={review.source.startsWith("Random") ? reroll : undefined}
          rerolling={busy === "random" || busy === "randomAlbums"}
        />
      ) : playlists ? (
        <PlaylistPicker
          playlists={playlists}
          busy={busy}
          onPick={openPlaylist}
          onBack={() => setPlaylists(null)}
        />
      ) : (
        <>
          <section className="rounded-3xl border border-line bg-surface p-6 mb-6">
            {connected ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {profile ? `Connected as ${profile}` : "Spotify connected"}
                  </p>
                  {profileError ? (
                    <p className="text-sm text-disliked">{profileError}</p>
                  ) : (
                    <p className="text-sm text-muted">
                      Pull your top songs, albums, and playlists below.
                    </p>
                  )}
                  <p className="mt-1 font-mono text-[11px] text-muted">
                    scopes:{" "}
                    {grantedScopes().join(" ") ||
                      "unknown (reconnect to refresh)"}
                  </p>
                </div>
                <button
                  onClick={() => {
                    disconnect();
                    setConnected(false);
                  }}
                  className="rounded-full border border-line px-4 py-2 text-sm text-muted hover:text-ink hover:border-muted transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div>
                <p className="font-medium mb-1">Connect Spotify</p>
                <p className="text-sm text-muted mb-4">
                  Create a free app at{" "}
                  <a
                    href="https://developer.spotify.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-4 hover:text-ink"
                  >
                    developer.spotify.com/dashboard
                  </a>
                  , add{" "}
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs">
                    {redirectUri()}
                  </code>{" "}
                  as a redirect URI, then paste the client ID here. Your data
                  never leaves this browser.
                </p>
                <div className="flex gap-2">
                  <input
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="Spotify client ID"
                    className="flex-1 rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-sm outline-none focus:border-muted placeholder:text-muted"
                  />
                  <button
                    onClick={connect}
                    disabled={!clientIdInput.trim()}
                    className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110 transition-[filter]"
                  >
                    Connect
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-3">
            {IMPORTS.map(({ key, title, sub, spotify }) => {
              const locked = spotify && !connected;
              return (
                <button
                  key={key}
                  onClick={() => runImport(key)}
                  disabled={locked || busy !== null}
                  className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 text-left transition-colors enabled:hover:border-accent/50 enabled:hover:bg-accent/5 disabled:opacity-45"
                >
                  <div>
                    <p className="font-medium">{title}</p>
                    <p className="text-sm text-muted">{sub}</p>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {busy === key
                      ? "Loading..."
                      : locked
                        ? "Needs Spotify"
                        : key === "playlists"
                          ? "Browse"
                          : "Import"}
                  </span>
                </button>
              );
            })}
          </div>

          <section className="mt-12 border-t border-line pt-6">
            <button
              onClick={() => {
                if (window.confirm("Erase all rankings and the queue?")) {
                  resetAll();
                  setStatus("All data cleared");
                }
              }}
              className="text-sm text-muted hover:text-disliked transition-colors"
            >
              Reset all rankings
            </button>
          </section>
        </>
      )}
    </div>
  );
}

function PlaylistPicker({
  playlists,
  busy,
  onPick,
  onBack,
}: {
  playlists: PlaylistSummary[];
  busy: string | null;
  onPick: (playlist: PlaylistSummary) => void;
  onBack: () => void;
}) {
  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display italic text-2xl">Your playlists</h2>
        <button
          onClick={onBack}
          className="text-sm text-muted hover:text-ink transition-colors"
        >
          Back
        </button>
      </div>
      {playlists.length === 0 && (
        <p className="text-sm text-muted">No playlists found.</p>
      )}
      <div className="grid gap-2 max-h-[55vh] overflow-y-auto scrollbar-none">
        {playlists.map((playlist) => (
          <button
            key={playlist.id}
            onClick={() => onPick(playlist)}
            disabled={busy !== null}
            className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3 text-left transition-colors enabled:hover:border-accent/50 disabled:opacity-50"
          >
            {playlist.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={playlist.imageUrl}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-surface" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{playlist.name}</p>
              <p className="text-xs text-muted">{playlist.trackCount} tracks</p>
            </div>
            <span className="font-mono text-xs text-muted">
              {busy === playlist.id ? "Loading..." : "Open"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ReviewPanel({
  review,
  onDone,
  onCancel,
  onReroll,
  rerolling,
}: {
  review: Review;
  onDone: (message: string) => void;
  onCancel: () => void;
  onReroll?: () => void;
  rerolling?: boolean;
}) {
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const addToQueue = useLibrary((s) => s.addToQueue);

  const genreCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of review.items) {
      for (const genre of item.genres ?? []) {
        counts.set(genre, (counts.get(genre) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24);
  }, [review.items]);

  const included = useMemo(
    () =>
      review.items.filter(
        (item) => !(item.genres ?? []).some((g) => excluded.has(g))
      ),
    [review.items, excluded]
  );

  const toggleGenre = (genre: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(genre)) {
        next.delete(genre);
      } else {
        next.add(genre);
      }
      return next;
    });
  };

  const add = () => {
    const added = addToQueue(included);
    const duplicates = included.length - added;
    const filtered = review.items.length - included.length;
    const parts = [`Added ${added} to your ranking queue`];
    if (duplicates > 0) parts.push(`${duplicates} already ranked or queued`);
    if (filtered > 0) parts.push(`${filtered} excluded by genre`);
    onDone(parts.join(" · "));
  };

  return (
    <section className="rounded-3xl border border-line bg-surface p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display italic text-2xl">{review.source}</h2>
        <div className="flex items-center gap-3">
          {onReroll && (
            <button
              onClick={onReroll}
              disabled={rerolling}
              className="rounded-full border border-line px-3 py-1 text-sm text-muted hover:text-ink hover:border-muted disabled:opacity-50 transition-colors"
            >
              {rerolling ? "Rerolling..." : "Reroll"}
            </button>
          )}
          <button
            onClick={onCancel}
            className="text-sm text-muted hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
      <p className="text-sm text-muted mb-5">
        {review.items.length} found. Tap a genre to leave it out, then add the
        rest to your queue.
      </p>

      {genreCounts.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2">
          {genreCounts.map(([genre, count]) => {
            const off = excluded.has(genre);
            return (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  off
                    ? "border-disliked/40 bg-disliked/10 text-disliked line-through"
                    : "border-line bg-surface-2 text-ink hover:border-muted"
                }`}
              >
                {genre}{" "}
                <span className="font-mono text-muted tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-5 max-h-[38vh] overflow-y-auto scrollbar-none rounded-2xl border border-line p-2">
        {included.length === 0 && (
          <p className="p-4 text-center text-sm text-muted">
            Everything is excluded.
          </p>
        )}
        {included.map((item) => (
          <div key={item.id} className="flex items-center gap-3 rounded-xl px-3 py-1.5">
            <Artwork item={item} className="h-9 w-9 shrink-0 rounded-md text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{item.title}</p>
              <p className="truncate text-xs text-muted">{item.artist}</p>
            </div>
            {item.genres && item.genres.length > 0 && (
              <span className="hidden sm:block max-w-40 truncate font-mono text-[10px] text-muted">
                {item.genres.slice(0, 2).join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={add}
        disabled={included.length === 0}
        className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black disabled:opacity-40 hover:brightness-110 transition-[filter]"
      >
        Add {included.length} to queue
      </button>
    </section>
  );
}
