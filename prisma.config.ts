import type { PrismaConfig } from "prisma/config";

export default {
  datasource: { url: process.env.POSTGRES_URL },
  migrations: { path: "./migrations" },
} satisfies PrismaConfig;
