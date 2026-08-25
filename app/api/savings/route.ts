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
  const data = await current.prisma.savingsGoal.findMany({
    where: { ownerId: current.user.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to save savings goals." }, { status: 503 });
  const body = await request.json() as { name?: string; targetAmount?: number | null; targetDate?: string; color?: string };
  const name = body.name?.trim() ?? "";
  const targetAmount = body.targetAmount === null || body.targetAmount === undefined ? null : Number(body.targetAmount);
  if (!name) return NextResponse.json({ error: "Savings name is required." }, { status: 400 });
  if (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount <= 0)) return NextResponse.json({ error: "Target amount must be greater than zero when provided." }, { status: 400 });
  const duplicate = await current.prisma.savingsGoal.findFirst({ where: { ownerId: current.user.id, name: { equals: name, mode: "insensitive" } } });
  if (duplicate) return NextResponse.json({ error: "You already have a savings goal with that name." }, { status: 409 });
  const data = await current.prisma.savingsGoal.create({
    data: {
      ownerId: current.user.id,
      name,
      targetAmount,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
      color: body.color || "#B5F300",
    },
  });
  return NextResponse.json({ data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update savings goals." }, { status: 503 });
  const body = await request.json() as { id?: string; name?: string; targetAmount?: number | null; targetDate?: string; color?: string };
  const name = body.name?.trim() ?? "";
  const targetAmount = body.targetAmount === null || body.targetAmount === undefined ? null : Number(body.targetAmount);
  if (!body.id || !name) return NextResponse.json({ error: "Savings goal and name are required." }, { status: 400 });
  if (targetAmount !== null && (!Number.isFinite(targetAmount) || targetAmount <= 0)) return NextResponse.json({ error: "Target amount must be greater than zero when provided." }, { status: 400 });
  const existing = await current.prisma.savingsGoal.findFirst({ where: { id: body.id, ownerId: current.user.id } });
  if (!existing) return NextResponse.json({ error: "Savings goal not found." }, { status: 404 });
  const duplicate = await current.prisma.savingsGoal.findFirst({ where: { ownerId: current.user.id, id: { not: existing.id }, name: { equals: name, mode: "insensitive" } } });
  if (duplicate) return NextResponse.json({ error: "You already have a savings goal with that name." }, { status: 409 });
  const [data] = await current.prisma.$transaction([
    current.prisma.savingsGoal.update({
      where: { id: existing.id },
      data: { name, targetAmount, targetDate: body.targetDate ? new Date(body.targetDate) : null, color: body.color || existing.color },
    }),
    current.prisma.transaction.updateMany({ where: { ownerId: current.user.id, savingsGoalId: existing.id }, data: { merchant: name } }),
  ]);
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to delete savings goals." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Savings goal id is required." }, { status: 400 });
  const result = await current.prisma.savingsGoal.deleteMany({ where: { id: body.id, ownerId: current.user.id } });
  if (!result.count) return NextResponse.json({ error: "Savings goal not found." }, { status: 404 });
  return NextResponse.json({ data: { deleted: body.id } });
}
