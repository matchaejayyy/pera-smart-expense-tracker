import { NextResponse } from "next/server";
import { getPrisma } from "../../../lib/prisma";
import { createClient } from "../../../lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const prisma = getPrisma();
  if (!supabase || !prisma) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { prisma, user } : null;
}

const monthDate = (value?: string) => {
  const month = value && /^\d{4}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 7);
  return new Date(`${month}-01T00:00:00.000Z`);
};

export async function GET(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "The Prisma database connection is not configured." }, { status: 503 });
  const month = new URL(request.url).searchParams.get("month") ?? undefined;
  const data = await current.prisma.monthlyBudget.findUnique({ where: { ownerId_month: { ownerId: current.user.id, month: monthDate(month) } } });
  return NextResponse.json({ data });
}

export async function PUT(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to set a monthly budget." }, { status: 503 });
  const body = await request.json() as { month?: string; limit?: number };
  const limit = Number(body.limit);
  if (!Number.isFinite(limit) || limit <= 0) return NextResponse.json({ error: "Monthly budget must be greater than zero." }, { status: 400 });
  const month = monthDate(body.month);
  const data = await current.prisma.monthlyBudget.upsert({
    where: { ownerId_month: { ownerId: current.user.id, month } },
    update: { limit },
    create: { ownerId: current.user.id, month, limit },
  });
  return NextResponse.json({ data });
}
