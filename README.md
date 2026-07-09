# tunordi

Head-to-head ranking for music. Instead of rating songs in a vacuum, you pick
a tier (loved it / it was fine / not for me) and then answer a handful of
head-to-head matchups. Each pick binary-searches the song into your list, and
scores from 0 to 10 are derived from position: the liked tier spans 6.7-10,
fine spans 3.4-6.6, disliked spans 0-3.3. Songs and albums are ranked as
separate lists.

Everything is stored locally in your browser. There is no backend and no
account.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use the demo library (Import page) to try the
ranking flow without any setup.

## Connect Spotify

Imports use the Spotify Web API with the PKCE flow, so you only need a client
ID, never a secret.

1. Create an app at https://developer.spotify.com/dashboard
2. Add the redirect URI shown on the Import page. Note that Spotify no longer
   accepts `localhost` for new apps, so open the site at
   http://127.0.0.1:3000 and register `http://127.0.0.1:3000/callback`.
3. Paste the client ID on the Import page and connect. You can also set
   `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` in `.env.local` instead.

Once connected you can import your top songs (4 weeks / 6 months / all time),
your latest liked songs, and top albums derived from your all-time top tracks.
Imports land in a ranking queue; each item is placed through the tier pick and
matchup flow.

## Commands

```bash
npm run dev     # dev server
npm run test    # ranking algorithm tests (vitest)
npm run lint    # eslint
npm run build   # production build
```

## Structure

- `src/lib/ranking.ts` - insertion state machine and score math (tested)
- `src/lib/spotify.ts` - PKCE auth and Web API client, browser-only
- `src/store/library.ts` - zustand store persisted to localStorage
- `src/components/RankFlow.tsx` - tier pick, head-to-head matchups, placement
- `src/app/` - rankings home, import page, OAuth callback
