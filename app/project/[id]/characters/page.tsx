"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  LayoutGrid,
  List,
  ChevronLeft,
  User,
  Search,
  MapPin,
  Target,
  Shield,
  Eye,
  MessageSquare,
  Zap,
  Heart,
  Swords,
  Skull,
  Users,
  Wrench,
  HelpCircle,
  ChevronRight,
  X,
  Loader2,
  BookOpen,
  Sparkles,
  Compass,
  TrendingUp,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RelationshipList } from "@/components/ai/relationship-list";

interface Character {
  id: string;
  name: string;
  aliases: unknown;
  roleType: string;
  desire: string | null;
  fear: string | null;
  wound: string | null;
  secret: string | null;
  moralBoundary: string | null;
  temptation: string | null;
  infoBoundary: string | null;
  decisionPreference: string | null;
  growthStage: string | null;
  speechPattern: string | null;
  currentGoal: string | null;
  currentLocation: string | null;
  currentStatus: string | null;
  powerLevel: string | null;
  firstSeenChapter: number | null;
  lastSeenChapter: number | null;
  sourceChapters: unknown;
  createdAt: string;
  updatedAt: string;
  _count?: {
    abilities: number;
    relationshipsA: number;
    relationshipsB: number;
  };
}

const ROLE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  主角: {
    label: "主角",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <Star className="w-3.5 h-3.5" />,
  },
  女主: {
    label: "女主",
    color: "text-pink-700",
    bg: "bg-pink-50 border-pink-200",
    icon: <Heart className="w-3.5 h-3.5" />,
  },
  导师: {
    label: "导师",
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: <Shield className="w-3.5 h-3.5" />,
  },
  反派: {
    label: "反派",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <Skull className="w-3.5 h-3.5" />,
  },
  盟友: {
    label: "盟友",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: <Users className="w-3.5 h-3.5" />,
  },
  工具人: {
    label: "工具人",
    color: "text-gray-600",
    bg: "bg-gray-100 border-gray-300",
    icon: <Wrench className="w-3.5 h-3.5" />,
  },
};

function Star({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const ROLE_TYPES = ["主角", "女主", "导师", "反派", "盟友", "工具人", "其他"];

function getRoleConfig(roleType: string) {
  return (
    ROLE_CONFIG[roleType] || {
      label: roleType,
      color: "text-gray-600",
      bg: "bg-gray-100 border-gray-300",
      icon: <HelpCircle className="w-3.5 h-3.5" />,
    }
  );
}

function getAliasesDisplay(aliases: unknown): string[] {
  if (!aliases) return [];
  if (Array.isArray(aliases)) return aliases as string[];
  if (typeof aliases === "string") {
    try {
      const parsed = JSON.parse(aliases);
      return Array.isArray(parsed) ? parsed : [aliases];
    } catch {
      return [aliases];
    }
  }
  return [];
}

function getChapterList(sourceChapters: unknown): number[] {
  if (!sourceChapters) return [];
  if (Array.isArray(sourceChapters)) return sourceChapters as number[];
  return [];
}

export default function CharactersPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null
  );
  const [characterDetail, setCharacterDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [newCharacter, setNewCharacter] = useState({
    name: "",
    aliases: "",
    roleType: "",
    desire: "",
    fear: "",
    wound: "",
    secret: "",
    moralBoundary: "",
    temptation: "",
    infoBoundary: "",
    decisionPreference: "",
    growthStage: "",
    speechPattern: "",
    currentGoal: "",
    currentLocation: "",
    currentStatus: "",
    powerLevel: "",
  });

  const fetchCharacters = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/projects/${projectId}/characters`);
      if (res.ok) {
        const data = await res.json();
        setCharacters(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  const filtered = characters.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const aliases = getAliasesDisplay(c.aliases);
    return (
      c.name.toLowerCase().includes(q) ||
      c.roleType.toLowerCase().includes(q) ||
      aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  const handleAdd = async () => {
    if (!newCharacter.name || !newCharacter.roleType) return;
    try {
      setAddLoading(true);
      const res = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCharacter.name,
          aliases: newCharacter.aliases
            ? newCharacter.aliases.split(",").map((s) => s.trim())
            : undefined,
          roleType: newCharacter.roleType,
          desire: newCharacter.desire || undefined,
          fear: newCharacter.fear || undefined,
          wound: newCharacter.wound || undefined,
          secret: newCharacter.secret || undefined,
          moralBoundary: newCharacter.moralBoundary || undefined,
          temptation: newCharacter.temptation || undefined,
          infoBoundary: newCharacter.infoBoundary || undefined,
          decisionPreference: newCharacter.decisionPreference || undefined,
          growthStage: newCharacter.growthStage || undefined,
          speechPattern: newCharacter.speechPattern || undefined,
          currentGoal: newCharacter.currentGoal || undefined,
          currentLocation: newCharacter.currentLocation || undefined,
          currentStatus: newCharacter.currentStatus || undefined,
          powerLevel: newCharacter.powerLevel || undefined,
        }),
      });
      if (res.ok) {
        setAddOpen(false);
        setNewCharacter({
          name: "",
          aliases: "",
          roleType: "",
          desire: "",
          fear: "",
          wound: "",
          secret: "",
          moralBoundary: "",
          temptation: "",
          infoBoundary: "",
          decisionPreference: "",
          growthStage: "",
          speechPattern: "",
          currentGoal: "",
          currentLocation: "",
          currentStatus: "",
          powerLevel: "",
        });
        fetchCharacters();
      }
    } catch {
    } finally {
      setAddLoading(false);
    }
  };

  const openDetail = async (character: Character) => {
    setSelectedCharacter(character);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/characters/${character.id}`);
      if (res.ok) {
        const data = await res.json();
        setCharacterDetail(data);
      }
    } catch {
    } finally {
      setDetailLoading(false);
    }
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
              <Users className="w-5 h-5 text-[var(--accent)]" />
              <h1 className="text-xl font-bold text-[var(--text-primary)]">人物库</h1>
              <Badge
                variant="secondary"
                className="bg-[var(--accent-subtle)] text-[var(--accent-text)] border-[var(--border)]"
              >
                {characters.length} 人
              </Badge>
            </div>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="paper-btn-primary">
                <Plus className="w-4 h-4 mr-2" />
                添加人物
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-[var(--border)] max-w-2xl max-h-[85vh] shadow-lg">
              <DialogHeader>
                <DialogTitle className="text-[var(--text-primary)]">添加新人物</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        姓名 <span className="text-[var(--danger)]">*</span>
                      </label>
                      <Input
                        value={newCharacter.name}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            name: e.target.value,
                          })
                        }
                        placeholder="角色姓名"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        角色类型 <span className="text-[var(--danger)]">*</span>
                      </label>
                      <Select
                        value={newCharacter.roleType}
                        onValueChange={(v) =>
                          setNewCharacter({ ...newCharacter, roleType: v })
                        }
                      >
                        <SelectTrigger className="paper-input">
                          <SelectValue placeholder="选择角色类型" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-[var(--border)]">
                          {ROLE_TYPES.map((r) => (
                            <SelectItem key={r} value={r}>
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      别名（逗号分隔）
                    </label>
                    <Input
                      value={newCharacter.aliases}
                      onChange={(e) =>
                        setNewCharacter({
                          ...newCharacter,
                          aliases: e.target.value,
                        })
                      }
                      placeholder="如: 张三, 老张, 张先生"
                      className="paper-input"
                    />
                  </div>
                  <Separator className="divider" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        欲望
                      </label>
                      <Input
                        value={newCharacter.desire}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            desire: e.target.value,
                          })
                        }
                        placeholder="角色最渴望什么"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        恐惧
                      </label>
                      <Input
                        value={newCharacter.fear}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            fear: e.target.value,
                          })
                        }
                        placeholder="角色最害怕什么"
                        className="paper-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        创伤
                      </label>
                      <Input
                        value={newCharacter.wound}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            wound: e.target.value,
                          })
                        }
                        placeholder="角色的内心创伤"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        秘密
                      </label>
                      <Input
                        value={newCharacter.secret}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            secret: e.target.value,
                          })
                        }
                        placeholder="角色隐藏的秘密"
                        className="paper-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      道德底线
                    </label>
                    <Input
                      value={newCharacter.moralBoundary}
                      onChange={(e) =>
                        setNewCharacter({
                          ...newCharacter,
                          moralBoundary: e.target.value,
                        })
                      }
                      placeholder="角色绝对不会做的事"
                      className="paper-input"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">诱惑</label>
                      <Input
                        value={newCharacter.temptation || ""}
                        onChange={(e) => setNewCharacter({ ...newCharacter, temptation: e.target.value })}
                        placeholder="角色难以抗拒的东西"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">信息边界</label>
                      <Input
                        value={newCharacter.infoBoundary || ""}
                        onChange={(e) => setNewCharacter({ ...newCharacter, infoBoundary: e.target.value })}
                        placeholder="角色知道/不知道的信息"
                        className="paper-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">决策偏好</label>
                      <Input
                        value={newCharacter.decisionPreference || ""}
                        onChange={(e) => setNewCharacter({ ...newCharacter, decisionPreference: e.target.value })}
                        placeholder="面对选择时的倾向"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">成长阶段</label>
                      <Input
                        value={newCharacter.growthStage || ""}
                        onChange={(e) => setNewCharacter({ ...newCharacter, growthStage: e.target.value })}
                        placeholder="当前处于哪个成长阶段"
                        className="paper-input"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-[var(--text-secondary)]">
                      说话方式
                    </label>
                    <Textarea
                      value={newCharacter.speechPattern}
                      onChange={(e) =>
                        setNewCharacter({
                          ...newCharacter,
                          speechPattern: e.target.value,
                        })
                      }
                      placeholder="描述角色的语言风格"
                      className="paper-input min-h-[60px]"
                    />
                  </div>
                  <Separator className="divider" />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        当前目标
                      </label>
                      <Input
                        value={newCharacter.currentGoal}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            currentGoal: e.target.value,
                          })
                        }
                        placeholder="角色当前追求的目标"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        当前位置
                      </label>
                      <Input
                        value={newCharacter.currentLocation}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            currentLocation: e.target.value,
                          })
                        }
                        placeholder="角色当前所在"
                        className="paper-input"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        当前状态
                      </label>
                      <Input
                        value={newCharacter.currentStatus}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            currentStatus: e.target.value,
                          })
                        }
                        placeholder="如: 受伤、觉醒、逃亡"
                        className="paper-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-[var(--text-secondary)]">
                        实力等级
                      </label>
                      <Input
                        value={newCharacter.powerLevel}
                        onChange={(e) =>
                          setNewCharacter({
                            ...newCharacter,
                            powerLevel: e.target.value,
                          })
                        }
                        placeholder="如: 凡人、灵师、圣者"
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
                  disabled={!newCharacter.name || !newCharacter.roleType || addLoading}
                  className="paper-btn-primary"
                >
                  {addLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  创建人物
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
              placeholder="搜索人物名称或别名..."
              className="pl-10 paper-input"
            />
          </div>
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as "card" | "table")}
          >
            <TabsList className="bg-white border border-[var(--border)] shadow-sm">
              <TabsTrigger
                value="card"
                className="data-[state=active]:bg-[var(--accent-subtle)] data-[state=active]:text-[var(--accent-text)]"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                卡片
              </TabsTrigger>
              <TabsTrigger
                value="table"
                className="data-[state=active]:bg-[var(--accent-subtle)] data-[state=active]:text-[var(--accent-text)]"
              >
                <List className="w-4 h-4 mr-1.5" />
                列表
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-24 h-24 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center mb-6">
              <User className="w-10 h-10 text-[var(--text-muted)]" />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
              {searchQuery ? "未找到匹配的人物" : "还没有人物"}
            </p>
            <p className="text-sm text-[var(--text-muted)] max-w-xs text-center">
              {searchQuery
                ? "尝试更换搜索关键词，或检查人物名称和别名"
                : "点击右上角「添加人物」开始创建你的角色库"}
            </p>
          </div>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((character) => {
              const role = getRoleConfig(character.roleType);
              return (
                <div
                  key={character.id}
                  className="paper-card hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                  onClick={() => openDetail(character)}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] font-bold text-sm">
                          {character.name.slice(0, 1)}
                        </div>
                        <div>
                          <h3 className="font-semibold text-base text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                            {character.name}
                          </h3>
                          {getAliasesDisplay(character.aliases).length > 0 && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">
                              {getAliasesDisplay(character.aliases).join(" / ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${role.bg} ${role.color} border text-xs flex items-center gap-1`}
                      >
                        {role.icon}
                        {role.label}
                      </Badge>
                    </div>

                    {character.currentStatus && (
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="text-sm text-[var(--text-secondary)]">
                          {character.currentStatus}
                        </span>
                      </div>
                    )}

                    {character.desire && (
                      <div className="flex items-start gap-2 mb-2">
                        <Target className="w-3.5 h-3.5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                        <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                          {character.desire}
                        </p>
                      </div>
                    )}

                    {character.lastSeenChapter && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--border-subtle)]">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">
                          最后出场：第 {character.lastSeenChapter} 章
                        </span>
                      </div>
                    )}

                    {character._count && (
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-[var(--text-muted)]">
                          关系 {character._count.relationshipsA + character._count.relationshipsB}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          能力 {character._count.abilities}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[var(--border)] rounded-lg overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    名称
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    角色
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    状态
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    目标
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    最后出场
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((character, index) => {
                  const role = getRoleConfig(character.roleType);
                  return (
                    <tr
                      key={character.id}
                      className={`border-b border-[var(--border-subtle)] cursor-pointer transition-colors ${
                        index % 2 === 0 ? "bg-[var(--bg)]" : "bg-white"
                      } hover:bg-[var(--accent-subtle)]`}
                      onClick={() => openDetail(character)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] font-bold text-xs">
                            {character.name.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-medium text-sm text-[var(--text-primary)]">
                              {character.name}
                            </span>
                            {getAliasesDisplay(character.aliases).length > 0 && (
                              <p className="text-xs text-[var(--text-muted)]">
                                {getAliasesDisplay(character.aliases).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge
                          variant="outline"
                          className={`${role.bg} ${role.color} border text-xs`}
                        >
                          {role.label}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {character.currentStatus || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[var(--text-secondary)] line-clamp-1 max-w-[200px]">
                          {character.desire || "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {character.lastSeenChapter
                            ? `第 ${character.lastSeenChapter} 章`
                            : "-"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetail(character);
                          }}
                        >
                          详情
                          <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-white border-[var(--border)] max-w-2xl max-h-[85vh] shadow-lg">
          {selectedCharacter && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--accent-subtle)] flex items-center justify-center text-[var(--accent)] font-bold">
                    {selectedCharacter.name.slice(0, 1)}
                  </div>
                  <div>
                    <DialogTitle className="text-lg text-[var(--text-primary)]">
                      {selectedCharacter.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`${getRoleConfig(selectedCharacter.roleType).bg} ${getRoleConfig(selectedCharacter.roleType).color} border text-xs`}
                      >
                        {getRoleConfig(selectedCharacter.roleType).icon}
                        {getRoleConfig(selectedCharacter.roleType).label}
                      </Badge>
                      {selectedCharacter.powerLevel && (
                        <Badge
                          variant="outline"
                          className="border-[var(--border)] text-xs text-[var(--text-secondary)]"
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          {selectedCharacter.powerLevel}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <ScrollArea className="max-h-[65vh] pr-4">
                <div className="space-y-5 py-2">
                  {getAliasesDisplay(selectedCharacter.aliases).length > 0 && (
                    <div>
                      <p className="text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
                        别名
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getAliasesDisplay(selectedCharacter.aliases).map(
                          (alias, i) => (
                            <Badge
                              key={i}
                              variant="secondary"
                              className="bg-[var(--bg)] text-[var(--text-secondary)] border-[var(--border-subtle)]"
                            >
                              {alias}
                            </Badge>
                          )
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    {selectedCharacter.desire && (
                      <DetailField
                        icon={<Target className="w-4 h-4 text-[var(--success)]" />}
                        label="欲望"
                        value={selectedCharacter.desire}
                      />
                    )}
                    {selectedCharacter.fear && (
                      <DetailField
                        icon={<Skull className="w-4 h-4 text-[var(--danger)]" />}
                        label="恐惧"
                        value={selectedCharacter.fear}
                      />
                    )}
                    {selectedCharacter.wound && (
                      <DetailField
                        icon={<Heart className="w-4 h-4 text-[var(--warning)]" />}
                        label="创伤"
                        value={selectedCharacter.wound}
                      />
                    )}
                    {selectedCharacter.secret && (
                      <DetailField
                        icon={<Eye className="w-4 h-4 text-purple-600" />}
                        label="秘密"
                        value={selectedCharacter.secret}
                      />
                    )}
                  </div>

                  {selectedCharacter.moralBoundary && (
                    <DetailField
                      icon={<Shield className="w-4 h-4 text-[var(--success)]" />}
                      label="道德底线"
                      value={selectedCharacter.moralBoundary}
                    />
                  )}

                  {selectedCharacter.temptation && (
                    <DetailField
                      icon={<Target className="w-4 h-4 text-[var(--danger)]" />}
                      label="诱惑"
                      value={selectedCharacter.temptation}
                    />
                  )}

                  {selectedCharacter.infoBoundary && (
                    <DetailField
                      icon={<Eye className="w-4 h-4 text-[var(--text-muted)]" />}
                      label="信息边界"
                      value={selectedCharacter.infoBoundary}
                    />
                  )}

                  {selectedCharacter.decisionPreference && (
                    <DetailField
                      icon={<Compass className="w-4 h-4 text-[var(--accent)]" />}
                      label="决策偏好"
                      value={selectedCharacter.decisionPreference}
                    />
                  )}

                  {selectedCharacter.growthStage && (
                    <DetailField
                      icon={<TrendingUp className="w-4 h-4 text-[var(--success)]" />}
                      label="成长阶段"
                      value={selectedCharacter.growthStage}
                    />
                  )}

                  {selectedCharacter.speechPattern && (
                    <DetailField
                      icon={
                        <MessageSquare className="w-4 h-4 text-[var(--warning)]" />
                      }
                      label="说话方式"
                      value={selectedCharacter.speechPattern}
                    />
                  )}

                  <Separator className="divider" />

                  <div className="grid grid-cols-2 gap-4">
                    {selectedCharacter.currentGoal && (
                      <DetailField
                        icon={<Target className="w-4 h-4 text-[var(--accent)]" />}
                        label="当前目标"
                        value={selectedCharacter.currentGoal}
                      />
                    )}
                    {selectedCharacter.currentLocation && (
                      <DetailField
                        icon={<MapPin className="w-4 h-4 text-[var(--accent)]" />}
                        label="当前位置"
                        value={selectedCharacter.currentLocation}
                      />
                    )}
                    {selectedCharacter.currentStatus && (
                      <DetailField
                        icon={<Eye className="w-4 h-4 text-[var(--accent)]" />}
                        label="当前状态"
                        value={selectedCharacter.currentStatus}
                      />
                    )}
                  </div>

                  {getChapterList(selectedCharacter.sourceChapters).length >
                    0 && (
                    <>
                      <Separator className="divider" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                          出场章节
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {getChapterList(
                            selectedCharacter.sourceChapters
                          ).map((ch) => (
                            <Badge
                              key={ch}
                              variant="secondary"
                              className="bg-[var(--bg)] text-[var(--text-secondary)] text-xs font-mono border-[var(--border-subtle)]"
                            >
                              Ch.{ch}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator className="divider" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
                        一致性检测
                      </p>
                      <button
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                        onClick={async () => {
                          if (!selectedCharacter) return;
                          setDetailLoading(true);
                          try {
                            const res = await fetch(`/api/projects/${projectId}/characters/${selectedCharacter.id}/drift`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({}),
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setCharacterDetail((prev: any) => ({ ...prev, driftResult: data }));
                            }
                          } catch {} finally { setDetailLoading(false); }
                        }}
                      >
                        <Sparkles className="w-3 h-3" /> 检测漂移
                      </button>
                    </div>
                    {characterDetail?.driftResult ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: characterDetail.driftResult.averageConsistencyScore >= 80 ? "var(--forest)" + "15" : characterDetail.driftResult.averageConsistencyScore >= 60 ? "var(--ochre)" + "15" : "var(--rose)" + "15" }}>
                          <span className="text-2xl font-bold" style={{ color: characterDetail.driftResult.averageConsistencyScore >= 80 ? "var(--forest)" : characterDetail.driftResult.averageConsistencyScore >= 60 ? "var(--ochre)" : "var(--rose)" }}>
                            {characterDetail.driftResult.averageConsistencyScore}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">一致性评分</p>
                            <p className="text-xs text-[var(--text-muted)]">{characterDetail.driftResult.totalDriftPoints} 个偏离点</p>
                          </div>
                        </div>
                        {characterDetail.driftResult.driftPoints?.slice(0, 5).map((dp: any, i: number) => (
                          <div key={i} className="p-3 rounded-lg border" style={{ borderColor: dp.severity === "red" ? "var(--rose)" : dp.severity === "yellow" ? "var(--ochre)" : "var(--border-faint)", background: dp.severity === "red" ? "var(--rose)10" : dp.severity === "yellow" ? "var(--ochre)10" : "var(--surface)" }}>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]" style={{ borderColor: dp.severity === "red" ? "var(--rose)" : dp.severity === "yellow" ? "var(--ochre)" : "var(--forest)", color: dp.severity === "red" ? "var(--rose)" : dp.severity === "yellow" ? "var(--ochre)" : "var(--forest)" }}>
                                {dp.severity === "red" ? "严重" : dp.severity === "yellow" ? "中等" : "轻微"}
                              </Badge>
                              <span className="text-xs text-[var(--text-muted)]">Ch.{dp.chapterNumber}</span>
                            </div>
                            <p className="text-xs text-[var(--text-primary)] font-medium mb-1">{dp.field}</p>
                            <p className="text-xs text-[var(--text-muted)]">预期：{dp.expected}</p>
                            <p className="text-xs text-[var(--text-muted)]">实际：{dp.actual}</p>
                            {dp.suggestion && <p className="text-xs text-[var(--accent)] mt-1">建议：{dp.suggestion}</p>}
                          </div>
                        ))}
                        {characterDetail.driftResult.positiveGrowth?.length > 0 && (
                          <div>
                            <p className="text-xs text-[var(--forest)] mb-1">合理成长</p>
                            {characterDetail.driftResult.positiveGrowth.map((g: string, i: number) => (
                              <p key={i} className="text-xs text-[var(--text-muted)]">• {g}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-2">点击「检测漂移」分析角色在最近章节中的一致性</p>
                    )}
                  </div>

                  <Separator className="divider" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                      AI 工具
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]"
                        onClick={async () => {
                          if (!selectedCharacter) return;
                          setDetailLoading(true);
                          try {
                            const res = await fetch(`/api/projects/${projectId}/characters/${selectedCharacter.id}/generate-arc`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setCharacterDetail((prev: any) => ({ ...prev, arcSuggestion: data }));
                            }
                          } catch {} finally { setDetailLoading(false); }
                        }}
                      >
                        <Sparkles className="w-3 h-3" /> 生成弧线
                      </button>
                      <button
                        className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 px-2 py-1 rounded border border-[var(--accent)]"
                        onClick={async () => {
                          if (!selectedCharacter) return;
                          setDetailLoading(true);
                          try {
                            const res = await fetch(`/api/projects/${projectId}/characters/${selectedCharacter.id}/generate-dialogue`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                            });
                            if (res.ok) {
                              const data = await res.json();
                              setCharacterDetail((prev: any) => ({ ...prev, dialogueSample: data }));
                            }
                          } catch {} finally { setDetailLoading(false); }
                        }}
                      >
                        <MessageSquare className="w-3 h-3" /> 生成对白
                      </button>
                    </div>
                    {characterDetail?.arcSuggestion && (
                      <div className="mt-2 p-3 rounded-lg bg-[var(--cream)] text-xs space-y-2">
                        <p className="font-medium text-[var(--text-primary)]">弧线建议</p>
                        <p className="text-[var(--text-muted)]">{characterDetail.arcSuggestion.suggestion || JSON.stringify(characterDetail.arcSuggestion)}</p>
                      </div>
                    )}
                    {characterDetail?.dialogueSample && (
                      <div className="mt-2 p-3 rounded-lg bg-[var(--cream)] text-xs space-y-2">
                        <p className="font-medium text-[var(--text-primary)]">专属对白示例</p>
                        <p className="text-[var(--text-muted)] whitespace-pre-line">{characterDetail.dialogueSample.sample || JSON.stringify(characterDetail.dialogueSample)}</p>
                      </div>
                    )}
                  </div>

                  {/* Arc Visualization */}
                  {getChapterList(selectedCharacter.sourceChapters).length > 0 && (
                    <>
                      <Separator className="divider" />
                      <div>
                        <p className="text-xs text-[var(--text-muted)] mb-3 uppercase tracking-wider">
                          人物弧线
                        </p>
                        <div className="relative pl-4">
                          <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-[var(--border-subtle)]" />
                          {getChapterList(selectedCharacter.sourceChapters).slice(0, 8).map((ch, i) => (
                            <div key={ch} className="relative mb-3 last:mb-0">
                              <div className="absolute -left-4 top-1 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border-2 border-white" />
                              <div className="pl-2">
                                <span className="text-xs font-mono text-[var(--text-muted)]">Ch.{ch}</span>
                                {i === 0 && <span className="text-xs text-[var(--accent)] ml-2">初次登场</span>}
                                {i === getChapterList(selectedCharacter.sourceChapters).slice(0, 8).length - 1 && i > 0 && <span className="text-xs text-[var(--text-muted)] ml-2">最近出场</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedCharacter.currentGoal && (
                          <div className="mt-3 p-2 rounded bg-[var(--cream)]">
                            <p className="text-xs text-[var(--text-muted)]">当前目标</p>
                            <p className="text-xs text-[var(--text-primary)]">{selectedCharacter.currentGoal}</p>
                          </div>
                        )}
                        {characterDetail?.arcSuggestion && (
                          <div className="mt-2 p-2 rounded bg-[var(--cream)]">
                            <p className="text-xs text-[var(--text-muted)]">弧线建议</p>
                            <p className="text-xs text-[var(--text-primary)]">{characterDetail.arcSuggestion.currentStage || ""}</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <Separator className="divider" />
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                      人物关系
                    </p>
                    {detailLoading ? (
                      <div className="flex items-center gap-2 py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--text-muted)]" />
                        <span className="text-xs text-[var(--text-muted)]">加载中...</span>
                      </div>
                    ) : characterDetail?.relationshipsA?.length > 0 || characterDetail?.relationshipsB?.length > 0 ? (
                      <RelationshipList
                        relationships={[
                          ...(characterDetail?.relationshipsA || []).map((r: any) => ({
                            relationType: r.relationType,
                            description: r.description,
                            targetName: r.characterB?.name || "未知",
                            status: r.status,
                          })),
                          ...(characterDetail?.relationshipsB || []).map((r: any) => ({
                            relationType: r.relationType,
                            description: r.description,
                            targetName: r.characterA?.name || "未知",
                            status: r.status,
                          })),
                        ]}
                      />
                    ) : (
                      <p className="text-xs text-[var(--text-muted)] py-2">暂无关系数据</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailField({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-[var(--text-muted)]">{label}</span>
      </div>
      <p className="text-sm text-[var(--text-primary)]">{value}</p>
    </div>
  );
}
