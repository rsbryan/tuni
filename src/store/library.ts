import { create } from "zustand";
import { persist } from "zustand/middleware";
import { flattenRanked } from "@/lib/ranking";
import { dedupeKey } from "@/lib/dedupe";
import {
  emptyTierLists,
  ItemKind,
  MusicItem,
  RankedEntry,
  Tier,
  TierLists,
} from "@/lib/types";

interface LibraryState {
  songs: TierLists;
  albums: TierLists;
  queue: MusicItem[];
  addToQueue: (items: MusicItem[]) => number;
  removeFromQueue: (id: string) => void;
  skipToBack: (id: string) => void;
  requeueFront: (item: MusicItem) => void;
  clearQueue: () => void;
  insertRanked: (item: MusicItem, tier: Tier, index: number) => void;
  removeRanked: (kind: ItemKind, id: string) => void;
  resetAll: () => void;
}

function listsFor(state: LibraryState, kind: ItemKind): TierLists {
  return kind === "song" ? state.songs : state.albums;
}

export const useLibrary = create<LibraryState>()(
  persist(
    (set, get) => ({
      songs: emptyTierLists(),
      albums: emptyTierLists(),
      queue: [],

      addToQueue: (items) => {
        const state = get();
        const seenIds = new Set(state.queue.map((i) => i.id));
        const seenKeys = new Set(state.queue.map(dedupeKey));
        for (const kind of ["song", "album"] as ItemKind[]) {
          for (const entry of flattenRanked(listsFor(state, kind))) {
            seenIds.add(entry.id);
            seenKeys.add(dedupeKey(entry));
          }
        }
        const fresh: MusicItem[] = [];
        for (const item of items) {
          const key = dedupeKey(item);
          if (seenIds.has(item.id) || seenKeys.has(key)) continue;
          seenIds.add(item.id);
          seenKeys.add(key);
          fresh.push(item);
        }
        if (fresh.length > 0) {
          set({ queue: [...state.queue, ...fresh] });
        }
        return fresh.length;
      },

      removeFromQueue: (id) =>
        set((state) => ({ queue: state.queue.filter((i) => i.id !== id) })),

      skipToBack: (id) =>
        set((state) => {
          const item = state.queue.find((i) => i.id === id);
          if (!item) return state;
          return {
            queue: [...state.queue.filter((i) => i.id !== id), item],
          };
        }),

      requeueFront: (item) =>
        set((state) =>
          state.queue.some((i) => i.id === item.id)
            ? state
            : { queue: [item, ...state.queue] }
        ),

      clearQueue: () => set({ queue: [] }),

      insertRanked: (item, tier, index) =>
        set((state) => {
          const key = item.kind === "song" ? "songs" : "albums";
          const lists = listsFor(state, item.kind);
          const entry: RankedEntry = { ...item, tier, rankedAt: Date.now() };
          const tierList = [...lists[tier]];
          tierList.splice(index, 0, entry);
          return {
            [key]: { ...lists, [tier]: tierList },
            queue: state.queue.filter((i) => i.id !== item.id),
          };
        }),

      removeRanked: (kind, id) =>
        set((state) => {
          const key = kind === "song" ? "songs" : "albums";
          const lists = listsFor(state, kind);
          const next = emptyTierLists();
          (Object.keys(lists) as Tier[]).forEach((tier) => {
            next[tier] = lists[tier].filter((e) => e.id !== id);
          });
          return { [key]: next };
        }),

      resetAll: () =>
        set({ songs: emptyTierLists(), albums: emptyTierLists(), queue: [] }),
    }),
    { name: "tunordi-library" }
  )
);
