# Ideas

Parking lot for future features and plans. Move items to "shipped" when done.

## Marketing

- Friends launch: have friends rank their libraries in person, film the
  session with a face cam for reactions plus a screen recording of the app,
  cut reaction clips for socials. Best moments: heated head-to-head picks,
  the final top 10 reveal, arguments over someone ranking a classic low.
  - Prep needed: a "guest mode" or quick profile reset so each friend starts
    clean without wiping the previous person's rankings (profiles or an
    export/import of the library state).
  - The share card is the end-of-video payoff; consider a "reveal" animation
    mode that counts down 10 to 1 for the camera.
- Share cards posted with a link back once deployed.

## Product

- Guest/multi-profile support so several people can rank on one device
  (also unblocks the friends-launch filming above).
- Reveal mode: animated top-10 countdown for filming and screenshots.
- Compare two people's rankings; taste-match percentage.
- Regional rankings: aggregate everyone's top-rated songs by region and
  show them on an interactive world map. Needs accounts and a backend
  before it can exist; big social hook once there are real users.
- Artist rankings as a third list alongside songs and albums.
- Playlist export: push your ranked top N back to Spotify as a playlist.
- Long-press preview on mobile (hover preview is desktop-only today).
- Re-rank prompts: occasionally resurface an old pick to keep lists fresh.
- Import full Spotify listening history via the privacy data export for
  lifetime stats (the API only exposes top 50 per time range).
- Undo history beyond the last placement.

## Infra

- Spotify dev-mode constraints (Feb 2026 API policy): the app owner needs
  an active Premium subscription, and apps created after Feb 11, 2026 can
  allowlist at most 5 users. A friends launch beyond 5 people needs the
  playlist-link import (public data, no login required) or extended quota.

- Deploy to Vercel; add the production callback URL to the Spotify app.
- Accounts + database (Supabase) once multi-device sync or friend
  comparisons matter; app is localStorage-only until then.

## Shipped

- Tier + head-to-head ranking with 0-10 scores (songs, albums)
- Spotify import: top tracks, liked songs, derived top albums, playlists
- Genre exclusion at import; genre filters on ranked lists
- Duplicate detection by ID and normalized title/artist
- Hover audio previews on compare cards (iTunes previews)
- Stats page with taste-vs-plays divergence
- Share cards (top 10 PNG export)
- Queue manager, keyboard shortcuts, skip, undo
