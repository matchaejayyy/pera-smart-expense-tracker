import { Prisma } from "../../../generated/prisma/client";
import { NextResponse } from "next/server";
import { getPrisma } from "../../../../lib/prisma";
import { advanceRecurringDate, dateKey, dateOnly } from "../../../../lib/recurring-schedule";
import { createClient } from "../../../../lib/supabase/server";

async function getContext() {
  const supabase = await createClient();
  const prisma = getPrisma();
  if (!supabase || !prisma) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user ? { prisma, user } : null;
}

export async function POST(request: Request) {
  const current = await getContext();
  if (!current) return NextResponse.json({ error: "Connect Supabase to confirm recurring payments." }, { status: 503 });

  const body = await request.json() as {
    recurringId?: string;
    action?: "PAID" | "SKIPPED";
    accountId?: string;
    amount?: number;
    paidAt?: string;
    countsTowardBudget?: boolean;
  };
  if (!body.recurringId || (body.action !== "PAID" && body.action !== "SKIPPED")) {
    return NextResponse.json({ error: "Choose whether this scheduled payment was paid or skipped." }, { status: 400 });
  }
  const action = body.action;

  const recurring = await current.prisma.recurringExpense.findFirst({
    where: { id: body.recurringId, ownerId: current.user.id },
    include: { account: true, category: true },
  });
  if (!recurring) return NextResponse.json({ error: "Recurring expense not found." }, { status: 404 });
  if (!recurring.isActive) return NextResponse.json({ error: "Resume this recurring expense before confirming a payment." }, { status: 409 });

  const scheduledFor = dateOnly(recurring.nextDueAt);
  if (scheduledFor.getTime() > dateOnly(new Date()).getTime()) {
    return NextResponse.json({ error: `This payment is not due until ${dateKey(scheduledFor)}.` }, { status: 409 });
  }

  const amount = Number(body.amount ?? recurring.amount);
  if (action === "PAID" && (!Number.isFinite(amount) || amount <= 0 || !body.accountId)) {
    return NextResponse.json({ error: "Choose the payment account and enter an amount greater than zero." }, { status: 400 });
  }
  const account = action === "PAID"
    ? await current.prisma.account.findFirst({ where: { id: body.accountId, ownerId: current.user.id, isArchived: false } })
    : null;
  if (action === "PAID" && !account) return NextResponse.json({ error: "Payment account not found." }, { status: 404 });

  const paidAt = body.paidAt ? dateOnly(body.paidAt) : dateOnly(new Date());
  if (action === "PAID" && Number.isNaN(paidAt.getTime())) return NextResponse.json({ error: "Enter a valid payment date." }, { status: 400 });
  const nextDueAt = advanceRecurringDate(recurring.nextDueAt, recurring.frequency, recurring.scheduleDay);

  try {
    const data = await current.prisma.$transaction(async (prisma) => {
      const transaction = action === "PAID" ? await prisma.transaction.create({
        data: {
          ownerId: current.user.id,
          accountId: account!.id,
          categoryId: recurring.categoryId,
          type: "EXPENSE",
          merchant: recurring.name,
          amount,
          bookedAt: paidAt,
          isRecurring: true,
          countsTowardBudget: body.countsTowardBudget !== false,
        },
        include: { account: true, category: true, savingsGoal: true },
      }) : null;

      const occurrence = await prisma.recurringOccurrence.create({
        data: {
          ownerId: current.user.id,
          recurringExpenseId: recurring.id,
          accountId: account?.id ?? null,
          transactionId: transaction?.id ?? null,
          scheduledFor,
          status: action,
          paidAt: action === "PAID" ? paidAt : null,
        },
      });
      const updatedRecurring = await prisma.recurringExpense.update({
        where: { id: recurring.id },
        data: { nextDueAt },
        include: { account: true, category: true },
      });
      return { occurrence, recurring: updatedRecurring, transaction };
    });
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "This scheduled payment has already been handled." }, { status: 409 });
    }
    throw error;
  }
}
