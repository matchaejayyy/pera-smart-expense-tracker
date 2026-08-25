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
  if (!context) return NextResponse.json({ error: "The Prisma database connection is not configured." }, { status: 503 });

  const data = await context.prisma.transaction.findMany({
    where: { ownerId: context.user.id },
    include: { category: true, savingsGoal: true, account: true },
    orderBy: { bookedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Connect Supabase to save transactions." }, { status: 503 });

  const body = await request.json() as { merchant?: string; amount?: number; type?: "INCOME" | "EXPENSE" | "SAVINGS"; categoryId?: string | null; savingsGoalId?: string | null; bookedAt?: string };
  if (!body.amount || !body.type) return NextResponse.json({ error: "Amount and transaction type are required." }, { status: 400 });
  if (body.type === "EXPENSE" && (!body.merchant?.trim() || !body.categoryId)) return NextResponse.json({ error: "Merchant and category are required for expenses." }, { status: 400 });
  if (body.type === "SAVINGS" && !body.savingsGoalId) return NextResponse.json({ error: "Choose a savings destination." }, { status: 400 });

  const account = await context.prisma.account.findFirst({ where: { ownerId: context.user.id, isArchived: false } })
    ?? await context.prisma.account.create({ data: { ownerId: context.user.id, name: "Primary account", type: "CHECKING", openingBalance: 0 } });

  const category = body.type === "EXPENSE" && body.categoryId
    ? await context.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: context.user.id } })
    : null;
  if (body.type === "EXPENSE" && !category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const savingsGoal = body.type === "SAVINGS" && body.savingsGoalId
    ? await context.prisma.savingsGoal.findFirst({ where: { id: body.savingsGoalId, ownerId: context.user.id } })
    : null;
  if (body.type === "SAVINGS" && !savingsGoal) return NextResponse.json({ error: "Savings destination not found." }, { status: 404 });
  const merchant = body.type === "SAVINGS" ? savingsGoal!.name : body.merchant?.trim() || "Salary";

  const transaction = await context.prisma.$transaction(async (prisma) => {
    const created = await prisma.transaction.create({
      data: { ownerId: context.user.id, accountId: account.id, categoryId: category?.id ?? null, savingsGoalId: savingsGoal?.id ?? null, merchant, amount: body.amount!, type: body.type!, bookedAt: body.bookedAt ? new Date(body.bookedAt) : new Date() },
      include: { category: true, savingsGoal: true },
    });
    if (savingsGoal) await prisma.savingsGoal.update({ where: { id: savingsGoal.id }, data: { currentAmount: { increment: body.amount! } } });
    return created;
  });
  return NextResponse.json({ data: transaction }, { status: 201 });
}

export async function PATCH(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Connect the Prisma database to update transactions." }, { status: 503 });
  const body = await request.json() as { id?: string; merchant?: string; amount?: number; type?: "INCOME" | "EXPENSE" | "SAVINGS"; categoryId?: string | null; savingsGoalId?: string | null; bookedAt?: string };
  if (!body.id || !body.amount || !body.type) return NextResponse.json({ error: "Transaction, amount, and type are required." }, { status: 400 });
  if (body.type === "EXPENSE" && (!body.merchant?.trim() || !body.categoryId)) return NextResponse.json({ error: "Merchant and category are required for expenses." }, { status: 400 });
  if (body.type === "SAVINGS" && !body.savingsGoalId) return NextResponse.json({ error: "Choose a savings destination." }, { status: 400 });

  const existing = await context.prisma.transaction.findFirst({ where: { id: body.id, ownerId: context.user.id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });

  const category = body.type === "EXPENSE" && body.categoryId
    ? await context.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: context.user.id } })
    : null;
  if (body.type === "EXPENSE" && !category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const savingsGoal = body.type === "SAVINGS" && body.savingsGoalId
    ? await context.prisma.savingsGoal.findFirst({ where: { id: body.savingsGoalId, ownerId: context.user.id } })
    : null;
  if (body.type === "SAVINGS" && !savingsGoal) return NextResponse.json({ error: "Savings destination not found." }, { status: 404 });
  const merchant = body.type === "SAVINGS" ? savingsGoal!.name : body.merchant?.trim() || "Salary";

  const data = await context.prisma.$transaction(async (prisma) => {
    if (existing.type === "SAVINGS" && existing.savingsGoalId) {
      await prisma.savingsGoal.updateMany({ where: { id: existing.savingsGoalId, ownerId: context.user.id }, data: { currentAmount: { decrement: existing.amount } } });
    }
    const updated = await prisma.transaction.update({
      where: { id: existing.id },
      data: { merchant, amount: body.amount!, type: body.type!, categoryId: category?.id ?? null, savingsGoalId: savingsGoal?.id ?? null, ...(body.bookedAt ? { bookedAt: new Date(body.bookedAt) } : {}) },
      include: { category: true, savingsGoal: true },
    });
    if (savingsGoal) await prisma.savingsGoal.update({ where: { id: savingsGoal.id }, data: { currentAmount: { increment: body.amount! } } });
    return updated;
  });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const context = await getContext();
  if (!context) return NextResponse.json({ error: "Connect the Prisma database to delete transactions." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Transaction id is required." }, { status: 400 });
  const existing = await context.prisma.transaction.findFirst({ where: { id: body.id, ownerId: context.user.id } });
  if (!existing) return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  await context.prisma.$transaction(async (prisma) => {
    await prisma.transaction.delete({ where: { id: existing.id } });
    if (existing.type === "SAVINGS" && existing.savingsGoalId) {
      await prisma.savingsGoal.updateMany({ where: { id: existing.savingsGoalId, ownerId: context.user.id }, data: { currentAmount: { decrement: existing.amount } } });
    }
  });
  return NextResponse.json({ data: { deleted: body.id } });
}
