import { create } from "zustand";

interface Project {
  id: string;
  name: string;
  genre: string;
  subGenre: string;
  description?: string;
  status: string;
  totalWords: number;
  currentChapter: number;
  createdAt: string;
  updatedAt: string;
  bookDna?: any;
  styleFingerprint?: any;
  _count?: { chapters: number; characters: number; foreshadows: number };
}

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;
  setProjects: (projects: Project[]) => void;
  setCurrentProject: (project: Project | null) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: any) => Promise<Project>;
  updateProject: (id: string, data: any) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  setProjects: (projects) => set({ projects }),
  setCurrentProject: (project) => set({ currentProject: project }),

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/projects");
      if (!res.ok) throw new Error("获取项目列表失败");
      const data = await res.json();
      set({ projects: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  fetchProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) throw new Error("获取项目详情失败");
      const data = await res.json();
      set({ currentProject: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createProject: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("创建项目失败");
      const project = await res.json();
      set({ projects: [...get().projects, project], isLoading: false });
      return project;
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  updateProject: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("更新项目失败");
      const project = await res.json();
      set({
        projects: get().projects.map((p) => (p.id === id ? project : p)),
        currentProject:
          get().currentProject?.id === id ? project : get().currentProject,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除项目失败");
      set({
        projects: get().projects.filter((p) => p.id !== id),
        currentProject:
          get().currentProject?.id === id ? null : get().currentProject,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },
}));
