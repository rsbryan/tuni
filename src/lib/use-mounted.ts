"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

// True only after hydration; lets client-only UI (persisted store, localStorage
// reads) render without server/client markup mismatches.
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
