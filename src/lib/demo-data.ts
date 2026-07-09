import { MusicItem } from "./types";

// Starter library so the app is usable before connecting Spotify.
export const DEMO_SONGS: MusicItem[] = [
  { id: "demo-s-1", kind: "song", title: "Bohemian Rhapsody", artist: "Queen", albumName: "A Night at the Opera", year: "1975" },
  { id: "demo-s-2", kind: "song", title: "Runaway", artist: "Kanye West", albumName: "My Beautiful Dark Twisted Fantasy", year: "2010" },
  { id: "demo-s-3", kind: "song", title: "Dreams", artist: "Fleetwood Mac", albumName: "Rumours", year: "1977" },
  { id: "demo-s-4", kind: "song", title: "Redbone", artist: "Childish Gambino", albumName: "Awaken, My Love!", year: "2016" },
  { id: "demo-s-5", kind: "song", title: "Pink + White", artist: "Frank Ocean", albumName: "Blonde", year: "2016" },
  { id: "demo-s-6", kind: "song", title: "Superstition", artist: "Stevie Wonder", albumName: "Talking Book", year: "1972" },
  { id: "demo-s-7", kind: "song", title: "Sicko Mode", artist: "Travis Scott", albumName: "Astroworld", year: "2018" },
  { id: "demo-s-8", kind: "song", title: "Everlong", artist: "Foo Fighters", albumName: "The Colour and the Shape", year: "1997" },
  { id: "demo-s-9", kind: "song", title: "Electric Feel", artist: "MGMT", albumName: "Oracular Spectacular", year: "2007" },
  { id: "demo-s-10", kind: "song", title: "Alright", artist: "Kendrick Lamar", albumName: "To Pimp a Butterfly", year: "2015" },
  { id: "demo-s-11", kind: "song", title: "Midnight City", artist: "M83", albumName: "Hurry Up, We're Dreaming", year: "2011" },
  { id: "demo-s-12", kind: "song", title: "Tití Me Preguntó", artist: "Bad Bunny", albumName: "Un Verano Sin Ti", year: "2022" },
  { id: "demo-s-13", kind: "song", title: "Heart of Glass", artist: "Blondie", albumName: "Parallel Lines", year: "1978" },
  { id: "demo-s-14", kind: "song", title: "Ivy", artist: "Frank Ocean", albumName: "Blonde", year: "2016" },
  { id: "demo-s-15", kind: "song", title: "Last Nite", artist: "The Strokes", albumName: "Is This It", year: "2001" },
  { id: "demo-s-16", kind: "song", title: "Good Days", artist: "SZA", albumName: "Good Days", year: "2020" },
];

export const DEMO_ALBUMS: MusicItem[] = [
  { id: "demo-a-1", kind: "album", title: "Blonde", artist: "Frank Ocean", year: "2016" },
  { id: "demo-a-2", kind: "album", title: "Rumours", artist: "Fleetwood Mac", year: "1977" },
  { id: "demo-a-3", kind: "album", title: "To Pimp a Butterfly", artist: "Kendrick Lamar", year: "2015" },
  { id: "demo-a-4", kind: "album", title: "My Beautiful Dark Twisted Fantasy", artist: "Kanye West", year: "2010" },
  { id: "demo-a-5", kind: "album", title: "Abbey Road", artist: "The Beatles", year: "1969" },
  { id: "demo-a-6", kind: "album", title: "OK Computer", artist: "Radiohead", year: "1997" },
  { id: "demo-a-7", kind: "album", title: "SOS", artist: "SZA", year: "2022" },
  { id: "demo-a-8", kind: "album", title: "Un Verano Sin Ti", artist: "Bad Bunny", year: "2022" },
  { id: "demo-a-9", kind: "album", title: "Currents", artist: "Tame Impala", year: "2015" },
  { id: "demo-a-10", kind: "album", title: "Thriller", artist: "Michael Jackson", year: "1982" },
];

export function searchDemo(query: string, kind: "song" | "album"): MusicItem[] {
  const q = query.trim().toLowerCase();
  const pool = kind === "song" ? DEMO_SONGS : DEMO_ALBUMS;
  if (!q) return pool;
  return pool.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.artist.toLowerCase().includes(q)
  );
}
