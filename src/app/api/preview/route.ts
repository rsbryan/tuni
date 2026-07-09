import { NextRequest, NextResponse } from "next/server";

// Spotify removed preview_url for newer API apps, so 30-second previews come
// from iTunes with Deezer as a fallback (both public and keyless; server-side
// to avoid CORS). A result must match the artist AND the title; silence beats
// playing the wrong song.
const ITUNES_SEARCH = "https://itunes.apple.com/search";
const DEEZER_SEARCH = "https://api.deezer.com/search";
const MAX_PARAM_LENGTH = 150;
const RESULT_LIMIT = 25;
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=86400" };

interface PreviewCandidate {
  artistName: string;
  trackName: string;
  collectionName?: string;
  previewUrl?: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

async function searchItunes(term: string): Promise<PreviewCandidate[]> {
  const res = await fetch(
    `${ITUNES_SEARCH}?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${RESULT_LIMIT}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as { results?: PreviewCandidate[] };
  return (data.results ?? []).filter((r) => r.previewUrl);
}

async function searchDeezer(query: string): Promise<PreviewCandidate[]> {
  const res = await fetch(
    `${DEEZER_SEARCH}?q=${encodeURIComponent(query)}&limit=${RESULT_LIMIT}`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return [];
  const data = (await res.json()) as {
    data?: {
      title: string;
      preview?: string;
      artist?: { name?: string };
      album?: { title?: string };
    }[];
  };
  return (data.data ?? [])
    .map((d) => ({
      artistName: d.artist?.name ?? "",
      trackName: d.title,
      collectionName: d.album?.title,
      previewUrl: d.preview || undefined,
    }))
    .filter((r) => r.previewUrl);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const title = params.get("title")?.trim();
  const artist = params.get("artist")?.trim() ?? "";
  const kind = params.get("kind") === "album" ? "album" : "song";
  if (!title || title.length > MAX_PARAM_LENGTH || artist.length > MAX_PARAM_LENGTH) {
    return NextResponse.json({ error: "invalid title or artist" }, { status: 400 });
  }

  const primaryArtist = artist.split(",")[0].trim();
  const cleanTitle =
    title.split(" - ")[0].replace(/\([^)]*\)/g, "").trim() || title;

  const matches = (result: PreviewCandidate) => {
    if (primaryArtist && !fuzzyMatch(result.artistName, primaryArtist)) {
      return false;
    }
    return kind === "album"
      ? fuzzyMatch(result.collectionName ?? "", cleanTitle)
      : fuzzyMatch(result.trackName, cleanTitle);
  };

  const deezerField = kind === "album" ? "album" : "track";
  const searches = [
    () => searchItunes(`${primaryArtist} ${cleanTitle}`.trim()),
    () => searchDeezer(`artist:"${primaryArtist}" ${deezerField}:"${cleanTitle}"`),
    () => searchDeezer(`${primaryArtist} ${cleanTitle}`.trim()),
    () => searchItunes(cleanTitle),
  ];
  for (const search of searches) {
    const best = (await search()).find(matches);
    if (best) {
      return NextResponse.json(
        { previewUrl: best.previewUrl },
        { headers: CACHE_HEADERS }
      );
    }
  }
  return NextResponse.json({ previewUrl: null }, { headers: CACHE_HEADERS });
}
