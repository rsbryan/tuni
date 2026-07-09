"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { completeAuth } from "@/lib/spotify";

export default function CallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const authError = params.get("error");

      if (authError) throw new Error(`Spotify said: ${authError}`);
      if (!code) throw new Error("No authorization code in the callback URL.");
      await completeAuth(code);
    };

    finish()
      .then(() => router.replace("/import"))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Token exchange failed")
      );
  }, [router]);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <p className="font-display italic text-2xl text-disliked mb-2">
              Connection failed
            </p>
            <p className="text-sm text-muted mb-6">{error}</p>
            <button
              onClick={() => router.replace("/import")}
              className="rounded-full border border-line px-5 py-2 text-sm hover:border-muted transition-colors"
            >
              Back to import
            </button>
          </>
        ) : (
          <p className="font-display italic text-2xl text-muted">
            Connecting to Spotify...
          </p>
        )}
      </div>
    </div>
  );
}
