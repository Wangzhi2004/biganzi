import { create } from "zustand";

interface EditorStore {
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: string | null;
  aiOperation: string | null;
  isAiProcessing: boolean;
  selectedText: string;
  setSaving: (saving: boolean) => void;
  setDirty: (dirty: boolean) => void;
  setLastSaved: (time: string) => void;
  setAiOperation: (op: string | null) => void;
  setAiProcessing: (processing: boolean) => void;
  setSelectedText: (text: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
  aiOperation: null,
  isAiProcessing: false,
  selectedText: "",

  setSaving: (saving) => set({ isSaving: saving }),
  setDirty: (dirty) => set({ isDirty: dirty }),
  setLastSaved: (time) => set({ lastSavedAt: time, isDirty: false }),
  setAiOperation: (op) => set({ aiOperation: op }),
  setAiProcessing: (processing) => set({ isAiProcessing: processing }),
  setSelectedText: (text) => set({ selectedText: text }),
}));
