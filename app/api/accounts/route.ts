import { NextResponse } from "next/server";
import { getAccountBalances } from "../../../lib/account-balances";
import { getPrisma } from "../../../lib/prisma";
import { createClient } from "../../../lib/supabase/server";

const accountTypes = ["CASH", "CHECKING", "SAVINGS", "CREDIT_CARD", "E_WALLET"] as const;

async function getContext() {
  const supabase = await createClient();
  const prisma = getPrisma();
  if (!supabase || !prisma) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { prisma, user } : null;
}

export async function GET() {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "The Prisma database connection is not configured." }, { status: 503 });

  const data = await getAccountBalances(current.prisma, current.user.id);
  return NextResponse.json({ data }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to create an account." }, { status: 503 });
  const body = await request.json() as { name?: string; type?: typeof accountTypes[number]; openingBalance?: number };
  const name = body.name?.trim() ?? "";
  const openingBalance = Number(body.openingBalance ?? 0);
  if (!name || !body.type || !accountTypes.includes(body.type) || !Number.isFinite(openingBalance)) {
    return NextResponse.json({ error: "A valid account name, type, and opening balance are required." }, { status: 400 });
  }
  const duplicate = await current.prisma.account.findFirst({ where: { ownerId: current.user.id, isArchived: false, name: { equals: name, mode: "insensitive" } } });
  if (duplicate) return NextResponse.json({ error: "You already have an active account with that name." }, { status: 409 });
  const data = await current.prisma.account.create({ data: { ownerId: current.user.id, name, type: body.type, openingBalance } });
  return NextResponse.json({ data: { ...data, balance: Number(data.openingBalance) } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update an account." }, { status: 503 });
  const body = await request.json() as { id?: string; name?: string; type?: typeof accountTypes[number]; openingBalance?: number };
  const name = body.name?.trim() ?? "";
  const openingBalance = Number(body.openingBalance);
  if (!body.id || !name || !body.type || !accountTypes.includes(body.type) || !Number.isFinite(openingBalance)) {
    return NextResponse.json({ error: "A valid account, name, type, and opening balance are required." }, { status: 400 });
  }
  const existing = await current.prisma.account.findFirst({ where: { id: body.id, ownerId: current.user.id, isArchived: false } });
  if (!existing) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const duplicate = await current.prisma.account.findFirst({ where: { ownerId: current.user.id, isArchived: false, id: { not: existing.id }, name: { equals: name, mode: "insensitive" } } });
  if (duplicate) return NextResponse.json({ error: "You already have an active account with that name." }, { status: 409 });
  const data = await current.prisma.account.update({ where: { id: existing.id }, data: { name, type: body.type, openingBalance } });
  return NextResponse.json({ data });
}

export async function DELETE(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to delete an account." }, { status: 503 });
  const body = await request.json() as { id?: string };
  if (!body.id) return NextResponse.json({ error: "Account id is required." }, { status: 400 });
  const existing = await current.prisma.account.findFirst({ where: { id: body.id, ownerId: current.user.id, isArchived: false } });
  if (!existing) return NextResponse.json({ error: "Account not found." }, { status: 404 });
  const [transactions, recurring, adjustments, outgoing, incoming] = await Promise.all([
    current.prisma.transaction.count({ where: { accountId: existing.id, ownerId: current.user.id } }),
    current.prisma.recurringExpense.count({ where: { accountId: existing.id, ownerId: current.user.id } }),
    current.prisma.accountAdjustment.count({ where: { accountId: existing.id, ownerId: current.user.id } }),
    current.prisma.accountTransfer.count({ where: { fromAccountId: existing.id, ownerId: current.user.id } }),
    current.prisma.accountTransfer.count({ where: { toAccountId: existing.id, ownerId: current.user.id } }),
  ]);
  if (recurring > 0) return NextResponse.json({ error: "Reassign or delete this account’s recurring expenses before removing it." }, { status: 409 });
  const hasHistory = transactions + adjustments + outgoing + incoming > 0;
  if (hasHistory) await current.prisma.account.update({ where: { id: existing.id }, data: { isArchived: true } });
  else await current.prisma.account.delete({ where: { id: existing.id } });
  return NextResponse.json({ data: { deleted: existing.id, archived: hasHistory } });
}
