/**
 * SQLite → PostgreSQL 数据迁移脚本
 *
 * 用法：
 *   npx tsx scripts/migrate-data.ts export   # 从 SQLite 导出到 JSON
 *   npx tsx scripts/migrate-data.ts import   # 从 JSON 导入到 PostgreSQL
 *   npx tsx scripts/migrate-data.ts verify   # 验证两边数据一致
 */

import Database from "better-sqlite3";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const MIGRATION_DIR = path.join(process.cwd(), "migration-data");
const SQLITE_PATH = path.join(process.cwd(), "prisma", "dev.db");

// 表的导入顺序（依赖关系）
const TABLE_ORDER = [
  "User",
  "Project",
  "BookDNA",
  "Volume",
  "Arc",
  "StyleFingerprint",
  "Chapter",
  "Scene",
  "Character",
  "Relationship",
  "WorldRule",
  "Location",
  "Item",
  "Ability",
  "Organization",
  "Event",
  "Foreshadow",
  "ReaderPromise",
  "AuditReport",
  "StateDiff",
  "GenerationJob",
  "AICallLog",
  "MemoryEmbedding",
  "ConsistencyReport",
  "VersionLog",
  "PromptVersion",
  "ExecutionLog",
  "AgentPerformance",
  "PipelineExecution",
  "LearningEpisode",
  "LearningRecord",
  "EvolutionCycle",
];

async function exportData() {
  if (!fs.existsSync(SQLITE_PATH)) {
    console.error(`SQLite 数据库不存在: ${SQLITE_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(MIGRATION_DIR, { recursive: true });

  const db = new Database(SQLITE_PATH, { readonly: true });

  // 获取所有表名
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%'")
    .all() as { name: string }[];

  console.log(`找到 ${tables.length} 个表`);

  for (const { name } of tables) {
    const rows = db.prepare(`SELECT * FROM "${name}"`).all();
    const filePath = path.join(MIGRATION_DIR, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2));
    console.log(`  ${name}: ${rows.length} 条记录`);
  }

  db.close();
  console.log(`\n导出完成！数据保存在 ${MIGRATION_DIR}/`);
}

async function importData() {
  if (!fs.existsSync(MIGRATION_DIR)) {
    console.error(`迁移数据目录不存在: ${MIGRATION_DIR}`);
    console.error("请先运行: npx tsx scripts/migrate-data.ts export");
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    for (const tableName of TABLE_ORDER) {
      const filePath = path.join(MIGRATION_DIR, `${tableName}.json`);
      if (!fs.existsSync(filePath)) {
        console.log(`  ${tableName}: 文件不存在，跳过`);
        continue;
      }

      const rows = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      if (rows.length === 0) {
        console.log(`  ${tableName}: 0 条记录，跳过`);
        continue;
      }

      // 获取 Prisma model 名（首字母小写）
      const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

      // 检查 Prisma client 是否有这个 model
      if (!(prisma as any)[modelName]) {
        console.log(`  ${tableName}: Prisma model 不存在，跳过`);
        continue;
      }

      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        try {
          // 处理 Json 字段：SQLite 存的是字符串，PostgreSQL 需要对象
          const data: any = {};
          for (const [key, value] of Object.entries(row)) {
            if (value === null || value === undefined) {
              data[key] = null;
            } else if (typeof value === "string") {
              // 尝试解析 JSON 字段
              try {
                const parsed = JSON.parse(value);
                // 如果是 Json 类型字段，保持为对象
                if (typeof parsed === "object" && parsed !== null) {
                  data[key] = parsed;
                } else {
                  data[key] = value;
                }
              } catch {
                data[key] = value;
              }
            } else {
              data[key] = value;
            }
          }

          // 跳过 MemoryEmbedding 的 embedding 字段（pgvector 格式不同）
          if (tableName === "MemoryEmbedding" && data.embedding) {
            delete data.embedding;
          }

          await (prisma as any)[modelName].create({ data });
          imported++;
        } catch (err: any) {
          // 忽略重复记录错误
          if (err.code === "P2002") {
            skipped++;
          } else {
            console.error(`    导入失败: ${err.message}`);
            skipped++;
          }
        }
      }

      console.log(`  ${tableName}: 导入 ${imported} 条，跳过 ${skipped} 条`);
    }

    console.log("\n导入完成！");
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyData() {
  if (!fs.existsSync(MIGRATION_DIR)) {
    console.error(`迁移数据目录不存在: ${MIGRATION_DIR}`);
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    console.log("验证数据一致性...\n");

    for (const tableName of TABLE_ORDER) {
      const filePath = path.join(MIGRATION_DIR, `${tableName}.json`);
      if (!fs.existsSync(filePath)) continue;

      const sqliteRows = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const modelName = tableName.charAt(0).toLowerCase() + tableName.slice(1);

      if (!(prisma as any)[modelName]) continue;

      const pgCount = await (prisma as any)[modelName].count();
      const sqliteCount = sqliteRows.length;

      const status = pgCount >= sqliteCount ? "✅" : "⚠️";
      console.log(`  ${status} ${tableName}: SQLite=${sqliteCount}, PG=${pgCount}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// 主入口
const command = process.argv[2];

switch (command) {
  case "export":
    exportData();
    break;
  case "import":
    importData();
    break;
  case "verify":
    verifyData();
    break;
  default:
    console.log("用法:");
    console.log("  npx tsx scripts/migrate-data.ts export   # 从 SQLite 导出");
    console.log("  npx tsx scripts/migrate-data.ts import   # 导入到 PostgreSQL");
    console.log("  npx tsx scripts/migrate-data.ts verify   # 验证数据一致性");
    break;
}
