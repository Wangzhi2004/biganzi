"use client";

import { useEffect, useState, useCallback, Fragment } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Search,
  Flame,
  AlertTriangle,
  Loader2,
  Eye,
  BookOpen,
  LinkIcon,
  MoreHorizontal,
  Archive,
  CheckCircle2,
  Clock,
  XCircle,
  Layers,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

interface Foreshadow {
  id: string;
  plantedChapter: number;
  clueText: string;
  surfaceMeaning: string;
  trueMeaning: string;
  relatedCharacters: unknown;
  relatedEvents: unknown;
  expectedPayoffStart: number | null;
  expectedPayoffEnd: number | null;
  payoffChapter: number | null;
  status: string;
  heatScore: number;
  urgencyScore: number;
  remindedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

type FilterTab =
  | "all"
  | "upcoming"
  | "long_absent"
  | "paid_off"
  | "high_risk"
  | "deprecated"
  | "early_exposure";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "upcoming", label: "即将回收" },
  { value: "long_absent", label: "长期未出现" },
  { value: "paid_off", label: "已回收" },
  { value: "high_risk", label: "高风险" },
  { value: "deprecated", label: "废弃候选" },
  { value: "early_exposure", label: "过早暴露" },
];

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; strikethrough?: boolean }
> = {
  INACTIVE: {
    label: "未激活",
    color: "text-gray-600",
    bg: "bg-gray-100 border-gray-300",
  },
  PLANTED: {
    label: "已埋设",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  REMINDED: {
    label: "已提醒",
    color: "text-cyan-700",
    bg: "bg-cyan-50 border-cyan-200",
  },
  DEEPENED: {
    label: "已深化",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  PARTIAL_PAYOFF: {
    label: "部分回收",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
  },
  FULL_PAYOFF: {
    label: "完全回收",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
  },
  DEPRECATED: {
    label: "已废弃",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    strikethrough: true,
  },
  CONFLICT: {
    label: "存在冲突",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
  },
};

const STATUS_OPTIONS = [
  { value: "INACTIVE", label: "未激活" },
  { value: "PLANTED", label: "已埋设" },
  { value: "REMINDED", label: "已提醒" },
  { value: "DEEPENED", label: "已深化" },
  { value: "PARTIAL_PAYOFF", label: "部分回收" },
  { value: "FULL_PAYOFF", label: "完全回收" },
  { value: "DEPRECATED", label: "已废弃" },
  { value: "CONFLICT", label: "存在冲突" },
];

function getStatusConfig(status: string) {
  return (
    STATUS_CONFIG[status] || {
      label: status,
      color: "text-gray-600",
      bg: "bg-gray-100 border-gray-300",
    }
  );
}

function getRelatedList(data: unknown): string[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as string[];
  if (typeof data === "string") {
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [data];
    } catch {
      return [data];
    }
  }
  return [];
}

function ScoreBar({
  value,
  max = 10,
}: {
  value: number;
  max?: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 h-1.5 bg-[var(--border-subtle)] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 bg-[var(--accent)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-[var(--text-muted)] w-6 text-right tabular-nums">
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export default function ForeshadowsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [foreshadows, setForeshadows] = useState<Foreshadow[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    foreshadowId: string;
    foreshadow: Foreshadow | null;
    newStatus: string;
    open: boolean;
    payoffPlan: { timing?: string; method?: string; scene?: string } | null;
  }>({
    foreshadowId: "",
    foreshadow: null,
    newStatus: "",
    open: false,
    payoffPlan: null,
  });

  const [generatingPayoffPlan, setGeneratingPayoffPlan] = useState(false);

  const generatePayoffPlan = async () => {
    if (!confirmDialog.foreshadowId) return;

    try {
      setGeneratingPayoffPlan(true);
      const res = await fetch(`/api/projects/${projectId}/foreshadows/${confirmDialog.foreshadowId}/plan`);
      if (res.ok) {
        const data = await res.json();
        setConfirmDialog({
          ...confirmDialog,
          payoffPlan: {
            timing: data.timing,
            method: data.method,
            scene: data.scene,
          },
        });
      }
    } catch (error) {
      console.error("Failed to generate payoff plan:", error);
    } finally {
      setGeneratingPayoffPlan(false);
    }
  };
  const [newForeshadow, setNewForeshadow] = useState({
    plantedChapter: "",
    clueText: "",
    surfaceMeaning: "",
    trueMeaning: "",
    relatedCharacters: "",
    expectedPayoffStart: "",
    expectedPayoffEnd: "",
  });

  const fetchForeshadows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/foreshadows`);
      if (res.ok) {
        const data = await res.json();
        setForeshadows(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchForeshadows();
  }, [fetchForeshadows]);

  const filtered = foreshadows.filter((f) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (
        !f.clueText.toLowerCase().includes(q) &&
        !f.surfaceMeaning.toLowerCase().includes(q) &&
        !f.trueMeaning.toLowerCase().includes(q)
      )
        return false;
    }
    switch (activeTab) {
      case "upcoming":
        return (
          f.expectedPayoffEnd !== null &&
          f.expectedPayoffEnd !== undefined &&
          f.status !== "FULL_PAYOFF" &&
          f.status !== "DEPRECATED"
        );
      case "long_absent":
        return (
          f.status !== "FULL_PAYOFF" &&
          f.status !== "DEPRECATED" &&
          f.status !== "INACTIVE"
        );
      case "paid_off":
        return f.status === "FULL_PAYOFF" || f.status === "PARTIAL_PAYOFF";
      case "high_risk":
        return f.status === "CONFLICT" || f.urgencyScore >= 7;
      case "deprecated":
        return f.status === "DEPRECATED" || f.status === "INACTIVE";
      case "early_exposure":
        // Foreshadows that are deepened/reminded but still far from expected payoff window
        return (
          (f.status === "DEEPENED" || f.status === "REMINDED") &&
          f.expectedPayoffStart !== null &&
          f.expectedPayoffStart !== undefined &&
          f.heatScore > 5
        );
      default:
        return true;
    }
  });

  const needsConfirmation = (status: string) => {
    return ["PARTIAL_PAYOFF", "FULL_PAYOFF", "DEPRECATED"].includes(status);
  };

  const handleStatusChange = async (
    foreshadowId: string,
    newStatus: string
  ) => {
    if (needsConfirmation(newStatus)) {
      const foreshadow = foreshadows.find((f) => f.id === foreshadowId);
      setConfirmDialog({
        foreshadowId,
        foreshadow,
        newStatus,
        open: true,
      });
      return;
    }

    try {
      setStatusUpdating(foreshadowId);
      const res = await fetch(
        `/api/projects/${projectId}/foreshadows/${foreshadowId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus.toLowerCase() }),
        }
      );
      if (res.ok) {
        fetchForeshadows();
      }
    } catch {
    } finally {
      setStatusUpdating(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!confirmDialog.foreshadowId || !confirmDialog.newStatus) return;

    try {
      setStatusUpdating(confirmDialog.foreshadowId);
      const res = await fetch(
        `/api/projects/${projectId}/foreshadows/${confirmDialog.foreshadowId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: confirmDialog.newStatus.toLowerCase() }),
        }
      );
      if (res.ok) {
        fetchForeshadows();
      }
    } catch {
    } finally {
      setStatusUpdating(null);
      setConfirmDialog({
        foreshadowId: "",
        foreshadow: null,
        newStatus: "",
        open: false,
      });
    }
  };

  const handleAdd = async () => {
    if (
      !newForeshadow.clueText ||
      !newForeshadow.surfaceMeaning ||
      !newForeshadow.trueMeaning
    )
      return;
    try {
      setAddLoading(true);
      const res = await fetch(`/api/projects/${projectId}/foreshadows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantedChapter: newForeshadow.plantedChapter
            ? parseInt(newForeshadow.plantedChapter)
            : 1,
          clueText: newForeshadow.clueText,
          surfaceMeaning: newForeshadow.surfaceMeaning,
          trueMeaning: newForeshadow.trueMeaning,
          relatedCharacters: newForeshadow.relatedCharacters
            ? newForeshadow.relatedCharacters.split(",").map((s) => s.trim())
            : undefined,
          expectedPayoffStart: newForeshadow.expectedPayoffStart
            ? parseInt(newForeshadow.expectedPayoffStart)
            : undefined,
          expectedPayoffEnd: newForeshadow.expectedPayoffEnd
            ? parseInt(newForeshadow.expectedPayoffEnd)
            : undefined,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setNewForeshadow({
          plantedChapter: "",
          clueText: "",
          surfaceMeaning: "",
          trueMeaning: "",
          relatedCharacters: "",
          expectedPayoffStart: "",
          expectedPayoffEnd: "",
        });
        fetchForeshadows();
      }
    } catch {
    } finally {
      setAddLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="border-b border-[var(--border)] px-6 py-4 bg-white">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/project/${projectId}`}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">伏笔账本</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {foreshadows.length} 条
              </Badge>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="paper-btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                添加伏笔
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[var(--border)] max-w-xl max-h-[85vh] shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)]">添加新伏笔</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      埋设章节 <span className="text-[var(--danger)]">*</span>
                    </label>
                    <Input
                      type="number"
                      value={newForeshadow.plantedChapter}
                      onChange={(e) =>
                        setNewForeshadow({
                          ...newForeshadow,
                          plantedChapter: e.target.value,
                        })
                      }
                      placeholder="章节号"
                      className="paper-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      线索文本 <span className="text-[var(--danger)]">*</span>
                    </label>
                    <Textarea
                      value={newForeshadow.clueText}
                      onChange={(e) =>
                        setNewForeshadow({
                          ...newForeshadow,
                          clueText: e.target.value,
                        })
                      }
                      placeholder="伏笔的表面线索描述"
                      className="paper-input min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      表面含义 <span className="text-[var(--danger)]">*</span>
                    </label>
                    <Textarea
                      value={newForeshadow.surfaceMeaning}
                      onChange={(e) =>
                        setNewForeshadow({
                          ...newForeshadow,
                          surfaceMeaning: e.target.value,
                        })
                      }
                      placeholder="读者看到的表面意思"
                      className="paper-input min-h-[60px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      真实含义 <span className="text-[var(--danger)]">*</span>
                    </label>
                    <Textarea
                      value={newForeshadow.trueMeaning}
                      onChange={(e) =>
                        setNewForeshadow({
                          ...newForeshadow,
                          trueMeaning: e.target.value,
                        })
                      }
                      placeholder="伏笔的真实含义"
                      className="paper-input min-h-[60px]"
                    />
                  </div>
                  <Separator className="divider" />
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      相关人物（逗号分隔）
                    </label>
                    <Input
                      value={newForeshadow.relatedCharacters}
                      onChange={(e) =>
                        setNewForeshadow({
                          ...newForeshadow,
                          relatedCharacters: e.target.value,
                        })
                      }
                      placeholder="如: 张三, 李四"
                      className="paper-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        预计回收起始章节
                      </label>
                      <Input
                        type="number"
                        value={newForeshadow.expectedPayoffStart}
                        onChange={(e) =>
                          setNewForeshadow({
                            ...newForeshadow,
                            expectedPayoffStart: e.target.value,
                          })
                        }
                        placeholder="起始"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        预计回收结束章节
                      </label>
                      <Input
                        type="number"
                        value={newForeshadow.expectedPayoffEnd}
                        onChange={(e) =>
                          setNewForeshadow({
                            ...newForeshadow,
                            expectedPayoffEnd: e.target.value,
                          })
                        }
                        placeholder="结束"
                        className="paper-input"
                      />
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  className="paper-btn-ghost"
                >
                  取消
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={
                    !newForeshadow.clueText ||
                    !newForeshadow.surfaceMeaning ||
                    !newForeshadow.trueMeaning ||
                    addLoading
                  }
                  className="paper-btn-primary"
                >
                  {addLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  创建伏笔
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索线索或含义..."
              className="pl-10 paper-input"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as FilterTab)}
          className="mb-6"
        >
          <TabsList className="bg-white border border-[var(--border)] shadow-sm h-auto p-1 flex-wrap gap-1">
            {FILTER_TABS.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-[var(--accent-subtle)] data-[state=active]:text-[var(--accent-text)] text-xs px-3 py-1.5"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <Layers className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery ? "未找到匹配的伏笔" : "还没有伏笔"}
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
              {searchQuery
                ? "尝试更换搜索关键词，或检查伏笔内容"
                : "点击右上角「添加伏笔」开始记录你的故事伏笔"}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-16">
                    章节
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    线索
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-24">
                    状态
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-36">
                    热度
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-36">
                    紧急度
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-32">
                    预计回收区间
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider w-24">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((foreshadow) => {
                  const statusConf = getStatusConfig(foreshadow.status);
                  const isExpanded = expandedId === foreshadow.id;

                  return (
                    <Fragment key={foreshadow.id}>
                      <tr
                        className="border-b border-[var(--border-subtle)] hover:bg-[var(--accent-subtle)] transition-colors cursor-pointer group"
                        onClick={() => toggleExpand(foreshadow.id)}
                      >
                        <td className="px-5 py-3.5">
                          <span className="text-sm font-mono text-[var(--text-muted)]">
                            Ch.{foreshadow.plantedChapter}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                            )}
                            <span
                              className={`text-sm line-clamp-1 ${statusConf.strikethrough ? "line-through text-[var(--text-muted)]" : "text-[var(--text-primary)]"}`}
                            >
                              {foreshadow.clueText}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge
                            variant="outline"
                            className={`${statusConf.bg} ${statusConf.color} border text-xs`}
                          >
                            {statusConf.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <ScoreBar value={foreshadow.heatScore} />
                        </td>
                        <td className="px-5 py-3.5">
                          <ScoreBar value={foreshadow.urgencyScore} />
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {foreshadow.expectedPayoffStart &&
                            foreshadow.expectedPayoffEnd
                              ? `Ch.${foreshadow.expectedPayoffStart} - Ch.${foreshadow.expectedPayoffEnd}`
                              : "-"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                onClick={(e) => e.stopPropagation()}
                                disabled={statusUpdating === foreshadow.id}
                              >
                                {statusUpdating === foreshadow.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="w-4 h-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="bg-white border-[var(--border)] shadow-md"
                            >
                              <DropdownMenuLabel className="text-xs text-[var(--text-muted)]">
                                变更状态
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator className="divider" />
                              {STATUS_OPTIONS.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.value}
                                  className={`text-xs cursor-pointer ${foreshadow.status === opt.value ? "bg-[var(--accent-subtle)] text-[var(--accent-text)]" : ""}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (foreshadow.status !== opt.value) {
                                      handleStatusChange(
                                        foreshadow.id,
                                        opt.value
                                      );
                                    }
                                  }}
                                >
                                  <Badge
                                    variant="outline"
                                    className={`${getStatusConfig(opt.value).bg} ${getStatusConfig(opt.value).color} border text-[10px] mr-2`}
                                  >
                                    {opt.label}
                                  </Badge>
                                  {foreshadow.status === opt.value && (
                                    <CheckCircle2 className="w-3 h-3 ml-auto text-[var(--success)]" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${foreshadow.id}-detail`}>
                          <td colSpan={7} className="px-5 py-0">
                            <div className="py-4 pl-8 border-b border-[var(--border-subtle)]">
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                      <Eye className="w-3 h-3" />
                                      表面含义
                                    </p>
                                    <p className="text-sm text-[var(--text-primary)]">
                                      {foreshadow.surfaceMeaning}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                      <Eye className="w-3 h-3 text-[var(--accent)]" />
                                      真实含义
                                    </p>
                                    <p className="text-sm text-[var(--accent)]">
                                      {foreshadow.trueMeaning}
                                    </p>
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {getRelatedList(
                                    foreshadow.relatedCharacters
                                  ).length > 0 && (
                                    <div>
                                      <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                                        <LinkIcon className="w-3 h-3" />
                                        相关人物
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {getRelatedList(
                                          foreshadow.relatedCharacters
                                        ).map((char, i) => (
                                          <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-[var(--bg)] text-[var(--text-secondary)] text-xs border-[var(--border-subtle)]"
                                          >
                                            {char}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {getRelatedList(foreshadow.relatedEvents)
                                    .length > 0 && (
                                    <div>
                                      <p className="text-xs text-[var(--text-muted)] mb-1.5 flex items-center gap-1.5">
                                        <BookOpen className="w-3 h-3" />
                                        相关事件
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {getRelatedList(
                                          foreshadow.relatedEvents
                                        ).map((evt, i) => (
                                          <Badge
                                            key={i}
                                            variant="secondary"
                                            className="bg-[var(--bg)] text-[var(--text-secondary)] text-xs border-[var(--border-subtle)]"
                                          >
                                            {evt}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {foreshadow.payoffChapter && (
                                    <div>
                                      <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3 text-[var(--success)]" />
                                        回收章节
                                      </p>
                                      <p className="text-sm text-[var(--success)]">
                                        第 {foreshadow.payoffChapter} 章
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* AI Payoff Plan */}
                              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <div className="flex items-center justify-between mb-3">
                                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">回收方案</p>
                                  <button
                                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setStatusUpdating(foreshadow.id);
                                      try {
                                        const res = await fetch(`/api/projects/${projectId}/foreshadows/${foreshadow.id}/plan`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                        });
                                        if (res.ok) {
                                          const data = await res.json();
                                          setForeshadows(prev => prev.map(f =>
                                            f.id === foreshadow.id ? { ...f, payoffPlan: data.plan } : f
                                          ));
                                        }
                                      } catch {} finally { setStatusUpdating(null); }
                                    }}
                                  >
                                    {statusUpdating === foreshadow.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3 h-3" />
                                    )}
                                    生成回收方案
                                  </button>
                                </div>
                                {(foreshadow as any).payoffPlan ? (
                                  <div className="space-y-2 text-xs">
                                    <div className="p-2 rounded bg-[var(--cream)]">
                                      <p className="font-medium text-[var(--text-primary)] mb-1">建议时机</p>
                                      <p className="text-[var(--text-muted)]">{(foreshadow as any).payoffPlan.recommendedTiming}</p>
                                    </div>
                                    <div className="p-2 rounded bg-[var(--cream)]">
                                      <p className="font-medium text-[var(--text-primary)] mb-1">回收方式</p>
                                      <p className="text-[var(--text-muted)]">{(foreshadow as any).payoffPlan.approach}</p>
                                    </div>
                                    {(foreshadow as any).payoffPlan.scenes?.map((scene: any, i: number) => (
                                      <div key={i} className="p-2 rounded bg-[var(--cream)]">
                                        <p className="font-medium text-[var(--text-primary)] mb-1">{scene.chapterRange}</p>
                                        <p className="text-[var(--text-muted)]">{scene.sceneDescription}</p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-xs text-[var(--text-muted)]">点击「生成回收方案」获取 AI 建议</p>
                                )}
                              </div>
                              {/* AI Operations */}
                              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">AI 操作</p>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setStatusUpdating(foreshadow.id);
                                      try {
                                        const res = await fetch(`/api/projects/${projectId}/foreshadows/${foreshadow.id}/deepen`, { method: "POST" });
                                        if (res.ok) { fetchForeshadows(); }
                                      } catch {} finally { setStatusUpdating(null); }
                                    }}
                                  >
                                    <Sparkles className="w-3 h-3" /> 加深伏笔
                                  </button>
                                  <button
                                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setStatusUpdating(foreshadow.id);
                                      try {
                                        const res = await fetch(`/api/projects/${projectId}/foreshadows/${foreshadow.id}/mislead`, { method: "POST" });
                                        if (res.ok) {
                                          const data = await res.json();
                                          setForeshadows(prev => prev.map(f =>
                                            f.id === foreshadow.id ? { ...f, misleadResult: data } : f
                                          ));
                                        }
                                      } catch {} finally { setStatusUpdating(null); }
                                    }}
                                  >
                                    <Eye className="w-3 h-3" /> 误导读者
                                  </button>
                                  <button
                                    className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      setStatusUpdating(foreshadow.id);
                                      try {
                                        const res = await fetch(`/api/projects/${projectId}/foreshadows/${foreshadow.id}/postpone`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({}),
                                        });
                                        if (res.ok) { fetchForeshadows(); }
                                      } catch {} finally { setStatusUpdating(null); }
                                    }}
                                  >
                                    <Clock className="w-3 h-3" /> 推迟回收
                                  </button>
                                </div>
                                {(foreshadow as any).misleadResult && (
                                  <div className="mt-3 p-3 rounded bg-[var(--cream)] text-xs space-y-2">
                                    <p className="font-medium text-[var(--text-primary)]">误导方案</p>
                                    <p className="text-[var(--text-muted)]">假线索：{(foreshadow as any).misleadResult.falseClue}</p>
                                    <p className="text-[var(--text-muted)]">错误理解：{(foreshadow as any).misleadResult.falseInterpretation}</p>
                                    <p className="text-[var(--text-muted)]">揭示时机：{(foreshadow as any).misleadResult.revealTiming}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={() => setConfirmDialog({ ...confirmDialog, open: false, payoffPlan: null })}>
        <DialogContent className="bg-white border-[var(--border)] max-w-lg shadow-lg">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)] flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-[var(--danger)]" />
              确认{STATUS_CONFIG[confirmDialog.newStatus]?.label || confirmDialog.newStatus}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {confirmDialog.foreshadow && (
              <div className="p-3 rounded bg-[var(--bg)] border border-[var(--border)] mb-4">
                <p className="text-xs text-[var(--text-muted)] mb-1">伏笔内容</p>
                <p className="text-sm text-[var(--text-primary)]">{confirmDialog.foreshadow.clueText}</p>
              </div>
            )}

            {confirmDialog.newStatus === "DEPRECATED" && (
              <div className="p-3 rounded bg-[var(--danger-subtle)] border border-[var(--danger)] mb-4">
                <p className="text-xs text-[var(--danger)]">
                  此操作将废弃该伏笔，标记后将不会在后续章节中被追踪。请确保该伏笔已不再需要。
                </p>
              </div>
            )}

            {confirmDialog.newStatus === "FULL_PAYOFF" && (
              <div className="p-3 rounded bg-[var(--success-subtle)] border border-[var(--success)] mb-4">
                <p className="text-xs text-[var(--success)]">
                  恭喜！完全回收此伏笔后，系统将从待回收列表中移除它。
                </p>
              </div>
            )}

            {confirmDialog.newStatus === "PARTIAL_PAYOFF" && (
              <div className="p-3 rounded bg-[var(--warning-subtle)] border border-[var(--warning)] mb-4">
                <p className="text-xs text-[var(--warning)]">
                  部分回收后，伏笔状态将变为"部分回收"，剩余线索将继续追踪。
                </p>
              </div>
            )}

            {["PARTIAL_PAYOFF", "FULL_PAYOFF"].includes(confirmDialog.newStatus) && (
              <div className="mb-4">
                <button
                  onClick={generatePayoffPlan}
                  disabled={generatingPayoffPlan}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[var(--accent-subtle)] hover:bg-[var(--accent)]/20 rounded-lg transition-colors"
                >
                  {generatingPayoffPlan ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      生成回收方案...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      生成AI回收方案
                    </>
                  )}
                </button>
              </div>
            )}

            {confirmDialog.payoffPlan && (
              <div className="p-4 rounded bg-[var(--bg)] border border-[var(--border)] mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-[var(--accent)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">AI回收方案</span>
                </div>
                {confirmDialog.payoffPlan.timing && (
                  <div className="mb-2">
                    <p className="text-xs text-[var(--text-muted)]">推荐回收时机</p>
                    <p className="text-sm text-[var(--text-primary)]">{confirmDialog.payoffPlan.timing}</p>
                  </div>
                )}
                {confirmDialog.payoffPlan.method && (
                  <div className="mb-2">
                    <p className="text-xs text-[var(--text-muted)]">回收方式</p>
                    <p className="text-sm text-[var(--text-primary)]">{confirmDialog.payoffPlan.method}</p>
                  </div>
                )}
                {confirmDialog.payoffPlan.scene && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)]">建议场景</p>
                    <p className="text-sm text-[var(--text-primary)]">{confirmDialog.payoffPlan.scene}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ ...confirmDialog, open: false, payoffPlan: null })}
              className="paper-btn-ghost"
            >
              取消
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={statusUpdating === confirmDialog.foreshadowId}
              className={`${
                confirmDialog.newStatus === "DEPRECATED"
                  ? "bg-[var(--danger)] hover:bg-[var(--danger-hover)]"
                  : "paper-btn-primary"
              }`}
            >
              {statusUpdating === confirmDialog.foreshadowId && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              确认{STATUS_CONFIG[confirmDialog.newStatus]?.label || confirmDialog.newStatus}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
