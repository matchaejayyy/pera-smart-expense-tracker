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
  if (!current) return NextResponse.json({ data: [], demo: true });
  const data = await current.prisma.recurringExpense.findMany({ where: { ownerId: current.user.id }, include: { category: true }, orderBy: { nextDueAt: "asc" } });
  return NextResponse.json({ data, demo: false });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect Supabase to update recurring expenses." }, { status: 503 });
  const body = await request.json() as { name?: string; isActive?: boolean };
  if (!body.name || typeof body.isActive !== "boolean") return NextResponse.json({ error: "Name and status are required." }, { status: 400 });
  const result = await current.prisma.recurringExpense.updateMany({ where: { ownerId: current.user.id, name: body.name }, data: { isActive: body.isActive } });
  if (!result.count) return NextResponse.json({ error: "Recurring expense not found." }, { status: 404 });
  return NextResponse.json({ data: { updated: result.count } });
}
