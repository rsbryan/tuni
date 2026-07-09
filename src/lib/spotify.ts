import { MusicItem } from "./types";

// Client-side Spotify auth via Authorization Code + PKCE (no server secret).
const AUTH_URL = "https://accounts.spotify.com/authorize";
const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";
const SCOPES = "user-top-read user-library-read playlist-read-private";

const CLIENT_ID_KEY = "tunordi.spotify.clientId";
const VERIFIER_KEY = "tunordi.spotify.verifier";
const TOKEN_KEY = "tunordi.spotify.token";

export type TopRange = "short_term" | "medium_term" | "long_term";

interface StoredToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope?: string;
}

export function redirectUri(): string {
  return `${window.location.origin}/callback`;
}

export function getClientId(): string {
  return (
    localStorage.getItem(CLIENT_ID_KEY) ??
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ??
    ""
  );
}

export function setClientId(id: string): void {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
}

export function isConnected(): boolean {
  return readToken() !== null;
}

export function disconnect(): void {
  localStorage.removeItem(TOKEN_KEY);
}

function readToken(): StoredToken | null {
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredToken;
  } catch {
    return null;
  }
}

function writeToken(data: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
}): void {
  const existing = readToken();
  const token: StoredToken = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? existing?.refreshToken ?? "",
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    scope: data.scope ?? existing?.scope,
  };
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

// Scopes actually granted to the stored token (empty if the token predates
// scope tracking; reconnecting refreshes it).
export function grantedScopes(): string[] {
  const scope = readToken()?.scope;
  return scope ? scope.split(" ").filter(Boolean) : [];
}

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function beginAuth(): Promise<void> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Missing Spotify client ID");

  const verifierBytes = crypto.getRandomValues(new Uint8Array(48));
  const verifier = base64Url(verifierBytes);
  localStorage.setItem(VERIFIER_KEY, verifier);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  const challenge = base64Url(new Uint8Array(digest));

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });
  window.location.assign(`${AUTH_URL}?${params}`);
}

export async function completeAuth(code: string): Promise<void> {
  const verifier = localStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("Missing PKCE verifier; restart the connect flow");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri(),
    client_id: getClientId(),
    code_verifier: verifier,
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Token exchange failed (${res.status})`);
  writeToken(await res.json());
  localStorage.removeItem(VERIFIER_KEY);
}

async function getAccessToken(): Promise<string> {
  const token = readToken();
  if (!token) throw new Error("Not connected to Spotify");
  if (Date.now() < token.expiresAt) return token.accessToken;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token.refreshToken,
    client_id: getClientId(),
  });
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    disconnect();
    throw new Error("Spotify session expired; reconnect to continue");
  }
  const data = await res.json();
  writeToken(data);
  return data.access_token as string;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? "";
    } catch {
      // Non-JSON error body; the status code will have to do
    }
    if (res.status === 401) {
      disconnect();
      throw new Error("Spotify session expired; reconnect to continue");
    }
    if (res.status === 403) {
      const hint = detail.toLowerCase().includes("scope")
        ? "Disconnect and reconnect to grant the newly added permissions."
        : "Your app is in Development Mode: log in with the account that owns the Spotify app, or add this account under User Management in the developer dashboard.";
      throw new Error(
        `Spotify refused the request${detail ? ` (${detail})` : ""}. ${hint}`
      );
    }
    throw new Error(
      `Spotify API error (${res.status}${detail ? `: ${detail}` : ""})`
    );
  }
  return res.json() as Promise<T>;
}

interface SpotifyImage {
  url: string;
}

interface SpotifyArtistRef {
  id: string;
  name: string;
}

interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  release_date?: string;
  artists: SpotifyArtistRef[];
  external_urls?: { spotify?: string };
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  album: SpotifyAlbum;
  external_urls?: { spotify?: string };
}

function trackToItem(track: SpotifyTrack): MusicItem {
  return {
    id: `sp-track-${track.id}`,
    kind: "song",
    title: track.name,
    artist: track.artists.map((a) => a.name).join(", "),
    imageUrl: track.album.images[1]?.url ?? track.album.images[0]?.url,
    albumName: track.album.name,
    year: track.album.release_date?.slice(0, 4),
    spotifyUrl: track.external_urls?.spotify,
    artistIds: track.artists.map((a) => a.id).filter(Boolean),
  };
}

function albumToItem(album: SpotifyAlbum): MusicItem {
  return {
    id: `sp-album-${album.id}`,
    kind: "album",
    title: album.name,
    artist: album.artists.map((a) => a.name).join(", "),
    imageUrl: album.images[1]?.url ?? album.images[0]?.url,
    year: album.release_date?.slice(0, 4),
    spotifyUrl: album.external_urls?.spotify,
    artistIds: album.artists.map((a) => a.id).filter(Boolean),
  };
}

export async function getTopTracks(
  range: TopRange,
  limit = 50
): Promise<MusicItem[]> {
  const data = await apiGet<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${range}&limit=${limit}`
  );
  return data.items.map(trackToItem);
}

export async function getSavedTracks(maxTracks = 50): Promise<MusicItem[]> {
  const items: MusicItem[] = [];
  let offset = 0;
  while (items.length < maxTracks) {
    const data = await apiGet<{
      items: { track: SpotifyTrack | null }[];
      next: string | null;
    }>(`/me/tracks?limit=50&offset=${offset}`);
    for (const entry of data.items) {
      if (entry.track?.id) items.push(trackToItem(entry.track));
    }
    if (!data.next) break;
    offset += 50;
  }
  return items.slice(0, maxTracks);
}

// Spotify has no top-albums endpoint; derive it from long-term top tracks
// by grouping on album and sorting by how many top tracks each album has.
export async function getTopAlbums(range: TopRange = "long_term"): Promise<MusicItem[]> {
  const data = await apiGet<{ items: SpotifyTrack[] }>(
    `/me/top/tracks?time_range=${range}&limit=50`
  );
  const groups = new Map<string, { album: SpotifyAlbum; count: number; firstSeen: number }>();
  data.items.forEach((track, index) => {
    const existing = groups.get(track.album.id);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(track.album.id, { album: track.album, count: 1, firstSeen: index });
    }
  });
  return [...groups.values()]
    .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen)
    .map((g) => albumToItem(g.album));
}

export interface SpotifyProfile {
  id: string;
  name: string;
}

// Which account does the current token belong to? Also doubles as a probe:
// in Development Mode, non-allowlisted accounts get a 403 even here.
export async function getProfile(): Promise<SpotifyProfile> {
  const data = await apiGet<{ display_name?: string; id: string }>("/me");
  return { id: data.id, name: data.display_name ?? data.id };
}

export interface PlaylistSummary {
  id: string;
  name: string;
  trackCount: number;
  imageUrl?: string;
}

export async function getPlaylists(): Promise<PlaylistSummary[]> {
  const data = await apiGet<{
    items: ({
      id: string;
      name: string;
      tracks: { total: number };
      images: SpotifyImage[] | null;
    } | null)[];
  }>(`/me/playlists?limit=50`);
  return data.items
    .filter((p) => p !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      trackCount: p.tracks.total,
      imageUrl: p.images?.[0]?.url,
    }));
}

export async function getPlaylistTracks(
  playlistId: string,
  maxTracks = 200
): Promise<MusicItem[]> {
  const items: MusicItem[] = [];
  let offset = 0;
  while (items.length < maxTracks) {
    const data = await apiGet<{
      items: { track: SpotifyTrack | null }[];
      next: string | null;
    }>(`/playlists/${playlistId}/tracks?limit=100&offset=${offset}`);
    for (const entry of data.items) {
      // Local files and podcast episodes come back without a usable track id
      if (entry.track?.id) items.push(trackToItem(entry.track));
    }
    if (!data.next) break;
    offset += 100;
  }
  return items.slice(0, maxTracks);
}

// Tracks and albums carry no genres on Spotify; artists do. Batch-fetch the
// artists behind a set of items and tag each item with its artists' genres.
export async function withGenres(items: MusicItem[]): Promise<MusicItem[]> {
  const artistIds = [
    ...new Set(items.flatMap((item) => item.artistIds ?? [])),
  ];
  if (artistIds.length === 0) return items;

  const genresByArtist = new Map<string, string[]>();
  for (let i = 0; i < artistIds.length; i += 50) {
    const batch = artistIds.slice(i, i + 50);
    const data = await apiGet<{
      artists: ({ id: string; genres: string[] } | null)[];
    }>(`/artists?ids=${batch.join(",")}`);
    for (const artist of data.artists) {
      if (artist) genresByArtist.set(artist.id, artist.genres);
    }
  }

  return items.map((item) => {
    const genres = [
      ...new Set(
        (item.artistIds ?? []).flatMap((id) => genresByArtist.get(id) ?? [])
      ),
    ].slice(0, 5);
    return genres.length > 0 ? { ...item, genres } : item;
  });
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// A random sample from across the listening history the API exposes: top
// tracks (all ranges), a deep slice of liked songs, and a few randomly
// chosen playlists. Sources fail independently so one bad endpoint does
// not empty the pool.
export async function getRandomMix(count = 25): Promise<MusicItem[]> {
  const sources = await Promise.allSettled([
    getTopTracks("short_term"),
    getTopTracks("medium_term"),
    getTopTracks("long_term"),
    getSavedTracks(200),
  ]);
  const pool: MusicItem[] = sources
    .filter(
      (s): s is PromiseFulfilledResult<MusicItem[]> => s.status === "fulfilled"
    )
    .flatMap((s) => s.value);

  try {
    const playlists = shuffle(await getPlaylists()).slice(0, 4);
    for (const playlist of playlists) {
      pool.push(...(await getPlaylistTracks(playlist.id, 100)));
    }
  } catch {
    // Playlists are a bonus source; the mix still works without them
  }

  if (pool.length === 0) {
    throw new Error("Could not load any songs to sample from");
  }
  const unique = new Map<string, MusicItem>();
  for (const item of pool) unique.set(item.id, item);
  return shuffle([...unique.values()]).slice(0, count);
}

export async function searchSpotify(
  query: string,
  kind: "song" | "album"
): Promise<MusicItem[]> {
  const type = kind === "song" ? "track" : "album";
  const data = await apiGet<{
    tracks?: { items: SpotifyTrack[] };
    albums?: { items: SpotifyAlbum[] };
  }>(`/search?q=${encodeURIComponent(query)}&type=${type}&limit=12`);
  if (kind === "song") return (data.tracks?.items ?? []).map(trackToItem);
  return (data.albums?.items ?? []).map(albumToItem);
}
