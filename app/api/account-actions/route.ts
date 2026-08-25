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

export async function POST(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect the Prisma database to update account balances." }, { status: 503 });
  const body = await request.json() as {
    action?: "ADJUSTMENT" | "TRANSFER";
    accountId?: string;
    fromAccountId?: string;
    toAccountId?: string;
    direction?: "ADD" | "SUBTRACT";
    amount?: number;
    note?: string;
    occurredAt?: string;
  };
  const amount = Number(body.amount);
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : new Date();
  if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(occurredAt.getTime())) return NextResponse.json({ error: "Enter a valid amount and date." }, { status: 400 });

  if (body.action === "ADJUSTMENT") {
    if (!body.accountId || !body.direction || !["ADD", "SUBTRACT"].includes(body.direction)) return NextResponse.json({ error: "Account and adjustment direction are required." }, { status: 400 });
    const account = await current.prisma.account.findFirst({ where: { id: body.accountId, ownerId: current.user.id, isArchived: false } });
    if (!account) return NextResponse.json({ error: "Account not found." }, { status: 404 });
    const data = await current.prisma.accountAdjustment.create({
      data: { ownerId: current.user.id, accountId: account.id, direction: body.direction, amount, note: body.note?.trim() || null, adjustedAt: occurredAt },
    });
    return NextResponse.json({ data }, { status: 201 });
  }

  if (body.action === "TRANSFER") {
    if (!body.fromAccountId || !body.toAccountId || body.fromAccountId === body.toAccountId) return NextResponse.json({ error: "Choose two different accounts for the transfer." }, { status: 400 });
    const accounts = await current.prisma.account.findMany({ where: { id: { in: [body.fromAccountId, body.toAccountId] }, ownerId: current.user.id, isArchived: false } });
    if (accounts.length !== 2) return NextResponse.json({ error: "One of the selected accounts was not found." }, { status: 404 });
    const data = await current.prisma.accountTransfer.create({
      data: { ownerId: current.user.id, fromAccountId: body.fromAccountId, toAccountId: body.toAccountId, amount, note: body.note?.trim() || null, transferredAt: occurredAt },
    });
    return NextResponse.json({ data }, { status: 201 });
  }

  return NextResponse.json({ error: "Choose a valid account action." }, { status: 400 });
}
