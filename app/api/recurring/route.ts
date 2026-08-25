import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { createClient } from "../../../lib/supabase/server";

async function context() {
  const supabase = await createClient();
  const prisma = getPrisma();
  if (!supabase || !prisma) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { prisma, user } : null;
}

export async function GET() {
  const current = await context();
  if (!current) return NextResponse.json({ error: "The Prisma database connection is not configured." }, { status: 503 });
  const data = await current.prisma.recurringExpense.findMany({ where: { ownerId: current.user.id }, include: { category: true, account: true }, orderBy: { nextDueAt: "asc" } });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to save recurring expenses." }, { status: 503 });

  const body = await request.json() as {
    name?: string;
    accountId?: string;
    categoryId?: string;
    amount?: number;
    nextDueAt?: string;
    frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  };
  if (!body.name || !body.accountId || !body.categoryId || !body.amount || !body.nextDueAt) return NextResponse.json({ error: "Name, payment account, category, amount, and next due date are required." }, { status: 400 });

  const account = await current.prisma.account.findFirst({ where: { id: body.accountId, ownerId: current.user.id, isArchived: false } });
  if (!account) return NextResponse.json({ error: "Payment account not found." }, { status: 404 });

  const category = await current.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: current.user.id } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });

  const data = await current.prisma.recurringExpense.create({
    data: {
      ownerId: current.user.id,
      accountId: account.id,
      categoryId: category.id,
      name: body.name,
      amount: body.amount,
      nextDueAt: new Date(body.nextDueAt),
      frequency: body.frequency ?? "MONTHLY",
    },
    include: { category: true, account: true },
  });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update recurring expenses." }, { status: 503 });
  const body = await request.json() as { id?: string; name?: string; isActive?: boolean; accountId?: string; categoryId?: string; amount?: number; nextDueAt?: string; frequency?: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" };
  if (!body.id) return NextResponse.json({ error: "Recurring expense id is required." }, { status: 400 });
  const existing = await current.prisma.recurringExpense.findFirst({ where: { id: body.id, ownerId: current.user.id } });
  if (!existing) return NextResponse.json({ error: "Recurring expense not found." }, { status: 404 });

  let categoryId = existing.categoryId;
  let accountId = existing.accountId;
  if (body.accountId) {
    const account = await current.prisma.account.findFirst({ where: { id: body.accountId, ownerId: current.user.id, isArchived: false } });
    if (!account) return NextResponse.json({ error: "Payment account not found." }, { status: 404 });
    accountId = account.id;
  }
  if (body.categoryId) {
    const category = await current.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: current.user.id } });
    if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
    categoryId = category.id;
  }

  const data = await current.prisma.recurringExpense.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.amount !== undefined ? { amount: body.amount } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.nextDueAt ? { nextDueAt: new Date(body.nextDueAt) } : {}),
      ...(body.frequency ? { frequency: body.frequency } : {}),
      accountId,
      categoryId,
    },
    include: { category: true, account: true },
  });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to delete recurring expenses." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Recurring expense id is required." }, { status: 400 });
  const result = await current.prisma.recurringExpense.deleteMany({ where: { id: body.id, ownerId: current.user.id } });
  if (!result.count) return NextResponse.json({ error: "Recurring expense not found." }, { status: 404 });
  return NextResponse.json({ data: { deleted: body.id } });
}
