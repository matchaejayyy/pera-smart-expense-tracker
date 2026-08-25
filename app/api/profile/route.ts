import { NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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
  const data = await current.prisma.profile.findUnique({ where: { id: current.user.id } });
  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const current = await context();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to save profile settings." }, { status: 503 });
  const body = await request.json() as {
    displayName?: string;
    currency?: string;
    timezone?: string;
    monthlySavingsTarget?: number;
    budgetAlerts?: boolean;
    smartRule?: boolean;
    transportReminder?: boolean;
  };
  if (body.displayName !== undefined && !body.displayName.trim()) return NextResponse.json({ error: "Display name cannot be empty." }, { status: 400 });
  if (body.currency !== undefined && !["PHP", "USD", "EUR", "GBP", "SGD"].includes(body.currency)) return NextResponse.json({ error: "Choose a supported currency." }, { status: 400 });
  if (body.timezone !== undefined && !["Asia/Manila", "Asia/Singapore", "UTC", "America/New_York", "Europe/London"].includes(body.timezone)) return NextResponse.json({ error: "Choose a supported timezone." }, { status: 400 });
  if (body.monthlySavingsTarget !== undefined && (!Number.isFinite(body.monthlySavingsTarget) || body.monthlySavingsTarget < 0)) return NextResponse.json({ error: "Monthly savings target must be zero or higher." }, { status: 400 });

  const update = {
    ...(body.displayName !== undefined ? { displayName: body.displayName.trim() } : {}),
    ...(body.currency !== undefined ? { currency: body.currency } : {}),
    ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
    ...(body.monthlySavingsTarget !== undefined ? { monthlySavingsTarget: body.monthlySavingsTarget } : {}),
    ...(body.budgetAlerts !== undefined ? { budgetAlerts: body.budgetAlerts } : {}),
    ...(body.smartRule !== undefined ? { smartRule: body.smartRule } : {}),
    ...(body.transportReminder !== undefined ? { transportReminder: body.transportReminder } : {}),
  };

  const data = await current.prisma.profile.upsert({
    where: { id: current.user.id },
    update,
    create: { id: current.user.id, displayName: body.displayName?.trim() ?? current.user.email?.split("@")[0] ?? "Pera user", ...update },
  });
  return NextResponse.json({ data });
}
