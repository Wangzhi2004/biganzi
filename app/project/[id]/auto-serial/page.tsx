"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft, Toggle, Settings, Clock, BookOpen, Sparkles,
  Heart, Globe, Zap, Target, AlertCircle, Save, Loader2,
  CheckCircle2, Sun, Moon, Flame, TrendingUp, Users,
  Calendar, Activity, TrendingDown, Minus, Upload, X,
  ChevronUp, ChevronDown, BarChart3,
} from "lucide-react";

interface AutoSerialConfig {
  projectId: string;
  enabled: boolean;
  dailyChapterCount: number;
  chapterWordCount: number;
  styleStrength: number;
  pleasureDensity: number;
  plotSpeed: "slow" | "medium" | "fast";
  innovationLevel: "conservative" | "balanced" | "aggressive";
  dramaLevel: "light" | "moderate" | "hardcore";
  romanceWeight: "low" | "medium" | "high";
  worldExpansionSpeed: "slow" | "medium" | "fast";
  autoRewriteThreshold: number;
  requireHumanApproval: boolean;
  preferredTime: string;
}

export default function AutoSerialPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [config, setConfig] = useState<AutoSerialConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [weeklyReports, setWeeklyReports] = useState<any[]>([]);

  const taskStats = {
    pending: tasks.filter(t => t.status === "pending").length,
    approved: tasks.filter(t => t.status === "approved").length,
    rejected: tasks.filter(t => t.status === "rejected").length,
    published: tasks.filter(t => t.status === "published").length,
  };

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/auto-serial/config`);
      if (res.ok) {
        const data = await res.json();
        setConfig(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-serial/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  }, [projectId]);

  const fetchDailyReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-serial/daily-report?date=${reportDate}`);
      if (res.ok) {
        const data = await res.json();
        setDailyReport(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch daily report:", error);
    }
  }, [projectId, reportDate]);

  const fetchWeeklyReports = useCallback(async () => {
    try {
      const reports: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const res = await fetch(`/api/projects/${projectId}/auto-serial/daily-report?date=${dateStr}`);
        if (res.ok) {
          const data = await res.json();
          reports.push(data.data);
        }
      }
      setWeeklyReports(reports);
    } catch (error) {
      console.error("Failed to fetch weekly reports:", error);
    }
  }, [projectId]);

  useEffect(() => {
    fetchConfig();
    fetchTasks();
    fetchDailyReport();
    fetchWeeklyReports();
  }, [fetchConfig, fetchTasks, fetchDailyReport, fetchWeeklyReports]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleClearSelection = () => {
    setSelectedTasks([]);
  };

  const handleBatchPublish = async () => {
    try {
      for (const taskId of selectedTasks) {
        await fetch(`/api/projects/${projectId}/auto-serial/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        });
      }
      await fetchTasks();
      setSelectedTasks([]);
    } catch (error) {
      console.error("Failed to batch publish:", error);
    }
  };

  const handleReorderTasks = async (fromIndex: number, toIndex: number) => {
    try {
      const reordered = [...tasks];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);
      setTasks(reordered);
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
    }
  };

  const handleGenerateNow = async () => {
    try {
      setGenerating(true);
      const res = await fetch(`/api/projects/${projectId}/auto-serial/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: config?.dailyChapterCount || 1 }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to generate:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExecute = async (taskId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-serial/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 1 }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to execute task:", error);
    }
  };

  const handleReject = async (taskId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-serial/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject" }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to reject task:", error);
    }
  };

  const handlePublish = async (taskId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/auto-serial/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) {
        await fetchTasks();
      }
    } catch (error) {
      console.error("Failed to publish task:", error);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case "pending": return "bg-[var(--accent)]/10 text-[var(--accent)]";
      case "approved": return "bg-[var(--forest)]/10 text-[var(--forest)]";
      case "rejected": return "bg-[var(--rose)]/10 text-[var(--rose)]";
      case "published": return "bg-[var(--ochre)]/10 text-[var(--ochre)]";
      case "generating": return "bg-[var(--blue)]/10 text-[var(--blue)]";
      case "rewriting": return "bg-[var(--purple)]/10 text-[var(--purple)]";
      default: return "bg-[var(--border)] text-[var(--text-muted)]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "待处理";
      case "approved": return "已通过";
      case "rejected": return "已拒绝";
      case "published": return "已发布";
      case "generating": return "生成中";
      case "rewriting": return "重写中";
      default: return status;
    }
  };

  const getScoreClass = (score: number) => {
    if (score >= 90) return "text-[var(--forest)]";
    if (score >= 80) return "text-[var(--accent)]";
    if (score >= 70) return "text-[var(--ochre)]";
    return "text-[var(--rose)]";
  };

  const getTrendClass = (trend: string) => {
    switch (trend) {
      case "up": return "text-[var(--forest)]";
      case "down": return "text-[var(--rose)]";
      default: return "text-[var(--text-muted)]";
    }
  };

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case "up": return "↑ 上升";
      case "down": return "↓ 下降";
      default: return "→ 稳定";
    }
  };

  const getSuggestionClass = (priority: string) => {
    switch (priority) {
      case "high": return "bg-[var(--rose)]/5 border border-[var(--rose)]/20";
      case "medium": return "bg-[var(--ochre)]/5 border border-[var(--ochre)]/20";
      default: return "bg-[var(--bg)] border border-[var(--border-faint)]";
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case "high": return "bg-[var(--rose)]/10 text-[var(--rose)]";
      case "medium": return "bg-[var(--ochre)]/10 text-[var(--ochre)]";
      default: return "bg-[var(--border)] text-[var(--text-muted)]";
    }
  };

  const handleSave = async () => {
    if (!config) return;
    
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/auto-serial/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (error) {
      console.error("Failed to save config:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof AutoSerialConfig, value: any) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const NumberInput = ({ label, value, onChange, min, max, step = 1, unit = "" }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    unit?: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        {unit && <span className="text-sm text-[var(--text-muted)]">{unit}</span>}
      </div>
    </div>
  );

  const SliderInput = ({ label, value, onChange, min, max, unit = "" }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    unit?: string;
  }) => (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-medium text-[var(--text-secondary)]">{label}</label>
        <span className="text-sm text-[var(--accent)] font-medium">{value}{unit}</span>
      </div>
      <input
        type="range"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        min={min}
        max={max}
        className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
      />
    </div>
  );

  const SelectInput = ({ label, value, onChange, options }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const ToggleInput = ({ label, value, onChange, description }: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
    description?: string;
  }) => (
    <div className="flex items-center justify-between p-4 bg-[var(--surface)] rounded-lg">
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-[var(--text-primary)]">{label}</span>
          {value && <span className="text-xs px-2 py-0.5 bg-[var(--forest)]/10 text-[var(--forest)] rounded-full">已启用</span>}
        </div>
        {description && <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors ${value ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-[var(--rose)] mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">加载配置失败</p>
          <button
            onClick={fetchConfig}
            className="mt-4 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)]"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/project/${projectId}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">自动连载设置</h1>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              saved
                ? "bg-[var(--forest)] text-white"
                : "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : saved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                已保存
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存配置
              </>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-8">
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Toggle className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">自动连载开关</h2>
            </div>
            <ToggleInput
              label="启用自动连载"
              value={config.enabled}
              onChange={(v) => handleChange("enabled", v)}
              description="启用后，系统将按照您的设置自动生成章节"
            />
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">基础设置</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <NumberInput
                label="每日生成章数"
                value={config.dailyChapterCount}
                onChange={(v) => handleChange("dailyChapterCount", v)}
                min={1}
                max={5}
                unit="章"
              />
              <NumberInput
                label="每章字数"
                value={config.chapterWordCount}
                onChange={(v) => handleChange("chapterWordCount", v)}
                min={2000}
                max={8000}
                step={500}
                unit="字"
              />
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  每日发布时间
                </label>
                <input
                  type="time"
                  value={config.preferredTime}
                  onChange={(e) => handleChange("preferredTime", e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                />
              </div>
              <ToggleInput
                label="需要人工确认"
                value={config.requireHumanApproval}
                onChange={(v) => handleChange("requireHumanApproval", v)}
                description="启用后，生成的章节需要人工确认后才会进入发布队列"
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">风格与节奏</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SliderInput
                label="风格强度"
                value={config.styleStrength}
                onChange={(v) => handleChange("styleStrength", v)}
                min={0}
                max={100}
                unit="%"
              />
              <SliderInput
                label="爽点密度"
                value={config.pleasureDensity}
                onChange={(v) => handleChange("pleasureDensity", v)}
                min={0}
                max={100}
                unit="%"
              />
              <SelectInput
                label="主线推进速度"
                value={config.plotSpeed}
                onChange={(v) => handleChange("plotSpeed", v as any)}
                options={[
                  { value: "slow", label: "缓慢" },
                  { value: "medium", label: "适中" },
                  { value: "fast", label: "快速" },
                ]}
              />
              <SelectInput
                label="世界观扩张速度"
                value={config.worldExpansionSpeed}
                onChange={(v) => handleChange("worldExpansionSpeed", v as any)}
                options={[
                  { value: "slow", label: "缓慢" },
                  { value: "medium", label: "适中" },
                  { value: "fast", label: "快速" },
                ]}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">内容偏好</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SelectInput
                label="创新程度"
                value={config.innovationLevel}
                onChange={(v) => handleChange("innovationLevel", v as any)}
                options={[
                  { value: "conservative", label: "保守" },
                  { value: "balanced", label: "平衡" },
                  { value: "aggressive", label: "激进" },
                ]}
              />
              <SelectInput
                label="虐主程度"
                value={config.dramaLevel}
                onChange={(v) => handleChange("dramaLevel", v as any)}
                options={[
                  { value: "light", label: "轻松" },
                  { value: "moderate", label: "适度" },
                  { value: "hardcore", label: "硬核" },
                ]}
              />
              <SelectInput
                label="感情线权重"
                value={config.romanceWeight}
                onChange={(v) => handleChange("romanceWeight", v as any)}
                options={[
                  { value: "low", label: "低" },
                  { value: "medium", label: "中" },
                  { value: "high", label: "高" },
                ]}
              />
            </div>
          </section>

          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-[var(--accent)]" />
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">质量控制</h2>
            </div>
            <div className="bg-[var(--surface)] rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    自动重写阈值
                  </label>
                  <p className="text-sm text-[var(--text-muted)]">
                    当章节质量评分低于此值时，系统会自动重写该章节
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-[var(--accent)]">{config.autoRewriteThreshold}</span>
                  <span className="text-sm text-[var(--text-muted)] ml-1">分</span>
                </div>
              </div>
              <input
                type="range"
                value={config.autoRewriteThreshold}
                onChange={(e) => handleChange("autoRewriteThreshold", parseInt(e.target.value))}
                min={60}
                max={90}
                className="w-full h-3 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-[var(--accent)]"
              />
              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-2">
                <span>60分</span>
                <span>70分</span>
                <span>80分</span>
                <span>90分</span>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-[var(--border)]">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--rose)]/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-[var(--rose)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">&lt;70分</p>
                  <p className="text-xs font-medium text-[var(--text-primary)]">自动重写</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--ochre)]/10 flex items-center justify-center">
                    <Sun className="w-5 h-5 text-[var(--ochre)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">70-80分</p>
                  <p className="text-xs font-medium text-[var(--text-primary)]">优化建议</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <Moon className="w-5 h-5 text-[var(--accent)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">80-90分</p>
                  <p className="text-xs font-medium text-[var(--text-primary)]">接受发布</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[var(--forest)]/10 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-[var(--forest)]" />
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">90+分</p>
                  <p className="text-xs font-medium text-[var(--text-primary)]">优秀</p>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[var(--accent-subtle)] rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-[var(--accent)]/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-[var(--accent)]" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--text-primary)] mb-2">质量闸门说明</h3>
                <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                  <li>• <strong>低于70分</strong>：自动重写，直至达到阈值或达到最大重写次数</li>
                  <li>• <strong>70-80分</strong>：保留并提供优化建议，可选择人工重写</li>
                  <li>• <strong>80-90分</strong>：直接进入发布队列（如启用人工确认则需确认）</li>
                  <li>• <strong>90分以上</strong>：标记为优秀，优先发布</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">每日报告</h2>
              </div>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="px-3 py-1.5 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm"
              />
            </div>

            {dailyReport ? (
              <div className="bg-[var(--surface)] rounded-lg p-6">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--accent)]">{dailyReport.chaptersGenerated}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">生成章节</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--forest)]">{dailyReport.chaptersApproved}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">通过审核</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--rose)]">{dailyReport.chaptersRejected}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">被拒绝</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[var(--ochre)]">{Math.round(dailyReport.avgQualityScore)}</p>
                    <p className="text-xs text-[var(--text-muted)] mt-1">平均评分</p>
                  </div>
                </div>

                <div className="flex gap-4 mb-6">
                  <div className="flex-1 bg-[var(--bg)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">质量趋势</span>
                      <span className={`ml-auto text-xs ${getTrendClass(dailyReport.trends.qualityTrend)}`}>
                        {getTrendLabel(dailyReport.trends.qualityTrend)}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getTrendClass(dailyReport.trends.qualityTrend).replace("text-", "bg-")}`}
                        style={{ width: `${Math.min(dailyReport.avgQualityScore, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 bg-[var(--bg)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">产量趋势</span>
                      <span className={`ml-auto text-xs ${getTrendClass(dailyReport.trends.productivityTrend)}`}>
                        {getTrendLabel(dailyReport.trends.productivityTrend)}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getTrendClass(dailyReport.trends.productivityTrend).replace("text-", "bg-")}`}
                        style={{ width: `${Math.min((dailyReport.chaptersGenerated / 5) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex-1 bg-[var(--bg)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="w-4 h-4 text-[var(--text-muted)]" />
                      <span className="text-xs text-[var(--text-muted)]">通过率趋势</span>
                      <span className={`ml-auto text-xs ${getTrendClass(dailyReport.trends.approvalRateTrend)}`}>
                        {getTrendLabel(dailyReport.trends.approvalRateTrend)}
                      </span>
                    </div>
                    <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getTrendClass(dailyReport.trends.approvalRateTrend).replace("text-", "bg-")}`}
                        style={{
                          width: `${dailyReport.chaptersGenerated > 0
                            ? (dailyReport.chaptersApproved / dailyReport.chaptersGenerated) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="bg-[var(--bg)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-[var(--accent)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">近7日产量趋势</span>
                    </div>
                    <div className="flex items-end justify-between h-24 gap-2">
                      {weeklyReports.map((report, index) => {
                        const maxChapters = Math.max(...weeklyReports.map(r => r?.chaptersGenerated || 0), 1);
                        const height = maxChapters > 0 ? ((report?.chaptersGenerated || 0) / maxChapters) * 100 : 0;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className="w-full bg-[var(--accent)]/30 rounded-t transition-all hover:bg-[var(--accent)]/50"
                              style={{ height: `${height}%`, minHeight: height > 0 ? "4px" : "4px" }}
                            />
                            <span className="text-xs text-[var(--text-muted)]">
                              {new Date(report?.date || new Date()).toLocaleDateString("zh-CN", { weekday: "short" })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="bg-[var(--bg)] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-[var(--forest)]" />
                      <span className="text-sm font-medium text-[var(--text-primary)]">近7日质量趋势</span>
                    </div>
                    <div className="flex items-end justify-between h-24 gap-2">
                      {weeklyReports.map((report, index) => {
                        const maxScore = 100;
                        const height = ((report?.avgQualityScore || 0) / maxScore) * 100;
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className={`w-full rounded-t transition-all ${
                                height >= 80 ? "bg-[var(--forest)]/30 hover:bg-[var(--forest)]/50" :
                                height >= 70 ? "bg-[var(--accent)]/30 hover:bg-[var(--accent)]/50" :
                                "bg-[var(--rose)]/30 hover:bg-[var(--rose)]/50"
                              }`}
                              style={{ height: `${height}%`, minHeight: "4px" }}
                            />
                            <span className="text-xs text-[var(--text-muted)]">
                              {Math.round(report?.avgQualityScore || 0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">历史日报</h3>
                  <div className="grid grid-cols-7 gap-2">
                    {weeklyReports.map((report, index) => (
                      <button
                        key={index}
                        onClick={() => setReportDate(report?.date || new Date().toISOString().split("T")[0])}
                        className={`p-2 rounded-lg text-center transition-colors ${
                          reportDate === report?.date
                            ? "bg-[var(--accent)] text-white"
                            : "bg-[var(--bg)] hover:bg-[var(--border)]"
                        }`}
                      >
                        <p className="text-xs font-medium">
                          {new Date(report?.date || new Date()).getDate()}
                        </p>
                        <p className={`text-xs ${reportDate === report?.date ? "text-white/70" : "text-[var(--text-muted)]"}`}>
                          {new Date(report?.date || new Date()).toLocaleDateString("zh-CN", { weekday: "short" })}
                        </p>
                        {report?.chaptersGenerated > 0 && (
                          <p className={`text-xs mt-1 ${reportDate === report?.date ? "text-white/70" : "text-[var(--accent)]"}`}>
                            {report.chaptersGenerated}章
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">智能建议</h3>
                  <div className="space-y-2">
                    {dailyReport.suggestions.map((suggestion: any, index: number) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${getSuggestionClass(suggestion.priority)}`}
                      >
                        <div className="flex items-start gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getPriorityClass(suggestion.priority)}`}>
                            {suggestion.type}
                          </span>
                          <span className="text-sm text-[var(--text-secondary)]">{suggestion.message}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--surface)] rounded-lg p-8 text-center text-[var(--text-muted)]">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>暂无日报数据</p>
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[var(--accent)]" />
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">待发布队列</h2>
                {selectedTasks.length > 0 && (
                  <span className="text-sm text-[var(--accent)]">已选择 {selectedTasks.length} 项</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {selectedTasks.length > 0 && (
                  <>
                    <button
                      onClick={handleBatchPublish}
                      className="flex items-center gap-2 px-3 py-1.5 bg-[var(--forest)] text-white text-sm rounded-lg hover:bg-[var(--forest)]/80"
                    >
                      <Upload className="w-4 h-4" />
                      批量发布 ({selectedTasks.length})
                    </button>
                    <button
                      onClick={handleClearSelection}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg hover:bg-[var(--border)]"
                    >
                      <X className="w-4 h-4" />
                      取消选择
                    </button>
                  </>
                )}
                <button
                  onClick={handleGenerateNow}
                  disabled={generating}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent)] text-white text-sm rounded-lg hover:bg-[var(--accent-hover)] disabled:opacity-50"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      立即生成
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[var(--accent)]">{taskStats.pending}</p>
                <p className="text-xs text-[var(--text-muted)]">待处理</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[var(--forest)]">{taskStats.approved}</p>
                <p className="text-xs text-[var(--text-muted)]">已通过</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[var(--rose)]">{taskStats.rejected}</p>
                <p className="text-xs text-[var(--text-muted)]">已拒绝</p>
              </div>
              <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-[var(--ochre)]">{taskStats.published}</p>
                <p className="text-xs text-[var(--text-muted)]">已发布</p>
              </div>
            </div>

            <div className="bg-[var(--surface)] rounded-lg overflow-hidden">
              <div className="max-h-80 overflow-auto">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-[var(--text-muted)]">
                    <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无待发布任务</p>
                    <p className="text-sm mt-1">点击"立即生成"开始创建章节</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[var(--border)]">
                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">
                          <input
                            type="checkbox"
                            checked={selectedTasks.length === tasks.length && tasks.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTasks(tasks.filter(t => t.status === "approved").map(t => t.id));
                              } else {
                                setSelectedTasks([]);
                              }
                            }}
                            className="mr-2"
                          />
                          章节
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">状态</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">评分</th>
                        <th className="text-left px-4 py-3 text-xs font-medium text-[var(--text-muted)]">重试次数</th>
                        <th className="text-right px-4 py-3 text-xs font-medium text-[var(--text-muted)]">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tasks.map((task, index) => (
                        <tr
                          key={task.id}
                          className={`border-b border-[var(--border-faint)] hover:bg-[var(--bg)] ${
                            selectedTasks.includes(task.id) ? "bg-[var(--accent)]/5" : ""
                          }`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedTasks.includes(task.id)}
                              onChange={() => toggleTaskSelection(task.id)}
                              disabled={task.status !== "approved"}
                              className="mr-2"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => index > 0 && handleReorderTasks(index, index - 1)}
                                disabled={index === 0}
                                className="p-1 hover:bg-[var(--border)] rounded disabled:opacity-30"
                              >
                                <ChevronUp className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => index < tasks.length - 1 && handleReorderTasks(index, index + 1)}
                                disabled={index === tasks.length - 1}
                                className="p-1 hover:bg-[var(--border)] rounded disabled:opacity-30"
                              >
                                <ChevronDown className="w-4 h-4" />
                              </button>
                              <span className="font-medium text-[var(--text-primary)]">第{task.chapterNumber}章</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${getStatusClass(task.status)}`}>
                              {getStatusLabel(task.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {task.qualityScore !== null ? (
                              <span className={`font-medium ${getScoreClass(task.qualityScore)}`}>
                                {Math.round(task.qualityScore)}分
                              </span>
                            ) : (
                              <span className="text-[var(--text-muted)]">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[var(--text-secondary)]">{task.retryCount}次</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {task.status === "approved" && (
                                <>
                                  <button
                                    onClick={() => handleReject(task.id)}
                                    className="px-2 py-1 text-xs text-[var(--rose)] hover:bg-[var(--rose)]/10 rounded"
                                  >
                                    拒绝
                                  </button>
                                  <button
                                    onClick={() => handlePublish(task.id)}
                                    className="px-2 py-1 text-xs bg-[var(--forest)] text-white rounded hover:bg-[var(--forest)]/80"
                                  >
                                    发布
                                  </button>
                                </>
                              )}
                              {task.status === "pending" && (
                                <button
                                  onClick={() => handleExecute(task.id)}
                                  className="px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)]"
                                >
                                  执行
                                </button>
                              )}
                              {task.status === "rejected" && (
                                <button
                                  onClick={() => handleExecute(task.id)}
                                  className="px-2 py-1 text-xs bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)]"
                                >
                                  重试
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
