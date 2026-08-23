import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { createClient } from "../../../lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const prisma = getPrisma();
  if (!supabase || !prisma) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  return { prisma, user };
}

export async function GET() {
  const context = await getContext();
  if (!context) return NextResponse.json({ data: [], demo: true });

  const data = await context.prisma.transaction.findMany({
    where: { ownerId: context.user.id },
    include: { category: true, account: true },
    orderBy: { bookedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data, demo: false });
}

export async function POST(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Connect Supabase to save transactions." }, { status: 503 });

  const body = await request.json() as { merchant?: string; amount?: number; type?: "INCOME" | "EXPENSE" | "SAVINGS" | "TRANSFER"; category?: string; bookedAt?: string };
  if (!body.merchant || !body.amount || !body.type) return NextResponse.json({ error: "Merchant, amount, and type are required." }, { status: 400 });

  const account = await context.prisma.account.findFirst({ where: { ownerId: context.user.id, isArchived: false } })
    ?? await context.prisma.account.create({ data: { ownerId: context.user.id, name: "Primary account", type: "CHECKING", openingBalance: 0 } });

  const categoryName = body.category || "Other";
  const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = await context.prisma.category.upsert({
    where: { ownerId_slug: { ownerId: context.user.id, slug } },
    update: {},
    create: { ownerId: context.user.id, name: categoryName, slug, transactionType: body.type },
  });

  const transaction = await context.prisma.transaction.create({
    data: { ownerId: context.user.id, accountId: account.id, categoryId: category.id, merchant: body.merchant, amount: body.amount, type: body.type, bookedAt: body.bookedAt ? new Date(body.bookedAt) : new Date() },
  });
  return NextResponse.json({ data: transaction }, { status: 201 });
}
