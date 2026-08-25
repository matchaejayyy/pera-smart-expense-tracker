import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { createClient } from "../../../lib/supabase/server";

const transactionTypes = new Set(["INCOME", "EXPENSE", "SAVINGS", "TRANSFER"]);

const slugify = (value: string) => value
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, "-")
  .replace(/(^-|-$)/g, "");

const isUniqueConflict = (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002";

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
  const data = await current.prisma.category.findMany({
    where: { ownerId: current.user.id },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to save categories." }, { status: 503 });
  const body = await request.json() as { name?: string; color?: string; transactionType?: string };
  const name = body.name?.trim() ?? "";
  const slug = slugify(name);
  if (!name || !slug) return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  const transactionType = transactionTypes.has(body.transactionType ?? "") ? body.transactionType as "INCOME" | "EXPENSE" | "SAVINGS" | "TRANSFER" : "EXPENSE";

  try {
    const data = await current.prisma.category.create({
      data: { ownerId: current.user.id, name, slug, color: body.color || "#B5F300", transactionType },
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    if (isUniqueConflict(error)) return NextResponse.json({ error: "You already have a category with that name." }, { status: 409 });
    throw error;
  }
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update categories." }, { status: 503 });
  const body = await request.json() as { id?: string; name?: string; color?: string; transactionType?: string };
  const name = body.name?.trim() ?? "";
  const slug = slugify(name);
  if (!body.id || !name || !slug) return NextResponse.json({ error: "Category and name are required." }, { status: 400 });
  const existing = await current.prisma.category.findFirst({ where: { id: body.id, ownerId: current.user.id } });
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const transactionType = transactionTypes.has(body.transactionType ?? "") ? body.transactionType as "INCOME" | "EXPENSE" | "SAVINGS" | "TRANSFER" : existing.transactionType;

  try {
    const data = await current.prisma.category.update({
      where: { id: existing.id },
      data: { name, slug, color: body.color || existing.color, transactionType },
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (isUniqueConflict(error)) return NextResponse.json({ error: "You already have a category with that name." }, { status: 409 });
    throw error;
  }
}

export async function DELETE(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to delete categories." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Category id is required." }, { status: 400 });
  const existing = await current.prisma.category.findFirst({ where: { id: body.id, ownerId: current.user.id } });
  if (!existing) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  await current.prisma.category.delete({ where: { id: existing.id } });
  return NextResponse.json({ data: { deleted: existing.id } });
}
