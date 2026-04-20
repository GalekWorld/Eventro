import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __eventroPrisma?: PrismaClient;
};

const enableQueryEventLogging = process.env.NODE_ENV !== "production" && process.env.PRISMA_LOG_QUERIES === "1";
const prismaLogConfig: Prisma.LogDefinition[] = enableQueryEventLogging
  ? [
      { emit: "event", level: "query" },
      { emit: "stdout", level: "warn" },
      { emit: "stdout", level: "error" },
    ]
  : process.env.NODE_ENV === "development"
    ? [
        { emit: "stdout", level: "warn" },
        { emit: "stdout", level: "error" },
      ]
    : [{ emit: "stdout", level: "error" }];

export const prisma =
  globalForPrisma.__eventroPrisma ??
  new PrismaClient({
    log: prismaLogConfig,
  });

if (enableQueryEventLogging) {
  prisma.$on("query" as never, (event: Prisma.QueryEvent) => {
    if (event.duration < 150) {
      return;
    }

    const compactQuery = event.query.replace(/\s+/g, " ").trim().slice(0, 220);
    console.info(`[prisma-query] ${event.duration}ms ${compactQuery}`);
  });
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__eventroPrisma = prisma;
}
