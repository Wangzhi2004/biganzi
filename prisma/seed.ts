import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const STYLE_PRESETS = [
  {
    name: "冷峻升级流",
    narrativePOV: "第三人称限制视角",
    narrativeDistance: "中距离",
    avgSentenceLength: 18,
    dialogueRatio: 0.25,
    psychologicalRatio: 0.15,
    actionRatio: 0.4,
    environmentRatio: 0.2,
    infoDensity: 0.7,
    emotionExposure: 0.3,
    humorLevel: 0.1,
    rhetoricSystem: {
      preferred: ["短句爆发", "冷叙述", "数据化描写"],
      avoided: ["感叹号堆砌", "过度抒情"],
    },
    commonWords: [
      "然而",
      "不过",
      "直接",
      "瞬间",
      "提升",
      "突破",
      "碾压",
      "压制",
    ],
    bannedWords: [
      "美丽的",
      "宛如",
      "仿佛",
      "竟然",
      "居然",
      "天啊",
      "我的天",
    ],
    chapterEndStyle: "实力展示或数值突破",
    battleStyle: "简洁高效，注重实力差距和碾压感",
    romanceStyle: "冷淡克制，偶尔流露温情",
    mysteryStyle: "信息逐步释放，保持悬念",
  },
  {
    name: "轻松吐槽流",
    narrativePOV: "第一人称",
    narrativeDistance: "近距离",
    avgSentenceLength: 12,
    dialogueRatio: 0.45,
    psychologicalRatio: 0.3,
    actionRatio: 0.15,
    environmentRatio: 0.1,
    infoDensity: 0.4,
    emotionExposure: 0.6,
    humorLevel: 0.8,
    rhetoricSystem: {
      preferred: ["吐槽", "自嘲", "反差萌", "网络用语适度"],
      avoided: ["严肃说教", "过度煽情"],
    },
    commonWords: [
      "话说",
      "总之",
      "大概",
      "嘛",
      "喂",
      "等等",
      "不对吧",
      "才怪",
    ],
    bannedWords: [
      "深邃",
      "凝重",
      "庄严",
      "肃穆",
      "不可名状",
      "令人敬畏",
    ],
    chapterEndStyle: "吐槽式总结或意外转折",
    battleStyle: "轻松幽默，主角光环明显",
    romanceStyle: "欢喜冤家，互怼中升温",
    mysteryStyle: "主角吐槽式推理，意外发现真相",
  },
  {
    name: "古典仙侠感",
    narrativePOV: "第三人称全知",
    narrativeDistance: "远距离",
    avgSentenceLength: 22,
    dialogueRatio: 0.2,
    psychologicalRatio: 0.1,
    actionRatio: 0.3,
    environmentRatio: 0.4,
    infoDensity: 0.6,
    emotionExposure: 0.4,
    humorLevel: 0.15,
    rhetoricSystem: {
      preferred: ["对仗", "意象", "古风词汇", "诗词化描写"],
      avoided: ["现代网络用语", "过于直白的表述"],
    },
    commonWords: [
      "且说",
      "却道",
      "只见",
      "但见",
      "须臾",
      "刹那",
      "倏忽",
      "已然",
    ],
    bannedWords: [
      "帅呆了",
      "酷毙了",
      "666",
      "绝绝子",
      "yyds",
      "太牛了",
    ],
    chapterEndStyle: "意境深远的收尾或悬念",
    battleStyle: "招式描写细腻，注重意境和气势",
    romanceStyle: "含蓄婉转，以景喻情",
    mysteryStyle: "玄机暗藏，以古风叙事制造悬念",
  },
  {
    name: "黑暗悬疑感",
    narrativePOV: "第三人称限制视角",
    narrativeDistance: "近距离",
    avgSentenceLength: 16,
    dialogueRatio: 0.3,
    psychologicalRatio: 0.35,
    actionRatio: 0.2,
    environmentRatio: 0.15,
    infoDensity: 0.8,
    emotionExposure: 0.5,
    humorLevel: 0.05,
    rhetoricSystem: {
      preferred: ["暗示", "伏笔", "细节描写", "氛围营造"],
      avoided: ["过于直白的解释", "轻松调侃"],
    },
    commonWords: [
      "似乎",
      "仿佛",
      "隐约",
      "暗中",
      "隐藏",
      "真相",
      "线索",
      "疑点",
    ],
    bannedWords: [
      "开心",
      "快乐",
      "幸福",
      "美好",
      "温馨",
      "甜蜜",
    ],
    chapterEndStyle: "新线索发现或真相揭示的震撼",
    battleStyle: "心理博弈为主，注重智谋和算计",
    romanceStyle: "暗流涌动，充满试探和猜疑",
    mysteryStyle: "层层剥茧，逐步逼近真相",
  },
  {
    name: "都市爽文感",
    narrativePOV: "第三人称限制视角",
    narrativeDistance: "近距离",
    avgSentenceLength: 14,
    dialogueRatio: 0.4,
    psychologicalRatio: 0.2,
    actionRatio: 0.25,
    environmentRatio: 0.15,
    infoDensity: 0.5,
    emotionExposure: 0.6,
    humorLevel: 0.4,
    rhetoricSystem: {
      preferred: ["打脸", "反转", "装逼", "众人震惊"],
      avoided: ["过于文艺", "长篇大论的内心独白"],
    },
    commonWords: [
      "震惊",
      "不可能",
      "怎么可能",
      "竟然",
      "全场",
      "所有人",
      "彻底",
      "直接",
    ],
    bannedWords: [
      "也许",
      "大概",
      "可能吧",
      "不太确定",
      "模棱两可",
    ],
    chapterEndStyle: "打脸高光时刻或身份揭露",
    battleStyle: "简洁有力，注重反差和碾压",
    romanceStyle: "霸道总裁式或双向奔赴",
    mysteryStyle: "身份反转或背景揭露",
  },
  {
    name: "细腻情绪流",
    narrativePOV: "第一人称",
    narrativeDistance: "极近距离",
    avgSentenceLength: 20,
    dialogueRatio: 0.25,
    psychologicalRatio: 0.45,
    actionRatio: 0.1,
    environmentRatio: 0.2,
    infoDensity: 0.3,
    emotionExposure: 0.9,
    humorLevel: 0.2,
    rhetoricSystem: {
      preferred: ["细腻描写", "内心独白", "感官细节", "情绪递进"],
      avoided: ["过于简短的叙述", "纯动作描写"],
    },
    commonWords: [
      "感觉",
      "似乎",
      "心里",
      "眼眶",
      "微微",
      "轻轻",
      "缓缓",
      "忽然",
    ],
    bannedWords: [
      "干掉",
      "碾压",
      "秒杀",
      "无敌",
      "最强",
      "碾压一切",
    ],
    chapterEndStyle: "情感高潮或内心顿悟",
    battleStyle: "以情感冲突为主，战斗为辅",
    romanceStyle: "细腻入微，注重情感变化和内心波动",
    mysteryStyle: "通过情绪线索和人际关系推动悬疑",
  },
];

const CHAPTER_FUNCTION_TYPES = [
  { value: "main_plot", label: "主线推进", description: "推进核心剧情线的关键章节" },
  { value: "character_turn", label: "人物转折", description: "角色发生重大认知或立场转变" },
  { value: "foreshadow_plant", label: "伏笔埋设", description: "埋下未来将回收的伏笔线索" },
  { value: "foreshadow_payoff", label: "伏笔回收", description: "回收之前埋下的伏笔" },
  { value: "pleasure_burst", label: "爽点爆发", description: "读者爽感爆发的高光时刻" },
  { value: "crisis_upgrade", label: "危机升级", description: "提升故事紧张度和危机感" },
  { value: "world_expansion", label: "世界观扩展", description: "扩展故事世界观和设定" },
  { value: "relationship_advance", label: "关系推进", description: "推进角色之间的关系发展" },
  { value: "villain_pressure", label: "反派施压", description: "反派势力对主角施加压力" },
  { value: "emotional_settle", label: "情感沉淀", description: "沉淀情感，让读者回味" },
  { value: "phase_close", label: "阶段收束", description: "收束当前阶段的剧情线" },
  { value: "new_arc_open", label: "新弧开启", description: "开启新的故事弧线" },
];

async function main() {
  console.log("Seeding database...");

  console.log(`Found ${STYLE_PRESETS.length} style presets to document`);
  for (const preset of STYLE_PRESETS) {
    console.log(`  Style preset: ${preset.name}`);
  }

  console.log(`Found ${CHAPTER_FUNCTION_TYPES.length} chapter function types to document`);
  for (const funcType of CHAPTER_FUNCTION_TYPES) {
    console.log(`  Chapter function: ${funcType.value} - ${funcType.label}`);
  }

  console.log("Seed data documentation complete.");
  console.log("Style presets and chapter function types are defined as constants.");
  console.log("Use these constants when creating new projects or generating chapters.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Seed completed successfully.");
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });

export { STYLE_PRESETS, CHAPTER_FUNCTION_TYPES };