"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  ChevronLeft,
  Save,
  Pencil,
  X,
  Dna,
  Users,
  UserCircle,
  Globe,
  Building2,
  Zap,
  MapPin,
  Package,
  Ban,
  Palette,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react";

interface DnaData {
  genre: string;
  subGenre: string;
  targetPlatform: string;
  targetWords: number;
  updateRhythm: string;
  coreHook: string;
  protagonistTheme: string;
  finalEmotion: string;
  mainlineQuestion: string;
  worldKeywords: string;
  pleasureMechanism: string;
  emotionMechanism: string;
  forbiddenRules: any;
  styleDirection: string;
  targetReaderProfile: string;
  readerPromises: any;
}

interface Character {
  id: string;
  name: string;
  aliases: any;
  roleType: string;
  desire: string | null;
  fear: string | null;
  wound: string | null;
  secret: string | null;
  moralBoundary: string | null;
  speechPattern: string | null;
  currentGoal: string | null;
  currentLocation: string | null;
  currentStatus: string | null;
  powerLevel: string | null;
  firstSeenChapter: number | null;
  lastSeenChapter: number | null;
}

interface WorldRule {
  id: string;
  category: string;
  content: string;
  status: string;
  sourceChapter: number | null;
}

interface Organization {
  id: string;
  name: string;
  description: string | null;
  members: any;
  firstSeenChapter: number | null;
}

interface Ability {
  id: string;
  name: string;
  description: string | null;
  limitations: string | null;
  ownerCharacterId: string | null;
  firstSeenChapter: number | null;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
  firstSeenChapter: number | null;
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  abilities: string | null;
  firstSeenChapter: number | null;
}

interface StyleData {
  narrativePOV: string;
  narrativeDistance: string;
  avgSentenceLength: number;
  dialogueRatio: number;
  psychologicalRatio: number;
  actionRatio: number;
  environmentRatio: number;
  infoDensity: number;
  emotionExposure: number;
  humorLevel: number;
  rhetoricSystem: any;
  commonWords: any;
  bannedWords: any;
  chapterEndStyle: string;
  battleStyle: string;
  romanceStyle: string;
  mysteryStyle: string;
}

const DNA_FIELDS: { key: keyof DnaData; label: string; type: "input" | "textarea" | "number" }[] = [
  { key: "genre", label: "类型", type: "input" },
  { key: "subGenre", label: "子类型", type: "input" },
  { key: "targetPlatform", label: "目标平台", type: "input" },
  { key: "targetWords", label: "目标字数", type: "number" },
  { key: "updateRhythm", label: "更新节奏", type: "input" },
  { key: "coreHook", label: "核心钩子", type: "textarea" },
  { key: "protagonistTheme", label: "主角主题", type: "textarea" },
  { key: "finalEmotion", label: "终局情感", type: "textarea" },
  { key: "mainlineQuestion", label: "主线悬念", type: "textarea" },
  { key: "worldKeywords", label: "世界观关键词", type: "input" },
  { key: "pleasureMechanism", label: "爽感机制", type: "textarea" },
  { key: "emotionMechanism", label: "情感机制", type: "textarea" },
  { key: "styleDirection", label: "风格方向", type: "textarea" },
  { key: "targetReaderProfile", label: "目标读者画像", type: "textarea" },
];

const STYLE_FIELDS: { key: keyof StyleData; label: string; type: "input" | "textarea" }[] = [
  { key: "narrativePOV", label: "叙事视角", type: "input" },
  { key: "narrativeDistance", label: "叙事距离", type: "input" },
  { key: "chapterEndStyle", label: "章节结尾风格", type: "textarea" },
  { key: "battleStyle", label: "战斗风格", type: "textarea" },
  { key: "romanceStyle", label: "感情风格", type: "textarea" },
  { key: "mysteryStyle", label: "悬疑风格", type: "textarea" },
];

const STYLE_SLIDERS: { key: keyof StyleData; label: string }[] = [
  { key: "avgSentenceLength", label: "平均句长" },
  { key: "dialogueRatio", label: "对白比例" },
  { key: "psychologicalRatio", label: "心理描写" },
  { key: "actionRatio", label: "动作比例" },
  { key: "environmentRatio", label: "环境描写" },
  { key: "infoDensity", label: "信息密度" },
  { key: "emotionExposure", label: "情感浓度" },
  { key: "humorLevel", label: "幽默程度" },
];

function formatList(v: any): string {
  if (!v) return "无";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "string") return v;
  return JSON.stringify(v);
}

function SectionHeader({
  title,
  count,
  editing,
  onEdit,
  onSave,
  onCancel,
  saving,
}: {
  title: string;
  count?: number;
  editing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {count !== undefined && (
          <p className="text-sm text-muted-foreground mt-0.5">{count} 项</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="mr-1.5 h-4 w-4" />
              取消
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {saving ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              保存
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            编辑
          </Button>
        )}
      </div>
    </div>
  );
}

function ExpandableCard({
  title,
  subtitle,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="border-zinc-800 bg-card overflow-hidden">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-zinc-900/50 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      {open && (
        <>
          <Separator className="bg-zinc-800" />
          <div className="p-4">{children}</div>
        </>
      )}
    </Card>
  );
}

export default function BiblePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const projectId = params.id as string;

  const [activeTab, setActiveTab] = useState("dna");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dna, setDna] = useState<DnaData | null>(null);
  const [dnaEdit, setDnaEdit] = useState<DnaData | null>(null);
  const [dnaEditing, setDnaEditing] = useState(false);

  const [characters, setCharacters] = useState<Character[]>([]);
  const [foreshadows, setForeshadows] = useState<any[]>([]);
  const [worldRules, setWorldRules] = useState<WorldRule[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [abilities, setAbilities] = useState<Ability[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  const [style, setStyle] = useState<StyleData | null>(null);
  const [styleEdit, setStyleEdit] = useState<StyleData | null>(null);
  const [styleEditing, setStyleEditing] = useState(false);

  // CRUD dialog states
  const [addDialogOpen, setAddDialogOpen] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [newOrg, setNewOrg] = useState({ name: "", description: "", members: "" });
  const [newAbility, setNewAbility] = useState({ name: "", description: "", limitations: "" });
  const [newLocation, setNewLocation] = useState({ name: "", description: "" });
  const [newItem, setNewItem] = useState({ name: "", description: "", abilities: "" });
  const [newWorldRule, setNewWorldRule] = useState({ category: "world", content: "" });

  const fetchDna = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/dna`);
    if (r.ok) {
      const d = await r.json();
      setDna(d);
      setDnaEdit(d);
    }
  }, [projectId]);

  const fetchStyle = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/style`);
    if (r.ok) {
      const s = await r.json();
      setStyle(s);
      setStyleEdit(s);
    }
  }, [projectId]);

  const fetchCharacters = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/characters`);
    if (r.ok) setCharacters(await r.json());
  }, [projectId]);

  const fetchForeshadows = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/foreshadows`);
    if (r.ok) setForeshadows(await r.json());
  }, [projectId]);

  const fetchWorldRules = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/world-rules`);
    if (r.ok) setWorldRules(await r.json());
  }, [projectId]);

  const fetchOrganizations = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/organizations`);
    if (r.ok) setOrganizations(await r.json());
  }, [projectId]);

  const fetchAbilities = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/abilities`);
    if (r.ok) setAbilities(await r.json());
  }, [projectId]);

  const fetchLocations = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/locations`);
    if (r.ok) setLocations(await r.json());
  }, [projectId]);

  const fetchItems = useCallback(async () => {
    const r = await fetch(`/api/projects/${projectId}/items`);
    if (r.ok) setItems(await r.json());
  }, [projectId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchDna(),
      fetchStyle(),
      fetchCharacters(),
      fetchForeshadows(),
      fetchWorldRules(),
      fetchOrganizations(),
      fetchAbilities(),
      fetchLocations(),
      fetchItems(),
    ]);
    setLoading(false);
  }, [fetchDna, fetchStyle, fetchCharacters, fetchForeshadows, fetchWorldRules, fetchOrganizations, fetchAbilities, fetchLocations, fetchItems]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSaveDna = async () => {
    if (!dnaEdit) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/dna`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dnaEdit),
      });
      if (!r.ok) throw new Error("保存失败");
      const d = await r.json();
      setDna(d);
      setDnaEdit(d);
      setDnaEditing(false);
      toast({ title: "DNA 已保存" });
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message, variant: "destructive" } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStyle = async () => {
    if (!styleEdit) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/style`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(styleEdit),
      });
      if (!r.ok) throw new Error("保存失败");
      const s = await r.json();
      setStyle(s);
      setStyleEdit(s);
      setStyleEditing(false);
      toast({ title: "风格指纹已保存" });
    } catch (err: any) {
      toast({ title: "保存失败", description: err.message, variant: "destructive" } as any);
    } finally {
      setSaving(false);
    }
  };

  const handleAddEntity = async (type: string) => {
    setAddLoading(true);
    try {
      let body: any = {};
      let endpoint = "";
      switch (type) {
        case "world-rules":
          body = newWorldRule;
          endpoint = `/api/projects/${projectId}/world-rules`;
          break;
        case "organizations":
          body = { ...newOrg, members: newOrg.members ? newOrg.members.split(",").map(s => s.trim()) : [] };
          endpoint = `/api/projects/${projectId}/organizations`;
          break;
        case "abilities":
          body = newAbility;
          endpoint = `/api/projects/${projectId}/abilities`;
          break;
        case "locations":
          body = newLocation;
          endpoint = `/api/projects/${projectId}/locations`;
          break;
        case "items":
          body = newItem;
          endpoint = `/api/projects/${projectId}/items`;
          break;
      }
      const r = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("创建失败");
      setAddDialogOpen(null);
      setNewOrg({ name: "", description: "", members: "" });
      setNewAbility({ name: "", description: "", limitations: "" });
      setNewLocation({ name: "", description: "" });
      setNewItem({ name: "", description: "", abilities: "" });
      setNewWorldRule({ category: "world", content: "" });
      // Refetch
      switch (type) {
        case "world-rules": await fetchWorldRules(); break;
        case "organizations": await fetchOrganizations(); break;
        case "abilities": await fetchAbilities(); break;
        case "locations": await fetchLocations(); break;
        case "items": await fetchItems(); break;
      }
      toast({ title: "创建成功" });
    } catch (err: any) {
      toast({ title: "创建失败", description: err.message, variant: "destructive" } as any);
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteEntity = async (type: string, id: string) => {
    try {
      const r = await fetch(`/api/projects/${projectId}/${type}/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("删除失败");
      switch (type) {
        case "world-rules": await fetchWorldRules(); break;
        case "organizations": await fetchOrganizations(); break;
        case "abilities": await fetchAbilities(); break;
        case "locations": await fetchLocations(); break;
        case "items": await fetchItems(); break;
      }
      toast({ title: "已删除" });
    } catch (err: any) {
      toast({ title: "删除失败", description: err.message, variant: "destructive" } as any);
    }
  };

  const protagonist = characters.find(
    (c) => c.roleType === "protagonist" || c.roleType === "main"
  );

  const roleTypeLabel: Record<string, string> = {
    protagonist: "主角",
    main: "主角",
    antagonist: "反派",
    supporting: "配角",
    minor: "次要",
    mentor: "导师",
    love_interest: "感情线",
  };

  const ruleCategoryLabel: Record<string, string> = {
    magic: "力量体系",
    world: "世界规则",
    social: "社会规则",
    tech: "科技规则",
    biology: "生物规则",
    physics: "物理规则",
    culture: "文化规则",
    history: "历史规则",
  };

  const forbiddenRules: string[] = Array.isArray(dna?.forbiddenRules)
    ? dna.forbiddenRules
    : typeof dna?.forbiddenRules === "string"
    ? [dna.forbiddenRules]
    : [];

  const ruleGroups = worldRules.reduce<Record<string, WorldRule[]>>((acc, r) => {
    (acc[r.category] = acc[r.category] || []).push(r);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/project/${projectId}`)}
            className="text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            返回驾驶舱
          </Button>
          <Separator orientation="vertical" className="h-5 bg-zinc-700" />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            作品设定
          </h1>
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary"
          >
            Bible
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-10 items-center gap-1 rounded-lg bg-zinc-900 p-1 mb-6">
              <TabsTrigger value="dna" className="gap-1.5 text-xs">
                <Dna className="h-3.5 w-3.5" />
                DNA
              </TabsTrigger>
              <TabsTrigger value="protagonist" className="gap-1.5 text-xs">
                <UserCircle className="h-3.5 w-3.5" />
                主角
              </TabsTrigger>
              <TabsTrigger value="characters" className="gap-1.5 text-xs">
                <Users className="h-3.5 w-3.5" />
                角色
              </TabsTrigger>
              <TabsTrigger value="world" className="gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" />
                世界观
              </TabsTrigger>
              <TabsTrigger value="organizations" className="gap-1.5 text-xs">
                <Building2 className="h-3.5 w-3.5" />
                组织
              </TabsTrigger>
              <TabsTrigger value="abilities" className="gap-1.5 text-xs">
                <Zap className="h-3.5 w-3.5" />
                能力
              </TabsTrigger>
              <TabsTrigger value="locations" className="gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5" />
                地点
              </TabsTrigger>
              <TabsTrigger value="items" className="gap-1.5 text-xs">
                <Package className="h-3.5 w-3.5" />
                道具
              </TabsTrigger>
              <TabsTrigger value="forbidden" className="gap-1.5 text-xs">
                <Ban className="h-3.5 w-3.5" />
                禁忌
              </TabsTrigger>
              <TabsTrigger value="style" className="gap-1.5 text-xs">
                <Palette className="h-3.5 w-3.5" />
                风格
              </TabsTrigger>
            </TabsList>
          </ScrollArea>

          <TabsContent value="dna">
            <SectionHeader
              title="BookDNA"
              editing={dnaEditing}
              saving={saving}
              onEdit={() => {
                setDnaEdit(dna);
                setDnaEditing(true);
              }}
              onSave={handleSaveDna}
              onCancel={() => {
                setDnaEdit(dna);
                setDnaEditing(false);
              }}
            />
            {dnaEditing && dnaEdit ? (
              <div className="grid grid-cols-2 gap-4">
                {DNA_FIELDS.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">
                      {field.label}
                    </label>
                    {field.type === "textarea" ? (
                      <Textarea
                        value={(dnaEdit[field.key] as string) || ""}
                        onChange={(e) =>
                          setDnaEdit({ ...dnaEdit, [field.key]: e.target.value })
                        }
                        className="min-h-[80px] bg-zinc-900 border-zinc-800 text-foreground resize-y"
                      />
                    ) : field.type === "number" ? (
                      <Input
                        type="number"
                        value={dnaEdit[field.key] || 0}
                        onChange={(e) =>
                          setDnaEdit({
                            ...dnaEdit,
                            [field.key]: parseInt(e.target.value) || 0,
                          })
                        }
                        className="bg-zinc-900 border-zinc-800 text-foreground"
                      />
                    ) : (
                      <Input
                        value={(dnaEdit[field.key] as string) || ""}
                        onChange={(e) =>
                          setDnaEdit({ ...dnaEdit, [field.key]: e.target.value })
                        }
                        className="bg-zinc-900 border-zinc-800 text-foreground"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : dna ? (
              <div className="grid grid-cols-2 gap-4">
                {DNA_FIELDS.map((field) => (
                  <Card key={field.key} className="border-zinc-800 bg-card">
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-1">
                        {field.label}
                      </p>
                      <p className="text-sm text-foreground leading-relaxed">
                        {(dna[field.key] as string) || "未设定"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">尚未创建 BookDNA</p>
            )}
          </TabsContent>

          <TabsContent value="protagonist">
            {protagonist ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <UserCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {protagonist.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {roleTypeLabel[protagonist.roleType] || protagonist.roleType}
                      {protagonist.powerLevel && ` · ${protagonist.powerLevel}`}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "欲望", value: protagonist.desire },
                    { label: "恐惧", value: protagonist.fear },
                    { label: "创伤", value: protagonist.wound },
                    { label: "秘密", value: protagonist.secret },
                    { label: "道德边界", value: protagonist.moralBoundary },
                    { label: "语言模式", value: protagonist.speechPattern },
                    { label: "当前目标", value: protagonist.currentGoal },
                    { label: "当前位置", value: protagonist.currentLocation },
                    { label: "当前状态", value: protagonist.currentStatus },
                  ].map((item) => (
                    <Card key={item.label} className="border-zinc-800 bg-card">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          {item.label}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {item.value || "未设定"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <UserCircle className="h-12 w-12 text-zinc-600" />
                <p className="text-muted-foreground">尚未设定主角信息</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="characters">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-foreground">角色列表</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {characters.length} 个角色
              </p>
            </div>
            <div className="space-y-3">
              {characters.map((char) => (
                <ExpandableCard
                  key={char.id}
                  title={char.name}
                  subtitle={`${roleTypeLabel[char.roleType] || char.roleType}${
                    char.powerLevel ? ` · ${char.powerLevel}` : ""
                  }${char.currentLocation ? ` · ${char.currentLocation}` : ""}`}
                >
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "别名", value: formatList(char.aliases) },
                      { label: "欲望", value: char.desire },
                      { label: "恐惧", value: char.fear },
                      { label: "创伤", value: char.wound },
                      { label: "秘密", value: char.secret },
                      { label: "道德边界", value: char.moralBoundary },
                      { label: "语言模式", value: char.speechPattern },
                      { label: "当前目标", value: char.currentGoal },
                      { label: "当前位置", value: char.currentLocation },
                      { label: "当前状态", value: char.currentStatus },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-foreground mt-0.5">
                          {item.value || "未设定"}
                        </p>
                      </div>
                    ))}
                    {char.firstSeenChapter && (
                      <div>
                        <p className="text-xs text-muted-foreground">首次出场</p>
                        <p className="text-foreground mt-0.5">
                          第 {char.firstSeenChapter} 章
                        </p>
                      </div>
                    )}
                    {char.lastSeenChapter && (
                      <div>
                        <p className="text-xs text-muted-foreground">最后出场</p>
                        <p className="text-foreground mt-0.5">
                          第 {char.lastSeenChapter} 章
                        </p>
                      </div>
                    )}
                  </div>
                </ExpandableCard>
              ))}
              {characters.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Users className="h-12 w-12 text-zinc-600" />
                  <p className="text-muted-foreground">暂无角色数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="world">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">世界观规则</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{worldRules.length} 条规则</p>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen("world-rules")}>
                <Plus className="mr-1.5 h-4 w-4" /> 添加规则
              </Button>
            </div>
            {Object.keys(ruleGroups).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(ruleGroups).map(([category, rules]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary" />
                      {ruleCategoryLabel[category] || category}
                      <Badge
                        variant="outline"
                        className="border-zinc-700 bg-zinc-800 text-zinc-400 text-xs"
                      >
                        {rules.length}
                      </Badge>
                    </h3>
                    <div className="space-y-2">
                      {rules.map((rule) => (
                        <Card key={rule.id} className="border-zinc-800 bg-card">
                          <CardContent className="py-3 px-4">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm text-foreground leading-relaxed flex-1">
                                {rule.content}
                              </p>
                              <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-6 w-6 p-0 shrink-0" onClick={() => handleDeleteEntity("world-rules", rule.id)}>
                                <X className="h-3 w-3" />
                              </Button>
                              <Badge
                                variant="outline"
                                className={`text-xs shrink-0 ${
                                  rule.status === "confirmed"
                                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                                    : rule.status === "conflict"
                                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                                    : "border-zinc-700 bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {rule.status === "confirmed"
                                  ? "已确认"
                                  : rule.status === "conflict"
                                  ? "冲突"
                                  : rule.status === "deprecated"
                                  ? "废弃"
                                  : "草稿"}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Globe className="h-12 w-12 text-zinc-600" />
                <p className="text-muted-foreground">暂无世界观规则</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="organizations">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">组织列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{organizations.length} 个组织</p>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen("organizations")}>
                <Plus className="mr-1.5 h-4 w-4" /> 添加组织
              </Button>
            </div>
            <div className="space-y-3">
              {organizations.map((org) => (
                <ExpandableCard key={org.id} title={org.name} subtitle={org.description || undefined}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      {org.members && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">成员</p>
                          <div className="flex flex-wrap gap-2">
                            {(Array.isArray(org.members) ? org.members : []).map((m: any, i: number) => (
                              <Badge key={i} variant="outline" className="border-zinc-700 bg-zinc-800 text-zinc-300">
                                {typeof m === "string" ? m : m.name || JSON.stringify(m)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 shrink-0" onClick={() => handleDeleteEntity("organizations", org.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </ExpandableCard>
              ))}
              {organizations.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Building2 className="h-12 w-12 text-zinc-600" />
                  <p className="text-muted-foreground">暂无组织数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="abilities">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">能力列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{abilities.length} 项能力</p>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen("abilities")}>
                <Plus className="mr-1.5 h-4 w-4" /> 添加能力
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {abilities.map((ab) => (
                <Card key={ab.id} className="border-zinc-800 bg-card">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-400" />
                        <h3 className="text-sm font-semibold text-foreground">{ab.name}</h3>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-6 w-6 p-0" onClick={() => handleDeleteEntity("abilities", ab.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {ab.description && <p className="text-xs text-muted-foreground leading-relaxed">{ab.description}</p>}
                    {ab.limitations && <p className="text-xs text-red-400/80">限制: {ab.limitations}</p>}
                  </CardContent>
                </Card>
              ))}
              {abilities.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
                  <Zap className="h-12 w-12 text-zinc-600" />
                  <p className="text-muted-foreground">暂无能力数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="locations">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">地点列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{locations.length} 个地点</p>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen("locations")}>
                <Plus className="mr-1.5 h-4 w-4" /> 添加地点
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {locations.map((loc) => (
                <Card key={loc.id} className="border-zinc-800 bg-card">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-cyan-400" />
                        <h3 className="text-sm font-semibold text-foreground">{loc.name}</h3>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-6 w-6 p-0" onClick={() => handleDeleteEntity("locations", loc.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {loc.description && <p className="text-xs text-muted-foreground leading-relaxed">{loc.description}</p>}
                    {loc.firstSeenChapter && <p className="text-xs text-muted-foreground">第 {loc.firstSeenChapter} 章首次出现</p>}
                  </CardContent>
                </Card>
              ))}
              {locations.length === 0 && (
                <div className="col-span-3 flex flex-col items-center justify-center py-16 gap-3">
                  <MapPin className="h-12 w-12 text-zinc-600" />
                  <p className="text-muted-foreground">暂无地点数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="items">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">道具列表</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{items.length} 件道具</p>
              </div>
              <Button size="sm" onClick={() => setAddDialogOpen("items")}>
                <Plus className="mr-1.5 h-4 w-4" /> 添加道具
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <Card key={item.id} className="border-zinc-800 bg-card">
                  <CardContent className="pt-4 pb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-violet-400" />
                        <h3 className="text-sm font-semibold text-foreground">{item.name}</h3>
                      </div>
                      <Button variant="ghost" size="sm" className="text-red-400 hover:text-red-300 h-6 w-6 p-0" onClick={() => handleDeleteEntity("items", item.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>}
                    {item.abilities && <p className="text-xs text-amber-400/80">能力: {item.abilities}</p>}
                  </CardContent>
                </Card>
              ))}
              {items.length === 0 && (
                <div className="col-span-2 flex flex-col items-center justify-center py-16 gap-3">
                  <Package className="h-12 w-12 text-zinc-600" />
                  <p className="text-muted-foreground">暂无道具数据</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="forbidden">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">禁忌规则</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                作品中绝对不可触碰的底线
              </p>
            </div>
            {forbiddenRules.length > 0 ? (
              <div className="space-y-3">
                {forbiddenRules.map((rule, i) => (
                  <Card
                    key={i}
                    className="border-red-500/20 bg-red-500/5"
                  >
                    <CardContent className="py-4 px-5 flex items-start gap-3">
                      <Ban className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-sm text-red-200 leading-relaxed">
                        {rule}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Ban className="h-12 w-12 text-zinc-600" />
                <p className="text-muted-foreground">暂无禁忌规则设定</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="style">
            <SectionHeader
              title="风格指纹"
              editing={styleEditing}
              saving={saving}
              onEdit={() => {
                setStyleEdit(style);
                setStyleEditing(true);
              }}
              onSave={handleSaveStyle}
              onCancel={() => {
                setStyleEdit(style);
                setStyleEditing(false);
              }}
            />
            {styleEditing && styleEdit ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {STYLE_FIELDS.map((field) => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">
                        {field.label}
                      </label>
                      {field.type === "textarea" ? (
                        <Textarea
                          value={(styleEdit[field.key] as string) || ""}
                          onChange={(e) =>
                            setStyleEdit({
                              ...styleEdit,
                              [field.key]: e.target.value,
                            })
                          }
                          className="min-h-[60px] bg-zinc-900 border-zinc-800 text-foreground resize-y"
                        />
                      ) : (
                        <Input
                          value={(styleEdit[field.key] as string) || ""}
                          onChange={(e) =>
                            setStyleEdit({
                              ...styleEdit,
                              [field.key]: e.target.value,
                            })
                          }
                          className="bg-zinc-900 border-zinc-800 text-foreground"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {STYLE_SLIDERS.map((slider) => (
                    <div key={slider.key} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">
                          {slider.label}
                        </label>
                        <span className="text-xs text-foreground font-mono">
                          {(styleEdit[slider.key] as number)?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={(styleEdit[slider.key] as number) || 0}
                        onChange={(e) =>
                          setStyleEdit({
                            ...styleEdit,
                            [slider.key]: parseFloat(e.target.value),
                          })
                        }
                        className="w-full h-1.5 rounded-full bg-zinc-800 appearance-none cursor-pointer accent-primary"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : style ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  {STYLE_FIELDS.map((field) => (
                    <Card key={field.key} className="border-zinc-800 bg-card">
                      <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          {field.label}
                        </p>
                        <p className="text-sm text-foreground leading-relaxed">
                          {(style[field.key] as string) || "未设定"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <Card className="border-zinc-800 bg-card">
                  <CardHeader>
                    <CardTitle className="text-sm">数值指标</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {STYLE_SLIDERS.map((slider) => (
                        <div key={slider.key}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-muted-foreground">
                              {slider.label}
                            </span>
                            <span className="text-xs text-foreground font-mono">
                              {(style[slider.key] as number)?.toFixed(2) || "0.00"}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{
                                width: `${((style[slider.key] as number) || 0) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="border-zinc-800 bg-card">
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-1">常用词</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(style.commonWords)
                          ? style.commonWords
                          : []
                        ).map((w: string, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="border-zinc-700 bg-zinc-800 text-zinc-300 text-xs"
                          >
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-zinc-800 bg-card">
                    <CardContent className="pt-4 pb-3">
                      <p className="text-xs text-muted-foreground mb-1">禁用词</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(style.bannedWords)
                          ? style.bannedWords
                          : []
                        ).map((w: string, i: number) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-red-400 text-xs"
                          >
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">尚未创建风格指纹</p>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Entity Dialog */}
      {addDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setAddDialogOpen(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {addDialogOpen === "world-rules" && "添加世界观规则"}
                {addDialogOpen === "organizations" && "添加组织"}
                {addDialogOpen === "abilities" && "添加能力"}
                {addDialogOpen === "locations" && "添加地点"}
                {addDialogOpen === "items" && "添加道具"}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setAddDialogOpen(null)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="p-4 space-y-3">
              {addDialogOpen === "world-rules" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">分类</label>
                    <select className="w-full p-2 border rounded text-sm" value={newWorldRule.category} onChange={e => setNewWorldRule({ ...newWorldRule, category: e.target.value })}>
                      <option value="magic">力量体系</option>
                      <option value="world">世界规则</option>
                      <option value="social">社会规则</option>
                      <option value="tech">科技规则</option>
                      <option value="biology">生物规则</option>
                      <option value="physics">物理规则</option>
                      <option value="culture">文化规则</option>
                      <option value="history">历史规则</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">规则内容</label>
                    <Textarea value={newWorldRule.content} onChange={e => setNewWorldRule({ ...newWorldRule, content: e.target.value })} placeholder="描述这条世界观规则..." className="min-h-[80px]" />
                  </div>
                </>
              )}
              {addDialogOpen === "organizations" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">组织名称</label>
                    <Input value={newOrg.name} onChange={e => setNewOrg({ ...newOrg, name: e.target.value })} placeholder="如：天道宗" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">描述</label>
                    <Textarea value={newOrg.description} onChange={e => setNewOrg({ ...newOrg, description: e.target.value })} placeholder="组织简介..." className="min-h-[60px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">成员（逗号分隔）</label>
                    <Input value={newOrg.members} onChange={e => setNewOrg({ ...newOrg, members: e.target.value })} placeholder="张三, 李四" />
                  </div>
                </>
              )}
              {addDialogOpen === "abilities" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">能力名称</label>
                    <Input value={newAbility.name} onChange={e => setNewAbility({ ...newAbility, name: e.target.value })} placeholder="如：天眼通" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">描述</label>
                    <Textarea value={newAbility.description} onChange={e => setNewAbility({ ...newAbility, description: e.target.value })} placeholder="能力描述..." className="min-h-[60px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">限制</label>
                    <Input value={newAbility.limitations} onChange={e => setNewAbility({ ...newAbility, limitations: e.target.value })} placeholder="使用限制..." />
                  </div>
                </>
              )}
              {addDialogOpen === "locations" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">地点名称</label>
                    <Input value={newLocation.name} onChange={e => setNewLocation({ ...newLocation, name: e.target.value })} placeholder="如：天机阁" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">描述</label>
                    <Textarea value={newLocation.description} onChange={e => setNewLocation({ ...newLocation, description: e.target.value })} placeholder="地点描述..." className="min-h-[60px]" />
                  </div>
                </>
              )}
              {addDialogOpen === "items" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">道具名称</label>
                    <Input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="如：破界符" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">描述</label>
                    <Textarea value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} placeholder="道具描述..." className="min-h-[60px]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">特殊能力</label>
                    <Input value={newItem.abilities} onChange={e => setNewItem({ ...newItem, abilities: e.target.value })} placeholder="道具的特殊效果..." />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <Button variant="ghost" onClick={() => setAddDialogOpen(null)}>取消</Button>
              <Button onClick={() => handleAddEntity(addDialogOpen)} disabled={addLoading}>
                {addLoading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                创建
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
