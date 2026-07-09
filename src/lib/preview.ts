import { MusicItem } from "./types";

// One shared audio element so only a single preview plays at a time; a token
// guards against a slow fetch starting audio after the user moved on.
const urlCache = new Map<string, string | null>();
let audio: HTMLAudioElement | null = null;
let currentToken = 0;

async function fetchPreviewUrl(item: MusicItem): Promise<string | null> {
  const cached = urlCache.get(item.id);
  if (cached !== undefined) return cached;
  let url: string | null = null;
  try {
    const params = new URLSearchParams({
      title: item.title,
      artist: item.artist,
      kind: item.kind,
    });
    const res = await fetch(`/api/preview?${params}`);
    if (res.ok) {
      url = ((await res.json()) as { previewUrl: string | null }).previewUrl;
    }
  } catch {
    url = null;
  }
  urlCache.set(item.id, url);
  return url;
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
}

// Resolves true while this preview is the active one and playing.
export async function startPreview(
  item: MusicItem,
  onEnded?: () => void
): Promise<boolean> {
  const token = ++currentToken;
  const url = await fetchPreviewUrl(item);
  if (token !== currentToken || !url) return false;
  stopAudio();
  audio = new Audio(url);
  audio.volume = 0.75;
  audio.addEventListener("ended", () => {
    if (token === currentToken) onEnded?.();
  });
  try {
    await audio.play();
  } catch {
    // Autoplay can be blocked before the first user gesture; stay silent
    return false;
  }
  return token === currentToken;
}

export function stopPreview() {
  currentToken += 1;
  stopAudio();
}
