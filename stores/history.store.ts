import { create } from "zustand";

export interface ContentSnapshot {
  id: string;
  timestamp: number;
  operationType: string;
  content: string;
  wordCount: number;
}

interface HistoryState {
  snapshots: ContentSnapshot[];
  selectedSnapshotId: string | null;
  compareMode: boolean;
  compareIds: [string | null, string | null];

  addSnapshot: (operationType: string, content: string) => void;
  selectSnapshot: (id: string | null) => void;
  toggleCompareMode: () => void;
  setCompareId: (index: 0 | 1, id: string | null) => void;
  restoreSnapshot: (id: string) => string | null;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  snapshots: [],
  selectedSnapshotId: null,
  compareMode: false,
  compareIds: [null, null],

  addSnapshot: (operationType, content) => {
    const snapshot: ContentSnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      operationType,
      content,
      wordCount: content.replace(/\s/g, "").length,
    };
    set((state) => ({
      snapshots: [snapshot, ...state.snapshots].slice(0, 50),
    }));
  },

  selectSnapshot: (id) => set({ selectedSnapshotId: id }),

  toggleCompareMode: () =>
    set((state) => ({
      compareMode: !state.compareMode,
      compareIds: [null, null],
    })),

  setCompareId: (index, id) =>
    set((state) => {
      const newIds = [...state.compareIds] as [string | null, string | null];
      newIds[index] = id;
      return { compareIds: newIds };
    }),

  restoreSnapshot: (id) => {
    const snapshot = get().snapshots.find((s) => s.id === id);
    return snapshot?.content ?? null;
  },

  clearHistory: () =>
    set({ snapshots: [], selectedSnapshotId: null, compareMode: false, compareIds: [null, null] }),
}));
