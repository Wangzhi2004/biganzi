import { create } from "zustand";

interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  content?: string;
  summary?: string;
  chapterFunction: string;
  sceneCards?: any;
  qualityScore?: number;
  auditStatus: string;
  isConfirmed: boolean;
  wordCount: number;
  volumeId?: string;
  arcId?: string;
  scenes?: any[];
  auditReport?: any;
  stateDiff?: any;
  goal?: string;
  mustHappen?: string[];
  mustNotHappen?: string[];
  endingHook?: string;
}

interface ChapterStore {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  chapterTree: any[];
  isLoading: boolean;
  treeLoading: boolean;
  error: string | null;
  fetchChapters: (projectId: string) => Promise<void>;
  fetchChapter: (projectId: string, chapterId: string) => Promise<void>;
  fetchChapterTree: (projectId: string) => Promise<void>;
  updateChapter: (
    projectId: string,
    chapterId: string,
    data: any
  ) => Promise<void>;
  setCurrentChapter: (chapter: Chapter | null) => void;
}

export const useChapterStore = create<ChapterStore>((set, get) => ({
  chapters: [],
  currentChapter: null,
  chapterTree: [],
  isLoading: false,
  treeLoading: false,
  error: null,

  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),

  fetchChapters: async (projectId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters`);
      if (!res.ok) throw new Error("获取章节列表失败");
      const data = await res.json();
      set({ chapters: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchChapter: async (projectId, chapterId) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(
        `/api/projects/${projectId}/chapters/${chapterId}`
      );
      if (!res.ok) throw new Error("获取章节详情失败");
      const data = await res.json();
      set({ currentChapter: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchChapterTree: async (projectId) => {
    set({ treeLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${projectId}/chapters`);
      if (!res.ok) throw new Error("获取章节树失败");
      const chapters = await res.json();

      // Transform flat list into tree: Volume → Chapters
      const volumeMap = new Map<string, any>();
      const noVolume: any[] = [];

      for (const ch of chapters) {
        if (ch.volumeId) {
          if (!volumeMap.has(ch.volumeId)) {
            volumeMap.set(ch.volumeId, {
              id: ch.volumeId,
              name: ch.volume?.title || `卷 ${volumeMap.size + 1}`,
              chapters: [],
            });
          }
          volumeMap.get(ch.volumeId).chapters.push(ch);
        } else {
          noVolume.push(ch);
        }
      }

      const tree = [...volumeMap.values()];
      if (noVolume.length > 0) {
        tree.push({ id: "no-volume", name: "未分卷", chapters: noVolume });
      }

      set({ chapterTree: tree, treeLoading: false });
    } catch (err: any) {
      set({ error: err.message, treeLoading: false });
    }
  },

  updateChapter: async (projectId, chapterId, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(
        `/api/projects/${projectId}/chapters/${chapterId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("更新章节失败");
      const chapter = await res.json();
      set({
        chapters: get().chapters.map((c) =>
          c.id === chapterId ? chapter : c
        ),
        currentChapter:
          get().currentChapter?.id === chapterId
            ? chapter
            : get().currentChapter,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
