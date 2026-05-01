import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  earlyAccess: true,
  datasource: {
    url: process.env.DATABASE_URL || "postgresql://biganzi:biganzi2026@localhost:5432/biganzi",
  },
});
