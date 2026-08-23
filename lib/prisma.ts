import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!prismaGlobal.prisma) {
    const adapter = new PrismaPg({ connectionString });
    prismaGlobal.prisma = new PrismaClient({ adapter });
  }

  return prismaGlobal.prisma;
}
