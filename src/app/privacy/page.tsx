import Link from "next/link";

export const metadata = {
  title: "Privacy - Tunordi",
};

export default function PrivacyPage() {
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
        Privacy<em className="text-accent">.</em>
      </h1>

      <div className="flex flex-col gap-5 text-sm leading-6 text-muted [&_strong]:text-ink">
        <p>
          <strong>Your data stays in your browser.</strong> Tunordi has no
          accounts, no database, and no server-side storage. Your rankings,
          queue, and settings live in your browser&apos;s local storage on
          your device and nowhere else. Clearing site data removes them
          completely.
        </p>
        <p>
          <strong>Spotify.</strong> If you connect Spotify, authentication
          happens directly between your browser and Spotify using the
          authorization code flow with PKCE. Your Spotify access token is
          stored only in your browser. We request read-only access to your
          top tracks, saved library, and playlists, and use it solely to let
          you import music for ranking. Nothing from your Spotify account is
          transmitted to or stored on any Tunordi server. You can revoke
          access at any time from your Spotify account&apos;s Apps settings.
        </p>
        <p>
          <strong>Audio previews.</strong> When you hover a song during a
          matchup, the song title and artist name are sent to our preview
          endpoint, which looks up a 30-second public preview clip from
          iTunes or Deezer. No personal or account information is included
          in those lookups.
        </p>
        <p>
          <strong>No tracking.</strong> Tunordi does not use analytics,
          advertising, or tracking cookies.
        </p>
        <p>
          <strong>Contact.</strong> Questions about this policy can be filed
          as issues on the project repository.
        </p>
      </div>
    </div>
  );
}
