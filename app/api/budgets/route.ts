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
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const [budgets, expenses] = await Promise.all([
    current.prisma.budget.findMany({ where: { ownerId: current.user.id, month }, include: { category: true } }),
    current.prisma.transaction.findMany({ where: { ownerId: current.user.id, type: "EXPENSE", bookedAt: { gte: month } }, select: { categoryId: true, amount: true } }),
  ]);
  const spentByCategory = expenses.reduce((totals, item) => {
    if (item.categoryId) totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + Number(item.amount));
    return totals;
  }, new Map<string, number>());
  const data = budgets.map((budget) => ({ ...budget, spent: spentByCategory.get(budget.categoryId) ?? 0 }));
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to save budgets." }, { status: 503 });
  const body = await request.json() as { categoryId?: string; limit?: number };
  if (!body.categoryId || !body.limit) return NextResponse.json({ error: "Category and limit are required." }, { status: 400 });
  const category = await current.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: current.user.id } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const data = await current.prisma.budget.upsert({ where: { ownerId_categoryId_month: { ownerId: current.user.id, categoryId: category.id, month } }, update: { limit: body.limit }, create: { ownerId: current.user.id, categoryId: category.id, month, limit: body.limit }, include: { category: true } });
  return NextResponse.json({ data: { ...data, spent: 0 } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update budgets." }, { status: 503 });
  const body = await request.json() as { id?: string; categoryId?: string; limit?: number };
  if (!body.id || !body.categoryId || !body.limit) return NextResponse.json({ error: "Budget, category, and limit are required." }, { status: 400 });
  const existing = await current.prisma.budget.findFirst({ where: { id: body.id, ownerId: current.user.id }, include: { category: true } });
  if (!existing) return NextResponse.json({ error: "Budget not found." }, { status: 404 });
  const category = await current.prisma.category.findFirst({ where: { id: body.categoryId, ownerId: current.user.id } });
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  try {
    const data = await current.prisma.budget.update({ where: { id: existing.id }, data: { categoryId: category.id, limit: body.limit }, include: { category: true } });
    return NextResponse.json({ data });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") return NextResponse.json({ error: "That category already has a budget for this month." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to delete budgets." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Budget id is required." }, { status: 400 });
  const result = await current.prisma.budget.deleteMany({ where: { id: body.id, ownerId: current.user.id } });
  if (!result.count) return NextResponse.json({ error: "Budget not found." }, { status: 404 });
  return NextResponse.json({ data: { deleted: body.id } });
}
