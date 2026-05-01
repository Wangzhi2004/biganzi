import { create } from "zustand";

interface GenerationJob {
  id: string;
  status: string;
  jobType: string;
  output?: any;
  durationMs?: number;
  errorMessage?: string;
  createdAt: string;
}

interface GenerationStore {
  currentJob: GenerationJob | null;
  isGenerating: boolean;
  generationProgress: string;
  error: string | null;
  startGeneration: (projectId: string) => Promise<void>;
  pollJobStatus: (projectId: string, jobId: string) => Promise<void>;
  setCurrentJob: (job: GenerationJob | null) => void;
  clearJob: () => void;
}

const POLL_INTERVAL = 2000;
const MAX_POLLS = 150;

export const useGenerationStore = create<GenerationStore>((set, get) => ({
  currentJob: null,
  isGenerating: false,
  generationProgress: "",
  error: null,

  setCurrentJob: (job) => set({ currentJob: job }),

  clearJob: () =>
    set({
      currentJob: null,
      isGenerating: false,
      generationProgress: "",
      error: null,
    }),

  startGeneration: async (projectId) => {
    set({ isGenerating: true, error: null, generationProgress: "正在提交生成任务..." });
    try {
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "生成任务提交失败");
      }
      const job = await res.json();
      set({ currentJob: job, generationProgress: "任务已提交，正在生成中..." });
      await get().pollJobStatus(projectId, job.id);
    } catch (err: any) {
      set({ error: err.message, isGenerating: false });
    }
  },

  pollJobStatus: async (projectId, jobId) => {
    let polls = 0;
    const poll = async (): Promise<void> => {
      polls++;
      if (polls > MAX_POLLS) {
        set({ error: "生成超时，请稍后重试", isGenerating: false });
        return;
      }
      try {
        const res = await fetch(`/api/projects/${projectId}/generate?jobId=${jobId}`);
        if (!res.ok) throw new Error("查询任务状态失败");
        const job = await res.json();
        set({ currentJob: job });
        if (job.status === "completed") {
          set({ isGenerating: false, generationProgress: "生成完成" });
          return;
        }
        if (job.status === "failed") {
          set({
            error: job.errorMessage || "生成失败",
            isGenerating: false,
            generationProgress: "",
          });
          return;
        }
        set({ generationProgress: `生成中... (${polls})` });
        await new Promise((r) => setTimeout(r, POLL_INTERVAL));
        return poll();
      } catch (err: any) {
        set({ error: err.message, isGenerating: false });
      }
    };
    return poll();
  },
}));
