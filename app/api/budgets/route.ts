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
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const data = await current.prisma.budget.findMany({ where: { ownerId: current.user.id, month }, include: { category: true } });
  return NextResponse.json({ data, demo: false });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect Supabase to save budgets." }, { status: 503 });
  const body = await request.json() as { name?: string; limit?: number; color?: string };
  if (!body.name || !body.limit) return NextResponse.json({ error: "Name and limit are required." }, { status: 400 });
  const slug = body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const category = await current.prisma.category.upsert({ where: { ownerId_slug: { ownerId: current.user.id, slug } }, update: { color: body.color }, create: { ownerId: current.user.id, name: body.name, slug, color: body.color } });
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const data = await current.prisma.budget.upsert({ where: { ownerId_categoryId_month: { ownerId: current.user.id, categoryId: category.id, month } }, update: { limit: body.limit }, create: { ownerId: current.user.id, categoryId: category.id, month, limit: body.limit }, include: { category: true } });
  return NextResponse.json({ data });
}
